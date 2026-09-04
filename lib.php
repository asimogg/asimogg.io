<?php
// Shared helpers for the gated content: settings, signed tokens, rate limiting.

ini_set('display_errors', '0');

function settings(): array {
    static $s = null;
    if ($s === null) $s = require __DIR__ . '/settings.php';
    return $s;
}

function json_out(int $status, array $payload): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload);
    exit;
}

function b64url(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64url_decode(string $s): string { return (string) base64_decode(strtr($s, '-_', '+/')); }

// The signing secret never lives in the repo: it is generated once on the
// server and kept outside the web root.
function secret(): string {
    $file = sys_get_temp_dir() . '/asimogg-secret-' . hash('crc32b', __DIR__) . '.key';
    if (is_file($file) && filesize($file) >= 32) return (string) file_get_contents($file);
    $k = bin2hex(random_bytes(32));
    @file_put_contents($file, $k, LOCK_EX);
    @chmod($file, 0600);
    return $k;
}

function sign_token(array $claims): string {
    $claims['exp'] = $claims['exp'] ?? (time() + (int) settings()['token_ttl']);
    $body = b64url(json_encode($claims));
    return $body . '.' . b64url(hash_hmac('sha256', $body, secret(), true));
}

function verify_token(string $token, string $content): ?array {
    $parts = explode('.', $token, 2);
    if (count($parts) !== 2) return null;
    [$body, $sig] = $parts;
    $expected = b64url(hash_hmac('sha256', $body, secret(), true));
    if (!hash_equals($expected, $sig)) return null;
    $claims = json_decode(b64url_decode($body), true);
    if (!is_array($claims)) return null;
    if (($claims['c'] ?? '') !== $content) return null;
    if ((int) ($claims['exp'] ?? 0) < time()) return null;
    // a token issued while the gate was off stops working once the gate is on
    $needMode = settings()['google_client_id'] !== '' ? 'google' : 'open';
    if (($claims['m'] ?? '') !== $needMode) return null;
    return $claims;
}

function same_origin_or_die(): string {
    $host   = strtolower((string) preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
    $source = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
    $srcHost = strtolower((string) parse_url($source, PHP_URL_HOST));
    if ($host === '' || $srcHost === '' || $srcHost !== $host) {
        json_out(403, ['ok' => false, 'error' => 'origin']);
    }
    return $host;
}

// at most $limit hits per $window seconds per IP for the given bucket name
function rate_limit(string $name, int $limit, int $window): void {
    $ip     = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $bucket = sys_get_temp_dir() . '/asimogg-' . $name . '-' . hash('sha256', $ip) . '.json';
    $now    = time();
    $hits   = [];
    if (is_file($bucket)) {
        $hits = json_decode((string) file_get_contents($bucket), true) ?: [];
        $hits = array_values(array_filter($hits, fn($t) => is_int($t) && $t > $now - $window));
    }
    if (count($hits) >= $limit) json_out(429, ['ok' => false, 'error' => 'rate']);
    $hits[] = $now;
    @file_put_contents($bucket, json_encode($hits), LOCK_EX);
}

function http_get_json(string $url): ?array {
    $raw = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_SSL_VERIFYPEER => true]);
        $raw = curl_exec($ch);
    } elseif (ini_get('allow_url_fopen')) {
        $raw = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 8]]));
    }
    if ($raw === false) return null;
    $data = json_decode((string) $raw, true);
    return is_array($data) ? $data : null;
}

function http_post_json(string $url, array $payload): void {
    $body = json_encode($payload);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 8,
        ]);
        curl_exec($ch);
    } elseif (ini_get('allow_url_fopen')) {
        @file_get_contents($url, false, stream_context_create(['http' => [
            'method' => 'POST', 'header' => "Content-Type: application/json\r\n", 'content' => $body, 'timeout' => 8,
        ]]));
    }
}
