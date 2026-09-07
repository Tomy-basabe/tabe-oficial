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
 * Automatically inspects URL (hash / search) and Supabase storage to recover Google token
 */
export function extractAndStoreTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // 1. URL Hash check (e.g. #access_token=...&provider_token=ya29...)
    const hash = window.location.hash;
    if (hash) {
      const cleanHash = hash.replace(/^#/, "");
      const params = new URLSearchParams(cleanHash);
      const pToken = params.get("provider_token");
      if (pToken && pToken.length > 10) {
        setStoredGoogleToken(pToken);
        return pToken;
      }
      // Also check if access_token starts with ya29.
      const aToken = params.get("access_token");
      if (aToken && aToken.startsWith("ya29.")) {
        setStoredGoogleToken(aToken);
        return aToken;
      }
    }

    // 2. URL Search params check
    const search = window.location.search;
    if (search) {
      const params = new URLSearchParams(search);
      const pToken = params.get("provider_token");
      if (pToken && pToken.length > 10) {
        setStoredGoogleToken(pToken);
        return pToken;
      }
    }

    // 3. Check Supabase Auth sessions in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.provider_token && parsed.provider_token.length > 10) {
              setStoredGoogleToken(parsed.provider_token, parsed?.user?.email);
              return parsed.provider_token;
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn("Could not extract token from storage/url:", e);
  }
  return null;
}

// Auto-run on module load
if (typeof window !== "undefined") {
  extractAndStoreTokenFromUrl();
}

/**
 * Checks if a valid Google Calendar token is stored
 */
export function isGoogleCalendarConnected(): boolean {
  if (typeof window === "undefined") return false;
  const token = getStoredGoogleToken();
  return !!token && token.trim().length > 10;
}

/**
 * Gets the stored Google access token
 */
export function getStoredGoogleToken(): string | null {
  if (typeof window === "undefined") return null;
  const direct = localStorage.getItem(GCAL_TOKEN_KEY);
  if (direct && direct.trim().length > 10) return direct;
  return extractAndStoreTokenFromUrl();
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
/**
 * Helper to normalize time string to HH:mm format safely
 */
function formatTimeToHHMM(time?: string | null): string | null {
  if (!time) return null;
  const clean = time.trim();
  const parts = clean.split(":");
  if (parts.length >= 2) {
    const h = String(parseInt(parts[0], 10)).padStart(2, "0");
    const m = String(parseInt(parts[1], 10)).padStart(2, "0");
    if (!isNaN(Number(h)) && !isNaN(Number(m))) {
      return `${h}:${m}`;
    }
  }
  return null;
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
 * Converts a TABE event to a Google Calendar resource safely
 */
function mapTabeEventToGoogleResource(event: {
  titulo: string;
  fecha: string;
  hora?: string | null;
  hora_fin?: string | null;
  notas?: string | null;
  ubicacion?: string | null;
  is_all_day?: boolean;
  recurrence_rule?: string | null;
  recurrence_end?: string | null;
}) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Argentina/Buenos_Aires";
  const cleanDescription = stripGoogleEventId(event.notas);
  const rawDate = (event.fecha || "").split("T")[0] || new Date().toISOString().split("T")[0];

  let start: any = { date: rawDate };
  let end: any = { date: rawDate };

  const safeHora = formatTimeToHHMM(event.hora);
  const safeHoraFin = formatTimeToHHMM(event.hora_fin) || (safeHora ? addHours(safeHora, 1) : null);

  if (safeHora && !event.is_all_day) {
    try {
      const startD = new Date(`${rawDate}T${safeHora}:00`);
      const endD = new Date(`${rawDate}T${safeHoraFin || safeHora}:00`);

      if (!isNaN(startD.getTime()) && !isNaN(endD.getTime())) {
        start = {
          dateTime: startD.toISOString(),
          timeZone,
        };
        end = {
          dateTime: endD.toISOString(),
          timeZone,
        };
      }
    } catch {
      start = { date: rawDate };
      end = { date: rawDate };
    }
  } else {
    // All-day event
    start = { date: rawDate };
    try {
      const nextDay = new Date(`${rawDate}T12:00:00`);
      if (!isNaN(nextDay.getTime())) {
        nextDay.setDate(nextDay.getDate() + 1);
        end = { date: nextDay.toISOString().split("T")[0] };
      }
    } catch {
      end = { date: rawDate };
    }
  }

  let recurrence: string[] | undefined = undefined;
  if (event.recurrence_rule) {
    let rrule = `RRULE:FREQ=${event.recurrence_rule.toUpperCase()}`;
    if (event.recurrence_end) {
      const cleanEnd = event.recurrence_end.replace(/-/g, "");
      rrule += `;UNTIL=${cleanEnd}T235959Z`;
    }
    recurrence = [rrule];
  }

  return {
    summary: event.titulo,
    description: cleanDescription || "Evento de TABE (Tu Asistente de Bolsillo Estudiantil)",
    location: event.ubicacion || undefined,
    start,
    end,
    recurrence,
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
  recurrence_rule?: string | null;
  recurrence_end?: string | null;
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
 * Fetches the user's calendars from Google Calendar API
 * (e.g. primary + subject-specific calendars like Redes de Datos, Análisis Numérico)
 */
export async function fetchUserCalendarList(token: string): Promise<Array<{ id: string; summary: string; primary?: boolean }>> {
  try {
    const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      console.warn("Google Calendar token expired or insufficient permissions.");
      disconnectGoogleCalendar();
      return [];
    }

    if (!res.ok) {
      return [{ id: "primary", summary: "Principal", primary: true }];
    }

    const data = await res.json();
    const items = data.items || [];

    // Filter out holiday or generic contact calendars, and avoid circular sync with TABE feed
    const filtered = items.filter((c: any) => {
      if (!c.id) return false;
      const lowerId = c.id.toLowerCase();
      const lowerSummary = (c.summary || "").toLowerCase();
      if (lowerId.includes("#holiday@group.v.calendar.google.com")) return false;
      if (lowerId.includes("contacts@group.v.calendar.google.com")) return false;
      if (lowerSummary.startsWith("tabe -") || lowerSummary === "tabe") return false;
      return true;
    });

    return filtered.length > 0 ? filtered : [{ id: "primary", summary: "Principal", primary: true }];
  } catch {
    return [{ id: "primary", summary: "Principal", primary: true }];
  }
}

/**
 * Fetches events from Google Calendar across ALL user calendars in a specified range
 */
export async function fetchEventsFromGoogleCalendar(options?: {
  timeMin?: string;
  timeMax?: string;
}): Promise<{ items: any[]; error?: string }> {
  const token = getStoredGoogleToken();
  if (!token) return { items: [], error: "No conectado" };

  // Filter events from the start of today (local time) onwards
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const timeMin = options?.timeMin || today.toISOString();

  // Look ahead 1 year
  const oneYearAhead = new Date(today);
  oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);
  const timeMax = options?.timeMax || oneYearAhead.toISOString();

  try {
    const calendars = await fetchUserCalendarList(token);
    if (calendars.length === 0) {
      return {
        items: [],
        error: "Los permisos de Google Calendar necesitan actualizarse para leer tus materias. Haz clic en Conectar.",
      };
    }

    const allItems: any[] = [];
    const seenIds = new Set<string>();

    for (const cal of calendars) {
      const calId = encodeURIComponent(cal.id);
      const url = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
        timeMin
      )}&timeMax=${encodeURIComponent(timeMax)}&maxResults=2500`;

      try {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          for (const item of (data.items || [])) {
            if (item.id && !seenIds.has(item.id)) {
              seenIds.add(item.id);
              // Tag item with source calendar summary and id
              item._calendarName = cal.summary || "";
              item._calendarId = cal.id;
              allItems.push(item);
            }
          }
        } else if (res.status === 401) {
          disconnectGoogleCalendar();
          return { items: [], error: "Sesión de Google expirada. Vuelve a conectar." };
        }
      } catch (calErr) {
        console.warn(`Error fetching events for calendar ${cal.summary}:`, calErr);
      }
    }

    return { items: allItems };
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
  createTabeEvent: (event: CreateEventData, options?: { silent?: boolean; skipRefetch?: boolean }) => Promise<any>;
  updateTabeEvent: (id: string, event: Partial<CreateEventData>, options?: { silent?: boolean; skipRefetch?: boolean }) => Promise<any>;
  refetchEvents?: () => Promise<any>;
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
    // 1. Fetch events from Google Calendar (from today onwards)
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
        try {
          // Push to Google Calendar
          const pushResult = await pushEventToGoogleCalendar(tEvent);
          if (pushResult.gcalId) {
            pushedCount++;
            // Update TABE event note with the new gcal_id silently
            const newNotas = injectGoogleEventId(tEvent.notas, pushResult.gcalId);
            await params.updateTabeEvent(tEvent.id, { notas: newNotas }, { silent: true, skipRefetch: true });
            tabeByGcalId.set(pushResult.gcalId, { ...tEvent, notas: newNotas });
          }
        } catch (pushErr) {
          console.warn("Could not push event to Google Calendar:", tEvent.titulo, pushErr);
        }
      }
    }

    // Cache for recurring master events
    const masterEventsCache = new Map<string, any>();
    const handledRecurringMasterIds = new Set<string>();

    async function getMasterRecurringEvent(calId: string, recurringEventId: string): Promise<any> {
      const cacheKey = `${calId}_${recurringEventId}`;
      if (masterEventsCache.has(cacheKey)) return masterEventsCache.get(cacheKey);
      try {
        const mRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(recurringEventId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (mRes.ok) {
          const master = await mRes.json();
          masterEventsCache.set(cacheKey, master);
          return master;
        }
      } catch (err) {
        console.warn("Could not fetch master recurring event:", recurringEventId, err);
      }
      return null;
    }

    // STEP B: PULL events from Google Calendar into TABE (from today onwards, handling repeating events)
    for (const gEv of googleEvents) {
      if (gEv.status === "cancelled") continue;

      try {
        const gcalId = gEv.id;
        const recurringEventId = gEv.recurringEventId;

        // Parse Google dates
        const startDateTime = gEv.start?.dateTime || gEv.start?.date;
        if (!startDateTime) continue;

        const isAllDay = !gEv.start?.dateTime;
        const datePart = String(startDateTime).split("T")[0];
        if (!datePart || datePart.length < 8) continue;

        let hora: string | undefined = undefined;
        let hora_fin: string | undefined = undefined;

        if (!isAllDay && gEv.start?.dateTime) {
          try {
            const dStart = new Date(gEv.start.dateTime);
            if (!isNaN(dStart.getTime())) {
              hora = `${String(dStart.getHours()).padStart(2, "0")}:${String(dStart.getMinutes()).padStart(2, "0")}`;
            }
          } catch {}
        }

        if (!isAllDay && gEv.end?.dateTime) {
          try {
            const dEnd = new Date(gEv.end.dateTime);
            if (!isNaN(dEnd.getTime())) {
              hora_fin = `${String(dEnd.getHours()).padStart(2, "0")}:${String(dEnd.getMinutes()).padStart(2, "0")}`;
            }
          } catch {}
        }

        const title = gEv.summary || "Evento de Google Calendar";

        // --- CASE 1: RECURRING EVENT (e.g. daily, weekly repeated events) ---
        if (recurringEventId) {
          // If we already imported or processed the master event for this series, skip all other instances
          if (handledRecurringMasterIds.has(recurringEventId)) {
            continue;
          }
          if (tabeByGcalId.has(recurringEventId)) {
            handledRecurringMasterIds.add(recurringEventId);
            continue;
          }

          // Fetch master recurring event definition to get recurrence RRULE
          const master = await getMasterRecurringEvent(gEv._calendarId || "primary", recurringEventId);

          let rule: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" = "DAILY";
          let recurrenceEnd: string | null = null;

          if (master?.recurrence && Array.isArray(master.recurrence)) {
            const rruleStr = master.recurrence.find((r: string) => typeof r === "string" && r.startsWith("RRULE:"));
            if (rruleStr) {
              if (rruleStr.includes("FREQ=DAILY")) rule = "DAILY";
              else if (rruleStr.includes("FREQ=WEEKLY")) rule = "WEEKLY";
              else if (rruleStr.includes("FREQ=MONTHLY")) rule = "MONTHLY";
              else if (rruleStr.includes("FREQ=YEARLY")) rule = "YEARLY";

              const untilMatch = rruleStr.match(/UNTIL=([0-9]{4})([0-9]{2})([0-9]{2})/);
              if (untilMatch) {
                recurrenceEnd = `${untilMatch[1]}-${untilMatch[2]}-${untilMatch[3]}`;
              }
            }
          }

          // Deduce event type
          let tipo_examen: EventType = "Otro";
          const lower = (master?.summary || title).toLowerCase();
          if (lower.includes("parcial 1") || lower.includes("1er parcial") || lower.includes("primer parcial") || lower.includes("p1")) {
            tipo_examen = "P1";
          } else if (lower.includes("parcial 2") || lower.includes("2do parcial") || lower.includes("segundo parcial") || lower.includes("p2")) {
            tipo_examen = "P2";
          } else if (lower.includes("final")) {
            tipo_examen = "Final";
          } else if (lower.includes("recuperatorio") || lower.includes("recu")) {
            tipo_examen = "Recuperatorio P1";
          } else if (lower.includes("otp") || lower.includes("tp") || lower.includes("entrega") || lower.includes("laboratorio")) {
            tipo_examen = "Entrega";
          } else if (lower.includes("clase") || lower.includes("teórica") || lower.includes("práctica") || lower.includes("virtual") || lower.includes("redes") || lower.includes("análisis") || lower.includes("sistemas") || lower.includes("software")) {
            tipo_examen = "Clase";
          } else if (lower.includes("estudio") || lower.includes("repaso")) {
            tipo_examen = "Estudio";
          } else if (hora) {
            tipo_examen = "Clase";
          }

          let eventNotes = injectGoogleEventId(master?.description || gEv.description, recurringEventId);
          if (gEv._calendarName && gEv._calendarName !== "Principal" && !gEv._calendarName.toLowerCase().includes("tomas")) {
            eventNotes = `[${gEv._calendarName}] ${eventNotes}`.trim();
          }

          // Create ONE master recurring event in TABE starting from current date
          // TABE's internal engine will generate virtual instances for every day dynamically into infinity!
          await params.createTabeEvent({
            titulo: master?.summary || title,
            fecha: datePart,
            hora,
            hora_fin,
            is_all_day: isAllDay,
            ubicacion: master?.location || gEv.location || undefined,
            notas: eventNotes,
            tipo_examen,
            recurrence_rule: rule,
            recurrence_end: recurrenceEnd || undefined,
          }, { silent: true, skipRefetch: true });

          pulledCount++;
          handledRecurringMasterIds.add(recurringEventId);
          tabeByGcalId.set(recurringEventId, { id: "synced" } as any);
          continue;
        }

        // --- CASE 2: SINGLE EVENT ---
        const alreadyInTabe = tabeByGcalId.get(gcalId);
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
            }, { silent: true, skipRefetch: true });
          }
        } else if (matchedByTitleDate) {
          // Match found by title and date: attach the gcalId to TABE event
          const newNotas = injectGoogleEventId(matchedByTitleDate.notas, gcalId);
          await params.updateTabeEvent(matchedByTitleDate.id, { notas: newNotas }, { silent: true, skipRefetch: true });
          tabeByGcalId.set(gcalId, { ...matchedByTitleDate, notas: newNotas });
        } else {
          // Completely new single event from Google Calendar: create in TABE!
          const notas = injectGoogleEventId(gEv.description, gcalId);

          let tipo_examen: EventType = "Otro";
          const lower = title.toLowerCase();
          if (lower.includes("parcial 1") || lower.includes("1er parcial") || lower.includes("primer parcial") || lower.includes("p1")) {
            tipo_examen = "P1";
          } else if (lower.includes("parcial 2") || lower.includes("2do parcial") || lower.includes("segundo parcial") || lower.includes("p2")) {
            tipo_examen = "P2";
          } else if (lower.includes("final")) {
            tipo_examen = "Final";
          } else if (lower.includes("recuperatorio") || lower.includes("recu")) {
            tipo_examen = "Recuperatorio P1";
          } else if (lower.includes("otp") || lower.includes("tp") || lower.includes("entrega") || lower.includes("laboratorio")) {
            tipo_examen = "Entrega";
          } else if (lower.includes("clase") || lower.includes("teórica") || lower.includes("práctica") || lower.includes("virtual") || lower.includes("redes") || lower.includes("análisis") || lower.includes("sistemas") || lower.includes("software")) {
            tipo_examen = "Clase";
          } else if (lower.includes("estudio") || lower.includes("repaso")) {
            tipo_examen = "Estudio";
          } else if (hora) {
            tipo_examen = "Clase";
          }

          let eventNotes = notas;
          if (gEv._calendarName && gEv._calendarName !== "Principal" && !gEv._calendarName.toLowerCase().includes("tomas")) {
            eventNotes = `[${gEv._calendarName}] ${eventNotes}`.trim();
          }

          await params.createTabeEvent({
            titulo: title,
            fecha: datePart,
            hora,
            hora_fin,
            is_all_day: isAllDay,
            ubicacion: gEv.location || undefined,
            notas: eventNotes,
            tipo_examen,
          }, { silent: true, skipRefetch: true });

          pulledCount++;
        }
      } catch (eventErr) {
        console.warn("Could not process Google Calendar event:", gEv?.summary, eventErr);
      }
    }

    // Save last sync time
    localStorage.setItem(GCAL_LAST_SYNC_KEY, new Date().toISOString());

    // Single refetch after all batch operations finish
    if (params.refetchEvents) {
      await params.refetchEvents();
    }

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
