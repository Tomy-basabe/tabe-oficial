const fs = require('fs');

const parseData = (data, prefix) => {
    const lines = data.split('\n').filter(l => l.trim());
    const subjects = [];
    const dependencies = [];

    let currentId = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const m = line.match(/^(\d+)\.\s+(.+)/);
        if (m) {
            const num = parseInt(m[1]);
            const name = m[2].trim().split(' (')[0].split('(')[0].trim();
            const id = prefix + num;

            // year based on number
            let year = 1;
            if (num >= 9) year = 2;
            if (num >= 17) year = 3;
            if (num >= 27) year = 4;
            if (num >= 35) year = 5;
            if (num >= 41) year = 6;

            subjects.push({ id, codigo: prefix.toUpperCase() + num, nombre: name, numero_materia: num, año: year });
            currentId = id;
        } else if (line.startsWith('Reg:')) {
            const val = line.replace('Reg:', '').trim();
            if (val && val !== '-') {
                val.split('-').forEach(d => {
                    const depNum = parseInt(d.trim());
                    if (!isNaN(depNum)) {
                        dependencies.push({ subject_id: currentId, dependency_id: prefix + depNum, requiere_regular: true });
                    }
                });
            }
        } else if (line.startsWith('Ap:')) {
            const val = line.replace('Ap:', '').trim();
            if (val && val !== '-') {
                val.split('-').forEach(d => {
                    const depNum = parseInt(d.trim());
                    if (!isNaN(depNum)) {
                        dependencies.push({ subject_id: currentId, dependency_id: prefix + depNum, requiere_regular: false });
                    }
                });
            }
        }
    }
    return { subjects, dependencies };
};

// ── Ingeniería Química ──
const quimicaData = `1. Introducción a la Ingeniería Química (Anual)
Reg: -
Ap: -
2. Ingeniería y Sociedad (1° Semestre)
Reg: -
Ap: -
3. Álgebra y Geometría Analítica (1° Semestre)
Reg: -
Ap: -
4. Análisis Matemático I (1° Semestre)
Reg: -
Ap: -
5. Física I (2° Semestre)
Reg: -
Ap: -
6. Química (2° Semestre)
Reg: -
Ap: -
7. Sistemas de Representación (Anual)
Reg: -
Ap: -
8. Fundamentos de la Informática (Anual)
Reg: -
Ap: -
9. Introducción a Equipos y Procesos (Anual)
Reg: 1-6
Ap: -
10. Probabilidad y Estadística (2° Semestre)
Reg: 3-4
Ap: -
11. Química Inorgánica (1° Semestre)
Reg: 6
Ap: -
12. Análisis Matemático II (1° Semestre)
Reg: 3-4
Ap: -
13. Física II (2° Semestre)
Reg: 4-5
Ap: -
14. Química Orgánica (Anual)
Reg: 6
Ap: -
15. Legislación (2° Semestre)
Reg: 1-2
Ap: -
16. Inglés I (Anual)
Reg: -
Ap: -
17. Balance de Masa y Energía (Anual)
Reg: 6-7-8-9-13
Ap: 1-3-4
18. Termodinámica (1° Semestre)
Reg: 11-12-13
Ap: 4-6
19. Matemática Superior Aplicada (1° Semestre)
Reg: 12
Ap: 3-4
20. Ciencia de los Materiales (1° Semestre)
Reg: 9-11-14
Ap: 1-6
21. Fisicoquímica (2° Semestre)
Reg: 9-12-13
Ap: 3-4-6
22. Fenómenos de Transporte (2° Semestre)
Reg: 9-12-13
Ap: 3-4-6
23. Química Analítica (1° Semestre)
Reg: 10-11-14
Ap: 2-6
24. Microbiología y Química Biológica (Anual)
Reg: 11-14
Ap: 6
25. Química Aplicada (Anual)
Reg: 9-11-13-14
Ap: 1-2-6
26. Inglés II (Anual)
Reg: 16
Ap: -
27. Diseño, simulación, optimización y seguridad de procesos (Anual)
Reg: 17-19
Ap: 7-8-9-12-26
28. Operaciones Unitarias I (Anual)
Reg: 17-18-22
Ap: 9-12-13
29. Tecnología de la Energía Térmica (1° Semestre)
Reg: 17-18-21-22
Ap: 9-12-13
30. Economía (1° Semestre)
Reg: 9
Ap: 2-3
31. Operaciones Unitarias II (2° Semestre)
Reg: 18-21-22
Ap: 9-12-13-14
32. Ingeniería de las Reacciones Químicas (Anual)
Reg: 17-18-21-22
Ap: 11-12-14
33. Calidad y Control Estadístico de Procesos (1° Semestre)
Reg: 10
Ap: 4
34. Organización Industrial (Anual)
Reg: 10
Ap: 2-9-15
35. Control Automático de Procesos (Anual)
Reg: 27-31
Ap: 17-19-23
36. Mecánica Industrial (Anual)
Reg: 9-21
Ap: 5-11-20
37. Ingeniería Ambiental (Anual)
Reg: 25-28-31-32
Ap: 15-17-23
38. Procesos Biotecnológicos (Anual)
Reg: 17-21-22-24
Ap: 9-11-14
39. Higiene y Seguridad en el Trabajo (Anual)
Reg: 11-14-17
Ap: 9
40. Máquinas e Instalaciones Eléctricas (Anual)
Reg: 28
Ap: 9-13
41. Proyecto Final (Anual)
Reg: 27-28-29-31-32-34
Ap: 17-21-22-25-30`;

const quimica = parseData(quimicaData, 'q');
fs.writeFileSync('src/data/quimica_template.json', JSON.stringify(quimica, null, 2));
console.log('quimica done:', quimica.subjects.length, 'subjects,', quimica.dependencies.length, 'deps');


// ── Ingeniería en Telecomunicaciones ──
const telecomData = `1. Informática I (Anual)
Reg: -
Ap: -
2. Álgebra y Geometría Analítica (Anual)
Reg: -
Ap: -
3. Análisis Matemático I (Anual)
Reg: -
Ap: -
4. Ingeniería y Sociedad (1° Semestre)
Reg: -
Ap: -
5. Diseño Asistido por Computadoras (2° Semestre)
Reg: -
Ap: -
6. Física I (Anual)
Reg: -
Ap: -
7. Técnicas Digitales (Anual)
Reg: -
Ap: -
8. Química General (1° Semestre)
Reg: -
Ap: -
9. Física II (Anual)
Reg: -
Ap: -
10. Análisis de Señales y Sistemas (Anual)
Reg: -
Ap: -
11. Análisis Matemático II (Anual)
Reg: -
Ap: -
12. Taller de Redes y Comunicaciones (2° Semestre)
Reg: -
Ap: -
13. Informática II (Anual)
Reg: -
Ap: -
14. Inglés I (Anual)
Reg: -
Ap: -
15. Probabilidad y Estadística (2° Semestre)
Reg: -
Ap: -
16. Teoría de los Circuitos (Anual)
Reg: -
Ap: -
17. Dispositivos Electrónicos y Electrónica General (Anual)
Reg: -
Ap: -
18. Física Electrónica (1° Semestre)
Reg: -
Ap: -
19. Medios de Enlace (2° Semestre)
Reg: -
Ap: -
20. Sistemas de Comunicaciones (Anual)
Reg: -
Ap: -
21. Redes de Comunicaciones y Datos (Anual)
Reg: -
Ap: -
22. Inglés II (Anual)
Reg: -
Ap: -
23. Seguridad Higiene y Medio Ambiente (2° Semestre)
Reg: -
Ap: -
24. Medidas Electrónicas (Anual)
Reg: -
Ap: -
25. Legislación para Comunicaciones (1° Semestre)
Reg: 13
Ap: 4
26. Tecnología Electrónica e Introducción al Control (Anual)
Reg: -
Ap: -
27. Administración de Redes de Datos (1° Semestre)
Reg: -
Ap: -
28. Electrónica Aplicada a las Comunicaciones (Anual)
Reg: -
Ap: -
29. Telecomunicaciones Móviles (1° Semestre)
Reg: -
Ap: -
30. Sistemas Operativos de Red (2° Semestre)
Reg: -
Ap: -
31. Organización Industrial (Anual)
Reg: 20
Ap: -
32. Comunicaciones Ópticas (2° Semestre)
Reg: 24-26
Ap: 19-20-21
33. Sistemas Multimedia, Audio y Video Digital (1° Semestre)
Reg: 24-26
Ap: 17-20
34. Antenas y Propagación Electromagnética (1° Semestre)
Reg: 27-28
Ap: 19-20
35. Comunicaciones y Protocolos Industriales (2° Semestre)
Reg: 24-26
Ap: 17-20
36. Economía (2° Semestre)
Reg: 25
Ap: 4
37. Proyecto Final (1° Semestre)
Reg: 24-28-31
Ap: -`;

const telecom = parseData(telecomData, 't');
fs.writeFileSync('src/data/telecomunicaciones_template.json', JSON.stringify(telecom, null, 2));
console.log('telecom done:', telecom.subjects.length, 'subjects,', telecom.dependencies.length, 'deps');


// ── Ingeniería Electrónica ──
const electronicaData = `1. Informática (Anual)
Reg: -
Ap: -
2. Álgebra y Geometría Analítica (Anual)
Reg: -
Ap: -
3. Análisis Matemático I (Anual)
Reg: -
Ap: -
4. Ingeniería y Sociedad (1° Semestre)
Reg: -
Ap: -
5. Física I (Anual)
Reg: -
Ap: -
6. Diseño Asistido por Computadoras (2° Semestre)
Reg: -
Ap: -
7. Química (1° Semestre)
Reg: -
Ap: -
8. Análisis Matemático II (Anual)
Reg: -
Ap: -
9. Informática II (Anual)
Reg: -
Ap: -
10. Análisis de Señales y Sistemas (Anual)
Reg: -
Ap: -
11. Física II (2° Semestre)
Reg: -
Ap: -
12. Probabilidad y Estadística (2° Semestre)
Reg: -
Ap: -
13. Técnicas Digitales I (Anual)
Reg: -
Ap: -
14. Seguridad, Higiene y Medio Ambiente (2° Semestre)
Reg: -
Ap: -
15. Inglés I (2° Semestre)
Reg: -
Ap: -
16. Física Electrónica (1° Semestre)
Reg: -
Ap: -
17. Teoría de los Circuitos I (Anual)
Reg: -
Ap: -
18. Dispositivos Electrónicos (1° Semestre)
Reg: -
Ap: -
19. Legislación (1° Semestre)
Reg: -
Ap: -
20. Electrónica Aplicada I (2° Semestre)
Reg: -
Ap: -
21. Medios de Enlace (2° Semestre)
Reg: -
Ap: -
22. Inglés II (Anual)
Reg: -
Ap: -
23. Técnicas Digitales II (Anual)
Reg: -
Ap: -
24. Medidas Electrónicas I (Anual)
Reg: -
Ap: -
25. Teoría de los Circuitos II (Anual)
Reg: -
Ap: -
26. Máquinas e Instalaciones Eléctricas (Anual)
Reg: -
Ap: -
27. Sistemas de Comunicaciones (Anual)
Reg: -
Ap: -
28. Electrónica Aplicada II (Anual)
Reg: -
Ap: -
29. Técnicas Digitales III (Anual)
Reg: -
Ap: -
30. Medidas Electrónicas II (Anual)
Reg: -
Ap: -
31. Sistemas de Control (Anual)
Reg: -
Ap: -
32. Electrónica Aplicada III (Anual)
Reg: -
Ap: -
33. Tecnología Electrónica (Anual)
Reg: -
Ap: -
34. Electrónica de Potencia (Anual)
Reg: -
Ap: -
35. Organización Industrial (Anual)
Reg: -
Ap: -
36. Economía (2° Semestre)
Reg: -
Ap: -
37. Proyecto Final (Anual)
Reg: -
Ap: -`;

const electronica = parseData(electronicaData, 'el');
// Fix years for electronica (prefix is 'el', same number logic)
electronica.subjects.forEach(s => {
    let n = s.numero_materia;
    if (n >= 36) s.año = 6;
    else if (n >= 29) s.año = 5;
    else if (n >= 22) s.año = 4;
    else if (n >= 15) s.año = 3;
    else if (n >= 8) s.año = 2;
    else s.año = 1;
});
fs.writeFileSync('src/data/electronica_template.json', JSON.stringify(electronica, null, 2));
console.log('electronica done:', electronica.subjects.length, 'subjects,', electronica.dependencies.length, 'deps');
