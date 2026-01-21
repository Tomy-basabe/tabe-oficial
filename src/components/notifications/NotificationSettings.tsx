import { Bell, BellOff, Clock, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export function NotificationSettings() {
  const {
    permission,
    isSupported,
    settings,
    requestPermission,
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
    <div className="space-y-6">
      {/* Permission Status */}
      <div className="card-gamer rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              permission === "granted" 
                ? "bg-neon-green/20" 
                : "bg-secondary"
            )}>
              {permission === "granted" ? (
                <Bell className="w-6 h-6 text-neon-green" />
              ) : (
                <BellOff className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">Notificaciones Push</h3>
              <p className="text-sm text-muted-foreground">
                {permission === "granted" 
                  ? "Notificaciones activadas" 
                  : permission === "denied"
                  ? "Notificaciones bloqueadas"
                  : "Activa las notificaciones para recordatorios"}
              </p>
            </div>
          </div>
          {permission !== "granted" && permission !== "denied" && (
            <button
              onClick={handleEnableNotifications}
              className="px-4 py-2 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-lg font-semibold text-sm hover:shadow-lg transition-all"
            >
              Activar
            </button>
          )}
        </div>
      </div>

      {/* Settings (only show if permission granted) */}
      {permission === "granted" && (
        <>
          {/* Study Reminders */}
          <div className="card-gamer rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-neon-cyan/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-neon-cyan" />
                </div>
                <div>
                  <h3 className="font-semibold">Recordatorios de Estudio</h3>
                  <p className="text-sm text-muted-foreground">
                    Recibe un recordatorio diario para estudiar
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.studyReminders}
                onCheckedChange={(checked) => updateSettings({ studyReminders: checked })}
              />
            </div>

            {settings.studyReminders && (
              <div className="mt-4 pt-4 border-t border-border">
                <label className="text-sm text-muted-foreground">Hora del recordatorio</label>
                <input
                  type="time"
                  value={settings.reminderTime}
                  onChange={(e) => updateSettings({ reminderTime: e.target.value })}
                  className="mt-2 px-4 py-2 bg-secondary rounded-lg border border-border w-full"
                />
              </div>
            )}
          </div>

          {/* Exam Reminders */}
          <div className="card-gamer rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-neon-purple" />
                </div>
                <div>
                  <h3 className="font-semibold">Recordatorios de Exámenes</h3>
                  <p className="text-sm text-muted-foreground">
                    Notificaciones antes de tus exámenes
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.examReminders}
                onCheckedChange={(checked) => updateSettings({ examReminders: checked })}
              />
            </div>

            {settings.examReminders && (
              <div className="mt-4 pt-4 border-t border-border">
                <label className="text-sm text-muted-foreground">Días antes del examen</label>
                <select
                  value={settings.daysBeforeExam}
                  onChange={(e) => updateSettings({ daysBeforeExam: Number(e.target.value) })}
                  className="mt-2 px-4 py-2 bg-secondary rounded-lg border border-border w-full"
                >
                  <option value={1}>1 día antes</option>
                  <option value={2}>2 días antes</option>
                  <option value={3}>3 días antes</option>
                  <option value={7}>1 semana antes</option>
                </select>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
