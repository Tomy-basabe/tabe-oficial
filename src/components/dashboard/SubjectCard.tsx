import { memo } from "react";
import { cn } from "@/lib/utils";
import { BookOpen, Lock, Clock, RotateCcw, Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

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
    badgeClass: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-500/30 font-medium",
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
  const isBlocked = status === "bloqueada";

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between h-full overflow-hidden select-none",
        isBlocked
          ? "bg-[repeating-linear-gradient(135deg,rgba(244,244,245,0.7),rgba(244,244,245,0.7)_10px,rgba(250,250,250,0.85)_10px,rgba(250,250,250,0.85)_20px)] dark:bg-[repeating-linear-gradient(135deg,rgba(24,24,27,0.75),rgba(24,24,27,0.75)_10px,rgba(31,31,35,0.75)_10px,rgba(31,31,35,0.75)_20px)] border border-dashed border-zinc-300/90 dark:border-zinc-800 hover:border-amber-500/50 dark:hover:border-amber-500/40 hover:shadow-xs"
          : "bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs"
      )}
    >
      {/* Marca de agua de candado estilizado de fondo para materias bloqueadas */}
      {isBlocked && (
        <div className="absolute -right-3 -bottom-3 pointer-events-none opacity-[0.05] dark:opacity-[0.07] transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 text-zinc-900 dark:text-white">
          <Lock className="w-20 h-20" />
        </div>
      )}

      {/* Top Header: Status + Year */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors",
              config.badgeClass
            )}
          >
            <Icon className="w-3 h-3" />
            {config.label}
          </motion.span>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
            <span>{año}° Año</span>
            {numero_materia && <span>#{numero_materia}</span>}
          </div>
        </div>

        {/* Title */}
        <h3
          className={cn(
            "font-semibold tracking-tight leading-snug line-clamp-2 transition-colors",
            isBlocked
              ? "text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100"
              : "text-zinc-900 dark:text-zinc-100",
            compact ? "text-xs min-h-[2rem]" : "text-sm min-h-[2.5rem]"
          )}
        >
          {nombre}
        </h3>
      </div>

      {/* Bottom Footer: Code + Grade / Action prompt */}
      <div className="relative z-10 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
          {codigo}
        </span>
        {status === "aprobada" && nota !== null && nota !== undefined && !isNaN(Number(nota)) && Number(nota) > 0 ? (
          <span className="font-semibold text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80">
            Nota: {nota}
          </span>
        ) : isBlocked ? (
          <span className="text-[10px] font-medium text-amber-600/80 dark:text-amber-400/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            Ver requisitos <ArrowRight className="w-2.5 h-2.5" />
          </span>
        ) : null}
      </div>

      {/* Missing Requirements for Blocked Subjects */}
      {isBlocked && !compact && (
        <div className="relative z-10 mt-2.5 pt-2 border-t border-amber-500/20 dark:border-amber-500/15 bg-amber-500/[0.03] dark:bg-amber-500/[0.05] -mx-4 -mb-4 p-2.5 px-3 rounded-b-xl border-dashed">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[10px] font-semibold text-amber-800/90 dark:text-amber-400/90 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5 shrink-0" /> Correlatividades pendientes:
            </span>
            {requisitos_faltantes.length > 2 && (
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
                +{requisitos_faltantes.length - 2} más
              </span>
            )}
          </div>
          {requisitos_faltantes.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {requisitos_faltantes.slice(0, 2).map((req, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded bg-white/90 dark:bg-zinc-800/90 text-[10px] text-zinc-700 dark:text-zinc-300 border border-amber-500/20 dark:border-amber-500/20 shadow-2xs truncate max-w-[170px] inline-flex items-center gap-1"
                  title={req}
                >
                  <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                  <span className="truncate">{req}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 italic">
              Requiere regularizar o aprobar materias de años anteriores.
            </p>
          )}
        </div>
      )}
    </div>
  );
});
