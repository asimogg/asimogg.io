<?php
// "Sel" — the decision duel. op=start hands out a 12-card round and Jev's picks
// (asked in one request, timed on the server, network included); op=result
// records an anonymous summary and returns the running averages of everyone.
require __DIR__ . '/lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$cfg  = settings();
$deck = json_decode((string) file_get_contents(__DIR__ . '/assets/sel/cards.json'), true);
if (!is_array($deck)) json_out(500, ['ok' => false, 'error' => 'deck']);
$op   = $_GET['op'] ?? '';
$lang = (($_GET['lang'] ?? 'en') === 'tr') ? 'tr' : 'en';

function typesafe_key(array $cfg): string {
    $env = getenv('TYPESAFE_API_KEY');
    if ($env) return trim($env);
    $f = $cfg['typesafe_key_file'] ?? '';
    return ($f && is_file($f)) ? trim((string) file_get_contents($f)) : '';
}

// Stats live outside the web root or in the owner-checked state dir; an
// older private/ copy is migrated once, the shared temp dir is never trusted.
function stats_file(): string {
    $name = 'asimogg-sel-stats.json';
    $above = dirname(__DIR__) . '/.' . $name;
    if ((is_file($above) && is_writable($above)) || (!is_file($above) && is_writable(dirname($above)))) return $above;
    $f = state_dir() . '/' . $name;
    $legacy = __DIR__ . '/private/' . $name;
    if (!is_file($f) && ($old = state_read($legacy)) !== null) @file_put_contents($f, $old, LOCK_EX);
    return $f;
}

function stats_read(): array {
    $f = stats_file();
    $d = json_decode((string) state_read($f), true);
    return is_array($d) ? $d : ['games' => 0, 'h_correct' => 0, 'h_cards' => 0, 'h_ms' => 0, 'h_n' => 0, 'j_correct' => 0, 'j_cards' => 0, 'j_ms' => 0, 'j_n' => 0];
}

function stats_summary(array $s): array {
    return [
        'games'   => (int) $s['games'],
        'human'   => ['acc' => $s['h_cards'] ? round($s['h_correct'] / $s['h_cards'], 3) : null, 'ms' => $s['h_n'] ? (int) round($s['h_ms'] / $s['h_n']) : null],
        'jev'     => ['acc' => $s['j_cards'] ? round($s['j_correct'] / $s['j_cards'], 3) : null, 'ms' => $s['j_n'] ? (int) round($s['j_ms'] / $s['j_n']) : null],
    ];
}

// Ask Jev for all cards of the round in one request; returns picks + latency or null when offline.
function jev_ask(array $cards, array $bins, string $lang, array $cfg): ?array {
    $key = typesafe_key($cfg);
    if ($key === '' || !function_exists('curl_init')) return null;
    $criteria = [];
    foreach ($bins as $k => $b) $criteria[$k] = $b['desc'];
    $state = ['inbox_owner' => 'a department manager with a busy calendar, an assistant and a team who handle routine requests, lookups and re-sends', 'cards' => []];
    $questions = [];
    foreach ($cards as $c) {
        $state['cards'][] = ['id' => $c['id'], 'text' => $c[$lang]];
        $questions[$c['id']] = [
            'type' => 'choice',
            'instructions' => 'For the inbox card with id ' . $c['id'] . ' in `cards` (text: "' . str_replace('"', "'", $c[$lang]) . '"), which action fits best for the `inbox_owner`?',
            'criteria' => $criteria,
        ];
    }
    $body = json_encode(['state' => $state, 'model' => $cfg['typesafe_model'] ?? 'jev-latest', 'questions' => $questions]);
    $ch = curl_init('https://api.typesafe.ai/v1/systemone');
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $key, 'Content-Type: application/json'],
        CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $t0  = microtime(true);
    $raw = curl_exec($ch);
    $ms  = (int) round((microtime(true) - $t0) * 1000);
    $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($raw === false || $code !== 200) return null;
    $res = json_decode((string) $raw, true);
    if (!is_array($res) || empty($res['answers'])) return null;
    $picks = [];
    foreach ($cards as $c) {
        $a = $res['answers'][$c['id']] ?? null;
        if (!$a || empty($a['choice'])) return null;
        $picks[$c['id']] = ['choice' => $a['choice'], 'confidence' => round((float) ($a['confidence'] ?? 0), 2)];
    }
    return ['ms' => $ms, 'model' => $res['model'] ?? null, 'picks' => $picks];
}

if ($op === 'start' || $op === 'result') same_origin_or_die();

if ($op === 'start') {
    rate_limit('sel-start', 40, 3600);
    $byLabel = [];
    foreach ($deck['cards'] as $c) $byLabel[$c['label']][] = $c;
    $round = [];
    foreach ($byLabel as $label => $list) {           // three of each bin, shuffled
        shuffle($list);
        $round = array_merge($round, array_slice($list, 0, 3));
    }
    shuffle($round);
    // one paid call per round, charged to the site-wide budget; when it is
    // spent the round still runs solo (no Jev picks)
    $jev = (typesafe_key($cfg) !== '' && paid_budget(1, true)) ? jev_ask($round, $deck['bins'], $lang, $cfg) : null;
    $out = [];
    foreach ($round as $c) $out[] = ['id' => $c['id'], 'text' => $c[$lang], 'label' => $c['label']];
    // signed round: op=result is counted once per issued round, and Jev's score
    // is computed here from its own picks, never taken from the client
    $jc = null;
    if ($jev) { $jc = 0; foreach ($round as $c) if (($jev['picks'][$c['id']]['choice'] ?? '') === $c['label']) $jc++; }
    $rb = b64url(json_encode(['n' => bin2hex(random_bytes(8)), 'iat' => time(), 'cards' => count($round), 'jc' => $jc, 'jms' => $jev['ms'] ?? null]));
    $roundToken = $rb . '.' . b64url(hash_hmac('sha256', 'sel|' . $rb, secret(), true));
    json_out(200, ['ok' => true, 'lang' => $lang, 'bins' => $deck['bins'], 'cards' => $out, 'jev' => $jev, 'round' => $roundToken, 'stats' => stats_summary(stats_read())]);
}

if ($op === 'result') {
    rate_limit('sel-result', 40, 3600);
    $in = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($in)) json_out(400, ['ok' => false, 'error' => 'json']);
    $cards = (int) ($in['cards'] ?? 0);
    $hc = (int) ($in['human_correct'] ?? -1); $hms = (int) ($in['human_ms'] ?? 0); $hn = (int) ($in['human_n'] ?? 0);
    $jc = isset($in['jev_correct']) ? (int) $in['jev_correct'] : null; $jms = (int) ($in['jev_ms'] ?? 0);
    if ($cards < 1 || $cards > 12 || $hc < 0 || $hc > $cards || $hn < 0 || $hn > $cards || $hms < 0 || $hms > 60000 * 12) json_out(400, ['ok' => false, 'error' => 'range']);
    if ($jc !== null && ($jc < 0 || $jc > $cards || $jms < 0 || $jms > 60000)) json_out(400, ['ok' => false, 'error' => 'range']);
    // rounds that no human hand can produce stay out of the running averages
    if ($hn === 0 && ($hc !== 0 || $hms !== 0)) json_out(400, ['ok' => false, 'error' => 'range']);
    $notCounted = fn() => json_out(200, ['ok' => true, 'stats' => stats_summary(stats_read()), 'counted' => false]);
    // only rounds this server issued, once each, within 30 minutes
    [$rb, $rs] = array_pad(explode('.', (string) ($in['round'] ?? ''), 2), 2, '');
    $rc = json_decode(b64url_decode($rb), true);
    if ($rb === '' || !hash_equals(b64url(hash_hmac('sha256', 'sel|' . $rb, secret(), true)), $rs)
        || !is_array($rc) || (int) ($rc['iat'] ?? 0) < time() - 1800 || (int) ($rc['cards'] ?? 0) !== $cards) $notCounted();
    $once = @fopen(state_dir() . '/sel-round-' . hash('sha256', (string) ($rc['n'] ?? '')) . '.flag', 'x');
    if (!$once) $notCounted();
    fclose($once);
    if ($hn === 0) $notCounted();   // nobody answered: nothing to average
    $jc  = isset($rc['jc']) ? (int) $rc['jc'] : null;
    $jms = (int) ($rc['jms'] ?? 0);
    $avg = $hn ? $hms / $hn : 0;
    if ($hn > 0 && ($avg < 350 || $avg > 60000 || ($hc === $cards && $avg < 600))) json_out(200, ['ok' => true, 'stats' => stats_summary(stats_read()), 'counted' => false]);
    $f = stats_file();
    $fh = fopen($f, 'c+');
    if ($fh && flock($fh, LOCK_EX)) {
        $s = json_decode((string) stream_get_contents($fh), true);
        if (!is_array($s)) $s = stats_read();
        $s['games']++; $s['h_correct'] += $hc; $s['h_cards'] += $cards; $s['h_ms'] += $hms; $s['h_n'] += $hn;
        if ($jc !== null) { $s['j_correct'] += $jc; $s['j_cards'] += $cards; $s['j_ms'] += $jms; $s['j_n'] += 1; }
        ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($s)); fflush($fh); flock($fh, LOCK_UN);
    }
    if ($fh) fclose($fh);
    json_out(200, ['ok' => true, 'stats' => stats_summary(stats_read())]);
}

json_out(404, ['ok' => false, 'error' => 'op']);
