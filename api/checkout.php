<?php
/* POST /api/checkout.php
   Body (JSON): { items:[{sku,qty}], name, address, postcode, note }
   Prices are NEVER taken from the browser: they are re-read from catalog.php on the server. Returns { url } for Stripe Checkout (hosted, PCI-compliant).
   Checkout offers cards (Visa, Mastercard, Amex), Apple Pay, Google Pay and Link automatically when they are enabled in the Stripe Dashboard. */
declare(strict_types=1);
require_once __DIR__ . '/_lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') he_json(405, ['error' => 'POST only']);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== ($_SERVER['HTTP_HOST'] ?? '') && parse_url($origin, PHP_URL_HOST) !== explode(':', (string)($_SERVER['HTTP_HOST'] ?? ''))[0]) he_json(403, ['error' => 'Not allowed']);
if (strpos((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') === false) he_json(415, ['error' => 'JSON only']);
if (he_env('STRIPE_SECRET_KEY') === '') he_json(503, ['error' => 'Online card payment is being set up. Please send your order on WhatsApp for now.', 'code' => 'not_configured']);

he_rate_limit('checkout', 12, 600);
$in = json_decode((string)file_get_contents('php://input', false, null, 0, 20000), true);
if (!is_array($in)) he_json(400, ['error' => 'Bad request']);

$name = trim(preg_replace('/\s+/', ' ', (string)($in['name'] ?? '')));
$address = trim(preg_replace('/[ \t]+/', ' ', (string)($in['address'] ?? '')));
$postcode = strtoupper(trim((string)($in['postcode'] ?? '')));
$note = trim(preg_replace('/\s+/', ' ', (string)($in['note'] ?? '')));
if ($name === '' || mb_strlen($name) > 60) he_json(422, ['error' => 'Please enter your name.']);
if (!preg_match('/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/', $postcode)) he_json(422, ['error' => 'Please enter a valid UK postcode.']);
if ($address === '' || mb_strlen($address) > 250) $address = $postcode;
if (mb_strlen($note) > 200) $note = mb_substr($note, 0, 200);
if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $name . $address . $note)) he_json(422, ['error' => 'Please remove special characters.']);

$cat = he_catalog(); $lines = []; $items = []; $sub = 0; $seen = [];
foreach ((array)($in['items'] ?? []) as $it) {
    $sku = strtoupper((string)($it['sku'] ?? '')); $qty = (int)($it['qty'] ?? 0);
    if (isset($seen[$sku])) continue; $seen[$sku] = 1;
    $p = $cat['products'][$sku] ?? null;
    if (!$p) he_json(422, ['error' => 'One item in your basket is no longer available. Please refresh the page.']);
    if ($qty < 1 || $qty > 50) he_json(422, ['error' => 'Quantities must be between 1 and 50.']);
    $total = $p['pence'] * $qty; $sub += $total;
    $items[] = ['sku' => $sku, 'name' => $p['name'], 'pack' => $p['pack'], 'qty' => $qty, 'unit' => $p['pence'], 'total' => $total, 'frozen' => (bool)$p['frozen']];
    $lines[] = ['price_data' => ['currency' => 'gbp', 'unit_amount' => $p['pence'], 'product_data' => ['name' => $p['name'] . ($p['pack'] ? ' (' . $p['pack'] . ')' : ''), 'description' => $p['frozen'] ? 'Sold frozen' : 'Made fresh daily']], 'quantity' => $qty];
}
if (!$items || count($items) > 30) he_json(422, ['error' => 'Your basket is empty.']);
if ($sub < 50) he_json(422, ['error' => 'Order total is too small.']);
if ($sub > 200000) he_json(422, ['error' => 'For very large orders please message us on WhatsApp.']);

$delivery = 0;
if (isset($cat['fee']) && $cat['fee'] !== null) { $delivery = (isset($cat['free']) && $cat['free'] !== null && $sub > $cat['free']) ? 0 : (int)$cat['fee']; }
if ($delivery > 0) $lines[] = ['price_data' => ['currency' => 'gbp', 'unit_amount' => $delivery, 'product_data' => ['name' => 'Delivery (Leicester)']], 'quantity' => 1];
$total = $sub + $delivery;

try {
    $db = he_db(); $now = he_now();
    $db->prepare('INSERT INTO orders (ref, status, subtotal, delivery, total, name, address, postcode, note, items, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
       ->execute(['TMP' . bin2hex(random_bytes(4)), 'pending', $sub, $delivery, $total, $name, $address, $postcode, $note, json_encode($items, JSON_UNESCAPED_UNICODE), $now, $now]);
    $id = (int)$db->lastInsertId(); $ref = 'HE-' . gmdate('ym') . '-' . str_pad((string)$id, 4, '0', STR_PAD_LEFT);
    $db->prepare('UPDATE orders SET ref=? WHERE id=?')->execute([$ref, $id]);

    $site = rtrim((string)($cat['site'] ?? 'https://www.heavenlyecoserve.com'), '/');
    $meta = ['ref' => $ref, 'name' => $name, 'address' => mb_substr($address, 0, 480), 'postcode' => $postcode, 'driver_note' => $note];
    $session = he_stripe('POST', '/v1/checkout/sessions', [
        'mode' => 'payment', 'locale' => 'en-GB', 'client_reference_id' => $ref,
        'line_items' => $lines,
        'success_url' => $site . '/order-confirmation?session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => $site . '/payment-error',
        'phone_number_collection' => ['enabled' => true],
        'metadata' => $meta,
        'payment_intent_data' => ['description' => 'Heavenly EcoServe order ' . $ref, 'metadata' => $meta],
        'custom_text' => ['submit' => ['message' => 'Everything we sell is made fresh every day, except products marked Frozen. Delivery notes are passed to our driver.']],
        '_idem' => 'order-' . $ref,
    ]);
    $db->prepare('UPDATE orders SET session_id=?, updated_at=? WHERE id=?')->execute([$session['id'], he_now(), $id]);
    he_json(200, ['url' => $session['url'], 'ref' => $ref]);
} catch (Throwable $e) {
    error_log('[HeavenlyEcoServe checkout] ' . $e->getMessage());
    he_json(502, ['error' => 'We could not start the payment just now. Please try again, or send your order on WhatsApp.']);
}
