import { useState } from "react";
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

  const [localValues, setLocalValues] = useState<Partial<Record<NumericSettings, string>>>({});

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

    setLocalValues({ ...localValues, [key]: undefined });
    onSettingsChange({ ...settings, [key]: newValue });
  };

  const handleInputChange = (key: NumericSettings, value: string) => {
    if (isRunning) return;
    setLocalValues({ ...localValues, [key]: value });
  };

  const handleInputBlur = (key: NumericSettings) => {
    if (isRunning) return;
    
    const strVal = localValues[key];
    if (strVal === undefined) return; // Not edited

    let numValue = parseInt(strVal, 10);
    if (isNaN(numValue)) {
      numValue = settings[key]; // Revert to previous valid value
    } else {
      numValue = Math.max(
        LIMITS[key].min,
        Math.min(LIMITS[key].max, numValue)
      );
    }

    setLocalValues({ ...localValues, [key]: undefined });
    if (numValue !== settings[key]) {
      onSettingsChange({ ...settings, [key]: numValue });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, key: NumericSettings) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const settingsConfig = [
    { key: "work" as const, label: "TRABAJO", unit: "min", color: "text-[#FF6B6B]" },
    { key: "shortBreak" as const, label: "DESCANSO CORTO", unit: "min", color: "text-[#4ECDC4]" },
    { key: "longBreak" as const, label: "DESCANSO LARGO", unit: "min", color: "text-[#FFE66D]" },
    { key: "longBreakInterval" as const, label: "INTERVALO LARGO", unit: "pomodoros", color: "text-foreground" },
  ];

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-6 pb-4 border-b-4 border-foreground">
        <h3 className="font-display font-black text-xl uppercase tracking-wider text-foreground">CONFIGURACIÓN</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-muted text-foreground border-2 border-foreground hover:bg-[#ff3366] hover:text-black hover:border-black shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <X className="w-5 h-5 font-bold" />
        </button>
      </div>
      <div className="space-y-4">
        {settingsConfig.map(({ key, label, unit, color }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="font-bold text-foreground text-sm uppercase tracking-wider">{label}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateSetting(key, -1)}
                disabled={isRunning}
                className={cn(
                  "w-8 h-8 rounded-md bg-muted text-foreground border-2 border-foreground flex items-center justify-center transition-all shadow-[2px_2px_0_0_hsl(var(--foreground))]",
                  isRunning
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-[#00f0ff] hover:text-black hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] active:translate-y-[2px] active:shadow-none"
                )}
              >
                <Minus className="w-4 h-4 font-bold" />
              </button>
              <input
                type="number"
                value={localValues[key] !== undefined ? localValues[key] : settings[key].toString()}
                onChange={(e) => handleInputChange(key, e.target.value)}
                onBlur={() => handleInputBlur(key)}
                onKeyDown={(e) => handleKeyDown(e, key)}
                disabled={isRunning}
                className={cn(
                  "font-display font-black w-16 text-center bg-background border-[3px] border-foreground rounded-lg py-1 transition-all outline-none focus:ring-4 focus:ring-[#00f0ff] shadow-[2px_2px_0_0_hsl(var(--foreground))]",
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  color,
                  isRunning ? "cursor-not-allowed opacity-70" : "cursor-text hover:bg-muted/50"
                )}
              />
              <button
                type="button"
                onClick={() => updateSetting(key, 1)}
                disabled={isRunning}
                className={cn(
                  "w-8 h-8 rounded-md bg-muted text-foreground border-2 border-foreground flex items-center justify-center transition-all shadow-[2px_2px_0_0_hsl(var(--foreground))]",
                  isRunning
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-[#00f0ff] hover:text-black hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] active:translate-y-[2px] active:shadow-none"
                )}
              >
                <Plus className="w-4 h-4 font-bold" />
              </button>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground w-16">{unit}</span>
            </div>
          </div>
        ))}
        
        {/* Sound Type */}
        <div className="flex items-center justify-between pt-6 mt-4 border-t-4 border-foreground">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-foreground" />
            <span className="font-bold text-foreground text-sm uppercase tracking-wider">Sonido de Alarma</span>
          </div>
          <div className="w-40 relative">
            <Select 
              value={settings.soundType} 
              onValueChange={(val: SoundType) => onSettingsChange({ ...settings, soundType: val })}
              disabled={isRunning}
            >
              <SelectTrigger className="h-10 text-xs font-bold bg-background border-[3px] border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-lg">
                <SelectValue placeholder="Sonido" />
              </SelectTrigger>
              <SelectContent className="border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] font-bold rounded-xl bg-background">
                <SelectItem value="classic" className="focus:bg-[#FFE66D] focus:text-black">Clásico (Beep)</SelectItem>
                <SelectItem value="zen" className="focus:bg-[#4ECDC4] focus:text-black">Zen (Campana)</SelectItem>
                <SelectItem value="arcade" className="focus:bg-[#FF6B6B] focus:text-black">Arcade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Continuous Alarm */}
        <div className="flex items-center justify-between pt-4 border-t-2 border-dashed border-foreground/30 mt-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Repeat className="w-5 h-5 text-foreground" />
              <span className="font-bold text-foreground text-sm uppercase tracking-wider">Alarma Continua</span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground ml-7 uppercase tracking-wider">Suena hasta detenerla</span>
          </div>
          <Switch 
            checked={settings.continuousAlarm}
            onCheckedChange={(checked) => onSettingsChange({ ...settings, continuousAlarm: checked })}
            disabled={isRunning}
            className="border-2 border-foreground data-[state=checked]:bg-[#00ff9d]"
          />
        </div>
      </div>
      {isRunning && (
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-6 text-center bg-muted p-2 rounded-lg border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]">
          ⏸️ Pausá el timer para cambiar la configuración
        </p>
      )}
    </div>
  );
}
