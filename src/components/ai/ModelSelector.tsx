import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Zap, Sparkles, Brain, Check } from "lucide-react";
import {
  AIModelOption,
  PowerEffort,
} from "@/config/aiModels";
import { TabeAIIcon } from "@/components/icons/TabeAIIcon";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  selectedModel: AIModelOption;
  onSelectModel?: (model: AIModelOption) => void;
  powerLevel: PowerEffort;
  onSelectPowerLevel: (level: PowerEffort) => void;
  disabled?: boolean;
  className?: string;
}

export const powerConfig: Record<
  PowerEffort,
  {
    name: string;
    tag: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    desc: string;
  }
> = {
  bajo: {
    name: "Rápido",
    tag: "Flash",
    icon: Zap,
    desc: "Respuestas veloces y directas",
  },
  medio: {
    name: "Equilibrado",
    tag: "Pro",
    icon: Sparkles,
    desc: "Ideal para materias, apuntes y resúmenes",
  },
  alto: {
    name: "Pensamiento",
    tag: "Deep",
    icon: Brain,
    desc: "Razonamiento analítico paso a paso",
  },
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  powerLevel,
  onSelectPowerLevel,
  disabled = false,
  className,
}) => {
  const currentPower = powerConfig[powerLevel] || powerConfig.medio;
  const CurrentIcon = currentPower.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors focus:outline-none shrink-0 cursor-pointer select-none",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          className
        )}
      >
        <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0 opacity-90">
          <TabeAIIcon size={14} />
        </div>

        <span className="font-semibold text-xs tracking-tight">
          TABE AI
        </span>

        <span className="text-zinc-300 dark:text-zinc-700">·</span>

        <span className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
          <CurrentIcon className="w-3 h-3 text-zinc-500 dark:text-zinc-400" strokeWidth={1.75} />
          <span>{currentPower.name}</span>
        </span>

        <ChevronDown className="w-3 h-3 text-zinc-400 dark:text-zinc-500 shrink-0 ml-0.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-[320px] p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95"
      >
        {/* Micro-header neutral */}
        <div className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center justify-between">
          <span>Modo de Respuesta</span>
          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
            100% Contexto
          </span>
        </div>

        <div className="space-y-1 mt-1">
          {(["bajo", "medio", "alto"] as PowerEffort[]).map((level) => {
            const cfg = powerConfig[level];
            const Icon = cfg.icon;
            const isSelected = powerLevel === level;

            return (
              <button
                key={level}
                type="button"
                onClick={() => onSelectPowerLevel(level)}
                className={cn(
                  "w-full p-2.5 rounded-lg transition-colors flex items-start gap-3 text-left cursor-pointer border",
                  isSelected
                    ? "bg-zinc-100/90 dark:bg-zinc-800/70 border-zinc-300/80 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    : "bg-transparent border-transparent hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300"
                )}
              >
                <div className="mt-0.5 shrink-0 text-zinc-600 dark:text-zinc-400">
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {cfg.name}
                    </span>
                    <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/60">
                      {cfg.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                    {cfg.desc}
                  </p>
                </div>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 shrink-0 text-zinc-900 dark:text-zinc-100 mt-0.5" strokeWidth={2} />
                )}
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

