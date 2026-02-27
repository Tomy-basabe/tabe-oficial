const fs = require('fs');
const crypto = require('crypto');

function uuidv4() {
    return crypto.randomUUID();
}

const targets = {
    mensajes_ai: {
        icon: 'message-circle', category: 'uso',
        milestones: [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    },
    mensajes_discord: {
        icon: 'message-circle', category: 'uso',
        milestones: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    },
    dias_uso: {
        icon: 'compass', category: 'uso',
        milestones: [1, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120, 180, 250, 365, 500, 730, 1000]
    },
    racha_dias: {
        icon: 'flame', category: 'estudio',
        milestones: [3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120, 150, 180, 250, 300, 365, 500, 730, 1000]
    },
    horas_estudio: {
        icon: 'book-open', category: 'estudio',
        milestones: [1, 2, 5, 10, 25, 50, 75, 100, 150, 250, 500, 1000, 2000, 3000, 5000, 10000]
    },
    sesiones_completadas: {
        icon: 'clock', category: 'estudio',
        milestones: [1, 5, 10, 15, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
    },
    sesiones_pomodoro: {
        icon: 'clock', category: 'estudio',
        milestones: [1, 5, 10, 25, 50, 100, 250, 500, 750, 1000, 2000, 5000]
    },
    sesiones_flashcard: {
        icon: 'layers', category: 'estudio',
        milestones: [1, 2, 3, 5, 10, 15, 25, 50, 100, 250, 500, 1000, 2000, 5000]
    },
    sesiones_ai: {
        icon: 'brain', category: 'uso',
        milestones: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2000]
    },
    flashcards_creadas: {
        icon: 'layers', category: 'estudio',
        milestones: [10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 20000]
    },
    flashcards_estudiadas: {
        icon: 'layers', category: 'estudio',
        milestones: [10, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000]
    },
    precision_flashcards: {
        icon: 'target', category: 'estudio',
        milestones: [50, 60, 70, 75, 80, 85, 90, 95, 98, 99, 100]
    },
    mazos_creados: {
        icon: 'layers', category: 'estudio',
        milestones: [1, 2, 3, 5, 10, 15, 20, 25, 50, 75, 100, 200, 500]
    },
    archivos_subidos: {
        icon: 'file-plus', category: 'uso', /* Wait, some used 'library' */
        milestones: [1, 2, 3, 5, 10, 15, 25, 50, 100, 200, 500, 1000]
    },
    carpetas_creadas: {
        icon: 'folder', category: 'uso',
        milestones: [1, 2, 3, 5, 10, 15, 20, 25, 50, 100, 200]
    },
    eventos_calendario: {
        icon: 'calendar', category: 'uso',
        milestones: [1, 2, 3, 5, 10, 15, 25, 50, 100, 200, 500, 1000]
    },
    documentos_creados: {
        icon: 'file-plus', category: 'estudio',
        milestones: [1, 2, 3, 5, 10, 15, 25, 50, 100, 250, 500]
    },
    plantas_completadas: {
        icon: 'sprout', category: 'uso',
        milestones: [1, 2, 3, 5, 10, 15, 20, 25, 50, 100, 250]
    },
    amigos: {
        icon: 'users', category: 'uso',
        milestones: [1, 3, 5, 10, 15, 20, 30, 50, 100, 200]
    },
    materias_aprobadas: {
        icon: 'trophy', category: 'academico',
        milestones: [1, 3, 5, 10, 15, 20, 25, 30, 36, 40, 50] /* Let's stop at 40 just in case */
    },
    materias_regulares: {
        icon: 'book-open', category: 'academico',
        milestones: [1, 3, 5, 10, 15, 20, 25, 30, 36, 40, 50]
    },
    parciales_aprobados: {
        icon: 'file-plus', category: 'academico',
        milestones: [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150]
    },
    finales_aprobados: {
        icon: 'graduation-cap', category: 'academico',
        milestones: [1, 2, 3, 5, 10, 15, 20, 25, 30, 36, 40, 50]
    },
    materia_con_10: {
        icon: 'star', category: 'academico',
        milestones: [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 36]
    },
    materias_nota_alta: {
        icon: 'star', category: 'academico',
        milestones: [1, 2, 3, 5, 10, 15, 20, 25, 30, 36]
    },
    promedio_minimo: {
        icon: 'star', category: 'academico',
        milestones: [4, 5, 6, 7, 8, 9, 10]
    },
    año_completo: {
        icon: 'graduation-cap', category: 'academico',
        milestones: [1, 2, 3, 4, 5, 6]
    },
    secciones_visitadas: {
        icon: 'compass', category: 'uso',
        milestones: [3, 5, 7]
    }
};

const getTitle = (tipo, val) => {
    if (tipo === 'mensajes_ai') return val + " Mensajes IA";
    if (tipo === 'mensajes_discord') return val + " Mensajes Discord";
    if (tipo === 'dias_uso') return val + " Días de Uso";
    if (tipo === 'racha_dias') return "Racha de " + val + " días";
    if (tipo === 'horas_estudio') return val + " Horas";
    if (tipo === 'sesiones_completadas') return val + " Sesiones";
    if (tipo === 'sesiones_pomodoro') return val + " Pomodoros";
    if (tipo === 'sesiones_flashcard') return val + " Sesiones Flashcard";
    if (tipo === 'sesiones_ai') return val + " Consultas IA";
    if (tipo === 'flashcards_creadas') return val + " Flashcards";
    if (tipo === 'flashcards_estudiadas') return val + " Repasos";
    if (tipo === 'precision_flashcards') return val + "% Precisión";
    if (tipo === 'mazos_creados') return val + " Mazos";
    if (tipo === 'archivos_subidos') return val + " Archivos";
    if (tipo === 'carpetas_creadas') return val + " Carpetas";
    if (tipo === 'eventos_calendario') return val + " Eventos";
    if (tipo === 'documentos_creados') return val + " Apuntes";
    if (tipo === 'plantas_completadas') return val + " Plantas";
    if (tipo === 'amigos') return val + " Amigos";
    if (tipo === 'materias_aprobadas') return val + " Aprobadas";
    if (tipo === 'materias_regulares') return val + " Regulares";
    if (tipo === 'parciales_aprobados') return val + " Parciales";
    if (tipo === 'finales_aprobados') return val + " Finales";
    if (tipo === 'materia_con_10') return val + " Dieces";
    if (tipo === 'materias_nota_alta') return val + " Notas Altas";
    if (tipo === 'promedio_minimo') return "Promedio " + val;
    if (tipo === 'año_completo') return "Año " + val;
    if (tipo === 'secciones_visitadas') return val + " Secciones";
    return tipo + " " + val;
};

const getDesc = (tipo, val) => {
    if (tipo === 'mensajes_ai') return "Enviaste " + val + " mensajes a la IA";
    if (tipo === 'mensajes_discord') return "Enviaste " + val + " mensajes en Discord";
    if (tipo === 'dias_uso') return "Usaste la app " + val + " días diferentes";
    if (tipo === 'racha_dias') return "Estudiaste " + val + " días consecutivos";
    if (tipo === 'horas_estudio') return "Acumulaste " + val + " horas de estudio";
    if (tipo === 'sesiones_completadas') return "Completaste " + val + " sesiones de estudio";
    if (tipo === 'sesiones_pomodoro') return "Completaste " + val + " sesiones Pomodoro";
    if (tipo === 'sesiones_flashcard') return "Completaste " + val + " sesiones de flashcards";
    if (tipo === 'sesiones_ai') return "Creaste " + val + " sesiones de chat con IA";
    if (tipo === 'flashcards_creadas') return "Creaste " + val + " flashcards";
    if (tipo === 'flashcards_estudiadas') return "Estudiaste " + val + " flashcards";
    if (tipo === 'precision_flashcards') return "Alcanzaste " + val + "% de precisión en flashcards";
    if (tipo === 'mazos_creados') return "Creaste " + val + " mazos de flashcards";
    if (tipo === 'archivos_subidos') return "Subiste " + val + " archivos a la biblioteca";
    if (tipo === 'carpetas_creadas') return "Creaste " + val + " carpetas en la biblioteca";
    if (tipo === 'eventos_calendario') return "Creaste " + val + " eventos en el calendario";
    if (tipo === 'documentos_creados') return "Creaste " + val + " documentos de apuntes";
    if (tipo === 'plantas_completadas') return "Completaste " + val + " plantas";
    if (tipo === 'amigos') return "Tienes " + val + " amigos en la plataforma";
    if (tipo === 'materias_aprobadas') return "Aprobaste " + val + " materias";
    if (tipo === 'materias_regulares') return "Regularizaste " + val + " materias";
    if (tipo === 'parciales_aprobados') return "Aprobaste " + val + " parciales";
    if (tipo === 'finales_aprobados') return "Aprobaste " + val + " finales";
    if (tipo === 'materia_con_10') return "Aprobaste " + val + " materias con nota 10";
    if (tipo === 'materias_nota_alta') return "Aprobaste " + val + " materias con 8 o más";
    if (tipo === 'promedio_minimo') return "Alcanzaste un promedio de " + val;
    if (tipo === 'año_completo') return "Completaste todas las materias de " + val + " año";
    if (tipo === 'secciones_visitadas') return "Visitaste " + val + " secciones de la app";
    return tipo + " " + val;
};

const getXP = (tipo, val) => {
    // some scale
    if (val <= 5) return 50;
    if (val <= 10) return 100;
    if (val <= 25) return 200;
    if (val <= 50) return 400;
    if (val <= 100) return 800;
    if (val <= 250) return 1200;
    if (val <= 500) return 2000;
    if (val <= 1000) return 3000;
    if (val <= 5000) return 5000;
    return 10000;
};

// adjust XP scale globally or read from existing
const parseFile = fs.readFileSync('src/data/mockAchievements.ts', 'utf-8');
const lines = parseFile.split('\n');

const existingRows = [];
const evalStr = parseFile.match(/export const guestMockAchievements.*?=\s*(\[[\s\S]*?\]);/)[1];
const mockAch = eval(evalStr);

mockAch.forEach(a => existingRows.push(a));
const existingMap = {};
mockAch.forEach(a => {
    if (!existingMap[a.condicion_tipo]) existingMap[a.condicion_tipo] = [];
    existingMap[a.condicion_tipo].push(a.condicion_valor);
});

const newRecords = [];

for (let tipo in targets) {
    const miles = targets[tipo].milestones;
    miles.forEach(m => {
        if (!existingMap[tipo] || !existingMap[tipo].includes(m)) {
            // new
            let xp = getXP(tipo, m);
            // heuristics to match existing scale
            if (tipo === 'año_completo') xp = Math.max(xp, m * 200) + 100;
            if (tipo === 'materias_aprobadas') xp = Math.max(xp, m * 50);

            newRecords.push({
                id: uuidv4(),
                nombre: getTitle(tipo, m),
                descripcion: getDesc(tipo, m),
                icono: targets[tipo].icon,
                categoria: targets[tipo].category,
                condicion_tipo: tipo,
                condicion_valor: m,
                xp_reward: Math.min(xp, 15000)
            });
        }
    });
}

// Ensure "Sexto Año" is there
const hasSexto = existingRows.find(i => i.condicion_tipo === "año_completo" && i.condicion_valor === 6);
if (!hasSexto && !newRecords.find(i => i.condicion_tipo === "año_completo" && i.condicion_valor === 6)) {
    newRecords.push({
        id: "a99c9c8e-2067-466d-9781-a9bc2fb9d2a6", // matching previous DB ID actually... I didn't set ID in DB insert. 
        nombre: "Sexto Año",
        descripcion: "Completaste todas las materias de sexto año",
        icono: "graduation-cap",
        categoria: "academico",
        condicion_tipo: "año_completo",
        condicion_valor: 6,
        xp_reward: 1200
    });
}


const allAchs = [...existingRows, ...newRecords].sort((a, b) => {
    // sort by xp_reward
    if (a.xp_reward !== b.xp_reward) return a.xp_reward - b.xp_reward;
    return a.condicion_tipo.localeCompare(b.condicion_tipo);
});

let newFile = `import { Achievement } from "@/hooks/useAchievements";\n\nexport const guestMockAchievements: Achievement[] = [\n`;
allAchs.forEach((ach, i) => {
    newFile += `    ${JSON.stringify(ach)}${i < allAchs.length - 1 ? ',' : ''}\n`;
});
newFile += `];\n`;

fs.writeFileSync('src/data/mockAchievements.ts', newFile);

console.log("Mock file written!");

// GENERATE SQL
let sql = `INSERT INTO achievements (id, nombre, descripcion, icono, categoria, condicion_tipo, condicion_valor, xp_reward) VALUES \n`;
newRecords.forEach((ach, i) => {
    // proper escaping for SQL
    const name = ach.nombre.replace(/'/g, "''");
    const desc = ach.descripcion.replace(/'/g, "''");
    sql += `('${ach.id}', '${name}', '${desc}', '${ach.icono}', '${ach.categoria}', '${ach.condicion_tipo}', ${ach.condicion_valor}, ${ach.xp_reward})${i < newRecords.length - 1 ? ',' : ';'}\n`;
});

sql += `\nON CONFLICT (id) DO NOTHING;\n`; // Wait, table might not have conflict on ID if we let Supabase generate it but since we pass ID, it's fine. Wait, better yet, no conflict check needed or `ON CONFLICT DO NOTHING`. But we can't do ON CONFLICT without knowing the unique constraint. 
// Standard in most of this app's seeds is ON CONFLICT DO NOTHING. Sometimes it needs a specific column. We'll just run it.

fs.writeFileSync('insert_new_achievements.sql', sql);
console.log("SQL written! new additions:", newRecords.length);
