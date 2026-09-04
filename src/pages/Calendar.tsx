import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Trash2, Loader2, ExternalLink, Upload, Link2, Copy, Repeat, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalendarEvents, CalendarEvent, EventType, CreateEventData } from "@/hooks/useCalendarEvents";
import { useSubjects } from "@/hooks/useSubjects";
import { AddEventModal } from "@/components/calendar/AddEventModal";
import { ImportICSModal } from "@/components/calendar/ImportICSModal";
import { GoogleCalendarSyncModal } from "@/components/calendar/GoogleCalendarSyncModal";
import { ExamsListModal } from "@/components/calendar/ExamsListModal";
import { generateGoogleCalendarUrl } from "@/lib/googleCalendarUrl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const eventTypeColors: Record<EventType, string> = {
  P1: "bg-[#00FF9D] border-foreground text-black font-black",
  P2: "bg-[#00F0FF] border-foreground text-black font-black",
  Global: "bg-[#FFD21C] border-foreground text-black font-black",
  "Recuperatorio P1": "bg-[#FF3366] border-foreground text-black font-black",
  "Recuperatorio P2": "bg-[#FF3366] border-foreground text-black font-black",
  "Recuperatorio Global": "bg-[#FF3366] border-foreground text-black font-black",
  Final: "bg-[#B000FF] border-foreground text-white font-black",
  Estudio: "bg-muted border-foreground text-foreground font-black",
  TP: "bg-[#FF9900] border-foreground text-black font-black",
  Entrega: "bg-[#FF66B2] border-foreground text-black font-black",
  Clase: "bg-[#4299e1] border-foreground text-black font-black",
  Otro: "bg-gray-400 border-foreground text-black font-black",
};

const recurrenceLabels: Record<string, string> = {
  DAILY: "Diario",
  WEEKLY: "Semanal",
  MONTHLY: "Mensual",
  YEARLY: "Anual",
};

const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function Calendar() {
  const { events, loading, createEvent, updateEvent, deleteEvent, duplicateEvent, getEventsForDate } = useCalendarEvents();
  const { rawSubjects } = useSubjects();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showExamsModal, setShowExamsModal] = useState(false);
  const [monthTransition, setMonthTransition] = useState<"enter" | "exit" | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const changeMonth = (direction: number) => {
    setMonthTransition("exit");
    setTimeout(() => {
      setCurrentDate(new Date(year, month + direction, 1));
      setMonthTransition("enter");
      setTimeout(() => setMonthTransition(null), 300);
    }, 150);
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
    setEventToEdit(null);
    setShowAddModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEventToEdit(event);
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
    const event = events.find(e => e.id === eventId);
    const isRecurring = event?.recurrence_rule || event?.isVirtual;

    const message = isRecurring
      ? "Este es un evento recurrente. ¿Eliminar TODAS las repeticiones?"
      : "¿Eliminar este evento?";

    if (confirm(message)) {
      await deleteEvent(eventId);
    }
  };

  const handleDuplicateEvent = async (event: CalendarEvent) => {
    await duplicateEvent(event);
  };

  const renderCalendarDays = () => {
    const days = [];

    // Empty cells
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 lg:h-32" />);
    }

    // Days
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
            if (dayEvents.length === 0) {
              handleAddEvent(date);
            }
          }}
          onDoubleClick={() => handleAddEvent(date)}
          className={cn(
            "min-h-[80px] h-auto lg:h-32 p-1 lg:p-2 border-[3px] rounded-xl text-left relative group",
            "transition-all duration-200 ease-out flex flex-col",
            "hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] dark:hover:shadow-[4px_4px_0_0_#fff] active:translate-y-0 active:shadow-none",
            today ? "border-foreground bg-[#ffd21c] shadow-[4px_4px_0_0_hsl(var(--foreground))]" : "border-transparent hover:border-foreground bg-card hover:bg-card/90",
            selected && !today && "border-foreground bg-foreground/5 shadow-[4px_4px_0_0_hsl(var(--foreground))]",
          )}
          style={{ animationDelay: `${day * 15}ms` }}
        >
          <span
            className={cn(
              "text-xs lg:text-sm font-black inline-flex items-center justify-center w-6 h-6 rounded-md transition-all duration-200 border-2",
              today ? "bg-foreground text-background border-transparent" : "bg-transparent border-transparent group-hover:border-foreground group-hover:bg-foreground group-hover:text-background"
            )}
          >
            {day}
          </span>
          
          {/* Quick add on hover */}
          {dayEvents.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddEvent(date);
              }}
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 rounded-md bg-foreground text-background hover:scale-110 shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
          <div className="mt-1 space-y-1 overflow-hidden flex-1">
            {dayEvents.slice(0, 2).map((event, idx) => (
              <div
                key={event.id}
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-1 lg:px-1.5 py-0.5 rounded-sm border-2 truncate flex items-center gap-1",
                  "transition-all duration-200 hover:scale-[1.02]",
                  !event.color && eventTypeColors[event.tipo_examen]
                )}
                style={event.color ? { backgroundColor: `${event.color}`, borderColor: 'var(--foreground)', color: '#000' } : undefined}
              >
                {event.recurrence_rule && <Repeat className="w-2.5 h-2.5 flex-shrink-0 hidden sm:block" />}
                <span className="truncate">{event.titulo}</span>
              </div>
            ))}
            {dayEvents.length > 2 && (
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground/70">+{dayEvents.length - 2} más</p>
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
          <Loader2 className="w-12 h-12 animate-spin text-foreground" />
          <p className="text-foreground font-black uppercase tracking-widest">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tabe-page p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-[#FF6B6B] border-4 border-foreground p-6 rounded-xl shadow-[8px_8px_0_0_hsl(var(--foreground))]">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-black uppercase tracking-tight text-black flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 lg:w-10 lg:h-10" />
            Calendario Académico
          </h1>
          <p className="text-black font-bold uppercase tracking-wider text-sm mt-2 flex items-center gap-2">
            PLANIFICÁ Y VISUALIZÁ TUS EXÁMENES Y SESIONES DE ESTUDIO
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={goToToday} className="px-4 py-2 bg-white text-black border-[3px] border-black rounded-lg font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all">
            Hoy
          </button>
          <button
            onClick={() => setShowExamsModal(true)}
            className="px-4 py-2 bg-[#FF3366] text-black border-[3px] border-black rounded-lg font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center gap-2"
          >
            <GraduationCap className="w-5 h-5" />
            Exámenes
          </button>
          <button
            onClick={() => setShowSyncModal(true)}
            className="px-4 py-2 bg-[#00F0FF] text-black border-[3px] border-black rounded-lg font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center gap-2"
          >
            <Link2 className="w-5 h-5" />
            Sincronizar
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-[#FFE66D] text-black border-[3px] border-black rounded-lg font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Importar
          </button>
          <button
            onClick={() => handleAddEvent()}
            className="px-4 py-2 bg-[#00FF9D] text-black border-[3px] border-black rounded-lg font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Evento
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3 bg-card border-[3px] border-foreground rounded-xl p-3 lg:p-6 shadow-[4px_4px_0_0_hsl(var(--foreground))] overflow-hidden">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h2 className="font-display font-black text-2xl uppercase tracking-widest">
              {months[month]} {year}
            </h2>
            <div className="flex items-center gap-3">
              <button
                className="p-2 bg-muted text-foreground border-[3px] border-foreground rounded-lg shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] active:translate-y-[2px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all"
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                className="p-2 bg-muted text-foreground border-[3px] border-foreground rounded-lg shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] active:translate-y-[2px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all"
                onClick={() => changeMonth(1)}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-2">
            {daysOfWeek.map((day) => (
              <div key={day} className="text-center text-xs lg:text-sm font-black uppercase tracking-widest text-foreground py-1 lg:py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div
            className={cn(
              "grid grid-cols-7 gap-1 lg:gap-2 transition-all duration-300",
              monthTransition === "exit" && "opacity-0 translate-y-2",
              monthTransition === "enter" && "opacity-100 translate-y-0 animate-in fade-in slide-in-from-bottom-2",
              monthTransition === null && "opacity-100"
            )}
          >
            {renderCalendarDays()}
          </div>
        </div>

        {/* Sidebar - Selected Date Events */}
        <div className="bg-card border-[3px] border-foreground rounded-xl p-5 shadow-[4px_4px_0_0_hsl(var(--foreground))] h-fit sticky top-24 tour-calendar-schedule">
          <div className="flex items-center gap-2 mb-6">
            <CalendarIcon className="w-6 h-6 text-foreground" />
            <h3 className="font-display font-black text-lg uppercase tracking-widest leading-none mt-1">
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
            <div className="text-center py-8 text-foreground border-4 border-dashed border-foreground/30 rounded-xl bg-muted/50">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-black uppercase tracking-widest">Día libre</p>
              <button
                onClick={() => handleAddEvent()}
                className="mt-6 px-4 py-2 bg-[#4ECDC4] text-black border-[3px] border-black rounded-lg font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all"
              >
                Agregar evento
              </button>
            </div>
          )}

          {selectedDateEvents.length > 0 && (
            <div className="space-y-4">
              {selectedDateEvents.map((event, idx) => (
                <div
                  key={event.id}
                  className={cn(
                    "p-4 rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] relative transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))]",
                    !event.color && eventTypeColors[event.tipo_examen]
                  )}
                  style={{
                    animationDelay: `${idx * 50}ms`,
                    ...(event.color ? { backgroundColor: `${event.color}`, color: '#000' } : {})
                  }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-black text-base flex items-center gap-2 uppercase tracking-wide leading-tight">
                      {event.recurrence_rule && (
                        <Repeat className="w-4 h-4 opacity-60 flex-shrink-0" />
                      )}
                      {event.titulo}
                    </p>
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="p-1.5 rounded-lg border-2 border-transparent hover:border-current opacity-70 hover:opacity-100 transition-all flex-shrink-0"
                      title="Editar evento"
                    >
                      ✏️
                    </button>
                  </div>

                  {event.is_all_day ? (
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-2 flex items-center gap-1 bg-background/20 w-fit px-2 py-0.5 rounded-sm">✨ Todo el día</p>
                  ) : event.hora && (
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-2 flex items-center gap-1 bg-background/20 w-fit px-2 py-0.5 rounded-sm">🕒 {event.hora}</p>
                  )}

                  {event.subject_nombre && (
                    <p className="text-xs font-bold opacity-90 mt-2 flex items-center gap-1">📚 {event.subject_nombre}</p>
                  )}

                  {event.ubicacion && (
                    <p className="text-xs font-bold opacity-90 mt-1 flex items-center gap-1">📍 {event.ubicacion}</p>
                  )}
                  {event.recurrence_rule && (
                    <p className="text-xs font-bold opacity-90 mt-1">
                      🔄 {recurrenceLabels[event.recurrence_rule]}
                    </p>
                  )}
                  {event.notas && (
                    <p className="text-sm opacity-90 mt-3 font-medium bg-background/10 p-2 rounded-lg">{event.notas}</p>
                  )}
                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4 pt-4 border-t-2 border-current/20">
                    <button
                      onClick={() => handleExportToGoogle(event)}
                      className="flex-1 py-2 rounded-lg border-2 border-current text-xs font-black uppercase tracking-widest hover:bg-background/20 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Google
                    </button>
                    <button
                      onClick={() => handleDuplicateEvent(event)}
                      className="py-2 px-3 rounded-lg border-2 border-current text-xs font-black hover:bg-background/20 transition-all duration-200 flex items-center gap-1"
                      title="Duplicar evento"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="py-2 px-3 rounded-lg border-2 border-current text-xs font-black hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200"
                      title="Eliminar evento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => handleAddEvent()}
                className="w-full mt-4 px-4 py-3 bg-muted text-foreground border-4 border-dashed border-foreground rounded-lg font-black uppercase tracking-widest shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] active:translate-y-[2px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Agregar otro
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="mt-8 pt-6 border-t-[3px] border-foreground/10">
            <h4 className="text-sm font-black uppercase tracking-widest mb-4">Tipos de evento</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(eventTypeColors).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={cn("w-4 h-4 rounded-md border-[2px] border-foreground shadow-[2px_2px_0_0_#000]", colors)} />
                  <span className="text-[10px] font-black uppercase tracking-wider">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      <AddEventModal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEventToEdit(null);
        }}
        onSubmit={async (data) => {
          if (eventToEdit) {
            const { id, ...updateData } = data as any;
            await updateEvent(id || eventToEdit.id, updateData);
          } else {
            await createEvent(data as CreateEventData);
          }
        }}
        subjects={rawSubjects}
        initialDate={selectedDate || undefined}
        editEvent={eventToEdit}
      />

      {/* Import ICS Modal */}
      <ImportICSModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={async (eventsToImport) => {
          for (const eventData of eventsToImport) {
            await createEvent(eventData);
          }
        }}
      />

      {/* Google Calendar Sync Modal */}
      <GoogleCalendarSyncModal
        open={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onOpenImport={() => setShowImportModal(true)}
      />

      {/* Exams Modal */}
      <ExamsListModal
        open={showExamsModal}
        onClose={() => setShowExamsModal(false)}
        events={events}
        subjects={rawSubjects}
      />
    </div>
  );
}
