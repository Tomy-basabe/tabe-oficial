/**
 * TABE Security Module
 * Central security utilities for input validation, sanitization, 
 * rate limiting, and file upload restrictions.
 */
import { z } from "zod";

// ============================================================
// 14. INPUT VALIDATION SCHEMAS (Zod)
// ============================================================

/** Auth form validation */
export const loginSchema = z.object({
  email: z.string()
    .email("Email inválido")
    .max(255, "Email demasiado largo")
    .transform(v => v.toLowerCase().trim()),
  password: z.string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(128, "La contraseña es demasiado larga"),
});

export const signupSchema = loginSchema.extend({
  nombre: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre es demasiado largo")
    .regex(/^[a-zA-ZáéíóúñÁÉÍÓÚÑüÜ\s'-]+$/, "El nombre contiene caracteres no válidos")
    .transform(v => v.trim()),
});

export const resetPasswordSchema = z.object({
  email: z.string()
    .email("Email inválido")
    .max(255)
    .transform(v => v.toLowerCase().trim()),
});

export const newPasswordSchema = z.object({
  password: z.string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(128, "La contraseña es demasiado larga"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

/** Contact form validation */
export const contactFormSchema = z.object({
  nombre: z.string().min(2).max(100).transform(v => v.trim()),
  email: z.string().email().max(255).transform(v => v.toLowerCase().trim()),
  mensaje: z.string().min(10, "El mensaje debe tener al menos 10 caracteres").max(2000, "El mensaje es demasiado largo"),
});

/** General text input validation */
export const textInputSchema = z.string()
  .max(10000, "El texto es demasiado largo")
  .transform(v => v.trim());

/** Subject/Deck name validation */
export const nameSchema = z.string()
  .min(1, "El nombre es requerido")
  .max(200, "El nombre es demasiado largo")
  .transform(v => v.trim());

/** Calendar event validation */
export const calendarEventSchema = z.object({
  titulo: z.string().min(1).max(200).transform(v => v.trim()),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
  tipo: z.string().max(50),
  subject_id: z.string().uuid().optional().nullable(),
  descripcion: z.string().max(2000).optional().nullable(),
  hora: z.string().max(10).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
});

// ============================================================
// 15. XSS SANITIZATION (DOMParser Tree Sanitizer)
// ============================================================

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

/**
 * Escapes HTML characters to prevent XSS injection.
 * Use this whenever rendering user-generated content outside React's JSX.
 */
export function escapeHtml(str: string): string {
  return String(str || "").replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

const ALLOWED_TAGS_SET = new Set([
  "strong", "em", "b", "i", "u", "br", "p", "ul", "ol", "li",
  "code", "pre", "span", "a", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "hr", "sub", "sup", "mark", "del",
  "table", "thead", "tbody", "tr", "td", "th",
]);

const ALLOWED_ATTRS_SET = new Set(["href", "title", "target", "rel", "class", "colspan", "rowspan"]);

function isSafeHref(rawHref: string): boolean {
  const normalized = rawHref.replace(/[\u0000-\u0020]+/g, "").toLowerCase();
  if (!normalized) return false;
  if (
    normalized.startsWith("https://") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("mailto:") ||
    normalized.startsWith("/") ||
    normalized.startsWith("#")
  ) {
    return true;
  }
  return false;
}

/**
 * Sanitizes an HTML string using an inert DOMParser tree walker.
 * Eliminates regex-bypass vectors (encoded control chars, nested tags, event handlers).
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  if (typeof DOMParser === "undefined") {
    return escapeHtml(html);
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const cleanNode = (node: Node): Node | null => {
      if (node.nodeType === Node.TEXT_NODE) {
        return document.createTextNode(node.textContent || "");
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }

      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      // Drop dangerous container tags completely with their contents
      if (["script", "style", "iframe", "object", "embed", "svg", "math", "form", "base", "meta", "link"].includes(tag)) {
        return null;
      }

      if (!ALLOWED_TAGS_SET.has(tag)) {
        // Unwrap disallowed tag but keep sanitized text/children
        const frag = document.createDocumentFragment();
        Array.from(el.childNodes).forEach((child) => {
          const cleaned = cleanNode(child);
          if (cleaned) frag.appendChild(cleaned);
        });
        return frag;
      }

      const safeEl = document.createElement(tag);
      for (const attr of Array.from(el.attributes)) {
        const attrName = attr.name.toLowerCase();
        if (!ALLOWED_ATTRS_SET.has(attrName)) continue;
        if (attrName === "href") {
          if (!isSafeHref(attr.value)) continue;
          safeEl.setAttribute("href", attr.value.trim());
          safeEl.setAttribute("rel", "noopener noreferrer");
        } else {
          safeEl.setAttribute(attrName, attr.value);
        }
      }

      Array.from(el.childNodes).forEach((child) => {
        const cleaned = cleanNode(child);
        if (cleaned) safeEl.appendChild(cleaned);
      });

      return safeEl;
    };

    const container = document.createElement("div");
    Array.from(doc.body.childNodes).forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) container.appendChild(cleaned);
    });
    return container.innerHTML;
  } catch {
    return escapeHtml(html);
  }
}

/**
 * Strips all HTML tags from a string, returning only text content.
 */
export function stripHtml(str: string): string {
  if (!str) return "";
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(str, "text/html");
      return doc.body.textContent || "";
    } catch {}
  }
  return str.replace(/<[^>]*>/g, "");
}

// ============================================================
// 16. FILE UPLOAD RESTRICTIONS & MAGIC BYTES VALIDATION
// ============================================================

/** Allowed MIME types for file uploads */
export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
  ],
  image: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ],
  spreadsheet: [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ],
  presentation: [
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

/** All allowed MIME types flattened */
export const ALL_ALLOWED_MIME_TYPES = Object.values(ALLOWED_FILE_TYPES).flat();

/** Maximum file size: 25MB */
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

/** Maximum filename length */
export const MAX_FILENAME_LENGTH = 255;

/** Dangerous file extensions that should never be uploaded */
const DANGEROUS_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".com", ".scr", ".pif", ".msi",
  ".js", ".vbs", ".wsf", ".wsh", ".ps1", ".sh", ".bash",
  ".php", ".asp", ".aspx", ".jsp", ".cgi", ".py", ".rb",
  ".html", ".htm", ".xhtml", ".svg", ".xml",
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file before upload. Checks type, size, extension, and filename.
 * Strictly blocks SVG/HTML/XML MIME spoofing.
 */
export function validateFileUpload(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
  }

  if (file.size === 0) {
    return { valid: false, error: "El archivo está vacío" };
  }

  if (file.name.length > MAX_FILENAME_LENGTH) {
    return { valid: false, error: "El nombre del archivo es demasiado largo" };
  }

  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Tipo de archivo no permitido: ${ext}` };
  }

  // Strictly enforce explicit whitelist (never allow generic image/* like image/svg+xml)
  if (!ALL_ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `Tipo de archivo no soportado: ${file.type || "desconocido"}` };
  }

  const parts = file.name.split(".");
  if (parts.length > 2) {
    for (let i = 1; i < parts.length - 1; i++) {
      const innerExt = "." + parts[i].toLowerCase();
      if (DANGEROUS_EXTENSIONS.includes(innerExt)) {
        return { valid: false, error: "El archivo tiene una extensión doble no permitida" };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates binary Magic Bytes of a File to prevent MIME Spoofing (e.g. HTML/SVG renamed to .pdf or .png).
 */
export async function validateFileSignature(file: File): Promise<FileValidationResult> {
  const basic = validateFileUpload(file);
  if (!basic.valid) return basic;

  try {
    const blobSlice = file.slice(0, 16);
    const slice: ArrayBuffer =
      typeof blobSlice.arrayBuffer === "function"
        ? await blobSlice.arrayBuffer()
        : await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(blobSlice);
          });
    const bytes = new Uint8Array(slice);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const asciiPrefix = new TextDecoder("utf-8", { fatal: false }).decode(bytes).trim().toLowerCase();

    // Block HTML / SVG / Script masquerading as another file type
    if (
      asciiPrefix.startsWith("<!doctype") ||
      asciiPrefix.startsWith("<html") ||
      asciiPrefix.startsWith("<svg") ||
      asciiPrefix.startsWith("<script") ||
      asciiPrefix.startsWith("<?xml")
    ) {
      return { valid: false, error: "Firma binaria rechazada: contenido HTML/SVG/XML ejecutable detectado" };
    }

    if (file.type === "application/pdf" && !hex.startsWith("25504446")) {
      return { valid: false, error: "El archivo no posee una firma binaria PDF válida (%PDF)" };
    }
    if (file.type === "image/png" && !hex.startsWith("89504E47")) {
      return { valid: false, error: "El archivo no posee una firma binaria PNG válida" };
    }
    if (file.type === "image/jpeg" && !hex.startsWith("FFD8FF")) {
      return { valid: false, error: "El archivo no posee una firma binaria JPEG válida" };
    }
    if (file.type === "image/gif" && !hex.startsWith("47494638")) {
      return { valid: false, error: "El archivo no posee una firma binaria GIF válida" };
    }
    if (file.type === "image/webp" && (!hex.startsWith("52494646") || !hex.slice(16, 24).startsWith("57454250"))) {
      return { valid: false, error: "El archivo no posee una firma binaria WEBP válida" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "No se pudo verificar la firma binaria del archivo" };
  }
}

// ============================================================
// 11. RATE LIMITING (Client-side)
// ============================================================

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  /** Maximum attempts allowed within the window */
  maxAttempts: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Lockout duration in milliseconds after exceeding maxAttempts */
  lockoutMs: number;
}

/** Default rate limit configs */
export const RATE_LIMITS = {
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 } as RateLimitConfig,
  signup: { maxAttempts: 3, windowMs: 60 * 60 * 1000, lockoutMs: 30 * 60 * 1000 } as RateLimitConfig,
  resetPassword: { maxAttempts: 3, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 } as RateLimitConfig,
  apiCall: { maxAttempts: 30, windowMs: 60 * 1000, lockoutMs: 60 * 1000 } as RateLimitConfig,
  fileUpload: { maxAttempts: 10, windowMs: 5 * 60 * 1000, lockoutMs: 5 * 60 * 1000 } as RateLimitConfig,
};

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterMs?: number;
}

/**
 * Client-side rate limiter. Returns whether the action is allowed and remaining attempts.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  let entry = rateLimitStore.get(key);

  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterMs: entry.lockedUntil - now,
    };
  }

  if (!entry || (now - entry.firstAttempt > config.windowMs)) {
    entry = { count: 1, firstAttempt: now, lockedUntil: null };
    rateLimitStore.set(key, entry);
    return { allowed: true, remainingAttempts: config.maxAttempts - 1 };
  }

  entry.count++;

  if (entry.count > config.maxAttempts) {
    entry.lockedUntil = now + config.lockoutMs;
    rateLimitStore.set(key, entry);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterMs: config.lockoutMs,
    };
  }

  rateLimitStore.set(key, entry);
  return { allowed: true, remainingAttempts: config.maxAttempts - entry.count };
}

/**
 * Resets the rate limit for a given key (e.g., after successful login).
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// ============================================================
// 19. HTTPS ENFORCEMENT
// ============================================================

/**
 * Ensures a URL uses HTTPS. Converts http:// to https://.
 */
export function enforceHttps(url: string): string {
  if (url.startsWith("http://") && !url.includes("localhost") && !url.includes("127.0.0.1")) {
    return url.replace("http://", "https://");
  }
  return url;
}

// ============================================================
// 8. FIELD MANIPULATION PROTECTION
// ============================================================

/**
 * Picks only allowed fields from an object, preventing mass-assignment attacks.
 * Use this before sending update payloads to Supabase.
 */
export function pickFields<T extends Record<string, unknown>>(
  obj: T,
  allowedFields: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const field of allowedFields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  return result;
}

/**
 * Validates that an object doesn't contain unexpected fields.
 * Returns the fields that are not in the allowed list.
 */
export function detectUnexpectedFields<T extends Record<string, unknown>>(
  obj: T,
  allowedFields: string[]
): string[] {
  return Object.keys(obj).filter(key => !allowedFields.includes(key));
}

// ============================================================
// 20. PRODUCCIÓN: ADVERTENCIA EN CONSOLA
// ============================================================

export function initSecurityProtection() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  if (import.meta.env.PROD) {
    setTimeout(() => {
      try {
        console.log(
          "%c¡ATENCIÓN! %cÁrea Protegida",
          "color: #ef4444; font-size: 24px; font-weight: 900;",
          "color: #f59e0b; font-size: 16px; font-weight: bold;"
        );
        console.log(
          "%cSi alguien te pidió copiar o pegar comandos aquí, es un intento de robo de cuenta (ataque de ingeniería social). Cerrá esta ventana inmediatamente.",
          "font-size: 13px; color: #94a3b8; font-weight: 500;"
        );
      } catch (_) {}
    }, 1000);
  }
}
