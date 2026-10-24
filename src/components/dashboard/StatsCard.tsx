import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "gold" | "green" | "cyan" | "purple";
}

const variantStyles: Record<string, {
  border: string;
  glow: string;
  iconBg: string;
  iconColor: string;
  subtextColor?: string;
}> = {
  default: {
    border: "border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700",
    glow: "",
    iconBg: "bg-zinc-100 dark:bg-zinc-800 border-zinc-200/60 dark:border-zinc-700/60",
    iconColor: "text-zinc-700 dark:text-zinc-300",
  },
  gold: {
    border: "border-amber-200/70 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700/70",
    glow: "bg-gradient-to-br from-amber-500/[0.04] to-transparent dark:from-amber-400/[0.05]",
    iconBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  cyan: {
    border: "border-sky-200/70 dark:border-sky-900/40 hover:border-sky-300 dark:hover:border-sky-700/70",
    glow: "bg-gradient-to-br from-sky-500/[0.04] to-transparent dark:from-sky-400/[0.05]",
    iconBg: "bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/60",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  green: {
    border: "border-emerald-200/70 dark:border-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700/70",
    glow: "bg-gradient-to-br from-emerald-500/[0.04] to-transparent dark:from-emerald-400/[0.05]",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  purple: {
    border: "border-purple-200/70 dark:border-purple-900/40 hover:border-purple-300 dark:hover:border-purple-700/70",
    glow: "bg-gradient-to-br from-purple-500/[0.04] to-transparent dark:from-purple-400/[0.05]",
    iconBg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-800/60",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: StatsCardProps) {
  const style = variantStyles[variant] || variantStyles.default;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white dark:bg-[#212121] border rounded-xl p-5 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between",
        style.border,
        style.glow
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="text-2xl lg:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            {value}
          </motion.p>
          {subtitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">{subtitle}</p>
          )}
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-all shadow-2xs",
            style.iconBg,
            style.iconColor
          )}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "font-medium px-1.5 py-0.5 rounded text-[11px]",
              trend.isPositive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60"
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-zinc-400 dark:text-zinc-500 text-[11px]">vs mes anterior</span>
        </div>
      )}
    </div>
  );
}
