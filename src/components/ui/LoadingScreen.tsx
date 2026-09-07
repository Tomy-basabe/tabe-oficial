import React from "react";
import { TabeLogo } from "@/components/ui/TabeLogo";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
  className?: string;
}

/**
 * Pantalla de carga oficial unificada de TABE con estética Neo-brutalista / Comic.
 */
export function LoadingScreen({
  message = "Cargando...",
  submessage = "Preparando tus datos...",
  fullScreen = false,
  className = "",
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center p-4 select-none relative z-10",
        fullScreen ? "min-h-screen w-full bg-background" : "min-h-[60vh] w-full",
        className
      )}
    >
      <div className="relative flex flex-col items-center max-w-sm w-full mx-auto p-6 sm:p-8 rounded-2xl bg-card border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] text-center overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Comic corner accent */}
        <div className="absolute top-0 right-0 w-14 h-14 bg-[#FFE600] border-b-[3px] border-l-[3px] border-foreground rounded-bl-3xl pointer-events-none flex items-start justify-end p-1.5">
          <span className="text-[11px] font-black text-black">⚡</span>
        </div>

        {/* Animated Brand Mascot / Logo Box */}
        <div className="relative mb-5 mt-1">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00F0FF] via-[#00FF9D] to-[#FFE600] p-1 border-[3.5px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] flex items-center justify-center transform transition-transform hover:scale-105 animate-bounce duration-1000">
            <div className="w-full h-full bg-background rounded-xl flex items-center justify-center overflow-hidden p-1">
              <TabeLogo size={46} className="object-contain" />
            </div>
          </div>
          {/* Comic pill */}
          <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-[#FF2E93] text-white border-2 border-foreground shadow-[2px_2px_0_0_#000] text-[10px] font-black tracking-widest uppercase animate-pulse">
            TABE
          </div>
        </div>

        {/* Title */}
        <h3 className="font-display font-black text-lg sm:text-xl uppercase tracking-widest text-foreground leading-tight">
          {message}
        </h3>

        {/* Submessage */}
        {submessage && (
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-2 line-clamp-1">
            {submessage}
          </p>
        )}

        {/* Chunky Neo-brutalist animated bar */}
        <div className="w-full mt-5">
          <div className="h-3.5 bg-muted rounded-full border-2 border-foreground overflow-hidden p-[2px] shadow-[2px_2px_0_0_hsl(var(--foreground))] relative">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1475e5] via-[#00F0FF] to-[#00FF9D] animate-pulse w-full origin-left" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
