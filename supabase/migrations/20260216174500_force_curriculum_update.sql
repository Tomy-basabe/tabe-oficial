-- Force Update Curriculum 2026 (Re-run)
-- This migration ensures 100% compliance with the user's provided list.

-- 1. Subject Renumbering & Years
UPDATE subjects SET numero_materia = 1, año = 1 WHERE nombre ILIKE 'Análisis Matemático I';
UPDATE subjects SET numero_materia = 2, año = 1 WHERE nombre ILIKE 'Álgebra y Geometría Analítica';
UPDATE subjects SET numero_materia = 3, año = 1 WHERE nombre ILIKE 'Física I';
UPDATE subjects SET numero_materia = 4, año = 1 WHERE nombre ILIKE 'Inglés I';
UPDATE subjects SET numero_materia = 5, año = 1 WHERE nombre ILIKE 'Lógica y Estructuras Discretas';
UPDATE subjects SET numero_materia = 6, año = 1 WHERE nombre ILIKE 'Algoritmo y Estructura de Datos';
UPDATE subjects SET numero_materia = 7, año = 1 WHERE nombre ILIKE 'Arquitectura de Computadoras';
UPDATE subjects SET numero_materia = 8, año = 1 WHERE nombre ILIKE 'Sistemas y Procesos de Negocio';

UPDATE subjects SET numero_materia = 9, año = 2 WHERE nombre ILIKE 'Análisis Matemático II';
UPDATE subjects SET numero_materia = 10, año = 2 WHERE nombre ILIKE 'Física II';
UPDATE subjects SET numero_materia = 11, año = 2 WHERE nombre ILIKE 'Ingeniería y Sociedad';
UPDATE subjects SET numero_materia = 12, año = 2 WHERE nombre ILIKE 'Inglés II';
UPDATE subjects SET numero_materia = 13, año = 2 WHERE nombre ILIKE 'Sintaxis y Semántica de los Lenguajes';
UPDATE subjects SET numero_materia = 14, año = 2 WHERE nombre ILIKE 'Paradigmas de Programación';
UPDATE subjects SET numero_materia = 15, año = 2 WHERE nombre ILIKE 'Sistemas Operativos';
UPDATE subjects SET numero_materia = 16, año = 2 WHERE nombre ILIKE 'Análisis de Sistemas de Información';

UPDATE subjects SET numero_materia = 17, año = 3 WHERE nombre ILIKE 'Probabilidad y Estadística';
UPDATE subjects SET numero_materia = 18, año = 3 WHERE nombre ILIKE 'Economía';
UPDATE subjects SET numero_materia = 19, año = 3 WHERE nombre ILIKE 'Base de Datos';
UPDATE subjects SET numero_materia = 20, año = 3 WHERE nombre ILIKE 'Desarrollo de Software';
UPDATE subjects SET numero_materia = 21, año = 3 WHERE nombre ILIKE 'Comunicación de Datos';
UPDATE subjects SET numero_materia = 22, año = 3 WHERE nombre ILIKE 'Análisis Numérico';
UPDATE subjects SET numero_materia = 23, año = 3 WHERE nombre ILIKE 'Diseño de Sistemas de Información';

UPDATE subjects SET numero_materia = 24, año = 4 WHERE nombre ILIKE 'Legislación';
UPDATE subjects SET numero_materia = 25, año = 4 WHERE nombre ILIKE 'Ingeniería y Calidad de Software';
UPDATE subjects SET numero_materia = 26, año = 4 WHERE nombre ILIKE 'Redes de Datos';
UPDATE subjects SET numero_materia = 27, año = 4 WHERE nombre ILIKE 'Investigación Operativa';
UPDATE subjects SET numero_materia = 28, año = 4 WHERE nombre ILIKE 'Simulación';
UPDATE subjects SET numero_materia = 29, año = 4 WHERE nombre ILIKE 'Tecnología para la Automatización';
UPDATE subjects SET numero_materia = 30, año = 4 WHERE nombre ILIKE 'Administración de Sistemas de Información';
UPDATE subjects SET numero_materia = 37, año = 4 WHERE nombre ILIKE 'Seminario Integrador'; -- Note: #37 in 4th Year

UPDATE subjects SET numero_materia = 31, año = 5 WHERE nombre ILIKE 'Inteligencia Artificial';
UPDATE subjects SET numero_materia = 32, año = 5 WHERE nombre ILIKE 'Ciencia de Datos';
UPDATE subjects SET numero_materia = 33, año = 5 WHERE nombre ILIKE 'Sistemas de Gestión';
UPDATE subjects SET numero_materia = 34, año = 5 WHERE nombre ILIKE 'Gestión Gerencial';
UPDATE subjects SET numero_materia = 35, año = 5 WHERE nombre ILIKE 'Seguridad en los Sistemas de Información';
UPDATE subjects SET numero_materia = 36, año = 5 WHERE nombre ILIKE 'Proyecto Final';


-- 2. RESET Dependencies
DELETE FROM subject_dependencies;

-- 3. INSERT Dependencies
DO $$
BEGIN
    -- 2nd Year
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 9 AND r.numero_materia IN (1, 2);
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 10 AND r.numero_materia IN (1, 3);
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 12 AND r.numero_materia IN (4);
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 13 AND r.numero_materia IN (5, 6);
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 14 AND r.numero_materia IN (5, 6);
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 15 AND r.numero_materia IN (7);
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 16 AND r.numero_materia IN (6, 8);

    -- 3rd Year
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 17 AND r.numero_materia IN (1, 2);
    -- 18. Economia (Aprobada: 1, 2)
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 18 AND r.numero_materia IN (1, 2);
    -- 19. Base de Datos (Regular: 13, 16; Aprobada: 5, 6)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 19 AND r.numero_materia IN (13, 16);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 19 AND r.numero_materia IN (5, 6);
    -- 20. Desarrollo (Regular: 14, 16; Aprobada: 5, 6)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 20 AND r.numero_materia IN (14, 16);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 20 AND r.numero_materia IN (5, 6);
    -- 21. Comunicacion (Reg: 3, 7)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 21 AND r.numero_materia IN (3, 7);
    -- 22. Analisis Num (Reg: 9; Apr: 1, 2)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 22 AND r.numero_materia IN (9);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 22 AND r.numero_materia IN (1, 2);
    -- 23. Diseño (Reg: 14, 16; Apr: 4, 6, 8)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 23 AND r.numero_materia IN (14, 16);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 23 AND r.numero_materia IN (4, 6, 8);

    -- 4th Year
    -- 24. Legislacion (Reg: 11)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 24 AND r.numero_materia IN (11);
    -- 25. Ing y Calidad (Reg: 19, 20, 23; Apr: 13, 14)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 25 AND r.numero_materia IN (19, 20, 23);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 25 AND r.numero_materia IN (13, 14);
    -- 26. Redes (Reg: 15, 21)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 26 AND r.numero_materia IN (15, 21);
    -- 27. Inv Op (Reg: 17, 22)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 27 AND r.numero_materia IN (17, 22);
    -- 28. Simulacion (Reg: 17; Apr: 9)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 28 AND r.numero_materia IN (17);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 28 AND r.numero_materia IN (9);
    -- 29. Tec Auto (Reg: 10, 22; Apr: 9)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 29 AND r.numero_materia IN (10, 22);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 29 AND r.numero_materia IN (9);
    -- 30. Admin Sist (Reg: 18, 23; Apr: 16)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 30 AND r.numero_materia IN (18, 23);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 30 AND r.numero_materia IN (16);
    -- 37. Seminario (Reg: 16; Apr: 6, 8, 13, 14)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 37 AND r.numero_materia IN (16);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 37 AND r.numero_materia IN (6, 8, 13, 14);

    -- 5th Year
    -- 31. IA (Reg: 28; Apr: 17, 22)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 31 AND r.numero_materia IN (28);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 31 AND r.numero_materia IN (17, 22);
    -- 32. Ciencia Datos (Reg: 28; Apr: 17, 19)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 32 AND r.numero_materia IN (28);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 32 AND r.numero_materia IN (17, 19);
    -- 33. Sist Gestion (Reg: 18, 27; Apr: 23)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 33 AND r.numero_materia IN (18, 27);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 33 AND r.numero_materia IN (23);
    -- 34. Gestion Gerencial (Reg: 24, 30; Apr: 18)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 34 AND r.numero_materia IN (24, 30);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 34 AND r.numero_materia IN (18);
    -- 35. Seguridad (Reg: 26, 30; Apr: 20, 21)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 35 AND r.numero_materia IN (26, 30);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 35 AND r.numero_materia IN (20, 21);
    -- 36. Proyecto Final (Reg: 25, 26, 30; Apr: 12, 20, 23)
    INSERT INTO subject_dependencies (subject_id, requiere_regular) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 36 AND r.numero_materia IN (25, 26, 30);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada) SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 36 AND r.numero_materia IN (12, 20, 23);

END $$;
