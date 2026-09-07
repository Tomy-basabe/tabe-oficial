import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check, Sparkles, Cpu } from "lucide-react";
import {
  AIModelOption,
  AVAILABLE_AI_MODELS,
} from "@/config/aiModels";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  selectedModel: AIModelOption;
  onSelectModel: (model: AIModelOption) => void;
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  disabled = false,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-foreground bg-card text-foreground font-black text-xs uppercase shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-y-[1px] active:shadow-[1px_1px_0_0_hsl(var(--foreground))] transition-all focus:outline-none",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm animate-pulse"
          style={{ backgroundColor: selectedModel.color }}
        />
        <span className="truncate max-w-[120px] sm:max-w-[160px]">
          {selectedModel.name}
        </span>
        <span
          className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold"
          style={{
            backgroundColor: `${selectedModel.color}22`,
            color: selectedModel.color,
            border: `1px solid ${selectedModel.color}55`,
          }}
        >
          {selectedModel.badge}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0 ml-0.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-72 sm:w-80 p-2 bg-card border-4 border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] rounded-xl z-50 animate-in fade-in-50 zoom-in-95"
      >
        <DropdownMenuLabel className="font-black text-xs uppercase px-2 py-1.5 text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            Modelos de IA Disponibles
          </span>
          <span className="text-[10px] bg-[#BFFF00] text-black px-1.5 py-0.5 rounded font-black">
            100% Gratis
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-foreground/20 my-1" />

        <div className="space-y-1">
          {AVAILABLE_AI_MODELS.map((model) => {
            const isSelected = model.id === selectedModel.id;
            return (
              <DropdownMenuItem
                key={model.id}
                onClick={() => onSelectModel(model)}
                className={cn(
                  "flex flex-col items-start gap-1 p-2.5 rounded-lg border-2 border-transparent transition-all cursor-pointer",
                  isSelected
                    ? "bg-muted/80 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                    : "hover:bg-muted/50 hover:border-foreground/40"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: model.color }}
                    />
                    <span className="font-black text-xs text-foreground uppercase">
                      {model.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${model.color}20`,
                        color: model.color,
                        border: `1px solid ${model.color}40`,
                      }}
                    >
                      {model.badge}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-foreground stroke-[3]" />
                    )}
                  </div>
                </div>

                <p className="text-[11px] font-medium text-muted-foreground leading-snug pl-4 text-left">
                  {model.description}
                </p>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
