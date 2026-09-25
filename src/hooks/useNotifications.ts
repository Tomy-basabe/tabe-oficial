import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  subscribeUserToPush, 
  sendTestWebPush, 
  scheduleDelayedGreetingPush,
  syncAlarmsToIndexedDB, 
  getPushSubscriptionStatus,
  PushSubscriptionStatus 
} from "@/lib/webPushService";
import { parseLocalDate, toLocalDateStr } from "@/lib/utils";

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
  const [pushStatus, setPushStatus] = useState<PushSubscriptionStatus>({
    isSupported: false,
    isSubscribed: false,
    permission: "default",
  });
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const reminderTimeoutRef = useRef<any>(null);

  // Check support and load initial state
  useEffect(() => {
    const supported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      getPushSubscriptionStatus().then(setPushStatus).catch(console.warn);
    }

    const savedSettings = localStorage.getItem("notification_settings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (_) {}
    }
  }, []);

  // Request permission & subscribe to Web Push
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error("Las notificaciones no están soportadas en este navegador");
      return false;
    }

    try {
      setIsSubscribingPush(true);
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        toast.success("¡Notificaciones activadas!");

        // Auto-subscribe to Web Push if logged in
        if (user) {
          const sub = await subscribeUserToPush(user.id);
          const newStatus = await getPushSubscriptionStatus();
          setPushStatus(newStatus);
          if (sub) {
            toast.success("¡Conectado al servicio Web Push! Llegarán con la app cerrada 📲");
          }
        }

        return true;
      } else if (result === "denied") {
        toast.error("Notificaciones bloqueadas en el dispositivo. Habilítalas en los ajustes del navegador");
        return false;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    } finally {
      setIsSubscribingPush(false);
    }
  }, [isSupported, user]);

  // Send local notification via Service Worker
  const sendNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (permission !== "granted") return;

    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          return await reg.showNotification(title, {
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            vibrate: [200, 100, 200],
            requireInteraction: true,
            ...options,
          } as any);
        }
      } catch (swErr) {
        console.warn("ServiceWorker showNotification failed:", swErr);
      }
    }

    try {
      return new Notification(title, {
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        ...options,
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }, [permission]);

  // Immediate local diagnostic test
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
            body: "¡Las notificaciones en tu dispositivo están funcionando correctamente!",
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            tag: "tabe-test-local",
            data: { url: "/dashboard" },
            vibrate: [200, 100, 200],
            requireInteraction: true
          } as any);
          toast.success("¡Notificación local enviada al sistema!");
          return true;
        }
      }

      new Notification("¡Prueba de Notificación de TABE! 🎓", {
        body: "¡Las notificaciones están activas en tu dispositivo!",
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
      });
      toast.success("¡Notificación local enviada al sistema!");
      return true;
    } catch (e: any) {
      console.error("Error en notificación de prueba:", e);
      toast.error("No se pudo mostrar la notificación: " + (e?.message || "Error"));
      return false;
    }
  }, [permission, requestPermission]);

  // Server-side Web Push test (Dispatches through FCM/Apple APNs to phone even if closed)
  const testServerPush = useCallback(async () => {
    if (!user) {
      toast.error("Debes iniciar sesión para probar las notificaciones Web Push");
      return false;
    }

    if (permission !== "granted") {
      const ok = await requestPermission();
      if (!ok) return false;
    }

    toast.info("Enviando Web Push desde el servidor al dispositivo...");

    // Make sure user is subscribed
    await subscribeUserToPush(user.id);
    const result = await sendTestWebPush(user.id);

    if (result.success) {
      toast.success("¡Push enviada desde el servidor! Bloqueá tu pantalla o cerrá la app para comprobar que llega 📲");
      const status = await getPushSubscriptionStatus();
      setPushStatus(status);
      return true;
    } else {
      toast.error(result.message || "No se pudo enviar la notificación Web Push");
      return false;
    }
  }, [user, permission, requestPermission]);

  // Schedule a test greeting 3 minutes from now (for testing closed app)
  const scheduleThreeMinuteGreeting = useCallback(async (customDelaySeconds: number = 180) => {
    if (!user) {
      toast.error("Debes iniciar sesión para programar el saludo de prueba");
      return false;
    }

    if (permission !== "granted") {
      const ok = await requestPermission();
      if (!ok) return false;
    }

    try {
      setIsSubscribingPush(true);
      await subscribeUserToPush(user.id);
      const res = await scheduleDelayedGreetingPush(
        user.id,
        customDelaySeconds,
        "¡Hola de parte de TABE! 👋",
        "¡Funciona perfecto! Esta notificación te llegó 3 minutos después con la app cerrada. Ya estás al día con tus parciales y tareas."
      );

      if (res.success) {
        toast.success(res.message || "¡Saludo programado! Cerrá la app o bloqueá la pantalla ahora para probar 📲");
        const status = await getPushSubscriptionStatus();
        setPushStatus(status);
        return true;
      } else {
        toast.error(res.message || "No se pudo programar la notificación");
        return false;
      }
    } catch (e: any) {
      toast.error(e?.message || "Error al programar la notificación");
      return false;
    } finally {
      setIsSubscribingPush(false);
    }
  }, [user, permission, requestPermission]);

  // Schedule reminders & sync with IndexedDB
  const scheduleStudyReminder = useCallback(async () => {
    if (!settings.studyReminders || permission !== "granted") return;

    const now = new Date();
    const [hours, minutes] = settings.reminderTime.split(":").map(Number);
    let reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const timeUntilReminder = reminderTime.getTime() - now.getTime();

    // 1. Sync alarm to IndexedDB so Service Worker has it offline
    syncAlarmsToIndexedDB({
      studyReminderHour: hours,
      studyReminderMinute: minutes,
      studyReminderEnabled: settings.studyReminders,
      exams: [], // exams synced separately
    });

    // 2. Schedule via Chromium Notification Triggers if supported
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        // @ts-ignore
        if (typeof window !== "undefined" && window.Notification && "showTrigger" in Notification.prototype && (window as any).TimestampTrigger) {
          try {
            // @ts-ignore
            await reg.showNotification("¡Hora de estudiar! 📚", {
              body: "Mantené tu racha de estudio activa en TABE.",
              icon: "/pwa-192x192.png",
              badge: "/pwa-192x192.png",
              tag: "study-reminder-trigger",
              // @ts-ignore
              showTrigger: new (window as any).TimestampTrigger(reminderTime.getTime()),
              data: { url: "/pomodoro" },
              vibrate: [200, 100, 200]
            } as any);
          } catch (_) {}
        }
      } catch (_) {}
    }

    // 3. In-memory backup while window is active
    if (reminderTimeoutRef.current) {
      clearTimeout(reminderTimeoutRef.current);
    }

    reminderTimeoutRef.current = setTimeout(() => {
      sendNotification("¡Hora de estudiar! 📚", {
        body: "Mantené tu racha de estudio activa en TABE. ¡Solo unos minutos hacen la diferencia!",
        tag: "study-reminder",
        data: { url: "/pomodoro" }
      } as any);
    }, timeUntilReminder);
  }, [settings, permission, sendNotification]);

  // Check upcoming exams & sync to IndexedDB
  const checkUpcomingExams = useCallback(async () => {
    if (!user || !settings.examReminders || permission !== "granted") return;

    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + settings.daysBeforeExam);

      const { data: events } = await supabase
        .from("calendar_events")
        .select("id, titulo, fecha, tipo_examen")
        .eq("user_id", user.id)
        .neq("tipo_examen", "Estudio")
        .gte("fecha", toLocalDateStr(today))
        .lte("fecha", toLocalDateStr(futureDate));

      if (events && events.length > 0) {
        // Sync to IndexedDB
        const [h, m] = settings.reminderTime.split(":").map(Number);
        syncAlarmsToIndexedDB({
          studyReminderHour: h,
          studyReminderMinute: m,
          studyReminderEnabled: settings.studyReminders,
          exams: events.map((e) => ({
            id: e.id,
            title: e.titulo,
            examType: e.tipo_examen,
            date: e.fecha,
            daysBefore: settings.daysBeforeExam,
          })),
        });

        events.forEach((event) => {
          const eventDate = parseLocalDate(event.fecha);
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

  useEffect(() => {
    if (permission === "granted") {
      scheduleStudyReminder();
      checkUpcomingExams();

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
    pushStatus,
    isSubscribingPush,
    requestPermission,
    sendNotification,
    testNotification,
    testServerPush,
    scheduleThreeMinuteGreeting,
    updateSettings,
    checkUpcomingExams,
  };
}
