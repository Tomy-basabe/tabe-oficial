import React from "react";
import { cn } from "@/lib/utils";

export interface ArcadeIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * Arcade Machine Cabinet Icon for Gaming sections.
 */
export function ArcadeIcon({ className, size = 20, ...props }: ArcadeIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...props}
    >
      {/* Arcade cabinet outer profile */}
      <path d="M5 2h14l1 6-2 3v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-10L4 8l1-6z" />
      {/* Screen */}
      <rect x="7.5" y="5.5" width="9" height="5.5" rx="1" />
      {/* Joystick stick & ball */}
      <circle cx="10" cy="15.5" r="1.2" fill="currentColor" />
      <path d="M10 15.5v1.5" />
      {/* Action buttons */}
      <circle cx="14.5" cy="15.5" r="0.75" fill="currentColor" />
      <circle cx="16.5" cy="14.5" r="0.75" fill="currentColor" />
      {/* Coin door */}
      <path d="M10 20h4" />
    </svg>
  );
}

export default ArcadeIcon;
