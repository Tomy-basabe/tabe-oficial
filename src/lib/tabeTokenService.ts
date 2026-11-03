/**
 * Servicio de Tokens Únicos de Usuario para el Hub Universal de TABE.
 * Permite a Claude, ChatGPT y Gemini conectarse de forma segura a la cuenta del estudiante.
 */

export const TABE_TOKEN_PREFIX = "tabe_usr_";

/**
 * Genera un código único determinista para el usuario a partir de su ID.
 */
export function encodeUserToken(userId: string): string {
  if (!userId) return "";
  const hex = Buffer.from(userId, "utf8").toString("hex");
  return `${TABE_TOKEN_PREFIX}${hex}`;
}

/**
 * Decodifica un código único y retorna el ID del usuario si es válido.
 */
export function decodeUserToken(token: string): string | null {
  if (!token || typeof token !== "string") return null;
  const clean = token.trim().replace(/^Bearer\s+/i, "");
  if (!clean.startsWith(TABE_TOKEN_PREFIX)) return null;

  try {
    const hex = clean.slice(TABE_TOKEN_PREFIX.length);
    const userId = Buffer.from(hex, "hex").toString("utf8");
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
