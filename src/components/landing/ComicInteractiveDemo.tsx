import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, RotateCw, Trophy, Zap, BookOpen, ChevronRight, Check } from "lucide-react";

const IA_TIPS = [
  "La técnica Pomodoro con bloques de 25 minutos incrementa la retención activa hasta un 40%.",
  "Resumir con tus propias palabras en flashcards activa la memoria episódica a largo plazo.",
  "Repasar 15 minutos antes de dormir consolida los conceptos en tu memoria de trabajo.",
  "Distribuir las sesiones en días alternos previene la sobrecarga cognitiva antes de un parcial.",
];

export function ComicInteractiveDemo() {
  const [questCompleted, setQuestCompleted] = useState(false);
  const [questProgress, setQuestProgress] = useState(45);
  const [userXp, setUserXp] = useState(1250);
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const handleCompleteQuest = () => {
    setQuestCompleted(true);
    setQuestProgress(100);
    setUserXp((prev) => prev + 350);
  };

  const handleResetQuest = () => {
    setQuestCompleted(false);
    setQuestProgress(45);
    setUserXp(1250);
  };

  const handleNextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % IA_TIPS.length);
  };

  return (
    <section id="demo-interactiva" className="py-20 md:py-28 px-4 md:px-6 relative">
      <div className="container mx-auto max-w-6xl relative z-10">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-14">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Experimentá el ecosistema en vivo
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
            Interactuá con las micro-experiencias de estudio de TABE directamente desde tu navegador.
          </p>
        </div>

        {/* 3 Interactive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. Quest / Level Up Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Misión Diaria</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60">
                  {userXp} XP
                </span>
              </div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Completar 2 Pomodoros de Álgebra
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mb-5">
                Cumplí tus bloques de estudio para ganar experiencia y mantener tu racha activa.
              </p>

              {/* Progress Bar */}
              <div className="space-y-1.5 mb-6">
                <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                  <span>Progreso</span>
                  <span>{questProgress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    animate={{ width: `${questProgress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>
            </div>

            {questCompleted ? (
              <button
                onClick={handleResetQuest}
                className="w-full py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" /> Reiniciar prueba
              </button>
            ) : (
              <button
                onClick={handleCompleteQuest}
                className="w-full py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Completar sesión (+350 XP)
              </button>
            )}
          </div>

          {/* 2. Flashcard Flip Card */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="p-6 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-all select-none"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Flashcard Activa</span>
                <span className="text-[10px] text-zinc-400">Clic para girar</span>
              </div>

              <div className="min-h-[140px] flex flex-col justify-center text-center p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 mb-4">
                <AnimatePresence mode="wait">
                  {isFlipped ? (
                    <motion.div
                      key="back"
                      initial={{ opacity: 0, rotateX: 90 }}
                      animate={{ opacity: 1, rotateX: 0 }}
                      exit={{ opacity: 0, rotateX: -90 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1.5"
                    >
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Respuesta</span>
                      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {`F = m · a`}
                      </p>
                      <p className="text-[11px] text-zinc-500">La aceleración de un cuerpo es proporcional a la fuerza neta aplicada.</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="front"
                      initial={{ opacity: 0, rotateX: -90 }}
                      animate={{ opacity: 1, rotateX: 0 }}
                      exit={{ opacity: 0, rotateX: 90 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1.5"
                    >
                      <span className="text-[11px] font-medium text-blue-500">Pregunta</span>
                      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        ¿Cuál es la 2da Ley de Newton?
                      </p>
                      <p className="text-[11px] text-zinc-400">Física I · Unidad Dinámica</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500">
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isFlipped ? "Ver pregunta" : "Revelar fórmula"}</span>
            </div>
          </div>

          {/* 3. AI Tutor Insight Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Tutor IA Contextual</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60">
                  Tip Diario
                </span>
              </div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Recomendación de Estudio
              </h3>
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 min-h-[100px] flex items-center mb-5">
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-normal leading-relaxed">
                  "{IA_TIPS[currentTipIndex]}"
                </p>
              </div>
            </div>

            <button
              onClick={handleNextTip}
              className="w-full py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <span>Siguiente recomendación</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
