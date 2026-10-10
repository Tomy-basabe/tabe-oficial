"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextScrollAnimationProps {
  text: string;
  className?: string;
  wordClassName?: string;
  highlightWords?: string[];
  highlightColor?: string;
}

export function TextScrollAnimation({
  text,
  className,
  wordClassName,
  highlightWords = [],
  highlightColor = "#1475e5",
}: TextScrollAnimationProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.9", "start 0.4"],
  });

  const words = text.split(" ");

  return (
    <p
      ref={containerRef}
      className={cn("flex flex-wrap leading-relaxed select-none", className)}
    >
      {words.map((word, index) => {
        const start = index / words.length;
        const end = start + 1 / words.length;
        const cleanWord = word.replace(/[.,:;!?]/g, "").toLowerCase();
        const isHighlight = highlightWords.some(
          (hw) => hw.toLowerCase() === cleanWord
        );

        return (
          <Word
            key={index}
            word={word}
            progress={scrollYProgress}
            range={[start, end]}
            isHighlight={isHighlight}
            highlightColor={highlightColor}
            className={wordClassName}
          />
        );
      })}
    </p>
  );
}

interface WordProps {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
  isHighlight: boolean;
  highlightColor: string;
  className?: string;
}

function Word({
  word,
  progress,
  range,
  isHighlight,
  highlightColor,
  className,
}: WordProps) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  const y = useTransform(progress, range, [4, 0]);

  return (
    <span className="relative inline-block mr-[0.3em] my-[0.05em]">
      <motion.span
        style={{
          opacity,
          y,
          color: isHighlight ? highlightColor : undefined,
        }}
        className={cn(
          "inline-block transition-colors duration-200",
          isHighlight && "font-black drop-shadow-xs",
          className
        )}
      >
        {word}
      </motion.span>
    </span>
  );
}
