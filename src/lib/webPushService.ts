import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY } from "@/config/vapid";

// Helper to convert base64url to Uint8Array for PushManager
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushSubscriptionStatus {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  endpoint?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET CURRENT PUSH STATUS
// ─────────────────────────────────────────────────────────────────────────────
export async function getPushSubscriptionStatus(): Promise<PushSubscriptionStatus> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return {
      isSupported: false,
      isSubscribed: false,
      permission: typeof Notification !== "undefined" ? Notification.permission : "denied",
    };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return {
      isSupported: true,
      isSubscribed: !!sub,
      permission: Notification.permission,
      endpoint: sub?.endpoint,
    };
  } catch (error) {
    console.warn("Error getting push subscription status:", error);
    return {
      isSupported: true,
      isSubscribed: false,
      permission: Notification.permission,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SUBSCRIBE USER TO WEB PUSH & SAVE TO SUPABASE
// ─────────────────────────────────────────────────────────────────────────────
export async function subscribeUserToPush(userId: string): Promise<PushSubscription | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push notifications are not supported in this browser environment");
    return null;
  }

  if (Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      return null;
    }
  }

  try {
    // Ensure service worker is actively registered
    let reg: ServiceWorkerRegistration | undefined;
    try {
      reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    } catch (_) {
      reg = await navigator.serviceWorker.getRegistration();
    }

    if (!reg) {
      reg = await navigator.serviceWorker.ready;
    }

    // Wait briefly if installing
    if (reg.installing || reg.waiting) {
      await Promise.race([
        new Promise<void>((resolve) => {
          const sw = reg?.installing || reg?.waiting;
          sw?.addEventListener("statechange", () => {
            if (sw?.state === "activated") resolve();
          });
        }),
        new Promise((resolve) => setTimeout(resolve, 2000))
      ]);
    }

    let sub = await reg.pushManager.getSubscription();

    // If no subscription, subscribe using VAPID public key
    if (!sub) {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    // Extract subscription keys
    const rawSub = sub.toJSON();
    const endpoint = sub.endpoint;
    const p256dh = rawSub.keys?.p256dh;
    const auth = rawSub.keys?.auth;

    if (endpoint && p256dh && auth) {
      // 1. Guardar vía Edge Function con service_role para garantizar 100% éxito sin bloqueos de RLS
      try {
        const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke("send-web-push", {
          body: {
            action: "save_subscription",
            user_id: userId,
            endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent,
          },
        });
        if (edgeErr) {
          console.warn("Edge function save_subscription warning:", edgeErr);
        } else {
          console.log("Push subscription verified and saved on server:", edgeRes);
        }
      } catch (fErr) {
        console.warn("Could not save subscription via edge function:", fErr);
      }

      // 2. Intentar también vía cliente directo
      try {
        await supabase
          .from("push_subscriptions" as any)
          .upsert({
            user_id: userId,
            endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString(),
          }, { onConflict: "endpoint" });
      } catch (upsertErr) {
        console.warn("Client-side upsert warning (handled):", upsertErr);
      }
    }

    // Register Periodic Background Sync if supported (Chromium PWA Android)
    if ("periodicSync" in reg) {
      try {
        const tags = await (reg as any).periodicSync.getTags();
        if (!tags.includes("tabe-periodic-sync")) {
          await (reg as any).periodicSync.register("tabe-periodic-sync", {
            minInterval: 12 * 60 * 60 * 1000, // 12 hours
          });
        }
      } catch (e) {
        console.debug("Periodic sync registration not permitted:", e);
      }
    }

    return sub;
  } catch (error) {
    console.error("Error subscribing to Web Push:", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SYNC OFFLINE ALARMS TO INDEXEDDB (FOR SERVICE WORKER)
// ─────────────────────────────────────────────────────────────────────────────
export interface SyncAlarmsParams {
  studyReminderHour: number;
  studyReminderMinute: number;
  studyReminderEnabled: boolean;
  exams: Array<{
    id: string;
    title: string;
    examType: string;
    date: string;
    daysBefore: number;
  }>;
}

export function syncAlarmsToIndexedDB(params: SyncAlarmsParams): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return resolve();
    }

    const request = indexedDB.open("tabe_alarms_db", 1);

    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("alarms")) {
        db.createObjectStore("alarms", { keyPath: "id" });
      }
    };

    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction("alarms", "readwrite");
      const store = tx.objectStore("alarms");

      // Store study reminder
      store.put({
        id: "study_reminder",
        hour: params.studyReminderHour,
        minute: params.studyReminderMinute,
        enabled: params.studyReminderEnabled,
        lastSentDate: null,
      });

      // Store upcoming exams
      params.exams.forEach((ex) => {
        store.put({
          id: `exam_${ex.id}`,
          type: "exam",
          title: ex.title,
          examType: ex.examType,
          examDate: ex.date,
          daysBefore: ex.daysBefore,
          lastSentDate: null,
        });
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    };

    request.onerror = () => resolve();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SEND TEST PUSH VIA EDGE FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
export async function sendTestWebPush(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-web-push", {
      body: {
        action: "test_push",
        user_id: userId,
        title: "¡Prueba Web Push de TABE! 🎓",
        body: "¡Las notificaciones en tu celular están funcionando incluso con la app cerrada!",
        url: "/dashboard",
      },
    });

    if (error) {
      throw error;
    }

    return {
      success: data?.success ?? false,
      message: data?.message || "Notificación enviada al dispositivo",
    };
  } catch (error: any) {
    console.error("Error sending test Web Push:", error);
    return {
      success: false,
      message: error?.message || "Error al enviar notificación Web Push",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SCHEDULE DELAYED GREETING (E.G. 3 MINUTES AFTER PERMISSION)
// ─────────────────────────────────────────────────────────────────────────────
export async function scheduleDelayedGreetingPush(
  userId: string,
  delaySeconds: number = 180,
  title?: string,
  body?: string
): Promise<{ success: boolean; message: string; delay_seconds?: number }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-web-push", {
      body: {
        action: "schedule_delayed_greeting",
        user_id: userId,
        delay_seconds: delaySeconds,
        title: title || "¡Hola de parte de TABE! 👋",
        body: body || "¡Funciona perfecto! Esta notificación te llegó 3 minutos después con la app cerrada. Ya estás al día para no perderte parciales ni entregas.",
        url: "/configuracion",
      },
    });

    if (error) {
      throw error;
    }

    return {
      success: data?.success ?? false,
      message: data?.message || "Notificación de prueba programada con éxito.",
      delay_seconds: data?.delay_seconds ?? delaySeconds,
    };
  } catch (error: any) {
    console.error("Error scheduling delayed greeting Web Push:", error);
    return {
      success: false,
      message: error?.message || "Error al programar la notificación en el servidor",
    };
  }
}
