"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StaggeredTextProps {
  text: string;
  className?: string;
  staggerDelay?: number;
  duration?: number;
  direction?: "up" | "down" | "fade";
}

export function StaggeredText({
  text,
  className,
  staggerDelay = 0.03,
  duration = 0.5,
  direction = "up",
}: StaggeredTextProps) {
  const letters = Array.from(text);

  const getYOffset = () => {
    if (direction === "up") return 20;
    if (direction === "down") return -20;
    return 0;
  };

  return (
    <span className={cn("inline-flex flex-wrap overflow-hidden", className)}>
      {letters.map((char, index) => {
        if (char === " ") {
          return <span key={index}>&nbsp;</span>;
        }

        return (
          <motion.span
            key={index}
            initial={{ opacity: 0, y: getYOffset() }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: duration,
              delay: index * staggerDelay,
              ease: [0.25, 1, 0.5, 1],
            }}
            className="inline-block"
          >
            {char}
          </motion.span>
        );
      })}
    </span>
  );
}
