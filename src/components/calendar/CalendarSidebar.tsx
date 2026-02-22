import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Check, Filter } from "lucide-react";
import { EventType } from "@/hooks/useCalendarEvents";
import { cn } from "@/lib/utils";

interface CalendarSidebarProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    onAddEvent: () => void;
    onSyncGoogle: () => void;
    onImportICS: () => void;
    filters: Set<EventType>;
    toggleFilter: (type: EventType) => void;
}

const eventTypes: { type: EventType; label: string; color: string }[] = [
    { type: "P1", label: "Parcial 1", color: "#00d9ff" },
    { type: "P2", label: "Parcial 2", color: "#a855f7" },
    { type: "Global", label: "Global", color: "#fbbf24" },
    { type: "Recuperatorio", label: "Recuperatorio", color: "#ef4444" },
    { type: "Final", label: "Final", color: "#22c55e" },
    { type: "Estudio", label: "Sesión de Estudio", color: "#6b7280" },
];

export function CalendarSidebar({
    selectedDate,
    onDateChange,
    onAddEvent,
    onSyncGoogle,
    onImportICS,
    filters,
    toggleFilter,
}: CalendarSidebarProps) {
    return (
        <div className="w-full lg:w-72 border-r border-border h-full bg-card/20 backdrop-blur-md overflow-y-auto hidden lg:flex flex-col p-4 space-y-6">
            {/* Create Button */}
            <button
                onClick={onAddEvent}
                className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-bold mb-2"
            >
                <Plus className="w-5 h-5" />
                Crear Evento
            </button>

            {/* Mini Calendar */}
            <div className="card-gamer p-1 rounded-2xl overflow-hidden border-none shadow-none">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && onDateChange(date)}
                    className="p-3"
                    classNames={{
                        day_selected: "bg-primary text-primary-foreground font-bold rounded-lg shadow-lg shadow-primary/50",
                        day_today: "text-primary border border-primary/30 rounded-lg",
                        day: "hover:bg-primary/20 hover:text-primary transition-all rounded-lg",
                    }}
                />
            </div>

            {/* Filters */}
            <div className="space-y-4 px-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                    <Filter className="w-4 h-4" />
                    Filtros
                </h3>
                <div className="space-y-2">
                    {eventTypes.map((et) => (
                        <button
                            key={et.type}
                            onClick={() => toggleFilter(et.type)}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-all group"
                        >
                            <div
                                className={cn(
                                    "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                                    filters.has(et.type)
                                        ? "bg-current border-transparent"
                                        : "border-muted-foreground/30 bg-transparent"
                                )}
                                style={{ color: et.color }}
                            >
                                {filters.has(et.type) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={cn(
                                "text-sm font-medium transition-colors",
                                filters.has(et.type) ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {et.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-auto pt-6 border-t border-border space-y-3">
                <button
                    onClick={onSyncGoogle}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 border border-neon-cyan/20 hover:from-neon-cyan/20 hover:to-neon-purple/20 transition-all text-neon-cyan"
                >
                    Google Calendar
                </button>
                <button
                    onClick={onImportICS}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 transition-all text-muted-foreground"
                >
                    Importar .ICS
                </button>
            </div>
        </div>
    );
}
