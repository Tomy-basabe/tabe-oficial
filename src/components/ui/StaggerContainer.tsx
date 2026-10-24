import React from "react";
import { motion, HTMLMotionProps, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  staggerDelay?: number;
  initialDelay?: number;
  className?: string;
}

const defaultContainerVariants = (staggerDelay = 0.05, initialDelay = 0.02): Variants => ({
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
  ({ children, staggerDelay = 0.05, initialDelay = 0.02, className, ...props }, ref) => {
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

const defaultItemVariants = (yOffset = 14): Variants => ({
  hidden: {
    opacity: 0,
    y: yOffset,
    scale: 0.985,
    filter: "blur(4px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.42,
      ease: [0.16, 1, 0.3, 1],
    },
  },
});

export const StaggerItem = React.forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, className, yOffset = 14, ...props }, ref) => {
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
