import { Bell, BellOff, Clock, Calendar, Sparkles, Smartphone, CheckCircle2, MessageSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export function NotificationSettings() {
  const {
    permission,
    isSupported,
    settings,
    requestPermission,
    testNotification,
    updateSettings,
  } = useNotifications();

  const handleEnableNotifications = async () => {
    await requestPermission();
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

  return (
    <div className="space-y-4">
      {/* Permission Status */}
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
              <div className="flex items-center gap-2">
                <h4 className="font-black uppercase text-base text-foreground">Notificaciones en tu Dispositivo (PWA)</h4>
                {permission === "granted" ? (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#00FF9D] text-black border-2 border-foreground shadow-[1px_1px_0_0_#000]">
                    Activas
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border-2 border-foreground">
                    Desactivadas
                  </span>
                )}
              </div>
              <p className="font-bold text-xs sm:text-sm text-muted-foreground mt-0.5">
                {permission === "granted" 
                  ? "Notificaciones del sistema habilitadas para funcionar en segundo plano." 
                  : permission === "denied"
                  ? "Notificaciones bloqueadas por el navegador o sistema operativo."
                  : "Activa las notificaciones para recibir alertas de exámenes y estudio."}
              </p>
            </div>
          </div>
          {permission !== "granted" && permission !== "denied" && (
            <button
              onClick={handleEnableNotifications}
              className="px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-[#00E5FF] text-black border-2 border-foreground shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] transition-all cursor-pointer shrink-0"
            >
              Activar Notificaciones
            </button>
          )}
          {permission === "granted" && (
            <button
              onClick={() => testNotification()}
              className="px-3.5 py-2.5 rounded-xl bg-[#FFE600] text-black font-black uppercase text-xs border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>Probar Notificación 🔔</span>
            </button>
          )}
        </div>

        {/* Guía para recibir notificaciones con la app cerrada */}
        {permission === "granted" && (
          <div className="p-4 rounded-xl bg-muted/50 border-2 border-foreground/30 text-xs space-y-2">
            <div className="flex items-center gap-2 font-black uppercase text-foreground">
              <Smartphone className="w-4 h-4 text-[#00E5FF] shrink-0" />
              <span>¿Cómo asegurarte de que lleguen con la app cerrada en tu celular?</span>
            </div>
            <p className="font-bold text-muted-foreground leading-relaxed">
              En dispositivos móviles (Android/iOS), el sistema operativo suspende las aplicaciones cerradas por defecto para ahorrar batería. Para que TABE te notifique con la app cerrada:
            </p>
            <ul className="list-disc list-inside font-bold text-foreground/85 space-y-1 pl-1">
              <li><strong>Android:</strong> Andá a Ajustes &gt; Aplicaciones &gt; TABE &gt; Batería &gt; Seleccioná <em>"Sin restricciones"</em> (para que el sistema no apague el Service Worker).</li>
              <li><strong>iPhone (iOS):</strong> Agregá TABE a la pantalla de inicio desde Safari para habilitar Web Push en segundo plano (requiere iOS 16.4 o superior).</li>
              <li><strong>WhatsApp / Telegram:</strong> Vinculá tu chat en la sección de arriba para recibir recordatorios proactivos con 100% de garantía aunque el teléfono esté en modo reposo.</li>
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
