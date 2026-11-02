import { describe, it, expect, beforeEach } from "vitest";
import { isUserFromUtnFrm } from "@/lib/careerData";
import {
  enforceUtnFrmMcpFacultyGate,
  buildUtnFrmMcpContextSection,
  getStoredUtnFrmSnapshot,
  getStoredUtnFrmCredentials,
  isUtnFrmEncuestasAllowedForProfile,
  isUtnFrmEncuestasApproved,
  getCleanPlanType,
} from "@/lib/utnFrmMcpService";

describe("UTN FRM Exclusive MCP Gate & Context", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("permite únicamente usuarios de UTN FRM y bloquea otras facultades/regionales", () => {
    expect(
      isUserFromUtnFrm({
        facultad: "UTN FRM — Universidad Tecnológica Nacional (Facultad Regional Mendoza)",
      })
    ).toBe(true);
    expect(isUserFromUtnFrm({ facultad: "UTN FRM" })).toBe(true);
    expect(isUserFromUtnFrm({ facultad: "utn_frm" })).toBe(true);

    // Otras regionales de UTN o universidades NO deben pasar
    expect(isUserFromUtnFrm({ facultad: "UTN FRBA — Regional Buenos Aires" })).toBe(false);
    expect(isUserFromUtnFrm({ facultad: "UNCuyo — Universidad Nacional de Cuyo" })).toBe(false);
    expect(isUserFromUtnFrm({ facultad: null, carrera: null })).toBe(false);
  });

  it("construye contexto para TABE AI si es de UTN FRM y lo purga si cambia de facultad", async () => {
    const userId = "test-user-utn";
    localStorage.setItem(
      `tabe_utnfrm_mcp_creds_${userId}`,
      JSON.stringify({ username: "44111222", password: "secret" })
    );
    localStorage.setItem(
      `tabe_utnfrm_mcp_snapshot_${userId}`,
      JSON.stringify({
        ok: true,
        syncedAt: "2026-11-01T15:00:00.000Z",
        username: "44111222",
        resolvedEmail: "bautista@alumnos.frm.utn.edu.ar",
        legajo: "54321",
        summary: {
          sysacadConnected: true,
          sysacadTablesCount: 1,
          legajo: "54321",
          studentLabel: "MARTORELL BAUTISTA",
          campusConnected: true,
          campusCoursesCount: 1,
          campusDeadlinesCount: 1,
          campusGradesCount: 0,
          mailConnected: true,
          mailUnreadCount: 2,
          mailRecentCount: 1,
          avisosCount: 1,
        },
        sysacad: {
          connected: true,
          consultas: {
            cursado_actual: {
              consulta: "cursado_actual",
              label: "Materias que cursa actualmente",
              columns: ["Materia", "Estado"],
              rows: [{ Materia: "Sistemas Operativos", Estado: "Cursando" }],
            },
          },
        },
        campus: {
          connected: true,
          courses: [{ id: "10", name: "Sistemas Operativos 2026", url: "https://campusvirtual.frm.utn.edu.ar/course/view.php?id=10" }],
          deadlines: [
            {
              courseId: "10",
              courseName: "Sistemas Operativos 2026",
              kind: "assignment",
              name: "TP1 Procesos",
              due: "2026-11-10",
              url: "https://campusvirtual.frm.utn.edu.ar/mod/assign/view.php?id=99",
            },
          ],
          grades: [],
          calendarEvents: [],
        },
        mail: {
          connected: true,
          emailUsed: "bautista@alumnos.frm.utn.edu.ar",
          totalMessages: 12,
          unreadCount: 2,
          messages: [
            {
              uid: 101,
              subject: "Fecha Parcial SO",
              from: "Cátedra SO",
              date: "01-Nov-2026",
              seen: false,
            },
          ],
        },
        avisos: [{ titulo: "Mesas de Examen", fecha: "01/11/2026", texto: "Inscripción a mesas de examen abierta" }],
      })
    );

    // 1. Mientras pertenece a UTN FRM, genera la sección [15. MCP EXCLUSIVO UTN FRM...]
    const ctx = buildUtnFrmMcpContextSection(userId, {
      facultad: "UTN FRM — Universidad Tecnológica Nacional (Facultad Regional Mendoza)",
    });
    expect(ctx).toContain("MARTORELL BAUTISTA");
    expect(ctx).toContain("Sistemas Operativos");
    expect(ctx).toContain("TP1 Procesos");
    expect(ctx).toContain("Fecha Parcial SO");

    // 2. Si el estudiante se cambia a otra facultad (ej. UNCuyo), se desactiva y purga todo
    const allowedAfterSwitch = await enforceUtnFrmMcpFacultyGate(userId, {
      facultad: "UNCuyo — Universidad Nacional de Cuyo",
    });
    expect(allowedAfterSwitch).toBe(false);
    expect(getStoredUtnFrmSnapshot(userId)).toBeNull();
    expect(getStoredUtnFrmCredentials(userId)).toBeNull();
    expect(
      buildUtnFrmMcpContextSection(userId, {
        facultad: "UNCuyo — Universidad Nacional de Cuyo",
      })
    ).toBe("");
  });

  it("restringe la resolución de encuestas docentes exclusivamente a usuarios de UTN FRM aprobados por el Admin", () => {
    const userId = "test-user-encuestas";

    // Usuario de UTN FRM sin aprobación de Admin -> bloqueado
    expect(
      isUtnFrmEncuestasAllowedForProfile({
        facultad: "UTN FRM",
        utnfrm_encuestas_enabled: false,
        plan_type: "mensual",
      })
    ).toBe(false);

    const ctxUnapproved = buildUtnFrmMcpContextSection(userId, {
      facultad: "UTN FRM",
      utnfrm_encuestas_enabled: false,
    });
    expect(ctxUnapproved).toContain("NO HABILITADO PARA ESTE USUARIO");
    expect(ctxUnapproved).not.toContain("tabe-action:utn-encuestas");

    // Usuario de UTN FRM aprobado por Admin (columna booleana o tag en plan_type) -> habilitado
    expect(
      isUtnFrmEncuestasAllowedForProfile({
        facultad: "UTN FRM",
        utnfrm_encuestas_enabled: true,
      })
    ).toBe(true);
    expect(
      isUtnFrmEncuestasAllowedForProfile({
        facultad: "UTN FRM",
        plan_type: "mensual+encuestas_utn",
      })
    ).toBe(true);
    expect(getCleanPlanType("mensual+encuestas_utn")).toBe("mensual");
    expect(getCleanPlanType("free+encuestas_utn")).toBeNull();

    // Si tiene el flag de admin pero se cambia a otra facultad (ej. UNCuyo) -> bloqueado
    expect(
      isUtnFrmEncuestasAllowedForProfile({
        facultad: "UNCuyo",
        utnfrm_encuestas_enabled: true,
        plan_type: "mensual+encuestas_utn",
      })
    ).toBe(false);
    expect(isUtnFrmEncuestasApproved({ plan_type: "free+encuestas_utn" })).toBe(true);

    const ctxApproved = buildUtnFrmMcpContextSection(userId, {
      facultad: "UTN FRM",
      utnfrm_encuestas_enabled: true,
    });
    expect(ctxApproved).toContain("HABILITADO POR EL ADMINISTRADOR");
    expect(ctxApproved).toContain("tabe-action:utn-encuestas");
  });
});
