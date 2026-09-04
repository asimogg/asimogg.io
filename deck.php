<?php
// Serves a Masterclass deck from /private only with a valid unlock token.
require __DIR__ . '/lib.php';

$lang  = ($_GET['l'] ?? 'en') === 'tr' ? 'tr' : 'en';
$token = (string) ($_GET['t'] ?? '');

if (settings()['google_client_id'] !== '' && !verify_token($token, 'masterclass')) {
    header('Location: /?locked=masterclass', true, 302);
    exit;
}

$file = __DIR__ . '/private/' . ($lang === 'tr' ? 'masterclass-tr.html' : 'masterclass.html');
if (!is_file($file)) { http_response_code(404); exit; }

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
readfile($file);
