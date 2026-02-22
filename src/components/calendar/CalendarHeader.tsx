import React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

type ViewType = "day" | "week" | "month";

interface CalendarHeaderProps {
    currentDate: Date;
    view: ViewType;
    setView: (view: ViewType) => void;
    onNavigate: (direction: "prev" | "next" | "today") => void;
}

export function CalendarHeader({ currentDate, view, setView, onNavigate }: CalendarHeaderProps) {
    const getHeaderTitle = () => {
        if (view === "month") {
            return format(currentDate, "MMMM yyyy", { locale: es });
        }
        if (view === "week") {
            // Show month range if week spans two months
            return format(currentDate, "MMMM yyyy", { locale: es });
        }
        return format(currentDate, "d 'de' MMMM, yyyy", { locale: es });
    };

    return (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 py-4 px-6 border-b border-border bg-card/30 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text capitalize">
                    {getHeaderTitle()}
                </h1>
                <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg ml-2">
                    <button
                        onClick={() => onNavigate("prev")}
                        className="p-1.5 rounded-md hover:bg-background/80 transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onNavigate("today")}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md hover:bg-background/80 transition-colors"
                    >
                        Hoy
                    </button>
                    <button
                        onClick={() => onNavigate("next")}
                        className="p-1.5 rounded-md hover:bg-background/80 transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex bg-secondary/50 p-1 rounded-lg">
                    {(["day", "week", "month"] as ViewType[]).map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-xs font-semibold transition-all capitalize",
                                view === v
                                    ? "bg-background shadow-lg text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {v === "day" ? "Día" : v === "week" ? "Semana" : "Mes"}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
