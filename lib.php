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

// Private state directory for rate-limit buckets, caches, seen-flags and the
// signing secret. Preferred: one level above the web root (never served).
// Fallback: a per-install 0700 directory in the system temp dir whose owner is
// checked, so another hosting account cannot pre-create or plant files in it.
function state_dir(): string {
    static $dir = null;
    if ($dir !== null) return $dir;
    $uid = function_exists('posix_geteuid') ? posix_geteuid() : getmyuid();
    $cands = [dirname(__DIR__) . '/.asimogg-state'];
    // fallback name carries a random tag kept in private/ (never served, git-ignored),
    // so another account cannot predict and pre-claim it
    $tagFile = __DIR__ . '/private/.asimogg-state-tag';
    $newTag = function () use ($tagFile): ?string {
        // write to a private temp name, then rename into place (atomic)
        $t = bin2hex(random_bytes(16));
        $tmp = $tagFile . '.' . bin2hex(random_bytes(4));
        $old = umask(077); $ok = @file_put_contents($tmp, $t) === 32; umask($old);
        if ($ok && @rename($tmp, $tagFile)) return $t;
        @unlink($tmp);
        return null;
    };
    $tag = state_read($tagFile);
    if ($tag === null || !preg_match('/^[a-f0-9]{32}$/', $tag)) $tag = $newTag();
    if ($tag !== null) $cands[] = sys_get_temp_dir() . '/asimogg-state-' . $tag;
    foreach ($cands as $i => $d) {
        if (!is_dir($d)) { $old = umask(077); @mkdir($d, 0700); umask($old); }
        clearstatcache(true, $d);
        if (is_dir($d) && !is_link($d) && @fileowner($d) === $uid && is_writable($d)) {
            @chmod($d, 0700);
            return $dir = $d;
        }
    }
    // the random fallback name was taken (e.g. after a temp cleanup): rotate once
    if ($tag !== null && ($t2 = $newTag()) !== null) {
        $d = sys_get_temp_dir() . '/asimogg-state-' . $t2;
        $old = umask(077); @mkdir($d, 0700); umask($old);
        clearstatcache(true, $d);
        if (is_dir($d) && !is_link($d) && @fileowner($d) === $uid && is_writable($d)) return $dir = $d;
    }
    json_out(503, ['ok' => false, 'error' => 'state']);
}

// Read a state file only if this account owns it (never trust planted files).
function state_read(string $file): ?string {
    clearstatcache(true, $file);
    if (!is_file($file) || is_link($file)) return null;
    $uid = function_exists('posix_geteuid') ? posix_geteuid() : getmyuid();
    if (@fileowner($file) !== $uid) return null;
    $v = @file_get_contents($file);
    return $v === false ? null : $v;
}

// The signing secret never lives in the repo: it is generated once on the
// server and kept outside the web root (or in the owner-checked state dir).
// Fails closed when no private location is writable.
function secret(): string {
    static $cached = null;
    if ($cached !== null) return $cached;
    $name = 'asimogg-secret-' . hash('crc32b', __DIR__) . '.key';
    // the above-root key is tried first, so token checks never depend on the state dir
    $above = dirname(__DIR__) . '/.' . $name;
    $v = state_read($above);
    if ($v !== null && strlen($v) >= 32) return $cached = $v;
    $inState = state_dir() . '/' . $name;
    $v = state_read($inState);
    if ($v !== null && strlen($v) >= 32) return $cached = $v;
    $k = bin2hex(random_bytes(32));
    foreach ([$above, $inState] as $file) {
        $old = umask(077);
        $fh = @fopen($file, 'x');
        umask($old);
        if ($fh) { fwrite($fh, $k); fclose($fh); @chmod($file, 0600); return $cached = $k; }
    }
    json_out(503, ['ok' => false, 'error' => 'secret']);
}

function sign_token(array $claims): string {
    $claims['exp'] = $claims['exp'] ?? (time() + (int) settings()['token_ttl']);
    $body = b64url(json_encode($claims));
    return $body . '.' . b64url(hash_hmac('sha256', $body, secret(), true));
}

function verify_token(string $token, string $content, string $mode = 'session'): ?array {
    $parts = explode('.', $token, 2);
    if (count($parts) !== 2) return null;
    [$body, $sig] = $parts;
    $expected = b64url(hash_hmac('sha256', $body, secret(), true));
    if (!hash_equals($expected, $sig)) return null;
    $claims = json_decode(b64url_decode($body), true);
    if (!is_array($claims)) return null;
    if (($claims['c'] ?? '') !== $content) return null;
    if ((int) ($claims['exp'] ?? 0) < time()) return null;
    // 'link' = e-mailed magic link (short), 'session' = minted after the link
    // was used (long); 'open' = issued while the gate is off. A token issued
    // while the gate was off stops working once the gate is on, and vice versa.
    $needMode = settings()['gate'] === 'off' ? 'open' : $mode;
    if (($claims['m'] ?? '') !== $needMode) return null;
    return $claims;
}

// Where the content lives once a session token exists.
function content_url(string $content, string $token, string $lang): string {
    return $content === 'masterclass'
        ? 'deck.php?l=' . ($lang === 'tr' ? 'tr' : 'en') . '&t=' . $token
        : '/?play=' . $token;
}

// Canonical origin for links in e-mails: never derived from request headers.
function site_url(): string {
    return rtrim((string) (settings()['site_url'] ?? 'https://asimogg.io'), '/');
}

// Hosts a same-origin browser request may come from: the canonical host, its
// www alias, and loopback hosts for local previews only.
function allowed_hosts(): array {
    $h = strtolower((string) parse_url(site_url(), PHP_URL_HOST));
    $hosts = [$h, 'www.' . $h];
    $ra = $_SERVER['REMOTE_ADDR'] ?? '';
    if ($ra === '127.0.0.1' || $ra === '::1') { $hosts[] = 'localhost'; $hosts[] = '127.0.0.1'; }
    return $hosts;
}

// All outgoing mail leaves as the real mailbox hello@asimogg.io (header From and
// envelope sender): shared hosts drop mail from non-existent local senders.
function send_mail(string $to, string $subject, string $body, array $extraHeaders = []): bool {
    $from = settings()['lead_to'];
    $headers = array_merge([
        'From: asimogg.io <' . $from . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ], $extraHeaders);
    $encoded = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    return @mail($to, $encoded, $body, implode("\r\n", $headers), '-f' . $from);
}

function same_origin_or_die(): string {
    $source  = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
    $srcHost = strtolower((string) parse_url($source, PHP_URL_HOST));
    if ($srcHost === '' || !in_array($srcHost, allowed_hosts(), true)) {
        json_out(403, ['ok' => false, 'error' => 'origin']);
    }
    return $srcHost;
}

// Atomic sliding-window counter: read, check and append under one exclusive
// lock on one handle, so concurrent requests cannot reset or overrun it.
function bucket_hit(string $key, int $limit, int $window): bool {
    $fh = @fopen(state_dir() . '/b-' . hash('sha256', $key) . '.json', 'c+');
    if (!$fh || !flock($fh, LOCK_EX)) json_out(503, ['ok' => false, 'error' => 'rate']);
    $now  = time();
    $hits = json_decode((string) stream_get_contents($fh), true);
    $hits = array_values(array_filter(is_array($hits) ? $hits : [], fn($t) => is_int($t) && $t > $now - $window && $t <= $now));
    $ok = count($hits) < $limit;
    if ($ok) {
        $hits[] = $now;
        ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($hits)); fflush($fh);
    }
    flock($fh, LOCK_UN); fclose($fh);
    return $ok;
}

// Client network for quotas: the address itself for IPv4, its /64 for IPv6
// (one IPv6 host can rotate freely inside its /64).
function client_net(): string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    if (strpos($ip, ':') === false) return $ip;
    $bin = @inet_pton($ip);
    if ($bin === false) return $ip;
    // IPv4-mapped IPv6 (::ffff:a.b.c.d) is really an IPv4 client
    if (strlen($bin) === 16 && substr($bin, 0, 12) === str_repeat("\0", 10) . "\xff\xff") return inet_ntop(substr($bin, 12));
    return bin2hex(substr($bin, 0, 8)) . '::/64';
}

// at most $limit hits per $window seconds per IP for the given bucket name
function rate_limit(string $name, int $limit, int $window): void {
    if (!bucket_hit($name . '|' . client_net(), $limit, $window)) json_out(429, ['ok' => false, 'error' => 'rate']);
}

// Site-wide ceiling on paid TypeSafe (Jev) calls across all visitors and all
// games; charged before any paid call and fails closed when spent.
function paid_budget(int $calls, bool $soft = false): bool {
    // a single client may use only its share of the day's paid budget
    $cap = (int) (settings()['paid_ip_daily'] ?? 150);
    $ih  = @fopen(state_dir() . '/paid-ip-' . hash('sha256', client_net()) . '.json', 'c+');
    if (!$ih || !flock($ih, LOCK_EX)) json_out(503, ['ok' => false, 'error' => 'budget']);
    $day = gmdate('Y-m-d');
    $c = json_decode((string) stream_get_contents($ih), true);
    if (!is_array($c) || ($c['d'] ?? '') !== $day) $c = ['d' => $day, 'n' => 0];
    if ($c['n'] + $calls > $cap) {
        flock($ih, LOCK_UN); fclose($ih);
        if ($soft) return false;
        json_out(429, ['ok' => false, 'error' => 'budget']);
    }
    $limit = (int) (settings()['paid_daily_budget'] ?? 1500);
    $fh = @fopen(state_dir() . '/paid-budget.json', 'c+');
    if (!$fh || !flock($fh, LOCK_EX)) json_out(503, ['ok' => false, 'error' => 'budget']);
    $s = json_decode((string) stream_get_contents($fh), true);
    if (!is_array($s) || ($s['d'] ?? '') !== $day) $s = ['d' => $day, 'n' => 0];
    if ($s['n'] + $calls > $limit) {
        flock($fh, LOCK_UN); fclose($fh); flock($ih, LOCK_UN); fclose($ih);
        if ($soft) return false;
        json_out(429, ['ok' => false, 'error' => 'budget']);
    }
    $s['n'] += $calls;
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($s)); fflush($fh);
    flock($fh, LOCK_UN); fclose($fh);
    $c['n'] += $calls;
    ftruncate($ih, 0); rewind($ih); fwrite($ih, json_encode($c)); fflush($ih);
    flock($ih, LOCK_UN); fclose($ih);
    return true;
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
