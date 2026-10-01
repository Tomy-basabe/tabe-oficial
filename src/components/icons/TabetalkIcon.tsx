import React from "react";
import { cn } from "@/lib/utils";

export interface TabetalkIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * Tabetalk official vector icon (graduation cap + speech bubble).
 * Clean, monochromatic stroke-based icon matching the rest of the navigation sidebar.
 */
export function TabetalkIcon({
  className,
  size,
  style,
  strokeWidth = 2,
  ...props
}: TabetalkIconProps) {
  const sizeStyle = size
    ? { width: size, height: size, minWidth: size, minHeight: size, ...style }
    : style;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-5 h-5 shrink-0", className)}
      style={sizeStyle}
      {...props}
    >
      {/* Birrete / Gorro de graduación */}
      <path d="M12 2L2 6.5l10 4.5 10-4.5L12 2z" />
      <path d="M20 7.5v4" />
      {/* Burbuja de diálogo con cola de chat */}
      <path d="M6 10v4c0 3.3 2.7 6 6 6 1.1 0 2.2-.3 3.1-.8L19 20l-.9-3.2c1.2-1.3 1.9-3 1.9-4.8v-2" />
      {/* Línea de voz / conversación */}
      <path d="M9.5 14h5" />
    </svg>
  );
}

export default TabetalkIcon;
