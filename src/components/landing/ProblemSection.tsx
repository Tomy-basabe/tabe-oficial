import { AlertCircle, Clock, TrendingDown, BookX } from "lucide-react";
import { motion } from "framer-motion";

const PROBLEMS = [
  { icon: BookX, title: "Material desorganizado", desc: "PDFs dispersos en grupos, apuntes incompletos y enlaces que se pierden con facilidad." },
  { icon: Clock, title: "Horas sin rendimiento", desc: "Pasar horas frente al libro no garantiza comprender ni retener para el día del examen." },
  { icon: TrendingDown, title: "Falta de constancia", desc: "Sin metas claras ni feedback inmediato sobre tu progreso, la motivación decae rápido." },
  { icon: AlertCircle, title: "Materias trabadas", desc: "No tener claras las correlatividades ni el plan de cursada te hace perder cuatrimestres." },
];

export function ProblemSection() {
  return (
    <section id="problema" className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl relative z-10">
        
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
            El Desafío Universitario
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Los obstáculos que frenan tu cursada
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
            Identificamos los puntos críticos de fricción que sufren los estudiantes para brindarles una solución definitiva.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PROBLEMS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div 
                key={p.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="p-6 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <Icon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 mb-2">
                    {p.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                    {p.desc}
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
