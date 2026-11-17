<?php
// Lands the visitor from the e-mailed magic link: verifies the link token,
// records the (now verified) lead, mints a session token and opens the content.
require __DIR__ . '/lib.php';

$cfg    = settings();
$token  = (string) ($_GET['t'] ?? '');
$claims = null;
foreach (['masterclass'] as $c) {
    if (($claims = verify_token($token, $c, 'link')) !== null) break;
}
if ($claims === null) {
    // expired or tampered: back to the gate with a note
    header('Location: /?locked=expired', true, 302);
    exit;
}

$content = (string) $claims['c'];
$email   = (string) ($claims['e'] ?? '');
$name    = (string) ($claims['n'] ?? '');
$lang    = ($claims['l'] ?? 'en') === 'tr' ? 'tr' : 'en';

// one notification per link: remember the link's signature for its lifetime
$seen = state_dir() . '/seen-' . hash('sha256', $token) . '.flag';
$fh = @fopen($seen, 'x');   // exclusive create: exactly one notification per link
if ($fh) {
    fwrite($fh, (string) time()); fclose($fh);
    $ip    = $_SERVER['REMOTE_ADDR'] ?? '';
    $when  = date('Y-m-d H:i:s');
    $label = $content === 'masterclass' ? 'Masterclass' : 'Saphire film';

    $subject = "Yeni izleyici: $label — $name";
    $body = "İçerik açıldı / Content unlocked (e-posta bağlantısı doğrulandı)\n"
          . "----------------------------------\n"
          . "İçerik   : $label\n"
          . "Ad       : $name\n"
          . "E-posta  : $email\n"
          . "Dil      : $lang\n"
          . "IP       : $ip\n"
          . "Zaman    : $when\n";
    send_mail($cfg['lead_to'], $subject, $body, ['Cc: ' . $cfg['lead_cc'], 'Reply-To: ' . $email]);

    if ($cfg['sheets_webhook'] !== '') {
        http_post_json($cfg['sheets_webhook'], [
            'key' => $cfg['sheets_key'],
            // neutralise spreadsheet formulas: a leading = + - @ is stored as text
            'row' => array_map(fn($v) => preg_match('/^[=+\-@\t\r]/', (string) $v) ? "'" . $v : $v,
                               [$when, $name, $email, $label, $lang, $ip]),
        ]);
    }
}

$session = sign_token(['c' => $content, 'e' => $email, 'm' => 'session']);
header('Cache-Control: no-store');
header('Location: ' . content_url($content, $session, $lang), true, 302);
