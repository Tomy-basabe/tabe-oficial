import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";
import { Sparkles, Coffee, Brain, Target, Star, Calculator, BookmarkCheck, Zap } from "lucide-react";

export function LandingBackground() {
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  // Smooth spring motion for mouse spotlight
  const springX = useSpring(mouseX, { stiffness: 60, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 25 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY + window.scrollY);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* 1. Subtle College Dot-Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* 2. Interactive Spotlight Glow following cursor */}
      <motion.div
        className="hidden md:block absolute w-[480px] h-[480px] rounded-full blur-[100px] opacity-15 dark:opacity-20"
        style={{
          left: springX,
          top: springY,
          x: "-50%",
          y: "-50%",
          background: "radial-gradient(circle, #1475e5 0%, #ff9415 50%, transparent 80%)",
        }}
      />

      {/* 3. Floating Ambient Glow Orbs in TABE Brand Colors */}
      {/* Top Left Orange Orb */}
      <motion.div
        animate={{
          x: [0, 40, 0],
          y: [0, -30, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-24 -left-24 w-[400px] h-[400px] rounded-full bg-[#ff9415]/10 dark:bg-[#ff9415]/15 blur-[120px]"
      />

      {/* Top Right Cyan/Blue Orb */}
      <motion.div
        animate={{
          x: [0, -50, 0],
          y: [0, 40, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-1/4 -right-28 w-[450px] h-[450px] rounded-full bg-[#1475e5]/10 dark:bg-[#1475e5]/15 blur-[130px]"
      />

      {/* Center Left Green Orb */}
      <motion.div
        animate={{
          x: [0, 30, 0],
          y: [0, 50, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-1/2 -left-28 w-[380px] h-[380px] rounded-full bg-[#48bd22]/8 dark:bg-[#48bd22]/12 blur-[120px]"
      />

      {/* Bottom Right Yellow/Amber Orb */}
      <motion.div
        animate={{
          x: [0, -35, 0],
          y: [0, -40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute bottom-1/4 -right-20 w-[420px] h-[420px] rounded-full bg-[#ffd21c]/10 dark:bg-[#ffd21c]/15 blur-[120px]"
      />

      {/* 4. Floating Academic Stickers / Doodles in the Margins (Visible on Ultra-Wide screens >= 1640px) */}
      {/* Top Left: Formula Badge */}
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [-2, 3, -2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="hidden min-[1640px]:flex absolute top-28 left-8 items-center gap-2 px-3 py-1.5 bg-card/80 backdrop-blur-xs border-2 border-foreground/30 rounded-xl shadow-[3px_3px_0_0_#ff9415] text-[11px] font-black uppercase text-foreground/80"
      >
        <Calculator className="w-3.5 h-3.5 text-[#ff9415]" />
        <span>∫ f(x)dx • Algoritmos</span>
      </motion.div>

      {/* Top Right: Modo Parcial Badge */}
      <motion.div
        animate={{ y: [0, 14, 0], rotate: [2, -3, 2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="hidden min-[1640px]:flex absolute top-32 right-8 items-center gap-2 px-3 py-1.5 bg-card/80 backdrop-blur-xs border-2 border-foreground/30 rounded-xl shadow-[3px_3px_0_0_#1475e5] text-[11px] font-black uppercase text-foreground/80"
      >
        <Coffee className="w-3.5 h-3.5 text-[#1475e5]" />
        <span>Modo Parcial ☕</span>
      </motion.div>

      {/* Middle Left: Racha de Estudio */}
      <motion.div
        animate={{ y: [0, -16, 0], rotate: [-3, 1, -3] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="hidden min-[1640px]:flex absolute top-[68%] left-8 items-center gap-2 px-3 py-1.5 bg-card/80 backdrop-blur-xs border-2 border-foreground/30 rounded-xl shadow-[3px_3px_0_0_#48bd22] text-[11px] font-black uppercase text-foreground/80"
      >
        <Zap className="w-3.5 h-3.5 text-[#48bd22]" />
        <span>Racha: 14 Días 🔥</span>
      </motion.div>

      {/* Middle Right: Flashcards 3D */}
      <motion.div
        animate={{ y: [0, 15, 0], rotate: [3, -2, 3] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="hidden min-[1640px]:flex absolute top-[52%] right-8 items-center gap-2 px-3 py-1.5 bg-card/80 backdrop-blur-xs border-2 border-foreground/30 rounded-xl shadow-[3px_3px_0_0_#ffd21c] text-[11px] font-black uppercase text-foreground/80"
      >
        <Brain className="w-3.5 h-3.5 text-[#ffd21c]" />
        <span>Flashcards 3D</span>
      </motion.div>

      {/* Bottom Left: 100% Universitario */}
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [1, -2, 1] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="hidden min-[1640px]:flex absolute top-[85%] left-10 items-center gap-2 px-3 py-1.5 bg-card/80 backdrop-blur-xs border-2 border-foreground/30 rounded-xl shadow-[3px_3px_0_0_#ff9415] text-[11px] font-black uppercase text-foreground/80"
      >
        <Star className="w-3.5 h-3.5 fill-[#ff9415] text-[#ff9415]" />
        <span>100% Universitario</span>
      </motion.div>

      {/* Bottom Right: Correlativas */}
      <motion.div
        animate={{ y: [0, 12, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
        className="hidden min-[1640px]:flex absolute top-[82%] right-10 items-center gap-2 px-3 py-1.5 bg-card/80 backdrop-blur-xs border-2 border-foreground/30 rounded-xl shadow-[3px_3px_0_0_#1475e5] text-[11px] font-black uppercase text-foreground/80"
      >
        <BookmarkCheck className="w-3.5 h-3.5 text-[#1475e5]" />
        <span>Mapa de Correlativas</span>
      </motion.div>
    </div>
  );
}
