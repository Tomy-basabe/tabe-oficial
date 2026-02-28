import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "./index.css";

// Clear stale service workers that may cache broken builds
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister());
    });
}

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
        <Analytics />
    </ErrorBoundary>
);
