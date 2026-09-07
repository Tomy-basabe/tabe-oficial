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
    yellow: "bg-[#FFE600] text-black border-black shadow-[2.5px_2.5px_0_0_#000]",
    cyan: "bg-[#00E5FF] text-black border-black shadow-[2.5px_2.5px_0_0_#000]",
    pink: "bg-[#FF2E93] text-white border-black shadow-[2.5px_2.5px_0_0_#000]",
    green: "bg-[#00FF66] text-black border-black shadow-[2.5px_2.5px_0_0_#000]",
    orange: "bg-[#FF6B00] text-white border-black shadow-[2.5px_2.5px_0_0_#000]",
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
