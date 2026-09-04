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
    P1: "text-black bg-[#00FF9D] border-2 border-foreground",
    P2: "text-black bg-[#00F0FF] border-2 border-foreground",
    Global: "text-black bg-[#FFD21C] border-2 border-foreground",
    "Recuperatorio P1": "text-black bg-[#FF3366] border-2 border-foreground",
    "Recuperatorio P2": "text-black bg-[#FF3366] border-2 border-foreground",
    "Recuperatorio Global": "text-black bg-[#FF3366] border-2 border-foreground",
    Final: "text-white bg-[#B000FF] border-2 border-foreground",
    Estudio: "text-black bg-[#4ECDC4] border-2 border-foreground",
    TP: "text-black bg-[#FF9F1C] border-2 border-foreground",
    Entrega: "text-white bg-[#FF007F] border-2 border-foreground",
    Clase: "text-black bg-[#3A86FF] border-2 border-foreground",
    Otro: "text-black bg-[#E5E5E5] border-2 border-foreground",
};

const getEventColor = (type: string) => eventTypeColors[type] || "text-black bg-[#E5E5E5] border-2 border-foreground";

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
            <DialogContent className="sm:max-w-[400px] bg-background border-4 border-foreground p-0 overflow-hidden rounded-xl shadow-[8px_8px_0_0_hsl(var(--foreground))]">
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <span className={cn(
                                "px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest",
                                getEventColor(event.tipo_examen)
                            )}>
                                {getEventLabel(event.tipo_examen)}
                            </span>
                            <DialogTitle className="text-2xl font-display font-black uppercase tracking-tight text-foreground pt-2 leading-tight">
                                {event.titulo}
                            </DialogTitle>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 border-[3px] border-transparent hover:border-foreground rounded-lg hover:bg-[#FFD21C] transition-all text-foreground hover:shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] active:translate-y-0 active:shadow-none"
                        >
                            <X className="w-5 h-5 font-bold" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Date & Time */}
                        <div className="flex items-center gap-4 text-foreground">
                            <div className="w-12 h-12 rounded-xl bg-[#4ECDC4] border-[3px] border-foreground shadow-[4px_4px_0_0_#000] flex items-center justify-center">
                                <CalendarIcon className="w-6 h-6 text-black" />
                            </div>
                            <div>
                                <p className="text-sm font-black uppercase tracking-widest text-foreground">
                                    {format(eventDate, "EEEE, d 'de' MMMM", { locale: es })}
                                </p>
                                <p className="text-xs font-bold text-muted-foreground uppercase">
                                    {event.hora ? `De ${event.hora} a ${event.hora_fin || '...'}` : "Todo el día"}
                                </p>
                            </div>
                        </div>

                        {/* Subject */}
                        {event.subject_nombre && (
                            <div className="flex items-center gap-4 text-foreground">
                                <div className="w-12 h-12 rounded-xl bg-[#FFE66D] border-[3px] border-foreground shadow-[4px_4px_0_0_#000] flex items-center justify-center">
                                    <BookOpen className="w-6 h-6 text-black" />
                                </div>
                                <div>
                                    <p className="text-sm font-black uppercase tracking-widest text-foreground">
                                        {event.subject_nombre}
                                    </p>
                                    <p className="text-xs font-bold text-muted-foreground uppercase">Materia asociada</p>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {event.notas && (
                            <div className="flex items-start gap-4 text-foreground">
                                <div className="w-12 h-12 rounded-xl bg-[#00F0FF] border-[3px] border-foreground shadow-[4px_4px_0_0_#000] flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-6 h-6 text-black" />
                                </div>
                                <div className="bg-white p-4 rounded-xl flex-1 border-[3px] border-foreground shadow-[4px_4px_0_0_#000] text-black">
                                    <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-80">Notas</p>
                                    <p className="text-sm font-bold whitespace-pre-wrap leading-relaxed">
                                        {event.notas}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t-4 border-foreground">
                        <button
                            onClick={handleExportToGoogle}
                            className="flex-1 py-3 px-4 rounded-lg text-sm font-black uppercase tracking-widest bg-[#4285F4] text-white border-[3px] border-foreground hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0_0_#000]"
                        >
                            <ExternalLink className="w-5 h-5" />
                            Google
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-5 py-3 rounded-lg text-sm font-black uppercase tracking-widest bg-[#FF3366] text-black border-[3px] border-foreground hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0_0_#000]"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
