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

function stats_file(): string {
    $name = 'asimogg-sel-stats.json';
    foreach ([dirname(__DIR__) . '/.' . $name, __DIR__ . '/private/' . $name, sys_get_temp_dir() . '/' . $name] as $f) {
        if (is_file($f) && is_writable($f)) return $f;
        if (!is_file($f) && is_writable(dirname($f))) return $f;
    }
    return sys_get_temp_dir() . '/' . $name;
}

function stats_read(): array {
    $f = stats_file();
    $d = is_file($f) ? json_decode((string) file_get_contents($f), true) : null;
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
    $jev = jev_ask($round, $deck['bins'], $lang, $cfg);
    $out = [];
    foreach ($round as $c) $out[] = ['id' => $c['id'], 'text' => $c[$lang], 'label' => $c['label']];
    json_out(200, ['ok' => true, 'lang' => $lang, 'bins' => $deck['bins'], 'cards' => $out, 'jev' => $jev, 'stats' => stats_summary(stats_read())]);
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
    $avg = $hn ? $hms / $hn : 0;
    if ($hn > 0 && ($avg < 350 || ($hc === $cards && $avg < 600))) json_out(200, ['ok' => true, 'stats' => stats_summary(stats_read()), 'counted' => false]);
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
