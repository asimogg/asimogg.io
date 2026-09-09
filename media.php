<?php
// Streams the Saphire film from /private. Open to everyone who plays it from a
// page on this site; direct visits and hotlinks from elsewhere get 403 (the same
// rule .htaccess applies to /assets media). Supports HTTP Range requests so the
// <video> element can seek.
require __DIR__ . '/lib.php';

$host = strtolower((string) preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
$ref  = strtolower((string) parse_url($_SERVER['HTTP_REFERER'] ?? '', PHP_URL_HOST));
if ($host === '' || $ref === '' || ($ref !== $host && $ref !== 'www.' . $host)) {
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
