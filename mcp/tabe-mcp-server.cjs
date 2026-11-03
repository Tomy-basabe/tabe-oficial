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

// Configuración inicial
const args = process.argv.slice(2);
let token = process.env.TABE_TOKEN || "";
let host = process.env.TABE_HOST || "http://localhost:8080";

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
  }
}

// Catálogo de Tools de TABE
const TOOLS = [
  {
    name: "get_academic_context",
    description: "Obtiene el contexto académico completo del estudiante: perfil, carrera, materias en curso, notas de cursada y finales aprobados en TABE.",
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
];

// Función para enviar respuestas JSON-RPC 2.0 por stdout
function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

// Ejecutar tool llamando al backend de TABE
async function executeTool(name, args) {
  if (!token) {
    throw new Error(
      "No se configuró el TABE_TOKEN. Agregá 'TABE_TOKEN': 'tabe_usr_...' en la configuración del servidor MCP en Claude Desktop."
    );
  }

  const cleanHost = host.replace(/\/+$/, "");
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
