import { memo } from "react";
import { cn } from "@/lib/utils";
import { BookOpen, Lock, Clock, RotateCcw } from "lucide-react";
import { LegendarySubjectCard } from "@/components/subjects/LegendarySubjectCard";

export type SubjectStatus = "aprobada" | "regular" | "cursable" | "bloqueada" | "recursar";

interface SubjectCardProps {
  nombre: string;
  codigo: string;
  status: SubjectStatus;
  nota?: number | null;
  año: number;
  numero_materia?: number;
  requisitos_faltantes?: string[];
  onClick?: () => void;
  compact?: boolean;
}

const statusConfig = {
  regular: {
    label: "REGULAR",
    icon: Clock,
    bgLight: "#eff6ff",
    bgHoverLight: "#dbeafe",
    bgDark: "#1e3a8a80",
    bgHoverDark: "#1e3a8a99",
    tabBg: "#3b82f6",
    tabText: "#ffffff",
    iconColor: "#1e3a8a",
    textLight: "#1e3a8a",
    textDark: "#93c5fd",
    shadowColor: "#1475e5"
  },
  cursable: {
    label: "CURSABLE",
    icon: BookOpen,
    bgLight: "#f0fdf4",
    bgHoverLight: "#dcfce7",
    bgDark: "#14532d80",
    bgHoverDark: "#14532d99",
    tabBg: "#22c55e",
    tabText: "#ffffff",
    iconColor: "#14532d",
    textLight: "#14532d",
    textDark: "#86efac",
    shadowColor: "#48bd22"
  },
  bloqueada: {
    label: "BLOQUEADA",
    icon: Lock,
    bgLight: "#f4f4f580",
    bgHoverLight: "#f4f4f580",
    bgDark: "#27272a33",
    bgHoverDark: "#27272a33",
    tabBg: "#71717a",
    tabText: "#ffffff",
    iconColor: "#71717a",
    textLight: "#71717a",
    textDark: "#a1a1aa",
    shadowColor: "hsl(var(--muted-foreground))"
  },
  recursar: {
    label: "RECURSAR",
    icon: RotateCcw,
    bgLight: "#fef2f2",
    bgHoverLight: "#fee2e2",
    bgDark: "#7f1d1d80",
    bgHoverDark: "#7f1d1d99",
    tabBg: "#ef4444",
    tabText: "#ffffff",
    iconColor: "#7f1d1d",
    textLight: "#7f1d1d",
    textDark: "#fca5a5",
    shadowColor: "#ef4444"
  },
};

export const SubjectCard = memo(function SubjectCard({
  nombre,
  codigo,
  status,
  nota,
  año,
  numero_materia,
  requisitos_faltantes = [],
  onClick,
  compact = false,
}: SubjectCardProps) {
  // Use Legendary card for approved subjects
  if (status === "aprobada") {
    return (
      <LegendarySubjectCard
        nombre={nombre}
        codigo={codigo}
        nota={nota}
        año={año}
        numero_materia={numero_materia}
        onClick={onClick}
        compact={compact}
      />
    );
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  const cardStyle = {
    '--card-bg-light': config.bgLight,
    '--card-bg-dark': config.bgDark,
    '--card-bg-hover-light': config.bgHoverLight,
    '--card-bg-hover-dark': config.bgHoverDark,
    '--card-text-light': config.textLight,
    '--card-text-dark': config.textDark,
    '--card-shadow': config.shadowColor,
    '--tab-bg': config.tabBg,
    '--tab-text': config.tabText,
    '--icon-color': config.iconColor,
  } as React.CSSProperties;

  return (
    <div
      onClick={onClick}
      style={cardStyle}
      className="relative group transition-all duration-200 pt-7 h-full flex flex-col cursor-pointer hover:-translate-y-1"
    >
      {/* Folder Tab */}
      <div 
        className={cn(
          "absolute top-0 left-0 h-7 px-3 rounded-t-lg border-[3px] border-b-0 border-foreground font-black text-[10px] tracking-wider z-0 flex items-center gap-1.5 select-none"
        )}
        style={{ backgroundColor: "var(--tab-bg)", color: "var(--tab-text)" }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: "var(--tab-text)" }} />
        {config.label}
      </div>

      {/* Main Folder Body */}
      <div
        className={cn(
          "relative z-10 w-full rounded-xl rounded-tl-none border-[3px] border-foreground text-left transition-shadow duration-200 flex-1 flex flex-col",
          "bg-[var(--card-bg-light)] dark:bg-[var(--card-bg-dark)]",
          "text-[var(--card-text-light)] dark:text-[var(--card-text-dark)]",
          "hover:bg-[var(--card-bg-hover-light)] dark:hover:bg-[var(--card-bg-hover-dark)] hover:shadow-[4px_4px_0_0_var(--card-shadow)]",
          status === "bloqueada" && "opacity-90",
          compact ? "p-3" : "p-4"
        )}
      >
        <div className="flex items-start justify-between mb-1 relative z-10">
          <span 
            className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border-2 border-foreground"
            style={{ backgroundColor: "var(--tab-bg)", color: "var(--tab-text)" }}
          >
            AÑO {año}
          </span>
          {numero_materia && (
            <span className="text-[10px] font-black bg-foreground text-background px-1.5 py-0.5 rounded-sm">
              #{numero_materia}
            </span>
          )}
        </div>

        <h3 className={cn(
          "font-black leading-tight mt-2 line-clamp-2 min-h-[2.5rem]",
          compact ? "text-sm" : "text-base"
        )}>
          {nombre}
        </h3>

        {/* Bottom Bar matching LegendarySubjectCard */}
        <div className="mt-auto pt-3 border-t-[3px] border-foreground/20 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-widest text-foreground/80">
              {codigo}
            </span>
            {nota !== null && nota !== undefined && !isNaN(Number(nota)) && Number(nota) > 0 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-md border-2 border-foreground bg-background text-foreground shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))]">
                NOTA: {nota}
              </span>
            )}
          </div>

          {/* Show missing requirements for blocked subjects */}
          {status === "bloqueada" && requisitos_faltantes.length > 0 && !compact && (
            <div className="pt-1.5 border-t border-dashed border-foreground/30">
              <p className="text-[9px] text-foreground font-black mb-1 flex items-center gap-1 uppercase">
                <Lock className="w-2.5 h-2.5" /> Requisitos:
              </p>
              <div className="flex flex-wrap gap-1">
                {requisitos_faltantes.slice(0, 2).map((req, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 bg-background border border-foreground rounded text-[8px] font-black text-foreground"
                  >
                    {req}
                  </span>
                ))}
                {requisitos_faltantes.length > 2 && (
                  <span className="text-[8px] font-black text-muted-foreground self-center">
                    +{requisitos_faltantes.length - 2}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
