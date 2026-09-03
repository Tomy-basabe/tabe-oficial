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
    bodyClass: "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50",
    tabClass: "bg-blue-500 text-white",
    iconColor: "text-blue-900",
    textColor: "text-blue-900 dark:text-blue-300",
    shadowColor: "hover:shadow-[4px_4px_0_0_#1475e5]"
  },
  cursable: {
    label: "CURSABLE",
    icon: BookOpen,
    bodyClass: "bg-green-100 hover:bg-green-200 dark:bg-green-900/50",
    tabClass: "bg-green-500 text-white",
    iconColor: "text-green-900",
    textColor: "text-green-900 dark:text-green-300",
    shadowColor: "hover:shadow-[4px_4px_0_0_#48bd22]"
  },
  bloqueada: {
    label: "BLOQUEADA",
    icon: Lock,
    bodyClass: "bg-muted opacity-80 cursor-not-allowed",
    tabClass: "bg-muted-foreground text-background",
    iconColor: "text-muted-foreground",
    textColor: "text-muted-foreground",
    shadowColor: ""
  },
  recursar: {
    label: "RECURSAR",
    icon: RotateCcw,
    bodyClass: "bg-red-100 hover:bg-red-200 dark:bg-red-900/50",
    tabClass: "bg-red-500 text-white",
    iconColor: "text-red-900",
    textColor: "text-red-900 dark:text-red-300",
    shadowColor: "hover:shadow-[4px_4px_0_0_#ef4444]"
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
    <div className="relative group cursor-pointer transition-transform duration-200 hover:-translate-y-1 mt-3" onClick={onClick}>
      {/* Folder Tab */}
      <div className={cn(
        "absolute -top-3 left-0 px-3 py-1 rounded-t-lg border-[3px] border-b-0 border-foreground font-black text-[10px] tracking-wider z-0 flex items-center gap-1",
        config.tabClass
      )}>
        <Icon className="w-3 h-3" />
        {config.label}
      </div>

      {/* Main Folder Body */}
      <div className={cn(
        "relative z-10 w-full rounded-xl rounded-tl-none border-[3px] border-foreground text-left transition-shadow duration-200",
        config.bodyClass,
        config.shadowColor,
        compact ? "p-3" : "p-4"
      )}>
        <div className="flex items-start justify-between mb-1">
          <span className="text-[10px] font-extrabold text-foreground bg-background/50 px-2 py-0.5 rounded-md border-2 border-foreground">
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
          compact ? "text-sm" : "text-base",
          config.textColor
        )}>
          {nombre}
        </h3>

        <div className="flex items-center gap-1 mt-2">
          <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-widest">{codigo}</span>
        </div>

        {/* Show missing requirements for blocked subjects */}
        {status === "bloqueada" && requisitos_faltantes.length > 0 && !compact && (
          <div className="mt-3 pt-2 border-t-2 border-dashed border-foreground/30">
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
        )}
      </div>
    </div>
  );
});
