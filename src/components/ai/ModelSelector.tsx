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
  onSelectModel: (model: AIModelOption) => void;
  powerLevel: PowerEffort;
  onSelectPowerLevel: (level: PowerEffort) => void;
  disabled?: boolean;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  powerLevel,
  onSelectPowerLevel,
  disabled = false,
  className,
}) => {
  const powerLabels: Record<
    PowerEffort,
    {
      name: string;
      tag: string;
      icon: any;
      iconColor: string;
      iconBg: string;
      desc: string;
    }
  > = {
    bajo: {
      name: "Rápido",
      tag: "Flash",
      icon: Zap,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10 text-amber-500 border-amber-500/30",
      desc: "Respuestas veloces y directas al grano",
    },
    medio: {
      name: "Equilibrado",
      tag: "Pro",
      icon: Sparkles,
      iconColor: "text-cyan-500",
      iconBg: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
      desc: "Ideal para materias, apuntes y resúmenes",
    },
    alto: {
      name: "Pensamiento",
      tag: "Deep",
      icon: Brain,
      iconColor: "text-purple-500",
      iconBg: "bg-purple-500/10 text-purple-500 border-purple-500/30",
      desc: "Razonamiento analítico paso a paso",
    },
  };

  const currentPower = powerLabels[powerLevel] || powerLabels.medio;
  const CurrentIcon = currentPower.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-foreground bg-card hover:bg-muted text-foreground font-black text-xs transition-all focus:outline-none shrink-0 shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px] cursor-pointer group",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          className
        )}
      >
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          <TabeAIIcon size={16} />
        </div>

        <span className="font-black text-xs tracking-tight">
          TABE AI
        </span>

        <span className="text-foreground/30 font-bold">•</span>

        <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">
          <CurrentIcon className={cn("w-3 h-3", currentPower.iconColor)} />
          <span>{currentPower.name}</span>
        </span>

        <ChevronDown className="w-3 h-3 opacity-60 shrink-0 ml-0.5 group-hover:opacity-100 transition-opacity" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-72 sm:w-80 p-2 bg-card/95 backdrop-blur-md border-2 md:border-3 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-2xl z-50 animate-in fade-in-50 zoom-in-95 space-y-1"
      >
        <div className="px-2 py-1 flex items-center justify-between border-b border-border/40 pb-1.5 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Modelo y Potencia
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#00E5FF]/15 text-[#00A8C6] dark:text-[#00E5FF] border border-[#00E5FF]/30">
            100% Info
          </span>
        </div>

        {(["bajo", "medio", "alto"] as PowerEffort[]).map((level) => {
          const cfg = powerLabels[level];
          const Icon = cfg.icon;
          const isSelected = powerLevel === level;

          return (
            <button
              key={level}
              type="button"
              onClick={() => onSelectPowerLevel(level)}
              className={cn(
                "w-full flex items-center justify-between p-2 rounded-xl transition-all text-left cursor-pointer border-2",
                isSelected
                  ? "bg-foreground text-background border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] -translate-y-0.5"
                  : "bg-card text-foreground border-transparent hover:border-foreground/60 hover:bg-muted/70"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-transform",
                    isSelected
                      ? "bg-background text-foreground border-background"
                      : cfg.iconBg
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black uppercase tracking-tight">
                      {cfg.name}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider",
                        isSelected
                          ? "bg-background/20 text-background"
                          : "bg-muted text-muted-foreground border border-border/50"
                      )}
                    >
                      {cfg.tag}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-[11px] truncate leading-tight mt-0.5",
                      isSelected ? "text-background/80 font-medium" : "text-muted-foreground"
                    )}
                  >
                    {cfg.desc}
                  </p>
                </div>
              </div>
              {isSelected && (
                <Check className="w-4 h-4 shrink-0 text-background stroke-[3] ml-2" />
              )}
            </button>
          );
        })}

        <div className="pt-1.5 px-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-bold">
          <span>Acceso al 100% de tu información</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#25d06c] animate-pulse" />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
