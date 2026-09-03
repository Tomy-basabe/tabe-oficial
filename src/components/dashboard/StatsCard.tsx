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

/* Claymorphism color mapping */
const variantStyles = {
  default: { color: "#171b21", bg: "bg-secondary" },
  gold: { color: "#ffd21c", bg: "bg-[#ffd21c]/12" },
  green: { color: "#48bd22", bg: "bg-[#48bd22]/12" },
  cyan: { color: "#1475e5", bg: "bg-[#1475e5]/12" },
  purple: { color: "#ff9415", bg: "bg-[#ff9415]/12" },
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: StatsCardProps) {
  const styles = variantStyles[variant];
  const bentoHoverClass = {
    default: "bento-hover-blue",
    gold: "bento-hover-yellow",
    green: "bento-hover-green",
    cyan: "bento-hover-blue",
    purple: "bento-hover-purple",
  }[variant] || "bento-hover-blue";

  return (
    <div className={cn("neo-bento-card p-6 flex flex-col justify-between group", bentoHoverClass)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-bold text-muted-foreground">{title}</p>
          <p className="text-3xl font-black" style={{ color: styles.color }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs font-bold text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", styles.bg)}>
          <Icon className="w-6 h-6" style={{ color: styles.color }} />
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <span className={cn(
            "text-xs font-extrabold px-2 py-1 rounded-full",
            trend.isPositive ? "bg-[#48bd22]/12 text-[#48bd22]" : "bg-red-500/12 text-red-500"
          )}>
            {trend.isPositive ? "+" : ""}{trend.value}%
          </span>
          <span className="text-xs text-muted-foreground font-bold">vs mes anterior</span>
        </div>
      )}
    </div>
  );
}
