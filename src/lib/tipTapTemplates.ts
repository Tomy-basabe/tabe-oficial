import { JSONContent } from "@tiptap/core";

export interface TipTapTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  content: JSONContent;
}

// ─── Helper builders ────────────────────────────────────────────────────────

const h = (level: 1 | 2 | 3, text: string): JSONContent => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});

const p = (text: string): JSONContent => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

const pBold = (label: string, value: string): JSONContent => ({
  type: "paragraph",
  content: [
    { type: "text", text: label, marks: [{ type: "bold" }] },
    { type: "text", text: value },
  ],
});

const pEmpty = (): JSONContent => ({ type: "paragraph" });

const hr = (): JSONContent => ({ type: "horizontalRule" });

const bullet = (items: string[]): JSONContent => ({
  type: "bulletList",
  content: items.map((t) => ({
    type: "listItem",
    content: [{ type: "paragraph", content: [{ type: "text", text: t }] }],
  })),
});

const ordered = (items: string[]): JSONContent => ({
  type: "orderedList",
  content: items.map((t) => ({
    type: "listItem",
    content: [{ type: "paragraph", content: [{ type: "text", text: t }] }],
  })),
});

const tasks = (items: string[]): JSONContent => ({
  type: "taskList",
  content: items.map((t) => ({
    type: "taskItem",
    attrs: { checked: false },
    content: [{ type: "paragraph", content: [{ type: "text", text: t }] }],
  })),
});

const callout = (
  type: "info" | "success" | "warning" | "danger" | "tip",
  text: string
): JSONContent => ({
  type: "callout",
  attrs: { type },
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const today = () => new Date().toLocaleDateString("es-AR");

// ─── Templates ──────────────────────────────────────────────────────────────

export const tipTapTemplates: TipTapTemplate[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. RESUMEN DE CLASE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "class-summary",
    name: "Resumen de Clase",
    emoji: "📚",
    description: "Apuntes completos con estructura profesional para cada clase",
    content: {
      type: "doc",
      content: [
        h(1, "📚 Resumen de Clase"),

        // ── Metadata
        callout("info", "📅 Completa los datos de esta clase para tener todo organizado."),
        pBold("Fecha: ", today()),
        pBold("Profesor/a: ", "[Nombre del docente]"),
        pBold("Unidad / Módulo: ", "[Ej: Unidad 3 – Estructuras de Datos]"),

        hr(),

        // ── Temas principales
        h(2, "📌 Temas Principales"),
        p("Listá los temas que se abordaron durante la clase:"),
        bullet([
          "Tema 1: [Describir brevemente]",
          "Tema 2: [Describir brevemente]",
          "Tema 3: [Describir brevemente]",
        ]),

        hr(),

        // ── Conceptos clave
        h(2, "🔑 Conceptos Clave"),
        p("Definí los conceptos más importantes que se explicaron:"),
        bullet([
          "[Concepto]: [Su definición o explicación con tus palabras]",
          "[Concepto]: [Su definición o explicación con tus palabras]",
          "[Concepto]: [Su definición o explicación con tus palabras]",
        ]),

        hr(),

        // ── Desarrollo / Notas
        h(2, "📝 Desarrollo y Notas"),
        p("Escribí el desarrollo de la clase con tus propias palabras. Incluí explicaciones, razonamientos y todo lo que el profesor haya destacado como importante."),
        pEmpty(),

        hr(),

        // ── Ejemplos
        h(2, "📎 Ejemplos y Ejercicios de Clase"),
        p("Anotá los ejemplos que dio el profesor, ejercicios resueltos en el pizarrón o casos prácticos:"),
        ordered([
          "[Ejemplo o ejercicio 1 – explicación paso a paso]",
          "[Ejemplo o ejercicio 2 – explicación paso a paso]",
        ]),

        hr(),

        // ── Fórmulas / Datos
        h(2, "📐 Fórmulas y Datos Importantes"),
        callout("tip", "💡 Si la clase incluyó fórmulas, teoremas o datos numéricos clave, anotálos acá para tenerlos siempre a mano."),
        pEmpty(),

        hr(),

        // ── Conexiones
        h(2, "🔗 Relaciones con Otros Temas"),
        p("¿Cómo se conecta esto con lo visto en clases anteriores o futuras?"),
        bullet([
          "Se relaciona con [tema anterior] porque…",
          "Esto es base para entender [tema futuro]…",
        ]),

        hr(),

        // ── Dudas
        h(2, "❓ Dudas y Preguntas Pendientes"),
        callout("warning", "⚠️ No te quedes con dudas. Anotálas acá y consultálas la próxima clase o por el campus virtual."),
        tasks([
          "Pregunta para el profesor: [Escribir duda]",
          "Tema que no quedó claro: [Describir]",
          "Investigar por mi cuenta: [Tema]",
        ]),

        hr(),

        // ── Tareas
        h(2, "✅ Tareas y Pendientes"),
        tasks([
          "Repasar los conceptos clave de esta clase",
          "Completar ejercicio/tarea asignada",
          "Leer material complementario: [Indicar cuál]",
          "Preparar preguntas para la próxima clase",
        ]),

        hr(),

        // ── Resumen final
        h(2, "📌 Resumen en 3 Líneas"),
        callout("success", "✍️ Escribí un mini-resumen de esta clase en 2-3 oraciones. Esto te va a servir para repasar rápido antes de un examen."),
        pEmpty(),
      ],
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. PREPARACIÓN DE EXAMEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "exam-prep",
    name: "Preparación de Examen",
    emoji: "📖",
    description: "Planificación y estudio organizado para tus exámenes",
    content: {
      type: "doc",
      content: [
        h(1, "📖 Preparación de Examen"),

        // ── Info del examen
        callout("danger", "🚨 Completá toda la información del examen para no olvidarte de nada."),
        pBold("Materia: ", "[Nombre de la materia]"),
        pBold("Fecha del examen: ", "[dd/mm/aaaa]"),
        pBold("Horario: ", "[Hora de inicio]"),
        pBold("Tipo de examen: ", "[Parcial / Final / Recuperatorio / Integrador]"),
        pBold("Modalidad: ", "[Presencial / Virtual / Oral / Escrito / Multiple choice]"),
        pBold("Materiales permitidos: ", "[Ej: Calculadora, apuntes, formulario, nada]"),
        pBold("Duración estimada: ", "[Ej: 2 horas]"),

        hr(),

        // ── Temas
        h(2, "📋 Temas a Estudiar"),
        p("Marcá cada tema a medida que lo vayas estudiando:"),
        tasks([
          "Unidad 1: [Nombre] – [Temas específicos]",
          "Unidad 2: [Nombre] – [Temas específicos]",
          "Unidad 3: [Nombre] – [Temas específicos]",
          "Unidad 4: [Nombre] – [Temas específicos]",
          "Unidad 5: [Nombre] – [Temas específicos]",
        ]),

        hr(),

        // ── Conceptos clave
        h(2, "🔑 Conceptos Clave para el Examen"),
        p("Listá las definiciones y conceptos que seguro van a estar:"),
        bullet([
          "[Concepto 1]: [Definición con tus palabras]",
          "[Concepto 2]: [Definición con tus palabras]",
          "[Concepto 3]: [Definición con tus palabras]",
          "[Concepto 4]: [Definición con tus palabras]",
        ]),

        hr(),

        // ── Fórmulas
        h(2, "📐 Fórmulas y Teoremas"),
        callout("info", "📝 Escribí todas las fórmulas que tenés que saber para el examen. Si las repetís varias veces las vas a memorizar más fácil."),
        pEmpty(),

        hr(),

        // ── Preguntas frecuentes
        h(2, "❓ Preguntas Frecuentes de Examen"),
        p("Anotá preguntas que suelen aparecer en parciales/finales anteriores:"),
        ordered([
          "[Pregunta típica 1] → Respuesta clave: [...]",
          "[Pregunta típica 2] → Respuesta clave: [...]",
          "[Pregunta típica 3] → Respuesta clave: [...]",
        ]),

        hr(),

        // ── Ejercicios tipo
        h(2, "🔄 Ejercicios Tipo / Modelos de Examen"),
        p("Resolvé ejercicios similares a los del examen. Anotá los que te costaron más:"),
        tasks([
          "Resolver parcial/final modelo del año pasado",
          "Ejercicio tipo 1: [Descripción]",
          "Ejercicio tipo 2: [Descripción]",
          "Ejercicio tipo 3: [Descripción]",
        ]),

        hr(),

        // ── Errores comunes
        h(2, "⚠️ Errores Comunes y Trampas"),
        callout("warning", "🧠 Anotá acá los errores típicos que cometés para no repetirlos en el examen."),
        bullet([
          "Error 1: [Describir el error y cómo evitarlo]",
          "Error 2: [Describir el error y cómo evitarlo]",
        ]),

        hr(),

        // ── Puntos difíciles
        h(2, "🔴 Temas que me Cuestan Más"),
        p("Sé honesto con vos mismo. ¿Qué temas necesitás repasar más?"),
        bullet([
          "[Tema difícil 1] – ¿Por qué me cuesta? [Explicar]",
          "[Tema difícil 2] – ¿Por qué me cuesta? [Explicar]",
        ]),

        hr(),

        // ── Plan de estudio
        h(2, "📅 Plan de Estudio"),
        callout("tip", "💡 Organizá tus días de estudio. Usá la técnica Pomodoro: 25 min de estudio + 5 min de descanso. Cada 4 bloques, descansá 15-20 min."),
        tasks([
          "Día 1: Leer y resumir Unidad 1 y 2",
          "Día 2: Leer y resumir Unidad 3 y 4",
          "Día 3: Resolver ejercicios prácticos",
          "Día 4: Repasar fórmulas y conceptos clave",
          "Día 5: Hacer examen modelo cronometrado",
          "Día 6: Repasar errores y temas difíciles",
          "Día 7: Repaso general liviano (no estudiar hasta tarde)",
        ]),

        hr(),

        // ── Recursos
        h(2, "📚 Recursos y Material de Estudio"),
        tasks([
          "Apuntes de clase completos",
          "Libro / bibliografía: [Nombre]",
          "Parciales/finales anteriores resueltos",
          "Videos explicativos: [Link o referencia]",
          "Grupo de estudio organizado",
        ]),

        hr(),

        // ── Checklist pre-examen
        h(2, "✅ Checklist Pre-Examen (día anterior)"),
        tasks([
          "Revisar horario y aula del examen",
          "Preparar DNI / credencial",
          "Cargar calculadora / materiales permitidos",
          "Llevar lapiceras, lápiz y goma extras",
          "Dormir al menos 7 horas",
          "Desayunar bien antes del examen",
        ]),
      ],
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. NOTAS DE LABORATORIO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "lab-notes",
    name: "Notas de Laboratorio",
    emoji: "🔬",
    description: "Informe completo para prácticas y experimentos",
    content: {
      type: "doc",
      content: [
        h(1, "🔬 Informe de Práctica de Laboratorio"),

        // ── Info general
        callout("info", "📋 Completá los datos de la práctica para tener un informe prolijo y profesional."),
        pBold("Fecha: ", today()),
        pBold("Práctica N°: ", "[Número]"),
        pBold("Título de la práctica: ", "[Nombre de la práctica]"),
        pBold("Profesor/a: ", "[Nombre del docente]"),
        pBold("Integrantes del grupo: ", "[Nombre 1, Nombre 2, ...]"),
        pBold("Comisión / Turno: ", "[Ej: Comisión A – Turno Mañana]"),

        hr(),

        // ── Objetivo
        h(2, "🎯 Objetivo"),
        p("¿Cuál es el propósito de esta práctica? ¿Qué se busca demostrar, medir o analizar?"),
        pEmpty(),

        hr(),

        // ── Marco teórico
        h(2, "📖 Marco Teórico"),
        p("Resumí brevemente la base teórica necesaria para entender esta práctica. Incluí leyes, principios o conceptos relevantes."),
        pEmpty(),

        hr(),

        // ── Hipótesis
        h(2, "💭 Hipótesis"),
        callout("tip", "💡 ¿Qué resultado esperás obtener antes de empezar? Escribí tu predicción basándote en la teoría."),
        pEmpty(),

        hr(),

        // ── Materiales
        h(2, "🧪 Materiales y Equipos"),
        p("Listá todos los materiales, reactivos, instrumentos y equipos utilizados:"),
        bullet([
          "[Material/Reactivo 1] – [Cantidad/Especificación]",
          "[Material/Reactivo 2] – [Cantidad/Especificación]",
          "[Instrumento 1] – [Marca/Modelo si aplica]",
          "[Equipo 1] – [Especificaciones]",
        ]),

        hr(),

        // ── Procedimiento
        h(2, "📝 Procedimiento"),
        p("Describí paso a paso lo que hiciste en la práctica:"),
        ordered([
          "[Paso 1: Describir acción detallada]",
          "[Paso 2: Describir acción detallada]",
          "[Paso 3: Describir acción detallada]",
          "[Paso 4: Describir acción detallada]",
          "[Paso 5: Describir acción detallada]",
        ]),

        hr(),

        // ── Datos crudos
        h(2, "📊 Datos y Mediciones"),
        p("Registrá los datos crudos obtenidos durante la práctica. Usá tablas si es necesario."),
        callout("info", "📐 Incluí unidades de medida, incertidumbres y condiciones (temperatura, presión, etc.) si aplica."),
        pEmpty(),

        hr(),

        // ── Cálculos
        h(2, "🔢 Cálculos y Procesamiento de Datos"),
        p("Mostrá las fórmulas utilizadas y los cálculos realizados con los datos obtenidos:"),
        pEmpty(),

        hr(),

        // ── Resultados
        h(2, "📈 Resultados"),
        p("Presentá los resultados finales de forma clara. Si hiciste gráficos o tablas de resultados, incluílos acá."),
        pEmpty(),

        hr(),

        // ── Observaciones
        h(2, "👁️ Observaciones"),
        p("¿Qué observaste durante la práctica que sea relevante? Cambios de color, reacciones inesperadas, dificultades técnicas, etc."),
        bullet([
          "[Observación 1]",
          "[Observación 2]",
        ]),

        hr(),

        // ── Análisis
        h(2, "🔍 Análisis y Discusión"),
        p("Analizá los resultados obtenidos:"),
        bullet([
          "¿Los resultados coinciden con tu hipótesis? ¿Por qué sí o por qué no?",
          "¿Qué fuentes de error pudieron afectar los resultados?",
          "¿Cómo se comparan con los valores teóricos esperados?",
          "¿Qué se podría mejorar si se repitiera el experimento?",
        ]),

        hr(),

        // ── Conclusiones
        h(2, "💡 Conclusiones"),
        callout("success", "✍️ Escribí las conclusiones de forma clara y concisa. ¿Se cumplió el objetivo? ¿Qué aprendiste?"),
        pEmpty(),

        hr(),

        // ── Cuestionario
        h(2, "❓ Cuestionario / Preguntas de la Guía"),
        p("Si la práctica incluye preguntas para responder, resolvélas acá:"),
        ordered([
          "[Pregunta 1]: [Tu respuesta]",
          "[Pregunta 2]: [Tu respuesta]",
          "[Pregunta 3]: [Tu respuesta]",
        ]),

        hr(),

        // ── Bibliografía
        h(2, "📚 Bibliografía y Referencias"),
        bullet([
          "[Autor, Año. Título del libro/artículo. Editorial]",
          "[Guía de trabajos prácticos de la cátedra]",
        ]),
      ],
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. MÉTODO CORNELL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "cornell",
    name: "Método Cornell",
    emoji: "🎓",
    description: "Sistema probado de toma de notas para estudio efectivo",
    content: {
      type: "doc",
      content: [
        h(1, "🎓 Método Cornell"),

        // ── Info
        callout("info", "📘 El método Cornell divide tus notas en 3 secciones: preguntas clave (columna izquierda), notas principales (columna derecha) y resumen (abajo). Esto te fuerza a procesar y sintetizar la información, mejorando la retención hasta un 40%."),

        pBold("Tema / Clase: ", "[Nombre del tema o clase]"),
        pBold("Fecha: ", today()),
        pBold("Materia: ", "[Nombre de la materia]"),
        pBold("Profesor/a: ", "[Nombre del docente]"),

        hr(),

        // ── SECCIÓN 1: Preguntas clave (Columna izquierda Cornell)
        h(2, "❓ Preguntas Clave"),
        callout("tip", "💡 Después de la clase, releé tus notas y formulá preguntas que se respondan con la información anotada. Esto es lo que vas a usar para repasar."),
        bullet([
          "¿Qué es [concepto principal]?",
          "¿Cómo funciona [proceso o mecanismo]?",
          "¿Por qué es importante [concepto]?",
          "¿Cuál es la diferencia entre [A] y [B]?",
          "¿Qué relación hay entre [tema 1] y [tema 2]?",
          "¿Cuáles son las características de [concepto]?",
          "¿En qué casos se aplica [teoría/fórmula]?",
        ]),

        hr(),

        // ── SECCIÓN 2: Notas principales (Columna derecha Cornell)
        h(2, "📝 Notas de Clase"),
        p("Anotá los puntos principales de la clase. Usá frases cortas, abreviaturas y tu propio estilo. No copies palabra por palabra, procesá la información."),
        pEmpty(),

        h(3, "Concepto 1: [Nombre]"),
        bullet([
          "[Definición o explicación]",
          "[Detalle o ejemplo importante]",
          "[Dato clave a recordar]",
        ]),

        h(3, "Concepto 2: [Nombre]"),
        bullet([
          "[Definición o explicación]",
          "[Detalle o ejemplo importante]",
          "[Dato clave a recordar]",
        ]),

        h(3, "Concepto 3: [Nombre]"),
        bullet([
          "[Definición o explicación]",
          "[Detalle o ejemplo importante]",
          "[Dato clave a recordar]",
        ]),

        hr(),

        // ── Ejemplos dados en clase
        h(2, "📎 Ejemplos del Profesor"),
        p("Los ejemplos concretos que dio el docente durante la explicación:"),
        ordered([
          "[Ejemplo 1: Descripción y resolución]",
          "[Ejemplo 2: Descripción y resolución]",
        ]),

        hr(),

        // ── Fórmulas / Esquemas
        h(2, "📐 Fórmulas, Diagramas o Esquemas"),
        callout("info", "📊 Si hay fórmulas, gráficos o esquemas clave, anotálos acá para tenerlos todos juntos."),
        pEmpty(),

        hr(),

        // ── Vocabulario
        h(2, "📖 Vocabulario y Términos Nuevos"),
        bullet([
          "[Término 1]: [Significado]",
          "[Término 2]: [Significado]",
          "[Término 3]: [Significado]",
        ]),

        hr(),

        // ── SECCIÓN 3: Resumen (Parte inferior Cornell)
        h(2, "📌 Resumen"),
        callout("success", "✍️ Escribí un resumen de 3-5 oraciones con los puntos más importantes de la clase. Este resumen es tu herramienta de repaso rápido: si podés explicar el tema solo leyendo esto, lo entendiste bien."),
        pEmpty(),

        hr(),

        // ── Repaso activo
        h(2, "🔄 Guía de Repaso Activo"),
        callout("tip", "🧠 Para repasar con método Cornell: tapá las notas (columna derecha) e intentá responder las preguntas clave (columna izquierda) de memoria. Luego verificá con tus notas."),
        tasks([
          "Primer repaso: dentro de las 24 hs después de la clase",
          "Segundo repaso: a la semana",
          "Tercer repaso: antes del examen",
          "Pude responder todas las preguntas clave de memoria",
          "Puedo explicar el tema a un compañero sin mirar las notas",
        ]),

        hr(),

        // ── Dudas
        h(2, "❓ Dudas para Resolver"),
        tasks([
          "[Pregunta o duda que quedó pendiente]",
          "[Tema que necesito profundizar]",
          "[Consultar con el profesor sobre...]",
        ]),

        hr(),

        // ── Conexiones
        h(2, "🔗 Conexiones con Otros Temas"),
        p("¿Cómo se relaciona lo de hoy con lo que ya sabés?"),
        bullet([
          "Se conecta con [tema anterior] porque…",
          "Es la base para entender [tema futuro]…",
          "Es similar/opuesto a [concepto visto en otra materia]…",
        ]),
      ],
    },
  },
];
