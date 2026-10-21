import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";

export function LandingBackground() {
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  // Smooth spring motion for mouse spotlight
  const springX = useSpring(mouseX, { stiffness: 45, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 45, damping: 25 });

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
      {/* 1. Ultra-subtle Dot Grid */}
      <div 
        className="absolute inset-0 opacity-[0.25] dark:opacity-[0.15]"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* 2. Interactive Spotlight Glow following cursor (Apple/ChatGPT style) */}
      <motion.div
        className="hidden md:block absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 dark:opacity-25 pointer-events-none"
        style={{
          left: springX,
          top: springY,
          x: "-50%",
          y: "-50%",
          background: "radial-gradient(circle, #3b82f6 0%, #8b5cf6 35%, transparent 70%)",
        }}
      />

      {/* 3. Ambient Subtle Gradients */}
      <motion.div
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-[130px]"
      />

      <motion.div
        animate={{
          x: [0, -40, 0],
          y: [0, 30, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 -right-32 w-[550px] h-[550px] rounded-full bg-purple-500/10 dark:bg-purple-600/10 blur-[140px]"
      />

      <motion.div
        animate={{
          x: [0, 25, 0],
          y: [0, -25, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-32 left-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/5 dark:bg-emerald-600/5 blur-[150px]"
      />
    </div>
  );
}
