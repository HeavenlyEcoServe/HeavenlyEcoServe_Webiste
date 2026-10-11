<?php
/* Order emails (customer confirmation, owner notification, refund notice). Uses the server's mail() so no extra service is needed.
   Sent from MAIL_FROM (default orders@heavenlyecoserve.com): create that mailbox or forwarder in Hostinger for the best delivery. */
declare(strict_types=1);
require_once __DIR__ . '/_lib.php';

function he_h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

function he_send(string $to, string $subject, string $text, string $html, ?string $replyTo = null): bool {
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    $cat = he_catalog(); $from = he_env('MAIL_FROM', 'orders@heavenlyecoserve.com'); $b = 'b' . bin2hex(random_bytes(8));
    $headers = ['From: Heavenly EcoServe <' . $from . '>', 'MIME-Version: 1.0', 'Content-Type: multipart/alternative; boundary="' . $b . '"', 'X-Mailer: HeavenlyEcoServe'];
    if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) $headers[] = 'Reply-To: ' . $replyTo;
    $body = "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$text\r\n--$b\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$html\r\n--$b--";
    $subj = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $sink = getenv('HE_MAIL_SINK');                       // tests write mails to a folder instead of sending them
    if ($sink) { @file_put_contents(rtrim($sink, '/\\') . DIRECTORY_SEPARATOR . date('His') . '-' . md5($to . $subject . microtime()) . '.eml', "To: $to\r\nSubject: $subject\r\n" . implode("\r\n", $headers) . "\r\n\r\n$body"); return true; }
    return @mail($to, $subj, $body, implode("\r\n", $headers), '-f' . $from);
}

function he_order_lines(array $o): array {
    $items = json_decode((string)$o['items'], true) ?: []; $t = []; $h = '';
    foreach ($items as $i) {
        $line = $i['qty'] . ' x ' . $i['name'] . ($i['pack'] ? ' (' . $i['pack'] . ')' : '') . ($i['frozen'] ? ' [FROZEN]' : '') . ' - ' . he_money((int)$i['total']);
        $t[] = '  ' . $line; $h .= '<tr><td style="padding:6px 0">' . he_h($i['qty'] . ' × ' . $i['name'] . ($i['pack'] ? ' (' . $i['pack'] . ')' : '')) . ($i['frozen'] ? ' <span style="color:#2a7fb0">(frozen)</span>' : '') . '</td><td align="right">' . he_money((int)$i['total']) . '</td></tr>';
    }
    return [implode("\n", $t), $h];
}

function he_email_customer(array $o): bool {
    $cat = he_catalog(); [$t, $h] = he_order_lines($o); $wa = $cat['phone'] ?? '';
    $text = "Hello {$o['name']},\n\nThank you for your order with Heavenly EcoServe. We have received your payment.\n\nOrder {$o['ref']}\n$t\n\nDelivery: " . ((int)$o['delivery'] === 0 ? 'FREE' : he_money((int)$o['delivery'])) . "\nTotal paid: " . he_money((int)$o['total']) . "\n\nDelivering to: {$o['address']}\n" . ($o['note'] ? "Your delivery note: {$o['note']}\n" : '') . "\nEverything we sell is made fresh every day, except products marked Frozen.\nIf you have any allergies, please message us on WhatsApp" . ($wa ? " ($wa)" : '') . ".\n\nHeavenly EcoServe Ltd, Leicester\n";
    $html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1b1b18"><div style="background:#0f3d2e;color:#fbf6ea;padding:22px 24px;border-radius:14px 14px 0 0"><div style="font-size:22px;font-weight:bold">Heavenly EcoServe</div><div style="color:#e8c877">Thank you for your order</div></div><div style="border:1px solid #e4dbbd;border-top:0;padding:22px 24px;border-radius:0 0 14px 14px"><p>Hello ' . he_h($o['name']) . ', we have received your payment.</p><p><b>Order ' . he_h($o['ref']) . '</b></p><table width="100%" style="border-collapse:collapse;border-top:1px solid #eee">' . $h . '<tr><td style="padding:6px 0;border-top:1px solid #eee">Delivery</td><td align="right" style="border-top:1px solid #eee">' . ((int)$o['delivery'] === 0 ? 'FREE' : he_money((int)$o['delivery'])) . '</td></tr><tr><td style="padding:8px 0"><b>Total paid</b></td><td align="right"><b>' . he_money((int)$o['total']) . '</b></td></tr></table><p><b>Delivering to</b><br>' . nl2br(he_h($o['address'])) . '</p>' . ($o['note'] ? '<p><b>Your delivery note</b><br>' . he_h($o['note']) . '</p>' : '') . '<p style="color:#5c5a50;font-size:13px">Everything we sell is made fresh every day, except products marked Frozen. Allergies? Please message us on WhatsApp' . ($wa ? ' (' . he_h($wa) . ')' : '') . '.</p></div></div>';
    return he_send((string)$o['email'], 'Your Heavenly EcoServe order ' . $o['ref'], $text, $html, $cat['owner'] ?? null);
}

function he_email_owner(array $o, string $kind = 'paid'): bool {
    $cat = he_catalog(); $to = he_env('OWNER_EMAIL', (string)($cat['owner'] ?? '')); [$t, $h] = he_order_lines($o);
    $subj = ($kind === 'paid' ? 'NEW PAID ORDER ' : strtoupper($kind) . ' ') . $o['ref'] . ' - ' . he_money((int)$o['total']);
    $body = "$subj\n\nName: {$o['name']}\nEmail: {$o['email']}\nPhone: {$o['phone']}\nAddress: {$o['address']}\n" . ($o['note'] ? "DRIVER INSTRUCTIONS: {$o['note']}\n" : '') . "\n$t\nDelivery: " . he_money((int)$o['delivery']) . "\nTotal: " . he_money((int)$o['total']) . ((int)$o['refunded'] > 0 ? "\nRefunded: " . he_money((int)$o['refunded']) : '') . "\nStatus: {$o['status']}\n";
    return he_send($to, $subj, $body, '<pre style="font:14px Consolas,monospace">' . he_h($body) . '</pre>', filter_var($o['email'] ?? '', FILTER_VALIDATE_EMAIL) ? (string)$o['email'] : null);
}

function he_email_refund(array $o): bool {
    $cat = he_catalog(); $amt = he_money((int)$o['refunded']);
    $text = "Hello {$o['name']},\n\nWe have refunded $amt for order {$o['ref']}. It can take 5 to 10 working days to appear on your statement.\n\nHeavenly EcoServe Ltd, Leicester\n";
    return he_send((string)$o['email'], 'Refund for your order ' . $o['ref'], $text, '<p>' . nl2br(he_h($text)) . '</p>', $cat['owner'] ?? null);
}
