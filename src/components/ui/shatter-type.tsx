"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShatterTypeProps {
  text: string;
  className?: string;
  shardsCount?: number;
  returnDelay?: number;
  burstDistance?: number;
}

export function ShatterType({
  text,
  className,
  shardsCount = 12,
  returnDelay = 1.4,
  burstDistance = 80,
}: ShatterTypeProps) {
  const [isShattered, setIsShattered] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isShattered) return;
    setIsShattered(true);

    setTimeout(() => {
      setIsShattered(false);
    }, returnDelay * 1000);
  };

  // Generate deterministic fragments for shards
  const shards = Array.from({ length: shardsCount }).map((_, i) => {
    const angle = (i / shardsCount) * 2 * Math.PI;
    const dist = burstDistance * (0.6 + ((i * 37) % 50) / 100);
    return {
      id: i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist + ((i % 2 === 0 ? 1 : -1) * 20),
      rotate: ((i * 47) % 180) - 90,
      clipPath: `polygon(${((i * 13) % 40)}% 0%, 100% ${((i * 17) % 50)}%, ${100 - ((i * 23) % 40)}% 100%, 0% ${100 - ((i * 19) % 50)}%)`,
    };
  });

  return (
    <span
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative inline-block cursor-pointer select-none overflow-visible group",
        className
      )}
      title="¡Hacé click para quebrar el texto!"
    >
      {/* Texto base visible cuando no está quebrado */}
      <motion.span
        animate={
          isHovered && !isShattered
            ? {
                scale: 1.02,
                filter: "drop-shadow(0 0 6px rgba(0, 229, 255, 0.5))",
              }
            : {
                scale: 1,
                filter: "drop-shadow(0 0 0px transparent)",
              }
        }
        className={cn(
          "inline-block transition-opacity duration-150",
          isShattered && "opacity-0"
        )}
      >
        {text}

        {/* Micro-grietas sutiles al pasar el cursor */}
        {isHovered && !isShattered && (
          <span
            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
            style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 1px, transparent 1px)`,
              backgroundSize: "6px 6px",
            }}
          />
        )}
      </motion.span>

      {/* Fragmentos de cristal que explotan al hacer click */}
      <AnimatePresence>
        {isShattered && (
          <span className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {shards.map((shard) => (
              <motion.span
                key={shard.id}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: shard.x,
                  y: shard.y,
                  rotate: shard.rotate,
                  opacity: 0,
                  scale: 0.6,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  clipPath: shard.clipPath,
                }}
                className="absolute inset-0 flex items-center justify-center backdrop-blur-xs font-inherit text-inherit"
              >
                {text}
              </motion.span>
            ))}
          </span>
        )}
      </AnimatePresence>
    </span>
  );
}
