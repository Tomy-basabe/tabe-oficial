import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="text-2xl lg:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">{subtitle}</p>
          )}
        </div>
        <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span className={cn(
            "font-medium px-1.5 py-0.5 rounded text-[11px]",
            trend.isPositive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60"
          )}>
            {trend.isPositive ? "+" : ""}{trend.value}%
          </span>
          <span className="text-zinc-400 dark:text-zinc-500 text-[11px]">vs mes anterior</span>
        </div>
      )}
    </div>
  );
}
