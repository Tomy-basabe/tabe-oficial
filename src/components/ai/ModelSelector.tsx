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
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  }
> = {
  bajo: {
    name: "Rápido",
    icon: Zap,
  },
  medio: {
    name: "Equilibrado",
    icon: Sparkles,
  },
  alto: {
    name: "Pensar",
    icon: Brain,
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
          "group inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-zinc-200/90 dark:border-white/10 bg-zinc-50/90 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer shrink-0 focus:outline-none shadow-2xs hover:shadow-xs select-none",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          className
        )}
      >
        <CurrentIcon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-foreground transition-colors" strokeWidth={2} />
        <span className="font-medium text-xs tracking-tight text-foreground">
          {currentPower.name}
        </span>
        <ChevronDown className="w-3 h-3 text-zinc-400 dark:text-zinc-500 ml-0.5 transition-transform duration-150 group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-44 p-1 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-white/10 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="space-y-0.5">
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
                  "w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer text-left",
                  isSelected
                    ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 font-semibold"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/70 dark:hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" strokeWidth={2} />
                  <span>{cfg.name}</span>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" strokeWidth={2.2} />
                )}
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

