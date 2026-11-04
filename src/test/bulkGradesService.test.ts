import { describe, it, expect } from "vitest";
import { parseBulkSubjectGradesFromText, extractApprovedSubjectsFromSysacad } from "../lib/bulkGradesService";

describe("bulkGradesService", () => {
  it("parsea correctamente la lista de materias de Facundo Blanes", () => {
    const rawInput = `cargame como aprobada y las notas las siguientes materias 
Comunicación de Datos: 10

Bases de Datos: 9

Ingeniería y Sociedad: 9

Algoritmos y Estructuras de Datos: 9

Lógica y Estructuras Discretas: 9

Economía: 8

Sintaxis y Semántica de los Lenguajes: 8

Física I: 8

Sistemas y Procesos de Negocio: 8

Probabilidad y Estadística: 7

Física II: 7

Paradigmas de Programación: 7

Sistemas Operativos: 7

Análisis de Sistemas de Información: 7

Análisis Matemático II: 7

Arquitectura de Computadoras: 7

Álgebra y Geometría Analítica: 7

Inglés I: 6

Análisis Matemático I: 6`;

    const parsed = parseBulkSubjectGradesFromText(rawInput);
    expect(parsed.length).toBe(19);

    expect(parsed[0]).toEqual({
      subjectName: "Comunicación de Datos",
      grade: 10,
      estado: "aprobada",
      fechaAprobacion: expect.any(String),
    });

    expect(parsed[18]).toEqual({
      subjectName: "Análisis Matemático I",
      grade: 6,
      estado: "aprobada",
      fechaAprobacion: expect.any(String),
    });
  });

  it("extrae materias aprobadas desde las tablas de Sysacad", () => {
    const mockSysacadConsultas = {
      aprobados: {
        label: "Exámenes aprobados",
        columns: ["Materia", "Fecha", "Nota", "Libro"],
        rows: [
          { Materia: "Análisis Matemático I", Fecha: "2024-07-15", Nota: "8", Libro: "L-12" },
          { Materia: "Álgebra y Geometría Analítica", Fecha: "2024-12-10", Nota: "7", Libro: "L-14" },
        ],
      },
    };

    const extracted = extractApprovedSubjectsFromSysacad(mockSysacadConsultas);
    expect(extracted.length).toBe(2);
    expect(extracted[0].subjectName).toBe("Análisis Matemático I");
    expect(extracted[0].grade).toBe(8);
    expect(extracted[0].estado).toBe("aprobada");
    expect(extracted[0].fechaAprobacion).toBe("2024-07-15");
  });

  it("parsea listas extensas con múltiples formatos sin omitir materias", () => {
    const rawComplexList = `Hola, te paso todas mis notas de la carrera:
1. Álgebra y Geometría Analítica: 8
2) 950101 - Análisis Matemático I - 7 (Promocionado)
3. Física I: 8 (Final del 15/12/2023)
4. Química General con 8
5. Sistemas y Organizaciones = 9
6. Algoritmos y Estructuras de Datos\t8 (Ocho)\t10/12/2023\tAprobado
7. Arquitectura de Computadoras   7
8. Inglés 1 (9)
9. Ingeniería y Sociedad: 9, Economía: 8, Legislación: 7
10. 8 - Sistemas Operativos
11. Paradigmas de Programación: 8
12. Sintaxis y Semántica de los Lenguajes - 7
13. Probabilidad y Estadística = 8
14. Diseño de Sistemas con 9
15. Comunicación de Datos: 10
16. Gestión de Datos: 9`;

    const parsed = parseBulkSubjectGradesFromText(rawComplexList);
    // Debería haber parseado las 18 materias completas (la línea 9 contenía 3 materias)
    expect(parsed.length).toBe(18);

    const names = parsed.map((p) => p.subjectName);
    expect(names).toContain("Álgebra y Geometría Analítica");
    expect(names).toContain("Análisis Matemático I");
    expect(names).toContain("Física I");
    expect(names).toContain("Química General");
    expect(names).toContain("Sistemas y Organizaciones");
    expect(names).toContain("Algoritmos y Estructuras de Datos");
    expect(names).toContain("Arquitectura de Computadoras");
    expect(names).toContain("Inglés 1");
    expect(names).toContain("Ingeniería y Sociedad");
    expect(names).toContain("Economía");
    expect(names).toContain("Legislación");
    expect(names).toContain("Sistemas Operativos");
    expect(names).toContain("Paradigmas de Programación");
    expect(names).toContain("Sintaxis y Semántica de los Lenguajes");
    expect(names).toContain("Probabilidad y Estadística");
    expect(names).toContain("Diseño de Sistemas");
    expect(names).toContain("Comunicación de Datos");
    expect(names).toContain("Gestión de Datos");
  });

  it("parsea lista con anotaciones de año y materias de ingreso", () => {
    const rawAiList = `Ingreso Por Abanderado (0° año): Aprobada en 2024
T.A.I.U. - Taller de Ambientación e Inte (0° año): Aprobada en 2024
Algoritmos y Estructuras de Datos (1° año): 9
Análisis Matemático I (1° año): 8
Arquitectura de Computadoras (1° año): 7
Física I (1° año): 8
Lógica y Estructuras Discretas (1° año): 7
Sistemas y Procesos de Negocio (1° año): 7
Álgebra y Geometría Analítica (1° año): 7
Análisis de Sistemas de Información (2° año): 6
Análisis Matemático II (2° año): 8
Física II (2° año): 10
Ingeniería y Sociedad (2° año): 8
Inglés I (2° año): 6
Paradigmas de Programación (2° año): 8
Sintaxis y Semántica de los Lenguajes (2° año): 8
Sistemas Operativos (2° año): 7
Bases de Datos (3° año): 9
Comunicación de Datos (3° año): 10
Economía (3° año): 8
Probabilidad y Estadística (3° año): 6`;

    const parsed = parseBulkSubjectGradesFromText(rawAiList);
    expect(parsed.length).toBe(21);
    expect(parsed.map((p) => p.subjectName)).toContain("Algoritmos y Estructuras de Datos");
    expect(parsed.map((p) => p.subjectName)).toContain("Física II");
  });

  it("parsea sin problemas listas masivas de hasta 50 materias", () => {
    const lines: string[] = [];
    for (let i = 1; i <= 50; i++) {
      lines.push(`${i}. Materia Universitaria ${i} (${Math.ceil(i / 10)}° año): ${6 + (i % 5)}`);
    }
    const raw50 = lines.join("\n");
    const parsed50 = parseBulkSubjectGradesFromText(raw50);
    expect(parsed50.length).toBe(50);
    expect(parsed50[0].subjectName).toBe("Materia Universitaria 1");
    expect(parsed50[49].subjectName).toBe("Materia Universitaria 50");
  });
});
