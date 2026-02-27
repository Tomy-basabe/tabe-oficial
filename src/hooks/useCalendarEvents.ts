import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
export type EventType = "P1" | "P2" | "Global" | "Recuperatorio P1" | "Recuperatorio P2" | "Recuperatorio Global" | "Final" | "Estudio" | "TP" | "Entrega" | "Cursado" | "Otro";
export type RecurrenceRule = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | null;

export interface CalendarEvent {
  id: string;
  titulo: string;
  fecha: string;
  hora: string | null;
  hora_fin: string | null;
  tipo_examen: EventType;
  subject_id: string | null;
  subject_nombre?: string;
  subject_codigo?: string;
  notas: string | null;
  ubicacion: string | null;
  is_all_day: boolean;
  color: string;
  recurrence_rule: RecurrenceRule;
  recurrence_end: string | null;
  recurrence_parent_id: string | null;
  isVirtual?: boolean; // Generated recurrence instance
}

export interface CreateEventData {
  titulo: string;
  fecha: string;
  hora?: string;
  hora_fin?: string;
  tipo_examen: EventType;
  subject_id?: string;
  notas?: string;
  ubicacion?: string;
  is_all_day?: boolean;
  color?: string;
  recurrence_rule?: RecurrenceRule;
  recurrence_end?: string;
}

// Generate virtual instances of a recurring event
function generateRecurrenceInstances(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  if (!event.recurrence_rule) return [];

  const instances: CalendarEvent[] = [];
  const baseDate = new Date(event.fecha + "T12:00:00");
  const endDate = event.recurrence_end ? new Date(event.recurrence_end + "T23:59:59") : rangeEnd;
  const limitDate = endDate < rangeEnd ? endDate : rangeEnd;

  let current = new Date(baseDate);

  // Advance to next occurrence after base
  advanceDate(current, event.recurrence_rule);

  let safety = 0;
  while (current <= limitDate && safety < 366) {
    safety++;
    if (current >= rangeStart) {
      const dateStr = current.toISOString().split("T")[0];
      instances.push({
        ...event,
        id: `${event.id}_${dateStr}`,
        fecha: dateStr,
        isVirtual: true,
        recurrence_parent_id: event.id,
      });
    }
    advanceDate(current, event.recurrence_rule);
  }

  return instances;
}

function advanceDate(date: Date, rule: RecurrenceRule) {
  switch (rule) {
    case "DAILY": date.setDate(date.getDate() + 1); break;
    case "WEEKLY": date.setDate(date.getDate() + 7); break;
    case "MONTHLY": date.setMonth(date.getMonth() + 1); break;
    case "YEARLY": date.setFullYear(date.getFullYear() + 1); break;
  }
}

export function useCalendarEvents() {
  const { user, isGuest } = useAuth();
  const [rawEvents, setRawEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!user && !isGuest) return;

    if (isGuest) {
      setLoading(false);
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      setRawEvents([
        {
          id: "guest-event-1",
          titulo: "Parcial de Análisis Matemático",
          fecha: today,
          hora: "10:30",
          hora_fin: "12:30",
          tipo_examen: "P1",
          subject_id: null,
          subject_nombre: "Análisis I",
          notas: "Recuerda llevar calculadora y tabla de integrales.",
          ubicacion: "Aula 14",
          is_all_day: false,
          color: "#00ffaa",
          recurrence_rule: null,
          recurrence_end: null,
          recurrence_parent_id: null,
        },
        {
          id: "guest-event-2",
          titulo: "Entrega Trabajo Práctico",
          fecha: tomorrow,
          hora: "18:00",
          hora_fin: "18:00",
          tipo_examen: "Global",
          subject_id: null,
          subject_nombre: "Física II",
          notas: "Formato PDF, máximo 10 páginas.",
          ubicacion: "Campus Virtual",
          is_all_day: false,
          color: "#b026ff",
          recurrence_rule: null,
          recurrence_end: null,
          recurrence_parent_id: null,
        }
      ]);
      return;
    }

    try {
      setLoading(true);

      const { data: eventsData, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .order("fecha", { ascending: true });

      if (error) throw error;

      // Fetch subject names
      const subjectIds = [...new Set(eventsData?.filter(e => e.subject_id).map(e => e.subject_id))];

      let subjectsMap: Record<string, { nombre: string; codigo: string }> = {};

      if (subjectIds.length > 0) {
        const { data: subjectsData } = await supabase
          .from("subjects")
          .select("id, nombre, codigo")
          .in("id", subjectIds);

        if (subjectsData) {
          subjectsMap = subjectsData.reduce((acc, s) => {
            acc[s.id] = { nombre: s.nombre, codigo: s.codigo };
            return acc;
          }, {} as Record<string, { nombre: string; codigo: string }>);
        }
      }

      const eventsWithSubjects = (eventsData || []).map(event => ({
        ...event,
        tipo_examen: event.tipo_examen as EventType,
        recurrence_rule: (event.recurrence_rule || null) as RecurrenceRule,
        hora: (event.hora as string | null) || null,
        hora_fin: (event.hora_fin as string | null) || null,
        color: event.color as string,
        subject_nombre: event.subject_id ? subjectsMap[event.subject_id]?.nombre : undefined,
        subject_codigo: event.subject_id ? subjectsMap[event.subject_id]?.codigo : undefined,
      }));

      setRawEvents(eventsWithSubjects);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Error al cargar los eventos");
    } finally {
      setLoading(false);
    }
  }, [user, isGuest]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Realtime subscription
  useRealtimeSubscription({
    table: "calendar_events",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: useCallback(() => {
      fetchEvents();
    }, [fetchEvents]),
    enabled: !!user,
  });

  // Generate all events including recurrence instances
  const events = useMemo(() => {
    const rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - 6);
    const rangeEnd = new Date();
    rangeEnd.setMonth(rangeEnd.getMonth() + 12);

    const allEvents: CalendarEvent[] = [...rawEvents];

    for (const event of rawEvents) {
      if (event.recurrence_rule) {
        const instances = generateRecurrenceInstances(event, rangeStart, rangeEnd);
        allEvents.push(...instances);
      }
    }

    return allEvents.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [rawEvents]);

  const createEvent = async (data: CreateEventData) => {
    if (!user) return;

    try {
      const eventData: any = {
        user_id: user.id,
        titulo: data.titulo,
        fecha: data.fecha,
        hora: data.hora || null,
        hora_fin: data.hora_fin || null,
        tipo_examen: data.tipo_examen,
        subject_id: data.subject_id || null,
        notas: data.notas || null,
        ubicacion: data.ubicacion || null,
        is_all_day: data.is_all_day || false,
        color: data.color || getColorForType(data.tipo_examen),
      };

      if (data.recurrence_rule) {
        eventData.recurrence_rule = data.recurrence_rule;
        eventData.recurrence_end = data.recurrence_end || null;
      }

      const { error } = await supabase
        .from("calendar_events")
        .insert(eventData);

      if (error) throw error;

      await fetchEvents();
      toast.success("Evento creado correctamente");
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Error al crear el evento");
      throw error;
    }
  };

  const duplicateEvent = async (event: CalendarEvent) => {
    if (!user) return;

    try {
      const eventData: any = {
        user_id: user.id,
        titulo: event.titulo + " (copia)",
        fecha: event.fecha,
        hora: event.hora,
        hora_fin: event.hora_fin,
        tipo_examen: event.tipo_examen,
        subject_id: event.subject_id,
        notas: event.notas,
        ubicacion: event.ubicacion,
        is_all_day: event.is_all_day,
        color: event.color,
      };

      const { error } = await supabase
        .from("calendar_events")
        .insert(eventData);

      if (error) throw error;

      await fetchEvents();
      toast.success("Evento duplicado");
    } catch (error) {
      console.error("Error duplicating event:", error);
      toast.error("Error al duplicar el evento");
    }
  };

  const updateEvent = async (eventId: string, data: Partial<CreateEventData>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("calendar_events")
        .update({
          ...data,
          hora: data.hora === undefined ? undefined : data.hora || null, // Ensure null if explicitly set to empty string
          hora_fin: data.hora_fin === undefined ? undefined : data.hora_fin || null, // Ensure null if explicitly set to empty string
          color: data.color || (data.tipo_examen ? getColorForType(data.tipo_examen) : undefined),
        })
        .eq("id", eventId)
        .eq("user_id", user.id);

      if (error) throw error;

      await fetchEvents();
      toast.success("Evento actualizado");
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Error al actualizar el evento");
      throw error;
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!user) return;

    // If it's a virtual (generated) instance, extract the parent id
    const actualId = eventId.includes("_") ? eventId.split("_")[0] : eventId;

    try {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", actualId)
        .eq("user_id", user.id);

      if (error) throw error;

      await fetchEvents();
      toast.success("Evento eliminado");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Error al eliminar el evento");
      throw error;
    }
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.fecha === dateStr);
  };

  const getUpcomingExams = (limit = 5): CalendarEvent[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    return events
      .filter(event =>
        event.fecha >= todayStr &&
        event.tipo_examen !== "Estudio"
      )
      .slice(0, limit);
  };

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    getEventsForDate,
    getUpcomingExams,
    refetch: fetchEvents,
  };
}

function getColorForType(type: EventType): string {
  const colors: Record<EventType, string> = {
    P1: "#00d9ff",
    P2: "#a855f7",
    Global: "#fbbf24",
    "Recuperatorio P1": "#ef4444",
    "Recuperatorio P2": "#ef4444",
    "Recuperatorio Global": "#ef4444",
    Final: "#22c55e",
    Estudio: "#6b7280",
    TP: "#f97316",
    Entrega: "#ec4899",
    Cursado: "#3b82f6",
    Otro: "#9ca3af",
  };
  return colors[type] || "#6b7280";
}
