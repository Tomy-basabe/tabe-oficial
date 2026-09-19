import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Zap, Sparkles, Brain, CheckCircle2, ShieldCheck } from "lucide-react";
import {
  AIModelOption,
  TABE_AI_MODEL,
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
  const powerLabels: Record<PowerEffort, { name: string; icon: any; color: string; desc: string }> = {
    bajo: {
      name: "Rápido",
      icon: Zap,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
      desc: "Ultra rápido (<1s) • Respuestas directas al grano",
    },
    medio: {
      name: "Equilibrado",
      icon: Sparkles,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
      desc: "Explicaciones claras, ejemplos y análisis de tus materias",
    },
    alto: {
      name: "Máximo",
      icon: Brain,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
      desc: "Razonamiento profundo • Deducción paso a paso y resolución",
    },
  };

  const currentPower = powerLabels[powerLevel] || powerLabels.medio;
  const CurrentIcon = currentPower.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/60 bg-muted/50 hover:bg-muted text-foreground font-semibold text-xs transition-all focus:outline-none shrink-0 shadow-xs hover:border-primary/40",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          className
        )}
      >
        <div className="w-5 h-5 rounded-lg flex items-center justify-center p-0.5 bg-[#00d9ff] text-black border border-foreground/30 shadow-xs shrink-0">
          <TabeAIIcon className="w-4 h-4 text-black" />
        </div>
        
        <span className="font-black text-xs tracking-wide">
          TABE AI
        </span>

        {/* 100% Context indicator */}
        <span className="hidden sm:flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#25d06c]/15 text-[#25d06c] border border-[#25d06c]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#25d06c] animate-pulse" />
          100% INFO
        </span>

        {/* Power Level Badge */}
        <span className={cn(
          "px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1 border",
          currentPower.color
        )}>
          <CurrentIcon className="w-2.5 h-2.5" />
          {currentPower.name}
        </span>

        <ChevronDown className="w-3 h-3 opacity-60 shrink-0 ml-0.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-80 sm:w-96 p-3 bg-card border-4 border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] rounded-2xl z-50 animate-in fade-in-50 zoom-in-95"
      >
        {/* Model info banner */}
        <div className="p-3 bg-secondary/40 rounded-xl border-2 border-foreground/20 mb-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00d9ff] text-black p-1.5 flex items-center justify-center border-2 border-foreground shadow-[2px_2px_0_0_#000] shrink-0">
            <TabeAIIcon className="w-full h-full text-black" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="font-black text-sm uppercase text-foreground">TABE AI</h4>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#25d06c] text-white border border-foreground">
                ACTIVO
              </span>
            </div>
            <p className="text-[11px] font-bold text-muted-foreground mt-0.5 leading-snug">
              Conectada al <strong className="text-foreground">100% de tu información</strong>: materias, notas, exámenes, apuntes, flashcards, biblioteca y rutinas.
            </p>
          </div>
        </div>

        {/* Status of context connected */}
        <div className="flex items-center gap-2 px-2 py-1.5 bg-[#25d06c]/10 rounded-lg border border-[#25d06c]/30 text-[#25d06c] text-xs font-bold mb-3">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#25d06c]" />
          <span>Acceso total sin excepciones a tu perfil académico</span>
        </div>

        {/* Nivel de Potencia / Esfuerzo */}
        <div className="space-y-1.5">
          <label className="font-black text-[11px] uppercase tracking-wider text-muted-foreground px-1 flex items-center justify-between">
            <span>Nivel de Razonamiento</span>
            <span className="text-[10px] font-bold text-muted-foreground">{currentPower.desc}</span>
          </label>

          <div className="grid grid-cols-3 gap-1.5">
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
                    "flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-black uppercase border-2 transition-all cursor-pointer",
                    isSelected
                      ? "bg-foreground text-background border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] -translate-y-0.5"
                      : "bg-card text-foreground border-foreground/30 hover:border-foreground/80 hover:-translate-y-0.5"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isSelected ? "text-background" : "text-primary")} />
                  <span>{cfg.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
