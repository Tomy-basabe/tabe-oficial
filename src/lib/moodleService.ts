import { supabase } from "@/integrations/supabase/client";

export const MOODLE_SESSION_KEY = "tabe_moodle_session";
export const MOODLE_FEED_URL_KEY = "tabe_moodle_feed_url";
export const DEFAULT_CAMPUS_URL = "https://campusvirtual.frm.utn.edu.ar";

export interface MoodleSession {
  campusUrl: string;
  feedUrl: string;
  userId?: string;
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
 * Extrae el UID de Moodle de las notas de un evento de TABE
 */
export function extractMoodleUid(notas?: string | null): string | null {
  if (!notas) return null;
  const match = notas.match(/\[moodle_uid:([^\]]+)\]/);
  return match ? match[1] : null;
}

/**
 * Remueve el tag [moodle_uid:...] de las notas para visualización limpia
 */
export function stripMoodleUid(notas?: string | null): string {
  if (!notas) return "";
  return notas.replace(/\[moodle_uid:[^\]]+\]/g, "").trim();
}

/**
 * Inyecta el tag [moodle_uid:...] dentro de las notas del evento
 */
export function injectMoodleUid(notas: string | null | undefined, uid: string): string {
  const clean = stripMoodleUid(notas);
  return clean ? `${clean} [moodle_uid:${uid}]` : `[moodle_uid:${uid}]`;
}

/**
 * Obtiene la sesión actual de Moodle desde localStorage o Supabase Auth metadata
 */
export function getStoredMoodleSession(userMetadata?: any): MoodleSession | null {
  try {
    const raw = localStorage.getItem(MOODLE_SESSION_KEY);
    if (raw) {
      return JSON.parse(raw) as MoodleSession;
    }
  } catch {}

  // Respaldo desde metadata de Supabase del usuario si cambió de dispositivo
  if (userMetadata?.moodle_feed_url) {
    const fallbackSession: MoodleSession = {
      campusUrl: userMetadata.moodle_feed_url,
      feedUrl: userMetadata.moodle_feed_url,
      fullname: "Estudiante UTN",
      sitename: "UTN FRM",
      connectedAt: userMetadata.moodle_connected_at || new Date().toISOString(),
      lastSync: userMetadata.moodle_last_sync,
    };
    try {
      localStorage.setItem(MOODLE_SESSION_KEY, JSON.stringify(fallbackSession));
      localStorage.setItem(MOODLE_FEED_URL_KEY, userMetadata.moodle_feed_url);
    } catch {}
    return fallbackSession;
  }

  return null;
}

/**
 * Guarda la sesión de Moodle en localStorage y la respalda en Supabase Auth metadata
 */
export async function setStoredMoodleSession(session: MoodleSession | null): Promise<void> {
  if (!session) {
    localStorage.removeItem(MOODLE_SESSION_KEY);
    localStorage.removeItem(MOODLE_FEED_URL_KEY);
    try {
      await supabase.auth.updateUser({
        data: {
          moodle_feed_url: null,
          moodle_connected_at: null,
          moodle_last_sync: null,
        },
      });
    } catch (_) {}
  } else {
    localStorage.setItem(MOODLE_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(MOODLE_FEED_URL_KEY, session.feedUrl);
    try {
      await supabase.auth.updateUser({
        data: {
          moodle_feed_url: session.feedUrl,
          moodle_connected_at: session.connectedAt,
          moodle_last_sync: session.lastSync || new Date().toISOString(),
        },
      });
    } catch (_) {}
  }
}

/**
 * Desconecta la cuenta de Moodle
 */
export async function disconnectMoodle(): Promise<void> {
  await setStoredMoodleSession(null);
}

/**
 * Verifica si hay una sesión activa de Moodle guardada
 */
export function isMoodleConnected(userMetadata?: any): boolean {
  return !!getStoredMoodleSession(userMetadata)?.feedUrl;
}

/**
 * Limpia el nombre de una materia obtenido de las categorías de Moodle
 * Ej: "Redes de Datos.-Practica-2026" -> "Redes de Datos"
 */
export function cleanMoodleCourseName(raw: string): string {
  let name = raw.trim();
  name = name.replace(/[-_.]\d{4}$/, "");
  name = name.replace(/[-_.](Practica|Teoria|Comision|Catedra|Virtual).*$/i, "");
  name = name.replace(/[-_.]+$/, "").trim();
  return name || raw.trim();
}

/**
 * Descarga el archivo de calendario ICS desde la URL de exportación de Moodle
 * a través de nuestro endpoint proxy seguro
 */
export async function fetchMoodleIcs(feedUrl: string): Promise<string> {
  const cleanUrl = feedUrl.trim().replace(/^webcal:\/\//i, "https://");
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
 * Parsea el contenido ICS de Moodle y extrae materias y eventos con su UID
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

  if (/^\d{8}$/.test(value)) {
    const y = value.substring(0, 4);
    const m = value.substring(4, 6);
    const d = value.substring(6, 8);
    return { date: `${y}-${m}-${d}` };
  }

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

  await setStoredMoodleSession(session);

  return { session, events, courseNames };
}

/**
 * Sincroniza materias y eventos de Moodle a la base de datos de T.A.B.E.
 * Maneja:
 * - Eventos NUEVOS (insert)
 * - Eventos MODIFICADOS por profesores (update por moodle_uid sin duplicar)
 * - Nuevas materias detectadas (insert)
 */
export async function syncMoodleToTabe(
  userId: string,
  events: MoodleParsedEvent[],
  courseNames: string[],
  options: { syncSubjects: boolean; syncCalendar: boolean }
): Promise<{
  addedSubjects: number;
  addedEvents: number;
  updatedEvents: number;
}> {
  let addedSubjects = 0;
  let addedEvents = 0;
  let updatedEvents = 0;

  // 1. Sincronizar Materias Nuevas
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

  // 2. Sincronizar Calendario (Manejo inteligente de Novedades y Modificaciones por UID)
  if (options.syncCalendar && events.length > 0) {
    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, nombre")
      .eq("user_id", userId);

    const subjectMap = new Map<string, string>();
    (subjects || []).forEach((s) => {
      subjectMap.set(s.nombre.toLowerCase().trim(), s.id);
    });

    // Consultar todos los eventos existentes del usuario
    const { data: existingEvents } = await supabase
      .from("calendar_events")
      .select("id, titulo, fecha, hora, notas, tipo_examen, subject_id")
      .eq("user_id", userId);

    // Mapear eventos por UID de Moodle y por (titulo + fecha) de respaldo
    const uidMap = new Map<string, any>();
    const titleDateMap = new Map<string, any>();

    (existingEvents || []).forEach((ev) => {
      const mUid = extractMoodleUid(ev.notas);
      if (mUid) {
        uidMap.set(mUid, ev);
      }
      titleDateMap.set(`${ev.titulo.toLowerCase().trim()}_${ev.fecha}`, ev);
    });

    const eventsToInsert: any[] = [];

    for (const moodleEv of events) {
      // Buscar si ya existía este evento
      const existing =
        uidMap.get(moodleEv.uid) ||
        titleDateMap.get(`${moodleEv.title.toLowerCase().trim()}_${moodleEv.date}`);

      let matchedSubjectId: string | null = null;
      if (moodleEv.courseName) {
        matchedSubjectId = subjectMap.get(moodleEv.courseName.toLowerCase().trim()) || null;
      }

      const cleanNotesContent = `📌 Campus Virtual Moodle${moodleEv.courseName ? ` (${moodleEv.courseName})` : ""}${
        moodleEv.description ? `\n\n${moodleEv.description}` : ""
      }`;
      const fullNotes = injectMoodleUid(cleanNotesContent, moodleEv.uid);

      if (existing) {
        // ¿El profesor modificó fecha, hora, título o consigna?
        const dateChanged = existing.fecha !== moodleEv.date;
        const timeChanged = existing.hora !== (moodleEv.time || null);
        const titleChanged = existing.titulo !== moodleEv.title;
        const notesChanged = stripMoodleUid(existing.notas) !== cleanNotesContent;

        if (dateChanged || timeChanged || titleChanged || notesChanged) {
          // ACTUALIZAR evento existente
          const { error: updErr } = await supabase
            .from("calendar_events")
            .update({
              titulo: moodleEv.title,
              fecha: moodleEv.date,
              hora: moodleEv.time || null,
              is_all_day: !moodleEv.time,
              notas: fullNotes,
              tipo_examen: moodleEv.tipoExamen,
              subject_id: matchedSubjectId || existing.subject_id,
            })
            .eq("id", existing.id);

          if (!updErr) {
            updatedEvents++;
          }
        }
      } else {
        // INSERTAR nuevo evento
        eventsToInsert.push({
          user_id: userId,
          titulo: moodleEv.title,
          fecha: moodleEv.date,
          hora: moodleEv.time || null,
          tipo_examen: moodleEv.tipoExamen,
          subject_id: matchedSubjectId,
          notas: fullNotes,
          is_all_day: !moodleEv.time,
          color: moodleEv.tipoExamen === "parcial" || moodleEv.tipoExamen === "final" ? "#ef4444" : "#FF7900",
        });
      }
    }

    if (eventsToInsert.length > 0) {
      const { error: insErr } = await supabase.from("calendar_events").insert(eventsToInsert);
      if (!insErr) {
        addedEvents = eventsToInsert.length;
      }
    }
  }

  // Actualizar timestamp de última sincronización
  const session = getStoredMoodleSession();
  if (session) {
    session.lastSync = new Date().toISOString();
    await setStoredMoodleSession(session);
  }

  return { addedSubjects, addedEvents, updatedEvents };
}

/**
 * Ejecuta una sincronización completa en segundo plano usando la URL guardada del alumno
 */
export async function performMoodleAutoSync(
  userId: string,
  userMetadata?: any
): Promise<{ success: boolean; added: number; updated: number; message?: string }> {
  const session = getStoredMoodleSession(userMetadata);
  if (!session?.feedUrl) {
    return { success: false, added: 0, updated: 0, message: "No hay campus vinculado" };
  }

  try {
    const icsText = await fetchMoodleIcs(session.feedUrl);
    const { events, courseNames } = parseMoodleIcs(icsText);

    const res = await syncMoodleToTabe(userId, events, courseNames, {
      syncSubjects: true,
      syncCalendar: true,
    });

    return {
      success: true,
      added: res.addedEvents,
      updated: res.updatedEvents,
      message: `Moodle sincronizado: ${res.addedEvents} nuevos, ${res.updatedEvents} actualizados.`,
    };
  } catch (err: any) {
    return { success: false, added: 0, updated: 0, message: err?.message };
  }
}
