import { Loader2, Users, Bot, User, X, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GameSearchingOpponentProps {
  gameTitle: string;
  gameIcon?: React.ComponentType<{ className?: string }>;
  timeLeft: number;
  maxTime?: number;
  userCarrera?: string | null;
  userName?: string;
  onCancel: () => void;
  statusMessage?: string;
}

export function GameSearchingOpponent({
  gameTitle,
  gameIcon: GameIcon,
  timeLeft,
  maxTime = 13,
  userCarrera,
  userName = "Tú",
  onCancel,
  statusMessage = "Emparejando con estudiantes en línea...",
}: GameSearchingOpponentProps) {
  const progressPercent = Math.min(100, Math.max(0, ((maxTime - timeLeft) / maxTime) * 100));

  return (
    <div className="min-h-screen p-4 flex items-center justify-center text-foreground bg-background">
      <div className="w-full max-w-md bg-card border border-border/80 shadow-xl rounded-2xl p-7 text-center space-y-6 relative overflow-hidden">
        {/* Subtle top indicator bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Title & Badge */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-center gap-1.5">
            <Badge variant="outline" className="text-[11px] font-normal py-0.5 px-2 bg-muted/40">
              {gameTitle}
            </Badge>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Buscando rival
          </h2>
          <p className="text-xs text-muted-foreground">
            {statusMessage}
          </p>
        </div>

        {/* Duel Preview Section */}
        <div className="py-2">
          <div className="flex items-center justify-between px-4">
            {/* Player 1 (You) */}
            <div className="flex flex-col items-center space-y-2 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/40 flex items-center justify-center text-primary shadow-sm">
                <User className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-foreground truncate max-w-[90px]">
                  {userName}
                </p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Listo
                </span>
              </div>
            </div>

            {/* Middle Radar / Countdown Timer */}
            <div className="flex flex-col items-center justify-center px-2">
              <div className="relative w-16 h-16 flex items-center justify-center">
                {/* Pulsing ring */}
                <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border border-primary/30" />
                
                {/* SVG circular progress */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-muted/40"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray={`${((maxTime - timeLeft) / maxTime) * 100}, 100`}
                    strokeLinecap="round"
                    className="text-primary transition-all duration-1000 ease-linear"
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-xs font-bold text-foreground">
                    {timeLeft}s
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1.5 font-medium">
                Esperando
              </span>
            </div>

            {/* Player 2 (Searching opponent slot) */}
            <div className="flex flex-col items-center space-y-2 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 border-2 border-dashed border-border/80 flex items-center justify-center text-muted-foreground relative">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/60" />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground truncate max-w-[90px]">
                  Rival
                </p>
                <span className="text-[10px] text-muted-foreground/70">
                  Conectando...
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-muted/30 border border-border/60 rounded-xl p-3 text-left space-y-1">
          {userCarrera && (
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium pb-1 border-b border-border/40">
              <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">Priorizando compañeros de: {userCarrera}</span>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">
            Si no se conecta ningún compañero en breve, entrará automáticamente el bot de estudio de TABE para que juegues sin demoras.
          </p>
        </div>

        {/* Cancel Button */}
        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full h-10 text-xs font-medium border-border/80 hover:bg-muted"
        >
          <X className="w-3.5 h-3.5 mr-1.5" />
          Cancelar búsqueda
        </Button>
      </div>
    </div>
  );
}
