import { motion } from "framer-motion";
import { Target, Brain, Compass, BookOpen, Bot, Trophy } from "lucide-react";

const PILLARS = [
  {
    id: "focus",
    icon: Target,
    title: "Enfoque Sin Distracciones",
    description: "Temporizadores Pomodoro integrados con tu plan de estudio, metas diarias y métricas en tiempo real.",
    category: "Productividad",
    color: "#3b82f6" // clean blue
  },
  {
    id: "memory",
    icon: Brain,
    title: "Repetición Espaciada",
    description: "Flashcards con algoritmo activo de retención para memorizar conceptos y fórmulas a largo plazo.",
    category: "Retención",
    color: "#8b5cf6" // clean violet
  },
  {
    id: "roadmap",
    icon: Compass,
    title: "Malla y Correlatividades",
    description: "Visualizá qué materias podés cursar y rendir, prerrequisitos y progreso general hacia tu título.",
    category: "Trayectoria",
    color: "#10b981" // clean emerald
  },
  {
    id: "notion",
    icon: BookOpen,
    title: "Editor Estilo Notion",
    description: "Tus apuntes con bloques matemáticos KaTeX, tablas interactivas, código y exportación a PDF limpia.",
    category: "Apuntes",
    color: "#f59e0b" // warm amber
  },
  {
    id: "ai",
    icon: Bot,
    title: "Asistente Tutor IA",
    description: "Explicaciones contextuales a partir de tus propios apuntes y generación instantánea de cuestionarios.",
    category: "Inteligencia Artificial",
    color: "#06b6d4" // clean cyan
  },
  {
    id: "gamification",
    icon: Trophy,
    title: "Gamificación y Logros",
    description: "Ganá experiencia (XP), mantené tus rachas de estudio y cuidá a tu compañero virtual mientras avanzás.",
    category: "Motivación",
    color: "#ec4899" // clean pink
  }
];

export function ComicSuperpowersSection() {
  return (
    <section id="superpoderes" className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        
        {/* Header (Clean, professional, without generic badges) */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Diseñado para transformar tu forma de rendir
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto font-normal leading-relaxed">
            Herramientas integradas concebidas para reducir la fricción cognitiva y potenciar tus hábitos académicos día a día.
          </p>
        </div>

        {/* Feature Grid with Apple / Notion style cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="group relative p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: `${p.color}12`,
                        borderColor: `${p.color}25`,
                        color: p.color
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 px-2.5 py-1 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                      {p.category}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    {p.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                    {p.description}
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
