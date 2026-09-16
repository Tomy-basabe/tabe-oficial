import { toast } from "sonner";
import { isGoogleCalendarConnected, performGoogleAutoSync } from "@/lib/googleCalendarSync";
import { isMoodleConnected, performMoodleAutoSync } from "@/lib/moodleService";

let _isGlobalSyncRunning = false;
let _lastGlobalSyncTime = 0;

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
 * Runs automatically upon app entry and tab visibility change without blocking UI.
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

  const now = Date.now();
  // Cooldown: at least 2 minutes between automatic sync runs unless explicitly forced
  if (!options?.force && now - _lastGlobalSyncTime < 2 * 60 * 1000) {
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
    return results;
  } catch (e) {
    console.warn("[GlobalCalendarSync] Error in global sync:", e);
    return results;
  } finally {
    _isGlobalSyncRunning = false;
  }
}
