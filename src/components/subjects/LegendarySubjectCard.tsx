import { memo } from "react";
import { cn } from "@/lib/utils";
import { Crown, Star } from "lucide-react";

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
      className="relative group cursor-pointer transition-transform duration-200 hover:-translate-y-1 mt-6"
    >
      {/* Folder Tab */}
      <div className="absolute bottom-[calc(100%-3px)] left-0 px-3 py-1.5 pb-2 rounded-t-lg border-[3px] border-foreground font-black text-[10px] tracking-wider z-0 flex items-center gap-1.5 bg-[#ffd21c] text-black">
        <Crown className="w-3.5 h-3.5 text-black" />
        APROBADA
      </div>

      {/* Main Folder Body */}
      <div
        className={cn(
          "relative z-10 w-full rounded-xl rounded-tl-none border-[3px] border-foreground text-left transition-shadow duration-200",
          "bg-[#ffd21c] hover:shadow-[4px_4px_0_0_#000000] dark:hover:shadow-[4px_4px_0_0_#ffffff]",
          compact ? "p-3" : "p-4"
        )}
      >
        {/* Top Badges */}
        <div className="flex items-start justify-between mb-1">
          <span className="text-[10px] font-extrabold text-black bg-white/90 px-2 py-0.5 rounded-md border-2 border-foreground flex items-center gap-1">
            <Star className="w-2.5 h-2.5 fill-black text-black" />
            AÑO {año}
          </span>
          {numero_materia && (
            <span className="text-[10px] font-black bg-foreground text-background px-1.5 py-0.5 rounded-sm">
              #{numero_materia}
            </span>
          )}
        </div>

        {/* Subject name */}
        <h3
          className={cn(
            "font-black leading-tight mt-2 line-clamp-2 text-black",
            compact ? "text-sm" : "text-base"
          )}
        >
          {nombre}
        </h3>

        {/* Footer with code and grade */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t-2 border-black/15">
          <span className="text-[10px] font-black text-black/80 uppercase tracking-widest">
            {codigo}
          </span>

          {nota !== undefined && nota !== null && (
            <div className="flex items-center gap-1 bg-black text-[#ffd21c] px-2 py-0.5 rounded-md border-2 border-foreground shadow-[1px_1px_0_0_#000]">
              <span className="text-[9px] font-bold text-white/80 uppercase">Nota:</span>
              <span className="text-xs font-black">{nota}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
