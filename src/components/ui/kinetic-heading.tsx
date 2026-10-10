"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type HoverEffectType =
  | "strike-highlight"   // Tacha con raya roja y revela texto destacado
  | "neon-glow"          // Brillo neón eléctrico con escala
  | "comic-pop"          // Rebote comic con rotación y sombra gruesa
  | "gradient-shift"     // Desplazamiento de gradiente vibrante
  | "glitch-tilt"        // Inclinación cibernética con sombra cian/magenta
  | "wavy-underline"     // Subrayado ondulado expansivo
  | "letter-scatter";    // Ligera dispersión tipográfica

interface KineticHeadingProps {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  className?: string;
  effect?: HoverEffectType;
  accentText?: string;
  strikethroughText?: string;
  badge?: string;
  badgeColor?: "yellow" | "cyan" | "pink" | "green" | "orange";
}

export function KineticHeading({
  children,
  as: Component = "h2",
  className,
  effect = "comic-pop",
  accentText,
  strikethroughText,
  badge,
  badgeColor = "yellow",
}: KineticHeadingProps) {
  const [isHovered, setIsHovered] = useState(false);

  const badgeColors = {
    yellow: "bg-amber-400 text-zinc-950 border-zinc-900 shadow-[2px_2px_0_0_#000] dark:bg-amber-400/20 dark:text-amber-300 dark:border-amber-400/40 dark:shadow-none",
    cyan: "bg-cyan-400 text-zinc-950 border-zinc-900 shadow-[2px_2px_0_0_#000] dark:bg-cyan-400/20 dark:text-cyan-300 dark:border-cyan-400/40 dark:shadow-none",
    pink: "bg-pink-500 text-white border-zinc-900 shadow-[2px_2px_0_0_#000] dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-400/40 dark:shadow-none",
    green: "bg-emerald-500 text-zinc-950 border-zinc-900 shadow-[2px_2px_0_0_#000] dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/40 dark:shadow-none",
    orange: "bg-orange-500 text-white border-zinc-900 shadow-[2px_2px_0_0_#000] dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-400/40 dark:shadow-none",
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="inline-block relative group select-none transition-all duration-300"
    >
      {badge && (
        <motion.div
          animate={isHovered ? { y: -3, scale: 1.05 } : { y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-md border-2 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2",
            badgeColors[badgeColor]
          )}
        >
          {badge}
        </motion.div>
      )}

      <Component
        className={cn(
          "font-black uppercase tracking-tight leading-[1.08] transition-all duration-300",
          className
        )}
      >
        {children}

        {strikethroughText && (
          <span className="relative inline-block mx-1.5 text-zinc-400 dark:text-zinc-500">
            {strikethroughText}
            <motion.span
              animate={isHovered ? { scaleX: [1, 1.1, 1], rotate: [-1, 1, -1] } : { scaleX: 1 }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[3px] sm:h-[4px] bg-[#FF2E93] rounded-full origin-left"
            />
          </span>
        )}

        {accentText && (
          <motion.span
            animate={
              effect === "comic-pop" && isHovered
                ? { scale: 1.06, rotate: [-1, 1.5, -1] }
                : effect === "neon-glow" && isHovered
                ? { scale: 1.04 }
                : effect === "glitch-tilt" && isHovered
                ? { x: [-2, 2, -1, 1, 0], y: [1, -1, 0] }
                : { scale: 1, rotate: 0 }
            }
            transition={{ type: "spring", stiffness: 350, damping: 14 }}
            className={cn(
              "relative inline-block mx-1.5 transition-all duration-200 cursor-pointer",
              effect === "neon-glow" &&
                "text-[#00E5FF] drop-shadow-[0_0_12px_rgba(0,229,255,0.7)]",
              effect === "comic-pop" &&
                "text-[#1475e5] dark:text-amber-300",
              effect === "gradient-shift" &&
                "bg-gradient-to-r from-[#1475e5] via-[#FF2E93] to-[#ff9415] bg-clip-text text-transparent",
              effect === "glitch-tilt" &&
                "text-[#FF2E93] drop-shadow-[3px_3px_0_#00E5FF] dark:drop-shadow-[0_0_12px_rgba(255,46,147,0.5)]",
              effect === "strike-highlight" &&
                "text-[#00E5FF] dark:text-amber-300"
            )}
          >
            <span className="relative z-10">{accentText}</span>
            {/* Dynamic underline highlight on hover */}
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: isHovered ? 1 : 0.85 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "absolute inset-x-0 -bottom-1 h-2 sm:h-3 -rotate-1 rounded-sm -z-0 origin-left transition-opacity",
                effect === "neon-glow"
                  ? "bg-[#00E5FF]/30"
                  : effect === "comic-pop"
                  ? "bg-[#FFE600]/40 dark:bg-[#1475e5]/30"
                  : effect === "glitch-tilt"
                  ? "bg-[#FF2E93]/30"
                  : "bg-[#1475e5]/25"
              )}
            />
          </motion.span>
        )}
      </Component>
    </div>
  );
}
