<?php
// Google Sign-In gate for Masterclass and the Bi'Boya film.
// POST {credential, content, lang} -> verifies the Google ID token, records the
// lead (mail + Google Sheet), returns a short-lived signed URL for the content.

require __DIR__ . '/lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(405, ['ok' => false, 'error' => 'method']);
same_origin_or_die();
rate_limit('unlock', 20, 3600);

$cfg      = settings();
$content  = $_POST['content'] ?? '';
$lang     = ($_POST['_language'] ?? 'en') === 'tr' ? 'tr' : 'en';
$deckLang = ($_POST['deck'] ?? 'en') === 'tr' ? 'tr' : 'en';
if (!in_array($content, ['masterclass', 'biboya'], true)) json_out(422, ['ok' => false, 'error' => 'content']);

$name = '';
$email = '';

if ($cfg['google_client_id'] === '') {
    // gate not configured yet: content stays reachable, no lead is recorded
    $mode = 'open';
} else {
    $credential = (string) ($_POST['credential'] ?? '');
    if ($credential === '' || strlen($credential) > 4096) json_out(422, ['ok' => false, 'error' => 'credential']);

    $info = http_get_json('https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($credential));
    if (!$info
        || ($info['aud'] ?? '') !== $cfg['google_client_id']
        || !in_array($info['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)
        || (int) ($info['exp'] ?? 0) < time()
        || ($info['email_verified'] ?? 'false') !== 'true') {
        json_out(401, ['ok' => false, 'error' => 'google']);
    }
    $email = mb_substr((string) $info['email'], 0, 254);
    $name  = mb_substr(trim(preg_replace('/\s+/u', ' ', (string) ($info['name'] ?? ''))), 0, 200);
    $mode  = 'google';
}

$token = sign_token(['c' => $content, 'e' => $email, 'm' => $mode]);
$url   = $content === 'masterclass'
    ? 'deck.php?l=' . $deckLang . '&t=' . $token
    : 'media.php?t=' . $token;

if ($mode === 'google') {
    $ip    = $_SERVER['REMOTE_ADDR'] ?? '';
    $when  = date('Y-m-d H:i:s');
    $label = $content === 'masterclass' ? 'Masterclass' : "Bi'Boya reklam";

    // 1) notify by mail
    $subject = '=?UTF-8?B?' . base64_encode("Yeni izleyici: $label — $name") . '?=';
    $body = "İçerik açıldı / Content unlocked\n"
          . "----------------------------------\n"
          . "İçerik   : $label\n"
          . "Ad       : $name\n"
          . "E-posta  : $email\n"
          . "Dil      : $lang\n"
          . "IP       : $ip\n"
          . "Zaman    : $when\n";
    $headers = [
        'From: asimogg.io <form@asimogg.io>',
        'Cc: ' . $cfg['lead_cc'],
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];
    @mail($cfg['lead_to'], $subject, $body, implode("\r\n", $headers));

    // 2) append to the Google Sheet
    if ($cfg['sheets_webhook'] !== '') {
        http_post_json($cfg['sheets_webhook'], [
            'key' => $cfg['sheets_key'],
            'row' => [$when, $name, $email, $label, $lang, $ip],
        ]);
    }
}

json_out(200, ['ok' => true, 'url' => $url, 'mode' => $mode]);
