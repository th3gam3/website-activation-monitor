const WIDGET_URL =
  process.env.WIDGET_URL || "https://reservation.umai.io/en/widget/rembayung";
const BLOCK_URL =
  process.env.BLOCK_URL || "https://reservation.umai.io/en/block/rembayung";
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 8000);

function sendJson(res, payload) {
  // Avoid caching the monitor response at the edge/browser.
  if (typeof res.setHeader === "function") {
    res.setHeader("Cache-Control", "no-store");
  }
  return res.status(200).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    if (typeof res.setHeader === "function") {
      res.setHeader("Allow", "GET");
    }
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(WIDGET_URL, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    const finalUrl = response.url;
    const status = response.status;
    const body = await response.text();
    const durationMs = Date.now() - startedAt;

    if (finalUrl === BLOCK_URL || finalUrl.startsWith(`${BLOCK_URL}?`)) {
      return sendJson(res, {
        status: "REDIRECT_BLOCK",
        detailStatus: "REDIRECT_BLOCK",
        code: status,
        finalUrl,
        durationMs,
        timestamp: new Date().toISOString(),
      });
    }

    if (/virtual queue|high traffic/i.test(body)) {
      return sendJson(res, {
        // UI only cares about blocked vs not blocked.
        status: "ACTIVE_OTHER",
        detailStatus: "QUEUE_ACTIVE",
        code: status,
        finalUrl,
        durationMs,
        timestamp: new Date().toISOString(),
      });
    }

    if (!response.ok) {
      return sendJson(res, {
        // Treat any upstream non-2xx as "not confirmed active".
        status: "REDIRECT_BLOCK",
        detailStatus: "UPSTREAM_ERROR",
        code: status,
        finalUrl,
        durationMs,
        timestamp: new Date().toISOString(),
      });
    }

    return sendJson(res, {
      status: "ACTIVE_OTHER",
      detailStatus: "ACTIVE_OTHER",
      code: status,
      finalUrl,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching URL:", error);
    const durationMs = Date.now() - startedAt;
    const isTimeout =
      error &&
      (error.name === "AbortError" ||
        /aborted|abort|timeout/i.test(String(error.message || "")));
    return sendJson(res, {
      // Treat failures as "not confirmed active".
      status: "REDIRECT_BLOCK",
      detailStatus: isTimeout ? "TIMEOUT" : "ERROR",
      message: error?.message || String(error),
      durationMs,
      timestamp: new Date().toISOString(),
    });
  }
}
