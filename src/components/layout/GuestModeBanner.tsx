import { useState } from "react";
import { Sparkles, LogIn, ChevronDown, ChevronUp, Cloud, Trophy, Smartphone, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

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
      localStorage.setItem("tabe-demo-banner-minimized", String(minimized));
    } catch {}
    setIsMinimized(minimized);
  };

  // Minimized Floating Pill: Minimalist & non-intrusive (Notion / ChatGPT aesthetic)
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 lg:bottom-5 left-4 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
        <button
          onClick={() => toggleMinimize(false)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md text-zinc-800 dark:text-zinc-200 border border-zinc-200/90 dark:border-zinc-800/90 shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg transition-all select-none cursor-pointer group"
          title="Ver detalles del Modo Demo"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>

          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Modo Demo
          </span>

          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">·</span>

          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
            Sin guardar
          </span>

          <ChevronUp className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-transform group-hover:-translate-y-0.5 ml-0.5" />
        </button>
      </div>
    );
  }

  // Expanded Notion / ChatGPT Minimalist Card
  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[94%] max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-250">
      <div className="relative rounded-2xl bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-800/90 shadow-xl shadow-zinc-900/5 dark:shadow-black/30 p-4 sm:p-5">
        
        {/* Header row: Badge, hint & minimize */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
              </span>
              Modo Demo / Invitado
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:inline">
              Tus datos se guardan solo localmente
            </span>
          </div>

          <button
            onClick={() => toggleMinimize(true)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
            title="Minimizar aviso"
            aria-label="Minimizar aviso"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
              Iniciá sesión para sincronizar tu progreso en la nube
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Tus apuntes, materias, cuestionarios y pomodoros estarán respaldados y disponibles en todos tus dispositivos.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-800/60 rounded-md px-2 py-0.5 border border-zinc-200/60 dark:border-zinc-700/60">
                <Cloud className="w-3 h-3 text-sky-500" /> Nube segura
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-800/60 rounded-md px-2 py-0.5 border border-zinc-200/60 dark:border-zinc-700/60">
                <Trophy className="w-3 h-3 text-amber-500" /> Logros & XP
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-800/60 rounded-md px-2 py-0.5 border border-zinc-200/60 dark:border-zinc-700/60">
                <Smartphone className="w-3 h-3 text-emerald-500" /> Multi-dispositivo
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
            <Link
              to="/registro"
              className="px-3.5 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors shadow-2xs flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-zinc-500" />
              <span>Iniciar Sesión</span>
            </Link>

            <Link
              to="/registro?mode=signup"
              className="px-4 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-medium transition-colors shadow-2xs flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-amber-500" />
              <span>Crear Cuenta</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
