import { useState, useEffect } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowUp, Compass, Sparkles, BookOpen, Brain, Zap, HelpCircle } from "lucide-react";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { useSmoothScroll } from "./SmoothScrollProvider";

interface SectionAnchor {
  id: string;
  label: string;
  icon: typeof Compass;
}

const SECTIONS: SectionAnchor[] = [
  { id: "hero", label: "Inicio", icon: Sparkles },
  { id: "story-journey", label: "Recorrido", icon: Compass },
  { id: "superpoderes", label: "Poderes", icon: Zap },
  { id: "demo-interactiva", label: "Demo", icon: Brain },
  { id: "metodologia", label: "Método", icon: BookOpen },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

export function ScrollProgressBar() {
  const { scrollTo } = useSmoothScroll();
  const { scrollYProgress, scrollY } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });

  // Calculate SVG stroke dash offset properly at the top level
  const strokeDashoffset = useTransform(smoothProgress, [0, 1], [56.54, 0]);

  const [percent, setPercent] = useState(0);
  const [activeSection, setActiveSection] = useState("hero");
  const [isExpanded, setIsExpanded] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const unsubProgress = scrollYProgress.on("change", (latest) => {
      setPercent(Math.round(latest * 100));
    });
    const unsubScroll = scrollY.on("change", (latest) => {
      setShowScrollTop(latest > 350);
    });

    return () => {
      unsubProgress();
      unsubScroll();
    };
  }, [scrollYProgress, scrollY]);

  // Observer to track current section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.2, rootMargin: "-80px 0px -40% 0px" }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    ComicAudio.playPop();
    scrollTo(`#${id}`, -80);
  };

  const scrollToTop = () => {
    ComicAudio.playPowerUp();
    scrollTo(document.body, 0);
  };

  return (
    <>
      {/* Top Fixed Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 z-50 pointer-events-none bg-black/10 dark:bg-white/5 backdrop-blur-xs">
        <motion.div
          className="h-full bg-gradient-to-r from-[#1475e5] via-[#ff9415] to-[#48bd22] origin-left shadow-[0_0_12px_rgba(20,117,229,0.8)]"
          style={{ scaleX: smoothProgress }}
        />
      </div>

      {/* Floating Scrolly HUD (Bottom-right) */}
      <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-2.5">
        {/* Scroll To Top Pill */}
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollToTop}
            title="Volver arriba"
            className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-black shadow-[3px_3px_0_0_#000] text-black dark:text-white hover:bg-[#FFE600] transition-colors"
          >
            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
          </motion.button>
        )}

        {/* Dynamic Story Scroll Capsule */}
        <motion.div
          layout
          className="relative flex items-center bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-2 border-black rounded-full px-3 py-1.5 shadow-[4px_4px_0_0_#000] text-xs font-bold text-foreground select-none"
        >
          {/* Circular Mini Progress Ring */}
          <div className="relative w-6 h-6 flex items-center justify-center mr-2">
            <svg className="w-6 h-6 -rotate-90">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                className="opacity-15"
              />
              <motion.circle
                cx="12"
                cy="12"
                r="9"
                stroke="#1475e5"
                strokeWidth="2.5"
                fill="none"
                strokeDasharray="56.54"
                style={{ strokeDashoffset }}
              />
            </svg>
            <span className="absolute text-[8px] font-black">{percent}%</span>
          </div>

          {/* Quick Section Switcher Buttons */}
          <div className="hidden sm:flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-800 pl-2">
            {SECTIONS.map((sec) => {
              const isActive = activeSection === sec.id;
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all text-[11px] ${
                    isActive
                      ? "bg-[#1475e5] text-white shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile view simple toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="sm:hidden text-[11px] font-black uppercase text-[#1475e5] px-1"
          >
            {isExpanded ? "Cerrar" : "Secciones"}
          </button>
        </motion.div>

        {/* Mobile Expanded Menu */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="sm:hidden flex flex-col gap-1 p-2 bg-white dark:bg-zinc-950 border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000] w-48 text-xs font-semibold"
          >
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => {
                  scrollToSection(sec.id);
                  setIsExpanded(false);
                }}
                className={`flex items-center gap-2 p-1.5 rounded-lg text-left ${
                  activeSection === sec.id
                    ? "bg-[#1475e5] text-white font-bold"
                    : "hover:bg-muted"
                }`}
              >
                <sec.icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}
