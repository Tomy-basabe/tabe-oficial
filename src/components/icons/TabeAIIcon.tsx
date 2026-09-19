import React from "react";
import { cn } from "@/lib/utils";

export interface TabeAIIconProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: "gradient" | "solid";
  animate?: boolean;
  withGlow?: boolean;
  size?: number | string;
}

/**
 * Official TABE 2.0 AI 3D Logo.
 * Automatically switches between light and dark themes using the official
 * high-fidelity transparent PNG assets provided in TABE 2.0:
 * - Light theme: /logos/tabe-ai-light.png (dark central spark & ribbon)
 * - Dark theme:  /logos/tabe-ai-dark.png (luminous white central spark & ribbon)
 */
export function TabeAIIcon({
  className,
  variant,
  animate = false,
  withGlow = false,
  size,
  style,
  ...props
}: TabeAIIconProps) {
  const sizeStyle = size
    ? { width: size, height: size, minWidth: size, minHeight: size, ...style }
    : style;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 select-none overflow-visible",
        animate && "animate-ai-breathe",
        !size && !className?.includes("w-") && "w-5 h-5",
        className
      )}
      style={sizeStyle}
      {...props}
    >
      <img
        src="/logos/tabe-ai-light.png"
        alt="TABE IA"
        className={cn(
          "w-full h-full object-contain dark:hidden pointer-events-none transition-transform duration-300",
          withGlow && "drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]"
        )}
        loading="eager"
      />
      <img
        src="/logos/tabe-ai-dark.png"
        alt="TABE IA"
        className={cn(
          "w-full h-full object-contain hidden dark:block pointer-events-none transition-transform duration-300",
          withGlow && "drop-shadow-[0_0_12px_rgba(255,255,255,0.45)]"
        )}
        loading="eager"
      />
    </div>
  );
}

export default TabeAIIcon;
