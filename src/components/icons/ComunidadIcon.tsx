import React from "react";
import { cn } from "@/lib/utils";

export interface ComunidadIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * Custom Comunidad Icon representing the collaborative student community.
 * Features 3 connected students in a collaborative hub sharing knowledge.
 */
export function ComunidadIcon({ className, size = 20, ...props }: ComunidadIconProps) {
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
      {/* Top Student */}
      <circle cx="12" cy="4.5" r="2" />
      <path d="M8.5 9.5a3.5 3.5 0 0 1 7 0" />

      {/* Bottom Left Student */}
      <circle cx="5" cy="13.5" r="2" />
      <path d="M2 18.5a3.5 3.5 0 0 1 6 0" />

      {/* Bottom Right Student */}
      <circle cx="19" cy="13.5" r="2" />
      <path d="M16 18.5a3.5 3.5 0 0 1 6 0" />

      {/* Central Collaborative Hub & Connection Lines */}
      <circle cx="12" cy="14" r="1.5" fill="currentColor" />
      <path d="M12 9.5v3" />
      <path d="M8 17.5l2.6-2.5" />
      <path d="M16 17.5l-2.6-2.5" />
    </svg>
  );
}

export default ComunidadIcon;
