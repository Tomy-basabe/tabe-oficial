import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { initSecurityProtection } from "./lib/security";
import "./index.css";

// Iniciar protección global contra inspección, atajos y clic derecho
initSecurityProtection();

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
        <Analytics />
    </ErrorBoundary>
);
