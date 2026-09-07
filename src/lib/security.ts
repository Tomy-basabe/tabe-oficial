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
// 15. XSS SANITIZATION (Content Escaping)
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
  return str.replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Sanitizes a string for use in dangerouslySetInnerHTML.
 * Only allows safe formatting tags.
 */
export function sanitizeHtml(html: string): string {
  // Remove all tags except safe formatting ones
  const ALLOWED_TAGS = ["strong", "em", "b", "i", "u", "br", "p", "ul", "ol", "li", "code", "pre", "span", "a", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "hr", "sub", "sup", "mark", "del", "table", "thead", "tbody", "tr", "td", "th"];
  
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi;
  
  return html.replace(tagPattern, (match, tagName) => {
    if (ALLOWED_TAGS.includes(tagName.toLowerCase())) {
      // Strip dangerous attributes (on*, javascript:, data:)
      return match
        .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "")
        .replace(/\s+href\s*=\s*["']?\s*javascript:[^"'>]*/gi, "")
        .replace(/\s+src\s*=\s*["']?\s*data:[^"'>]*/gi, "");
    }
    return "";
  });
}

/**
 * Strips all HTML tags from a string, returning only text content.
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

// ============================================================
// 16. FILE UPLOAD RESTRICTIONS
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
    "image/svg+xml",
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
  ".html", ".htm", ".svg", // SVG can contain scripts when not from known sources
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file before upload. Checks type, size, extension, and filename.
 */
export function validateFileUpload(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
  }

  if (file.size === 0) {
    return { valid: false, error: "El archivo está vacío" };
  }

  // Check filename length
  if (file.name.length > MAX_FILENAME_LENGTH) {
    return { valid: false, error: "El nombre del archivo es demasiado largo" };
  }

  // Check for dangerous extensions
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Tipo de archivo no permitido: ${ext}` };
  }

  // Check MIME type
  if (!ALL_ALLOWED_MIME_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
    return { valid: false, error: `Tipo de archivo no soportado: ${file.type || "desconocido"}` };
  }

  // Check for double extensions (e.g., "file.pdf.exe")
  const parts = file.name.split(".");
  if (parts.length > 2) {
    const secondToLast = "." + parts[parts.length - 2].toLowerCase();
    if (DANGEROUS_EXTENSIONS.includes(secondToLast)) {
      return { valid: false, error: "El archivo tiene una extensión sospechosa" };
    }
  }

  return { valid: true };
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

  // Check if locked out
  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterMs: entry.lockedUntil - now,
    };
  }

  // Reset if window expired or no entry
  if (!entry || (now - entry.firstAttempt > config.windowMs)) {
    entry = { count: 1, firstAttempt: now, lockedUntil: null };
    rateLimitStore.set(key, entry);
    return { allowed: true, remainingAttempts: config.maxAttempts - 1 };
  }

  // Increment
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
