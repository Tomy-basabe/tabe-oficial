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

  const LIMITS: Record<NumericSettings, { min: number; max: number }> = {
    work: { min: 1, max: 180 },
    shortBreak: { min: 1, max: 60 },
    longBreak: { min: 1, max: 60 },
    longBreakInterval: { min: 1, max: 20 },
  };

  const updateSetting = (key: NumericSettings, delta: number) => {
    if (isRunning) return;
    
    const newValue = Math.max(
      LIMITS[key].min,
      Math.min(LIMITS[key].max, settings[key] + delta)
    );

    onSettingsChange({ ...settings, [key]: newValue });
  };

  const handleInputChange = (key: NumericSettings, value: string) => {
    if (isRunning) return;
    
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    const newValue = Math.max(
      LIMITS[key].min,
      Math.min(LIMITS[key].max, numValue)
    );

    onSettingsChange({ ...settings, [key]: newValue });
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
              <input
                type="number"
                value={settings[key]}
                onChange={(e) => handleInputChange(key, e.target.value)}
                disabled={isRunning}
                className={cn(
                  "font-display font-bold w-12 text-center bg-transparent border-none focus:ring-1 focus:ring-primary/30 rounded transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  color,
                  isRunning ? "cursor-not-allowed opacity-70" : "hover:bg-secondary/50 focus:bg-secondary/80"
                )}
              />
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
