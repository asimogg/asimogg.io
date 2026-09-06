<?php
// Streams the Saphire film from /private only with a valid unlock token.
// Supports HTTP Range requests so the <video> element can seek.
require __DIR__ . '/lib.php';

$token = (string) ($_GET['t'] ?? '');
if (settings()['google_client_id'] !== '' && !verify_token($token, 'saphire')) {
    http_response_code(403);
    exit;
}

$file = __DIR__ . '/private/saphire.mp4';
if (!is_file($file)) { http_response_code(404); exit; }

$size  = filesize($file);
$start = 0;
$end   = $size - 1;

if (isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $m)) {
    if ($m[1] !== '') $start = (int) $m[1];
    if ($m[2] !== '') $end = min((int) $m[2], $size - 1);
    if ($start > $end || $start >= $size) {
        http_response_code(416);
        header("Content-Range: bytes */$size");
        exit;
    }
    http_response_code(206);
    header("Content-Range: bytes $start-$end/$size");
}

header('Content-Type: video/mp4');
header('Content-Length: ' . ($end - $start + 1));
header('Accept-Ranges: bytes');
header('Content-Disposition: inline');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');

$fh = fopen($file, 'rb');
fseek($fh, $start);
$left = $end - $start + 1;
while ($left > 0 && !feof($fh)) {
    $chunk = fread($fh, min(65536, $left));
    echo $chunk;
    $left -= strlen($chunk);
    flush();
}
fclose($fh);
