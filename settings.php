<?php
// ---------------------------------------------------------------
// asimogg.io — site settings (the only file you need to edit)
// ---------------------------------------------------------------
return [
    // 1. Google Analytics 4 measurement id for the landing page (e.g. "G-ABC123XYZ").
    //    Leave empty to keep analytics off.
    'ga_id' => 'G-G4CR2DFRCW',

    // 2. Content gate for the Masterclass and the Saphire film.
    //    'magic' = the visitor enters name + e-mail and receives a short-lived
    //    link by e-mail (a verified lead is recorded when the link is used).
    //    'off'   = content opens directly, no lead is recorded.
    'gate'     => 'magic',
    'link_ttl' => 1800,   // e-mailed link validity (seconds)

    // 3. Google Sheets: Apps Script web-app URL that appends a row per unlock
    //    (see tools/sheets-webhook.gs). Leave empty to skip the sheet.
    'sheets_webhook' => '',
    'sheets_key'     => 'asimogg-leads',   // must match SHARED_KEY in the Apps Script

    // Where unlock notifications go
    'lead_to' => 'hello@asimogg.io',
    'lead_cc' => 'asimize@gmail.com',

    // How long the session lasts after the link was used (seconds)
    'token_ttl' => 43200,
];
