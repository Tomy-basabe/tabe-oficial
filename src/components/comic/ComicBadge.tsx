import React from "react";
import { cn } from "@/lib/utils";

interface ComicBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "yellow" | "cyan" | "pink" | "green" | "orange";
  rotate?: "left" | "right" | "none";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function ComicBadge({
  variant = "yellow",
  rotate = "left",
  size = "md",
  className,
  children,
  ...props
}: ComicBadgeProps) {
  const variantStyles = {
    yellow: "bg-amber-400 text-zinc-950 border-black shadow-[2px_2px_0_0_#000] dark:bg-amber-400/20 dark:text-amber-300 dark:border-amber-400/40 dark:shadow-none",
    cyan: "bg-cyan-400 text-zinc-950 border-black shadow-[2px_2px_0_0_#000] dark:bg-cyan-400/20 dark:text-cyan-300 dark:border-cyan-400/40 dark:shadow-none",
    pink: "bg-pink-500 text-white border-black shadow-[2px_2px_0_0_#000] dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-400/40 dark:shadow-none",
    green: "bg-emerald-500 text-zinc-950 border-black shadow-[2px_2px_0_0_#000] dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/40 dark:shadow-none",
    orange: "bg-orange-500 text-white border-black shadow-[2px_2px_0_0_#000] dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-400/40 dark:shadow-none",
  };

  const rotateStyles = {
    left: "-rotate-2 hover:rotate-0",
    right: "rotate-2 hover:rotate-0",
    none: "rotate-0",
  };

  const sizeStyles = {
    sm: "text-[10px] px-1.5 py-0.5 border-[1.5px]",
    md: "text-xs px-2.5 py-1 border-2",
    lg: "text-sm px-3.5 py-1.5 border-[2.5px]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 font-black uppercase tracking-wider rounded-lg transition-transform duration-150 select-none",
        variantStyles[variant],
        rotateStyles[rotate],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
