/**
 * Generates a unique ID (UUID style).
 * Uses crypto.randomUUID() if available (Secure Contexts/HTTPS).
 * Falls back to Math.random() based generator for non-secure contexts (Mobile via Local IP).
 */
export function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        try {
            return crypto.randomUUID();
        } catch (e) {
            // Fallback if randomUUID fails for any reason
        }
    }

    // Fallback for non-secure contexts (mobile via IP) or older browsers
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
