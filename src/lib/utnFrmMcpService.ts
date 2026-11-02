import { supabase } from "@/integrations/supabase/client";
import { isUserFromUtnFrm } from "@/lib/careerData";

export const UTN_FRM_MCP_SNAPSHOT_PREFIX = "tabe_utnfrm_mcp_snapshot_";
export const UTN_FRM_MCP_CREDS_PREFIX = "tabe_utnfrm_mcp_creds_";
export const ENCUESTAS_PLAN_TYPE_TAG = "+encuestas_utn";

/**
 * Devuelve el plan_type limpio (sin el marcador de permiso de encuestas UTN FRM)
 * para mostrar etiquetas de suscripción (mensual/semestral/anual).
 */
export function getCleanPlanType(planType?: string | null): string | null {
  if (!planType) return null;
  const cleaned = planType
    .replace(ENCUESTAS_PLAN_TYPE_TAG, "")
    .replace(/^free$/i, "")
    .trim();
  return cleaned || null;
}

/**
 * Verifica si un usuario tiene aprobado por el Administrador el permiso para resolver encuestas docentes.
 */
export function isUtnFrmEncuestasApproved(profile?: {
  utnfrm_encuestas_enabled?: boolean | null;
  plan_type?: string | null;
} | null): boolean {
  if (!profile) return false;
  if (profile.utnfrm_encuestas_enabled === true) return true;
  if (
    typeof profile.plan_type === "string" &&
    profile.plan_type.includes(ENCUESTAS_PLAN_TYPE_TAG)
  ) {
    return true;
  }
  return false;
}

/**
 * Verifica que el usuario pertenezca a UTN FRM Y además esté aprobado por el Administrador
 * para poder resolver encuestas docentes.
 */
export function isUtnFrmEncuestasAllowedForProfile(profile?: {
  facultad?: string | null;
  carrera?: string | null;
  utnfrm_encuestas_enabled?: boolean | null;
  plan_type?: string | null;
} | null): boolean {
  if (!profile) return false;
  if (!isUserFromUtnFrm({ facultad: profile.facultad, carrera: profile.carrera })) {
    return false;
  }
  return isUtnFrmEncuestasApproved(profile);
}

/**
 * Habilita o revoca desde el Panel de Administrador el permiso de un usuario
 * para resolver encuestas docentes de la UTN FRM.
 * Modifica exclusivamente la columna `utnfrm_encuestas_enabled` en la tabla `profiles`
 * (NUNCA altera `plan_type` para evitar violar la restricción `profiles_plan_type_check`).
 */
export async function setUtnFrmEncuestasPermissionByAdmin(
  targetUserId: string,
  enabledOrPlanType: boolean | string | null | undefined,
  maybeEnabled?: boolean
): Promise<void> {
  const enabled =
    typeof enabledOrPlanType === "boolean"
      ? enabledOrPlanType
      : Boolean(maybeEnabled);

  const { error } = await supabase
    .from("profiles")
    .update({
      utnfrm_encuestas_enabled: enabled,
    })
    .eq("user_id", targetUserId);

  if (error) {
    const errorMsg = error.message || "";
    if (
      errorMsg.includes("utnfrm_encuestas_enabled") ||
      errorMsg.includes("column") ||
      (error as any).code === "42703" ||
      (error as any).code === "PGRST204"
    ) {
      throw new Error(
        "Falta ejecutar el script SQL en Supabase para agregar la columna 'utnfrm_encuestas_enabled'. Ejecutá en el SQL Editor de Supabase:\nALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS utnfrm_encuestas_enabled BOOLEAN NOT NULL DEFAULT false;"
      );
    }
    throw error;
  }
}

export interface UtnFrmMcpCredentials {
  username: string;
  password: string;
  email?: string;
  legajo?: string;
}

export interface UtnFrmMcpSummary {
  sysacadConnected: boolean;
  sysacadTablesCount: number;
  legajo?: string;
  studentLabel?: string;
  campusConnected: boolean;
  campusCoursesCount: number;
  campusDeadlinesCount: number;
  campusGradesCount: number;
  mailConnected: boolean;
  mailUnreadCount: number;
  mailRecentCount: number;
  avisosCount: number;
}

export interface UtnFrmMcpSnapshot {
  ok: boolean;
  syncedAt: string;
  username: string;
  resolvedEmail?: string;
  legajo?: string;
  summary: UtnFrmMcpSummary;
  sysacad: {
    connected: boolean;
    error?: string;
    studentInfo?: { legajo?: string; fullLabel?: string; detectedEmail?: string };
    consultas: Record<
      string,
      {
        consulta: string;
        label: string;
        columns: string[];
        rows: Array<Record<string, string>>;
        total?: number;
        message?: string;
        text?: string;
      }
    >;
    inscripcion?: { abierta: boolean; mensaje?: string; materias?: string[] };
  };
  campus: {
    connected: boolean;
    error?: string;
    profile?: { fullName?: string; email?: string };
    courses: Array<{ id: string; name: string; url: string }>;
    deadlines: Array<{
      courseId: string;
      courseName: string;
      kind: "assignment" | "quiz";
      name: string;
      due?: string;
      status?: string;
      grade?: string;
      url: string;
    }>;
    grades: Array<{
      courseId: string;
      courseName: string;
      itemName: string;
      grade: string;
      range?: string;
      percentage?: string;
      feedback?: string;
    }>;
    calendarEvents: Array<{
      id: string;
      name: string;
      date: string;
      courseName?: string;
      description?: string;
    }>;
  };
  mail: {
    connected: boolean;
    emailUsed?: string;
    error?: string;
    unreadCount: number;
    totalMessages: number;
    messages: Array<{
      uid: number;
      from: string;
      subject: string;
      date?: string;
      seen: boolean;
    }>;
  };
  avisos: Array<{
    titulo: string;
    fecha?: string;
    texto: string;
  }>;
}

function getSnapshotKey(userId?: string | null): string {
  return `${UTN_FRM_MCP_SNAPSHOT_PREFIX}${userId || "guest"}`;
}

function getCredsKey(userId?: string | null): string {
  return `${UTN_FRM_MCP_CREDS_PREFIX}${userId || "guest"}`;
}

function encodeCreds(creds: UtnFrmMcpCredentials): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(creds))));
  } catch {
    return JSON.stringify(creds);
  }
}

function decodeCreds(raw: string): UtnFrmMcpCredentials | null {
  try {
    if (raw.startsWith("{")) return JSON.parse(raw);
    return JSON.parse(decodeURIComponent(escape(atob(raw))));
  } catch {
    return null;
  }
}

export function getStoredUtnFrmMcpCredentials(userId?: string | null): UtnFrmMcpCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(getCredsKey(userId)) ||
      localStorage.getItem(getCredsKey("guest"));
    if (!raw) return null;
    return decodeCreds(raw);
  } catch {
    return null;
  }
}

export function saveStoredUtnFrmMcpCredentials(
  userId: string | null | undefined,
  creds: UtnFrmMcpCredentials | null
): void {
  if (typeof window === "undefined") return;
  try {
    const key = getCredsKey(userId);
    if (!creds) {
      localStorage.removeItem(key);
      localStorage.removeItem(getCredsKey("guest"));
    } else {
      const encoded = encodeCreds(creds);
      localStorage.setItem(key, encoded);
    }
  } catch {}
}

export function getStoredUtnFrmMcpSnapshot(
  userId?: string | null,
  userMetadata?: any
): UtnFrmMcpSnapshot | null {
  if (typeof window !== "undefined") {
    try {
      const raw =
        localStorage.getItem(getSnapshotKey(userId)) ||
        localStorage.getItem(getSnapshotKey("guest"));
      if (raw) {
        return JSON.parse(raw) as UtnFrmMcpSnapshot;
      }
    } catch {}
  }

  // Fallback desde metadata de Supabase Auth si el usuario ingresó en otro navegador
  if (userMetadata?.utnfrm_mcp_meta && userMetadata.utnfrm_mcp_meta.summary) {
    const meta = userMetadata.utnfrm_mcp_meta;
    return {
      ok: true,
      syncedAt: meta.syncedAt || new Date().toISOString(),
      username: meta.username || "",
      resolvedEmail: meta.resolvedEmail,
      legajo: meta.legajo,
      summary: meta.summary,
      sysacad: meta.sysacad || { connected: !!meta.summary?.sysacadConnected, consultas: {} },
      campus: meta.campus || {
        connected: !!meta.summary?.campusConnected,
        courses: [],
        deadlines: [],
        grades: [],
        calendarEvents: [],
      },
      mail: meta.mail || {
        connected: !!meta.summary?.mailConnected,
        unreadCount: meta.summary?.mailUnreadCount || 0,
        totalMessages: 0,
        messages: [],
      },
      avisos: meta.avisos || [],
    };
  }

  return null;
}

export const getStoredUtnFrmCredentials = getStoredUtnFrmMcpCredentials;
export const getStoredUtnFrmSnapshot = getStoredUtnFrmMcpSnapshot;

export function hasUtnFrmPersonalData(snapshot?: UtnFrmMcpSnapshot | null): boolean {
  if (!snapshot) return false;
  return Boolean(
    snapshot.sysacad?.connected ||
      snapshot.campus?.connected ||
      snapshot.mail?.connected ||
      snapshot.summary?.sysacadConnected ||
      snapshot.summary?.campusConnected ||
      snapshot.summary?.mailConnected
  );
}

export function purgeUtnFrmMcpLocalData(userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith(UTN_FRM_MCP_SNAPSHOT_PREFIX) || k.startsWith(UTN_FRM_MCP_CREDS_PREFIX))
      ) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
    if (userId) {
      localStorage.removeItem(getSnapshotKey(userId));
      localStorage.removeItem(getCredsKey(userId));
    }
  } catch {}
}

export async function disconnectUtnFrmMcp(userId?: string | null): Promise<void> {
  purgeUtnFrmMcpLocalData(userId);
  try {
    await supabase.auth.updateUser({
      data: {
        utnfrm_mcp_meta: null,
      },
    });
  } catch {}
}

/**
 * Verifica que el usuario pertenezca a UTN FRM.
 * Si dejó de pertenecer a UTN FRM, desactiva y purga inmediatamente el MCP para que deje de funcionar.
 */
export async function enforceUtnFrmMcpFacultyGate(
  userId: string | null | undefined,
  academic?: { facultad?: string | null; carrera?: string | null }
): Promise<boolean> {
  const eligible = isUserFromUtnFrm(academic);
  if (!eligible) {
    const hasLocal =
      typeof window !== "undefined" &&
      Boolean(
        localStorage.getItem(getSnapshotKey(userId)) ||
          localStorage.getItem(getCredsKey(userId)) ||
          localStorage.getItem(getSnapshotKey("guest")) ||
          localStorage.getItem(getCredsKey("guest"))
      );
    if (hasLocal) {
      await disconnectUtnFrmMcp(userId);
    }
    return false;
  }
  return true;
}

/**
 * Conecta y sincroniza el MCP de UTN FRM (Campus Virtual, Autogestión Sysacad, Correo Institucional y Avisos)
 */
export async function syncUtnFrmMcp(
  userId: string | null | undefined,
  creds: UtnFrmMcpCredentials,
  academic?: { facultad?: string | null; carrera?: string | null }
): Promise<UtnFrmMcpSnapshot> {
  if (academic && !isUserFromUtnFrm(academic)) {
    await disconnectUtnFrmMcp(userId);
    throw new Error(
      "El MCP de UTN FRM es exclusivo para estudiantes de la UTN Facultad Regional Mendoza."
    );
  }

  const cleanUsername = creds.username.trim();
  const cleanPassword = creds.password;
  const cleanEmail = creds.email?.trim() || undefined;
  const cleanLegajo = creds.legajo?.trim() || undefined;

  if (!cleanUsername || !cleanPassword) {
    throw new Error("Ingresá tu usuario (DNI) y tu contraseña de la UTN FRM.");
  }

  const response = await fetch("/api/utnfrm-mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "sync_all",
      username: cleanUsername,
      password: cleanPassword,
      email: cleanEmail,
      legajo: cleanLegajo,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!data || !data.ok) {
    const mainError =
      data?.error ||
      "No se encontraron datos para el usuario y clave ingresados en UTN FRM.";
    const detailError = data?.details ? `\n${data.details}` : "";
    throw new Error(`${mainError}${detailError}`);
  }

  const snapshot: UtnFrmMcpSnapshot = {
    ok: true,
    syncedAt: data.syncedAt || new Date().toISOString(),
    username: cleanUsername,
    resolvedEmail: data.resolvedEmail || cleanEmail,
    legajo: data.summary?.legajo || cleanLegajo,
    summary: data.summary,
    sysacad: data.sysacad,
    campus: data.campus,
    mail: data.mail,
    avisos: data.avisos || [],
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(getSnapshotKey(userId), JSON.stringify(snapshot));
      saveStoredUtnFrmMcpCredentials(userId, {
        username: cleanUsername,
        password: cleanPassword,
        email: snapshot.resolvedEmail,
        legajo: snapshot.legajo,
      });
    } catch {}
  }

  // Guardar resumen compacto en user_metadata para persistencia multi-dispositivo sin inflar la BD
  try {
    const compactMeta = {
      syncedAt: snapshot.syncedAt,
      username: snapshot.username,
      resolvedEmail: snapshot.resolvedEmail,
      legajo: snapshot.legajo,
      summary: snapshot.summary,
      campus: {
        connected: snapshot.campus.connected,
        courses: snapshot.campus.courses.slice(0, 15),
        deadlines: snapshot.campus.deadlines.slice(0, 15),
        grades: snapshot.campus.grades.slice(0, 15),
        calendarEvents: snapshot.campus.calendarEvents.slice(0, 10),
      },
      mail: {
        connected: snapshot.mail.connected,
        emailUsed: snapshot.mail.emailUsed,
        unreadCount: snapshot.mail.unreadCount,
        totalMessages: snapshot.mail.totalMessages,
        messages: snapshot.mail.messages.slice(0, 8),
      },
      avisos: snapshot.avisos.slice(0, 5),
    };
    await supabase.auth.updateUser({
      data: {
        utnfrm_mcp_meta: compactMeta,
      },
    });
  } catch {}

  return snapshot;
}

/**
 * Formatea una tabla de Sysacad en texto Markdown compacto para el prompt de TABE AI
 */
function formatSysacadTableForPrompt(table?: {
  label: string;
  columns: string[];
  rows: Array<Record<string, string>>;
  total?: number;
  message?: string;
  text?: string;
}): string {
  if (!table) return "";
  if (table.rows && table.rows.length > 0) {
    const lines = table.rows.slice(0, 75).map((r) => {
      const pairs = Object.entries(r)
        .filter(([, v]) => v && v.trim() !== "")
        .map(([k, v]) => `${k}: ${v}`);
      return `  • ${pairs.join(" | ")}`;
    });
    return `### ${table.label} (${table.total ?? table.rows.length} registros):\n${lines.join("\n")}`;
  }
  if (table.message) {
    return `### ${table.label}: ${table.message}`;
  }
  if (table.text) {
    return `### ${table.label}:\n  ${table.text.slice(0, 800)}`;
  }
  return "";
}

/**
 * Ejecuta la resolución automática de Encuestas Docentes en Autogestión (Sysacad) / Campus UTN FRM.
 * Solo funciona si el usuario es de UTN FRM Y fue aprobado en el Panel de Administrador.
 */
export async function resolveUtnFrmEncuestas(
  userId: string | null | undefined,
  options: {
    rating?: string;
    comment?: string;
    materia?: string;
  },
  profile?: {
    facultad?: string | null;
    carrera?: string | null;
    utnfrm_encuestas_enabled?: boolean | null;
    plan_type?: string | null;
  } | null
): Promise<{
  ok: boolean;
  resolvedCount: number;
  foundCount: number;
  items: Array<{
    source: string;
    title: string;
    status: string;
    detail: string;
  }>;
  message: string;
}> {
  if (!isUserFromUtnFrm({ facultad: profile?.facultad, carrera: profile?.carrera })) {
    await disconnectUtnFrmMcp(userId);
    throw new Error(
      "Esta función es exclusiva para estudiantes de la UTN FRM."
    );
  }

  if (!isUtnFrmEncuestasAllowedForProfile(profile)) {
    throw new Error(
      "No tenés habilitado el permiso para resolver encuestas docentes. El Administrador debe aprobar tu cuenta en el Panel de Administración."
    );
  }

  const creds = getStoredUtnFrmMcpCredentials(userId);
  if (!creds || !creds.username || !creds.password) {
    throw new Error(
      "Primero debés conectar tu usuario (DNI) y clave en Configuración → Integraciones → MCP UTN FRM."
    );
  }

  let authHeader: Record<string, string> = {};
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (token) {
      authHeader = { Authorization: `Bearer ${token}` };
    }
  } catch {}

  const response = await fetch("/api/utnfrm-mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
    body: JSON.stringify({
      action: "resolve_encuestas",
      username: creds.username,
      password: creds.password,
      legajo: creds.legajo,
      rating: options.rating || "muy_bueno",
      comment:
        options.comment ||
        "Sin observaciones adicionales. Muy buen desarrollo de la cátedra.",
      materia: options.materia,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!data || !data.ok) {
    throw new Error(
      data?.error || "No se pudieron procesar las encuestas docentes en este momento."
    );
  }

  return data;
}

/**
 * Construye la sección completa del MCP UTN FRM para inyectar en el contexto de TABE AI.
 * Si el usuario NO es de UTN FRM, purga cualquier dato residual y devuelve string vacío.
 */
export function buildUtnFrmMcpContextSection(
  userId: string | null | undefined,
  academic: {
    facultad?: string | null;
    carrera?: string | null;
    utnfrm_encuestas_enabled?: boolean | null;
    plan_type?: string | null;
  },
  userMetadata?: any
): string {
  if (!isUserFromUtnFrm(academic)) {
    purgeUtnFrmMcpLocalData(userId);
    return "";
  }

  const encuestasAllowed = isUtnFrmEncuestasAllowedForProfile(academic);
  const snapshot = getStoredUtnFrmMcpSnapshot(userId, userMetadata);

  const encuestasDirective = encuestasAllowed
    ? `- PERMISO DE ADMINISTRADOR PARA RESOLVER ENCUESTAS DOCENTES: **✅ HABILITADO POR EL ADMINISTRADOR**.
  * Tenés permiso total y capacidad activa para **RESOLVER Y COMPLETAR LAS ENCUESTAS DOCENTES** de la UTN FRM en nombre del estudiante.
  * NUNCA le respondas diciendo "no puedo resolver encuestas docentes" o "tenés que hacerlo manualmente en Autogestión".
  * Cuando el estudiante te pida resolver, completar, llenar o responder las encuestas docentes (todas o de una materia específica, con una valoración como "excelente", "muy bueno", "bueno" o "regular"): confirmale con entusiasmo que ya mismo las estás resolviendo en su cuenta de Autogestión (Sysacad) e incluí SIEMPRE al final de tu respuesta el bloque de acción:
\`\`\`tabe-action:utn-encuestas
{"rating": "muy_bueno", "materia": "todas", "comment": "Sin observaciones adicionales. Muy buen desarrollo de la cátedra."}
\`\`\``
    : `- PERMISO DE ADMINISTRADOR PARA RESOLVER ENCUESTAS DOCENTES: **🔒 NO HABILITADO PARA ESTE USUARIO**.
  * Si el estudiante te pide resolver o completar automáticamente sus encuestas docentes de la UTN FRM, explicale con amabilidad que la resolución automática de encuestas docentes requiere ser aprobada para su usuario por el Administrador desde el Panel de Administración de TABE.`;

  if (!snapshot) {
    return `
[15. MCP EXCLUSIVO UTN FRM (CAMPUS VIRTUAL, AUTOGESTIÓN SYSACAD Y CORREO INSTITUCIONAL)]
- Estado actual: El estudiante pertenece a la UTN FRM (Facultad Regional Mendoza), pero aún NO ha vinculado sus credenciales en el MCP de UTN FRM.
- Instrucción para vos: Si el estudiante te pregunta por información en vivo de Autogestión (Sysacad), aulas o entregas del Campus Virtual UTN FRM, avisos de autogestión, encuestas docentes o su Correo Institucional (@alumnos.frm.utn.edu.ar), avisale con amabilidad que puede ir a **Configuración → Integraciones → MCP UTN FRM** y cargar su usuario (DNI) y clave para que tengas acceso automático.
${encuestasDirective}`;
  }

  const blocks: string[] = [];

  blocks.push(
    `- Estado MCP UTN FRM: ACTIVO (Última sincronización: ${new Date(snapshot.syncedAt).toLocaleString("es-AR")})`
  );
  blocks.push(
    `- Usuario UTN (DNI): ${snapshot.username}${snapshot.legajo ? ` | Legajo: ${snapshot.legajo}` : ""}${
      snapshot.summary?.studentLabel ? ` | Alumno: ${snapshot.summary.studentLabel}` : ""
    }${snapshot.resolvedEmail ? ` | Correo UTN: ${snapshot.resolvedEmail}` : ""}`
  );

  // 1. Autogestión (Sysacad)
  if (snapshot.sysacad?.connected) {
    const sysLines: string[] = [];
    if (snapshot.sysacad.inscripcion) {
      sysLines.push(
        `• Estado de Inscripción a Cursado: ${
          snapshot.sysacad.inscripcion.abierta
            ? `ABIERTA (${(snapshot.sysacad.inscripcion.materias || []).join(", ")})`
            : `CERRADA (${snapshot.sysacad.inscripcion.mensaje || "No habilitada actualmente"})`
        }`
      );
    }

    const consultasOrder = [
      "estado_academico",
      "cursado_actual",
      "horarios_cursado",
      "mis_horarios",
      "historico_examenes",
      "aprobados",
      "aplazos",
      "materias_plan",
      "correlatividades_cursar",
      "correlatividades_rendir",
    ];

    for (const key of consultasOrder) {
      const table = snapshot.sysacad.consultas?.[key];
      const formatted = formatSysacadTableForPrompt(table);
      if (formatted) sysLines.push(formatted);
    }

    blocks.push(
      `\n--- A. AUTOGESTIÓN UTN FRM (SYSACAD - DATOS OFICIALES) ---\n${
        sysLines.length > 0 ? sysLines.join("\n\n") : "Conectado, sin tablas adicionales reportadas."
      }`
    );
  } else if (snapshot.sysacad?.error) {
    blocks.push(`\n--- A. AUTOGESTIÓN UTN FRM (SYSACAD) ---\n- Sin conexión en el último intento: ${snapshot.sysacad.error}`);
  }

  // 2. Campus Virtual Moodle UTN FRM
  if (snapshot.campus?.connected) {
    const campLines: string[] = [];
    const courses = snapshot.campus.courses || [];
    const deadlines = snapshot.campus.deadlines || [];
    const grades = snapshot.campus.grades || [];
    const calendarEvents = snapshot.campus.calendarEvents || [];

    if (courses.length > 0) {
      campLines.push(
        `### Materias Matriculadas en el Campus Virtual (${courses.length}):\n` +
          courses.map((c) => `  • ${c.name} (Aula ID: ${c.id})`).join("\n")
      );
    } else {
      campLines.push("### Materias Matriculadas en el Campus Virtual: El campus no reportó cursos visibles.");
    }

    if (deadlines.length > 0) {
      campLines.push(
        `### Tareas, Entregas y Cuestionarios del Campus (${deadlines.length}):\n` +
          deadlines
            .map(
              (d) =>
                `  • [${d.courseName}] ${d.name} (${d.kind === "quiz" ? "Cuestionario" : "Tarea"})${
                  d.due ? ` | Vence: ${d.due}` : ""
                }${d.status ? ` | Estado: ${d.status}` : ""}${d.grade ? ` | Nota: ${d.grade}` : ""}`
            )
            .join("\n")
      );
    }

    if (grades.length > 0) {
      campLines.push(
        `### Calificaciones en el Campus Virtual (${grades.length}):\n` +
          grades
            .map(
              (g) =>
                `  • [${g.courseName}] ${g.itemName}: **${g.grade}**${
                  g.percentage ? ` (${g.percentage})` : ""
                }${g.feedback ? ` - Feedback: ${g.feedback}` : ""}`
            )
            .join("\n")
      );
    }

    if (calendarEvents.length > 0) {
      campLines.push(
        `### Próximos Eventos del Calendario del Campus:\n` +
          calendarEvents
            .map((e) => `  • ${e.date}: ${e.name}${e.courseName ? ` [${e.courseName}]` : ""}`)
            .join("\n")
      );
    }

    blocks.push(`\n--- B. CAMPUS VIRTUAL UTN FRM (MOODLE) ---\n${campLines.join("\n\n")}`);
  } else if (snapshot.campus?.error) {
    blocks.push(`\n--- B. CAMPUS VIRTUAL UTN FRM (MOODLE) ---\n- Estado: ${snapshot.campus.error}`);
  }

  // 3. Correo Institucional (@alumnos.frm.utn.edu.ar)
  if (snapshot.mail?.connected) {
    const messages = snapshot.mail.messages || [];
    const mailLines: string[] = [
      `• Casilla: ${snapshot.mail.emailUsed || snapshot.resolvedEmail} | Sin leer: ${snapshot.mail.unreadCount ?? 0} | Total en INBOX: ${snapshot.mail.totalMessages ?? 0}`,
    ];
    if (messages.length > 0) {
      mailLines.push(
        `### Últimos Correos Institucionales Recibidos:\n` +
          messages
            .map(
              (m) =>
                `  • [${m.seen ? "Leído" : "🔵 NO LEÍDO"}] ${m.date || ""} - De: ${m.from} | Asunto: "${m.subject}"`
            )
            .join("\n")
      );
    } else {
      mailLines.push("• La bandeja de entrada no tiene mensajes recientes.");
    }
    blocks.push(`\n--- C. CORREO INSTITUCIONAL UTN FRM (ALUMNOS.FRM.UTN.EDU.AR) ---\n${mailLines.join("\n")}`);
  } else if (snapshot.mail?.error) {
    blocks.push(`\n--- C. CORREO INSTITUCIONAL UTN FRM ---\n- Estado: ${snapshot.mail.error}`);
  }

  // 4. Avisos Públicos de Autogestión
  if (snapshot.avisos && snapshot.avisos.length > 0) {
    const avisosLines = snapshot.avisos
      .slice(0, 8)
      .map((a) => `  • **${a.titulo}**${a.fecha ? ` (${a.fecha})` : ""}: ${a.texto.slice(0, 280)}`);
    blocks.push(`\n--- D. AVISOS OFICIALES DE AUTOGESTIÓN UTN FRM ---\n${avisosLines.join("\n")}`);
  }

  return `
[15. MCP EXCLUSIVO UTN FRM (CAMPUS VIRTUAL, AUTOGESTIÓN SYSACAD Y CORREO INSTITUCIONAL)]
Tenés conexión directa con el MCP de la UTN Facultad Regional Mendoza del estudiante. Usá todos estos datos reales de su Campus, Autogestión (Sysacad) y Correo Institucional para responder sus consultas:
${blocks.join("\n")}

DIRECTIVAS DEL MCP UTN FRM (CAMPUS VIRTUAL MOODLE, AUTOGESTIÓN SYSACAD Y CUESTIONARIOS):
- TENÉS ACCESO COMPLETO AL CAMPUS VIRTUAL MOODLE Y A AUTOGESTIÓN SYSACAD DE LA UTN FRM:
  * Podés ver el 100% de los cuestionarios, tareas y entregas del Campus Virtual Moodle detallados en [B. CAMPUS VIRTUAL UTN FRM].
  * Podés ver su estado de entrega exacto (Pendiente de entrega, Entregado, Sin calificar), su fecha límite de vencimiento (due), notas y retroalimentaciones oficiales de la cátedra.
  * PROHIBICIÓN ESTRICTA: NUNCA le digas al usuario que "no ves el estado de entrega oficial" ni que "eso es un dato interno de la cátedra y requiere acceso a la interfaz de Moodle". Tenés la lista completa de entregas y cuestionarios de Moodle arriba y podés responderle con total precisión qué vence, cuándo y si ya está entregado o pendiente.
  * Cuestionarios y Exámenes de Práctica: Podés consultar, explicar las preguntas y temas de los cuestionarios de Moodle, y generar simulacros de práctica con \`\`\`tabe-action:quiz vinculados a los temas evaluados en el Campus.
  * Autogestión Sysacad: Podés consultar estado académico, materias del plan, cursado actual, horarios de cursado, histórico de exámenes finales aprobados y aplazos, y correlatividades para cursar y rendir.
- Cuando pregunte qué le falta para recibirse, estado académico, correlatividades, electivas o en qué comisiones/horarios cursa, usá los datos de **AUTOGESTIÓN UTN FRM (SYSACAD)** junto con su plan de estudios.
- Cuando pregunte por entregas pendientes del Campus, cuestionarios de Moodle o aulas virtuales, usá **CAMPUS VIRTUAL UTN FRM (MOODLE)**.
- Cuando pregunte por correos de la facultad, profesores o avisos por mail, usá **CORREO INSTITUCIONAL UTN FRM** y **AVISOS OFICIALES DE AUTOGESTIÓN**.
${encuestasDirective}`;
}
