import { useState, useRef } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import {
  Compass,
  Timer,
  Brain,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Flame,
  Play,
  Volume2,
  RefreshCw,
  Trophy,
  ChevronRight,
  TreePine,
  Laptop,
  GraduationCap,
  Zap,
} from "lucide-react";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { useComic } from "@/components/comic/ComicEffectsProvider";
import { KineticHeading } from "@/components/ui/kinetic-heading";

interface StoryStep {
  id: string;
  badge: string;
  badgeColor: "yellow" | "pink" | "green" | "orange";
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  color: string;
  icon: typeof Compass;
}

const STORY_STEPS: StoryStep[] = [
  {
    id: "step-plan",
    badge: "01 // MAPA DINÁMICO",
    badgeColor: "yellow",
    title: "Tu carrera universitaria sin sorpresas ni materias trabadas",
    subtitle: "El fin de los cuellos de botella en las correlatividades",
    description:
      "Visualizá la ruta óptima de graduación en un grafo interactivo. TABE detecta dependencias ocultas, calcula tu carga semestral y te recomienda las materias clave para no perder un año entero.",
    highlights: [
      "Grafo interactivo con alerta de correlativas críticas",
      "Calculadora de promedio ponderado y avance real",
      "Predicción de cursada adaptada a tus horarios de trabajo",
    ],
    color: "#1475e5",
    icon: Compass,
  },
  {
    id: "step-focus",
    badge: "02 // GAMIFICACIÓN TOTAL",
    badgeColor: "orange",
    title: "El Pomodoro gamer que vence a TikTok y las distracciones",
    subtitle: "Plantá árboles, subí de nivel y desbloqueá recompensas",
    description:
      "Transformá tus horas de estudio en una aventura RPG. Cada bloque de concentración hace florecer tu bosque virtual, suma monedas TABE y entrena a tu mascota TabeGochi.",
    highlights: [
      "Temporizador inteligente con música Lo-Fi integrada",
      "Multiplicador de racha: mantené el fuego encendido",
      "Monedas canjeables por cosméticos, badges y temas retro",
    ],
    color: "#ff9415",
    icon: Timer,
  },
  {
    id: "step-srs",
    badge: "03 // CIENCIA COGNITIVA",
    badgeColor: "pink",
    title: "Flashcards con Repetición Espaciada y generación con IA",
    subtitle: "Memorizá conceptos complejos en la mitad de tiempo",
    description:
      "Generá mazos de estudio a partir de tus PDFs y apuntes con un solo click. Nuestro algoritmo FSRS programa repasos en el instante matemático exacto antes de que olvides.",
    highlights: [
      "Algoritmo FSRS de repetición espaciada comprobado",
      "Importación instantánea desde PDFs, resúmenes y notas",
      "Modo examen simulado con retroalimentación inmediata",
    ],
    color: "#FF2E93",
    icon: Brain,
  },
  {
    id: "step-social",
    badge: "04 // ESTUDIO COOPERATIVO",
    badgeColor: "green",
    title: "Comunidad, salas 24/7 y duelos de preguntas en vivo",
    subtitle: "Estudiar en solitario quedó en el pasado",
    description:
      "Unite a salas virtuales de estudio con estudiantes de tu facultad. Compartí resúmenes verificados, desafiá a tus compañeros en duelos de preguntas rápidas y subí en el ranking nacional.",
    highlights: [
      "Salas de estudio con audio ambiental sincronizado",
      "Marketplace colaborativo de apuntes y exámenes pasados",
      "Tabetalk: debate dudas puntuales con tu comunidad",
    ],
    color: "#48bd22",
    icon: Users,
  },
];

export function ScrollStoryShowcase() {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const { triggerBurst } = useComic();

  // Flip card state for step 2
  const [isFlipped, setIsFlipped] = useState(false);
  // Interactive Pomodoro state for step 1
  const [pomodoroRunning, setPomodoroRunning] = useState(true);

  // Scroll-driven chapter advancement
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.8", "end 0.2"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // 4 chapters: divide progress [0, 1] into 4 zones
    const stepCount = STORY_STEPS.length;
    const computedIndex = Math.min(
      stepCount - 1,
      Math.max(0, Math.floor(latest * stepCount))
    );
    setActiveStep(computedIndex);
  });

  const handleStepClick = (index: number) => {
    setActiveStep(index);
    ComicAudio.playPowerUp();
  };

  const handleBurst = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, text);
    ComicAudio.playPowerUp();
  };

  const currentStep = STORY_STEPS[activeStep];

  return (
    <section
      ref={sectionRef}
      id="story-journey"
      className="relative bg-background text-foreground py-24 md:py-32 px-4 md:px-8 border-b-4 border-black overflow-hidden"
    >
      {/* Background Comic Grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Header Banner */}
      <div className="container mx-auto text-center max-w-3xl mb-12">
        <KineticHeading
          as="h2"
          effect="comic-pop"
          badge="RECORRIDO INTERACTIVO TABE"
          badgeColor="yellow"
          className="text-3xl md:text-5xl font-black uppercase tracking-tight text-foreground"
        >
          CÓMO TABE TRANSFORMA TU{" "}
          <motion.span
            whileHover={{ scale: 1.08, rotate: -2 }}
            className="text-[#1475e5] underline decoration-wavy decoration-[#ff9415] inline-block cursor-pointer"
          >
            VIDA UNIVERSITARIA
          </motion.span>
        </KineticHeading>
        <p className="mt-3 text-muted-foreground font-medium text-sm md:text-base max-w-xl mx-auto">
          Explorá los 4 pilares fundamentales diseñados para aprobar sin noches en vela.
        </p>

        {/* Interactive Step Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
          {STORY_STEPS.map((step, idx) => {
            const isActive = activeStep === idx;
            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black dark:border-zinc-700 font-black text-xs md:text-sm uppercase tracking-wide transition-all shadow-[2px_2px_0_0_#000] dark:shadow-none cursor-pointer ${
                  isActive
                    ? "bg-[#FFE600] dark:bg-amber-400 text-zinc-950 shadow-[4px_4px_0_0_#000] dark:shadow-none -translate-y-0.5"
                    : "bg-white dark:bg-zinc-900 text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <step.icon className="w-4 h-4" />
                <span>Capítulo 0{idx + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Showcase Grid */}
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Chapters Navigation & Narrative */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {STORY_STEPS.map((step, idx) => {
              const isActive = activeStep === idx;
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.id}
                  onClick={() => handleStepClick(idx)}
                  whileHover={{ scale: 1.01 }}
                  className={`cursor-pointer rounded-2xl p-5 border-3 transition-all duration-300 relative select-none ${
                    isActive
                      ? "bg-white dark:bg-zinc-900 border-black shadow-[6px_6px_0_0_#000]"
                      : "bg-white/60 dark:bg-zinc-900/40 border-zinc-300 dark:border-zinc-800 opacity-60 hover:opacity-100"
                  }`}
                  style={{
                    borderColor: isActive ? "black" : undefined,
                  }}
                >
                  {/* Active Indicator Strip */}
                  {isActive && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute left-0 top-0 bottom-0 w-2.5 rounded-l-xl"
                      style={{ backgroundColor: step.color }}
                    />
                  )}

                  <div className="flex items-center justify-between mb-2 pl-2">
                    <ComicBadge variant={step.badgeColor} size="sm">
                      {step.badge}
                    </ComicBadge>
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center border-2 border-black"
                      style={{
                        backgroundColor: isActive ? step.color : "transparent",
                        color: isActive ? "#fff" : "currentColor",
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3
                    className={`text-base md:text-lg font-black uppercase tracking-tight pl-2 ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </h3>

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pl-2 mt-3 space-y-3 overflow-hidden text-sm"
                      >
                        <p className="text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>

                        <div className="space-y-1.5 pt-1">
                          {step.highlights.map((hl, hIdx) => (
                            <div
                              key={hIdx}
                              className="flex items-center gap-2 text-xs font-semibold"
                            >
                              <CheckCircle2
                                className="w-3.5 h-3.5 shrink-0"
                                style={{ color: step.color }}
                              />
                              <span>{hl}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Right Column: Interactive Stage */}
          <div className="lg:col-span-7">
            <div className="relative rounded-3xl border-4 border-black bg-white dark:bg-zinc-950 p-6 md:p-8 shadow-[8px_8px_0_0_#000] overflow-hidden min-h-[460px] flex flex-col justify-between">
              {/* Halftone Top Corner Accent */}
              <div
                className="absolute top-0 right-0 w-36 h-36 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle, #000 2px, transparent 2px)`,
                  backgroundSize: "10px 10px",
                }}
              />

              {/* Dynamic Interactive Stage Content */}
              <AnimatePresence mode="wait">
                {activeStep === 0 && (
                  <motion.div
                    key="stage-0"
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between border-b-2 border-black/10 pb-4">
                      <div>
                        <span className="text-xs font-black uppercase text-[#1475e5] tracking-wider">
                          Simulador en Vivo
                        </span>
                        <h4 className="text-lg font-black uppercase text-foreground">
                          Grafo de Correlatividades Inteligente
                        </h4>
                      </div>
                      <ComicBadge
                        variant="yellow"
                        size="sm"
                        className="cursor-pointer inline-flex items-center gap-1"
                        onClick={(e) => handleBurst(e, "¡ALGORITMO 10/10!")}
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>IA PREDICTOR</span>
                      </ComicBadge>
                    </div>

                    {/* Interactive Node Graph Mockup */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { name: "Álgebra Lineal", grade: "10 / 10", status: "Aprobada", color: "#48bd22" },
                        { name: "Análisis Mat. I", grade: "9 / 10", status: "Aprobada", color: "#48bd22" },
                        { name: "Algoritmos I", grade: "En curso", status: "82% avance", color: "#1475e5" },
                        { name: "Física Clásica", grade: "En curso", status: "Parcial pronto", color: "#ff9415" },
                        { name: "Estructuras II", grade: "Bloqueada", status: "Falta Algoritmos", color: "#888" },
                        { name: "Base de Datos", grade: "Recomendada", status: "Prioridad Alta", color: "#FF2E93" },
                      ].map((node, nIdx) => (
                        <motion.div
                          key={nIdx}
                          whileHover={{ scale: 1.04, y: -2 }}
                          className="p-3 rounded-xl border-2 border-black bg-zinc-50 dark:bg-zinc-900 shadow-[3px_3px_0_0_#000] cursor-pointer"
                          onClick={(e) => handleBurst(e, node.name.toUpperCase())}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: node.color }}
                            />
                            <span className="text-[10px] font-black uppercase text-muted-foreground">
                              {node.status}
                            </span>
                          </div>
                          <p className="text-xs font-black leading-tight text-foreground">
                            {node.name}
                          </p>
                          <p className="text-[11px] font-bold mt-1" style={{ color: node.color }}>
                            {node.grade}
                          </p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Dynamic KPI Bar */}
                    <div className="p-4 rounded-2xl bg-[#1475e5]/10 border-2 border-dashed border-[#1475e5] flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase text-[#1475e5]">
                          Avance de Carrera Estimado
                        </p>
                        <p className="text-xl font-black text-foreground">
                          24 de 36 Materias (67%)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ComicBadge variant="green" size="sm">
                          GPA 9.4 / 10
                        </ComicBadge>
                        <span className="text-xs font-bold text-muted-foreground">
                          Graduación estimada: Dic 2027
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeStep === 1 && (
                  <motion.div
                    key="stage-1"
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between border-b-2 border-black/10 pb-4">
                      <div>
                        <span className="text-xs font-black uppercase text-[#ff9415] tracking-wider">
                          Gamificación & Enfoque
                        </span>
                        <h4 className="text-lg font-black uppercase text-foreground">
                          Pomodoro Cósmico & Mi Bosque
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-[#ff9415]/20 border-2 border-black rounded-lg text-xs font-black">
                        <Flame className="w-4 h-4 text-[#ff9415] fill-[#ff9415]" />
                        <span>RACHA x14 DÍAS</span>
                      </div>
                    </div>

                    {/* Interactive Pomodoro Console */}
                    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
                      {/* Radial Progress Graphic */}
                      <div className="relative w-40 h-40 flex items-center justify-center">
                        <svg className="w-40 h-40 -rotate-90">
                          <circle
                            cx="80"
                            cy="80"
                            r="68"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="opacity-15"
                          />
                          <motion.circle
                            cx="80"
                            cy="80"
                            r="68"
                            stroke="#ff9415"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray="427.2"
                            strokeDashoffset={pomodoroRunning ? 80 : 200}
                            strokeLinecap="round"
                            transition={{ duration: 0.8 }}
                          />
                        </svg>

                        <div className="absolute flex flex-col items-center">
                          <span className="text-3xl font-black tracking-tight text-foreground">
                            24:18
                          </span>
                          <span className="text-[11px] font-bold text-muted-foreground uppercase">
                            Sesión Activa
                          </span>
                        </div>
                      </div>

                      {/* Mascot Status & Bonsai State */}
                      <div className="space-y-3 max-w-xs text-center sm:text-left">
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000]">
                          <div className="flex items-center gap-2 mb-1">
                            <TreePine className="w-5 h-5 text-emerald-500 shrink-0" />
                            <span className="text-xs font-black uppercase">
                              Bonsái Roble Dorado
                            </span>
                          </div>
                          <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2.5 rounded-full overflow-hidden border border-black">
                            <div className="bg-[#48bd22] h-full w-[85%]" />
                          </div>
                          <p className="text-[10px] text-right font-black mt-1 text-[#48bd22]">
                            85% crecido (+150 XP)
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setPomodoroRunning(!pomodoroRunning);
                              ComicAudio.playPop();
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[#FFE600] dark:bg-amber-400 text-zinc-950 border-2 border-black dark:border-amber-400/50 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0_0_#000] dark:shadow-none hover:bg-[#ffea33] dark:hover:bg-amber-300"
                          >
                            <Play className="w-3.5 h-3.5 fill-current text-zinc-950" />
                            {pomodoroRunning ? "Pausar" : "Reanudar"}
                          </button>

                          <button
                            onClick={(e) => handleBurst(e, "¡+50 COINS!")}
                            className="p-2 border-2 border-black rounded-xl bg-white dark:bg-zinc-800 shadow-[2px_2px_0_0_#000]"
                            title="Reclamar bonus"
                          >
                            <Sparkles className="w-4 h-4 text-[#ff9415]" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border-2 border-black flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-[#1475e5]" />
                        Música: Lofi Chill University Vibes
                      </span>
                      <span className="text-[#48bd22] font-black">EN REPRODUCCIÓN</span>
                    </div>
                  </motion.div>
                )}

                {activeStep === 2 && (
                  <motion.div
                    key="stage-2"
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between border-b-2 border-black/10 pb-4">
                      <div>
                        <span className="text-xs font-black uppercase text-[#FF2E93] tracking-wider">
                          Algoritmo SRS Inteligente
                        </span>
                        <h4 className="text-lg font-black uppercase text-foreground">
                          Flashcards 3D con Repetición Óptima
                        </h4>
                      </div>
                      <ComicBadge variant="pink" size="sm">
                        RETENCIÓN 98%
                      </ComicBadge>
                    </div>

                    {/* Interactive 3D Flip Card */}
                    <div
                      className="cursor-pointer perspective-1000 min-h-[170px]"
                      onClick={() => {
                        setIsFlipped(!isFlipped);
                        ComicAudio.playPop();
                      }}
                    >
                      <motion.div
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="relative w-full min-h-[170px] p-6 rounded-2xl border-3 border-black shadow-[5px_5px_0_0_#000] bg-[#FFF5F9] dark:bg-zinc-900 flex flex-col justify-between"
                        style={{ transformStyle: "preserve-3d" }}
                      >
                        {!isFlipped ? (
                          <div>
                            <div className="flex items-center justify-between text-xs font-black uppercase text-[#FF2E93] mb-3">
                              <span>PREGUNTA #14 (ANÁLISIS MATEMÁTICO)</span>
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <RefreshCw className="w-3 h-3" /> Hacé click para voltear
                              </span>
                            </div>
                            <p className="text-base md:text-lg font-black text-foreground">
                              ¿Bajo qué condiciones una función f(x) es diferenciable en un punto x₀?
                            </p>
                          </div>
                        ) : (
                          <div style={{ transform: "rotateY(180deg)" }}>
                            <div className="flex items-center justify-between text-xs font-black uppercase text-[#48bd22] mb-3">
                              <span>RESPUESTA COMPROBADA</span>
                              <span className="text-muted-foreground">Click para volver</span>
                            </div>
                            <p className="text-sm md:text-base font-bold text-foreground">
                              Debe ser continua en x₀ y existir el límite del cociente incremental:
                              lim(h→0) [f(x₀+h) - f(x₀)] / h.
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-black/10 text-xs font-black">
                          <span className="text-muted-foreground">Mazo: Finales Regulares 2026</span>
                          <span className="text-[#FF2E93]">Dificultad: Moderada</span>
                        </div>
                      </motion.div>
                    </div>

                    {/* SRS Feedback Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "DIFÍCIL", days: "1 día", color: "#FF2E93", word: "¡REPASO PRONTO!" },
                        { label: "BIEN", days: "4 días", color: "#1475e5", word: "¡SÓLIDO!" },
                        { label: "FÁCIL", days: "14 días", color: "#48bd22", word: "¡DOMINADO!" },
                      ].map((btn, bIdx) => (
                        <button
                          key={bIdx}
                          onClick={(e) => handleBurst(e, btn.word)}
                          className="p-2.5 rounded-xl border-2 border-black bg-white dark:bg-zinc-800 shadow-[2px_2px_0_0_#000] text-center hover:bg-zinc-100 transition-colors cursor-pointer"
                        >
                          <p className="text-xs font-black" style={{ color: btn.color }}>
                            {btn.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-bold">
                            Próximo: {btn.days}
                          </p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeStep === 3 && (
                  <motion.div
                    key="stage-3"
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between border-b-2 border-black/10 pb-4">
                      <div>
                        <span className="text-xs font-black uppercase text-[#48bd22] tracking-wider">
                          Estudio Cooperativo
                        </span>
                        <h4 className="text-lg font-black uppercase text-foreground">
                          Salas de Estudio 24/7 & Tabetalk
                        </h4>
                      </div>
                      <ComicBadge variant="green" size="sm">
                        +148 ONLINE
                      </ComicBadge>
                    </div>

                    {/* Live Room Avatars & Stream Mock */}
                    <div className="p-4 rounded-2xl border-2 border-black bg-zinc-50 dark:bg-zinc-900 shadow-[3px_3px_0_0_#000] space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-foreground">
                          SALA: "BIBLIOTECA VIRTUAL // INGENIERÍA & EXACTAS"
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#48bd22] animate-pulse" />
                          <span className="text-[11px] font-bold text-[#48bd22]">EN VIVO</span>
                        </div>
                      </div>

                      {/* Participants Avatars */}
                      <div className="flex items-center gap-3">
                        {[
                          { name: "Lucía M.", status: "Resolviendo Guía 4", icon: Laptop, iconColor: "text-blue-500" },
                          { name: "Tomás R.", status: "Pomodoro #3", icon: GraduationCap, iconColor: "text-amber-500" },
                          { name: "Camila V.", status: "Flashcards Activas", icon: Sparkles, iconColor: "text-pink-500" },
                        ].map((usr, uIdx) => {
                          const UsrIcon = usr.icon;
                          return (
                            <div
                              key={uIdx}
                              className="flex items-center gap-2 p-2 rounded-xl border border-black dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs shadow-xs"
                            >
                              <div className="w-7 h-7 rounded-lg bg-secondary/80 flex items-center justify-center shrink-0">
                                <UsrIcon className={`w-3.5 h-3.5 ${usr.iconColor}`} />
                              </div>
                              <div>
                                <p className="font-black leading-none">{usr.name}</p>
                                <p className="text-[10px] text-muted-foreground">{usr.status}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Live Audio Waves */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-black">
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-[#1475e5]" /> Canal de Audio Silencioso
                        </span>
                        <div className="flex items-center gap-1">
                          {[16, 24, 12, 28, 18, 8, 22].map((height, i) => (
                            <motion.div
                              key={i}
                              className="w-1 bg-[#1475e5] rounded-full"
                              animate={{ height: [8, height, 8] }}
                              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Quick Challenge CTA Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => handleBurst(e, "¡DUELO INICIADO!")}
                      className="w-full py-3.5 px-4 bg-[#FFE600] dark:bg-amber-400 text-zinc-950 border-3 border-black dark:border-amber-400/50 rounded-2xl shadow-[4px_4px_0_0_#000] dark:shadow-none font-black uppercase text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-[#ffea33] dark:hover:bg-amber-300 cursor-pointer"
                    >
                      <Trophy className="w-4 h-4 fill-current text-zinc-950" />
                      Lanzar Desafío 1v1 con tu Grupo de Estudio
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Interactive Ribbon */}
              <div className="mt-6 pt-4 border-t-2 border-black/10 flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Capítulo {activeStep + 1} de {STORY_STEPS.length}</span>
                <button
                  onClick={() => handleStepClick((activeStep + 1) % STORY_STEPS.length)}
                  className="text-[#1475e5] hover:text-foreground font-black flex items-center gap-1 cursor-pointer"
                >
                  Siguiente capítulo <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
