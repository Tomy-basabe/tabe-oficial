import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check, Zap, Sparkles, Brain } from "lucide-react";
import {
  AIModelOption,
  AVAILABLE_AI_MODELS,
  getModelTokenCost,
  PowerEffort,
} from "@/config/aiModels";
import { ModelLogo } from "@/components/icons/ModelLogos";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  selectedModel: AIModelOption;
  onSelectModel: (model: AIModelOption) => void;
  powerLevel: PowerEffort;
  onSelectPowerLevel: (level: PowerEffort) => void;
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  powerLevel,
  onSelectPowerLevel,
  disabled = false,
}) => {
  const powerLabels: Record<PowerEffort, { name: string; icon: any; color: string; desc: string }> = {
    bajo: {
      name: "Bajo",
      icon: Zap,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
      desc: "Ultra rápido (<1s) • Respuestas concisas",
    },
    medio: {
      name: "Medio",
      icon: Sparkles,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
      desc: "Equilibrado • Explicaciones claras y ejemplos",
    },
    alto: {
      name: "Alto",
      icon: Brain,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
      desc: "Máximo razonamiento • Deducción paso a paso",
    },
  };

  const currentPower = powerLabels[powerLevel];
  const CurrentIcon = currentPower.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 border-foreground bg-card text-foreground font-black text-xs shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px] transition-all focus:outline-none shrink-0",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <div className="w-5 h-5 rounded-lg flex items-center justify-center p-0.5 bg-background border border-foreground/30 shadow-xs shrink-0">
          <ModelLogo modelId={selectedModel.id} className="w-4 h-4" />
        </div>
        
        <span className="font-bold text-xs truncate max-w-[100px] sm:max-w-[140px]">
          {selectedModel.shortName || selectedModel.name}
        </span>

        {/* Power Level Badge inside trigger pill (similar to user reference: Sonnet 5 Medium) */}
        <span className={cn(
          "px-1.5 py-0.2 rounded-md text-[10px] font-black uppercase flex items-center gap-1 border",
          currentPower.color
        )}>
          <CurrentIcon className="w-2.5 h-2.5" />
          {currentPower.name}
        </span>

        <ChevronDown className="w-3 h-3 opacity-60 shrink-0 ml-0.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-2 bg-card border-4 border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] rounded-2xl z-50 animate-in fade-in-50 zoom-in-95 max-h-[85vh] overflow-y-auto"
      >
        {/* 1. SELECCIÓN DE POTENCIA / ESFUERZO */}
        <div className="p-2 bg-secondary/30 rounded-xl border-2 border-foreground/20 mb-2">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="font-black text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" />
              Nivel de Potencia
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">
              {currentPower.desc}
            </span>
          </div>

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
                    "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-black uppercase border-2 transition-all cursor-pointer",
                    isSelected
                      ? "bg-foreground text-background border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                      : "bg-card text-foreground border-foreground/30 hover:border-foreground/80"
                  )}
                >
                  <Icon className={cn("w-3 h-3", isSelected ? "text-background" : "")} />
                  {cfg.name}
                </button>
              );
            })}
          </div>
        </div>

        <DropdownMenuSeparator className="bg-foreground/20 my-1" />

        {/* 2. LISTA DE MODELOS ORDENADOS ALFABÉTICAMENTE */}
        <DropdownMenuLabel className="font-black text-xs uppercase px-2 py-1.5 text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            Modelos de IA (Orden A-Z)
          </span>
          <span className="text-[10px] bg-[#BFFF00] text-black px-1.5 py-0.5 rounded font-black">
            {AVAILABLE_AI_MODELS.length} Modelos
          </span>
        </DropdownMenuLabel>

        <div className="space-y-1 mt-1">
          {AVAILABLE_AI_MODELS.map((model) => {
            const isSelected = model.id === selectedModel.id;
            return (
              <DropdownMenuItem
                key={model.id}
                onClick={() => onSelectModel(model)}
                className={cn(
                  "group flex flex-col items-start gap-1 p-2.5 rounded-xl border-2 transition-all cursor-pointer",
                  isSelected
                    ? "bg-muted/90 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                    : "border-transparent hover:bg-muted/50 hover:border-foreground/30"
                )}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center p-1 bg-background border-2 border-foreground/20 shadow-xs shrink-0 group-hover:scale-110 group-hover:border-foreground transition-all">
                      <ModelLogo modelId={model.id} className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-black text-xs text-foreground uppercase tracking-tight truncate">
                          {model.name}
                        </span>
                        <span
                          className="text-[9px] font-black uppercase px-1 py-0.2 rounded border shrink-0 hidden sm:inline-block"
                          style={{
                            backgroundColor: `${model.color}15`,
                            color: model.color,
                            borderColor: `${model.color}35`,
                          }}
                        >
                          {model.badge}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Badge de Razonamiento del Modelo */}
                    <span
                      className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border"
                      style={{
                        backgroundColor: `${model.color}15`,
                        color: model.color,
                        borderColor: `${model.color}40`,
                      }}
                    >
                      {model.reasoningLevel}
                    </span>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-foreground stroke-[3] ml-0.5" />
                    )}
                  </div>
                </div>

                <p className="text-[11px] font-medium text-muted-foreground leading-snug pl-9 text-left">
                  {model.description}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground pl-9 text-left">
                  {model.provider === "local"
                    ? "Sin tokens · siempre disponible"
                    : `~${getModelTokenCost(model, powerLevel).toLocaleString("es-AR")} tokens · ventana ${model.tokenPolicy?.windowHours ?? 24} h`}
                </p>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
