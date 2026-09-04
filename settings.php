<?php
// ---------------------------------------------------------------
// asimogg.io — site settings (the only file you need to edit)
// ---------------------------------------------------------------
return [
    // 1. Google Analytics 4 measurement id for the landing page (e.g. "G-ABC123XYZ").
    //    Leave empty to keep analytics off.
    'ga_id' => '',

    // 2. Google Sign-In: OAuth 2.0 Web client id from console.cloud.google.com
    //    (e.g. "1234567890-abc.apps.googleusercontent.com").
    //    While empty, Masterclass and the Bi'Boya film open without the gate.
    'google_client_id' => '',

    // 3. Google Sheets: Apps Script web-app URL that appends a row per unlock
    //    (see tools/sheets-webhook.gs). Leave empty to skip the sheet.
    'sheets_webhook' => '',
    'sheets_key'     => 'asimogg-leads',   // must match SHARED_KEY in the Apps Script

    // Where unlock notifications go
    'lead_to' => 'hello@asimogg.io',
    'lead_cc' => 'asimize@gmail.com',

    // How long an unlock link stays valid (seconds)
    'token_ttl' => 43200,
];
