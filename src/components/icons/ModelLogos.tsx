import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Google Gemini Official Sparkle Star Logo
 * Features Google's iconic 4-point curved gradient star.
 */
export function GeminiLogo({ className = "w-4 h-4", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="30%" stopColor="#9B72CB" />
          <stop offset="70%" stopColor="#D96570" />
          <stop offset="100%" stopColor="#F4B400" />
        </linearGradient>
      </defs>
      <path
        d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
        fill="url(#gemini-gradient)"
      />
    </svg>
  );
}

/**
 * Dots Studio / Dots AI Logo
 * Minimalist geometric multi-dot matrix adapted for light and dark themes.
 */
export function DotsLogo({ className = "w-4 h-4", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Dynamic 3x3 dots with accent pulsing color */}
      <circle cx="5" cy="5" r="2.5" className="fill-emerald-500" />
      <circle cx="12" cy="5" r="2.5" className="fill-foreground opacity-90" />
      <circle cx="19" cy="5" r="2.5" className="fill-emerald-500" />
      
      <circle cx="5" cy="12" r="2.5" className="fill-foreground opacity-90" />
      <circle cx="12" cy="12" r="3.2" className="fill-emerald-400 dark:fill-emerald-300" />
      <circle cx="19" cy="12" r="2.5" className="fill-foreground opacity-90" />
      
      <circle cx="5" cy="19" r="2.5" className="fill-emerald-500" />
      <circle cx="12" cy="19" r="2.5" className="fill-foreground opacity-90" />
      <circle cx="19" cy="19" r="2.5" className="fill-emerald-500" />
    </svg>
  );
}

/**
 * Cohere Official Logo
 * Coral organic pebble shape with dark/light adaptation.
 */
export function CohereLogo({ className = "w-4 h-4", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <path
        d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM6.8 12C6.8 9.13 9.13 6.8 12 6.8C14.07 6.8 15.86 8.01 16.69 9.77L13.8 11.2C13.43 10.42 12.78 10 12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C12.78 14 13.43 13.58 13.8 12.8L16.69 14.23C15.86 15.99 14.07 17.2 12 17.2C9.13 17.2 6.8 14.87 6.8 12Z"
        className="fill-[#FF6B4A] dark:fill-[#FF8566]"
      />
    </svg>
  );
}

/**
 * Liquid AI Official Logo
 * Sleek fluid droplet / wave curves representing liquid neural systems.
 */
export function LiquidLogo({ className = "w-4 h-4", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="liquid-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5C12 2.5 5 10.5 5 15.5C5 19.09 7.91 22 11.5 22C15.09 22 18 19.09 18 15.5C18 10.5 12 2.5 12 2.5Z"
        fill="url(#liquid-gradient)"
      />
      <circle cx="10" cy="13.5" r="2" fill="white" opacity="0.75" />
    </svg>
  );
}

/**
 * Helper component that maps any model ID to its specific high-res logo
 */
export function ModelLogo({
  modelId,
  className = "w-4 h-4",
  size,
}: {
  modelId: string;
  className?: string;
  size?: number;
}) {
  const lower = modelId.toLowerCase();

  if (lower.includes("dots")) {
    return <DotsLogo className={className} size={size} />;
  }

  if (lower.includes("gemini")) {
    return <GeminiLogo className={className} size={size} />;
  }

  if (lower.includes("cohere")) {
    return <CohereLogo className={className} size={size} />;
  }

  if (lower.includes("liquid") || lower.includes("lfm")) {
    return <LiquidLogo className={className} size={size} />;
  }

  // Fallback generic AI logo
  return <GeminiLogo className={className} size={size} />;
}
