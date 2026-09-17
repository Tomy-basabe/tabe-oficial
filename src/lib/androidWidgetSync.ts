import { Preferences } from "@capacitor/preferences";
import { CalendarEvent } from "@/hooks/useCalendarEvents";

export interface AndroidWidgetEvent {
  id: string;
  title: string;
  subject: string;
  date: string;
  time: string | null;
  formattedDate: string;
  type?: string;
  color?: string;
}

const MONTH_NAMES_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/**
 * Sincroniza los próximos eventos con el Widget nativo de Android (a través de SharedPreferences de Capacitor).
 * Funciona de forma segura tanto en la app nativa de Android como en el navegador web.
 */
export async function syncEventsToAndroidWidget(events: CalendarEvent[]): Promise<void> {
  try {
    if (!events || events.length === 0) {
      await Preferences.set({ key: "tabe_calendar_events", value: "[]" });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtrar eventos desde hoy hasta los próximos 45 días
    const futureLimit = new Date();
    futureLimit.setDate(today.getDate() + 45);

    const upcoming = events
      .filter((ev) => {
        if (!ev.fecha) return false;
        const [y, m, d] = ev.fecha.split("-").map(Number);
        const evDate = new Date(y, m - 1, d);
        return evDate >= today && evDate <= futureLimit;
      })
      .sort((a, b) => {
        const dateComp = a.fecha.localeCompare(b.fecha);
        if (dateComp !== 0) return dateComp;
        return (a.hora || "00:00").localeCompare(b.hora || "00:00");
      })
      .slice(0, 6); // Primeros 6 eventos más cercanos

    const widgetData: AndroidWidgetEvent[] = upcoming.map((ev) => {
      const [y, m, d] = ev.fecha.split("-").map(Number);
      const evDate = new Date(y, m - 1, d);
      const dayName = DAY_NAMES_SHORT[evDate.getDay()] || "";
      const monthName = MONTH_NAMES_SHORT[evDate.getMonth()] || "";

      let formattedDate = `${dayName} ${d} ${monthName}`;
      if (ev.hora && !ev.is_all_day) {
        formattedDate += ` • ${ev.hora}`;
      } else {
        formattedDate += ` • Todo el día`;
      }

      // Nombre de materia o etiqueta
      let subject = ev.subject_nombre || "General";
      if (!ev.subject_nombre && ev.notas) {
        const match = ev.notas.match(/^\[([^\]]+)\]/);
        if (match && !match[1].startsWith("gcal_id:") && !match[1].startsWith("status:")) {
          subject = match[1];
        }
      }

      return {
        id: ev.id,
        title: ev.titulo || "Evento",
        subject,
        date: ev.fecha,
        time: ev.hora || null,
        formattedDate,
        type: ev.tipo_examen,
        color: ev.color,
      };
    });

    await Preferences.set({
      key: "tabe_calendar_events",
      value: JSON.stringify(widgetData),
    });

    console.log(`[AndroidWidget] Sincronizados ${widgetData.length} eventos para el Widget de Android`);
  } catch (err) {
    console.warn("[AndroidWidget] Error al sincronizar eventos con el widget:", err);
  }
}
