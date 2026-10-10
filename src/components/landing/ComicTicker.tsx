import { motion } from "framer-motion";
import { Zap, Sparkles, Trophy, Flame, Brain, Star } from "lucide-react";

const TICKER_ITEMS = [
  { text: "+350 ESTUDIANTES ACTIVOS", icon: Flame, color: "#FF2E93" },
  { text: "0% PROCRASTINACIÓN", icon: Zap, color: "#00E5FF" },
  { text: "MÉTODO TABE PROBADO", icon: Trophy, color: "#FFE600" },
  { text: "QUIZZES CON IA", icon: Brain, color: "#00FF66" },
  { text: "MI BOSQUE GAMIFICADO", icon: Star, color: "#FF6B00" },
  { text: "100% GRATIS PARA UNIVERSITARIOS", icon: Sparkles, color: "#FFE600" },
  { text: "MAPA DE CORRELATIVIDADES", icon: Zap, color: "#00E5FF" },
];

export function ComicTicker() {
  return (
    <div className="relative py-3.5 bg-[#FFE600] dark:bg-amber-400 border-y-2 border-black dark:border-white/20 overflow-hidden -rotate-1 shadow-sm z-20 select-none my-6">
      {/* Ben-Day Dots Background Pattern */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #000 1.5px, transparent 1.5px)`,
          backgroundSize: "8px 8px",
        }}
      />

      <div className="flex w-fit">
        <motion.div
          className="flex items-center gap-6 whitespace-nowrap text-zinc-950 font-black text-xs sm:text-sm uppercase tracking-wider"
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-white/90 dark:bg-zinc-900 border border-black/30 dark:border-white/20 rounded-lg shadow-xs text-zinc-900 dark:text-zinc-100">
                <Icon className="w-3.5 h-3.5 text-[#1475e5] dark:text-amber-400 fill-current" />
                <span className="font-extrabold">{item.text}</span>
                <span className="text-muted-foreground font-black">✦</span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
