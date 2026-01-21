import { useState, useEffect, useCallback } from "react";
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

  useEffect(() => {
    // Check if notifications are supported
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }

    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem("notification_settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
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
        toast.success("¡Notificaciones activadas!");
        return true;
      } else if (result === "denied") {
        toast.error("Notificaciones bloqueadas. Habilítalas en la configuración del navegador");
        return false;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== "granted") return;

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

  const scheduleStudyReminder = useCallback(() => {
    if (!settings.studyReminders || permission !== "granted") return;

    const now = new Date();
    const [hours, minutes] = settings.reminderTime.split(":").map(Number);
    const reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const timeUntilReminder = reminderTime.getTime() - now.getTime();

    setTimeout(() => {
      sendNotification("¡Hora de estudiar! 📚", {
        body: "Mantén tu racha de estudio. ¡Solo unos minutos hacen la diferencia!",
        tag: "study-reminder",
      });
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
            body: `Tienes un examen ${dayText}. ¡Prepárate!`,
            tag: `exam-${event.fecha}`,
          });
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
    toast.success("Configuración guardada");
  }, [settings]);

  // Schedule reminders when settings change
  useEffect(() => {
    if (permission === "granted") {
      scheduleStudyReminder();
      checkUpcomingExams();
    }
  }, [permission, scheduleStudyReminder, checkUpcomingExams]);

  return {
    permission,
    isSupported,
    settings,
    requestPermission,
    sendNotification,
    updateSettings,
    checkUpcomingExams,
  };
}
