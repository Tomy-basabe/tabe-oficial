import { supabase } from "@/integrations/supabase/client";
import {
  AVAILABLE_AI_MODELS,
  DEFAULT_AI_MODEL,
  OPENROUTER_API_KEY,
  GEMINI_API_KEY,
  AIModelOption,
  PowerEffort,
  NVIDIA_MODELS_PRIORITY,
} from "@/config/aiModels";

export interface StreamResult {
  content: string;
  event_created?: any;
  flashcards_created?: { deck: any; cards_count: number };
  quiz_created?: { deck: any; questions_count: number };
}

// In-memory cache of student context to avoid re-querying on rapid consecutive messages (5 minutes TTL)
const contextCache = new Map<string, { data: string; timestamp: number }>();
const CONTEXT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

  // 3. Remove leaked English reasoning preambles
  const preambleRegex = /^\s*(?:The user (?:asks|wants|requested|is asking)[\s\S]*?(?:That's it\.?|Here is the response:?|Let's produce something like:[\s\S]*?That's it\.?))\s*/i;
  cleaned = cleaned.replace(preambleRegex, "");

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
          .gte("fecha", hoyStr)
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
          .select("subject_id, duracion_segundos, fecha, tipo")
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
              return `- "${r.name}" (${r.category || "Hábito"}): ${days} de ${r.start_time || "00:00"} a ${r.end_time || "00:00"}${subName}`;
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

  const contextText = `Sos ${personaName}, asistente y tutor académico de inteligencia artificial exclusivo de TABE (plataforma universitaria de Argentina).
Personalidad: ${personaPrompt}
MODALIDAD OPERATIVA: ${powerDirectives}
FECHA ACTUAL: ${hoyStr} (${hoyDia})

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
6. Si el usuario te pide expresamente agendar un examen o evento, dale una confirmación amigable e incluí al final el bloque:
\`\`\`tabe-action:calendar
[{"titulo": "Nombre del evento", "fecha": "YYYY-MM-DD", "hora": "HH:mm", "tipo_examen": "P1"}]
\`\`\`
7. Si el usuario te pide crear flashcards para estudiar un tema o a partir de un archivo (PDF, texto, imagen), genera EXACTAMENTE la cantidad solicitada (ej: 10, 15, 20, 25, 30 tarjetas) analizando a fondo todo el material adjunto e incluí al final el bloque:
\`\`\`tabe-action:flashcards
{"deck_name": "Tema", "cards": [{"pregunta": "¿Pregunta?", "respuesta": "Respuesta"}]}
\`\`\`
8. Si el usuario te pide evaluarlo, tomarle prueba, simulacro, quiz o cuestionario (o a partir de un PDF/imagen/texto/lista de preguntas):
   - CUMPLIMIENTO EXACTO Y SOPORTE DE HASTA 80 PREGUNTAS: Tienes capacidad total gracias a los modelos de NVIDIA para generar cuestionarios masivos de hasta 80 preguntas completas. Si el usuario pide 10, 20, 40, 50 u 80 preguntas, o si te proporciona un texto o examen con 40, 50 u 80 preguntas, DEBES PROCESAR Y GENERAR LA TOTALIDAD DE LAS PREGUNTAS (hasta 80) sin recortar ni truncar.
   - OBLIGATORIO: Incluí SIEMPRE al final de tu mensaje el bloque de acción EXACTO para que la app lo guarde automáticamente en la base de datos de Supabase. NUNCA envíes el JSON suelto como texto de conversación:
\`\`\`tabe-action:quiz
{"quiz_name": "Nombre del Quiz", "subject_name": "Materia (opcional)", "questions": [{"pregunta": "¿Pregunta?", "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"], "respuesta_correcta": 0, "explicacion": "Explicación"}]}
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
    - NUNCA digas que no tenés acceso a foros, chats, mensajes o interacciones de profesores/compañeros: tenés la información cargada y disponible.`;

  contextCache.set(cacheKey, { data: contextText, timestamp: Date.now() });
  return contextText;
}

/**
 * Executes TABE embedded actions (calendar, flashcards, quizzes) directly in Supabase
 */
async function executeActionBlock(
  content: string,
  userId: string
): Promise<{ event_created?: any; flashcards_created?: any; quiz_created?: any; cleanedContent: string }> {
  let cleanedContent = content;
  let event_created = null;
  let flashcards_created = null;
  let quiz_created = null;

  // 1. Calendar action
  const calRegex = /```tabe-action:calendar\s*([\s\S]*?)\s*```/;
  const calMatch = content.match(calRegex);
  if (calMatch && calMatch[1]) {
    try {
      const items = JSON.parse(calMatch[1].trim());
      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          await (supabase as any).from("calendar_events").insert({
            user_id: userId,
            titulo: it.titulo,
            fecha: it.fecha,
            hora: it.hora || null,
            tipo_examen: it.tipo_examen || "Otro",
            color: "#00d9ff",
          });
        }
        event_created = items;
      }
    } catch (e) {
      console.warn("Failed to parse calendar action:", e);
    }
    cleanedContent = cleanedContent.replace(calRegex, "").trim();
  }

  // 2. Flashcards action
  const fcRegex = /```tabe-action:flashcards\s*([\s\S]*?)\s*```/;
  const fcMatch = content.match(fcRegex);
  if (fcMatch && fcMatch[1]) {
    try {
      const data = JSON.parse(fcMatch[1].trim());
      if (data.deck_name && Array.isArray(data.cards) && data.cards.length > 0) {
        const { data: deck } = await (supabase as any)
          .from("flashcard_decks")
          .insert({
            user_id: userId,
            nombre: data.deck_name,
            total_cards: data.cards.length,
          })
          .select()
          .single();

        if (deck) {
          await (supabase as any).from("flashcards").insert(
            data.cards.map((c: any) => ({
              deck_id: deck.id,
              user_id: userId,
              pregunta: c.pregunta,
              respuesta: c.respuesta,
            }))
          );
          flashcards_created = { deck, cards_count: data.cards.length };
        }
      }
    } catch (e) {
      console.warn("Failed to parse flashcard action:", e);
    }
    cleanedContent = cleanedContent.replace(fcRegex, "").trim();
  }

  // 3. Quiz action (soporte robusto de hasta 80 preguntas con batch insert y fallbacks)
  let quizData: any = null;
  const quizRegex = /```tabe-action:quiz\s*([\s\S]*?)\s*```/;
  const quizMatch = content.match(quizRegex);

  if (quizMatch && quizMatch[1]) {
    try {
      quizData = JSON.parse(quizMatch[1].trim());
      cleanedContent = cleanedContent.replace(quizRegex, "").trim();
    } catch (e) {
      console.warn("Failed to parse tabe-action:quiz:", e);
    }
  }

  // Fallback 1: Si el modelo volcó el JSON en bloque ```json o similar
  if (!quizData) {
    const jsonBlockRegex = /```(?:json)?\s*(\{\s*"quiz_name"[\s\S]*?"questions"\s*:\s*\[[\s\S]*?\]\s*\})\s*```/;
    const jsonMatch = content.match(jsonBlockRegex);
    if (jsonMatch && jsonMatch[1]) {
      try {
        quizData = JSON.parse(jsonMatch[1].trim());
        cleanedContent = cleanedContent.replace(jsonBlockRegex, "").trim();
      } catch {}
    }
  }

  // Fallback 2: Objeto JSON crudo embebido en el texto de respuesta
  if (!quizData) {
    const rawJsonMatch = content.match(/\{\s*"quiz_name"\s*:\s*"[^"]+"\s*,\s*(?:"subject_name"\s*:\s*"[^"]*"\s*,\s*)?"questions"\s*:\s*\[[\s\S]*?\}\s*\]\s*\}/);
    if (rawJsonMatch) {
      try {
        quizData = JSON.parse(rawJsonMatch[0]);
        cleanedContent = cleanedContent.replace(rawJsonMatch[0], "").trim();
      } catch {}
    }
  }

  if (quizData && quizData.quiz_name && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
    try {
      let subjectId = null;
      if (quizData.subject_name) {
        const { data: subData } = await (supabase as any)
          .from("subjects")
          .select("id")
          .ilike("nombre", `%${quizData.subject_name.trim()}%`)
          .limit(1)
          .maybeSingle();
        if (subData) subjectId = subData.id;
      }

      const totalQCount = Math.min(quizData.questions.length, 80);
      const safeQuestions = quizData.questions.slice(0, 80);

      // 1. Crear Deck
      const { data: deck } = await (supabase as any)
        .from("quiz_decks")
        .insert({
          user_id: userId,
          nombre: quizData.quiz_name,
          subject_id: subjectId,
          total_questions: totalQCount,
        })
        .select()
        .single();

      if (deck) {
        // 2. Inserción masiva en lote (Batch) de las preguntas
        const questionsPayload = safeQuestions.map((q: any) => ({
          deck_id: deck.id,
          user_id: userId,
          pregunta: q.pregunta || "Pregunta sin título",
          explicacion: q.explicacion || null,
        }));

        const { data: createdQuestions, error: qErr } = await (supabase as any)
          .from("quiz_questions")
          .insert(questionsPayload)
          .select("id");

        if (createdQuestions && Array.isArray(createdQuestions)) {
          // 3. Inserción en lote de todas las opciones asociadas
          const allOptions: any[] = [];
          createdQuestions.forEach((qData: any, idx: number) => {
            const originalQ = safeQuestions[idx];
            if (originalQ && Array.isArray(originalQ.opciones)) {
              const correctIdx = originalQ.respuesta_correcta ?? originalQ.correcta ?? 0;
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
      }
    } catch (e) {
      console.warn("Error saving batch quiz action:", e);
    }
  }

  if (event_created || flashcards_created || quiz_created) {
    invalidateStudentContextCache(userId);
  }

  return { event_created, flashcards_created, quiz_created, cleanedContent };
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
    };

    try {
      const ok = await streamFn(localDelta);
      if (ok && !isErrorResponse && localBuffer.trim().length > 0) {
        const cleaned = cleanAIResponse(localBuffer);
        if (onReset) onReset();
        onDelta(cleaned);
        finalContent = cleaned;
        return true;
      }
    } catch (err) {
      console.warn("[TABE AI] Tier attempt failed:", err);
    }

    if (localBuffer.trim().length > 0 && onReset) {
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
    const { event_created, flashcards_created, quiz_created, cleanedContent } = await executeActionBlock(
      finalContent,
      userId
    );
    onComplete({
      content: cleanedContent || finalContent,
      event_created,
      flashcards_created,
      quiz_created,
    });
  } catch {
    onComplete({ content: finalContent });
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

