import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, ArrowUpRight, Compass, Timer, Brain, Users, Zap, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useComic } from "@/components/comic/ComicEffectsProvider";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { KineticHeading } from "@/components/ui/kinetic-heading";
import { TextScatter } from "@/components/ui/text-scatter";

interface ShowcaseProject {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  tag: string;
  color: string;
  accentBg: string;
  icon: typeof Compass;
  stat: string;
}

const PROJECTS: ShowcaseProject[] = [
  {
    id: "mapa",
    number: "01",
    title: "MAPA VIVO // CORRELATIVIDADES",
    subtitle: "Un instrumento dinámico para leer tu carrera y graduarte sin materias trabadas.",
    tag: "PLANIFICACIÓN IA",
    color: "#1475e5",
    accentBg: "from-blue-600/15 to-transparent",
    icon: Compass,
    stat: "100% materias organizadas",
  },
  {
    id: "bosque",
    number: "02",
    title: "BOSQUE FOCUS // GAMIFICACIÓN",
    subtitle: "Transformá el estudio en un RPG: cada bloque Pomodoro hace crecer tu bosque virtual.",
    tag: "ANTI-PROCRASTINACIÓN",
    color: "#ff9415",
    accentBg: "from-amber-600/15 to-transparent",
    icon: Timer,
    stat: "x3.5 retención con racha",
  },
  {
    id: "flashcards",
    number: "03",
    title: "MEMORIA 3D // ALGORITMO FSRS",
    subtitle: "Ciencia cognitiva aplicada: repasa en el momento matemático exacto antes de olvidar.",
    tag: "CIENCIA COGNITIVA",
    color: "#FF2E93",
    accentBg: "from-pink-600/15 to-transparent",
    icon: Brain,
    stat: "98% retención a largo plazo",
  },
  {
    id: "tabetalk",
    number: "04",
    title: "TABETALK // SALAS 24/7",
    subtitle: "Salas de estudio colaborativo con estudiantes de tu facultad y duelos académicos.",
    tag: "ESTUDIO COOPERATIVO",
    color: "#48bd22",
    accentBg: "from-green-600/15 to-transparent",
    icon: Users,
    stat: "+350 alumnos en vivo",
  },
];

export function EditorialManifestoSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { triggerBurst } = useComic();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const stickerY1 = useTransform(scrollYProgress, [0, 1], [-30, 40]);
  const stickerY2 = useTransform(scrollYProgress, [0, 1], [40, -30]);

  const handleBurst = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, word);
    ComicAudio.playPowerUp();
  };

  return (
    <section
      ref={containerRef}
      className="relative py-24 md:py-36 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white overflow-hidden border-y-8 border-black dark:border-zinc-800 select-none transition-colors duration-300"
    >
      {/* Background Subtle Halftone Grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1.5px, transparent 1.5px)`,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Floating Parallax Kinetic Stickers */}
      <motion.div
        style={{ y: stickerY1 }}
        className="absolute top-12 left-6 md:left-16 z-20 hidden sm:block pointer-events-auto cursor-pointer"
        onClick={(e) => handleBurst(e, "¡0% DISTRACCIÓN!")}
        data-cursor-text="BOOM"
      >
        <div className="px-4 py-2 bg-amber-400 text-zinc-950 font-black text-xs md:text-sm uppercase rounded-xl border-3 border-black dark:border-amber-400/50 shadow-[4px_4px_0_0_#000] dark:shadow-none -rotate-6 hover:scale-110 transition-transform inline-flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>0% DISTRACCIÓN</span>
        </div>
      </motion.div>

      <motion.div
        style={{ y: stickerY2 }}
        className="absolute top-20 right-6 md:right-20 z-20 hidden sm:block pointer-events-auto cursor-pointer"
        onClick={(e) => handleBurst(e, "¡FINES LIBRES!")}
        data-cursor-text="LEVEL UP"
      >
        <div className="px-4 py-2 bg-pink-500 text-white font-black text-xs md:text-sm uppercase rounded-xl border-3 border-black dark:border-pink-400/50 shadow-[4px_4px_0_0_#000] dark:shadow-none rotate-6 hover:scale-110 transition-transform inline-flex items-center gap-1.5">
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>FINES DE SEMANA LIBRES</span>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 md:px-8 max-w-6xl relative z-10 space-y-20">
        {/* Kinetic Manifesto Header (Nothin style statement) */}
        <div className="space-y-6 max-w-4xl">
          <KineticHeading
            as="h2"
            effect="strike-highlight"
            badge="FILOSOFÍA TABE // MANIFIESTO ESTUDIANTIL"
            badgeColor="yellow"
            className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tight leading-[1.05]"
          >
            La mayoría de las apps te exigen{" "}
            <motion.span
              whileHover={{ scale: 1.08, rotate: -2 }}
              className="text-zinc-400 dark:text-zinc-500 line-through decoration-red-500 decoration-4 inline-block cursor-pointer px-1"
            >
              más horas
            </motion.span>
            .
          </KineticHeading>

          <h3 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tight leading-[1.05] text-[#1475e5] dark:text-[#00E5FF]">
            TABE te devuelve tus{" "}
            <span className="inline-block text-[#FF2E93] dark:text-[#FFE600] underline decoration-[#1475e5] decoration-wavy cursor-pointer">
              <TextScatter text="fines de semana" velocity={90} rotation={25} />
            </span>
            .
          </h3>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-base sm:text-xl text-zinc-600 dark:text-zinc-300 font-medium max-w-2xl pt-2 leading-relaxed"
          >
            Estudiar sin estrategia es una ruleta rusa de parciales. Con ciencia cognitiva, mapas de correlatividades y gamificación, aprobar se vuelve inevitable.
          </motion.p>
        </div>

        {/* Divider Bar */}
        <div className="w-full h-1.5 bg-gradient-to-r from-[#1475e5] via-[#ff9415] to-[#48bd22] rounded-full opacity-80" />

        {/* Noth.in Style Interactive Works/Modules Reel */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              [ MÓDULOS ACTIVOS // TABE ECOSYSTEM ]
            </span>
            <span className="text-xs font-bold text-[#ff9415] dark:text-[#FFE600] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" /> 4 HERRAMIENTAS INTEGRADAS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PROJECTS.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  onClick={(e) => handleBurst(e, item.title.split("//")[0].trim())}
                  data-cursor-text="EXPLORAR"
                  className="group relative rounded-3xl border-3 border-zinc-300 dark:border-zinc-800 hover:border-black dark:hover:border-zinc-600 bg-white dark:bg-zinc-900/90 p-8 flex flex-col justify-between min-h-[260px] overflow-hidden transition-all duration-300 shadow-[4px_4px_0_0_#000] dark:shadow-none hover:shadow-[8px_8px_0_0_#1475e5] dark:hover:shadow-[0_8px_25px_rgba(20,117,229,0.3)] cursor-pointer"
                >
                  {/* Subtle Gradient Backlight */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${item.accentBg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                  />

                  {/* Header Row */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-3xl font-black text-zinc-400 dark:text-zinc-600 group-hover:text-black dark:group-hover:text-white transition-colors">
                      {item.number}
                    </span>
                    <span
                      className="px-3 py-1 rounded-full text-[11px] font-black uppercase border-2 border-black dark:border-white/20 shadow-[2px_2px_0_0_#000] dark:shadow-none"
                      style={{ backgroundColor: item.color, color: "#fff" }}
                    >
                      {item.tag}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 my-4 space-y-2">
                    <h4 className="text-xl md:text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white group-hover:text-[#1475e5] dark:group-hover:text-amber-300 transition-colors flex items-center gap-2">
                      <Icon className="w-5 h-5 shrink-0" style={{ color: item.color }} />
                      {item.title}
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                      {item.subtitle}
                    </p>
                  </div>

                  {/* Footer Row */}
                  <div className="relative z-10 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    <span className="text-[#48bd22] dark:text-emerald-400 font-black">{item.stat}</span>
                    <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-zinc-900 dark:text-white font-black">
                      Explorar módulo <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA Button */}
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <Link
            to="/registro"
            data-cursor-text="UNIRSE"
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#FFE600] dark:bg-amber-400 text-zinc-950 font-black text-sm uppercase tracking-wider border-3 border-black dark:border-amber-400/50 shadow-[4px_4px_0_0_#000] dark:shadow-none hover:bg-white dark:hover:bg-amber-300 hover:translate-x-0.5 hover:-translate-y-0.5 transition-all"
          >
            <span>Sumate gratis a la comunidad</span>
            <ArrowUpRight className="w-5 h-5 group-hover:rotate-45 transition-transform" />
          </Link>

          <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full bg-[#48bd22] dark:bg-[#00FF66] animate-pulse" />
            <span>Más de 350 estudiantes activos hoy</span>
          </div>
        </div>
      </div>
    </section>
  );
}
