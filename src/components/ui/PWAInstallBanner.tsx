import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { TabeLogo } from "@/components/ui/TabeLogo";

/**
 * Shows a bottom banner prompting users to install the PWA.
 * Only appears on web (not installed) and can be dismissed.
 * Remembers dismissal for 7 days via localStorage.
 */
export function PWAInstallBanner() {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [dismissed, setDismissed] = useState(true); // Hidden by default

    useEffect(() => {
        // Don't show if already installed
        if (window.matchMedia("(display-mode: standalone)").matches) return;

        // Don't show if dismissed recently
        const dismissedAt = localStorage.getItem("tabe_install_dismissed");
        if (dismissedAt) {
            const elapsed = Date.now() - parseInt(dismissedAt);
            if (elapsed < 7 * 24 * 60 * 60 * 1000) return; // 7 days
        }

        setDismissed(false);

        const handler = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const result = await installPrompt.userChoice;
        if (result.outcome === "accepted") {
            setDismissed(true);
        }
        setInstallPrompt(null);
    };

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem("tabe_install_dismissed", Date.now().toString());
    };

    if (dismissed || !installPrompt) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-bottom-5 duration-500">
            <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl shadow-black/30 p-4 flex items-center gap-3">
                <TabeLogo size={40} className="shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Instalá T.A.B.E.</p>
                    <p className="text-xs text-muted-foreground truncate">
                        Accedé más rápido desde tu pantalla de inicio
                    </p>
                </div>
                <button
                    onClick={handleInstall}
                    className="shrink-0 px-4 py-2 bg-gradient-to-r from-neon-cyan to-neon-purple text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                    <Download className="w-3.5 h-3.5" />
                    Instalar
                </button>
                <button
                    onClick={handleDismiss}
                    className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
