import { supabase } from "@/integrations/supabase/client";

export const MOODLE_SESSION_KEY = "tabe_moodle_session";
export const DEFAULT_CAMPUS_URL = "https://campusvirtual.frm.utn.edu.ar";

export interface MoodleSession {
  campusUrl: string;
  token: string;
  privateToken?: string;
  userId: number;
  username: string;
  fullname: string;
  firstname?: string;
  lastname?: string;
  userpictureurl?: string;
  sitename?: string;
  connectedAt: string;
  lastSync?: string;
}

export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  displayname?: string;
  idnumber?: string;
  summary?: string;
  enrolledusercount?: number;
  progress?: number;
}

export interface MoodleEvent {
  id: number;
  name: string;
  description?: string;
  courseid?: number;
  coursename?: string;
  timestart: number; // unix timestamp in seconds
  timeduration?: number;
  eventtype?: string;
  modulename?: string;
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
}

/**
 * Verifica si hay una sesión activa de Moodle guardada
 */
export function isMoodleConnected(): boolean {
  return !!getStoredMoodleSession()?.token;
}

/**
 * Invoca una función del Web Service REST de Moodle
 */
export async function callMoodleWs<T = any>(
  campusUrl: string,
  token: string,
  wsFunction: string,
  params: Record<string, any> = {}
): Promise<T> {
  const base = normalizeCampusUrl(campusUrl);
  const endpoint = `${base}/webservice/rest/server.php`;

  const query = new URLSearchParams({
    wstoken: token,
    wsfunction: wsFunction,
    moodlewsrestformat: "json",
  });

  // Agregar parámetros anidados o simples
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      if (typeof val === "object") {
        Object.entries(val).forEach(([subKey, subVal]) => {
          query.append(`${key}[${subKey}]`, String(subVal));
        });
      } else {
        query.append(key, String(val));
      }
    }
  });

  const response = await fetch(`${endpoint}?${query.toString()}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Error en el servidor de Moodle (${response.status})`);
  }

  const data = await response.json();

  if (data?.exception || data?.errorcode || data?.error) {
    throw new Error(data.message || data.error || `Error de Moodle: ${data.errorcode}`);
  }

  return data as T;
}

/**
 * Inicia sesión en Moodle mediante token.php (servicio móvil oficial)
 */
export async function loginMoodle(
  username: string,
  password: string,
  campusUrl: string = DEFAULT_CAMPUS_URL
): Promise<MoodleSession> {
  const base = normalizeCampusUrl(campusUrl);
  const tokenEndpoint = `${base}/login/token.php`;

  const body = new URLSearchParams({
    username: username.trim(),
    password: password,
    service: "moodle_mobile_app",
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`No se pudo conectar al campus virtual (${response.status})`);
  }

  const tokenData = await response.json();

  if (tokenData.error) {
    if (tokenData.errorcode === "invalidlogin") {
      throw new Error("Usuario o contraseña incorrectos en el campus virtual.");
    }
    throw new Error(tokenData.error || "No se pudo iniciar sesión en Moodle.");
  }

  if (!tokenData.token) {
    throw new Error("El campus virtual no devolvió un token de acceso.");
  }

  // Obtener información del usuario en Moodle
  const siteInfo = await callMoodleWs(base, tokenData.token, "core_webservice_get_site_info");

  const session: MoodleSession = {
    campusUrl: base,
    token: tokenData.token,
    privateToken: tokenData.privatetoken,
    userId: siteInfo.userid,
    username: siteInfo.username || username.trim(),
    fullname: siteInfo.fullname || `${siteInfo.firstname || ""} ${siteInfo.lastname || ""}`.trim(),
    firstname: siteInfo.firstname,
    lastname: siteInfo.lastname,
    userpictureurl: siteInfo.userpictureurl,
    sitename: siteInfo.sitename,
    connectedAt: new Date().toISOString(),
  };

  setStoredMoodleSession(session);
  return session;
}

/**
 * Obtiene los cursos / materias matriculadas del usuario en Moodle
 */
export async function getMoodleCourses(session?: MoodleSession | null): Promise<MoodleCourse[]> {
  const currentSession = session || getStoredMoodleSession();
  if (!currentSession) throw new Error("No hay una cuenta de Moodle conectada.");

  const courses = await callMoodleWs<MoodleCourse[]>(
    currentSession.campusUrl,
    currentSession.token,
    "core_enrol_get_users_courses",
    { userid: currentSession.userId }
  );

  return courses || [];
}

/**
 * Obtiene eventos, entregas y tareas próximas del calendario de Moodle
 */
export async function getMoodleUpcomingEvents(session?: MoodleSession | null): Promise<MoodleEvent[]> {
  const currentSession = session || getStoredMoodleSession();
  if (!currentSession) throw new Error("No hay una cuenta de Moodle conectada.");

  const events: MoodleEvent[] = [];

  // 1. Intentar obtener eventos de acción ordenados por tiempo
  try {
    const fromTimestamp = Math.floor(Date.now() / 1000) - 86400 * 7; // desde hace 7 días
    const actionData = await callMoodleWs(
      currentSession.campusUrl,
      currentSession.token,
      "core_calendar_get_action_events_by_timesort",
      {
        timesortfrom: fromTimestamp,
        limittonext: 50,
      }
    );

    if (actionData?.events && Array.isArray(actionData.events)) {
      actionData.events.forEach((ev: any) => {
        events.push({
          id: ev.id,
          name: ev.name,
          description: ev.description,
          courseid: ev.course?.id,
          coursename: ev.course?.fullname || ev.course?.shortname,
          timestart: ev.timestart,
          timeduration: ev.timeduration,
          eventtype: ev.eventtype,
          modulename: ev.modulename,
        });
      });
    }
  } catch (err) {
    console.warn("Aviso al obtener action events de Moodle:", err);
  }

  // 2. Si no hay eventos de acción, consultar tareas asignadas (mod_assign)
  if (events.length === 0) {
    try {
      const assignData = await callMoodleWs(
        currentSession.campusUrl,
        currentSession.token,
        "mod_assign_get_assignments"
      );

      if (assignData?.courses && Array.isArray(assignData.courses)) {
        assignData.courses.forEach((course: any) => {
          if (course.assignments && Array.isArray(course.assignments)) {
            course.assignments.forEach((assignment: any) => {
              if (assignment.duedate && assignment.duedate > Math.floor(Date.now() / 1000) - 86400 * 14) {
                events.push({
                  id: assignment.id,
                  name: assignment.name,
                  description: assignment.intro,
                  courseid: course.id,
                  coursename: course.fullname || course.shortname,
                  timestart: assignment.duedate,
                  eventtype: "due",
                  modulename: "assign",
                });
              }
            });
          }
        });
      }
    } catch (err) {
      console.warn("Aviso al consultar mod_assign de Moodle:", err);
    }
  }

  return events;
}

/**
 * Sincroniza las materias de Moodle a la base de datos de T.A.B.E.
 */
export async function syncMoodleCoursesToTabe(
  userId: string,
  courses: MoodleCourse[]
): Promise<{ added: number; total: number }> {
  if (!courses.length) return { added: 0, total: 0 };

  // 1. Obtener materias existentes del usuario
  const { data: existingSubjects, error } = await supabase
    .from("subjects")
    .select("id, nombre, codigo")
    .eq("user_id", userId);

  if (error) {
    console.error("Error consultando materias de T.A.B.E.:", error);
    throw error;
  }

  const existingMap = new Set(
    (existingSubjects || []).map((s) => s.nombre.trim().toLowerCase())
  );

  const newSubjectsToInsert: Array<{
    nombre: string;
    codigo: string;
    año: number;
    user_id: string;
  }> = [];

  courses.forEach((course) => {
    const cleanName = course.fullname.trim();
    if (!existingMap.has(cleanName.toLowerCase())) {
      newSubjectsToInsert.push({
        nombre: cleanName,
        codigo: course.shortname?.trim() || `MDL-${course.id}`,
        año: 1, // Año base
        user_id: userId,
      });
      existingMap.add(cleanName.toLowerCase());
    }
  });

  if (newSubjectsToInsert.length > 0) {
    const { error: insertError } = await supabase.from("subjects").insert(newSubjectsToInsert);
    if (insertError) {
      console.error("Error insertando materias de Moodle:", insertError);
      throw insertError;
    }
  }

  return {
    added: newSubjectsToInsert.length,
    total: courses.length,
  };
}

/**
 * Sincroniza las entregas y eventos de Moodle al calendario de T.A.B.E.
 */
export async function syncMoodleEventsToTabeCalendar(
  userId: string,
  events: MoodleEvent[]
): Promise<{ added: number; total: number }> {
  if (!events.length) return { added: 0, total: 0 };

  // 1. Consultar materias existentes del usuario para asociar subject_id
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, nombre")
    .eq("user_id", userId);

  const subjectMap = new Map<string, string>();
  (subjects || []).forEach((s) => {
    subjectMap.set(s.nombre.toLowerCase().trim(), s.id);
  });

  // 2. Consultar eventos existentes en el calendario para evitar duplicar
  const { data: existingEvents } = await supabase
    .from("calendar_events")
    .select("titulo, fecha")
    .eq("user_id", userId);

  const existingKeys = new Set(
    (existingEvents || []).map((e) => `${e.titulo.trim().toLowerCase()}_${e.fecha}`)
  );

  const eventsToInsert: Array<{
    user_id: string;
    titulo: string;
    fecha: string;
    hora: string | null;
    tipo_examen: "entrega" | "parcial" | "final" | "recuperatorio";
    subject_id: string | null;
    notas: string;
    is_all_day: boolean;
    color: string;
  }> = [];

  events.forEach((ev) => {
    const dateObj = new Date(ev.timestart * 1000);
    const dateStr = dateObj.toISOString().split("T")[0];
    const timeStr = `${String(dateObj.getHours()).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(2, "0")}`;

    const key = `${ev.name.trim().toLowerCase()}_${dateStr}`;
    if (!existingKeys.has(key)) {
      // Determinar tipo de examen / entrega
      const lowerName = ev.name.toLowerCase();
      let tipo: "entrega" | "parcial" | "final" | "recuperatorio" = "entrega";
      if (lowerName.includes("final")) {
        tipo = "final";
      } else if (lowerName.includes("recuperatorio")) {
        tipo = "recuperatorio";
      } else if (lowerName.includes("parcial") || lowerName.includes("examen")) {
        tipo = "parcial";
      }

      // Asociar materia si coincide
      let matchedSubjectId: string | null = null;
      if (ev.coursename) {
        matchedSubjectId = subjectMap.get(ev.coursename.toLowerCase().trim()) || null;
      }

      eventsToInsert.push({
        user_id: userId,
        titulo: ev.name.trim(),
        fecha: dateStr,
        hora: timeStr !== "00:00" ? timeStr : null,
        tipo_examen: tipo,
        subject_id: matchedSubjectId,
        notas: `📌 Sincronizado desde Campus Virtual Moodle${ev.coursename ? ` (${ev.coursename})` : ""}`,
        is_all_day: timeStr === "00:00",
        color: tipo === "parcial" || tipo === "final" ? "#ef4444" : "#f59e0b",
      });

      existingKeys.add(key);
    }
  });

  if (eventsToInsert.length > 0) {
    const { error: insertError } = await supabase.from("calendar_events").insert(eventsToInsert);
    if (insertError) {
      console.error("Error insertando eventos de Moodle en el calendario:", insertError);
      throw insertError;
    }
  }

  // Actualizar marca de tiempo de última sincronización
  const session = getStoredMoodleSession();
  if (session) {
    session.lastSync = new Date().toISOString();
    setStoredMoodleSession(session);
  }

  return {
    added: eventsToInsert.length,
    total: events.length,
  };
}
