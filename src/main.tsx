import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "./index.css";

// Clear stale service workers and caches that may serve broken builds
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister());
    });
}
if ('caches' in window) {
    caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
    });
}

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
        <Analytics />
    </ErrorBoundary>
);
