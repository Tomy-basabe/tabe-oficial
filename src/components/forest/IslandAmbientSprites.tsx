import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { SPRITES_DATA, PALETTE } from "./PixelSpritesData";

export interface SpriteProps {
  isMoving?: boolean;
  speed?: "walk" | "run" | "float";
  direction?: 1 | -1;
  className?: string;
  isInspecting?: boolean;
}

/**
 * ESTILOS GLOBALES DE ANIMACIÓN PARA PIXEL ART AMBIENTAL
 * Genera el movimiento a paso clásico de 4 u 8 frames (stepped) con CSS
 * para cero costo de CPU en segundo plano.
 */
export const AmbientSpriteStyles: React.FC = () => (
  <style>{`
    @keyframes pixelWalkStep {
      from { transform: translateX(0); }
      to { transform: translateX(-100%); }
    }
    
    @keyframes ambDustPuff {
      0% { transform: scale(0.4) translate(0, 0); opacity: 0.9; }
      100% { transform: scale(1.6) translate(-8px, -6px); opacity: 0; }
    }

    .pixel-sprite {
      image-rendering: pixelated;
    }

    /* Animación Stepped (4 frames). El translateX(-100%) moverá el contenedor interno completo. */
    .anim-pixel-walk {
      animation: pixelWalkStep 0.8s steps(4) infinite;
    }
    .anim-pixel-run {
      animation: pixelWalkStep 0.4s steps(4) infinite;
    }
    .anim-pixel-idle {
      transform: translateX(0);
    }
      
    .anim-amb-dust { animation: ambDustPuff 0.6s ease-out infinite; }
  `}</style>
);

// Cache de spritesheets pre-renderizados en base64 para máxima performance
const spritesheetCache = new Map<string, string>();

/**
 * Genera un spritesheet en tiempo de ejecución a partir de los datos en matriz de texto.
 * Secuencia de caminado: [Frame 0, Frame 1, Frame 0, Frame 2]
 */
const getOrGenerateSpritesheet = (characterKey: string, scale: number = 3): { uri: string; width: number; height: number } => {
  const cacheKey = `${characterKey}_${scale}`;
  
  const data = SPRITES_DATA[characterKey];
  if (!data) return { uri: "", width: 16, height: 16 };

  const baseWidth = data.frames[0][0].length;
  const baseHeight = data.frames[0].length;
  const renderWidth = baseWidth * scale;
  const renderHeight = baseHeight * scale;

  if (spritesheetCache.has(cacheKey)) {
    return { uri: spritesheetCache.get(cacheKey)!, width: renderWidth, height: renderHeight };
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { uri: "", width: renderWidth, height: renderHeight };

  // El spritesheet contendrá 4 cuadros para la animación de ciclo de carrera lateral
  const animationSequence = [0, 1, 2, 3];
  const framesCount = animationSequence.length;
  
  canvas.width = renderWidth * framesCount;
  canvas.height = renderHeight;

  // Dibujar cada frame en su posición dentro del spritesheet
  animationSequence.forEach((frameIdx, seqIndex) => {
    const frameData = data.frames[frameIdx] || data.frames[0]; // Fallback if frame missing
    const offsetX = seqIndex * renderWidth;

    for (let y = 0; y < baseHeight; y++) {
      for (let x = 0; x < baseWidth; x++) {
        const char = frameData[y][x];
        const color = PALETTE[char] || "transparent";

        if (color !== "transparent") {
          ctx.fillStyle = color;
          ctx.fillRect(offsetX + (x * scale), y * scale, scale, scale);
        }
      }
    }
  });

  const uri = canvas.toDataURL("image/png");
  spritesheetCache.set(cacheKey, uri);
  return { uri, width: renderWidth, height: renderHeight };
};

// Partículas de polvo al pisar (mantenemos el estilo de las partículas porque son vistosas)
const FootstepDust: React.FC<{ direction: 1 | -1; isRunning?: boolean }> = ({ direction, isRunning }) => (
  <div
    className={cn(
      "absolute -bottom-1 pointer-events-none select-none",
      direction === 1 ? "-left-1" : "-right-1"
    )}
  >
    <div className={cn("w-2.5 h-2 rounded-full bg-amber-800/40 dark:bg-white/40 blur-[0.5px] anim-amb-dust", isRunning && "w-3.5 h-2.5")} />
  </div>
);

// Sombra elíptica sobre el terreno
const SpriteShadow: React.FC<{ width?: number }> = ({ width = 36 }) => (
  <div
    style={{ width: `${width}px` }}
    className="h-2 rounded-full bg-black/35 blur-[1px] mx-auto -mt-1 pointer-events-none select-none"
  />
);

/**
 * COMPONENTE BASE PIXEL SPRITE
 * Renderiza cualquier personaje utilizando la técnica CSS Stepped Transform para precisión de píxeles
 */
export const BasePixelSprite: React.FC<SpriteProps & { characterKey: string; scale?: number; yOffset?: number; cssFilter?: string }> = ({
  characterKey,
  isMoving = true,
  speed = "walk",
  direction = 1,
  className,
  scale = 2.5, // Reducido por la grilla 24x24
  yOffset = 0,
  cssFilter = ""
}) => {
  const isRunning = speed === "run";
  
  const { uri, width, height } = useMemo(() => getOrGenerateSpritesheet(characterKey, scale), [characterKey, scale]);

  // Si no se encuentra el sprite, devolver nada para no romper
  if (!uri) return null;

  return (
    <div
      className={cn("relative flex flex-col items-center select-none", className)}
      style={{ transform: `scaleX(${direction}) translateY(${yOffset}px)` }}
    >
      {isMoving && speed !== "float" && <FootstepDust direction={1} isRunning={isRunning} />}
      
      {/* Contenedor del Sprite (Mask frame con tamaño exacto de 1 frame) */}
      <div 
        style={{ width: `${width}px`, height: `${height}px` }} 
        className="overflow-hidden relative"
      >
        <div
          className={cn(
            "pixel-sprite absolute top-0 left-0 h-full flex",
            isMoving 
              ? (isRunning ? "anim-pixel-run" : "anim-pixel-walk") 
              : "anim-pixel-idle"
          )}
          style={{ width: `${width * 4}px` }}
        >
          <img 
            src={uri} 
            alt={characterKey} 
            className="h-full object-cover pixel-sprite max-w-none" 
            style={{ width: `${width * 4}px`, filter: cssFilter }}
          />
        </div>
      </div>

      <SpriteShadow width={width * 0.8} />
    </div>
  );
};

// =========================================================================
// 1. ISLA CLÁSICA (BOSQUE / NATURALEZA)
// =========================================================================

export const ExplorerSprite: React.FC<SpriteProps> = (props) => (
  <BasePixelSprite characterKey="explorer" scale={2.5} {...props} />
);

export const WoodlandFoxSprite: React.FC<SpriteProps> = (props) => (
  <BasePixelSprite characterKey="fox" scale={2.2} yOffset={2} {...props} />
);

// =========================================================================
// 2. ISLA PIZZA (COMIDA / FAST FOOD)
// =========================================================================

export const PizzaChefSprite: React.FC<SpriteProps> = (props) => (
  <BasePixelSprite characterKey="chef" scale={2.5} {...props} />
);

export const LivingPizzaSliceSprite: React.FC<SpriteProps> = (props) => (
  <BasePixelSprite characterKey="pizza_slice" scale={2.3} yOffset={4} {...props} />
);

// =========================================================================
// 3. ISLA GAMING (HALO / MASTER CHIEF & GRUNTS / RETRO)
// =========================================================================

export const MasterChiefSprite: React.FC<SpriteProps> = (props) => (
  <BasePixelSprite characterKey="master_chief" scale={2.5} yOffset={0} {...props} />
);

export const GruntSprite: React.FC<SpriteProps> = (props) => (
  <BasePixelSprite characterKey="grunt" scale={2.2} yOffset={3} {...props} />
);

// =========================================================================
// 4. ISLA ESTUDIO (ACADEMIA / EXÁMENES)
// =========================================================================

export const HurriedStudentSprite: React.FC<SpriteProps> = (props) => (
  <BasePixelSprite characterKey="hurried_student" scale={2.5} {...props} />
);

export const CoffeeScholarSprite: React.FC<SpriteProps> = (props) => (
  <BasePixelSprite characterKey="coffee_scholar" scale={2.5} {...props} />
);

// =========================================================================
// 5. ISLA CÓSMICA (ESPACIO / GRAVEDAD CERO)
// =========================================================================

export const ZeroGAstronautSprite: React.FC<SpriteProps> = (props) => (
  <BasePixelSprite characterKey="astronaut" scale={2.5} speed="float" {...props} />
);

export const MiniDroidSprite: React.FC<SpriteProps> = (props) => (
  <BasePixelSprite characterKey="mini_droid" scale={2.3} {...props} />
);
