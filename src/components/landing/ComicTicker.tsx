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
    <div className="relative py-4 bg-[#FFE600] border-y-4 border-black overflow-hidden -rotate-1 shadow-[0_6px_0_0_#000] z-20 select-none my-6">
      {/* Ben-Day Dots Background Pattern */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #000 1.5px, transparent 1.5px)`,
          backgroundSize: "8px 8px",
        }}
      />

      <div className="flex w-fit">
        <motion.div
          className="flex items-center gap-8 whitespace-nowrap text-black font-black text-sm sm:text-base uppercase tracking-wider"
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-center gap-2.5 px-3 py-1 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000]">
                <Icon className="w-4 h-4 text-black fill-black" />
                <span>{item.text}</span>
                <span className="text-black font-black">✦</span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
