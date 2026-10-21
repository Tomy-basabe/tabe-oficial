import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { purgeEventsByTitle, isGoogleCalendarConnected } from "@/lib/googleCalendarSync";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/contexts/ConfirmModalContext";

interface PurgeEventsModalProps {
  open: boolean;
  onClose: () => void;
  events?: CalendarEvent[];
  onPurged?: () => Promise<void>;
}

export function PurgeEventsModal({
  open,
  onClose,
  events = [],
  onPurged,
}: PurgeEventsModalProps) {
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const [targetText, setTargetText] = useState("gisela fabrega");
  const [deleteFromGoogle, setDeleteFromGoogle] = useState(true);
  const [isPurging, setIsPurging] = useState(false);

  const norm = (s: string) =>
    (s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const matchingEvents = useMemo(() => {
    if (!targetText.trim()) return [];
    const t = norm(targetText);
    return events.filter((e) => norm(e.titulo).includes(t));
  }, [events, targetText]);

  const handleExecutePurge = async () => {
    if (!user) {
      toast.error("Debes iniciar sesión");
      return;
    }
    if (!targetText.trim()) {
      toast.error("Ingresa el nombre del evento a purgar");
      return;
    }

    const ok = await confirm({
      title: "¿Confirmar purga de eventos?",
      description: `¿Deseas eliminar TODOS los eventos que contengan "${targetText.trim()}"? (${matchingEvents.length} encontrados). Esta acción no se puede deshacer.`,
      confirmText: "Purgar eventos",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;

    setIsPurging(true);
    toast.info(`Iniciando purga de "${targetText.trim()}"...`, { icon: "🧹" });

    try {
      const res = await purgeEventsByTitle(user.id, targetText.trim(), deleteFromGoogle);

      if (res.deletedCount === 0) {
        toast.info(`No se encontraron eventos con el nombre "${targetText.trim()}"`);
      } else {
        toast.success(
          `Purga completada: ${res.deletedCount} eliminados${
            res.googleDeletedCount > 0 ? ` y ${res.googleDeletedCount} en Google Calendar` : ""
          }.`,
          { icon: "✨", duration: 5000 }
        );
      }

      if (onPurged) {
        await onPurged();
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tabe_calendar_synced", { detail: { source: "purge" } }));
      }

      onClose();
    } catch (err: any) {
      console.error("Error al purgar eventos:", err);
      toast.error(err?.message || "Error al purgar eventos");
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md w-[95vw] bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-2xl p-6 space-y-4">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 text-rose-500" />
            </div>
            <span>Limpieza masiva de eventos</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            Busca y elimina en lote eventos que coincidan con un texto en TABE y Google Calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Texto del evento a eliminar:
            </label>
            <input
              type="text"
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              placeholder="Ej: gisela fabrega"
              className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-zinc-500">Eventos detectados:</span>
              <span className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium border",
                matchingEvents.length > 0
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  : "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700"
              )}>
                {matchingEvents.length} en tu calendario
              </span>
            </div>

            {matchingEvents.length > 0 ? (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 pt-1">
                {matchingEvents.slice(0, 8).map((ev) => (
                  <div
                    key={ev.id}
                    className="text-xs p-1.5 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between"
                  >
                    <span className="truncate max-w-[220px] text-zinc-800 dark:text-zinc-200">{ev.titulo}</span>
                    <span className="text-zinc-400 text-[11px] shrink-0">
                      {ev.fecha}
                    </span>
                  </div>
                ))}
                {matchingEvents.length > 8 && (
                  <p className="text-[10px] text-center text-zinc-400 pt-1">
                    ... y {matchingEvents.length - 8} eventos más
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic py-1">
                No hay eventos cargados que coincidan con "{targetText}".
              </p>
            )}
          </div>

          {isGoogleCalendarConnected(user) && (
            <label className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteFromGoogle}
                onChange={(e) => setDeleteFromGoogle(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-0"
              />
              <span>Borrar también de Google Calendar si están vinculados</span>
            </label>
          )}

          <div className="p-2.5 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-600 dark:text-rose-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>Esta acción borrará de forma permanente todos los eventos coincidentes.</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isPurging}
            className="flex-1 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExecutePurge}
            disabled={isPurging || !targetText.trim()}
            className="flex-[1.5] h-9 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            {isPurging ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Purgando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purgar {matchingEvents.length > 0 ? `(${matchingEvents.length})` : ""}</span>
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
