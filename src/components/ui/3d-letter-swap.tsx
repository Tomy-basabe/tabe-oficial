"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LetterSwap3DProps {
  label: string;
  secondaryLabel?: string;
  className?: string;
  flipDirection?: "top" | "bottom";
  staggerInterval?: number;
}

export function LetterSwap3D({
  label,
  secondaryLabel,
  className,
  flipDirection = "top",
  staggerInterval = 0.025,
}: LetterSwap3DProps) {
  const [isHovered, setIsHovered] = useState(false);
  const backText = secondaryLabel || label;
  const letters = Array.from(label);

  const rotateValue = flipDirection === "top" ? -90 : 90;

  return (
    <span
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "inline-flex overflow-hidden relative cursor-pointer select-none leading-none py-1",
        className
      )}
      style={{ perspective: 600 }}
    >
      {letters.map((char, index) => {
        if (char === " ") {
          return <span key={index}>&nbsp;</span>;
        }

        const backChar = backText[index] || char;

        return (
          <span
            key={index}
            className="relative inline-block"
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            {/* Cara frontal */}
            <motion.span
              animate={
                isHovered
                  ? {
                      rotateX: rotateValue,
                      y: flipDirection === "top" ? "-50%" : "50%",
                      opacity: 0,
                    }
                  : {
                      rotateX: 0,
                      y: "0%",
                      opacity: 1,
                    }
              }
              transition={{
                duration: 0.35,
                delay: index * staggerInterval,
                ease: [0.33, 1, 0.68, 1],
              }}
              className="inline-block"
            >
              {char}
            </motion.span>

            {/* Cara trasera (swap) */}
            <motion.span
              animate={
                isHovered
                  ? {
                      rotateX: 0,
                      y: "0%",
                      opacity: 1,
                    }
                  : {
                      rotateX: -rotateValue,
                      y: flipDirection === "top" ? "50%" : "-50%",
                      opacity: 0,
                    }
              }
              transition={{
                duration: 0.35,
                delay: index * staggerInterval,
                ease: [0.33, 1, 0.68, 1],
              }}
              className="absolute inset-0 inline-block text-primary font-bold"
            >
              {backChar}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}
