<?php
// Exposes the public part of settings.php to the browser as JavaScript.
$cfg = require __DIR__ . '/settings.php';
header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
echo 'window.ASIMOGG = ' . json_encode([
    'gaId'           => $cfg['ga_id'],
    'googleClientId' => $cfg['google_client_id'],
]) . ';';
