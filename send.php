<?php
// Inquiry form handler — delivers submissions to hello@asimogg.io (+ CC asimize@gmail.com).
// Same-origin POST only; returns JSON consumed by script.js.

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

$name    = trim($_POST['name'] ?? '');
$email   = trim($_POST['email'] ?? '');
$area    = trim($_POST['area'] ?? '');
$message = trim($_POST['message'] ?? '');
$lang    = ($_POST['_language'] ?? 'en') === 'tr' ? 'tr' : 'en';

// honeypot: real visitors never fill this hidden field
if (!empty($_POST['_gotcha'])) {
    echo json_encode(['ok' => true]);
    exit;
}

if ($name === '' || $area === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'validation']);
    exit;
}

// hard caps against abuse
$name    = mb_substr($name, 0, 200);
$message = mb_substr($message, 0, 5000);
$area    = mb_substr($area, 0, 100);

$to      = 'hello@asimogg.io';
$subject = '=?UTF-8?B?' . base64_encode("Yeni talep: $name") . '?=';

$body = "Yeni form gönderimi / New inquiry\n"
      . "----------------------------------\n"
      . "Ad / Name : $name\n"
      . "E-posta   : $email\n"
      . "Alan/Area : $area\n"
      . "Dil/Lang  : $lang\n"
      . "----------------------------------\n\n"
      . ($message !== '' ? $message : '(mesaj boş / no message)') . "\n";

$headers = [
    'From: asimogg.io form <form@asimogg.io>',
    'Cc: asimize@gmail.com',
    'Reply-To: ' . preg_replace('/[\r\n]/', '', $email),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

$sent = mail($to, $subject, $body, implode("\r\n", $headers));

if ($sent) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'mail']);
}
