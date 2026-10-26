import { createRoot } from "react-dom/client";
import { ConditionalAnalytics } from "./components/legal/ConditionalAnalytics";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { initSecurityProtection } from "./lib/security";
import "./index.css";

declare const __APP_BUILD_ID__: string;

const CURRENT_BUILD_ID = typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "dev";
const RELOAD_COOLDOWN_MS = 60 * 1000; // 60 segundos de bloqueo para garantizar 1 sola recarga
const RELOAD_TS_KEY = "tabe_single_update_reload_ts";
const APPLIED_VERSION_KEY = "tabe_applied_build_version";

// En producción silenciar logs repetitivos que saturan log ingestion
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}

// Iniciar protección global contra inspección, atajos y clic derecho
initSecurityProtection();

/**
 * Ejecuta una única recarga limpia hacia la última versión, limpiando cachés viejas
 * y bloqueando recargas subsecuentes para que nunca se actualice varias veces seguidas.
 */
async function performSingleCleanReload(targetVersion?: string) {
  try {
    const now = Date.now();
    const lastReload = Number(sessionStorage.getItem(RELOAD_TS_KEY) || localStorage.getItem(RELOAD_TS_KEY) || "0");
    if (now - lastReload < RELOAD_COOLDOWN_MS) {
      return; // Ya se recargó hace menos de 60 segundos: prohibido volver a recargar
    }

    sessionStorage.setItem(RELOAD_TS_KEY, String(now));
    localStorage.setItem(RELOAD_TS_KEY, String(now));
    if (targetVersion) {
      localStorage.setItem(APPLIED_VERSION_KEY, targetVersion);
      sessionStorage.setItem(APPLIED_VERSION_KEY, targetVersion);
    }

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  } catch {
    // Ignorar errores de storage en modo privado
  }

  window.location.reload();
}

/**
 * Verifica al entrar si el servidor tiene una versión más nueva que el bundle actual.
 * Si hay una nueva versión disponible, actualiza cachés y recarga UNA SOLA VEZ.
 */
async function verifyLatestVersionOnEntry() {
  if (!import.meta.env.PROD || typeof window === "undefined") return;

  try {
    // Guardar la versión actual si es la primera vez o ya coincide
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });

    if (!res.ok) return;
    const data = await res.json();
    const remoteVersion = data?.version ? String(data.version) : null;
    if (!remoteVersion) return;

    // Si el bundle en memoria ya es el último, registramos que estamos al día y no hacemos nada
    if (remoteVersion === CURRENT_BUILD_ID) {
      localStorage.setItem(APPLIED_VERSION_KEY, remoteVersion);
      sessionStorage.setItem(APPLIED_VERSION_KEY, remoteVersion);
      return;
    }

    // Si ya intentamos aplicar exactamente esta versión remota en esta sesión, no repetir
    const alreadyApplied = sessionStorage.getItem(APPLIED_VERSION_KEY);
    if (alreadyApplied === remoteVersion) {
      return;
    }

    // Hay una versión nueva en el servidor y el usuario tiene archivos viejos en caché:
    // Actualizar Service Worker si existe y recargar UNA SOLA VEZ.
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update().catch(() => {});
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      }
    }

    await performSingleCleanReload(remoteVersion);
  } catch {
    // Sin conexión o error de red: continuar normalmente en modo offline/actual
  }
}

// Registrar Service Worker unificado con protección estricta de 1 sola recarga
if (typeof window !== "undefined") {
  verifyLatestVersionOnEntry();

  if ("serviceWorker" in navigator) {
    // Guardamos si ya existía un SW controlando la página al iniciar.
    // Si es la primera instalación (hadController === false), activarlo NO debe recargar la página.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      performSingleCleanReload();
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => {
          // Chequeo único al abrir la app
          registration.update().catch(() => {});

          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }

          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn("Error al registrar TABE Service Worker:", error);
        });
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
    <ConditionalAnalytics />
  </ErrorBoundary>
);
