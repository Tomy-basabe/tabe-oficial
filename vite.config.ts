import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

function setupNvidiaProxy(middlewares: any, apiKey: string) {
  middlewares.use("/api/nvidia-ai", async (req: any, res: any) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    const key = apiKey || process.env.NVIDIA_API_KEY;

    try {
      const urlObj = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
      const queryAction = urlObj.searchParams.get("action");

      if (req.method === "GET" || queryAction === "models") {
        const modelsRes = await fetch("https://integrate.api.nvidia.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        const text = await modelsRes.text();
        res.statusCode = modelsRes.status;
        res.setHeader("Content-Type", "application/json");
        res.end(text);
        return;
      }

      // Read POST body
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const rawBody = Buffer.concat(chunks).toString("utf-8");
      const parsedBody = rawBody ? JSON.parse(rawBody) : {};

      // Image Generation via NVIDIA Flux.1-dev
      if (parsedBody.action === "image") {
        const imgRes = await fetch("https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            prompt: parsedBody.prompt,
            mode: "base",
            cfg_scale: parsedBody.cfg_scale ?? 3.5,
            width: parsedBody.width ?? 1024,
            height: parsedBody.height ?? 1024,
            seed: parsedBody.seed ?? Math.floor(Math.random() * 900000),
            steps: parsedBody.steps ?? 20,
          }),
        });
        const imgText = await imgRes.text();
        res.statusCode = imgRes.status;
        res.setHeader("Content-Type", "application/json");
        res.end(imgText);
        return;
      }

      // Chat Completions (SSE Streaming or JSON)
      const chatRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Accept: parsedBody.stream ? "text/event-stream" : "application/json",
        },
        body: rawBody,
      });

      res.statusCode = chatRes.status;
      res.setHeader(
        "Content-Type",
        chatRes.headers.get("content-type") || (parsedBody.stream ? "text/event-stream" : "application/json")
      );

      if (!chatRes.body) {
        const errText = await chatRes.text();
        res.end(errText);
        return;
      }

      const reader = chatRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } catch (e: any) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: e?.message || "Error en NVIDIA proxy" }));
    }
  });
}

// https://vitejs.dev/config/
const APP_BUILD_ID = Date.now().toString();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const nvidiaKey = env.NVIDIA_API_KEY;

  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      {
        name: "nvidia-ai-proxy",
        configureServer(server) {
          setupNvidiaProxy(server.middlewares, nvidiaKey);
        },
        configurePreviewServer(server) {
          setupNvidiaProxy(server.middlewares, nvidiaKey);
        },
      },
      {
        name: "moodle-calendar-proxy",
        configureServer(server) {
          server.middlewares.use("/version.json", (_req: any, res: any) => {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
            res.end(JSON.stringify({ version: APP_BUILD_ID }));
          });
          server.middlewares.use("/api/campus-proxy", async (req: any, res: any) => {
            const parsedReqUrl = new URL(req.url || "", `http://${req.headers.host}`);
            const urlParam = parsedReqUrl.searchParams.get("url");
            if (!urlParam) {
              res.statusCode = 400;
              res.end("Falta el parametro url");
              return;
            }
            try {
              const cleanUrl = urlParam.trim();
              const targetUrl = new URL(cleanUrl);
              const origin = targetUrl.origin;

              // Leer body si es POST
              let bodyBuffer: Buffer | null = null;
              if (req.method === "POST") {
                const chunks: any[] = [];
                for await (const chunk of req) {
                  chunks.push(chunk);
                }
                bodyBuffer = Buffer.concat(chunks);
              }

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
                headers: forwardHeaders,
                redirect: "manual",
              };

              if (bodyBuffer && req.method === "POST") {
                fetchOptions.body = bodyBuffer;
              }

              const fetchRes = await fetch(cleanUrl, fetchOptions);

              // Manejar cookies y redirecciones
              const setCookies = typeof (fetchRes.headers as any).getSetCookie === "function"
                ? (fetchRes.headers as any).getSetCookie()
                : (fetchRes.headers.get("set-cookie") ? [fetchRes.headers.get("set-cookie")!] : []);

              if (setCookies.length > 0) {
                const sanitized = setCookies.map((c: string) =>
                  c.replace(/Domain=[^;]+;?/gi, "")
                   .replace(/SameSite=[^;]+;?/gi, "SameSite=Lax")
                );
                res.setHeader("Set-Cookie", sanitized);
              }

              if ([301, 302, 303, 307, 308].includes(fetchRes.status)) {
                const locationHeader = fetchRes.headers.get("location");
                if (locationHeader) {
                  const resolvedLocation = new URL(locationHeader, cleanUrl).href;
                  res.statusCode = 302;
                  res.setHeader("Location", `/api/campus-proxy?url=${encodeURIComponent(resolvedLocation)}`);
                  res.end();
                  return;
                }
              }

              const contentType = fetchRes.headers.get("content-type") || "";

              res.setHeader("Access-Control-Allow-Origin", "*");
              res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
              res.setHeader("Access-Control-Allow-Headers", "*");
              res.removeHeader("X-Frame-Options");
              res.removeHeader("Content-Security-Policy");
              res.setHeader("X-Frame-Options", "ALLOWALL");
              res.setHeader("Content-Security-Policy", "frame-ancestors *");

              if (contentType.includes("text/html")) {
                let html = await fetchRes.text();
                if (!html.includes("<base ") && !html.includes("<base>")) {
                  if (html.includes("<head>")) {
                    html = html.replace("<head>", `<head><base href="${origin}/">`);
                  } else if (html.includes("<head ")) {
                    html = html.replace(/<head[^>]*>/, (m: string) => `${m}<base href="${origin}/">`);
                  } else {
                    html = `<base href="${origin}/">` + html;
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
                res.end(html);
                return;
              }

              const buffer = Buffer.from(await fetchRes.arrayBuffer());
              if (contentType) res.setHeader("Content-Type", contentType);
              res.end(buffer);
            } catch (e: any) {
              res.statusCode = 500;
              res.end(e?.message || "Error al conectar con el campus");
            }
          });
          server.middlewares.use("/api/moodle-calendar", async (req, res) => {
            const urlParam = new URL(req.url || "", `http://${req.headers.host}`).searchParams.get("url");
            if (!urlParam) {
              res.statusCode = 400;
              res.end("Falta el parámetro 'url'");
              return;
            }
            try {
              const cleanUrl = urlParam.trim().replace(/^webcal:\/\//i, "https://");
              const fetchRes = await fetch(cleanUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (compatible; TABE/1.0)",
                },
              });
              const text = await fetchRes.text();
              res.setHeader("Content-Type", "text/calendar; charset=utf-8");
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.end(text);
            } catch (e: any) {
              res.statusCode = 500;
              res.end(e?.message || "Error al descargar calendario");
            }
          });
        },
      },
      {
        name: "tabe-version-manifest",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "version.json",
            source: JSON.stringify({ version: APP_BUILD_ID }),
          });
        },
      },
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "robots.txt"],
        manifest: {
          id: "/",
          name: "T.A.B.E. - Tu Asistente de Bolsillo Estudiantil",
          short_name: "T.A.B.E.",
          description: "Plataforma todo-en-uno para estudiantes universitarios argentinos con flashcards, pomodoro y más",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "/favicon.ico",
              sizes: "16x16 32x32 48x48 64x64 128x128 256x256",
              type: "image/x-icon",
            },
            {
              src: "/pwa-64x64.png",
              sizes: "64x64",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/favicon.png",
              sizes: "128x128",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-256x256.png",
              sizes: "256x256",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-maskable-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/pwa-maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          globIgnores: ["**/version.json"],
          navigateFallbackDenylist: [/^\/api\//, /^\/version\.json$/],
          importScripts: ["/custom-sw.js"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
              },
            },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      __APP_BUILD_ID__: JSON.stringify(APP_BUILD_ID),
    },
    build: {
      sourcemap: false,
    },
  };
});
