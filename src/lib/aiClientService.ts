import { supabase } from "@/integrations/supabase/client";
import { addInAppNotification } from "@/lib/notificationsStore";
import { toast } from "sonner";
import { invalidateSubjectsCache } from "@/hooks/useSubjects";
import { invalidateCalendarCache, getColorForType } from "@/hooks/useCalendarEvents";
import { invalidateDashboardStatsCache } from "@/hooks/useDashboardStats";
import {
  AVAILABLE_AI_MODELS,
  DEFAULT_AI_MODEL,
  OPENROUTER_API_KEY,
  GEMINI_API_KEY,
  AIModelOption,
  PowerEffort,
  NVIDIA_MODELS_PRIORITY,
} from "@/config/aiModels";

export interface AIStatusUpdate {
  state: "thinking" | "streaming" | "idle" | "error";
  label: string;
  detail?: string;
}

export interface StreamResult {
  content: string;
  event_created?: any;
  flashcards_created?: { deck: any; cards_count: number };
  quiz_created?: { deck: any; questions_count: number };
  db_mutations?: Array<{ target: string; operation: string; message: string }>;
}

// In-memory cache of student context to avoid re-querying on rapid consecutive messages (5 minutes TTL)
const contextCache = new Map<string, { data: string; timestamp: number }>();
const CONTEXT_CACHE_TTL = 30 * 1000; // 30 seconds TTL for fast updates

export function invalidateStudentContextCache(userId?: string) {
  if (userId) {
    for (const key of contextCache.keys()) {
      if (key.startsWith(userId)) contextCache.delete(key);
    }
  } else {
    contextCache.clear();
  }
}

/**
 * Strips chain-of-thought blocks (<think>...</think>, <thought>...</thought>,
 * or leaked reasoning preambles like "The user asks: ... That's it.")
 */
export function cleanAIResponse(text: string): string {
  if (!text) return "";

  // 1. Remove complete <think>...</think> and <thought>...</thought> blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, "");

  // 2. Remove unclosed <think> or <thought> if still streaming/in progress
  cleaned = cleaned.replace(/<think>[\s\S]*$/gi, "");
  cleaned = cleaned.replace(/<thought>[\s\S]*$/gi, "");

  // 3. Remove complete or partial tabe-action blocks (quiz, flashcards, calendar)
  cleaned = cleaned.replace(/```tabe-action:[a-z_-]*[\s\S]*?(?:```|$)/gi, "");

  // 4. Remove code blocks or JSON leaking internal quiz/flashcard definitions
  cleaned = cleaned.replace(/```(?:json)?\s*\{[\s\S]*?"(?:quiz_name|deck_name|questions|preguntas)"[\s\S]*?(?:```|$)/gi, "");
  cleaned = cleaned.replace(/\{[\s\S]*?"(?:quiz_name|deck_name)"[\s\S]*$/gi, "");

  // 5. Remove leaked English reasoning preambles
  const preambleRegex = /^\s*(?:The user (?:asks|wants|requested|is asking)[\s\S]*?(?:That's it\.?|Here is the response:?|Let's produce something like:[\s\S]*?That's it\.?))\s*/i;
  cleaned = cleaned.replace(preambleRegex, "");

  // 6. Eliminar cualquier ID, UUID o código técnico que el modelo haya colado accidentalmente en el texto
  cleaned = cleaned.replace(/\[?(?:ID|HorarioID|SubjectID|ProfID):\s*([a-f0-9-]{8,}|[0-9]+)\]?/gi, "");
  cleaned = cleaned.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "");

  // 7. Sanitizar menciones técnicas a "base de datos" para que el lenguaje sea 100% natural y humano
  cleaned = cleaned.replace(/\b(?:en|a|de|tu)\s+(?:la\s+)?base\s+de\s+datos\b/gi, (m) => {
    if (/en\s+(?:la\s+)?base/i.test(m)) return "en tu cuenta";
    if (/a\s+(?:la\s+)?base/i.test(m)) return "en tu cuenta";
    return "tu cuenta";
  });
  cleaned = cleaned.replace(/\bbase\s+de\s+datos\b/gi, "cuenta");

  return cleaned.trimStart();
}

/**
 * Detects if a content chunk is actually an API error message leaked as content.
 * OpenRouter/Gemini sometimes stream error text as normal delta.content.
 */
function isApiErrorChunk(text: string): boolean {
  const errorPatterns = [
    /UNAVAILABLE/i,
    /No capacity available/i,
    /\(code 5\d\d\)/i,
    /Service Unavailable/i,
    /rate limit/i,
    /overloaded/i,
    /model_not_available/i,
  ];
  const trimmed = text.trim();
  // Only flag as error if the FIRST chunk looks like an error (avoids false positives mid-response)
  return trimmed.length < 300 && errorPatterns.some((p) => p.test(trimmed));
}

/**
 * Filter for streaming responses to block internal chain-of-thought tokens from leaking into UI
 */
export class StreamingContentFilter {
  private inThinkTag = false;
  private rawAccumulated = "";
  private emittedLength = 0;

  constructor(private onCleanDelta: (chunk: string) => void) {}

  public processChunk(chunk: string) {
    this.rawAccumulated += chunk;

    // Check if we are inside a <think> tag
    if (!this.inThinkTag) {
      const thinkStartIndex = this.rawAccumulated.indexOf("<think>");
      if (thinkStartIndex !== -1) {
        const thinkEndIndex = this.rawAccumulated.indexOf("</think>");
        if (thinkEndIndex !== -1) {
          this.inThinkTag = false;
        } else {
          this.inThinkTag = true;
          return;
        }
      }
    } else {
      const thinkEndIndex = this.rawAccumulated.indexOf("</think>");
      if (thinkEndIndex !== -1) {
        this.inThinkTag = false;
        const cleanSoFar = cleanAIResponse(this.rawAccumulated);
        const newDelta = cleanSoFar.slice(this.emittedLength);
        if (newDelta) {
          this.emittedLength = cleanSoFar.length;
          this.onCleanDelta(newDelta);
        }
      }
      return;
    }

    const cleanSoFar = cleanAIResponse(this.rawAccumulated);
    const newDelta = cleanSoFar.slice(this.emittedLength);
    if (newDelta) {
      this.emittedLength = cleanSoFar.length;
      this.onCleanDelta(newDelta);
    }
  }

  public getFinalContent(): string {
    return cleanAIResponse(this.rawAccumulated).trim();
  }
}

/**
 * Builds 100% complete academic and personal context for the student ultra-fast.
 * Queries all academic tables in parallel via Promise.allSettled with local caching.
 */
export async function buildStudentContext(
  userId: string,
  personaPrompt: string,
  personaName: string,
  userName?: string,
  powerLevel: PowerEffort = "medio"
): Promise<string> {
  const cacheKey = `${userId}_${powerLevel}`;
  const cached = contextCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CONTEXT_CACHE_TTL) {
    return cached.data;
  }

  const now = new Date();
  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const hoyStr = now.toISOString().split("T")[0];
  const hoyDia = diasSemana[now.getDay()];
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  let profileSection = "Estudiante de TABE.";
  let summarySection = "Sin datos de carrera registrados aún.";
  let subjectsSection = "Sin materias registradas en el plan.";
  let eventsSection = "Sin eventos agendados próximos.";
  let notesSection = "Sin apuntes registrados.";
  let flashcardsSection = "Sin mazos de flashcards registrados.";
  let quizzesSection = "Sin cuestionarios creados.";
  let librarySection = "Sin archivos en la biblioteca.";
  let routinesSection = "Sin rutinas activas registradas.";
  let sessionsSection = "Sin sesiones de estudio recientes.";
  let achievementsSection = "Sin logros desbloqueados.";
  let professorsSection = "Sin profesores ni horarios de consulta registrados aún.";
  let discordSection = "Sin mensajes ni grupos de estudio registrados aún.";
  let friendsSection = "Sin compañeros ni amigos registrados aún.";

  if (userId && userId !== "guest") {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("context_timeout")), 2500)
      );

      const fetchPromise = Promise.allSettled([
        // 0. Profile
        (supabase as any)
          .from("profiles")
          .select("nombre, username, email, carrera, facultad, plan, plan_type")
          .eq("user_id", userId)
          .maybeSingle(),

        // 1. Stats
        (supabase as any)
          .from("user_stats")
          .select("nivel, xp_total, racha_actual, mejor_racha, horas_estudio_total")
          .eq("user_id", userId)
          .maybeSingle(),

        // 2. All subjects in curriculum (user specific or global template)
        (supabase as any)
          .from("subjects")
          .select("id, nombre, codigo, año, numero_materia, user_id")
          .or(`user_id.eq.${userId},user_id.is.null`)
          .order("año", { ascending: true })
          .order("numero_materia", { ascending: true }),

        // 3. User Subject Status (all grades and states)
        (supabase as any)
          .from("user_subject_status")
          .select("subject_id, estado, nota, nota_parcial_1, nota_parcial_2, nota_rec_parcial_1, nota_rec_parcial_2, nota_global, nota_rec_global, nota_final_examen, fecha_aprobacion, extra_partials")
          .eq("user_id", userId),

        // 4. Calendar events & exams (both upcoming and recent)
        (supabase as any)
          .from("calendar_events")
          .select("id, titulo, fecha, hora, hora_fin, tipo_examen, notas, subject_id")
          .eq("user_id", userId)
          .gte("fecha", thirtyDaysAgoStr)
          .order("fecha", { ascending: true })
          .limit(30),

        // 5. Notion documents / notes
        // @AI-CRITICAL-INSTRUCTION: PROTECCIÓN DE LÍMITES DE API LLM Y EGRESS.
        // NUNCA modifiques este .select() para incluir la columna "contenido" cruda ni JSON de imágenes.
        // Si envías megabytes de JSON/Base64 a los LLMs, consumirás masivamente los tokens de OpenAI/Gemini
        // e incrementarás la factura mensual drásticamente, además de agotar el ancho de banda.
        (supabase as any)
          .from("notion_documents")
          .select("id, titulo, subject_id, is_favorite, updated_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(60),

        // 6. Flashcard decks
        (supabase as any)
          .from("flashcard_decks")
          .select("id, nombre, total_cards, subject_id, category")
          .eq("user_id", userId)
          .limit(60),

        // 7. Quiz decks
        (supabase as any)
          .from("quiz_decks")
          .select("id, nombre, total_questions, subject_id, category")
          .eq("user_id", userId)
          .limit(60),

        // 8. Library files
        (supabase as any)
          .from("library_files")
          .select("id, nombre, tipo, subject_id, folder_id, created_at")
          .eq("user_id", userId)
          .limit(60),

        // 9. Active routines
        (supabase as any)
          .from("routines")
          .select("id, name, category, start_time, end_time, days_of_week, subject_id, is_active")
          .eq("user_id", userId)
          .eq("is_active", true)
          .limit(30),

        // 10. Study sessions
        (supabase as any)
          .from("study_sessions")
          .select("id, subject_id, duracion_segundos, fecha, tipo")
          .eq("user_id", userId)
          .order("fecha", { ascending: false })
          .limit(20),

        // 11. Achievements
        (supabase as any)
          .from("user_achievements")
          .select("achievement_id, unlocked_at, achievements(nombre, descripcion)")
          .eq("user_id", userId)
          .limit(30),

        // 12. Professors
        (supabase as any)
          .from("professors")
          .select("id, nombre, rol, descripcion, subject_id")
          .eq("user_id", userId)
          .limit(30),

        // 13. Professor Office Hours (Consultas)
        (supabase as any)
          .from("professor_office_hours")
          .select("id, professor_id, dia, hora_inicio, hora_fin")
          .eq("user_id", userId)
          .limit(40),

        // 14. Friendships (Amistades aceptadas)
        (supabase as any)
          .from("friendships")
          .select("requester_id, addressee_id, status")
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
          .eq("status", "accepted")
          .limit(20),

        // 15. Discord Servers membership (Grupos de estudio y foros)
        (supabase as any)
          .from("discord_server_members")
          .select("server_id, role, discord_servers(id, name)")
          .eq("user_id", userId)
          .limit(10),
      ]);

      const results = (await Promise.race([fetchPromise, timeoutPromise])) as any[];

      if (results && Array.isArray(results)) {
        const [
          profRes,
          statsRes,
          subsRes,
          ussRes,
          eventsRes,
          docsRes,
          decksRes,
          quizzesRes,
          filesRes,
          routinesRes,
          sessionsRes,
          achieveRes,
          profsListRes,
          hoursListRes,
          friendsListRes,
          discordListRes,
        ] = results;

        // 0. Profile
        const prof = profRes.status === "fulfilled" ? profRes.value?.data : null;
        const studentName = prof?.nombre || prof?.username || userName || "Estudiante";
        const carrera = prof?.carrera || "No especificada";
        const facultad = prof?.facultad || "No especificada";
        const plan = prof?.plan || "No especificado";

        // 1. Stats
        const stats = statsRes.status === "fulfilled" ? statsRes.value?.data : null;
        const nivel = stats?.nivel || 1;
        const xp = stats?.xp_total || 0;
        const racha = stats?.racha_actual || 0;
        const mejorRacha = stats?.mejor_racha || 0;
        const horasEstudio = stats?.horas_estudio_total || 0;

        profileSection = `- Estudiante: ${studentName} (${prof?.email || ""})
- Carrera: ${carrera}
- Facultad: ${facultad}
- Plan de estudio: ${plan}
- Nivel actual: ${nivel} | XP Total: ${xp}
- Racha de estudio: ${racha} días (Récord histórico: ${mejorRacha} días)
- Horas totales de estudio registradas: ${horasEstudio} hs`;

        // 2 & 3. Subjects & Status
        let subjects: any[] = subsRes.status === "fulfilled" && Array.isArray(subsRes.value?.data) ? subsRes.value.data : [];
        const userStatus: any[] = ussRes.status === "fulfilled" && Array.isArray(ussRes.value?.data) ? ussRes.value.data : [];

        // If user has specific subjects, filter out global template duplicates
        const hasUserSpecific = subjects.some((s) => s.user_id === userId);
        if (hasUserSpecific) {
          subjects = subjects.filter((s) => s.user_id === userId);
        }

        const subjectNameById: Record<string, string> = {};
        for (const s of subjects) {
          subjectNameById[s.id] = s.nombre;
        }

        // Helper to extract effective grade from any field
        const getEffectiveGrade = (st: any): number | null => {
          if (!st) return null;
          const candidates = [st.nota, st.nota_final_examen, st.nota_global, st.nota_rec_global];
          for (const val of candidates) {
            if (val !== null && val !== undefined && val !== "") {
              const num = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
              if (!isNaN(num) && num > 0) return num;
            }
          }
          return null;
        };

        const mergedSubjects = subjects.map((s) => {
          const st = userStatus.find((u) => u.subject_id === s.id);
          const effectiveGrade = getEffectiveGrade(st);
          return {
            ...s,
            estado: (st?.estado || "sin_cursar").toLowerCase().trim(),
            nota: effectiveGrade,
            p1: st?.nota_parcial_1 ?? st?.nota_rec_parcial_1 ?? null,
            p2: st?.nota_parcial_2 ?? st?.nota_rec_parcial_2 ?? null,
            global: st?.nota_global ?? st?.nota_rec_global ?? null,
            final_examen: st?.nota_final_examen ?? null,
            fecha_aprobacion: st?.fecha_aprobacion ?? null,
          };
        });

        const aprobadas = mergedSubjects.filter((s) => s.estado === "aprobada");
        const regulares = mergedSubjects.filter((s) => s.estado === "regular");
        const enCurso = mergedSubjects.filter((s) => s.estado === "en_curso");
        const sinCursar = mergedSubjects.filter((s) => s.estado === "sin_cursar");

        const notasAprobadasDetalle = aprobadas
          .filter((s) => s.nota !== null && !isNaN(s.nota) && s.nota > 0)
          .map((s) => ({ nombre: s.nombre, nota: s.nota as number, año: s.año || 1 }));

        const sumaNotas = notasAprobadasDetalle.reduce((a, b) => a + b.nota, 0);
        const promedioNum =
          notasAprobadasDetalle.length > 0
            ? sumaNotas / notasAprobadasDetalle.length
            : null;
        const promedio = promedioNum !== null ? promedioNum.toFixed(2) : "Sin notas numéricas registradas aún";
        const pctProgreso =
          mergedSubjects.length > 0
            ? ((aprobadas.length / mergedSubjects.length) * 100).toFixed(1)
            : "0";

        const noAprobadas = mergedSubjects.filter((s) => s.estado !== "aprobada");
        const pendientesPorAnioObj: Record<number, string[]> = {};
        for (const s of noAprobadas) {
          const yr = s.año || 1;
          if (!pendientesPorAnioObj[yr]) pendientesPorAnioObj[yr] = [];
          pendientesPorAnioObj[yr].push(s.nombre);
        }
        const pendientesPorAnioStr = Object.keys(pendientesPorAnioObj)
          .sort((a, b) => Number(a) - Number(b))
          .map((yr) => `${yr}° Año: ${pendientesPorAnioObj[Number(yr)].length} (${pendientesPorAnioObj[Number(yr)].join(", ")})`)
          .join(" | ");

        summarySection = `- Materias totales en el plan: ${mergedSubjects.length}
- Progreso de carrera: ${aprobadas.length}/${mergedSubjects.length} materias aprobadas (${pctProgreso}%)
- Promedio general actual: ${promedio} (${notasAprobadasDetalle.length} materias con nota computadas, suma acumulada de notas = ${sumaNotas.toFixed(2)})
- Detalle de notas aprobadas: ${notasAprobadasDetalle.length > 0 ? notasAprobadasDetalle.map((n) => `${n.nombre} (${n.año}° año): ${n.nota.toFixed(2)}`).join(", ") : "Ninguna nota registrada"}
- Aprobadas: ${aprobadas.length}
- Regulares (cursadas aprobadas, listas para rendir final): ${regulares.length}
- En curso: ${enCurso.length}
- Sin cursar: ${sinCursar.length}
- Materias pendientes de aprobar (total: ${noAprobadas.length}) desglosadas por año: ${pendientesPorAnioStr || "Ninguna"}
- Fórmula exacta para calcular qué nota promedio mínima (X) necesita sacarse en M materias restantes para alcanzar un promedio objetivo (P): X = ((P * (${notasAprobadasDetalle.length} + M)) - ${sumaNotas.toFixed(2)}) / M`;

        // Group subjects by year
        if (mergedSubjects.length > 0) {
          const byYear: Record<number, any[]> = {};
          for (const s of mergedSubjects) {
            const yr = s.año || 1;
            if (!byYear[yr]) byYear[yr] = [];
            byYear[yr].push(s);
          }

          const yearBlocks: string[] = [];
          for (const yr of Object.keys(byYear).sort((a, b) => Number(a) - Number(b))) {
            const list = byYear[Number(yr)];
            const lines = list.map((s) => {
              let line = `  • ${s.nombre} [${s.codigo || "S/C"}]: ${s.estado.toUpperCase()}`;
              if (s.nota != null) line += ` | NOTA FINAL: ${s.nota}`;
              if (s.final_examen != null) line += ` | Examen Final: ${s.final_examen}`;
              const parciales = [];
              if (s.p1 != null) parciales.push(`P1: ${s.p1}`);
              if (s.p2 != null) parciales.push(`P2: ${s.p2}`);
              if (s.global != null) parciales.push(`Global: ${s.global}`);
              if (parciales.length > 0) line += ` (${parciales.join(", ")})`;
              if (s.fecha_aprobacion) line += ` [Aprobada: ${s.fecha_aprobacion}]`;
              return line;
            });
            yearBlocks.push(`[${yr}° Año]:\n${lines.join("\n")}`);
          }
          subjectsSection = yearBlocks.join("\n\n");
        }

        // 4. Calendar & Exams
        const events: any[] = eventsRes.status === "fulfilled" && Array.isArray(eventsRes.value?.data) ? eventsRes.value.data : [];
        if (events.length > 0) {
          eventsSection = events
            .map((e) => {
              const subName = e.subject_id && subjectNameById[e.subject_id] ? ` [Materia: ${subjectNameById[e.subject_id]}]` : "";
              const hora = e.hora ? ` a las ${e.hora}` : "";
              const notas = e.notas ? ` (Detalle: ${e.notas})` : "";
              return `- ${e.fecha}${hora}: ${e.titulo} [Tipo: ${e.tipo_examen || "Evento"}]${subName}${notas}`;
            })
            .join("\n");
        }

        // 5. Notion Documents
        const docs: any[] = docsRes.status === "fulfilled" && Array.isArray(docsRes.value?.data) ? docsRes.value.data : [];
        if (docs.length > 0) {
          notesSection = docs
            .map((d) => {
              const subName = d.subject_id && subjectNameById[d.subject_id] ? ` [Materia: ${subjectNameById[d.subject_id]}]` : "";
              const fav = d.is_favorite ? " ⭐ Favorito" : "";
              return `- "${d.titulo}"${subName}${fav}`;
            })
            .join("\n");
        }

        // 6. Flashcard Decks
        const decks: any[] = decksRes.status === "fulfilled" && Array.isArray(decksRes.value?.data) ? decksRes.value.data : [];
        if (decks.length > 0) {
          flashcardsSection = decks
            .map((d) => {
              const subName = d.subject_id && subjectNameById[d.subject_id] ? ` [Materia: ${subjectNameById[d.subject_id]}]` : "";
              return `- Mazo "${d.nombre}": ${d.total_cards || 0} tarjetas${subName}`;
            })
            .join("\n");
        }

        // 7. Quizzes
        const quizzes: any[] = quizzesRes.status === "fulfilled" && Array.isArray(quizzesRes.value?.data) ? quizzesRes.value.data : [];
        if (quizzes.length > 0) {
          quizzesSection = quizzes
            .map((q) => {
              const subName = q.subject_id && subjectNameById[q.subject_id] ? ` [Materia: ${subjectNameById[q.subject_id]}]` : "";
              return `- Quiz "${q.nombre}": ${q.total_questions || 0} preguntas${subName}`;
            })
            .join("\n");
        }

        // 8. Library files
        const files: any[] = filesRes.status === "fulfilled" && Array.isArray(filesRes.value?.data) ? filesRes.value.data : [];
        if (files.length > 0) {
          librarySection = files
            .map((f) => {
              const subName = f.subject_id && subjectNameById[f.subject_id] ? ` [Materia: ${subjectNameById[f.subject_id]}]` : "";
              return `- "${f.nombre}" (${f.tipo || "archivo"})${subName}`;
            })
            .join("\n");
        }

        // 9. Routines
        const routines: any[] = routinesRes.status === "fulfilled" && Array.isArray(routinesRes.value?.data) ? routinesRes.value.data : [];
        if (routines.length > 0) {
          const daysMap = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
          routinesSection = routines
            .map((r) => {
              const days = Array.isArray(r.days_of_week)
                ? r.days_of_week.map((d: number) => daysMap[d] || d).join(", ")
                : "Días no especificados";
              const subName = r.subject_id && subjectNameById[r.subject_id] ? ` [Materia: ${subjectNameById[r.subject_id]}]` : "";
              return `- "${r.name}" (${r.category || "Hábito"}) [${r.is_active ? "Activa" : "Pausada"}]: ${days} de ${r.start_time || "00:00"} a ${r.end_time || "00:00"}${subName}`;
            })
            .join("\n");
        }

        // 10. Study Sessions
        const sessions: any[] = sessionsRes.status === "fulfilled" && Array.isArray(sessionsRes.value?.data) ? sessionsRes.value.data : [];
        if (sessions.length > 0) {
          sessionsSection = sessions
            .map((s) => {
              const subName = s.subject_id && subjectNameById[s.subject_id] ? ` en ${subjectNameById[s.subject_id]}` : "";
              const mins = Math.round((s.duracion_segundos || 0) / 60);
              return `- ${s.fecha}: ${mins} min (${s.tipo || "estudio"})${subName}`;
            })
            .join("\n");
        }

        // 11. Achievements
        const achieves: any[] = achieveRes.status === "fulfilled" && Array.isArray(achieveRes.value?.data) ? achieveRes.value.data : [];
        if (achieves.length > 0) {
          achievementsSection = achieves
            .map((a) => `- ${a.achievements?.nombre || a.achievement_id}: ${a.achievements?.descripcion || "Desbloqueado"}`)
            .join("\n");
        }

        // 12. Professors & Consultas
        const professorsList: any[] = profsListRes?.status === "fulfilled" && Array.isArray(profsListRes.value?.data) ? profsListRes.value.data : [];
        const officeHoursList: any[] = hoursListRes?.status === "fulfilled" && Array.isArray(hoursListRes.value?.data) ? hoursListRes.value.data : [];
        if (professorsList.length > 0) {
          professorsSection = professorsList.map((p) => {
            const subjectName = p.subject_id && subjectNameById[p.subject_id] ? ` [Materia: ${subjectNameById[p.subject_id]}]` : "";
            const hours = officeHoursList.filter((h) => h.professor_id === p.id);
            const hoursStr = hours.length > 0
              ? hours.map((h) => `${h.dia} de ${h.hora_inicio} a ${h.hora_fin}`).join(", ")
              : "Sin horarios de consulta especificados";
            const desc = p.descripcion ? ` (Notas: ${p.descripcion})` : "";
            return `- ${p.nombre} (${p.rol || "Docente"})${subjectName}: Consultas ${hoursStr}${desc}`;
          }).join("\n");
        }

        // 13. Friends / Compañeros de estudio
        const friendshipsList: any[] = friendsListRes?.status === "fulfilled" && Array.isArray(friendsListRes.value?.data) ? friendsListRes.value.data : [];
        if (friendshipsList.length > 0) {
          const friendUserIds = friendshipsList.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id).filter(Boolean);
          if (friendUserIds.length > 0) {
            try {
              const { data: friendProfiles } = await (supabase as any)
                .from("public_profiles")
                .select("user_id, nombre, username, carrera")
                .in("user_id", friendUserIds.slice(0, 15));
              if (friendProfiles && friendProfiles.length > 0) {
                friendsSection = friendProfiles.map((fp: any) => {
                  const c = fp.carrera ? ` - ${fp.carrera}` : "";
                  return `- ${fp.nombre || fp.username || "Compañero"} (@${fp.username || "usuario"}${c}): Amigo y compañero de estudio en TABE`;
                }).join("\n");
              } else {
                friendsSection = `- ${friendUserIds.length} amigos y compañeros de estudio agregados en TABE.`;
              }
            } catch {
              friendsSection = `- ${friendUserIds.length} amigos agregados en la app.`;
            }
          }
        }

        // 14. Discord Servers, Foros y Mensajes de Grupos
        const discordMembersList: any[] = discordListRes?.status === "fulfilled" && Array.isArray(discordListRes.value?.data) ? discordListRes.value.data : [];
        if (discordMembersList.length > 0) {
          const serverIds = discordMembersList.map(m => m.server_id).filter(Boolean);
          try {
            const { data: channels } = await (supabase as any)
              .from("discord_channels")
              .select("id, server_id, name, type")
              .in("server_id", serverIds.slice(0, 6))
              .eq("type", "text")
              .limit(15);
            
            if (channels && channels.length > 0) {
              const channelIds = channels.map((c: any) => c.id);
              const { data: recentMsgs } = await (supabase as any)
                .from("discord_messages")
                .select("id, channel_id, user_id, content, created_at")
                .in("channel_id", channelIds)
                .order("created_at", { ascending: false })
                .limit(25);

              if (recentMsgs && recentMsgs.length > 0) {
                const authorIds = [...new Set(recentMsgs.map((m: any) => m.user_id))];
                const { data: authorProfiles } = await (supabase as any)
                  .from("public_profiles")
                  .select("user_id, nombre, username")
                  .in("user_id", authorIds);
                const authorMap = new Map((authorProfiles || []).map((a: any) => [a.user_id, a.nombre || a.username || "Compañero"]));
                const channelMap = new Map(channels.map((c: any) => [c.id, c.name]));

                const msgLines = recentMsgs.map((m: any) => {
                  const chName = channelMap.get(m.channel_id) || "general";
                  const author = authorMap.get(m.user_id) || (m.user_id === userId ? "Tú" : "Compañero");
                  const dateStr = m.created_at ? m.created_at.split("T")[0] : "";
                  return `  • [#${chName}] ${author} (${dateStr}): "${m.content.slice(0, 180)}"`;
                });
                discordSection = `Mensajes y conversaciones recientes en grupos de estudio / foros:\n${msgLines.join("\n")}`;
              } else {
                discordSection = `Perteneces a ${serverIds.length} grupos de estudio con canales: ${channels.map((c: any) => '#' + c.name).join(", ")}. Aún sin mensajes recientes.`;
              }
            } else {
              discordSection = `Perteneces a ${serverIds.length} servidores/grupos de estudio universitarios.`;
            }
          } catch {
            discordSection = `Grupos de estudio activos en la plataforma.`;
          }
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  const powerDirectives = {
    bajo: "POTENCIA / RAZONAMIENTO: RÁPIDO. Respuestas ágiles, directas, sintéticas y al grano. Evitá rodeos innecesarios.",
    medio: "POTENCIA / RAZONAMIENTO: EQUILIBRADO. Explicaciones claras, pedagógicas, estructuradas y con ejemplos prácticos.",
    alto: "POTENCIA / RAZONAMIENTO: MÁXIMO. Razonamiento profundo y analítico, deducción lógica rigurosa paso a paso y resolución profunda.",
  }[powerLevel];

  const diasSemanaRef = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const proximosDiasRef: string[] = [];
  for (let i = 0; i <= 14; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    const diaNom = diasSemanaRef[d.getDay()];
    const tag = i === 0 ? " (HOY)" : i === 1 ? " (MAÑANA)" : "";
    proximosDiasRef.push(`${dateStr} ${diaNom}${tag}`);
  }
  const calendarioCheatSheet = proximosDiasRef.join(" | ");

  const contextText = `Sos ${personaName}, asistente y tutor académico de inteligencia artificial exclusivo de TABE (plataforma universitaria de Argentina).
Personalidad: ${personaPrompt}
MODALIDAD OPERATIVA: ${powerDirectives}
FECHA ACTUAL: ${hoyStr} (${hoyDia})
CALENDARIO PRÓXIMOS 14 DÍAS (REFERENCIA EXACTA):
${calendarioCheatSheet}

==================================================
100% DE LA INFORMACIÓN DEL ESTUDIANTE (CONEXIÓN TOTAL)
==================================================
Tenes acceso irrestricto y completo a todos los datos académicos del estudiante. Cada pregunta sobre su carrera, notas, materias, exámenes agendados, apuntes, biblioteca, cuestionarios o rutinas DEBE contestarse con estos datos exactos y reales:

[1. PERFIL Y GAMIFICACIÓN]
${profileSection}

[2. RESUMEN ACADÉMICO GENERAL]
${summarySection}

[3. PLAN DE ESTUDIOS COMPLETO Y NOTAS]
${subjectsSection}

[4. CALENDARIO, EXÁMENES Y EVENTOS AGENDADOS]
${eventsSection}

[5. APUNTES Y DOCUMENTOS (NOTION / RESÚMENES)]
${notesSection}

[6. MAZOS DE FLASHCARDS]
${flashcardsSection}

[7. CUESTIONARIOS Y SIMULACROS]
${quizzesSection}

[8. BIBLIOTECA Y MATERIALES DE ESTUDIO]
${librarySection}

[9. RUTINAS Y HÁBITOS DE ESTUDIO]
${routinesSection}

[10. SESIONES DE ESTUDIO RECIENTES]
${sessionsSection}

[11. LOGROS DESBLOQUEADOS]
${achievementsSection}

[12. PROFESORES Y HORARIOS DE CONSULTA]
${professorsSection}

[13. GRUPOS DE ESTUDIO, FOROS Y CONVERSACIONES (CHATS / CANALES)]
${discordSection}

[14. COMPAÑEROS DE ESTUDIO Y AMIGOS]
${friendsSection}

DIRECTIVAS CRÍTICAS DE RESPUESTA Y FORMATO (NVIDIA NIM CLUSTER):
⛔ REGLAS DE ORO DE COMUNICACIÓN (PROHIBIDO NOMBRAR LA BASE DE DATOS Y MOSTRAR IDs):
1. PROHIBICIÓN TOTAL DE NOMBRAR LA "BASE DE DATOS", "DB", "TABLAS" O "SUPABASE":
   - NUNCA le digas al estudiante frases como "tengo acceso a tu base de datos", "lo guardé en la base de datos", "se actualizó en tu base de datos", "en la tabla...", ni nada similar.
   - Hablá SIEMPRE de forma humana, natural y cercana como un tutor universitario:
     * En lugar de "tengo acceso a tu base de datos" -> Decí "Tengo tu plan de estudios y tus materias cargadas en tu cuenta" o "Veo tus notas y materias acá".
     * En lugar de "lo guardé en tu base de datos" -> Decí "¡Listo! Ya lo agendé en tu calendario" o "¡Listo! Ya registré la consulta en tu cuenta".
2. PROHIBICIÓN TOTAL DE MOSTRAR O MENCIONAR IDs O CÓDIGOS TÉCNICOS:
   - NUNCA menciones identificadores internos, UUIDs (como "4a2b9c...", "ID: ...", "HorarioID: ...") ni códigos técnicos en tus respuestas al estudiante.
   - Refiérete SIEMPRE a las materias, profesores, fechas y horarios por su nombre natural (ej: "Álgebra", "Profesor Juan Pérez", "Martes de 14 a 16 hs", "Primer Parcial").

0. CAPACIDAD ACTIVA DE EJECUTAR ACCIONES, CREAR Y AGENDAR ELEMENTOS (¡MÁXIMA PRIORIDAD!):
   - SOS EL ASISTENTE ACADÉMICO INTEGRAL DE TABE: TENÉS INTEGRACIÓN DIRECTA CON LA CUENTA DEL ESTUDIANTE Y PODÉS AGENDAR EXÁMENES, REGISTRAR HORARIOS DE PROFESORES, CAMBIAR NOTAS Y CREAR MATERIAL DE ESTUDIO AL INSTANTE.
   - TIENES TOTALMENTE HABILITADA LA CAPACIDAD DE:
     * Agendar y agregar parciales, finales, entregas y eventos en el Calendario.
     * Cargar y modificar notas de parciales, recuperatorios y finales.
     * Crear cuestionarios y flashcards.
     * Crear, modificar o borrar rutinas de estudio y profesores.
   - NUNCA RESPONDAS DICIENDO:
     ❌ "No puedo agregar eventos a tu calendario"
     ❌ "No tengo la capacidad de modificar tus materias o notas"
     ❌ "Como IA no puedo agendarlo por vos"
     ❌ "Tenés que ir a la sección de Calendario y agregarlo manualmente"
   - CÓMO ACTUAR CUANDO TE PIDEN AGREGAR O AGENDAR UN PARCIAL / EXAMEN:
     * Si te dan materia y fecha (ej: "agregame el parcial de Física el 15 de noviembre a las 14"): Confirmale con buena onda que ya lo hiciste e incluí SIEMPRE al final el bloque de acción:
       \`\`\`tabe-action:calendar
       [{"titulo": "Parcial de Física", "fecha": "2026-11-15", "hora": "14:00", "tipo_examen": "P1"}]
       \`\`\`
     * Si te dicen simplemente "agregá un parcial", "anotame un examen" o similar sin la fecha o materia: NO digas que no podés. Respondé con entusiasmo: "¡De una! Te lo agendo al instante. Decime: ¿para qué materia es, en qué fecha y a qué hora?". En cuanto te pase los datos, emitís el bloque y queda agendado.
     * Si te dan una fecha relativa ("el próximo martes", "este viernes"): Fijate en la sección CALENDARIO PRÓXIMOS 14 DÍAS (REFERENCIA EXACTA) y convertila a YYYY-MM-DD.
1. NUNCA digas que no tenés acceso a los datos del estudiante: tenés el 100% de su información universitaria arriba. Responde siempre con precisión utilizando estos datos reales.
2. Da DIRECTAMENTE la respuesta final al estudiante en español rioplatense (argentino), con calidez, cercanía y motivación (che, genial, dale, impecable).
3. ORDEN Y FORMATO ESTRUCTURADO OBLIGATORIO:
   - Responde SIEMPRE con formato Markdown prolijo, limpio y ordenado.
   - NUNCA amontones listas, materias ni viñetas en un solo párrafo continuo ni en una sola línea separada por comas.
   - Para datos académicos (promedio, progreso, materias, notas, exámenes):
     * Usá SIEMPRE viñetas de Markdown ("- ") en líneas separadas e independientes.
     * Dejá siempre un salto de línea doble entre párrafos, títulos y listas.
     * Agrupá las materias por año (ej: 1° Año, 2° Año) con sub-viñetas y resaltá siempre las notas numéricas en negrita (ej: "- Análisis Matemático I: **8.00**").
4. NUNCA expongas tu proceso de razonamiento en inglés ("The user asks...", "Let's produce..."). Empezá de inmediato con la respuesta al usuario.
5. ${powerLevel === "bajo" ? "Responde con máxima concisión y al grano." : "Explica detalladamente cuando te lo pidan."} Podés usar KaTeX para fórmulas matemáticas ($x^2$, $\\frac{a}{b}$) y bloques de código con resaltado.
6. AGENDAR O CREAR PARCIALES, EXÁMENES Y EVENTOS: Si el usuario te pide agendar, agregar, crear, sumar o anotar un examen, parcial, final o evento, dale una confirmación amigable e incluí al final el bloque:
\`\`\`tabe-action:calendar
[{"titulo": "Nombre del evento", "fecha": "YYYY-MM-DD", "hora": "HH:mm", "tipo_examen": "P1"}]
\`\`\`
7. Si el usuario te pide crear flashcards para estudiar un tema o a partir de un archivo (PDF, texto, imagen), genera EXACTAMENTE la cantidad solicitada (ej: 10, 15, 20, 25, 30 tarjetas) analizando a fondo todo el material adjunto e incluí al final el bloque:
\`\`\`tabe-action:flashcards
{"deck_name": "Tema", "cards": [{"pregunta": "¿Pregunta?", "respuesta": "Respuesta"}]}
\`\`\`
8. Si el usuario te pide evaluarlo, tomarle prueba, simulacro, quiz o cuestionario (o a partir de un PDF/imagen/texto/lista de preguntas):
   - CUMPLIMIENTO EXACTO Y SOPORTE DE HASTA 80 PREGUNTAS: Tienes capacidad total gracias a los modelos de NVIDIA para generar cuestionarios masivos de hasta 80 preguntas completas. Si el usuario pide 10, 20, 40, 50 u 80 preguntas, o si te proporciona un texto o examen con 40, 50 u 80 preguntas, DEBES PROCESAR Y GENERAR LA TOTALIDAD DE LAS PREGUNTAS (hasta 80) sin recortar ni truncar.
   - VINCULACIÓN INTELIGENTE DE MATERIAS Y MANEJO DE DUDAS/AMBIGÜEDAD (MUY IMPORTANTE):
     Revisa siempre el plan de estudios del estudiante [3. PLAN DE ESTUDIOS COMPLETO Y NOTAS] antes de generar el cuestionario:
     * Reconoce acrónimos y apodos comunes de inmediato: "RD" = "Redes de Datos", "BD" = "Bases de Datos", "SO" = "Sistemas Operativos", "Redes" = "Redes de Datos", "Álgebra" = "Álgebra y Geometría Analítica", "Análisis" = "Análisis Matemático", etc. Si el apodo o acrónimo apunta con claridad a una única materia de su plan, vincúlala directamente usando su nombre oficial completo en "subject_name".
     * PREGUNTAR ANTE DUDAS O AMBIGÜEDAD: Si el estudiante menciona un término ambiguo que puede referirse a 2 o más materias de su plan (por ejemplo: dice "Datos" y cursa "Redes de Datos" y "Bases de Datos", o dice "Sistemas" y tiene "Sistemas Operativos" y "Análisis de Sistemas"): NO crees el cuestionario a ciegas ni adivines. Respóndele primero con amabilidad preguntándole a cuál de las materias candidatas desea vincular el cuestionario, listando las opciones con viñetas o números para que elija. En cuanto el estudiante elija o confirme la materia, genera inmediatamente el cuestionario vinculado con el bloque de acción.
   - OBLIGATORIO: Cuando generes el cuestionario, incluí SIEMPRE al final de tu mensaje el bloque de acción EXACTO para que la app lo guarde automáticamente en la cuenta del estudiante con el nombre oficial de la materia en "subject_name":
\`\`\`tabe-action:quiz
{"quiz_name": "Nombre del Quiz", "subject_name": "Nombre Oficial de la Materia", "questions": [{"pregunta": "¿Pregunta?", "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"], "respuesta_correcta": 0, "explicacion": "Explicación"}]}
\`\`\`
9. PROMEDIO Y CALIFICACIONES: Si el estudiante te consulta sobre su promedio ('cuál es mi promedio', 'cómo voy con mi promedio', 'mis notas', 'situación académica'):
   - Presentalo de manera estructurada, limpia y visualmente ordenada con viñetas Markdown:
     * 📊 **Tu situación académica actual:**
     * - **Promedio general actual:** **[promedio]** ([X] materias computadas)
     * - **Progreso de carrera:** [X]/[Total] materias aprobadas ([pct]%)
     * - **Materias aprobadas con nota:** listadas ordenadamente con sub-viñetas ("  - Nombre (X° año): **Nota**").
   - Si no tiene materias con nota numérica registrada aún, explicaselo con calidez.
10. POLÍTICA ESTRICTA SOBRE IMÁGENES: Eres un asistente académico enfocado en el estudio, materias, exámenes y organización universitaria. NO eres una IA que genera imágenes y NO tienes la capacidad de crear, dibujar ni ilustrar imágenes o archivos gráficos.
    Si el estudiante te solicita crear, generar, dibujar, pintar o ilustrar una imagen, foto o arte visual, responde con amabilidad y total claridad diciendo textualmente que eres un asistente académico y que NO eres una IA que genera imágenes, ofreciéndole en su lugar estructurar la explicación en texto, crear resúmenes, esquemas conceptuales en Markdown, cuestionarios o flashcards de estudio.
    NUNCA devuelvas enlaces markdown con imágenes ni intentes invocar motores de generación visual.
11. RESÚMENES DE CLASES Y AUDIOS: Si el estudiante te comparte un audio, grabación o transcripción de clase para resumir, genera un resumen estructurado didáctico con: Puntos Clave, Conceptos y Definiciones Importantes, y Fechas/Entregas/Exámenes Mencionados (destacados con ⚠️).
12. En cualquier otra consulta o saludo, responde de forma amigable y fluida sin añadir bloques de acción innecesarios.
13. ACCESO A INTERACCIONES, PROFESORES Y GRUPOS DE ESTUDIO (FOROS Y CHATS):
    Tenes acceso total a los profesores del estudiante, sus horarios de consulta/atención, a sus amigos/compañeros y a los mensajes o foros de sus grupos de estudio (canales de Discord/chat) detallados arriba en las secciones [12], [13] y [14].
    - Si el estudiante te consulta sobre sus profesores ("cuándo atiende el profe", "a qué hora es la consulta de...", "qué horario tiene el profesor X", "qué rol tiene el profe"): responde con los datos reales de [12. PROFESORES Y HORARIOS DE CONSULTA].
    - Si te consulta sobre mensajes, chats, foros o preguntas de sus compañeros ("qué preguntaron en el grupo", "qué hablaron en el chat de Álgebra", "recordame mensajes importantes de profes/ayudantes", "qué dudas tienen mis compañeros", "respondeme las dudas frecuentes que dejaron en el foro"): responde basándote en los mensajes reales de [13. GRUPOS DE ESTUDIO, FOROS Y CONVERSACIONES], sintetizando dudas, respondiéndolas o destacando avisos clave.
    - Si te pide ayuda para organizar grupos de estudio ("ayudame a armar un grupo de estudio", "con quién puedo estudiar", "quién cursa conmigo"): apóyate en sus compañeros de [14. COMPAÑEROS DE ESTUDIO Y AMIGOS] y los canales existentes para sugerir temas, coordinar sesiones en común y aprovechar las consultas de los profesores.
    - NUNCA digas que no tenés acceso a foros, chats, mensajes o interacciones de profesores/compañeros: tenés la información cargada y disponible.
14. GESTIÓN Y ACTUALIZACIÓN TOTAL DE LA CUENTA DEL ESTUDIANTE (\`\`\`tabe-action:db):
    Tenés permiso y capacidad total para AGENDAR, REGISTRAR, MODIFICAR y BORRAR cualquier parcial, consulta, nota o rutina en la cuenta del estudiante cuando te lo pida:
    a) PARCIALES, EXÁMENES Y EVENTOS DEL CALENDARIO (target: "calendar_events"):
       - Si el estudiante te pide cambiar la fecha, hora, tipo de examen o borrar/cancelar un parcial o evento de su calendario:
         * Podés modificar 'fecha' (YYYY-MM-DD), 'hora' (HH:mm), 'tipo_examen' (P1, P2, P3, Global, Final, Recuperatorio P1, Recuperatorio P2, Recuperatorio Global, etc.), 'titulo', 'notas' o 'subject_name'.
         * Podés borrar eventos del calendario (operation: "delete").
         * Podés agendar nuevos exámenes o eventos (operation: "create").
    b) NOTAS DE PARCIALES, RECUPERATORIOS, FINALES Y ESTADO DE MATERIAS (target: "subject_status"):
       - Si el estudiante te dice que se sacó una nota en un parcial ("me saqué un 8 en el parcial 1 de Análisis", "modificá la nota del parcial 2 de Física a 7", "borrá la nota del parcial 1"):
         * Cargar o modificar notas numéricas: 'nota_parcial_1' (P1), 'nota_rec_parcial_1' (Rec P1), 'nota_parcial_2' (P2), 'nota_rec_parcial_2' (Rec P2), 'nota_global' (Global), 'nota_rec_global' (Rec Global), 'nota_final_examen' (Final), 'nota' (Nota definitiva).
         * Borrar notas: pasar null en la nota correspondiente (ej: {"nota_parcial_1": null}).
         * Cambiar estado de materia: 'aprobada', 'regular', 'cursable', 'recursar'.
    c) MATERIAS DEL PLAN (target: "subjects"): agregar materia nueva, modificar nombre/código/año o eliminar una materia.
    d) RUTINAS (target: "routines"): crear, cambiar horarios/días/nombre, pausar/activar ('is_active': true/false) o eliminar rutinas.
    e) PROFESORES Y CONSULTAS DE PROFES (target: "professors" o "office_hours"):
       - Cuando el estudiante te pida registrar, agregar o agendar una consulta de profesor ("agregá consulta de Álgebra los martes de 14 a 16 con el profe Juan", "agendá consulta de Física los viernes a las 10"):
         * target: "professors" (o "office_hours")
         * operation: "create" (o "update")
         * data: {
             "nombre": "Nombre del profesor (ej: Juan Pérez, o 'Profesor de Álgebra')",
             "materia": "Nombre de la materia (ej: Álgebra)",
             "rol": "teoria" | "practica",
             "dia": "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado",
             "hora_inicio": "14:00",
             "hora_fin": "16:00"
           }
       - Para borrar consulta o profesor: operation: "delete", match: { "nombre": "Nombre profe o materia" }.
    ⚡ REGLAS CRÍTICAS DE VELOCIDAD Y ACCIONES MÚLTIPLES (ALTA PRIORIDAD):
    1. Si el estudiante te pide realizar una o varias acciones (ej: agregar consulta de profes, cambiar una fecha, registrar estudio, etc.):
       - Incluí el bloque \`\`\`tabe-action:db DIRECTAMENTE en tu respuesta.
       - MÁXIMA VELOCIDAD Y CONCISIÓN: Respondé en MÁXIMO 1 o 2 oraciones breves y cálidas confirmando lo realizado (ej: "¡Listo! Registré la consulta de Álgebra para los martes de 14 a 16 hs."). NUNCA des explicaciones largas, rodeos ni discursos que demoren la respuesta.
    2. ACCIONES MÚLTIPLES SIMULTÁNEAS:
       - Si el estudiante te pide varias cosas a la vez (ej: "agregá la consulta de Álgebra los martes a las 14 y la de Física los jueves a las 18, y cambiale la fecha al parcial 1"):
         INCLUÍ TODAS LAS ACCIONES DENTRO DEL MISMO ARRAY del bloque \`\`\`tabe-action:db.
         Cada acción debe ser un objeto independiente en el array:
         \`\`\`tabe-action:db
         [
           { "target": "professors", "operation": "create", "data": { "nombre": "Prof. Juan", "materia": "Álgebra", "dia": "martes", "hora_inicio": "14:00", "hora_fin": "16:00" } },
           { "target": "professors", "operation": "create", "data": { "nombre": "Prof. Gómez", "materia": "Física", "dia": "jueves", "hora_inicio": "18:00", "hora_fin": "20:00" } },
           { "target": "calendar_events", "operation": "update", "match": { "subject_name": "Álgebra", "tipo_examen": "P1" }, "data": { "fecha": "2026-05-20" } }
         ]
         \`\`\`
    f) MAZOS DE FLASHCARDS Y CUESTIONARIOS (target: "flashcard_decks", target: "quiz_decks"): renombrar o eliminar mazos/cuestionarios.
    g) TIEMPO DE ESTUDIO Y SESIONES (target: "study_sessions"):
       - Si el estudiante te pide cargar, anotar o registrar tiempo de estudio ("cargame 2 horas de estudio de Física", "anotá 45 minutos de estudio", "estudié 1 hora y media de Análisis hoy"):
         * Usá target: "study_sessions", operation: "create".
         * data: {
             "subject_name": "Nombre de la materia (opcional)",
             "duracion_segundos": 7200, (o "minutos": 120, o "horas": 2),
             "fecha": "YYYY-MM-DD" (fecha del estudio, por defecto hoy),
             "tipo": "manual"
           }
       - Si te pide borrar una sesión: target: "study_sessions", operation: "delete".
    h) APUNTES Y ARCHIVOS (target: "notion_documents", target: "library_files"): crear, modificar o borrar.
    ⚠️ SEGURIDAD CRÍTICA Y DATOS SENSIBLES ESTRICTAMENTE PROHIBIDOS:
    - NUNCA intentes modificar ni borrar datos sensibles de la cuenta: Nombre del usuario, Apellido, Nombre de usuario (username), Contraseña (password), Correo electrónico (email), Teléfono, Suscripción/Plan de pago, Nivel/XP de user_stats, ni eliminar la cuenta.
    - Si el estudiante te pide cambiar su nombre, contraseña, email o datos de cuenta, explicale con calidez que por razones de seguridad y privacidad esos datos sensibles están protegidos y solo pueden modificarse manualmente desde Configuración.
    FORMATO OBLIGATORIO DE ACCIÓN DE ACTUALIZACIÓN:
    Cuando el estudiante te pida crear, modificar o borrar cualquiera de los datos permitidos, confirmale en tu respuesta en español rioplatense qué cambio hiciste e incluí OBLIGATORIAMENTE al final de tu mensaje el bloque:
\`\`\`tabe-action:db
[
  {
    "target": "calendar_events | subject_status | subjects | routines | professors | office_hours | flashcard_decks | quiz_decks | notion_documents | library_files | study_sessions",
    "operation": "create | update | delete",
    "id": "UUID si figura en el contexto (opcional)",
    "match": {
      "subject_name": "Nombre o apodo de materia",
      "titulo": "Título del evento/apunte/mazo/profe",
      "tipo_examen": "P1 | P2 | Final | etc.",
      "fecha": "YYYY-MM-DD"
    },
    "data": {
      "fecha": "YYYY-MM-DD",
      "hora": "HH:mm",
      "nota_parcial_1": 8,
      "estado": "regular"
    }
  }
]
\`\`\``;

  contextCache.set(cacheKey, { data: contextText, timestamp: Date.now() });
  return contextText;
}

/**
 * Executes TABE embedded actions (calendar, flashcards, quizzes) directly in Supabase
 */
/**
 * Analiza y repara JSONs de cuestionarios generados por modelos de IA (NVIDIA NIM/Groq/etc.),
 * recuperando preguntas completas incluso ante truncamientos de tokens o diferencias de nomenclatura.
 */
export function repairAndParseQuizJson(rawText: string): any {
  if (!rawText) return null;
  let text = rawText.trim();

  // Limpiar posibles fences de markdown
  text = text.replace(/^```(?:tabe-action:quiz|json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // 1. Parse directo
  try {
    const parsed = JSON.parse(text);
    const normalized = normalizeQuizPayload(parsed);
    if (normalized) return normalized;
  } catch {}

  // 2. Reparación por truncamiento: si el streaming cortó el JSON a mitad de camino,
  // buscar el último cierre de pregunta '}' válido y cerrar el array y objeto.
  const lastCloseBrace = text.lastIndexOf("}");
  if (lastCloseBrace !== -1) {
    const sliced = text.slice(0, lastCloseBrace + 1);
    const candidateSuffixes = [
      "]}",
      "\n  ]\n}",
      "\n]}",
      "}]}}",
    ];

    for (const suffix of candidateSuffixes) {
      try {
        const candidate = sliced + suffix;
        const parsed = JSON.parse(candidate);
        const normalized = normalizeQuizPayload(parsed);
        if (normalized && normalized.questions.length > 0) {
          return normalized;
        }
      } catch {}
    }
  }

  // 3. Extractor regex tolerante si la sintaxis JSON general está rota
  try {
    const nameMatch = text.match(/"(?:quiz_name|nombre|title|titulo|name)"\s*:\s*"([^"]+)"/i);
    const subMatch = text.match(/"(?:subject_name|materia|subject)"\s*:\s*"([^"]+)"/i);

    // Buscar preguntas con opciones
    const questions: any[] = [];
    const qRegex = /\{\s*"(?:pregunta|question|enunciado|texto)"\s*:\s*"([^"]+)"[\s\S]*?"(?:opciones|options|choices)"\s*:\s*\[([^\]]+)\][\s\S]*?"(?:respuesta_correcta|correct_answer|correcta)"\s*:\s*(\d+|"[a-d]"|true|false)(?:[\s\S]*?"(?:explicacion|explanation|justificacion)"\s*:\s*"([^"]*)")?[\s\S]*?\}/gi;

    let match;
    while ((match = qRegex.exec(text)) !== null) {
      try {
        const qText = match[1];
        const rawOpts = JSON.parse(`[${match[2]}]`);
        let correctIdx = 0;
        const rawAns = match[3];
        if (/^\d+$/.test(rawAns)) {
          correctIdx = parseInt(rawAns, 10);
        } else if (/^"[a-d]"$/i.test(rawAns)) {
          const letter = rawAns.replace(/"/g, "").toLowerCase();
          correctIdx = letter.charCodeAt(0) - 97;
        }

        questions.push({
          pregunta: qText,
          opciones: rawOpts,
          respuesta_correcta: correctIdx,
          explicacion: match[4] || "",
        });
      } catch {}
    }

    if (questions.length > 0) {
      return {
        quiz_name: nameMatch ? nameMatch[1] : "Cuestionario de Estudio",
        subject_name: subMatch ? subMatch[1] : null,
        questions,
      };
    }
  } catch {}

  return null;
}

function normalizeQuizPayload(data: any): any {
  if (!data || typeof data !== "object") return null;

  const quizName = data.quiz_name || data.nombre || data.title || data.titulo || data.name || "Cuestionario de Estudio";
  const subjectName = data.subject_name || data.materia || data.subject || null;
  const rawQuestions = data.questions || data.preguntas || data.items || [];

  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) return null;

  const questions = rawQuestions.map((q: any) => {
    const pregunta = q.pregunta || q.question || q.enunciado || q.texto || "Pregunta";
    let opciones: string[] = [];

    if (Array.isArray(q.opciones || q.options || q.choices)) {
      opciones = (q.opciones || q.options || q.choices).map((o: any) =>
        typeof o === "string" ? o : o?.texto || o?.text || String(o)
      );
    } else if (q.opciones && typeof q.opciones === "object") {
      opciones = Object.values(q.opciones).map(String);
    }

    let correctIdx = 0;
    const rawCorrect = q.respuesta_correcta ?? q.correct_answer ?? q.correcta ?? q.correctIndex ?? 0;
    if (typeof rawCorrect === "number") {
      correctIdx = rawCorrect;
    } else if (typeof rawCorrect === "string") {
      const lower = rawCorrect.trim().toLowerCase();
      if (/^[a-d]$/.test(lower)) {
        correctIdx = lower.charCodeAt(0) - 97;
      } else {
        const found = opciones.findIndex((opt) => opt.toLowerCase() === lower);
        correctIdx = found !== -1 ? found : 0;
      }
    }

    const explicacion = q.explicacion || q.explanation || q.justificacion || "";

    return {
      pregunta,
      opciones,
      respuesta_correcta: correctIdx,
      explicacion,
    };
  });

  return {
    quiz_name: quizName,
    subject_name: subjectName,
    questions,
  };
}

/**
 * Normaliza tipos de examen a valores válidos en la base de datos
 */
function normalizeExamType(raw: string): string {
  const n = (raw || "").toLowerCase().trim();
  const m: Record<string, string> = {
    "parcial1": "P1", "parcial 1": "P1", "p1": "P1", "primer parcial": "P1",
    "parcial2": "P2", "parcial 2": "P2", "p2": "P2", "segundo parcial": "P2",
    "global": "Global", "final": "Final",
    "recuperatorio": "Recuperatorio P1",
    "recuperatorio p1": "Recuperatorio P1", "recuperatorio 1": "Recuperatorio P1",
    "recuperatorio p2": "Recuperatorio P2", "recuperatorio 2": "Recuperatorio P2",
    "recuperatorio global": "Recuperatorio Global",
    "estudio": "Estudio", "estudiar": "Estudio",
    "tp": "TP", "trabajo practico": "TP", "trabajo práctico": "TP",
    "entrega": "Entrega", "clase": "Clase", "cursada": "Clase", "otro": "Otro",
  };
  if (m[n]) return m[n];
  const pMatch = n.match(/parcial\s*(\d+)/i) || n.match(/^p(\d+)$/i);
  if (pMatch) return `P${pMatch[1]}`;
  return "Otro";
}

/**
 * Motor universal de mutaciones en base de datos para TABE AI.
 * Ejecuta creaciones, modificaciones y eliminaciones de parciales, notas, rutinas, etc.
 * con protección estricta contra modificación de datos sensibles.
 */
async function executeDatabaseMutations(
  rawActionContent: string,
  currentUserId: string
): Promise<Array<{ target: string; operation: string; message: string }>> {
  if (!currentUserId || currentUserId === "guest") return [];

  let cleaned = rawActionContent.trim();
  cleaned = cleaned.replace(/^```(?:tabe-action:db|json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let actions: any[] = [];
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      actions = parsed;
    } else if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.actions)) actions = parsed.actions;
      else if (Array.isArray(parsed.operations)) actions = parsed.operations;
      else actions = [parsed];
    }
  } catch (err) {
    console.warn("[TABE AI DB] Error al parsear acción de BD:", err, cleaned);
    return [];
  }

  if (actions.length === 0) return [];

  const results: Array<{ target: string; operation: string; message: string }> = [];
  const norm = (s: string) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  let userSubjects: any[] = [];
  try {
    const { data: subs } = await (supabase as any)
      .from("subjects")
      .select("id, nombre, codigo, año, numero_materia")
      .eq("user_id", currentUserId);
    userSubjects = subs || [];
  } catch {}

  const stopWords = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "en", "para", "con", "i", "ii", "iii", "iv", "v", "1", "2", "3"]);
  const getAcronyms = (name: string): string[] => {
    const words = norm(name).split(" ").filter(Boolean);
    const meaningfulWords = words.filter((w) => !stopWords.has(w));
    const acrMeaningful = meaningfulWords.map((w) => w[0]).join("").toUpperCase();
    const acrAll = words.map((w) => w[0]).join("").toUpperCase();
    return Array.from(new Set([acrMeaningful, acrAll].filter((a) => a.length >= 2)));
  };

  const resolveSubject = (query: any): any | null => {
    if (!query) return null;
    let cleanQ = "";
    if (typeof query === "string") cleanQ = query.trim();
    else if (typeof query === "object" && query !== null) {
      cleanQ = String(query.nombre || query.name || query.materia || query.id || "").trim();
    }
    if (!cleanQ) return null;

    const exactUuid = userSubjects.find((s) => s.id === cleanQ);
    if (exactUuid) return exactUuid;

    const nq = norm(cleanQ);
    const exactName = userSubjects.find((s) => norm(s.nombre) === nq || norm(s.codigo) === nq);
    if (exactName) return exactName;

    const nqRoman = nq.replace(/\b1\b/g, "i").replace(/\b2\b/g, "ii").replace(/\b3\b/g, "iii");
    const nqArabic = nq.replace(/\biii\b/g, "3").replace(/\bii\b/g, "2").replace(/\bi\b/g, "1");
    for (const s of userSubjects) {
      const sn = norm(s.nombre);
      if (sn === nqRoman || sn === nqArabic) return s;
    }

    const cleanUpper = cleanQ.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleanUpper.length >= 2 && cleanUpper.length <= 5) {
      const acrMatches = userSubjects.filter((s) => getAcronyms(s.nombre).includes(cleanUpper));
      if (acrMatches.length > 0) return acrMatches[0];
    }

    for (const s of userSubjects) {
      const sn = norm(s.nombre);
      if (sn.includes(nq) || nq.includes(sn)) return s;
    }

    return null;
  };

  let subjectsTouched = false;
  let calendarTouched = false;
  let statsTouched = false;

  for (const act of actions) {
    if (!act || typeof act !== "object") continue;

    const rawTarget = String(act.target || act.table || act.tabla || act.entity || "").toLowerCase().trim();
    const rawOp = String(act.operation || act.action || act.op || act.type || "update").toLowerCase().trim();

    let op = "update";
    if (["create", "insert", "add", "new", "crear", "agregar"].includes(rawOp)) op = "create";
    else if (["delete", "remove", "clear", "erase", "borrar", "eliminar"].includes(rawOp)) op = "delete";

    // ── GUARDIA DE SEGURIDAD ESTRICTA: Datos sensibles bloqueados ──
    if (
      rawTarget.includes("profile") ||
      rawTarget.includes("user") ||
      rawTarget.includes("auth") ||
      rawTarget.includes("password") ||
      rawTarget.includes("contrase") ||
      rawTarget.includes("email") ||
      rawTarget.includes("correo") ||
      rawTarget.includes("account") ||
      rawTarget.includes("cuenta") ||
      rawTarget.includes("subscription") ||
      rawTarget.includes("suscrip") ||
      rawTarget.includes("xp")
    ) {
      console.warn("[TABE AI Security] Intento bloqueado de modificar datos sensibles:", rawTarget);
      results.push({
        target: rawTarget,
        operation: op,
        message: "Por seguridad, los datos sensibles de tu cuenta (nombre, contraseña, correo, etc.) solo pueden ser modificados manualmente desde Configuración.",
      });
      continue;
    }

    const data = act.data || {};
    const match = act.match || {};

    try {
      // 1. CALENDAR_EVENTS (Parciales, finales, exámenes)
      if (
        rawTarget.includes("calendar") ||
        rawTarget.includes("evento") ||
        rawTarget.includes("agenda") ||
        rawTarget.includes("exam") || rawTarget.includes("parcial") || rawTarget.includes("final") ||
        rawTarget === "examen" ||
        rawTarget === "parcial"
      ) {
        const { data: userEvents } = await (supabase as any)
          .from("calendar_events")
          .select("*")
          .eq("user_id", currentUserId)
          .order("fecha", { ascending: true });

        const allEvts = userEvents || [];

        const findTargetEvent = () => {
          if (act.id) {
            const byId = allEvts.find((e: any) => e.id === act.id);
            if (byId) return byId;
          }
          if (match.id) {
            const byId = allEvts.find((e: any) => e.id === match.id);
            if (byId) return byId;
          }

          const matchSub = resolveSubject(match.subject_name || match.subject_id || match.materia || data.subject_name || data.materia);
          const matchSubId = matchSub?.id;
          const matchTipo = match.tipo_examen || match.tipo || data.tipo_examen || data.tipo;
          const normTipo = matchTipo ? normalizeExamType(matchTipo) : null;
          const matchTitulo = match.titulo || match.title || match.nombre || data.titulo;
          const matchFecha = match.fecha || match.date;

          let bestEvent: any = null;
          let bestScore = 0;

          for (const ev of allEvts) {
            let score = 0;
            if (matchFecha && ev.fecha === matchFecha) score += 6;
            if (matchSubId && ev.subject_id === matchSubId) score += 6;
            if (normTipo && (ev.tipo_examen === normTipo || norm(ev.titulo).includes(norm(normTipo)))) score += 4;
            if (matchTitulo) {
              const nTitle = norm(matchTitulo);
              const evTitle = norm(ev.titulo);
              if (evTitle === nTitle) score += 8;
              else if (evTitle.includes(nTitle) || nTitle.includes(evTitle)) score += 5;
            }

            if (score > bestScore) {
              bestScore = score;
              bestEvent = ev;
            }
          }

          return bestScore >= 4 ? bestEvent : null;
        };

        if (op === "create") {
          const rawTipo = data.tipo_examen || data.tipo || match.tipo_examen || "P1";
          const tipoExamen = normalizeExamType(rawTipo);
          const sub = resolveSubject(data.subject_id || data.subject_name || data.materia || match.subject_name);
          const titulo = data.titulo || (sub ? `${tipoExamen} de ${sub.nombre}` : "Parcial");
          const fecha = data.fecha || data.date || match.fecha || match.date || new Date().toISOString().split("T")[0];

          const { error: insErr } = await (supabase as any)
            .from("calendar_events")
            .insert({
              user_id: currentUserId,
              titulo,
              fecha,
              hora: data.hora || data.time || match.hora || null,
              hora_fin: data.hora_fin || null,
              tipo_examen: tipoExamen,
              subject_id: sub?.id || null,
              notas: data.notas || null,
              ubicacion: data.ubicacion || null,
              color: getColorForType(tipoExamen),
            });

          if (!insErr) {
            calendarTouched = true;
            results.push({
              target: "calendar_events",
              operation: "create",
              message: `Parcial/evento "${titulo}" agendado para el ${fecha}.`,
            });
          }
        } else if (op === "update") {
          const targetEv = findTargetEvent();
          const sub = resolveSubject(data.subject_id || data.subject_name || data.materia || match.subject_name);

          if (targetEv) {
            const updates: any = {};
            if (data.titulo !== undefined) updates.titulo = data.titulo;
            if (data.fecha !== undefined) updates.fecha = data.fecha;
            if (data.hora !== undefined) updates.hora = data.hora || null;
            if (data.hora_fin !== undefined) updates.hora_fin = data.hora_fin || null;
            if (data.tipo_examen !== undefined || data.tipo !== undefined) {
              const newTipo = normalizeExamType(data.tipo_examen || data.tipo);
              updates.tipo_examen = newTipo;
              updates.color = getColorForType(newTipo);
            }
            if (data.notas !== undefined) updates.notas = data.notas || null;
            if (data.ubicacion !== undefined) updates.ubicacion = data.ubicacion || null;
            if (sub) updates.subject_id = sub.id;

            const { error: upErr } = await (supabase as any)
              .from("calendar_events")
              .update(updates)
              .eq("id", targetEv.id)
              .eq("user_id", currentUserId);

            if (!upErr) {
              calendarTouched = true;
              const evName = updates.titulo || targetEv.titulo;
              results.push({
                target: "calendar_events",
                operation: "update",
                message: `Evento "${evName}" modificado correctamente.`,
              });
            }
          } else if (data.fecha) {
            const tipo = normalizeExamType(data.tipo_examen || data.tipo || match.tipo_examen || "P1");
            const titulo = data.titulo || (sub ? `${tipo} de ${sub.nombre}` : (match.titulo || "Parcial"));
            await (supabase as any).from("calendar_events").insert({
              user_id: currentUserId,
              titulo,
              fecha: data.fecha,
              hora: data.hora || data.time || match.hora || null,
              tipo_examen: tipo,
              subject_id: sub?.id || null,
              color: getColorForType(tipo),
            });
            calendarTouched = true;
            results.push({
              target: "calendar_events",
              operation: "create",
              message: `Parcial "${titulo}" agendado para el ${data.fecha}.`,
            });
          }
        } else if (op === "delete") {
          const targetEv = findTargetEvent();
          if (targetEv) {
            const { error: delErr } = await (supabase as any)
              .from("calendar_events")
              .delete()
              .eq("id", targetEv.id)
              .eq("user_id", currentUserId);

            if (!delErr) {
              calendarTouched = true;
              results.push({
                target: "calendar_events",
                operation: "delete",
                message: `Evento "${targetEv.titulo}" eliminado del calendario.`,
              });
            }
          }
        }
      }

      // 2. SUBJECT_STATUS (Notas y estados de materias)
      else if (
        rawTarget.includes("status") ||
        rawTarget.includes("nota") ||
        rawTarget.includes("grade") ||
        rawTarget.includes("calificaci") ||
        rawTarget === "materia_estado" ||
        rawTarget === "materia_nota"
      ) {
        const sub = resolveSubject(
          act.id ||
          match.subject_id ||
          match.subject_name ||
          match.materia ||
          match.nombre ||
          data.subject_id ||
          data.subject_name ||
          data.materia
        );

        if (sub) {
          const { data: existingStatus } = await (supabase as any)
            .from("user_subject_status")
            .select("*")
            .eq("user_id", currentUserId)
            .eq("subject_id", sub.id)
            .maybeSingle();

          const parseNumOrNull = (val: any): number | null | undefined => {
            if (val === null || val === "" || val === "null") return null;
            if (val === undefined) return undefined;
            const n = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
            return isNaN(n) ? undefined : n;
          };

          if (op === "delete") {
            const fieldToDelete = match.field || act.field || null;
            if (fieldToDelete) {
              const colMap: Record<string, string> = {
                p1: "nota_parcial_1", parcial1: "nota_parcial_1", parcial_1: "nota_parcial_1", nota_parcial_1: "nota_parcial_1",
                p2: "nota_parcial_2", parcial2: "nota_parcial_2", parcial_2: "nota_parcial_2", nota_parcial_2: "nota_parcial_2",
                rec_p1: "nota_rec_parcial_1", rec1: "nota_rec_parcial_1",
                rec_p2: "nota_rec_parcial_2", rec2: "nota_rec_parcial_2",
                global: "nota_global", final: "nota_final_examen", nota: "nota"
              };
              const col = colMap[norm(fieldToDelete)] || fieldToDelete;
              await (supabase as any)
                .from("user_subject_status")
                .update({ [col]: null })
                .eq("user_id", currentUserId)
                .eq("subject_id", sub.id);
            } else {
              await (supabase as any)
                .from("user_subject_status")
                .delete()
                .eq("user_id", currentUserId)
                .eq("subject_id", sub.id);
            }
            subjectsTouched = true;
            statsTouched = true;
            results.push({
              target: "subject_status",
              operation: "delete",
              message: `Notas de ${sub.nombre} eliminadas.`,
            });
          } else {
            const updates: any = {};

            if (data.estado !== undefined) {
              const rawSt = norm(data.estado);
              if (rawSt.includes("aprob") || rawSt.includes("promocion")) updates.estado = "aprobada";
              else if (rawSt.includes("regul")) updates.estado = "regular";
              else if (rawSt.includes("curs") || rawSt.includes("sin")) updates.estado = "cursable";
              else if (rawSt.includes("rec") || rawSt.includes("libr")) updates.estado = "recursar";
              else updates.estado = data.estado;

              if (updates.estado === "aprobada" && !data.fecha_aprobacion && !existingStatus?.fecha_aprobacion) {
                updates.fecha_aprobacion = new Date().toISOString().split("T")[0];
              }
            }

            const p1 = parseNumOrNull(data.nota_parcial_1 ?? data.p1 ?? data.parcial_1 ?? data.parcial1);
            if (p1 !== undefined) updates.nota_parcial_1 = p1;

            const recP1 = parseNumOrNull(data.nota_rec_parcial_1 ?? data.rec_p1 ?? data.recuperatorio_1 ?? data.rec1);
            if (recP1 !== undefined) updates.nota_rec_parcial_1 = recP1;

            const p2 = parseNumOrNull(data.nota_parcial_2 ?? data.p2 ?? data.parcial_2 ?? data.parcial2);
            if (p2 !== undefined) updates.nota_parcial_2 = p2;

            const recP2 = parseNumOrNull(data.nota_rec_parcial_2 ?? data.rec_p2 ?? data.recuperatorio_2 ?? data.rec2);
            if (recP2 !== undefined) updates.nota_rec_parcial_2 = recP2;

            const glob = parseNumOrNull(data.nota_global ?? data.global);
            if (glob !== undefined) updates.nota_global = glob;

            const recGlob = parseNumOrNull(data.nota_rec_global ?? data.rec_global);
            if (recGlob !== undefined) updates.nota_rec_global = recGlob;

            const finalExam = parseNumOrNull(data.nota_final_examen ?? data.final ?? data.examen_final);
            if (finalExam !== undefined) updates.nota_final_examen = finalExam;

            const finalGrade = parseNumOrNull(data.nota ?? data.nota_final ?? data.nota_definitiva);
            if (finalGrade !== undefined) updates.nota = finalGrade;

            if (data.fecha_aprobacion !== undefined) updates.fecha_aprobacion = data.fecha_aprobacion;

            if (existingStatus) {
              await (supabase as any)
                .from("user_subject_status")
                .update(updates)
                .eq("id", existingStatus.id);
            } else {
              await (supabase as any)
                .from("user_subject_status")
                .insert({
                  user_id: currentUserId,
                  subject_id: sub.id,
                  estado: updates.estado || "cursable",
                  ...updates,
                });
            }

            subjectsTouched = true;
            statsTouched = true;
            results.push({
              target: "subject_status",
              operation: "update",
              message: `Notas/estado de ${sub.nombre} actualizados con éxito.`,
            });
          }
        }
      }

      // 3. SUBJECTS (Materias del plan)
      else if (rawTarget === "subjects" || rawTarget === "materia" || rawTarget === "materias") {
        if (op === "create" && data.nombre) {
          const { error: insErr } = await (supabase as any).from("subjects").insert({
            user_id: currentUserId,
            nombre: data.nombre,
            codigo: data.codigo || data.nombre.slice(0, 4).toUpperCase(),
            año: data.año || data.anio || 1,
            numero_materia: data.numero_materia || 1,
          });
          if (!insErr) {
            subjectsTouched = true;
            results.push({ target: "subjects", operation: "create", message: `Materia "${data.nombre}" agregada a tu plan.` });
          }
        } else if (op === "delete") {
          const sub = resolveSubject(act.id || match.subject_name || match.nombre || data.nombre);
          if (sub) {
            await (supabase as any).from("subject_dependencies").delete().eq("subject_id", sub.id);
            await (supabase as any).from("user_subject_status").delete().eq("subject_id", sub.id);
            await (supabase as any).from("subjects").delete().eq("id", sub.id).eq("user_id", currentUserId);
            subjectsTouched = true;
            results.push({ target: "subjects", operation: "delete", message: `Materia "${sub.nombre}" eliminada del plan.` });
          }
        }
      }

      // 4. ROUTINES (Rutinas y hábitos)
      else if (rawTarget.includes("routin") || rawTarget.includes("rutina") || rawTarget.includes("habito")) {
        if (op === "create") {
          const sub = resolveSubject(data.subject_id || data.subject_name || data.materia);
          await (supabase as any).from("routines").insert({
            user_id: currentUserId,
            name: data.name || data.nombre || "Rutina de estudio",
            category: data.category || "estudio",
            start_time: data.start_time || "09:00",
            end_time: data.end_time || "10:00",
            days_of_week: Array.isArray(data.days_of_week) ? data.days_of_week : [1, 2, 3, 4, 5],
            subject_id: sub?.id || null,
            is_active: data.is_active !== undefined ? data.is_active : true,
          });
          results.push({ target: "routines", operation: "create", message: "Rutina creada." });
        } else if (op === "update") {
          const routineId = act.id || match.id;
          const query = (supabase as any).from("routines").update(data).eq("user_id", currentUserId);
          if (routineId) query.eq("id", routineId);
          else if (match.name || match.nombre) query.ilike("name", match.name || match.nombre);
          await query;
          results.push({ target: "routines", operation: "update", message: "Rutina actualizada." });
        } else if (op === "delete") {
          const routineId = act.id || match.id;
          const query = (supabase as any).from("routines").delete().eq("user_id", currentUserId);
          if (routineId) query.eq("id", routineId);
          else if (match.name || match.nombre) query.ilike("name", match.name || match.nombre);
          await query;
          results.push({ target: "routines", operation: "delete", message: "Rutina eliminada." });
        }
      }

      // 5. PROFESSORS (Profesores y Horarios de Consulta)
      else if (
        rawTarget.includes("profesor") ||
        rawTarget.includes("professor") ||
        rawTarget.includes("docente") ||
        rawTarget.includes("office_hour") ||
        rawTarget.includes("consulta")
      ) {
        let sub = resolveSubject(
          data.subject_id ||
          data.subject_name ||
          data.materia ||
          data.subject ||
          data.asignatura ||
          data.materia_nombre ||
          data.nombre_materia ||
          match.subject_id ||
          match.subject_name ||
          match.materia ||
          match.subject ||
          act.subject_name ||
          act.materia
        );

        // Si no se detectó materia explícita, buscar en el nombre del profesor o descripción
        if (!sub) {
          const combinedSearch = `${data.nombre || ""} ${data.profesor || ""} ${data.name || ""} ${match.nombre || ""} ${data.descripcion || ""} ${act.nombre || ""}`;
          for (const s of userSubjects) {
            const sn = norm(s.nombre);
            if (sn.length >= 3 && norm(combinedSearch).includes(sn)) {
              sub = s;
              break;
            }
          }
        }

        // GARANTÍA CRÍTICA DE ESQUEMA POSTGRESQL (professors.subject_id NOT NULL):
        let targetSubjectId = sub?.id || (userSubjects.length > 0 ? userSubjects[0].id : null);
        if (!targetSubjectId) {
          const defaultSubName = data.materia || data.subject_name || "General";
          const { data: newSub } = await (supabase as any)
            .from("subjects")
            .insert({
              user_id: currentUserId,
              nombre: defaultSubName,
              año: 1
            })
            .select("id, nombre")
            .single();
          if (newSub) {
            targetSubjectId = newSub.id;
            sub = newSub;
            userSubjects.push(newSub);
          }
        }

        if (op === "create" || op === "update") {
          const profName = (
            data.nombre ||
            data.name ||
            data.profesor ||
            data.docente ||
            data.prof ||
            match.nombre ||
            match.name ||
            match.profesor ||
            act.nombre ||
            act.profesor ||
            (sub ? `Prof. de ${sub.nombre}` : "Profesor de Consulta")
          ).trim();

          let profRol = "teoria";
          const rawRol = String(data.rol || data.tipo || match.rol || "").toLowerCase();
          if (rawRol.includes("prac") || rawRol.includes("jtp") || rawRol.includes("ayud")) {
            profRol = "practica";
          }

          const profDesc = data.descripcion || data.notas || data.ubicacion || null;

          // Helper para normalizar día de la semana (Postgres CHECK IN: 'lunes','martes','miercoles','jueves','viernes','sabado')
          const normDay = (rawDay: any): string | null => {
            if (rawDay === null || rawDay === undefined) return null;

            if (typeof rawDay === "number" || /^\d+$/.test(String(rawDay).trim())) {
              const num = parseInt(String(rawDay).trim(), 10);
              if (num === 1) return "lunes";
              if (num === 2) return "martes";
              if (num === 3) return "miercoles";
              if (num === 4) return "jueves";
              if (num === 5) return "viernes";
              if (num === 6) return "sabado";
              return null; // Domingo no permitido por constraint
            }

            const d = String(rawDay).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

            if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
              try {
                const parsed = new Date(d.slice(0, 10) + "T12:00:00");
                if (!isNaN(parsed.getTime())) {
                  const days = ["", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
                  const dayIdx = parsed.getDay();
                  if (dayIdx >= 1 && dayIdx <= 6) return days[dayIdx];
                  return null;
                }
              } catch {}
            }

            if (d.includes("mar") || d.includes("tue")) return "martes";
            if (d.includes("mie") || d.includes("wed")) return "miercoles";
            if (d.includes("jue") || d.includes("thu")) return "jueves";
            if (d.includes("vie") || d.includes("fri")) return "viernes";
            if (d.includes("sab") || d.includes("sat")) return "sabado";
            if (d.includes("lun") || d.includes("mon")) return "lunes";
            return null;
          };

          const extractDaysFromAny = (input: any): string[] => {
            if (!input) return [];
            if (Array.isArray(input)) {
              const res: string[] = [];
              for (const x of input) {
                const nd = normDay(x);
                if (nd && !res.includes(nd)) res.push(nd);
              }
              return res;
            }
            const str = String(input).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const found: string[] = [];
            if (str.includes("mar") || str.includes("tue")) found.push("martes");
            if (str.includes("mie") || str.includes("wed")) found.push("miercoles");
            if (str.includes("jue") || str.includes("thu")) found.push("jueves");
            if (str.includes("vie") || str.includes("fri")) found.push("viernes");
            if (str.includes("sab") || str.includes("sat")) found.push("sabado");
            if (str.includes("lun") || str.includes("mon")) found.push("lunes");

            if (found.length === 0) {
              const nd = normDay(input);
              if (nd) found.push(nd);
            }
            return found;
          };

          const normTime = (rawTime: any): string | null => {
            if (rawTime === null || rawTime === undefined) return null;
            let str = String(rawTime).trim().toLowerCase().replace(/hs?|hrs?/g, "").trim();
            const parts = str.split(":");
            if (parts.length >= 2) {
              const h = parseInt(parts[0], 10);
              const m = parseInt(parts[1], 10) || 0;
              if (!isNaN(h) && h >= 0 && h < 24) {
                return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
              }
            } else if (parts.length === 1 && parts[0] !== "") {
              const h = parseInt(parts[0], 10);
              if (!isNaN(h) && h >= 0 && h < 24) {
                return `${String(h).padStart(2, "0")}:00`;
              }
            }
            return null;
          };

          const schedulesToInsert: { dia: string; hora_inicio: string; hora_fin: string }[] = [];
          const rawList = data.horarios || data.schedules || data.office_hours || data.clases_consulta || data.turnos || data.consultas;
          if (Array.isArray(rawList)) {
            for (const item of rawList) {
              if (typeof item === "object" && item !== null) {
                let dia = normDay(item.dia || item.day || item.dias);
                if (!dia && (item.horario || item.horas || item.rango || item.texto || item.descripcion)) {
                  const detected = extractDaysFromAny(item.horario || item.horas || item.rango || item.texto || item.descripcion);
                  if (detected.length > 0) dia = detected[0];
                }

                let hora_inicio = normTime(item.hora_inicio || item.start_time || item.inicio || item.desde || item.hora) || "14:00";
                let hora_fin = normTime(item.hora_fin || item.end_time || item.fin || item.hasta);

                if (!hora_fin) {
                  const [h, m] = hora_inicio.split(":").map(Number);
                  hora_fin = `${String(Math.min((h || 14) + 2, 22)).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
                }

                const [sh, sm] = hora_inicio.split(":").map(Number);
                const [eh, em] = hora_fin.split(":").map(Number);
                if (eh * 60 + (em || 0) <= sh * 60 + (sm || 0)) {
                  hora_fin = `${String(Math.min((sh || 14) + 2, 22)).padStart(2, "0")}:${String(sm || 0).padStart(2, "0")}`;
                }

                if (dia) {
                  schedulesToInsert.push({ dia, hora_inicio, hora_fin });
                }
              } else if (typeof item === "string") {
                const daysFound = extractDaysFromAny(item);
                const parts = item.split(/\s*(?:a|-|hasta|to)\s*/i);
                let h1 = normTime(parts[0]) || "14:00";
                let h2 = normTime(parts[1]);
                if (!h2) {
                  const [h, m] = h1.split(":").map(Number);
                  h2 = `${String(Math.min((h || 14) + 2, 22)).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
                }
                const [sh, sm] = h1.split(":").map(Number);
                const [eh, em] = h2.split(":").map(Number);
                if (eh * 60 + (em || 0) <= sh * 60 + (sm || 0)) {
                  h2 = `${String(Math.min((sh || 14) + 2, 22)).padStart(2, "0")}:${String(sm || 0).padStart(2, "0")}`;
                }
                for (const d of daysFound) {
                  schedulesToInsert.push({ dia: d, hora_inicio: h1, hora_fin: h2 });
                }
              }
            }
          }

          // Días y horarios directos
          const directDays: string[] = [
            ...extractDaysFromAny(data.dias),
            ...extractDaysFromAny(data.dia || data.day),
            ...extractDaysFromAny(match.dia || match.dias || match.day),
            ...extractDaysFromAny(data.fecha || match.fecha),
          ];

          const textSources = `${data.horario || ""} ${data.horarios_texto || ""} ${data.rango || ""} ${data.descripcion || ""} ${data.notas || ""} ${data.hora || ""}`;
          for (const td of extractDaysFromAny(textSources)) {
            if (!directDays.includes(td)) directDays.push(td);
          }

          let directStart = normTime(data.hora_inicio || data.start_time || data.inicio || data.hora || match.hora) || "14:00";
          let directEnd = normTime(data.hora_fin || data.end_time || data.fin || match.hora_fin);
          if (!directEnd) {
            const [h, m] = directStart.split(":").map(Number);
            directEnd = `${String(Math.min((h || 14) + 2, 22)).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
          }
          const [dsh, dsm] = directStart.split(":").map(Number);
          const [deh, dem] = directEnd.split(":").map(Number);
          if (deh * 60 + (dem || 0) <= dsh * 60 + (dsm || 0)) {
            directEnd = `${String(Math.min((dsh || 14) + 2, 22)).padStart(2, "0")}:${String(dsm || 0).padStart(2, "0")}`;
          }

          if (directDays.length > 0) {
            for (const d of directDays) {
              if (!schedulesToInsert.some(s => s.dia === d && s.hora_inicio === directStart)) {
                schedulesToInsert.push({ dia: d, hora_inicio: directStart, hora_fin: directEnd });
              }
            }
          } else if (schedulesToInsert.length === 0) {
            const todayNum = new Date().getDay();
            const defaultDay = (todayNum >= 1 && todayNum <= 6) ? ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"][todayNum - 1] : "martes";
            schedulesToInsert.push({ dia: defaultDay, hora_inicio: directStart, hora_fin: directEnd });
          }

          // 1. Buscar o crear profesor
          let profId: string | null = act.id || match.id || null;
          if (!profId) {
            const { data: existingProfs } = await (supabase as any)
              .from("professors")
              .select("id, nombre, subject_id")
              .eq("user_id", currentUserId)
              .ilike("nombre", profName);

            if (existingProfs && existingProfs.length > 0) {
              profId = existingProfs[0].id;
              const updateFields: any = {};
              if (targetSubjectId) updateFields.subject_id = targetSubjectId;
              if (profDesc) updateFields.descripcion = profDesc;
              if (profRol) updateFields.rol = profRol;
              if (Object.keys(updateFields).length > 0) {
                await (supabase as any).from("professors").update(updateFields).eq("id", profId);
              }
            }
          }

          if (!profId) {
            const { data: newProf, error: profErr } = await (supabase as any)
              .from("professors")
              .insert({
                user_id: currentUserId,
                nombre: profName,
                rol: profRol,
                descripcion: profDesc,
                subject_id: targetSubjectId,
                color_index: Math.floor(Math.random() * 8),
              })
              .select("id")
              .single();

            if (!profErr && newProf?.id) {
              profId = newProf.id;
            }
          }

          // 2. Guardar horarios de consulta
          let insertedCount = 0;
          if (profId && schedulesToInsert.length > 0) {
            await (supabase as any)
              .from("professor_office_hours")
              .delete()
              .eq("professor_id", profId);

            const { error: schedErr } = await (supabase as any)
              .from("professor_office_hours")
              .insert(
                schedulesToInsert.map(s => ({
                  professor_id: profId,
                  user_id: currentUserId,
                  dia: s.dia,
                  hora_inicio: s.hora_inicio,
                  hora_fin: s.hora_fin,
                }))
              );
            if (!schedErr) insertedCount = schedulesToInsert.length;
          }

          if (typeof window !== "undefined") {
            try { sessionStorage.setItem("tabe:office-hours-dirty", "true"); } catch {}
            window.dispatchEvent(new CustomEvent("tabe:office-hours-updated"));
          }

          const daysFormatted = schedulesToInsert.map(s => s.dia).join(", ");
          results.push({
            target: "professors",
            operation: op,
            message: `Profesor ${profName} guardado con éxito${
              insertedCount > 0 ? ` para los días ${daysFormatted} (${schedulesToInsert[0]?.hora_inicio} a ${schedulesToInsert[0]?.hora_fin})` : ""
            }.`,
          });
        } else if (op === "delete") {
          const profId = act.id || match.id;
          let targetProfId = profId;

          if (!targetProfId && (match.nombre || match.name || data.nombre || data.name)) {
            const targetName = match.nombre || match.name || data.nombre || data.name;
            const { data: profs } = await (supabase as any)
              .from("professors")
              .select("id, nombre")
              .eq("user_id", currentUserId)
              .ilike("nombre", targetName);

            if (profs && profs.length > 0) {
              targetProfId = profs[0].id;
            }
          }

          if (targetProfId) {
            await (supabase as any)
              .from("professor_office_hours")
              .delete()
              .eq("professor_id", targetProfId);

            await (supabase as any)
              .from("professors")
              .delete()
              .eq("id", targetProfId)
              .eq("user_id", currentUserId);

            if (typeof window !== "undefined") {
              try { sessionStorage.setItem("tabe:office-hours-dirty", "true"); } catch {}
              window.dispatchEvent(new CustomEvent("tabe:office-hours-updated"));
            }

            results.push({ target: "professors", operation: "delete", message: "Profesor y sus horarios de consulta eliminados." });
          }
        }
      }

      // 6. FLASHCARDS & QUIZZES
      else if (rawTarget.includes("flashcard") || rawTarget.includes("mazo")) {
        if (op === "delete") {
          const deckId = act.id || match.id;
          if (deckId) {
            await (supabase as any).from("flashcards").delete().eq("deck_id", deckId).eq("user_id", currentUserId);
            await (supabase as any).from("flashcard_decks").delete().eq("id", deckId).eq("user_id", currentUserId);
          } else if (match.nombre || match.name) {
            const { data: d } = await (supabase as any).from("flashcard_decks").select("id").eq("user_id", currentUserId).ilike("nombre", match.nombre || match.name).maybeSingle();
            if (d?.id) {
              await (supabase as any).from("flashcards").delete().eq("deck_id", d.id).eq("user_id", currentUserId);
              await (supabase as any).from("flashcard_decks").delete().eq("id", d.id).eq("user_id", currentUserId);
            }
          }
          results.push({ target: "flashcard_decks", operation: "delete", message: "Mazo de flashcards eliminado." });
        }
      } else if (rawTarget.includes("quiz") || rawTarget.includes("cuestionario")) {
        if (op === "delete") {
          const quizId = act.id || match.id;
          let targetQuizId = quizId;
          if (!targetQuizId && (match.nombre || match.name)) {
            const { data: qd } = await (supabase as any).from("quiz_decks").select("id").eq("user_id", currentUserId).ilike("nombre", match.nombre || match.name).maybeSingle();
            targetQuizId = qd?.id;
          }
          if (targetQuizId) {
            const { data: qList } = await (supabase as any).from("quiz_questions").select("id").eq("deck_id", targetQuizId);
            if (qList && qList.length > 0) {
              await (supabase as any).from("quiz_options").delete().in("question_id", qList.map((q: any) => q.id));
              await (supabase as any).from("quiz_questions").delete().eq("deck_id", targetQuizId);
            }
            await (supabase as any).from("quiz_decks").delete().eq("id", targetQuizId).eq("user_id", currentUserId);
            results.push({ target: "quiz_decks", operation: "delete", message: "Cuestionario eliminado." });
          }
        }
      }

      // 7. NOTION DOCUMENTS
      else if (rawTarget.includes("notion") || rawTarget.includes("apunte") || rawTarget.includes("document")) {
        if (op === "delete") {
          const docId = act.id || match.id;
          const query = (supabase as any).from("notion_documents").delete().eq("user_id", currentUserId);
          if (docId) query.eq("id", docId);
          else if (match.titulo || match.title) query.ilike("titulo", match.titulo || match.title);
          await query;
          results.push({ target: "notion_documents", operation: "delete", message: "Apunte eliminado." });
        }
      }

      // 8. STUDY_SESSIONS (Tiempo de estudio y métricas)
      else if (
        rawTarget === "study_sessions" ||
        rawTarget === "study_session" ||
        rawTarget.includes("sesion") ||
        rawTarget.includes("estudio") ||
        rawTarget.includes("tiempo") ||
        rawTarget.includes("metric")
      ) {
        if (op === "create") {
          const sub = resolveSubject(data.subject_id || data.subject_name || data.materia || match.subject_name || match.materia);

          // Calcular duracion_segundos de forma ultra tolerante
          let totalSeconds = 0;
          if (data.duracion_segundos !== undefined) {
            totalSeconds = Number(data.duracion_segundos) || 0;
          } else if (data.segundos !== undefined) {
            totalSeconds = Number(data.segundos) || 0;
          } else if (data.minutos !== undefined || data.minutes !== undefined) {
            totalSeconds = Math.round((Number(data.minutos ?? data.minutes) || 0) * 60);
          } else if (data.horas !== undefined || data.hours !== undefined) {
            totalSeconds = Math.round((Number(data.horas ?? data.hours) || 0) * 3600);
          } else if (data.duracion || data.duration) {
            const rawD = String(data.duracion || data.duration).toLowerCase();
            const hourMatch = rawD.match(/(\d+(?:\.\d+)?)\s*(?:h|hora)/);
            const minMatch = rawD.match(/(\d+(?:\.\d+)?)\s*(?:m|min)/);
            if (hourMatch) totalSeconds += parseFloat(hourMatch[1]) * 3600;
            if (minMatch) totalSeconds += parseFloat(minMatch[1]) * 60;
            if (totalSeconds === 0 && /^\d+$/.test(rawD.trim())) {
              const n = parseInt(rawD.trim(), 10);
              totalSeconds = n <= 12 ? n * 3600 : n * 60;
            }
          }

          if (totalSeconds <= 0) {
            totalSeconds = 3600; // Fallback a 1 hora si no se detectó número
          }

          const fecha = data.fecha || match.fecha || new Date().toISOString().split("T")[0];
          const tipo = data.tipo || "manual";

          const { error: insErr } = await (supabase as any)
            .from("study_sessions")
            .insert({
              user_id: currentUserId,
              fecha,
              duracion_segundos: totalSeconds,
              tipo,
              completada: true,
              subject_id: sub?.id || null,
            });

          if (!insErr) {
            statsTouched = true;

            // Actualizar horas totales, XP y créditos en user_stats
            const hours = Math.floor(totalSeconds / 3600);
            const xpGained = Math.round((totalSeconds / 60) * 0.5);
            const creditsGained = Math.floor(totalSeconds / 1800);

            try {
              const { data: stats } = await (supabase as any)
                .from("user_stats")
                .select("*")
                .eq("user_id", currentUserId)
                .maybeSingle();

              if (stats) {
                const currentStats = stats as any;
                await (supabase as any)
                  .from("user_stats")
                  .update({
                    horas_estudio_total: (currentStats.horas_estudio_total || 0) + hours,
                    xp_total: (currentStats.xp_total || 0) + xpGained,
                    credits: (currentStats.credits || 0) + creditsGained,
                    nivel: Math.floor(((currentStats.xp_total || 0) + xpGained) / 100) + 1,
                  })
                  .eq("user_id", currentUserId);

                await (supabase as any).rpc("check_and_unlock_achievements", { p_user_id: currentUserId });
              }
            } catch (statsErr) {
              console.warn("[TABE AI] Error al actualizar user_stats:", statsErr);
            }

            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("tabe_study_sessions_updated"));
            }

            const formattedTime = totalSeconds >= 3600
              ? `${(totalSeconds / 3600).toFixed(1).replace(".0", "")} hora(s)`
              : `${Math.round(totalSeconds / 60)} minuto(s)`;

            results.push({
              target: "study_sessions",
              operation: "create",
              message: `Se registraron ${formattedTime} de estudio en ${sub ? sub.nombre : "tu registro general"} (+${xpGained} XP).`,
            });
          }
        } else if (op === "delete") {
          const sessionId = act.id || match.id;
          if (sessionId) {
            await (supabase as any).from("study_sessions").delete().eq("id", sessionId).eq("user_id", currentUserId);
          } else {
            const sub = resolveSubject(match.subject_name || match.materia || data.subject_name);
            const query = (supabase as any).from("study_sessions").delete().eq("user_id", currentUserId);
            if (sub) query.eq("subject_id", sub.id);
            if (match.fecha || data.fecha) query.eq("fecha", match.fecha || data.fecha);
            await query;
          }
          statsTouched = true;
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("tabe_study_sessions_updated"));
          }
          results.push({ target: "study_sessions", operation: "delete", message: "Sesión de estudio eliminada." });
        }
      }
    } catch (actErr) {
      console.warn("[TABE AI DB] Error ejecutando mutación:", act, actErr);
    }
  }

  if (subjectsTouched) {
    invalidateSubjectsCache();
  }
  if (calendarTouched) {
    invalidateCalendarCache(currentUserId);
  }
  if (statsTouched) {
    invalidateDashboardStatsCache();
  }
  invalidateStudentContextCache(currentUserId);

  if (results.length > 0 && typeof window !== "undefined") {
    const successMessages = results.map((r) => r.message).join("\n");
    toast.success("TABE AI actualizó tu información:", {
      description: successMessages,
      duration: 4000,
    });
  }

  return results;
}

async function executeActionBlock(
  content: string,
  userId: string
): Promise<{ event_created?: any; flashcards_created?: any; quiz_created?: any; db_mutations?: any[]; cleanedContent: string }> {
  let cleanedContent = content;
  let event_created = null;
  let flashcards_created = null;
  let quiz_created = null;
  let db_mutations: any[] | null = null;

  // Resolver ID de usuario autenticado
  let currentUserId = userId;
  if (!currentUserId || currentUserId === "guest") {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) currentUserId = user.id;
    } catch {}
  }

  // 1. Extraer y procesar TODOS los bloques tabe-action del mensaje (soporte multi-bloque y multi-acción)
  const actionRegex = /```tabe-action:([a-z0-9_-]+)\s*([\s\S]*?)(?:```|$)/gi;
  let actionMatch: RegExpExecArray | null;
  const blocksToProcess: Array<{ type: string; raw: string; fullMatch: string }> = [];

  while ((actionMatch = actionRegex.exec(content)) !== null) {
    blocksToProcess.push({
      type: (actionMatch[1] || "").toLowerCase().trim(),
      raw: (actionMatch[2] || "").trim(),
      fullMatch: actionMatch[0],
    });
  }

  for (const block of blocksToProcess) {
    cleanedContent = cleanedContent.replace(block.fullMatch, "").trim();

    if (
      block.type === "db" ||
      block.type === "professors" ||
      block.type === "office_hours" ||
      block.type === "consultas" ||
      block.type === "routines" ||
      block.type === "subjects" ||
      block.type === "subject_status"
    ) {
      try {
        const mutResult = await executeDatabaseMutations(block.raw, currentUserId);
        if (mutResult && mutResult.length > 0) {
          db_mutations = [...(db_mutations || []), ...mutResult];
        }
      } catch (e) {
        console.warn("Failed to parse/execute db action:", e);
      }
    } else if (block.type === "calendar") {
      try {
        const parsed = JSON.parse(block.raw);
        const items = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" ? [parsed] : []);
        if (items.some((it: any) => it.operation === "update" || it.operation === "delete")) {
          const ops = items.map((it: any) => ({ table: "calendar_events", operation: it.operation || "create", id: it.id, match: it.match, data: it.data || it }));
          const mutRes = await executeDatabaseMutations(ops, currentUserId);
          if (mutRes && mutRes.length > 0) db_mutations = [...(db_mutations || []), ...mutRes];
        } else if (items.length > 0 && currentUserId && currentUserId !== "guest") {
          for (const it of items) {
            await (supabase as any).from("calendar_events").insert({
              user_id: currentUserId,
              titulo: it.titulo,
              fecha: it.fecha,
              hora: it.hora || null,
              tipo_examen: it.tipo_examen || "Otro",
              color: getColorForType(it.tipo_examen || "Otro"),
            });
          }
          event_created = items;
          invalidateCalendarCache(currentUserId);
        }
      } catch (e) {
        console.warn("Failed to parse calendar action:", e);
      }
    } else if (block.type === "flashcards") {
      try {
        const data = JSON.parse(block.raw);
        if (data.deck_name && Array.isArray(data.cards) && data.cards.length > 0 && currentUserId && currentUserId !== "guest") {
          const { data: deck } = await (supabase as any)
            .from("flashcard_decks")
            .insert({
              user_id: currentUserId,
              nombre: data.deck_name,
              total_cards: data.cards.length,
            })
            .select()
            .single();

          if (deck) {
            await (supabase as any).from("flashcards").insert(
              data.cards.map((c: any) => ({
                deck_id: deck.id,
                user_id: currentUserId,
                pregunta: c.pregunta,
                respuesta: c.respuesta,
              }))
            );
            flashcards_created = { deck, cards_count: data.cards.length };
            addInAppNotification({
              title: "¡Carga 100% completada! 🗂️",
              message: `Mazo "${data.deck_name}" creado con ${data.cards.length} flashcards de estudio.`,
              type: "flashcards",
              actionUrl: "/flashcards",
              progress: 100,
              status: "completed",
            });
          }
        }
      } catch (e) {
        console.warn("Failed to parse flashcard action:", e);
      }
    }
  }

  // 3. Quiz action (soporte de hasta 80 preguntas con autoreparación de truncamiento y batch insert)
  let quizData: any = null;
  let matchedSnippet = "";

  // A. Bloque ```tabe-action:quiz
  const quizRegex = /```tabe-action:quiz\s*([\s\S]*?)(?:```|$)/i;
  const quizMatch = content.match(quizRegex);
  if (quizMatch && quizMatch[1]) {
    quizData = repairAndParseQuizJson(quizMatch[1]);
    if (quizData) matchedSnippet = quizMatch[0];
  }

  // B. Bloque ```json con preguntas/cuestionario
  if (!quizData) {
    const jsonBlockRegex = /```(?:json)?\s*(\{[\s\S]*?(?:quiz_name|nombre|questions|preguntas)[\s\S]*?)(?:```|$)/i;
    const jsonMatch = content.match(jsonBlockRegex);
    if (jsonMatch && jsonMatch[1]) {
      quizData = repairAndParseQuizJson(jsonMatch[1]);
      if (quizData) matchedSnippet = jsonMatch[0];
    }
  }

  // C. JSON crudo embebido
  if (!quizData) {
    const rawMatch = content.match(/\{[\s\S]*?"(?:quiz_name|nombre)"[\s\S]*?"(?:questions|preguntas)"[\s\S]*$/i);
    if (rawMatch) {
      quizData = repairAndParseQuizJson(rawMatch[0]);
      if (quizData) matchedSnippet = rawMatch[0];
    }
  }

  if (matchedSnippet) {
    cleanedContent = cleanedContent.replace(matchedSnippet, "").trim();
  }

  // Inserción en la base de datos de Supabase si tenemos datos y usuario autenticado
  if (quizData && quizData.quiz_name && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
    try {
      const totalQCount = Math.min(quizData.questions.length, 80);
      const safeQuestions = quizData.questions.slice(0, 80);

      // Si no tenemos UUID de usuario, obtenerlo directamente de auth
      if (!currentUserId || currentUserId === "guest") {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          currentUserId = sessionData?.session?.user?.id || "guest";
        } catch {}
      }

      // Detección y resolución inteligente de materias (acrónimos como RD, apodos como Redes, desempate y auto-creación)
      let rawSubjectName = (quizData.subject_name || quizData.materia || quizData.subject || "").trim();
      const quizTitle = quizData.quiz_name || "";

      if (!rawSubjectName && quizTitle) {
        // Extraer candidato si viene en el título (ej: "Parcial 2 - Redes de Datos" o "Redes de Datos: Parcial 2")
        const parts = quizTitle.split(/[-–—:|]/);
        for (const p of parts) {
          const trimmed = p.trim();
          if (!/^(parcial|final|recuperatorio|quiz|cuestionario|tp|examen|simulacro|\d+)/i.test(trimmed) && trimmed.length > 1) {
            rawSubjectName = trimmed;
            break;
          }
        }
      }

      let subjectId: string | null = null;
      if (currentUserId && currentUserId !== "guest") {
        try {
          // Traer todas las materias del usuario
          const { data: userSubs } = await (supabase as any)
            .from("subjects")
            .select("id, nombre, codigo, año")
            .eq("user_id", currentUserId);

          const subjectsList: Array<{ id: string; nombre: string; codigo?: string }> = Array.isArray(userSubs) ? userSubs : [];

          // Helper para normalizar texto (sin tildes, minúsculas, sin puntuación)
          const normalize = (s: string) =>
            s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

          const stopWords = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "en", "para", "con", "i", "ii", "iii", "iv", "v", "1", "2", "3"]);

          // Función para calcular acrónimos de una materia (ej: "Redes de Datos" -> ["RD", "RDD"])
          const getAcronyms = (name: string): string[] => {
            const words = normalize(name).split(" ").filter(Boolean);
            const meaningfulWords = words.filter((w) => !stopWords.has(w));
            const acrMeaningful = meaningfulWords.map((w) => w[0]).join("").toUpperCase();
            const acrAll = words.map((w) => w[0]).join("").toUpperCase();
            return Array.from(new Set([acrMeaningful, acrAll].filter((a) => a.length >= 2)));
          };

          if (rawSubjectName && subjectsList.length > 0) {
            const cleanTarget = rawSubjectName.trim();
            const normTarget = normalize(cleanTarget);
            const targetUpper = cleanTarget.toUpperCase().replace(/[^A-Z0-9]/g, "");

            // 1. Coincidencia exacta por nombre
            let matched = subjectsList.find((s) => normalize(s.nombre) === normTarget);

            // 2. Coincidencia por acrónimo (ej: "RD" coincide con "Redes de Datos", "BD" con "Bases de Datos")
            if (!matched && targetUpper.length >= 2 && targetUpper.length <= 5) {
              const acronymMatches = subjectsList.filter((s) => {
                const acrs = getAcronyms(s.nombre);
                return acrs.includes(targetUpper);
              });
              if (acronymMatches.length === 1) {
                matched = acronymMatches[0];
              } else if (acronymMatches.length > 1) {
                // Desempate si el título del quiz contiene alguna palabra de la materia
                const normTitle = normalize(quizTitle);
                const titleMatch = acronymMatches.find((s) =>
                  normalize(s.nombre).split(" ").some((w) => !stopWords.has(w) && normTitle.includes(w))
                );
                matched = titleMatch || acronymMatches[0];
              }
            }

            // 3. Coincidencia por subcadena / apodo (ej: "Redes" en "Redes de Datos", "Datos" en "Bases de Datos")
            if (!matched && normTarget.length >= 3) {
              const substringMatches = subjectsList.filter((s) => {
                const normSub = normalize(s.nombre);
                return normSub.includes(normTarget) || normTarget.includes(normSub);
              });

              if (substringMatches.length === 1) {
                matched = substringMatches[0];
              } else if (substringMatches.length > 1) {
                // Si compiten varias (ej: "Datos" -> "Redes de Datos" y "Bases de Datos")
                // Desempate usando el título del quiz o contexto
                const normTitle = normalize(quizTitle);
                const bestCandidate = substringMatches.find((s) => {
                  const sWords = normalize(s.nombre).split(" ").filter((w) => !stopWords.has(w));
                  return sWords.every((w) => normTitle.includes(w));
                });
                matched = bestCandidate || substringMatches[0];
              }
            }

            if (matched) {
              subjectId = matched.id;
            }
          }

          // 4. Si el título del quiz contiene una materia del usuario y no teníamos match
          if (!subjectId && quizTitle && subjectsList.length > 0) {
            const normTitle = normalize(quizTitle);
            const titleMatched = subjectsList.find((s) => {
              const normSub = normalize(s.nombre);
              return normSub.length > 3 && normTitle.includes(normSub);
            });
            if (titleMatched) {
              subjectId = titleMatched.id;
            }
          }

          // 5. Si no se encontró ninguna materia existente pero el usuario especificó un nombre legítimo, crearla
          if (!subjectId && rawSubjectName && rawSubjectName.length >= 3) {
            const cleanName = rawSubjectName.trim();
            const subjectCode = cleanName
              .split(" ")
              .filter(Boolean)
              .map((w: string) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 5) || "MAT";

            const { data: createdSub, error: subCreateErr } = await (supabase as any)
              .from("subjects")
              .insert({
                user_id: currentUserId,
                nombre: cleanName,
                codigo: subjectCode,
                año: 1,
                numero_materia: 1,
              })
              .select("id")
              .single();

            if (!subCreateErr && createdSub?.id) {
              subjectId = createdSub.id;
            }
          }
        } catch (subErr) {
          console.warn("Error in smart subject resolution for quiz:", subErr);
        }
      }

      if (currentUserId && currentUserId !== "guest") {
        let deck: any = null;

        // Intento 1: Crear mazo con subject_id si existe
        if (subjectId) {
          const { data: d1, error: err1 } = await (supabase as any)
            .from("quiz_decks")
            .insert({
              user_id: currentUserId,
              nombre: quizData.quiz_name,
              subject_id: subjectId,
              total_questions: totalQCount,
            })
            .select()
            .single();

          if (!err1 && d1) deck = d1;
        }

        // Intento 2: Crear sin subject_id (si err1 o no tenía subjectId)
        if (!deck) {
          const { data: d2, error: err2 } = await (supabase as any)
            .from("quiz_decks")
            .insert({
              user_id: currentUserId,
              nombre: quizData.quiz_name,
              subject_id: null,
              total_questions: totalQCount,
            })
            .select()
            .single();

          if (!err2 && d2) deck = d2;
          else if (err2) console.error("Error inserting quiz_deck:", err2);
        }

        if (deck?.id) {
          // 2. Inserción masiva en lote (Batch) de las preguntas
          const questionsPayload = safeQuestions.map((q: any) => ({
            deck_id: deck.id,
            user_id: currentUserId,
            pregunta: q.pregunta || "Pregunta sin título",
            explicacion: q.explicacion || null,
            is_multi_select: false,
          }));

          const { data: createdQuestions, error: qErr } = await (supabase as any)
            .from("quiz_questions")
            .insert(questionsPayload)
            .select("id");

          if (createdQuestions && Array.isArray(createdQuestions)) {
            // 3. Inserción masiva de opciones
            const allOptions: any[] = [];
            createdQuestions.forEach((qData: any, idx: number) => {
              const originalQ = safeQuestions[idx];
              if (originalQ && Array.isArray(originalQ.opciones)) {
                const correctIdx = originalQ.respuesta_correcta ?? 0;
                originalQ.opciones.forEach((optText: string, oIdx: number) => {
                  allOptions.push({
                    question_id: qData.id,
                    texto: optText,
                    es_correcta: oIdx === correctIdx,
                  });
                });
              }
            });

            if (allOptions.length > 0) {
              for (let i = 0; i < allOptions.length; i += 200) {
                await (supabase as any).from("quiz_options").insert(allOptions.slice(i, i + 200));
              }
            }
          }

          quiz_created = { deck, questions_count: totalQCount };
          addInAppNotification({
            title: "¡Carga 100% completada! 📝",
            message: `Cuestionario "${quizData.quiz_name}" guardado exitosamente con ${totalQCount} preguntas.`,
            type: "quiz",
            actionUrl: "/cuestionarios",
            progress: 100,
            status: "completed",
          });

          // Invalidar caché local de cuestionarios y notificar a la aplicación
          try {
            localStorage.removeItem("tabe-quizzes-cache");
            localStorage.removeItem("tabe_quizzes_decks");
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("tabe-quizzes-updated"));
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn("Error saving batch quiz action:", e);
    }
  }

  // 4. Si la IA solo mandó el bloque de código y cleanedContent quedó vacío, generar mensaje amigable
  if (!cleanedContent.trim()) {
    if (quiz_created) {
      const qCount = quiz_created.questions_count ?? 0;
      const qName = quiz_created.deck?.nombre || "Cuestionario";
      cleanedContent = `¡Listo! Creé el cuestionario **"${qName}"** con ${qCount} preguntas. Ya podés encontrarlo en tu sección de Cuestionarios listo para practicar.`;
    } else if (flashcards_created) {
      const cCount = flashcards_created.cards_count ?? 0;
      const dName = flashcards_created.deck?.nombre || "Mazo";
      cleanedContent = `¡Listo! Creé el mazo de flashcards **"${dName}"** con ${cCount} tarjetas de estudio.`;
    } else if (event_created) {
      cleanedContent = "¡Listo! Agendé los eventos en tu calendario.";
    } else if (db_mutations && db_mutations.length > 0) {
      const isProf = db_mutations.some((m) => m.target === "professors" || m.target === "office_hours");
      const isCal = db_mutations.some((m) => m.target === "calendar_events");
      const isSub = db_mutations.some((m) => m.target === "subjects" || m.target === "subject_status");
      if (isProf) {
        cleanedContent = "¡Listo! Registré los profesores y horarios de consulta en tu cuenta.";
      } else if (isCal) {
        cleanedContent = "¡Listo! Agendé los eventos en tu calendario.";
      } else if (isSub) {
        cleanedContent = "¡Listo! Actualicé las notas y el estado de tus materias en tu plan.";
      } else {
        cleanedContent = "¡Listo! Ya guardé los cambios en tu cuenta.";
      }
    }
  }

  if (event_created || flashcards_created || quiz_created || (db_mutations && db_mutations.length > 0)) {
    if (currentUserId) invalidateStudentContextCache(currentUserId);
  }

  return { event_created, flashcards_created, quiz_created, db_mutations: db_mutations || undefined, cleanedContent };
}

/**
 * Unified Streaming AI Chat function with Automatic Fallback
 */
export async function streamAIChat(params: {
  messages: Array<{ role: string; content: string }>;
  systemPrompt: string;
  model: AIModelOption;
  powerLevel?: PowerEffort;
  userId: string;
  image?: { data: string; mime_type: string };
  onDelta: (text: string) => void;
  onReset?: () => void;          // Called when switching to a fallback model (clears UI)
  onComplete: (result: StreamResult) => void;
  onError: (error: Error) => void;
}): Promise<void> {
  const { messages, systemPrompt, powerLevel = "medio", userId, image, onDelta, onReset, onComplete, onError } = params;

  let success = false;
  let finalContent = "";

  const runTier = async (streamFn: (localDelta: (t: string) => void) => Promise<boolean>): Promise<boolean> => {
    let localBuffer = "";
    let isErrorResponse = false;
    let firstChunk = true;
    let hasEmitted = false;

    // Filtro en tiempo real: emite los tokens a medida que llegan filtrando <think> y bloques de código
    const filter = new StreamingContentFilter((cleanChunk: string) => {
      hasEmitted = true;
      onDelta(cleanChunk);
    });

    const localDelta = (chunk: string) => {
      if (firstChunk) {
        firstChunk = false;
        if (isApiErrorChunk(chunk)) {
          isErrorResponse = true;
          return;
        }
      }
      if (isErrorResponse) return;
      localBuffer += chunk;
      filter.processChunk(chunk);
    };

    try {
      const ok = await streamFn(localDelta);
      if (ok && !isErrorResponse && localBuffer.trim().length > 0) {
        finalContent = localBuffer;
        return true;
      }
    } catch (err) {
      console.warn("[TABE AI] Tier attempt failed:", err);
    }

    if (hasEmitted && onReset) {
      onReset();
    }
    return false;
  };

  // Tier 1: Clúster NVIDIA NIM (Prioridad 1 para todos los niveles de potencia y modelos de última generación)
  if (!success && !image) {
    const candidateModels = NVIDIA_MODELS_PRIORITY[powerLevel] || NVIDIA_MODELS_PRIORITY.medio;
    for (const nvModel of candidateModels) {
      success = await runTier((delta) =>
        streamFromNvidiaProxy({
          modelId: nvModel,
          systemPrompt,
          messages,
          powerLevel,
          onDelta: delta,
        })
      );
      if (success) {
        break;
      }
    }
  }

  // Tier 2: Supabase Edge Function (Groq Llama/Qwen & Gemini como respaldo automático)
  if (!success) {
    success = await runTier((delta) =>
      streamFromLocal({
        messages,
        systemPrompt,
        onDelta: delta,
        requestedModelId: "tabe-ai",
        requestedProvider: "local",
        powerLevel,
        image,
      })
    );
  }

  // Tier 3: Google Gemini (if client key available)
  if (!success && GEMINI_API_KEY) {
    for (const gModel of ["gemini-2.5-flash", "gemini-1.5-flash"]) {
      success = await runTier((delta) =>
        streamFromGoogle({
          modelId: gModel,
          systemPrompt,
          messages,
          powerLevel,
          onDelta: delta,
        })
      );
      if (success) break;
    }
  }

  // Tier 3: OpenRouter (if client key available)
  if (!success && OPENROUTER_API_KEY) {
    for (const orModel of ["deepseek/deepseek-chat", "google/gemini-2.0-flash-001", "meta-llama/llama-3.3-70b-instruct"]) {
      success = await runTier((delta) =>
        streamFromOpenRouter({
          modelId: orModel,
          systemPrompt,
          messages,
          powerLevel,
          onDelta: delta,
        })
      );
      if (success) break;
    }
  }

  // Tier 4: Offline smart local assistant
  if (!success) {
    success = await runTier((delta) =>
      streamFromOfflineLocal({
        messages,
        systemPrompt,
        onDelta: delta,
      })
    );
  }

  if (!success && !finalContent) {
    onError(new Error("No se pudo conectar con el servicio de TABE AI. Por favor intentá de nuevo en unos segundos."));
    return;
  }

  // Parse any action block and execute it
  try {
    const { event_created, flashcards_created, quiz_created, db_mutations, cleanedContent } = await executeActionBlock(
      finalContent,
      userId
    );
    const finalCleaned = cleanedContent || cleanAIResponse(finalContent);
    onComplete({
      content: finalCleaned,
      event_created,
      flashcards_created,
      quiz_created,
      db_mutations,
    });
  } catch (err) {
    console.warn('Error in executeActionBlock onComplete:', err);
    onComplete({ content: cleanAIResponse(finalContent) });
  }
}

/**
 * Streaming directo a través del clúster NVIDIA NIM (/api/nvidia-ai)
 * Accede a los más de 80 modelos con conmutación por error y velocidad optimizada.
 */
async function streamFromNvidiaProxy(opts: {
  modelId: string;
  systemPrompt?: string;
  messages: Array<{ role: string; content: string }>;
  powerLevel: PowerEffort;
  onDelta: (text: string) => void;
}): Promise<boolean> {
  const { modelId, systemPrompt, messages, powerLevel, onDelta } = opts;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const bearer = session?.access_token ? `Bearer ${session.access_token}` : "";
    if (!bearer) return false;

    const formattedMessages = [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      ...messages,
    ];

    // Detectar si el usuario pide generación masiva de preguntas (hasta 80) o contenido extenso
    const lastUserText = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const isBulkContent = /\b(quiz|cuestionario|cuestionarios|flashcards?|simulacro|parcial|preguntas?|evaluaci[oó]n|80|70|60|50|40)\b/i.test(lastUserText);

    const temperature = powerLevel === "bajo" ? 0.2 : powerLevel === "alto" ? 0.35 : 0.25;
    // Hasta 16384 tokens para permitir cuestionarios de hasta 80 preguntas sin truncamiento
    const maxTokens = isBulkContent ? 16384 : (powerLevel === "bajo" ? 180 : 8192);

    const controller = new AbortController();
    const initialTimeoutMs = isBulkContent ? 60000 : (powerLevel === "bajo" ? 8000 : 25000);
    let timeoutId = setTimeout(() => controller.abort(), initialTimeoutMs);

    const response = await fetch("/api/nvidia-ai", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: bearer,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: formattedMessages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      clearTimeout(timeoutId);
      return false;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let receivedContent = false;

    while (true) {
      // Renovar el timeout con cada fragmento de streaming recibido (35s de inactividad máxima entre tokens)
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => controller.abort(), isBulkContent ? 45000 : 15000);

      const { done, value } = await reader.read();
      if (done) {
        clearTimeout(timeoutId);
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          const chunk = parsed.choices?.[0]?.delta?.content || "";
          if (chunk) {
            receivedContent = true;
            onDelta(chunk);
          }
        } catch {
          // ignore non-json keepalives
        }
      }
    }
    return receivedContent;
  } catch (err) {
    console.warn(`[NVIDIA NIM Proxy] Error al contactar con ${modelId}:`, err);
    return false;
  }
}

/**
 * Streaming via OpenRouter SSE with dynamic reasoning effort per power level
 */
async function streamFromOpenRouter(opts: {
  modelId: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  powerLevel: PowerEffort;
  onDelta: (text: string) => void;
}): Promise<boolean> {
  const { modelId, systemPrompt, messages, powerLevel, onDelta } = opts;

  if (!OPENROUTER_API_KEY) return false;

  const controller = new AbortController();
  // 12s timeout for connection initiation
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const reasoningEffort =
    powerLevel === "alto" ? "high" : powerLevel === "medio" ? "low" : "none";
  const temperature = powerLevel === "alto" ? 0.7 : powerLevel === "bajo" ? 0.4 : 0.6;
  const maxTokens = powerLevel === "alto" ? 8192 : powerLevel === "bajo" ? 4096 : 8192;

  // Only include reasoning param for models that actually support extended thinking.
  // Sending it with effort="none" (or to non-reasoning models) triggers the
  // "model output must contain either output text or tool calls" error.
  const supportsReasoning = reasoningEffort !== "none";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin || "https://tabe.com.ar",
        "X-Title": "TABE",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        temperature,
        max_tokens: maxTokens,
        ...(supportsReasoning ? { reasoning: { effort: reasoningEffort } } : {}),
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn(`OpenRouter model ${modelId} HTTP ${res.status}:`, errBody);
      return false;
    }

    const reader = res.body?.getReader();
    if (!reader) return false;

    const decoder = new TextDecoder();
    let buffer = "";
    let receivedTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;

      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") continue;

        try {
          const parsed = JSON.parse(jsonStr);

          // OpenRouter can embed error objects inside the SSE stream
          if (parsed.error) {
            console.warn(`OpenRouter stream error for ${modelId}:`, parsed.error);
            continue;
          }

          const delta = parsed.choices?.[0]?.delta;
          // STRICT: Only pass delta.content to user, NEVER reasoning/internal thought tokens!
          const chunk = delta?.content;
          if (chunk) {
            receivedTokens++;
            onDelta(chunk);
          } else if (delta?.reasoning) {
            // Keep connection alive without leaking internal chain-of-thought
            receivedTokens++;
          }
        } catch {
          // partial chunk, wait for next line
        }
      }
    }

    return receivedTokens > 0;
  } catch (err) {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Guaranteed local fallback. It is intentionally transparent: it is a
 * recovery mode, not a pretend cloud model, and consumes no provider quota.
 */
async function streamFromLocal(opts: {
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  onDelta: (text: string) => void;
  requestedModelId: string;
  requestedProvider: AIModelOption["provider"];
  powerLevel: PowerEffort;
  image?: { data: string; mime_type: string };
}): Promise<boolean> {
  // TABE AI uses the protected Supabase Edge Function (powered by Groq / Gemini)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // Check if session token exists and refresh if expired or close to expiry
    let authToken = session?.access_token;
    if (session && session.expires_at && session.expires_at * 1000 < Date.now() + 30000) {
      try {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.session?.access_token) authToken = refreshed.session.access_token;
      } catch (_) {}
    }

    // Use user access token if available, otherwise anon key for guest mode
    const token = authToken || anonKey;

    if (token && supabaseUrl) {
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-assistant-stream`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: opts.messages,
          system_prompt: opts.systemPrompt,
          context_page: "TABEAI",
          requested_model_id: "tabe-ai",
          requested_provider: "local",
          power_level: opts.powerLevel,
          image: opts.image,
        }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let receivedContent = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              const chunk = parsed.choices?.[0]?.delta?.content || parsed.content;
              if (chunk) {
                receivedContent = true;
                opts.onDelta(chunk);
              }
            } catch {
              // Ignore non-JSON keepalive lines or partial chunks.
            }
          }
        }
        if (receivedContent) return true;
      } else {
        const errText = await response.text().catch(() => "");
        console.warn(`TABE AI Edge Function error HTTP ${response.status}:`, errText);
      }
    }
  } catch (error) {
    console.warn("TABE AI Edge Function unavailable; using offline fallback:", error);
  }
  return false;
}

/**
 * Offline safety net when no network or provider is accessible.
 */
async function streamFromOfflineLocal(opts: {
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  onDelta: (text: string) => void;
}): Promise<boolean> {
  const lastUserMessage = [...opts.messages].reverse().find((message) => message.role === "user")?.content?.trim();
  const normalized = (lastUserMessage || "").toLowerCase();
  const sys = opts.systemPrompt || "";

  // Helper to extract values from systemPrompt
  const extractFromPrompt = (label: string): string | null => {
    const regex = new RegExp(`${label}:?\\s*([^\\n]+)`, "i");
    const m = sys.match(regex);
    return m ? m[1].trim() : null;
  };

  const rawPromedio = extractFromPrompt("Promedio general actual") || extractFromPrompt("Promedio general") || extractFromPrompt("Promedio General");
  const promedioActual = rawPromedio ? rawPromedio.replace(/^\(materias aprobadas\):?\s*/i, "").trim() : null;
  const detalleNotas = extractFromPrompt("Detalle de notas aprobadas") || extractFromPrompt("Detalle de materias aprobadas y notas");
  const materiasAprobadasCount = extractFromPrompt("Aprobadas");
  const progresoCarrera = extractFromPrompt("Progreso de carrera") || extractFromPrompt("Progreso");
  const pendientesDesglose = extractFromPrompt("Materias pendientes de aprobar");

  let content = "";

  // 1. Duda de promedio / notas / calificaciones
  if (
    normalized.includes("promedio") ||
    normalized.includes("notas") ||
    normalized.includes("calificaciones") ||
    normalized.includes("cuánto me tengo que sacar") ||
    normalized.includes("que me tendría que sacar") ||
    normalized.includes("qué me tendría que sacar")
  ) {
    // Si el usuario pregunta qué necesita sacarse para llegar a X promedio
    const targetAvgMatch = normalized.match(/(?:promedio\s+de|llegar\s+a(?:l)?\s+|sacar(?:me)?\s+)?(\d+(?:[.,]\d+)?)/);
    const targetAvg = targetAvgMatch ? parseFloat(targetAvgMatch[1].replace(",", ".")) : null;

    if (promedioActual) {
      content = `📊 **Tu situación académica actual:**\n\n`;
      content += `- **Promedio general actual:** **${promedioActual}**\n`;
      if (progresoCarrera) content += `- **Progreso de carrera:** ${progresoCarrera}\n`;
      if (detalleNotas && !detalleNotas.toLowerCase().includes("ninguna")) {
        const materias = detalleNotas
          .split(/,\s*(?=[A-ZÁÉÍÓÚÑa-záéíóúñ\d\s\-/+]+(?:\([^)]+\))?:\s*\d)/)
          .map((m) => m.trim())
          .filter(Boolean);

        if (materias.length > 0) {
          content += `- **Materias aprobadas con nota:**\n`;
          materias.forEach((m) => {
            const formatted = m.replace(/:\s*(\d+(?:[.,]\d+)?)/, ": **$1**");
            content += `  - ${formatted}\n`;
          });
          content += `\n`;
        }
      }

      if (targetAvg && targetAvg >= 4 && targetAvg <= 10) {
        content += `🎯 **Para alcanzar un promedio de ${targetAvg.toFixed(2)}:**\n\n`;
        if (pendientesDesglose) {
          content += `- **Materias pendientes por cursar/aprobar:** ${pendientesDesglose}\n`;
        }
        content += `- Si mantenés un rendimiento superior a **${targetAvg.toFixed(2)}** en las próximas materias (promediando entre **${Math.min(10, Math.max(targetAvg, 8)).toFixed(1)}** y **${Math.min(10, targetAvg + 0.5).toFixed(1)}**), tu promedio subirá de forma sostenida.\n\n`;
      }
      content += `¡Vas con buen ritmo! Si querés que analicemos una materia o final en específico, decime y lo vemos juntos.`;
    } else {
      content = `Actualmente tu promedio está conectado a tu cuenta. Podés cargar tus notas finales en la sección de Materias para calcular la proyección exacta hacia el promedio deseado.`;
    }
  } else if (normalized.match(/^(hola|buenas|buen d[ií]a)/)) {
    content = "¡Hola! Soy TABE AI, tu asistente académico. Tengo acceso al 100% de tu información universitaria. Preguntame sobre tus materias, notas, calendario o exámenes y te respondo al instante.";
  } else if (normalized.includes("como estas") || normalized.includes("cómo estás")) {
    content = "¡Excelente! Estoy conectado con toda tu información académica, listo para ayudarte a organizar tus materias, preparar un examen o responder cualquier duda. ¿Qué necesitás hoy?";
  } else if (normalized.includes("plan")) {
    content = "Para armar tu plan: elegí la materia, anotá el objetivo del examen, separá el contenido en bloques y trabajá en sesiones de 25 minutos con repasos al final de cada bloque.";
  } else if (normalized.includes("flashcard") || normalized.includes("tarjeta")) {
    content = "Las flashcards funcionan mejor con una pregunta concreta adelante y una respuesta breve atrás. Separá las tarjetas difíciles y repasá esas con mayor frecuencia.";
  } else if (normalized.includes("quiz") || normalized.includes("simulacro")) {
    content = "Para un buen simulacro, respondé sin mirar apuntes, marcá tus dudas y corregí cada error escribiendo por qué la respuesta correcta es la correcta.";
  } else {
    content = `¡Hola! Estoy conectado a tu información académica. Tenés registradas ${materiasAprobadasCount || "tus"} materias y un promedio de **${promedioActual || "tu carrera"}**. ¿En qué materia o duda puntual te gustaría que nos enfoquemos?`;
  }

  for (let index = 0; index < content.length; index += 8) {
    opts.onDelta(content.slice(index, index + 8));
    await new Promise((resolve) => setTimeout(resolve, 8));
  }
  return true;
}

/**
 * Streaming via Google Gemini SSE (<1.8s)
 */
async function streamFromGoogle(opts: {
  modelId: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  powerLevel: PowerEffort;
  onDelta: (text: string) => void;
}): Promise<boolean> {
  const { modelId, systemPrompt, messages, powerLevel, onDelta } = opts;

  if (!GEMINI_API_KEY) return false;

  // Convert conversation to Gemini contents
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const temperature = powerLevel === "alto" ? 0.7 : powerLevel === "bajo" ? 0.4 : 0.6;
  const maxTokens = powerLevel === "alto" ? 8192 : powerLevel === "bajo" ? 4096 : 8192;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(powerLevel === "bajo" ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn(`Gemini model ${modelId} HTTP ${res.status}:`, errBody);
      return false;
    }

    const reader = res.body?.getReader();
    if (!reader) return false;

    const decoder = new TextDecoder();
    let buffer = "";
    let receivedTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;

      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        try {
          const parsed = JSON.parse(jsonStr);

          // Gemini can embed error objects inside the SSE stream (e.g. 503 capacity)
          if (parsed.error) {
            console.warn(`Gemini stream error for ${modelId}:`, parsed.error);
            return false; // Trigger fallback immediately
          }

          const parts = parsed.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if ((part as any).thought) {
              // Ignore internal thought reasoning
              receivedTokens++;
              continue;
            }
            const chunk = part.text;
            if (chunk) {
              receivedTokens++;
              onDelta(chunk);
            }
          }
        } catch {
          // partial chunk, ignore
        }
      }
    }

    return receivedTokens > 0;
  } catch (err) {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Transcribe audio using Groq Whisper via Supabase Edge Function
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
  });
  reader.readAsDataURL(audioBlob);
  const audioBase64 = await base64Promise;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ndmjrcinfugswtlknebl.supabase.co";
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-assistant-stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token || anonKey}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "transcribe",
      audio_base64: audioBase64,
      mime_type: audioBlob.type || "audio/ogg",
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Error en transcripción: ${errText || response.statusText}`);
  }

  const data = await response.json();
  return data.text || "";
}

