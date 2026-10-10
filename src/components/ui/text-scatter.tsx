"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextScatterProps {
  text: string;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p" | "div";
  velocity?: number;
  rotation?: number;
  scale?: number;
  returnAfter?: number;
}

export function TextScatter({
  text,
  className,
  as: Component = "span",
  velocity = 120,
  rotation = 45,
  scale = 1.05,
  returnAfter = 0.8,
}: TextScatterProps) {
  const [isScattered, setIsScattered] = useState(false);

  const letters = Array.from(text);

  const handleMouseEnter = () => {
    setIsScattered(true);
    setTimeout(() => {
      setIsScattered(false);
    }, returnAfter * 1000);
  };

  return (
    <Component
      onMouseEnter={handleMouseEnter}
      className={cn(
        "inline-flex flex-wrap items-baseline cursor-pointer select-none relative group",
        className
      )}
    >
      {letters.map((char, index) => {
        if (char === " ") {
          return <span key={index}>&nbsp;</span>;
        }

        // Determinar un vector de dispersión pseudo-aleatorio pero armónico basado en el índice
        const seed = (index * 9301 + 49297) % 233280;
        const randX = ((seed / 233280) - 0.5) * velocity;
        const randY = (((seed * 2) % 233280 / 233280) - 0.5) * velocity;
        const randRot = (((seed * 3) % 233280 / 233280) - 0.5) * rotation;

        return (
          <motion.span
            key={index}
            animate={
              isScattered
                ? {
                    x: randX,
                    y: randY,
                    rotate: randRot,
                    scale: scale,
                    opacity: 0.85,
                  }
                : {
                    x: 0,
                    y: 0,
                    rotate: 0,
                    scale: 1,
                    opacity: 1,
                  }
            }
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 18,
              mass: 0.8,
            }}
            className="inline-block transition-colors duration-150"
          >
            {char}
          </motion.span>
        );
      })}
    </Component>
  );
}
