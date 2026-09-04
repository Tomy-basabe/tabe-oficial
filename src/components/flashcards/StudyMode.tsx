import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, Clock, Check, X, Sparkles, Zap, Trophy, Volume2, Square } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { cn } from "@/lib/utils";

interface Flashcard {
  id: string;
  pregunta: string;
  respuesta: string;
  veces_correcta: number;
  veces_incorrecta: number;
  veces_parcial: number;
}

interface StudyModeProps {
  deckName: string;
  cards: Flashcard[];
  studyTime: number;
  onExit: () => void;
  onCardResult: (cardId: string, status: 'correct' | 'partial' | 'incorrect') => Promise<void>;
  onComplete: () => void;
}

type ShufflePhase = "fan-out" | "riffle" | "stack" | "ready" | "done";
type StudyPhase = "shuffling" | "picking" | "viewing" | "answered" | "animating";

export function StudyMode({ deckName, cards, studyTime, onExit, onCardResult, onComplete }: StudyModeProps) {
  // Shuffle animation
  const [shufflePhase, setShufflePhase] = useState<ShufflePhase>("fan-out");
  const [isShuffling, setIsShuffling] = useState(true);

  // Study state
  const { speak, stop, isSpeaking } = useTextToSpeech();
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
  const handleResult = useCallback(async (status: 'correct' | 'partial' | 'incorrect') => {
    if (selectedIndex === null) return;

    if (status === 'correct') {
      setCorrectCount(prev => prev + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1200);
    } else if (status === 'partial') {
      // Maybe some subtle animation for partial?
    }

    setStudyPhase("animating");
    setFlyingCardIndex(selectedIndex);
    await onCardResult(shuffledCards[selectedIndex].id, status);

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
        const yOffset = Math.pow(Math.abs(i - mid), 2) * 3;
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
      <div className="p-4 lg:p-8 min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background">
        <h2 className="font-black text-2xl lg:text-3xl uppercase tracking-tight text-foreground bg-[#00ffcc] px-6 py-2 border-[4px] border-foreground shadow-[6px_6px_0_0_#000] rounded-xl mb-12 relative z-10 text-center">
          {deckName}
        </h2>

        <div className="relative w-40 h-56 lg:w-48 lg:h-64 mb-12">
          {[...Array(cardCount)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute inset-0 rounded-2xl overflow-hidden",
                shufflePhase === "ready" && ""
              )}
              style={getShuffleCardStyle(i)}
            >
              <div
                className="w-full h-full rounded-2xl border-[3px] border-foreground flex items-center justify-center relative bg-background"
                style={{
                  boxShadow: shufflePhase === "ready" ? '4px 4px 0 0 #000' : 'none',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" className="w-16 h-20">
                    <path d="M 5 15 H 95 V 40 H 65 V 110 L 50 95 L 35 110 V 40 H 5 Z" fill="#18181b" stroke="#18181b" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="absolute bottom-3 right-3 text-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/>
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className={cn(
          "font-black text-xl lg:text-2xl uppercase tracking-widest transition-all duration-500 relative z-10 px-6 py-2 rounded-xl border-[3px] border-foreground",
          shufflePhase === "ready" ? "bg-[#ffd21c] text-black shadow-[4px_4px_0_0_#000]" : "bg-background text-foreground"
        )}>
          {phaseText}
        </p>

        <p className="font-black text-xs uppercase tracking-widest text-muted-foreground mt-6 relative z-10">
          {cards.length} TARJETAS · LAS MÁS DIFÍCILES PRIMERO
        </p>

        <div className="flex gap-3 mt-8 relative z-10">
          {(["fan-out", "riffle", "stack", "ready"] as ShufflePhase[]).map((phase, i) => (
            <div
              key={phase}
              className={cn(
                "w-3 h-3 rounded-none border-[2px] border-foreground transition-all duration-300",
                shufflePhase === phase
                  ? "bg-[#00ffcc] w-8 shadow-[2px_2px_0_0_#000]"
                  : (["fan-out", "riffle", "stack", "ready"].indexOf(shufflePhase) > i
                    ? "bg-[#00ffcc]"
                    : "bg-muted")
              )}
            />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="p-4 lg:p-8 min-h-screen relative overflow-hidden">
      {/* Confetti effect (optional, keep it simple for neo-brutalism) */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti w-3 h-3 border-[2px] border-foreground shadow-[2px_2px_0_0_#000]"
              style={{
                left: `${10 + Math.random() * 80}%`,
                animationDelay: `${Math.random() * 0.3}s`,
                background: i % 3 === 0 ? '#ffd21c' : i % 3 === 1 ? '#00ffcc' : '#ef4444'
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 z-10 relative">
        <div className="flex items-center gap-4">
          <button
            onClick={onExit}
            className="flex items-center justify-center w-10 h-10 bg-background text-foreground border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] hover:bg-muted transition-all active:translate-y-1 active:shadow-none"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="font-black text-2xl uppercase tracking-tight text-foreground bg-[#00ffcc] px-4 py-1 border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl truncate max-w-[200px] sm:max-w-xs">
            {deckName}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000]">
            <Clock className="w-5 h-5 text-foreground" />
            <span className="font-black text-lg text-foreground uppercase tracking-widest">{formatTime(studyTime)}</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4 z-10 relative">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 bg-[#00ffcc] text-black px-3 py-1 rounded-lg border-[2px] border-foreground shadow-[2px_2px_0_0_#000]">
            <Check className="w-5 h-5" />
            <span className="font-black text-sm">{correctCount}</span>
          </span>
          <span className="flex items-center gap-2 bg-[#ef4444] text-white px-3 py-1 rounded-lg border-[2px] border-foreground shadow-[2px_2px_0_0_#000]">
            <X className="w-5 h-5" />
            <span className="font-black text-sm">{answeredCount - correctCount}</span>
          </span>
        </div>
        <span className="text-foreground font-black text-sm px-3 py-1 bg-[#ffd21c] border-[2px] border-foreground shadow-[2px_2px_0_0_#000] rounded-lg">
          {answeredCount} / {totalCards}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-4 bg-background rounded-full mb-8 overflow-hidden relative border-[3px] border-foreground shadow-[4px_4px_0_0_#000] z-10">
        <div
          className="h-full bg-[#ffd21c] transition-all duration-700 ease-out border-r-[3px] border-foreground"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── UNIFIED MODE: Spread & Active Card ── */}
      {(studyPhase === "picking" || studyPhase === "viewing" || studyPhase === "answered" || studyPhase === "animating") && (
        <>
          {/* Backdrop when a card is active */}
          <div 
            className={cn(
              "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity duration-500",
              (studyPhase === "viewing" || studyPhase === "animating") ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            onClick={studyPhase === "viewing" && !isFlipped ? handleBackToPicking : undefined}
          />

          <div className="flex flex-col items-center animate-fade-in relative z-50">
            {studyPhase === "picking" && (
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6">
                ELEGÍ UNA CARTA PARA ESTUDIAR
              </p>
            )}

            {/* Card spread (The Deck) */}
            <div className="relative flex justify-center items-end h-[350px] w-full max-w-3xl mx-auto mb-6">
              {remainingIndices.map((cardIdx, posIdx) => {
                const totalRemaining = remainingIndices.length;
                const mid = (totalRemaining - 1) / 2;
                const offset = posIdx - mid;
                const baseAngle = offset * (totalRemaining <= 5 ? 12 : totalRemaining <= 10 ? 8 : 5);
                const baseYOffset = Math.pow(Math.abs(offset), 2) * (totalRemaining <= 5 ? 4 : totalRemaining <= 10 ? 2 : 1);
                const baseXOffset = offset * (totalRemaining <= 5 ? 50 : totalRemaining <= 10 ? 35 : 25);
                const isHovered = hoveredIndex === cardIdx;
                const isActive = selectedIndex === cardIdx;
                const isAnimatingOut = studyPhase === "animating" && flyingCardIndex === cardIdx;

                const cardInfo = shuffledCards[cardIdx];

                // Calculate transforms
                let transformStr = `translateX(${baseXOffset}px) translateY(${baseYOffset}px) rotate(${baseAngle}deg) scale(0.5)`;
                let zIndexVal = isHovered ? 30 : posIdx;

                if (isActive) {
                  // Active state: Big and moved up
                  transformStr = `translate(0px, -50px) rotate(0deg) scale(1)`;
                  zIndexVal = 50;
                } else if (isAnimatingOut) {
                  // Fly out animation
                  transformStr = `translate(0px, 300px) rotate(${baseAngle}deg) scale(0.2)`;
                  zIndexVal = 50;
                } else if (isHovered && studyPhase === "picking") {
                  transformStr = `translateX(${baseXOffset}px) translateY(${baseYOffset - 40}px) rotate(${baseAngle}deg) scale(0.55)`;
                }

                return (
                  <div
                    key={cardIdx}
                    className="absolute cursor-pointer"
                    style={{
                      transform: transformStr,
                      transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease",
                      zIndex: zIndexVal,
                      bottom: 40,
                      opacity: (studyPhase === "viewing" && !isActive) ? 0 : 1,
                      pointerEvents: (studyPhase === "viewing" && !isActive) ? 'none' : 'auto',
                      perspective: "1200px"
                    }}
                    onClick={() => {
                      if (studyPhase === "picking") handlePickCard(cardIdx);
                      else if (isActive && studyPhase === "viewing") setIsFlipped(!isFlipped);
                    }}
                    onMouseEnter={() => setHoveredIndex(cardIdx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Inner wrapper for 3D flip */}
                    <div 
                      className="relative w-64 h-[22rem] lg:w-80 lg:h-[28rem]"
                      style={{
                        transformStyle: "preserve-3d",
                        transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        transform: isActive 
                          ? (isFlipped ? "rotateY(180deg)" : "rotate(0deg)") 
                          : "rotate(0deg)"
                      }}
                    >
                      {/* FRONT FACE (Back of card design when picking, Question when active) */}
                      <div
                        className={cn(
                          "absolute inset-0 rounded-3xl border-[4px] border-foreground overflow-hidden bg-background",
                          isActive ? (isFlipped ? "shadow-[-8px_8px_0_0_#000]" : "shadow-[8px_8px_0_0_#000]") : "shadow-[6px_6px_0_0_#000]"
                        )}
                        style={{
                          backfaceVisibility: "hidden",
                          transition: "box-shadow 0.4s ease",
                          outline: "1px solid transparent"
                        }}
                      >
                        {!isActive ? (
                          // Design when picking (Card back design)
                          <div className="absolute inset-0 flex items-center justify-center bg-background">
                            <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" className="w-24 h-32 lg:w-32 lg:h-40">
                              <path d="M 5 15 H 95 V 40 H 65 V 110 L 50 95 L 35 110 V 40 H 5 Z" fill="#18181b" stroke="#18181b" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>
                            </svg>
                            <div className="absolute bottom-6 right-6 lg:bottom-8 lg:right-8 text-foreground">
                              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/>
                              </svg>
                            </div>
                          </div>
                        ) : (
                          // Question side when active
                          <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6 lg:p-10 bg-background overflow-y-auto">
                            <p className="text-xs lg:text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">PREGUNTA</p>
                            <h3 className="text-lg lg:text-xl font-semibold text-foreground leading-relaxed">
                              {cardInfo.pregunta}
                            </h3>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 absolute bottom-6">CLICK PARA GIRAR</span>
                          </div>
                        )}
                      </div>

                      {/* BACK FACE (Answer) */}
                      <div
                        className={cn(
                          "absolute inset-0 rounded-3xl border-[4px] border-foreground overflow-hidden bg-[#ffd21c]",
                          isActive ? "shadow-[-8px_8px_0_0_#000]" : ""
                        )}
                        style={{
                          backfaceVisibility: "hidden",
                          transform: "rotateY(180deg)",
                          transition: "box-shadow 0.4s ease",
                          outline: "1px solid transparent"
                        }}
                      >
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 lg:p-10 text-center overflow-y-auto">
                          <p className="text-xs lg:text-sm font-bold uppercase tracking-widest text-black/70 mb-4">RESPUESTA</p>
                          <h3 className="text-lg lg:text-xl font-medium text-black leading-relaxed">
                            {cardInfo.respuesta}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Actions when card is active and flipped */}
          <div className="absolute top-[80%] left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-4 w-full max-w-sm">
            {studyPhase === "viewing" && isFlipped && (
              <div className="animate-fade-in w-full text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-background mb-4">
                  ¿ACERTASTE TU RESPUESTA?
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleResult('incorrect'); }}
                    className="flex-1 py-4 bg-[#ef4444] text-white rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] font-black uppercase tracking-widest text-[10px] hover:-translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-2 group"
                  >
                    <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                    NO LA SABÍA
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleResult('partial'); }}
                    className="flex-1 py-4 bg-[#ffd21c] text-black rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] font-black uppercase tracking-widest text-[10px] hover:-translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-2 group"
                  >
                    <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    A MEDIAS
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleResult('correct'); }}
                    className="flex-1 py-4 bg-[#00ffcc] text-black rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] font-black uppercase tracking-widest text-[10px] hover:-translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-2 group"
                  >
                    <Check className="w-4 h-4 group-hover:scale-125 transition-transform" />
                    ¡LA SABÍA!
                  </button>
                </div>
              </div>
            )}
          </div>


          <div className="flex items-center justify-center gap-12 mt-8 z-10 relative">
            {/* Completed pile */}
            {completedIndices.length > 0 && (
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-20 h-28">
                  {completedIndices.slice(-4).map((_, i) => (
                    <div
                      key={i}
                      className="absolute inset-0 rounded-xl border-[3px] border-foreground"
                      style={{
                        transform: `translateY(${-i * 2}px) rotate(${(i % 3 - 1) * -2}deg)`,
                        background: i === 0 ? '#00ffcc' : 'hsl(var(--background))',
                        boxShadow: i === 0 ? '4px 4px 0 0 #000' : 'none',
                        opacity: 1 - i * 0.15,
                      }}
                    />
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <span className="text-black font-black text-xs uppercase tracking-widest">
                      ✓ {completedIndices.length}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2">
                  RESPONDIDAS
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
