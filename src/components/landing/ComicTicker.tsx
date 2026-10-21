import { motion } from "framer-motion";
import { Zap, Sparkles, Trophy, Brain, Flame, Target } from "lucide-react";

const TICKER_ITEMS = [
  { text: "+350 Estudiantes universitarios", icon: Target },
  { text: "Técnica Pomodoro & Seguimiento", icon: Zap },
  { text: "Mapas de Correlatividades Vivos", icon: Sparkles },
  { text: "Flashcards con Repetición Espaciada", icon: Brain },
  { text: "Quizzes y Resúmenes con IA", icon: Flame },
  { text: "100% Gratuito y Accesible", icon: Trophy },
];

export function ComicTicker() {
  return (
    <div className="relative py-3 border-y border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/60 dark:bg-[#121212]/60 backdrop-blur-md overflow-hidden z-20 select-none my-8">
      <div className="flex w-fit">
        <motion.div
          className="flex items-center gap-6 whitespace-nowrap text-xs font-medium text-zinc-600 dark:text-zinc-400"
          animate={{ x: [0, -800] }}
          transition={{ repeat: Infinity, duration: 24, ease: "linear" }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/60 rounded-full shadow-2xs">
                <Icon className="w-3.5 h-3.5 text-zinc-500" />
                <span>{item.text}</span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
