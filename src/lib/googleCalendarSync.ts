/**
 * TABE - Google Calendar Bidirectional 2-Way Sync Service
 * Sincronización en tiempo real entre TABE y Google Calendar
 */

import { toast } from "sonner";
import { CalendarEvent, CreateEventData, EventType } from "@/hooks/useCalendarEvents";

export const GCAL_TOKEN_KEY = "tabe_google_calendar_token";
export const GCAL_EMAIL_KEY = "tabe_google_calendar_email";
export const GCAL_AUTO_SYNC_KEY = "tabe_gcal_auto_sync";
export const GCAL_LAST_SYNC_KEY = "tabe_gcal_last_sync";

const GCAL_API_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/**
 * Checks if a valid Google Calendar token is stored
 */
export function isGoogleCalendarConnected(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem(GCAL_TOKEN_KEY);
  return !!token && token.trim().length > 10;
}

/**
 * Gets the stored Google access token
 */
export function getStoredGoogleToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GCAL_TOKEN_KEY);
}

/**
 * Saves Google access token
 */
export function setStoredGoogleToken(token: string, email?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GCAL_TOKEN_KEY, token);
  if (email) {
    localStorage.setItem(GCAL_EMAIL_KEY, email);
  }
}

/**
 * Disconnects Google Calendar
 */
export function disconnectGoogleCalendar() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GCAL_TOKEN_KEY);
  localStorage.removeItem(GCAL_EMAIL_KEY);
  localStorage.removeItem(GCAL_LAST_SYNC_KEY);
}

/**
 * Checks if automatic sync is enabled
 */
export function isAutoSyncEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem(GCAL_AUTO_SYNC_KEY);
  return saved !== "false";
}

/**
 * Sets automatic sync preference
 */
export function setAutoSyncEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GCAL_AUTO_SYNC_KEY, enabled ? "true" : "false");
}

/**
 * Gets last sync timestamp
 */
export function getLastSyncTime(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GCAL_LAST_SYNC_KEY);
}

/**
 * Extracts Google Event ID from event notes
 */
export function extractGoogleEventId(notas?: string | null): string | null {
  if (!notas) return null;
  const match = notas.match(/\[gcal_id:([a-zA-Z0-9_-]+)\]/);
  return match ? match[1] : null;
}

/**
 * Removes Google Event ID tag from notes for display
 */
export function stripGoogleEventId(notas?: string | null): string {
  if (!notas) return "";
  return notas.replace(/\[gcal_id:[a-zA-Z0-9_-]+\]/g, "").trim();
}

/**
 * Injects or updates Google Event ID inside notes
 */
export function injectGoogleEventId(notas: string | null | undefined, gcalId: string): string {
  const clean = stripGoogleEventId(notas);
  return clean ? `${clean} [gcal_id:${gcalId}]` : `[gcal_id:${gcalId}]`;
}

/**
 * Helper to add hours to HH:mm string
 */
function addHours(time: string, hoursToAdd = 1): string {
  try {
    const [h, m] = time.split(":").map(Number);
    const endH = Math.min(23, (h + hoursToAdd) % 24);
    return `${String(endH).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
  } catch {
    return "12:00";
  }
}

/**
 * Converts a TABE event to a Google Calendar resource
 */
function mapTabeEventToGoogleResource(event: {
  titulo: string;
  fecha: string;
  hora?: string | null;
  hora_fin?: string | null;
  notas?: string | null;
  ubicacion?: string | null;
  is_all_day?: boolean;
}) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Argentina/Buenos_Aires";
  const cleanDescription = stripGoogleEventId(event.notas);

  let start: any;
  let end: any;

  if (event.hora && !event.is_all_day) {
    const startStr = `${event.fecha}T${event.hora}:00`;
    const endHora = event.hora_fin || addHours(event.hora, 1);
    const endStr = `${event.fecha}T${endHora}:00`;

    start = {
      dateTime: new Date(startStr).toISOString(),
      timeZone,
    };
    end = {
      dateTime: new Date(endStr).toISOString(),
      timeZone,
    };
  } else {
    // All-day event
    start = { date: event.fecha };
    const nextDay = new Date(event.fecha + "T12:00:00");
    nextDay.setDate(nextDay.getDate() + 1);
    end = { date: nextDay.toISOString().split("T")[0] };
  }

  return {
    summary: event.titulo,
    description: cleanDescription || "Evento de TABE (Tu Asistente de Bolsillo Estudiantil)",
    location: event.ubicacion || undefined,
    start,
    end,
    reminders: {
      useDefault: true,
    },
  };
}

/**
 * Push an event from TABE to Google Calendar (Create or Update)
 */
export async function pushEventToGoogleCalendar(event: {
  id: string;
  titulo: string;
  fecha: string;
  hora?: string | null;
  hora_fin?: string | null;
  notas?: string | null;
  ubicacion?: string | null;
  is_all_day?: boolean;
}): Promise<{ gcalId?: string; error?: string }> {
  const token = getStoredGoogleToken();
  if (!token) {
    return { error: "No hay sesión de Google Calendar activa" };
  }

  const existingGcalId = extractGoogleEventId(event.notas);
  const resource = mapTabeEventToGoogleResource(event);

  try {
    let response: Response;

    if (existingGcalId) {
      // Update existing Google event
      response = await fetch(`${GCAL_API_BASE}/${existingGcalId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resource),
      });

      // If event was deleted in Google (404), recreate it
      if (response.status === 404 || response.status === 410) {
        response = await fetch(GCAL_API_BASE, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(resource),
        });
      }
    } else {
      // Create new event in Google
      response = await fetch(GCAL_API_BASE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resource),
      });
    }

    if (!response.ok) {
      if (response.status === 401) {
        disconnectGoogleCalendar();
        return { error: "El token de Google expiró. Vuelve a conectar tu cuenta." };
      }
      const errJson = await response.json().catch(() => null);
      return { error: errJson?.error?.message || `Error ${response.status} en Google Calendar` };
    }

    const created = await response.json();
    return { gcalId: created.id };
  } catch (err: any) {
    console.error("Error pushing event to Google Calendar:", err);
    return { error: err?.message || "Error de red al conectar con Google" };
  }
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteEventFromGoogleCalendar(gcalId: string): Promise<boolean> {
  const token = getStoredGoogleToken();
  if (!token || !gcalId) return false;

  try {
    const res = await fetch(`${GCAL_API_BASE}/${gcalId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.ok || res.status === 404 || res.status === 410;
  } catch (err) {
    console.error("Error deleting event from Google Calendar:", err);
    return false;
  }
}

/**
 * Fetches events from Google Calendar in a specified range
 */
export async function fetchEventsFromGoogleCalendar(options?: {
  timeMin?: string;
  timeMax?: string;
}): Promise<{ items: any[]; error?: string }> {
  const token = getStoredGoogleToken();
  if (!token) return { items: [], error: "No conectado" };

  const timeMin = options?.timeMin || new Date(Date.now() - 90 * 86400000).toISOString();
  const timeMax = options?.timeMax || new Date(Date.now() + 180 * 86400000).toISOString();

  const url = `${GCAL_API_BASE}?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
    timeMin
  )}&timeMax=${encodeURIComponent(timeMax)}&maxResults=250`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        disconnectGoogleCalendar();
        return { items: [], error: "Sesión de Google expirada. Vuelve a conectar." };
      }
      return { items: [], error: `Error ${res.status} al consultar Google Calendar` };
    }

    const data = await res.json();
    return { items: data.items || [] };
  } catch (err: any) {
    console.error("Error fetching Google Calendar events:", err);
    return { items: [], error: err?.message || "Error de conexión con Google" };
  }
}

/**
 * Bidirectional Two-Way Synchronization Engine
 * Pushes local changes to Google and brings Google events to TABE
 */
export async function performBidirectionalSync(params: {
  tabeEvents: CalendarEvent[];
  createTabeEvent: (event: CreateEventData) => Promise<any>;
  updateTabeEvent: (id: string, event: Partial<CreateEventData>) => Promise<any>;
}): Promise<{
  success: boolean;
  pushedCount: number;
  pulledCount: number;
  error?: string;
}> {
  const token = getStoredGoogleToken();
  if (!token) {
    return { success: false, pushedCount: 0, pulledCount: 0, error: "Conecta tu cuenta de Google primero" };
  }

  try {
    // 1. Fetch events from Google Calendar
    const { items: googleEvents, error: fetchErr } = await fetchEventsFromGoogleCalendar();
    if (fetchErr) {
      return { success: false, pushedCount: 0, pulledCount: 0, error: fetchErr };
    }

    let pushedCount = 0;
    let pulledCount = 0;

    // Index existing TABE events by gcal_id and title+date
    const tabeByGcalId = new Map<string, CalendarEvent>();
    const tabeByTitleDate = new Map<string, CalendarEvent>();

    for (const ev of params.tabeEvents) {
      const gcalId = extractGoogleEventId(ev.notas);
      if (gcalId) {
        tabeByGcalId.set(gcalId, ev);
      }
      tabeByTitleDate.set(`${ev.titulo.trim().toLowerCase()}_${ev.fecha}`, ev);
    }

    // Index Google events
    const googleById = new Map<string, any>();
    for (const gEv of googleEvents) {
      if (gEv.id && gEv.status !== "cancelled") {
        googleById.set(gEv.id, gEv);
      }
    }

    // STEP A: PUSH TABE events to Google Calendar if not yet in Google
    for (const tEvent of params.tabeEvents) {
      // Ignore virtual recurring instances since the parent event handles it
      if (tEvent.isVirtual) continue;

      const gcalId = extractGoogleEventId(tEvent.notas);
      const isAlreadyInGoogle = gcalId && googleById.has(gcalId);

      if (!isAlreadyInGoogle) {
        // Push to Google Calendar
        const pushResult = await pushEventToGoogleCalendar(tEvent);
        if (pushResult.gcalId) {
          pushedCount++;
          // Update TABE event note with the new gcal_id
          const newNotas = injectGoogleEventId(tEvent.notas, pushResult.gcalId);
          await params.updateTabeEvent(tEvent.id, { notas: newNotas });
          tabeByGcalId.set(pushResult.gcalId, { ...tEvent, notas: newNotas });
        }
      }
    }

    // STEP B: PULL events from Google Calendar into TABE (Viceversa)
    for (const gEv of googleEvents) {
      if (gEv.status === "cancelled") continue;

      const gcalId = gEv.id;
      const alreadyInTabe = tabeByGcalId.get(gcalId);

      // Parse Google dates
      const startDateTime = gEv.start?.dateTime || gEv.start?.date;
      if (!startDateTime) continue;

      const isAllDay = !gEv.start?.dateTime;
      const datePart = startDateTime.split("T")[0];
      let hora: string | undefined = undefined;
      let hora_fin: string | undefined = undefined;

      if (!isAllDay && gEv.start?.dateTime) {
        const dStart = new Date(gEv.start.dateTime);
        hora = `${String(dStart.getHours()).padStart(2, "0")}:${String(dStart.getMinutes()).padStart(2, "0")}`;
      }

      if (!isAllDay && gEv.end?.dateTime) {
        const dEnd = new Date(gEv.end.dateTime);
        hora_fin = `${String(dEnd.getHours()).padStart(2, "0")}:${String(dEnd.getMinutes()).padStart(2, "0")}`;
      }

      const title = gEv.summary || "Evento de Google Calendar";
      const titleDateKey = `${title.trim().toLowerCase()}_${datePart}`;
      const matchedByTitleDate = tabeByTitleDate.get(titleDateKey);

      if (alreadyInTabe) {
        // Event exists in both: verify if time/title changed in Google and update TABE
        const needsUpdate =
          alreadyInTabe.titulo !== title ||
          alreadyInTabe.fecha !== datePart ||
          (hora && alreadyInTabe.hora !== hora);

        if (needsUpdate) {
          await params.updateTabeEvent(alreadyInTabe.id, {
            titulo: title,
            fecha: datePart,
            hora: hora || undefined,
            hora_fin: hora_fin || undefined,
            ubicacion: gEv.location || alreadyInTabe.ubicacion || undefined,
          });
        }
      } else if (matchedByTitleDate) {
        // Match found by title and date: attach the gcalId to TABE event
        const newNotas = injectGoogleEventId(matchedByTitleDate.notas, gcalId);
        await params.updateTabeEvent(matchedByTitleDate.id, { notas: newNotas });
        tabeByGcalId.set(gcalId, { ...matchedByTitleDate, notas: newNotas });
      } else {
        // Completely new event from Google Calendar: create in TABE!
        const notas = injectGoogleEventId(gEv.description, gcalId);

        // Deduce event type from title
        let tipo_examen: EventType = "Otro";
        const lower = title.toLowerCase();
        if (lower.includes("parcial 1") || lower.includes("1er parcial") || lower.includes("primer parcial") || lower.includes("p1")) {
          tipo_examen = "P1";
        } else if (lower.includes("parcial 2") || lower.includes("2do parcial") || lower.includes("segundo parcial") || lower.includes("p2")) {
          tipo_examen = "P2";
        } else if (lower.includes("final")) {
          tipo_examen = "Final";
        } else if (lower.includes("recuperatorio")) {
          tipo_examen = "Recuperatorio P1";
        } else if (lower.includes("clase") || lower.includes("teórica") || lower.includes("práctica")) {
          tipo_examen = "Clase";
        } else if (lower.includes("tp") || lower.includes("entrega")) {
          tipo_examen = "Entrega";
        } else if (lower.includes("estudio") || lower.includes("repaso")) {
          tipo_examen = "Estudio";
        }

        await params.createTabeEvent({
          titulo: title,
          fecha: datePart,
          hora,
          hora_fin,
          is_all_day: isAllDay,
          ubicacion: gEv.location || undefined,
          notas,
          tipo_examen,
        });

        pulledCount++;
      }
    }

    // Save last sync time
    localStorage.setItem(GCAL_LAST_SYNC_KEY, new Date().toISOString());

    return {
      success: true,
      pushedCount,
      pulledCount,
    };
  } catch (err: any) {
    console.error("Bidirectional sync error:", err);
    return {
      success: false,
      pushedCount: 0,
      pulledCount: 0,
      error: err?.message || "Error durante la sincronización",
    };
  }
}
