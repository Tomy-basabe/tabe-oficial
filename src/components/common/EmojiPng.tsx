import React, { useState } from "react";
import { cn } from "@/lib/utils";

const KNOWN_EMOJIS: Record<string, string> = {
  // Recompensas y logros
  "🏆": "1f3c6",
  "trophy": "1f3c6",
  "🎉": "1f389",
  "tada": "1f389",
  "party": "1f389",
  "🚀": "1f680",
  "rocket": "1f680",
  "🎓": "1f393",
  "graduation": "1f393",
  "📚": "1f4da",
  "books": "1f4da",
  "📖": "1f4d6",
  "book": "1f4d6",
  "⭐": "2b50",
  "star": "2b50",
  "🪙": "1fa99",
  "coin": "1fa99",
  "💡": "1f4a1",
  "bulb": "1f4a1",
  "idea": "1f4a1",
  "🎙️": "1f399",
  "🎙": "1f399",
  "mic": "1f399",
  "🔊": "1f50a",
  "speaker": "1f50a",
  "🔴": "1f534",
  "red_circle": "1f534",
  "🔥": "1f525",
  "fire": "1f525",
  "flame": "1f525",
  "⚡": "26a1",
  "zap": "26a1",
  "🎯": "1f3af",
  "target": "1f3af",
  "👑": "1f451",
  "crown": "1f451",
  "💎": "1f48e",
  "gem": "1f48e",
  "🏅": "1f3c5",
  "medal": "1f3c5",
  "🤖": "1f916",
  "robot": "1f916",
  "✅": "2705",
  "check": "2705",
  "✨": "2728",
  "sparkles": "2728",
  "🧠": "1f9e0",
  "brain": "1f9e0",
  "⚔️": "2694",
  "sword": "2694",
  "🛡️": "1f6e1",
  "shield": "1f6e1",
};

function parseEmojiToHex(input: string): string {
  if (KNOWN_EMOJIS[input]) return KNOWN_EMOJIS[input];
  const trimmed = input.trim();
  if (KNOWN_EMOJIS[trimmed]) return KNOWN_EMOJIS[trimmed];

  const codePoints: string[] = [];
  let i = 0;
  while (i < input.length) {
    const cp = input.codePointAt(i);
    if (cp !== undefined) {
      // Ignorar variant selector 16 (0xfe0f) para máxima compatibilidad con PNGs estándar
      if (cp !== 0xfe0f) {
        codePoints.push(cp.toString(16).toLowerCase());
      }
      i += cp > 0xffff ? 2 : 1;
    } else {
      i++;
    }
  }

  return codePoints.join("-");
}

export interface EmojiPngProps {
  emoji: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number;
  className?: string;
  alt?: string;
  fallbackText?: string;
}

const SIZE_MAP: Record<string, string> = {
  xs: "w-3.5 h-3.5",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-7 h-7",
  xl: "w-10 h-10",
  "2xl": "w-14 h-14",
};

export const EmojiPng: React.FC<EmojiPngProps> = ({
  emoji,
  size = "md",
  className,
  alt,
  fallbackText,
}) => {
  const [hasError, setHasError] = useState(false);

  const hexCode = parseEmojiToHex(emoji);
  const sizeClasses = typeof size === "string" ? SIZE_MAP[size] || "w-5 h-5" : undefined;
  const inlineStyles = typeof size === "number" ? { width: `${size}px`, height: `${size}px` } : undefined;

  // URL del CDN de Twemoji (PNG transparente sin fondo de alta nitidez)
  const cdnUrl = hexCode
    ? `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${hexCode}.png`
    : "";

  if (hasError || !cdnUrl) {
    return (
      <span
        role="img"
        aria-label={alt || emoji}
        className={cn("inline-flex items-center justify-center select-none", className)}
      >
        {fallbackText || emoji}
      </span>
    );
  }

  return (
    <img
      src={cdnUrl}
      alt={alt || emoji}
      draggable={false}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      style={inlineStyles}
      className={cn(
        "inline-block object-contain select-none pointer-events-none align-middle shrink-0",
        sizeClasses,
        className
      )}
    />
  );
};
