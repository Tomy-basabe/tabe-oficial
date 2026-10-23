import { memo } from "react";
import { cn } from "@/lib/utils";
import { BookOpen, Lock, Clock, RotateCcw, Check } from "lucide-react";

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

const statusConfig: Record<SubjectStatus, { label: string; icon: any; badgeClass: string }> = {
  aprobada: {
    label: "Aprobada",
    icon: Check,
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
  },
  regular: {
    label: "Regular",
    icon: Clock,
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60",
  },
  cursable: {
    label: "Cursable",
    icon: BookOpen,
    badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60",
  },
  bloqueada: {
    label: "Bloqueada",
    icon: Lock,
    badgeClass: "bg-zinc-50 text-zinc-400 dark:bg-zinc-900/40 dark:text-zinc-500 border-zinc-200/40 dark:border-zinc-800/40",
  },
  recursar: {
    label: "Recursar",
    icon: RotateCcw,
    badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60",
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
  const config = statusConfig[status] || statusConfig.cursable;
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs transition-[border-color,box-shadow] duration-150 cursor-pointer flex flex-col justify-between h-full",
        status === "bloqueada" && "opacity-75"
      )}
    >
      {/* Top Header: Status + Year */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border",
            config.badgeClass
          )}>
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
            <span>{año}° Año</span>
            {numero_materia && <span>#{numero_materia}</span>}
          </div>
        </div>

        {/* Title */}
        <h3 className={cn(
          "font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug line-clamp-2",
          compact ? "text-xs min-h-[2rem]" : "text-sm min-h-[2.5rem]"
        )}>
          {nombre}
        </h3>
      </div>

      {/* Bottom Footer: Code + Grade */}
      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
          {codigo}
        </span>
        {nota !== null && nota !== undefined && !isNaN(Number(nota)) && Number(nota) > 0 && (
          <span className="font-semibold text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80">
            Nota: {nota}
          </span>
        )}
      </div>

      {/* Missing Requirements for Blocked Subjects */}
      {status === "bloqueada" && requisitos_faltantes.length > 0 && !compact && (
        <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mb-1">
            <Lock className="w-2.5 h-2.5" /> Requisitos pendientes:
          </p>
          <div className="flex flex-wrap gap-1">
            {requisitos_faltantes.slice(0, 2).map((req, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 truncate max-w-[140px]"
              >
                {req}
              </span>
            ))}
            {requisitos_faltantes.length > 2 && (
              <span className="text-[9px] text-zinc-400 self-center">
                +{requisitos_faltantes.length - 2}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
