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
  ExternalLink,
  Upload,
  Loader2,
  CheckCircle2,
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
  cleanupDuplicateEvents,
} from "@/lib/googleCalendarSync";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useConfirm } from "@/contexts/ConfirmModalContext";
import { Switch } from "@/components/ui/switch";

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
  const { confirm } = useConfirm();
  const { user, connectGoogleCalendar } = useAuth();
  const { feedUrl } = useCalendarFeed();

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

  useEffect(() => {
    if (open) {
      const isConn = isGoogleCalendarConnected(user);
      const reauth = isGoogleTokenNeedsReauth();
      setConnected(isConn);
      setNeedsReauth(reauth);
      setAutoSync(isAutoSyncEnabled());
      setLastSync(getLastSyncTime());
      setConnectedEmail(localStorage.getItem(GCAL_EMAIL_KEY) || user?.email || null);
      setSyncResult(null);
    }
  }, [open, user]);

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    try {
      await connectGoogleCalendar();
    } catch (err: any) {
      toast.error(err?.message || "Error al conectar con Google");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const ok = await confirm({
      title: "¿Desconectar Google Calendar?",
      description: "Tus eventos actuales se mantendrán en TABE, pero dejarán de sincronizarse automáticamente con tu cuenta de Google.",
      confirmText: "Desconectar",
      cancelText: "Cancelar",
      variant: "warning",
    });
    if (!ok) return;

    disconnectGoogleCalendar();
    setConnected(false);
    setConnectedEmail(null);
    toast.info("Google Calendar desconectado.");
  };

  const handleRunSync = async () => {
    if (!user || isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await performBidirectionalSync(user.id, events, createEvent, updateEvent);
      if (res.success) {
        setSyncResult({ pushed: res.pushed, pulled: res.pulled });
        setLastSync(getLastSyncTime());
        setNeedsReauth(false);
        if (refetch) await refetch();
        toast.success("Sincronización completada.");
      } else {
        if (res.message?.includes("expirad") || res.message?.includes("autorizac")) {
          setNeedsReauth(true);
        }
        toast.error(res.message || "Error al sincronizar");
      }
    } catch (e: any) {
      toast.error(e?.message || "Error inesperado al sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleAutoSync = () => {
    const nextVal = !autoSync;
    setAutoSync(nextVal);
    setAutoSyncEnabled(nextVal);
    toast.success(nextVal ? "Sincronización automática activada" : "Sincronización automática pausada");
  };

  const handleRunCleanup = async () => {
    if (onCleanupDuplicates) {
      await onCleanupDuplicates();
      return;
    }
    if (!user || isCleaning) return;
    setIsCleaning(true);
    try {
      const res = await cleanupDuplicateEvents(user.id);
      if (refetch) await refetch();
      toast.success(`Limpieza completada: ${res.tabeDuplicatesRemoved} duplicados removidos.`);
    } catch (e: any) {
      toast.error(e?.message || "Error al limpiar duplicados");
    } finally {
      setIsCleaning(false);
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
      <DialogContent className="sm:max-w-lg w-[95vw] bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-2xl max-h-[92vh] overflow-y-auto p-6 space-y-4">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>
            <span>Google Calendar</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            Sincroniza tus exámenes, parciales y clases con tu cuenta de Google.
          </DialogDescription>
        </DialogHeader>

        {/* CONTENIDO PRINCIPAL */}
        {connected ? (
          /* ESTADO: CONECTADO */
          <div className="space-y-4">
            {/* Estado Card */}
            <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Cuenta vinculada
                  </p>
                  {connectedEmail && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{connectedEmail}</p>
                  )}
                </div>
              </div>
              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-500/15">
                <span className="text-[10px] text-zinc-400 block uppercase tracking-wider">
                  Última sincronización
                </span>
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {formatLastSync(lastSync)}
                </span>
              </div>
            </div>

            {/* Reauth Banner si la sesión expiró */}
            {needsReauth && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Tu sesión en Google expiró. Renueva con 1 clic para seguir sincronizando.</span>
                </div>
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isConnecting}
                  className="px-2.5 py-1 bg-amber-500 text-zinc-950 rounded-lg font-medium text-xs shrink-0 hover:bg-amber-400 transition-colors"
                >
                  {isConnecting ? "Renovando..." : "Renovar"}
                </button>
              </div>
            )}

            {/* Resultado de la última sincronización */}
            {syncResult && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Sincronizado con éxito: </span>
                  {syncResult.pushed} enviados a Google, {syncResult.pulled} recibidos en TABE.
                </div>
              </div>
            )}

            {/* Botones de acción principales */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleRunSync}
                disabled={isSyncing}
                className="sm:col-span-2 h-9 px-4 rounded-lg font-medium text-xs sm:text-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sincronizando...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-current text-amber-400" />
                    <span>Sincronizar ahora</span>
                  </>
                )}
              </button>

              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-3 rounded-lg font-medium text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>Abrir Google</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </a>
            </div>

            {/* Opciones secundarias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Sincro automática</p>
                  <p className="text-[11px] text-zinc-400">En segundo plano</p>
                </div>
                <Switch checked={autoSync} onCheckedChange={handleToggleAutoSync} />
              </div>

              <button
                type="button"
                onClick={handleRunCleanup}
                disabled={isCleaning}
                className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl flex items-center justify-between text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors disabled:opacity-50"
              >
                <div>
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span>Limpiar duplicados</span>
                  </p>
                  <p className="text-[11px] text-zinc-400">Remover copias</p>
                </div>
                {isCleaning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                ) : (
                  <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">Limpiar</span>
                )}
              </button>
            </div>

            {/* Desconectar */}
            <div className="pt-1 flex items-center justify-end">
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs font-medium text-zinc-400 hover:text-rose-600 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Unlink className="w-3 h-3" />
                <span>Desconectar cuenta</span>
              </button>
            </div>
          </div>
        ) : (
          /* ESTADO: DESCONECTADO */
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-2 text-left">
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Sincronización en tiempo real</span>
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                Al conectar tu Google Calendar, cualquier parcial, clase o entrega que cargues en TABE se reflejará en Google Calendar en tu teléfono y computadora.
              </p>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                className="w-full h-10 px-5 rounded-lg font-medium text-xs sm:text-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors flex items-center justify-center gap-2.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>Conectar con Google Calendar</span>
              </button>
            </div>
          </div>
        )}

        {/* SECCIÓN COLAPSABLE: OPCIONES AVANZADAS */}
        <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 py-1 transition-colors"
          >
            <span>Otras opciones (Enlace iCal y archivo .ics)</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-3 animate-in fade-in duration-150">
              {/* Enlace iCal */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl space-y-1.5 text-left">
                <label className="text-xs font-medium text-zinc-800 dark:text-zinc-200 block">
                  Enlace de suscripción iCal de TABE
                </label>
                <p className="text-[11px] text-zinc-400">
                  Pega esta URL en Apple Calendar, Outlook o Google Calendar para suscribirte en modo lectura.
                </p>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={feedUrl || "Generando enlace..."}
                    className="flex-1 h-8 px-2.5 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono truncate focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyFeed}
                    disabled={!feedUrl}
                    className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-medium flex items-center gap-1.5 shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copiado" : "Copiar"}</span>
                  </button>
                </div>
              </div>

              {/* Importar ICS */}
              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl">
                <div>
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Importar archivo .ics</p>
                  <p className="text-[11px] text-zinc-400">Carga tus eventos descargados previamente.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenImport();
                  }}
                  className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-medium flex items-center gap-1.5 shrink-0"
                >
                  <Upload className="w-3.5 h-3.5 text-zinc-400" />
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
