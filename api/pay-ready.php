<?php
/* GET /api/pay-ready.php -> {"ready":true|false}. Tells the basket whether card payment is switched on (keys present). Never reveals any key. */
declare(strict_types=1);
require_once __DIR__ . '/_lib.php';
header('Cache-Control: public, max-age=60');
$ok = preg_match('/^sk_(test|live)_/', he_env('STRIPE_SECRET_KEY')) === 1;
http_response_code(200); header('Content-Type: application/json; charset=utf-8'); header('X-Content-Type-Options: nosniff');
echo json_encode(['ready' => $ok]);
