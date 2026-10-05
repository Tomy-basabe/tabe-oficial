import {
  MaterialSection,
  RoadmapLevel,
  LevelStudyPack,
  LevelQuizQuestion,
  LevelFlashcard,
  StudyGuideSection,
  PodcastScript,
  OralExamQuestion,
  OralAnswerEvaluation,
} from "@/types/studyRoadmap";

/**
 * Heurísticas locales y motor de síntesis académica para:
 *  - calcular cuántos niveles necesita el material según volumen, días y meta de dominio,
 *  - trocear el material y asignar a cada nivel un fragmento extenso (~6000 chars) de los apuntes reales,
 *  - construir guías teóricas estructuradas, podcast con IA, mazos de flashcards y exámenes (escrito y oral).
 */

const STOP = new Set(
  (
    "para como pero porque cuando donde entre sobre desde hasta este esta estos estas esto " +
    "ese esa esos esas aquel aquella tiene tienen puede pueden ser son fue era han has hay " +
    "cada todo toda todos todas otro otra otros otras mas menos muy tambien solo sino segun " +
    "dentro fuera luego entonces ademas asi aqui alli donde cual cuales quien quienes " +
    "unos unas una uno del las los con por que sus nos les mis tus the and for with that this from " +
    "pagina página unidad tema clase"
  ).split(/\s+/)
);

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function tokenize(text: string): string[] {
  const out: string[] = [];
  const re = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_-]{3,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const w = m[0];
    if (!STOP.has(norm(w))) out.push(w);
  }
  return out;
}

export function topKeywords(text: string, n = 6): string[] {
  const freq = new Map<string, { count: number; display: string }>();
  for (const w of tokenize(text)) {
    const key = norm(w);
    const cur = freq.get(key);
    const weight = w.length >= 8 ? 1.6 : 1;
    if (cur) cur.count += weight;
    else freq.set(key, { count: weight, display: w });
  }
  return [...freq.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map((v) => v.display);
}

/* ───────────────────────── PLAN DE NIVELES ───────────────────────── */

export interface LevelPlan {
  target: number;
  min: number;
  max: number;
  /** true si el material es muy escaso y hay que deducir el temario por el nombre de la materia */
  subjectOnly: boolean;
}

/**
 * Calcula la cantidad de niveles según el volumen real de apuntes, la meta de dominio y los días restantes.
 */
export function computeLevelPlan(params: {
  totalChars: number;
  daysLeft: number;
  targetMastery: number;
}): LevelPlan {
  const { totalChars, daysLeft, targetMastery } = params;
  const subjectOnly = totalChars < 1500;

  let target = 6;
  let min = 4;
  let max = 8;

  // Ajuste matemático estricto según urgencia temporal del alumno
  if (daysLeft <= 1) {
    // 🚨 MODO EMERGENCIA / EXAMEN MAÑANA (24 HORAS):
    // El estudiante no puede hacer 10 niveles en una noche. Máximo 3 a 4 niveles intensivos.
    target = targetMastery >= 85 ? 4 : 3;
    min = 3;
    max = 4;
  } else if (daysLeft <= 2) {
    // ⚡ SPRINT DE 48 HORAS:
    // 4 a 5 niveles de choque (2 niveles por día + 1 de cierre).
    target = targetMastery >= 90 ? 5 : 4;
    min = 4;
    max = 5;
  } else if (daysLeft <= 7) {
    // 📅 PRÓXIMA SEMANA (5 a 7 días):
    // 6 a 8 niveles progresivos con 1 nivel diario promedio.
    target = targetMastery >= 90 ? 8 : targetMastery >= 75 ? 7 : 6;
    min = 5;
    max = 8;
  } else if (daysLeft <= 14) {
    // 📚 2 SEMANAS:
    // 8 a 10 niveles estructurados y profundos.
    target = targetMastery >= 90 ? 10 : 8;
    min = 7;
    max = 10;
  } else {
    // 🎓 MÁS DE 2 SEMANAS / PLAN DE CURSADA O FINAL:
    // 9 a 12 niveles de maestría universitaria completa.
    target = targetMastery >= 90 ? 12 : 9;
    min = 8;
    max = 12;
  }

  return {
    target,
    min,
    max,
    subjectOnly,
  };
}

/**
 * Determina cuántas preguntas y flashcards debe tener un nivel según la meta de dominio.
 */
export function getLevelWorkload(targetMastery = 80): {
  questionCount: number;
  flashcardCount: number;
  oralCount: number;
  requiredAccuracyPercent: number;
} {
  if (targetMastery >= 95) {
    return { questionCount: 15, flashcardCount: 12, oralCount: 4, requiredAccuracyPercent: 85 };
  }
  if (targetMastery >= 85) {
    return { questionCount: 12, flashcardCount: 10, oralCount: 3, requiredAccuracyPercent: 80 };
  }
  if (targetMastery >= 75) {
    return { questionCount: 10, flashcardCount: 8, oralCount: 3, requiredAccuracyPercent: 75 };
  }
  return { questionCount: 8, flashcardCount: 8, oralCount: 3, requiredAccuracyPercent: 70 };
}

/* ───────────────────────── CHUNKS Y EXTRACTOS ───────────────────────── */

export interface Chunk {
  source: string;
  text: string;
}

export function splitIntoChunks(sections: MaterialSection[], targetChars = 2200): Chunk[] {
  const chunks: Chunk[] = [];
  for (const sec of sections) {
    const paragraphs = sec.text
      .replace(/\r/g, "")
      .split(/\n{2,}|---\s*(?:Página|Diapositiva)\s*\d+\s*---/i)
      .map((p) => p.trim())
      .filter(Boolean);

    let buf = "";
    for (const p of paragraphs) {
      if ((buf + "\n\n" + p).length > targetChars && buf.length > 400) {
        chunks.push({ source: sec.source, text: buf });
        buf = p;
      } else {
        buf = buf ? `${buf}\n\n${p}` : p;
      }
      while (buf.length > targetChars * 1.6) {
        chunks.push({ source: sec.source, text: buf.slice(0, targetChars) });
        buf = buf.slice(targetChars);
      }
    }
    if (buf.trim().length > 0) chunks.push({ source: sec.source, text: buf });
  }
  return chunks;
}

/** 
 * Distribuye los fragmentos del material a lo largo de los niveles con progresión secuencial estricta.
 * - Cada nivel i recibe prioritariamente la ventana del material que le corresponde cronológicamente: [i/N, (i+1)/N].
 * - Esto garantiza que el Nivel 1 cubra el inicio del material, los niveles intermedios cubran el cuerpo,
 *   y el último nivel cubra el final del material (o integre los puntos culminantes de todos los temas).
 * - Cero duplicación repetitiva entre niveles.
 */
export function pickExcerpt(
  chunks: Chunk[],
  terms: string[],
  slice: { index: number; total: number },
  maxChars = 6500
): { excerpt: string; sources: string[] } {
  if (chunks.length === 0) return { excerpt: "", sources: [] };

  const totalLevels = Math.max(1, slice.total);
  const currentIdx = slice.index;
  const isFinalLevel = currentIdx === totalLevels - 1 && totalLevels > 1;

  // Si es el nivel final (Simulacro Integrador):
  // Armar un extracto compuesto que incluya fragmentos representativos de cada unidad previa más la conclusión
  if (isFinalLevel && chunks.length >= totalLevels) {
    const selectedChunks: Chunk[] = [];
    let accumulated = 0;
    
    // 1 chunk de cada sección anterior
    for (let l = 0; l < totalLevels - 1; l++) {
      const chunkIdx = Math.floor((l / (totalLevels - 1)) * (chunks.length - 1));
      const c = chunks[chunkIdx];
      if (c && !selectedChunks.includes(c)) {
        selectedChunks.push(c);
        accumulated += c.text.length;
      }
    }
    // Y el último chunk (conclusiones/resumen final)
    const lastChunk = chunks[chunks.length - 1];
    if (lastChunk && !selectedChunks.includes(lastChunk)) {
      selectedChunks.push(lastChunk);
    }

    const excerpt = selectedChunks.map((c) => c.text).join("\n\n---\n\n").slice(0, maxChars);
    return {
      excerpt,
      sources: [...new Set(selectedChunks.map((c) => c.source))],
    };
  }

  // Para niveles normales (0 a N-2):
  // Calcular la ventana asignada en el documento: [startRatio, endRatio]
  const chunksPerLevel = Math.max(1, Math.ceil(chunks.length / totalLevels));
  const windowStart = Math.min(chunks.length - 1, currentIdx * chunksPerLevel);
  const windowEnd = Math.min(chunks.length, windowStart + chunksPerLevel + 1);

  // Chunks dentro de la ventana del nivel
  const windowChunks = chunks.slice(windowStart, windowEnd);

  const chosen: Chunk[] = [];
  let size = 0;

  for (const c of windowChunks) {
    if (size + c.text.length > maxChars && chosen.length > 0) continue;
    chosen.push(c);
    size += c.text.length;
    if (size >= maxChars) break;
  }

  // Si aún queda espacio, rellenar con chunks inmediatos siguientes sin invadir otros bloques
  if (size < maxChars * 0.75 && windowEnd < chunks.length) {
    for (let i = windowEnd; i < Math.min(chunks.length, windowEnd + 2); i++) {
      const c = chunks[i];
      if (size + c.text.length <= maxChars) {
        chosen.push(c);
        size += c.text.length;
      }
    }
  }

  const excerpt = chosen.map((c) => c.text).join("\n\n").slice(0, maxChars);
  return { excerpt, sources: [...new Set(chosen.map((c) => c.source))] };
}

/* ───────────────────────── RUTA DE RESPALDO ───────────────────────── */

function findHeading(text: string): string | null {
  const lines = text.split("\n").map((l) => l.trim());
  for (const l of lines) {
    if (l.length < 6 || l.length > 70) continue;
    if (/[.;,]$/.test(l)) continue;
    if (
      /^(unidad|tema|cap[ií]tulo|m[oó]dulo|\d+[.)]\s)/i.test(l) ||
      /^[A-ZÁÉÍÓÚÑ][^.]{5,}$/.test(l)
    ) {
      if (/[A-Za-zÁÉÍÓÚáéíóúñ]{4,}/.test(l)) return l.replace(/^\d+[.)]\s*/, "");
    }
  }
  return null;
}

function extractSentences(text: string, minLen = 45, maxLen = 320): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLen && s.length <= maxLen);
}

function firstSentences(text: string, max = 3): string {
  return extractSentences(text, 40, 300).slice(0, max).join(" ").slice(0, 420);
}

export interface RoadmapLevelDraft {
  level: number;
  title: string;
  summary: string;
  keyTopics: string[];
  sourceFiles: string[];
  estimatedMinutes: number;
}

/** Agrupa el material en N tramos contiguos y arma título/resumen/temas desde el texto real. */
export function heuristicRoadmap(
  subjectName: string,
  chunks: Chunk[],
  levelCount: number
): RoadmapLevelDraft[] {
  if (chunks.length === 0) {
    const defaultBlocks = [
      `Fundamentos y axiomas de ${subjectName}`,
      `Estructura conceptual y modelos de ${subjectName}`,
      `Propiedades, teoremas y desarrollo analítico`,
      `Métodos de resolución y casos prácticos`,
      `Análisis de casos especiales y excepciones`,
      `Simulacro integrador de examen de ${subjectName}`,
    ];
    return Array.from({ length: levelCount }, (_, i) => ({
      level: i + 1,
      title:
        i === levelCount - 1
          ? `Simulacro Integrador de ${subjectName}`
          : defaultBlocks[i % defaultBlocks.length],
      summary: `Estudio intensivo, práctica aplicada y validación de dominio sobre el bloque ${i + 1} de ${subjectName}.`,
      keyTopics: [
        `Definiciones clave de ${subjectName}`,
        `Modelos y propiedades del Bloque ${i + 1}`,
        `Resolución de problemas de examen`,
        `Criterios de verificación`,
      ],
      sourceFiles: [],
      estimatedMinutes: 35,
    }));
  }

  const total = chunks.reduce((a, c) => a + c.text.length, 0);
  const per = total / levelCount;
  const groups: Chunk[][] = Array.from({ length: levelCount }, () => []);
  let acc = 0;
  for (const c of chunks) {
    const idx = Math.min(levelCount - 1, Math.floor(acc / per));
    groups[idx].push(c);
    acc += c.text.length;
  }

  return groups.map((g, i) => {
    const text = g.map((c) => c.text).join("\n\n");
    const kws = topKeywords(text, 6);
    const heading = findHeading(text);
    const title = (
      heading ||
      (kws.length ? `${kws[0]}${kws[1] ? " y " + kws[1] : ""}` : `Bloque ${i + 1}`)
    ).slice(0, 65);
    return {
      level: i + 1,
      title,
      summary:
        firstSentences(text, 3) ||
        `Dominio teórico y práctico de: ${kws.join(", ")}.`,
      keyTopics: kws,
      sourceFiles: [...new Set(g.map((c) => c.source))],
      estimatedMinutes: Math.max(20, Math.min(65, Math.round(text.length / 100))),
    };
  });
}

/* ───────────────────────── MOTOR DE QUIZ (OPCIÓN MÚLTIPLE) ───────────────────────── */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type ClozeQuestion = LevelQuizQuestion;

export function buildClozeQuiz(
  excerpt: string,
  keyTopics: string[],
  count: number,
  subjectName = "la materia",
  levelTitle = "este nivel"
): LevelQuizQuestion[] {
  const sentences = extractSentences(excerpt, 50, 290);
  const pool = [...new Set([...keyTopics, ...topKeywords(excerpt, 24)])].filter(
    (w) => w.length >= 4
  );
  const questions: LevelQuizQuestion[] = [];
  const usedSentences = new Set<string>();

  for (const s of shuffle(sentences)) {
    if (questions.length >= Math.ceil(count * 0.55)) break;
    const answer = pool.find((w) =>
      new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(s)
    );
    if (!answer) continue;

    const match = s.match(
      new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
    );
    if (!match) continue;
    const original = match[0];
    const blanked = s.replace(match[0], "__________");

    const distractors = shuffle(
      pool.filter((w) => norm(w) !== norm(answer))
    ).slice(0, 3);
    while (distractors.length < 3) {
      distractors.push(
        ["Invariante nulo", "Condición periférica", "Variable exógena", "Parámetro auxiliar"][
          distractors.length
        ]
      );
    }

    const options = shuffle([original, ...distractors]);
    usedSentences.add(s);
    questions.push({
      pregunta: `Según el material de estudio de "${levelTitle}", completá con precisión el concepto que falta:\n«${blanked}»`,
      opciones: options,
      correcta: options.indexOf(original),
      explicacion: `En el apunte original se establece textualmente: «${s}»`,
      dificultad: "Concepto Clave",
    });
  }

  const remainingSentences = sentences.filter((s) => !usedSentences.has(s));
  for (let i = 0; i < remainingSentences.length && questions.length < count; i++) {
    const trueSent = remainingSentences[i];
    const kws = topKeywords(trueSent, 3);
    const topicLabel = kws[0] || keyTopics[i % Math.max(1, keyTopics.length)] || levelTitle;

    const d1 = `El concepto de ${topicLabel} es independiente de las condiciones iniciales y nunca afecta el resultado en ${subjectName}.`;
    const d2 = `En ${subjectName}, ${topicLabel} solo se aplica de forma empírica cuando se descartan todas las hipótesis principales del bloque.`;
    const d3 = `Ninguna de las propiedades de ${topicLabel} guarda relación con ${
      keyTopics[(i + 1) % Math.max(1, keyTopics.length)] || "el resto del temario"
    }.`;

    const options = shuffle([trueSent, d1, d2, d3]);
    questions.push({
      pregunta: `Analizando el desarrollo de "${levelTitle}" (${subjectName}), ¿cuál de las siguientes proposiciones es VERDADERA y consistente con la cátedra?`,
      opciones: options,
      correcta: options.indexOf(trueSent),
      explicacion: `La proposición correcta proviene directamente del desarrollo teórico del nivel: «${trueSent}»`,
      dificultad: "Aplicación",
    });
  }

  const topicsToCover =
    keyTopics.length > 0
      ? keyTopics
      : [
          `Definición formal en ${levelTitle}`,
          `Condiciones de aplicación en ${subjectName}`,
          `Relación causa-efecto en ${levelTitle}`,
          `Criterios de resolución de examen`,
        ];

  let tIdx = 0;
  while (questions.length < count) {
    const topic = topicsToCover[tIdx % topicsToCover.length];
    const nextTopic = topicsToCover[(tIdx + 1) % topicsToCover.length];
    const relatedSentence =
      sentences.find((s) => norm(s).includes(norm(topic))) ||
      sentences[tIdx % Math.max(1, sentences.length)] ||
      `En "${levelTitle}", el dominio de ${topic} permite fundamentar y resolver los casos planteados en ${subjectName} vinculándolo con ${nextTopic}.`;

    const correctOpt =
      relatedSentence.length <= 210
        ? relatedSentence
        : `${relatedSentence.slice(0, 205)}...`;

    const options = shuffle([
      correctOpt,
      `Se utiliza únicamente como notación histórica sin impacto en la resolución práctica de ${subjectName}.`,
      `Contradice el principio de ${nextTopic}, por lo que ambos conceptos son mutuamente excluyentes en todo el programa.`,
      `Su validez depende exclusivamente de asumir que todas las variables del sistema son constantes e iguales a cero.`,
    ]);

    questions.push({
      pregunta: `En una instancia de evaluación de ${subjectName} sobre "${levelTitle}", ¿qué afirmación fundamenta correctamente el rol de "${topic}"?`,
      opciones: options,
      correcta: options.indexOf(correctOpt),
      explicacion: `Fundamento del nivel: ${relatedSentence}`,
      dificultad: "Examen Riguroso",
    });
    tIdx++;
  }

  return questions.slice(0, count);
}

/* ───────────────────────── GENERADOR COMPLETO DE NIVEL ───────────────────────── */

/**
 * Construye una guía teórica estructurada, un podcast narrativo con capítulos,
 * flashcards y preguntas de examen oral + escrito.
 */
export function buildComprehensiveLevelPack(
  level: RoadmapLevel,
  subjectName: string,
  targetMastery = 80
): LevelStudyPack {
  const { questionCount, flashcardCount, oralCount } = getLevelWorkload(targetMastery);
  const rawText =
    (level.excerpt && level.excerpt.trim().length > 80 ? level.excerpt : level.summary) ||
    "";

  const paragraphs = rawText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 35);

  const topics =
    level.keyTopics && level.keyTopics.length > 0
      ? level.keyTopics
      : topKeywords(rawText, 8);

  const primaryTopic = topics[0] || level.title;
  const secondaryTopic = topics[1] || `conceptos nucleares de ${subjectName}`;
  const thirdTopic = topics[2] || `aplicaciones prácticas`;
  const fourthTopic = topics[3] || `criterios de validación`;

  // Detectar etapa pedagógica para diferenciar profundamente el nivel
  const totalLevels = level.totalLevels || 6;
  const isFirstLevel = level.level === 1;
  const isFinalLevel = level.level >= totalLevels || /simulacro|integrador|final/i.test(level.title);
  const isAdvancedLevel = !isFirstLevel && !isFinalLevel && level.level > Math.ceil(totalLevels * 0.5);

  // Detectar diagramas Mermaid en el extracto del material o generar uno sintáctico didáctico
  const mermaidMatch = rawText.match(/```mermaid\s*([\s\S]*?)```/i) ||
    rawText.match(/\[DIAGRAMA CONCEPTUAL MERMAID\]:\s*```mermaid\s*([\s\S]*?)```/i);
  let foundMermaidCode = mermaidMatch ? mermaidMatch[1].trim() : null;

  if (!foundMermaidCode) {
    foundMermaidCode = `flowchart TD
    A["${primaryTopic}"] --> B["${secondaryTopic}"]
    B --> C["${thirdTopic}"]
    C --> D["Resolución y Validación en ${subjectName}"]
    D --> E["Criterio de Cátedra (≥${targetMastery}% Dominio)"]`;
  }

  const sents = extractSentences(rawText, 35, 260);

  // 1. CONSTRUCCIÓN DE MÓDULOS DE ESTUDIO DIFERENCIADOS POR NIVEL
  const sections: StudyGuideSection[] = [];

  if (isFirstLevel) {
    // ── NIVEL 1: Cimientos y Marco Conceptual ──
    sections.push({
      heading: `1. Marco Conceptual, Cimientos y Definiciones Nucleares de "${primaryTopic}"`,
      content: [
        `🎓 EXPLICACIÓN DOCENTE DE CÁTEDRA:`,
        `¡Bienvenido a los fundamentos de ${subjectName}! Para dominar "${level.title}" no basta con memorizar términos sueltos; los docentes evalúan si comprendés la motivación original y los axiomas que dan origen a "${primaryTopic}".`,
        `💡 Intuición de arranque: ${paragraphs[0] || sents[0] || `Comprender ${primaryTopic} es el primer paso indispensable para todo el programa de ${subjectName}.`}`,
        `🔍 Definición rigurosa: ${sents[1] || `Formalmente, ${primaryTopic} establece las condiciones bajo las cuales se modelan los sistemas en la disciplina.`}`,
        `📌 Relación estructural: En esta primera etapa, "${primaryTopic}" se articula con "${secondaryTopic}". No cometas el error de verlos como temas aislados: el segundo se desprende naturalmente de los supuestos del primero.`,
      ].join("\n\n"),
      keyPoints: [
        `Dominar la definición formal, axiomas y motivación inicial de ${primaryTopic}.`,
        `Vincular ${primaryTopic} con ${secondaryTopic} sin confusiones conceptuales.`,
        `Comprender los supuestos de validez antes de avanzar a niveles operativos.`,
      ],
    });

    sections.push({
      heading: `2. Estructura y Funcionamiento Básico de "${secondaryTopic}"`,
      content: [
        `🎓 DESGLOSE DIDÁCTICO PASO A PASO:`,
        `Una vez sentadas las bases de ${primaryTopic}, pasamos a su estructura operativa en ${secondaryTopic}:`,
        `1️⃣ Supuestos iniciales: Determinar en qué contexto rige "${primaryTopic}".`,
        `2️⃣ Variables intervinientes: ${paragraphs[1] || sents[2] || `Descomponer el problema en sus componentes analíticos más simples.`}`,
        `3️⃣ Primeras reglas de deducción: ${sents[3] || `Verificar que la coherencia lógica se mantenga en todo momento.`}`,
        `📊 DIAGRAMA CONCEPTUAL INICIAL:\n\`\`\`mermaid\n${foundMermaidCode}\n\`\`\``,
      ].join("\n\n"),
      keyPoints: [
        `Identificar variables iniciales y restricciones básicas.`,
        `Seguir el flujo deductivo sin saltear pasos formativos.`,
        `Interpretar el mapa conceptual del tema.`,
      ],
    });

    sections.push({
      heading: `3. Primeros Planteos de Examen y Preguntas Teóricas Típicas`,
      content: [
        `🎓 CÓMO PREGUNTA LA CÁTEDRA EN EL ARRANQUE:`,
        `En las primeras mesas de examen de ${subjectName}, las preguntas sobre "${level.title}" buscan verificar si tenés claras las definiciones o si estás repitiendo de memoria:`,
        `📝 Pregunta Conceptual Tipo: ¿Por qué no es posible definir "${secondaryTopic}" sin recurrir previamente a los axiomas de "${primaryTopic}"?`,
        `💡 Cómo responder: Comenzá enunciando el principio general, aclará los supuestos requeridos y justificá la necesidad lógica de vincular ambos conceptos.`,
        `📝 Ejercicio Canónico: ${paragraphs[2] || sents[4] || `Plantear las condiciones mínimas necesarias para la existencia de soluciones válidas.`}`,
      ].join("\n\n"),
      keyPoints: [
        `Responder preguntas de 'por qué' y no solo de 'qué'.`,
        `Justificar formalmente cada enunciado con vocabulario de cátedra.`,
      ],
    });
  } else if (isFinalLevel) {
    // ── NIVEL FINAL: Simulacro Integrador de Examen ──
    sections.push({
      heading: `1. Síntesis Holística y Mapa Integrador de "${subjectName}"`,
      content: [
        `🎓 CLASE MAGISTRAL DE CIERRE E INTEGRACIÓN:`,
        `¡Llegaste al nivel culminante de preparación! En este Simulacro Integrador para "${level.title}", el objetivo ya no es estudiar temas aislados, sino articular toda la materia como un sistema coherente.`,
        `💡 Visión Panorámica: ${paragraphs[0] || sents[0] || `Integración de los modelos teóricos, métodos analíticos y aplicaciones prácticas desarrolladas a lo largo de todos los niveles.`}`,
        `🔍 El hilo conductor: Observá cómo "${primaryTopic}" y "${secondaryTopic}" se conectan directamente con los temas que vimos en los niveles anteriores. En la mesa de examen, el tribunal suele plantear preguntas transversales que exigen cruzar dos unidades distintas.`,
        `📊 MAPA DE RUTA INTEGRAL:\n\`\`\`mermaid\n${foundMermaidCode}\n\`\`\``,
      ].join("\n\n"),
      keyPoints: [
        `Tener una visión integral de toda la materia y de las dependencias entre temas.`,
        `Ser capaz de saltar de un concepto a otro con solvencia en la mesa evaluadora.`,
        `Demostrar criterio profesional y solvencia teórica ante el docente.`,
      ],
    });

    sections.push({
      heading: `2. Resolución de Problemas Integradores Multitema`,
      content: [
        `🎓 ESTRATEGIA DE RESOLUCIÓN EN INSTANCIA DE EVALUACIÓN:`,
        `Frente a un problema integrador complejo de parcial o examen final:`,
        `1️⃣ Diagnóstico global: Identificar qué temas de la materia intervienen (por ejemplo, cruce entre "${primaryTopic}", "${secondaryTopic}" y "${thirdTopic}").`,
        `2️⃣ Jerarquía de aplicación: ${paragraphs[1] || sents[1] || `No mezclar metodologías; comenzar por el marco más general y luego particularizar según las restricciones del enunciado.`}`,
        `3️⃣ Verificación de coherencia y cierre: ${sents[2] || `Todo resultado debe interpretarse físicamente o lógicamente en el contexto del problema original.`}`,
      ].join("\n\n"),
      keyPoints: [
        `Diagnosticar problemas abiertos o combinados con rapidez.`,
        `Estructurar el desarrollo analítico con orden y pulcritud académica.`,
        `Verificar órdenes de magnitud y condiciones de borde antes de entregar.`,
      ],
    });

    sections.push({
      heading: `3. Simulación de Mesa de Examen Oral y Criterios del Tribunal`,
      content: [
        `🎓 CÓMO DEFENDER TU EXAMEN FRENTE AL PROFESOR:`,
        `En el examen oral integrador, los profesores observan tu seguridad y tu capacidad de argumentación:`,
        `🗣️ Técnica de apertura: Si te dicen "Elegí un tema para empezar", no arranques con generalidades vacías. Elegí un núcleo sólido como "${primaryTopic}", enuncialo con precisión y mostrá inmediatamente cómo se ramifica hacia "${secondaryTopic}".`,
        `🗣️ Manejo de preguntas difíciles: Si te preguntan un caso límite o contraejemplo sobre "${fourthTopic}", no adivines: razoná en voz alta aplicando los principios teóricos.`,
      ].join("\n\n"),
      keyPoints: [
        `Manejo del tiempo y estructura de exposición oral universitaria.`,
        `Razonamiento deductivo en voz alta frente a preguntas imprevistas.`,
      ],
    });
  } else {
    // ── NIVELES INTERMEDIOS / AVANZADOS: Métodos, Casos y Fronteras ──
    const module1Title = isAdvancedLevel
      ? `1. Comportamiento en Escenarios Complejos y Teoremas de "${primaryTopic}"`
      : `1. Arquitectura Teórica y Mecanismos de "${primaryTopic}"`;

    sections.push({
      heading: module1Title,
      content: [
        `🎓 EXPLICACIÓN DE CÁTEDRA:`,
        `En este nivel abordamos "${level.title}". Para alcanzar la meta del ${targetMastery}% de dominio, debés comprender los mecanismos internos que rigen a "${primaryTopic}".`,
        `💡 Fundamentación analítica: ${paragraphs[0] || sents[0] || `El comportamiento y definición formal de ${primaryTopic} delimita el campo de validez de las soluciones en ${subjectName}.`}`,
        `🔍 Principios y Deducción: ${sents[1] || `La deducción rigurosa exige vincular cada variable con los postulados de la materia.`}`,
        `📌 Articulación temática: En este bloque, "${primaryTopic}" actúa conjuntamente con "${secondaryTopic}". No confundas las hipótesis simplificadoras con la ley general.`,
      ].join("\n\n"),
      keyPoints: [
        `Dominar el funcionamiento interno y propiedades de ${primaryTopic}.`,
        `Articular ${primaryTopic} con ${secondaryTopic} sin contradicciones.`,
      ],
    });

    sections.push({
      heading: `2. Desarrollo Metodológico y Procedimiento Analítico Paso a Paso`,
      content: [
        `🎓 PROCEDIMIENTO Y ANÁLISIS METODOLÓGICO:`,
        `A la hora de resolver problemas sobre "${level.title}", el docente exige una secuencia lógica rigurosa:`,
        `1️⃣ Identificación de datos y supuestos: Determinar qué condiciones iniciales rigen respecto a "${primaryTopic}" y "${thirdTopic}".`,
        `2️⃣ Selección del método o modelo: ${paragraphs[1] || sents[2] || `Descomponer ${secondaryTopic} en sus variables y restricciones intervinientes.`}`,
        `3️⃣ Desarrollo y validación: ${sents[3] || `Cada etapa debe validarse cotejando el resultado con las restricciones impuestas por ${primaryTopic}.`}`,
        `📊 ESQUEMA LÓGICO DEL TEMA:\n\`\`\`mermaid\n${foundMermaidCode}\n\`\`\``,
      ].join("\n\n"),
      keyPoints: [
        `Metodología paso a paso: Identificación, selección de modelo y validación.`,
        `Interpretación integral de las restricciones y variables de ${secondaryTopic}.`,
      ],
    });

    sections.push({
      heading: `3. Casos de Examen y Planteos Típicos de Parcial`,
      content: [
        `🎓 CÓMO SE EVALÚA EN PARCIALES:`,
        `En las evaluaciones de ${subjectName}, las preguntas sobre "${level.title}" suelen presentarse bajo dos modalidades clásicas:`,
        `📝 Planteo Deductivo: Demostrar por qué "${primaryTopic}" produce un determinado comportamiento sobre "${secondaryTopic}". Se exige enunciar premisas, aplicar teoremas y concluir formalmente.`,
        `📝 Problema Práctico de Examen: ${paragraphs[2] || sents[4] || `Plantear un escenario con restricciones donde interviene "${thirdTopic}".`}`,
        `💡 Consejo de Oro: En exámenes orales y escritos, acompañá tu respuesta con un esquema que demuestre que no aprendiste mecánicamente.`,
      ].join("\n\n"),
      keyPoints: [
        `Estructurar respuestas deductivas con hipótesis, desarrollo y conclusión formal.`,
        `Evitar la aplicación mecánica de fórmulas sin verificar supuestos.`,
      ],
    });
  }

  // MÓDULO 4: Trampas Frecuentes, Errores Críticos y Criterios Evaluativos
  sections.push({
    heading: `4. Trampas Comunes, Errores Frecuentes y Criterios de Aprobación`,
    content: [
      `⚠️ ALERTA DE EXAMEN - ERRORES QUE DESAPRUEBAN:`,
      `Los profesores de ${subjectName} marcan como falta grave los siguientes errores en este tema:`,
      `❌ Confusión entre conceptos: Mezclar los límites o propiedades de "${primaryTopic}" con los de "${fourthTopic}". Tienen ámbitos de aplicación diferentes.`,
      `❌ Omitir justificaciones: Dar por supuestas propiedades sin fundamentar el principio teórico que las respalda.`,
      `❌ Falta de rigor en la terminología: Emplear lenguaje coloquial en lugar de los términos técnicos de la cátedra (${topics.slice(0, 4).join(", ")}).`,
      `🎯 Criterio del Tribunal: Para alcanzar una calificación superior (promoción o nota ≥ 8), se exige precisión conceptual instantánea y capacidad de interrelacionar este nivel con los temas previos de la materia.`,
    ].join("\n\n"),
    keyPoints: [
      `Diferenciar rigurosamente ${primaryTopic} de ${fourthTopic}.`,
      `Utilizar lenguaje técnico preciso de ${subjectName} en todo momento.`,
      `Sustentar cada afirmación con los principios expuestos en clase.`,
    ],
  });

  // MÓDULO 5: Glosario Técnico de Precisión
  sections.push({
    heading: `5. Glosario Técnico Esencial de Cátedra`,
    content: [
      `📖 VOCABULARIO TÉCNICO OBLIGATORIO:`,
      ...topics.slice(0, 5).map((t) => {
        const matchingS = sents.find((s) => norm(s).includes(norm(t)));
        return `🔹 **${t}**: ${matchingS || `Concepto clave de ${level.title} que determina el análisis y la fundamentación teórica en ${subjectName}.`}`;
      }),
    ].join("\n\n"),
    keyPoints: topics.slice(0, 5).map((t) => `Definición y empleo exacto de: ${t}`),
  });

  const examTips: string[] = [
    `En los exámenes de ${subjectName}, asegurate de justificar cada paso mencionando explícitamente: ${
      topics.slice(0, 4).join(", ") || level.title
    }.`,
    `No confundas las condiciones de validez de "${primaryTopic}" con casos particulares; verificá siempre los supuestos antes de aplicar una fórmula o regla.`,
    `Para alcanzar tu meta del ${targetMastery}% de dominio, tenés que aprobar la evaluación de este nivel con al menos ${
      getLevelWorkload(targetMastery).requiredAccuracyPercent
    }% de respuestas correctas o promedio 7.0/10 en el examen oral.`,
    `Si te toman oral, comenzá definiendo "${primaryTopic}" con solvencia y mencioná su vínculo con "${secondaryTopic}". La seguridad inicial define la nota del docente.`,
  ];

  // 2. Podcast Narrativo como Guión de Clase Hablada por el Profesor (Diferenciado por nivel)
  let podcastIntro = "";
  if (isFirstLevel) {
    podcastIntro = `¡Hola! Te doy una cálida bienvenida a la primera clase en audio de ${subjectName}. Soy tu profesor de TABE AI y en este episodio vamos a inaugurar tu camino construyendo los cimientos del Nivel 1: ${level.title}. No vamos a repetir textos de memoria; te voy a explicar la intuición y la lógica de cada concepto para que todo lo que venga después te resulte intuitivo y claro. ¡Ponete cómodo y prestá mucha atención!`;
  } else if (isFinalLevel) {
    podcastIntro = `¡Felicitaciones por llegar a la cumbre! Te doy la bienvenida a la clase magistral de cierre para ${subjectName}. En este episodio final abordamos el Nivel ${level.level}: ${level.title}, nuestro Simulacro Integrador. Hoy no venimos a ver definiciones aisladas; vamos a conectar todos los puntos de la materia, ver cómo resolver problemas transversales de examen y cómo pararte con total solvencia frente a la mesa evaluadora. ¡Vamos con todo!`;
  } else {
    podcastIntro = `¡Hola de nuevo! Continuamos avanzando con paso firme en ${subjectName}. En esta clase abordamos el Nivel ${level.level}: ${level.title}. Este tema es uno de los corazones conceptuales del programa y suele tener un peso decisivo en los parciales. Te voy a explicar la mecánica profunda, las deducciones y las trampas que suelen poner los profesores en los enunciados. ¡Comencemos!`;
  }

  const podcastChapters = sections.map((sec, i) => {
    const chapterTakeaway = sec.keyPoints[0] || sec.heading;
    const hook =
      i === 0
        ? `Vamos a arrancar por el cimiento de todo: ${sec.heading}. Si tuviera que sintetizarte este punto en una sola idea clave para el examen, es esta: ${chapterTakeaway}.`
        : i === 1
        ? `Pasemos ahora a la parte metodológica: ${sec.heading}. Acá es donde la materia suele ponerse exigente y donde muchos estudiantes se traban en los desarrollos.`
        : i === 2
        ? `Llegamos a los casos de examen reales: ${sec.heading}. Prestá especial atención a cómo plantear la deducción y la justificación paso a paso.`
        : i === 3
        ? `Ahora hablemos de lo que desaprueba: ${sec.heading}. Te voy a alertar de las trampas más típicas de los profesores para que no caigas en ellas.`
        : `Para cerrar con broche de oro, repasemos el vocabulario técnico de cátedra: ${sec.heading}.`;

    const narration = `${hook} ¿Por qué es crucial esto en ${subjectName}? Porque cuando te pregunten sobre ${sec.heading}, el tribunal busca que justifiques causa y efecto con precisión. Conclusión indispensable de este bloque: ${sec.keyPoints.join(". ")}.`;

    return {
      heading: sec.heading,
      narration,
      keyTakeaway: chapterTakeaway,
    };
  });

  const podcastConclusion = isFinalLevel
    ? `Y con esto cerramos el ciclo completo de preparación para ${subjectName}. Tenés el mapa holístico, la intuición teórica, las advertencias de cátedra y las herramientas metodológicas. Estás en condiciones de rendir con éxito cualquier examen oral o escrito. ¡Confiá en tu preparación y andá a buscar esa nota excelente!`
    : `Y con esto concluimos nuestra clase sobre ${level.title}. Ya tenés la intuición teórica, las advertencias de examen, el desglose metodológico y los conceptos clave. Ahora te toca a vos demostrar lo aprendido: podés repasar las flashcards, rendir el examen escrito o presentarte al examen oral en vivo conmigo. ¡Mucho éxito en la evaluación!`;

  const fullNarration = [
    podcastIntro,
    ...podcastChapters.map((c) => `${c.heading}:\n${c.narration}`),
    podcastConclusion,
  ].join("\n\n");

  const podcastScript: PodcastScript = {
    title: `Clase Nivel ${level.level}: ${level.title}`,
    episodeNumber: level.level,
    estimatedMinutes: Math.max(4, Math.round(fullNarration.length / 750)),
    introduction: podcastIntro,
    chapters: podcastChapters,
    conclusion: podcastConclusion,
    fullNarration,
  };

  // 3. Flashcards
  const sentences = extractSentences(rawText, 45, 260);
  const flashcards: LevelFlashcard[] = [];

  for (let i = 0; i < topics.length && flashcards.length < flashcardCount; i++) {
    const t = topics[i];
    const matchingSent = sentences.find((s) => norm(s).includes(norm(t)));
    flashcards.push({
      question: `¿Qué establece el material de ${subjectName} sobre "${t}" en el contexto de ${level.title}?`,
      answer:
        matchingSent ||
        `Es uno de los ejes centrales de "${level.title}". ${level.summary}`,
    });
  }

  for (let i = 0; i < sentences.length && flashcards.length < flashcardCount; i++) {
    const s = sentences[i];
    const kws = topKeywords(s, 2);
    const label = kws.join(" / ") || `Punto clave #${flashcards.length + 1}`;
    if (flashcards.some((f) => f.answer === s)) continue;
    flashcards.push({
      question: `Explicá y fundamentá la siguiente idea clave de "${level.title}" (${label}):`,
      answer: s,
    });
  }

  while (flashcards.length < flashcardCount) {
    const idx = flashcards.length + 1;
    flashcards.push({
      question: `Pregunta de síntesis #${idx}: ¿Cuál es el objetivo principal de "${level.title}" en ${subjectName}?`,
      answer: `${level.summary} (Temas vinculados: ${topics.join(", ") || subjectName}).`,
    });
  }

  // 4. Preguntas de Examen Escrito (Opción múltiple)
  const questions = buildClozeQuiz(
    rawText,
    topics,
    questionCount,
    subjectName,
    level.title
  );

  // 5. Preguntas de Examen Oral con la IA
  const oralQuestions: OralExamQuestion[] = topics.slice(0, oralCount).map((topic, i) => {
    const matchingSent =
      sentences.find((s) => norm(s).includes(norm(topic))) ||
      `En ${level.title}, el concepto de ${topic} resulta esencial para fundamentar los problemas de ${subjectName}.`;
    const nextTopic = topics[(i + 1) % topics.length] || subjectName;
    return {
      id: `oral-${level.level}-${i + 1}`,
      pregunta: `Pregunta oral #${i + 1}: Explicá con tus palabras el concepto de "${topic}" en el contexto de ${level.title}. ¿Cuáles son sus propiedades o condiciones clave y cómo se vincula con "${nextTopic}"?`,
      criterios: [
        `Definir con precisión qué es ${topic}`,
        `Mencionar las condiciones de aplicación o características centrales`,
        `Articular la respuesta con rigor académico en ${subjectName}`,
      ],
      respuestaModelo: matchingSent,
      puntosClave: [topic, nextTopic, ...topKeywords(matchingSent, 3)],
    };
  });

  return {
    studyGuide: {
      overview: level.summary,
      sections,
      examTips,
    },
    podcastScript,
    flashcards: flashcards.slice(0, flashcardCount),
    questions,
    oralQuestions,
  };
}

/* ───────────────────────── EVALUADOR ORAL EN TIEMPO REAL (CÁTEDRA EXIGENTE) ───────────────────────── */

/**
 * Evalúa la respuesta oral del estudiante aplicando rúbrica académica universitaria estricta:
 * - Sin complacencia: respuestas cortas o de relleno ('chamuyo') desaprueban (nota 1 a 5).
 * - Exige presencia explícita de términos técnicos y conceptos centrales del tema.
 * - Requiere al menos 40+ palabras fundamentadas y ≥65% de palabras clave para alcanzar el 7 (Aprobado).
 */
export function evaluateOralAnswerLocal(params: {
  question: OralExamQuestion;
  transcript: string;
  subjectName: string;
  targetMastery?: number;
}): OralAnswerEvaluation {
  const { question, transcript, subjectName } = params;
  const clean = norm(transcript);
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Filtrar palabras significativas (sin conectores triviales)
  const meaningfulWords = words.filter((w) => {
    const nw = norm(w);
    return nw.length > 3 && !STOP_WORDS.has(nw);
  });

  const totalKeywords = Math.max(1, question.puntosClave.length);
  const matchedKeywords = question.puntosClave.filter((pk) =>
    clean.includes(norm(pk))
  );
  const missingKeywords = question.puntosClave.filter(
    (pk) => !clean.includes(norm(pk))
  );
  const keywordRatio = matchedKeywords.length / totalKeywords;

  let puntaje = 1;
  const aspectosPositivos: string[] = [];
  const aspectosAMejorar: string[] = [];

  // 1. Evaluación por volumen de desarrollo conceptual
  if (wordCount < 12) {
    // Respuesta casi inexistente o monosilábica
    puntaje = 1;
    aspectosAMejorar.push("Respuesta prácticamente nula. En una mesa de examen oral debés desarrollar el concepto en profundidad.");
    if (missingKeywords.length > 0) {
      aspectosAMejorar.push(`Faltó mencionar conceptos centrales: ${missingKeywords.slice(0, 3).join(", ")}.`);
    }
  } else if (wordCount < 25) {
    // Muy breve / telegráfica (desaprobada)
    puntaje = keywordRatio > 0.6 ? 4 : keywordRatio > 0.3 ? 3 : 2;
    aspectosAMejorar.push("Desarrollo demasiado breve. En la universidad no alcanza con nombrar el tema, hay que fundamentarlo.");
    if (missingKeywords.length > 0) {
      aspectosAMejorar.push(`Omitiste explicar: ${missingKeywords.slice(0, 3).join(", ")}.`);
    }
    if (matchedKeywords.length > 0) {
      aspectosPositivos.push(`Identificaste al menos: ${matchedKeywords.join(", ")}.`);
    }
  } else if (wordCount < 40) {
    // Desarrollo medio pero insuficiente para final universitario
    if (keywordRatio < 0.35) {
      puntaje = 4;
      aspectosAMejorar.push("Tu respuesta usó palabras generales pero careció de precisión técnica y rigor disciplinar.");
    } else if (keywordRatio < 0.65) {
      puntaje = 5;
      aspectosAMejorar.push("Exposición incompleta. Omitiste vincular las propiedades y condiciones de aplicación.");
    } else {
      puntaje = 6;
      aspectosAMejorar.push("Tenés la noción general pero te faltó mayor solidez y desarrollo para la nota de corte.");
    }

    if (matchedKeywords.length > 0) {
      aspectosPositivos.push(`Utilizaste vocabulario relevante: ${matchedKeywords.join(", ")}.`);
    }
    if (missingKeywords.length > 0) {
      aspectosAMejorar.push(`Faltó profundizar en: ${missingKeywords.slice(0, 3).join(", ")}.`);
    }
  } else {
    // Desarrollo extenso: evaluar rigor técnico real (sin chamuyo)
    if (keywordRatio < 0.3) {
      // Mucho texto pero sin conceptos técnicos ("chamuyo")
      puntaje = 4;
      aspectosAMejorar.push("Hablaste con fluidez pero sin el contenido conceptual requerido. Faltó terminología de la materia.");
      if (missingKeywords.length > 0) {
        aspectosAMejorar.push(`Conceptos obligatorios no tratados: ${missingKeywords.join(", ")}.`);
      }
    } else if (keywordRatio < 0.5) {
      puntaje = 5;
      aspectosAMejorar.push("La exposición fue comprensible pero imprecisa. No definiste los ejes principales.");
      if (missingKeywords.length > 0) {
        aspectosAMejorar.push(`Debés integrar: ${missingKeywords.join(", ")}.`);
      }
      aspectosPositivos.push(`Aportaste contexto inicial y mencionaste: ${matchedKeywords.join(", ")}.`);
    } else if (keywordRatio < 0.7) {
      // Regular alto / Aprobado justo
      puntaje = wordCount >= 55 && meaningfulWords.length >= 25 ? 7 : 6;
      if (puntaje === 7) {
        aspectosPositivos.push(`Buena fundamentación teórica y correcto uso de: ${matchedKeywords.join(", ")}.`);
        if (missingKeywords.length > 0) {
          aspectosAMejorar.push(`Para aspirar al 9 o 10, debés relacionar también: ${missingKeywords.join(", ")}.`);
        }
      } else {
        aspectosAMejorar.push("Estuviste cerca de la aprobación, pero faltó conectar el concepto con sus implicancias prácticas.");
      }
    } else if (keywordRatio < 0.85) {
      // Distinguido (8 o 9)
      puntaje = wordCount >= 60 ? 9 : 8;
      aspectosPositivos.push(`Exposición sólida y precisa. Dominio claro de los conceptos: ${matchedKeywords.join(", ")}.`);
      aspectosPositivos.push("Articulación conceptual rigurosa y vocabulario técnico adecuado.");
      if (missingKeywords.length > 0) {
        aspectosAMejorar.push(`Detalle fino para examen final: profundizar en ${missingKeywords.join(", ")}.`);
      }
    } else {
      // Sobresaliente (10)
      puntaje = 10;
      aspectosPositivos.push(`Respuesta impecable. Cubriste todos los puntos evaluados: ${matchedKeywords.join(", ")}.`);
      aspectosPositivos.push("Excelente dicción, fundamentación teórica y capacidad de síntesis académica.");
    }
  }

  // En una mesa de examen rigurosa se aprueba con 7 o más
  const aprobado = puntaje >= 7;
  let feedbackOral = "";

  if (aprobado) {
    if (puntaje === 10) {
      feedbackOral = `Sobresaliente. Calificación: 10 de 10. Demostraste un dominio exhaustivo y riguroso de ${question.puntosClave.slice(0, 2).join(" y ")}.`;
    } else if (puntaje >= 8) {
      feedbackOral = `Muy buena exposición. Calificación: ${puntaje} de 10. ${aspectosPositivos[0]} ${
        aspectosAMejorar.length ? "Como sugerencia: " + aspectosAMejorar[0] : "Excelente respuesta."
      }`;
    } else {
      feedbackOral = `Aprobado con lo justo. Calificación: 7 de 10. La respuesta cumple con lo indispensable, aunque ${
        aspectosAMejorar[0] || "debés afianzar la precisión técnica en el examen final."
      }`;
    }
  } else {
    feedbackOral = `Calificación: ${puntaje} de 10. Desaprobado. Para una mesa de examen en ${subjectName}, la respuesta fue insuficiente. ${
      aspectosAMejorar[0] || "Tenés que profundizar en la teoría."
    } ${missingKeywords.length > 0 ? `Conceptos indispensables a repasar: ${missingKeywords.slice(0, 2).join(", ")}.` : ""}`;
  }

  return {
    preguntaId: question.id,
    puntaje,
    aprobado,
    aspectosPositivos: aspectosPositivos.length ? aspectosPositivos : ["Intentaste estructurar una respuesta oral"],
    aspectosAMejorar: aspectosAMejorar.length ? aspectosAMejorar : ["Desarrollar mayor profundidad conceptual y vocabulario técnico"],
    feedbackOral,
  };
}
