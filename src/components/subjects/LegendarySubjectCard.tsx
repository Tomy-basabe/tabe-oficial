import { memo } from "react";
import { cn } from "@/lib/utils";
import { Crown, Sparkles, Star } from "lucide-react";

interface LegendarySubjectCardProps {
  nombre: string;
  codigo: string;
  nota?: number | null;
  año: number;
  numero_materia?: number;
  onClick?: () => void;
  compact?: boolean;
}

// Static particles array — avoids re-creation on every render
const particles = [
  { left: "20%", delay: "0s" },
  { left: "50%", delay: "1s" },
  { left: "80%", delay: "2s" },
];

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
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl transition-all duration-300 text-left relative",
        "subject-legendary animate-legendary-glow",
        "hover:scale-[1.03] cursor-pointer",
        compact ? "p-3" : "p-4"
      )}
    >
      {/* Floating particles - Desktop Only */}
      <div className="legendary-particles hidden lg:block">
        {particles.map((particle, i) => (
          <span
            key={i}
            className="legendary-particle"
            style={{
              left: particle.left,
              bottom: "10%",
              animationDelay: particle.delay,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header with crown */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Crown className="w-5 h-5 text-neon-gold animate-crown drop-shadow-[0_0_8px_hsl(45,100%,55%)]" />
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-neon-gold/80 animate-pulse" />
            </div>
            <span className="text-xs font-bold legendary-text tracking-wider uppercase">
              Aprobada
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-3 h-3 text-neon-gold/60 fill-neon-gold/40" />
            <span className="text-xs text-neon-gold/80 font-medium">Año {año}</span>
          </div>
        </div>

        {/* Subject name with legendary styling */}
        <h3 className={cn(
          "font-semibold mb-1 line-clamp-2 text-neon-gold",
          "drop-shadow-[0_0_10px_hsl(45,100%,55%,0.5)]",
          compact ? "text-xs" : "text-sm"
        )}>
          {nombre}
        </h3>

        {/* Footer with code and grade */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {numero_materia && (
              <span className="text-xs font-bold text-background bg-gradient-to-r from-neon-gold to-amber-500 px-2 py-0.5 rounded-md shadow-lg shadow-neon-gold/30">
                #{numero_materia}
              </span>
            )}
            <span className="text-xs text-neon-gold/70 font-medium">{codigo}</span>
          </div>

          {/* Epic grade display */}
          {nota !== undefined && nota !== null && (
            <div className="relative">
              <div className="absolute inset-0 bg-neon-gold/30 blur-md rounded-lg" />
              <span className={cn(
                "relative text-lg font-display font-black legendary-text",
                "drop-shadow-[0_0_12px_hsl(45,100%,55%)]"
              )}>
                {nota}
              </span>
            </div>
          )}
        </div>

        {/* Bottom decorative line */}
        <div className="mt-3 h-0.5 bg-gradient-to-r from-transparent via-neon-gold/50 to-transparent rounded-full" />
      </div>
    </button>
  );
});

