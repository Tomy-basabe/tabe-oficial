import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Zap, Sparkles, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { ComicAudio } from "@/components/comic/ComicAudio";

interface ComicParticle {
  id: number;
  x: number;
  y: number;
  word: string;
  color: string;
  textColor: string;
  tilt: number;
  sparkles: Array<{ id: number; tx: string; ty: string; color: string; char: string }>;
}

interface ComicContextType {
  comicMode: boolean;
  toggleComicMode: () => void;
  setComicMode: (enabled: boolean) => void;
  soundEnabled: boolean;
  toggleSound: (e?: React.MouseEvent) => void;
  setSoundEnabled: (enabled: boolean) => void;
  triggerBurst: (x: number, y: number, customWord?: string) => void;
}

const ComicContext = createContext<ComicContextType>({
  comicMode: true,
  toggleComicMode: () => {},
  setComicMode: () => {},
  soundEnabled: true,
  toggleSound: () => {},
  setSoundEnabled: () => {},
  triggerBurst: () => {},
});

export const useComic = () => useContext(ComicContext);

const COMIC_WORDS = [
  "POW!",
  "BOOM!",
  "ZAP!",
  "BAM!",
  "XP+!",
  "SMART!",
  "KAPOW!",
  "SUPER!",
  "CRITICAL!",
  "LET'S GO!",
  "GENIUS!",
];

const COMIC_COLORS = [
  { bg: "#FFE600", text: "#000000" }, // Yellow
  { bg: "#00E5FF", text: "#000000" }, // Cyan
  { bg: "#FF2E93", text: "#FFFFFF" }, // Hot Pink
  { bg: "#00FF66", text: "#000000" }, // Neon Green
  { bg: "#FF6B00", text: "#FFFFFF" }, // Orange
  { bg: "#9D00FF", text: "#FFFFFF" }, // Comic Purple
];

const SPARKLE_CHARS = ["✦", "★", "✸", "•", "✖"];

export function ComicEffectsProvider({ children }: { children: React.ReactNode }) {
  const [comicMode, setComicMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("tabe-comic-mode");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("tabe-comic-sound");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [particles, setParticles] = useState<ComicParticle[]>([]);
  const lastBurstRef = useRef<number>(0);
  const particleIdRef = useRef<number>(0);

  useEffect(() => {
    ComicAudio.setMuted(!soundEnabled);
    localStorage.setItem("tabe-comic-sound", JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  // Sync comic-mode-active class to document.documentElement
  useEffect(() => {
    if (comicMode) {
      document.documentElement.classList.add("comic-mode-active");
    } else {
      document.documentElement.classList.remove("comic-mode-active");
    }
    localStorage.setItem("tabe-comic-mode", JSON.stringify(comicMode));
  }, [comicMode]);

  const toggleComicMode = useCallback(() => {
    setComicMode((prev) => !prev);
  }, []);

  const toggleSound = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSoundEnabled((prev) => !prev);
  }, []);

  const triggerBurst = useCallback(
    (x: number, y: number, customWord?: string) => {
      if (!comicMode) return;

      const now = Date.now();
      // Throttle bursts to at most 1 every 80ms
      if (now - lastBurstRef.current < 80) return;
      lastBurstRef.current = now;

      // Play comic pop sound
      if (soundEnabled) {
        ComicAudio.playPop();
      }

      const word = customWord || COMIC_WORDS[Math.floor(Math.random() * COMIC_WORDS.length)];
      const colorScheme = COMIC_COLORS[Math.floor(Math.random() * COMIC_COLORS.length)];
      const tilt = (Math.random() - 0.5) * 28; // -14deg to +14deg

      const sparkles = Array.from({ length: 5 }).map((_, i) => {
        const angle = (i * (360 / 5) + Math.random() * 20) * (Math.PI / 180);
        const distance = 35 + Math.random() * 30;
        return {
          id: i,
          tx: `${Math.cos(angle) * distance}px`,
          ty: `${Math.sin(angle) * distance}px`,
          color: COMIC_COLORS[Math.floor(Math.random() * COMIC_COLORS.length)].bg,
          char: SPARKLE_CHARS[Math.floor(Math.random() * SPARKLE_CHARS.length)],
        };
      });

      const newId = ++particleIdRef.current;
      const newParticle: ComicParticle = {
        id: newId,
        x,
        y,
        word,
        color: colorScheme.bg,
        textColor: colorScheme.text,
        tilt,
        sparkles,
      };

      setParticles((prev) => [...prev.slice(-15), newParticle]);

      // Remove after animation finishes
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== newId));
      }, 900);
    },
    [comicMode, soundEnabled]
  );

  // Global click listener to trigger burst on clickable items or anywhere in comic mode
  useEffect(() => {
    if (!comicMode) return;

    const handleClick = (e: MouseEvent) => {
      // Don't trigger on comic toggle switch itself
      const target = e.target as HTMLElement | null;
      if (target?.closest("#comic-mode-toggle")) return;

      // Trigger burst on buttons, links, cards, or anywhere clicked
      triggerBurst(e.clientX, e.clientY);
    };

    window.addEventListener("click", handleClick, { passive: true });
    return () => window.removeEventListener("click", handleClick);
  }, [comicMode, triggerBurst]);

  return (
    <ComicContext.Provider
      value={{
        comicMode,
        toggleComicMode,
        setComicMode,
        soundEnabled,
        toggleSound,
        setSoundEnabled,
        triggerBurst,
      }}
    >
      {children}

      {/* Comic Interactive Overlay */}
      {comicMode && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute animate-comic-pop"
              style={{
                left: `${particle.x}px`,
                top: `${particle.y}px`,
              }}
            >
              {/* Sparkle particles radiating outward */}
              {particle.sparkles.map((sp) => (
                <span
                  key={sp.id}
                  className="absolute text-sm font-black animate-comic-sparkle select-none"
                  style={
                    {
                      left: "50%",
                      top: "50%",
                      color: sp.color,
                      textShadow: "1px 1px 0 #000",
                      "--tx": sp.tx,
                      "--ty": sp.ty,
                    } as React.CSSProperties
                  }
                >
                  {sp.char}
                </span>
              ))}

              {/* Onomatopoeia Word Bubble */}
              <div
                className="relative px-3 py-1 rounded-xl font-black text-xs sm:text-sm tracking-widest uppercase border-2 border-black shadow-[3px_3px_0_0_#000] select-none whitespace-nowrap"
                style={{
                  backgroundColor: particle.color,
                  color: particle.textColor,
                  transform: `rotate(${particle.tilt}deg)`,
                }}
              >
                {particle.word}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comic Mode Floating Toggle Controller */}
      <div
        id="comic-mode-toggle"
        className="fixed bottom-20 left-4 lg:bottom-6 lg:left-6 z-40 select-none pointer-events-auto flex items-center gap-1.5"
      >
        <button
          onClick={toggleComicMode}
          title={comicMode ? "Modo Cómic Activado (Click para desactivar)" : "Activar Modo Cómic"}
          className={cn(
            "group flex items-center gap-2 px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 border-2",
            comicMode
              ? "bg-[#FFE600] text-black border-black shadow-[3.5px_3.5px_0_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0_0_#000]"
              : "bg-card text-muted-foreground border-border shadow-sm hover:text-foreground hover:border-foreground/50"
          )}
        >
          <div className="relative">
            <Zap
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                comicMode ? "fill-black text-black group-hover:scale-110 rotate-[-8deg]" : "text-muted-foreground"
              )}
            />
            {comicMode && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FF2E93] border border-black animate-ping" />
            )}
          </div>
          <span className="hidden sm:inline font-black">
            {comicMode ? "Comic UI: ON" : "Comic UI: OFF"}
          </span>
          {comicMode && <Sparkles className="w-3.5 h-3.5 text-black animate-pulse" />}
        </button>

        {comicMode && (
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Silenciar efectos cómic" : "Activar sonido cómic"}
            className={cn(
              "p-2 rounded-xl font-black text-xs transition-all duration-200 border-2 border-black",
              soundEnabled
                ? "bg-[#00E5FF] text-black shadow-[3px_3px_0_0_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                : "bg-card text-muted-foreground border-border shadow-sm hover:text-foreground"
            )}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        )}
      </div>
    </ComicContext.Provider>
  );
}
