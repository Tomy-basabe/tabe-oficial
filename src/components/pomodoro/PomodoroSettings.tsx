import { useState } from "react";
import { Minus, Plus, X, Volume2, Repeat, RotateCcw, PictureInPicture2, AlertCircle, Play, Check } from "lucide-react";
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
    autoPip?: boolean;
  };
  onSettingsChange: (settings: {
    work: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
    soundType: SoundType;
    continuousAlarm: boolean;
    autoPip: boolean;
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
  type NumericSettings = Exclude<keyof typeof settings, "soundType" | "continuousAlarm" | "autoPip">;

  const [localValues, setLocalValues] = useState<Partial<Record<NumericSettings, string>>>({});
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

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
    onSettingsChange({
      ...settings,
      autoPip: settings.autoPip ?? true,
      [key]: newValue,
    });
  };

  const handleInputChange = (key: NumericSettings, value: string) => {
    if (isRunning) return;
    setLocalValues({ ...localValues, [key]: value });
  };

  const handleInputBlur = (key: NumericSettings) => {
    if (isRunning) return;
    
    const strVal = localValues[key];
    if (strVal === undefined) return;

    let numValue = parseInt(strVal, 10);
    if (isNaN(numValue)) {
      numValue = settings[key];
    } else {
      numValue = Math.max(
        LIMITS[key].min,
        Math.min(LIMITS[key].max, numValue)
      );
    }

    setLocalValues({ ...localValues, [key]: undefined });
    if (numValue !== settings[key]) {
      onSettingsChange({
        ...settings,
        autoPip: settings.autoPip ?? true,
        [key]: numValue,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, key: NumericSettings) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const playSoundPreview = (soundType: SoundType) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      setIsPlayingPreview(true);

      const now = ctx.currentTime;
      if (soundType === "zen") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(528, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.6);
      } else if (soundType === "arcade") {
        [0, 0.1, 0.2].forEach((offset, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(440 + idx * 220, now + offset);
          gain.gain.setValueAtTime(0.2, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.1);
        });
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }

      setTimeout(() => setIsPlayingPreview(false), 800);
    } catch {
      setIsPlayingPreview(false);
    }
  };

  const settingsConfig: { key: NumericSettings; label: string; desc: string; unit: string; color: string }[] = [
    {
      key: "work",
      label: "Foco / Estudio",
      desc: "Tiempo de concentración profunda",
      unit: "min",
      color: "text-rose-600 dark:text-rose-400",
    },
    {
      key: "shortBreak",
      label: "Descanso Corto",
      desc: "Pausa rápida entre ciclos de trabajo",
      unit: "min",
      color: "text-teal-600 dark:text-teal-400",
    },
    {
      key: "longBreak",
      label: "Descanso Largo",
      desc: "Pausa extendida para desconectar",
      unit: "min",
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "longBreakInterval",
      label: "Intervalo de Descanso Largo",
      desc: "Cantidad de pomodoros antes de la pausa larga",
      unit: "ciclos",
      color: "text-zinc-700 dark:text-zinc-300",
    },
  ];

  const presets = [
    { label: "Clásico (25 / 5)", values: { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 } },
    { label: "Enfoque Profundo (50 / 10)", values: { work: 50, shortBreak: 10, longBreak: 20, longBreakInterval: 4 } },
    { label: "Rápido (15 / 3)", values: { work: 15, shortBreak: 3, longBreak: 10, longBreakInterval: 4 } },
  ] as const;

  const isPresetActive = (pValues: typeof presets[number]["values"]) => {
    return (
      settings.work === pValues.work &&
      settings.shortBreak === pValues.shortBreak &&
      settings.longBreak === pValues.longBreak &&
      settings.longBreakInterval === pValues.longBreakInterval
    );
  };

  return (
    <div className="p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Configuración de Temporizador
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Personaliza la duración de cada ciclo, alarmas y modos de ventana
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Cerrar ajustes"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isRunning && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            El cronómetro está en marcha. Paúsalo para modificar las duraciones de los ciclos.
          </span>
        </div>
      )}

      {/* Presets Rápidos */}
      <div className="space-y-2">
        <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Plantillas Rápidas
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((preset) => {
            const active = isPresetActive(preset.values);
            return (
              <button
                key={preset.label}
                type="button"
                disabled={isRunning}
                onClick={() =>
                  onSettingsChange({
                    ...settings,
                    ...preset.values,
                    autoPip: settings.autoPip ?? true,
                  })
                }
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  active
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs font-semibold"
                    : "bg-zinc-100 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 border border-zinc-200/60 dark:border-zinc-700/50",
                  isRunning && "opacity-50 cursor-not-allowed"
                )}
              >
                {active ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <RotateCcw className="w-3 h-3 text-zinc-400" />
                )}
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Duraciones */}
      <div className="space-y-3.5 divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {settingsConfig.map(({ key, label, desc, unit, color }) => (
          <div key={key} className="pt-3.5 first:pt-0 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 block">
                {label}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate">
                {desc}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => updateSetting(key, -1)}
                disabled={isRunning || settings[key] <= LIMITS[key].min}
                className={cn(
                  "w-7 h-7 rounded-md border border-zinc-200 dark:border-zinc-700/70 bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs cursor-pointer",
                  (isRunning || settings[key] <= LIMITS[key].min) && "opacity-40 cursor-not-allowed"
                )}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="relative">
                <input
                  type="number"
                  value={localValues[key] !== undefined ? localValues[key] : settings[key].toString()}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  onBlur={() => handleInputBlur(key)}
                  onKeyDown={(e) => handleKeyDown(e, key)}
                  disabled={isRunning}
                  className={cn(
                    "w-12 h-7 text-center font-mono text-xs font-semibold bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/70 rounded-md outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 transition-colors",
                    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                    color,
                    isRunning && "opacity-60 cursor-not-allowed"
                  )}
                />
              </div>

              <button
                type="button"
                onClick={() => updateSetting(key, 1)}
                disabled={isRunning || settings[key] >= LIMITS[key].max}
                className={cn(
                  "w-7 h-7 rounded-md border border-zinc-200 dark:border-zinc-700/70 bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs cursor-pointer",
                  (isRunning || settings[key] >= LIMITS[key].max) && "opacity-40 cursor-not-allowed"
                )}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 w-10 text-left pl-1">
                {unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Sonido de Alarma */}
      <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              Sonido de Alarma
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
            Tono reproducido al finalizar cada ciclo
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={settings.soundType}
            onValueChange={(val: SoundType) => {
              onSettingsChange({
                ...settings,
                soundType: val,
                autoPip: settings.autoPip ?? true,
              });
              playSoundPreview(val);
            }}
          >
            <SelectTrigger className="h-8 w-36 text-xs font-medium bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xs">
              <SelectValue placeholder="Sonido" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#212121] border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg">
              <SelectItem value="zen" className="text-xs cursor-pointer">
                🔔 Zen (Campana)
              </SelectItem>
              <SelectItem value="classic" className="text-xs cursor-pointer">
                ⏰ Clásico (Beep)
              </SelectItem>
              <SelectItem value="arcade" className="text-xs cursor-pointer">
                👾 Arcade Retro
              </SelectItem>
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => playSoundPreview(settings.soundType)}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors shadow-2xs cursor-pointer"
            title="Escuchar prueba de sonido"
          >
            <Play className={cn("w-3.5 h-3.5", isPlayingPreview && "text-rose-500 fill-current")} />
          </button>
        </div>
      </div>

      {/* Alarma Continua */}
      <div className="pt-3.5 border-t border-zinc-100 dark:divide-zinc-800/60 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <Repeat className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              Alarma Continua
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
            Sigue sonando hasta que la apagues manualmente
          </span>
        </div>

        <Switch
          checked={settings.continuousAlarm}
          onCheckedChange={(checked) =>
            onSettingsChange({
              ...settings,
              continuousAlarm: checked,
              autoPip: settings.autoPip ?? true,
            })
          }
        />
      </div>

      {/* Auto PiP al cambiar de pestaña */}
      <div className="pt-3.5 border-t border-zinc-100 dark:divide-zinc-800/60 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <PictureInPicture2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              Ventana Flotante Automática (PiP)
            </span>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Meet Style
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
            Abre automáticamente el mini cronómetro si cambias de pestaña
          </span>
        </div>

        <Switch
          checked={settings.autoPip ?? true}
          onCheckedChange={(checked) =>
            onSettingsChange({
              ...settings,
              autoPip: checked,
            })
          }
        />
      </div>

      {/* Footer Listo */}
      <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors shadow-2xs cursor-pointer"
        >
          Listo
        </button>
      </div>
    </div>
  );
}
