import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function AmbientSpotlight() {
  const mouseX = useMotionValue(-500);
  const mouseY = useMotionValue(-500);

  const springX = useSpring(mouseX, { stiffness: 250, damping: 28 });
  const springY = useSpring(mouseY, { stiffness: 250, damping: 28 });

  useEffect(() => {
    // Only active on desktop pointers
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden hidden md:block">
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-15 dark:opacity-25"
        style={{
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%",
          background:
            "radial-gradient(circle, rgba(20,117,229,0.8) 0%, rgba(255,148,21,0.5) 40%, rgba(72,189,34,0) 70%)",
        }}
      />
    </div>
  );
}
