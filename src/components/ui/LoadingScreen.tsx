import React, { useState, useEffect } from "react";
import { TabeLogo } from "@/components/ui/TabeLogo";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
  className?: string;
  /** Retardo antes de mostrar el indicador visual para evitar destellos en cargas rápidas (< 450ms) */
  delayMs?: number;
}

/**
 * Pantalla de carga oficial unificada estilo Notion / ChatGPT:
 * Minimalista, sobria, sin ruidos visuales ni elementos pesados.
 * Incluye umbral anti-flash (450ms por defecto) para que las transiciones rápidas se sientan instantáneas.
 */
export function LoadingScreen({
  message = "Cargando...",
  submessage,
  fullScreen = false,
  className = "",
  delayMs = 450,
}: LoadingScreenProps) {
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!visible) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none select-none opacity-0",
          fullScreen ? "min-h-screen w-full bg-background" : "min-h-[50vh] w-full",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 select-none relative z-10 transition-opacity duration-200",
        fullScreen ? "min-h-screen w-full bg-background" : "min-h-[50vh] w-full",
        className
      )}
    >
      <div className="flex flex-col items-center justify-center max-w-xs text-center space-y-3.5 animate-in fade-in duration-200">
        {/* Contenedor de logo minimalista con spinner sutil */}
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-center shadow-xs">
            <TabeLogo size={26} className="object-contain opacity-90" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-border shadow-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500 dark:text-zinc-400" />
          </div>
        </div>

        {/* Textos sobrios y limpios */}
        <div className="space-y-1">
          {message && (
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200 tracking-tight">
              {message}
            </p>
          )}
          {submessage && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">
              {submessage}
            </p>
          )}
        </div>

        {/* Línea de carga indeterminada sutil */}
        <div className="w-24 h-1 bg-zinc-200/70 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-zinc-400 dark:bg-zinc-600 rounded-full w-2/5 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
