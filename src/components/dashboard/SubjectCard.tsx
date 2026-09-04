import { memo } from "react";
import { cn } from "@/lib/utils";
import { BookOpen, Lock, Clock, RotateCcw, X } from "lucide-react";
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
      onClick={status !== "bloqueada" ? onClick : undefined}
      style={cardStyle}
      className={cn(
        "relative group transition-transform duration-200 mt-6 h-full flex flex-col",
        status !== "bloqueada" ? "cursor-pointer hover:-translate-y-1" : ""
      )}
    >
      {/* Folder Tab */}
      <div 
        className={cn("absolute bottom-[calc(100%-3px)] left-0 px-3 py-1.5 pb-2 rounded-t-lg font-black text-[10px] tracking-wider z-0 flex items-center gap-1.5")}
        style={{ backgroundColor: "var(--tab-bg)", color: "var(--tab-text)" }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: "var(--tab-text)" }} />
        {config.label}
      </div>

      {/* Main Folder Body */}
      <div
        className={cn(
          "relative z-10 w-full rounded-xl rounded-tl-none border-[3px] border-foreground text-left transition-shadow duration-200 flex-1 flex flex-col overflow-hidden",
          "bg-[var(--card-bg-light)] dark:bg-[var(--card-bg-dark)]",
          "text-[var(--card-text-light)] dark:text-[var(--card-text-dark)]",
          status !== "bloqueada" ? "hover:bg-[var(--card-bg-hover-light)] dark:hover:bg-[var(--card-bg-hover-dark)] hover:shadow-[4px_4px_0_0_var(--card-shadow)]" : "opacity-80 cursor-not-allowed hover:border-red-500 hover:border-opacity-100",
          compact ? "p-3" : "p-4"
        )}
      >
        {/* Locked Hover Overlay */}
        {status === "bloqueada" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300">
            <X className="w-16 h-16 text-red-500 scale-50 group-hover:scale-100 transition-transform duration-500 ease-out drop-shadow-[2px_2px_0_#000]" strokeWidth={3} />
          </div>
        )}

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
          "font-black leading-tight mt-2 line-clamp-2",
          compact ? "text-sm" : "text-base"
        )}>
          {nombre}
        </h3>

        <div className="flex items-center gap-1 mt-2">
          <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-widest">{codigo}</span>
        </div>

        {/* Show missing requirements for blocked subjects */}
        {status === "bloqueada" && requisitos_faltantes.length > 0 && !compact ? (
          <div className="mt-auto pt-3 border-t-2 border-dashed border-foreground/30">
            <p className="text-[10px] text-foreground font-bold mb-1 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Requisitos:
            </p>
            <div className="flex flex-wrap gap-1">
              {requisitos_faltantes.slice(0, 3).map((req, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 bg-background border-2 border-foreground rounded text-[9px] font-bold text-foreground"
                >
                  {req}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-auto"></div>
        )}
      </div>
    </div>
  );
});
