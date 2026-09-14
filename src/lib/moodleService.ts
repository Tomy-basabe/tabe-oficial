import { supabase } from "@/integrations/supabase/client";

export const MOODLE_SESSION_KEY = "tabe_moodle_session";
export const MOODLE_FEED_URL_KEY = "tabe_moodle_feed_url";
export const DEFAULT_CAMPUS_URL = "https://campusvirtual.frm.utn.edu.ar";

export interface MoodleSession {
  campusUrl: string;
  feedUrl?: string;
  token?: string;
  userId?: number | string;
  username?: string;
  fullname: string;
  sitename?: string;
  connectedAt: string;
  lastSync?: string;
}

export interface MoodleParsedEvent {
  uid: string;
  title: string;
  description?: string;
  courseName?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  endDate?: string;
  endTime?: string;
  tipoExamen: "entrega" | "parcial" | "final" | "recuperatorio" | "tp";
}

/**
 * Normaliza la URL base de Moodle removiendo barras finales
 */
export function normalizeCampusUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Obtiene la sesión actual de Moodle desde localStorage
 */
export function getStoredMoodleSession(): MoodleSession | null {
  try {
    const raw = localStorage.getItem(MOODLE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MoodleSession;
  } catch {
    return null;
  }
}

/**
 * Guarda la sesión de Moodle en localStorage
 */
export function setStoredMoodleSession(session: MoodleSession | null): void {
  if (!session) {
    localStorage.removeItem(MOODLE_SESSION_KEY);
  } else {
    localStorage.setItem(MOODLE_SESSION_KEY, JSON.stringify(session));
  }
}

/**
 * Desconecta la cuenta de Moodle
 */
export function disconnectMoodle(): void {
  localStorage.removeItem(MOODLE_SESSION_KEY);
  localStorage.removeItem(MOODLE_FEED_URL_KEY);
}

/**
 * Verifica si hay una sesión activa de Moodle guardada
 */
export function isMoodleConnected(): boolean {
  return !!getStoredMoodleSession();
}

/**
 * Limpia el nombre de una materia obtenido de las categorías de Moodle
 * Ej: "Redes de Datos.-Practica-2026" -> "Redes de Datos"
 */
export function cleanMoodleCourseName(raw: string): string {
  let name = raw.trim();
  // Quitar año al final ej: -2026, -2025
  name = name.replace(/[-_.]\d{4}$/, "");
  // Quitar sufijos comunes ej: .-Practica, -Teoria, -Comision X
  name = name.replace(/[-_.](Practica|Teoria|Comision|Catedra|Virtual).*$/i, "");
  // Quitar caracteres residuales al final
  name = name.replace(/[-_.]+$/, "").trim();
  return name || raw.trim();
}

/**
 * Descarga el archivo de calendario ICS desde la URL de exportación de Moodle
 * a través de nuestro endpoint proxy seguro
 */
export async function fetchMoodleIcs(feedUrl: string): Promise<string> {
  const cleanUrl = feedUrl.trim().replace(/^webcal:\/\//i, "https://");

  // Llamar a nuestro endpoint proxy (funciona en dev con Vite y en prod con Vercel)
  const proxyEndpoint = `/api/moodle-calendar?url=${encodeURIComponent(cleanUrl)}`;

  const response = await fetch(proxyEndpoint);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "No se pudo conectar con el servidor del campus.");
  }

  const icsText = await response.text();

  if (!icsText.includes("BEGIN:VCALENDAR")) {
    throw new Error("El enlace proporcionado no devolvió un calendario iCal válido.");
  }

  return icsText;
}

/**
 * Parsea el contenido ICS de Moodle y extrae materias y eventos
 */
export function parseMoodleIcs(icsContent: string): {
  events: MoodleParsedEvent[];
  courseNames: string[];
} {
  const events: MoodleParsedEvent[] = [];
  const courseNamesSet = new Set<string>();

  const lines = icsContent.split(/\r?\n/);
  let currentEvent: any = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Desplegar líneas largas (line folding)
    while (i + 1 < lines.length && (lines[i + 1].startsWith(" ") || lines[i + 1].startsWith("\t"))) {
      i++;
      line += lines[i].substring(1);
    }

    if (line.startsWith("BEGIN:VEVENT")) {
      currentEvent = {};
      continue;
    }

    if (line.startsWith("END:VEVENT") && currentEvent) {
      if (currentEvent.title && currentEvent.date) {
        const lowerTitle = currentEvent.title.toLowerCase();
        let tipo: "entrega" | "parcial" | "final" | "recuperatorio" | "tp" = "entrega";

        if (lowerTitle.includes("final")) {
          tipo = "final";
        } else if (lowerTitle.includes("recuperatorio")) {
          tipo = "recuperatorio";
        } else if (lowerTitle.includes("parcial") || lowerTitle.includes("examen")) {
          tipo = "parcial";
        } else if (lowerTitle.includes("tp") || lowerTitle.includes("trabajo practico") || lowerTitle.includes("trabajo práctico")) {
          tipo = "tp";
        }

        events.push({
          uid: currentEvent.uid || `moodle_${Date.now()}_${Math.random()}`,
          title: currentEvent.title,
          description: currentEvent.description,
          courseName: currentEvent.courseName,
          date: currentEvent.date,
          time: currentEvent.time,
          endDate: currentEvent.endDate,
          endTime: currentEvent.endTime,
          tipoExamen: tipo,
        });

        if (currentEvent.courseName) {
          courseNamesSet.add(currentEvent.courseName);
        }
      }
      currentEvent = null;
      continue;
    }

    if (!currentEvent) continue;

    // Procesar campos
    if (line.startsWith("UID:")) {
      currentEvent.uid = line.substring(4).trim();
    } else if (line.startsWith("SUMMARY:") || line.startsWith("SUMMARY;")) {
      const val = line.substring(line.indexOf(":") + 1);
      currentEvent.title = unescapeIcs(val);
    } else if (line.startsWith("DESCRIPTION:") || line.startsWith("DESCRIPTION;")) {
      const val = line.substring(line.indexOf(":") + 1);
      currentEvent.description = unescapeIcs(val);
    } else if (line.startsWith("CATEGORIES:") || line.startsWith("CATEGORIES;")) {
      const val = line.substring(line.indexOf(":") + 1);
      const cleaned = cleanMoodleCourseName(unescapeIcs(val));
      currentEvent.courseName = cleaned;
    } else if (line.startsWith("DTSTART")) {
      const parsed = parseIcsDateTime(line);
      currentEvent.date = parsed.date;
      currentEvent.time = parsed.time;
    } else if (line.startsWith("DTEND")) {
      const parsed = parseIcsDateTime(line);
      currentEvent.endDate = parsed.date;
      currentEvent.endTime = parsed.time;
    }
  }

  return {
    events,
    courseNames: Array.from(courseNamesSet),
  };
}

function unescapeIcs(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseIcsDateTime(line: string): { date: string; time?: string } {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return { date: "" };

  const value = line.substring(colonIndex + 1).trim();

  // Caso 1: Formato solo fecha YYYYMMDD (ej: 20260911)
  if (/^\d{8}$/.test(value)) {
    const y = value.substring(0, 4);
    const m = value.substring(4, 6);
    const d = value.substring(6, 8);
    return { date: `${y}-${m}-${d}` };
  }

  // Caso 2: Formato fecha y hora YYYYMMDDTHHmmssZ
  if (value.includes("T")) {
    const parts = value.split("T");
    const datePart = parts[0];
    const timePart = parts[1].replace("Z", "");

    const y = datePart.substring(0, 4);
    const m = datePart.substring(4, 6);
    const d = datePart.substring(6, 8);

    const hh = timePart.substring(0, 2);
    const mm = timePart.substring(2, 4);

    return {
      date: `${y}-${m}-${d}`,
      time: `${hh}:${mm}`,
    };
  }

  return { date: "" };
}

/**
 * Conecta y guarda la URL del calendario de Moodle del alumno
 */
export async function connectMoodleByFeedUrl(
  feedUrl: string,
  campusName: string = "UTN FRM"
): Promise<{
  session: MoodleSession;
  events: MoodleParsedEvent[];
  courseNames: string[];
}> {
  const icsText = await fetchMoodleIcs(feedUrl);
  const { events, courseNames } = parseMoodleIcs(icsText);

  // Extraer ID de usuario si viene en la URL
  let detectedUserId: string | undefined;
  try {
    const u = new URL(feedUrl.replace(/^webcal:\/\//i, "https://"));
    detectedUserId = u.searchParams.get("userid") || undefined;
  } catch (_) {}

  const session: MoodleSession = {
    campusUrl: feedUrl,
    feedUrl: feedUrl.trim(),
    userId: detectedUserId,
    fullname: detectedUserId ? `Alumno UTN (#${detectedUserId})` : "Estudiante UTN",
    sitename: campusName,
    connectedAt: new Date().toISOString(),
    lastSync: new Date().toISOString(),
  };

  setStoredMoodleSession(session);
  localStorage.setItem(MOODLE_FEED_URL_KEY, feedUrl.trim());

  return { session, events, courseNames };
}

/**
 * Sincroniza materias y eventos de Moodle a la base de datos de T.A.B.E.
 */
export async function syncMoodleToTabe(
  userId: string,
  events: MoodleParsedEvent[],
  courseNames: string[],
  options: { syncSubjects: boolean; syncCalendar: boolean }
): Promise<{
  addedSubjects: number;
  addedEvents: number;
}> {
  let addedSubjects = 0;
  let addedEvents = 0;

  // 1. Sincronizar Materias
  if (options.syncSubjects && courseNames.length > 0) {
    const { data: existingSubjects } = await supabase
      .from("subjects")
      .select("id, nombre")
      .eq("user_id", userId);

    const existingNames = new Set(
      (existingSubjects || []).map((s) => s.nombre.toLowerCase().trim())
    );

    const subjectsToInsert: any[] = [];
    courseNames.forEach((cName) => {
      const clean = cName.trim();
      if (!existingNames.has(clean.toLowerCase())) {
        subjectsToInsert.push({
          nombre: clean,
          codigo: clean.substring(0, 4).toUpperCase(),
          año: 1,
          user_id: userId,
        });
        existingNames.add(clean.toLowerCase());
      }
    });

    if (subjectsToInsert.length > 0) {
      const { error: subErr } = await supabase.from("subjects").insert(subjectsToInsert);
      if (!subErr) {
        addedSubjects = subjectsToInsert.length;
      }
    }
  }

  // 2. Sincronizar Calendario
  if (options.syncCalendar && events.length > 0) {
    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, nombre")
      .eq("user_id", userId);

    const subjectMap = new Map<string, string>();
    (subjects || []).forEach((s) => {
      subjectMap.set(s.nombre.toLowerCase().trim(), s.id);
    });

    const { data: existingEvents } = await supabase
      .from("calendar_events")
      .select("titulo, fecha")
      .eq("user_id", userId);

    const existingEventKeys = new Set(
      (existingEvents || []).map((e) => `${e.titulo.toLowerCase().trim()}_${e.fecha}`)
    );

    const eventsToInsert: any[] = [];
    events.forEach((ev) => {
      const key = `${ev.title.toLowerCase().trim()}_${ev.date}`;
      if (!existingEventKeys.has(key)) {
        let matchedSubjectId: string | null = null;
        if (ev.courseName) {
          matchedSubjectId = subjectMap.get(ev.courseName.toLowerCase().trim()) || null;
        }

        eventsToInsert.push({
          user_id: userId,
          titulo: ev.title,
          fecha: ev.date,
          hora: ev.time || null,
          tipo_examen: ev.tipoExamen,
          subject_id: matchedSubjectId,
          notas: `📌 Sincronizado desde Campus Virtual Moodle${ev.courseName ? ` (${ev.courseName})` : ""}${
            ev.description ? `\n\n${ev.description}` : ""
          }`,
          is_all_day: !ev.time,
          color: ev.tipoExamen === "parcial" || ev.tipoExamen === "final" ? "#ef4444" : "#FF7900",
        });

        existingEventKeys.add(key);
      }
    });

    if (eventsToInsert.length > 0) {
      const { error: evErr } = await supabase.from("calendar_events").insert(eventsToInsert);
      if (!evErr) {
        addedEvents = eventsToInsert.length;
      }
    }
  }

  // Actualizar sesión
  const currentSession = getStoredMoodleSession();
  if (currentSession) {
    currentSession.lastSync = new Date().toISOString();
    setStoredMoodleSession(currentSession);
  }

  return { addedSubjects, addedEvents };
}
