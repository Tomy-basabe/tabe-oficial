import { useState, useEffect } from "react";
import { Bell, BellOff, Clock, Calendar, Smartphone, Radio, Send, Timer, Sparkles, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function NotificationSettings() {
  const {
    permission,
    isSupported,
    settings,
    pushStatus,
    isSubscribingPush,
    requestPermission,
    testNotification,
    testServerPush,
    scheduleThreeMinuteGreeting,
    updateSettings,
  } = useNotifications();

  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledTargetTime, setScheduledTargetTime] = useState<number | null>(() => {
    const saved = localStorage.getItem("tabe_test_push_scheduled_until");
    if (saved) {
      const time = parseInt(saved, 10);
      if (time > Date.now()) return time;
    }
    return null;
  });
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!scheduledTargetTime) {
      setRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((scheduledTargetTime - now) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        setScheduledTargetTime(null);
        localStorage.removeItem("tabe_test_push_scheduled_until");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [scheduledTargetTime]);

  const handleEnableNotifications = async () => {
    const ok = await requestPermission();
    if (ok) {
      // Iniciar el temporizador de 3 minutos visual en la UI
      const target = Date.now() + 180 * 1000;
      setScheduledTargetTime(target);
      localStorage.setItem("tabe_test_push_scheduled_until", target.toString());
    }
  };

  const handleScheduleThreeMinuteGreeting = async () => {
    setIsScheduling(true);
    try {
      const ok = await scheduleThreeMinuteGreeting(180);
      if (ok) {
        const target = Date.now() + 180 * 1000;
        setScheduledTargetTime(target);
        localStorage.setItem("tabe_test_push_scheduled_until", target.toString());
      }
    } finally {
      setIsScheduling(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="card-gamer rounded-xl p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <BellOff className="w-5 h-5" />
          <p>Las notificaciones no están soportadas en este navegador</p>
        </div>
      </div>
    );
  }

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Active 3-Minute Test Banner */}
      {scheduledTargetTime && remainingSeconds > 0 && (
        <div className="bg-[#FFE600] text-black border-4 border-foreground shadow-[6px_6px_0_0_#000] rounded-2xl p-4 sm:p-5 space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 bg-black text-[#FFE600] rounded-xl border-2 border-black shrink-0 animate-pulse">
                <Timer className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs uppercase px-2 py-0.5 rounded bg-black text-white">
                    Prueba en curso
                  </span>
                  <h4 className="font-black uppercase text-base">Notificación de saludo programada</h4>
                </div>
                <p className="font-bold text-xs sm:text-sm mt-0.5 opacity-90">
                  ¡Podés cerrar la app o bloquear el celular ahora! En <strong>{formatTimer(remainingSeconds)}</strong> te llegará la notificación push desde el servidor.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <div className="px-4 py-2 bg-black text-[#00FF9D] font-mono font-black text-xl rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]">
                {formatTimer(remainingSeconds)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission & Push Status Card */}
      <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={cn(
              "w-12 h-12 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center justify-center shrink-0",
              permission === "granted" 
                ? "bg-[#00FF9D] text-black" 
                : "bg-muted text-muted-foreground"
            )}>
              {permission === "granted" ? (
                <Bell className="w-6 h-6 text-black" strokeWidth={2.5} />
              ) : (
                <BellOff className="w-6 h-6" strokeWidth={2.5} />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-black uppercase text-base text-foreground">Notificaciones en Segundo Plano (PWA)</h4>
                {permission === "granted" ? (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#00FF9D] text-black border-2 border-foreground shadow-[1px_1px_0_0_#000]">
                    Activas
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border-2 border-foreground">
                    Desactivadas
                  </span>
                )}
                {pushStatus.isSubscribed && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#00E5FF] text-black border-2 border-foreground shadow-[1px_1px_0_0_#000] flex items-center gap-1">
                    <Radio className="w-3 h-3 animate-pulse" /> Web Push Conectado
                  </span>
                )}
              </div>
              <p className="font-bold text-xs sm:text-sm text-muted-foreground mt-1">
                {permission === "granted" 
                  ? "Las alertas te llegan incluso si tenés la app cerrada o el teléfono en reposo." 
                  : permission === "denied"
                  ? "Notificaciones bloqueadas por el navegador. Habilítalas en los permisos de sitio del navegador."
                  : "Activá las notificaciones para recibir alertas de parciales y rachas con la app cerrada."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {permission !== "granted" && (
              <button
                onClick={handleEnableNotifications}
                disabled={isSubscribingPush}
                className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-[#00FF9D] text-black border-3 border-foreground shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[1px] transition-all cursor-pointer flex items-center gap-2"
              >
                <Bell className="w-4 h-4 fill-black" />
                <span>{isSubscribingPush ? "Activando..." : "Permitir Notificaciones"}</span>
              </button>
            )}

            {permission === "granted" && (
              <>
                <button
                  onClick={handleScheduleThreeMinuteGreeting}
                  disabled={isScheduling}
                  className="px-4 py-2.5 rounded-xl bg-[#FFE600] text-black font-black uppercase text-xs border-2 border-foreground shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] transition-all flex items-center gap-2 cursor-pointer"
                  title="Programa una notificación de saludo para dentro de 3 minutos. Podés cerrar la app o bloquear el teléfono para comprobar que llega."
                >
                  <Timer className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {isScheduling ? "Programando..." : "Probar en 3 min (Cerrá la app) ⏰"}
                  </span>
                </button>

                <button
                  onClick={() => testServerPush()}
                  className="px-3 py-2.5 rounded-xl bg-[#00E5FF] text-black font-black uppercase text-xs border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Envía una notificación push instantánea desde el servidor"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Push Inmediata 📲</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Explicación de funcionamiento con app cerrada */}
        {permission === "granted" && (
          <div className="p-4 rounded-xl bg-muted/50 border-2 border-foreground/30 text-xs space-y-2.5">
            <div className="flex items-center gap-2 font-black uppercase text-foreground">
              <Smartphone className="w-4 h-4 text-[#00E5FF] shrink-0" />
              <span>¿Cómo funciona cuando la app está cerrada?</span>
            </div>
            <p className="font-bold text-muted-foreground leading-relaxed">
              TABE utiliza el estándar <strong className="text-foreground">Web Push y Alarmas en Segundo Plano del Service Worker</strong>. Tu dispositivo está registrado en la nube de TABE para despertar el Service Worker cuando haya un examen próximo o tu horario de estudio:
            </p>
            <ul className="list-disc list-inside font-bold text-foreground/85 space-y-1 pl-1">
              <li><strong>Solo con tener la app instalada (PWA):</strong> El sistema operativo (Google Play Services / Apple Push) recibe la alerta y muestra la notificación en tu barra de estado o pantalla de bloqueo sin necesidad de abrir la aplicación.</li>
              <li><strong>Android:</strong> Si tu celular tiene optimización agresiva de batería (Xiaomi/Samsung), poné TABE en <em>"Sin restricciones"</em> de batería en los Ajustes de Aplicaciones para que las alarmas lleguen puntuales.</li>
              <li><strong>iPhone (iOS):</strong> Requiere que hayas instalado TABE en la pantalla de inicio desde Safari (iOS 16.4+).</li>
            </ul>
          </div>
        )}
      </div>

      {/* Settings (only show if permission granted) */}
      {permission === "granted" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Study Reminders */}
          <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00E5FF] text-black border-2 border-foreground shadow-[2px_2px_0_0_#000] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-black uppercase text-sm text-foreground">Recordatorio Diario</h4>
                  <p className="font-bold text-xs text-muted-foreground">Aviso diario para mantener tu racha</p>
                </div>
              </div>
              <Switch
                checked={settings.studyReminders}
                onCheckedChange={(checked) => updateSettings({ studyReminders: checked })}
              />
            </div>

            {settings.studyReminders && (
              <div className="pt-3 border-t-2 border-border/70 space-y-1.5">
                <label className="text-xs font-black uppercase text-foreground">Hora del recordatorio</label>
                <input
                  type="time"
                  value={settings.reminderTime}
                  onChange={(e) => updateSettings({ reminderTime: e.target.value })}
                  className="px-3 py-2 bg-muted text-foreground rounded-lg border-2 border-foreground font-black text-sm w-full"
                />
              </div>
            )}
          </div>

          {/* Exam Reminders */}
          <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#BFFF00] text-black border-2 border-foreground shadow-[2px_2px_0_0_#000] flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-black uppercase text-sm text-foreground">Avisos de Exámenes</h4>
                  <p className="font-bold text-xs text-muted-foreground">Alertas antes de cada parcial o final</p>
                </div>
              </div>
              <Switch
                checked={settings.examReminders}
                onCheckedChange={(checked) => updateSettings({ examReminders: checked })}
              />
            </div>

            {settings.examReminders && (
              <div className="pt-3 border-t-2 border-border/70 space-y-1.5">
                <label className="text-xs font-black uppercase text-foreground">Anticipación de la alerta</label>
                <select
                  value={settings.daysBeforeExam}
                  onChange={(e) => updateSettings({ daysBeforeExam: Number(e.target.value) })}
                  className="px-3 py-2 bg-muted text-foreground rounded-lg border-2 border-foreground font-black text-xs w-full"
                >
                  <option value={1}>1 día antes (Recomendado)</option>
                  <option value={2}>2 días antes</option>
                  <option value={3}>3 días antes</option>
                  <option value={7}>1 semana antes</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
