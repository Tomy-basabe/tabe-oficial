import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { initSecurityProtection } from "./lib/security";
import "./index.css";

// Iniciar protección global contra inspección, atajos y clic derecho
initSecurityProtection();

// Registrar Service Worker para PWA y Web Push en segundo plano
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("TABE Service Worker activo en scope:", registration.scope);
      })
      .catch((error) => {
        console.warn("Error al registrar TABE Service Worker:", error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
        <Analytics />
    </ErrorBoundary>
);
