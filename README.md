# Website Activation Monitor

A real-time monitoring tool for checking the activation status of the Rembayung reservation widget.

## Features

- **Live Status Monitoring**: Checks if the website is active or redirected to a block page.
- **Real-time UI**: Updates status every 5 seconds without refreshing.
- **Visual Status Indicators**:
  - ✅ **Queue Active**: Website is serving the virtual queue/high traffic page.
  - ⛔ **Redirect Block**: Website is redirecting to the block page.
  - ⚠️ **Active (Other)**: Website is active but content is unknown.
- **Live Clock**: Displays current time with seconds (12-hour format).
- **Responsive Design**: Premium dark-mode UI.

## Publish (GitHub + Vercel)

1. Push this repo to GitHub.
2. In Vercel, import the GitHub repo.
3. Deploy (no build command needed).

Vercel will serve:
- Static site from `public/`
- Serverless API from `api/status.js`

## Local Development (Optional)

If you want to run locally with Vercel’s dev server:
```bash
vercel dev
```
Then open:
`http://localhost:3000`

## Configuration

- **Target URL**: Configured in `api/status.js` (`WIDGET_URL`).

## Credits

Made by : **IrSAR**
