import { memo } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface LegendarySubjectCardProps {
  nombre: string;
  codigo: string;
  nota?: number | null;
  año: number;
  numero_materia?: number;
  onClick?: () => void;
  compact?: boolean;
}

export const LegendarySubjectCard = memo(function LegendarySubjectCard({
  nombre,
  codigo,
  nota,
  año,
  numero_materia,
  onClick,
  compact = false,
}: LegendarySubjectCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            <Check className="w-3 h-3" />
            Aprobada
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
            <span>{año}° Año</span>
            {numero_materia && <span>#{numero_materia}</span>}
          </div>
        </div>

        <h3 className={cn(
          "font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug line-clamp-2",
          compact ? "text-xs min-h-[2rem]" : "text-sm min-h-[2.5rem]"
        )}>
          {nombre}
        </h3>
      </div>

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
    </div>
  );
});
