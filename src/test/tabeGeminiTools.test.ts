import { describe, it, expect } from "vitest";
import { getTabeGeminiTools, getTabeOpenApiSchema, getTabeMcpToolsList } from "../../api/tabe-actions";

describe("TABE Universal Gemini Tools & OpenAPI", () => {
  it("debe exportar todas las herramientas oficiales de TABE para Gemini", () => {
    const tools = getTabeGeminiTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThanOrEqual(10);

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("login");
    expect(toolNames).toContain("get_academic_context");
    expect(toolNames).toContain("manage_subjects");
    expect(toolNames).toContain("resolve_campus_quiz");
    expect(toolNames).toContain("get_campus_deadlines");
    expect(toolNames).toContain("resolve_docente_encuestas");
    expect(toolNames).toContain("get_study_stats");
    expect(toolNames).toContain("create_calendar_event");
    expect(toolNames).toContain("create_flashcards");
    expect(toolNames).toContain("query_student_notes");
    expect(toolNames).toContain("save_quick_note");
  });

  it("la herramienta login debe requerir username y password", () => {
    const tools = getTabeGeminiTools();
    const loginTool = tools.find((t) => t.name === "login");
    expect(loginTool).toBeDefined();
    expect(loginTool?.parameters.required).toContain("username");
    expect(loginTool?.parameters.required).toContain("password");
  });

  it("cada herramienta de Gemini debe tener estructura válida para Gemini API", () => {
    const tools = getTabeGeminiTools();
    for (const tool of tools) {
      expect(tool.name).toBeTypeOf("string");
      expect(tool.description).toBeTypeOf("string");
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.type).toBe("OBJECT");
      expect(tool.parameters.properties).toBeTypeOf("object");
    }
  });

  it("OpenAPI schema debe incluir las rutas correspondientes", () => {
    const schema = getTabeOpenApiSchema("http://localhost:8080");
    expect(schema.openapi).toBe("3.1.0");
    expect(schema.paths["/login"]).toBeDefined();
    expect(schema.paths["/academic-context"]).toBeDefined();
    expect(schema.paths["/manage-subjects"]).toBeDefined();
    expect(schema.paths["/resolve-quiz"]).toBeDefined();
    expect(schema.paths["/save-note"]).toBeDefined();
  });

  it("debe exportar herramientas MCP compatibles con el protocolo Anthropic / Gemini Remote MCP", () => {
    const mcpTools = getTabeMcpToolsList();
    expect(Array.isArray(mcpTools)).toBe(true);
    expect(mcpTools.length).toBeGreaterThanOrEqual(10);
    const loginMcp = mcpTools.find((t) => t.name === "login");
    expect(loginMcp).toBeDefined();
    expect(loginMcp?.inputSchema.type).toBe("object");
    expect(loginMcp?.inputSchema.required).toContain("username");
    expect(loginMcp?.inputSchema.required).toContain("password");
  });
});
