<?php
// Fikir Kapısı — Jev (TypeSafe System One) proxy.
// Same-origin POST only, rate limited, key never reaches the browser.
// Key file (first found wins): ../.asimogg-typesafe.key (above web root) or private/typesafe.key (403 by .htaccess).
// Nothing the player writes is stored on the server.

require __DIR__ . '/../lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(405, ['ok' => false, 'error' => 'method']);
same_origin_or_die();
rate_limit('fikir', 40, 600);

function typesafe_key(): string {
    foreach ([dirname(__DIR__, 2) . '/.asimogg-typesafe.key', dirname(__DIR__) . '/private/typesafe.key'] as $f) {
        if (is_file($f)) { $k = trim((string) file_get_contents($f)); if ($k !== '') return $k; }
    }
    return '';
}
$key = typesafe_key();
if ($key === '') json_out(503, ['ok' => false, 'error' => 'no_key']);

$in = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($in)) json_out(400, ['ok' => false, 'error' => 'json']);
$clip = fn($s, $n) => mb_substr(trim((string) $s), 0, $n);
$idea = $clip($in['idea'] ?? '', 1500);
$gate = $clip($in['gate'] ?? '', 40);
$question = $clip($in['question'] ?? '', 400);
$answer = $clip($in['answer'] ?? '', 1500);
$answers = [];
foreach (array_slice((array) ($in['answers'] ?? []), 0, 12) as $a) {
    if (!is_array($a)) continue;
    $answers[] = ['gate' => $clip($a['gate'] ?? '', 40), 'question' => $clip($a['question'] ?? '', 400), 'answer' => $clip($a['answer'] ?? '', 1500)];
}
if ($answer === '') json_out(400, ['ok' => false, 'error' => 'empty']);

$dims = [
    'yenilik'   => ['Identical to a known product, no difference', 'Minor improvement, competitors can copy easily', 'Clear difference but similar solutions exist', 'New in the sector, a defensible difference', 'A new category or mechanism, patentable level'],
    'teknik'    => ['How it works is not explained', 'Idea level, mechanism unclear', 'Mechanism clear, no experiment', 'Bench experiment or prototype exists, results mentioned', 'Measured results, repeated experiments, numbers given'],
    'musteri'   => ['No customer or user is named', 'A generic audience assumption', 'A specific customer type and problem described', 'Talked to customers, need validated', 'Concrete evidence such as willingness to pay or pilot request'],
    'ekonomi'   => ['No cost or price at all', 'Only generic claims like "it will be cheap"', 'Rough cost or price estimate', 'Cost, price and competitor price compared', 'Unit economics and volume assumptions with numbers'],
    'uygulama'  => ['No next step', 'Vague "we will work on it"', 'Steps exist, no owner or timing', 'Steps, owner and timing for the first 90 days', 'Steps, resources, risks and decision points defined'],
];
$nouls = [
    'sayi_var'      => 'Does `answer` contain a concrete measurement, number, quantity or date?',
    'rakip_var'     => 'Does `answer` name a competitor, an existing alternative product, or how the problem is solved today?',
    'risk_farkinda' => 'Does the player acknowledge a specific risk, unknown or weakness of their own idea in `answer`?',
    'belirsiz'      => "Is `answer` vague, evasive, off-topic or too short to judge (e.g. 'I don't know', one generic sentence)?",
];
$dossier = '';
foreach ($answers as $a) $dossier .= "[{$a['gate']}] Q: {$a['question']}\nA: {$a['answer']}\n";
$state = ['idea' => $idea, 'dossier_so_far' => $dossier, 'current_gate' => $gate, 'question' => $question, 'answer' => $answer,
          'note' => 'Player answers may be in Turkish or English. Judge the substance, not the language quality.'];
$qs = [];
foreach ($dims as $d => $levels) {
    $qs["dim_$d"] = ['type' => 'score', 'instructions' => "Judging the WHOLE dossier (`idea`, `dossier_so_far`, and the new `answer`), how developed is the '$d' dimension of this project idea?", 'criteria' => $levels];
}
foreach ($nouls as $n => $t) $qs[$n] = ['type' => 'noul', 'instructions' => $t];
$body = json_encode(['state' => $state, 'model' => 'jev-latest', 'questions' => $qs], JSON_UNESCAPED_UNICODE);

$t0 = microtime(true);
$ch = curl_init('https://api.typesafe.ai/v1/systemone');
curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $key]]);
$raw = curl_exec($ch); $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
$r = json_decode((string) $raw, true);
if ($code !== 200 || !isset($r['answers'])) json_out(502, ['ok' => false, 'error' => 'jev', 'status' => $code]);
$a = $r['answers']; $out = ['ok' => true, 'dims' => [], 'flags' => [], 'latency_s' => round(microtime(true) - $t0, 2), 'usage' => $r['usage'] ?? null, 'model' => $r['model'] ?? null];
foreach ($dims as $d => $_) $out['dims'][$d] = ['score' => round((float) $a["dim_$d"]['score'], 2), 'conf' => round((float) $a["dim_$d"]['confidence'], 2)];
foreach ($nouls as $n => $_) $out['flags'][$n] = round((float) $a[$n]['noul'], 2);
json_out(200, $out);
