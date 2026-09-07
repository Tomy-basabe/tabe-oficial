import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, RotateCw, Trophy, Zap, Sparkles, MessageSquare, Flame } from "lucide-react";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { useComic } from "@/components/comic/ComicEffectsProvider";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { cn } from "@/lib/utils";

const IA_TIPS = [
  "☕ Tip #1: La cafeína no reemplaza el sueño, pero estudiar con Pomodoros de 25 min duplica tu retención.",
  "🧠 Tip #2: Resumir con tus propias palabras en Flashcards activa tu memoria activa un 40% más rápido.",
  "📚 Tip #3: Los parciales no se aprueban por ósmosis: desbloqueá logros y subí de nivel con cada apunte.",
  "🌲 Tip #4: Plantar árboles en 'Mi Bosque' mientras estudiás te aleja del celular y las redes.",
  "⚡ Tip #5: Repasar 15 minutos antes de dormir consolida los conceptos en tu memoria de largo plazo.",
];

export function ComicInteractiveDemo() {
  const { triggerBurst } = useComic();

  // Quest card state
  const [questCompleted, setQuestCompleted] = useState(false);
  const [questProgress, setQuestProgress] = useState(45);
  const [userXp, setUserXp] = useState(1250);

  // Flashcard flip state
  const [isFlipped, setIsFlipped] = useState(false);

  // IA tip state
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Likes / hype button counter
  const [hypeCount, setHypeCount] = useState(42);

  const handleCompleteQuest = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, "LEVEL UP!");
    ComicAudio.playPowerUp();

    setQuestCompleted(true);
    setQuestProgress(100);
    setUserXp((prev) => prev + 350);
  };

  const handleResetQuest = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, "RESET!");
    ComicAudio.playPop();

    setQuestCompleted(false);
    setQuestProgress(45);
    setUserXp(1250);
  };

  const handleCardFlip = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, isFlipped ? "VOLTEAR!" : "REVELADO!");
    ComicAudio.playBoing();
    setIsFlipped(!isFlipped);
  };

  const handleNextTip = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, "TIP!");
    ComicAudio.playPop();
    setCurrentTipIndex((prev) => (prev + 1) % IA_TIPS.length);
  };

  const handleHype = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, "BOOM!");
    ComicAudio.playPop();
    setHypeCount((prev) => prev + 1);
  };

  return (
    <section className="relative py-20 px-4 md:px-6 overflow-hidden">
      {/* Decorative Halftone strips */}
      <div className="absolute inset-0 comic-dots-overlay pointer-events-none opacity-40" />

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <ComicBadge variant="yellow" rotate="left" size="md">
              <Zap className="w-3.5 h-3.5 fill-black" /> ZONA INTERACTIVA
            </ComicBadge>
            <ComicBadge variant="cyan" rotate="right" size="md">
              <Sparkles className="w-3.5 h-3.5" /> PROBALO EN VIVO
            </ComicBadge>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-foreground">
            Tocá, jugá y sentí el estilo <span className="text-[#1475e5] underline decoration-wavy decoration-[#FFE600]">Cómic</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg font-bold">
            Hacé clic en las tarjetas interactivas y descubrí cómo TABE transforma tus horas de estudio en una experiencia de juego.
          </p>
        </div>

        {/* 3 Interactive Playground Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Gamified Academic Mission */}
          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-2xl bg-card border-[3px] border-foreground p-6 shadow-[5px_5px_0_0_#1475e5] relative flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <ComicBadge variant="pink" rotate="none" size="sm">
                  MISIÓN ACADÉMICA
                </ComicBadge>
                <span className="text-xs font-black px-2 py-1 rounded bg-[#FFE600] text-black border border-black shadow-[1.5px_1.5px_0_0_#000]">
                  +350 XP
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">
                  Aprobar Parcial de Física
                </h3>
                <p className="text-xs font-bold text-muted-foreground mt-1">
                  Guías prácticas completadas y 4 sesiones de Pomodoro terminadas.
                </p>
              </div>

              {/* Live XP Counter & Progress */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-black">
                  <span className="text-muted-foreground">Nivel 5 Estudiante</span>
                  <span className="text-primary">{userXp} XP</span>
                </div>
                <div className="h-3.5 bg-secondary rounded-full border-2 border-foreground overflow-hidden p-[2px]">
                  <motion.div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      questCompleted
                        ? "bg-gradient-to-r from-[#00FF66] to-[#00E5FF]"
                        : "bg-gradient-to-r from-[#1475e5] to-[#FFE600]"
                    )}
                    animate={{ width: `${questProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="pt-6">
              {questCompleted ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-[#00FF66]/20 border-2 border-[#00FF66] text-foreground font-black text-xs text-center">
                    <CheckCircle className="w-4 h-4 text-[#00FF66]" /> ¡MISIÓN SUPERADA! +350 XP
                  </div>
                  <button
                    onClick={handleResetQuest}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-xs uppercase bg-secondary hover:bg-secondary/80 border-2 border-foreground shadow-[2.5px_2.5px_0_0_hsl(var(--foreground))] transition-all active:translate-y-0.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Probar de nuevo
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCompleteQuest}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm uppercase bg-[#1475e5] text-white border-2 border-foreground shadow-[3.5px_3.5px_0_0_#000] hover:bg-[#1264c4] hover:shadow-[5px_5px_0_0_#000] transition-all active:translate-y-0.5"
                >
                  <Trophy className="w-4 h-4" /> ¡Completar Parcial!
                </button>
              )}
            </div>
          </motion.div>

          {/* Card 2: 3D Flip Comic Flashcard */}
          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-2xl bg-card border-[3px] border-foreground p-6 shadow-[5px_5px_0_0_#FF2E93] relative flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <ComicBadge variant="green" rotate="none" size="sm">
                  FLASHCARD 3D
                </ComicBadge>
                <span className="text-[11px] font-black text-muted-foreground">Click para voltear</span>
              </div>

              {/* 3D Flip Container */}
              <div
                onClick={handleCardFlip}
                className="h-40 cursor-pointer rounded-xl border-2 border-foreground p-4 flex flex-col items-center justify-center text-center transition-transform duration-300 relative select-none shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                style={{
                  backgroundColor: isFlipped ? "hsl(var(--secondary))" : "hsl(var(--card))",
                }}
              >
                <AnimatePresence mode="wait">
                  {isFlipped ? (
                    <motion.div
                      key="back"
                      initial={{ opacity: 0, rotateY: 90 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      exit={{ opacity: 0, rotateY: -90 }}
                      className="space-y-1.5"
                    >
                      <span className="text-2xl">🎓</span>
                      <p className="font-black text-xs sm:text-sm text-foreground">
                        ¡Estudiar 25 min de Pomodoro diario con TABE y no dejar todo para la última noche!
                      </p>
                      <span className="inline-block text-[10px] font-bold text-[#00E5FF] uppercase">
                        ✓ Respuesta Correcta
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="front"
                      initial={{ opacity: 0, rotateY: -90 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      exit={{ opacity: 0, rotateY: 90 }}
                      className="space-y-1.5"
                    >
                      <span className="text-2xl">❓</span>
                      <p className="font-black text-sm text-foreground">
                        ¿Cuál es el secreto de los mejores promedios de la carrera?
                      </p>
                      <span className="inline-block text-[10px] font-bold text-muted-foreground uppercase">
                        👉 Hacé click para ver la respuesta
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={handleCardFlip}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-xs uppercase bg-[#FF2E93] text-white border-2 border-foreground shadow-[3px_3px_0_0_#000] hover:bg-[#e02480] transition-all active:translate-y-0.5"
              >
                <RotateCw className="w-3.5 h-3.5" /> Girar Flashcard
              </button>
            </div>
          </motion.div>

          {/* Card 3: IA Comic Advisor & Mascot Bubble */}
          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-2xl bg-card border-[3px] border-foreground p-6 shadow-[5px_5px_0_0_#FFE600] relative flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <ComicBadge variant="orange" rotate="none" size="sm">
                  IA DE BOLSILLO
                </ComicBadge>
                <button
                  onClick={handleHype}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 border border-foreground text-[10px] font-black transition-transform active:scale-95"
                >
                  <Flame className="w-3 h-3 text-[#FF6B00] fill-[#FF6B00]" /> {hypeCount}
                </button>
              </div>

              {/* Comic Speech Bubble */}
              <div className="p-3.5 rounded-xl bg-card border-2 border-foreground shadow-[3px_3px_0_0_#FFE600] min-h-[110px] flex items-center">
                <p className="text-xs sm:text-sm font-black text-foreground leading-snug">
                  {IA_TIPS[currentTipIndex]}
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-2">
              <button
                onClick={handleNextTip}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-xs uppercase bg-[#FFE600] text-black border-2 border-foreground shadow-[3px_3px_0_0_#000] hover:bg-[#edd400] transition-all active:translate-y-0.5"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Siguiente Tip de IA
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
