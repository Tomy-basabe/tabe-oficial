import React from "react";
import { cn } from "@/lib/utils";

interface PixelItemIconProps {
  name: string;
  className?: string;
  size?: number;
}

/**
 * PixelItemIcon: Renderiza iconos vectoriales 2D en pixel art auténtico
 * sin depender de ningún emoji de texto ni fuentes externas.
 */
export function PixelItemIcon({ name, className, size = 28 }: PixelItemIconProps) {
  const s = size;

  const renderGraphic = () => {
    switch (name) {
      // COMIDAS
      case "banana":
      case "banana_held":
        return (
          <g>
            <path d="M4 2 C 8 3, 12 7, 12 13 C 11 13, 8 11, 6 9 C 4 6, 4 4, 4 2 Z" fill="#FACC15" />
            <path d="M6 4 C 8 7, 8 10, 6 12" stroke="#00E5FF" strokeWidth="1" fill="none" />
            <rect x="4" y="1" width="1.5" height="1.5" fill="#15803D" />
            <rect x="9" y="8" width="1" height="1" fill="#00E5FF" />
          </g>
        );

      case "apple":
        return (
          <g>
            <circle cx="8" cy="9" r="6" fill="#EF4444" />
            <rect x="7" y="1" width="2" height="3" fill="#15803D" />
            <rect x="5" y="6" width="2" height="2" fill="#FCA5A5" />
          </g>
        );

      case "pizza":
        return (
          <g>
            <polygon points="2,3 14,3 8,14" fill="#FACC15" stroke="#DC2626" strokeWidth="1" />
            <circle cx="7" cy="6" r="1" fill="#DC2626" />
            <circle cx="9" cy="9" r="1" fill="#DC2626" />
          </g>
        );

      case "burger":
        return (
          <g>
            <rect x="3" y="3" width="10" height="3" fill="#D97706" rx="1.5" />
            <rect x="3" y="6.5" width="10" height="1.5" fill="#16A34A" />
            <rect x="3" y="8" width="10" height="2" fill="#78350F" />
            <rect x="3" y="10" width="10" height="3" fill="#D97706" rx="1.5" />
          </g>
        );

      case "ramen":
        return (
          <g>
            <path d="M2 7 C 2 13, 14 13, 14 7 Z" fill="#DC2626" />
            <ellipse cx="8" cy="7" rx="6" ry="2" fill="#FDE047" />
            <circle cx="8" cy="6" r="1.5" fill="#F97316" />
            <line x1="2" y1="2" x2="12" y2="6" stroke="#92400E" strokeWidth="1" />
          </g>
        );

      case "cookie":
        return (
          <g>
            <circle cx="8" cy="8" r="6" fill="#D97706" />
            <rect x="6" y="5" width="1.5" height="1.5" fill="#78350F" />
            <rect x="10" y="7" width="1.5" height="1.5" fill="#78350F" />
            <rect x="7" y="10" width="1.5" height="1.5" fill="#78350F" />
          </g>
        );

      case "donut":
        return (
          <g>
            <circle cx="8" cy="8" r="6" fill="#F472B6" />
            <circle cx="8" cy="8" r="2.5" fill="#FFF" />
            <rect x="5" y="4" width="1" height="1" fill="#38BDF8" />
            <rect x="10" y="5" width="1" height="1" fill="#FACC15" />
            <rect x="11" y="9" width="1" height="1" fill="#4ADE80" />
          </g>
        );

      case "sushi":
        return (
          <g>
            <rect x="3" y="8" width="10" height="4" fill="#F8FAFC" rx="1" />
            <rect x="3" y="5" width="10" height="3.5" fill="#F97316" rx="1" />
            <line x1="5" y1="6" x2="11" y2="6" stroke="#FFF" strokeWidth="0.8" />
            <rect x="7" y="5" width="2" height="7" fill="#18181B" />
          </g>
        );

      case "potion":
        return (
          <g>
            <rect x="6.5" y="2" width="3" height="3" fill="#E2E8F0" />
            <path d="M5 5 h6 l2 7 h-10 z" fill="#8B5CF6" />
            <rect x="7" y="7" width="2" height="2" fill="#C4B5FD" />
          </g>
        );

      case "taco":
        return (
          <g>
            <path d="M2 11 C 2 4, 14 4, 14 11 Z" fill="#FACC15" />
            <rect x="5" y="7" width="6" height="2" fill="#16A34A" />
            <circle cx="8" cy="6" r="1" fill="#DC2626" />
          </g>
        );

      case "icecream":
        return (
          <g>
            <polygon points="5,8 11,8 8,15" fill="#D97706" />
            <circle cx="8" cy="6" r="4" fill="#FB7185" />
          </g>
        );

      case "coffee":
        return (
          <g>
            <rect x="3" y="5" width="8" height="8" fill="#F8FAFC" rx="1" />
            <path d="M11 6 h2 c1 0, 1 3, 0 3 h-2" stroke="#F8FAFC" strokeWidth="1.5" fill="none" />
            <rect x="4" y="6" width="6" height="2" fill="#78350F" />
            <path d="M5 2 c1 0, 0 2, 1 2" stroke="#94A3B8" strokeWidth="0.8" fill="none" />
          </g>
        );

      // SOMBREROS
      case "cap":
        return (
          <g>
            <rect x="3" y="5" width="10" height="5" fill="#EF4444" rx="2" />
            <rect x="8" y="9" width="6" height="2" fill="#DC2626" />
            <rect x="7" y="4" width="2" height="1" fill="#FFF" />
          </g>
        );

      case "crown":
        return (
          <g>
            <path d="M3 11 h10 v-5 l-2 2 l-3 -5 l-3 5 l-2 -2 z" fill="#FACC15" stroke="#CA8A04" strokeWidth="0.8" />
            <rect x="7" y="8" width="2" height="2" fill="#EF4444" />
          </g>
        );

      case "wizard":
        return (
          <g>
            <polygon points="8,1 13,11 3,11" fill="#7C3AED" />
            <rect x="1" y="10" width="14" height="2" fill="#5B21B6" rx="1" />
            <rect x="7" y="6" width="2" height="2" fill="#FDE047" />
          </g>
        );

      case "sunglasses":
        return (
          <g>
            <rect x="2" y="6" width="12" height="4" fill="#18181B" />
            <rect x="3" y="6" width="1" height="2" fill="#FFF" />
            <rect x="9" y="6" width="1" height="2" fill="#FFF" />
          </g>
        );

      case "bow":
        return (
          <g>
            <polygon points="2,4 7,4 5,8" fill="#EF4444" />
            <polygon points="2,12 7,12 5,8" fill="#EF4444" />
            <polygon points="14,4 9,4 11,8" fill="#EF4444" />
            <polygon points="14,12 9,12 11,8" fill="#EF4444" />
            <rect x="7" y="7" width="2" height="2" fill="#FFF" />
          </g>
        );

      case "tophat":
        return (
          <g>
            <rect x="5" y="2" width="6" height="8" fill="#18181B" />
            <rect x="2" y="9" width="12" height="2" fill="#18181B" rx="1" />
            <rect x="5" y="8" width="6" height="1.5" fill="#DC2626" />
          </g>
        );

      case "headphones":
        return (
          <g>
            <path d="M4 10 C 4 3, 12 3, 12 10" stroke="#06B6D4" strokeWidth="2" fill="none" />
            <rect x="2" y="8" width="2.5" height="5" fill="#06B6D4" rx="1" />
            <rect x="11.5" y="8" width="2.5" height="5" fill="#06B6D4" rx="1" />
          </g>
        );

      case "bandana":
        return (
          <g>
            <rect x="2" y="6" width="12" height="3" fill="#DC2626" />
            <rect x="7" y="7" width="2" height="1" fill="#FFF" />
            <path d="M2 7 l-2 2 l1 2 l2 -2 z" fill="#B91C1C" />
          </g>
        );

      case "viking":
        return (
          <g>
            <rect x="3" y="5" width="10" height="5" fill="#94A3B8" rx="1" />
            <path d="M2 6 l-2 -3 l1 4 z" fill="#F4F1DE" />
            <path d="M14 6 l2 -3 l-1 4 z" fill="#F4F1DE" />
          </g>
        );

      case "pirate":
        return (
          <g>
            <path d="M2 8 h12 l-2 -4 h-8 z" fill="#09090B" />
            <rect x="7" y="6" width="2" height="2" fill="#FFF" />
          </g>
        );

      case "halo":
        return (
          <ellipse cx="8" cy="6" rx="6" ry="2" fill="none" stroke="#FACC15" strokeWidth="1.5" />
        );

      case "horns":
        return (
          <g>
            <path d="M3 8 l-2 -5 l4 2 z" fill="#DC2626" />
            <path d="M13 8 l2 -5 l-4 2 z" fill="#DC2626" />
          </g>
        );

      case "chef":
        return (
          <g>
            <rect x="4" y="8" width="8" height="3" fill="#E2E8F0" />
            <circle cx="5" cy="6" r="2.5" fill="#FFF" />
            <circle cx="8" cy="5" r="3" fill="#FFF" />
            <circle cx="11" cy="6" r="2.5" fill="#FFF" />
          </g>
        );

      case "party":
        return (
          <g>
            <polygon points="8,1 12,12 4,12" fill="#F43F5E" />
            <rect x="7" y="1" width="2" height="2" fill="#FACC15" />
          </g>
        );

      case "astronaut":
        return (
          <g>
            <circle cx="8" cy="8" r="6" fill="#CBD5E1" />
            <ellipse cx="8" cy="8" rx="4" ry="3" fill="#0284C7" />
          </g>
        );

      case "flower":
        return (
          <g>
            <circle cx="8" cy="8" r="4" fill="#FB7185" />
            <circle cx="8" cy="8" r="1.5" fill="#FACC15" />
          </g>
        );

      // TRAJES / OUTFITS
      case "cape":
        return (
          <path d="M4 2 h8 l2 12 h-12 z" fill="#DC2626" />
        );

      case "scarf":
        return (
          <g>
            <rect x="2" y="4" width="12" height="3" fill="#EF4444" />
            <rect x="5" y="4" width="2" height="3" fill="#FFF" />
            <rect x="10" y="4" width="2" height="3" fill="#FFF" />
            <rect x="9" y="7" width="3" height="6" fill="#EF4444" />
          </g>
        );

      case "tie":
        return (
          <g>
            <rect x="5" y="3" width="6" height="2" fill="#FFF" />
            <polygon points="5,5 11,5 8,7" fill="#DC2626" />
            <polygon points="5,9 11,9 8,7" fill="#DC2626" />
          </g>
        );

      case "hoodie":
        return (
          <g>
            <rect x="3" y="3" width="10" height="10" fill="#0284C7" rx="2" />
            <rect x="7.5" y="3" width="1" height="10" fill="#FFF" />
          </g>
        );

      case "armor":
        return (
          <g>
            <rect x="3" y="3" width="10" height="10" fill="#94A3B8" rx="1" />
            <rect x="7" y="4" width="2" height="8" fill="#FACC15" />
            <rect x="4" y="6" width="8" height="2" fill="#FACC15" />
          </g>
        );

      case "medal":
        return (
          <g>
            <path d="M5 2 l3 5 l3 -5" stroke="#2563EB" strokeWidth="1.5" fill="none" />
            <circle cx="8" cy="10" r="3.5" fill="#FACC15" stroke="#CA8A04" strokeWidth="1" />
          </g>
        );

      case "kimono":
        return (
          <g>
            <rect x="3" y="2" width="10" height="12" fill="#E11D48" rx="1" />
            <rect x="3" y="7" width="10" height="3" fill="#FACC15" />
          </g>
        );

      case "spacesuit":
        return (
          <g>
            <rect x="3" y="2" width="10" height="12" fill="#E2E8F0" rx="2" />
            <rect x="5" y="5" width="6" height="4" fill="#3B82F6" />
          </g>
        );

      case "ninja":
        return (
          <g>
            <rect x="3" y="2" width="10" height="12" fill="#18181B" rx="1" />
            <rect x="3" y="7" width="10" height="2" fill="#DC2626" />
          </g>
        );

      case "tuxedo":
        return (
          <g>
            <rect x="3" y="2" width="10" height="12" fill="#09090B" rx="1" />
            <polygon points="8,3 5,7 11,7" fill="#FFF" />
            <rect x="7" y="4" width="2" height="1.5" fill="#DC2626" />
          </g>
        );

      case "doctor":
        return (
          <g>
            <rect x="3" y="2" width="10" height="12" fill="#F8FAFC" rx="1" />
            <path d="M4 3 v4 l4 2 l4 -2 v-4" stroke="#0284C7" strokeWidth="1.2" fill="none" />
          </g>
        );

      case "sweater":
        return (
          <g>
            <rect x="3" y="2" width="10" height="12" fill="#15803D" rx="1" />
            <rect x="4" y="5" width="8" height="1.5" fill="#DC2626" />
            <rect x="4" y="9" width="8" height="1.5" fill="#FFF" />
          </g>
        );

      // OBJETOS EN MANO (HELD)
      case "sword":
        return (
          <g>
            <rect x="7" y="1" width="2" height="10" fill="#E2E8F0" />
            <rect x="4" y="9" width="8" height="2" fill="#D97706" />
            <rect x="7" y="11" width="2" height="3" fill="#78350F" />
          </g>
        );

      case "wand":
        return (
          <g>
            <rect x="7" y="4" width="2" height="10" fill="#78350F" />
            <polygon points="8,1 10,3 12,3 10.5,5 11,8 8,6 5,8 5.5,5 4,3 6,3" fill="#FACC15" />
          </g>
        );

      case "shield":
        return (
          <g>
            <path d="M3 2 h10 v6 c0 4 -4 6 -5 6 c-1 0 -5 -2 -5 -6 z" fill="#3B82F6" stroke="#1E40AF" strokeWidth="1" />
            <rect x="7" y="4" width="2" height="6" fill="#FACC15" />
            <rect x="5" y="6" width="6" height="2" fill="#FACC15" />
          </g>
        );

      case "balloon":
        return (
          <g>
            <line x1="8" y1="9" x2="8" y2="15" stroke="#71717A" strokeWidth="1" />
            <ellipse cx="8" cy="5" rx="5" ry="4" fill="#EF4444" />
          </g>
        );

      case "gameboy":
        return (
          <g>
            <rect x="4" y="2" width="8" height="12" fill="#8B5CF6" rx="1" />
            <rect x="5.5" y="3.5" width="5" height="4" fill="#9BBC0F" />
            <rect x="5.5" y="9" width="2" height="2" fill="#18181B" />
            <circle cx="10" cy="10" r="1" fill="#DC2626" />
          </g>
        );

      case "fish_pole":
        return (
          <g>
            <line x1="2" y1="14" x2="13" y2="2" stroke="#92400E" strokeWidth="1.5" />
            <line x1="13" y1="2" x2="13" y2="10" stroke="#CBD5E1" strokeWidth="0.8" />
            <polygon points="12,10 14,10 13,12" fill="#38BDF8" />
          </g>
        );

      // AURAS
      case "aura_fire":
        return (
          <g>
            <path d="M8 1 C 12 5, 14 9, 13 13 C 11 15, 5 15, 3 13 C 2 9, 4 5, 8 1 Z" fill="#EF4444" />
            <path d="M8 5 C 10 7, 11 9, 10 12 C 9 13, 7 13, 6 12 C 5 10, 6 8, 8 5 Z" fill="#FACC15" />
          </g>
        );

      case "aura_stars":
        return (
          <g>
            <polygon points="8,1 10,5 15,5 11,8 13,13 8,10 3,13 5,8 1,5 6,5" fill="#FACC15" />
          </g>
        );

      case "aura_electric":
        return (
          <path d="M8 1 l-5 7 h5 l-2 7 l7 -9 h-5 z" fill="#00E5FF" />
        );

      case "aura_hearts":
        return (
          <path d="M8 4 C 8 2, 5 2, 4 4 C 3 6, 8 12, 8 12 C 8 12, 13 6, 12 4 C 11 2, 8 2, 8 4 Z" fill="#FF2E93" />
        );

      case "aura_bubbles":
        return (
          <g>
            <circle cx="8" cy="8" r="5" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
            <circle cx="10" cy="6" r="1.5" fill="#38BDF8" />
          </g>
        );

      // SKINS / TINTES
      case "skin_gold":
        return (
          <rect x="3" y="5" width="10" height="6" fill="#FACC15" stroke="#CA8A04" strokeWidth="1" rx="1" />
        );

      case "skin_shadow":
        return (
          <circle cx="8" cy="8" r="6" fill="#18181B" />
        );

      case "skin_snow":
        return (
          <circle cx="8" cy="8" r="6" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
        );

      case "skin_neon":
        return (
          <rect x="3" y="3" width="10" height="10" fill="#06B6D4" stroke="#A855F7" strokeWidth="1.5" rx="2" />
        );

      // FONDOS
      case "bg_room":
      case "bg_bedroom":
        return (
          <rect x="2" y="2" width="12" height="12" fill="#9BBC0F" stroke="#0F380F" strokeWidth="1.5" rx="1" />
        );

      case "bg_park":
        return (
          <g>
            <rect x="2" y="2" width="12" height="12" fill="#86EFAC" rx="1" />
            <circle cx="8" cy="7" r="3" fill="#15803D" />
          </g>
        );

      case "bg_space":
        return (
          <g>
            <rect x="2" y="2" width="12" height="12" fill="#1E1B4B" rx="1" />
            <rect x="5" y="5" width="1" height="1" fill="#FFF" />
            <rect x="11" y="9" width="1" height="1" fill="#FACC15" />
          </g>
        );

      case "bg_dungeon":
        return (
          <g>
            <rect x="2" y="2" width="12" height="12" fill="#334155" rx="1" />
            <rect x="7" y="5" width="2" height="4" fill="#EF4444" />
          </g>
        );

      case "bg_beach":
        return (
          <g>
            <rect x="2" y="2" width="12" height="6" fill="#38BDF8" />
            <rect x="2" y="8" width="12" height="6" fill="#FDE047" />
          </g>
        );

      case "bg_cyberpunk":
        return (
          <g>
            <rect x="2" y="2" width="12" height="12" fill="#09090B" rx="1" />
            <line x1="2" y1="8" x2="14" y2="8" stroke="#00E5FF" strokeWidth="1" />
            <line x1="8" y1="2" x2="8" y2="14" stroke="#FF2E93" strokeWidth="1" />
          </g>
        );

      case "bg_volcano":
        return (
          <g>
            <rect x="2" y="2" width="12" height="12" fill="#7F1D1D" rx="1" />
            <polygon points="2,14 8,7 14,14" fill="#DC2626" />
          </g>
        );

      default:
        return (
          <circle cx="8" cy="8" r="5" fill="#FFE600" stroke="#000" strokeWidth="1" />
        );
    }
  };

  return (
    <svg
      viewBox="0 0 16 16"
      width={s}
      height={s}
      style={{ shapeRendering: "crispEdges" }}
      className={cn("shrink-0 select-none", className)}
    >
      {renderGraphic()}
    </svg>
  );
}
