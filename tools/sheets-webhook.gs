// Google Apps Script — appends one row per unlock to the Leads sheet.
//
// Setup (once, ~2 minutes):
//  1. Open the sheet "asimogg.io — Leads (Masterclass & Bi'Boya)"
//  2. Extensions → Apps Script → paste this file, save
//  3. Deploy → New deployment → type "Web app"
//       Execute as: Me   ·   Who has access: Anyone
//  4. Copy the web-app URL into settings.php → 'sheets_webhook'

var SHARED_KEY = 'asimogg-leads'; // must match settings.php → 'sheets_key'

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents || '{}');
    if (data.key !== SHARED_KEY || !Array.isArray(data.row)) {
      return ContentService.createTextOutput('forbidden').setMimeType(ContentService.MimeType.TEXT);
    }
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    sheet.appendRow(data.row.map(function (v) { return String(v).slice(0, 500); }));
    return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput('error').setMimeType(ContentService.MimeType.TEXT);
  }
}
