import React from "react";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarEvent, EventType } from "@/hooks/useCalendarEvents";

interface CalendarMonthViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    onDateClick: (date: Date) => void;
    onEventClick: (event: CalendarEvent) => void;
    filters: Set<EventType>;
}

const eventTypeColors: Record<EventType, string> = {
    P1: "bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan",
    P2: "bg-neon-purple/20 border-neon-purple/50 text-neon-purple",
    Global: "bg-neon-gold/20 border-neon-gold/50 text-neon-gold",
    Recuperatorio: "bg-neon-red/20 border-neon-red/50 text-neon-red",
    Final: "bg-neon-green/20 border-neon-green/50 text-neon-green",
    Estudio: "bg-secondary border-muted-foreground/30 text-muted-foreground",
};

const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function CalendarMonthView({
    currentDate,
    events,
    onDateClick,
    onEventClick,
    filters
}: CalendarMonthViewProps) {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });

    const days = eachDayOfInterval({ start, end });

    const filteredEvents = events.filter(e => filters.has(e.tipo_examen));

    return (
        <div className="flex flex-col h-full bg-background/50">
            {/* Week Day headers */}
            <div className="grid grid-cols-7 border-b border-border bg-card/20 py-2">
                {daysOfWeek.map((day) => (
                    <div key={day} className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-x divide-y divide-border border-b border-r border-border min-h-[600px]">
                {days.map((day, idx) => {
                    const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.fecha + "T12:00:00"), day));
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isTodayDay = isToday(day);

                    return (
                        <div
                            key={day.toString()}
                            onClick={() => onDateClick(day)}
                            className={cn(
                                "min-h-[120px] p-2 flex flex-col gap-1 transition-all group overflow-hidden cursor-pointer",
                                !isCurrentMonth ? "bg-muted/5 opacity-40 select-none pointer-events-none" : "hover:bg-primary/5",
                                isTodayDay && "bg-primary/5 shadow-inner"
                            )}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className={cn(
                                    "text-sm font-semibold flex items-center justify-center w-7 h-7 rounded-full",
                                    isTodayDay ? "bg-primary text-primary-foreground font-black ring-4 ring-primary/20" : "text-foreground/80 group-hover:text-primary transition-colors"
                                )}>
                                    {format(day, "d")}
                                </span>
                            </div>

                            {/* Event Container */}
                            <div className="flex flex-col gap-1.5 overflow-y-auto scrollbar-none pr-1">
                                {dayEvents.map((event) => (
                                    <button
                                        key={event.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEventClick(event);
                                        }}
                                        className={cn(
                                            "text-[11px] px-2 py-1 rounded-md border text-left font-semibold truncate transition-all hover:scale-[1.03] active:scale-[0.98] shadow-sm",
                                            eventTypeColors[event.tipo_examen]
                                        )}
                                    >
                                        {event.hora && <span className="mr-1 opacity-70">{event.hora}</span>}
                                        {event.titulo}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
