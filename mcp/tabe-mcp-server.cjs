#!/usr/bin/env node
/**
 * TABE Universal MCP Server (Model Context Protocol)
 * Compatible con Claude Desktop, Claude Code y clientes MCP stdio (JSON-RPC 2.0).
 * 
 * Permite a Claude interactuar con el ecosistema de TABE de forma nativa:
 * - Consultar contexto académico y notas
 * - Consultar tareas y deadlines del Campus Virtual UTN FRM
 * - Resolver cuestionarios de Moodle y encuestas docentes de Sysacad
 * - Ver estadísticas de estudio (Pomodoro, horas, rachas)
 * - Crear eventos de calendario
 * - Generar flashcards de repaso
 * - Buscar apuntes del estudiante
 * 
 * Uso en claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "tabe": {
 *       "command": "node",
 *       "args": ["<ruta-a-tabe>/mcp/tabe-mcp-server.cjs"],
 *       "env": {
 *         "TABE_TOKEN": "tabe_usr_...",
 *         "TABE_HOST": "http://localhost:8080"
 *       }
 *     }
 *   }
 * }
 */

const readline = require("readline");
const fs = require("fs");
const path = require("path");

// Configuración inicial
const args = process.argv.slice(2);
let token = process.env.TABE_TOKEN || "";
let host = process.env.TABE_HOST || "https://www.tabe.com.ar";
let username = process.env.TABE_USER || process.env.TABE_EMAIL || "";
let password = process.env.TABE_PASSWORD || "";

const SESSION_FILE = path.resolve(process.cwd(), ".tabe_current_session.json");

// Recuperar sesión previa guardada si existe y no hay token explícito
if (!token && fs.existsSync(SESSION_FILE)) {
  try {
    const s = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
    if (s && s.token) token = s.token;
  } catch {}
}

// Parsing de argumentos CLI
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--token" && args[i + 1]) {
    token = args[i + 1];
    i++;
  } else if (args[i].startsWith("--token=")) {
    token = args[i].split("=")[1];
  } else if (args[i] === "--host" && args[i + 1]) {
    host = args[i + 1];
    i++;
  } else if (args[i].startsWith("--host=")) {
    host = args[i].split("=")[1];
  } else if ((args[i] === "--user" || args[i] === "--username") && args[i + 1]) {
    username = args[i + 1];
    i++;
  } else if (args[i].startsWith("--user=")) {
    username = args[i].split("=")[1];
  } else if (args[i].startsWith("--username=")) {
    username = args[i].split("=")[1];
  } else if (args[i] === "--password" && args[i + 1]) {
    password = args[i + 1];
    i++;
  } else if (args[i].startsWith("--password=")) {
    password = args[i].split("=")[1];
  }
}

// Catálogo de Tools de TABE
const TOOLS = [
  {
    name: "login",
    description: "Inicia sesión en TABE con tu usuario (email o legajo) y contraseña para conectar tu cuenta y acceder a tus notas, materias y campus virtual.",
    inputSchema: {
      type: "object",
      properties: {
        username: {
          type: "string",
          description: "Email o usuario de TABE (ej: tu-email@utn.edu.ar).",
        },
        password: {
          type: "string",
          description: "Contraseña de tu cuenta de TABE.",
        },
      },
      required: ["username", "password"],
    },
  },
  {
    name: "get_academic_context",
    description: "Obtiene el contexto académico completo del estudiante: perfil, carrera, materias en curso, materias aprobadas con sus notas y promedio en TABE.",
    inputSchema: {
      type: "object",
      properties: {
        includeArchived: {
          type: "boolean",
          description: "Si es true, incluye materias de años anteriores archivadas.",
          default: false,
        },
      },
      required: [],
    },
  },
  {
    name: "manage_subjects",
    description: "Carga o actualiza materias con sus notas y estados en el plan de carrera de TABE. Permite enviar pares de 'Materia: Nota' o lista de asignaturas.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Texto con materias y notas (ej: 'Bases de Datos: 9\\nFísica I: 8').",
        },
        subjects: {
          type: "array",
          description: "Lista de materias a actualizar con su nota",
          items: {
            type: "object",
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
    description: "Consulta las entregas de tareas, cuestionarios próximos y eventos con fecha límite del Campus Virtual UTN FRM del alumno.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Cantidad máxima de tareas y deadlines a traer (por defecto 15).",
          default: 15,
        },
      },
      required: [],
    },
  },
  {
    name: "resolve_campus_quiz",
    description: "Accede al Campus Virtual de UTN FRM, abre y responde con inteligencia artificial el cuestionario indicado por URL (Moodle quiz). Envía las respuestas automáticamente y devuelve el reporte.",
    inputSchema: {
      type: "object",
      properties: {
        quizUrl: {
          type: "string",
          description: "URL completa del cuestionario de Moodle (ej: https://campusvirtual.frm.utn.edu.ar/mod/quiz/view.php?id=XXXXX).",
        },
        maxQuestions: {
          type: "number",
          description: "Número máximo de preguntas a responder (por defecto 80).",
          default: 80,
        },
        autoSubmit: {
          type: "boolean",
          description: "Si es true, confirma y envía definitivamente el intento para obtener calificación. Por defecto true.",
          default: true,
        },
      },
      required: ["quizUrl"],
    },
  },
  {
    name: "resolve_docente_encuestas",
    description: "Completa de forma constructiva y automática las encuestas docentes pendientes en Sysacad UTN FRM.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_study_stats",
    description: "Consulta las estadísticas de estudio del estudiante en TABE: tiempo total de Pomodoro, horas por materia, rachas diarias y resumen semanal.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Ventana de días hacia atrás a analizar (por defecto 30).",
          default: 30,
        },
      },
      required: [],
    },
  },
  {
    name: "create_calendar_event",
    description: "Crea un nuevo evento, parcial, entrega o recordatorio en el calendario del estudiante en TABE.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Título del evento (ej: 'Parcial de Algoritmos', 'Entrega TP1').",
        },
        date: {
          type: "string",
          description: "Fecha en formato ISO o YYYY-MM-DD (ej: '2026-05-15' o '2026-05-15T18:00:00Z').",
        },
        description: {
          type: "string",
          description: "Descripción opcional o contenido del evento.",
        },
        subject: {
          type: "string",
          description: "Nombre o ID de la materia asociada (opcional).",
        },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "create_flashcards",
    description: "Crea un mazo de tarjetas de estudio (flashcards) en TABE para que el estudiante pueda repasar un tema con repetición espaciada.",
    inputSchema: {
      type: "object",
      properties: {
        deckName: {
          type: "string",
          description: "Nombre del mazo (ej: 'Estructuras de Datos - Unidad 1').",
        },
        subject: {
          type: "string",
          description: "Materia relacionada (opcional).",
        },
        cards: {
          type: "array",
          description: "Lista de tarjetas con pregunta en el frente y respuesta en el dorso.",
          items: {
            type: "object",
            properties: {
              front: { type: "string", description: "Pregunta o concepto a repasar." },
              back: { type: "string", description: "Respuesta o explicación detallada." },
            },
            required: ["front", "back"],
          },
        },
      },
      required: ["deckName", "cards"],
    },
  },
  {
    name: "query_student_notes",
    description: "Busca y recupera notas y apuntes tomados por el estudiante en el editor de TABE (Notion Docs).",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Término o tema a buscar dentro de los títulos o apuntes.",
        },
        subject: {
          type: "string",
          description: "Filtrar por nombre de materia (opcional).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "save_quick_note",
    description: "Guarda un apunte o apunte de clase en Notion de TABE.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Título del documento.",
        },
        content: {
          type: "string",
          description: "Contenido del apunte o resumen.",
        },
      },
      required: ["title"],
    },
  },
];

// Función para enviar respuestas JSON-RPC 2.0 por stdout
function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

// Ejecutar tool llamando al backend de TABE
async function executeTool(name, args) {
  const cleanHost = host.replace(/\/+$/, "");

  // Acción especial: login con usuario y contraseña
  if (name === "login") {
    const loginUser = args?.username || username;
    const loginPass = args?.password || password;
    if (!loginUser || !loginPass) {
      throw new Error("Se requiere 'username' y 'password' para iniciar sesión en TABE.");
    }
    const url = `${cleanHost}/api/tabe-actions/login`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: loginUser, password: loginPass }),
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!response.ok || !json.ok) {
      throw new Error(json?.error || `Error en login (${response.status}): ${text}`);
    }

    token = json.token;
    try {
      fs.writeFileSync(
        SESSION_FILE,
        JSON.stringify(
          {
            token,
            userId: json.userId,
            email: loginUser,
            estudiante: json.estudiante,
            updatedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        "utf8"
      );
    } catch {}

    return json;
  }

  // Si no tenemos token pero tenemos credenciales en env vars o argumentos, intentar auto-login
  if (!token && username && password) {
    try {
      await executeTool("login", { username, password });
    } catch {}
  }

  if (!token) {
    throw new Error(
      "No has iniciado sesión en TABE. Por favor ejecuta la herramienta 'login' con tu usuario (email) y contraseña de TABE, o configúralos en las variables TABE_USER y TABE_PASSWORD."
    );
  }

  const url = `${cleanHost}/api/tabe-actions/${name}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tabe-Token": token,
    },
    body: JSON.stringify(args || {}),
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const errMsg = json?.error || `Error HTTP ${response.status}: ${text}`;
    throw new Error(errMsg);
  }

  return json;
}

// Procesar mensajes entrantes por stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch (err) {
    sendResponse({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error: invalid JSON" },
    });
    return;
  }

  // Notificación sin id (ej: notifications/initialized)
  if (msg.id === undefined || msg.id === null) {
    return;
  }

  const { id, method, params } = msg;

  try {
    switch (method) {
      case "initialize":
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "tabe-mcp-server",
              version: "1.0.0",
            },
          },
        });
        break;

      case "ping":
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {},
        });
        break;

      case "tools/list":
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            tools: TOOLS,
          },
        });
        break;

      case "tools/call": {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        const toolDef = TOOLS.find((t) => t.name === toolName);
        if (!toolDef) {
          sendResponse({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Herramienta desconocida: "${toolName}"`,
            },
          });
          break;
        }

        try {
          const result = await executeTool(toolName, toolArgs);
          sendResponse({
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
                },
              ],
              isError: false,
            },
          });
        } catch (execErr) {
          sendResponse({
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Error al ejecutar ${toolName}: ${execErr.message}`,
                },
              ],
              isError: true,
            },
          });
        }
        break;
      }

      default:
        sendResponse({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Método no soportado: "${method}"`,
          },
        });
        break;
    }
  } catch (handlerErr) {
    sendResponse({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: handlerErr.message || "Internal error",
      },
    });
  }
});
