const fs = require('fs');

const subjects = [
    // 1° Año
    { num: 1, nombre: "Matemática", año: 1 },
    { num: 2, nombre: "Física", año: 1 },
    { num: 3, nombre: "Química General, Inorgánica y Orgánica", año: 1 },
    { num: 4, nombre: "Introducción a la Óptica", año: 1 },
    { num: 5, nombre: "Informática Aplicada", año: 1 },
    { num: 6, nombre: "Diseño y Geometría", año: 1 },
    { num: 7, nombre: "Inglés General", año: 1 },
    { num: 8, nombre: "Práctica Profesionalizante I", año: 1 },
    // 2° Año
    { num: 9, nombre: "Anatomía Ocular", año: 2 },
    { num: 10, nombre: "Óptica Oftálmica General", año: 2 },
    { num: 11, nombre: "Óptica Instrumental", año: 2 },
    { num: 12, nombre: "Óptica Oftálmica Especial", año: 2 },
    { num: 13, nombre: "Inglés Técnico", año: 2 },
    { num: 14, nombre: "Gestión de Costos", año: 2 },
    { num: 15, nombre: "Histología y Fisiología Ocular", año: 2 },
    { num: 16, nombre: "Práctica Profesionalizante II", año: 2 },
    // 3° Año
    { num: 17, nombre: "Óptica Oftálmica Aplicada", año: 3 },
    { num: 18, nombre: "Patología Ocular", año: 3 },
    { num: 19, nombre: "Adaptación de Lentes de Contacto", año: 3 },
    { num: 20, nombre: "Gabinete de Contactología", año: 3 },
    { num: 21, nombre: "Ergonomía, Higiene y Seguridad", año: 3 },
    { num: 22, nombre: "Organización, Administración y Comercialización", año: 3 },
    { num: 23, nombre: "Ética y Legislación Profesional", año: 3 },
    { num: 24, nombre: "Práctica Profesionalizante III", año: 3 },
];

const prefix = 'co';
const nameToNum = {};
subjects.forEach(s => { nameToNum[s.nombre] = s.num; });

// aliases
nameToNum["Anatomía"] = 9;
nameToNum["Química"] = 3;
nameToNum["Óptica Oftálmica Especial y Aplicada"] = null; // handle separately

const subjectsOut = subjects.map(s => ({
    id: prefix + s.num,
    codigo: prefix.toUpperCase() + s.num,
    nombre: s.nombre,
    numero_materia: s.num,
    año: s.año,
}));

const rawDeps = [
    // 2° Año — correlativas para cursar (regular) y rendir (ap)
    { s: 9, reg: [4], ap: [4] },       // Anatomía Ocular ← Intro Óptica
    { s: 10, reg: [2], ap: [2] },       // Óptica Oftálmica General ← Física
    { s: 11, reg: [1], ap: [1] },       // Óptica Instrumental ← Matemática
    { s: 12, reg: [10], ap: [10] },      // Óptica Oftálmica Especial ← O.O.General (rendida)
    { s: 13, reg: [7], ap: [7] },       // Inglés Técnico ← Inglés General
    { s: 14, reg: [1], ap: [1] },       // Gestión de Costos ← Matemática
    { s: 15, reg: [3, 9, 2], ap: [3, 9, 2] },  // Histología... ← Química, Anatomía, Física
    { s: 16, reg: [10], ap: [10] },      // PP II ← O.O.General
    // 3° Año
    { s: 17, reg: [12], ap: [12] },      // Óptica Oftálmica Aplicada ← O.O.Especial
    { s: 18, reg: [15], ap: [15] },      // Patología Ocular ← Histología
    { s: 19, reg: [12, 17], ap: [12, 17] },  // Adaptación LdC ← O.O.Esp + Apply
    { s: 20, reg: [12, 17], ap: [12, 17] },  // Gabinete ← O.O.Esp + Apply
    { s: 21, reg: [17], ap: [17] },      // Ergonomía ← O.O.Aplicada
    { s: 22, reg: [14], ap: [14] },      // Org/Adm/Com ← Gestión Costos
    { s: 23, reg: [14], ap: [14] },      // Ética y Leg ← Gestión Costos
    // PP III: cursar = todo regular (1-23), rendir = toda la carrera aprobada
    { s: 24, reg: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], ap: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] },
];

const dependencies = [];
rawDeps.forEach(r => {
    r.reg.forEach(d => dependencies.push({ subject_id: prefix + r.s, dependency_id: prefix + d, requiere_regular: true }));
    r.ap.forEach(d => dependencies.push({ subject_id: prefix + r.s, dependency_id: prefix + d, requiere_regular: false }));
});

const template = { subjects: subjectsOut, dependencies };
fs.writeFileSync('src/data/contactologia_template.json', JSON.stringify(template, null, 2));
console.log(`contactologia done: ${template.subjects.length} subjects, ${template.dependencies.length} deps`);
