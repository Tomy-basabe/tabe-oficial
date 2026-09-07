import { useState, useEffect } from "react";
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
    ArrowLeftRight,
    CheckCircle2,
    Calendar as CalendarIcon,
    AlertCircle,
    Zap,
    Unlink,
    Sparkles,
    Infinity as InfinityIcon,
    ShieldCheck,
} from "lucide-react";
import { useCalendarFeed } from "@/hooks/useCalendarFeed";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarEvent, CreateEventData } from "@/hooks/useCalendarEvents";
import {
    isGoogleCalendarConnected,
    isGoogleTokenNeedsReauth,
    disconnectGoogleCalendar,
    isAutoSyncEnabled,
    setAutoSyncEnabled,
    getLastSyncTime,
    performBidirectionalSync,
    GCAL_EMAIL_KEY,
} from "@/lib/googleCalendarSync";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GoogleCalendarSyncModalProps {
    open: boolean;
    onClose: () => void;
    onOpenImport: () => void;
    events?: CalendarEvent[];
    createEvent?: (event: CreateEventData) => Promise<any>;
    updateEvent?: (id: string, event: Partial<CreateEventData>) => Promise<any>;
    refetch?: () => Promise<void>;
}

export function GoogleCalendarSyncModal({
    open,
    onClose,
    onOpenImport,
    events = [],
    createEvent,
    updateEvent,
    refetch,
}: GoogleCalendarSyncModalProps) {
    const { connectGoogleCalendar } = useAuth();
    const { feedToken, feedUrl, loading: feedLoading, generateToken, regenerateToken, disableFeed } =
        useCalendarFeed();

    // Default to "permanent" tab so user immediately sees the no-expiration solution
    const [activeTab, setActiveTab] = useState<"permanent" | "live" | "import">("permanent");
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Live Sync States
    const [connected, setConnected] = useState(false);
    const [needsReauth, setNeedsReauth] = useState(false);
    const [autoSync, setAutoSync] = useState(true);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [syncResult, setSyncResult] = useState<{ pushed: number; pulled: number } | null>(null);
    const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            const isConn = isGoogleCalendarConnected();
            const reauth = isGoogleTokenNeedsReauth();
            setConnected(isConn);
            setNeedsReauth(reauth);
            setAutoSync(isAutoSyncEnabled());
            setLastSync(getLastSyncTime());
            setConnectedEmail(localStorage.getItem(GCAL_EMAIL_KEY));

            // Auto-generate feed token if not present so it's instantly ready
            if (!feedLoading && !feedToken) {
                generateToken();
            }
        }
    }, [open, feedLoading, feedToken, generateToken]);

    const handleConnectGoogle = async () => {
        try {
            setIsConnecting(true);
            const res = await connectGoogleCalendar();
            if (res?.error) {
                toast.error("Error al conectar con Google: " + res.error.message);
            }
        } catch (e: any) {
            toast.error(e?.message || "No se pudo iniciar la conexión con Google");
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = () => {
        if (confirm("¿Desconectar Google Calendar? Los eventos existentes en TABE no se borrarán.")) {
            disconnectGoogleCalendar();
            setConnected(false);
            setNeedsReauth(false);
            setSyncResult(null);
            toast.success("Google Calendar desconectado");
        }
    };

    const handleToggleAutoSync = () => {
        const next = !autoSync;
        setAutoSync(next);
        setAutoSyncEnabled(next);
        toast.success(next ? "Sincronización automática activada" : "Sincronización automática pausada");
    };

    const handleRunSync = async () => {
        if (!createEvent || !updateEvent) {
            toast.error("Servicio de eventos no listo");
            return;
        }

        setIsSyncing(true);
        setSyncResult(null);
        toast.info("Iniciando sincronización bidireccional...");

        try {
            const result = await performBidirectionalSync({
                tabeEvents: events,
                createTabeEvent: createEvent,
                updateTabeEvent: updateEvent,
                refetchEvents: refetch,
            });

            if (result.success) {
                setSyncResult({ pushed: result.pushedCount, pulled: result.pulledCount });
                setLastSync(new Date().toISOString());
                setNeedsReauth(false);
                toast.success(
                    `¡Sincronizado! ${result.pushedCount} a Google, ${result.pulledCount} traídos a TABE`
                );
            } else {
                toast.error(result.error || "Error al sincronizar");
                setConnected(isGoogleCalendarConnected());
                setNeedsReauth(isGoogleTokenNeedsReauth());
            }
        } catch (err: any) {
            toast.error(err?.message || "Error inesperado al sincronizar");
            setConnected(isGoogleCalendarConnected());
            setNeedsReauth(isGoogleTokenNeedsReauth());
        } finally {
            setIsSyncing(false);
        }
    };

    // Feed functions: 1-Click Subscribe in Google Calendar (NEVER EXPIRES)
    const handleSubscribeGoogleCalendar = () => {
        if (!feedUrl) {
            toast.error("El enlace aún se está generando, intenta en un segundo...");
            handleGenerate();
            return;
        }
        // Google Calendar web subscription URL accepts webcal://
        const webcalUrl = feedUrl.replace(/^https?:\/\//i, "webcal://");
        const gcalSubscribeUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;
        window.open(gcalSubscribeUrl, "_blank", "noopener,noreferrer");
        toast.success("Abriendo Google Calendar para suscribirte de forma permanente...");
    };

    const handleCopy = async () => {
        if (!feedUrl) return;
        try {
            await navigator.clipboard.writeText(feedUrl);
            setCopied(true);
            toast.success("URL del feed copiada al portapapeles");
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

    const formatLastSync = (iso: string | null) => {
        if (!iso) return "Nunca";
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " - " + d.toLocaleDateString();
        } catch {
            return iso;
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-xl bg-background border-4 border-foreground shadow-[12px_12px_0_0_hsl(var(--foreground))] rounded-xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="font-display font-black text-2xl uppercase tracking-widest flex items-center gap-2 text-foreground">
                        <ArrowLeftRight className="w-7 h-7 text-[#00F0FF]" />
                        Sincronizar con Google Calendar
                    </DialogTitle>
                    <DialogDescription className="font-bold text-foreground/80">
                        Ten todos tus parciales, entregas y clases de TABE en tu Google Calendar siempre al día.
                    </DialogDescription>
                </DialogHeader>

                {/* Comic Style Tabs */}
                <div className="flex gap-2 p-1 border-b-[3px] border-foreground/15 pb-3">
                    <button
                        onClick={() => setActiveTab("permanent")}
                        className={cn(
                            "flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border-[3px] border-foreground relative",
                            activeTab === "permanent"
                                ? "bg-[#00FF9D] text-black shadow-[4px_4px_0_0_#000] -translate-y-0.5"
                                : "bg-muted text-foreground hover:bg-muted/80 shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                        )}
                    >
                        <InfinityIcon className="w-4 h-4" />
                        <span>Sin Caducidad</span>
                        <span className="hidden sm:inline-block bg-black text-[#00FF9D] text-[9px] px-1 py-0.2 rounded font-black tracking-normal uppercase">
                            ⭐ Top
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab("live")}
                        className={cn(
                            "flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border-[3px] border-foreground",
                            activeTab === "live"
                                ? "bg-[#00F0FF] text-black shadow-[4px_4px_0_0_#000] -translate-y-0.5"
                                : "bg-muted text-foreground hover:bg-muted/80 shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                        )}
                    >
                        <Zap className="w-4 h-4 fill-current" />
                        2 Vías (En Vivo)
                    </button>
                    <button
                        onClick={() => setActiveTab("import")}
                        className={cn(
                            "flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border-[3px] border-foreground",
                            activeTab === "import"
                                ? "bg-[#FFE66D] text-black shadow-[4px_4px_0_0_#000] -translate-y-0.5"
                                : "bg-muted text-foreground hover:bg-muted/80 shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                        )}
                    >
                        <Upload className="w-4 h-4" />
                        Importar .ICS
                    </button>
                </div>

                {/* TAB 1: PERMANENT CALENDAR (NO EXPIRATION / SIN CADUCIDAD) */}
                {activeTab === "permanent" && (
                    <div className="space-y-4 py-2 overflow-y-auto pr-1">
                        {/* Banner: Sin Caducidad */}
                        <div className="p-4 bg-gradient-to-r from-[#00FF9D]/20 via-[#00F0FF]/15 to-[#FFE66D]/20 border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl space-y-2">
                            <div className="flex items-center gap-2 font-black uppercase tracking-wider text-sm text-foreground">
                                <Sparkles className="w-5 h-5 text-[#00FF9D] shrink-0 fill-current" />
                                Suscripción Permanente (No Caduca Jamás)
                            </div>
                            <p className="text-xs font-bold leading-relaxed text-foreground/90">
                                Con este método <strong>no tienes que volver a iniciar sesión nunca</strong>. Google Calendar se conecta directamente con tu cuenta de TABE y sincroniza todos tus eventos automáticamente:
                            </p>
                            <ul className="text-xs font-bold list-disc list-inside space-y-1 pl-1 text-foreground/80">
                                <li><strong>Sin vencimiento de sesión:</strong> Funciona los 365 días del año sin desconectarse.</li>
                                <li><strong>En todos tus dispositivos:</strong> Visible en la app de Google Calendar de tu celular, tablet y PC.</li>
                                <li><strong>Actualización automática:</strong> Todo parcial, entrega o examen nuevo en TABE aparecerá en tu calendario.</li>
                            </ul>
                        </div>

                        {/* Action: 1-Click Add to Google Calendar */}
                        <div className="p-5 bg-card border-[3px] border-foreground shadow-[5px_5px_0_0_hsl(var(--foreground))] rounded-xl text-center space-y-3">
                            <h3 className="font-black text-base uppercase tracking-tight text-foreground">
                                Vincular con Google Calendar en 1 Clic
                            </h3>
                            <p className="text-xs font-bold text-muted-foreground max-w-md mx-auto">
                                Haz clic en el botón de abajo. Se abrirá Google Calendar y solo tendrás que presionar <strong>"Añadir calendario"</strong> una sola vez.
                            </p>

                            <button
                                onClick={handleSubscribeGoogleCalendar}
                                disabled={feedLoading || generating}
                                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm bg-[#00FF9D] text-black border-4 border-foreground shadow-[5px_5px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center justify-center gap-2.5 mx-auto cursor-pointer disabled:opacity-50"
                            >
                                <InfinityIcon className="w-5 h-5" />
                                Añadir a Google Calendar (Sin Caducidad)
                            </button>
                        </div>

                        {/* Copyable Feed URL Box */}
                        <div className="space-y-2 pt-1">
                            <label className="text-xs font-black uppercase tracking-widest text-foreground flex items-center justify-between">
                                <span>O copia tu enlace personal de calendario:</span>
                                <span className="text-[10px] text-muted-foreground font-mono">iCal / Webcal</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={feedUrl || "Generando enlace permanente..."}
                                    readOnly
                                    className="flex-1 px-3.5 py-2.5 bg-background text-foreground border-[3px] border-foreground rounded-lg text-xs font-mono font-bold truncate focus:outline-none focus:shadow-[4px_4px_0_0_hsl(var(--foreground))]"
                                />
                                <button
                                    onClick={handleCopy}
                                    disabled={!feedUrl}
                                    className="px-4 py-2 bg-[#00F0FF] text-black border-[3px] border-foreground rounded-lg shadow-[3px_3px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all font-black uppercase tracking-widest flex items-center gap-1.5 text-xs shrink-0 cursor-pointer disabled:opacity-50"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4 text-green-700" />
                                            Copiado
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copiar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Security / Refresh controls */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleRegenerate}
                                disabled={generating}
                                className="flex-1 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider bg-muted text-foreground border-[2px] border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", generating && "animate-spin")} />
                                Regenerar Enlace Privado
                            </button>
                            <button
                                onClick={handleDisable}
                                className="py-2.5 px-4 rounded-lg text-[11px] font-black uppercase tracking-wider bg-[#FF3366]/20 text-foreground border-[2px] border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:bg-[#FF3366] hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Desactivar
                            </button>
                        </div>
                    </div>
                )}

                {/* TAB 2: LIVE 2-WAY SYNC (API DIRECTA) */}
                {activeTab === "live" && (
                    <div className="space-y-4 py-2 overflow-y-auto pr-1">
                        {!connected ? (
                            /* Disconnected state */
                            <div className="space-y-4 py-2">
                                <div className="p-4 bg-[#FFE66D] border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl text-black space-y-2">
                                    <div className="flex items-center gap-2 font-black uppercase tracking-wider text-sm">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        Sincronización Bidireccional Directa (API)
                                    </div>
                                    <p className="text-xs font-bold leading-relaxed">
                                        Permite editar eventos tanto desde TABE como desde Google Calendar y sincronizarlos al instante.
                                    </p>
                                    <p className="text-[11px] font-bold text-black/70">
                                        💡 <em>Nota: Si prefieres que nunca caduque y no tener que loguearte, usa la pestaña <strong>"Sin Caducidad"</strong>.</em>
                                    </p>
                                </div>

                                <div className="text-center py-4 space-y-4">
                                    <div className="w-16 h-16 mx-auto rounded-2xl bg-[#00F0FF] border-4 border-foreground shadow-[4px_4px_0_0_#000] flex items-center justify-center">
                                        <CalendarIcon className="w-8 h-8 text-black" />
                                    </div>

                                    <div>
                                        <h3 className="font-black text-lg uppercase tracking-tight">
                                            Conecta tu Google Calendar
                                        </h3>
                                        <p className="text-xs font-bold text-muted-foreground mt-1 max-w-sm mx-auto">
                                            Concede permisos a TABE para leer y guardar eventos en tu calendario principal de Google.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleConnectGoogle}
                                        disabled={isConnecting}
                                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-sm bg-white text-black border-4 border-foreground shadow-[5px_5px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-50 cursor-pointer"
                                    >
                                        {isConnecting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                <path
                                                    fill="#4285F4"
                                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                />
                                                <path
                                                    fill="#34A853"
                                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                />
                                                <path
                                                    fill="#FBBC05"
                                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                                />
                                                <path
                                                    fill="#EA4335"
                                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                                />
                                            </svg>
                                        )}
                                        Conectar con Google Calendar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Connected State */
                            <div className="space-y-4">
                                {/* Status Banner */}
                                <div className="p-4 bg-[#00FF9D]/20 border-[3px] border-[#00FF9D] rounded-xl flex items-center justify-between shadow-[4px_4px_0_0_#00FF9D]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3.5 h-3.5 rounded-full bg-[#00FF9D] animate-pulse" />
                                        <div>
                                            <div className="font-black uppercase tracking-wider text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                                                Conectado a Google Calendar
                                            </div>
                                            {connectedEmail && (
                                                <p className="text-[11px] font-bold text-muted-foreground">{connectedEmail}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                                            Última Sincro
                                        </span>
                                        <span className="text-xs font-mono font-bold text-foreground">
                                            {formatLastSync(lastSync)}
                                        </span>
                                    </div>
                                </div>

                                {/* Reauth Banner if Token Expired */}
                                {needsReauth && (
                                    <div className="p-3.5 bg-amber-500/15 border-[3px] border-amber-500 rounded-xl flex items-center justify-between gap-3 shadow-[3px_3px_0_0_#F59E0B]">
                                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                            <span>Sesión en vivo pausada. Renueva con 1 clic para seguir enviando eventos por API.</span>
                                        </div>
                                        <button
                                            onClick={handleConnectGoogle}
                                            disabled={isConnecting}
                                            className="px-3 py-1.5 bg-amber-500 text-black border-2 border-foreground rounded font-black text-xs uppercase shrink-0 shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] transition-transform cursor-pointer"
                                        >
                                            {isConnecting ? "Renovando..." : "Renovar"}
                                        </button>
                                    </div>
                                )}

                                {/* Sync Results Notice */}
                                {syncResult && (
                                    <div className="p-3.5 bg-[#00F0FF]/15 border-[3px] border-foreground rounded-xl flex items-center gap-3 shadow-[3px_3px_0_0_hsl(var(--foreground))]">
                                        <CheckCircle2 className="w-5 h-5 text-[#00F0FF] shrink-0" />
                                        <div className="text-xs font-bold">
                                            <span className="font-black uppercase">¡Sincronización exitosa!</span> Se enviaron{" "}
                                            <strong>{syncResult.pushed}</strong> eventos a Google y se trajeron{" "}
                                            <strong>{syncResult.pulled}</strong> eventos a TABE.
                                        </div>
                                    </div>
                                )}

                                {/* Auto-Sync Toggle */}
                                <div className="p-4 bg-muted/60 border-[3px] border-foreground rounded-xl flex items-center justify-between shadow-[3px_3px_0_0_hsl(var(--foreground))]">
                                    <div>
                                        <div className="font-black uppercase tracking-wider text-xs sm:text-sm text-foreground">
                                            Sincronización Automática
                                        </div>
                                        <p className="text-xs text-muted-foreground font-bold mt-0.5">
                                            Guarda y actualiza en Google al crear eventos en TABE.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleToggleAutoSync}
                                        className={cn(
                                            "w-12 h-7 rounded-full border-2 border-foreground transition-colors p-0.5 flex items-center cursor-pointer shadow-[2px_2px_0_0_hsl(var(--foreground))]",
                                            autoSync ? "bg-[#00FF9D] justify-end" : "bg-muted-foreground/30 justify-start"
                                        )}
                                    >
                                        <div className="w-5 h-5 rounded-full bg-white border border-foreground shadow-sm" />
                                    </button>
                                </div>

                                {/* Actions: Run 2-Way Sync & Open Google Calendar */}
                                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                                    <button
                                        onClick={handleRunSync}
                                        disabled={isSyncing}
                                        className="flex-1 py-3 px-4 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm bg-[#00F0FF] text-black border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                    >
                                        <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                                        {isSyncing ? "Sincronizando..." : "Sincronizar Ahora (Ambas Vías)"}
                                    </button>

                                    <a
                                        href="https://calendar.google.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-3 px-4 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm bg-white text-black border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Abrir Google
                                    </a>
                                </div>

                                {/* Refresh Permissions / Reconnect & Disconnect */}
                                <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 border-t-2 border-foreground/15">
                                    <button
                                        type="button"
                                        onClick={handleConnectGoogle}
                                        disabled={isConnecting}
                                        className="text-xs font-black uppercase tracking-wider text-foreground hover:text-primary hover:underline inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <Zap className="w-3.5 h-3.5 fill-current text-[#00FF9D]" />
                                        Actualizar permisos de Google Calendar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDisconnect}
                                        className="text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-red-500 hover:underline inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <Unlink className="w-3.5 h-3.5" />
                                        Desconectar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: IMPORT ICS */}
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
                                <h4 className="font-black uppercase tracking-widest text-sm mb-2 text-black">
                                    📋 Cómo exportar desde Google Calendar:
                                </h4>
                                <ol className="list-decimal list-inside space-y-1.5 text-xs font-bold text-black">
                                    <li>
                                        Abre{" "}
                                        <a
                                            href="https://calendar.google.com/calendar/r/settings/export"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline"
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
                                className="px-6 py-3 rounded-lg font-black uppercase tracking-widest bg-[#4ECDC4] text-black border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] transition-all flex items-center gap-2 mx-auto cursor-pointer"
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
