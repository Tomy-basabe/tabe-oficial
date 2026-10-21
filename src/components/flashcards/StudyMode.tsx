import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, Clock, Check, X, Zap, Volume2, VolumeX, RotateCw, Sparkles, FastForward } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { cn } from "@/lib/utils";
import { TabeLogo } from "@/components/ui/TabeLogo";

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
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [flyingCardIndex, setFlyingCardIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const cardCount = Math.min(cards.length, 12);

  // Spaced repetition shuffle: prioriza las cartas con mayor tasa de error
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

  // Cronograma de animación de shuffle inicial
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setShufflePhase("riffle"), 700));
    timers.push(setTimeout(() => setShufflePhase("stack"), 1600));
    timers.push(setTimeout(() => setShufflePhase("ready"), 2300));
    timers.push(setTimeout(() => {
      setShufflePhase("done");
      setIsShuffling(false);
      setStudyPhase("picking");
    }, 2800));
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const skipShuffleAnimation = () => {
    setShufflePhase("done");
    setIsShuffling(false);
    setStudyPhase("picking");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Seleccionar carta del abanico
  const handlePickCard = useCallback((cardIdx: number) => {
    if (studyPhase !== "picking") return;
    setSelectedIndex(cardIdx);
    setIsFlipped(false);
    setStudyPhase("viewing");
  }, [studyPhase]);

  // Calificar respuesta
  const handleResult = useCallback(async (status: 'correct' | 'partial' | 'incorrect') => {
    if (selectedIndex === null) return;

    if (isSpeaking) {
      stop();
    }

    if (status === 'correct') {
      setCorrectCount(prev => prev + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 900);
    } else if (status === 'incorrect') {
      setIncorrectCount(prev => prev + 1);
    }

    setStudyPhase("animating");
    setFlyingCardIndex(selectedIndex);
    await onCardResult(shuffledCards[selectedIndex].id, status);

    // Mover carta al mazo de completadas
    setTimeout(() => {
      setCompletedIndices(prev => [...prev, selectedIndex]);
      setRemainingIndices(prev => prev.filter(i => i !== selectedIndex));
      setFlyingCardIndex(null);
      setSelectedIndex(null);
      setIsFlipped(false);

      const newRemaining = remainingIndices.filter(i => i !== selectedIndex);
      if (newRemaining.length === 0) {
        onComplete();
      } else {
        setStudyPhase("picking");
      }
    }, 450);
  }, [selectedIndex, isSpeaking, stop, onCardResult, shuffledCards, remainingIndices, onComplete]);

  // Deseleccionar y volver al mazo
  const handleBackToPicking = useCallback(() => {
    if (isSpeaking) stop();
    setSelectedIndex(null);
    setIsFlipped(false);
    setStudyPhase("picking");
  }, [isSpeaking, stop]);

  // Atajos de teclado para flujo de estudio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (studyPhase !== "viewing" || selectedIndex === null) return;

      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleBackToPicking();
      } else if (isFlipped) {
        if (e.key === "1") {
          e.preventDefault();
          handleResult("incorrect");
        } else if (e.key === "2") {
          e.preventDefault();
          handleResult("partial");
        } else if (e.key === "3") {
          e.preventDefault();
          handleResult("correct");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [studyPhase, selectedIndex, isFlipped, handleBackToPicking, handleResult]);

  const totalCards = shuffledCards.length;
  const answeredCount = completedIndices.length;
  const progress = totalCards > 0 ? (answeredCount / totalCards) * 100 : 0;
  const selectedCard = selectedIndex !== null ? shuffledCards[selectedIndex] : null;

  // Manejo de lectura en voz alta
  const handleToggleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  // Estilos de la baraja durante la animación inicial
  const getShuffleCardStyle = (i: number): React.CSSProperties => {
    const total = cardCount;
    const mid = (total - 1) / 2;

    switch (shufflePhase) {
      case "fan-out": {
        const angle = (i - mid) * 9;
        const yOffset = Math.pow(Math.abs(i - mid), 2) * 2.2;
        return {
          transform: `rotate(${angle}deg) translateY(${-yOffset}px)`,
          transformOrigin: "center 180%",
          transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transitionDelay: `${i * 25}ms`,
          zIndex: i,
        };
      }
      case "riffle": {
        const isLeft = i % 2 === 0;
        const halfIndex = Math.floor(i / 2);
        const yPos = halfIndex * -2;
        return {
          transform: `translateX(${isLeft ? -50 : 50}px) translateY(${yPos}px) rotate(${isLeft ? -3 : 3}deg)`,
          transition: "all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          transitionDelay: `${i * 30}ms`,
          zIndex: total - i,
        };
      }
      case "stack": {
        return {
          transform: `translateX(0) translateY(${-i * 1.5}px) rotate(0deg)`,
          transition: "all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transitionDelay: `${(total - i) * 18}ms`,
          zIndex: total - i,
        };
      }
      case "ready": {
        return {
          transform: `translateY(${-i * 1.5}px) scale(${1 + (total - i) * 0.002})`,
          transition: "all 0.25s ease-out",
          zIndex: total - i,
        };
      }
      default:
        return { zIndex: i };
    }
  };

  const phaseText = useMemo(() => {
    switch (shufflePhase) {
      case "fan-out": return "Preparando tarjetas...";
      case "riffle": return "Optimizando según repaso espaciado...";
      case "stack": return "Apilando mazo...";
      case "ready": return "¡Listo para estudiar!";
      default: return "";
    }
  }, [shufflePhase]);

  // ─────────── PANTALLA DE SHUFFLE MINIMALISTA NOTION ───────────
  if (isShuffling) {
    return (
      <div className="p-4 lg:p-8 min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#191919]">
        <div className="text-center mb-8 max-w-sm">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 block">
            Sesión de Estudio
          </span>
          <h2 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
            {deckName}
          </h2>
        </div>

        <div className="relative w-40 h-56 sm:w-44 sm:h-60 mb-8">
          {[...Array(cardCount)].map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={getShuffleCardStyle(i)}
            >
              <div className="w-full h-full rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] shadow-2xs flex flex-col items-center justify-center p-4 relative">
                <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center">
                  <TabeLogo size={26} className="object-contain" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300 transition-all duration-300 mb-1.5">
          {phaseText}
        </p>

        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mb-5">
          {cards.length} {cards.length === 1 ? "tarjeta" : "tarjetas"}
        </p>

        {/* Botón para saltar animación */}
        <button
          onClick={skipShuffleAnimation}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60"
        >
          <FastForward className="w-3.5 h-3.5" />
          Empezar ahora
        </button>
      </div>
    );
  }

  // ─────────── CANVAS DE ESTUDIO ZEN ───────────
  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen relative overflow-hidden bg-white dark:bg-[#191919] flex flex-col justify-between">
      {/* Micro confetti minimalista al acertar */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(14)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-fade-in w-1.5 h-1.5 rounded-full"
              style={{
                left: `${25 + Math.random() * 50}%`,
                top: `${30 + Math.random() * 40}%`,
                background: i % 2 === 0 ? '#10b981' : '#3b82f6',
                opacity: 0.8,
              }}
            />
          ))}
        </div>
      )}

      {/* Cabecera Zen */}
      <div className="max-w-4xl w-full mx-auto mb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onExit}
              title="Salir del modo de estudio"
              className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight truncate max-w-[220px] sm:max-w-sm" title={deckName}>
              {deckName}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Contadores aciertos / fallos */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                <Check className="w-3 h-3" />
                {correctCount}
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                <X className="w-3 h-3" />
                {incorrectCount}
              </span>
            </div>

            {/* Temporizador */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
              <Clock className="w-3 h-3 text-zinc-400" />
              <span>{formatTime(studyTime)}</span>
            </div>
          </div>
        </div>

        {/* Barra de progreso fina */}
        <div className="space-y-1">
          <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
            <span>Progreso</span>
            <span>{answeredCount} / {totalCards} ({Math.round(progress)}%)</span>
          </div>
        </div>
      </div>

      {/* ── ÁREA PRINCIPAL: Abanico o Tarjeta Activa ── */}
      <div className="flex-1 flex flex-col items-center justify-center relative w-full max-w-4xl mx-auto py-2">
        {/* Backdrop al enfocar una tarjeta */}
        <div
          className={cn(
            "fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity duration-300",
            (studyPhase === "viewing" || studyPhase === "animating") ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={studyPhase === "viewing" && !isFlipped ? handleBackToPicking : undefined}
        />

        {studyPhase === "picking" && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-4 animate-fade-in flex items-center gap-1.5">
            <span>Elige una tarjeta para repasar</span>
          </p>
        )}

        {/* Abanico interactivo de cartas */}
        <div className="relative flex justify-center items-end h-[340px] sm:h-[380px] w-full max-w-3xl mx-auto z-45">
          {remainingIndices.map((cardIdx, posIdx) => {
            const totalRemaining = remainingIndices.length;
            const mid = (totalRemaining - 1) / 2;
            const offset = posIdx - mid;
            const baseAngle = offset * (totalRemaining <= 5 ? 10 : totalRemaining <= 10 ? 6 : 4);
            const baseYOffset = Math.pow(Math.abs(offset), 2) * (totalRemaining <= 5 ? 3 : totalRemaining <= 10 ? 2 : 1);
            const baseXOffset = offset * (totalRemaining <= 5 ? 45 : totalRemaining <= 10 ? 32 : 22);
            const isHovered = hoveredIndex === cardIdx;
            const isActive = selectedIndex === cardIdx;
            const isAnimatingOut = studyPhase === "animating" && flyingCardIndex === cardIdx;
            const cardInfo = shuffledCards[cardIdx];

            let transformStr = `translateX(${baseXOffset}px) translateY(${baseYOffset}px) rotate(${baseAngle}deg) scale(0.55)`;
            let zIndexVal = isHovered ? 30 : posIdx;

            if (isActive) {
              transformStr = `translate(0px, -20px) rotate(0deg) scale(1)`;
              zIndexVal = 50;
            } else if (isAnimatingOut) {
              transformStr = `translate(0px, 350px) rotate(${baseAngle}deg) scale(0.2)`;
              zIndexVal = 50;
            } else if (isHovered && studyPhase === "picking") {
              transformStr = `translateX(${baseXOffset}px) translateY(${baseYOffset - 35}px) rotate(${baseAngle}deg) scale(0.6)`;
            }

            return (
              <div
                key={cardIdx}
                className="absolute cursor-pointer select-none"
                style={{
                  transform: transformStr,
                  transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease",
                  zIndex: zIndexVal,
                  bottom: 30,
                  opacity: (studyPhase === "viewing" && !isActive) ? 0 : 1,
                  pointerEvents: (studyPhase === "viewing" && !isActive) ? 'none' : 'auto',
                  perspective: "1200px",
                }}
                onClick={() => {
                  if (studyPhase === "picking") handlePickCard(cardIdx);
                  else if (isActive && studyPhase === "viewing") setIsFlipped(!isFlipped);
                }}
                onMouseEnter={() => setHoveredIndex(cardIdx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Contenedor 3D Flip */}
                <div
                  className="relative w-72 h-[22rem] sm:w-84 sm:h-[26rem]"
                  style={{
                    transformStyle: "preserve-3d",
                    transition: "transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    transform: isActive
                      ? (isFlipped ? "rotateY(180deg)" : "rotate(0deg)")
                      : "rotate(0deg)",
                  }}
                >
                  {/* CARA FRONTAL: Dorso en picking / Pregunta en estudio activo */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden bg-white dark:bg-[#212121]",
                      isActive ? "shadow-xl" : "shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                    style={{
                      backfaceVisibility: "hidden",
                      transition: "box-shadow 0.3s ease, border-color 0.3s ease",
                    }}
                  >
                    {!isActive ? (
                      // Dorso elegante con el logo oficial de TABE
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-[#1f1f1f] relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] dark:opacity-[0.08] pointer-events-none select-none">
                          <TabeLogo size={190} />
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center shadow-xs mb-3 relative z-10 transition-transform group-hover:scale-105">
                          <TabeLogo size={42} className="object-contain" />
                        </div>
                        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 font-semibold relative z-10">
                          TABE
                        </span>
                      </div>
                    ) : (
                      // Pregunta activa
                      <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8 bg-white dark:bg-[#212121]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Pregunta
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleToggleSpeak(e, cardInfo.pregunta)}
                            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Escuchar pregunta"
                          >
                            {isSpeaking ? <VolumeX className="w-4 h-4 text-zinc-700 dark:text-zinc-200" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                        </div>

                        <div className="my-auto py-4 overflow-y-auto max-h-[16rem]">
                          <p className="text-base sm:text-lg font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed text-center">
                            {cardInfo.pregunta}
                          </p>
                        </div>

                        <div className="flex items-center justify-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-[11px] pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                          <RotateCw className="w-3 h-3" />
                          <span>Haz clic o presiona <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono border border-zinc-200 dark:border-zinc-700">Espacio</kbd> para girar</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CARA TRASERA: Respuesta */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden bg-white dark:bg-[#212121]",
                      isActive ? "shadow-xl" : ""
                    )}
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      transition: "box-shadow 0.3s ease",
                    }}
                  >
                    <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8 bg-white dark:bg-[#212121]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Respuesta
                          </span>
                          <span className="text-zinc-300 dark:text-zinc-700">·</span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                            <TabeLogo size={13} />
                            TABE
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleToggleSpeak(e, cardInfo.respuesta)}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Escuchar respuesta"
                        >
                          {isSpeaking ? <VolumeX className="w-4 h-4 text-zinc-700 dark:text-zinc-200" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="my-auto py-4 overflow-y-auto max-h-[16rem]">
                        <p className="text-base sm:text-lg font-normal text-zinc-800 dark:text-zinc-200 leading-relaxed text-center">
                          {cardInfo.respuesta}
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-[11px] pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                        <RotateCw className="w-3 h-3" />
                        <span>Girar nuevamente</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Panel de calificación estilo Anki/Notion (cuando está volteada) */}
        {studyPhase === "viewing" && isFlipped && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4 animate-fade-in">
            <div className="bg-white/95 dark:bg-[#212121]/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-3 shadow-xl">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 text-center mb-2">
                ¿Qué tal recordabas esto?
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResult("incorrect");
                  }}
                  className="bg-rose-50/60 hover:bg-rose-100/80 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl py-2 px-2 text-xs font-medium border border-rose-200/60 dark:border-rose-900/40 transition-colors flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 group-hover:scale-125 transition-transform" />
                    <span>No la sabía</span>
                  </span>
                  <span className="text-[9px] text-zinc-400 font-mono">[1]</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResult("partial");
                  }}
                  className="bg-amber-50/60 hover:bg-amber-100/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl py-2 px-2 text-xs font-medium border border-amber-200/60 dark:border-amber-900/40 transition-colors flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 group-hover:scale-125 transition-transform" />
                    <span>A medias</span>
                  </span>
                  <span className="text-[9px] text-zinc-400 font-mono">[2]</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResult("correct");
                  }}
                  className="bg-emerald-50/60 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl py-2 px-2 text-xs font-medium border border-emerald-200/60 dark:border-emerald-900/40 transition-colors flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform" />
                    <span>¡La sabía!</span>
                  </span>
                  <span className="text-[9px] text-zinc-400 font-mono">[3]</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pie de página con pila de cartas respondidas */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-400 dark:text-zinc-500">
        <div className="flex items-center gap-2">
          {completedIndices.length > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 font-mono text-zinc-600 dark:text-zinc-300 text-[11px]">
              <Check className="w-3 h-3 text-emerald-500" />
              <span>{completedIndices.length} {completedIndices.length === 1 ? "repasada" : "repasadas"}</span>
            </div>
          ) : (
            <span className="text-[11px]">Selecciona cualquier carta para comenzar</span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="hidden sm:inline text-zinc-400">Atajos: [Espacio] voltear · [1-3] calificar · [Esc] volver</span>
          <span>Restantes: {remainingIndices.length}</span>
        </div>
      </div>
    </div>
  );
}
