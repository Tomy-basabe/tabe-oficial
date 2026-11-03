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
});
