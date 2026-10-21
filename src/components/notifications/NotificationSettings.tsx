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
      <div className="rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xs">
        <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <BellOff className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">Las notificaciones no están soportadas en este navegador o entorno.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Aviso de activación de permisos */}
      {permission !== "granted" && (
        <div className="bg-white dark:bg-[#18181b] border border-zinc-200/90 dark:border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20 flex items-center justify-center shrink-0">
              <BellOff className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Activar Notificaciones Web</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                {permission === "denied"
                  ? "Las notificaciones están bloqueadas en tu navegador. Puedes habilitarlas desde los ajustes de sitio."
                  : "Habilita alertas para recibir recordatorios diarios de estudio y avisos previos a tus parciales."}
              </p>
            </div>
          </div>

          {permission !== "denied" && (
            <button
              onClick={handleEnableNotifications}
              disabled={isSubscribingPush}
              className="px-4 py-2 rounded-lg font-medium text-xs bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto shadow-2xs"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{isSubscribingPush ? "Activando..." : "Permitir Notificaciones"}</span>
            </button>
          )}
        </div>
      )}

      {/* Cuadrícula de opciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Recordatorios de estudio */}
        <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" strokeWidth={2} />
              </div>
              <div>
                <h4 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">Recordatorio Diario</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Aviso para mantener tu racha activa</p>
              </div>
            </div>
            <Switch
              checked={settings.studyReminders}
              onCheckedChange={(checked) => updateSettings({ studyReminders: checked })}
            />
          </div>

          {settings.studyReminders && (
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Hora del recordatorio</label>
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => updateSettings({ reminderTime: e.target.value })}
                className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 font-mono text-xs w-full focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>
          )}
        </div>        {/* Avisos de Exámenes */}
        <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 space-y-3.5 md:col-span-2 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" strokeWidth={2} />
              </div>
              <div>
                <h4 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">Avisos de Parciales y Exámenes</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Notificación previa a cada fecha de examen registrada en tu calendario</p>
              </div>
            </div>
            <Switch
              checked={settings.examReminders}
              onCheckedChange={(checked) => updateSettings({ examReminders: checked })}
            />
          </div>

          {settings.examReminders && (
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Anticipación del aviso</label>
              <Select
                value={String(settings.daysBeforeExam)}
                onValueChange={(val) => updateSettings({ daysBeforeExam: Number(val) })}
              >
                <SelectTrigger className="w-full px-3 py-2 h-auto bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 font-medium text-xs focus:ring-1 focus:ring-zinc-400">
                  <SelectValue placeholder="Seleccionar anticipación" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 shadow-lg rounded-xl">
                  <SelectItem value="1" className="font-medium cursor-pointer rounded-md text-xs">
                    1 día antes (Recomendado)
                  </SelectItem>
                  <SelectItem value="2" className="font-medium cursor-pointer rounded-md text-xs">
                    2 días antes
                  </SelectItem>
                  <SelectItem value="3" className="font-medium cursor-pointer rounded-md text-xs">
                    3 días antes
                  </SelectItem>
                  <SelectItem value="7" className="font-medium cursor-pointer rounded-md text-xs">
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
