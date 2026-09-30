function isSafeUrl(rawUrl: string): { safe: boolean; error?: string } {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { safe: false, error: "Protocolo no permitido (solo https/webcal)" };
    }

    const host = parsed.hostname.toLowerCase();

    // Bloquear loopback, metadata de nubes y hosts internos
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host === "169.254.169.254" ||
      host === "metadata.google.internal" ||
      host === "instance-data"
    ) {
      return { safe: false, error: "Acceso denegado a hosts locales o de metadatos" };
    }

    // Bloquear rangos de red privada IPv4 (RFC 1918 y link-local)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = host.match(ipv4Regex);
    if (ipMatch) {
      const [, o1, o2] = ipMatch.map(Number);
      if (
        o1 === 10 ||
        o1 === 127 ||
        o1 === 0 ||
        (o1 === 172 && o2 >= 16 && o2 <= 31) ||
        (o1 === 192 && o2 === 168) ||
        (o1 === 169 && o2 === 254)
      ) {
        return { safe: false, error: "Acceso denegado a rangos de IP privadas" };
      }
    }

    return { safe: true };
  } catch {
    return { safe: false, error: "URL inválida o malformada" };
  }
}

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

  const cleanUrl = urlParam.trim().replace(/^webcal:\/\//i, "https://");
  const validation = isSafeUrl(cleanUrl);

  if (!validation.safe) {
    return res.status(403).json({ error: validation.error || "URL no permitida por políticas de seguridad" });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(cleanUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TABE/1.0; +https://www.tabe.software)",
        "Accept": "text/calendar, text/plain, */*",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Error del campus: ${response.statusText}` });
    }

    // Limitar tamaño de respuesta a 5MB para evitar ataques de denegación de servicio (DoS)
    const MAX_SIZE = 5 * 1024 * 1024;
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_SIZE) {
      return res.status(413).json({ error: "El archivo del calendario supera el tamaño máximo permitido (5MB)" });
    }

    const icsText = await response.text();
    if (icsText.length > MAX_SIZE) {
      return res.status(413).json({ error: "El contenido recibido es demasiado grande" });
    }

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(icsText);
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return res.status(504).json({ error: "Tiempo de espera agotado al consultar el campus" });
    }
    return res.status(500).json({ error: err?.message || "Error al obtener el calendario" });
  }
}
