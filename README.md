# Decision Firewall (PWA)

Decision Firewall is a client-only Progressive Web App that helps you pause, log, and learn from daily decisions. Everything stays on your device—no accounts, no tracking, no external services.

## Features
- Quick decision logging with mood/energy tracking.
- 10-second pause ritual before distractions.
- Daily check-ins.
- Insights with regret rates, high-risk windows, and patterns.
- Offline-ready after the first load.
- Export/Import for backups.

## iPhone Install Steps (Safari)
1. Host the app (see hosting options below).
2. Open the app URL in Safari.
3. Tap **Share** → **Add to Home Screen**.
4. Launch from the Home Screen for full-screen mode.

## Hosting Options
### GitHub Pages (from GitHub Mobile)
1. Create a new GitHub repo and upload all files in this project.
2. In GitHub Mobile, go to the repo → **Settings** → **Pages**.
3. Set the source to the `main` branch and `/root` folder.
4. Save. Your site will be available at the provided GitHub Pages URL.

### Simple Host (any static host)
- Upload the files to any static host (Netlify Drop, Cloudflare Pages, etc.).
- Ensure `index.html` is at the root of the hosted site.

## Backup & Restore
- Go to **Settings** → **Export data (JSON)** and save the file (iOS: Share → Save to Files).
- To restore, use **Import data (JSON)** and select your backup file.

## Privacy
- Local-only. No analytics, no tracking, and no network calls after the first load.

## Icons
This project uses simple SVG icons in the `icons/` folder. You can replace them with PNGs of the same sizes if desired:
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)
- `apple-touch-icon.png` (180x180)

If you add PNGs, update `manifest.webmanifest` and the `<link rel="apple-touch-icon">` in `index.html`.
