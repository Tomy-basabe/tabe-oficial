import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeUserToPush, syncAlarmsToIndexedDB, getPushSubscriptionStatus } from "@/lib/webPushService";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, X } from "lucide-react";

import { isExamType } from "@/hooks/useCalendarEvents";

export function GlobalNotificationManager() {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);

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
        // Si el usuario ya respondió (activar o no), no volver a molestar nunca más
        const dismissed = localStorage.getItem("tabe_notif_prompt_dismissed");
        if (dismissed === "never") return;
        if (dismissed && Date.now() < Number(dismissed)) return;

        // Slight delay after app load so it doesn't interrupt navigation
        setTimeout(() => {
          if (isMounted) setShowPrompt(true);
        }, 3000);
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

      // Filtrar y clasificar eventos distinguiendo exámenes reales
      const formattedExams = (events || []).map((e) => ({
        id: e.id,
        title: e.titulo,
        examType: e.tipo_examen,
        isExam: isExamType(e.tipo_examen),
        date: e.fecha,
        daysBefore,
      }));

      await syncAlarmsToIndexedDB({
        studyReminderHour: studyHour,
        studyReminderMinute: studyMinute,
        studyReminderEnabled: studyEnabled,
        exams: formattedExams,
      });

      // Programar Notification Triggers a las 9 AM en navegadores compatibles (Chromium PWA)
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          // @ts-ignore
          if (typeof window !== "undefined" && window.Notification && "showTrigger" in Notification.prototype && (window as any).TimestampTrigger) {
            const next9AM = new Date(today.getFullYear(), today.getMonth(), today.getDate(), studyHour, studyMinute, 0);
            if (next9AM <= today) {
              next9AM.setDate(next9AM.getDate() + 1);
            }
            // Disparador de estudio diario
            // @ts-ignore
            await reg.showNotification("¡Hora de estudiar! 📚", {
              body: "Mantené tu racha de estudio activa en TABE.",
              icon: "/pwa-192x192.png",
              badge: "/pwa-192x192.png",
              tag: "study-reminder-9am",
              // @ts-ignore
              showTrigger: new (window as any).TimestampTrigger(next9AM.getTime()),
              data: { url: "/pomodoro" },
              vibrate: [200, 100, 200]
            } as any);
          }
        } catch (_) {}
      }
    } catch (e) {
      console.warn("Could not sync exams to IndexedDB:", e);
    }
  }

  const handleEnable = () => {
    if (!user) return;
    // Cerrar y marcar para no volver a molestar
    setShowPrompt(false);
    localStorage.setItem("tabe_notif_prompt_dismissed", "never");

    // Ejecutar la suscripción y sincronización de forma silenciosa en segundo plano
    (async () => {
      try {
        const sub = await subscribeUserToPush(user.id);
        if (sub) {
          await syncUpcomingAlarms(user.id);
        }
      } catch (e) {
        console.warn("Background push activation error:", e);
      }
    })();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Si tocan que no, no los volvemos a molestar nunca más
    localStorage.setItem("tabe_notif_prompt_dismissed", "never");
  };

  if (!showPrompt) return null;

  return (
    <aside 
      aria-label="Aviso de notificaciones" 
      style={{ transform: "translateX(-50%)" }}
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-auto md:top-6 left-1/2 z-[1050] max-w-md w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-2rem)] bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl p-4 sm:p-5 ring-1 ring-black/[0.04] dark:ring-white/[0.06] animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/15 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm tracking-tight text-foreground">
              Recordatorios y Fechas de Examen
            </h4>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
              title="No activar y cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs font-normal text-muted-foreground mt-1 leading-relaxed">
            Recibí avisos oportunos sobre tus entregas, parciales y metas diarias directamente en tu dispositivo, incluso con la pestaña cerrada.
          </p>
          <div className="flex items-center gap-2 mt-3.5">
            <button
              onClick={handleDismiss}
              className="px-3.5 py-2 rounded-xl border border-border bg-secondary/80 hover:bg-secondary text-secondary-foreground text-xs font-medium transition-colors cursor-pointer"
            >
              Ahora no
            </button>
            <button
              onClick={handleEnable}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium px-4 py-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Activar notificaciones
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
