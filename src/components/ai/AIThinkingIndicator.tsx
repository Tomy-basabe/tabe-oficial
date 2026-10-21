import React from "react";
import { cn } from "@/lib/utils";
import { AiStatus, AiStatusProps, AiStatusState } from "@/components/ui/ai-status";

export interface AIThinkingIndicatorProps extends Partial<AiStatusProps> {
  className?: string;
  size?: "sm" | "md" | "lg";
  personaName?: string;
  statusText?: string;
  state?: AiStatusState | (string & {});
}

/**
 * Indicador de estado de la IA con animaciones fluidas, SVG de trazo de pluma y timer.
 * Totalmente compatible con la API anterior (personaName, statusText) y el nuevo AiStatus.
 */
export function AIThinkingIndicator({
  className,
  size = "md",
  personaName,
  statusText,
  state = "thinking",
  label,
  detail,
  ...props
}: AIThinkingIndicatorProps) {
  const displayLabel = label ?? (personaName ? `${personaName} está pensando...` : "Pensando...");
  const displayDetail = detail ?? statusText;

  return (
    <div className={cn("inline-flex items-center select-none", className)}>
      <AiStatus
        state={state}
        label={displayLabel}
        detail={displayDetail}
        timer={true}
        {...props}
      />
    </div>
  );
}

export default AIThinkingIndicator;
