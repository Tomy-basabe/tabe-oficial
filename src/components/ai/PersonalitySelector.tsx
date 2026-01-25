import { cn } from "@/lib/utils";
import { AIPersonality, AIPersonalityConfig, AI_PERSONALITIES } from "@/hooks/useAIPersonality";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PersonalitySelectorProps {
  currentPersonality: AIPersonality;
  onSelect: (personality: AIPersonality) => void;
  disabled?: boolean;
}

export function PersonalitySelector({ 
  currentPersonality, 
  onSelect, 
  disabled 
}: PersonalitySelectorProps) {
  const current = AI_PERSONALITIES.find(p => p.id === currentPersonality) || AI_PERSONALITIES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span>{current.emoji}</span>
          <span className={cn("font-medium hidden sm:inline", current.color)}>
            {current.name}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {AI_PERSONALITIES.map((p) => (
          <PersonalityOption
            key={p.id}
            config={p}
            isSelected={p.id === currentPersonality}
            onSelect={() => onSelect(p.id)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface PersonalityOptionProps {
  config: AIPersonalityConfig;
  isSelected: boolean;
  onSelect: () => void;
}

function PersonalityOption({ config, isSelected, onSelect }: PersonalityOptionProps) {
  return (
    <DropdownMenuItem
      onClick={onSelect}
      className={cn(
        "flex flex-col items-start gap-1 p-3 cursor-pointer",
        isSelected && "bg-primary/10"
      )}
    >
      <div className="flex items-center gap-2 w-full">
        <span className="text-lg">{config.emoji}</span>
        <span className={cn("font-medium", config.color)}>{config.name}</span>
        {isSelected && (
          <span className="ml-auto text-xs text-primary">Activo</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground pl-7">
        {config.shortDescription}
      </p>
    </DropdownMenuItem>
  );
}
