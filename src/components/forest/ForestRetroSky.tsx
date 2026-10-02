import React from "react";
import { IslandTheme } from "@/hooks/forestIslandsData";
import { Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForestRetroSkyProps {
  isNightMode: boolean;
  currentIsland: IslandTheme;
}

/**
 * Nubes y cielo animado retro estilo 16-bit / arcade con parallax continuo.
 * Funciona de forma 100% fluida con animaciones CSS infinitas.
 */
export const ForestRetroSky: React.FC<ForestRetroSkyProps> = ({
  isNightMode,
  currentIsland,
}) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      <style>{`
        @keyframes retroCloudDriftSlow {
          0% { transform: translate3d(-100%, 0, 0); }
          100% { transform: translate3d(100vw, 0, 0); }
        }
        @keyframes retroCloudDriftFast {
          0% { transform: translate3d(-120%, 0, 0); }
          100% { transform: translate3d(120vw, 0, 0); }
        }
        @keyframes retroShootingStar {
          0% { transform: translate3d(-40px, -40px, 0) rotate(45deg); opacity: 0; }
          10% { opacity: 1; }
          40% { transform: translate3d(240px, 240px, 0) rotate(45deg); opacity: 0; }
          100% { transform: translate3d(240px, 240px, 0) rotate(45deg); opacity: 0; }
        }
        @keyframes retroTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .anim-cloud-slow-1 {
          animation: retroCloudDriftSlow 42s linear infinite;
        }
        .anim-cloud-slow-2 {
          animation: retroCloudDriftSlow 42s linear infinite;
          animation-delay: -21s;
        }
        .anim-cloud-fast-1 {
          animation: retroCloudDriftFast 26s linear infinite;
        }
        .anim-cloud-fast-2 {
          animation: retroCloudDriftFast 26s linear infinite;
          animation-delay: -13s;
        }
        .anim-twinkle-1 { animation: retroTwinkle 2.4s ease-in-out infinite; }
        .anim-twinkle-2 { animation: retroTwinkle 3.2s ease-in-out infinite 0.8s; }
        .anim-twinkle-3 { animation: retroTwinkle 2.8s ease-in-out infinite 1.5s; }
        .anim-shooting-star {
          animation: retroShootingStar 14s ease-in-out infinite 4s;
        }
      `}</style>

      {/* ESTRELLAS Y ELEMENTOS NOCTURNOS */}
      {isNightMode ? (
        <>
          {/* Campo de estrellas retro de 8 bits */}
          <div className="absolute top-6 left-12 w-2 h-2 bg-white rounded-none border border-black shadow-[1px_1px_0_0_#000] anim-twinkle-1" />
          <div className="absolute top-16 left-1/4 w-1.5 h-1.5 bg-amber-200 border border-black anim-twinkle-2" />
          <div className="absolute top-10 left-1/2 w-2 h-2 bg-cyan-200 border border-black anim-twinkle-3" />
          <div className="absolute top-24 left-2/3 w-1.5 h-1.5 bg-purple-200 border border-black anim-twinkle-1" />
          <div className="absolute top-14 right-1/4 w-2 h-2 bg-yellow-200 border border-black anim-twinkle-2" />
          <div className="absolute top-32 left-16 w-1 h-1 bg-white anim-twinkle-3" />
          <div className="absolute top-36 right-16 w-2 h-2 bg-pink-200 border border-black anim-twinkle-1" />

          {/* Estrella fugaz cósmica retro */}
          <div className="absolute top-4 left-1/3 anim-shooting-star pointer-events-none">
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-cyan-200 to-white shadow-[0_0_6px_#fff]" />
          </div>

          {/* Luna Cómic Retro con cráteres */}
          <div
            className={cn(
              "absolute top-5 right-5 sm:top-6 sm:right-6 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-black shadow-[4px_4px_0_0_#000] flex items-center justify-center transition-all",
              currentIsland.moonColor
            )}
          >
            {/* Cráteres retro */}
            <div className="w-4 h-4 rounded-full bg-black/15 border-2 border-black/30 absolute top-2 left-3" />
            <div className="w-2.5 h-2.5 rounded-full bg-black/15 border border-black/30 absolute bottom-3 right-4" />
            <div className="w-2 h-2 rounded-full bg-black/15 border border-black/30 absolute bottom-5 left-5" />
            {/* Brillo de luna cómic */}
            <div className="absolute -inset-1 rounded-full border-2 border-white/40 pointer-events-none" />
          </div>
        </>
      ) : (
        <>
          {/* SOL CÓMIC GIRATORIO */}
          <div
            className={cn(
              "absolute top-5 right-5 sm:top-6 sm:right-6 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-black shadow-[4px_4px_0_0_#000] flex items-center justify-center animate-spin-slow transition-all",
              currentIsland.sunColor
            )}
          >
            <Sun className={cn("w-8 h-8 sm:w-10 sm:h-10", currentIsland.sunIconColor)} />
          </div>
        </>
      )}

      {/* CAPA 1: NUBES DE FONDO (Más lentas, más altas) */}
      <div className="absolute top-4 sm:top-6 w-full h-16 anim-cloud-slow-1">
        <div className="flex items-center gap-1.5 opacity-60">
          <RetroPixelCloud variant="small" isNight={isNightMode} />
          <RetroPixelCloud variant="tiny" isNight={isNightMode} className="ml-24 mt-4" />
        </div>
      </div>
      <div className="absolute top-4 sm:top-6 w-full h-16 anim-cloud-slow-2">
        <div className="flex items-center gap-1.5 opacity-60">
          <RetroPixelCloud variant="medium" isNight={isNightMode} className="ml-40" />
        </div>
      </div>

      {/* CAPA 2: NUBES DE PRIMER PLANO (Más rápidas, con estilo arcade prominente) */}
      <div className="absolute top-12 sm:top-16 w-full h-20 anim-cloud-fast-1">
        <div className="flex items-center gap-8">
          <RetroPixelCloud variant="large" isNight={isNightMode} />
          <RetroPixelCloud variant="medium" isNight={isNightMode} className="ml-64 mt-6" />
        </div>
      </div>
      <div className="absolute top-12 sm:top-16 w-full h-20 anim-cloud-fast-2">
        <div className="flex items-center gap-8">
          <RetroPixelCloud variant="medium" isNight={isNightMode} className="ml-16 mt-2" />
          <RetroPixelCloud variant="large" isNight={isNightMode} className="ml-80" />
        </div>
      </div>
    </div>
  );
};

interface RetroPixelCloudProps {
  variant?: "tiny" | "small" | "medium" | "large";
  isNight?: boolean;
  className?: string;
}

/**
 * Nube estilo Pixel-Art / Cómic Retro de 16-bits con bordes marcados y sombra dura.
 */
const RetroPixelCloud: React.FC<RetroPixelCloudProps> = ({
  variant = "medium",
  isNight = false,
  className,
}) => {
  const baseBg = isNight ? "bg-indigo-900/80" : "bg-white";
  const shadowColor = isNight ? "#0F021B" : "#000";
  const innerShade = isNight ? "bg-indigo-950/70" : "bg-sky-100";

  if (variant === "tiny") {
    return (
      <div className={cn("relative inline-flex items-center select-none", className)}>
        <div
          className={cn(
            "h-4 w-10 border-2 border-black rounded-full relative z-10",
            baseBg
          )}
          style={{ boxShadow: `2px 2px 0 0 ${shadowColor}` }}
        >
          <div
            className={cn(
              "h-5 w-5 border-2 border-black rounded-full absolute -top-2.5 left-2",
              baseBg
            )}
          />
        </div>
      </div>
    );
  }

  if (variant === "small") {
    return (
      <div className={cn("relative inline-flex items-center select-none", className)}>
        <div
          className={cn(
            "h-6 w-16 border-2 border-black rounded-full relative z-10",
            baseBg
          )}
          style={{ boxShadow: `3px 3px 0 0 ${shadowColor}` }}
        >
          <div
            className={cn(
              "h-8 w-8 border-2 border-black rounded-full absolute -top-3.5 left-2",
              baseBg
            )}
          />
          <div
            className={cn(
              "h-6 w-6 border-2 border-black rounded-full absolute -top-2.5 left-7",
              baseBg
            )}
          />
          <div
            className={cn(
              "h-2 w-8 rounded-full absolute bottom-0.5 left-3",
              innerShade
            )}
          />
        </div>
      </div>
    );
  }

  if (variant === "large") {
    return (
      <div className={cn("relative inline-flex items-center select-none", className)}>
        <div
          className={cn(
            "h-9 w-28 border-3 border-black rounded-full relative z-10",
            baseBg
          )}
          style={{ boxShadow: `4px 4px 0 0 ${shadowColor}` }}
        >
          {/* Cúpula principal */}
          <div
            className={cn(
              "h-12 w-12 border-3 border-black rounded-full absolute -top-5 left-4",
              baseBg
            )}
          />
          {/* Cúpula secundaria izquierda */}
          <div
            className={cn(
              "h-9 w-9 border-3 border-black rounded-full absolute -top-3 left-0",
              baseBg
            )}
          />
          {/* Cúpula derecha */}
          <div
            className={cn(
              "h-10 w-10 border-3 border-black rounded-full absolute -top-4 left-14",
              baseBg
            )}
          />
          {/* Sombra interna inferior estilo cómic */}
          <div
            className={cn(
              "h-2.5 w-20 rounded-full absolute bottom-1 left-4",
              innerShade
            )}
          />
        </div>
      </div>
    );
  }

  // Medium (Default)
  return (
    <div className={cn("relative inline-flex items-center select-none", className)}>
      <div
        className={cn(
          "h-7 w-20 border-3 border-black rounded-full relative z-10",
          baseBg
        )}
        style={{ boxShadow: `3px 3px 0 0 ${shadowColor}` }}
      >
        <div
          className={cn(
            "h-10 w-10 border-3 border-black rounded-full absolute -top-4 left-3",
            baseBg
          )}
        />
        <div
          className={cn(
            "h-8 w-8 border-3 border-black rounded-full absolute -top-3 left-9",
            baseBg
          )}
        />
        <div
          className={cn(
            "h-2 w-12 rounded-full absolute bottom-1 left-3",
            innerShade
          )}
        />
      </div>
    </div>
  );
};
