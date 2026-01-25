import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PomodoroSettingsProps {
  settings: {
    work: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
  };
  onSettingsChange: (settings: {
    work: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
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
  const [localSettings, setLocalSettings] = useState(settings);

  const updateSetting = (key: keyof typeof localSettings, delta: number) => {
    if (isRunning) return;
    
    const limits: Record<keyof typeof localSettings, { min: number; max: number }> = {
      work: { min: 5, max: 60 },
      shortBreak: { min: 1, max: 15 },
      longBreak: { min: 5, max: 30 },
      longBreakInterval: { min: 2, max: 8 },
    };

    const newValue = Math.max(
      limits[key].min,
      Math.min(limits[key].max, localSettings[key] + delta)
    );

    const newSettings = { ...localSettings, [key]: newValue };
    setLocalSettings(newSettings);
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
                onClick={() => updateSetting(key, -1)}
                disabled={isRunning}
                className={cn(
                  "w-7 h-7 rounded-lg bg-secondary flex items-center justify-center transition-all",
                  isRunning
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-secondary/80 hover:scale-105 active:scale-95"
                )}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className={cn("font-display font-bold w-12 text-center", color)}>
                {localSettings[key]}
              </span>
              <button
                onClick={() => updateSetting(key, 1)}
                disabled={isRunning}
                className={cn(
                  "w-7 h-7 rounded-lg bg-secondary flex items-center justify-center transition-all",
                  isRunning
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-secondary/80 hover:scale-105 active:scale-95"
                )}
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground w-16">{unit}</span>
            </div>
          </div>
        ))}
      </div>
      {isRunning && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          ⏸️ Pausá el timer para cambiar la configuración
        </p>
      )}
    </div>
  );
}
