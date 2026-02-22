import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  addMonths, subMonths,
  addWeeks, subWeeks,
  addDays, subDays,
  startOfToday
} from "date-fns";
import { useCalendarEvents, CalendarEvent, EventType } from "@/hooks/useCalendarEvents";
import { useSubjects } from "@/hooks/useSubjects";
import { AddEventModal } from "@/components/calendar/AddEventModal";
import { ImportICSModal } from "@/components/calendar/ImportICSModal";
import { GoogleCalendarSyncModal } from "@/components/calendar/GoogleCalendarSyncModal";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarSidebar } from "@/components/calendar/CalendarSidebar";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarTimeGridView } from "@/components/calendar/CalendarTimeGridView";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";

type ViewType = "day" | "week" | "month";

export default function Calendar() {
  const { events, loading, createEvent, deleteEvent } = useCalendarEvents();
  const { rawSubjects } = useSubjects();

  // Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("month");

  // Modals & Selection
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState<Set<EventType>>(
    new Set(["P1", "P2", "Global", "Recuperatorio", "Final", "Estudio"])
  );

  const toggleFilter = (type: EventType) => {
    const newFilters = new Set(filters);
    if (newFilters.has(type)) {
      newFilters.delete(type);
    } else {
      newFilters.add(type);
    }
    setFilters(newFilters);
  };

  const handleNavigate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      setCurrentDate(startOfToday());
      return;
    }

    const amount = direction === "next" ? 1 : -1;
    if (view === "month") {
      setCurrentDate(amount === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(amount === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(amount === 1 ? addDays(currentDate, 1) : subDays(currentDate, 1));
    }
  };

  const handleDateClick = (date: Date, hour?: number) => {
    setSelectedDate(date);
    setShowAddModal(true);
    // Note: AddEventModal could be improved to receive 'hour'
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Sincronizando calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Left Sidebar */}
      <CalendarSidebar
        selectedDate={currentDate}
        onDateChange={setCurrentDate}
        onAddEvent={() => setShowAddModal(true)}
        onSyncGoogle={() => setShowSyncModal(true)}
        onImportICS={() => setShowImportModal(true)}
        filters={filters}
        toggleFilter={toggleFilter}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          setView={setView}
          onNavigate={handleNavigate}
        />

        {/* View Grid */}
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          {view === "month" ? (
            <CalendarMonthView
              currentDate={currentDate}
              events={events}
              onDateClick={setSelectedDate}
              onEventClick={handleEventClick}
              filters={filters}
            />
          ) : (
            <CalendarTimeGridView
              currentDate={currentDate}
              view={view}
              events={events}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
              filters={filters}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <AddEventModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={createEvent}
        subjects={rawSubjects}
        initialDate={selectedDate}
      />

      <EventDetailsModal
        open={showDetailsModal}
        event={selectedEvent}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedEvent(null);
        }}
        onDelete={deleteEvent}
      />

      <ImportICSModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={async (eventsToImport) => {
          for (const eventData of eventsToImport) {
            await createEvent(eventData);
          }
        }}
      />

      <GoogleCalendarSyncModal
        open={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onOpenImport={() => setShowImportModal(true)}
      />
    </div>
  );
}
