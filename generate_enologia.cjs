const fs = require('fs');

const subjects = [
    // PRIMER AÑO - 1º Semestre
    { num: 1, nombre: "Producción Vitícola", año: 1 },
    { num: 2, nombre: "Producción Frutícola (Olivícola)", año: 1 },
    { num: 3, nombre: "Producción Animal (Apicultura)", año: 1 },
    { num: 6, nombre: "Industrialización Oleícola", año: 1 },
    { num: 10, nombre: "Emprendedorismo y Agronegocios", año: 1 },
    
    // PRIMER AÑO - 2º Semestre
    { num: 4, nombre: "Vinificación", año: 1 },
    { num: 5, nombre: "Industrialización de Frutas y Hortalizas", año: 1 },
    { num: 7, nombre: "Industria Cárnica", año: 1 },
    { num: 8, nombre: "Industria Láctea", año: 1 },
    { num: 9, nombre: "Industria Apícola", año: 1 },
    
    // PRIMER AÑO - Anual
    { num: 25, nombre: "Análisis Sensorial de Vinos", año: 1 },

    // SEGUNDO AÑO - 1º Semestre
    { num: 11, nombre: "Gestión de los Procesos Fermentativos", año: 2 },
    { num: 12, nombre: "Gestión de Maquinarias Agroindustriales", año: 2 },
    { num: 15, nombre: "Territorio y Desarrollo", año: 2 },
    
    // SEGUNDO AÑO - 2º Semestre
    { num: 13, nombre: "Análisis de Productos Enológicos", año: 2 },
    { num: 14, nombre: "Manejo de Cosecha y Postcosecha", año: 2 },
    { num: 16, nombre: "Innovación y Gestión Empresarial", año: 2 },
    
    // SEGUNDO AÑO - Anual
    { num: 26, nombre: "Análisis Sensorial de Alimentos", año: 2 },

    // TERCER AÑO - 1º Semestre
    { num: 17, nombre: "Análisis de las Bebidas", año: 3 },
    { num: 18, nombre: "Análisis de los Alimentos de Origen Vegetal", año: 3 },
    { num: 22, nombre: "Gestión de la Estabilización de los Alimentos", año: 3 },
    { num: 23, nombre: "Gestión de la Estabilización del Vino", año: 3 },
    
    // TERCER AÑO - 2º Semestre
    { num: 19, nombre: "Análisis de los Alimentos de Origen Animal", año: 3 },
    { num: 20, nombre: "Gestión del Desarrollo Sostenible", año: 3 },
    { num: 21, nombre: "Gestión de Emprendimientos", año: 3 },
    { num: 24, nombre: "Gestión de la Crianza de Vinos", año: 3 },
    
    // TERCER AÑO - Anual
    { num: 27, nombre: "Elaboración de Proyectos Productivos", año: 3 },
];

const prefix = 'db'; // Don Bosco
const subjectsOut = subjects.map(s => ({
    id: prefix + s.num,
    codigo: prefix.toUpperCase() + s.num,
    nombre: s.nombre,
    numero_materia: s.num,
    año: s.año,
}));

// No dependencies specified in the prompt, leaving empty for now.
const dependencies = [];

const template = { subjects: subjectsOut, dependencies };
fs.writeFileSync('src/data/enologia_donbosco_template.json', JSON.stringify(template, null, 2));
console.log(`enologia don bosco done: ${template.subjects.length} subjects, ${template.dependencies.length} deps`);
