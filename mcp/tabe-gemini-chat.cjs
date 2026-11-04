#!/usr/bin/env node
/**
 * TABE AI - Cliente interactivo local de Google Gemini
 * 
 * Permite usar Google Gemini con el 100% de las funciones de TABE AI en local:
 * - Resolver cuestionarios de Campus Virtual UTN FRM por URL y auto-entregarlos
 * - Cargar materias aprobadas y notas masivas en el plan de carrera
 * - Consultar materias, promedio general y correlatividades
 * - Consultar tareas y fechas límites del Campus Virtual
 * - Resolver encuestas docentes de Sysacad
 * - Crear eventos de calendario, flashcards y guardar notas
 * 
 * Ejecución:
 *   npm run gemini
 *   o
 *   node mcp/tabe-gemini-chat.cjs
 */

const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Archivos locales de configuración
const KEY_FILE = path.resolve(process.cwd(), ".gemini_key");
const CREDS_FILE = path.resolve(process.cwd(), ".tabe_user_creds.json");
const ENV_FILE = path.resolve(process.cwd(), ".env");

// Cargar variables de .env si existen
function loadEnv() {
  if (fs.existsSync(ENV_FILE)) {
    try {
      const content = fs.readFileSync(ENV_FILE, "utf8");
      content.split(/\r?\n/).forEach((line) => {
        const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (m) {
          const key = m[1];
          let val = m[2] || "";
          val = val.replace(/^["']|["']$/g, "").trim();
          if (!process.env[key]) process.env[key] = val;
        }
      });
    } catch {}
  }
}
loadEnv();

// Obtener host de TABE
const args = process.argv.slice(2);
let host = process.env.TABE_HOST || "";
let token = process.env.TABE_TOKEN || "";
let geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";

// Argumentos CLI
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--token" && args[i + 1]) token = args[++i];
  else if (args[i].startsWith("--token=")) token = args[i].split("=")[1];
  else if (args[i] === "--host" && args[i + 1]) host = args[++i];
  else if (args[i].startsWith("--host=")) host = args[i].split("=")[1];
  else if (args[i] === "--key" && args[i + 1]) geminiKey = args[++i];
  else if (args[i].startsWith("--key=")) geminiKey = args[i].split("=")[1];
}

// Intentar leer key de archivo local .gemini_key
if (!geminiKey && fs.existsSync(KEY_FILE)) {
  try {
    geminiKey = fs.readFileSync(KEY_FILE, "utf8").trim();
  } catch {}
}

// Limpiar si el usuario pegó la URL junto a la key
if (geminiKey) {
  const matchKey = geminiKey.match(/(AIzaSy[A-Za-z0-9_-]+)/);
  if (matchKey) geminiKey = matchKey[1];
}

// Función para resolver host automáticamente
async function resolveHost() {
  if (host) return host;
  try {
    const res = await fetch("http://localhost:8080/api/tabe-actions/gemini-tools.json", { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      host = "http://localhost:8080";
      return host;
    }
  } catch {}
  host = "https://www.tabe.com.ar";
  return host;
}

// Intentar autodetectar primer token de usuario registrado en disco
if (!token && fs.existsSync(CREDS_FILE)) {
  try {
    const credsData = JSON.parse(fs.readFileSync(CREDS_FILE, "utf8"));
    const userIds = Object.keys(credsData);
    if (userIds.length > 0) {
      // Codificar token si tenemos el userId
      const u = userIds[0];
      const encoded = Buffer.from(u, "utf-8").toString("base64url");
      token = `tabe_usr_${encoded}`;
    }
  } catch {}
}

// Catálogo de herramientas de TABE para Gemini
const TABE_TOOLS = [
  {
    name: "login",
    description: "Inicia sesión en TABE con usuario (email o legajo) y contraseña para conectar tu cuenta y acceder a tus notas, materias y campus virtual.",
    parameters: {
      type: "OBJECT",
      required: ["username", "password"],
      properties: {
        username: { type: "STRING", description: "Email o usuario de TABE" },
        password: { type: "STRING", description: "Contraseña de tu cuenta de TABE" },
      },
    },
  },
  {
    name: "get_academic_context",
    description: "Obtiene el contexto académico completo del estudiante: perfil, carrera, materias aprobadas con sus notas finales, materias regulares, cursando, promedio general y porcentaje de avance en TABE.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "manage_subjects",
    description: "Carga o actualiza materias con sus notas finales y estados (aprobada con nota, regular) en el plan de carrera de TABE. Permite enviar un texto libre con pares 'Materia: Nota' o un array estructurado.",
    parameters: {
      type: "OBJECT",
      properties: {
        text: { type: "STRING", description: "Texto libre con materias y notas (ej: 'Bases de Datos: 9\\nFísica I: 8')" },
        subjects: {
          type: "ARRAY",
          description: "Lista estructurada de materias con nombre y nota",
          items: {
            type: "OBJECT",
            required: ["name", "grade"],
            properties: {
              name: { type: "STRING", description: "Nombre de la materia" },
              grade: { type: "NUMBER", description: "Calificación de 1 a 10" },
              estado: { type: "STRING", description: "'aprobada' o 'regular'" },
            },
          },
        },
      },
    },
  },
  {
    name: "resolve_campus_quiz",
    description: "Accede al Campus Virtual de UTN FRM, analiza cada pregunta conceptualmente, responde y auto-envía el cuestionario de Moodle indicado por URL.",
    parameters: {
      type: "OBJECT",
      properties: {
        quizUrl: { type: "STRING", description: "URL completa del cuestionario en Moodle (ej: https://campusvirtual.frm.utn.edu.ar/mod/quiz/view.php?id=XXXXX)" },
        quizName: { type: "STRING", description: "Nombre del cuestionario a buscar si no hay URL" },
        courseName: { type: "STRING", description: "Nombre de la materia" },
        submitMode: { type: "STRING", description: "'finish' para entregar oficialmente y obtener nota, o 'save' para borrador" },
      },
    },
  },
  {
    name: "get_campus_deadlines",
    description: "Consulta las tareas próximas, entregas de trabajos prácticos y cuestionarios pendientes en el Campus Virtual UTN FRM del estudiante.",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: { type: "NUMBER", description: "Cantidad máxima de tareas a devolver" },
      },
    },
  },
  {
    name: "resolve_docente_encuestas",
    description: "Completa automáticamente todas las encuestas docentes pendientes en Sysacad / Campus Virtual con valoración positiva.",
    parameters: {
      type: "OBJECT",
      properties: {
        comentarioGeneral: { type: "STRING", description: "Comentario opcional a dejar en las encuestas" },
      },
    },
  },
  {
    name: "get_study_stats",
    description: "Consulta las horas de estudio acumuladas, sesiones y racha del estudiante en TABE.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "create_calendar_event",
    description: "Agrega un examen, parcial, entrega o clase en el calendario académico de TABE del alumno.",
    parameters: {
      type: "OBJECT",
      required: ["title", "startTime"],
      properties: {
        title: { type: "STRING", description: "Título del evento" },
        startTime: { type: "STRING", description: "Fecha y hora de inicio (YYYY-MM-DD o ISO)" },
        category: { type: "STRING", description: "examen, entrega, clase o estudio" },
        subject: { type: "STRING", description: "Materia asociada" },
      },
    },
  },
  {
    name: "create_flashcards",
    description: "Crea un mazo de tarjetas de memoria (flashcards) para una materia en TABE.",
    parameters: {
      type: "OBJECT",
      required: ["deckName", "cards"],
      properties: {
        deckName: { type: "STRING", description: "Nombre del mazo de flashcards" },
        subject: { type: "STRING", description: "Materia" },
        cards: {
          type: "ARRAY",
          description: "Tarjetas con anverso y reverso",
          items: {
            type: "OBJECT",
            required: ["front", "back"],
            properties: {
              front: { type: "STRING" },
              back: { type: "STRING" },
            },
          },
        },
      },
    },
  },
  {
    name: "query_student_notes",
    description: "Busca apuntes o notas tomadas por el estudiante en el editor de TABE.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Término de búsqueda" },
        subject: { type: "STRING", description: "Materia a filtrar" },
      },
    },
  },
  {
    name: "save_quick_note",
    description: "Guarda un nuevo apunte o resumen de clase en Notion de TABE.",
    parameters: {
      type: "OBJECT",
      required: ["title"],
      properties: {
        title: { type: "STRING", description: "Título del apunte" },
        content: { type: "STRING", description: "Contenido del apunte" },
      },
    },
  },
];

const SYSTEM_INSTRUCTION = `Eres TABE AI, el copiloto universitario personal de TABE para estudiantes de la UTN FRM (Facultad Regional Mendoza).
Tienes conexión directa a la cuenta del estudiante y a todas las herramientas oficiales de TABE mediante Function Calling:

CAPACIDADES OFICIALES:
1. RESOLVER CUESTIONARIOS: Si el estudiante te pasa un enlace de Moodle (ej: https://campusvirtual.frm.utn.edu.ar/mod/quiz/view.php?id=...), llama INMEDIATAMENTE a la herramienta resolve_campus_quiz con quizUrl. TABE abrirá el cuestionario, responderá cada pregunta con análisis riguroso y lo auto-entregará.
2. CARGAR MATERIAS Y NOTAS: Si el estudiante te pide cargar notas (ej: 'Cargame Comunicación de Datos: 10, Bases de Datos: 9...'), llama INMEDIATAMENTE a manage_subjects pasándole el texto o la lista. TABE actualizará las materias aprobadas y el promedio en la base de datos de TABE.
3. CONTEXTO ACADÉMICO: Si te preguntan por sus materias, promedio, qué materias le faltan o cómo va, usa get_academic_context.
4. DEADLINES Y ENTREGAS: Si te preguntan qué tareas, parciales o cuestionarios vencen pronto, usa get_campus_deadlines.
5. ENCUESTAS DOCENTES: Si te piden responder encuestas de Sysacad, usa resolve_docente_encuestas.
6. CALENDARIO Y FLASHCARDS: Crea eventos y flashcards cuando el estudiante lo solicite.

PERSONALIDAD:
- Habla en español rioplatense/argentino natural ("¿En qué te ayudo?", "Tenés", "Dale", "Genial").
- Sé claro, preciso, académico y motivador.
- NUNCA digas que no puedes modificar notas o resolver cuestionarios; para eso tienes las herramientas de TABE.`;

// Cliente Supabase autenticado en memoria
let activeAuthedSb = null;

// Función para ejecutar una herramienta contra el backend de TABE
async function executeTabeAction(toolName, toolArgs) {
  const currentHost = await resolveHost();
  const cleanHost = currentHost.replace(/\/+$/, "");

  if (toolName === "login") {
    // 1. Probar vía HTTP endpoint con timeout de 3.5 segundos
    try {
      const res = await fetch(`${cleanHost}/api/tabe-actions/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toolArgs || {}),
        signal: AbortSignal.timeout(3500),
      });

      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {}

      if (data && data.ok) {
        token = data.token;
        try {
          fs.writeFileSync(
            CREDS_FILE,
            JSON.stringify(
              {
                token,
                userId: data.userId,
                estudiante: data.estudiante,
                updatedAt: new Date().toISOString(),
              },
              null,
              2
            ),
            "utf8"
          );
        } catch {}
        return data;
      }
      if (data && data.error && !data.error.includes("404")) {
        return data;
      }
    } catch {}

    // 2. Fallback ultra rápido a Supabase Cloud (200ms)
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        return { ok: false, error: "No se encontraron variables de Supabase en .env" };
      }

      const sb = createClient(supabaseUrl, supabaseKey);
      const authRes = await sb.auth.signInWithPassword({
        email: toolArgs.username,
        password: toolArgs.password,
      });

      if (authRes.error || !authRes.data?.user) {
        return { ok: false, error: authRes.error?.message || "Credenciales incorrectas" };
      }

      const user = authRes.data.user;
      const session = authRes.data.session;
      const userId = user.id;
      const tabeToken = `tabe_usr_${Buffer.from(userId, "utf-8").toString("base64url")}`;
      token = tabeToken;

      activeAuthedSb = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${session.access_token}` } },
      });

      const { data: profile } = await activeAuthedSb.from("profiles").select("*").eq("id", userId).maybeSingle();
      const { data: subjectStatuses } = await activeAuthedSb
        .from("user_subject_status")
        .select("id, estado, nota, nota_final_examen, fecha_aprobacion, subject_id, subjects(id, nombre, codigo, año)")
        .eq("user_id", userId);

      const aprobadas = [];
      const regulares = [];
      let sumaNotas = 0;
      let cantNotas = 0;

      (subjectStatuses || []).forEach((st) => {
        const subName = st.subjects?.nombre || "Materia";
        const grade = st.nota_final_examen ?? st.nota;
        const isAprobada = st.estado === "aprobada" || (typeof grade === "number" && grade >= 6);

        if (isAprobada) {
          aprobadas.push({ materia: subName, nota: grade, fecha: st.fecha_aprobacion });
          if (typeof grade === "number" && grade > 0) {
            sumaNotas += grade;
            cantNotas++;
          }
        } else if (st.estado === "regular") {
          regulares.push({ materia: subName, nota: grade });
        }
      });

      const promedio = cantNotas > 0 ? parseFloat((sumaNotas / cantNotas).toFixed(2)) : 0;
      const totalMaterias = 37;

      const resultData = {
        ok: true,
        token: tabeToken,
        userId,
        estudiante: {
          id: userId,
          email: user.email,
          nombre: profile?.nombre || user.user_metadata?.nombre || "Estudiante",
          carrera: profile?.carrera || "Ingeniería en Sistemas de Información",
        },
        progreso: {
          materiasAprobadas: aprobadas.length,
          totalMaterias,
          porcentajeCarrera: `${Math.round((aprobadas.length / totalMaterias) * 100)}%`,
          promedioGeneral: promedio,
        },
        materiasAprobadas: aprobadas,
        materiasRegulares: regulares,
      };

      try {
        fs.writeFileSync(
          CREDS_FILE,
          JSON.stringify(
            {
              token: tabeToken,
              userId,
              estudiante: resultData.estudiante,
              updatedAt: new Date().toISOString(),
            },
            null,
            2
          ),
          "utf8"
        );
      } catch {}

      return resultData;
    } catch (sbErr) {
      return { ok: false, error: sbErr.message };
    }
  }

  // Para otras herramientas: intentar HTTP y fallback si aplica
  const url = `${cleanHost}/api/tabe-actions/${toolName}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tabe-Token": token,
      },
      body: JSON.stringify(toolArgs || {}),
      signal: AbortSignal.timeout(6000),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: false, error: `Error HTTP ${res.status}: ${text.slice(0, 150)}` };
    }

    return data;
  } catch (err) {
    // Si la llamada HTTP falló y es get_academic_context, servirlo desde Supabase o caché
    if (toolName === "get_academic_context" && activeAuthedSb) {
      try {
        const stored = fs.existsSync(CREDS_FILE) ? JSON.parse(fs.readFileSync(CREDS_FILE, "utf8")) : null;
        if (stored && stored.userId) {
          const { data: subjectStatuses } = await activeAuthedSb
            .from("user_subject_status")
            .select("id, estado, nota, nota_final_examen, fecha_aprobacion, subject_id, subjects(id, nombre, codigo, año)")
            .eq("user_id", stored.userId);

          const aprobadas = [];
          (subjectStatuses || []).forEach((st) => {
            const subName = st.subjects?.nombre || "Materia";
            const grade = st.nota_final_examen ?? st.nota;
            if (st.estado === "aprobada" || (typeof grade === "number" && grade >= 6)) {
              aprobadas.push({ materia: subName, nota: grade });
            }
          });
          return {
            ok: true,
            estudiante: stored.estudiante,
            materiasAprobadas: aprobadas,
          };
        }
      } catch {}
    }
    return { ok: false, error: err.message };
  }
}

// Función para llamar a la API de Gemini con Function Calling
async function callGemini(contents) {
  const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];
  let lastError = null;

  for (const model of models) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const bodyPayload = {
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents,
      tools: [{ functionDeclarations: TABE_TOOLS }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8192,
      },
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = new Error(`Gemini ${model} HTTP ${res.status}: ${errText}`);
        continue;
      }

      const json = await res.json();
      return json;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Error desconocido al llamar a Gemini.");
}

// Bucle interactivo
async function startInteractiveChat(studentData) {
  console.clear();
  console.log("\x1b[36m%s\x1b[0m", "╔═══════════════════════════════════════════════════════════════╗");
  console.log("\x1b[36m%s\x1b[0m", "║           TABE AI  x  GOOGLE GEMINI (MODO LOCAL)              ║");
  console.log("\x1b[36m%s\x1b[0m", "╚═══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`\x1b[32m✔ Servidor TABE:\x1b[0m   ${host}`);
  if (studentData?.estudiante?.nombre) {
    console.log(`\x1b[32m✔ Estudiante:\x1b[0m      ${studentData.estudiante.nombre} (${studentData.estudiante.email || "conectado"})`);
    const aprobadas = studentData.materiasAprobadas?.length || studentData.progreso?.materiasAprobadas || 0;
    const promedio = studentData.progreso?.promedioGeneral || studentData.promedio || 0;
    console.log(`\x1b[32m✔ Plan Académico:\x1b[0m  ${aprobadas} materias aprobadas | Promedio: ${promedio}`);
  }
  console.log(`\x1b[32m✔ Motor IA:\x1b[0m        Google Gemini (Function Calling activado)`);
  console.log(`\x1b[32m✔ Herramientas:\x1b[0m    10 acciones (Quizzes Moodle, Carga de Notas, etc.)`);
  console.log("");
  console.log("\x1b[90mEscribí lo que necesites o usá: /contexto, /deadlines, /limpiar, /salir\x1b[0m");
  console.log("-----------------------------------------------------------------");
  console.log("");

  const conversation = [];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptUser = () => {
    rl.question("\x1b[35mVos ❯ \x1b[0m", async (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        promptUser();
        return;
      }

      // Comandos rápidos
      if (trimmed === "/salir" || trimmed === "exit") {
        console.log("\n👋 ¡Hasta luego! Guardando sesión de TABE AI.");
        rl.close();
        process.exit(0);
      }

      if (trimmed === "/limpiar") {
        conversation.length = 0;
        console.log("\n🧹 Historial de conversación reiniciado.\n");
        promptUser();
        return;
      }

      if (trimmed === "/contexto") {
        process.stdout.write("\x1b[33m⏳ Consultando contexto académico en TABE...\x1b[0m\r");
        const ctx = await executeTabeAction("get_academic_context", {});
        console.log("\x1b[2K\x1b[32m📊 Contexto Académico:\x1b[0m");
        console.log(JSON.stringify(ctx, null, 2));
        console.log("");
        promptUser();
        return;
      }

      if (trimmed === "/deadlines") {
        process.stdout.write("\x1b[33m⏳ Consultando Campus Virtual...\x1b[0m\r");
        const d = await executeTabeAction("get_campus_deadlines", {});
        console.log("\x1b[2K\x1b[32m📅 Próximas Entregas y Quizzes:\x1b[0m");
        console.log(JSON.stringify(d, null, 2));
        console.log("");
        promptUser();
        return;
      }

      // Agregar mensaje del usuario a la conversación
      conversation.push({
        role: "user",
        parts: [{ text: trimmed }],
      });

      process.stdout.write("\x1b[33m⚡ Gemini pensando...\x1b[0m\r");

      try {
        let maxToolLoops = 5;
        let finalResponseText = "";

        while (maxToolLoops > 0) {
          maxToolLoops--;
          const geminiResult = await callGemini(conversation);
          const candidate = geminiResult.candidates?.[0];
          const parts = candidate?.content?.parts || [];

          // Guardar respuesta del modelo en historial
          conversation.push(candidate.content);

          // Verificar si Gemini quiere ejecutar una o varias herramientas
          const functionCalls = parts.filter((p) => p.functionCall);

          if (functionCalls.length > 0) {
            const functionResponseParts = [];

            for (const callPart of functionCalls) {
              const call = callPart.functionCall;
              process.stdout.write(
                `\x1b[2K\x1b[34m⚙️  [TABE Acción] ${call.name}...\x1b[0m\n`
              );

              // Ejecutar la tool en TABE
              const toolResult = await executeTabeAction(call.name, call.args || {});

              functionResponseParts.push({
                functionResponse: {
                  name: call.name,
                  response: { output: toolResult },
                },
              });
            }

            // Inyectar el resultado de la función en la conversación
            conversation.push({
              role: "user",
              parts: functionResponseParts,
            });

            process.stdout.write("\x1b[33m⚡ Gemini analizando resultado...\x1b[0m\r");
          } else {
            // No hay llamadas a herramientas, respuesta final obtenida
            finalResponseText = parts.map((p) => p.text || "").join("").trim();
            break;
          }
        }

        process.stdout.write("\x1b[2K"); // Limpiar línea de espera
        console.log("\x1b[36mTABE AI (Gemini) ❯\x1b[0m");
        console.log(finalResponseText || "Listo.");
        console.log("");
      } catch (err) {
        process.stdout.write("\x1b[2K");
        console.error("\x1b[31m❌ Error:\x1b[0m", err.message);
        console.log("");
      }

      promptUser();
    });
  };

  promptUser();
}

// Configuración inicial interactiva si faltan claves
async function setupAndStart() {
  await resolveHost();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (q) => new Promise((resolve) => rl.question(q, resolve));

  // 1. Verificar GEMINI_API_KEY
  if (!geminiKey) {
    console.log("\x1b[33m%s\x1b[0m", "\n🔑 Configuración inicial de Google Gemini:");
    console.log("No encontramos tu GEMINI_API_KEY.");
    console.log("Podés obtener una clave 100% gratuita en: https://aistudio.google.com/app/apikey\n");
    const k = await question("Pegá tu Gemini API Key: ");
    if (k.trim()) {
      geminiKey = k.trim();
      try {
        fs.writeFileSync(KEY_FILE, geminiKey, "utf8");
        console.log("✔ Clave guardada en .gemini_key para futuras sesiones.\n");
      } catch {}
    } else {
      console.log("❌ Se requiere una API Key de Gemini para continuar.");
      rl.close();
      process.exit(1);
    }
  }

  // 2. Verificar Autenticación en TABE por Usuario y Contraseña
  let studentData = null;

  // Probar sesión existente si hay token guardado
  if (token) {
    try {
      const test = await executeTabeAction("get_academic_context", {});
      if (test && test.ok) {
        studentData = test;
      }
    } catch {}
  }

  // Si no está autenticado o la sesión expiró, pedir Usuario y Contraseña
  while (!studentData) {
    console.log("\x1b[36m%s\x1b[0m", "\n🔐 Iniciar Sesión en TABE para conectar con Google Gemini:");
    console.log("Ingresá tu usuario y contraseña de TABE para dar acceso a tus notas y materias.\n");
    const u = await question("Usuario o Email de TABE: ");
    const p = await question("Contraseña de TABE: ");

    if (!u.trim() || !p.trim()) {
      console.log("❌ Usuario y contraseña son obligatorios.");
      continue;
    }

    process.stdout.write("\x1b[33m⏳ Autenticando en TABE...\x1b[0m\r");
    const res = await executeTabeAction("login", { username: u.trim(), password: p.trim() });
    process.stdout.write("\x1b[2K");

    if (res && res.ok) {
      console.log("\x1b[32m✔ ¡Inicio de sesión exitoso!\x1b[0m");
      studentData = res;
    } else {
      console.log(`\x1b[31m❌ Error de inicio de sesión:\x1b[0m ${res?.error || "Credenciales inválidas"}`);
      const retry = await question("¿Querés reintentar? (s/n): ");
      if (retry.toLowerCase().trim() === "n") {
        rl.close();
        process.exit(1);
      }
    }
  }

  rl.close();
  startInteractiveChat(studentData);
}

setupAndStart();
