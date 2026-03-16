const fs = require('fs');

// For UNCUYO Agronomia, correlatives are by NAME not by code.
// We assign numeric IDs ourselves based on order.

const subjects = [
    // Año 1
    { num: 1, nombre: "Introducción a las Ciencias Agrarias", año: 1 },
    { num: 2, nombre: "Matemática", año: 1 },
    { num: 3, nombre: "Química General", año: 1 },
    { num: 4, nombre: "Botánica I", año: 1 },
    { num: 5, nombre: "Informática Aplicada", año: 1 },
    { num: 6, nombre: "Física I", año: 1 },
    { num: 7, nombre: "Química Inorgánica", año: 1 },
    { num: 8, nombre: "Botánica II", año: 1 },
    { num: 9, nombre: "Dibujo", año: 1 },
    // Año 2
    { num: 10, nombre: "Química Analítica e Instrumental", año: 2 },
    { num: 11, nombre: "Física II", año: 2 },
    { num: 12, nombre: "Química Orgánica y Biológica", año: 2 },
    { num: 13, nombre: "Estadística y Diseño Experimental", año: 2 },
    { num: 14, nombre: "Inglés", año: 2 },
    { num: 15, nombre: "Introducción a la Zootecnia", año: 2 },
    { num: 16, nombre: "Microbiología", año: 2 },
    { num: 17, nombre: "Fisiología Vegetal", año: 2 },
    { num: 18, nombre: "Meteorología Agrícola", año: 2 },
    // Año 3
    { num: 19, nombre: "Edafología", año: 3 },
    { num: 20, nombre: "Genética General y Aplicada", año: 3 },
    { num: 21, nombre: "Topografía Agrícola", año: 3 },
    { num: 22, nombre: "Propagación Vegetal", año: 3 },
    { num: 23, nombre: "Talleres de Campo e Industria", año: 3 },
    { num: 24, nombre: "Química Agrícola", año: 3 },
    { num: 25, nombre: "Fitopatología", año: 3 },
    { num: 26, nombre: "Mecánica y Maquinaria Agrícola", año: 3 },
    { num: 27, nombre: "Zoología Agrícola", año: 3 },
    // Año 4
    { num: 28, nombre: "Hidrología Agrícola", año: 4 },
    { num: 29, nombre: "Fruticultura", año: 4 },
    { num: 30, nombre: "Ecología Agrícola y Protección Ambiental", año: 4 },
    { num: 31, nombre: "Introducción al Conocimiento Científico", año: 4 },
    { num: 32, nombre: "Viticultura", año: 4 },
    { num: 33, nombre: "Dasonomía", año: 4 },
    { num: 34, nombre: "Agricultura Especial", año: 4 },
    { num: 35, nombre: "Horticultura y Floricultura", año: 4 },
    // Año 5
    { num: 36, nombre: "Enología I", año: 5 },
    { num: 37, nombre: "Economía y Política Agraria", año: 5 },
    { num: 38, nombre: "Talleres Básicos Agronómicos", año: 5 },
    { num: 39, nombre: "Prácticas en Bodega", año: 5 },
    { num: 40, nombre: "Industrias Agrarias", año: 5 },
    { num: 41, nombre: "Enología II", año: 5 },
    { num: 42, nombre: "Espacios Verdes", año: 5 },
    { num: 43, nombre: "Terapéutica Vegetal", año: 5 },
    { num: 44, nombre: "Malezas", año: 5 },
];

// Build name→num map for correlatives lookup
const nameToNum = {};
subjects.forEach(s => { nameToNum[s.nombre] = s.num; });

// Alias for "Microbiología Agrícola e Industrial" → 16 (Microbiología)
nameToNum["Microbiología Agrícola e Industrial"] = 16;

const prefix = 'ua'; // UNCUYO Agronomy
const subjectsOut = subjects.map(s => ({
    id: prefix + s.num,
    codigo: prefix.toUpperCase() + s.num,
    nombre: s.nombre,
    numero_materia: s.num,
    año: s.año,
}));

const raw = [
    // Año 1
    { s: "Informática Aplicada", reg: ["Introducción a las Ciencias Agrarias"], ap: ["Introducción a las Ciencias Agrarias"] },
    { s: "Física I", reg: ["Matemática"], ap: ["Matemática"] },
    { s: "Química Inorgánica", reg: ["Química General"], ap: ["Química General"] },
    { s: "Botánica II", reg: ["Botánica I"], ap: ["Botánica I"] },
    // Año 2
    { s: "Química Analítica e Instrumental", reg: ["Química Inorgánica"], ap: ["Química Inorgánica"] },
    { s: "Física II", reg: ["Física I"], ap: ["Física I"] },
    { s: "Química Orgánica y Biológica", reg: ["Química Inorgánica"], ap: ["Química Inorgánica"] },
    { s: "Estadística y Diseño Experimental", reg: ["Matemática"], ap: ["Matemática"] },
    { s: "Introducción a la Zootecnia", reg: ["Introducción a las Ciencias Agrarias"], ap: ["Introducción a las Ciencias Agrarias"] },
    { s: "Microbiología", reg: ["Química Orgánica y Biológica"], ap: ["Química Orgánica y Biológica"] },
    { s: "Fisiología Vegetal", reg: ["Química Orgánica y Biológica", "Botánica II", "Física I"], ap: ["Química Orgánica y Biológica", "Botánica II", "Física I"] },
    { s: "Meteorología Agrícola", reg: ["Física II"], ap: ["Física II"] },
    // Año 3
    { s: "Edafología", reg: ["Fisiología Vegetal"], ap: ["Fisiología Vegetal"] },
    { s: "Genética General y Aplicada", reg: ["Fisiología Vegetal"], ap: ["Fisiología Vegetal"] },
    { s: "Topografía Agrícola", reg: ["Física II"], ap: ["Física II"] },
    { s: "Propagación Vegetal", reg: ["Botánica II"], ap: ["Botánica II"] },
    { s: "Talleres de Campo e Industria", reg: ["Matemática", "Introducción a las Ciencias Agrarias"], ap: ["Matemática", "Introducción a las Ciencias Agrarias"] },
    { s: "Química Agrícola", reg: ["Química Orgánica y Biológica", "Química Analítica e Instrumental"], ap: ["Química Orgánica y Biológica", "Química Analítica e Instrumental"] },
    { s: "Fitopatología", reg: ["Química Orgánica y Biológica", "Fisiología Vegetal"], ap: ["Química Orgánica y Biológica", "Fisiología Vegetal"] },
    { s: "Mecánica y Maquinaria Agrícola", reg: ["Física II"], ap: ["Física II"] },
    { s: "Zoología Agrícola", reg: ["Fisiología Vegetal"], ap: ["Fisiología Vegetal"] },
    // Año 4
    { s: "Hidrología Agrícola", reg: ["Meteorología Agrícola", "Fisiología Vegetal", "Edafología", "Topografía Agrícola"], ap: ["Meteorología Agrícola", "Fisiología Vegetal", "Edafología", "Topografía Agrícola"] },
    { s: "Fruticultura", reg: ["Propagación Vegetal", "Fitopatología", "Zoología Agrícola", "Mecánica y Maquinaria Agrícola"], ap: ["Propagación Vegetal", "Fitopatología", "Zoología Agrícola", "Mecánica y Maquinaria Agrícola"] },
    { s: "Ecología Agrícola y Protección Ambiental", reg: ["Fisiología Vegetal", "Meteorología Agrícola", "Microbiología Agrícola e Industrial", "Genética General y Aplicada", "Edafología", "Zoología Agrícola"], ap: ["Fisiología Vegetal", "Meteorología Agrícola", "Microbiología Agrícola e Industrial", "Genética General y Aplicada", "Edafología", "Zoología Agrícola"] },
    { s: "Introducción al Conocimiento Científico", reg: ["Informática Aplicada", "Estadística y Diseño Experimental", "Fisiología Vegetal"], ap: ["Informática Aplicada", "Estadística y Diseño Experimental", "Fisiología Vegetal"] },
    { s: "Viticultura", reg: ["Propagación Vegetal", "Zoología Agrícola", "Mecánica y Maquinaria Agrícola", "Fitopatología"], ap: ["Propagación Vegetal", "Zoología Agrícola", "Mecánica y Maquinaria Agrícola", "Fitopatología"] },
    { s: "Dasonomía", reg: ["Topografía Agrícola", "Propagación Vegetal", "Zoología Agrícola", "Fitopatología"], ap: ["Topografía Agrícola", "Propagación Vegetal", "Zoología Agrícola", "Fitopatología"] },
    { s: "Agricultura Especial", reg: ["Edafología", "Mecánica y Maquinaria Agrícola", "Zoología Agrícola", "Fitopatología"], ap: ["Edafología", "Mecánica y Maquinaria Agrícola", "Zoología Agrícola", "Fitopatología"] },
    { s: "Horticultura y Floricultura", reg: ["Genética General y Aplicada", "Propagación Vegetal", "Fitopatología", "Hidrología Agrícola", "Zoología Agrícola", "Mecánica y Maquinaria Agrícola"], ap: ["Genética General y Aplicada", "Propagación Vegetal", "Fitopatología", "Hidrología Agrícola", "Zoología Agrícola", "Mecánica y Maquinaria Agrícola"] },
    // Año 5
    { s: "Enología I", reg: ["Viticultura", "Microbiología Agrícola e Industrial"], ap: ["Viticultura", "Microbiología Agrícola e Industrial"] },
    { s: "Economía y Política Agraria", reg: ["Edafología", "Genética General y Aplicada", "Microbiología Agrícola e Industrial", "Meteorología Agrícola", "Mecánica y Maquinaria Agrícola", "Fisiología Vegetal", "Zoología Agrícola", "Fitopatología", "Topografía Agrícola", "Hidrología Agrícola", "Química Agrícola", "Ecología Agrícola y Protección Ambiental", "Introducción a la Zootecnia"], ap: ["Edafología", "Genética General y Aplicada", "Microbiología Agrícola e Industrial", "Meteorología Agrícola", "Mecánica y Maquinaria Agrícola", "Fisiología Vegetal", "Zoología Agrícola", "Fitopatología", "Topografía Agrícola", "Hidrología Agrícola", "Química Agrícola", "Ecología Agrícola y Protección Ambiental", "Introducción a la Zootecnia"] },
    { s: "Talleres Básicos Agronómicos", reg: ["Informática Aplicada", "Topografía Agrícola", "Estadística y Diseño Experimental", "Fisiología Vegetal", "Física II", "Meteorología Agrícola", "Química Orgánica y Biológica", "Química Analítica e Instrumental", "Talleres de Campo e Industria", "Introducción a la Zootecnia"], ap: ["Informática Aplicada", "Topografía Agrícola", "Estadística y Diseño Experimental", "Fisiología Vegetal", "Física II", "Meteorología Agrícola", "Química Orgánica y Biológica", "Química Analítica e Instrumental", "Talleres de Campo e Industria", "Introducción a la Zootecnia"] },
    { s: "Prácticas en Bodega", reg: ["Enología I"], ap: ["Enología I"] },
    { s: "Industrias Agrarias", reg: ["Microbiología Agrícola e Industrial", "Fruticultura", "Horticultura y Floricultura"], ap: ["Microbiología Agrícola e Industrial", "Fruticultura", "Horticultura y Floricultura"] },
    { s: "Enología II", reg: ["Enología I", "Viticultura"], ap: ["Enología I", "Viticultura"] },
    { s: "Espacios Verdes", reg: ["Propagación Vegetal", "Hidrología Agrícola", "Mecánica y Maquinaria Agrícola", "Ecología Agrícola y Protección Ambiental"], ap: ["Propagación Vegetal", "Hidrología Agrícola", "Mecánica y Maquinaria Agrícola", "Ecología Agrícola y Protección Ambiental"] },
    { s: "Terapéutica Vegetal", reg: ["Mecánica y Maquinaria Agrícola", "Fitopatología", "Zoología Agrícola", "Ecología Agrícola y Protección Ambiental"], ap: ["Mecánica y Maquinaria Agrícola", "Fitopatología", "Zoología Agrícola", "Ecología Agrícola y Protección Ambiental"] },
    { s: "Malezas", reg: ["Horticultura y Floricultura", "Mecánica y Maquinaria Agrícola", "Fitopatología", "Zoología Agrícola", "Ecología Agrícola y Protección Ambiental"], ap: ["Horticultura y Floricultura", "Mecánica y Maquinaria Agrícola", "Fitopatología", "Zoología Agrícola", "Ecología Agrícola y Protección Ambiental"] },
];

const dependencies = [];
raw.forEach(r => {
    const sNum = nameToNum[r.s];
    if (!sNum) { console.warn('Subject not found:', r.s); return; }
    r.reg.forEach(dep => {
        const dNum = nameToNum[dep];
        if (!dNum) { console.warn('Dep not found:', dep, 'for', r.s); return; }
        dependencies.push({ subject_id: prefix + sNum, dependency_id: prefix + dNum, requiere_regular: true });
    });
    // Add 'ap' deps
    r.ap.forEach(dep => {
        const dNum = nameToNum[dep];
        if (!dNum) { console.warn('Dep(ap) not found:', dep, 'for', r.s); return; }
        dependencies.push({ subject_id: prefix + sNum, dependency_id: prefix + dNum, requiere_regular: false });
    });
});

const template = { subjects: subjectsOut, dependencies };
fs.writeFileSync('src/data/agronomia_uncuyo_template.json', JSON.stringify(template, null, 2));
console.log('agronomia done:', template.subjects.length, 'subjects,', template.dependencies.length, 'deps');
