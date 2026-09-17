/**
 * TABE - Google Calendar Bidirectional 2-Way Sync Service
 * Sincronización en tiempo real entre TABE y Google Calendar
 */

import { toast } from "sonner";
import { CalendarEvent, CreateEventData, EventType, getColorForType } from "@/hooks/useCalendarEvents";
import { toLocalDateStr } from "@/lib/utils";

export const GCAL_TOKEN_KEY = "tabe_google_calendar_token";
export const GCAL_EMAIL_KEY = "tabe_google_calendar_email";
export const GCAL_AUTO_SYNC_KEY = "tabe_gcal_auto_sync";
export const GCAL_LAST_SYNC_KEY = "tabe_gcal_last_sync";
export const GCAL_REFRESH_TOKEN_KEY = "tabe_google_calendar_refresh_token";
export const GCAL_LINKED_KEY = "tabe_google_calendar_linked";
export const GCAL_EXPIRES_AT_KEY = "tabe_google_calendar_expires_at";
export const GCAL_NEEDS_REAUTH_KEY = "tabe_google_calendar_needs_reauth";
export const GCAL_FEED_URL_KEY = "tabe_google_calendar_feed_url";

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
            const pToken =
              parsed?.provider_token ||
              parsed?.session?.provider_token ||
              parsed?.currentSession?.provider_token;
            const rToken =
              parsed?.provider_refresh_token ||
              parsed?.session?.provider_refresh_token ||
              parsed?.currentSession?.provider_refresh_token;
            const email =
              parsed?.user?.email ||
              parsed?.session?.user?.email ||
              parsed?.currentSession?.user?.email;
            const expIn =
              parsed?.expires_in ||
              parsed?.session?.expires_in;

            if (pToken && typeof pToken === "string" && pToken.length > 10) {
              setStoredGoogleToken(
                pToken,
                email,
                rToken || undefined,
                expIn
              );
              return pToken;
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
 * Gets the stored Google Calendar secret iCal feed URL (permanent, no token expiration)
 */
export function getStoredGoogleFeedUrl(userMetadata?: any): string | null {
  if (typeof window === "undefined") return null;
  const local = localStorage.getItem(GCAL_FEED_URL_KEY);
  if (local && local.trim().length > 10) return local.trim();
  if (userMetadata?.gcal_feed_url && typeof userMetadata.gcal_feed_url === "string") {
    try {
      localStorage.setItem(GCAL_FEED_URL_KEY, userMetadata.gcal_feed_url);
    } catch {}
    return userMetadata.gcal_feed_url.trim();
  }
  return null;
}

/**
 * Saves Google Calendar secret iCal feed URL to localStorage and Supabase Auth metadata
 */
export async function setStoredGoogleFeedUrl(url: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  if (!url) {
    localStorage.removeItem(GCAL_FEED_URL_KEY);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.auth.updateUser({
        data: {
          gcal_feed_url: null,
          gcal_last_sync: null,
        },
      });
    } catch {}
  } else {
    const clean = url.trim();
    localStorage.setItem(GCAL_FEED_URL_KEY, clean);
    localStorage.setItem(GCAL_LINKED_KEY, "true");
    localStorage.removeItem("tabe_gcal_explicitly_disconnected");
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.auth.updateUser({
        data: {
          gcal_feed_url: clean,
          gcal_linked: true,
          gcal_last_sync: new Date().toISOString(),
        },
      });
    } catch {}
  }
}

/**
 * Checks if Google Calendar is connected (via permanent iCal feed, OAuth token, or linked metadata)
 */
export function isGoogleCalendarConnected(user?: any): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem("tabe_gcal_explicitly_disconnected") === "true") {
    return false;
  }

  // 1. Permanent iCal Feed (Top reliability, zero token expiration)
  const feedUrl = getStoredGoogleFeedUrl(user?.user_metadata);
  if (feedUrl && feedUrl.trim().length > 10) return true;

  // 2. Direct OAuth token
  const token = getStoredGoogleToken();
  if (token && token.trim().length > 10) return true;

  // 3. Linked flag in localStorage or user_metadata or logged in with Google provider
  const isLinked =
    localStorage.getItem(GCAL_LINKED_KEY) === "true" ||
    user?.user_metadata?.gcal_linked === true ||
    user?.app_metadata?.provider === "google" ||
    user?.app_metadata?.providers?.includes("google") ||
    user?.identities?.some((id: any) => id.provider === "google");

  if (isLinked) {
    return true;
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
  localStorage.removeItem(GCAL_FEED_URL_KEY);
  localStorage.setItem("tabe_gcal_explicitly_disconnected", "true");

  try {
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.auth.updateUser({
        data: {
          gcal_linked: false,
          gcal_feed_url: null,
          gcal_last_sync: null,
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
 * Normaliza el título de un evento para comparaciones seguras (sin tildes, minúsculas, sin corchetes de materias o calendarios)
 */
export function normalizeEventTitle(title: string): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remueve tildes y diacríticos
    .replace(/^\[[^\]]+\]\s*/, "") // Remueve tags entre corchetes ej: [Matemática], [Principal], [Tareas]
    .replace(/\[gcal_id:[^\]]+\]/g, "")
    .replace(/\[status:[^\]]+\]/g, "")
    .replace(/[^\w\s]/gi, "") // Remueve signos de puntuación y símbolos
    .replace(/\s+/g, " ") // Colapsa espacios múltiples
    .trim();
}

/**
 * Normaliza la hora a formato HH:mm o 'allday'
 */
export function normalizeEventTime(hora: string | null | undefined, isAllDay?: boolean): string {
  if (isAllDay || !hora || hora === "allday") return "allday";
  const clean = hora.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const h = match[1].padStart(2, "0");
    const m = match[2];
    return `${h}:${m}`;
  }
  return clean.substring(0, 5);
}

/**
 * Genera una clave unívoca para matching estricto de eventos: título normalizado + fecha + hora
 */
export function buildEventMatchKey(
  title: string,
  date: string,
  hora?: string | null | undefined,
  isAllDay?: boolean
): string {
  const t = normalizeEventTitle(title);
  const d = (date || "").split("T")[0];
  const h = normalizeEventTime(hora, isAllDay);
  return `${t}___${d}___${h}`;
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

    // If calendarList endpoint is not accessible or returns 401/403 (e.g. token only has calendar.events scope),
    // always fall back to the primary calendar rather than failing or returning empty list.
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

  // Traer eventos desde hace 60 días para cubrir todo el mes actual y parciales recientes
  const pastWindow = new Date();
  pastWindow.setDate(pastWindow.getDate() - 60);
  pastWindow.setHours(0, 0, 0, 0);
  const timeMin = options?.timeMin || pastWindow.toISOString();

  // Look ahead 1 year
  const oneYearAhead = new Date();
  oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);
  const timeMax = options?.timeMax || oneYearAhead.toISOString();

  const feedUrl = getStoredGoogleFeedUrl();

  // If no live token available, attempt seamless read from permanent iCal feed if configured
  if (!token) {
    if (feedUrl) {
      try {
        const icsText = await fetchGoogleCalendarIcs(feedUrl);
        const parsed = parseGoogleCalendarIcs(icsText);
        const items = parsed.map(p => ({
          id: p.uid,
          summary: p.title,
          description: p.description,
          location: p.location,
          start: p.time ? { dateTime: `${p.date}T${p.time}:00` } : { date: p.date },
          end: p.endTime ? { dateTime: `${p.date}T${p.endTime}:00` } : undefined,
          status: "confirmed",
        }));
        return { items };
      } catch (icsErr) {
        console.warn("Error leyendo calendario de Google vía iCal feed:", icsErr);
      }
    }
    return { items: [], error: "Google Calendar no conectado" };
  }

  try {
    const rawCalendars = await fetchUserCalendarList(token);
    const calendars = rawCalendars && rawCalendars.length > 0
      ? rawCalendars
      : [{ id: "primary", summary: "Principal", primary: true }];

    const allItems: any[] = [];
    const seenIds = new Set<string>();
    let primary401 = false;

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
          if (cal.id === "primary" || cal.primary) {
            primary401 = true;
          }
        }
      } catch (calErr) {
        console.warn(`Error fetching events for calendar ${cal.summary}:`, calErr);
      }
    }

    if (allItems.length > 0) {
      return { items: allItems };
    }

    // If primary returned 401, check if we can fall back to permanent iCal feed
    if (primary401) {
      if (typeof window !== "undefined") {
        localStorage.setItem(GCAL_NEEDS_REAUTH_KEY, "true");
      }
      if (feedUrl) {
        try {
          const icsText = await fetchGoogleCalendarIcs(feedUrl);
          const parsed = parseGoogleCalendarIcs(icsText);
          const items = parsed.map(p => ({
            id: p.uid,
            summary: p.title,
            description: p.description,
            location: p.location,
            start: p.time ? { dateTime: `${p.date}T${p.time}:00` } : { date: p.date },
            end: p.endTime ? { dateTime: `${p.date}T${p.endTime}:00` } : undefined,
            status: "confirmed",
          }));
          return { items };
        } catch {}
      }
      return { items: [], error: "La sesión de Google Calendar ha expirado. Vuelve a iniciar sesión con Google o usa el enlace permanente iCal (sin caducidad)." };
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
    const feedUrl = getStoredGoogleFeedUrl();

    if (!token && !feedUrl) {
      return { success: false, pushedCount: 0, pulledCount: 0, error: "Conecta tu Google Calendar primero" };
    }

    // If using permanent iCal feed (no OAuth token available)
    if (!token && feedUrl) {
      const icsText = await fetchGoogleCalendarIcs(feedUrl);
      const parsed = parseGoogleCalendarIcs(icsText);
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const res = await syncGoogleIcsToTabe(user.id, parsed);
        if (params.refetchEvents) await params.refetchEvents();
        return {
          success: true,
          pushedCount: 0,
          pulledCount: res.added + res.updated,
        };
      }
    }

    // 1. Fetch events from Google Calendar (from today onwards)
    const { items: googleEvents, error: fetchErr } = await fetchEventsFromGoogleCalendar();
    if (fetchErr) {
      return { success: false, pushedCount: 0, pulledCount: 0, error: fetchErr };
    }

    let pushedCount = 0;
    let pulledCount = 0;

    const todayStr = toLocalDateStr(new Date());

    // Index existing TABE events by gcal_id and by normalized matchKey (title + date + time)
    const tabeByGcalId = new Map<string, CalendarEvent>();
    const tabeByMatchKey = new Map<string, CalendarEvent[]>();
    const tabeByDateTitle = new Map<string, CalendarEvent[]>();

    for (const ev of params.tabeEvents) {
      if (ev.isVirtual) continue;
      const gcalId = extractGoogleEventId(ev.notas);
      if (gcalId) {
        tabeByGcalId.set(gcalId, ev);
      }
      const evDate = (ev.fecha || "").split("T")[0];
      const matchKey = buildEventMatchKey(ev.titulo, evDate, ev.hora, ev.is_all_day);
      const dateTitleKey = `${normalizeEventTitle(ev.titulo)}___${evDate}`;

      const listM = tabeByMatchKey.get(matchKey) || [];
      listM.push(ev);
      tabeByMatchKey.set(matchKey, listM);

      const listD = tabeByDateTitle.get(dateTitleKey) || [];
      listD.push(ev);
      tabeByDateTitle.set(dateTitleKey, listD);
    }

    // Index Google events by ID and by normalized matchKey (title + date + time)
    const googleById = new Map<string, any>();
    const googleByMatchKey = new Map<string, any[]>();
    const googleByDateTitle = new Map<string, any[]>();

    for (const gEv of googleEvents) {
      if (gEv.id && gEv.status !== "cancelled") {
        googleById.set(gEv.id, gEv);
        const startDt = gEv.start?.dateTime || gEv.start?.date;
        if (startDt) {
          const dPart = String(startDt).split("T")[0];
          const isAllDay = !gEv.start?.dateTime;
          let gHora: string | undefined = undefined;
          if (!isAllDay && gEv.start?.dateTime) {
            try {
              const d = new Date(gEv.start.dateTime);
              if (!isNaN(d.getTime())) {
                gHora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
              }
            } catch {}
          }
          const gMatchKey = buildEventMatchKey(gEv.summary || "", dPart, gHora, isAllDay);
          const gDateTitleKey = `${normalizeEventTitle(gEv.summary || "")}___${dPart}`;

          const listM = googleByMatchKey.get(gMatchKey) || [];
          listM.push(gEv);
          googleByMatchKey.set(gMatchKey, listM);

          const listD = googleByDateTitle.get(gDateTitleKey) || [];
          listD.push(gEv);
          googleByDateTitle.set(gDateTitleKey, listD);
        }
      }
    }

    // STEP A: PUSH TABE events to Google Calendar ONLY if not yet in Google Calendar
    for (const tEvent of params.tabeEvents) {
      if (tEvent.isVirtual) continue;

      const pastLimit = new Date();
      pastLimit.setDate(pastLimit.getDate() - 60);
      const minDateStr = toLocalDateStr(pastLimit);
      if (eventDate && eventDate < minDateStr) continue;

      const gcalId = extractGoogleEventId(tEvent.notas);
      const matchKey = buildEventMatchKey(tEvent.titulo, eventDate, tEvent.hora, tEvent.is_all_day);
      const dateTitleKey = `${normalizeEventTitle(tEvent.titulo)}___${eventDate}`;

      // If it already has a Google Calendar ID that exists in Google, it's synced
      if (gcalId && googleById.has(gcalId)) {
        continue;
      }

      // Check if an event with identical title and date/time already exists in Google Calendar!
      const existingInGoogle = googleByMatchKey.get(matchKey)?.[0] || googleByDateTitle.get(dateTitleKey)?.[0];
      if (existingInGoogle?.id) {
        // Link it to TABE without uploading duplicate to Google!
        try {
          const newNotas = injectGoogleEventId(tEvent.notas, existingInGoogle.id);
          await params.updateTabeEvent(tEvent.id, { notas: newNotas }, { silent: true, skipRefetch: true });
          tabeByGcalId.set(existingInGoogle.id, { ...tEvent, notas: newNotas });
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
          const newNotas = injectGoogleEventId(tEvent.notas, pushResult.gcalId);
          await params.updateTabeEvent(tEvent.id, { notas: newNotas }, { silent: true, skipRefetch: true });
          tabeByGcalId.set(pushResult.gcalId, { ...tEvent, notas: newNotas });
          googleById.set(pushResult.gcalId, { id: pushResult.gcalId, summary: tEvent.titulo });
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

    // STEP B: PULL events from Google Calendar into TABE, ensuring NO DUPLICATES and deleting TABE duplicates
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
          if (handledRecurringMasterIds.has(recurringEventId)) {
            continue;
          }
          if (tabeByGcalId.has(recurringEventId)) {
            handledRecurringMasterIds.add(recurringEventId);
            continue;
          }

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
            e => normalizeEventTitle(e.titulo) === normalizeEventTitle(master?.summary || title) &&
                 (e.recurrence_rule || (e.fecha || "").split("T")[0] === datePart)
          );
          if (existingTabeMatch) {
            handledRecurringMasterIds.add(recurringEventId);
            const newNotas = injectGoogleEventId(existingTabeMatch.notas, recurringEventId);
            await params.updateTabeEvent(existingTabeMatch.id, { notas: newNotas }, { silent: true, skipRefetch: true });
            tabeByGcalId.set(recurringEventId, { ...existingTabeMatch, notas: newNotas });
            continue;
          }

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

        // --- CASE 2: SINGLE EVENT (CON PREVALENCIA DE GOOGLE Y ELIMINACIÓN DE DUPLICADOS EN TABE) ---
        const matchKey = buildEventMatchKey(title, datePart, hora, isAllDay);
        const dateTitleKey = `${normalizeEventTitle(title)}___${datePart}`;

        const matchesByMatchKey = tabeByMatchKey.get(matchKey) || [];
        const matchesByDateTitle = tabeByDateTitle.get(dateTitleKey) || [];
        const candidates = matchesByMatchKey.length > 0 ? matchesByMatchKey : matchesByDateTitle;

        const alreadyByGcalId = tabeByGcalId.get(gcalId);
        const primaryMatch = alreadyByGcalId || (candidates.length > 0 ? candidates[0] : null);

        if (primaryMatch) {
          // El evento ya existe en TABE: actualizar datos y vincular el ID de Google Calendar
          const newNotas = injectGoogleEventId(primaryMatch.notas || gEv.description, gcalId);
          await params.updateTabeEvent(primaryMatch.id, {
            titulo: title,
            fecha: datePart,
            hora: hora || undefined,
            hora_fin: hora_fin || undefined,
            ubicacion: gEv.location || primaryMatch.ubicacion || undefined,
            notas: newNotas,
            is_all_day: isAllDay,
          }, { silent: true, skipRefetch: true });

          tabeByGcalId.set(gcalId, { ...primaryMatch, notas: newNotas });

          // REGLA CRÍTICA: Eliminar de TABE todos los duplicados adicionales que tengan el mismo nombre y fecha/hora
          if (candidates.length > 1) {
            try {
              const { supabase } = await import("@/integrations/supabase/client");
              for (let i = 0; i < candidates.length; i++) {
                const dupTabe = candidates[i];
                if (dupTabe.id !== primaryMatch.id) {
                  await supabase.from("calendar_events").delete().eq("id", dupTabe.id);
                  console.log(`[GoogleSync] Duplicado de TABE eliminado a favor de Google Calendar: ${dupTabe.titulo} (${dupTabe.id})`);
                }
              }
            } catch (delErr) {
              console.warn("Error eliminando duplicado de TABE:", delErr);
            }
          }
        } else {
          // Completamente nuevo desde Google Calendar: crear en TABE
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

    // Auto-limpieza profunda de duplicados para asegurar que TABE y Google Calendar queden idénticos y sin repeticiones
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await cleanupDuplicateEvents(user.id);
      }
    } catch (cleanErr) {
      console.warn("Auto duplicate cleanup error:", cleanErr);
    }

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

// ============================================================================
// PERMANENT GOOGLE CALENDAR iCAL SYNC (Como Moodle - Sin Vencimiento Jamás)
// ============================================================================

export interface ParsedGoogleIcsEvent {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  endDate?: string;
  endTime?: string;
  isAllDay: boolean;
  recurrenceRule?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | null;
  recurrenceEnd?: string | null;
  tipoExamen: EventType;
}

function unescapeIcsString(text: string): string {
  return text
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseGoogleIcsDateTime(line: string): { date: string; time?: string; isAllDay: boolean } {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return { date: "", isAllDay: true };

  const value = line.substring(colonIndex + 1).trim();

  // All-day date format: YYYYMMDD
  if (/^\d{8}$/.test(value)) {
    const y = value.substring(0, 4);
    const m = value.substring(4, 6);
    const d = value.substring(6, 8);
    return { date: `${y}-${m}-${d}`, isAllDay: true };
  }

  // DateTime format with UTC 'Z': YYYYMMDDTHHMMSSZ -> convert to local time
  if (value.includes("T") && value.endsWith("Z")) {
    const clean = value.replace("Z", "");
    const parts = clean.split("T");
    const dPart = parts[0];
    const tPart = parts[1];
    if (dPart.length === 8 && tPart.length >= 4) {
      const y = parseInt(dPart.substring(0, 4), 10);
      const m = parseInt(dPart.substring(4, 6), 10) - 1;
      const d = parseInt(dPart.substring(6, 8), 10);
      const hh = parseInt(tPart.substring(0, 2), 10);
      const mm = parseInt(tPart.substring(2, 4), 10);
      const ss = tPart.length >= 6 ? parseInt(tPart.substring(4, 6), 10) : 0;

      const utcDate = new Date(Date.UTC(y, m, d, hh, mm, ss));
      if (!isNaN(utcDate.getTime())) {
        const localY = utcDate.getFullYear();
        const localM = String(utcDate.getMonth() + 1).padStart(2, "0");
        const localD = String(utcDate.getDate()).padStart(2, "0");
        const localH = String(utcDate.getHours()).padStart(2, "0");
        const localMin = String(utcDate.getMinutes()).padStart(2, "0");
        return {
          date: `${localY}-${localM}-${localD}`,
          time: `${localH}:${localMin}`,
          isAllDay: false,
        };
      }
    }
  }

  // Local / Floating DateTime: YYYYMMDDTHHMMSS
  if (value.includes("T")) {
    const parts = value.split("T");
    const dPart = parts[0];
    const tPart = parts[1];
    if (dPart.length === 8 && tPart.length >= 4) {
      const y = dPart.substring(0, 4);
      const m = dPart.substring(4, 6);
      const d = dPart.substring(6, 8);
      const hh = tPart.substring(0, 2);
      const mm = tPart.substring(2, 4);
      return {
        date: `${y}-${m}-${d}`,
        time: `${hh}:${mm}`,
        isAllDay: false,
      };
    }
  }

  return { date: "", isAllDay: true };
}

function deduceGoogleEventType(title: string): EventType {
  const lower = title.toLowerCase();
  if (lower.includes("parcial 1") || lower.includes("1er parcial") || lower.includes("primer parcial") || lower.includes("p1")) return "P1";
  if (lower.includes("parcial 2") || lower.includes("2do parcial") || lower.includes("segundo parcial") || lower.includes("p2")) return "P2";
  if (lower.includes("final")) return "Final";
  if (lower.includes("recuperatorio") || lower.includes("recu")) return "Recuperatorio P1";
  if (lower.includes("entrega") || lower.includes("tp") || lower.includes("laboratorio")) return "Entrega";
  if (lower.includes("clase") || lower.includes("teorica") || lower.includes("teórica") || lower.includes("practica") || lower.includes("práctica") || lower.includes("virtual")) return "Clase";
  if (lower.includes("estudio") || lower.includes("repaso")) return "Estudio";
  return "Otro";
}

/**
 * Fetches Google Calendar secret iCal content via secure proxy
 */
export async function fetchGoogleCalendarIcs(feedUrl: string): Promise<string> {
  const cleanUrl = feedUrl.trim().replace(/^webcal:\/\//i, "https://");
  const proxyEndpoint = `/api/moodle-calendar?url=${encodeURIComponent(cleanUrl)}`;

  const response = await fetch(proxyEndpoint);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "No se pudo conectar con los servidores de Google Calendar.");
  }

  const icsText = await response.text();
  if (!icsText.includes("BEGIN:VCALENDAR")) {
    throw new Error("El enlace proporcionado no es un calendario iCal válido de Google.");
  }

  return icsText;
}

/**
 * Parses Google Calendar iCal text into structured events
 */
export function parseGoogleCalendarIcs(icsContent: string): ParsedGoogleIcsEvent[] {
  const events: ParsedGoogleIcsEvent[] = [];
  const lines = icsContent.split(/\r?\n/);
  const unfolded: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    while (i + 1 < lines.length && (lines[i + 1].startsWith(" ") || lines[i + 1].startsWith("\t"))) {
      i++;
      line += lines[i].substring(1);
    }
    unfolded.push(line);
  }

  let currentEvent: any = null;

  for (let i = 0; i < unfolded.length; i++) {
    const line = unfolded[i];

    if (line.startsWith("BEGIN:VEVENT")) {
      currentEvent = {};
      continue;
    }

    if (line.startsWith("END:VEVENT") && currentEvent) {
      if (currentEvent.status !== "CANCELLED" && currentEvent.title && currentEvent.date) {
        let recurrenceRule: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | null = null;
        let recurrenceEnd: string | null = null;

        if (currentEvent.rrule) {
          if (currentEvent.rrule.includes("FREQ=DAILY")) recurrenceRule = "DAILY";
          else if (currentEvent.rrule.includes("FREQ=WEEKLY")) recurrenceRule = "WEEKLY";
          else if (currentEvent.rrule.includes("FREQ=MONTHLY")) recurrenceRule = "MONTHLY";
          else if (currentEvent.rrule.includes("FREQ=YEARLY")) recurrenceRule = "YEARLY";

          const untilMatch = currentEvent.rrule.match(/UNTIL=([0-9]{4})([0-9]{2})([0-9]{2})/);
          if (untilMatch) {
            recurrenceEnd = `${untilMatch[1]}-${untilMatch[2]}-${untilMatch[3]}`;
          }
        }

        const tipo = deduceGoogleEventType(currentEvent.title);

        events.push({
          uid: currentEvent.uid || `gcal_ics_${Date.now()}_${Math.random()}`,
          title: currentEvent.title,
          description: currentEvent.description,
          location: currentEvent.location,
          date: currentEvent.date,
          time: currentEvent.time,
          endDate: currentEvent.endDate,
          endTime: currentEvent.endTime,
          isAllDay: currentEvent.isAllDay,
          recurrenceRule,
          recurrenceEnd,
          tipoExamen: tipo,
        });
      }
      currentEvent = null;
      continue;
    }

    if (!currentEvent) continue;

    if (line.startsWith("UID:")) {
      currentEvent.uid = line.substring(4).trim();
    } else if (line.startsWith("STATUS:")) {
      currentEvent.status = line.substring(7).trim().toUpperCase();
    } else if (line.startsWith("SUMMARY:") || line.startsWith("SUMMARY;")) {
      const val = line.substring(line.indexOf(":") + 1);
      currentEvent.title = unescapeIcsString(val);
    } else if (line.startsWith("DESCRIPTION:") || line.startsWith("DESCRIPTION;")) {
      const val = line.substring(line.indexOf(":") + 1);
      currentEvent.description = unescapeIcsString(val);
    } else if (line.startsWith("LOCATION:") || line.startsWith("LOCATION;")) {
      const val = line.substring(line.indexOf(":") + 1);
      currentEvent.location = unescapeIcsString(val);
    } else if (line.startsWith("RRULE:") || line.startsWith("RRULE;")) {
      currentEvent.rrule = line.substring(line.indexOf(":") + 1).trim();
    } else if (line.startsWith("DTSTART")) {
      const parsed = parseGoogleIcsDateTime(line);
      currentEvent.date = parsed.date;
      currentEvent.time = parsed.time;
      currentEvent.isAllDay = parsed.isAllDay;
    } else if (line.startsWith("DTEND")) {
      const parsed = parseGoogleIcsDateTime(line);
      currentEvent.endDate = parsed.date;
      currentEvent.endTime = parsed.time;
    }
  }

  return events;
}

/**
 * Synchronizes parsed Google Calendar iCal events directly into Supabase DB
 */
/**
 * Synchronizes parsed Google Calendar iCal events directly into Supabase DB
 */
export async function syncGoogleIcsToTabe(
  userId: string,
  events: ParsedGoogleIcsEvent[]
): Promise<{ added: number; updated: number }> {
  let added = 0;
  let updated = 0;

  if (!events || events.length === 0) {
    return { added: 0, updated: 0 };
  }

  const { supabase } = await import("@/integrations/supabase/client");

  // Fetch existing events for user
  const { data: existingEvents, error: fetchErr } = await supabase
    .from("calendar_events")
    .select("id, titulo, fecha, hora, hora_fin, notas, ubicacion, tipo_examen, is_all_day, recurrence_rule, recurrence_end")
    .eq("user_id", userId);

  if (fetchErr) {
    console.error("Error fetching existing calendar events for Google iCal sync:", fetchErr);
    return { added: 0, updated: 0 };
  }

  const gcalIdMap = new Map<string, any>();
  const matchKeyMap = new Map<string, any[]>();
  const dateTitleMap = new Map<string, any[]>();

  (existingEvents || []).forEach((ev) => {
    const gId = extractGoogleEventId(ev.notas);
    if (gId) {
      gcalIdMap.set(gId, ev);
    }
    const mKey = buildEventMatchKey(ev.titulo, ev.fecha, ev.hora, ev.is_all_day);
    const dtKey = `${normalizeEventTitle(ev.titulo)}___${ev.fecha}`;

    const listM = matchKeyMap.get(mKey) || [];
    listM.push(ev);
    matchKeyMap.set(mKey, listM);

    const listD = dateTitleMap.get(dtKey) || [];
    listD.push(ev);
    dateTitleMap.set(dtKey, listD);
  });

  const toInsert: any[] = [];
  const idsToDeleteFromTabe: string[] = [];

  for (const gEv of events) {
    const mKey = buildEventMatchKey(gEv.title, gEv.date, gEv.time, gEv.isAllDay);
    const dtKey = `${normalizeEventTitle(gEv.title)}___${gEv.date}`;

    const candidates = matchKeyMap.get(mKey) || dateTitleMap.get(dtKey) || [];
    const existing = gcalIdMap.get(gEv.uid) || (candidates.length > 0 ? candidates[0] : null);
    const notesWithId = injectGoogleEventId(gEv.description, gEv.uid);

    if (existing) {
      const changed =
        existing.fecha !== gEv.date ||
        existing.hora !== (gEv.time || null) ||
        existing.hora_fin !== (gEv.endTime || null) ||
        existing.titulo !== gEv.title ||
        existing.ubicacion !== (gEv.location || null) ||
        extractGoogleEventId(existing.notas) !== gEv.uid;

      if (changed) {
        const { error: updErr } = await supabase
          .from("calendar_events")
          .update({
            titulo: gEv.title,
            fecha: gEv.date,
            hora: gEv.time || null,
            hora_fin: gEv.endTime || null,
            ubicacion: gEv.location || null,
            notas: notesWithId,
            is_all_day: gEv.isAllDay,
            recurrence_rule: gEv.recurrenceRule || existing.recurrence_rule,
            recurrence_end: gEv.recurrenceEnd || existing.recurrence_end,
          })
          .eq("id", existing.id);

        if (!updErr) {
          updated++;
        }
      }

      // Si había duplicados en TABE con la misma clave, eliminarlos para que solo quede el de Google
      if (candidates.length > 1) {
        for (let i = 0; i < candidates.length; i++) {
          const dup = candidates[i];
          if (dup.id !== existing.id && !idsToDeleteFromTabe.includes(dup.id)) {
            idsToDeleteFromTabe.push(dup.id);
          }
        }
      }
    } else {
      toInsert.push({
        user_id: userId,
        titulo: gEv.title,
        fecha: gEv.date,
        hora: gEv.time || null,
        hora_fin: gEv.endTime || null,
        ubicacion: gEv.location || null,
        notas: notesWithId,
        tipo_examen: gEv.tipoExamen,
        is_all_day: gEv.isAllDay,
        recurrence_rule: gEv.recurrenceRule || null,
        recurrence_end: gEv.recurrenceEnd || null,
        color: getColorForType(gEv.tipoExamen),
      });
    }
  }

  // Eliminar duplicados de TABE encontrados durante la sincronización
  if (idsToDeleteFromTabe.length > 0) {
    try {
      await supabase.from("calendar_events").delete().in("id", idsToDeleteFromTabe).eq("user_id", userId);
      console.log(`[GoogleIcsSync] Eliminados ${idsToDeleteFromTabe.length} eventos duplicados de TABE.`);
    } catch (delErr) {
      console.warn("Error eliminando duplicados de TABE en iCal sync:", delErr);
    }
  }

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from("calendar_events").insert(toInsert);
    if (!insErr) {
      added = toInsert.length;
    }
  }

  // Limpieza automática profunda tras la sincronización
  try {
    await cleanupDuplicateEvents(userId);
  } catch (cleanErr) {
    console.warn("Auto cleanup error after iCal sync:", cleanErr);
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(GCAL_LAST_SYNC_KEY, new Date().toISOString());
  }

  return { added, updated };
}

/**
 * Direct OAuth background sync against Supabase
 */
export async function syncGoogleOAuthDirect(
  userId: string,
  token: string
): Promise<{ success: boolean; added: number; updated: number; message?: string }> {
  const { items: googleEvents, error: fetchErr } = await fetchEventsFromGoogleCalendar();
  if (fetchErr || !googleEvents) {
    const feedUrl = getStoredGoogleFeedUrl();
    if (feedUrl) {
      try {
        const icsText = await fetchGoogleCalendarIcs(feedUrl);
        const events = parseGoogleCalendarIcs(icsText);
        const res = await syncGoogleIcsToTabe(userId, events);
        return {
          success: true,
          added: res.added,
          updated: res.updated,
          message: `Google Calendar sincronizado: ${res.added} nuevos, ${res.updated} actualizados`,
        };
      } catch {}
    }
    return { success: false, added: 0, updated: 0, message: fetchErr || "Error al leer Google Calendar" };
  }

  const { supabase } = await import("@/integrations/supabase/client");

  const { data: existingEvents } = await supabase
    .from("calendar_events")
    .select("id, titulo, fecha, hora, hora_fin, notas, ubicacion, tipo_examen, is_all_day")
    .eq("user_id", userId);

  const gcalIdMap = new Map<string, any>();
  const matchKeyMap = new Map<string, any[]>();
  const dateTitleMap = new Map<string, any[]>();

  (existingEvents || []).forEach((ev) => {
    const gId = extractGoogleEventId(ev.notas);
    if (gId) gcalIdMap.set(gId, ev);

    const mKey = buildEventMatchKey(ev.titulo, ev.fecha, ev.hora, ev.is_all_day);
    const dtKey = `${normalizeEventTitle(ev.titulo)}___${ev.fecha}`;

    const listM = matchKeyMap.get(mKey) || [];
    listM.push(ev);
    matchKeyMap.set(mKey, listM);

    const listD = dateTitleMap.get(dtKey) || [];
    listD.push(ev);
    dateTitleMap.set(dtKey, listD);
  });

  let added = 0;
  let updated = 0;
  const toInsert: any[] = [];
  const idsToDeleteFromTabe: string[] = [];

  for (const gEv of googleEvents) {
    if (gEv.status === "cancelled") continue;
    const gcalId = gEv.id;
    const startDateTime = gEv.start?.dateTime || gEv.start?.date;
    if (!startDateTime) continue;

    const isAllDay = !gEv.start?.dateTime;
    const datePart = String(startDateTime).split("T")[0];
    if (!datePart) continue;

    let hora: string | null = null;
    let hora_fin: string | null = null;

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
    const mKey = buildEventMatchKey(title, datePart, hora, isAllDay);
    const dtKey = `${normalizeEventTitle(title)}___${datePart}`;

    const candidates = matchKeyMap.get(mKey) || dateTitleMap.get(dtKey) || [];
    const existing = gcalIdMap.get(gcalId) || (candidates.length > 0 ? candidates[0] : null);
    const notesWithId = injectGoogleEventId(gEv.description, gcalId);

    if (existing) {
      const changed =
        existing.fecha !== datePart ||
        existing.hora !== hora ||
        existing.hora_fin !== hora_fin ||
        existing.titulo !== title ||
        existing.ubicacion !== (gEv.location || null) ||
        extractGoogleEventId(existing.notas) !== gcalId;

      if (changed) {
        await supabase
          .from("calendar_events")
          .update({
            titulo: title,
            fecha: datePart,
            hora,
            hora_fin,
            ubicacion: gEv.location || null,
            notas: notesWithId,
            is_all_day: isAllDay,
          })
          .eq("id", existing.id);
        updated++;
      }

      // Si había duplicados en TABE con la misma clave, eliminarlos
      if (candidates.length > 1) {
        for (let i = 0; i < candidates.length; i++) {
          const dup = candidates[i];
          if (dup.id !== existing.id && !idsToDeleteFromTabe.includes(dup.id)) {
            idsToDeleteFromTabe.push(dup.id);
          }
        }
      }
    } else {
      const tipo = deduceGoogleEventType(title);
      toInsert.push({
        user_id: userId,
        titulo: title,
        fecha: datePart,
        hora,
        hora_fin,
        ubicacion: gEv.location || null,
        notas: notesWithId,
        tipo_examen: tipo,
        is_all_day: isAllDay,
        color: getColorForType(tipo),
      });
    }
  }

  // Eliminar duplicados de TABE
  if (idsToDeleteFromTabe.length > 0) {
    try {
      await supabase.from("calendar_events").delete().in("id", idsToDeleteFromTabe).eq("user_id", userId);
      console.log(`[GoogleOAuthSync] Eliminados ${idsToDeleteFromTabe.length} duplicados de TABE.`);
    } catch (delErr) {
      console.warn("Error eliminando duplicados de TABE en OAuth sync:", delErr);
    }
  }

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from("calendar_events").insert(toInsert);
    if (!insErr) added = toInsert.length;
  }

  // FASE PUSH (TABE -> Google Calendar): Subir eventos creados en TABE que aún no estén en Google
  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const minDateStr = toLocalDateStr(sixtyDaysAgo);

    const googleIdsSet = new Set(googleEvents.map((g: any) => g.id).filter(Boolean));

    for (const tEvent of existingEvents || []) {
      const evDate = (tEvent.fecha || "").split("T")[0];
      if (evDate && evDate < minDateStr) continue;

      const gcalId = extractGoogleEventId(tEvent.notas);
      if (gcalId && googleIdsSet.has(gcalId)) {
        continue;
      }

      // Verificar si ya existe un evento idéntico en Google Calendar para evitar duplicar
      const matchKey = buildEventMatchKey(tEvent.titulo, evDate, tEvent.hora, tEvent.is_all_day);
      const dtKey = `${normalizeEventTitle(tEvent.titulo)}___${evDate}`;
      const existingInGoogle = googleEvents.find((gEv: any) => {
        if (gEv.status === "cancelled") return false;
        const startDt = gEv.start?.dateTime || gEv.start?.date;
        if (!startDt) return false;
        const gDate = String(startDt).split("T")[0];
        const isAllDay = !gEv.start?.dateTime;
        let gHora: string | undefined = undefined;
        if (!isAllDay && gEv.start?.dateTime) {
          try {
            const d = new Date(gEv.start.dateTime);
            if (!isNaN(d.getTime())) {
              gHora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
            }
          } catch {}
        }
        return (
          buildEventMatchKey(gEv.summary || "", gDate, gHora, isAllDay) === matchKey ||
          `${normalizeEventTitle(gEv.summary || "")}___${gDate}` === dtKey
        );
      });

      if (existingInGoogle?.id) {
        const newNotas = injectGoogleEventId(tEvent.notas, existingInGoogle.id);
        await supabase.from("calendar_events").update({ notas: newNotas }).eq("id", tEvent.id);
        googleIdsSet.add(existingInGoogle.id);
        continue;
      }

      // Subir evento nuevo a Google Calendar
      const pushRes = await pushEventToGoogleCalendar({
        id: tEvent.id,
        titulo: tEvent.titulo,
        fecha: tEvent.fecha,
        hora: tEvent.hora,
        hora_fin: tEvent.hora_fin,
        notas: tEvent.notas,
        ubicacion: tEvent.ubicacion,
        is_all_day: tEvent.is_all_day,
      });

      if (pushRes.gcalId) {
        const newNotas = injectGoogleEventId(tEvent.notas, pushRes.gcalId);
        await supabase.from("calendar_events").update({ notas: newNotas }).eq("id", tEvent.id);
        googleIdsSet.add(pushRes.gcalId);
      }
    }
  } catch (pushErr) {
    console.warn("[GoogleOAuthSync] Error en fase push a Google Calendar:", pushErr);
  }

  // Limpieza automática profunda tras la sincronización
  try {
    await cleanupDuplicateEvents(userId);
  } catch (cleanErr) {
    console.warn("Auto cleanup error after OAuth sync:", cleanErr);
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(GCAL_LAST_SYNC_KEY, new Date().toISOString());
  }

  return { success: true, added, updated };
}

/**
 * Universal background auto-sync function for Google Calendar.
 * Supports direct OAuth 2-way sync (top priority) and permanent iCal feed fallback.
 */
export async function performGoogleAutoSync(
  userId: string,
  userMetadata?: any
): Promise<{ success: boolean; added: number; updated: number; message?: string }> {
  // 1. Check direct OAuth token first (Best for true 2-way real-time bidirectional sync)
  let token = getStoredGoogleToken();
  if (!token) {
    token = await refreshGoogleToken();
  }
  if (token) {
    try {
      return await syncGoogleOAuthDirect(userId, token);
    } catch (err: any) {
      console.warn("Google OAuth sync error:", err);
    }
  }

  // 2. Fallback to Permanent iCal Feed if OAuth is not available
  const feedUrl = getStoredGoogleFeedUrl(userMetadata);
  if (feedUrl) {
    try {
      const icsText = await fetchGoogleCalendarIcs(feedUrl);
      const events = parseGoogleCalendarIcs(icsText);
      const res = await syncGoogleIcsToTabe(userId, events);
      return {
        success: true,
        added: res.added,
        updated: res.updated,
        message: `Google Calendar sincronizado: ${res.added} nuevos, ${res.updated} actualizados`,
      };
    } catch (err: any) {
      console.warn("Google iCal feed sync error:", err);
    }
  }

  return { success: false, added: 0, updated: 0, message: "Google Calendar no conectado" };
}

// ============================================================================
// HERRAMIENTA INTELIGENTE DE LIMPIEZA DE DUPLICADOS (TABE & GOOGLE CALENDAR)
// ============================================================================

export interface DuplicateCleanupResult {
  tabeDuplicatesRemoved: number;
  googleDuplicatesRemoved: number;
  remainingEventsCount: number;
}

/**
 * Identifica y elimina eventos duplicados en TABE y en Google Calendar (si está conectado vía OAuth).
 * PRIORIDAD: El evento proveniente de Google Calendar tiene prioridad absoluta sobre copias locales
 * de TABE. Si existen duplicados con el mismo título y fecha/hora, se preserva el de Google Calendar
 * (conservando la materia asignada si existía) y se eliminan las copias redundantes de TABE.
 */
export async function cleanupDuplicateEvents(
  userId: string
): Promise<DuplicateCleanupResult> {
  const { supabase } = await import("@/integrations/supabase/client");

  // 1. Obtener todos los eventos del usuario de Supabase
  const { data: allEvents, error } = await supabase
    .from("calendar_events")
    .select("id, titulo, fecha, hora, hora_fin, notas, subject_id, ubicacion, is_all_day, created_at")
    .eq("user_id", userId);

  if (error || !allEvents) {
    throw new Error(error?.message || "No se pudieron consultar los eventos en la base de datos");
  }

  // 2. Agrupar por:
  // a) Clave primaria: buildEventMatchKey(titulo, fecha, hora, is_all_day)
  // b) Clave secundaria: normalizeEventTitle(titulo) + "___" + fecha
  // c) Por gcal_id directo
  const groups = new Map<string, any[]>();
  const gcalGroup = new Map<string, any[]>();
  const dateTitleGroups = new Map<string, any[]>();

  for (const ev of allEvents) {
    const strictKey = buildEventMatchKey(ev.titulo, ev.fecha, ev.hora, ev.is_all_day);
    const list = groups.get(strictKey) || [];
    list.push(ev);
    groups.set(strictKey, list);

    const normTitle = normalizeEventTitle(ev.titulo);
    const dateOnly = (ev.fecha || "").split("T")[0];
    const dtKey = `${normTitle}___${dateOnly}`;
    const dtList = dateTitleGroups.get(dtKey) || [];
    dtList.push(ev);
    dateTitleGroups.set(dtKey, dtList);

    const gId = extractGoogleEventId(ev.notas);
    if (gId) {
      const gList = gcalGroup.get(gId) || [];
      gList.push(ev);
      gcalGroup.set(gId, gList);
    }
  }

  const idsToDeleteFromTabe = new Set<string>();
  const gcalIdsToDelete = new Set<string>();
  const updatesToApply = new Map<string, { subject_id?: string; notas?: string }>();

  const processDuplicateGroup = (evList: any[]) => {
    const available = evList.filter((e) => !idsToDeleteFromTabe.has(e.id));
    if (available.length <= 1) return;

    // Regla de oro: PRIORIDAD ABSOLUTA AL EVENTO DE GOOGLE CALENDAR (+10000)
    // De este modo se borran los correspondientes de TABE y quedan los de Google Calendar
    available.sort((a, b) => {
      const gIdA = extractGoogleEventId(a.notas);
      const gIdB = extractGoogleEventId(b.notas);
      const scoreA = (gIdA ? 10000 : 0) + (a.subject_id ? 50 : 0) + (a.notas?.length || 0);
      const scoreB = (gIdB ? 10000 : 0) + (b.subject_id ? 50 : 0) + (b.notas?.length || 0);
      return scoreB - scoreA;
    });

    const winner = available[0];
    const winnerGId = extractGoogleEventId(winner.notas);

    // Si el ganador (por ej. importado de Google) no tenía subject_id y un duplicado de TABE sí lo tenía,
    // preservamos la materia en el ganador
    let subjectToPreserve = winner.subject_id;
    for (let i = 1; i < available.length; i++) {
      const dup = available[i];
      if (!subjectToPreserve && dup.subject_id) {
        subjectToPreserve = dup.subject_id;
      }
    }

    if (subjectToPreserve && subjectToPreserve !== winner.subject_id) {
      winner.subject_id = subjectToPreserve;
      updatesToApply.set(winner.id, {
        ...(updatesToApply.get(winner.id) || {}),
        subject_id: subjectToPreserve,
      });
    }

    // Marcar todas las copias restantes como duplicadas para eliminar de TABE
    for (let i = 1; i < available.length; i++) {
      const dup = available[i];
      idsToDeleteFromTabe.add(dup.id);

      const dupGId = extractGoogleEventId(dup.notas);
      // Solo si el duplicado tenía un gId DIFERENTE al del ganador, marcar para borrar en Google
      if (dupGId && dupGId !== winnerGId) {
        gcalIdsToDelete.add(dupGId);
      }
    }
  };

  // Procesar primero duplicados por mismo Google Event ID
  for (const [_, gList] of gcalGroup.entries()) {
    processDuplicateGroup(gList);
  }

  // Procesar duplicados por clave estricta (título + fecha + hora)
  for (const [_, evList] of groups.entries()) {
    processDuplicateGroup(evList);
  }

  // Procesar duplicados por título y fecha (si coinciden exactamente en fecha y título normalizado)
  for (const [_, dtList] of dateTitleGroups.entries()) {
    if (dtList.length > 1) {
      processDuplicateGroup(dtList);
    }
  }

  // Aplicar enriquecimientos a ganadores (por ej. subject_id transferido)
  for (const [winId, updateData] of updatesToApply.entries()) {
    if (!idsToDeleteFromTabe.has(winId)) {
      try {
        await supabase
          .from("calendar_events")
          .update(updateData)
          .eq("id", winId)
          .eq("user_id", userId);
      } catch (upErr) {
        console.warn("Error actualizando evento ganador:", winId, upErr);
      }
    }
  }

  let googleDuplicatesRemoved = 0;

  // 3. Si el usuario está conectado con Google Calendar OAuth, limpiar duplicados en Google Calendar
  let token = getStoredGoogleToken();
  if (!token) {
    token = await refreshGoogleToken();
  }

  if (token) {
    // A. Eliminar en Google los eventos de IDs sobrantes detectados
    for (const gId of gcalIdsToDelete) {
      try {
        const ok = await deleteEventFromGoogleCalendar(gId);
        if (ok) googleDuplicatesRemoved++;
      } catch (e) {
        console.warn("No se pudo eliminar evento en Google Calendar:", gId, e);
      }
    }

    // B. Explorar Google Calendar para detectar y eliminar duplicados directos en la API de Google
    try {
      const { items: googleEvents } = await fetchEventsFromGoogleCalendar();
      if (googleEvents && googleEvents.length > 0) {
        const gGroups = new Map<string, any[]>();
        for (const gEv of googleEvents) {
          if (gEv.status === "cancelled" || !gEv.id) continue;
          const gTitle = normalizeEventTitle(gEv.summary || "");
          const isAllDay = !gEv.start?.dateTime;
          const gDate = (gEv.start?.dateTime || gEv.start?.date || "").split("T")[0];
          const gTimeRaw = gEv.start?.dateTime ? gEv.start.dateTime.split("T")[1] : null;
          const gHour = normalizeEventTime(gTimeRaw, isAllDay);
          const gKey = `${gTitle}___${gDate}___${gHour}`;

          const gList = gGroups.get(gKey) || [];
          gList.push(gEv);
          gGroups.set(gKey, gList);
        }

        for (const [_, gList] of gGroups.entries()) {
          if (gList.length > 1) {
            // Mantener el primer evento de Google, borrar las copias redundantes en Google Calendar
            for (let i = 1; i < gList.length; i++) {
              const dupG = gList[i];
              if (!gcalIdsToDelete.has(dupG.id)) {
                try {
                  const ok = await deleteEventFromGoogleCalendar(dupG.id);
                  if (ok) googleDuplicatesRemoved++;
                } catch (e) {
                  console.warn("No se pudo eliminar duplicado directo en Google:", dupG.id, e);
                }
              }
            }
          }
        }
      }
    } catch (gErr) {
      console.warn("Error buscando duplicados en Google Calendar:", gErr);
    }
  }

  // 4. Eliminar duplicados de Supabase (TABE)
  const finalIdsList = Array.from(idsToDeleteFromTabe);
  if (finalIdsList.length > 0) {
    for (let i = 0; i < finalIdsList.length; i += 100) {
      const chunk = finalIdsList.slice(i, i + 100);
      const { error: delErr } = await supabase
        .from("calendar_events")
        .delete()
        .in("id", chunk)
        .eq("user_id", userId);

      if (delErr) {
        console.error("Error al eliminar los duplicados en TABE:", delErr);
      }
    }
  }

  return {
    tabeDuplicatesRemoved: finalIdsList.length,
    googleDuplicatesRemoved,
    remainingEventsCount: Math.max(0, allEvents.length - finalIdsList.length),
  };
}

/**
 * Purga de forma masiva todos los eventos que coincidan con un patrón de texto (por ej. "gisela fabrega")
 * para el usuario actual en Supabase y opcionalmente en Google Calendar.
 */
export async function purgeEventsByTitle(
  userId: string,
  targetPattern: string,
  deleteFromGoogle: boolean = true
): Promise<{ deletedCount: number; googleDeletedCount: number }> {
  if (!userId || !targetPattern.trim()) {
    return { deletedCount: 0, googleDeletedCount: 0 };
  }

  const { supabase } = await import("@/integrations/supabase/client");
  const norm = (s: string) => (s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const target = norm(targetPattern);

  const { data: allEvents, error } = await supabase
    .from("calendar_events")
    .select("id, titulo, notas, fecha, hora")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message || "Error consultando los eventos para purgar");
  }

  const matching = (allEvents || []).filter((e) => norm(e.titulo).includes(target));
  const idsToDelete = matching.map((e) => e.id);
  let googleDeletedCount = 0;

  if (deleteFromGoogle) {
    const gcalIds: string[] = [];
    for (const ev of matching) {
      const gId = extractGoogleEventId(ev.notas);
      if (gId && !gcalIds.includes(gId)) {
        gcalIds.push(gId);
      }
    }

    for (const gId of gcalIds) {
      try {
        const ok = await deleteEventFromGoogleCalendar(gId);
        if (ok) googleDeletedCount++;
      } catch (err) {
        console.warn("Error borrando evento en Google Calendar durante purga:", gId, err);
      }
    }
  }

  if (idsToDelete.length > 0) {
    for (let i = 0; i < idsToDelete.length; i += 100) {
      const chunk = idsToDelete.slice(i, i + 100);
      const { error: delErr } = await supabase
        .from("calendar_events")
        .delete()
        .in("id", chunk)
        .eq("user_id", userId);

      if (delErr) {
        throw new Error("Error borrando eventos de Supabase: " + delErr.message);
      }
    }
  }

  return {
    deletedCount: idsToDelete.length,
    googleDeletedCount,
  };
}

