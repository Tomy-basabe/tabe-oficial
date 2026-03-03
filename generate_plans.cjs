const fs = require('fs');

const civilData = `1. Análisis Matemático I (1° Semestre)
Reg: -
Ap: -
2. Álgebra y Geometría Analítica (1° Semestre)
Reg: -
Ap: -
3. Ingeniería y Sociedad (1° Semestre)
Reg: -
Ap: -
4. Ingeniería Civil I (Anual)
Reg: -
Ap: -
5. Sistema de Representación (Anual)
Reg: -
Ap: -
6. Química General (2° Semestre)
Reg: -
Ap: -
7. Física I (2° Semestre)
Reg: -
Ap: -
8. Fundamentos de Informática (Anual)
Reg: -
Ap: -
9. Análisis Matemático II (1° Semestre)
Reg: 1-2
Ap: -
10. Estabilidad (Anual)
Reg: 1-2-5-7-8
Ap: -
11. Ingeniería Civil II (Anual)
Reg: 3-4-5-8
Ap: -
12. Tecnología de los Materiales (Anual)
Reg: 1-5-6-7
Ap: -
13. Física II (2° Semestre)
Reg: 1-7
Ap: -
14. Probabilidad y Estadística (2° Semestre)
Reg: 1-2
Ap: -
15. Inglés I (1° Semestre)
Reg: 3
Ap: -
16. Resistencia de Materiales (Anual)
Reg: 10
Ap: 1-2-7-8
17. Tecnología del Hormigón (1° Semestre)
Reg: 12-14-15
Ap: 1-2-6-7
18. Tecnología de la Construcción (Anual)
Reg: 10-11-12-15
Ap: 1-2-4-5-6-7-8
19. Geotopografía (2° Semestre)
Reg: 9-11-13-14
Ap: 1-2-4-5-7
20. Hidráulica General y Aplicada (Anual)
Reg: 9-10-11-13-14
Ap: 1-2-5-7-8
21. Cálculo Avanzado (2° Semestre)
Reg: 9-10-12-14
Ap: 1-2-5-7-8
22. Instalaciones Eléctricas y Acústica (1° Semestre)
Reg: 11-12-13
Ap: 1-2-4-5-6-7
23. Instalaciones Termomecánicas (1° Semestre)
Reg: 11-12-13
Ap: 1-2-4-5-6-7
24. Economía (2° Semestre)
Reg: 11-14-15
Ap: 1-2-3-4-8
25. Materia Electiva / Faltante (Anual)
Reg: -
Ap: -
26. Geotecnia (2° Semestre)
Reg: 16-17-18-19-20
Ap: 9-10-11-12-14
27. Instalaciones Sanitarias y de gas (1° Semestre)
Reg: 18-19-20-24
Ap: 5-6-7-8-12
28. Diseño arquitectónico, Planeamiento y Urbanismo (E.I.) (Anual)
Reg: 18-19-22-23-24-25
Ap: 10-11-12-15
29. Análisis Estructural I (1° Semestre)
Reg: 16-17
Ap: 9-10-11-14
30. Estructuras de hormigón (2° Semestre)
Reg: 16-17-18-19-25
Ap: 9-10-11-12-13-14
31. Hidrología y Obras hidráulicas (Anual)
Reg: 16-18-19-20-24-25
Ap: 9-10-11-12-13-14
32. Ingeniería legal (2° Semestre)
Reg: 9-11-14-15
Ap: 1-2-3-4-8
33. Construcciones Metálicas y de Madera (2° Semestre)
Reg: 21-29
Ap: 16-17-18-19
34. Cimentaciones (1° Semestre)
Reg: 21-26-29-30-31
Ap: 16-17-18-19-20
35. Ingeniería Sanitaria (1° Semestre)
Reg: 26-27-31
Ap: 18-19-20
36. Organización y Cond. de Obras (Anual)
Reg: 26-27-28-30-31
Ap: 17-18-19-20-22-23-24-25
37. Vías de Comunicación I (2° Semestre)
Reg: 17-18-19
Ap: 9-10-11-12-14-15
38. Análisis Estructural II (2° Semestre)
Reg: 21-26-29-30-31
Ap: 16-17-18-19-25
39. Vías de Comunicación II (2° Semestre)
Reg: 26-30-31-32-37
Ap: 16-17-18-19-20-24
40. Gestión Ambiental y Desarrollo Sustentable (Anual)
Reg: 26-28-31-32
Ap: 20-24-25
41. Proyecto Final (E.I) (Anual)
Reg: 26-27-28-29-30-31-32
Ap: 15-16-17-18-19-20-22-23-24-25`;

const parseData = (data, prefix) => {
    const lines = data.split('\n').filter(l => l.trim());
    const subjects = [];
    const dependencies = [];

    let currentId = null;
    let year = 1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^\d+\./)) {
            const parts = line.split('.');
            const numStr = parts[0];
            const name = parts.slice(1).join('.').trim().split(' (')[0];
            const id = prefix + numStr;

            if (parseInt(numStr) >= 9) year = 2;
            if (parseInt(numStr) >= 16) year = 3;
            if (parseInt(numStr) >= 26) year = 4;
            if (parseInt(numStr) >= 33) year = 5;
            if (parseInt(numStr) >= 41) year = 6;

            subjects.push({
                id: id,
                codigo: prefix.toUpperCase() + numStr,
                nombre: name,
                numero_materia: parseInt(numStr),
                año: year
            });
            currentId = id;
        } else if (line.startsWith('Reg:')) {
            const reg = line.replace('Reg:', '').trim();
            if (reg && reg !== '-') {
                reg.split('-').forEach(d => {
                    dependencies.push({
                        subject_id: currentId,
                        dependency_id: prefix + parseInt(d.trim()).toString(),
                        requiere_regular: true
                    });
                });
            }
        } else if (line.startsWith('Ap:')) {
            const ap = line.replace('Ap:', '').trim();
            if (ap && ap !== '-') {
                ap.split('-').forEach(d => {
                    dependencies.push({
                        subject_id: currentId,
                        dependency_id: prefix + parseInt(d.trim()).toString(),
                        requiere_regular: false
                    });
                });
            }
        }
    }
    return { subjects, dependencies };
};

const civil = parseData(civilData, 'c');
fs.writeFileSync('c:/Users/Hp/Desktop/tabe/src/data/civil_template.json', JSON.stringify(civil, null, 2));


const electroData = `1. Análisis Matemático (1° Semestre)
Reg: -
Ap: -
2. Química General (2° Semestre)
Reg: -
Ap: -
3. Física I (2° Semestre)
Reg: -
Ap: -
4. Ingeniería Electromecánica I (Anual)
Reg: -
Ap: -
5. Algebra y Geometría Analítica (1° Semestre)
Reg: -
Ap: -
6. Ingeniería y Sociedad (2° Semestre)
Reg: -
Ap: -
7. Sistemas de Representación (1° Semestre)
Reg: -
Ap: -
8. Representación Gráfica (200 hs)
Reg: -
Ap: -
9. Fisica II (1° Semestre)
Reg: 1-3
Ap: -
10. Estabilidad (Anual)
Reg: 1-3-5
Ap: -
11. Ingeniería Electromecánica II (Anual)
Reg: 1-4-5
Ap: -
12. Conocimiento de Materiales (Anual)
Reg: 2
Ap: -
13. Análisis Matemático II (1° Semestre)
Reg: 1-5
Ap: -
14. Programación en Computación (2° Semestre)
Reg: 1-5
Ap: -
15. Probabilidad y Estadística (2° Semestre)
Reg: 1-5
Ap: -
16. Inglés I (Anual)
Reg: -
Ap: -
17. Tecnología Mecánica (Anual)
Reg: 9-12
Ap: 1-2-3-8
18. Ingeniería Electromecánica III (Anual)
Reg: 9-11-13
Ap: 1-3-4-5
19. Mecánica y Mecanismos (Anual)
Reg: 8-10-13
Ap: 1-3-5-7
20. Electrotecnia (Anual)
Reg: 9-3
Ap: 1-3-5
21. Termodinámica Técnica (1° Semestre)
Reg: 9
Ap: 1-3
22. Matemática para Ing. Electromecánica (1° Semestre)
Reg: 1-3
Ap: 1-5
23. Higiene y Seguridad Industrial (2° Semestre)
Reg: 9
Ap: 1-2-3-6
24. Materia Faltante 24
Reg: -
Ap: -
25. Materia Faltante 25
Reg: -
Ap: -
26. Elementos de Máquinas (Anual)
Reg: 17-18-19
Ap: 9-10-11-12-13-14-16
27. Electrónica Industrial (2° Semestre)
Reg: 20
Ap: 9
28. Mecánica de los Fluidos y Máquinas Fluidodinámicas (Anual)
Reg: 19-21
Ap: 9-10-13-14-22
29. Maquinarias Eléctricas (Anual)
Reg: 20
Ap: 9-22
30. Mediciones Eléctricas (1° Semestre)
Reg: 20-22
Ap: 9-13-22
31. Máquinas Térmicas (Anual)
Reg: 21
Ap: 9-22
32. Economía (2° Semestre)
Reg: 11
Ap: 6
33. Legislación (1° Semestre)
Reg: 11
Ap: 6
34. Redes de Distribución e Instalaciones Eléctricas (Anual)
Reg: 28-29
Ap: 20-22
35. Instalaciones Térmicas, Mecánicas y Frigoríficas (1° Semestre)
Reg: 27-30
Ap: 19-21-22
36. Máquinas y Equipos de Transporte (Anual)
Reg: 24-26-27-28
Ap: 16-17-18-22-23
37. Materia Faltante 37
Reg: -
Ap: -
38. Gestión y Mantenimiento Electromecánico (1° Semestre)
Reg: 24-27-28-29
Ap: 17-18-19-20-22-23
39. Organización Industrial (2° Semestre)
Reg: 31-32
Ap: 11-15
40. Automatización y Control Industrial (1° Semestre)
Reg: 22-26-27-28-29
Ap: 19-20-21-23
41. Proyecto Final (2° Semestre)
Reg: 25-27-28-30
Ap: 17-18-19-20-21-22-23`;

const electro = parseData(electroData, 'e');
fs.writeFileSync('c:/Users/Hp/Desktop/tabe/src/data/electromecanica_template.json', JSON.stringify(electro, null, 2));

console.log('done!');
