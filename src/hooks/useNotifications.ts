import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface NotificationSettings {
  studyReminders: boolean;
  examReminders: boolean;
  reminderTime: string; // HH:mm format
  daysBeforeExam: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  studyReminders: true,
  examReminders: true,
  reminderTime: "09:00",
  daysBeforeExam: 1,
};

export function useNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isSupported, setIsSupported] = useState(false);
  const reminderTimeoutRef = useRef<any>(null);

  useEffect(() => {
    // Check if notifications are supported
    const supported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }

    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem("notification_settings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (_) {}
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error("Las notificaciones no están soportadas en este navegador");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        toast.success("¡Notificaciones del sistema activadas!");

        // Initialize Service Worker notification capability
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            if (reg.active) {
              reg.active.postMessage({ type: "INIT_NOTIFICATIONS" });
            }
          }).catch((err) => console.warn("SW ready check error:", err));
        }

        return true;
      } else if (result === "denied") {
        toast.error("Notificaciones bloqueadas. Habilítalas en la configuración de tu navegador o celular");
        return false;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  // Send notification using ServiceWorkerRegistration (Required for mobile Android & iOS PWAs)
  const sendNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (permission !== "granted") return;

    // 1. Preferred: Service Worker (works when app is standalone PWA, backgrounded or closed)
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          const swOptions = {
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            vibrate: [200, 100, 200],
            requireInteraction: true,
            ...options,
          };
          return await reg.showNotification(title, swOptions as any);
        }
      } catch (swErr) {
        console.warn("ServiceWorker showNotification failed, trying fallback:", swErr);
      }
    }

    // 2. Desktop browser fallback only if ServiceWorker is not available
    try {
      const notification = new Notification(title, {
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }, [permission]);

  // Immediate test notification for diagnostics
  const testNotification = useCallback(async () => {
    if (permission !== "granted") {
      const ok = await requestPermission();
      if (!ok) return false;
    }

    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification("¡Prueba de Notificación de TABE! 🎓", {
            body: "¡Las notificaciones en tu dispositivo están funcionando perfectamente, incluso en segundo plano!",
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            tag: "tabe-test-notification",
            data: { url: "/dashboard" },
            vibrate: [200, 100, 200],
            requireInteraction: true
          } as any);
          toast.success("¡Notificación de prueba enviada al sistema!");
          return true;
        }
      }

      new Notification("¡Prueba de Notificación de TABE! 🎓", {
        body: "¡Las notificaciones están activas en tu dispositivo!",
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
      });
      toast.success("¡Notificación de prueba enviada al sistema!");
      return true;
    } catch (e: any) {
      console.error("Error en notificación de prueba:", e);
      toast.error("No se pudo mostrar la notificación: " + (e?.message || "Error desconocido"));
      return false;
    }
  }, [permission, requestPermission]);

  const scheduleStudyReminder = useCallback(async () => {
    if (!settings.studyReminders || permission !== "granted") return;

    const now = new Date();
    const [hours, minutes] = settings.reminderTime.split(":").map(Number);
    const reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const timeUntilReminder = reminderTime.getTime() - now.getTime();

    // 1. Schedule via Service Worker thread so it persists when tab/window sleeps
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;

        // Use Notification Triggers API if supported by browser/Android PWA
        // @ts-ignore
        if (typeof window !== "undefined" && window.Notification && "showTrigger" in Notification.prototype && (window as any).TimestampTrigger) {
          try {
            // @ts-ignore
            await reg.showNotification("¡Hora de estudiar! 📚", {
              body: "Mantené tu racha de estudio. ¡Solo unos minutos hacen la diferencia!",
              icon: "/pwa-192x192.png",
              badge: "/pwa-192x192.png",
              tag: "study-reminder-trigger",
              // @ts-ignore
              showTrigger: new (window as any).TimestampTrigger(reminderTime.getTime()),
              data: { url: "/pomodoro" },
              vibrate: [200, 100, 200]
            } as any);
          } catch (trigErr) {
            console.warn("TimestampTrigger failed, using SW message:", trigErr);
          }
        }

        if (reg.active) {
          reg.active.postMessage({
            type: "SCHEDULE_NOTIFICATION",
            payload: {
              delay: timeUntilReminder,
              title: "¡Hora de estudiar! 📚",
              body: "Mantené tu racha de estudio activa en TABE. ¡Solo unos minutos hacen la diferencia!",
              url: "/pomodoro"
            }
          });
        }
      } catch (e) {
        console.warn("Could not register SW schedule:", e);
      }
    }

    // 2. In-memory timeout as backup while window is active
    if (reminderTimeoutRef.current) {
      clearTimeout(reminderTimeoutRef.current);
    }

    reminderTimeoutRef.current = setTimeout(() => {
      sendNotification("¡Hora de estudiar! 📚", {
        body: "Mantené tu racha de estudio. ¡Solo unos minutos hacen la diferencia!",
        tag: "study-reminder",
        data: { url: "/pomodoro" }
      } as any);
    }, timeUntilReminder);
  }, [settings, permission, sendNotification]);

  const checkUpcomingExams = useCallback(async () => {
    if (!user || !settings.examReminders || permission !== "granted") return;

    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + settings.daysBeforeExam);

      const { data: events } = await supabase
        .from("calendar_events")
        .select("titulo, fecha, tipo_examen")
        .eq("user_id", user.id)
        .neq("tipo_examen", "Estudio")
        .gte("fecha", today.toISOString().split("T")[0])
        .lte("fecha", futureDate.toISOString().split("T")[0]);

      if (events && events.length > 0) {
        events.forEach(event => {
          const eventDate = new Date(event.fecha);
          const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          const dayText = daysUntil === 0 ? "¡Hoy!" : daysUntil === 1 ? "mañana" : `en ${daysUntil} días`;

          sendNotification(`📝 ${event.tipo_examen}: ${event.titulo}`, {
            body: `Tenés un examen ${dayText}. ¡A no aflojar el repaso!`,
            tag: `exam-${event.fecha}`,
            data: { url: "/calendario" }
          } as any);
        });
      }
    } catch (error) {
      console.error("Error checking upcoming exams:", error);
    }
  }, [user, settings, permission, sendNotification]);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("notification_settings", JSON.stringify(updated));
    toast.success("Configuración de notificaciones guardada");
  }, [settings]);

  // Schedule reminders when settings change
  useEffect(() => {
    if (permission === "granted") {
      scheduleStudyReminder();
      checkUpcomingExams();

      // Re-check exams every 6 hours while active
      const examInterval = setInterval(checkUpcomingExams, 6 * 60 * 60 * 1000);
      return () => {
        clearInterval(examInterval);
        if (reminderTimeoutRef.current) {
          clearTimeout(reminderTimeoutRef.current);
        }
      };
    }
  }, [permission, scheduleStudyReminder, checkUpcomingExams]);

  return {
    permission,
    isSupported,
    settings,
    requestPermission,
    sendNotification,
    testNotification,
    updateSettings,
    checkUpcomingExams,
  };
}
