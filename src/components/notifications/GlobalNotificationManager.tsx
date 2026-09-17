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
    <aside 
      aria-label="Aviso de notificaciones" 
      className="fixed top-[calc(4.75rem+env(safe-area-inset-top,0px))] lg:top-6 left-1/2 -translate-x-1/2 z-[1050] max-w-md w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-2rem)] bg-card border-3 sm:border-4 border-foreground shadow-[5px_5px_0_0_hsl(var(--foreground))] rounded-xl p-3.5 sm:p-4 animate-in fade-in slide-in-from-top-4"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 sm:p-2.5 bg-[#FFE600] border-2 border-foreground text-black rounded-lg font-black shrink-0 shadow-[1.5px_1.5px_0_0_#000]">
          <Bell className="w-5 h-5 animate-bounce" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-foreground">
              ¿Activar Notificaciones? 🔔
            </h4>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] sm:text-xs font-bold text-muted-foreground mt-1 leading-relaxed">
            Recibí avisos de exámenes y recordatorios de racha <span className="underline decoration-[#FFE600] decoration-2 text-foreground">incluso con la app cerrada</span> en tu celular o PC.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={isSubscribing}
              className="flex-1 bg-[#00FF9D] hover:bg-[#00E58D] text-black font-black text-xs uppercase px-3 py-2 rounded-lg border-2 border-foreground shadow-[2px_2px_0_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              {isSubscribing ? "Activando..." : "Activar Ahora"}
            </button>
            <button
              onClick={handleDismiss}
              className="bg-secondary hover:bg-muted text-foreground font-black text-xs uppercase px-3 py-2 rounded-lg border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center cursor-pointer"
            >
              Más tarde
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
