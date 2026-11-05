import type { IncomingMessage, ServerResponse } from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { decodeUserToken } from "../src/lib/tabeTokenService";
import { resolveCampusQuiz, resolveDocenteEncuestas, fetchCampusData } from "./utnfrm-mcp";

// Inicializar cliente de Supabase para consultas administrativas de backend
function getSupabaseBackend() {
  let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  let supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !supabaseKey) {
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf8");
        const u = envContent.match(/VITE_SUPABASE_URL=(.*)/);
        const k = envContent.match(/(?:SUPABASE_SERVICE_ROLE_KEY|VITE_SUPABASE_PUBLISHABLE_KEY)=(.*)/);
        if (u) supabaseUrl = u[1].replace(/^["']|["']$/g, "").trim();
        if (k) supabaseKey = k[1].replace(/^["']|["']$/g, "").trim();
      }
    } catch {}
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Helper para parsear JSON body de forma universal (Vite, Express, Vercel Serverless)
async function parseJsonBody(req: IncomingMessage): Promise<any> {
  try {
    const anyReq = req as any;
    if (anyReq.body && typeof anyReq.body === "object" && !Buffer.isBuffer(anyReq.body)) {
      return anyReq.body;
    }
    if (typeof anyReq.body === "string" && anyReq.body.trim()) {
      return JSON.parse(anyReq.body);
    }
    if (Buffer.isBuffer(anyReq.body)) {
      const raw = anyReq.body.toString("utf-8").trim();
      return raw ? JSON.parse(raw) : {};
    }
    if (req.readableEnded) {
      return {};
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf-8").trim();
    if (raw) return JSON.parse(raw);
    return {};
  } catch {
    return {};
  }
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

// Almacén seguro local para contexto académico persistente accesible por IAs externas
function getLocalContextForUser(userId: string): any {
  try {
    const ctxPath = path.resolve(process.cwd(), ".tabe_student_context.json");
    if (fs.existsSync(ctxPath)) {
      const data = JSON.parse(fs.readFileSync(ctxPath, "utf8"));
      return data[userId] || null;
    }
  } catch {}
  return null;
}

export function saveLocalContextForUser(userId: string, ctx: any) {
  try {
    const ctxPath = path.resolve(process.cwd(), ".tabe_student_context.json");
    let data: Record<string, any> = {};
    if (fs.existsSync(ctxPath)) {
      data = JSON.parse(fs.readFileSync(ctxPath, "utf8"));
    }
    data[userId] = {
      ...(data[userId] || {}),
      ...ctx,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(ctxPath, JSON.stringify(data, null, 2), "utf8");
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
      "/login": {
        post: {
          operationId: "login",
          summary: "Iniciar sesión en TABE con usuario y contraseña",
          description: "Autentica al estudiante con su email/usuario y contraseña para habilitar acceso completo a sus notas, materias, calendario y campus.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["username", "password"],
                  properties: {
                    username: { type: "string", description: "Email o usuario registrado en TABE" },
                    password: { type: "string", description: "Contraseña de la cuenta de TABE" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Inicio de sesión exitoso con token y notas del estudiante." },
            "401": { description: "Credenciales inválidas." },
          },
        },
      },
      "/academic-context": {
        get: {
          operationId: "get_academic_context",
          summary: "Obtener perfil y contexto académico del estudiante",
          description: "Retorna la carrera, materias aprobadas con sus notas finales, materias regulares, promedio general y correlatividades del estudiante en TABE.",
          responses: {
            "200": { description: "Contexto académico recuperado exitosamente." },
            "401": { description: "Código único de usuario inválido o ausente." },
          },
        },
      },
      "/manage-subjects": {
        post: {
          operationId: "manage_subjects",
          summary: "Cargar o actualizar materias y notas aprobadas en TABE",
          description: "Registra masiva o individualmente materias con sus notas y estados en el plan de carrera del alumno.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    text: { type: "string", description: "Texto libre con materias y notas (ej: 'Bases de Datos: 9\\nFísica I: 8')" },
                    subjects: {
                      type: "array",
                      description: "Lista de materias a actualizar",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          grade: { type: "number" },
                          estado: { type: "string", enum: ["aprobada", "regular"] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Materias y notas registradas con éxito." },
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
      "/save-note": {
        post: {
          operationId: "save_quick_note",
          summary: "Guardar un apunte rápido en Notion de TABE",
          description: "Crea una nueva página de apunte o notas de clase en la cuenta del estudiante.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title"],
                  properties: {
                    title: { type: "string", description: "Título del apunte" },
                    content: { type: "string", description: "Contenido del apunte" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Apunte guardado exitosamente." },
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
      name: "login",
      description: "Iniciar sesión en TABE con usuario (email o legajo) y contraseña para conectar tu cuenta y acceder a tus notas, materias y campus virtual.",
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
      description: "Obtener el contexto académico completo del estudiante en TABE (carrera, materias aprobadas con sus notas finales, materias regulares, cursando, promedio general y porcentaje de avance).",
      parameters: { type: "OBJECT", properties: {} },
    },
    {
      name: "manage_subjects",
      description: "Cargar o actualizar materias con sus notas y estados (aprobada con nota, regular) en el plan de carrera de TABE. Permite enviar un texto libre con pares 'Materia: Nota' o un array estructurado.",
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
                grade: { type: "NUMBER", description: "Calificación numérica de 1 a 10" },
                estado: { type: "STRING", description: "'aprobada' o 'regular'" },
              },
            },
          },
        },
      },
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
    {
      name: "save_quick_note",
      description: "Guardar un nuevo apunte o resumen en el editor de notas/Notion de TABE.",
      parameters: {
        type: "OBJECT",
        required: ["title"],
        properties: {
          title: { type: "STRING", description: "Título del documento" },
          content: { type: "STRING", description: "Contenido del apunte" },
        },
      },
    },
  ];
}

// ============================================================================
// 3. CATÁLOGO NATIVO DE TOOLS PARA SERVIDOR MCP REMOTO (JSON-RPC 2.0)
// ============================================================================
export function getTabeMcpToolsList() {
  return [
    {
      name: "login",
      description: "Inicia sesión en TABE con usuario (email o legajo) y contraseña para conectar tu cuenta y acceder a tus notas, materias y campus virtual.",
      inputSchema: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string", description: "Email o usuario de TABE" },
          password: { type: "string", description: "Contraseña de tu cuenta de TABE" },
        },
      },
    },
    {
      name: "get_academic_context",
      description: "Obtener el contexto académico completo del estudiante en TABE (carrera, materias aprobadas con sus notas finales, materias regulares, cursando, promedio general y porcentaje de avance).",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "manage_subjects",
      description: "Cargar o actualizar materias con sus notas y estados en el plan de carrera de TABE. Permite enviar pares de 'Materia: Nota' o lista de asignaturas.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Texto con materias y notas (ej: 'Bases de Datos: 9\\nFísica I: 8')" },
          subjects: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "grade"],
              properties: {
                name: { type: "string" },
                grade: { type: "number" },
                estado: { type: "string" },
              },
            },
          },
        },
      },
    },
    {
      name: "get_campus_deadlines",
      description: "Consultar las próximas tareas, fechas límites y cuestionarios pendientes en el Campus Virtual UTN FRM.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "resolve_campus_quiz",
      description: "Resolver automáticamente un cuestionario interactivo de Moodle en el Campus Virtual UTN FRM, analizando las preguntas con rigor conceptual y entregándolo.",
      inputSchema: {
        type: "object",
        properties: {
          quizUrl: { type: "string", description: "URL directa del cuestionario en Moodle" },
          quizName: { type: "string", description: "Nombre del cuestionario a buscar" },
          courseName: { type: "string", description: "Nombre de la materia" },
          submitMode: { type: "string", description: "'finish' para enviar y calificar, o 'save' para borrador" },
        },
      },
    },
    {
      name: "resolve_docente_encuestas",
      description: "Completar automáticamente las encuestas docentes pendientes en Sysacad / Campus de UTN FRM.",
      inputSchema: {
        type: "object",
        properties: {
          comentarioGeneral: { type: "string", description: "Comentario opcional a dejar en las encuestas" },
        },
      },
    },
    {
      name: "get_study_stats",
      description: "Consultar las estadísticas de estudio del estudiante en TABE: tiempo total, racha y distribución por materia.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "create_calendar_event",
      description: "Crear un evento o examen en el calendario académico del alumno en TABE.",
      inputSchema: {
        type: "object",
        required: ["title", "startTime"],
        properties: {
          title: { type: "string", description: "Título del evento" },
          startTime: { type: "string", description: "Fecha y hora de inicio" },
          category: { type: "string", description: "examen, entrega, clase o estudio" },
          subject: { type: "string", description: "Materia asociada" },
        },
      },
    },
    {
      name: "create_flashcards",
      description: "Crear un mazo de tarjetas de memoria (flashcards) para una materia en TABE.",
      inputSchema: {
        type: "object",
        required: ["deckName", "cards"],
        properties: {
          deckName: { type: "string", description: "Nombre del mazo" },
          subject: { type: "string", description: "Materia relacionada" },
          cards: {
            type: "array",
            items: {
              type: "object",
              required: ["front", "back"],
              properties: {
                front: { type: "string" },
                back: { type: "string" },
              },
            },
          },
        },
      },
    },
    {
      name: "query_student_notes",
      description: "Buscar apuntes o resúmenes tomados en TABE Notion.",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "Texto de búsqueda" },
          subject: { type: "string", description: "Materia a filtrar" },
        },
      },
    },
    {
      name: "save_quick_note",
      description: "Guardar un apunte o apunte rápido en TABE Notion.",
      inputSchema: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", description: "Título del documento" },
          content: { type: "string", description: "Contenido del apunte" },
        },
      },
    },
  ];
}

// ============================================================================
// 4. ROUTER Y EJECUTOR DE ACCIONES
// ============================================================================
export default async function tabeActionsHandler(req: IncomingMessage, res: ServerResponse) {
  const forwardedProto = (req.headers["x-forwarded-proto"] as string) || "";
  const hostHeader = (req.headers["x-forwarded-host"] as string) || req.headers.host || "www.tabe.com.ar";
  const protocol = forwardedProto || (hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1") ? "http" : "https");
  const urlObj = new URL(req.url || "/", `${protocol}://${hostHeader}`);
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

  // 3. Servidor MCP Remoto JSON-RPC 2.0 (Para Claude Desktop, Cursor, Gemini con Remote MCP)
  if ((pathname === "/mcp" || pathname === "/mcp/") && req.method === "POST") {
    const body = await parseJsonBody(req);
    const id = body.id ?? 1;
    const method = body.method;

    if (method === "initialize") {
      return sendJson(res, 200, {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: {
            name: "tabe-remote-mcp",
            version: "1.0.0",
            description: "Servidor MCP de TABE en producción para Claude, Gemini y agentes IA",
          },
        },
      });
    }

    if (method === "ping") {
      return sendJson(res, 200, { jsonrpc: "2.0", id, result: {} });
    }

    if (method === "tools/list") {
      return sendJson(res, 200, {
        jsonrpc: "2.0",
        id,
        result: { tools: getTabeMcpToolsList() },
      });
    }

    if (method === "tools/call") {
      const toolName = body.params?.name;
      const toolArgs = body.params?.arguments || {};

      // Si llama a login
      if (toolName === "login") {
        const username = (toolArgs.username || toolArgs.email || "").trim();
        const password = (toolArgs.password || "").trim();
        const supabase = getSupabaseBackend();
        const authRes = await supabase.auth.signInWithPassword({ email: username, password });
        if (authRes.error || !authRes.data?.user) {
          return sendJson(res, 200, {
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: `Error de inicio de sesión: ${authRes.error?.message || "Credenciales inválidas"}` }],
              isError: true,
            },
          });
        }
        const token = encodeUserToken(authRes.data.user.id);
        return sendJson(res, 200, {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    ok: true,
                    token,
                    userId: authRes.data.user.id,
                    email: authRes.data.user.email,
                    mensaje: "Autenticación exitosa en TABE. La IA ahora tiene acceso a todas tus materias y notas.",
                  },
                  null,
                  2
                ),
              },
            ],
          },
        });
      }
    }
  }

  // 3.5. Subida de imágenes a Supabase Storage (bypasea CORS y Service Workers del navegador)
  if (pathname === "/upload-image" && req.method === "POST") {
    try {
      const body = await parseJsonBody(req);
      const { base64Data, mimeType = "image/png", userId = "anonymous" } = body;

      if (!base64Data) {
        return sendJson(res, 400, { ok: false, error: "Falta el campo 'base64Data'" });
      }

      const cleanBase64 = String(base64Data).replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
      const buffer = Buffer.from(cleanBase64, "base64");

      const ext = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : mimeType === "image/gif" ? "gif" : "png";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const filePath = `${userId}/${fileName}`;

      const supabase = getSupabaseBackend();

      let uploadRes = await supabase.storage
        .from("notion-images")
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: false,
        });

      let bucketUsed = "notion-images";
      let finalPath = filePath;

      if (uploadRes.error) {
        console.warn("[upload-image] Intento en notion-images falló, usando library-files:", uploadRes.error);
        const fallbackPath = `apuntes-imagenes/${filePath}`;
        const fallbackRes = await supabase.storage
          .from("library-files")
          .upload(fallbackPath, buffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (!fallbackRes.error) {
          bucketUsed = "library-files";
          finalPath = fallbackPath;
        } else {
          return sendJson(res, 500, {
            ok: false,
            error: uploadRes.error.message || fallbackRes.error.message || "Error al subir a Supabase Storage",
          });
        }
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketUsed)
        .getPublicUrl(finalPath);

      return sendJson(res, 200, {
        ok: true,
        publicUrl,
        bucket: bucketUsed,
        path: finalPath,
      });
    } catch (err: any) {
      console.error("[upload-image error]:", err);
      return sendJson(res, 500, { ok: false, error: err?.message || "Error interno del servidor" });
    }
  }

  // 4. Inicio de sesión directo con Usuario y Contraseña (para MCP de Gemini, Claude y ChatGPT Actions)
  if (pathname === "/login" && req.method === "POST") {
    const body = await parseJsonBody(req);
    const username = (body.username || body.email || "").trim();
    const password = (body.password || "").trim();

    if (!username || !password) {
      return sendJson(res, 400, {
        ok: false,
        error: "Se requiere 'username' (o email) y 'password' para autenticar en TABE.",
      });
    }

    const supabase = getSupabaseBackend();

    // Intentar autenticar con Supabase Auth
    let authRes = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (authRes.error && !username.includes("@")) {
      const utnEmail = `${username}@fr.utn.edu.ar`;
      const retryRes = await supabase.auth.signInWithPassword({
        email: utnEmail,
        password: password,
      });
      if (!retryRes.error) {
        authRes = retryRes;
      }
    }

    if (authRes.error || !authRes.data?.user) {
      return sendJson(res, 401, {
        ok: false,
        error: `Error de inicio de sesión en TABE: ${authRes.error?.message || "Credenciales inválidas"}`,
      });
    }

    const authUser = authRes.data.user;
    const authSession = authRes.data.session;
    const resolvedUserId = authUser.id;
    const tabeToken = encodeUserToken(resolvedUserId);

    // Guardar credenciales para sincronización
    saveLocalCredsForUser(resolvedUserId, {
      username: username,
      password: password,
      legajo: body.legajo,
    });

    // Cliente autenticado con bearer token para saltar RLS
    let authedSupabase = supabase;
    if (authSession?.access_token) {
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
      if (supabaseUrl && supabaseKey) {
        authedSupabase = createClient(supabaseUrl, supabaseKey, {
          global: {
            headers: {
              Authorization: `Bearer ${authSession.access_token}`,
            },
          },
        });
      }
    }

    // Traer perfil del estudiante
    const { data: profile } = await authedSupabase
      .from("profiles")
      .select("*")
      .eq("id", resolvedUserId)
      .maybeSingle();

    // Traer materias registradas en su plan
    const { data: subjectStatuses } = await authedSupabase
      .from("user_subject_status")
      .select("id, estado, nota, nota_final_examen, fecha_aprobacion, subject_id, subjects(id, nombre, codigo, año)")
      .eq("user_id", resolvedUserId);

    const aprobadas: any[] = [];
    const regulares: any[] = [];
    let sumaNotas = 0;
    let cantNotas = 0;

    (subjectStatuses || []).forEach((st: any) => {
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

    // Guardar contexto local sincronizado
    let localCtx = getLocalContextForUser(resolvedUserId);
    if (!localCtx || (aprobadas.length >= (localCtx.materiasAprobadas?.length || 0))) {
      localCtx = {
        estudiante: {
          id: resolvedUserId,
          email: authUser.email,
          nombre: profile?.nombre || authUser.user_metadata?.nombre || "Estudiante",
          carrera: profile?.carrera || "Ingeniería en Sistemas de Información",
          facultad: "UTN FRM (Facultad Regional Mendoza)",
        },
        progreso: {
          materiasAprobadas: aprobadas.length,
          totalMaterias: 37,
          porcentajeCarrera: `${Math.round((aprobadas.length / 37) * 100)}%`,
          promedioGeneral: promedio,
        },
        materiasAprobadas: aprobadas,
        materiasRegulares: regulares,
      };
      saveLocalContextForUser(resolvedUserId, localCtx);
    }

    return sendJson(res, 200, {
      ok: true,
      token: tabeToken,
      userId: resolvedUserId,
      estudiante: localCtx.estudiante,
      progreso: localCtx.progreso,
      materiasAprobadas: localCtx.materiasAprobadas,
      materiasRegulares: localCtx.materiasRegulares,
      mensaje: `Sesión iniciada con éxito. Hola ${localCtx.estudiante?.nombre || "Estudiante"}, la IA ahora tiene acceso completo a tus ${aprobadas.length} materias aprobadas (promedio: ${promedio}).`,
    });
  }

  // 4. Autenticación por Código Único de Usuario (para llamadas a tools subsecuentes)
  const rawToken =
    req.headers["x-tabe-token"] ||
    req.headers["authorization"] ||
    urlObj.searchParams.get("token") ||
    urlObj.searchParams.get("api_key");

  const tokenStr = Array.isArray(rawToken) ? rawToken[0] : rawToken || "";
  const userId = decodeUserToken(tokenStr);

  // Endpoint para sincronizar credenciales y contexto académico desde la UI de TABE
  if ((pathname === "/sync-credentials" || pathname === "/sync-context") && req.method === "POST") {
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
    }
    if (body.academicContext) {
      saveLocalContextForUser(userId, body.academicContext);
    }
    return sendJson(res, 200, {
      ok: true,
      message: "Tus datos académicos y credenciales quedaron vinculados a tu Código Único para IAs externas.",
    });
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
      const localCtx = getLocalContextForUser(userId);

      // Si tenemos el snapshot sincronizado desde la app, lo priorizamos para dar a la IA externa acceso fidedigno
      if (localCtx && Array.isArray(localCtx.materiasAprobadas) && localCtx.materiasAprobadas.length > 0) {
        return sendJson(res, 200, {
          ok: true,
          userId,
          estudiante: {
            nombre: localCtx.estudiante?.nombre || "Estudiante",
            carrera: localCtx.estudiante?.carrera || "Ingeniería en Sistemas de Información",
            facultad: localCtx.estudiante?.facultad || "UTN FRM (Facultad Regional Mendoza)",
            email: localCtx.estudiante?.email,
            plan: localCtx.estudiante?.plan || "K08/K23",
            legajo: creds?.legajo || localCtx.estudiante?.legajo,
            sysacadConnected: Boolean(creds?.username),
          },
          progreso: localCtx.progreso || {
            materiasAprobadas: localCtx.materiasAprobadas.length,
            totalMaterias: localCtx.totalMaterias || 37,
            porcentajeCarrera: `${Math.round((localCtx.materiasAprobadas.length / (localCtx.totalMaterias || 37)) * 100)}%`,
            promedioGeneral: localCtx.promedio || 0,
          },
          materiasAprobadas: localCtx.materiasAprobadas,
          materiasRegulares: localCtx.materiasRegulares || [],
          materiasCursando: localCtx.materiasCursando || [],
          proximosExamenes: localCtx.proximosExamenes || [],
          mensaje: `Contexto académico oficial de ${localCtx.estudiante?.nombre || "Estudiante"} cargado con éxito para IA externa.`,
        });
      }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      const { data: recentEvents } = await supabase.from("calendar_events").select("*").eq("user_id", userId).limit(5);

      // Traer materias registradas y su estado en el plan del alumno
      const { data: subjectStatuses } = await supabase
        .from("user_subject_status")
        .select("id, estado, nota, nota_final_examen, fecha_aprobacion, subject_id, subjects(id, nombre, codigo, año)")
        .eq("user_id", userId);

      const { data: allSubjects } = await supabase
        .from("subjects")
        .select("id, nombre, codigo, año")
        .or(`user_id.eq.${userId},user_id.is.null`);

      const totalPlanMaterias = (allSubjects || []).length || 37;
      const aprobadas: any[] = [];
      const regulares: any[] = [];
      const cursando: any[] = [];
      let sumaNotas = 0;
      let cantNotas = 0;

      (subjectStatuses || []).forEach((st: any) => {
        const subName = st.subjects?.nombre || "Materia";
        const grade = st.nota_final_examen ?? st.nota;
        const isAprobada = st.estado === "aprobada" || (typeof grade === "number" && grade >= 6);

        if (isAprobada) {
          aprobadas.push({
            materia: subName,
            nota: grade,
            fecha: st.fecha_aprobacion,
          });
          if (typeof grade === "number" && grade > 0) {
            sumaNotas += grade;
            cantNotas++;
          }
        } else if (st.estado === "regular") {
          regulares.push({ materia: subName, nota: grade });
        } else if (st.estado === "cursando" || st.estado === "cursable") {
          cursando.push({ materia: subName });
        }
      });

      const promedio = cantNotas > 0 ? parseFloat((sumaNotas / cantNotas).toFixed(2)) : 0;
      const porcentaje = Math.round((aprobadas.length / totalPlanMaterias) * 100);

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
        progreso: {
          materiasAprobadas: aprobadas.length,
          totalMaterias: totalPlanMaterias,
          porcentajeCarrera: `${porcentaje}%`,
          promedioGeneral: promedio,
        },
        materiasAprobadas: aprobadas,
        materiasRegulares: regulares,
        materiasCursando: cursando,
        proximosExamenes: (recentEvents || []).map((e) => ({
          titulo: e.title,
          fecha: e.start_time,
          tipo: e.category,
        })),
        mensaje: `Contexto académico de ${profile?.nombre || "Estudiante"} cargado con éxito.`,
      });
    }

    // ── ACCIÓN: manage_subjects ───────────────────────────────────────────────
    if (pathname === "/manage-subjects" || pathname === "/manage_subjects") {
      const body = await parseJsonBody(req);
      let itemsToApply: Array<{ subjectName: string; grade: number; estado?: string }> = [];

      if (Array.isArray(body.subjects)) {
        itemsToApply = body.subjects.map((s: any) => ({
          subjectName: s.name || s.subjectName || s.materia,
          grade: Number(s.grade || s.nota || 0),
          estado: s.estado || (Number(s.grade || s.nota || 0) >= 6 ? "aprobada" : "regular"),
        }));
      } else if (typeof body.text === "string" && body.text.trim()) {
        const lines = body.text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
        for (const line of lines) {
          const match = line.match(/^[-*•]?\s*([a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s.,()/'"°-]+?)\s*[:=–—\-]\s*(\d{1,2}(?:[.,]\d{1,2})?)/);
          if (match) {
            const rawName = match[1].trim();
            const rawGrade = parseFloat(match[2].replace(",", "."));
            if (rawName.length >= 3 && !isNaN(rawGrade) && rawGrade >= 1 && rawGrade <= 10) {
              itemsToApply.push({
                subjectName: rawName,
                grade: rawGrade,
                estado: rawGrade >= 6 ? "aprobada" : "regular",
              });
            }
          }
        }
      }

      if (itemsToApply.length === 0) {
        return sendJson(res, 400, {
          ok: false,
          error: "No se proporcionaron materias válidas. Enviá un array en 'subjects' o texto en 'text'.",
        });
      }

      const { data: existingSubjects } = await supabase
        .from("subjects")
        .select("id, nombre, codigo, año")
        .or(`user_id.eq.${userId},user_id.is.null`);

      const subjectsList: any[] = existingSubjects || [];
      const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();

      const updatedResults: any[] = [];

      for (const item of itemsToApply) {
        const nq = norm(item.subjectName);
        let sub = subjectsList.find((s) => norm(s.nombre) === nq || norm(s.codigo) === nq);
        if (!sub) {
          sub = subjectsList.find((s) => norm(s.nombre).includes(nq) || nq.includes(norm(s.nombre)));
        }

        if (!sub) {
          const { data: newSub } = await supabase
            .from("subjects")
            .insert({
              user_id: userId,
              nombre: item.subjectName,
              codigo: item.subjectName.slice(0, 4).toUpperCase(),
              año: 1,
            })
            .select()
            .single();

          if (newSub) {
            sub = newSub;
            subjectsList.push(newSub);
          }
        }

        if (!sub) continue;

        const targetEstado = item.estado || (item.grade >= 6 ? "aprobada" : "regular");
        const updates = {
          estado: targetEstado,
          nota: item.grade,
          nota_final_examen: item.grade,
          fecha_aprobacion: new Date().toISOString().split("T")[0],
        };

        const { data: existingStatus } = await supabase
          .from("user_subject_status")
          .select("id")
          .eq("user_id", userId)
          .eq("subject_id", sub.id)
          .maybeSingle();

        if (existingStatus) {
          await supabase.from("user_subject_status").update(updates).eq("id", existingStatus.id);
        } else {
          await supabase.from("user_subject_status").insert({
            user_id: userId,
            subject_id: sub.id,
            ...updates,
          });
        }

        updatedResults.push({
          materia: sub.nombre,
          nota: item.grade,
          estado: targetEstado,
        });
      }

      // Persistir contexto actualizado en disco para acceso inmediato por cualquier IA externa
      const existingCtx = getLocalContextForUser(userId) || {};
      const currentApproved = existingCtx.materiasAprobadas || [];
      const mergedApproved = [...currentApproved];

      for (const resItem of updatedResults) {
        const idx = mergedApproved.findIndex((m: any) => m.materia?.toLowerCase() === resItem.materia?.toLowerCase());
        if (idx >= 0) {
          mergedApproved[idx] = resItem;
        } else {
          mergedApproved.push(resItem);
        }
      }

      const sumGrades = mergedApproved.reduce((acc: number, m: any) => acc + (Number(m.nota) || 0), 0);
      const newAvg = mergedApproved.length > 0 ? parseFloat((sumGrades / mergedApproved.length).toFixed(2)) : 0;

      saveLocalContextForUser(userId, {
        materiasAprobadas: mergedApproved,
        promedio: newAvg,
        progreso: {
          materiasAprobadas: mergedApproved.length,
          totalMaterias: existingCtx.totalMaterias || 37,
          porcentajeCarrera: `${Math.round((mergedApproved.length / (existingCtx.totalMaterias || 37)) * 100)}%`,
          promedioGeneral: newAvg,
        },
      });

      return sendJson(res, 200, {
        ok: true,
        totalAplicadas: updatedResults.length,
        materiasActualizadas: updatedResults,
        mensaje: `Se actualizaron exitosamente ${updatedResults.length} materias con sus notas en tu plan de TABE.`,
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

    // ── ACCIÓN: save_quick_note ───────────────────────────────────────────────
    if (pathname === "/save-note" || pathname === "/save_quick_note") {
      const body = await parseJsonBody(req);
      if (!body.title) {
        return sendJson(res, 400, { ok: false, error: "title es obligatorio para el apunte." });
      }

      const { data: newDoc, error } = await supabase.from("notion_documents").insert({
        user_id: userId,
        title: body.title,
        content: body.content || "",
      }).select().single();

      if (error) {
        return sendJson(res, 500, { ok: false, error: error.message });
      }

      return sendJson(res, 200, {
        ok: true,
        message: `Apunte "${body.title}" guardado con éxito en TABE.`,
        documentId: newDoc.id,
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
