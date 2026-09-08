import { useState } from "react";
import { Sparkles, UserPlus, LogIn, ChevronDown, ChevronUp, ShieldAlert, Cloud, Trophy, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ComicAudio } from "@/components/comic/ComicAudio";

export function GuestModeBanner() {
  const { isGuest, user } = useAuth();
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return localStorage.getItem("tabe-demo-banner-minimized") === "true";
    } catch {
      return false;
    }
  });

  if (!isGuest || user) return null;

  const toggleMinimize = (minimized: boolean) => {
    try {
      ComicAudio.playPop();
      localStorage.setItem("tabe-demo-banner-minimized", String(minimized));
    } catch {}
    setIsMinimized(minimized);
  };

  // Minimized Floating Pill: Discreet, non-intrusive for comfortable exploration
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 lg:bottom-5 left-4 z-[60] animate-in fade-in slide-in-from-bottom-3 duration-200">
        <button
          onClick={() => toggleMinimize(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-card text-foreground border-3 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_0_hsl(var(--foreground))] active:translate-y-[1px] transition-all select-none cursor-pointer group"
          title="Desplegar información de Modo Demo"
        >
          <div className="w-6 h-6 rounded-lg bg-[#FFE600] text-black border border-black flex items-center justify-center font-black text-xs shrink-0 shadow-[1px_1px_0_0_#000]">
            🚀
          </div>
          <div className="flex flex-col items-start text-left leading-none">
            <span className="text-[10px] font-black uppercase tracking-wider text-foreground">Modo Demo</span>
            <span className="text-[9px] font-bold text-muted-foreground">Progreso local</span>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-[#00E5FF] text-black border border-black text-[9px] font-black uppercase tracking-wider shadow-[1px_1px_0_0_#000] ml-1 group-hover:bg-[#FFE600] transition-colors">
            Guardar
          </span>
          <ChevronUp className="w-4 h-4 stroke-[3] text-foreground/70 group-hover:text-foreground transition-transform group-hover:translate-y-[-1px]" />
        </button>
      </div>
    );
  }

  // Expanded Neo-Brutalist Comic Card
  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[95%] max-w-3xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative rounded-2xl md:rounded-3xl bg-card text-card-foreground border-3 md:border-4 border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] md:shadow-[8px_8px_0_0_hsl(var(--foreground))] p-4 md:p-5 overflow-hidden">
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FFE600] via-[#00E5FF] to-[#FF2E93]" />

        {/* Floating Demo Badge & Minimize Toggle */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#FFE600] text-black border-2 border-black font-black text-[10px] uppercase tracking-wider shadow-[1.5px_1.5px_0_0_#000] -rotate-1">
              <span className="w-2 h-2 rounded-full bg-[#FF2E93] animate-pulse" />
              Modo Invitado / Demo
            </span>
            <span className="text-[11px] font-extrabold text-muted-foreground hidden sm:inline">
              Probando funciones sin cuenta
            </span>
          </div>

          <button
            onClick={() => toggleMinimize(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] text-[10px] font-black uppercase transition-all hover:translate-y-[-1px] active:translate-y-[1px] cursor-pointer"
            title="Minimizar este aviso"
          >
            <span className="hidden sm:inline">Minimizar</span>
            <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Rocket Avatar Icon */}
            <div className="w-11 h-11 md:w-13 md:h-13 rounded-2xl bg-[#00E5FF] text-black border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center font-black text-xl md:text-2xl shrink-0">
              🚀
            </div>

            <div className="space-y-1 min-w-0">
              <h3 className="font-black text-sm md:text-base text-foreground tracking-tight leading-tight">
                ¡Tu progreso aún no está sincronizado en la nube!
              </h3>
              <p className="text-xs md:text-sm font-semibold text-muted-foreground leading-snug">
                Creá tu cuenta gratis para guardar apuntes, materias, pomodoros y acceder desde cualquier dispositivo.
              </p>

              {/* Quick Feature Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/80 border border-foreground/30 text-[10px] font-bold text-foreground">
                  <Cloud className="w-3 h-3 text-[#1475e5]" /> Nube segura
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/80 border border-foreground/30 text-[10px] font-bold text-foreground">
                  <Trophy className="w-3 h-3 text-[#EAB308]" /> Logros & XP
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/80 border border-foreground/30 text-[10px] font-bold text-foreground">
                  <Smartphone className="w-3 h-3 text-[#10B981]" /> Multi-dispositivo
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
            <Link
              to="/registro"
              onClick={() => ComicAudio.playPop()}
              className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl bg-secondary text-foreground border-2 border-foreground shadow-[2.5px_2.5px_0_0_hsl(var(--foreground))] font-black text-xs md:text-sm hover:bg-secondary/80 hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4 stroke-[2.5]" />
              <span>Iniciar Sesión</span>
            </Link>

            <Link
              to="/registro?mode=signup"
              onClick={() => ComicAudio.playPowerUp()}
              className="flex-1 lg:flex-none px-5 py-2.5 rounded-xl bg-[#FFE600] text-black border-2 border-black shadow-[3px_3px_0_0_#000] font-black text-xs md:text-sm uppercase tracking-wider hover:bg-[#ffe033] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#000] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>Crear Cuenta Gratis</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
