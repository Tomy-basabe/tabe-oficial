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
    label: "Regular",
    icon: Clock,
    className: "bg-blue-100 border-[3px] border-foreground hover:-translate-y-1 hover:shadow-[3px_3px_0_0_#1475e5] dark:bg-blue-900/40 dark:shadow-[3px_3px_0_0_#1475e5]",
    iconColor: "text-blue-600 dark:text-blue-400",
    textColor: "text-blue-600 dark:text-blue-400 font-black",
  },
  cursable: {
    label: "Cursable",
    icon: BookOpen,
    className: "bg-green-100 border-[3px] border-foreground hover:-translate-y-1 hover:shadow-[3px_3px_0_0_#48bd22] dark:bg-green-900/40 dark:shadow-[3px_3px_0_0_#48bd22]",
    iconColor: "text-green-600 dark:text-green-400",
    textColor: "text-green-600 dark:text-green-400 font-black",
  },
  bloqueada: {
    label: "Bloqueada",
    icon: Lock,
    className: "bg-muted border-[3px] border-dashed border-border opacity-70 cursor-not-allowed",
    iconColor: "text-muted-foreground",
    textColor: "text-muted-foreground font-black",
  },
  recursar: {
    label: "Recursar",
    icon: RotateCcw,
    className: "bg-red-100 border-[3px] border-foreground hover:-translate-y-1 hover:shadow-[3px_3px_0_0_#ef4444] dark:bg-red-900/40 dark:shadow-[3px_3px_0_0_#ef4444]",
    iconColor: "text-red-600 dark:text-red-400",
    textColor: "text-red-600 dark:text-red-400 font-black",
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

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl transition-all duration-300 text-left",
        config.className,
        "hover:scale-[1.02] hover:shadow-lg cursor-pointer",
        compact ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", config.iconColor)} />
          <span className={cn("text-xs font-medium", config.textColor)}>
            {config.label}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">Año {año}</span>
      </div>

      <h3 className={cn(
        "font-medium mb-1 line-clamp-2",
        compact ? "text-xs" : "text-sm",
        status === "bloqueada" ? "text-muted-foreground" : "text-foreground"
      )}>
        {nombre}
      </h3>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {numero_materia && (
            <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              #{numero_materia}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{codigo}</span>
        </div>
      </div>

      {/* Show missing requirements for blocked subjects */}
      {status === "bloqueada" && requisitos_faltantes.length > 0 && !compact && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Necesitas:
          </p>
          <div className="flex flex-wrap gap-1">
            {requisitos_faltantes.slice(0, 3).map((req, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 bg-muted rounded text-[9px] text-muted-foreground"
              >
                {req}
              </span>
            ))}
            {requisitos_faltantes.length > 3 && (
              <span className="px-1.5 py-0.5 bg-muted rounded text-[9px] text-muted-foreground">
                +{requisitos_faltantes.length - 3} más
              </span>
            )}
          </div>
        </div>
      )}
    </button>
  );
});
