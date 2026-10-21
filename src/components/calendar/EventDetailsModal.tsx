import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  Trash2,
  ExternalLink,
  MapPin,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { cn } from "@/lib/utils";
import { generateGoogleCalendarUrl } from "@/lib/googleCalendarUrl";
import { toast } from "sonner";
import { cleanDisplayNotes } from "@/lib/googleCalendarSync";
import { useConfirm } from "@/contexts/ConfirmModalContext";
import { eventTypeColors, eventTypeDots } from "@/pages/Calendar";

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

const eventTypeLabels: Record<string, string> = {
  P1: "Parcial 1",
  P2: "Parcial 2",
  Global: "Global",
  "Recuperatorio P1": "Recuperatorio P1",
  "Recuperatorio P2": "Recuperatorio P2",
  "Recuperatorio Global": "Recuperatorio Global",
  Final: "Final",
  Estudio: "Sesión de Estudio",
  TP: "Trabajo Práctico",
  Entrega: "Entrega",
  Clase: "Clase",
  Otro: "Otro",
};

const getEventLabel = (type: string) =>
  type.startsWith("P") && !["P1", "P2"].includes(type)
    ? `Parcial ${type.replace("P", "")}`
    : (eventTypeLabels[type] || type);

export function EventDetailsModal({ event, open, onClose, onDelete }: EventDetailsModalProps) {
  const { confirm } = useConfirm();
  if (!event) return null;

  const handleExportToGoogle = () => {
    const url = generateGoogleCalendarUrl({
      title: event.titulo,
      date: event.fecha,
      time: event.hora || undefined,
      description: event.notas || undefined,
    });
    window.open(url, "_blank");
    toast.success("Abriendo Google Calendar...");
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "¿Eliminar evento?",
      description: `¿Estás seguro de eliminar el evento "${event.titulo}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (ok) {
      await onDelete(event.id);
      onClose();
    }
  };

  const eventDate = new Date(event.fecha + "T12:00:00");
  const displayNotes = cleanDisplayNotes(event.notas);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md w-[95vw] bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-2xl p-6 space-y-4">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                eventTypeColors[event.tipo_examen] || "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", eventTypeDots[event.tipo_examen] || "bg-zinc-400")} />
              <span>{getEventLabel(event.tipo_examen)}</span>
            </span>
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug">
            {event.titulo}
          </DialogTitle>
          <DialogDescription className="sr-only">Detalles del evento de calendario</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1 text-xs">
          {/* Fecha y Hora */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-800 dark:text-zinc-200 capitalize">
                {format(eventDate, "EEEE, d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                <span>{event.is_all_day ? "Todo el día" : event.hora ? `${event.hora} hs` : "Sin horario especificado"}</span>
              </p>
            </div>
          </div>

          {/* Materia */}
          {event.subject_nombre && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-800 dark:text-zinc-200">{event.subject_nombre}</p>
                <p className="text-[11px] text-zinc-400">Materia académica vinculada</p>
              </div>
            </div>
          )}

          {/* Ubicación */}
          {event.ubicacion && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-800 dark:text-zinc-200">{event.ubicacion}</p>
                <p className="text-[11px] text-zinc-400">Ubicación / Modalidad</p>
              </div>
            </div>
          )}

          {/* Notas */}
          {displayNotes && (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/70 space-y-1">
              <p className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                <span>Notas</span>
              </p>
              <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {displayNotes}
              </p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={handleExportToGoogle}
            className="flex-1 h-9 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            <span>Abrir en Google</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-9 px-3 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center justify-center"
            title="Eliminar evento"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
