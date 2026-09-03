<?php
// Inquiry form handler — delivers submissions to hello@asimogg.io (+ CC asimize@gmail.com).
// Same-origin POST only; returns JSON consumed by script.js.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method']);
}

// --- same-origin check: the form only ever posts from this site ---------------
$host   = strtolower($_SERVER['HTTP_HOST'] ?? '');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$source = $origin !== '' ? $origin : ($_SERVER['HTTP_REFERER'] ?? '');
$srcHost = strtolower((string) parse_url($source, PHP_URL_HOST));
if ($host === '' || $srcHost === '' || $srcHost !== $host) {
    respond(403, ['ok' => false, 'error' => 'origin']);
}

// --- honeypot: real visitors never fill this hidden field --------------------
if (!empty($_POST['_gotcha'])) {
    respond(200, ['ok' => true]);
}

// --- rate limit: at most 5 submissions per IP per hour -----------------------
$ip      = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$bucket  = sys_get_temp_dir() . '/asimogg-form-' . hash('sha256', $ip . '|' . $host) . '.json';
$now     = time();
$window  = 3600;
$limit   = 5;
$hits    = [];
if (is_file($bucket)) {
    $hits = json_decode((string) file_get_contents($bucket), true) ?: [];
    $hits = array_values(array_filter($hits, fn($t) => is_int($t) && $t > $now - $window));
}
if (count($hits) >= $limit) {
    respond(429, ['ok' => false, 'error' => 'rate']);
}

// --- input ---------------------------------------------------------------------
$clean = static function (string $v, int $max): string {
    // strip control characters (keeps newlines/tabs for the message), then cap length
    $v = preg_replace('/[^\P{C}\n\t]/u', '', $v) ?? '';
    return mb_substr(trim($v), 0, $max);
};

$name    = $clean((string) ($_POST['name'] ?? ''), 200);
$email   = mb_substr(trim((string) ($_POST['email'] ?? '')), 0, 254);
$area    = (string) ($_POST['area'] ?? '');
$message = $clean((string) ($_POST['message'] ?? ''), 5000);
$lang    = ($_POST['_language'] ?? 'en') === 'tr' ? 'tr' : 'en';

$areas = ['sales-quoting', 'operations-orders', 'support-followup', 'reporting-data', 'not-sure'];

if ($name === '' || !in_array($area, $areas, true)
    || !filter_var($email, FILTER_VALIDATE_EMAIL)
    || preg_match('/[\r\n]/', $email)) {
    respond(422, ['ok' => false, 'error' => 'validation']);
}
// single-line name: no header-style line breaks even inside the encoded subject
$name = preg_replace('/\s+/u', ' ', $name);

// --- mail ----------------------------------------------------------------------
$to      = 'hello@asimogg.io';
$subject = '=?UTF-8?B?' . base64_encode("Yeni talep: $name") . '?=';

$body = "Yeni form gönderimi / New inquiry\n"
      . "----------------------------------\n"
      . "Ad / Name : $name\n"
      . "E-posta   : $email\n"
      . "Alan/Area : $area\n"
      . "Dil/Lang  : $lang\n"
      . "IP        : $ip\n"
      . "----------------------------------\n\n"
      . ($message !== '' ? $message : '(mesaj boş / no message)') . "\n";

$headers = [
    'From: asimogg.io form <form@asimogg.io>',
    'Cc: asimize@gmail.com',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

$sent = mail($to, $subject, $body, implode("\r\n", $headers));

if ($sent) {
    $hits[] = $now;
    @file_put_contents($bucket, json_encode($hits), LOCK_EX);
    respond(200, ['ok' => true]);
}

respond(500, ['ok' => false, 'error' => 'mail']);
