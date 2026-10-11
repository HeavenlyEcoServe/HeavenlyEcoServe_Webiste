<?php
/* POST /api/webhook.php  (Stripe -> us). Verifies the Stripe signature with STRIPE_WEBHOOK_SECRET, then updates the order and sends emails.
   Subscribe this URL to: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded, checkout.session.completed
   Safe to receive the same event twice (events are recorded and email flags stop duplicates). */
declare(strict_types=1);
require_once __DIR__ . '/_lib.php';
require_once __DIR__ . '/mail.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') he_json(405, ['error' => 'POST only']);
$secret = he_env('STRIPE_WEBHOOK_SECRET');
if ($secret === '') he_json(503, ['error' => 'Webhook secret is not configured']);

$payload = (string)file_get_contents('php://input', false, null, 0, 1000000);
$sig = (string)($_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '');

/* ---- signature check (same scheme as Stripe's libraries) ---- */
function he_verify(string $payload, string $header, string $secret, int $tolerance = 300): bool {
    $t = null; $v1 = [];
    foreach (explode(',', $header) as $part) { $kv = explode('=', trim($part), 2); if (count($kv) !== 2) continue; if ($kv[0] === 't') $t = $kv[1]; elseif ($kv[0] === 'v1') $v1[] = $kv[1]; }
    if ($t === null || !ctype_digit($t) || !$v1) return false;
    if (abs(time() - (int)$t) > $tolerance) return false;
    $expected = hash_hmac('sha256', $t . '.' . $payload, $secret);
    foreach ($v1 as $s) { if (hash_equals($expected, $s)) return true; }
    return false;
}
if (!he_verify($payload, $sig, $secret)) he_json(400, ['error' => 'Invalid signature']);

$event = json_decode($payload, true);
if (!is_array($event) || empty($event['id']) || empty($event['type'])) he_json(400, ['error' => 'Bad event']);

try {
    $db = he_db();
    $seen = $db->prepare('INSERT OR IGNORE INTO events (id, type, received_at) VALUES (?,?,?)');
    $seen->execute([$event['id'], $event['type'], he_now()]);
    $firstTime = $seen->rowCount() === 1;

    $obj = $event['data']['object'] ?? [];
    $find = function () use ($db, $obj) {
        $ref = $obj['metadata']['ref'] ?? ($obj['client_reference_id'] ?? '');
        foreach ([['ref', $ref], ['payment_intent', $obj['payment_intent'] ?? ($obj['object'] === 'payment_intent' ? $obj['id'] : '')], ['session_id', $obj['object'] === 'checkout.session' ? $obj['id'] : '']] as [$col, $val]) {
            if ($val === '' || $val === null) continue;
            $q = $db->prepare("SELECT * FROM orders WHERE $col = ? LIMIT 1"); $q->execute([$val]); $row = $q->fetch(PDO::FETCH_ASSOC);
            if ($row) return $row;
        }
        return null;
    };
    $order = $find();
    if (!$order) { he_json(200, ['received' => true, 'note' => 'no matching order']); }
    $id = (int)$order['id'];

    switch ($event['type']) {
        case 'checkout.session.completed':
            $cd = $obj['customer_details'] ?? [];
            $db->prepare('UPDATE orders SET payment_intent=COALESCE(payment_intent,?), email=COALESCE(NULLIF(?,""),email), phone=COALESCE(NULLIF(?,""),phone), name=COALESCE(NULLIF(name,""),?), updated_at=? WHERE id=?')
               ->execute([$obj['payment_intent'] ?? null, (string)($cd['email'] ?? ''), (string)($cd['phone'] ?? ''), (string)($cd['name'] ?? ''), he_now(), $id]);
            if (($obj['payment_status'] ?? '') === 'paid') { he_mark_paid($db, $id); }
            break;

        case 'payment_intent.succeeded':
            $db->prepare('UPDATE orders SET payment_intent=COALESCE(payment_intent,?), updated_at=? WHERE id=?')->execute([$obj['id'] ?? null, he_now(), $id]);
            if (empty($order['email'])) {            // take the email from the charge if Checkout did not tell us yet
                $email = (string)($obj['receipt_email'] ?? '');
                if ($email === '' && !empty($obj['latest_charge'])) { try { $ch = he_stripe('GET', '/v1/charges/' . rawurlencode((string)$obj['latest_charge'])); $email = (string)($ch['billing_details']['email'] ?? ''); $phone = (string)($ch['billing_details']['phone'] ?? ''); } catch (Throwable $e) { error_log('[webhook] charge lookup: ' . $e->getMessage()); } }
                if ($email !== '') $db->prepare('UPDATE orders SET email=?, phone=COALESCE(NULLIF(?,""),phone) WHERE id=?')->execute([$email, $phone ?? '', $id]);
            }
            he_mark_paid($db, $id);
            break;

        case 'payment_intent.payment_failed':
            if (!in_array($order['status'], ['paid', 'refunded', 'partially_refunded'], true)) {
                $db->prepare('UPDATE orders SET status="failed", last_error=?, payment_intent=COALESCE(payment_intent,?), updated_at=? WHERE id=?')
                   ->execute([mb_substr((string)($obj['last_payment_error']['message'] ?? 'Payment failed'), 0, 250), $obj['id'] ?? null, he_now(), $id]);
            }
            break;

        case 'charge.refunded':
            $refunded = (int)($obj['amount_refunded'] ?? 0); $full = $refunded >= (int)($obj['amount'] ?? PHP_INT_MAX);
            $db->prepare('UPDATE orders SET status=?, refunded=?, updated_at=? WHERE id=?')->execute([$full ? 'refunded' : 'partially_refunded', $refunded, he_now(), $id]);
            $row = he_order($db, $id);
            if ($row && $firstTime && (int)$row['refund_emailed'] < $refunded) {
                $db->prepare('UPDATE orders SET refund_emailed=? WHERE id=?')->execute([$refunded, $id]);
                he_email_refund($row); he_email_owner($row, $full ? 'refunded' : 'part refunded');
            }
            break;
    }
    he_json(200, ['received' => true]);
} catch (Throwable $e) {
    error_log('[HeavenlyEcoServe webhook] ' . $e->getMessage());
    he_json(500, ['error' => 'Processing error, Stripe will retry']);        // a 5xx makes Stripe retry later
}

function he_order(PDO $db, int $id): ?array { $q = $db->prepare('SELECT * FROM orders WHERE id=?'); $q->execute([$id]); $r = $q->fetch(PDO::FETCH_ASSOC); return $r ?: null; }

/* paid -> status paid; each email is sent once (separate "claim" flags), and the customer email waits until we know their address */
function he_mark_paid(PDO $db, int $id): void {
    $db->prepare('UPDATE orders SET status=CASE WHEN status IN ("refunded","partially_refunded") THEN status ELSE "paid" END, last_error=NULL, updated_at=? WHERE id=?')->execute([he_now(), $id]);
    $row = he_order($db, $id); if (!$row || $row['status'] !== 'paid') return;
    $c = $db->prepare('UPDATE orders SET owner_emailed=1 WHERE id=? AND owner_emailed=0'); $c->execute([$id]);
    if ($c->rowCount() === 1) he_email_owner($row, 'paid');
    if (!empty($row['email'])) { $c = $db->prepare('UPDATE orders SET emailed=1 WHERE id=? AND emailed=0'); $c->execute([$id]); if ($c->rowCount() === 1) he_email_customer($row); }
}
