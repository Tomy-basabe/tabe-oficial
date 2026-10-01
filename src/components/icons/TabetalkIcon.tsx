import React from "react";
import { cn } from "@/lib/utils";

export interface TabetalkIconProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  size?: number | string;
  style?: React.CSSProperties;
}

/**
 * Tabetalk official logo icon for Sidebar and UI elements.
 */
export function TabetalkIcon({
  className,
  size,
  style,
  ...props
}: TabetalkIconProps) {
  const sizeStyle = size
    ? { width: size, height: size, minWidth: size, minHeight: size, ...style }
    : style;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 select-none overflow-visible",
        !size && !className?.includes("w-") && "w-7 h-7",
        className
      )}
      style={sizeStyle}
      {...props}
    >
      <img
        src="/tabe-talk.png"
        alt="Tabetalk"
        className="w-full h-full object-contain pointer-events-none transition-transform duration-200 group-hover:scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
        loading="eager"
        onError={(e) => {
          e.currentTarget.src = "/logo.png";
        }}
      />
    </div>
  );
}

export default TabetalkIcon;
