import React from "react";
import { cn } from "@/lib/utils";

interface AIThinkingIndicatorProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Clean, minimalist Thinking Dots in vibrant gradient hues.
 * Free of clutter and framing ("solo los puntitos de pensar").
 */
export function AIThinkingIndicator({
  className,
  size = "md",
}: AIThinkingIndicatorProps) {
  const dotSize =
    size === "sm" ? "w-1.5 h-1.5" : size === "lg" ? "w-2.5 h-2.5" : "w-2 h-2";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 py-1 px-1 select-none",
        className
      )}
      role="status"
      aria-label="Pensando..."
    >
      <span
        className={cn(
          dotSize,
          "rounded-full bg-sky-400 animate-bounce [animation-delay:-0.32s] shadow-[0_0_8px_rgba(56,189,248,0.6)]"
        )}
      />
      <span
        className={cn(
          dotSize,
          "rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.16s] shadow-[0_0_8px_rgba(99,102,241,0.6)]"
        )}
      />
      <span
        className={cn(
          dotSize,
          "rounded-full bg-pink-500 animate-bounce shadow-[0_0_8px_rgba(236,72,153,0.6)]"
        )}
      />
    </div>
  );
}

export default AIThinkingIndicator;
