<?php
/* Heavenly EcoServe: shared helpers for the Stripe checkout endpoints.
   No Composer, no frameworks. Secrets come from environment variables or from a private .env file that lives OUTSIDE the website folder:
     STRIPE_PUBLIC_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, OWNER_EMAIL (optional), MAIL_FROM (optional)
   The private folder (orders database, rate-limit files, .env) is the folder above public_html, or HE_PRIVATE_DIR if set. */

declare(strict_types=1);

function he_private_dir(): string {
    $d = getenv('HE_PRIVATE_DIR') ?: '';
    if ($d === '') { $root = $_SERVER['DOCUMENT_ROOT'] ?? ''; $d = ($root !== '' ? dirname($root) : dirname(__DIR__, 2)) . DIRECTORY_SEPARATOR . 'heavenly-private'; }
    if (!is_dir($d)) { @mkdir($d, 0700, true); }
    return $d;
}

function he_env(string $key, string $default = ''): string {
    static $file = null;
    $v = getenv($key);
    if ($v !== false && $v !== '') return $v;
    if ($file === null) {
        $file = [];
        $p = he_private_dir() . DIRECTORY_SEPARATOR . '.env';
        if (is_readable($p)) {
            foreach (file($p, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
                $line = trim($line);
                if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
                [$k, $val] = explode('=', $line, 2);
                $file[trim($k)] = trim(trim($val), "\"'");
            }
        }
    }
    return $file[$key] ?? $default;
}

function he_catalog(): array { static $c = null; if ($c === null) { $c = require __DIR__ . '/catalog.php'; } return $c; }

function he_json(int $code, array $data): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function he_ip(): string { return substr((string)($_SERVER['REMOTE_ADDR'] ?? '0'), 0, 45); }

/* very small rate limit: at most $max hits per $window seconds per IP (files in the private folder) */
function he_rate_limit(string $bucket, int $max, int $window): void {
    $f = he_private_dir() . DIRECTORY_SEPARATOR . 'rl-' . $bucket . '-' . md5(he_ip()) . '.json';
    $now = time(); $hits = [];
    if (is_readable($f)) { $hits = json_decode((string)file_get_contents($f), true) ?: []; }
    $hits = array_values(array_filter($hits, fn($t) => $t > $now - $window));
    if (count($hits) >= $max) { header('Retry-After: ' . $window); he_json(429, ['error' => 'Too many attempts. Please wait a few minutes and try again.']); }
    $hits[] = $now; @file_put_contents($f, json_encode($hits), LOCK_EX);
}

/* ---------- Stripe REST client (cURL) ---------- */
function he_stripe_base(): string {
    // the test suite points this at a local mock; it is ignored unless HE_MOCK=1 is set on the server
    if (getenv('HE_MOCK') === '1' && getenv('STRIPE_API_BASE')) return rtrim((string)getenv('STRIPE_API_BASE'), '/');
    return 'https://api.stripe.com';
}

function he_flatten(array $data, string $prefix = ''): array {
    $out = [];
    foreach ($data as $k => $v) {
        $key = $prefix === '' ? (string)$k : $prefix . '[' . $k . ']';
        if (is_array($v)) { $out += he_flatten($v, $key); } elseif (is_bool($v)) { $out[$key] = $v ? 'true' : 'false'; } elseif ($v !== null) { $out[$key] = (string)$v; }
    }
    return $out;
}

function he_stripe(string $method, string $path, array $params = []): array {
    $secret = he_env('STRIPE_SECRET_KEY');
    if ($secret === '') throw new RuntimeException('Stripe is not configured');
    $url = he_stripe_base() . $path;
    $ch = curl_init();
    $headers = ['Authorization: Bearer ' . $secret, 'Stripe-Version: 2024-06-20'];
    $idem = (string)($params['_idem'] ?? ''); unset($params['_idem']);
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(he_flatten($params)));
        $headers[] = 'Idempotency-Key: ' . ($idem !== '' ? $idem : bin2hex(random_bytes(16)));
    } elseif ($params) { $url .= '?' . http_build_query(he_flatten($params)); }
    curl_setopt_array($ch, [CURLOPT_URL => $url, CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 12, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_USERAGENT => 'HeavenlyEcoServe/1.0']);
    $body = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    if ($body === false) throw new RuntimeException('Stripe connection failed: ' . $err);
    $j = json_decode((string)$body, true);
    if (!is_array($j)) throw new RuntimeException('Stripe returned an unreadable answer');
    if ($code >= 400) throw new RuntimeException('Stripe error: ' . ($j['error']['message'] ?? ('HTTP ' . $code)));
    return $j;
}

/* ---------- orders database (SQLite file in the private folder) ---------- */
function he_db(): PDO {
    static $db = null;
    if ($db) return $db;
    if (!in_array('sqlite', PDO::getAvailableDrivers(), true)) throw new RuntimeException('SQLite is not available on this server');
    $db = new PDO('sqlite:' . he_private_dir() . DIRECTORY_SEPARATOR . 'orders.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    $db->exec('CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT, ref TEXT UNIQUE, status TEXT NOT NULL DEFAULT "pending", session_id TEXT, payment_intent TEXT,
        subtotal INTEGER, delivery INTEGER, total INTEGER, refunded INTEGER DEFAULT 0, currency TEXT DEFAULT "gbp",
        name TEXT, email TEXT, phone TEXT, address TEXT, postcode TEXT, note TEXT, items TEXT,
        emailed INTEGER DEFAULT 0, owner_emailed INTEGER DEFAULT 0, refund_emailed INTEGER DEFAULT 0, last_error TEXT, created_at TEXT, updated_at TEXT)');
    $db->exec('CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, type TEXT, received_at TEXT)');
    return $db;
}

function he_money(int $pence): string { return '£' . number_format($pence / 100, 2); }
function he_now(): string { return gmdate('Y-m-d H:i:s'); }
