import { useState } from "react";
import { ArrowRight, CheckCircle2, BookOpen, Layers, Bot, Zap, Compass, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function HeroSection() {
  const [activeTab, setActiveTab] = useState<"notion" | "pomodoro" | "Cuestionarios" | "ai">("notion");

  return (
    <section id="hero" className="relative pt-32 pb-24 md:pt-44 md:pb-36 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10">

        {/* Top Announcement Pill */}
        <div className="flex justify-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              TABE 2.0 · Asistente de estudio inteligente y gamificado
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
          </motion.div>
        </div>

        {/* Hero Title & Subtitle (Apple/Notion aesthetic) */}
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.08]"
          >
            Tu carrera universitaria, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-200 dark:to-zinc-500 bg-clip-text text-transparent">
              organizada con precisión.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed"
          >
            La plataforma todo-en-uno que fusiona apuntes enriquecidos estilo Notion, mapas de correlatividades, cuestionarios interactivos y hábitos gamificados.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3"
          >
            <Link
              to="/registro"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-medium text-sm transition-all shadow-sm hover:shadow cursor-pointer"
            >
              Comenzar gratis
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/carreras"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 font-medium text-sm transition-all shadow-2xs cursor-pointer"
            >
              <Compass className="w-4 h-4 text-zinc-500" />
              Explorar Carreras
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500 dark:text-zinc-400"
          >
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500" /> 100% Gratuito
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500" /> Sin tarjetas requeridas
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500" /> Más de 350 estudiantes activos
            </span>
          </motion.div>
        </div>

        {/* Interactive Showcase Preview Mockup (Apple product showcase style) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 max-w-5xl mx-auto"
        >
          <div className="rounded-3xl border-2 border-zinc-300 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl shadow-2xl p-2 sm:p-4">

            {/* Top Toolbar / Tab Switcher */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/80 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                </div>
                <span className="text-xs font-mono text-zinc-400 ml-2">tabe.app/workspace</span>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
                {[
                  { id: "notion", label: "Apuntes", icon: BookOpen },
                  { id: "quizzes", label: "Cuestionarios", icon: Layers },
                  { id: "pomodoro", label: "Enfoque", icon: Zap },
                  { id: "ai", label: "Tutor IA", icon: Bot },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === t.id
                          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inner Interactive Card Screen */}
            <div className="min-h-[340px] sm:min-h-[420px] rounded-2xl bg-zinc-50/70 dark:bg-[#151515] border border-zinc-300/80 dark:border-zinc-700/80 p-6 flex flex-col justify-center">
              {activeTab === "notion" && (
                <div className="max-w-2xl mx-auto space-y-4 text-left animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span>Sistemas Operativos · Resumen Teórico</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Planificación de Procesos (CPU Scheduling)</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                    Los algoritmos de planificación determinan qué proceso en la cola de listos (ready queue) obtiene la CPU cuando ésta queda desocupada.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Algoritmo Round Robin (RR)</span>
                      <p className="text-xs text-zinc-500 mt-1">Asignación de cuantos de tiempo fijos para garantizar interactividad sin inanición.</p>
                    </div>
                    <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Shortest Job First (SJF)</span>
                      <p className="text-xs text-zinc-500 mt-1">Minimiza el tiempo de espera promedio pero puede generar starvation en ráfagas largas.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "quizzes" && (
                <div className="max-w-xl mx-auto space-y-4 text-left animate-in fade-in duration-300">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Pregunta 3 de 10</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60">Tasa de acierto: 92%</span>
                  </div>
                  <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    ¿Cuál de las siguientes condiciones NO es necesaria para que ocurra un Deadlock (Bloqueo Mutuo)?
                  </h4>
                  <div className="space-y-2 pt-1">
                    {[
                      { letter: "A", text: "Exclusión Mutua", correct: false },
                      { letter: "B", text: "Preempción de Recursos Forzada", correct: true },
                      { letter: "C", text: "Retención y Espera (Hold and Wait)", correct: false },
                      { letter: "D", text: "Espera Circular", correct: false }
                    ].map((opt) => (
                      <div
                        key={opt.letter}
                        className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${opt.correct
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/80 text-emerald-900 dark:text-emerald-200"
                            : "bg-white dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center font-semibold text-xs ${opt.correct ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            }`}>{opt.letter}</span>
                          <span>{opt.text}</span>
                        </div>
                        {opt.correct && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "pomodoro" && (
                <div className="max-w-md mx-auto text-center space-y-4 animate-in fade-in duration-300">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Sesión de Enfoque Profundo</span>
                  </div>
                  <div className="text-6xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
                    25:00
                  </div>
                  <p className="text-xs text-zinc-500">Materia activa: Algoritmos y Estructuras de Datos · +40 XP al finalizar</p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium text-xs shadow-xs">
                      Iniciar Pomodoro
                    </button>
                    <button className="px-4 py-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium text-xs">
                      Descanso
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "ai" && (
                <div className="max-w-xl mx-auto space-y-3 text-left animate-in fade-in duration-300">
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
                    <span className="text-[11px] font-semibold text-zinc-400">TÚ</span>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5">
                      ¿Qué temas clave tengo que repasar para el parcial de Física I este viernes según mis apuntes?
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                    <div className="flex items-center gap-1.5 text-blue-500 text-[11px] font-semibold mb-1">
                      <Bot className="w-3.5 h-3.5" />
                      <span>TABE AI TUTOR</span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      Según tus notas y cuestionarios recientes, te sugiero reforzar:
                      <br />• <strong>Conservación de Energía Mecánica</strong> (2 errores en trivias).
                      <br />• <strong>Momento Lineal y Choques Inelásticos</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
