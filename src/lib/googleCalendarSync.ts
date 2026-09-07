/**
 * TABE - Google Calendar Bidirectional 2-Way Sync Service
 * Sincronización en tiempo real entre TABE y Google Calendar
 */

import { toast } from "sonner";
import { CalendarEvent, CreateEventData, EventType } from "@/hooks/useCalendarEvents";
import { toLocalDateStr } from "@/lib/utils";

export const GCAL_TOKEN_KEY = "tabe_google_calendar_token";
export const GCAL_EMAIL_KEY = "tabe_google_calendar_email";
export const GCAL_AUTO_SYNC_KEY = "tabe_gcal_auto_sync";
export const GCAL_LAST_SYNC_KEY = "tabe_gcal_last_sync";
export const GCAL_REFRESH_TOKEN_KEY = "tabe_google_calendar_refresh_token";
export const GCAL_LINKED_KEY = "tabe_google_calendar_linked";
export const GCAL_EXPIRES_AT_KEY = "tabe_google_calendar_expires_at";
export const GCAL_NEEDS_REAUTH_KEY = "tabe_google_calendar_needs_reauth";

const GCAL_API_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/**
 * Automatically inspects URL (hash / search) and Supabase storage to recover Google token
 */
export function extractAndStoreTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // 1. URL Hash check (e.g. #access_token=...&provider_token=ya29...&provider_refresh_token=...)
    const hash = window.location.hash;
    if (hash) {
      const cleanHash = hash.replace(/^#/, "");
      const params = new URLSearchParams(cleanHash);
      const pToken = params.get("provider_token");
      const rToken = params.get("provider_refresh_token") || undefined;
      const expIn = params.get("expires_in") ? parseInt(params.get("expires_in")!, 10) : undefined;
      
      if (pToken && pToken.length > 10) {
        setStoredGoogleToken(pToken, undefined, rToken, expIn);
        return pToken;
      }
      // Also check if access_token starts with ya29.
      const aToken = params.get("access_token");
      if (aToken && aToken.startsWith("ya29.")) {
        setStoredGoogleToken(aToken, undefined, rToken, expIn);
        return aToken;
      }
    }

    // 2. URL Search params check
    const search = window.location.search;
    if (search) {
      const params = new URLSearchParams(search);
      const pToken = params.get("provider_token");
      const rToken = params.get("provider_refresh_token") || undefined;
      const expIn = params.get("expires_in") ? parseInt(params.get("expires_in")!, 10) : undefined;
      if (pToken && pToken.length > 10) {
        setStoredGoogleToken(pToken, undefined, rToken, expIn);
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
              setStoredGoogleToken(
                parsed.provider_token,
                parsed?.user?.email,
                parsed?.provider_refresh_token ?? undefined,
                parsed?.expires_in
              );
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
 * Checks if Google Calendar is connected (account is linked, user logged with Google, or has token)
 */
export function isGoogleCalendarConnected(user?: any): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem("tabe_gcal_explicitly_disconnected") === "true") {
    return false;
  }
  const token = getStoredGoogleToken();
  if (token && token.trim().length > 10) return true;

  // If gcal was marked linked, verify token can be extracted or exists
  const isLinked = localStorage.getItem(GCAL_LINKED_KEY) === "true";
  if (isLinked) {
    const recovered = extractAndStoreTokenFromUrl();
    if (recovered && recovered.trim().length > 10) return true;
  }

  return false;
}

/**
 * Checks if the Google Calendar live token needs re-authentication
 */
export function isGoogleTokenNeedsReauth(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(GCAL_NEEDS_REAUTH_KEY) === "true";
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
 * Gets the stored Google refresh token (long-lived)
 */
export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GCAL_REFRESH_TOKEN_KEY);
}

/**
 * Saves Google access token (and optionally refresh token and expiry)
 */
export function setStoredGoogleToken(
  token: string,
  email?: string,
  refreshToken?: string,
  expiresInSeconds?: number
) {
  if (typeof window === "undefined") return;
  localStorage.removeItem("tabe_gcal_explicitly_disconnected");

  if (token && token.trim().length > 10) {
    localStorage.setItem(GCAL_TOKEN_KEY, token);
    localStorage.setItem(GCAL_LINKED_KEY, "true");
    localStorage.removeItem(GCAL_NEEDS_REAUTH_KEY);

    const expSec = expiresInSeconds && expiresInSeconds > 60 ? expiresInSeconds : 3500;
    const expiresAt = Date.now() + expSec * 1000;
    localStorage.setItem(GCAL_EXPIRES_AT_KEY, String(expiresAt));
  }
  if (email) {
    localStorage.setItem(GCAL_EMAIL_KEY, email);
    localStorage.setItem(GCAL_LINKED_KEY, "true");
  }
  if (refreshToken) {
    localStorage.setItem(GCAL_REFRESH_TOKEN_KEY, refreshToken);
  }

  // Persist gcal_linked in user_metadata so it survives across devices and sessions
  try {
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.auth.updateUser({
        data: {
          gcal_linked: true,
          gcal_email: email || undefined,
        },
      }).catch(() => {});
    });
  } catch {}
}

/**
 * Disconnects Google Calendar explicitly upon user request
 */
export function disconnectGoogleCalendar() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GCAL_TOKEN_KEY);
  localStorage.removeItem(GCAL_EMAIL_KEY);
  localStorage.removeItem(GCAL_LAST_SYNC_KEY);
  localStorage.removeItem(GCAL_REFRESH_TOKEN_KEY);
  localStorage.removeItem(GCAL_LINKED_KEY);
  localStorage.removeItem(GCAL_EXPIRES_AT_KEY);
  localStorage.removeItem(GCAL_NEEDS_REAUTH_KEY);
  localStorage.setItem("tabe_gcal_explicitly_disconnected", "true");

  try {
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.auth.updateUser({
        data: {
          gcal_linked: false,
        },
      }).catch(() => {});
    });
  } catch {}
}

/**
 * Silently refreshes the Google access token using Supabase session refresh.
 * Returns the new token or null if refresh failed.
 */
let _refreshPromise: Promise<string | null> | null = null;
export async function refreshGoogleToken(): Promise<string | null> {
  // Deduplicate concurrent refresh calls
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      // Lazy-import supabase to avoid circular deps
      const { supabase } = await import("@/integrations/supabase/client");

      // First check if current session has provider_token
      const { data: currentData } = await supabase.auth.getSession();
      if (currentData?.session?.provider_token) {
        const pToken = currentData.session.provider_token;
        setStoredGoogleToken(
          pToken,
          currentData.session.user?.email,
          currentData.session.provider_refresh_token ?? undefined,
          currentData.session.expires_in
        );
        return pToken;
      }

      // Then attempt session refresh
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data?.session) {
        if (data.session.provider_token) {
          const newToken = data.session.provider_token;
          setStoredGoogleToken(
            newToken,
            data.session.user?.email,
            data.session.provider_refresh_token ?? undefined,
            data.session.expires_in
          );
          return newToken;
        }
      }

      // Check if session in storage was refreshed
      const recovered = extractAndStoreTokenFromUrl();
      if (recovered) return recovered;
    } catch (e) {
      console.warn("Google token refresh failed:", e);
    }
    return null;
  })().finally(() => { _refreshPromise = null; });

  return _refreshPromise;
}

/**
 * A fetch wrapper that automatically retries once with a fresh token on 401.
 * NEVER destroys user connection or wipes credentials on transient 401.
 */
async function fetchWithAutoRefresh(
  url: string,
  init: RequestInit
): Promise<Response> {
  let res = await fetch(url, init);
  if (res.status === 401) {
    const newToken = await refreshGoogleToken();
    if (newToken) {
      const newHeaders = {
        ...(init.headers as Record<string, string>),
        Authorization: `Bearer ${newToken}`,
      };
      res = await fetch(url, { ...init, headers: newHeaders });
    }
    if (res.status === 401) {
      // Token expired and automatic background refresh is unavailable.
      // DO NOT DISCONNECT OR WIPE USER STORAGE!
      // Simply flag that re-auth is needed for live sync.
      if (typeof window !== "undefined") {
        localStorage.setItem(GCAL_NEEDS_REAUTH_KEY, "true");
      }
    }
  }
  return res;
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

export function stripGoogleEventId(notas?: string | null): string {
  if (!notas) return "";
  return notas.replace(/\[gcal_id:[^\]]+\]/g, "").trim();
}

/**
 * Strips all internal system and database tags ([gcal_id:...], [status:...], and leading calendar brackets)
 * leaving only real human notes for clean display across the UI.
 */
export function cleanDisplayNotes(notas?: string | null): string {
  if (!notas) return "";
  let clean = stripGoogleEventId(notas);
  clean = clean.replace(/\[status:\w+\]/g, "");
  clean = clean.replace(/^\[[^\]]+\]\s*/g, "");
  return clean.trim();
}

/**
 * Injects or updates Google Event ID inside notes
 */
export function injectGoogleEventId(notas: string | null | undefined, gcalId: string): string {
  const clean = stripGoogleEventId(notas);
  return clean ? `${clean} [gcal_id:${gcalId}]` : `[gcal_id:${gcalId}]`;
}

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
  let token = getStoredGoogleToken();
  if (!token) {
    token = await refreshGoogleToken();
  }
  if (!token) {
    return { error: "No hay sesión de Google Calendar activa" };
  }

  const existingGcalId = extractGoogleEventId(event.notas);
  const resource = mapTabeEventToGoogleResource(event);

  try {
    let response: Response;

    if (existingGcalId) {
      // Update existing Google event
      response = await fetchWithAutoRefresh(`${GCAL_API_BASE}/${existingGcalId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resource),
      });

      // If event was deleted or not found in Google (404/410), do not resurrect it with a blind POST
      if (response.status === 404 || response.status === 410) {
        return { error: "El evento ya no existe en Google Calendar" };
      }
    } else {
      const rawDate = (event.fecha || "").split("T")[0] || toLocalDateStr(new Date());
      const cleanTitle = (event.titulo || "").trim();

      // Pre-check if an event with the exact title and date already exists in primary Google Calendar
      try {
        const checkMin = `${rawDate}T00:00:00Z`;
        const checkMax = `${rawDate}T23:59:59Z`;
        const checkUrl = `${GCAL_API_BASE}?timeMin=${encodeURIComponent(checkMin)}&timeMax=${encodeURIComponent(checkMax)}&q=${encodeURIComponent(cleanTitle)}&singleEvents=true`;
        const checkRes = await fetchWithAutoRefresh(checkUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          const existingMatch = (checkData.items || []).find(
            (it: any) =>
              it.status !== "cancelled" &&
              (it.summary || "").trim().toLowerCase() === cleanTitle.toLowerCase()
          );
          if (existingMatch?.id) {
            // Re-use existing Google event ID to prevent duplicate upload
            return { gcalId: existingMatch.id };
          }
        }
      } catch (checkErr) {
        console.warn("Could not check duplicate in Google Calendar:", checkErr);
      }

      // Create new event in Google
      response = await fetchWithAutoRefresh(GCAL_API_BASE, {
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
        return { error: "El token de Google expiró y no se pudo renovar automáticamente. Vuelve a conectar tu cuenta." };
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
  let token = getStoredGoogleToken();
  if (!token) {
    token = await refreshGoogleToken();
  }
  if (!token || !gcalId) return false;

  try {
    const res = await fetchWithAutoRefresh(`${GCAL_API_BASE}/${gcalId}`, {
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
    const res = await fetchWithAutoRefresh("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      console.warn("Google Calendar token expired or insufficient permissions even after refresh.");
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
  let token = getStoredGoogleToken();
  if (!token) {
    token = await refreshGoogleToken();
  }
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
        const res = await fetchWithAutoRefresh(url, {
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
          return { items: [], error: "Sesión de Google expirada y no se pudo renovar. Vuelve a conectar." };
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

let _isSyncInProgress = false;

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
  if (_isSyncInProgress) {
    console.log("[GoogleSync] Sincronización en curso, omitiendo llamada concurrente");
    return { success: true, pushedCount: 0, pulledCount: 0 };
  }
  _isSyncInProgress = true;

  try {
    let token = getStoredGoogleToken();
    if (!token) {
      token = await refreshGoogleToken();
    }
    if (!token) {
      return { success: false, pushedCount: 0, pulledCount: 0, error: "Conecta tu cuenta de Google primero" };
    }

    // 1. Fetch events from Google Calendar (from today onwards)
    const { items: googleEvents, error: fetchErr } = await fetchEventsFromGoogleCalendar();
    if (fetchErr) {
      return { success: false, pushedCount: 0, pulledCount: 0, error: fetchErr };
    }

    let pushedCount = 0;
    let pulledCount = 0;

    const todayStr = toLocalDateStr(new Date());

    // Index existing TABE events by gcal_id and title+date
    const tabeByGcalId = new Map<string, CalendarEvent>();
    const tabeByTitleDate = new Map<string, CalendarEvent>();

    for (const ev of params.tabeEvents) {
      const gcalId = extractGoogleEventId(ev.notas);
      if (gcalId) {
        tabeByGcalId.set(gcalId, ev);
      }
      const evDate = (ev.fecha || "").split("T")[0];
      tabeByTitleDate.set(`${ev.titulo.trim().toLowerCase()}_${evDate}`, ev);
    }

    // Index Google events by ID and title+date
    const googleById = new Map<string, any>();
    const googleByTitleDate = new Map<string, any>();

    for (const gEv of googleEvents) {
      if (gEv.id && gEv.status !== "cancelled") {
        googleById.set(gEv.id, gEv);
        const startDt = gEv.start?.dateTime || gEv.start?.date;
        if (startDt) {
          const dPart = String(startDt).split("T")[0];
          const tNorm = (gEv.summary || "").trim().toLowerCase();
          if (tNorm && dPart) {
            googleByTitleDate.set(`${tNorm}_${dPart}`, gEv);
          }
        }
      }
    }

    // STEP A: PUSH TABE events to Google Calendar if not yet in Google
    for (const tEvent of params.tabeEvents) {
      // Ignore virtual recurring instances since the parent event handles it
      if (tEvent.isVirtual) continue;

      const eventDate = (tEvent.fecha || "").split("T")[0];
      // CRITICAL: Do NOT push past events to Google Calendar during automated sync
      if (eventDate && eventDate < todayStr) {
        continue;
      }

      const gcalId = extractGoogleEventId(tEvent.notas);
      const titleNorm = (tEvent.titulo || "").trim().toLowerCase();
      const titleDateKey = `${titleNorm}_${eventDate}`;

      // If it already has a Google Calendar ID, it was already pushed/synced before.
      if (gcalId) {
        continue;
      }

      // Check if an event with identical title and date already exists in Google Calendar!
      const existingInGoogle = googleByTitleDate.get(titleDateKey);
      if (existingInGoogle?.id) {
        // Link it to TABE without uploading duplicate to Google!
        try {
          const newNotas = injectGoogleEventId(tEvent.notas, existingInGoogle.id);
          await params.updateTabeEvent(tEvent.id, { notas: newNotas }, { silent: true, skipRefetch: true });
          tabeByGcalId.set(existingInGoogle.id, { ...tEvent, notas: newNotas });
          tabeByTitleDate.set(titleDateKey, { ...tEvent, notas: newNotas });
        } catch (linkErr) {
          console.warn("Could not link existing Google event to TABE:", linkErr);
        }
        continue;
      }

      // Only push truly new future events that don't exist in Google Calendar
      try {
        const pushResult = await pushEventToGoogleCalendar(tEvent);
        if (pushResult.gcalId) {
          pushedCount++;
          // Update TABE event note with the new gcal_id silently
          const newNotas = injectGoogleEventId(tEvent.notas, pushResult.gcalId);
          await params.updateTabeEvent(tEvent.id, { notas: newNotas }, { silent: true, skipRefetch: true });
          tabeByGcalId.set(pushResult.gcalId, { ...tEvent, notas: newNotas });
          tabeByTitleDate.set(titleDateKey, { ...tEvent, notas: newNotas });
          googleById.set(pushResult.gcalId, { id: pushResult.gcalId, summary: tEvent.titulo });
          googleByTitleDate.set(titleDateKey, { id: pushResult.gcalId, summary: tEvent.titulo });
        }
      } catch (pushErr) {
        console.warn("Could not push event to Google Calendar:", tEvent.titulo, pushErr);
      }
    }

    // Cache for recurring master events
    const masterEventsCache = new Map<string, any>();
    const handledRecurringMasterIds = new Set<string>();

    async function getMasterRecurringEvent(calId: string, recurringEventId: string): Promise<any> {
      const cacheKey = `${calId}_${recurringEventId}`;
      if (masterEventsCache.has(cacheKey)) return masterEventsCache.get(cacheKey);
      try {
        const mRes = await fetchWithAutoRefresh(
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

          // Check if an existing recurring or single event with same title already exists in TABE
          const existingTabeMatch = params.tabeEvents.find(
            e => (e.titulo || "").trim().toLowerCase() === (master?.summary || title).trim().toLowerCase() &&
                 (e.recurrence_rule || (e.fecha || "").split("T")[0] === datePart)
          );
          if (existingTabeMatch) {
            handledRecurringMasterIds.add(recurringEventId);
            const newNotas = injectGoogleEventId(existingTabeMatch.notas, recurringEventId);
            await params.updateTabeEvent(existingTabeMatch.id, { notas: newNotas }, { silent: true, skipRefetch: true });
            tabeByGcalId.set(recurringEventId, { ...existingTabeMatch, notas: newNotas });
            continue;
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
  } finally {
    _isSyncInProgress = false;
  }
}
