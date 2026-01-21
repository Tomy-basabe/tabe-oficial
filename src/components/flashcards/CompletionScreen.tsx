import { useEffect, useState } from "react";
import { Trophy, Clock, Target, Sparkles, ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompletionScreenProps {
  deckName: string;
  totalCards: number;
  correctCount: number;
  studyTime: number;
  onRestart: () => void;
  onExit: () => void;
}

export function CompletionScreen({ 
  deckName, 
  totalCards, 
  correctCount, 
  studyTime, 
  onRestart, 
  onExit 
}: CompletionScreenProps) {
  const [showStats, setShowStats] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  
  const accuracy = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;
  const isExcellent = accuracy >= 80;
  const isGood = accuracy >= 60 && accuracy < 80;

  useEffect(() => {
    const statsTimer = setTimeout(() => setShowStats(true), 500);
    const buttonsTimer = setTimeout(() => setShowButtons(true), 1200);
    return () => {
      clearTimeout(statsTimer);
      clearTimeout(buttonsTimer);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-4 lg:p-8 min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background celebration effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isExcellent && [...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
            <Sparkles className={cn(
              "w-4 h-4 opacity-40",
              i % 3 === 0 ? "text-neon-gold" : i % 3 === 1 ? "text-neon-cyan" : "text-neon-purple"
            )} />
          </div>
        ))}
      </div>

      {/* Trophy animation */}
      <div className={cn(
        "relative mb-8 transition-all duration-1000",
        showStats ? "scale-100 opacity-100" : "scale-50 opacity-0"
      )}>
        <div className={cn(
          "w-32 h-32 rounded-full flex items-center justify-center relative",
          isExcellent ? "bg-gradient-to-br from-neon-gold/20 to-neon-gold/5 animate-pulse-gold" :
          isGood ? "bg-gradient-to-br from-neon-cyan/20 to-neon-cyan/5" :
          "bg-gradient-to-br from-secondary to-muted"
        )}>
          <Trophy className={cn(
            "w-16 h-16",
            isExcellent ? "text-neon-gold" :
            isGood ? "text-neon-cyan" :
            "text-muted-foreground"
          )} />
          
          {/* Glow ring */}
          {isExcellent && (
            <div className="absolute inset-0 rounded-full border-2 border-neon-gold/50 animate-ping" />
          )}
        </div>
      </div>

      {/* Title */}
      <h1 className={cn(
        "font-display text-3xl lg:text-4xl font-bold text-center mb-2 transition-all duration-700",
        showStats ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        isExcellent ? "gradient-text-gold" : "gradient-text"
      )}>
        {isExcellent ? "¡Excelente!" : isGood ? "¡Buen trabajo!" : "¡Sigue practicando!"}
      </h1>
      
      <p className={cn(
        "text-muted-foreground text-center mb-8 transition-all duration-700 delay-100",
        showStats ? "opacity-100" : "opacity-0"
      )}>
        Completaste el mazo "{deckName}"
      </p>

      {/* Stats cards */}
      <div className={cn(
        "grid grid-cols-3 gap-4 w-full max-w-md mb-10 transition-all duration-700",
        showStats ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        <div className="card-gamer rounded-2xl p-4 text-center">
          <Target className="w-6 h-6 mx-auto mb-2 text-neon-cyan" />
          <p className={cn(
            "text-2xl font-display font-bold",
            isExcellent ? "text-neon-gold" : isGood ? "text-neon-green" : "text-foreground"
          )}>
            {accuracy}%
          </p>
          <p className="text-xs text-muted-foreground">Precisión</p>
        </div>
        
        <div className="card-gamer rounded-2xl p-4 text-center">
          <Trophy className="w-6 h-6 mx-auto mb-2 text-neon-green" />
          <p className="text-2xl font-display font-bold text-neon-green">
            {correctCount}/{totalCards}
          </p>
          <p className="text-xs text-muted-foreground">Correctas</p>
        </div>
        
        <div className="card-gamer rounded-2xl p-4 text-center">
          <Clock className="w-6 h-6 mx-auto mb-2 text-neon-purple" />
          <p className="text-2xl font-display font-bold text-neon-purple">
            {formatTime(studyTime)}
          </p>
          <p className="text-xs text-muted-foreground">Tiempo</p>
        </div>
      </div>

      {/* XP Earned */}
      {isExcellent && (
        <div className={cn(
          "flex items-center gap-2 px-6 py-3 bg-neon-gold/10 rounded-full border border-neon-gold/30 mb-8 transition-all duration-700 delay-300",
          showStats ? "opacity-100 scale-100" : "opacity-0 scale-90"
        )}>
          <Sparkles className="w-5 h-5 text-neon-gold" />
          <span className="font-display font-bold text-neon-gold">+{correctCount * 10} XP</span>
        </div>
      )}

      {/* Action buttons */}
      <div className={cn(
        "flex flex-col sm:flex-row gap-4 w-full max-w-sm transition-all duration-500",
        showButtons ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        <button
          onClick={onRestart}
          className="flex-1 flex items-center justify-center gap-2 py-4 bg-secondary hover:bg-secondary/80 rounded-xl font-semibold transition-all hover:scale-105"
        >
          <RotateCcw className="w-5 h-5" />
          Repetir
        </button>
        <button
          onClick={onExit}
          className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-xl font-semibold transition-all hover:scale-105 hover:shadow-lg hover:shadow-neon-cyan/25"
        >
          Continuar
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
