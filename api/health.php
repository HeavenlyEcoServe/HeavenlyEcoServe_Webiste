<?php
/* GET /api/health.php -> which parts are ready (yes/no only, never shows a key). Handy after uploading the private .env file. */
declare(strict_types=1);
require_once __DIR__ . '/_lib.php';
$k = he_env('STRIPE_SECRET_KEY'); $pk = he_env('STRIPE_PUBLIC_KEY'); $wh = he_env('STRIPE_WEBHOOK_SECRET');
$ok = function () { try { he_db(); return true; } catch (Throwable $e) { return false; } };
he_json(200, [
    'php' => PHP_VERSION, 'curl' => function_exists('curl_init'), 'sqlite' => in_array('sqlite', PDO::getAvailableDrivers(), true), 'database' => $ok(),
    'private_folder_writable' => is_writable(he_private_dir()),
    'stripe_secret_key' => $k !== '' ? (strpos($k, 'sk_live_') === 0 ? 'live' : (strpos($k, 'sk_test_') === 0 ? 'test' : 'set (unrecognised)')) : 'missing',
    'stripe_public_key' => $pk !== '' ? (strpos($pk, 'pk_live_') === 0 ? 'live' : (strpos($pk, 'pk_test_') === 0 ? 'test' : 'set (unrecognised)')) : 'missing',
    'stripe_webhook_secret' => $wh !== '' ? 'set' : 'missing',
    'mode_match' => ($k !== '' && $pk !== '') ? ((strpos($k, '_live_') !== false) === (strpos($pk, '_live_') !== false)) : null,
    'mail' => function_exists('mail'),
]);
