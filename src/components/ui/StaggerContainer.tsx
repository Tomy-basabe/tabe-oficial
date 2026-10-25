import React from "react";
import { motion, HTMLMotionProps, Variants } from "framer-motion";

interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  staggerDelay?: number;
  initialDelay?: number;
  className?: string;
}

const defaultContainerVariants = (staggerDelay = 0.055, initialDelay = 0.02): Variants => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: initialDelay,
    },
  },
});

export const StaggerContainer = React.forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, staggerDelay = 0.055, initialDelay = 0.02, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={defaultContainerVariants(staggerDelay, initialDelay)}
        initial="hidden"
        animate="show"
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerContainer.displayName = "StaggerContainer";

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  yOffset?: number;
}

/**
 * Coreografía en 3 etapas:
 * 1. Aparece el módulo con estructura limpia y baja saturación
 * 2. Impactan los colores (saturación vibrante)
 * 3. Se acomoda suavemente en su lugar definitivo
 */
const defaultItemVariants = (yOffset = 16): Variants => ({
  hidden: {
    opacity: 0,
    y: yOffset,
    scale: 0.982,
    filter: "saturate(0.1) blur(3px)",
  },
  show: {
    opacity: [0, 1, 1, 1],
    y: [yOffset, -1.5, 0.5, 0],
    scale: [0.982, 1.003, 0.999, 1],
    filter: [
      "saturate(0.1) blur(3px)",
      "saturate(0.28) blur(0px)",
      "saturate(1.24) blur(0px)",
      "saturate(1) blur(0px)",
    ],
    transition: {
      duration: 0.62,
      times: [0, 0.46, 0.74, 1],
      ease: [0.22, 1, 0.36, 1],
    },
  },
});

export const StaggerItem = React.forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, className, yOffset = 16, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={defaultItemVariants(yOffset)}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerItem.displayName = "StaggerItem";
