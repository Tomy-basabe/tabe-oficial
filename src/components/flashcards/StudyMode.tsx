import { useState, useEffect, useCallback, useMemo } from "react";
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

type ShufflePhase = "fan-out" | "riffle" | "stack" | "ready" | "done";
type StudyPhase = "shuffling" | "picking" | "viewing" | "answered" | "animating";

export function StudyMode({ deckName, cards, studyTime, onExit, onCardResult, onComplete }: StudyModeProps) {
  // Shuffle animation
  const [shufflePhase, setShufflePhase] = useState<ShufflePhase>("fan-out");
  const [isShuffling, setIsShuffling] = useState(true);

  // Study state
  const [studyPhase, setStudyPhase] = useState<StudyPhase>("shuffling");
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);
  const [remainingIndices, setRemainingIndices] = useState<number[]>([]);
  const [completedIndices, setCompletedIndices] = useState<number[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [flyingCardIndex, setFlyingCardIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const cardCount = Math.min(cards.length, 12);

  // Spaced repetition shuffle
  useEffect(() => {
    const cardsWithPriority = cards.map(card => {
      const totalAttempts = card.veces_correcta + card.veces_incorrecta;
      let priority = 1;
      if (totalAttempts > 0) {
        const failureRate = card.veces_incorrecta / totalAttempts;
        priority = 1 + (failureRate * 3);
      } else {
        priority = 2;
      }
      priority += Math.random() * 0.5;
      return { card, priority };
    });

    const sorted = cardsWithPriority
      .sort((a, b) => b.priority - a.priority)
      .map(item => item.card);

    setShuffledCards(sorted);
    setRemainingIndices(sorted.map((_, i) => i));
  }, [cards]);

  // Shuffle animation timeline
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setShufflePhase("riffle"), 900));
    timers.push(setTimeout(() => setShufflePhase("stack"), 2300));
    timers.push(setTimeout(() => setShufflePhase("ready"), 3100));
    timers.push(setTimeout(() => {
      setShufflePhase("done");
      setIsShuffling(false);
      setStudyPhase("picking");
    }, 3600));
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // User picks a card from the spread
  const handlePickCard = useCallback((cardIdx: number) => {
    if (studyPhase !== "picking") return;
    setSelectedIndex(cardIdx);
    setIsFlipped(false);
    setStudyPhase("viewing");
  }, [studyPhase]);

  // User answers (correct or incorrect)
  const handleResult = useCallback(async (correct: boolean) => {
    if (selectedIndex === null) return;

    if (correct) {
      setCorrectCount(prev => prev + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1200);
    }

    setStudyPhase("animating");
    setFlyingCardIndex(selectedIndex);
    await onCardResult(correct);

    // After animation, move card to completed pile
    setTimeout(() => {
      setCompletedIndices(prev => [...prev, selectedIndex!]);
      setRemainingIndices(prev => prev.filter(i => i !== selectedIndex));
      setFlyingCardIndex(null);
      setSelectedIndex(null);
      setIsFlipped(false);

      // Check if all cards are done
      const newRemaining = remainingIndices.filter(i => i !== selectedIndex);
      if (newRemaining.length === 0) {
        onComplete();
      } else {
        setStudyPhase("picking");
      }
    }, 700);
  }, [selectedIndex, onCardResult, onComplete, remainingIndices]);

  // Go back to picking (deselect card)
  const handleBackToPicking = useCallback(() => {
    setSelectedIndex(null);
    setIsFlipped(false);
    setStudyPhase("picking");
  }, []);

  const totalCards = shuffledCards.length;
  const answeredCount = completedIndices.length;
  const progress = totalCards > 0 ? (answeredCount / totalCards) * 100 : 0;
  const selectedCard = selectedIndex !== null ? shuffledCards[selectedIndex] : null;

  // Shuffle animation card styles
  const getShuffleCardStyle = (i: number): React.CSSProperties => {
    const total = cardCount;
    const mid = (total - 1) / 2;

    switch (shufflePhase) {
      case "fan-out": {
        const angle = (i - mid) * 12;
        const yOffset = Math.abs(i - mid) * 8;
        return {
          transform: `rotate(${angle}deg) translateY(${-yOffset}px)`,
          transformOrigin: "center 200%",
          transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transitionDelay: `${i * 40}ms`,
          zIndex: i,
        };
      }
      case "riffle": {
        const isLeft = i % 2 === 0;
        const halfIndex = Math.floor(i / 2);
        const yPos = halfIndex * -3;
        return {
          transform: `translateX(${isLeft ? -80 : 80}px) translateY(${yPos}px) rotate(${isLeft ? -3 : 3}deg)`,
          transition: "all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          transitionDelay: `${i * 50}ms`,
          zIndex: total - i,
        };
      }
      case "stack": {
        return {
          transform: `translateX(0) translateY(${-i * 2}px) rotate(0deg)`,
          transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transitionDelay: `${(total - i) * 30}ms`,
          zIndex: total - i,
        };
      }
      case "ready": {
        return {
          transform: `translateY(${-i * 2}px) scale(${1 + (total - i) * 0.003})`,
          transition: "all 0.4s ease-out",
          zIndex: total - i,
        };
      }
      default:
        return { zIndex: i };
    }
  };

  const phaseText = useMemo(() => {
    switch (shufflePhase) {
      case "fan-out": return "Extendiendo las cartas...";
      case "riffle": return "Mezclando el mazo...";
      case "stack": return "Apilando las cartas...";
      case "ready": return "¡Listo para estudiar!";
      default: return "";
    }
  }, [shufflePhase]);

  // ─────────── SHUFFLE ANIMATION SCREEN ───────────
  if (isShuffling) {
    return (
      <div className="p-4 lg:p-8 min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                background: i % 3 === 0 ? 'hsl(186 100% 50%)' : i % 3 === 1 ? 'hsl(270 100% 65%)' : 'hsl(45 100% 55%)',
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                opacity: 0.4,
                animation: `float ${2 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        <h2 className="font-display text-lg lg:text-xl font-bold gradient-text mb-10 relative z-10">
          {deckName}
        </h2>

        <div className="relative w-52 h-72 lg:w-60 lg:h-80 mb-10">
          {[...Array(cardCount)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute inset-0 rounded-2xl overflow-hidden",
                shufflePhase === "ready" && "shuffle-card-glow"
              )}
              style={getShuffleCardStyle(i)}
            >
              <div
                className="w-full h-full rounded-2xl border-2 flex items-center justify-center relative"
                style={{
                  background: 'linear-gradient(135deg, hsl(222 47% 10%) 0%, hsl(222 47% 6%) 100%)',
                  borderColor: shufflePhase === "ready"
                    ? 'hsl(186 100% 50% / 0.6)'
                    : 'hsl(222 30% 18% / 0.8)',
                  boxShadow: shufflePhase === "ready"
                    ? '0 0 20px hsl(186 100% 50% / 0.2)'
                    : '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                <div className="absolute inset-2 rounded-xl border border-neon-cyan/10 flex items-center justify-center">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 lg:w-7 lg:h-7 text-neon-cyan/40" />
                  </div>
                </div>
                <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-neon-cyan/20 rounded-tl" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-neon-cyan/20 rounded-tr" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-neon-cyan/20 rounded-bl" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-neon-cyan/20 rounded-br" />
              </div>
            </div>
          ))}

          {shufflePhase === "ready" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-32 h-32 rounded-full bg-neon-cyan/10 animate-ping" />
              <div className="absolute w-20 h-20 rounded-full bg-neon-purple/15 animate-pulse" />
            </div>
          )}
        </div>

        <p className={cn(
          "font-display text-lg lg:text-xl transition-all duration-500 relative z-10",
          shufflePhase === "ready" ? "text-neon-gold text-glow-gold" : "text-neon-cyan"
        )}>
          {phaseText}
        </p>

        <p className="text-muted-foreground mt-3 text-sm relative z-10">
          {cards.length} tarjetas · Las más difíciles primero
        </p>

        <div className="flex gap-2 mt-6 relative z-10">
          {(["fan-out", "riffle", "stack", "ready"] as ShufflePhase[]).map((phase, i) => (
            <div
              key={phase}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                shufflePhase === phase
                  ? "bg-neon-cyan w-6 shadow-[0_0_8px_hsl(186_100%_50%/0.6)]"
                  : (["fan-out", "riffle", "stack", "ready"].indexOf(shufflePhase) > i
                    ? "bg-neon-cyan/50"
                    : "bg-secondary")
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  // ─────────── MAIN STUDY SCREEN ───────────
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
      <div className="flex items-center justify-between mb-4">
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
      <div className="flex items-center justify-between mb-3 text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-neon-green">
            <Check className="w-4 h-4" />
            <span className="font-bold">{correctCount}</span>
          </span>
          <span className="flex items-center gap-1.5 text-neon-red">
            <X className="w-4 h-4" />
            <span className="font-bold">{answeredCount - correctCount}</span>
          </span>
        </div>
        <span className="text-muted-foreground font-medium">
          {answeredCount} / {totalCards}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-secondary rounded-full mb-6 overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-cyan transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
        />
      </div>

      {/* ── PICKING MODE: Show spread of remaining cards ── */}
      {studyPhase === "picking" && (
        <div className="flex flex-col items-center animate-fade-in">
          <p className="text-muted-foreground text-sm mb-6">
            Elegí una carta para estudiar
          </p>

          {/* Card spread */}
          <div className="relative flex justify-center items-end min-h-[280px] lg:min-h-[340px] w-full max-w-3xl mx-auto mb-6">
            {remainingIndices.map((cardIdx, posIdx) => {
              const totalRemaining = remainingIndices.length;
              const mid = (totalRemaining - 1) / 2;
              const offset = posIdx - mid;
              const angle = offset * (totalRemaining <= 5 ? 8 : totalRemaining <= 10 ? 5 : 3);
              const yOffset = Math.abs(offset) * (totalRemaining <= 5 ? 12 : 6);
              const xOffset = offset * (totalRemaining <= 5 ? 60 : totalRemaining <= 10 ? 40 : 28);
              const isHovered = hoveredIndex === cardIdx;

              return (
                <div
                  key={cardIdx}
                  className="absolute cursor-pointer"
                  style={{
                    transform: `translateX(${xOffset}px) translateY(${yOffset}px) rotate(${angle}deg) ${isHovered ? 'translateY(-30px) scale(1.08)' : ''}`,
                    transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    zIndex: isHovered ? 100 : posIdx,
                    bottom: 0,
                  }}
                  onClick={() => handlePickCard(cardIdx)}
                  onMouseEnter={() => setHoveredIndex(cardIdx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div
                    className={cn(
                      "w-32 h-44 lg:w-40 lg:h-56 rounded-2xl border-2 relative overflow-hidden",
                      isHovered ? "shadow-[0_0_30px_hsl(186_100%_50%/0.3)]" : "shadow-lg"
                    )}
                    style={{
                      background: 'linear-gradient(135deg, hsl(222 47% 10%) 0%, hsl(222 47% 6%) 100%)',
                      borderColor: isHovered
                        ? 'hsl(186 100% 50% / 0.7)'
                        : 'hsl(222 30% 18% / 0.8)',
                    }}
                  >
                    {/* Card back design */}
                    <div className="absolute inset-2 rounded-xl border border-neon-cyan/10 flex items-center justify-center">
                      <div className={cn(
                        "w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center transition-all duration-300",
                        isHovered && "from-neon-cyan/40 to-neon-purple/40 scale-110"
                      )}>
                        <Zap className={cn(
                          "w-5 h-5 lg:w-6 lg:h-6 transition-colors duration-300",
                          isHovered ? "text-neon-cyan" : "text-neon-cyan/40"
                        )} />
                      </div>
                    </div>

                    {/* Corner decorations */}
                    <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-neon-cyan/20 rounded-tl" />
                    <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-neon-cyan/20 rounded-tr" />
                    <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-neon-cyan/20 rounded-bl" />
                    <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-neon-cyan/20 rounded-br" />

                    {/* Hover shine */}
                    {isHovered && (
                      <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-transparent to-neon-purple/5 pointer-events-none" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completed pile */}
          {completedIndices.length > 0 && (
            <div className="flex items-center gap-3 mt-4">
              <div className="relative w-20 h-28">
                {completedIndices.slice(-6).map((_, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 rounded-xl border"
                    style={{
                      transform: `translateY(${-i * 2}px) rotate(${(i % 3 - 1) * 2}deg)`,
                      opacity: 1 - i * 0.08,
                      background: i === 0
                        ? 'linear-gradient(135deg, hsl(142 76% 50% / 0.15), hsl(186 100% 50% / 0.1))'
                        : 'linear-gradient(135deg, hsl(222 47% 10%), hsl(222 47% 6%))',
                      borderColor: i === 0 ? 'hsl(142 76% 50% / 0.4)' : 'hsl(222 30% 18% / 0.5)',
                    }}
                  />
                ))}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <span className="text-neon-green font-display text-sm font-bold">
                    ✓ {completedIndices.length}
                  </span>
                </div>
              </div>
              <span className="text-muted-foreground text-xs">
                Respondidas
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── VIEWING MODE: Selected card shown large ── */}
      {(studyPhase === "viewing" || studyPhase === "answered" || studyPhase === "animating") && selectedCard && (
        <div className={cn(
          "flex flex-col items-center transition-all duration-700",
          studyPhase === "animating"
            ? "opacity-0 scale-75 translate-y-20"
            : "opacity-100 scale-100"
        )}>
          {/* Back button */}
          {studyPhase === "viewing" && !isFlipped && (
            <button
              onClick={handleBackToPicking}
              className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Elegir otra carta
            </button>
          )}

          {/* The selected card large */}
          <div className="w-full max-w-xl">
            <div
              onClick={() => studyPhase === "viewing" && !isFlipped && setIsFlipped(true)}
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
                {/* Front - Question */}
                <div
                  className="absolute inset-0 rounded-3xl p-8 flex flex-col items-center justify-center text-center overflow-hidden"
                  style={{
                    backfaceVisibility: "hidden",
                    background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(222 47% 10%) 100%)",
                    border: "2px solid hsl(var(--border))",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px -12px hsl(186 100% 50% / 0.15)"
                  }}
                >
                  {/* Difficulty indicator */}
                  {(() => {
                    const total = selectedCard.veces_correcta + selectedCard.veces_incorrecta;
                    if (total === 0) return null;
                    const failureRate = selectedCard.veces_incorrecta / total;
                    const isHard = failureRate > 0.5;
                    const isMedium = failureRate > 0.25 && failureRate <= 0.5;
                    return (
                      <div className={cn(
                        "absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        isHard ? "bg-neon-red/20 text-neon-red" :
                          isMedium ? "bg-neon-gold/20 text-neon-gold" :
                            "bg-neon-green/20 text-neon-green"
                      )}>
                        {isHard ? "Difícil" : isMedium ? "Media" : "Fácil"}
                      </div>
                    );
                  })()}

                  {/* Decorative corners */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-neon-cyan/40 rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-neon-cyan/40 rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-neon-cyan/40 rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-neon-cyan/40 rounded-br-lg" />

                  <Zap className="w-8 h-8 text-neon-cyan/50 mb-6" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Pregunta</p>
                  <p className="text-xl lg:text-2xl font-medium leading-relaxed">
                    {selectedCard.pregunta}
                  </p>

                  {/* Stats */}
                  {(selectedCard.veces_correcta > 0 || selectedCard.veces_incorrecta > 0) && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-neon-green/70">
                        <Check className="w-3 h-3" />{selectedCard.veces_correcta}
                      </span>
                      <span className="flex items-center gap-1 text-neon-red/70">
                        <X className="w-3 h-3" />{selectedCard.veces_incorrecta}
                      </span>
                    </div>
                  )}
                </div>

                {/* Back - Answer */}
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
                  <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-transparent to-neon-purple/5 animate-pulse" />
                  <Trophy className="w-8 h-8 text-neon-gold/70 mb-6" />
                  <p className="text-xs text-neon-cyan uppercase tracking-wider mb-4">Respuesta</p>
                  <p className="text-xl lg:text-2xl font-semibold leading-relaxed text-neon-cyan relative z-10">
                    {selectedCard.respuesta}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col items-center gap-4 mt-8">
            {!isFlipped ? (
              <div className="text-center animate-fade-in">
                <p className="text-muted-foreground text-sm mb-3">
                  Pensá en tu respuesta y volteá la carta
                </p>
                <button
                  onClick={() => setIsFlipped(true)}
                  className="px-8 py-4 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-2xl font-semibold hover:shadow-lg hover:shadow-neon-cyan/25 transition-all hover:scale-105"
                >
                  Mostrar Respuesta
                </button>
              </div>
            ) : studyPhase !== "animating" ? (
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
              <div className="h-20" />
            )}
          </div>

          {/* Remaining cards mini-preview + completed pile */}
          <div className="flex items-center justify-center gap-12 mt-8">
            {/* Remaining mini pile */}
            {remainingIndices.length > 1 && (
              <div className="flex flex-col items-center gap-1">
                <div className="relative w-16 h-22">
                  {[...Array(Math.min(remainingIndices.length - 1, 4))].map((_, i) => (
                    <div
                      key={i}
                      className="absolute inset-0 w-16 h-22 rounded-lg border"
                      style={{
                        transform: `translateY(${-i * 2}px) rotate(${(i % 3 - 1) * 2}deg)`,
                        background: 'linear-gradient(135deg, hsl(222 47% 10%), hsl(222 47% 6%))',
                        borderColor: 'hsl(222 30% 18% / 0.5)',
                        opacity: 1 - i * 0.15,
                      }}
                    />
                  ))}
                </div>
                <span className="text-muted-foreground text-xs mt-1">
                  {remainingIndices.length - 1} restantes
                </span>
              </div>
            )}

            {/* Completed pile */}
            {completedIndices.length > 0 && (
              <div className="flex flex-col items-center gap-1">
                <div className="relative w-16 h-22">
                  {completedIndices.slice(-4).map((_, i) => (
                    <div
                      key={i}
                      className="absolute inset-0 w-16 h-22 rounded-lg border"
                      style={{
                        transform: `translateY(${-i * 2}px) rotate(${(i % 3 - 1) * -2}deg)`,
                        background: i === 0
                          ? 'linear-gradient(135deg, hsl(142 76% 50% / 0.15), hsl(186 100% 50% / 0.1))'
                          : 'linear-gradient(135deg, hsl(222 47% 10%), hsl(222 47% 6%))',
                        borderColor: i === 0 ? 'hsl(142 76% 50% / 0.4)' : 'hsl(222 30% 18% / 0.5)',
                        opacity: 1 - i * 0.15,
                      }}
                    />
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <span className="text-neon-green font-display text-xs font-bold">
                      ✓ {completedIndices.length}
                    </span>
                  </div>
                </div>
                <span className="text-muted-foreground text-xs mt-1">
                  Respondidas
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
