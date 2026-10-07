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

  // Sync exams & study reminders & pet reminders from Supabase into IndexedDB
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

      // Extraer datos de la mascota activa para programar recordatorios de cuidado
      let petInfo: any = undefined;
      try {
        const rawPets = localStorage.getItem("tabe_gochi_pets_v1");
        const activePetId = localStorage.getItem("tabe_gochi_active_pet_id_v1");
        if (rawPets) {
          const parsedPets = JSON.parse(rawPets);
          const currentPet = (Array.isArray(parsedPets) && parsedPets.length > 0)
            ? (parsedPets.find((p: any) => p.id === activePetId) || parsedPets[0])
            : null;
          if (currentPet) {
            petInfo = {
              name: currentPet.name || "tu mascota",
              hunger: currentPet.hunger ?? 100,
              health: currentPet.health ?? 100,
              isSick: !!currentPet.isSick,
              isDead: !!currentPet.isDead,
              lastUpdated: currentPet.lastUpdated || Date.now(),
              enabled: true,
            };
          }
        }
      } catch (_) {}

      await syncAlarmsToIndexedDB({
        studyReminderHour: studyHour,
        studyReminderMinute: studyMinute,
        studyReminderEnabled: studyEnabled,
        exams: formattedExams,
        pet: petInfo,
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

            // Disparador de cuidado de mascota
            if (petInfo) {
              // @ts-ignore
              await reg.showNotification(`🐾 ¡Cuidá a ${petInfo.name} en TABE! ❤️`, {
                body: "¡No olvides darle de comer y mimarla hoy para que no se enferme!",
                icon: "/pwa-192x192.png",
                badge: "/pwa-192x192.png",
                tag: "pet-reminder-9am",
                // @ts-ignore
                showTrigger: new (window as any).TimestampTrigger(next9AM.getTime() + 1000),
                data: { url: "/tabe-gotchi" },
                vibrate: [200, 100, 200]
              } as any);
            }
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
      className="no-comic fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-auto md:top-6 left-1/2 z-[1050] max-w-md w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-2rem)] bg-card border-3 sm:border-4 border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] rounded-2xl p-4 transition-none"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FFE600] border-2 border-foreground text-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
          <Bell className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-foreground">
              ¿Activar Notificaciones? 🔔
            </h4>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="No activar y cerrar"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
          <p className="text-[11px] sm:text-xs font-bold text-muted-foreground mt-1 leading-relaxed">
            Recibí avisos de exámenes y recordatorios de racha <span className="underline decoration-[#FFE600] decoration-2 text-foreground font-black">incluso con la app cerrada</span> en tu teléfono o PC.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleEnable}
              className="flex-1 bg-[#00FF9D] hover:bg-[#00E58D] text-black font-black text-xs uppercase px-3 py-2.5 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_#000] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Activar
            </button>
            <button
              onClick={handleDismiss}
              className="bg-secondary hover:bg-muted text-foreground font-black text-xs uppercase px-4 py-2.5 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-colors flex items-center justify-center cursor-pointer"
            >
              No
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
