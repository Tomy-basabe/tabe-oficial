import React from "react";
import { PetSpecies, PetStage } from "@/types/tabegochi";
import { cn } from "@/lib/utils";

interface PixelPetSpriteProps {
  species: PetSpecies;
  stage?: PetStage;
  hat?: string;
  outfit?: string;
  heldItem?: string;
  aura?: string;
  colorSkin?: string;
  isSleeping?: boolean;
  isSick?: boolean;
  isDead?: boolean;
  isEating?: boolean;
  isHappy?: boolean;
  foodId?: string;
  className?: string;
  size?: number; // size in px, defaults to 160
}

export interface ClothingOffset {
  hat: { top: number; left: number; scale?: number };
  body: { top: number; left: number; scale?: number };
  held?: { top: number; left: number; scale?: number };
  aura?: { top: number; left: number; scale?: number };
}

/**
 * Tabla de anclaje de ropa y cosméticos por silueta anatómica de cada mascota.
 * Corrige y calibra la posición (top/left) y escala de trajes, capas, auras y sombreros
 * para evitar que floten o se recorten según la cabeza y el torso de cada animal.
 */
export const petClothingOffsets: Record<PetSpecies, ClothingOffset> = {
  cat: {
    hat: { top: 0, left: 0, scale: 1 },
    body: { top: 0, left: 0, scale: 1 },
    held: { top: 0, left: 0, scale: 1 },
    aura: { top: 0, left: 0, scale: 1 },
  },
  dog: {
    hat: { top: 0, left: 0, scale: 1 },
    body: { top: 0, left: 0, scale: 1 },
    held: { top: 0, left: 0, scale: 1 },
    aura: { top: 0, left: 0, scale: 1 },
  },
  dragon: {
    hat: { top: -1, left: 0, scale: 1.05 }, // Despeja cuernitos y cresta dorsal
    body: { top: 0, left: 0, scale: 1.05 },  // Torso más ancho y corpulento
    held: { top: 0, left: 1, scale: 1 },
    aura: { top: 0, left: 0, scale: 1.1 },
  },
  penguin: {
    hat: { top: 1.5, left: 0, scale: 0.95 }, // Anclado firme sobre la cabeza esférica
    body: { top: -2, left: 0, scale: 1.05 }, // El torso del pingüino inicia más arriba sin cuello
    held: { top: 1, left: 1, scale: 1 },
    aura: { top: 0, left: 0, scale: 1 },
  },
  bunny: {
    hat: { top: 1.5, left: 0, scale: 0.92 }, // Se acomoda en la frente bajo las orejas altas
    body: { top: 0, left: 0, scale: 1 },
    held: { top: 0, left: 0, scale: 1 },
    aura: { top: -1, left: 0, scale: 1.05 },
  },
  axolotl: {
    hat: { top: 0, left: 0, scale: 1 },
    body: { top: 0, left: 0, scale: 1 },
    held: { top: 0, left: 1, scale: 1 },
    aura: { top: 0, left: 0, scale: 1.1 },
  },
};

/**
 * PixelPetSprite: Renderizador 2D Pixel Art auténtico estilo Tamagotchi / Digimon noventero
 * Utiliza SVG vectorial con coordenadas crispEdges para mantener nitidez de píxeles infinita.
 */
export function PixelPetSprite({
  species,
  stage = "baby",
  hat,
  outfit,
  heldItem,
  aura,
  colorSkin,
  isSleeping = false,
  isSick = false,
  isDead = false,
  isEating = false,
  isHappy = false,
  foodId,
  className,
  size = 160,
}: PixelPetSpriteProps) {
  // Paletas de color pixel art base por especie
  const baseSpeciesColors: Record<PetSpecies, { body: string; shadow: string; belly: string; accent: string }> = {
    cat: { body: "#FFB703", shadow: "#FB8500", belly: "#FFF7D6", accent: "#FF006E" },
    dog: { body: "#E07A5F", shadow: "#C55B40", belly: "#F4F1DE", accent: "#3D405B" },
    dragon: { body: "#E63946", shadow: "#9B2226", belly: "#FFD166", accent: "#06D6A0" },
    penguin: { body: "#1D3557", shadow: "#14213D", belly: "#F1FAEE", accent: "#F77F00" },
    bunny: { body: "#FFC6D9", shadow: "#E098B0", belly: "#FFF0F5", accent: "#FF4D6D" },
    axolotl: { body: "#F472B6", shadow: "#DB2777", belly: "#FCE7F3", accent: "#38BDF8" },
  };

  // Tintes / Skins alternativas
  const skinOverrides: Record<string, { body: string; shadow: string; belly: string; accent: string }> = {
    skin_gold: { body: "#F59E0B", shadow: "#D97706", belly: "#FEF3C7", accent: "#FBBF24" },
    skin_shadow: { body: "#1E293B", shadow: "#0F172A", belly: "#334155", accent: "#94A3B8" },
    skin_snow: { body: "#F8FAFC", shadow: "#E2E8F0", belly: "#FFFFFF", accent: "#38BDF8" },
    skin_neon: { body: "#06B6D4", shadow: "#0891B2", belly: "#CFFAFE", accent: "#A855F7" },
  };

  // Configuración de anclaje de ropa y accesorios adaptados pixel a pixel por mascota
  const offsets = petClothingOffsets[species] || petClothingOffsets.cat;

  const col = (colorSkin && skinOverrides[colorSkin]) ? skinOverrides[colorSkin] : (baseSpeciesColors[species] || baseSpeciesColors.cat);

  // 0. Renderizado de Aura / Efectos visuales de fondo
  const renderAura = () => {
    if (!aura || isSleeping) return null;

    switch (aura) {
      case "fire":
        return (
          <g id="aura-fire" opacity="0.85">
            <path d="M4 22 C 2 16, 6 10, 8 14 C 10 8, 16 4, 18 10 C 22 6, 26 12, 24 18 C 28 22, 22 28, 16 28 C 8 28, 4 26, 4 22 Z" fill="#EF4444" opacity="0.3" />
            <path d="M6 24 C 5 18, 9 14, 11 16 C 13 10, 19 8, 20 14 C 23 12, 25 16, 23 20 Z" fill="#F59E0B" opacity="0.5" />
            <rect x="3" y="15" width="2" height="2" fill="#FACC15" className="animate-ping" />
            <rect x="27" y="13" width="2" height="2" fill="#FACC15" className="animate-ping" />
            <rect x="15" y="2" width="2" height="3" fill="#EF4444" className="animate-bounce" />
          </g>
        );

      case "stars":
        return (
          <g id="aura-stars">
            <rect x="3" y="6" width="2" height="2" fill="#FACC15" className="animate-ping" />
            <rect x="27" y="8" width="2" height="2" fill="#FDE047" className="animate-pulse" />
            <rect x="5" y="24" width="2" height="2" fill="#38BDF8" className="animate-pulse" />
            <rect x="26" y="22" width="2" height="2" fill="#A855F7" className="animate-ping" />
            <polygon points="16,0 17,3 20,3 17.5,5 18.5,8 16,6 13.5,8 14.5,5 12,3 15,3" fill="#FACC15" className="animate-bounce" />
          </g>
        );

      case "electric":
        return (
          <g id="aura-electric">
            <path d="M2 14 l3 -3 l-1 3 l3 -1 l-2 4" stroke="#00E5FF" strokeWidth="1" fill="none" className="animate-pulse" />
            <path d="M26 10 l3 3 l-2 1 l3 3" stroke="#00E5FF" strokeWidth="1" fill="none" className="animate-pulse" />
            <path d="M14 1 l2 3 l-2 1 l3 3" stroke="#FACC15" strokeWidth="1" fill="none" />
            <rect x="1" y="20" width="1" height="3" fill="#00E5FF" />
            <rect x="29" y="18" width="2" height="2" fill="#00E5FF" />
          </g>
        );

      case "hearts":
        return (
          <g id="aura-hearts">
            <path d="M4 10 h2 v2 h-1 v1 h-1 v-1 h-1 v-1 h1 z" fill="#FF2E93" className="animate-bounce" />
            <path d="M26 8 h2 v2 h-1 v1 h-1 v-1 h-1 v-1 h1 z" fill="#FF2E93" className="animate-bounce" />
            <path d="M2 22 h2 v2 h-1 v1 h-1 v-1 h-1 v-1 h1 z" fill="#FB7185" className="animate-pulse" />
            <path d="M27 20 h2 v2 h-1 v1 h-1 v-1 h-1 v-1 h1 z" fill="#FB7185" className="animate-pulse" />
          </g>
        );

      case "bubbles":
        return (
          <g id="aura-bubbles">
            <circle cx="5" cy="12" r="2.5" fill="none" stroke="#38BDF8" strokeWidth="1" />
            <circle cx="27" cy="14" r="2" fill="none" stroke="#38BDF8" strokeWidth="1" />
            <circle cx="8" cy="4" r="1.5" fill="none" stroke="#67E8F9" strokeWidth="1" />
            <circle cx="24" cy="24" r="2" fill="none" stroke="#38BDF8" strokeWidth="1" />
          </g>
        );

      default:
        return null;
    }
  };

  // 1. Renderizado del cuerpo pixelado según la especie (viewBox 32x32)
  const renderPetBody = () => {
    switch (species) {
      case "cat":
        return (
          <g id="michi-body">
            {/* Orejas de gato */}
            <path d="M7 6 h3 v2 h-1 v2 h-2 z" fill={col.body} />
            <path d="M8 7 h1 v1 h-1 z" fill={col.accent} />
            <path d="M22 6 h3 v2 h-1 v2 h-2 z" fill={col.body} />
            <path d="M23 7 h1 v1 h-1 z" fill={col.accent} />
            
            {/* Cabeza */}
            <rect x="8" y="8" width="16" height="12" fill={col.body} rx="1" />
            <rect x="8" y="19" width="16" height="1" fill={col.shadow} />

            {/* Bigotes */}
            <rect x="5" y="14" width="2" height="1" fill="#18181B" />
            <rect x="4" y="16" width="3" height="1" fill="#18181B" />
            <rect x="25" y="14" width="2" height="1" fill="#18181B" />
            <rect x="25" y="16" width="3" height="1" fill="#18181B" />

            {/* Cuerpo */}
            <rect x="10" y="20" width="12" height="8" fill={col.body} />
            {/* Pancita */}
            <rect x="13" y="21" width="6" height="6" fill={col.belly} />
            
            {/* Patitas delanteras */}
            <rect x="11" y="27" width="3" height="2" fill={col.shadow} />
            <rect x="18" y="27" width="3" height="2" fill={col.shadow} />

            {/* Colita ondeante */}
            <path d="M22 23 h3 v-3 h2 v-2 h1 v-2 h-2 v2 h-2 v3 h-2 z" fill={col.shadow} />
          </g>
        );

      case "dog":
        return (
          <g id="shiba-body">
            {/* Orejas de perro triangulares */}
            <path d="M6 7 h4 v4 h-2 v-2 h-2 z" fill={col.body} />
            <path d="M22 7 h4 v4 h-2 v-2 h-2 z" fill={col.body} />
            
            {/* Cabeza */}
            <rect x="8" y="8" width="16" height="12" fill={col.body} />
            {/* Manchas en mejillas */}
            <rect x="8" y="14" width="3" height="5" fill={col.belly} />
            <rect x="21" y="14" width="3" height="5" fill={col.belly} />

            {/* Manchas de cejas kawaii */}
            <rect x="11" y="9" width="2" height="1" fill={col.belly} />
            <rect x="19" y="9" width="2" height="1" fill={col.belly} />

            {/* Cuerpo */}
            <rect x="10" y="20" width="12" height="8" fill={col.body} />
            <rect x="12" y="20" width="8" height="7" fill={col.belly} />

            {/* Patitas */}
            <rect x="10" y="27" width="3" height="2" fill={col.shadow} />
            <rect x="19" y="27" width="3" height="2" fill={col.shadow} />

            {/* Colita enroscada en la espalda */}
            <rect x="22" y="20" width="4" height="4" fill={col.shadow} />
            <rect x="23" y="19" width="2" height="2" fill={col.belly} />
          </g>
        );

      case "dragon":
        return (
          <g id="draco-body">
            {/* Cuernitos dorados */}
            <path d="M8 5 h2 v3 h-2 z" fill={col.accent} />
            <path d="M22 5 h2 v3 h-2 z" fill={col.accent} />

            {/* Alitas de murciélago en la espalda */}
            <path d="M4 14 h4 v4 h-2 v-2 h-2 z" fill={col.accent} />
            <path d="M24 14 h4 v4 h-2 v-2 h-2 z" fill={col.accent} />

            {/* Cabeza */}
            <rect x="8" y="8" width="16" height="12" fill={col.body} />
            {/* Escamas de la cresta */}
            <rect x="15" y="6" width="2" height="2" fill={col.accent} />

            {/* Cuerpo */}
            <rect x="9" y="20" width="14" height="8" fill={col.body} />
            {/* Pancita con placas doradas */}
            <rect x="12" y="20" width="8" height="7" fill={col.belly} />
            <rect x="12" y="22" width="8" height="1" fill={col.shadow} opacity="0.6" />
            <rect x="12" y="24" width="8" height="1" fill={col.shadow} opacity="0.6" />

            {/* Patitas */}
            <rect x="10" y="27" width="3" height="2" fill={col.shadow} />
            <rect x="19" y="27" width="3" height="2" fill={col.shadow} />

            {/* Colita con fuego */}
            <path d="M23 23 h3 v-2 h2 v-2 h-2 v1 h-2 v2 h-1 z" fill={col.shadow} />
            <rect x="27" y="17" width="2" height="2" fill="#FFD166" />
            <rect x="28" y="16" width="1" height="1" fill="#FF5C5C" />
          </g>
        );

      case "penguin":
        return (
          <g id="pingu-body">
            {/* Cabeza y cuerpo redondeado */}
            <rect x="8" y="8" width="16" height="19" fill={col.body} rx="3" />
            
            {/* Gran pancita blanca */}
            <rect x="11" y="14" width="10" height="13" fill={col.belly} rx="2" />

            {/* Aletitas que aletean */}
            <rect x="5" y="16" width="3" height="7" fill={col.body} />
            <rect x="24" y="16" width="3" height="7" fill={col.body} />

            {/* Patitas planas naranjas */}
            <rect x="10" y="27" width="4" height="2" fill={col.accent} />
            <rect x="18" y="27" width="4" height="2" fill={col.accent} />
          </g>
        );

      case "bunny":
        return (
          <g id="bunny-body">
            {/* Orejas largas de conejo */}
            <rect x="9" y="3" width="4" height="7" fill={col.body} />
            <rect x="10" y="4" width="2" height="5" fill={col.accent} />
            <rect x="19" y="3" width="4" height="7" fill={col.body} />
            <rect x="20" y="4" width="2" height="5" fill={col.accent} />

            {/* Cabeza */}
            <rect x="8" y="9" width="16" height="11" fill={col.body} />
            
            {/* Mejillas con rubor pixel */}
            <rect x="9" y="16" width="2" height="1" fill={col.accent} />
            <rect x="21" y="16" width="2" height="1" fill={col.accent} />

            {/* Cuerpo */}
            <rect x="10" y="20" width="12" height="8" fill={col.body} />
            <rect x="13" y="21" width="6" height="6" fill={col.belly} />

            {/* Patitas */}
            <rect x="10" y="27" width="4" height="2" fill={col.shadow} />
            <rect x="18" y="27" width="4" height="2" fill={col.shadow} />

            {/* Colita pompón */}
            <rect x="22" y="23" width="3" height="3" fill="#FFFFFF" />
          </g>
        );

      case "axolotl":
        return (
          <g id="axol-body">
            {/* Branquias laterales ramificadas (izquierda) */}
            <path d="M4 8 h4 v2 h-4 z M3 11 h5 v2 h-5 z M4 14 h4 v2 h-4 z" fill={col.shadow} />
            <rect x="5" y="9" width="2" height="1" fill={col.accent} />
            <rect x="4" y="12" width="2" height="1" fill={col.accent} />
            <rect x="5" y="15" width="2" height="1" fill={col.accent} />

            {/* Branquias laterales ramificadas (derecha) */}
            <path d="M24 8 h4 v2 h-4 z M24 11 h5 v2 h-5 z M24 14 h4 v2 h-4 z" fill={col.shadow} />
            <rect x="25" y="9" width="2" height="1" fill={col.accent} />
            <rect x="26" y="12" width="2" height="1" fill={col.accent} />
            <rect x="25" y="15" width="2" height="1" fill={col.accent} />

            {/* Cabeza ancha */}
            <rect x="8" y="8" width="16" height="12" fill={col.body} />
            
            {/* Cuerpo */}
            <rect x="10" y="20" width="12" height="8" fill={col.body} />
            <rect x="12" y="21" width="8" height="6" fill={col.belly} />

            {/* Patitas */}
            <rect x="10" y="27" width="3" height="2" fill={col.shadow} />
            <rect x="19" y="27" width="3" height="2" fill={col.shadow} />

            {/* Colita de ajolote suave */}
            <path d="M22 22 h4 v4 h-2 v-2 h-2 z" fill={col.accent} />
          </g>
        );
    }
  };

  // 2. Renderizado de Expresiones y Cara
  const renderFace = () => {
    if (isSleeping) {
      return (
        <g id="face-sleeping">
          <rect x="11" y="13" width="3" height="1" fill="#18181B" />
          <rect x="18" y="13" width="3" height="1" fill="#18181B" />
          <rect x="15" y="16" width="2" height="1" fill="#18181B" />
          <path d="M23 4 h4 v1 l-3 3 h3 v1 h-4 v-1 l3 -3 h-3 z" fill="#38BDF8" className="animate-bounce" />
          <path d="M20 1 h3 v1 l-2 2 h2 v1 h-3 v-1 l2 -2 h-2 z" fill="#818CF8" />
        </g>
      );
    }

    if (isSick) {
      return (
        <g id="face-sick">
          <rect x="11" y="12" width="1" height="1" fill="#18181B" />
          <rect x="13" y="12" width="1" height="1" fill="#18181B" />
          <rect x="12" y="13" width="1" height="1" fill="#18181B" />
          <rect x="11" y="14" width="1" height="1" fill="#18181B" />
          <rect x="13" y="14" width="1" height="1" fill="#18181B" />

          <rect x="18" y="12" width="1" height="1" fill="#18181B" />
          <rect x="20" y="12" width="1" height="1" fill="#18181B" />
          <rect x="19" y="13" width="1" height="1" fill="#18181B" />
          <rect x="18" y="14" width="1" height="1" fill="#18181B" />
          <rect x="20" y="14" width="1" height="1" fill="#18181B" />

          <rect x="14" y="17" width="4" height="1" fill="#18181B" />
          <rect x="7" y="10" width="1" height="2" fill="#38BDF8" />
          <rect x="8" y="11" width="1" height="2" fill="#38BDF8" />
        </g>
      );
    }

    if (isEating) {
      return (
        <g id="face-eating">
          <path d="M11 14 l1 -1 l1 1" stroke="#18181B" strokeWidth="1" fill="none" />
          <path d="M18 14 l1 -1 l1 1" stroke="#18181B" strokeWidth="1" fill="none" />
          <rect x="14" y="15" width="4" height="3" fill="#18181B" />
          <rect x="15" y="16" width="2" height="1" fill="#EF4444" />
          <rect x="9" y="14" width="2" height="1" fill="#FB7185" />
          <rect x="21" y="14" width="2" height="1" fill="#FB7185" />
        </g>
      );
    }

    return (
      <g id="face-normal">
        <rect x="11" y="12" width="3" height="4" fill="#18181B" />
        <rect x="11" y="12" width="1" height="2" fill="#FFFFFF" />
        <rect x="18" y="12" width="3" height="4" fill="#18181B" />
        <rect x="18" y="12" width="1" height="2" fill="#FFFFFF" />

        {species === "penguin" ? (
          <polygon points="14,15 18,15 16,18" fill="#F97316" />
        ) : (
          <rect x="15" y="15" width="2" height="1" fill="#18181B" />
        )}

        {species !== "penguin" && (
          <path d="M14 17 h1 v1 h2 v-1 h1" stroke="#18181B" strokeWidth="1" fill="none" />
        )}

        <rect x="9" y="15" width="2" height="1" fill="#FB7185" />
        <rect x="21" y="15" width="2" height="1" fill="#FB7185" />
      </g>
    );
  };

  // 3. Renderizado de Trajes y Ropa (Outfits)
  const renderOutfit = () => {
    if (!outfit) return null;

    switch (outfit) {
      case "cape":
        return (
          <g id="outfit-cape">
            <path d="M7 19 h3 v9 h-3 z" fill="#DC2626" />
            <path d="M22 19 h3 v9 h-3 z" fill="#DC2626" />
            <rect x="6" y="27" width="2" height="2" fill="#B91C1C" />
            <rect x="24" y="27" width="2" height="2" fill="#B91C1C" />
            <rect x="15" y="19" width="2" height="2" fill="#FACC15" />
          </g>
        );

      case "scarf":
        return (
          <g id="outfit-scarf">
            <rect x="9" y="19" width="14" height="3" fill="#EF4444" />
            <rect x="12" y="19" width="2" height="3" fill="#FFFFFF" />
            <rect x="17" y="19" width="2" height="3" fill="#FFFFFF" />
            <rect x="18" y="22" width="3" height="5" fill="#EF4444" />
            <rect x="18" y="24" width="3" height="1" fill="#FFFFFF" />
            <rect x="18" y="26" width="3" height="1" fill="#FBBF24" />
          </g>
        );

      case "tie":
        return (
          <g id="outfit-tie">
            <rect x="13" y="19" width="6" height="2" fill="#FFFFFF" />
            <rect x="14" y="20" width="4" height="2" fill="#DC2626" />
            <rect x="15" y="21" width="2" height="1" fill="#7F1D1D" />
          </g>
        );

      case "hoodie":
        return (
          <g id="outfit-hoodie">
            <rect x="10" y="20" width="12" height="7" fill="#0284C7" />
            <rect x="15" y="20" width="2" height="7" fill="#FFFFFF" />
            <rect x="12" y="24" width="8" height="2" fill="#0369A1" />
          </g>
        );

      case "armor":
        return (
          <g id="outfit-armor">
            <rect x="10" y="20" width="12" height="7" fill="#94A3B8" />
            <rect x="11" y="21" width="10" height="5" fill="#CBD5E1" />
            <rect x="15" y="22" width="2" height="4" fill="#FACC15" />
            <rect x="14" y="23" width="4" height="1" fill="#FACC15" />
            <rect x="8" y="19" width="3" height="3" fill="#64748B" />
            <rect x="21" y="19" width="3" height="3" fill="#64748B" />
          </g>
        );

      case "medal":
        return (
          <g id="outfit-medal">
            <path d="M13 19 l2 3 l2 -3" stroke="#2563EB" strokeWidth="1" fill="none" />
            <circle cx="16" cy="23" r="2.5" fill="#FACC15" stroke="#CA8A04" strokeWidth="0.5" />
          </g>
        );

      case "kimono":
        return (
          <g id="outfit-kimono">
            <rect x="10" y="20" width="12" height="8" fill="#E11D48" />
            <path d="M12 20 l4 4 l4 -4" stroke="#FFF" strokeWidth="1" fill="none" />
            <rect x="10" y="24" width="12" height="2" fill="#FACC15" />
            <rect x="14" y="24" width="4" height="2" fill="#CA8A04" />
          </g>
        );

      case "spacesuit":
        return (
          <g id="outfit-spacesuit">
            <rect x="9" y="19" width="14" height="9" fill="#E2E8F0" rx="1" />
            <rect x="12" y="21" width="8" height="5" fill="#3B82F6" />
            <rect x="13" y="22" width="2" height="2" fill="#EF4444" />
            <rect x="17" y="22" width="2" height="2" fill="#10B981" />
          </g>
        );

      case "ninja":
        return (
          <g id="outfit-ninja">
            <rect x="10" y="20" width="12" height="8" fill="#18181B" />
            <rect x="10" y="24" width="12" height="2" fill="#DC2626" />
            <path d="M12 20 l4 3 l4 -3" stroke="#DC2626" strokeWidth="0.8" fill="none" />
          </g>
        );

      case "tuxedo":
        return (
          <g id="outfit-tuxedo">
            <rect x="10" y="20" width="12" height="8" fill="#09090B" />
            <polygon points="16,20 13,24 19,24" fill="#FFFFFF" />
            <rect x="15" y="21" width="2" height="1" fill="#DC2626" />
          </g>
        );

      case "doctor":
        return (
          <g id="outfit-doctor">
            <rect x="10" y="20" width="12" height="8" fill="#F8FAFC" />
            <path d="M11 20 v4 l5 2 l5 -2 v-4" stroke="#0284C7" strokeWidth="1" fill="none" />
            <circle cx="16" cy="26" r="1.5" fill="#94A3B8" />
          </g>
        );

      case "sweater":
        return (
          <g id="outfit-sweater">
            <rect x="10" y="20" width="12" height="8" fill="#15803D" />
            <rect x="11" y="22" width="10" height="1" fill="#DC2626" />
            <rect x="11" y="25" width="10" height="1" fill="#FFFFFF" />
          </g>
        );

      default:
        return null;
    }
  };

  // 4. Renderizado de Sombreros (Hats)
  const renderHat = () => {
    if (!hat) return null;

    switch (hat) {
      case "cap":
        return (
          <g id="hat-cap">
            <rect x="9" y="5" width="14" height="4" fill="#EF4444" rx="1" />
            <rect x="11" y="4" width="10" height="2" fill="#DC2626" />
            <rect x="15" y="3" width="2" height="1" fill="#FFFFFF" />
            <rect x="16" y="8" width="9" height="2" fill="#B91C1C" />
          </g>
        );

      case "crown":
        return (
          <g id="hat-crown">
            <path d="M9 8 h14 v-3 l-3 2 l-4 -4 l-4 4 l-3 -2 z" fill="#FACC15" stroke="#CA8A04" strokeWidth="0.5" />
            <rect x="15" y="6" width="2" height="2" fill="#EF4444" />
            <rect x="9" y="4" width="1" height="1" fill="#38BDF8" />
            <rect x="22" y="4" width="1" height="1" fill="#38BDF8" />
          </g>
        );

      case "wizard":
        return (
          <g id="hat-wizard">
            <polygon points="16,0 23,8 9,8" fill="#7C3AED" />
            <rect x="7" y="7" width="18" height="2" fill="#5B21B6" rx="1" />
            <rect x="11" y="6" width="10" height="1" fill="#FACC15" />
            <rect x="15" y="4" width="2" height="2" fill="#FDE047" />
          </g>
        );

      case "sunglasses":
        return (
          <g id="hat-sunglasses">
            <rect x="9" y="12" width="14" height="4" fill="#18181B" />
            <rect x="8" y="13" width="16" height="2" fill="#18181B" />
            <rect x="10" y="12" width="1" height="1" fill="#FFFFFF" />
            <rect x="11" y="13" width="1" height="1" fill="#FFFFFF" />
            <rect x="17" y="12" width="1" height="1" fill="#FFFFFF" />
            <rect x="18" y="13" width="1" height="1" fill="#FFFFFF" />
          </g>
        );

      case "bow":
        return (
          <g id="hat-bow">
            <polygon points="7,5 11,5 9,7" fill="#EF4444" />
            <polygon points="7,9 11,9 9,7" fill="#EF4444" />
            <rect x="8" y="6" width="2" height="2" fill="#FFFFFF" />
          </g>
        );

      case "tophat":
        return (
          <g id="hat-tophat">
            <rect x="11" y="2" width="10" height="7" fill="#18181B" />
            <rect x="8" y="8" width="16" height="2" fill="#18181B" rx="1" />
            <rect x="11" y="7" width="10" height="1" fill="#DC2626" />
          </g>
        );

      case "headphones":
        return (
          <g id="hat-headphones">
            <path d="M8 12 C 8 4, 24 4, 24 12" stroke="#06B6D4" strokeWidth="2" fill="none" />
            <rect x="6" y="10" width="3" height="6" fill="#06B6D4" rx="1" />
            <rect x="7" y="11" width="1" height="4" fill="#22D3EE" />
            <rect x="23" y="10" width="3" height="6" fill="#06B6D4" rx="1" />
            <rect x="24" y="11" width="1" height="4" fill="#22D3EE" />
          </g>
        );

      case "bandana":
        return (
          <g id="hat-bandana">
            <rect x="8" y="7" width="16" height="3" fill="#DC2626" />
            <rect x="14" y="8" width="4" height="1" fill="#FFFFFF" />
            <path d="M8 8 l-4 2 l1 2 l4 -2 z" fill="#B91C1C" />
            <path d="M8 9 l-3 4 l2 1 l3 -3 z" fill="#DC2626" />
          </g>
        );

      case "viking":
        return (
          <g id="hat-viking">
            <rect x="9" y="5" width="14" height="4" fill="#94A3B8" />
            <path d="M7 6 l-3 -3 l1 4 z" fill="#F4F1DE" />
            <path d="M25 6 l3 -3 l-1 4 z" fill="#F4F1DE" />
            <rect x="14" y="5" width="4" height="4" fill="#64748B" />
          </g>
        );

      case "pirate":
        return (
          <g id="hat-pirate">
            <path d="M7 7 h18 l-2 -5 h-14 z" fill="#09090B" />
            <rect x="15" y="4" width="2" height="2" fill="#FFFFFF" />
            <rect x="13" y="7" width="6" height="1" fill="#DC2626" />
          </g>
        );

      case "halo":
        return (
          <g id="hat-halo">
            <ellipse cx="16" cy="3" rx="7" ry="2" fill="none" stroke="#FACC15" strokeWidth="1.5" className="animate-pulse" />
          </g>
        );

      case "horns":
        return (
          <g id="hat-horns">
            <path d="M8 7 l-2 -5 l4 2 z" fill="#DC2626" />
            <path d="M24 7 l2 -5 l-4 2 z" fill="#DC2626" />
          </g>
        );

      case "chef":
        return (
          <g id="hat-chef">
            <rect x="10" y="6" width="12" height="3" fill="#E2E8F0" />
            <circle cx="12" cy="4" r="3" fill="#FFFFFF" />
            <circle cx="16" cy="3" r="3.5" fill="#FFFFFF" />
            <circle cx="20" cy="4" r="3" fill="#FFFFFF" />
          </g>
        );

      case "party":
        return (
          <g id="hat-party">
            <polygon points="16,0 20,8 12,8" fill="#F43F5E" />
            <rect x="15" y="0" width="2" height="2" fill="#FACC15" />
            <line x1="14" y1="3" x2="18" y2="3" stroke="#38BDF8" strokeWidth="1" />
            <line x1="13" y1="6" x2="19" y2="6" stroke="#FACC15" strokeWidth="1" />
          </g>
        );

      case "astronaut":
        return (
          <g id="hat-astronaut">
            <circle cx="16" cy="14" r="10" fill="none" stroke="#CBD5E1" strokeWidth="2" />
            <ellipse cx="16" cy="13" rx="7" ry="5" fill="#0284C7" opacity="0.35" />
          </g>
        );

      case "flower":
        return (
          <g id="hat-flower">
            <circle cx="23" cy="7" r="3" fill="#FB7185" />
            <circle cx="23" cy="7" r="1" fill="#FACC15" />
          </g>
        );

      default:
        return null;
    }
  };

  // 5. Renderizado de Objetos en Mano (Held Items)
  const renderHeldItem = () => {
    if (!heldItem || isSleeping) return null;

    switch (heldItem) {
      case "banana_nanotech":
        return (
          <g id="held-nanobanana" transform="translate(23, 16)">
            {/* Nano Banana Cyberpunk */}
            <path d="M2 1 C 5 2, 7 6, 7 10 C 6 10, 4 9, 3 7 C 2 5, 2 3, 2 1 Z" fill="#FACC15" />
            <path d="M4 3 C 5 5, 5 7, 4 9" stroke="#00E5FF" strokeWidth="0.8" fill="none" className="animate-pulse" />
            <rect x="2" y="0" width="1" height="1" fill="#15803D" />
            <rect x="6" y="5" width="1" height="1" fill="#00E5FF" className="animate-ping" />
          </g>
        );

      case "sword":
        return (
          <g id="held-sword" transform="translate(24, 13)">
            <rect x="2" y="0" width="2" height="10" fill="#E2E8F0" />
            <rect x="0" y="8" width="6" height="1.5" fill="#D97706" />
            <rect x="2" y="9.5" width="2" height="3" fill="#78350F" />
          </g>
        );

      case "wand":
        return (
          <g id="held-wand" transform="translate(24, 12)">
            <rect x="2" y="4" width="1.5" height="10" fill="#78350F" />
            <polygon points="3,0 4,2 6,2 4.5,3.5 5,6 3,4.5 1,6 1.5,3.5 0,2 2,2" fill="#FACC15" />
          </g>
        );

      case "shield":
        return (
          <g id="held-shield" transform="translate(23, 18)">
            <path d="M0 0 h7 v5 c0 3 -3 5 -3.5 5 c-0.5 0 -3.5 -2 -3.5 -5 z" fill="#3B82F6" stroke="#1E40AF" strokeWidth="0.8" />
            <rect x="3" y="2" width="1" height="5" fill="#FACC15" />
            <rect x="1" y="4" width="5" height="1" fill="#FACC15" />
          </g>
        );

      case "balloon":
        return (
          <g id="held-balloon" transform="translate(24, 1)">
            <line x1="3" y1="12" x2="3" y2="20" stroke="#71717A" strokeWidth="0.8" />
            <ellipse cx="3" cy="6" rx="4" ry="5" fill="#EF4444" />
            <polygon points="2,11 4,11 3,13" fill="#DC2626" />
          </g>
        );

      case "gameboy":
        return (
          <g id="held-gameboy" transform="translate(23, 19)">
            <rect x="0" y="0" width="6" height="8" fill="#8B5CF6" rx="0.5" />
            <rect x="1" y="1" width="4" height="3" fill="#9BBC0F" />
            <rect x="1" y="5" width="2" height="2" fill="#18181B" />
            <circle cx="4.5" cy="6" r="0.8" fill="#DC2626" />
          </g>
        );

      case "fish_pole":
        return (
          <g id="held-pole" transform="translate(23, 10)">
            <line x1="0" y1="14" x2="6" y2="0" stroke="#92400E" strokeWidth="1" />
            <line x1="6" y1="0" x2="6" y2="12" stroke="#CBD5E1" strokeWidth="0.5" />
            <polygon points="5,11 7,12 5,13" fill="#38BDF8" />
          </g>
        );

      default:
        return null;
    }
  };

  // 6. Renderizado de Alimento cuando come (incluye la Nano Banana)
  const renderFood = () => {
    if (!isEating && !foodId) return null;
    const food = foodId || "apple";

    return (
      <g id="pixel-food" transform="translate(1, 15)">
        {food === "nano_banana" && (
          <g>
            <path d="M2 1 C 5 2, 7 6, 7 9 C 6 9, 4 8, 3 6 C 2 4, 2 3, 2 1 Z" fill="#FACC15" />
            <path d="M4 3 C 5 5, 5 7, 4 8" stroke="#00E5FF" strokeWidth="0.8" fill="none" className="animate-pulse" />
            <rect x="2" y="0" width="1" height="1" fill="#15803D" />
            <rect x="5" y="4" width="1" height="1" fill="#00E5FF" className="animate-ping" />
          </g>
        )}
        {food === "apple" && (
          <g>
            <circle cx="5" cy="5" r="4" fill="#EF4444" />
            <rect x="4" y="0" width="1" height="2" fill="#15803D" />
            <rect x="3" y="3" width="1" height="1" fill="#FCA5A5" />
          </g>
        )}
        {food === "pizza" && (
          <polygon points="1,2 8,2 5,8" fill="#FACC15" stroke="#DC2626" strokeWidth="0.5" />
        )}
        {food === "burger" && (
          <g>
            <rect x="2" y="2" width="6" height="2" fill="#D97706" rx="1" />
            <rect x="2" y="4" width="6" height="1" fill="#16A34A" />
            <rect x="2" y="5" width="6" height="1" fill="#78350F" />
            <rect x="2" y="6" width="6" height="2" fill="#D97706" rx="1" />
          </g>
        )}
        {food === "cookie" && (
          <circle cx="5" cy="5" r="4" fill="#D97706" stroke="#78350F" strokeWidth="0.5" />
        )}
        {food === "donut" && (
          <g>
            <circle cx="5" cy="5" r="4" fill="#F472B6" />
            <circle cx="5" cy="5" r="1.5" fill="#9BBC0F" />
            <rect x="4" y="2" width="1" height="1" fill="#FACC15" />
            <rect x="6" y="4" width="1" height="1" fill="#38BDF8" />
          </g>
        )}
        {food === "potion" && (
          <g>
            <rect x="4" y="1" width="2" height="2" fill="#E2E8F0" />
            <rect x="3" y="3" width="4" height="5" fill="#8B5CF6" rx="1" />
            <rect x="4" y="4" width="1" height="1" fill="#C4B5FD" />
          </g>
        )}
      </g>
    );
  };

  if (isDead) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "relative flex items-center justify-center select-none transition-transform",
          className
        )}
      >
        <svg
          viewBox="0 0 32 32"
          width={size}
          height={size}
          style={{ shapeRendering: "crispEdges", imageRendering: "pixelated" }}
          className="w-full h-full filter drop-shadow-sm"
        >
          {/* Lápida estilo Tamagotchi retro */}
          <g id="tombstone">
            {/* Base de tierra */}
            <rect x="5" y="27" width="22" height="2" fill="#3F3F46" />
            <rect x="3" y="28" width="26" height="2" fill="#18181B" />
            
            {/* Bloque principal de la lápida */}
            <rect x="8" y="10" width="16" height="17" fill="#71717A" />
            <rect x="9" y="8" width="14" height="2" fill="#71717A" />
            <rect x="11" y="7" width="10" height="1" fill="#71717A" />
            
            {/* Borde de luz */}
            <rect x="8" y="10" width="1" height="17" fill="#A1A1AA" />
            <rect x="9" y="8" width="1" height="2" fill="#A1A1AA" />
            <rect x="11" y="7" width="10" height="1" fill="#D4D4D8" />
            
            {/* Texto R.I.P. en píxeles */}
            {/* R */}
            <path d="M10 12 h3 v2 h-2 v1 h-1 z M12 14 l1 2 h-1 l-1 -2 z" fill="#18181B" />
            {/* I */}
            <rect x="15" y="12" width="1" height="4" fill="#18181B" />
            {/* P */}
            <path d="M18 12 h3 v3 h-2 v1 h-1 z" fill="#18181B" />
            
            {/* Cruz grabada / grieta */}
            <rect x="15" y="19" width="2" height="6" fill="#52525B" />
            <rect x="13" y="21" width="6" height="2" fill="#52525B" />
            
            {/* Fantasmita alado flotando */}
            <g className="animate-bounce">
              <rect x="13" y="2" width="6" height="4" fill="#F4F4F5" opacity="0.9" />
              <rect x="14" y="3" width="1" height="1" fill="#18181B" />
              <rect x="17" y="3" width="1" height="1" fill="#18181B" />
              <rect x="13" y="0" width="6" height="1" fill="#FACC15" />
            </g>
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "relative flex items-center justify-center select-none transition-transform",
        !isSleeping && "hover:scale-105 active:scale-95",
        className
      )}
    >
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        style={{ shapeRendering: "crispEdges", imageRendering: "pixelated" }}
        className={cn(
          "w-full h-full filter drop-shadow-sm",
          !isSleeping && !isSick && "animate-[bounce_2s_infinite]"
        )}
      >
        {/* Capa 0: Aura y Efectos de Fondo con calibración */}
        <g id="aura-offset-group" transform={`translate(${offsets.aura?.left || 0}, ${offsets.aura?.top || 0})`}>
          {renderAura()}
        </g>

        {/* Capa 1: Cuerpo de la Mascota */}
        {renderPetBody()}

        {/* Capa 2: Ropa / Traje adaptado pixel a pixel al torso de la especie */}
        <g id="outfit-offset-group" transform={`translate(${offsets.body.left}, ${offsets.body.top})`}>
          {renderOutfit()}
        </g>

        {/* Capa 3: Expresión Facial / Ojos */}
        {renderFace()}

        {/* Capa 4: Sombrero / Accesorio adaptado a la cabeza y orejas de la especie */}
        <g id="hat-offset-group" transform={`translate(${offsets.hat.left}, ${offsets.hat.top})`}>
          {renderHat()}
        </g>

        {/* Capa 5: Objeto Sostenido en Mano calibrado */}
        <g id="held-offset-group" transform={`translate(${offsets.held?.left || 0}, ${offsets.held?.top || 0})`}>
          {renderHeldItem()}
        </g>

        {/* Capa 6: Alimento cuando está comiendo */}
        {renderFood()}
      </svg>
    </div>
  );
}
