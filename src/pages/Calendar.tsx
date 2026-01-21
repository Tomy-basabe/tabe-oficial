import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Trash2, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalendarEvents, CalendarEvent, EventType } from "@/hooks/useCalendarEvents";
import { useSubjects } from "@/hooks/useSubjects";
import { AddEventModal } from "@/components/calendar/AddEventModal";
import { generateGoogleCalendarUrl } from "@/lib/googleCalendarUrl";
import { toast } from "sonner";

const eventTypeColors: Record<EventType, string> = {
  P1: "bg-neon-cyan/20 border-neon-cyan text-neon-cyan",
  P2: "bg-neon-purple/20 border-neon-purple text-neon-purple",
  Global: "bg-neon-gold/20 border-neon-gold text-neon-gold",
  Recuperatorio: "bg-neon-red/20 border-neon-red text-neon-red",
  Final: "bg-neon-green/20 border-neon-green text-neon-green",
  Estudio: "bg-secondary border-muted-foreground text-muted-foreground",
};

const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function Calendar() {
  const { events, loading, createEvent, deleteEvent, getEventsForDate } = useCalendarEvents();
  const { rawSubjects } = useSubjects();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const handleAddEvent = (date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
    setShowAddModal(true);
  };

  const handleExportToGoogle = (event: CalendarEvent) => {
    const url = generateGoogleCalendarUrl({
      title: event.titulo,
      date: event.fecha,
      time: event.hora || undefined,
      description: event.notas || undefined,
    });
    window.open(url, "_blank");
    toast.success("Abriendo Google Calendar...");
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm("¿Eliminar este evento?")) {
      await deleteEvent(eventId);
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 lg:h-32" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getEventsForDate(date);
      const today = isToday(date);
      const selected = isSelected(date);

      days.push(
        <button
          key={day}
          onClick={() => {
            setSelectedDate(date);
            // If no events, open modal directly
            if (dayEvents.length === 0) {
              handleAddEvent(date);
            }
          }}
          onDoubleClick={() => handleAddEvent(date)}
          className={cn(
            "h-24 lg:h-32 p-2 border border-border rounded-lg transition-all text-left relative group",
            today && "border-primary",
            selected && "bg-primary/10 border-primary",
            !today && !selected && "hover:bg-secondary/50"
          )}
        >
          <span
            className={cn(
              "text-sm font-medium",
              today && "text-primary font-bold",
              !today && "text-foreground"
            )}
          >
            {day}
          </span>
          {today && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
          {/* Quick add button on hover */}
          {dayEvents.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddEvent(date);
              }}
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-primary/20 hover:bg-primary/40"
            >
              <Plus className="w-3 h-3 text-primary" />
            </button>
          )}
          <div className="mt-1 space-y-1 overflow-hidden">
            {dayEvents.slice(0, 2).map((event) => (
              <div
                key={event.id}
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded border truncate",
                  eventTypeColors[event.tipo_examen]
                )}
              >
                {event.titulo}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <p className="text-xs text-muted-foreground">+{dayEvents.length - 2} más</p>
            )}
          </div>
        </button>
      );
    }

    return days;
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text">
            Calendario Académico
          </h1>
          <p className="text-muted-foreground mt-1">
            Planifica y visualiza tus exámenes y sesiones de estudio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-secondary rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            Hoy
          </button>
          <button 
            onClick={() => handleAddEvent()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Evento
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3 card-gamer rounded-xl p-4 lg:p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-semibold text-xl">
              {months[month]} {year}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {daysOfWeek.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {renderCalendarDays()}
          </div>
        </div>

        {/* Sidebar - Selected Date Events */}
        <div className="card-gamer rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-sm">
              {selectedDate
                ? selectedDate.toLocaleDateString("es-AR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : "Selecciona un día"}
            </h3>
          </div>

          {selectedDate && selectedDateEvents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No hay eventos para este día</p>
              <button 
                onClick={() => handleAddEvent()}
                className="mt-4 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                Agregar evento
              </button>
            </div>
          )}

          {selectedDateEvents.length > 0 && (
            <div className="space-y-3">
              {selectedDateEvents.map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    "p-3 rounded-lg border relative group",
                    eventTypeColors[event.tipo_examen]
                  )}
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleExportToGoogle(event)}
                      className="p-1 rounded hover:bg-background/20"
                      title="Exportar a Google Calendar"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-1 rounded hover:bg-background/20"
                      title="Eliminar evento"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="font-medium text-sm pr-12">{event.titulo}</p>
                  {event.hora && (
                    <p className="text-xs opacity-80 mt-1">{event.hora}</p>
                  )}
                  {event.subject_nombre && (
                    <p className="text-xs opacity-80 mt-1">{event.subject_nombre}</p>
                  )}
                  {event.notas && (
                    <p className="text-xs opacity-70 mt-2 italic">{event.notas}</p>
                  )}
                </div>
              ))}
              <button 
                onClick={() => handleAddEvent()}
                className="w-full py-2 bg-secondary rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar otro
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="text-sm font-medium mb-3">Tipos de evento</h4>
            <div className="space-y-2">
              {Object.entries(eventTypeColors).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full border", colors)} />
                  <span className="text-xs text-muted-foreground">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <AddEventModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={createEvent}
        subjects={rawSubjects}
        initialDate={selectedDate || undefined}
      />
    </div>
  );
}
