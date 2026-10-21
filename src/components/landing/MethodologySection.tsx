import { Target, Brain, Repeat, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const STEPS = [
  { icon: Target, num: "01", title: "Organizá", desc: "Plan de carrera, calendario académico y biblioteca unificada en un solo lugar." },
  { icon: Brain, num: "02", title: "Estudiá", desc: "Flashcards con repetición espaciada, cuestionarios con IA, apuntes enriquecidos y Pomodoro." },
  { icon: Repeat, num: "03", title: "Medí", desc: "Métricas de estudio en tiempo real, rachas diarias y conteo de horas por materia." },
  { icon: Trophy, num: "04", title: "Avanzá", desc: "Desbloqueá logros, ganá experiencia y visualizá tu avance certero hacia el título." },
];

export function MethodologySection() {
  return (
    <section id="metodologia" className="py-20 md:py-28 bg-zinc-50/50 dark:bg-[#121212]/50 border-t border-zinc-200/80 dark:border-zinc-800/80 relative">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl relative z-10">
        
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">
            Metodología TABE
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Cuatro etapas para rendir con éxito
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
            Un ciclo comprobado que estructura tu rutina para estudiar menos tiempo y retener el doble.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div 
                key={s.num}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group p-6 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <span className="font-mono text-xs font-medium text-zinc-400">
                      {s.num}
                    </span>
                  </div>

                  <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 mb-2">
                    {s.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                    {s.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
