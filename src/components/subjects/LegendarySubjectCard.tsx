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

export const goldenStyles = {
  bg: "#ffd21c",
  text: "#000000",
  codeBg: "#ffffff",
};

export const LegendarySubjectCard = memo(function LegendarySubjectCard({
  nombre,
  codigo,
  nota,
  año,
  numero_materia,
  onClick,
  compact = false,
}: LegendarySubjectCardProps) {
  const cardStyle = {
    '--golden-bg': goldenStyles.bg,
    '--golden-text': goldenStyles.text,
    '--golden-code-bg': goldenStyles.codeBg,
  } as React.CSSProperties;

  return (
    <div
      onClick={onClick}
      style={cardStyle}
      className="relative group cursor-pointer transition-transform duration-200 hover:-translate-y-1 mt-6 h-full flex flex-col"
    >
      {/* Folder Tab */}
      <div 
        className={cn("absolute bottom-[calc(100%-3px)] left-0 px-3 py-1.5 pb-2 rounded-t-lg border-[3px] border-foreground font-black text-[10px] tracking-wider z-0 flex items-center gap-1.5")}
        style={{ backgroundColor: "var(--golden-bg)", color: "var(--golden-text)" }}
      >
        <Crown className="w-3.5 h-3.5" style={{ color: "var(--golden-text)" }} />
        APROBADA
      </div>

      {/* Main Folder Body */}
      <div
        className={cn(
          "relative z-10 w-full rounded-xl rounded-tl-none border-[3px] border-foreground text-left transition-shadow duration-200 flex-1 flex flex-col",
          "bg-[var(--golden-bg)] text-[var(--golden-text)] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))]",
          compact ? "p-3" : "p-4"
        )}
      >
        {/* Top Badges */}
        <div className="flex items-start justify-between mb-1">
          <span 
            className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded-md border-2 border-foreground flex items-center gap-1")}
            style={{ backgroundColor: "var(--golden-code-bg)", color: "var(--golden-text)" }}
          >
            <Star className="w-2.5 h-2.5 fill-current" style={{ color: "var(--golden-text)" }} />
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
            "font-black leading-tight mt-2 line-clamp-2",
            compact ? "text-sm" : "text-base"
          )}
        >
          {nombre}
        </h3>

        {/* Bottom / Grade */}
        <div className={cn("mt-auto flex items-center justify-between pt-3 border-t-[3px] border-foreground border-opacity-20")}>
          <span className="text-[10px] font-black tracking-widest">
            {codigo}
          </span>
          {nota && (
            <span 
              className="text-xs font-black px-2 py-0.5 rounded-md border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
              style={{ backgroundColor: "var(--golden-code-bg)", color: "var(--golden-text)" }}
            >
              NOTA: {nota}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
