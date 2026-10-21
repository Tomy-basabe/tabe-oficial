import { UserPlus, Compass, BookOpen, Rocket } from "lucide-react";
import { motion } from "framer-motion";

const STEPS = [
  { icon: UserPlus, title: "Creá tu cuenta", desc: "Registrate gratis y elegí tu carrera. En 30 segundos ya tenés tu espacio listo." },
  { icon: Compass, title: "Explorá tus materias", desc: "Visualizá tu plan, cargá notas de parciales y organizá las fechas importantes." },
  { icon: BookOpen, title: "Estudiá con método", desc: "Subí apuntes, practicá cuestionarios con IA y activá tus sesiones de Pomodoro." },
  { icon: Rocket, title: "Alcanzá tus metas", desc: "Monitoreá tu avance, ganá experiencia y rendí cada examen con total confianza." },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl relative z-10">
        
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider">
            Paso a Paso
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Empezar es simple y directo
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
            Sin configuraciones tediosas. Ingresás, seleccionás tu carrera y empezás a estudiar.
          </p>
        </div>

        <div className="space-y-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex items-start gap-4 sm:gap-6 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
                  <Icon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                </div>

                <div className="space-y-1">
                  <span className="font-mono text-xs font-medium text-zinc-400">Paso 0{i + 1}</span>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {s.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
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
