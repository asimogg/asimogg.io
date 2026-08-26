# asimo.gg — AI Automation Landing Page

Single-page, bilingual (EN/TR) static landing site. No build step, no backend.

## Files

- `index.html` — the whole page (both languages live in the markup)
- `styles.css` — design system + layout
- `script.js` — language toggle (persists in localStorage), form submission
- `fonts/` — self-hosted Archivo variable font
- `favicon.svg`

## Setup: connect the form (required)

The inquiry form posts to Formspree. Until connected, submissions show a "form isn't connected yet" message.

1. Create a free form at [formspree.io](https://formspree.io) (it forwards submissions to your email).
2. Copy the form's endpoint ID (looks like `xkgwabcd`).
3. In `index.html`, replace `YOUR_FORM_ID` in the form's `action` attribute:
   `action="https://formspree.io/f/xkgwabcd"`

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
