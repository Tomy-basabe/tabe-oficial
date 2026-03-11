import { Minus, Plus, X, Volume2, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SoundType } from "@/contexts/PomodoroContext";

interface PomodoroSettingsProps {
  settings: {
    work: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
    soundType: SoundType;
    continuousAlarm: boolean;
  };
  onSettingsChange: (settings: {
    work: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
    soundType: SoundType;
    continuousAlarm: boolean;
  }) => void;
  onClose: () => void;
  isRunning: boolean;
}

export function PomodoroSettings({
  settings,
  onSettingsChange,
  onClose,
  isRunning,
}: PomodoroSettingsProps) {
  type NumericSettings = Exclude<keyof typeof settings, "soundType" | "continuousAlarm">;

  const updateSetting = (key: NumericSettings, delta: number) => {
    if (isRunning) return;
    
    const limits: Record<NumericSettings, { min: number; max: number }> = {
      work: { min: 5, max: 60 },
      shortBreak: { min: 1, max: 15 },
      longBreak: { min: 5, max: 30 },
      longBreakInterval: { min: 2, max: 8 },
    };

    const newValue = Math.max(
      limits[key].min,
      Math.min(limits[key].max, settings[key] + delta)
    );

    const newSettings = { ...settings, [key]: newValue };
    onSettingsChange(newSettings);
  };

  const settingsConfig = [
    { key: "work" as const, label: "Trabajo", unit: "min", color: "text-neon-cyan" },
    { key: "shortBreak" as const, label: "Descanso corto", unit: "min", color: "text-neon-green" },
    { key: "longBreak" as const, label: "Descanso largo", unit: "min", color: "text-neon-purple" },
    { key: "longBreakInterval" as const, label: "Intervalo descanso largo", unit: "pomodoros", color: "text-neon-gold" },
  ];

  return (
    <div className="card-gamer rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Configuración</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-4">
        {settingsConfig.map(({ key, label, unit, color }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">{label}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateSetting(key, -1)}
                disabled={isRunning}
                className={cn(
                  "w-8 h-8 rounded-lg bg-secondary flex items-center justify-center transition-all",
                  isRunning
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-primary/20 hover:text-primary hover:scale-105 active:scale-95"
                )}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className={cn("font-display font-bold w-12 text-center", color)}>
                {settings[key]}
              </span>
              <button
                type="button"
                onClick={() => updateSetting(key, 1)}
                disabled={isRunning}
                className={cn(
                  "w-8 h-8 rounded-lg bg-secondary flex items-center justify-center transition-all",
                  isRunning
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-primary/20 hover:text-primary hover:scale-105 active:scale-95"
                )}
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground w-16">{unit}</span>
            </div>
          </div>
        ))}
        
        {/* Sound Type */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground text-sm">Sonido de Alarma</span>
          </div>
          <div className="w-32">
            <Select 
              value={settings.soundType} 
              onValueChange={(val: SoundType) => onSettingsChange({ ...settings, soundType: val })}
              disabled={isRunning}
            >
              <SelectTrigger className="h-8 text-xs bg-secondary border-none">
                <SelectValue placeholder="Sonido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Clásico (Beep)</SelectItem>
                <SelectItem value="zen">Zen (Campana)</SelectItem>
                <SelectItem value="arcade">Arcade (Despertador)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Continuous Alarm */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground text-sm">Alarma Continua</span>
            </div>
            <span className="text-[10px] text-muted-foreground ml-6">Suena hasta que la detengas</span>
          </div>
          <Switch 
            checked={settings.continuousAlarm}
            onCheckedChange={(checked) => onSettingsChange({ ...settings, continuousAlarm: checked })}
            disabled={isRunning}
          />
        </div>
      </div>
      {isRunning && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          ⏸️ Pausá el timer para cambiar la configuración
        </p>
      )}
    </div>
  );
}
