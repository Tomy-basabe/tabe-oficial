import { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function StudioCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [cursorType, setCursorType] = useState<"default" | "hover" | "text">("default");
  const [cursorText, setCursorText] = useState("");

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth spring physics for outer ring
  const ringX = useSpring(mouseX, { stiffness: 450, damping: 32 });
  const ringY = useSpring(mouseY, { stiffness: 450, damping: 32 });

  useEffect(() => {
    // Only run on non-touch devices
    if (typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      // Check hovered element
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest("a, button, [role='button'], input, textarea, select, .cursor-pointer");
      const customTextEl = target.closest("[data-cursor-text]");

      if (customTextEl) {
        setCursorType("text");
        setCursorText(customTextEl.getAttribute("data-cursor-text") || "");
      } else if (interactive) {
        setCursorType("hover");
        setCursorText("");
      } else {
        setCursorType("default");
        setCursorText("");
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [mouseX, mouseY, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden hidden md:block">
      {/* Outer Smooth Follower Ring */}
      <motion.div
        className="fixed top-0 left-0 rounded-full border-2 border-black dark:border-white pointer-events-none flex items-center justify-center mix-blend-difference"
        style={{
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          width: cursorType === "text" ? 64 : cursorType === "hover" ? 48 : 32,
          height: cursorType === "text" ? 64 : cursorType === "hover" ? 48 : 32,
          backgroundColor:
            cursorType === "text"
              ? "rgba(255, 255, 255, 0.9)"
              : cursorType === "hover"
              ? "rgba(255, 255, 255, 0.2)"
              : "transparent",
          scale: cursorType === "hover" ? 1.15 : 1,
        }}
        transition={{ type: "spring", stiffness: 450, damping: 30 }}
      >
        {cursorType === "text" && (
          <span className="text-[10px] font-black uppercase text-black tracking-wider select-none">
            {cursorText}
          </span>
        )}
      </motion.div>

      {/* Center Precise Dot */}
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-black dark:bg-white pointer-events-none mix-blend-difference"
        style={{
          x: mouseX,
          y: mouseY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          scale: cursorType === "text" ? 0 : cursorType === "hover" ? 0.4 : 1,
        }}
        transition={{ duration: 0.15 }}
      />
    </div>
  );
}
