import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
        theme_color: "#0a0a0f",
        background_color: "#0a0a0f",
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
}));
