import React from "react";
import { AISparkleLogo } from "@/components/icons/AISparkleLogo";
import { cn } from "@/lib/utils";

interface AIThinkingIndicatorProps {
  personaName?: string;
  statusText?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Premium AI Thinking Indicator inspired by Gemini, Claude, and ChatGPT.
 * Displays the multi-color AI Sparkle Logo with a subtle breathing pulse
 * and an ultra-clean, minimalist typing/thinking wave.
 */
export function AIThinkingIndicator({
  personaName,
  statusText,
  compact = false,
  className,
}: AIThinkingIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 select-none transition-all duration-300",
        compact ? "py-1 px-1" : "py-2 px-1 min-w-[180px]",
        className
      )}
    >
      {/* Glowing breathing multi-color logo */}
      <div className="relative shrink-0 flex items-center justify-center">
        <AISparkleLogo
          size={compact ? 20 : 26}
          animate={true}
          withGlow={true}
          className="drop-shadow-[0_0_12px_rgba(56,189,248,0.45)]"
        />
      </div>

      {/* Thinking state content */}
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs md:text-sm font-semibold tracking-wide text-foreground/90 flex items-center gap-1">
            <span>Pensando</span>
            <span className="inline-flex gap-1 items-center ml-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:-0.3s] opacity-80" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s] opacity-80" />
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-bounce opacity-80" />
            </span>
          </span>
        </div>

        {!compact && (
          <span className="text-[11px] font-medium text-muted-foreground/75 tracking-tight truncate mt-0.5">
            {statusText || (personaName ? `Conectando con ${personaName}...` : "Analizando contexto y apuntes...")}
          </span>
        )}
      </div>
    </div>
  );
}

export default AIThinkingIndicator;
