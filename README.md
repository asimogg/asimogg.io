# asimo.gg — AI Automation Landing Page

Single-page, bilingual (EN/TR) landing site. No build step; a few small PHP endpoints on the host handle mail and gated content.

## Google integrations (edit `settings.php`)

| Setting | What it does | Where to get it |
|---|---|---|
| `ga_id` | Google Analytics 4 on the landing page, loaded only after the visitor accepts the consent bar | analytics.google.com → Admin → Data streams → Measurement ID (`G-…`) |
| `google_client_id` | "Open with Google" gate in front of the Masterclass and the Saphire film. Each unlock is mailed to `lead_to` (+CC) | console.cloud.google.com → APIs & Services → Credentials → OAuth client ID (Web) → Authorized JavaScript origins: `https://asimogg.io` |
| `sheets_webhook` | Appends every unlock as a row to the Leads Google Sheet | Sheet → Extensions → Apps Script → paste `tools/sheets-webhook.gs` → Deploy as web app (Anyone) → copy URL |

While `google_client_id` is empty the gate is off and both contents open directly.

Gated originals live in `private/` (never served directly). `deck.php` and `media.php` serve them only with a signed, 12-hour token issued by `unlock.php`.

## Files

- `index.html` — the whole page (both languages live in the markup)
- `settings.php` / `config.php` — site settings and their public JS export
- `unlock.php`, `deck.php`, `media.php`, `lib.php` — Google gate, signed delivery of decks and film
- `private/` — Masterclass decks (EN/TR) and the Saphire film
- `tools/sheets-webhook.gs` — Apps Script for the Leads sheet
- `styles.css` — design system + layout
- `script.js` — language toggle (persists in localStorage), form submission
- `fonts/` — self-hosted Archivo variable font
- `favicon.svg`

## Form

The inquiry form posts to `send.php` (same-origin only, rate-limited, honeypot) which mails hello@asimogg.io with a CC to asimize@gmail.com.

## Deploy to Hostinger (from GitHub)

1. Push this repo to GitHub.
2. In Hostinger hPanel: **Websites → Manage → Advanced → Git**.
3. Add the repository (URL of this repo, branch `main`), deploy into `public_html`.
4. Enable auto-deployment (webhook) so every push updates the site.

## Local preview

```bash
python3 -m http.server 8123
```

Then open http://localhost:8123
