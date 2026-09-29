import { toast } from "sonner";
import { isGoogleCalendarConnected, performGoogleAutoSync, isAutoSyncEnabled } from "@/lib/googleCalendarSync";
import { isMoodleConnected, performMoodleAutoSync } from "@/lib/moodleService";

let _isGlobalSyncRunning = false;
let _lastGlobalSyncTime = 0;

/**
 * Retorna true si hoy es miércoles (día 3 en getDay(), donde 0 es Domingo y 3 es Miércoles).
 */
export function isWednesdaySyncDay(): boolean {
  return new Date().getDay() === 3;
}

/**
 * Retorna true si ya se realizó la sincronización automática este miércoles para el usuario dado.
 */
export function hasSyncedThisWednesday(userId: string): boolean {
  if (typeof window === "undefined" || !userId) return false;
  const todayStr = new Date().toISOString().split("T")[0];
  const lastWednesday = localStorage.getItem(`tabe_last_wednesday_sync_${userId}`);
  return lastWednesday === todayStr;
}

export function markSyncedThisWednesday(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  const todayStr = new Date().toISOString().split("T")[0];
  localStorage.setItem(`tabe_last_wednesday_sync_${userId}`, todayStr);
}

export interface GlobalSyncResult {
  google?: {
    success: boolean;
    added: number;
    updated: number;
    message?: string;
  };
  moodle?: {
    success: boolean;
    added: number;
    updated: number;
    message?: string;
  };
}

/**
 * Performs a global background synchronization of all connected academic calendars
 * (Google Calendar and Moodle Campus Virtual).
 *
 * POLICY:
 * - Runs automatically in background ONLY on Wednesdays if the user has auto-sync enabled.
 * - Sinks at most once per Wednesday to prevent database and API saturation.
 * - If invoked manually with { force: true }, runs immediately regardless of day/cooldown.
 */
export async function performGlobalCalendarSync(
  user: any,
  options?: { force?: boolean; silent?: boolean }
): Promise<GlobalSyncResult> {
  if (!user || user.isGuest) return {};
  if (_isGlobalSyncRunning) {
    console.log("[GlobalCalendarSync] Sync already in progress, skipping concurrent run");
    return {};
  }

  const isForce = options?.force === true;

  // Política de sincronización automática semanal en background (solo los miércoles)
  if (!isForce) {
    // 1. Si el usuario desactivó la sincronización automática, omitir
    if (!isAutoSyncEnabled()) {
      console.log("[GlobalCalendarSync] Auto-sincronización deshabilitada por el usuario.");
      return {};
    }

    // 2. Solo sincronizar en segundo plano los miércoles (día 3)
    if (!isWednesdaySyncDay()) {
      console.log("[GlobalCalendarSync] Sincronización semanal programada solo para los miércoles. Hoy no es miércoles.");
      return {};
    }

    // 3. Si ya se sincronizó este miércoles, omitir para no saturar la base de datos
    if (hasSyncedThisWednesday(user.id)) {
      console.log("[GlobalCalendarSync] Ya se sincronizó hoy miércoles.");
      return {};
    }
  }

  const now = Date.now();
  // Cooldown de seguridad: mínimo 10 minutos entre ejecuciones manuales consecutivas
  if (!isForce && now - _lastGlobalSyncTime < 10 * 60 * 1000) {
    return {};
  }

  _isGlobalSyncRunning = true;
  _lastGlobalSyncTime = now;

  const results: GlobalSyncResult = {};

  try {
    const promises: Promise<any>[] = [];

    // 1. Google Calendar Auto-Sync (Permanent iCal or OAuth)
    if (isGoogleCalendarConnected(user)) {
      promises.push(
        performGoogleAutoSync(user.id, user.user_metadata)
          .then((res) => {
            results.google = res;
            if (res.success && (res.added > 0 || res.updated > 0)) {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("tabe_calendar_synced", { detail: { source: "google", ...res } }));
              }
              if (options?.silent === false) {
                toast.success(
                  `Google Calendar: ${res.added > 0 ? `${res.added} nuevos ` : ""}${res.updated > 0 ? `${res.updated} actualizados` : ""}`,
                  { icon: "📅", duration: 4000 }
                );
              }
            }
          })
          .catch((err) => {
            console.warn("[GlobalCalendarSync] Google sync error:", err);
          })
      );
    }

    // 2. Moodle Campus Virtual Auto-Sync
    if (isMoodleConnected(user?.user_metadata)) {
      promises.push(
        performMoodleAutoSync(user.id, user.user_metadata)
          .then((res) => {
            results.moodle = res;
            if (res.success && (res.added > 0 || res.updated > 0)) {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("tabe_calendar_synced", { detail: { source: "moodle", ...res } }));
              }
              if (options?.silent === false) {
                toast.success(
                  `Campus Virtual: ${res.added > 0 ? `${res.added} nuevas ` : ""}${res.updated > 0 ? `${res.updated} actualizadas` : ""}`,
                  { icon: "🎓", duration: 4000 }
                );
              }
            }
          })
          .catch((err) => {
            console.warn("[GlobalCalendarSync] Moodle sync error:", err);
          })
      );
    }

    await Promise.allSettled(promises);
    if (isWednesdaySyncDay()) {
      markSyncedThisWednesday(user.id);
    }
    return results;
  } catch (e) {
    console.warn("[GlobalCalendarSync] Error in global sync:", e);
    return results;
  } finally {
    _isGlobalSyncRunning = false;
  }
}
