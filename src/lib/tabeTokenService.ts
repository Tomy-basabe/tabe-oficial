/**
 * Servicio de Tokens Únicos de Usuario para el Hub Universal de TABE.
 * Permite a Claude, ChatGPT y Gemini conectarse de forma segura a la cuenta del estudiante.
 * 
 * Diseñado con APIs Web estándar (TextEncoder/TextDecoder) para compatibilidad
 * total y libre de errores en navegadores web (sin dependencias de Buffer de Node.js).
 */

export const TABE_TOKEN_PREFIX = "tabe_usr_";

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Genera un código único determinista para el usuario a partir de su ID.
 * Compatible con cualquier entorno (browser y Node).
 */
export function encodeUserToken(userId: string): string {
  if (!userId) return "";
  try {
    const bytes = new TextEncoder().encode(userId);
    return `${TABE_TOKEN_PREFIX}${bytesToHex(bytes)}`;
  } catch {
    // Fallback simple si TextEncoder no estuviera disponible
    let hex = "";
    for (let i = 0; i < userId.length; i++) {
      hex += userId.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return `${TABE_TOKEN_PREFIX}${hex}`;
  }
}

/**
 * Decodifica un código único y retorna el ID del usuario si es válido.
 * Compatible con cualquier entorno (browser y Node).
 */
export function decodeUserToken(token: string): string | null {
  if (!token || typeof token !== "string") return null;
  const clean = token.trim().replace(/^Bearer\s+/i, "");
  if (!clean.startsWith(TABE_TOKEN_PREFIX)) return null;

  try {
    const hex = clean.slice(TABE_TOKEN_PREFIX.length);
    if (hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) return null;

    let userId = "";
    try {
      const bytes = hexToBytes(hex);
      userId = new TextDecoder().decode(bytes);
    } catch {
      for (let i = 0; i < hex.length; i += 2) {
        userId += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
      }
    }

    // Validar formato UUID aproximado (8-4-4-4-12) o al menos 20 caracteres alfanuméricos
    if (/^[0-9a-fA-F-]{20,40}$/.test(userId)) {
      return userId;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Valida si una cadena corresponde a un token válido de TABE.
 */
export function isValidUserToken(token: string): boolean {
  return decodeUserToken(token) !== null;
}
