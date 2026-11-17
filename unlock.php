<?php
// Magic-link gate for the Masterclass.
// POST {content, name, email, consent, _language} -> e-mails the visitor a
// short-lived signed link (open.php?t=...). Nothing is recorded until the link
// is used, so every lead that reaches the inbox has a verified address.
// While settings()['gate'] is 'off', a session link is returned directly.

require __DIR__ . '/lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(405, ['ok' => false, 'error' => 'method']);
same_origin_or_die();

$cfg     = settings();
$content = (string) ($_POST['content'] ?? '');
$lang    = ($_POST['_language'] ?? 'en') === 'tr' ? 'tr' : 'en';
if (!in_array($content, ['masterclass'], true)) json_out(422, ['ok' => false, 'error' => 'content']);

if ($cfg['gate'] === 'off') {
    // gate switched off: content stays reachable, no lead is recorded
    $token = sign_token(['c' => $content, 'e' => '', 'm' => 'open']);
    json_out(200, ['ok' => true, 'mode' => 'open', 'url' => content_url($content, $token, $lang)]);
}

// honeypot: real visitors never fill this hidden field
if (!empty($_POST['_gotcha'])) json_out(200, ['ok' => true, 'mode' => 'magic']);

rate_limit('unlock', 5, 3600);

$name  = trim(preg_replace('/\s+/u', ' ', preg_replace('/\p{C}/u', '', (string) ($_POST['name'] ?? ''))) ?? '');
$name  = mb_substr($name, 0, 200);
// mail to an unverified address carries no visitor-written text (the name is
// kept in the token for the owner's lead mail only)
$greet = '';
$email = mb_substr(trim((string) ($_POST['email'] ?? '')), 0, 254);

if (($_POST['consent'] ?? '') !== 'yes') json_out(422, ['ok' => false, 'error' => 'consent']);
if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n"]/', $email)) {
    json_out(422, ['ok' => false, 'error' => 'validation']);
}

// at most 3 links per mailbox per hour, whatever the IP (+tags and gmail dots
// count as the same mailbox), and at most 30 link mails per hour site-wide
[$lp, $dom] = array_pad(explode('@', strtolower($email), 2), 2, '');
$lp = preg_replace('/\+.*$/', '', $lp);
if (in_array($dom, ['gmail.com', 'googlemail.com'], true)) { $lp = str_replace('.', '', $lp); $dom = 'gmail.com'; }
$net = client_net();
if (strpos($net, ':') === false) $net = preg_replace('/\.\d+$/', '', $net);   // IPv4: per /24
if (!bucket_hit('link|' . $lp . '@' . $dom, 3, 3600) || !bucket_hit('link-net|' . $net, 10, 3600)
    || !bucket_hit('link-all', 300, 3600)) {
    json_out(429, ['ok' => false, 'error' => 'rate']);
}
$now = time();

$token = sign_token([
    'c' => $content, 'e' => $email, 'n' => $name, 'l' => $lang, 'm' => 'link',
    'exp' => $now + (int) $cfg['link_ttl'],
]);
$link  = site_url() . '/open.php?t=' . $token;
$mins  = (int) round($cfg['link_ttl'] / 60);
$label = $content === 'masterclass' ? 'Masterclass' : ($lang === 'tr' ? 'Saphire filmi' : 'Saphire film');

if ($lang === 'tr') {
    $subject = "$label açılış bağlantın — asimogg.io";
    $body = ($greet !== '' ? "Merhaba $greet,\n\n" : "Merhaba,\n\n")
          . "$label için açılış bağlantın aşağıda. Bağlantı $mins dakika geçerli; tıkladığında içerik tarayıcında açılır.\n\n"
          . "$link\n\n"
          . "Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin; bağlantı kullanılmadan kendiliğinden geçersiz olur.\n\n"
          . "asimogg.io\n";
} else {
    $subject = "Your $label link — asimogg.io";
    $body = ($greet !== '' ? "Hello $greet,\n\n" : "Hello,\n\n")
          . "Here is your link for the $label. It is valid for $mins minutes; the content opens in your browser when you click it.\n\n"
          . "$link\n\n"
          . "If you did not request this, ignore this e-mail; the link expires by itself.\n\n"
          . "asimogg.io\n";
}

$sent = send_mail($email, $subject, $body);
if (!$sent) json_out(500, ['ok' => false, 'error' => 'mail']);

json_out(200, ['ok' => true, 'mode' => 'magic', 'minutes' => $mins]);
