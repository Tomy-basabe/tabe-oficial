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
    X
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarEvent, EventType } from "@/hooks/useCalendarEvents";
import { cn } from "@/lib/utils";
import { generateGoogleCalendarUrl } from "@/lib/googleCalendarUrl";
import { toast } from "sonner";

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

const getEventLabel = (type: string) => type.startsWith("P") && !["P1", "P2"].includes(type) ? `Parcial ${type.replace("P", "")}` : (eventTypeLabels[type] || type);

const eventTypeColors: Record<string, string> = {
    P1: "text-neon-cyan bg-neon-cyan/10",
    P2: "text-neon-purple bg-neon-purple/10",
    Global: "text-neon-gold bg-neon-gold/10",
    "Recuperatorio P1": "text-red-400 bg-red-500/10",
    "Recuperatorio P2": "text-red-400 bg-red-500/10",
    "Recuperatorio Global": "text-red-400 bg-red-500/10",
    Final: "text-neon-green bg-neon-green/10",
    Estudio: "text-muted-foreground bg-muted",
    TP: "text-orange-400 bg-orange-500/10",
    Entrega: "text-pink-400 bg-pink-500/10",
    Clase: "text-blue-400 bg-blue-500/10",
    Otro: "text-gray-400 bg-gray-500/10",
};

const getEventColor = (type: string) => eventTypeColors[type] || "text-indigo-400 bg-indigo-500/10";

export function EventDetailsModal({ event, open, onClose, onDelete }: EventDetailsModalProps) {
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
        if (confirm("¿Estás seguro de eliminar este evento?")) {
            await onDelete(event.id);
            onClose();
        }
    };

    const eventDate = new Date(event.fecha + "T12:00:00");

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-[400px] bg-card/95 backdrop-blur-xl border-border/50 p-0 overflow-hidden rounded-3xl shadow-2xl">
                {/* Header Color Bar */}
                <div className={cn("h-4 w-full", getEventColor(event.tipo_examen).split(' ')[1])} />

                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <span className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                getEventColor(event.tipo_examen)
                            )}>
                                {getEventLabel(event.tipo_examen)}
                            </span>
                            <DialogTitle className="text-2xl font-display font-bold text-foreground pt-2 leading-tight">
                                {event.titulo}
                            </DialogTitle>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Date & Time */}
                        <div className="flex items-center gap-4 text-muted-foreground">
                            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                                <CalendarIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground capitalize">
                                    {format(eventDate, "EEEE, d 'de' MMMM", { locale: es })}
                                </p>
                                <p className="text-xs">
                                    {event.hora ? `De ${event.hora} a ${event.hora_fin || '...'}` : "Todo el día"}
                                </p>
                            </div>
                        </div>

                        {/* Subject */}
                        {event.subject_nombre && (
                            <div className="flex items-center gap-4 text-muted-foreground">
                                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-neon-cyan" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">
                                        {event.subject_nombre}
                                    </p>
                                    <p className="text-xs">Materia asociada</p>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {event.notas && (
                            <div className="flex items-start gap-4 text-muted-foreground">
                                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-5 h-5 text-neon-purple" />
                                </div>
                                <div className="bg-secondary/30 p-3 rounded-xl flex-1 border border-border/50">
                                    <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-60">Notas</p>
                                    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                        {event.notas}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-border/50">
                        <button
                            onClick={handleExportToGoogle}
                            className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-[#4285F4] text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Google
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-4 py-3 rounded-xl text-sm font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 border border-red-500/20"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
