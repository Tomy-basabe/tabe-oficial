import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { initSecurityProtection } from "./lib/security";
import "./index.css";

// Iniciar protección global contra inspección, atajos y clic derecho
initSecurityProtection();

// Registrar Service Worker para PWA y Web Push con auto-actualización inmediata
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("TABE Service Worker activo en scope:", registration.scope);

        // Forzar chequeo de actualización de inmediato al abrir la app
        registration.update().catch(() => {});

        // Si ya había una versión nueva esperando en segundo plano, activarla de inmediato
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // Nueva versión lista: activar inmediatamente sin esperar cierre de pestañas
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

  // Chequear actualización cada vez que el usuario vuelve a la app en su celular
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) reg.update().catch(() => {});
      });
    }
  });
}

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
        <Analytics />
    </ErrorBoundary>
);
