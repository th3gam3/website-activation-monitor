# Website Activation Monitor

A real-time monitoring tool for checking the activation status of the Rembayung reservation widget.

## Features

- **Live Status Monitoring**: Checks if the website is active or redirected to a block page.
- **Real-time UI**: Updates status every 1 second without refreshing.
- **Visual Status Indicators**:
  - ✅ **Active**: Widget is reachable (active content detected).
  - ⛔ **Blocked**: Widget request is redirected/blocked.
- **Status History**: Shows a live rolling history of the latest checks at the bottom (newest first).
- **Live Clock**: Displays current time with seconds (12-hour format).
- **Dark iOS Glass UI**: Frosted glass panels with blur, subtle borders, depth, and an aurora-style dark background.
- **Motion + Accessibility**: Polished animations, with `prefers-reduced-motion` support.
- **Responsive Design**: Works well on mobile and desktop.

## Publish (GitHub + Vercel)

1. Push this repo to GitHub.
2. In Vercel, import the GitHub repo.
3. Deploy (no build command needed).

Vercel will serve:
- Static site from `public/`
- Serverless API from `api/status.js`

## Local Development (Optional)

Run locally without Vercel (simple Node server):
```bash
npm run local
```
Then open:
`http://localhost:3000`

If you want to run locally with Vercel’s dev server (requires Vercel CLI installed):
```bash
vercel dev
```
Then open:
`http://localhost:3000`

Note: If port 3000 is already in use, stop the existing process first.

## Configuration

- **Target URL**: Defaults are in `api/status.js`, but you can override via env vars:
  - `WIDGET_URL` (default: `https://reservation.umai.io/en/widget/rembayung`)
  - `BLOCK_URL` (default: `https://reservation.umai.io/en/block/rembayung`)
  - `FETCH_TIMEOUT_MS` (default: `8000`)

## API Response

`GET /api/status` returns HTTP 200 with JSON and `Cache-Control: no-store`.

- `status`: one of `ACTIVE_OTHER` (Active) or `REDIRECT_BLOCK` (Blocked). The UI is intentionally binary.
- `detailStatus`: internal classification (e.g. `QUEUE_ACTIVE`, `UPSTREAM_ERROR`, `TIMEOUT`, `ERROR`, etc.).
- `code`: upstream HTTP code (when available).
- `finalUrl`: final URL after redirects (when available).
- `durationMs`: time spent on the check.
- `timestamp`: ISO time the check completed.

## Credits

Made by : **IrSAR**
