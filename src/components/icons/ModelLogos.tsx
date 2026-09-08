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
 * Anthropic Claude Official Terracotta Symbol
 */
export function ClaudeLogo({ className = "w-4 h-4", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <path
        d="M4.5 9.5C4.5 6.73858 6.73858 4.5 9.5 4.5H14.5C17.2614 4.5 19.5 6.73858 19.5 9.5V14.5C19.5 17.2614 17.2614 19.5 14.5 19.5H9.5C6.73858 19.5 4.5 17.2614 4.5 14.5V9.5Z"
        fill="#D97706"
        opacity="0.15"
      />
      <path
        d="M13.8 6.8L10.2 17.2H8L11.6 6.8H13.8ZM15.8 9.5L14.2 14.5H16.2L17.8 9.5H15.8ZM6.2 9.5L7.8 14.5H9.8L8.2 9.5H6.2Z"
        fill="#D97706"
      />
    </svg>
  );
}

/**
 * OpenAI / ChatGPT Official Spiral Logo
 */
export function OpenAILogo({ className = "w-4 h-4", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200 text-[#10A37F]", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.259 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7466-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.6669zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813v6.7227zm1.0975-2.3655l2.602-1.4998 2.6069 1.4998v2.9994l-2.6069 1.4997-2.602-1.4997z" />
    </svg>
  );
}

/**
 * DeepSeek Official Blue Whale Logo
 */
export function DeepSeekLogo({ className = "w-4 h-4", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="deepseek-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E88E5" />
          <stop offset="100%" stopColor="#0D47A1" />
        </linearGradient>
      </defs>
      <path
        d="M2.5 12C2.5 6.75329 6.75329 2.5 12 2.5C17.2467 2.5 21.5 6.75329 21.5 12C21.5 17.2467 17.2467 21.5 12 21.5C6.75329 21.5 2.5 17.2467 2.5 12Z"
        fill="url(#deepseek-grad)"
      />
      <path
        d="M7.5 13C8.5 9.5 12 9 14.5 10.5C16.5 11.5 17.5 11 18 10C18 13.5 15.5 16 12 16C9.5 16 7.5 14.5 7.5 13Z"
        fill="white"
      />
      <circle cx="10" cy="11.5" r="1" fill="#0D47A1" />
    </svg>
  );
}

/**
 * Meta LLaMA Official Infinity Logo
 */
export function LlamaLogo({ className = "w-4 h-4", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="llama-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0081FB" />
          <stop offset="100%" stopColor="#0064E0" />
        </linearGradient>
      </defs>
      <path
        d="M7.5 7.5C5.01472 7.5 3 9.51472 3 12C3 14.4853 5.01472 16.5 7.5 16.5C10.5 16.5 11.5 13.5 12 12C12.5 10.5 13.5 7.5 16.5 7.5C18.9853 7.5 21 9.51472 21 12C21 14.4853 18.9853 16.5 16.5 16.5C13.5 16.5 12.5 13.5 12 12C11.5 10.5 10.5 7.5 7.5 7.5Z"
        stroke="url(#llama-grad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Mistral AI Official Logo
 */
export function MistralLogo({ className = "w-4 h-4", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <rect x="3" y="4" width="4" height="4" fill="#FF5722" />
      <rect x="17" y="4" width="4" height="4" fill="#FF5722" />
      <rect x="7" y="8" width="4" height="4" fill="#FF7043" />
      <rect x="13" y="8" width="4" height="4" fill="#FF7043" />
      <rect x="10" y="12" width="4" height="4" fill="#FF8A65" />
      <rect x="7" y="16" width="4" height="4" fill="#FFA726" />
      <rect x="13" y="16" width="4" height="4" fill="#FFA726" />
    </svg>
  );
}

/**
 * Alibaba Qwen Official Logo
 */
export function QwenLogo({ className = "w-4 h-4", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <path
        d="M12 2L20.5 7V17L12 22L3.5 17V7L12 2Z"
        stroke="#6366F1"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.5" fill="#6366F1" />
    </svg>
  );
}

/**
 * Dots Studio / Dots AI Logo
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
 * Helper component that maps any model ID or name to its specific high-res logo
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

  if (lower.includes("claude") || lower.includes("anthropic") || lower.includes("sonnet")) {
    return <ClaudeLogo className={className} size={size} />;
  }

  if (lower.includes("deepseek")) {
    return <DeepSeekLogo className={className} size={size} />;
  }

  if (lower.includes("gpt") || lower.includes("openai")) {
    return <OpenAILogo className={className} size={size} />;
  }

  if (lower.includes("llama") || lower.includes("meta")) {
    return <LlamaLogo className={className} size={size} />;
  }

  if (lower.includes("mistral")) {
    return <MistralLogo className={className} size={size} />;
  }

  if (lower.includes("qwen")) {
    return <QwenLogo className={className} size={size} />;
  }

  if (lower.includes("dots")) {
    return <DotsLogo className={className} size={size} />;
  }

  if (lower.includes("cohere")) {
    return <CohereLogo className={className} size={size} />;
  }

  if (lower.includes("liquid") || lower.includes("lfm")) {
    return <LiquidLogo className={className} size={size} />;
  }

  if (lower.includes("gemini") || lower.includes("google")) {
    return <GeminiLogo className={className} size={size} />;
  }

  return <GeminiLogo className={className} size={size} />;
}
