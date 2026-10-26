/**
 * Algoritmo de generación de códigos de materia tipo acrónimo oficial.
 * Convierte nombres de materias en siglas limpias y representativas compuestas
 * de letras mayúsculas (y numerales romanos en mayúscula).
 *
 * Ejemplo:
 * "Comunicación Lingüística de Ciencias Exactas" => "CLCE"
 * "Análisis Matemático I" => "AMI"
 * "Álgebra y Geometría Analítica" => "AGA"
 */

const STOP_WORDS = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "en", "a", "al", "con", "para", "por", "o", "u", "sobre"
]);

const ROMAN_NUMS = new Set(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]);

const NUM_MAP: Record<string, string> = {
  "1": "I",
  "2": "II",
  "3": "III",
  "4": "IV",
  "5": "V",
  "6": "VI",
  "7": "VII",
  "8": "VIII",
  "9": "IX",
  "10": "X",
};

function cleanAscii(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

/**
 * Obtiene los tokens significativos de un nombre de materia,
 * omitiendo palabras vacías ("de", "la", etc.) y normalizando a mayúsculas.
 */
export function getSubjectTokens(name: string): string[] {
  // Remover texto secundario entre paréntesis si existe
  let cleanName = name.replace(/\(.*?\)/g, "").trim();
  if (!cleanName) cleanName = name;

  const rawTokens = cleanName.match(/[A-Za-z0-9áéíóúÁÉÍÓÚñÑüÜ]+/g) || [];
  const tokens: string[] = [];

  for (const t of rawTokens) {
    if (STOP_WORDS.has(t.toLowerCase())) continue;
    let c = cleanAscii(t);
    if (!c) continue;
    if (NUM_MAP[c]) {
      c = NUM_MAP[c];
    }
    tokens.push(c);
  }

  if (tokens.length === 0) {
    return rawTokens.map(cleanAscii).filter(Boolean);
  }

  return tokens;
}

/**
 * Genera el código abreviado base de una materia a partir de sus tokens.
 */
export function generateSubjectBaseCode(name: string): string {
  const tokens = getSubjectTokens(name);

  if (tokens.length === 0) return "MAT";

  // Una sola palabra: tomar 3 letras iniciales (ej. "Álgebra" => "ALG")
  if (tokens.length === 1) {
    const w = tokens[0];
    return w.length >= 3 ? w.slice(0, 3) : w;
  }

  // Una palabra y un número romano: (ej. "Matemática I" => "MATI", "Física II" => "FISII")
  if (tokens.length === 2 && ROMAN_NUMS.has(tokens[1])) {
    const root = tokens[0].length >= 3 ? tokens[0].slice(0, 3) : tokens[0];
    return root + tokens[1];
  }

  // Múltiples palabras: primera letra de cada palabra significativa.
  // Si la última es un numeral romano, conservarlo completo (ej. "AMI", "AMII", "CLCE").
  const chars: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i === tokens.length - 1 && ROMAN_NUMS.has(t)) {
      chars.push(t);
    } else {
      chars.push(t[0]);
    }
  }

  return chars.join("");
}

/**
 * Genera un código único asegurando que no colisione con códigos existentes en la carrera.
 */
export function generateUniqueSubjectCode(name: string, existingCodes: string[] = []): string {
  const base = generateSubjectBaseCode(name);
  const taken = new Set(existingCodes.map((c) => c.toUpperCase()));

  if (!taken.has(base)) return base;

  // Intentar desambiguar con 3 letras de la segunda palabra si existe
  const tokens = getSubjectTokens(name);
  if (tokens.length >= 2) {
    const first = tokens[0][0];
    const second = tokens[1].slice(0, 3);
    const suf = ROMAN_NUMS.has(tokens[tokens.length - 1]) ? tokens[tokens.length - 1] : "";
    const candidate = `${first}${second}${suf}`;
    if (!taken.has(candidate)) return candidate;
  }

  // Desambiguar agregando letras A, B, C...
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    const candidate = `${base}${letter}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${base}X`;
}
