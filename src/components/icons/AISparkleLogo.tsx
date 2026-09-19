import React, { useId } from "react";
import { cn } from "@/lib/utils";

interface AISparkleLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  animate?: boolean;
  withGlow?: boolean;
}

/**
 * Premium AI Sparkle Logo inspired by Gemini, Claude, and modern AI design systems.
 * Features a 4-pointed organic star with vibrant multi-stop mesh gradients
 * and a smooth, gentle breathing pulse animation.
 */
export function AISparkleLogo({
  className,
  size = 24,
  animate = false,
  withGlow = false,
  ...props
}: AISparkleLogoProps) {
  const id = useId().replace(/:/g, "_");
  const gradId = `ai_sparkle_grad_${id}`;
  const glowId = `ai_sparkle_glow_${id}`;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0",
        animate && "animate-ai-breathe"
      )}
      style={{ width: size, height: size }}
    >
      {/* Optional ambient soft blur aura */}
      {withGlow && (
        <div
          className="absolute inset-0 rounded-full blur-md opacity-60 pointer-events-none -z-10"
          style={{
            background:
              "radial-gradient(circle, rgba(56,189,248,0.5) 0%, rgba(168,85,247,0.4) 50%, rgba(236,72,153,0.3) 100%)",
            transform: "scale(1.4)",
          }}
        />
      )}

      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size, height: size }}
        className={cn("shrink-0 transition-transform duration-300", className)}
        {...props}
      >
        <defs>
          {/* Main multi-color radiant gradient matching Gemini / modern AI colorway */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />     {/* Electric Sky Blue */}
            <stop offset="28%" stopColor="#6366F1" />    {/* Indigo */}
            <stop offset="55%" stopColor="#A855F7" />    {/* Purple */}
            <stop offset="78%" stopColor="#EC4899" />    {/* Fuchsia Pink */}
            <stop offset="100%" stopColor="#F59E0B" />   {/* Warm Amber */}
          </linearGradient>

          {/* Soft inner highlight gradient for 3D depth */}
          <radialGradient
            id={`${gradId}_center`}
            cx="50%"
            cy="50%"
            r="50%"
            fx="45%"
            fy="45%"
          >
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#BAE6FD" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
          </radialGradient>

          {/* Drop shadow / glow filter */}
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 4-pointed radiant organic spark */}
        <path
          d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z"
          fill={`url(#${gradId})`}
          filter={`url(#${glowId})`}
        />

        {/* Inner luminance highlight overlay */}
        <path
          d="M12 4.5C12 8.64214 8.64214 12 4.5 12C8.64214 12 12 15.3579 12 19.5C12 15.3579 15.3579 12 19.5 12C15.3579 12 12 8.64214 12 4.5Z"
          fill={`url(#${gradId}_center)`}
          opacity={0.7}
        />
      </svg>
    </div>
  );
}

export default AISparkleLogo;
