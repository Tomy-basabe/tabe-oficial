import React, { useRef, useEffect } from "react";
import {
    format,
    startOfWeek,
    eachDayOfInterval,
    addDays,
    isSameDay
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarEvent, EventType } from "@/hooks/useCalendarEvents";

interface CalendarTimeGridViewProps {
    currentDate: Date;
    view: "day" | "week";
    events: CalendarEvent[];
    onDateClick: (date: Date, hour: number) => void;
    onEventClick: (event: CalendarEvent) => void;
    filters: Set<EventType>;
}

const hours = Array.from({ length: 24 }, (_, i) => i);

const eventTypeColors: Record<EventType, string> = {
    P1: "bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan active:bg-neon-cyan/30",
    P2: "bg-neon-purple/20 border-neon-purple/50 text-neon-purple active:bg-neon-purple/30",
    Global: "bg-neon-gold/20 border-neon-gold/50 text-neon-gold active:bg-neon-gold/30",
    Recuperatorio: "bg-neon-red/20 border-neon-red/50 text-neon-red active:bg-neon-red/30",
    Final: "bg-neon-green/20 border-neon-green/50 text-neon-green active:bg-neon-green/30",
    Estudio: "bg-secondary border-muted-foreground/30 text-muted-foreground active:bg-secondary/80",
};

export function CalendarTimeGridView({
    currentDate,
    view,
    events,
    onDateClick,
    onEventClick,
    filters
}: CalendarTimeGridViewProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to 8 AM by default
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 8 * 60; // 8 hours * 60px height
        }
    }, []);

    const days = view === "week"
        ? eachDayOfInterval({
            start: startOfWeek(currentDate, { weekStartsOn: 0 }),
            end: addDays(startOfWeek(currentDate, { weekStartsOn: 0 }), 6)
        })
        : [currentDate];

    const filteredEvents = events.filter(e => filters.has(e.tipo_examen));

    return (
        <div className="flex flex-col h-full bg-background/50 overflow-hidden">
            {/* Header with dates */}
            <div className="flex border-b border-border bg-card/20">
                <div className="w-16 flex-shrink-0" /> {/* Time column spacer */}
                <div className={cn(
                    "grid flex-1 divide-x divide-border",
                    view === "week" ? "grid-cols-7" : "grid-cols-1"
                )}>
                    {days.map((day) => (
                        <div key={day.toString()} className="py-3 text-center transition-colors">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                                {format(day, "eee", { locale: es })}
                            </div>
                            <div className={cn(
                                "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                                format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                                    ? "bg-primary text-primary-foreground font-black ring-4 ring-primary/20"
                                    : "text-foreground hover:text-primary"
                            )}>
                                {format(day, "d")}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="w-[17px] flex-shrink-0" /> {/* Scrollbar spacer */}
            </div>

            {/* Grid Body */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden relative select-none"
            >
                <div className="flex">
                    {/* Time Labels */}
                    <div className="w-16 flex-shrink-0 bg-background/40">
                        {hours.map((hour) => (
                            <div key={hour} className="h-[60px] pr-2 text-[10px] font-bold text-muted-foreground text-right -mt-2">
                                {hour}:00
                            </div>
                        ))}
                    </div>

                    {/* Time Grid Cells */}
                    <div className={cn(
                        "grid flex-1 divide-x divide-border relative bg-grid-pattern", // Custom pattern class
                        view === "week" ? "grid-cols-7" : "grid-cols-1"
                    )}>
                        {days.map((day) => (
                            <div key={day.toString()} className="relative h-[1440px] divide-y divide-border/20">
                                {hours.map((hour) => (
                                    <div
                                        key={hour}
                                        onClick={() => onDateClick(day, hour)}
                                        className="h-[60px] w-full hover:bg-primary/5 transition-colors cursor-pointer border-t first:border-t-0"
                                    />
                                ))}

                                {/* Events for this day */}
                                {filteredEvents
                                    .filter(e => isSameDay(new Date(e.fecha + "T12:00:00"), day))
                                    .map((event) => {
                                        if (!event.hora) return null; // All-day events handled differently (skipped in this simple grid for now)

                                        const [h, m] = event.hora.split(":").map(Number);
                                        const top = h * 60 + (m || 0);
                                        // Standard duration of 1 hour if not specified, or more if it's a "Final"
                                        const height = event.tipo_examen === "Final" ? 120 : 60;

                                        return (
                                            <div
                                                key={event.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEventClick(event);
                                                }}
                                                style={{
                                                    top: `${top}px`,
                                                    height: `${height}px`,
                                                }}
                                                className={cn(
                                                    "absolute left-1 right-1 px-2 py-1.5 rounded-lg border-l-4 shadow-xl z-10 text-xs font-bold transition-all hover:scale-[1.02] hover:z-20 cursor-pointer overflow-hidden",
                                                    eventTypeColors[event.tipo_examen]
                                                )}
                                            >
                                                <div className="flex flex-col h-full">
                                                    <span className="opacity-80 text-[10px]">{event.hora}</span>
                                                    <span className="truncate">{event.titulo}</span>
                                                    {event.subject_nombre && (
                                                        <span className="text-[9px] mt-0.5 opacity-60 truncate">
                                                            📚 {event.subject_nombre}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Current Time Indicator Line */}
                {days.some(day => isSameDay(day, new Date())) && (
                    <div
                        className="absolute left-16 right-0 border-t-2 border-primary z-30 pointer-events-none"
                        style={{
                            top: `${new Date().getHours() * 60 + new Date().getMinutes()}px`
                        }}
                    >
                        <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-primary" />
                    </div>
                )}
            </div>
        </div>
    );
}
