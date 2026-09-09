<?php
// TEMPORARY self-test (deleted right after use): signs tokens the same way unlock.php
// does, so a second request to deck.php / media.php proves the secret persists.
require __DIR__ . '/lib.php';
header('Content-Type: application/json');
echo json_encode([
  'masterclass' => 'deck.php?l=en&t=' . sign_token(['c' => 'masterclass', 'e' => '', 'm' => 'google', 'exp' => time() + 300]),
  'saphire'     => 'media.php?t=' . sign_token(['c' => 'saphire', 'e' => '', 'm' => 'google', 'exp' => time() + 300]),
  'tmp' => sys_get_temp_dir(),
]);
