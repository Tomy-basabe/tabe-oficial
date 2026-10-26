function normalizeUrl(rawUrl: string): string {
  let clean = (rawUrl || "").trim();
  if (!clean) return "";
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = "https://" + clean;
  }
  return clean;
}

function isSafeUrl(rawUrl: string): { safe: boolean; error?: string; url?: string } {
  try {
    const clean = normalizeUrl(rawUrl);
    const parsed = new URL(clean);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { safe: false, error: "Protocolo no permitido (solo https / http)" };
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

    return { safe: true, url: clean };
  } catch {
    return { safe: false, error: "URL inválida o malformada" };
  }
}

function sendStatus(res: any, code: number) {
  if (typeof res.status === "function") {
    return res.status(code);
  }
  res.statusCode = code;
  return res;
}

function sendJson(res: any, code: number, data: any) {
  res.setHeader("Content-Type", "application/json");
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(code).json(data);
  }
  res.statusCode = code;
  return res.end(JSON.stringify(data));
}

function sendBody(res: any, code: number, body: any, contentType?: string) {
  if (contentType) res.setHeader("Content-Type", contentType);
  if (typeof res.status === "function" && typeof res.send === "function") {
    return res.status(code).send(body);
  }
  res.statusCode = code;
  return res.end(body);
}

function renderErrorFallbackHtml(targetUrl: string, reason: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aviso de Navegación - TABE Campus</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #fbfbfa;
      color: #1c1c1f;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #161618; color: #f4f4f5; }
      .card { background: #1f1f23; border-color: #2e2e34; }
      .desc { color: #a1a1aa; }
      .btn-sec { background: #27272a; color: #f4f4f5; border-color: #3f3f46; }
      .btn-sec:hover { background: #323238; }
      .url-box { background: #18181b; border-color: #27272a; color: #d4d4d8; }
    }
    .card {
      max-width: 520px;
      width: 100%;
      background: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 18px;
      padding: 28px 24px;
      text-align: center;
      box-shadow: 0 4px 20px -2px rgba(0,0,0,0.06);
    }
    .icon {
      width: 52px;
      height: 52px;
      margin: 0 auto 16px;
      border-radius: 14px;
      background: rgba(37, 99, 235, 0.1);
      color: #2563eb;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
    }
    h2 { font-size: 18px; font-weight: 600; margin-bottom: 8px; letter-spacing: -0.01em; }
    .desc { font-size: 13px; color: #71717a; line-height: 1.5; margin-bottom: 18px; }
    .url-box {
      font-family: monospace;
      font-size: 11px;
      padding: 8px 12px;
      border-radius: 8px;
      background: #f4f4f5;
      border: 1px solid #e4e4e7;
      color: #52525b;
      margin-bottom: 22px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    .btn {
      appearance: none;
      border: none;
      outline: none;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      padding: 10px 18px;
      border-radius: 10px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn-pri { background: #2563eb; color: #ffffff; }
    .btn-pri:hover { background: #1d4ed8; }
    .btn-sec { background: #f4f4f5; color: #27272a; border: 1px solid #e4e4e7; }
    .btn-sec:hover { background: #e4e4e7; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🏛️</div>
    <h2>El portal requiere navegación directa</h2>
    <p class="desc">
      Este sitio educativo o página web cuenta con una política de seguridad estricta o protección anti-bot que impide ser mostrado dentro de un marco.
    </p>
    <div class="url-box">${targetUrl}</div>
    <div class="actions">
      <button class="btn btn-pri" onclick="openWindow()">
        Abrir en Ventana App
      </button>
      <a class="btn btn-sec" href="${targetUrl}" target="_blank" rel="noopener noreferrer">
        Pestaña Nueva
      </a>
    </div>
  </div>
  <script>
    function openWindow() {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'tabe_open_app_window', url: '${targetUrl}' }, '*');
        }
      } catch(e) {}
      var width = Math.min(1360, window.screen.availWidth - 60);
      var height = Math.min(880, window.screen.availHeight - 60);
      var left = Math.max(0, Math.floor((window.screen.availWidth - width) / 2));
      var top = Math.max(0, Math.floor((window.screen.availHeight - height) / 2));
      window.open('${targetUrl}', 'TABECampusWindow', 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes');
    }
  </script>
</body>
</html>`;
}

export default async function handler(req: any, res: any) {
  const reqOrigin = req.headers["origin"] || "*";
  res.setHeader("Access-Control-Allow-Origin", reqOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method === "OPTIONS") {
    sendStatus(res, 200);
    return res.end();
  }

  const rawParam = Array.isArray(req.query?.url)
    ? req.query.url[0]
    : (req.query?.url || new URL(req.url || "", "http://localhost").searchParams.get("url"));

  if (!rawParam || typeof rawParam !== "string") {
    return sendJson(res, 400, { error: "Falta el parámetro 'url'" });
  }

  const validation = isSafeUrl(rawParam);
  if (!validation.safe || !validation.url) {
    return sendJson(res, 403, { error: validation.error || "URL no permitida" });
  }

  const cleanUrl = validation.url;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const isGetOrHead = !req.method || req.method === "GET" || req.method === "HEAD";

    // Headers de navegador real completos
    const forwardHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      "Accept":
        req.headers["accept"] || "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": req.headers["accept-language"] || "es-419,es;q=0.9,en;q=0.8",
      "Sec-Ch-Ua": '"Chromium";v="129", "Not=A?Brand";v="8"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1"
    };

    if (req.headers["content-type"]) {
      forwardHeaders["Content-Type"] = req.headers["content-type"];
    }

    if (req.headers["cookie"]) {
      forwardHeaders["Cookie"] = req.headers["cookie"];
    }

    if (req.headers["authorization"]) {
      forwardHeaders["Authorization"] = req.headers["authorization"];
    }

    if (req.headers["x-requested-with"]) {
      forwardHeaders["X-Requested-With"] = req.headers["x-requested-with"];
    }

    // Para POST, reenviar Origin del destino para validar CSRF
    if (!isGetOrHead) {
      try {
        forwardHeaders["Origin"] = new URL(cleanUrl).origin;
      } catch (_) {}
    }

    const fetchOptions: any = {
      method: req.method || "GET",
      signal: controller.signal,
      headers: forwardHeaders,
      redirect: isGetOrHead ? "follow" : "manual",
    };

    if (!isGetOrHead) {
      let bodyBuffer: Buffer | null = null;
      if (Buffer.isBuffer(req.body)) {
        bodyBuffer = req.body;
      } else if (typeof req.body === "string") {
        bodyBuffer = Buffer.from(req.body, "utf-8");
      } else if (req.body && typeof req.body === "object") {
        const reqContentType = (req.headers["content-type"] || "").toLowerCase();
        if (reqContentType.includes("application/x-www-form-urlencoded") && !Array.isArray(req.body)) {
          bodyBuffer = Buffer.from(new URLSearchParams(req.body).toString(), "utf-8");
        } else {
          bodyBuffer = Buffer.from(JSON.stringify(req.body), "utf-8");
        }
      }

      if (!bodyBuffer && typeof req[Symbol.asyncIterator] === "function") {
        try {
          const chunks: any[] = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          }
          if (chunks.length > 0) {
            bodyBuffer = Buffer.concat(chunks);
          }
        } catch (_) {}
      }

      if (bodyBuffer) {
        fetchOptions.body = bodyBuffer;
      }
    }

    const response = await fetch(cleanUrl, fetchOptions);
    clearTimeout(timeout);

    // Si el destino responde con redirección manual (para POST/PUT)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const locationHeader = response.headers.get("location");
      if (locationHeader) {
        const resolvedLocation = new URL(locationHeader, cleanUrl).href;
        const rawCookies = response.headers.get("set-cookie");
        if (rawCookies) {
          res.setHeader("Set-Cookie", rawCookies.replace(/Domain=[^;]+;?/gi, ""));
        }
        res.setHeader("Location", `/api/campus-proxy?url=${encodeURIComponent(resolvedLocation)}`);
        sendStatus(res, 302);
        return res.end();
      }
    }

    // Reenviar cookies recibidas con SameSite=None; Secure para persistencia en iframe HTTPS
    const setCookies = typeof (response.headers as any).getSetCookie === "function"
      ? (response.headers as any).getSetCookie()
      : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);

    if (setCookies.length > 0) {
      const sanitized = setCookies.map((c: string) =>
        c.replace(/Domain=[^;]+;?/gi, "")
         .replace(/SameSite=[^;]+;?/gi, "SameSite=None; Secure")
      );
      res.setHeader("Set-Cookie", sanitized);
    }

    const contentType = response.headers.get("content-type") || "";

    // Eliminar todas las cabeceras que prohíben la inserción en iframe
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (typeof res.removeHeader === "function") {
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      res.removeHeader("Content-Security-Policy-Report-Only");
      res.removeHeader("Cross-Origin-Embedder-Policy");
      res.removeHeader("Cross-Origin-Opener-Policy");
      res.removeHeader("Cross-Origin-Resource-Policy");
      res.removeHeader("Content-Encoding");
      res.removeHeader("Content-Length");
    }
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");

    // Si la respuesta es HTML, inyectar <base> y scripts de neutralización
    if (contentType.includes("text/html")) {
      let html = await response.text();

      // La URL base para resolver recursos relativos (imágenes, css, js) debe ser la URL final alcanzada
      const finalUrl = response.url || cleanUrl;

      // Inyectar etiqueta <base> con la URL final del sitio
      if (!html.includes("<base ") && !html.includes("<base>")) {
        if (html.includes("<head>")) {
          html = html.replace("<head>", `<head><base href="${finalUrl}">`);
        } else if (html.includes("<head ")) {
          html = html.replace(/<head[^>]*>/, (match) => `${match}<base href="${finalUrl}">`);
        } else {
          html = `<base href="${finalUrl}">${html}`;
        }
      }

      // Script interceptor seguro y no bloqueante
      const interceptorScript = `
<script>
(function() {
  try {
    Object.defineProperty(window, 'top', { get: function() { return window; } });
    Object.defineProperty(window, 'parent', { get: function() { return window; } });
  } catch(e) {}

  var appOrigin = window.location.origin;
  var proxyBase = appOrigin + '/api/campus-proxy?url=';
  var currentHost = '';
  try {
    currentHost = new URL('${finalUrl}').hostname;
  } catch(e) {}

  function isDownloadOrAsset(urlStr) {
    if (!urlStr) return false;
    var lower = urlStr.toLowerCase();
    return (
      lower.indexOf('forcedownload=1') !== -1 ||
      lower.indexOf('/pluginfile.php') !== -1 ||
      lower.indexOf('/mod/resource/') !== -1 ||
      lower.match(/\\.(pdf|zip|rar|7z|docx?|xlsx?|pptx?|mp3|mp4|csv)(\\?|$)/)
    );
  }

  function rewrite(targetUrl) {
    if (!targetUrl || typeof targetUrl !== 'string') return null;
    var raw = targetUrl.trim();
    if (raw.startsWith('javascript:') || raw.startsWith('#') || raw.startsWith('data:') || raw.startsWith('blob:')) {
      return null;
    }
    if (raw.indexOf('/api/campus-proxy?url=') !== -1) {
      return null;
    }
    try {
      var resolved = new URL(raw, document.baseURI || window.location.href);
      if (resolved.origin === window.location.origin && resolved.pathname === window.location.pathname && resolved.hash) {
        return null;
      }
      if (isDownloadOrAsset(resolved.href)) {
        return null;
      }
      // Solo proxificar enlaces del mismo dominio de la página para no romper CDNs de terceros
      if (currentHost && resolved.hostname !== currentHost && !resolved.hostname.endsWith('.' + currentHost)) {
        return null;
      }
      return proxyBase + encodeURIComponent(resolved.href);
    } catch(e) {
      return null;
    }
  }

  // Interceptar XMLHttpRequest
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    var args = Array.prototype.slice.call(arguments);
    var next = rewrite(url);
    if (next) args[1] = next;
    var res = origOpen.apply(this, args);
    try { this.withCredentials = true; } catch(e) {}
    return res;
  };

  // Interceptar fetch
  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
      init = init || {};
      if (typeof init.credentials === 'undefined') init.credentials = 'include';
      if (typeof input === 'string') {
        var next = rewrite(input);
        if (next) input = next;
      } else if (input && input.url) {
        var next = rewrite(input.url);
        if (next) input = new Request(next, input);
      }
      return origFetch.call(this, input, init);
    };
  }

  // Interceptar enlaces
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a) return;
    var hrefAttr = a.getAttribute('href');
    if (!hrefAttr || hrefAttr.startsWith('#') || hrefAttr.startsWith('javascript:')) return;
    if (a.hasAttribute('data-toggle') || a.hasAttribute('data-action') || a.getAttribute('role') === 'tab') return;
    
    if (isDownloadOrAsset(a.href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      return;
    }

    if (a.target === '_blank') return;

    var next = rewrite(a.href);
    if (next) {
      e.preventDefault();
      window.location.href = next;
    }
  }, true);

  // Interceptar envíos de formularios
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && form.action) {
      var next = rewrite(form.action);
      if (next) form.action = next;
    }
  }, true);
})();
</script>
`;

      if (html.includes("</body>")) {
        html = html.replace("</body>", `${interceptorScript}</body>`);
      } else {
        html = html + interceptorScript;
      }

      return sendBody(res, 200, html, "text/html; charset=utf-8");
    }

    // Para imágenes, css, js u otros assets binarios
    const buffer = Buffer.from(await response.arrayBuffer());
    return sendBody(res, response.status || 200, buffer, contentType || undefined);
  } catch (err: any) {
    // Si la conexión falla, devolver un HTML visual con opciones de 1-clic en vez de un 500 JSON
    const errorHtml = renderErrorFallbackHtml(cleanUrl, err?.message || "No se pudo conectar");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    return sendBody(res, 200, errorHtml, "text/html; charset=utf-8");
  }
}
