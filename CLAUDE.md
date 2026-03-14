# CLAUDE.md — Website Activation Monitor

This file provides context for AI assistants working on this codebase.

---

## Project Overview

**Website Activation Monitor** is a real-time dashboard that checks whether the Rembayung reservation widget (`reservation.umai.io`) is active or blocked. It polls a backend API every second and displays a binary ACTIVE/BLOCKED status with a rolling history of the last 50 checks.

---

## Repository Structure

```
website-activation-monitor/
├── api/
│   └── status.js          # Serverless API handler (GET /api/status)
├── public/
│   ├── index.html         # Single-page frontend
│   ├── script.js          # Frontend polling logic and UI updates
│   └── style.css          # Dark frosted-glass UI styles
├── test-server.js         # Local development HTTP server
├── vercel.json            # Vercel routing configuration
├── package.json           # Project metadata and scripts
└── .gitignore
```

---

## Technology Stack

- **Runtime:** Node.js 24.x (ES Modules, `"type": "module"`)
- **Deployment:** Vercel (serverless functions + static hosting)
- **Frontend:** Vanilla HTML/CSS/JavaScript — no frameworks, no bundler
- **Dependencies:** None — uses only Node.js built-ins and browser APIs

---

## Development Commands

```bash
npm run local   # Start local server on http://localhost:3000 (uses test-server.js)
npm run dev     # Start with Vercel CLI (requires `vercel` installed globally)
npm run build   # No-op; exists for Vercel build compatibility
```

The preferred local development method is `npm run local`. No build step is required.

---

## Key Files

### `api/status.js`

Serverless function handler for `GET /api/status`.

- Fetches the target widget URL (follows redirects)
- Uses `AbortController` with an 8-second timeout
- Returns JSON:
  ```json
  {
    "status": "ACTIVE_OTHER" | "REDIRECT_BLOCK",
    "detailStatus": "...",
    "code": 200,
    "finalUrl": "https://...",
    "durationMs": 432,
    "timestamp": "2026-03-14T12:00:00.000Z"
  }
  ```
- `ACTIVE_OTHER` — widget is reachable (including virtual queue state)
- `REDIRECT_BLOCK` — widget is blocked, redirected to block page, or upstream error

**Environment variables (all optional):**

| Variable | Default | Purpose |
|---|---|---|
| `WIDGET_URL` | `https://reservation.umai.io/en/widget/rembayung` | Widget URL to monitor |
| `BLOCK_URL` | `https://reservation.umai.io/en/block/rembayung` | Block page URL to detect |
| `FETCH_TIMEOUT_MS` | `8000` | Request timeout in milliseconds |

### `public/script.js`

Frontend polling logic:

- Polls `/api/status` every 1 second
- Prevents overlapping requests with an in-flight guard
- Normalizes `ACTIVE_OTHER` → `ACTIVE` for binary UI display
- Maintains history array (max 50 entries, newest first)
- Updates status card, icon, HTTP code, final URL, and timestamp
- Updates a live clock every second

### `public/style.css`

- Dark theme with aurora-style gradient background
- Frosted glass surfaces using `backdrop-filter: blur + saturate`
- CSS custom properties for colors, shadows, and border radii
- Green for ACTIVE, red for BLOCKED
- Responsive at 520px breakpoint
- Respects `prefers-reduced-motion` media query
- Pulse ring animation on the status icon

### `test-server.js`

Minimal Node.js HTTP server for local development:

- Routes `/api/*` to the serverless handler in `api/status.js`
- Serves static files from `public/`
- Includes path-traversal protection
- Logs all requests to stdout
- Listens on port 3000

---

## Architecture Notes

### Request Flow

```
Browser (every 1s)
  → GET /api/status
    → api/status.js fetches WIDGET_URL
      → Returns JSON status
  → public/script.js updates DOM
```

### Vercel Routing (`vercel.json`)

```json
{
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/public/$1" }
  ]
}
```

All `/api/*` requests go to serverless functions; everything else is served from `public/`.

---

## Code Conventions

- **ES Modules throughout** — use `import`/`export`, not `require`
- **Async/await** for all asynchronous operations
- **No classes** — functional style only
- **camelCase** for all variable and function names
- **Defensive null checks** before accessing optional values
- **No external dependencies** — keep it that way unless there is a strong reason
- **No build step** — keep the project buildless
- **Comments** only where logic is non-obvious

---

## Testing

There is no automated test suite. Manual testing procedure:

1. `npm run local`
2. Open `http://localhost:3000` in a browser
3. Verify the status card updates every second
4. Test the API directly: `curl http://localhost:3000/api/status`

When adding new features, test both the API response and the resulting UI state for both `ACTIVE_OTHER` and `REDIRECT_BLOCK` scenarios.

---

## Deployment

The project deploys automatically to Vercel. No manual build or deployment steps are needed beyond pushing to the main branch. The `npm run build` script is a no-op included solely for Vercel compatibility.

---

## Security Notes

- The local server (`test-server.js`) includes path-traversal protection — do not remove it
- The API sets `Cache-Control: no-store` to prevent caching of status responses
- Requests to the widget use an `AbortController` timeout to prevent hanging
- No secrets are committed; sensitive values are passed via environment variables
