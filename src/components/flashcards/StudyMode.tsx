import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Clock, Check, X, Sparkles, Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Flashcard {
  id: string;
  pregunta: string;
  respuesta: string;
  veces_correcta: number;
  veces_incorrecta: number;
}

interface StudyModeProps {
  deckName: string;
  cards: Flashcard[];
  studyTime: number;
  onExit: () => void;
  onCardResult: (correct: boolean) => Promise<void>;
  onComplete: () => void;
}

export function StudyMode({ deckName, cards, studyTime, onExit, onCardResult, onComplete }: StudyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffling, setIsShuffling] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Shuffle cards on mount with animation
  useEffect(() => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    
    // Shuffle animation duration
    const timer = setTimeout(() => {
      setShuffledCards(shuffled);
      setIsShuffling(false);
      // Draw first card
      setTimeout(() => setIsDrawing(true), 300);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [cards]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleResult = useCallback(async (correct: boolean) => {
    if (correct) {
      setCorrectCount(prev => prev + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1000);
    }
    
    setIsExiting(true);
    await onCardResult(correct);
    
    setTimeout(() => {
      setIsFlipped(false);
      setIsExiting(false);
      
      if (currentIndex < shuffledCards.length - 1) {
        setIsDrawing(false);
        setCurrentIndex(prev => prev + 1);
        setTimeout(() => setIsDrawing(true), 200);
      } else {
        onComplete();
      }
    }, 400);
  }, [currentIndex, shuffledCards.length, onCardResult, onComplete]);

  const progress = shuffledCards.length > 0 ? ((currentIndex + 1) / shuffledCards.length) * 100 : 0;
  const currentCard = shuffledCards[currentIndex];

  // Shuffle Animation
  if (isShuffling) {
    return (
      <div className="p-4 lg:p-8 min-h-screen flex flex-col items-center justify-center">
        <div className="relative w-48 h-64">
          {/* Shuffling cards animation */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 card-gamer rounded-2xl border-2 border-neon-cyan/30"
              style={{
                animation: `shuffle-card 1.5s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
                transformOrigin: 'center bottom',
              }}
            />
          ))}
          
          {/* Center glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-neon-cyan/20 animate-ping" />
          </div>
        </div>
        
        <p className="mt-8 font-display text-xl text-neon-cyan animate-pulse">
          Mezclando cartas...
        </p>
        <p className="text-muted-foreground mt-2">{cards.length} tarjetas en el mazo</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 min-h-screen relative overflow-hidden">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${10 + Math.random() * 80}%`,
                animationDelay: `${Math.random() * 0.3}s`,
              }}
            >
              <Sparkles className={cn(
                "w-4 h-4",
                i % 3 === 0 ? "text-neon-gold" : i % 3 === 1 ? "text-neon-cyan" : "text-neon-green"
              )} />
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline">Salir</span>
        </button>
        
        <h2 className="font-display text-lg font-bold gradient-text truncate max-w-[200px]">
          {deckName}
        </h2>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary/80 backdrop-blur rounded-xl border border-border/50">
            <Clock className="w-4 h-4 text-neon-cyan" />
            <span className="font-mono font-bold text-neon-cyan">{formatTime(studyTime)}</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-neon-green">
            <Check className="w-4 h-4" />
            <span className="font-bold">{correctCount}</span>
          </span>
          <span className="flex items-center gap-1.5 text-neon-red">
            <X className="w-4 h-4" />
            <span className="font-bold">{currentIndex - correctCount}</span>
          </span>
        </div>
        <span className="text-muted-foreground font-medium">
          {currentIndex + 1} / {shuffledCards.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-secondary rounded-full mb-8 overflow-hidden relative">
        <div 
          className="h-full bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-cyan transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div 
          className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
        />
      </div>

      {/* Card Area */}
      <div className="flex justify-center items-center min-h-[400px] lg:min-h-[500px] relative">
        {/* Remaining deck stack */}
        <div className="absolute left-4 lg:left-1/4 top-1/2 -translate-y-1/2 hidden sm:block">
          <div className="relative w-28 h-40">
            {[...Array(Math.min(shuffledCards.length - currentIndex - 1, 6))].map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 card-gamer rounded-xl border border-border/50"
                style={{
                  transform: `translateY(${-i * 2}px) rotate(${(i - 2) * 1}deg)`,
                  opacity: 1 - i * 0.1,
                }}
              />
            ))}
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-display text-sm">
              {shuffledCards.length - currentIndex - 1}
            </div>
          </div>
        </div>

        {/* Active Card */}
        {currentCard && (
          <div
            className={cn(
              "w-full max-w-xl transition-all duration-500",
              isDrawing ? "opacity-100 translate-x-0 scale-100" : "opacity-0 -translate-x-20 scale-95",
              isExiting && "opacity-0 translate-x-20 scale-95"
            )}
          >
            <div
              onClick={() => !isExiting && setIsFlipped(!isFlipped)}
              className="relative aspect-[4/3] cursor-pointer"
              style={{ perspective: "1500px" }}
            >
              <div
                className={cn(
                  "absolute inset-0 transition-transform duration-700 ease-out",
                  isFlipped && "[transform:rotateY(180deg)]"
                )}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Front of card */}
                <div
                  className="absolute inset-0 rounded-3xl p-8 flex flex-col items-center justify-center text-center overflow-hidden"
                  style={{ 
                    backfaceVisibility: "hidden",
                    background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(222 47% 10%) 100%)",
                    border: "2px solid hsl(var(--border))",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px -12px hsl(186 100% 50% / 0.15)"
                  }}
                >
                  {/* Decorative corners */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-neon-cyan/40 rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-neon-cyan/40 rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-neon-cyan/40 rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-neon-cyan/40 rounded-br-lg" />
                  
                  <Zap className="w-8 h-8 text-neon-cyan/50 mb-6" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Pregunta</p>
                  <p className="text-xl lg:text-2xl font-medium leading-relaxed">
                    {currentCard.pregunta}
                  </p>
                  <p className="text-xs text-muted-foreground mt-8 flex items-center gap-2">
                    <span className="w-6 h-0.5 bg-muted-foreground/30" />
                    Toca para revelar
                    <span className="w-6 h-0.5 bg-muted-foreground/30" />
                  </p>
                </div>

                {/* Back of card */}
                <div
                  className="absolute inset-0 rounded-3xl p-8 flex flex-col items-center justify-center text-center overflow-hidden"
                  style={{ 
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: "linear-gradient(135deg, hsl(186 100% 50% / 0.1) 0%, hsl(270 100% 65% / 0.1) 100%)",
                    border: "2px solid hsl(186 100% 50% / 0.4)",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px -12px hsl(186 100% 50% / 0.3)"
                  }}
                >
                  {/* Animated glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-transparent to-neon-purple/5 animate-pulse" />
                  
                  <Trophy className="w-8 h-8 text-neon-gold/70 mb-6" />
                  <p className="text-xs text-neon-cyan uppercase tracking-wider mb-4">Respuesta</p>
                  <p className="text-xl lg:text-2xl font-semibold leading-relaxed text-neon-cyan relative z-10">
                    {currentCard.respuesta}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Completed cards pile */}
        <div className="absolute right-4 lg:right-1/4 top-1/2 -translate-y-1/2 hidden sm:block">
          <div className="relative w-28 h-40">
            {[...Array(Math.min(currentIndex, 6))].map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-xl border"
                style={{
                  transform: `translateY(${-i * 2}px) rotate(${(i - 2) * -1}deg)`,
                  opacity: 1 - i * 0.1,
                  background: i === 0 
                    ? 'linear-gradient(135deg, hsl(142 76% 50% / 0.2), hsl(186 100% 50% / 0.1))' 
                    : 'hsl(var(--card))',
                  borderColor: i === 0 ? 'hsl(142 76% 50% / 0.3)' : 'hsl(var(--border) / 0.5)',
                }}
              />
            ))}
            {currentIndex > 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-neon-green font-display text-sm">
                ✓ {currentIndex}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons - Always visible but different states */}
      <div className="flex flex-col items-center gap-4 mt-8">
        {!isFlipped ? (
          <div className="text-center animate-fade-in">
            <p className="text-muted-foreground text-sm mb-3">
              Piensa en tu respuesta y luego voltea la carta
            </p>
            <button
              onClick={() => setIsFlipped(true)}
              className="px-8 py-4 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-2xl font-semibold hover:shadow-lg hover:shadow-neon-cyan/25 transition-all hover:scale-105"
            >
              Mostrar Respuesta
            </button>
          </div>
        ) : !isExiting ? (
          <div className="animate-fade-in">
            <p className="text-center text-muted-foreground text-sm mb-4">
              ¿Acertaste tu respuesta?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleResult(false)}
                className="flex items-center gap-3 px-8 py-4 bg-neon-red/10 text-neon-red rounded-2xl hover:bg-neon-red/20 transition-all hover:scale-105 border border-neon-red/30 font-semibold group"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                No la sabía
              </button>
              <button
                onClick={() => handleResult(true)}
                className="flex items-center gap-3 px-8 py-4 bg-neon-green/10 text-neon-green rounded-2xl hover:bg-neon-green/20 transition-all hover:scale-105 border border-neon-green/30 font-semibold group"
              >
                <Check className="w-5 h-5 group-hover:scale-125 transition-transform" />
                ¡La sabía!
              </button>
            </div>
          </div>
        ) : (
          <div className="h-20" /> // Placeholder while transitioning
        )}
      </div>
    </div>
  );
}
