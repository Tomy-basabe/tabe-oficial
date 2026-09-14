export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const urlParam = req.query?.url || new URL(req.url, "http://localhost").searchParams.get("url");

  if (!urlParam || typeof urlParam !== "string") {
    return res.status(400).json({ error: "Falta el parámetro 'url'" });
  }

  try {
    const cleanUrl = urlParam.trim().replace(/^webcal:\/\//i, "https://");
    const response = await fetch(cleanUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TABE/1.0; +https://www.tabe.software)",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Error del campus: ${response.statusText}` });
    }

    const icsText = await response.text();
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    return res.status(200).send(icsText);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Error al obtener el calendario" });
  }
}
