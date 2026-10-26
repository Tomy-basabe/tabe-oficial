function isSafeUrl(rawUrl: string): { safe: boolean; error?: string } {
  try {
    const parsed = new URL(rawUrl);
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

    return { safe: true };
  } catch {
    return { safe: false, error: "URL inválida o malformada" };
  }
}

export default async function handler(req: any, res: any) {
  // Configurar CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Cookie");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const urlParam = req.query?.url || new URL(req.url, "http://localhost").searchParams.get("url");

  if (!urlParam || typeof urlParam !== "string") {
    return res.status(400).json({ error: "Falta el parámetro 'url'" });
  }

  const cleanUrl = urlParam.trim();
  const validation = isSafeUrl(cleanUrl);

  if (!validation.safe) {
    return res.status(403).json({ error: validation.error || "URL no permitida" });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const forwardHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Accept": req.headers["accept"] || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": req.headers["accept-language"] || "es-ES,es;q=0.9,en;q=0.8",
    };

    if (req.headers["content-type"]) {
      forwardHeaders["Content-Type"] = req.headers["content-type"];
    }

    if (req.headers["cookie"]) {
      forwardHeaders["Cookie"] = req.headers["cookie"];
    }

    const fetchOptions: any = {
      method: req.method || "GET",
      signal: controller.signal,
      headers: forwardHeaders,
      redirect: "manual",
    };

    if (req.method === "POST") {
      if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
        fetchOptions.body = req.body;
      } else if (req.body && typeof req.body === "object") {
        fetchOptions.body = new URLSearchParams(req.body).toString();
      }
    }

    const response = await fetch(cleanUrl, fetchOptions);
    clearTimeout(timeout);

    // Manejar redirecciones (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const locationHeader = response.headers.get("location");
      if (locationHeader) {
        const resolvedLocation = new URL(locationHeader, cleanUrl).href;
        const rawCookies = response.headers.get("set-cookie");
        if (rawCookies) {
          res.setHeader("Set-Cookie", rawCookies.replace(/Domain=[^;]+;?/gi, ""));
        }
        res.setHeader("Location", `/api/campus-proxy?url=${encodeURIComponent(resolvedLocation)}`);
        return res.status(302).end();
      }
    }

    // Reenviar cookies recibidas del campus
    const setCookies = typeof (response.headers as any).getSetCookie === "function"
      ? (response.headers as any).getSetCookie()
      : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);

    if (setCookies.length > 0) {
      const sanitized = setCookies.map((c: string) =>
        c.replace(/Domain=[^;]+;?/gi, "")
         .replace(/SameSite=[^;]+;?/gi, "SameSite=Lax")
      );
      res.setHeader("Set-Cookie", sanitized);
    }

    const contentType = response.headers.get("content-type") || "";

    // Eliminar cabeceras de bloqueo
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");

    if (contentType.includes("text/html")) {
      let html = await response.text();
      const parsedTarget = new URL(cleanUrl);
      const origin = parsedTarget.origin;

      if (!html.includes("<base ") && !html.includes("<base>")) {
        if (html.includes("<head>")) {
          html = html.replace("<head>", `<head><base href="${origin}/">`);
        } else if (html.includes("<head ")) {
          html = html.replace(/<head[^>]*>/, (match) => `${match}<base href="${origin}/">`);
        } else {
          html = `<base href="${origin}/">${html}`;
        }
      }

      const interceptorScript = `
<script>
(function() {
  var appOrigin = window.location.origin;
  var proxyBase = appOrigin + '/api/campus-proxy?url=';

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
      return proxyBase + encodeURIComponent(resolved.href);
    } catch(e) {
      return null;
    }
  }

  // 1. Interceptar XMLHttpRequest para AJAX de Moodle (service.php)
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    var args = Array.prototype.slice.call(arguments);
    var next = rewrite(url);
    if (next) {
      args[1] = next;
    }
    return origOpen.apply(this, args);
  };

  // 2. Interceptar fetch
  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
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

  // 3. Interceptar navegación respetando tabs de Bootstrap/Boost
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a) return;
    var hrefAttr = a.getAttribute('href');
    if (!hrefAttr || hrefAttr.startsWith('#') || hrefAttr.startsWith('javascript:')) return;
    if (a.hasAttribute('data-toggle') || a.hasAttribute('data-action') || a.getAttribute('role') === 'tab') return;
    if (a.target === '_blank') return;

    var next = rewrite(a.href);
    if (next) {
      e.preventDefault();
      window.location.href = next;
    }
  }, true);

  // 4. Interceptar envíos de formularios
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && form.action) {
      var next = rewrite(form.action);
      if (next) {
        form.action = next;
      }
    }
  }, true);

  // 5. Silenciar automáticamente modales de error vacíos o con 'undefined'
  var silenceObserver = new MutationObserver(function() {
    var dialogues = document.querySelectorAll('.moodle-dialogue-base, .modal.show, [role="alertdialog"]');
    dialogues.forEach(function(el) {
      var txt = (el.innerText || '').trim();
      if (txt === 'undefined' || txt === '') {
        el.style.display = 'none';
        var backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(function(b) { b.style.display = 'none'; });
      }
    });
  });
  silenceObserver.observe(document.documentElement, { childList: true, subtree: true });
})();
</script>
<style>
.moodle-dialogue-base:has(.moodle-dialogue-bd:empty) { display: none !important; }
</style>
`;

      if (html.includes("</body>")) {
        html = html.replace("</body>", `${interceptorScript}</body>`);
      } else {
        html = html + interceptorScript;
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }

    // Para imágenes, css, js u otros assets
    const buffer = Buffer.from(await response.arrayBuffer());
    if (contentType) res.setHeader("Content-Type", contentType);
    return res.status(200).send(buffer);
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return res.status(504).json({ error: "Tiempo de espera agotado al conectar con el campus" });
    }
    return res.status(500).json({ error: err?.message || "Error al conectar con el campus" });
  }
}
