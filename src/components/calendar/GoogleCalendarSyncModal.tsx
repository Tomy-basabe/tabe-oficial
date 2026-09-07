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
} from "lucide-react";
import { useCalendarFeed } from "@/hooks/useCalendarFeed";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarEvent, CreateEventData } from "@/hooks/useCalendarEvents";
import {
    isGoogleCalendarConnected,
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

    const [activeTab, setActiveTab] = useState<"live" | "export" | "import">("live");
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Live Sync States
    const [connected, setConnected] = useState(false);
    const [autoSync, setAutoSync] = useState(true);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [syncResult, setSyncResult] = useState<{ pushed: number; pulled: number } | null>(null);
    const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            const isConn = isGoogleCalendarConnected();
            setConnected(isConn);
            setAutoSync(isAutoSyncEnabled());
            setLastSync(getLastSyncTime());
            setConnectedEmail(localStorage.getItem(GCAL_EMAIL_KEY));
        }
    }, [open]);

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
            });

            if (result.success) {
                setSyncResult({ pushed: result.pushedCount, pulled: result.pulledCount });
                setLastSync(new Date().toISOString());
                if (refetch) await refetch();
                toast.success(
                    `¡Sincronizado! ${result.pushedCount} a Google, ${result.pulledCount} traídos a TABE`
                );
            } else {
                toast.error(result.error || "Error al sincronizar");
                setConnected(isGoogleCalendarConnected());
            }
        } catch (err: any) {
            toast.error(err?.message || "Error inesperado al sincronizar");
            setConnected(isGoogleCalendarConnected());
        } finally {
            setIsSyncing(false);
        }
    };

    // Feed functions
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
                        Conecta TABE con Google Calendar para sincronizar tus eventos en ambas direcciones.
                    </DialogDescription>
                </DialogHeader>

                {/* Comic Style Tabs */}
                <div className="flex gap-2 p-1 border-b-[3px] border-foreground/15 pb-3">
                    <button
                        onClick={() => setActiveTab("live")}
                        className={cn(
                            "flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border-[3px] border-foreground",
                            activeTab === "live"
                                ? "bg-[#00FF9D] text-black shadow-[4px_4px_0_0_#000] -translate-y-0.5"
                                : "bg-muted text-foreground hover:bg-muted/80 shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                        )}
                    >
                        <Zap className="w-4 h-4 fill-current" />
                        2 Vías (En Vivo)
                    </button>
                    <button
                        onClick={() => setActiveTab("export")}
                        className={cn(
                            "flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border-[3px] border-foreground",
                            activeTab === "export"
                                ? "bg-[#00F0FF] text-black shadow-[4px_4px_0_0_#000] -translate-y-0.5"
                                : "bg-muted text-foreground hover:bg-muted/80 shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                        )}
                    >
                        <ExternalLink className="w-4 h-4" />
                        Feed URL
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

                {/* TAB 1: LIVE 2-WAY SYNC */}
                {activeTab === "live" && (
                    <div className="space-y-4 py-2 overflow-y-auto pr-1">
                        {!connected ? (
                            /* Disconnected state */
                            <div className="space-y-4 py-2">
                                <div className="p-4 bg-[#FFE66D] border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl text-black space-y-2">
                                    <div className="flex items-center gap-2 font-black uppercase tracking-wider text-sm">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        Sincronización Bidireccional Directa
                                    </div>
                                    <p className="text-xs font-bold leading-relaxed">
                                        Al vincular tu cuenta de Google:
                                    </p>
                                    <ul className="text-xs font-bold list-disc list-inside space-y-1 pl-1">
                                        <li>Cualquier parcial, entrega o examen creado en TABE aparecerá en tu Google Calendar.</li>
                                        <li>Los eventos de Google Calendar se sincronizarán dentro de TABE (viceversa).</li>
                                        <li>Los cambios de fecha u horarios se actualizarán automáticamente.</li>
                                    </ul>
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
                                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-sm bg-white text-black border-4 border-foreground shadow-[5px_5px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-50"
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

                                {/* Auto-sync switch */}
                                <div className="flex items-center justify-between p-3.5 bg-muted/50 border-[3px] border-foreground rounded-xl shadow-[3px_3px_0_0_hsl(var(--foreground))]">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-foreground">
                                            Sincronización Automática
                                        </p>
                                        <p className="text-[11px] font-bold text-muted-foreground">
                                            Sincroniza en segundo plano al crear, editar o eliminar eventos
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleToggleAutoSync}
                                        className={cn(
                                            "w-12 h-7 rounded-full border-2 border-foreground p-0.5 transition-colors relative shadow-[2px_2px_0_0_#000]",
                                            autoSync ? "bg-[#00FF9D]" : "bg-muted"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "w-5 h-5 rounded-full bg-black border border-foreground transition-transform",
                                                autoSync ? "translate-x-5 bg-black" : "translate-x-0 bg-white"
                                            )}
                                        />
                                    </button>
                                </div>

                                {/* Actions: Run 2-Way Sync & Open Google Calendar */}
                                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                                    <button
                                        onClick={handleRunSync}
                                        disabled={isSyncing}
                                        className="flex-1 py-3 px-4 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm bg-[#00F0FF] text-black border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                                        {isSyncing ? "Sincronizando..." : "Sincronizar Ahora (Ambas Vías)"}
                                    </button>

                                    <a
                                        href="https://calendar.google.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-3 px-4 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm bg-white text-black border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Abrir Google
                                    </a>
                                </div>

                                {/* Disconnect Button */}
                                <div className="pt-2 text-center">
                                    <button
                                        onClick={handleDisconnect}
                                        className="text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-red-500 hover:underline inline-flex items-center gap-1.5 transition-colors"
                                    >
                                        <Unlink className="w-3.5 h-3.5" />
                                        Desconectar cuenta de Google Calendar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: FEED URL */}
                {activeTab === "export" && (
                    <div className="space-y-4 py-2 overflow-y-auto">
                        {feedLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : !feedToken ? (
                            <div className="text-center space-y-4 py-4">
                                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                    <Link2 className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Activa tu feed de calendario</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Genera una URL pública de sólo lectura para suscribirte en Google Calendar.
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
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-black uppercase tracking-widest">Tu URL del feed:</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={feedUrl || ""}
                                            readOnly
                                            className="flex-1 px-4 py-2 bg-background text-foreground border-[3px] border-foreground rounded-lg text-xs font-mono font-bold truncate focus:outline-none focus:shadow-[4px_4px_0_0_hsl(var(--foreground))]"
                                        />
                                        <button
                                            onClick={handleCopy}
                                            className="px-4 py-2 bg-background text-foreground border-[3px] border-foreground rounded-lg shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] active:translate-y-[2px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all font-black uppercase tracking-widest flex items-center gap-2 text-sm"
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

                                <div className="bg-[#FFE66D] border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl p-5 space-y-3">
                                    <h4 className="font-bold text-sm text-black">
                                        📋 Cómo agregar como suscripción en Google Calendar:
                                    </h4>
                                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-black font-medium">
                                        <li>Copia la URL de arriba</li>
                                        <li>Abre Google Calendar en la web</li>
                                        <li>En la barra lateral, haz clic en "+" junto a "Otros calendarios"</li>
                                        <li>Selecciona "Desde URL"</li>
                                        <li>Pega la URL y haz clic en "Agregar calendario"</li>
                                    </ol>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleRegenerate}
                                        className="flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest bg-white text-black border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Regenerar URL
                                    </button>
                                    <button
                                        onClick={handleDisable}
                                        className="flex-1 py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest bg-[#FF3366] text-black border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2"
                                    >
                                        <ShieldAlert className="w-4 h-4" />
                                        Desactivar
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
                                className="px-6 py-3 rounded-lg font-black uppercase tracking-widest bg-[#4ECDC4] text-black border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] transition-all flex items-center gap-2 mx-auto"
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
