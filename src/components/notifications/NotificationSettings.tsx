import { Bell, BellOff, Clock, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NotificationSettings() {
  const {
    permission,
    isSupported,
    settings,
    isSubscribingPush,
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
    <div className="space-y-4">
      {/* Simple enable prompt if permission not granted */}
      {permission !== "granted" && (
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl border-2 border-foreground bg-muted text-muted-foreground flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_hsl(var(--foreground))]">
              <BellOff className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="font-black uppercase text-base text-foreground">Activar Notificaciones</h4>
              <p className="font-bold text-xs sm:text-sm text-muted-foreground mt-0.5">
                {permission === "denied"
                  ? "Notificaciones bloqueadas por el navegador. Habilitá los permisos en los ajustes de tu navegador."
                  : "Habilitá las alertas para recibir recordatorios de estudio y avisos de parciales."}
              </p>
            </div>
          </div>

          {permission !== "denied" && (
            <button
              onClick={handleEnableNotifications}
              disabled={isSubscribingPush}
              className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-[#00FF9D] text-black border-3 border-foreground shadow-[3px_3px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_0_#000] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto"
            >
              <Bell className="w-4 h-4 fill-black" />
              <span>{isSubscribingPush ? "Activando..." : "Permitir Notificaciones"}</span>
            </button>
          )}
        </div>
      )}

      {/* Settings Grid */}
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
                className="px-3.5 py-2.5 bg-background text-foreground rounded-xl border-2 border-foreground font-black text-sm w-full shadow-[2px_2px_0_0_hsl(var(--foreground))] focus:outline-none"
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
              <Select
                value={String(settings.daysBeforeExam)}
                onValueChange={(val) => updateSettings({ daysBeforeExam: Number(val) })}
              >
                <SelectTrigger className="w-full px-3.5 py-2.5 h-auto bg-background rounded-xl border-2 border-foreground font-black text-xs shadow-[2px_2px_0_0_hsl(var(--foreground))] focus:ring-0">
                  <SelectValue placeholder="Seleccionar anticipación" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-2 border-foreground shadow-[4px_4px_0_0_#000] rounded-xl">
                  <SelectItem value="1" className="font-bold cursor-pointer rounded-lg text-xs">
                    1 día antes (Recomendado)
                  </SelectItem>
                  <SelectItem value="2" className="font-bold cursor-pointer rounded-lg text-xs">
                    2 días antes
                  </SelectItem>
                  <SelectItem value="3" className="font-bold cursor-pointer rounded-lg text-xs">
                    3 días antes
                  </SelectItem>
                  <SelectItem value="7" className="font-bold cursor-pointer rounded-lg text-xs">
                    1 semana antes
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
