const WIDGET_URL = "https://reservation.umai.io/en/widget/rembayung";
const BLOCK_URL = "https://reservation.umai.io/en/block/rembayung";

export default async function handler(req, res) {
  try {
    const response = await fetch(WIDGET_URL, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const finalUrl = response.url;
    const status = response.status;
    const body = await response.text();

    if (finalUrl === BLOCK_URL) {
      return res.status(200).json({
        status: "REDIRECT_BLOCK",
        code: status,
        finalUrl,
        timestamp: new Date().toISOString(),
      });
    }

    if (/virtual queue|high traffic/i.test(body)) {
      return res.status(200).json({
        status: "QUEUE_ACTIVE",
        code: status,
        finalUrl,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      status: "ACTIVE_OTHER",
      code: status,
      finalUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching URL:", error);
    return res.status(500).json({
      status: "ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
