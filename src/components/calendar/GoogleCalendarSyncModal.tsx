import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Copy,
    Check,
    RefreshCw,
    ExternalLink,
    Upload,
    Loader2,
    CheckCircle2,
    Calendar as CalendarIcon,
    AlertCircle,
    Zap,
    Unlink,
    Sparkles,
    ChevronDown,
    ChevronUp,
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
    getStoredGoogleFeedUrl,
    setStoredGoogleFeedUrl,
    performGoogleAutoSync,
    cleanupDuplicateEvents,
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
    onCleanupDuplicates?: () => Promise<any>;
}

export function GoogleCalendarSyncModal({
    open,
    onClose,
    onOpenImport,
    events = [],
    createEvent,
    updateEvent,
    refetch,
    onCleanupDuplicates,
}: GoogleCalendarSyncModalProps) {
    const { user, connectGoogleCalendar } = useAuth();
    const { feedToken, feedUrl, loading: feedLoading, generateToken, regenerateToken } =
        useCalendarFeed();

    const [connected, setConnected] = useState(false);
    const [needsReauth, setNeedsReauth] = useState(false);
    const [autoSync, setAutoSync] = useState(true);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [syncResult, setSyncResult] = useState<{ pushed: number; pulled: number } | null>(null);
    const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
    const [isCleaning, setIsCleaning] = useState(false);

    // Advanced options accordion
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [copied, setCopied] = useState(false);
    const [icalFeedUrl, setIcalFeedUrl] = useState("");
    const [isSavingIcal, setIsSavingIcal] = useState(false);

    useEffect(() => {
        if (open) {
            const isConn = isGoogleCalendarConnected(user);
            const reauth = isGoogleTokenNeedsReauth();
            setConnected(isConn);
            setNeedsReauth(reauth);
            setAutoSync(isAutoSyncEnabled());
            setLastSync(getLastSyncTime());
            setConnectedEmail(localStorage.getItem(GCAL_EMAIL_KEY) || user?.email || null);

            const savedIcal = getStoredGoogleFeedUrl(user?.user_metadata);
            setIcalFeedUrl(savedIcal || "");

            if (!feedLoading && !feedToken) {
                generateToken();
            }
        }
    }, [open, feedLoading, feedToken, generateToken, user]);

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

    const handleRunSync = async () => {
        setIsSyncing(true);
        setSyncResult(null);
        toast.info("Sincronizando Google Calendar y TABE...", { icon: "⚡" });

        try {
            if (createEvent && updateEvent) {
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
                    setConnected(true);
                    toast.success(
                        `¡Sincronizado! ${result.pushedCount} enviados a Google, ${result.pulledCount} traídos a TABE`,
                        { icon: "✅", duration: 5000 }
                    );
                    if (refetch) await refetch();
                } else {
                    toast.error(result.error || "Error al sincronizar");
                    setConnected(isGoogleCalendarConnected(user));
                    setNeedsReauth(isGoogleTokenNeedsReauth());
                }
            } else if (user?.id) {
                const res = await performGoogleAutoSync(user.id, user.user_metadata);
                if (res.success) {
                    setLastSync(new Date().toISOString());
                    setConnected(true);
                    toast.success("Google Calendar actualizado con éxito", { icon: "✅" });
                    if (refetch) await refetch();
                } else {
                    toast.error(res.message || "Error al sincronizar");
                }
            }
        } catch (err: any) {
            toast.error(err?.message || "Error inesperado al sincronizar");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleRunCleanup = async () => {
        if (isCleaning) return;
        if (!confirm("¿Deseas buscar y eliminar eventos duplicados entre TABE y Google Calendar? Se conservará la copia original más completa.")) {
            return;
        }
        setIsCleaning(true);
        toast.info("Escaneando y limpiando eventos duplicados...", { icon: "🧹" });
        try {
            if (onCleanupDuplicates) {
                await onCleanupDuplicates();
            } else if (user?.id) {
                const res = await cleanupDuplicateEvents(user.id);
                if (res.tabeDuplicatesRemoved === 0 && res.googleDuplicatesRemoved === 0) {
                    toast.info("¡Tu calendario ya está limpio! No se encontraron eventos duplicados.");
                } else {
                    toast.success(
                        `Limpieza completa: ${res.tabeDuplicatesRemoved} duplicados eliminados en TABE${
                            res.googleDuplicatesRemoved > 0 ? ` y ${res.googleDuplicatesRemoved} en Google Calendar` : ""
                        }.`,
                        { icon: "✨", duration: 5000 }
                    );
                }
                if (refetch) await refetch();
            }
        } catch (err: any) {
            toast.error(err?.message || "Error al limpiar duplicados");
        } finally {
            setIsCleaning(false);
        }
    };

    const handleToggleAutoSync = () => {
        const next = !autoSync;
        setAutoSync(next);
        setAutoSyncEnabled(next);
        toast.success(next ? "Sincronización automática activada" : "Sincronización automática pausada");
    };

    const handleDisconnect = () => {
        if (confirm("¿Desconectar Google Calendar? Tus eventos guardados en TABE se mantendrán intactos.")) {
            disconnectGoogleCalendar();
            setConnected(false);
            setNeedsReauth(false);
            setSyncResult(null);
            toast.success("Google Calendar desconectado");
        }
    };

    const handleSaveManualIcal = async () => {
        if (!icalFeedUrl.trim()) {
            toast.error("Por favor ingresa la dirección iCal");
            return;
        }
        const clean = icalFeedUrl.trim().replace(/^webcal:\/\//i, "https://");
        setIsSavingIcal(true);
        toast.info("Guardando enlace iCal...");
        try {
            await setStoredGoogleFeedUrl(clean);
            setConnected(true);
            if (user?.id) {
                const res = await performGoogleAutoSync(user.id, user.user_metadata);
                if (res.success) {
                    toast.success(`iCal sincronizado: ${res.added} nuevos, ${res.updated} actualizados`);
                    setLastSync(new Date().toISOString());
                    if (refetch) await refetch();
                }
            }
        } catch (e: any) {
            toast.error(e?.message || "Error al guardar el enlace iCal");
        } finally {
            setIsSavingIcal(false);
        }
    };

    const handleCopyFeed = async () => {
        if (!feedUrl) return;
        try {
            await navigator.clipboard.writeText(feedUrl);
            setCopied(true);
            toast.success("Enlace copiado al portapapeles");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Error al copiar enlace");
        }
    };

    const formatLastSync = (iso: string | null) => {
        if (!iso) return "Nunca";
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " (" + d.toLocaleDateString() + ")";
        } catch {
            return iso;
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-xl bg-background border-4 border-foreground shadow-[10px_10px_0_0_hsl(var(--foreground))] rounded-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-5">
                <DialogHeader className="space-y-1.5 text-left">
                    <DialogTitle className="font-display font-black text-2xl sm:text-3xl uppercase tracking-tight flex items-center gap-2.5 text-foreground">
                        <div className="w-9 h-9 rounded-xl bg-[#00F0FF] border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
                            <CalendarIcon className="w-5 h-5 text-black" />
                        </div>
                        <span>Google Calendar</span>
                    </DialogTitle>
                    <DialogDescription className="font-bold text-xs sm:text-sm text-foreground/80">
                        Sincroniza tus exámenes, parciales y clases entre TABE y tu Google Calendar en ambas direcciones.
                    </DialogDescription>
                </DialogHeader>

                {/* MAIN CONTENT AREA */}
                {connected ? (
                    /* ESTADO: CONECTADO */
                    <div className="space-y-4">
                        {/* Estado Card */}
                        <div className="p-4 bg-[#00FF9D]/15 border-3 border-[#00FF9D] rounded-xl shadow-[4px_4px_0_0_#00FF9D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-3.5 h-3.5 rounded-full bg-[#00FF9D] shadow-[0_0_10px_#00FF9D] animate-pulse shrink-0" />
                                <div>
                                    <p className="font-black text-xs sm:text-sm uppercase tracking-wider text-foreground">
                                        Google Calendar Vinculado
                                    </p>
                                    {connectedEmail && (
                                        <p className="text-xs font-bold text-muted-foreground">{connectedEmail}</p>
                                    )}
                                </div>
                            </div>
                            <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-foreground/10">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                                    Última Sincro
                                </span>
                                <span className="text-xs font-mono font-bold text-foreground">
                                    {formatLastSync(lastSync)}
                                </span>
                            </div>
                        </div>

                        {/* Reauth Banner si la sesión expiró */}
                        {needsReauth && (
                            <div className="p-3.5 bg-amber-500/15 border-2 border-amber-500 rounded-xl flex items-center justify-between gap-3 shadow-[3px_3px_0_0_#F59E0B]">
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                    <span>Tu sesión en Google expiró. Renueva con 1 clic para seguir enviando eventos por API.</span>
                                </div>
                                <button
                                    onClick={handleConnectGoogle}
                                    disabled={isConnecting}
                                    className="px-3 py-1.5 bg-amber-500 text-black border-2 border-foreground rounded-lg font-black text-xs uppercase shrink-0 shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] transition-transform cursor-pointer"
                                >
                                    {isConnecting ? "Renovando..." : "Renovar"}
                                </button>
                            </div>
                        )}

                        {/* Resultado de la última sincronización */}
                        {syncResult && (
                            <div className="p-3 bg-[#00F0FF]/15 border-2 border-foreground rounded-xl flex items-center gap-2.5 shadow-[3px_3px_0_0_hsl(var(--foreground))] text-xs font-bold text-foreground">
                                <CheckCircle2 className="w-4 h-4 text-[#00F0FF] shrink-0" />
                                <div>
                                    <span className="font-black uppercase">¡Sincronizado con éxito! </span>
                                    {syncResult.pushed} enviados a Google Calendar, {syncResult.pulled} recibidos en TABE.
                                </div>
                            </div>
                        )}

                        {/* Botón Principal: Sincronizar Ahora */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <button
                                onClick={handleRunSync}
                                disabled={isSyncing}
                                className="sm:col-span-2 py-3 px-4 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm bg-[#00FF9D] text-black border-3 border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[1px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                            >
                                {isSyncing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Sincronizando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4 fill-current" />
                                        <span>Sincronizar Ahora (Ambas Vías)</span>
                                    </>
                                )}
                            </button>

                            <a
                                href="https://calendar.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-3 px-4 rounded-xl font-black uppercase tracking-widest text-xs bg-white text-black border-3 border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <span>Abrir Google</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>

                        {/* Auto-Sync Switch & Limpiar Duplicados */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-3 bg-muted/40 border-2 border-foreground rounded-xl flex items-center justify-between shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                                <div>
                                    <p className="font-black text-xs uppercase tracking-wider text-foreground">Auto-Sincro</p>
                                    <p className="text-[11px] font-bold text-muted-foreground">Cada 3 minutos en segundo plano</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleToggleAutoSync}
                                    className={cn(
                                        "w-11 h-6 rounded-full border-2 border-foreground transition-colors p-0.5 flex items-center cursor-pointer shadow-[2px_2px_0_0_hsl(var(--foreground))]",
                                        autoSync ? "bg-[#00FF9D] justify-end" : "bg-muted-foreground/30 justify-start"
                                    )}
                                >
                                    <div className="w-4 h-4 rounded-full bg-white border border-foreground shadow-sm" />
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleRunCleanup}
                                disabled={isCleaning}
                                className="p-3 bg-white text-black border-2 border-foreground rounded-xl flex items-center justify-between shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:bg-red-50 hover:text-red-600 active:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 text-left"
                            >
                                <div>
                                    <p className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                        <span>Limpiar Duplicados</span>
                                    </p>
                                    <p className="text-[11px] font-bold text-muted-foreground">Borrar copias redundantes</p>
                                </div>
                                {isCleaning ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                                ) : (
                                    <span className="text-[10px] font-black uppercase bg-black text-white px-1.5 py-0.5 rounded">Limpiar</span>
                                )}
                            </button>
                        </div>

                        {/* Desconectar */}
                        <div className="pt-2 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={handleDisconnect}
                                className="text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-red-600 hover:underline inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Unlink className="w-3.5 h-3.5" />
                                Desconectar cuenta de Google
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ESTADO: DESCONECTADO */
                    <div className="space-y-4 text-center py-2">
                        <div className="p-4 bg-[#FFE66D] border-3 border-foreground shadow-[4px_4px_0_0_#000] rounded-xl text-black space-y-2 text-left">
                            <p className="font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-black shrink-0" />
                                <span>Sincronización Bidireccional en Tiempo Real</span>
                            </p>
                            <p className="text-xs font-bold leading-relaxed">
                                Al conectar tu Google Calendar, cualquier parcial, clase o entrega que cargues en TABE se subirá automáticamente a Google Calendar en tu celular, tablet y PC.
                            </p>
                        </div>

                        <div className="pt-2 pb-1">
                            <button
                                onClick={handleConnectGoogle}
                                disabled={isConnecting}
                                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm bg-white text-black border-4 border-foreground shadow-[5px_5px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[7px_7px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-50 cursor-pointer"
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
                                <span>Conectar con Google Calendar</span>
                            </button>
                        </div>

                        <p className="text-[11px] font-bold text-muted-foreground max-w-md mx-auto leading-relaxed">
                            💡 Si Google muestra una pantalla de verificación (<em className="text-foreground">"Google no verificó esta app"</em>), simplemente haz clic en <strong>"Avanzado"</strong> y luego en <strong>"Continuar a TABE"</strong> para permitir la sincronización.
                        </p>
                    </div>
                )}

                {/* SECCIÓN COLAPSABLE: OPCIONES AVANZADAS Y ALTERNATIVAS */}
                <div className="pt-2 border-t-2 border-foreground/15">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground py-1 transition-colors cursor-pointer"
                    >
                        <span>Otras opciones (Enlace iCal y archivo .ics)</span>
                        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showAdvanced && (
                        <div className="space-y-4 pt-3 pb-1 animate-in fade-in duration-200">
                            {/* Opción 1: Enlace de suscripción iCal de TABE */}
                            <div className="p-3.5 bg-muted/40 border-2 border-foreground rounded-xl space-y-2 text-left">
                                <label className="text-xs font-black uppercase tracking-wider text-foreground block">
                                    Enlace permanente de suscripción iCal de TABE:
                                </label>
                                <p className="text-[11px] font-bold text-muted-foreground">
                                    Puedes pegar esta URL en cualquier aplicación de calendario (Apple Calendar, Outlook o Google Calendar).
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={feedUrl || "Generando enlace..."}
                                        className="flex-1 px-3 py-1.5 bg-background text-foreground border-2 border-foreground rounded-lg text-xs font-mono font-bold truncate focus:outline-none"
                                    />
                                    <button
                                        onClick={handleCopyFeed}
                                        disabled={!feedUrl}
                                        className="px-3 py-1.5 bg-[#00F0FF] text-black border-2 border-foreground rounded-lg font-black uppercase text-xs shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copied ? "Copiado" : "Copiar"}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Opción 2: Importar archivo .ics */}
                            <div className="flex items-center justify-between p-3.5 bg-muted/40 border-2 border-foreground rounded-xl">
                                <div>
                                    <p className="font-black text-xs uppercase tracking-wider text-foreground">Importar archivo .ics</p>
                                    <p className="text-[11px] font-bold text-muted-foreground">Carga tus eventos desde un archivo descargado de Google Calendar.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        onClose();
                                        onOpenImport();
                                    }}
                                    className="px-3.5 py-2 rounded-lg font-black uppercase text-xs bg-[#FFE66D] text-black border-2 border-foreground shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Importar .ics</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

