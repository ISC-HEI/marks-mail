<p align="right">
  <img src="https://github.com/ISC-HEI/isc_logos/blob/ab8c41c12930c787f590183baa229a22709c81f9/black/ISC%20Logo%20inline%20black%20v3%20-%20large.webp?raw=true" align="right" alt="ISC Logo" height="50"/>
</p>

[![Deployed](https://img.shields.io/github/deployments/ISC-HEI/marks-mail/github-pages?label=deployment&color=blue)](https://isc-hei.github.io/marks-mail/)
![License](https://img.shields.io/badge/license-GPL--3.0-brightgreen)

## 👉 [Use the application](https://isc-hei.github.io/marks-mail/)

# ISC Grade Mailer

Internal tool for sending individual grades to students by email, using your own email application.

## Quick Start

```bash
chmod +x dev.sh
./dev.sh
```

Or manually:

```bash
bun install
bun run dev
```

Then open http://localhost:5173

## Usage

1. Enter the module name
2. Paste columns from Excel: **M/F | Last Name | First Name | Email | Grade**
   - The M/F column is optional — without it, paste Last Name | First Name | Email | Grade starting from the 2nd column
3. Customize the email template (subject + body) using tags `{civilite}`, `{prenom}`, `{nom}`, `{note}`, `{module}`
4. Click **Verify & send** to preview each email
5. Send one by one (✉) or all at once

## GitHub Pages Deployment

1. In `vite.config.js`, set `base`:
   ```js
   base: '/repo-name/'
   ```

2. Deploy:
   ```bash
   bun run deploy
   ```

3. In GitHub → Settings → Pages → Source: select branch `gh-pages`

---

*Made with ♥ by mui, 2026*
