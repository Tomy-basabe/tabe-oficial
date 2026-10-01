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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_#000] p-4 flex items-center gap-3 text-black">
                <TabeLogo size={40} className="shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-black uppercase tracking-wide leading-tight">INSTALÁ TABE</p>
                    <p className="text-xs font-medium text-neutral-600 truncate mt-0.5">
                        Accedé al instante desde tu pantalla de inicio
                    </p>
                </div>
                <button
                    onClick={handleInstall}
                    className="shrink-0 px-3.5 py-2 bg-[#FFE600] text-black text-xs font-black uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition-transform flex items-center gap-1.5 cursor-pointer"
                >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                    Instalar
                </button>
                <button
                    onClick={handleDismiss}
                    aria-label="Cerrar aviso de instalación"
                    className="shrink-0 p-1.5 text-neutral-500 hover:text-black transition-colors rounded-lg hover:bg-neutral-100 cursor-pointer"
                >
                    <X className="w-4 h-4 stroke-[2.5]" />
                </button>
            </div>
        </div>
    );
}
