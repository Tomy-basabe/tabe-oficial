import { motion } from "framer-motion";
import { Compass, Timer, Brain, Users, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const MODULES = [
  {
    number: "01",
    title: "Malla y Correlatividades Vivas",
    subtitle: "Visualizá qué materias podés cursar y rendir en tiempo real para no trabar tu plan.",
    tag: "Planificación",
    icon: Compass,
    metric: "Mapeo inteligente",
  },
  {
    number: "02",
    title: "Temporizador Pomodoro & Hábitos",
    subtitle: "Bloques de estudio enfocados con métricas de tiempo real y rachas gamificadas.",
    tag: "Enfoque",
    icon: Timer,
    metric: "Anti-distracción",
  },
  {
    number: "03",
    title: "Flashcards con Algoritmo Espaciado",
    subtitle: "Repasá fórmulas, leyes y definiciones en el intervalo exacto antes del olvido.",
    tag: "Retención",
    icon: Brain,
    metric: "Repetición activa",
  },
  {
    number: "04",
    title: "Salas de Estudio y Comunidad",
    subtitle: "Conectá con estudiantes de tu misma carrera, compartí resúmenes y medite en retos.",
    tag: "Colaboración",
    icon: Users,
    metric: "Comunidad 24/7",
  },
];

export function EditorialManifestoSection() {
  return (
    <section className="py-24 md:py-32 relative bg-zinc-50/50 dark:bg-[#121212]/50 border-t border-zinc-200/80 dark:border-zinc-800/80">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl relative z-10">
        
        <div className="max-w-3xl mb-16 space-y-3">
          <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider">
            Capacidades del Sistema
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Una experiencia académica unificada
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed max-w-2xl">
            Cada módulo se conecta directamente con tus materias y exámenes para ofrecerte un control integral de tu cursado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MODULES.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.number}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-xs font-medium text-zinc-400">
                      {m.number}
                    </span>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 px-2.5 py-1 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                      {m.tag}
                    </span>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mb-4 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>

                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    {m.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal mb-6">
                    {m.subtitle}
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 font-medium">
                  <span>{m.metric}</span>
                  <Link to="/registro" className="text-zinc-900 dark:text-zinc-100 hover:text-blue-500 flex items-center gap-1 transition-colors">
                    Explorar <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
