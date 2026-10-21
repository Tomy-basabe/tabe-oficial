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
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
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
    build: {
      sourcemap: false,
    },
  };
});
