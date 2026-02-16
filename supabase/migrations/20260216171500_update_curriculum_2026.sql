-- 1. Update Subject Numbers to match User's Curriculum
-- We use ILIKE to match names robustly.

-- 1st Year (Unchanged mostly, but ensuring)
UPDATE subjects SET numero_materia = 1 WHERE nombre ILIKE 'Análisis Matemático I';
UPDATE subjects SET numero_materia = 2 WHERE nombre ILIKE 'Álgebra y Geometría Analítica';
UPDATE subjects SET numero_materia = 3 WHERE nombre ILIKE 'Física I';
UPDATE subjects SET numero_materia = 4 WHERE nombre ILIKE 'Inglés I';
UPDATE subjects SET numero_materia = 5 WHERE nombre ILIKE 'Lógica y Estructuras Discretas';
UPDATE subjects SET numero_materia = 6 WHERE nombre ILIKE 'Algoritmo y Estructura de Datos'; -- Fix name typo if exists
UPDATE subjects SET numero_materia = 7 WHERE nombre ILIKE 'Arquitectura de Computadoras';
UPDATE subjects SET numero_materia = 8 WHERE nombre ILIKE 'Sistemas y Procesos de Negocio';

-- 2nd Year
UPDATE subjects SET numero_materia = 9 WHERE nombre ILIKE 'Análisis Matemático II';
UPDATE subjects SET numero_materia = 10 WHERE nombre ILIKE 'Física II';
UPDATE subjects SET numero_materia = 11 WHERE nombre ILIKE 'Ingeniería y Sociedad';
UPDATE subjects SET numero_materia = 12 WHERE nombre ILIKE 'Inglés II';
UPDATE subjects SET numero_materia = 13 WHERE nombre ILIKE 'Sintaxis y Semántica de los Lenguajes';
UPDATE subjects SET numero_materia = 14 WHERE nombre ILIKE 'Paradigmas de Programación';
UPDATE subjects SET numero_materia = 15 WHERE nombre ILIKE 'Sistemas Operativos';
UPDATE subjects SET numero_materia = 16 WHERE nombre ILIKE 'Análisis de Sistemas de Información';

-- 3rd Year
UPDATE subjects SET numero_materia = 17 WHERE nombre ILIKE 'Probabilidad y Estadística';
UPDATE subjects SET numero_materia = 18 WHERE nombre ILIKE 'Economía';
UPDATE subjects SET numero_materia = 19 WHERE nombre ILIKE 'Base de Datos'; -- Name might be 'Bases de Datos' or 'Base de Datos'
UPDATE subjects SET numero_materia = 20 WHERE nombre ILIKE 'Desarrollo de Software';
UPDATE subjects SET numero_materia = 21 WHERE nombre ILIKE 'Comunicación de Datos';
UPDATE subjects SET numero_materia = 22 WHERE nombre ILIKE 'Análisis Numérico';
UPDATE subjects SET numero_materia = 23 WHERE nombre ILIKE 'Diseño de Sistemas de Información';

-- 4th Year (Major changes)
UPDATE subjects SET numero_materia = 24, año = 4 WHERE nombre ILIKE 'Legislación';
UPDATE subjects SET numero_materia = 25, año = 4 WHERE nombre ILIKE 'Ingeniería y Calidad de Software';
UPDATE subjects SET numero_materia = 26, año = 4 WHERE nombre ILIKE 'Redes de Datos';
UPDATE subjects SET numero_materia = 27, año = 4 WHERE nombre ILIKE 'Investigación Operativa';
UPDATE subjects SET numero_materia = 28, año = 4 WHERE nombre ILIKE 'Simulación';
UPDATE subjects SET numero_materia = 29, año = 4 WHERE nombre ILIKE 'Tecnología para la Automatización';
UPDATE subjects SET numero_materia = 30, año = 4 WHERE nombre ILIKE 'Administración de Sistemas de Información';
-- 37 is Seminario (4th year according to user)
UPDATE subjects SET numero_materia = 37, año = 4 WHERE nombre ILIKE 'Seminario Integrador';

-- 5th Year
UPDATE subjects SET numero_materia = 31, año = 5 WHERE nombre ILIKE 'Inteligencia Artificial';
UPDATE subjects SET numero_materia = 32, año = 5 WHERE nombre ILIKE 'Ciencia de Datos';
UPDATE subjects SET numero_materia = 33, año = 5 WHERE nombre ILIKE 'Sistemas de Gestión';
UPDATE subjects SET numero_materia = 34, año = 5 WHERE nombre ILIKE 'Gestión Gerencial';
UPDATE subjects SET numero_materia = 35, año = 5 WHERE nombre ILIKE 'Seguridad en los Sistemas de Información';
UPDATE subjects SET numero_materia = 36, año = 5 WHERE nombre ILIKE 'Proyecto Final';


-- 2. Clear old dependencies
DELETE FROM subject_dependencies;

-- 3. Insert NEW Dependencies
DO $$
DECLARE
    -- IDs holder
    ids uuid[];
BEGIN
    -- We'll fetch all IDs into an array indexed by numero_materia for easy access
    -- Assuming strictly one subject per numero_materia after updates.
    -- Arrays are 1-based in Postgres. We need a way to map 1..37.
    -- Let's use a temporary table or just lookups. Lookups are cleaner.
    
    -- Helper function to add dependency
    -- We can't define functions inside DO block easily, so we'll just repeat logic or use a loop? No, explicit is better to match the user's manual.
    
    -- 2nd Year
    -- 16. Análisis de Sistemas (Cursar: 6, 8 Regular)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 16 AND r.numero_materia IN (6, 8);

    -- 9. AM II (Cursar: 1, 2 Regular)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 9 AND r.numero_materia IN (1, 2);

    -- 13. Sintaxis (Cursar: 5, 6 Regular)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 13 AND r.numero_materia IN (5, 6);

    -- 12. Inglés II (Cursar: 4 Regular)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 12 AND r.numero_materia IN (4);

    -- 10. Física II (Cursar: 1, 3 Regular)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 10 AND r.numero_materia IN (1, 3);

    -- 14. Paradigmas (Cursar: 5, 6 Regular)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 14 AND r.numero_materia IN (5, 6);

    -- 15. Sistemas Operativos (Cursar: 7 Regular)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 15 AND r.numero_materia IN (7);


    -- 3rd Year
    -- 23. Diseño de Sistemas (Cursar: 14, 16 Regular; Rendir: 4, 6, 8 Aprobada)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 23 AND r.numero_materia IN (14, 16);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 23 AND r.numero_materia IN (4, 6, 8);

    -- 17. Probabilidad (Cursar: 1, 2 Regular)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 17 AND r.numero_materia IN (1, 2);

    -- 18. Economía (Rendir: 1, 2 Aprobada)
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 18 AND r.numero_materia IN (1, 2);

    -- 19. Base de Datos (Cursar: 13, 16 Regular; Rendir: 5, 6 Aprobada)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 19 AND r.numero_materia IN (13, 16);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 19 AND r.numero_materia IN (5, 6);

    -- 21. Comunicación de Datos (Cursar: 3, 7 Regular)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 21 AND r.numero_materia IN (3, 7);

    -- 20. Desarrollo de Software (Cursar: 14, 16 Regular; Rendir: 5, 6 Aprobada)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 20 AND r.numero_materia IN (14, 16);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 20 AND r.numero_materia IN (5, 6);

    -- 22. Análisis Numérico (Cursar: 9 Regular; Rendir: 1, 2 Aprobada)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 22 AND r.numero_materia IN (9);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 22 AND r.numero_materia IN (1, 2);


    -- 4th Year
    -- 37. Seminario Integrador (Cursar: 16 Regular; Rendir: 6, 8, 13, 14 Aprobada)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 37 AND r.numero_materia IN (16);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 37 AND r.numero_materia IN (6, 8, 13, 14);

    -- 30. Administración de Sistemas (Cursar: 18, 23 Regular; Rendir: 16 Aprobada)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 30 AND r.numero_materia IN (18, 23);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 30 AND r.numero_materia IN (16);

    -- 25. Ingeniería y Calidad (Cursar: 19, 20, 23 Regular; Rendir: 13, 14 Aprobada)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 25 AND r.numero_materia IN (19, 20, 23);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 25 AND r.numero_materia IN (13, 14);

    -- 24. Legislación (Cursar: 11 Regular)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 24 AND r.numero_materia IN (11);

    -- 27. Investigación Operativa (Cursar: 17, 22 Regular)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 27 AND r.numero_materia IN (17, 22);

    -- 28. Simulación (Cursar: 17 Regular; Rendir: 9 Aprobada)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 28 AND r.numero_materia IN (17);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 28 AND r.numero_materia IN (9);

    -- 26. Redes de Datos (Cursar: 15, 21 Regular)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 26 AND r.numero_materia IN (15, 21);

    -- 29. Tecnología Autom. (Cursar: 10, 22 Regular; Rendir: 9 Aprobada)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 29 AND r.numero_materia IN (10, 22);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 29 AND r.numero_materia IN (9);


    -- 5th Year
    -- 36. Proyecto Final (Cursar: 25, 26, 30 Regular; Rendir: 12, 20, 23 Aprobada)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 36 AND r.numero_materia IN (25, 26, 30);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 36 AND r.numero_materia IN (12, 20, 23);

    -- 31. IA (Cursar: 28 Regular; Rendir: 17, 22 Aprobada)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 31 AND r.numero_materia IN (28);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 31 AND r.numero_materia IN (17, 22);

    -- 32. Ciencia de Datos (Cursar: 28 Regular; Rendir: 17, 19 Aprobada)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 32 AND r.numero_materia IN (28);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 32 AND r.numero_materia IN (17, 19);

    -- 33. Sistemas de Gestión (Cursar: 18, 27 Regular; Rendir: 23 Aprobada)
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 33 AND r.numero_materia IN (18, 27);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 33 AND r.numero_materia IN (23);

    -- 34. Gestión Gerencial (Cursar: 24, 30 Regular; Rendir: 18 Aprobada)
    -- Warning: User says Cursar 24, 30. DB had 30 as prior Seminario? Wait, 30 is Administración now. 24 is Legislación. Correct.
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 34 AND r.numero_materia IN (24, 30);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 34 AND r.numero_materia IN (18);

    -- 35. Seguridad (Cursar: 36, 30 Regular; Rendir: ...)
    -- User says: Cursar: 26, 30 Regular. Rendir: 20, 21 Aprobada.
    INSERT INTO subject_dependencies (subject_id, requiere_regular)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 35 AND r.numero_materia IN (26, 30);
    INSERT INTO subject_dependencies (subject_id, requiere_aprobada)
    SELECT s.id, r.id FROM subjects s, subjects r WHERE s.numero_materia = 35 AND r.numero_materia IN (20, 21);

END $$;
