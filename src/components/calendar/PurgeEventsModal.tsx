import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trash2, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { purgeEventsByTitle, isGoogleCalendarConnected } from "@/lib/googleCalendarSync";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const { user } = useAuth();
  const [targetText, setTargetText] = useState("gisela fabrega");
  const [deleteFromGoogle, setDeleteFromGoogle] = useState(true);
  const [isPurging, setIsPurging] = useState(false);

  // Normalizar texto para ignorar acentos y mayusculas
  const norm = (s: string) =>
    (s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  // Cantidad de coincidencias en la lista de eventos en memoria
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

    const confirmMsg = `¿Deseas eliminar TODOS los eventos que contengan "${targetText.trim()}"? (${matchingEvents.length} encontrados)`;
    if (!confirm(confirmMsg)) {
      return;
    }

    setIsPurging(true);
    toast.info(`Iniciando purga de "${targetText.trim()}"...`, { icon: "🧹" });

    try {
      const res = await purgeEventsByTitle(user.id, targetText.trim(), deleteFromGoogle);

      if (res.deletedCount === 0) {
        toast.info(`No se encontraron eventos con el nombre "${targetText.trim()}"`);
      } else {
        toast.success(
          `¡Purga completada! Se eliminaron ${res.deletedCount} eventos${
            res.googleDeletedCount > 0 ? ` y ${res.googleDeletedCount} en Google Calendar` : ""
          }.`,
          { icon: "✨", duration: 6000 }
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px] border-4 border-foreground shadow-[8px_8px_0_0_#000] p-6 max-h-[90vh] flex flex-col bg-card">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-red-500 text-white border border-black tracking-wider">
              Comando Secreto [Ctrl + Shift + Ñ]
            </span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-[#FFE66D] text-black border border-black tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Admin Purge
            </span>
          </div>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            Purga Masiva de Eventos
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-muted-foreground">
            Elimina en lote todos los eventos repetitivos que coincidan con el nombre especificado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-foreground">
              Nombre o texto del evento a eliminar:
            </label>
            <input
              type="text"
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              placeholder="Ej: gisela fabrega"
              className="w-full px-3.5 py-2.5 bg-background text-foreground border-[3px] border-foreground rounded-lg text-sm font-bold focus:outline-none focus:shadow-[4px_4px_0_0_hsl(var(--foreground))]"
            />
          </div>

          <div className="p-3.5 bg-muted/40 border-2 border-foreground/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="uppercase tracking-wider">Eventos detectados:</span>
              <span className={cn(
                "px-2 py-0.5 rounded font-mono text-xs border",
                matchingEvents.length > 0
                  ? "bg-red-500 text-white border-black font-black"
                  : "bg-muted text-muted-foreground border-foreground/20"
              )}>
                {matchingEvents.length} en tu calendario
              </span>
            </div>

            {matchingEvents.length > 0 ? (
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 pt-1">
                {matchingEvents.slice(0, 8).map((ev) => (
                  <div
                    key={ev.id}
                    className="text-[11px] font-bold p-1.5 rounded bg-background border border-foreground/20 flex items-center justify-between"
                  >
                    <span className="truncate max-w-[240px]">{ev.titulo}</span>
                    <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                      {ev.fecha} {ev.hora ? `(${ev.hora})` : ""}
                    </span>
                  </div>
                ))}
                {matchingEvents.length > 8 && (
                  <p className="text-[10px] text-center font-bold text-muted-foreground pt-1">
                    ... y {matchingEvents.length - 8} eventos más
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-muted-foreground italic py-1">
                No hay eventos cargados en vista que coincidan con "{targetText}".
              </p>
            )}
          </div>

          {isGoogleCalendarConnected(user) && (
            <label className="flex items-center gap-2.5 p-2.5 bg-[#00F0FF]/10 border-2 border-foreground rounded-lg text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={deleteFromGoogle}
                onChange={(e) => setDeleteFromGoogle(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-foreground accent-black"
              />
              <span>Borrar también de Google Calendar si están vinculados</span>
            </label>
          )}

          <div className="p-3 bg-red-500/10 border-2 border-red-500 rounded-lg flex items-start gap-2 text-red-600 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <p>
              Esta acción borrará de forma permanente todos los eventos con este nombre.
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t-2 border-foreground/15">
          <button
            type="button"
            onClick={onClose}
            disabled={isPurging}
            className="flex-1 py-2.5 px-4 rounded-lg font-black uppercase tracking-wider text-xs bg-muted text-foreground border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:bg-muted/80 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExecutePurge}
            disabled={isPurging || !targetText.trim()}
            className="flex-[2] py-2.5 px-4 rounded-lg font-black uppercase tracking-wider text-xs bg-red-600 text-white border-2 border-foreground shadow-[3px_3px_0_0_#000] hover:bg-red-700 active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isPurging ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Purgando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Purgar {matchingEvents.length > 0 ? `(${matchingEvents.length})` : ""} Eventos</span>
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
