import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeUserToPush, syncAlarmsToIndexedDB, getPushSubscriptionStatus } from "@/lib/webPushService";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, X } from "lucide-react";

export function GlobalNotificationManager() {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    async function initNotifications() {
      if (typeof window === "undefined" || !("Notification" in window)) return;

      const status = await getPushSubscriptionStatus();

      // If already granted, auto-subscribe / refresh token in Supabase
      if (status.permission === "granted") {
        try {
          await subscribeUserToPush(user.id);
          await syncUpcomingAlarms(user.id);
        } catch (e) {
          console.warn("Auto-sync push error:", e);
        }
      } else if (status.permission === "default") {
        // Only show subtle prompt if user hasn't dismissed it in the last 7 days
        const dismissedUntil = localStorage.getItem("tabe_notif_prompt_dismissed");
        if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
          // Slight delay after app load so it doesn't interrupt navigation
          setTimeout(() => {
            if (isMounted) setShowPrompt(true);
          }, 3000);
        }
      }
    }

    initNotifications();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Sync exams & study reminders from Supabase into IndexedDB
  async function syncUpcomingAlarms(userId: string) {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 14); // Next 14 days

      const { data: events } = await supabase
        .from("calendar_events")
        .select("id, titulo, fecha, tipo_examen")
        .eq("user_id", userId)
        .neq("tipo_examen", "Estudio")
        .gte("fecha", today.toISOString().split("T")[0])
        .lte("fecha", futureDate.toISOString().split("T")[0]);

      const savedSettings = localStorage.getItem("notification_settings");
      let studyHour = 9;
      let studyMinute = 0;
      let studyEnabled = true;
      let daysBefore = 1;

      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.reminderTime) {
            const [h, m] = parsed.reminderTime.split(":").map(Number);
            studyHour = h;
            studyMinute = m;
          }
          if (typeof parsed.studyReminders === "boolean") {
            studyEnabled = parsed.studyReminders;
          }
          if (parsed.daysBeforeExam) {
            daysBefore = parsed.daysBeforeExam;
          }
        } catch (_) {}
      }

      const formattedExams = (events || []).map((e) => ({
        id: e.id,
        title: e.titulo,
        examType: e.tipo_examen,
        date: e.fecha,
        daysBefore,
      }));

      await syncAlarmsToIndexedDB({
        studyReminderHour: studyHour,
        studyReminderMinute: studyMinute,
        studyReminderEnabled: studyEnabled,
        exams: formattedExams,
      });
    } catch (e) {
      console.warn("Could not sync exams to IndexedDB:", e);
    }
  }

  const handleEnable = async () => {
    if (!user) return;
    setIsSubscribing(true);
    try {
      const sub = await subscribeUserToPush(user.id);
      if (sub) {
        await syncUpcomingAlarms(user.id);
        setShowPrompt(false);
      } else {
        setShowPrompt(false);
      }
    } catch (e) {
      console.error("Error activating push:", e);
      setShowPrompt(false);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Dismiss for 7 days
    localStorage.setItem("tabe_notif_prompt_dismissed", (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
  };

  if (!showPrompt) return null;

  return (
    <aside aria-label="Aviso de notificaciones" className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] md:w-96 bg-white dark:bg-black border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] p-4 animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-yellow-400 border-2 border-black dark:border-white text-black font-black flex-shrink-0">
          <Bell className="w-6 h-6 animate-bounce" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-sm uppercase tracking-wider text-black dark:text-white">
            ¿Activar Notificaciones? 🔔
          </h4>
          <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
            Recibí avisos de exámenes y recordatorios de racha <span className="underline decoration-yellow-400 decoration-2">incluso con la app cerrada</span> en tu celular o PC.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={isSubscribing}
              className="flex-1 bg-green-500 hover:bg-green-600 text-black font-black text-xs uppercase px-3 py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              {isSubscribing ? "Activando..." : "Activar Ahora"}
            </button>
            <button
              onClick={handleDismiss}
              className="bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 text-neutral-700 dark:text-neutral-200 font-bold text-xs px-2.5 py-2 border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px]"
              title="Más tarde"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
