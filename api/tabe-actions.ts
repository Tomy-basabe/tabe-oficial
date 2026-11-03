import type { IncomingMessage, ServerResponse } from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { decodeUserToken } from "../src/lib/tabeTokenService";
import { resolveCampusQuiz, resolveDocenteEncuestas, fetchCampusData } from "./utnfrm-mcp";

// Inicializar cliente de Supabase para consultas administrativas de backend
function getSupabaseBackend() {
  let supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  let supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf8");
        const u = envContent.match(/VITE_SUPABASE_URL=(.*)/);
        const k = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.*)/);
        if (u) supabaseUrl = u[1].replace(/^["']|["']$/g, "").trim();
        if (k) supabaseKey = k[1].replace(/^["']|["']$/g, "").trim();
      }
    } catch {}
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Helper para parsear JSON body
function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function sendJson(res: ServerResponse, status: number, payload: any) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tabe-Token");
  res.end(JSON.stringify(payload, null, 2));
}

// Almacén seguro local en disco para credenciales asociadas al token
function getLocalCredsForUser(userId: string): { username?: string; password?: string; legajo?: string } | null {
  try {
    const credsPath = path.resolve(process.cwd(), ".tabe_user_creds.json");
    if (fs.existsSync(credsPath)) {
      const data = JSON.parse(fs.readFileSync(credsPath, "utf8"));
      return data[userId] || null;
    }
  } catch {}
  return null;
}

export function saveLocalCredsForUser(userId: string, creds: { username: string; password: string; legajo?: string }) {
  try {
    const credsPath = path.resolve(process.cwd(), ".tabe_user_creds.json");
    let data: Record<string, any> = {};
    if (fs.existsSync(credsPath)) {
      data = JSON.parse(fs.readFileSync(credsPath, "utf8"));
    }
    data[userId] = creds;
    fs.writeFileSync(credsPath, JSON.stringify(data, null, 2), "utf8");
  } catch {}
}

// ============================================================================
// 1. ESPECIFICACIÓN OPENAPI 3.0 (Para ChatGPT Custom Actions y Gemini)
// ============================================================================
export function getTabeOpenApiSchema(baseUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "TABE AI - Hub Universal Académico",
      description:
        "API oficial de TABE para consultar información académica, resolver cuestionarios del Campus Virtual UTN FRM, gestionar tareas, eventos y apuntes directamente desde Claude, ChatGPT y Gemini.",
      version: "1.0.0",
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        TabeTokenAuth: {
          type: "apiKey",
          in: "header",
          name: "X-Tabe-Token",
          description: "Tu código único personal de TABE (ej: tabe_usr_...). Obtenelo en TABE -> Configuración -> Integraciones -> Conectar con IAs.",
        },
      },
    },
    security: [{ TabeTokenAuth: [] }],
    paths: {
      "/academic-context": {
        get: {
          operationId: "get_academic_context",
          summary: "Obtener perfil y contexto académico del estudiante",
          description: "Retorna la carrera, materias aprobadas, cursando actualmente, promedio general y correlatividades habilitadas del estudiante.",
          responses: {
            "200": { description: "Contexto académico recuperado exitosamente." },
            "401": { description: "Código único de usuario inválido o ausente." },
          },
        },
      },
      "/campus-deadlines": {
        get: {
          operationId: "get_campus_deadlines",
          summary: "Consultar tareas y cuestionarios pendientes en el Campus Virtual",
          description: "Obtiene los próximos vencimientos, tareas y cuestionarios de Moodle en la UTN FRM.",
          responses: {
            "200": { description: "Lista de pendientes recuperada." },
          },
        },
      },
      "/resolve-quiz": {
        post: {
          operationId: "resolve_campus_quiz",
          summary: "Resolver y entregar un cuestionario interactivo de Moodle en el Campus Virtual",
          description: "Ingresa al Campus Virtual de UTN FRM, analiza cada pregunta con razonamiento conceptual y guarda o entrega el cuestionario oficialmente.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    quizUrl: { type: "string", description: "Enlace directo de Moodle del cuestionario (ej: https://campusvirtual.frm.utn.edu.ar/mod/quiz/view.php?id=...)" },
                    quizName: { type: "string", description: "Nombre del cuestionario a buscar si no se tiene el enlace directo" },
                    courseName: { type: "string", description: "Nombre de la materia (ej: Desarrollo de Software, Redes, etc.)" },
                    submitMode: { type: "string", enum: ["finish", "save"], default: "finish", description: "'finish' para entregar oficialmente y obtener la nota, o 'save' para guardar en borrador." },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Cuestionario resuelto exitosamente con detalle de preguntas, respuestas y nota." },
          },
        },
      },
      "/resolve-encuestas": {
        post: {
          operationId: "resolve_docente_encuestas",
          summary: "Responder encuestas docentes obligatorias en Sysacad / Campus",
          description: "Completa automáticamente todas las encuestas docentes pendientes del estudiante con valoración positiva de cátedra.",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    comentarioGeneral: { type: "string", description: "Comentario opcional a dejar en las encuestas." },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Encuestas docentes completadas." },
          },
        },
      },
      "/study-stats": {
        get: {
          operationId: "get_study_stats",
          summary: "Consultar estadísticas de estudio, racha y pomodoros",
          description: "Retorna el tiempo total estudiado, racha actual en días y desglose por materia del alumno.",
          responses: {
            "200": { description: "Estadísticas de estudio recuperadas." },
          },
        },
      },
      "/calendar-event": {
        post: {
          operationId: "create_calendar_event",
          summary: "Crear un evento o fecha de examen en el calendario académico de TABE",
          description: "Agrega un examen, parcial, entrega de TP o clase al calendario personal del estudiante.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "startTime"],
                  properties: {
                    title: { type: "string", description: "Título del evento (ej: Parcial 1 Desarrollo de Software)" },
                    startTime: { type: "string", description: "Fecha y hora de inicio en formato ISO o YYYY-MM-DD HH:mm" },
                    endTime: { type: "string", description: "Fecha y hora de fin opcional" },
                    category: { type: "string", enum: ["examen", "entrega", "clase", "estudio"], default: "examen" },
                    subject: { type: "string", description: "Materia asociada al evento" },
                    description: { type: "string", description: "Detalles adicionales" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Evento creado en el calendario de TABE." },
          },
        },
      },
      "/flashcards": {
        post: {
          operationId: "create_flashcards",
          summary: "Crear mazo y tarjetas de memoria (flashcards) para una materia",
          description: "Genera un nuevo mazo con tarjetas de repaso espaciado en la cuenta de TABE.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["deckName", "cards"],
                  properties: {
                    deckName: { type: "string", description: "Nombre del mazo de flashcards" },
                    subject: { type: "string", description: "Materia a la que pertenece" },
                    cards: {
                      type: "array",
                      description: "Lista de tarjetas con pregunta y respuesta",
                      items: {
                        type: "object",
                        required: ["front", "back"],
                        properties: {
                          front: { type: "string", description: "Anverso (pregunta o concepto)" },
                          back: { type: "string", description: "Reverso (respuesta o explicación)" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Mazo de flashcards creado con éxito." },
          },
        },
      },
      "/student-notes": {
        get: {
          operationId: "query_student_notes",
          summary: "Consultar apuntes y notas del estudiante en TABE",
          description: "Busca en la biblioteca de apuntes de Notion de TABE por término clave o materia.",
          parameters: [
            {
              name: "query",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Palabra clave o tema a buscar en los apuntes",
            },
            {
              name: "subject",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Filtrar por materia específica",
            },
          ],
          responses: {
            "200": { description: "Apuntes encontrados." },
          },
        },
      },
    },
  };
}

// ============================================================================
// 2. DECLARACIÓN NATIVA DE HERRAMIENTAS PARA GEMINI SDK
// ============================================================================
export function getTabeGeminiTools() {
  return [
    {
      name: "get_academic_context",
      description: "Obtener el contexto académico del estudiante en TABE (carrera, materias aprobadas, cursando, promedio, correlatividades habilitadas).",
      parameters: { type: "OBJECT", properties: {} },
    },
    {
      name: "get_campus_deadlines",
      description: "Consultar las próximas tareas, fechas límites y cuestionarios pendientes en el Campus Virtual UTN FRM.",
      parameters: { type: "OBJECT", properties: {} },
    },
    {
      name: "resolve_campus_quiz",
      description: "Resolver automáticamente un cuestionario interactivo de Moodle en el Campus Virtual UTN FRM, analizando las preguntas con rigor conceptual y entregándolo.",
      parameters: {
        type: "OBJECT",
        properties: {
          quizUrl: { type: "STRING", description: "URL directa del cuestionario en Moodle" },
          quizName: { type: "STRING", description: "Nombre del cuestionario a buscar" },
          courseName: { type: "STRING", description: "Nombre de la materia" },
          submitMode: { type: "STRING", description: "'finish' para enviar y calificar, o 'save' para borrador" },
        },
      },
    },
    {
      name: "resolve_docente_encuestas",
      description: "Completar automáticamente las encuestas docentes pendientes en Sysacad / Campus de UTN FRM.",
      parameters: {
        type: "OBJECT",
        properties: {
          comentarioGeneral: { type: "STRING", description: "Comentario opcional a dejar en las encuestas" },
        },
      },
    },
    {
      name: "get_study_stats",
      description: "Consultar las estadísticas de estudio del estudiante en TABE: tiempo total, racha y distribución por materia.",
      parameters: { type: "OBJECT", properties: {} },
    },
    {
      name: "create_calendar_event",
      description: "Crear un evento o examen en el calendario académico del alumno en TABE.",
      parameters: {
        type: "OBJECT",
        required: ["title", "startTime"],
        properties: {
          title: { type: "STRING", description: "Título del evento" },
          startTime: { type: "STRING", description: "Fecha y hora de inicio" },
          category: { type: "STRING", description: "examen, entrega, clase o estudio" },
          subject: { type: "STRING", description: "Materia asociada" },
        },
      },
    },
    {
      name: "create_flashcards",
      description: "Crear un mazo de tarjetas de memoria (flashcards) para una materia en TABE.",
      parameters: {
        type: "OBJECT",
        required: ["deckName", "cards"],
        properties: {
          deckName: { type: "STRING", description: "Nombre del mazo" },
          subject: { type: "STRING", description: "Materia" },
          cards: { type: "ARRAY", description: "Lista de tarjetas con front y back" },
        },
      },
    },
    {
      name: "query_student_notes",
      description: "Buscar y leer los apuntes y notas tomadas por el estudiante en TABE.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: { type: "STRING", description: "Término de búsqueda" },
          subject: { type: "STRING", description: "Materia a filtrar" },
        },
      },
    },
  ];
}

// ============================================================================
// 3. ROUTER Y EJECUTOR DE ACCIONES
// ============================================================================
export default async function tabeActionsHandler(req: IncomingMessage, res: ServerResponse) {
  const urlObj = new URL(req.url || "/", "http://localhost:8080");
  const pathname = urlObj.pathname.replace(/^\/api\/tabe-actions/, "");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tabe-Token");
    res.end();
    return;
  }

  // 1. Servir esquema OpenAPI para ChatGPT
  if (pathname === "/openapi.json" || pathname === "/openapi.yaml") {
    const baseUrl = `${urlObj.protocol}//${urlObj.host}/api/tabe-actions`;
    return sendJson(res, 200, getTabeOpenApiSchema(baseUrl));
  }

  // 2. Servir herramientas para Gemini
  if (pathname === "/gemini-tools.json") {
    return sendJson(res, 200, { functionDeclarations: getTabeGeminiTools() });
  }

  // 3. Autenticación por Código Único de Usuario
  const rawToken =
    req.headers["x-tabe-token"] ||
    req.headers["authorization"] ||
    urlObj.searchParams.get("token") ||
    urlObj.searchParams.get("api_key");

  const tokenStr = Array.isArray(rawToken) ? rawToken[0] : rawToken || "";
  const userId = decodeUserToken(tokenStr);

  // Endpoint para sincronizar credenciales locales desde la UI de TABE
  if (pathname === "/sync-credentials" && req.method === "POST") {
    const body = await parseJsonBody(req);
    if (!userId) {
      return sendJson(res, 401, { ok: false, error: "Token de usuario inválido." });
    }
    if (body.username && body.password) {
      saveLocalCredsForUser(userId, {
        username: body.username,
        password: body.password,
        legajo: body.legajo,
      });
      return sendJson(res, 200, { ok: true, message: "Credenciales de Campus/Sysacad sincronizadas con tu código de IA." });
    }
    return sendJson(res, 400, { ok: false, error: "Faltan credenciales." });
  }

  if (!userId) {
    return sendJson(res, 401, {
      ok: false,
      error:
        "Código de usuario de TABE no válido o ausente. Ingresá tu código personal (ej: tabe_usr_...) en el header X-Tabe-Token o en los parámetros.",
      instruction: "Obtené tu código único en TABE: Configuración -> Integraciones -> Conectar con IAs.",
    });
  }

  const supabase = getSupabaseBackend();
  const creds = getLocalCredsForUser(userId);

  try {
    // ── ACCIÓN: get_academic_context ──────────────────────────────────────────
    if (pathname === "/academic-context" || pathname === "/get_academic_context") {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      const { data: recentEvents } = await supabase.from("calendar_events").select("*").eq("user_id", userId).limit(5);

      return sendJson(res, 200, {
        ok: true,
        userId,
        estudiante: {
          nombre: profile?.nombre || "Estudiante",
          carrera: profile?.carrera || "Ingeniería en Sistemas de Información",
          facultad: profile?.facultad || "UTN FRM (Facultad Regional Mendoza)",
          email: profile?.email,
          plan: profile?.plan || "K08/K23",
          sysacadConnected: Boolean(creds?.username),
        },
        proximosExamenes: (recentEvents || []).map((e) => ({
          titulo: e.title,
          fecha: e.start_time,
          tipo: e.category,
        })),
        mensaje: `Contexto académico de ${profile?.nombre || "Estudiante"} cargado con éxito.`,
      });
    }

    // ── ACCIÓN: get_campus_deadlines ──────────────────────────────────────────
    if (pathname === "/campus-deadlines" || pathname === "/get_campus_deadlines") {
      if (!creds?.username || !creds?.password) {
        return sendJson(res, 200, {
          ok: false,
          warning: "No tenés conectadas tus credenciales del Campus Virtual en TABE.",
          instruction: "Conectá tu usuario y clave en TABE -> Configuración -> Integraciones -> MCP UTN FRM.",
        });
      }

      const campusData = await fetchCampusData(creds.username, creds.password);
      return sendJson(res, 200, {
        ok: true,
        totalPendientes: campusData.deadlines.length,
        deadlines: campusData.deadlines,
        eventosCalendario: campusData.calendarEvents,
      });
    }

    // ── ACCIÓN: resolve_campus_quiz ───────────────────────────────────────────
    if (pathname === "/resolve-quiz" || pathname === "/resolve_campus_quiz") {
      const body = await parseJsonBody(req);
      if (!creds?.username || !creds?.password) {
        return sendJson(res, 400, {
          ok: false,
          error: "Para resolver cuestionarios en el Campus Virtual, conectá tu usuario (DNI) y clave en TABE.",
        });
      }

      const quizUrl = body.quizUrl ? String(body.quizUrl).trim() : undefined;
      const quizName = body.quizName ? String(body.quizName).trim() : undefined;
      const courseName = body.courseName ? String(body.courseName).trim() : undefined;
      const submitMode = body.submitMode === "save" ? "save" : "finish";

      const result = await resolveCampusQuiz(creds.username, creds.password, {
        quizUrl,
        quizName,
        courseName,
        submitMode,
      });

      return sendJson(res, 200, result);
    }

    // ── ACCIÓN: resolve_docente_encuestas ─────────────────────────────────────
    if (pathname === "/resolve-encuestas" || pathname === "/resolve_docente_encuestas") {
      const body = await parseJsonBody(req);
      if (!creds?.username || !creds?.password) {
        return sendJson(res, 400, {
          ok: false,
          error: "Se requieren credenciales de UTN FRM configuradas en TABE.",
        });
      }

      const result = await resolveDocenteEncuestas(creds.username, creds.password, {
        legajo: creds.legajo,
        comentarioGeneral: body.comentarioGeneral,
      });

      return sendJson(res, 200, result);
    }

    // ── ACCIÓN: get_study_stats ───────────────────────────────────────────────
    if (pathname === "/study-stats" || pathname === "/get_study_stats") {
      const { data: sessions } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      const totalMinutes = (sessions || []).reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
      const hours = (totalMinutes / 60).toFixed(1);

      return sendJson(res, 200, {
        ok: true,
        horasTotalesEstudiadas: Number(hours),
        minutosTotales: totalMinutes,
        totalSesiones: (sessions || []).length,
        sesionesRecientes: (sessions || []).slice(0, 5),
      });
    }

    // ── ACCIÓN: create_calendar_event ─────────────────────────────────────────
    if (pathname === "/calendar-event" || pathname === "/create_calendar_event") {
      const body = await parseJsonBody(req);
      if (!body.title || !body.startTime) {
        return sendJson(res, 400, { ok: false, error: "title y startTime son obligatorios." });
      }

      const { data, error } = await supabase.from("calendar_events").insert({
        user_id: userId,
        title: body.title,
        start_time: body.startTime,
        end_time: body.endTime || body.startTime,
        category: body.category || "examen",
        description: body.description || body.subject || "",
      }).select().single();

      if (error) {
        return sendJson(res, 500, { ok: false, error: error.message });
      }

      return sendJson(res, 200, {
        ok: true,
        message: `Evento "${body.title}" agregado exitosamente al calendario de TABE.`,
        event: data,
      });
    }

    // ── ACCIÓN: create_flashcards ─────────────────────────────────────────────
    if (pathname === "/flashcards" || pathname === "/create_flashcards") {
      const body = await parseJsonBody(req);
      if (!body.deckName || !Array.isArray(body.cards)) {
        return sendJson(res, 400, { ok: false, error: "deckName y cards (array) son obligatorios." });
      }

      const { data: deck, error: deckErr } = await supabase.from("flashcard_decks").insert({
        user_id: userId,
        nombre: body.deckName,
        materia: body.subject || "General",
        descripcion: `Creado automáticamente mediante TABE AI Hub`,
      }).select().single();

      if (deckErr || !deck) {
        return sendJson(res, 500, { ok: false, error: deckErr?.message || "Error al crear mazo" });
      }

      const cardsToInsert = body.cards.map((c: any) => ({
        deck_id: deck.id,
        user_id: userId,
        anverso: c.front,
        reverso: c.back,
      }));

      await supabase.from("flashcards").insert(cardsToInsert);

      return sendJson(res, 200, {
        ok: true,
        message: `Mazo "${body.deckName}" creado con éxito con ${cardsToInsert.length} tarjetas.`,
        deckId: deck.id,
      });
    }

    // ── ACCIÓN: query_student_notes ───────────────────────────────────────────
    if (pathname === "/student-notes" || pathname === "/query_student_notes") {
      const query = urlObj.searchParams.get("query") || "";
      const subject = urlObj.searchParams.get("subject") || "";

      let dbQuery = supabase.from("notion_documents").select("id, title, content, updated_at").eq("user_id", userId);
      if (query) {
        dbQuery = dbQuery.ilike("title", `%${query}%`);
      }

      const { data: notes, error } = await dbQuery.limit(10);
      if (error) {
        return sendJson(res, 500, { ok: false, error: error.message });
      }

      return sendJson(res, 200, {
        ok: true,
        totalEncontradas: (notes || []).length,
        apuntes: notes || [],
      });
    }

    // Ruta desconocida
    return sendJson(res, 404, {
      ok: false,
      error: `Ruta "${pathname}" no encontrada en TABE Universal Hub. Consultá /api/tabe-actions/openapi.json para ver la lista de endpoints disponibles.`,
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      ok: false,
      error: err?.message || "Error interno al ejecutar acción en TABE.",
    });
  }
}
