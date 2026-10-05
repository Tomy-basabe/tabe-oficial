import { supabase } from "@/integrations/supabase/client";
import {
  StudyRoadmap,
  RoadmapLevel,
  MaterialSection,
  LevelStudyPack,
  LevelQuizQuestion,
  LevelFlashcard,
  OralExamQuestion,
  OralAnswerEvaluation,
} from "@/types/studyRoadmap";
import { buildAIContent } from "@/lib/materialExtractor";
import {
  LevelPlan,
  heuristicRoadmap,
  splitIntoChunks,
  pickExcerpt,
  tokenize,
  buildComprehensiveLevelPack,
  getLevelWorkload,
  evaluateOralAnswerLocal,
} from "@/lib/roadmapHeuristics";
import { toast } from "sonner";

const LOCAL_STORAGE_KEY = "tabe_study_roadmaps_v1";

/**
 * Obtiene todas las rutas de estudio del usuario actual.
 * Resiliente: Si la tabla no existe en la BD o el usuario es invitado, carga desde localStorage.
 */
export async function getStudyRoadmaps(userId?: string): Promise<StudyRoadmap[]> {
  const localData = getLocalRoadmaps();

  if (!userId) {
    return localData;
  }

  try {
    const { data, error } = await supabase
      .from("study_roadmaps" as any)
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("[studyRoadmapService] Fallback a local storage:", error.message);
      return localData;
    }

    if (data && data.length >= 0) {
      // Sincronizar con lo que hay en Supabase (si la BD está activa)
      if (data.length > 0) {
        saveLocalRoadmaps(data as unknown as StudyRoadmap[]);
        return data as unknown as StudyRoadmap[];
      }
      return localData;
    }

    return localData;
  } catch (err) {
    console.warn("[studyRoadmapService] Error consultando roadmaps:", err);
    return localData;
  }
}

/**
 * Guarda una nueva ruta de estudio o actualiza una existente.
 * Realiza un ÚNICO INSERT o UPDATE en Supabase para respetar las cuotas gratuitas.
 */
export async function saveStudyRoadmap(
  roadmap: Omit<StudyRoadmap, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<StudyRoadmap> {
  const now = new Date().toISOString();
  const id = roadmap.id || crypto.randomUUID();

  const fullRoadmap: StudyRoadmap = {
    ...roadmap,
    id,
    created_at: (roadmap as any).created_at || now,
    updated_at: now,
  };

  // 1. Guardar localmente de inmediato (UI reactiva instantánea)
  const localList = getLocalRoadmaps();
  const existingIdx = localList.findIndex((r) => r.id === id);
  if (existingIdx >= 0) {
    localList[existingIdx] = fullRoadmap;
  } else {
    localList.unshift(fullRoadmap);
  }
  saveLocalRoadmaps(localList);

  // 2. Persistir en Supabase si hay sesión activa
  if (roadmap.user_id) {
    try {
      const payload = {
        id,
        user_id: roadmap.user_id,
        subject_id: roadmap.subject_id || null,
        subject_name: roadmap.subject_name,
        exam_date: roadmap.exam_date,
        target_mastery: roadmap.target_mastery,
        study_preference: roadmap.study_preference,
        roadmap_data: roadmap.roadmap_data,
        current_level: roadmap.current_level,
        total_levels: roadmap.total_levels,
        completed_levels: roadmap.completed_levels,
        updated_at: now,
      };

      const { error } = await supabase
        .from("study_roadmaps" as any)
        .upsert(payload);

      if (error) {
        console.warn("[studyRoadmapService] No se pudo persistir en Supabase (usando local):", error.message);
      }
    } catch (e) {
      console.warn("[studyRoadmapService] Excepción al guardar en BD:", e);
    }
  }

  return fullRoadmap;
}

/**
 * Elimina por completo una ruta de estudio y todo su contenido asociado (niveles, fragmentos,
 * guías y quizzes en JSONB) tanto de Supabase como del almacenamiento local,
 * sin afectar materias, calendario, XP ni monedas del usuario.
 */
export async function deleteStudyRoadmap(
  roadmapId: string,
  userId?: string
): Promise<boolean> {
  // 1. Limpiar de inmediato en almacenamiento local
  const currentLocal = getLocalRoadmaps();
  const filteredLocal = currentLocal.filter((r) => r.id !== roadmapId);
  saveLocalRoadmaps(filteredLocal);

  // 2. Eliminar registro en Supabase (libera el espacio JSONB en la BD)
  if (userId) {
    try {
      const { error } = await supabase
        .from("study_roadmaps" as any)
        .delete()
        .eq("id", roadmapId)
        .eq("user_id", userId);

      if (error) {
        console.warn("[studyRoadmapService] Error al borrar ruta en Supabase:", error.message);
      }
    } catch (err) {
      console.warn("[studyRoadmapService] Excepción al borrar ruta en BD:", err);
    }
  }

  return true;
}

/**
 * Cachea localmente el paquete de estudio generado para un nivel específico
 * para que al volver a abrir el nodo no se vuelva a consumir IA innecesariamente.
 */
export function cacheLevelStudyPack(
  roadmapId: string | undefined,
  levelNumber: number,
  pack: LevelStudyPack
) {
  if (!roadmapId) return;
  const list = getLocalRoadmaps();
  const idx = list.findIndex((r) => r.id === roadmapId);
  if (idx === -1) return;

  const roadmap = { ...list[idx] };
  const levels = [...roadmap.roadmap_data.roadmap];
  const lvlIdx = levels.findIndex((l) => l.level === levelNumber);
  if (lvlIdx === -1) return;

  levels[lvlIdx] = {
    ...levels[lvlIdx],
    studyPack: pack,
    quizQuestions: pack.questions,
    flashcards: pack.flashcards,
  };
  roadmap.roadmap_data = {
    ...roadmap.roadmap_data,
    roadmap: levels,
  };
  list[idx] = roadmap;
  saveLocalRoadmaps(list);
}

/**
 * Actualiza el progreso de un nivel en una ruta de estudio existente.
 * Realiza un ÚNICO update en la columna JSONB.
 */
export async function completeLevelAndUnlockNext(
  roadmapId: string,
  levelNumber: number,
  userId?: string,
  scoreAchieved?: number
): Promise<StudyRoadmap | null> {
  const list = getLocalRoadmaps();
  const roadmap = list.find((r) => r.id === roadmapId);
  if (!roadmap) return null;

  const currentRoadmap = { ...roadmap };
  const levels = [...currentRoadmap.roadmap_data.roadmap];

  // Marcar nivel actual como completado
  const currentIdx = levels.findIndex((l) => l.level === levelNumber);
  if (currentIdx >= 0) {
    levels[currentIdx] = {
      ...levels[currentIdx],
      completed: true,
      score: scoreAchieved ?? levels[currentIdx].score,
    };
  }

  // Desbloquear nivel siguiente
  const nextIdx = levels.findIndex((l) => l.level === levelNumber + 1);
  if (nextIdx >= 0) {
    levels[nextIdx] = { ...levels[nextIdx], unlocked: true };
  }

  const completedCount = levels.filter((l) => l.completed).length;
  currentRoadmap.roadmap_data = {
    ...currentRoadmap.roadmap_data,
    roadmap: levels,
  };
  currentRoadmap.completed_levels = completedCount;
  currentRoadmap.current_level = Math.min(levels.length, levelNumber + 1);
  currentRoadmap.updated_at = new Date().toISOString();

  // Guardar cambio
  await saveStudyRoadmap(currentRoadmap);

  // Otorgar Recompensas: Tabecoins y XP para TabeGochi
  rewardUserGamification(35, 75);

  return currentRoadmap;
}

export interface RoadmapContext {
  subjectName: string;
  eventLabel?: string;
  examDate: string;
  daysLeft: number;
  targetMastery: number;
  studyPreference: "leer" | "podcast" | "practicar" | "escuchar";
}

const PREFERENCE_TEXT: Record<string, string> = {
  leer: "prefiere LEER: priorizá explicaciones densas, definiciones formales y estructura teórica clara",
  podcast: "prefiere PODCAST: redactá explicaciones fluidas, atractivas y conversacionales como un host de podcast académico",
  escuchar: "prefiere PODCAST: redactá explicaciones fluidas, atractivas y conversacionales como un host de podcast académico",
  practicar: "prefiere PRACTICAR: priorizá casos de aplicación, ejercicios de parcial/final y resolución paso a paso",
};

/**
 * Genera la ruta por niveles personalizada por evento, materia, meta de dominio y volumen de archivos.
 */
export async function generateRoadmapWithAI(params: {
  ctx: RoadmapContext;
  sections: MaterialSection[];
  plan: LevelPlan;
}): Promise<RoadmapLevel[]> {
  const { ctx, sections, plan } = params;
  const totalChars = sections.reduce((a, s) => a + s.text.length, 0);
  const fileNames = sections.map((s) => s.source);

  const instructions = `CONTEXTO DEL ESTUDIANTE (ruta universitaria personalizada por tiempo y meta):
- Materia: "${ctx.subjectName}" (carrera universitaria). A partir del NOMBRE de la materia deducí su programa oficial completo, terminología técnica, teoremas/modelos y tipo de problemas de examen.
- Evento a preparar: ${ctx.eventLabel || "Examen"} — fecha ${ctx.examDate} (quedan exactamente ${ctx.daysLeft} día/s).
- Meta de dominio: ${ctx.targetMastery}%. El estudiante ${PREFERENCE_TEXT[ctx.studyPreference] || ""}.
- Material: ${sections.length} archivo/s (${fileNames.join(" | ").slice(0, 400)}), ~${totalChars} caracteres.
- Modo: ${
    plan.subjectOnly
      ? "MATERIAL ESCASO → construí el temario universitario completo y riguroso de la materia deduciéndolo de su nombre académico."
      : "BASADO EN MATERIAL → todos los niveles deben cubrir exhaustivamente el contenido real de los archivos subidos, sintetizado pedagógicamente."
  }

REGLAS ESTRICTAS DE CÁTEDRA Y PROGRESIÓN TEMÁTICA:
1. Generá EXACTAMENTE ${plan.target} niveles adaptados a los ${ctx.daysLeft} día(s) restantes.
2. PROHIBIDO REPETIR CONTENIDO O COPIAR TEXTUAL: cada nivel DEBE tener un conjunto temático ÚNICO y progresivo sin solapamiento con los demás niveles.
3. ESTRUCTURA ESTRICTA POR ETAPAS PEDAGÓGICAS:
   - Nivel 1: Cimientos formales, definiciones nucleares y vocabulario inicial de "${ctx.subjectName}".
   - Niveles intermedios (2 a ${plan.target - 1}): Desarrollo de métodos, análisis, casos y problemas específicos de cada unidad sin repetir conceptos previos.
   - Nivel ${plan.target} (ÚLTIMO): SIMULACRO INTEGRADOR EXIGENTE para "${ctx.eventLabel || "el Examen"}". NO DEBE REPETIR las definiciones básicas del nivel 1, sino plantear problemas transversales que crucen e integren todos los temas previos en un caso complejo de evaluación.
4. "title": concreto, técnico y específico del contenido (máx 65 caracteres).
5. "summary": 3 a 4 oraciones densas redactadas con tono de profesor explicando qué definiciones, mecanismos y casos prácticos debe dominar el alumno.
6. "keyTopics": 5 a 8 conceptos o términos EXACTOS que se evalúan en este nivel.
7. "sourceFiles": nombres de los archivos de donde sale el nivel.
8. "estimatedMinutes": realista acorde a una sesión de estudio universitario serio.
9. Respondé en español rioplatense. Solo JSON válido.`;

  try {
    const { data, error } = await supabase.functions.invoke("generate-study-content", {
      body: {
        fileName: `${ctx.subjectName}_material.txt`,
        content:
          buildAIContent(sections) ||
          `Materia universitaria: ${ctx.subjectName}. Desarrollar temario académico completo, unidades fundamentales, teoremas/modelos y aplicaciones de examen.`,
        type: "roadmap",
        instructions,
      },
    });

    if (!error && data?.success) {
      let raw = data.data;
      if (typeof raw === "string") raw = tryParseJson(raw);
      const list = Array.isArray(raw) ? raw : raw?.roadmap;
      if (Array.isArray(list) && list.length >= 2) {
        return attachExcerpts(normalizeLevels(list), sections);
      }
    }
  } catch (err) {
    console.warn("[studyRoadmapService] IA no disponible, armando ruta local desde tus apuntes:", err);
  }

  const drafts = heuristicRoadmap(ctx.subjectName, splitIntoChunks(sections), plan.target);
  const levels: RoadmapLevel[] = drafts.map((d, i) => ({
    level: d.level,
    title:
      i === drafts.length - 1 && drafts.length > 2
        ? `Simulacro Integrador: ${d.title}`.slice(0, 70)
        : d.title,
    summary: d.summary,
    unlocked: i === 0,
    completed: false,
    keyTopics: d.keyTopics,
    sourceFiles: d.sourceFiles,
    estimatedMinutes: d.estimatedMinutes,
  }));
  return attachExcerpts(levels, sections);
}

/**
 * Genera el Paquete de Estudio Completo de un Nivel (`LevelStudyPack`):
 * 1) Guía Teórica Profunda por secciones explicadas con criterio docente (`studyGuide`)
 * 2) Podcast Narrativo en audio con locución natural (`podcastScript`)
 * 3) Mazo de Flashcards de estudio activo (`flashcards`)
 * 4) Examen Riguroso de preguntas universitarias con justificación (`questions`)
 * 5) Mesa de Examen Oral con IA y respuesta modelo (`oralQuestions`)
 */
export async function generateLevelStudyPack(
  level: RoadmapLevel,
  subjectName: string,
  ctx?: Partial<RoadmapContext> & { roadmapId?: string; forceRegenerate?: boolean }
): Promise<LevelStudyPack> {
  const mastery = ctx?.targetMastery ?? 80;
  const { questionCount, flashcardCount, oralCount, requiredAccuracyPercent } = getLevelWorkload(mastery);

  // Si ya estaba cacheado en el nivel y tiene el volumen completo, devolver sin gastar cuota
  if (
    !ctx?.forceRegenerate &&
    level.studyPack &&
    level.studyPack.questions?.length >= Math.min(8, questionCount) &&
    level.studyPack.flashcards?.length >= 6 &&
    level.studyPack.studyGuide?.sections?.length >= 3
  ) {
    return level.studyPack;
  }

  // Base local completa construida con la nueva lógica diferenciada de cátedra
  const basePack = buildComprehensiveLevelPack(level, subjectName, mastery);

  const source =
    (level.excerpt && level.excerpt.trim().length > 120 ? level.excerpt : "") ||
    `Materia: ${subjectName}\nNivel ${level.level}: ${level.title}\nResumen: ${level.summary}\nTemas clave: ${(level.keyTopics || []).join(", ")}`;

  const levelPackInstructions = `ESTUDIANTE UNIVERSITARIO PREPARANDO "${ctx?.eventLabel || "EXAMEN"}" DE "${subjectName}".
NIVEL ${level.level}: "${level.title}".
RESUMEN DEL NIVEL: "${level.summary}".
TEMAS CLAVE A ENSEÑAR Y EVALUAR: ${(level.keyTopics || []).join(", ") || "todos los del texto"}.
META DE DOMINIO: ${mastery}% (Aprobación ≥${requiredAccuracyPercent}% o promedio oral 7.0/10).

ROL DE LA IA: Catedrático universitario titular y mentor de excelencia.
MISIÓN: Enseñar y explicar el contenido con pedagogía, rigor y claridad didáctica al alumno.

REGLAS PEDAGÓGICAS ESTRICTAS (CERO COPY-PASTE):
1. PROHIBIDO cortar y pegar párrafos sin explicar. Desglosá la teoría, explicá el 'por qué', ilustrá con analogías claras de la vida real, deduzcí las fórmulas/métodos paso a paso y completá cualquier laguna del apunte.
2. GUÍA TEÓRICA ('studyGuide'): Exactamente 4 a 5 módulos pedagógicos sustanciosos y desglosados (Marco Teórico, Procedimiento Analítico, Casos de Examen, Trampas Comunes y Glosario).
3. PODCAST ('podcastScript'): Guion de locución hablada natural, apasionada y fluida, con introducción envolvente, capítulos orales por módulo y conclusión motivadora.
4. FLASHCARDS ('flashcards'): Exactamente ${flashcardCount} tarjetas de alta calidad académica.
5. CUESTIONARIO ESCRITO ('questions'): Exactamente ${questionCount} preguntas rigurosas con 4 opciones y justificación en 'explicacion'.
6. EXAMEN ORAL ('oralQuestions'): Exactamente ${oralCount} preguntas de tribunal evaluador con criterios y respuesta modelo. Español rioplatense.`;

  try {
    // 1. Invocar a la IA para generar el paquete de estudio completo con un único llamado eficiente
    const res = await supabase.functions.invoke("generate-study-content", {
      body: {
        fileName: `${subjectName}_nivel_${level.level}.txt`,
        content: source,
        type: "level_pack",
        count: questionCount,
        instructions: levelPackInstructions,
      },
    });

    if (!res.error && res.data?.success && res.data.data) {
      const d = res.data.data;
      if (
        d.studyGuide &&
        Array.isArray(d.studyGuide.sections) &&
        d.studyGuide.sections.length >= 3 &&
        Array.isArray(d.questions) &&
        d.questions.length >= 4
      ) {
        const finalPack: LevelStudyPack = {
          studyGuide: {
            overview: d.studyGuide.overview || level.summary,
            sections: d.studyGuide.sections.map((s: any) => ({
              heading: String(s.heading || "Módulo"),
              content: String(s.content || ""),
              keyPoints: Array.isArray(s.keyPoints) ? s.keyPoints.map(String) : [],
            })),
            examTips: Array.isArray(d.studyGuide.examTips)
              ? d.studyGuide.examTips.map(String)
              : basePack.studyGuide.examTips,
          },
          podcastScript: d.podcastScript?.chapters?.length
            ? {
                title: d.podcastScript.title || `Clase Nivel ${level.level}: ${level.title}`,
                episodeNumber: d.podcastScript.episodeNumber || level.level,
                estimatedMinutes:
                  d.podcastScript.estimatedMinutes ||
                  Math.max(4, Math.round((d.podcastScript.fullNarration?.length || 2000) / 750)),
                introduction: d.podcastScript.introduction || basePack.podcastScript.introduction,
                chapters: d.podcastScript.chapters.map((c: any) => ({
                  heading: String(c.heading || ""),
                  narration: String(c.narration || ""),
                  keyTakeaway: String(c.keyTakeaway || ""),
                })),
                conclusion: d.podcastScript.conclusion || basePack.podcastScript.conclusion,
                fullNarration: d.podcastScript.fullNarration || basePack.podcastScript.fullNarration,
              }
            : basePack.podcastScript,
          flashcards: Array.isArray(d.flashcards) && d.flashcards.length >= 4
            ? d.flashcards.slice(0, flashcardCount).map((c: any) => ({
                question: String(c.question || c.pregunta || ""),
                answer: String(c.answer || c.respuesta || ""),
              }))
            : basePack.flashcards,
          questions: d.questions.slice(0, questionCount).map((q: any) => ({
            pregunta: String(q.pregunta || ""),
            opciones: Array.isArray(q.opciones) ? q.opciones.map(String) : ["A", "B", "C", "D"],
            correcta: typeof q.correcta === "number" ? q.correcta : 0,
            explicacion: String(q.explicacion || "Revisá la fundamentación teórica de la guía."),
            dificultad: q.dificultad || "Aplicación",
          })),
          oralQuestions: Array.isArray(d.oralQuestions) && d.oralQuestions.length >= 2
            ? d.oralQuestions.slice(0, oralCount).map((oq: any, idx: number) => ({
                id: oq.id || `oral-${level.level}-${idx + 1}`,
                pregunta: String(oq.pregunta || ""),
                criterios: Array.isArray(oq.criterios) ? oq.criterios.map(String) : ["Claridad", "Rigor"],
                respuestaModelo: String(oq.respuestaModelo || ""),
                puntosClave: Array.isArray(oq.puntosClave) ? oq.puntosClave.map(String) : [],
              }))
            : basePack.oralQuestions,
        };

        cacheLevelStudyPack(ctx?.roadmapId, level.level, finalPack);
        return finalPack;
      }
    }
  } catch (err) {
    console.warn("[studyRoadmapService] Invocación de level_pack IA falló, usando motor pedagógico local:", err);
  }

  // Respaldo local de alta calidad pedagógica
  cacheLevelStudyPack(ctx?.roadmapId, level.level, basePack);
  return basePack;
}

/**
 * Evalúa la respuesta oral del estudiante utilizando la IA o respaldo local inteligente.
 */
export async function evaluateOralAnswer(params: {
  question: OralExamQuestion;
  transcript: string;
  subjectName: string;
  targetMastery?: number;
}): Promise<OralAnswerEvaluation> {
  const { question, transcript, subjectName, targetMastery = 80 } = params;
  const fallback = evaluateOralAnswerLocal({ question, transcript, subjectName, targetMastery });

  if (!transcript || transcript.trim().length < 8) {
    return fallback;
  }

  try {
    const instructions = `Eres un docente y presidente de mesa de examen universitario sumamente riguroso y exigente en la cátedra de "${subjectName}".
Estás tomando un examen oral definitorio y NO regalas nota bajo ninguna circunstancia. Evalúa con criterio académico estricto de universidad.

Pregunta del examen oral: "${question.pregunta}"
Criterios formales de evaluación: ${question.criterios.join(" | ")}
Conceptos y términos técnicos indispensables que el alumno DEBE incluir y fundamentar: ${question.puntosClave.join(", ")}
Respuesta que dio el alumno (transcripción textual de su voz): "${transcript}"

RÚBRICA DE CALIFICACIÓN ESTRICTA (Escala 1 al 10):
- 1 a 3 (Muy Insuficiente): Respuesta vacía, de menos de 15 palabras, incoherente, o que no responde a la pregunta.
- 4 a 5 (Insuficiente / Desaprobado): Respuesta breve (menos de 30 palabras), superficial o de relleno ("chamuyo"). No define los conceptos o ignora los términos técnicos esenciales.
- 6 (Regular / Desaprobado): Conoce el tema pero su exposición es floja, le falta vocabulario técnico o no fundamenta relaciones de causa y efecto. EN ESTA MESA DE EXAMEN, 6 NO ALCANZA PARA APROBAR.
- 7 (Aprobado): Exposición sólida (al menos 40+ palabras), define el concepto correctamente, cubre la mayoría de los términos clave y justifica con rigor.
- 8 a 9 (Muy Bueno / Distinguido): Exposición fluida, terminología técnica exacta, fundamenta condiciones de aplicación y relaciona los conceptos solicitados con claridad.
- 10 (Sobresaliente): Dominio exhaustivo e intachable, vocabulario técnico de cátedra universitaria, sin fisuras conceptuales.

REGLAS CRÍTICAS:
1. NO seas complaciente ni generoso. No apruebes respuestas de 1 o 2 oraciones generales o sin precisión técnica.
2. Si el alumno no menciona ni fundamenta los conceptos técnicos solicitados (${question.puntosClave.join(", ")}), la nota DEBE ser insuficiente (máximo 5).
3. El campo "aprobado" debe ser true ÚNICAMENTE si puntaje >= 7.

Devuelve ÚNICAMENTE un JSON válido con este formato:
{
  "puntaje": (entero de 1 a 10),
  "aprobado": (true solo si puntaje >= 7),
  "aspectosPositivos": ["Punto fuerte conceptual...", "..."],
  "aspectosAMejorar": ["Concepto o propiedad exacta que omitió...", "..."],
  "feedbackOral": "Devolución en 1 o 2 oraciones para ser leída por el profesor con tono formal, exigente y pedagógico."
}`;

    const { data, error } = await supabase.functions.invoke("generate-study-content", {
      body: {
        fileName: "evaluacion_oral.txt",
        content: transcript,
        type: "summary",
        instructions,
      },
    });

    if (!error && data?.success) {
      let parsed = data.data;
      if (typeof parsed === "string") parsed = tryParseJson(parsed);
      if (parsed && typeof parsed.puntaje === "number") {
        const rawScore = Math.min(10, Math.max(1, Math.round(parsed.puntaje)));
        // Control de rigor: si la respuesta fue demasiado corta y el fallback detectó insuficiencia, acotar la nota
        const finalScore = fallback.puntaje <= 4 ? Math.min(rawScore, 5) : rawScore;
        const finalAprobado = finalScore >= 7;

        return {
          preguntaId: question.id,
          puntaje: finalScore,
          aprobado: finalAprobado,
          aspectosPositivos: Array.isArray(parsed.aspectosPositivos) && parsed.aspectosPositivos.length > 0
            ? parsed.aspectosPositivos.map(String)
            : fallback.aspectosPositivos,
          aspectosAMejorar: Array.isArray(parsed.aspectosAMejorar) && parsed.aspectosAMejorar.length > 0
            ? parsed.aspectosAMejorar.map(String)
            : fallback.aspectosAMejorar,
          feedbackOral: String(parsed.feedbackOral || fallback.feedbackOral),
        };
      }
    }
  } catch (e) {
    console.warn("[studyRoadmapService] Evaluador oral usando fallback local:", e);
  }

  return fallback;
}

/**
 * Wrapper de compatibilidad para obtener las preguntas del nivel.
 */
export async function generateLevelChallenge(
  level: RoadmapLevel,
  subjectName: string,
  ctx?: Partial<RoadmapContext>
): Promise<LevelQuizQuestion[]> {
  const pack = await generateLevelStudyPack(level, subjectName, ctx);
  return pack.questions;
}

// Helpers internos
function normalizeLevels(list: any[]): RoadmapLevel[] {
  return list
    .filter((item) => item && (item.title || item.summary))
    .map((item, idx) => ({
      level: idx + 1,
      title: String(item.title || `Nivel ${idx + 1}`).slice(0, 80),
      summary: String(item.summary || "Conceptos clave del nivel."),
      unlocked: idx === 0,
      completed: false,
      keyTopics: Array.isArray(item.keyTopics) ? item.keyTopics.map(String).slice(0, 8) : [],
      sourceFiles: Array.isArray(item.sourceFiles) ? item.sourceFiles.map(String) : [],
      estimatedMinutes: Number(item.estimatedMinutes) > 0 ? Number(item.estimatedMinutes) : 35,
    }));
}

/** Asigna a cada nivel los fragmentos REALES de los apuntes más relacionados (hasta 6000 chars por nivel). */
function attachExcerpts(levels: RoadmapLevel[], sections: MaterialSection[]): RoadmapLevel[] {
  const chunks = splitIntoChunks(sections);
  return levels.map((lvl, i) => {
    const terms = [...(lvl.keyTopics || []), ...tokenize(lvl.title)];
    const { excerpt, sources } = pickExcerpt(
      chunks,
      terms,
      { index: i, total: levels.length },
      6000
    );
    return {
      ...lvl,
      excerpt,
      sourceFiles: lvl.sourceFiles && lvl.sourceFiles.length ? lvl.sourceFiles : sources,
    };
  });
}

function tryParseJson(str: string): any {
  try {
    const cleaned = str.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function getLocalRoadmaps(): StudyRoadmap[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRoadmaps(list: StudyRoadmap[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * Recompensa al usuario en Tabecoins y TabeGochi
 */
export function rewardUserGamification(coinsToAdd: number, xpToAdd: number) {
  try {
    const currentCoins = Number(localStorage.getItem("tabe_gochi_coins_v1") || 50);
    const newCoins = currentCoins + coinsToAdd;
    localStorage.setItem("tabe_gochi_coins_v1", String(newCoins));

    const rawPets = localStorage.getItem("tabe_gochi_pets_v1");
    if (rawPets) {
      const pets = JSON.parse(rawPets);
      if (Array.isArray(pets) && pets.length > 0) {
        pets[0].xp = (pets[0].xp || 0) + xpToAdd;
        localStorage.setItem("tabe_gochi_pets_v1", JSON.stringify(pets));
      }
    }

    toast.success(`🎉 ¡Nivel Superado! +${coinsToAdd} Tabecoins y +${xpToAdd} XP para tu mascota!`);
  } catch (e) {
    console.warn("Error sumando recompensas:", e);
  }
}
