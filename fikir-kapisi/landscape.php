<?php
// Fikir Kapısı — "Karşındakiler": patents (Google Patents), papers (OpenAlex) and EU projects (CORDIS)
// that correspond to the player's idea, matched by Jev. Same-origin POST, rate limited, cached by query.
// Only the player's keywords (or the first ten words of the idea) are sent to the search engines.

require __DIR__ . '/../lib.php';
ini_set('max_execution_time', '60');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(405, ['ok' => false, 'error' => 'method']);
same_origin_or_die();
rate_limit('fikir-landscape', 10, 600);

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
$idea = mb_substr(trim((string) ($in['idea'] ?? '')), 0, 1500);
$kw = mb_substr(trim((string) ($in['keywords'] ?? '')), 0, 120);
$kw = preg_replace('/[^\p{L}\p{N}\s\-]/u', ' ', $kw);
$q = trim($kw !== '' ? $kw : implode(' ', array_slice(preg_split('/\s+/', $idea), 0, 10)));
if ($q === '' || $idea === '') json_out(400, ['ok' => false, 'error' => 'empty']);

$cacheFile = sys_get_temp_dir() . '/asimogg-landscape-' . sha1($q . '|' . mb_substr($idea, 0, 300)) . '.json';
if (is_file($cacheFile) && filemtime($cacheFile) > time() - 86400) { echo file_get_contents($cacheFile); exit; }

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
$LAST_HTTP = 0;
function get_json(string $url, int $timeout = 20): ?array {
    global $LAST_HTTP;
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_FOLLOWLOCATION => true, CURLOPT_ENCODING => '',
        CURLOPT_HTTPHEADER => ['User-Agent: ' . UA, 'Accept: application/json', 'Accept-Language: en-US,en;q=0.9']]);
    $raw = curl_exec($ch); $LAST_HTTP = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    $j = json_decode((string) $raw, true);
    if (!is_array($j)) throw new RuntimeException('http ' . $LAST_HTTP);
    return $j;
}

function src_openalex(string $q): array {
    $u = 'https://api.openalex.org/works?' . http_build_query(['search' => $q, 'per-page' => 20, 'mailto' => 'hello@asimogg.io',
        'filter' => 'has_abstract:true', 'select' => 'id,doi,title,abstract_inverted_index,publication_year,cited_by_count']);
    $out = [];
    foreach ((get_json($u)['results'] ?? []) as $w) {
        $pos = [];
        foreach ((array) ($w['abstract_inverted_index'] ?? []) as $word => $ps) foreach ($ps as $p) $pos[$p] = $word;
        ksort($pos);
        $out[] = ['src' => 'makale', 'title' => (string) $w['title'], 'text' => mb_substr(implode(' ', $pos), 0, 1200),
                  'year' => (string) ($w['publication_year'] ?? ''), 'who' => ($w['cited_by_count'] ?? 0) . ' cit.', 'url' => $w['doi'] ?: $w['id']];
    }
    return $out;
}
function src_patents(string $q): array {
    $inner = http_build_query(['q' => $q, 'num' => 20]);
    $j = get_json('https://patents.google.com/xhr/query?url=' . rawurlencode($inner) . '&exp=');
    $out = [];
    foreach (($j['results']['cluster'] ?? []) as $c) foreach (($c['result'] ?? []) as $r) {
        $pt = $r['patent'] ?? []; $num = (string) ($pt['publication_number'] ?? ''); if ($num === '') continue;
        $out[] = ['src' => 'patent', 'title' => trim((string) ($pt['title'] ?? '')), 'text' => mb_substr(trim((string) ($pt['snippet'] ?? '')), 0, 1200),
                  'year' => substr((string) ($pt['priority_date'] ?? ''), 0, 4), 'who' => (string) ($pt['assignee'] ?? ''), 'url' => "https://patents.google.com/patent/$num/en"];
    }
    return $out;
}
function src_cordis(string $q): array {
    $words = array_slice(preg_split('/\s+/', $q), 0, 4); $results = [];
    foreach ([implode(' AND ', $words), implode(' AND ', array_slice($words, 0, 2)), implode(' OR ', $words)] as $expr) {
        $u = 'https://cordis.europa.eu/api/search/results?' . http_build_query(['q' => "contenttype='project' AND ($expr)", 'p' => 1, 'num' => 10, 'srt' => 'Relevance:decreasing', 'format' => 'json']);
        $results = get_json($u)['payload']['results'] ?? [];
        if (count($results) >= 3) break;
    }
    $out = [];
    foreach ($results as $r) {
        preg_match('/(20\d\d|19\d\d)/', (string) ($r['startDate'] ?? ''), $m);
        $out[] = ['src' => 'ab_projesi', 'title' => (string) ($r['title'] ?? ''), 'text' => mb_substr((string) ($r['teaser'] ?? ''), 0, 1200),
                  'year' => $m[1] ?? '', 'who' => (string) ($r['acronym'] ?? ''), 'url' => 'https://cordis.europa.eu/project/id/' . ($r['id'] ?? '')];
    }
    return $out;
}

$t0 = microtime(true); $cands = []; $errors = [];
foreach (['makale' => 'src_openalex', 'patent' => 'src_patents', 'ab_projesi' => 'src_cordis'] as $name => $fn) {
    try { $cands = array_merge($cands, $fn($q)); } catch (Throwable $e) { $errors[$name] = substr($e->getMessage(), 0, 120); }
}
$tFetch = round(microtime(true) - $t0, 1);

$LQS = [
    'rel' => ['type' => 'score', 'instructions' => "How closely does `item` (a paper, patent or funded project) correspond to the player's `idea`?", 'criteria' => [
        'Unrelated', 'Same broad field, different problem', 'Same problem, clearly different solution', 'Similar solution or mechanism, partial overlap with the idea', 'Essentially the same idea: same problem, same solution principle']],
    'kind' => ['type' => 'choice', 'instructions' => "What is `item` to the player's `idea`?", 'criteria' => [
        'ayni_cozum' => 'essentially the same solution already exists here', 'kismi_ortusme' => 'overlaps with part of the idea (a component, mechanism or application)',
        'yakin_alan' => 'adjacent work worth reading, no direct overlap', 'alakasiz' => 'not relevant']],
];
// Jev scoring, 8 requests in flight at a time
$t1 = microtime(true); $scored = []; $tokens = 0;
foreach (array_chunk($cands, 8) as $chunk) {
    $mh = curl_multi_init(); $hs = [];
    foreach ($chunk as $i => $c) {
        $body = json_encode(['state' => ['idea' => $idea, 'item' => ['type' => $c['src'], 'title' => $c['title'], 'text' => $c['text']]], 'model' => 'jev-latest', 'questions' => $LQS], JSON_UNESCAPED_UNICODE);
        $h = curl_init('https://api.typesafe.ai/v1/systemone');
        curl_setopt_array($h, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $key]]);
        curl_multi_add_handle($mh, $h); $hs[$i] = $h;
    }
    do { $st = curl_multi_exec($mh, $running); if ($running) curl_multi_select($mh, 1.0); } while ($running && $st === CURLM_OK);
    foreach ($hs as $i => $h) {
        $r = json_decode((string) curl_multi_getcontent($h), true); curl_multi_remove_handle($mh, $h); curl_close($h);
        if (!isset($r['answers'])) continue;
        $a = $r['answers']; $tokens += ($r['usage']['input_tokens'] ?? 0) + ($r['usage']['output_tokens'] ?? 0);
        $scored[] = $chunk[$i] + ['rel' => round((float) $a['rel']['score'], 2), 'kind' => (string) $a['kind']['choice'], 'conf' => round((float) $a['kind']['confidence'], 2)];
    }
    curl_multi_close($mh);
}
$top = []; $counts = [];
foreach (['patent', 'makale', 'ab_projesi'] as $s) {
    $thr = $s === 'ab_projesi' ? 2.0 : 2.5;
    $rows = array_values(array_filter($scored, fn($x) => $x['src'] === $s && $x['rel'] >= $thr));
    usort($rows, fn($a, $b) => $b['rel'] <=> $a['rel']);
    $top[$s] = array_map(fn($x) => ['title' => $x['title'], 'year' => $x['year'], 'who' => $x['who'], 'url' => $x['url'], 'rel' => $x['rel'], 'kind' => $x['kind']], array_slice($rows, 0, 5));
    $counts[$s] = count(array_filter($scored, fn($x) => $x['src'] === $s));
}
$out = ['ok' => true, 'query' => $q, 'counts' => $counts, 'top' => $top, 'same_solution' => count(array_filter($scored, fn($x) => $x['kind'] === 'ayni_cozum')),
        'errors' => $errors, 'timing' => ['fetch_s' => $tFetch, 'jev_s' => round(microtime(true) - $t1, 1), 'tokens' => $tokens]];
$json = json_encode($out, JSON_UNESCAPED_UNICODE);
if (!$errors) @file_put_contents($cacheFile, $json, LOCK_EX);   // a source outage (e.g. Google Patents 503) is retried next time, not cached
http_response_code(200); header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); echo $json;
