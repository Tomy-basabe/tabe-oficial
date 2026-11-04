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

    localStorage.setItem(
      `tabe_utnfrm_mcp_snapshot_${userId}`,
      JSON.stringify({
        ok: true,
        syncedAt: "2026-11-01T15:00:00.000Z",
        username: "44111222",
        campus: { connected: true, courses: [], deadlines: [], grades: [] },
      })
    );

    const ctxApproved = buildUtnFrmMcpContextSection(userId, {
      facultad: "UTN FRM",
      utnfrm_encuestas_enabled: true,
    });
    expect(ctxApproved).toContain("HABILITADO POR EL ADMINISTRADOR");
    expect(ctxApproved).toContain("tabe-action:utn-encuestas");
    expect(ctxApproved).toContain("tabe-action:utn-quiz");
    expect(ctxApproved).toContain("RESOLUCIÓN DIRECTA EN EL CAMPUS VIRTUAL MOODLE");
  });

  it("parsea correctamente preguntas y opciones de un intento de cuestionario en Moodle", async () => {
    const { parseMoodleQuizAttemptQuestions } = await import("../../api/utnfrm-mcp");

    const sampleAttemptHtml = `
      <form id="responseform" method="post" action="https://campusvirtual.frm.utn.edu.ar/mod/quiz/processattempt.php">
        <input type="hidden" name="sesskey" value="xyz987abc">
        <input type="hidden" name="attempt" value="1234">
        <input type="hidden" name="thispage" value="0">
        <input type="hidden" name="nextpage" value="-1">
        <input type="hidden" name="slots" value="1,2">

        <div id="q1" class="que multichoice deferredfeedback notyetanswered">
          <input type="hidden" name="q1234:1_:sequencecheck" value="1">
          <div class="qtext">
            ¿Cuál es el valor del determinante jacobiano en coordenadas cilíndricas?
          </div>
          <div class="answer">
            <div class="r0">
              <input type="radio" name="q1234:1_answer" value="0" id="q1234:1_answer0">
              <label for="q1234:1_answer0">a. 1</label>
            </div>
            <div class="r1">
              <input type="radio" name="q1234:1_answer" value="1" id="q1234:1_answer1">
              <label for="q1234:1_answer1">b. r</label>
            </div>
            <div class="r2">
              <input type="radio" name="q1234:1_answer" value="2" id="q1234:1_answer2">
              <label for="q1234:1_answer2">c. r^2</label>
            </div>
          </div>
        </div>

        <div id="q2" class="que multichoice deferredfeedback notyetanswered">
          <input type="hidden" name="q1234:2_:sequencecheck" value="1">
          <div class="qtext">
            El Teorema de Green relaciona una integral de línea cerrada con:
          </div>
          <div class="answer">
            <div class="r0">
              <input type="radio" name="q1234:2_answer" value="0" id="q1234:2_answer0">
              <label for="q1234:2_answer0">a. Una integral triple</label>
            </div>
            <div class="r1">
              <input type="radio" name="q1234:2_answer" value="1" id="q1234:2_answer1">
              <label for="q1234:2_answer1">b. Una integral doble sobre la región encerrada</label>
            </div>
          </div>
        </div>
      </form>
    `;

    const parsed = parseMoodleQuizAttemptQuestions(sampleAttemptHtml);
    expect(parsed.attemptId).toBe("1234");
    expect(parsed.sesskey).toBe("xyz987abc");
    expect(parsed.questions.length).toBe(2);

    // Pregunta 1
    const q1 = parsed.questions[0];
    expect(q1.slot).toBe(1);
    expect(q1.qtext).toContain("determinante jacobiano en coordenadas cilíndricas");
    expect(q1.choices.length).toBe(3);
    expect(q1.choices[1].text).toBe("r");
    expect(q1.choices[1].value).toBe("1");
    expect(q1.sequencecheckName).toBe("q1234:1_:sequencecheck");

    // Pregunta 2
    const q2 = parsed.questions[1];
    expect(q2.slot).toBe(2);
    expect(q2.qtext).toContain("Teorema de Green");
    expect(q2.choices.length).toBe(2);
    expect(q2.choices[1].text).toBe("Una integral doble sobre la región encerrada");
  });

  it("parsea tablas de Sysacad con fila inicial de título colspan y extrae materias aprobadas", async () => {
    const { parseSysacadTable } = await import("../../api/utnfrm-mcp");
    const { extractApprovedSubjectsFromSysacad } = await import("@/lib/bulkGradesService");

    const sampleSysacadAprobadosHtml = `
      <table border="1" cellpadding="2" cellspacing="0" class="tabla">
        <tr>
          <td colspan="6" class="titulo">Exámenes Aprobados</td>
        </tr>
        <tr>
          <th class="encabezado">Materia</th>
          <th class="encabezado">Fecha</th>
          <th class="encabezado">Nota</th>
          <th class="encabezado">Libro</th>
          <th class="encabezado">Folio</th>
          <th class="encabezado">Tomo</th>
        </tr>
        <tr>
          <td>Álgebra y Geometría Analítica</td>
          <td>15/12/2023</td>
          <td>8 (Ocho)</td>
          <td>24</td>
          <td>112</td>
          <td>1</td>
        </tr>
        <tr>
          <td>Análisis Matemático 1</td>
          <td>20/02/2024</td>
          <td>7 (Siete)</td>
          <td>25</td>
          <td>45</td>
          <td>1</td>
        </tr>
      </table>
    `;

    const parsedTable = parseSysacadTable(sampleSysacadAprobadosHtml);
    expect(parsedTable.columns).toContain("materia");
    expect(parsedTable.columns).toContain("nota");
    expect(parsedTable.rows.length).toBe(2);
    expect(parsedTable.rows[0]["materia"]).toContain("Álgebra y Geometría Analítica");
    expect(parsedTable.rows[0]["nota"]).toBe("8 (Ocho)");

    const extracted = extractApprovedSubjectsFromSysacad({
      consultas: {
        aprobados: {
          consulta: "aprobados",
          label: "Exámenes aprobados",
          ...parsedTable,
        },
      },
    });

    expect(extracted.length).toBe(2);
    expect(extracted[0].subjectName).toBe("Álgebra y Geometría Analítica");
    expect(extracted[0].grade).toBe(8);
    expect(extracted[0].estado).toBe("aprobada");
    expect(extracted[1].subjectName).toBe("Análisis Matemático 1");
    expect(extracted[1].grade).toBe(7);
  });
});
