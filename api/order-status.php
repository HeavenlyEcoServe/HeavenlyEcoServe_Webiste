<?php
/* GET /api/order-status.php?session_id=cs_...  ->  { status, ref, total }   (no personal data)
   Used by the order-confirmation page. Asks Stripe directly so the page is right even if the webhook is a few seconds behind. */
declare(strict_types=1);
require_once __DIR__ . '/_lib.php';

$sid = (string)($_GET['session_id'] ?? '');
if (!preg_match('/^cs_(test|live)_[A-Za-z0-9]{10,200}$/', $sid)) he_json(400, ['error' => 'Bad session']);
he_rate_limit('status', 60, 600);
try {
    $db = he_db(); $q = $db->prepare('SELECT ref, status, total FROM orders WHERE session_id = ? LIMIT 1'); $q->execute([$sid]); $o = $q->fetch(PDO::FETCH_ASSOC);
    if (!$o) he_json(404, ['error' => 'Order not found']);
    $status = $o['status'];
    if ($status === 'pending' || $status === 'failed') {
        $s = he_stripe('GET', '/v1/checkout/sessions/' . rawurlencode($sid));
        if (($s['payment_status'] ?? '') === 'paid') $status = 'paid';
    }
    he_json(200, ['status' => $status, 'ref' => $o['ref'], 'total' => he_money((int)$o['total'])]);
} catch (Throwable $e) { error_log('[order-status] ' . $e->getMessage()); he_json(200, ['status' => 'unknown']); }
