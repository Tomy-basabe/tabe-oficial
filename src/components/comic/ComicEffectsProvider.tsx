import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
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
  let isApuntes = false;
  try {
    const location = useLocation();
    isApuntes = location.pathname.startsWith("/apuntes");
  } catch {
    if (typeof window !== "undefined") {
      isApuntes = window.location.pathname.startsWith("/apuntes");
    }
  }

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

  const lastBurstRef = useRef<number>(0);

  useEffect(() => {
    ComicAudio.setMuted(!soundEnabled || isApuntes);
    localStorage.setItem("tabe-comic-sound", JSON.stringify(soundEnabled));
  }, [soundEnabled, isApuntes]);

  // Sync comic-mode-active class to document.documentElement (disabled in /apuntes)
  useEffect(() => {
    if (comicMode && !isApuntes) {
      document.documentElement.classList.add("comic-mode-active");
    } else {
      document.documentElement.classList.remove("comic-mode-active");
    }
    localStorage.setItem("tabe-comic-mode", JSON.stringify(comicMode));
  }, [comicMode, isApuntes]);

  const toggleComicMode = useCallback(() => {
    setComicMode((prev) => !prev);
  }, []);

  const toggleSound = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSoundEnabled((prev) => !prev);
  }, []);

  const triggerBurst = useCallback(
    (x: number, y: number, customWord?: string) => {
      // Never trigger bursts or sounds in notes (/apuntes)
      if (!comicMode || isApuntes) return;

      const now = Date.now();
      // Throttle bursts to at most 1 every 250ms
      if (now - lastBurstRef.current < 250) return;
      lastBurstRef.current = now;

      // Play comic pop sound
      if (soundEnabled && !isApuntes) {
        ComicAudio.playPop();
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("tabe-comic-burst", {
            detail: { x, y, customWord },
          })
        );
      }
    },
    [comicMode, soundEnabled, isApuntes]
  );

  // Global click listener to trigger burst on clickable items or anywhere in comic mode
  useEffect(() => {
    if (!comicMode || isApuntes) return;

    const handleClick = (e: MouseEvent) => {
      if (isApuntes) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("#comic-mode-toggle, .no-comic, .ProseMirror, .notion-container, [data-no-comic]")) return;

      triggerBurst(e.clientX, e.clientY);
    };

    window.addEventListener("click", handleClick, { passive: true });
    return () => window.removeEventListener("click", handleClick);
  }, [comicMode, triggerBurst, isApuntes]);

  const contextValue = React.useMemo(
    () => ({
      comicMode,
      toggleComicMode,
      setComicMode,
      soundEnabled,
      toggleSound,
      setSoundEnabled,
      triggerBurst,
    }),
    [comicMode, toggleComicMode, soundEnabled, toggleSound, triggerBurst]
  );

  return (
    <ComicContext.Provider value={contextValue}>
      {children}
      <ComicParticlesOverlay isApuntes={isApuntes} comicMode={comicMode} />
    </ComicContext.Provider>
  );
}

// Independent overlay component that handles particle DOM without re-rendering parent tree
function ComicParticlesOverlay({ isApuntes, comicMode }: { isApuntes: boolean; comicMode: boolean }) {
  const [particles, setParticles] = useState<ComicParticle[]>([]);
  const particleIdRef = useRef<number>(0);

  useEffect(() => {
    if (!comicMode || isApuntes) return;

    const handleBurstEvent = (e: Event) => {
      const { x, y, customWord } = (e as CustomEvent).detail || {};
      if (typeof x !== "number" || typeof y !== "number") return;

      const word = customWord || COMIC_WORDS[Math.floor(Math.random() * COMIC_WORDS.length)];
      const colorScheme = COMIC_COLORS[Math.floor(Math.random() * COMIC_COLORS.length)];
      const tilt = (Math.random() - 0.5) * 24;

      const sparkles = Array.from({ length: 4 }).map((_, i) => {
        const angle = (i * (360 / 4) + Math.random() * 20) * (Math.PI / 180);
        const distance = 30 + Math.random() * 20;
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

      setParticles((prev) => [...prev.slice(-3), newParticle]);

      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== newId));
      }, 750);
    };

    window.addEventListener("tabe-comic-burst", handleBurstEvent);
    return () => window.removeEventListener("tabe-comic-burst", handleBurstEvent);
  }, [comicMode, isApuntes]);

  if (!comicMode || isApuntes || particles.length === 0) return null;

  return (
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
  );
}
