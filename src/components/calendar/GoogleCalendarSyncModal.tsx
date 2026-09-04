import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Link2,
    Copy,
    Check,
    RefreshCw,
    ExternalLink,
    Upload,
    Loader2,
    ShieldAlert,
} from "lucide-react";
import { useCalendarFeed } from "@/hooks/useCalendarFeed";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GoogleCalendarSyncModalProps {
    open: boolean;
    onClose: () => void;
    onOpenImport: () => void;
}

export function GoogleCalendarSyncModal({
    open,
    onClose,
    onOpenImport,
}: GoogleCalendarSyncModalProps) {
    const { feedToken, feedUrl, loading, generateToken, regenerateToken, disableFeed } =
        useCalendarFeed();
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<"export" | "import">("export");
    const [generating, setGenerating] = useState(false);

    const handleCopy = async () => {
        if (!feedUrl) return;
        try {
            await navigator.clipboard.writeText(feedUrl);
            setCopied(true);
            toast.success("URL copiada al portapapeles");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Error al copiar");
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        await generateToken();
        setGenerating(false);
    };

    const handleRegenerate = async () => {
        if (
            confirm(
                "¿Regenerar la URL? La URL anterior dejará de funcionar y deberás actualizar la suscripción en Google Calendar."
            )
        ) {
            setGenerating(true);
            await regenerateToken();
            setGenerating(false);
        }
    };

    const handleDisable = async () => {
        if (confirm("¿Desactivar el feed? Google Calendar dejará de sincronizar tus eventos.")) {
            await disableFeed();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-lg bg-background border-4 border-foreground shadow-[12px_12px_0_0_hsl(var(--foreground))] rounded-xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-display font-black text-2xl uppercase tracking-widest flex items-center gap-2 text-foreground">
                        <Link2 className="w-6 h-6 text-foreground" />
                        Vincular con Google Calendar
                    </DialogTitle>
                    <DialogDescription className="font-bold">
                        Sincroniza tus eventos de TABE con Google Calendar
                    </DialogDescription>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex gap-2 p-1">
                    <button
                        onClick={() => setActiveTab("export")}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-lg text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-[3px] border-foreground",
                            activeTab === "export"
                                ? "bg-[#00F0FF] text-black shadow-[4px_4px_0_0_#000] translate-y-[-2px]"
                                : "bg-white text-black hover:bg-muted shadow-[2px_2px_0_0_#000]"
                        )}
                    >
                        <ExternalLink className="w-4 h-4" />
                        Ver en Google
                    </button>
                    <button
                        onClick={() => setActiveTab("import")}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-lg text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-[3px] border-foreground",
                            activeTab === "import"
                                ? "bg-[#00F0FF] text-black shadow-[4px_4px_0_0_#000] translate-y-[-2px]"
                                : "bg-white text-black hover:bg-muted shadow-[2px_2px_0_0_#000]"
                        )}
                    >
                        <Upload className="w-4 h-4" />
                        Importar de Google
                    </button>
                </div>

                {/* Export Tab */}
                {activeTab === "export" && (
                    <div className="space-y-4 py-2 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : !feedToken ? (
                            /* No feed active yet */
                            <div className="text-center space-y-4 py-4">
                                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                    <Link2 className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Activa tu feed de calendario</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Genera una URL única que Google Calendar puede leer para mostrar
                                        tus eventos de TABE automáticamente.
                                    </p>
                                </div>
                                <button
                                    onClick={handleGenerate}
                                    disabled={generating}
                                    className="px-6 py-3 rounded-lg font-black uppercase tracking-widest bg-[#00FF9D] text-black border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                                >
                                    {generating ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Link2 className="w-5 h-5" />
                                    )}
                                    Activar Feed
                                </button>
                            </div>
                        ) : (
                            /* Feed is active */
                            <div className="space-y-4">
                                {/* Feed URL */}
                                <div className="space-y-2">
                                    <label className="text-sm font-black uppercase tracking-widest">Tu URL del feed:</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={feedUrl || ""}
                                            readOnly
                                            className="flex-1 px-4 py-2 bg-white text-black border-[3px] border-foreground rounded-lg text-xs font-mono font-bold truncate focus:outline-none focus:shadow-[4px_4px_0_0_#000]"
                                        />
                                        <button
                                            onClick={handleCopy}
                                            className="px-4 py-2 bg-white text-black border-[3px] border-foreground rounded-lg shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all font-black uppercase tracking-widest flex items-center gap-2 text-sm"
                                        >
                                            {copied ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                            {copied ? "Copiado" : "Copiar"}
                                        </button>
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div className="bg-[#FFE66D] border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl p-5 space-y-3">
                                    <h4 className="font-medium text-sm">
                                        📋 Cómo agregar en Google Calendar:
                                    </h4>
                                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                                        <li>
                                            Copia la URL de arriba
                                        </li>
                                        <li>
                                            Abre{" "}
                                            <a
                                                href="https://calendar.google.com"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                Google Calendar
                                            </a>
                                        </li>
                                        <li>
                                            En la barra lateral, haz clic en <strong>"+"</strong> junto a
                                            "Otros calendarios"
                                        </li>
                                        <li>
                                            Selecciona <strong>"Desde URL"</strong>
                                        </li>
                                        <li>
                                            Pega la URL copiada y haz clic en{" "}
                                            <strong>"Agregar calendario"</strong>
                                        </li>
                                    </ol>
                                    <p className="text-xs text-muted-foreground italic mt-2">
                                        ⏱️ Google Calendar actualiza feeds externos cada 12-24 horas. Los eventos
                                        nuevos pueden tardar un poco en aparecer.
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleRegenerate}
                                        className="flex-1 py-3 rounded-lg text-sm font-black uppercase tracking-widest bg-white border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Regenerar URL
                                    </button>
                                    <button
                                        onClick={handleDisable}
                                        className="flex-1 py-3 px-4 rounded-lg text-sm font-black uppercase tracking-widest bg-[#FF3366] text-black border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center justify-center gap-2"
                                    >
                                        <ShieldAlert className="w-4 h-4" />
                                        Desactivar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Import Tab */}
                {activeTab === "import" && (
                    <div className="space-y-4 py-4">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-xl bg-[#00F0FF] border-4 border-foreground shadow-[4px_4px_0_0_#000] flex items-center justify-center">
                                <Upload className="w-8 h-8 text-black" />
                            </div>
                            <div>
                                <h3 className="font-black text-xl uppercase tracking-tight">Importar eventos de Google</h3>
                                <p className="text-sm font-bold mt-1">
                                    Exporta tu calendario de Google como archivo .ics e impórtalo aquí
                                    para traer tus eventos a TABE.
                                </p>
                            </div>

                            <div className="bg-[#FFE66D] border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl p-5 text-left">
                                <h4 className="font-black uppercase tracking-widest text-sm mb-2">
                                    📋 Cómo exportar desde Google Calendar:
                                </h4>
                                <ol className="list-decimal list-inside space-y-1.5 text-sm font-bold text-foreground/80">
                                    <li>
                                        Abre{" "}
                                        <a
                                            href="https://calendar.google.com/calendar/r/settings/export"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline"
                                        >
                                            Configuración de exportación
                                        </a>
                                    </li>
                                    <li>Haz clic en <strong>"Exportar"</strong></li>
                                    <li>Descomprime el archivo .zip descargado</li>
                                    <li>Sube el archivo .ics en el paso siguiente</li>
                                </ol>
                            </div>

                            <button
                                onClick={() => {
                                    onClose();
                                    onOpenImport();
                                }}
                                className="px-6 py-3 rounded-lg font-black uppercase tracking-widest bg-[#4ECDC4] text-black border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center gap-2 mx-auto"
                            >
                                <Upload className="w-4 h-4" />
                                Importar archivo .ics
                            </button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
