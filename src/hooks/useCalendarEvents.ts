import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
export type EventType = "P1" | "P2" | "Global" | "Recuperatorio" | "Final" | "Estudio";

export interface CalendarEvent {
  id: string;
  titulo: string;
  fecha: string;
  hora: string | null;
  tipo_examen: EventType;
  subject_id: string | null;
  subject_nombre?: string;
  subject_codigo?: string;
  notas: string | null;
  color: string;
}

export interface CreateEventData {
  titulo: string;
  fecha: string;
  hora?: string;
  tipo_examen: EventType;
  subject_id?: string;
  notas?: string;
  color?: string;
}

export function useCalendarEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: eventsData, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .order("fecha", { ascending: true });

      if (error) throw error;

      // Fetch subject names for events that have a subject_id
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
        subject_nombre: event.subject_id ? subjectsMap[event.subject_id]?.nombre : undefined,
        subject_codigo: event.subject_id ? subjectsMap[event.subject_id]?.codigo : undefined,
      }));

      setEvents(eventsWithSubjects);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Error al cargar los eventos");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Realtime subscription for calendar events
  useRealtimeSubscription({
    table: "calendar_events",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: useCallback(() => {
      console.log("📡 Realtime: calendar_events changed, refetching...");
      fetchEvents();
    }, [fetchEvents]),
    enabled: !!user,
  });

  const createEvent = async (data: CreateEventData) => {
    if (!user) return;

    try {
      const eventData = {
        user_id: user.id,
        titulo: data.titulo,
        fecha: data.fecha,
        hora: data.hora || null,
        tipo_examen: data.tipo_examen,
        subject_id: data.subject_id || null,
        notas: data.notas || null,
        color: data.color || getColorForType(data.tipo_examen),
      };

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

  const updateEvent = async (eventId: string, data: Partial<CreateEventData>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("calendar_events")
        .update({
          ...data,
          color: data.tipo_examen ? getColorForType(data.tipo_examen) : undefined,
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

    try {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", eventId)
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
    Recuperatorio: "#ef4444",
    Final: "#22c55e",
    Estudio: "#6b7280",
  };
  return colors[type];
}
