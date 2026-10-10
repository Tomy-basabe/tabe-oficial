import { useState } from "react";
import { ArrowRight, CheckCircle2, BookOpen, Sparkles, Flame, Zap, Heart, GraduationCap, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { useComic } from "@/components/comic/ComicEffectsProvider";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { TextScrollAnimation } from "@/components/ui/text-scroll-animation";
import { KineticHeading } from "@/components/ui/kinetic-heading";
import { TextScatter } from "@/components/ui/text-scatter";
import { ShatterType } from "@/components/ui/shatter-type";
import { LetterSwap3D } from "@/components/ui/3d-letter-swap";

const MASCOT_QUOTES = [
  "¡Hacé click en mí para ganar +50 XP!",
  "¡Bienvenido a TABE! Estudiar nunca fue tan ágil y entretenido.",
  "¡Modo Cómic Activado! Tocá cualquier elemento para interactuar.",
  "¡Menos estrés, mejores notas! Sumate a la comunidad universitaria.",
  "¡Organizate como un profesional y disfrutá tus fines de semana!",
];

export function HeroSection() {
  const { triggerBurst } = useComic();
  const [mascotQuoteIndex, setMascotQuoteIndex] = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  const [studentsCount, setStudentsCount] = useState(350);
  const [mascotBounce, setMascotBounce] = useState(0);
  const [mascotSkin, setMascotSkin] = useState<"normal" | "turbo" | "200iq">("normal");

  const handleMascotClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Cycle skins
    const nextSkin = mascotSkin === "normal" ? "turbo" : mascotSkin === "turbo" ? "200iq" : "normal";
    setMascotSkin(nextSkin);

    const burstWords = {
      normal: "TABE POWER!",
      turbo: "TURBO FOCUS!",
      "200iq": "MAX PRODUCTIVIDAD!",
    };
    triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, burstWords[nextSkin]);
    ComicAudio.playPowerUp();

    setMascotQuoteIndex((prev) => (prev + 1) % MASCOT_QUOTES.length);
    setShowBubble(true);
    setMascotBounce((prev) => prev + 1);
  };

  const handleStickerClick = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, word);
    ComicAudio.playPop();
  };

  const handleLikeStudents = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, "+1 ESTUDIANTE!");
    ComicAudio.playPop();
    setStudentsCount((prev) => prev + 1);
  };

  return (
    <section id="hero" className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
      {/* Halftone & decorative bars */}
      <motion.div
        animate={{ x: [0, 20, 0] }}
        transition={{ repeat: Infinity, duration: 4 }}
        className="absolute top-24 left-[5%] w-20 h-[6px] bg-[#ff9415] rounded-full -rotate-[17deg] opacity-60 pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, -20, 0] }}
        transition={{ repeat: Infinity, duration: 5 }}
        className="absolute top-20 right-[8%] w-16 h-[6px] bg-[#1475e5] rounded-full -rotate-[17deg] opacity-50 pointer-events-none"
      />
      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ repeat: Infinity, duration: 6 }}
        className="absolute bottom-28 right-[6%] w-20 h-[6px] bg-[#ff9415] rounded-full -rotate-[17deg] opacity-50 pointer-events-none"
      />
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ repeat: Infinity, duration: 7 }}
        className="absolute bottom-40 left-[12%] w-6 h-[6px] bg-[#48bd22] rounded-full opacity-40 pointer-events-none"
      />

      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-20">
          {/* Text Left Column */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex-1 max-w-2xl space-y-7 text-center lg:text-left"
          >
            {/* Subtle Clean Badge */}
            <div className="flex items-center justify-center lg:justify-start">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card/60 backdrop-blur-xs text-xs font-semibold text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-[#1475e5]" />
                <span>Tu asistente de bolsillo estudiantil</span>
              </span>
            </div>

            {/* Headline with diverse interactive typography */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-black leading-[1.08] tracking-tight text-foreground">
              <TextScatter text="TABE" className="text-[#1475e5] mr-2" velocity={100} rotation={25} />
              : Estudiá con{" "}
              <span className="relative inline-block text-[#1475e5]">
                <TextScatter text="método" velocity={80} rotation={20} />
                <span className="absolute left-0 bottom-1 w-full h-1 bg-[#1475e5]/30 rounded-full" />
              </span>
              .{" "}
              <span className="relative inline-block text-[#ff9415] mx-1">
                <ShatterType text="Aprobá" className="text-[#ff9415]" shardsCount={14} burstDistance={90} />
                <span className="absolute left-0 bottom-1 w-full h-1 bg-[#ff9415]/30 rounded-full" />
              </span>{" "}
              con{" "}
              <span className="relative inline-block text-[#48bd22]">
                <LetterSwap3D label="estilo" flipDirection="top" className="text-[#48bd22]" />
                <span className="absolute left-0 bottom-1 w-full h-1 bg-[#48bd22]/30 rounded-full" />
              </span>
              .
            </h1>

            {/* Subtitle with Text Scroll Animation */}
            <div className="max-w-lg mx-auto lg:mx-0">
              <TextScrollAnimation
                text="Tu asistente de bolsillo estudiantil: la plataforma todo‑en‑uno que combina organización académica, gamificación y diseño interactivo para que domines tus materias sin aburrirte."
                className="text-lg md:text-xl font-bold justify-center lg:justify-start"
                wordClassName="text-muted-foreground"
                highlightWords={["organización", "gamificación", "interactivo", "domines"]}
                highlightColor="#1475e5"
              />
            </div>

            {/* CTAs — Inked neo-brutalist buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/registro"
                  data-cursor-text="GRATIS"
                  className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-foreground text-background rounded-xl font-black text-lg border-2 border-foreground shadow-[4px_4px_0_0_#ff9415] transition-all duration-200 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#ff9415] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#ff9415]"
                >
                  Empezar Gratis
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1.5" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/carreras"
                  data-cursor-text="EXPLORAR"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-card text-foreground rounded-xl font-black text-lg border-2 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-all duration-200 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_hsl(var(--foreground))] active:translate-y-0.5 active:shadow-none"
                >
                  <BookOpen className="w-5 h-5 text-[#1475e5]" />
                  Ver Carreras
                </Link>
              </motion.div>
            </div>

            {/* Trust Pills with Interactive hover */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-2 text-sm font-black text-muted-foreground">
              {["Acceso inmediato", "Validado por alumnos", "100% gratuito"].map((t) => (
                <motion.span
                  key={t}
                  whileHover={{ scale: 1.08, y: -2 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border-2 border-border shadow-[2px_2px_0_0_hsl(var(--border))] cursor-pointer transition-colors hover:text-foreground select-none"
                  onClick={(e) => handleStickerClick(e, "GENIAL!")}
                >
                  <CheckCircle2 className="w-4 h-4 text-[#48bd22]" />
                  {t}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Interactive Mascot & Comic Visual Column Right */}
          <div className="flex-shrink-0 relative flex flex-col items-center select-none">
            {/* Mascot Interactive Speech Bubble */}
            <AnimatePresence>
              {showBubble && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute -top-16 md:-top-20 z-30 px-4 py-2.5 rounded-2xl bg-[#FFE600] dark:bg-amber-400 text-zinc-950 font-black text-xs md:text-sm border-2 border-black dark:border-amber-400/50 shadow-[4px_4px_0_0_#000] dark:shadow-none max-w-xs text-center"
                >
                  {MASCOT_QUOTES[mascotQuoteIndex]}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black dark:border-t-amber-400" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Interactive Mascot with spring tap */}
            <motion.div
              key={mascotBounce}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.9, rotate: -6 }}
              onClick={handleMascotClick}
              data-cursor-text="+50 XP"
              className="relative cursor-pointer group"
              title="¡Hacé click en la mascota para cambiar su modo y ganar XP!"
            >
              {/* Electric / Turbo Saiyan Aura */}
              {mascotSkin === "turbo" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 -m-8 rounded-full bg-gradient-to-r from-[#00E5FF]/30 via-[#1475e5]/40 to-[#00FF66]/30 blur-2xl pointer-events-none"
                />
              )}

              {/* 200 IQ Golden Galaxy Aura */}
              {mascotSkin === "200iq" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: [1, 1.12, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 -m-8 rounded-full bg-gradient-to-r from-[#FFE600]/40 via-[#FF6B00]/30 to-[#FFE600]/40 blur-2xl pointer-events-none"
                />
              )}

              <motion.img
                animate={{ y: [0, -12, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                src="/logo.png"
                alt="TABE Mascota"
                className="w-56 h-56 md:w-72 md:h-72 lg:w-[380px] lg:h-[380px] object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.25)] relative z-10"
              />

              {/* Skin indicator badge on mascot */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-95 transition-opacity z-20">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 text-amber-300 dark:text-amber-200 font-black text-[10px] tracking-wider uppercase border border-amber-300/40 shadow-sm whitespace-nowrap backdrop-blur-xs">
                  {mascotSkin === "normal" && (
                    <>
                      <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
                      <span>MODO ESTUDIANTE</span>
                    </>
                  )}
                  {mascotSkin === "turbo" && (
                    <>
                      <Zap className="w-3.5 h-3.5 text-cyan-300 fill-current" />
                      <span>MODO ENFOQUE TURBO</span>
                    </>
                  )}
                  {mascotSkin === "200iq" && (
                    <>
                      <Brain className="w-3.5 h-3.5 text-orange-300" />
                      <span>MODO MENTE MAESTRA</span>
                    </>
                  )}
                </span>
              </div>
            </motion.div>

            {/* Mascot Comic Skin Selector Bar */}
            <div className="flex items-center gap-1.5 mt-4 p-1.5 rounded-xl bg-card border border-border shadow-sm z-20 select-none">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMascotSkin("normal");
                  ComicAudio.playPop();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-[10px] uppercase transition-all ${
                  mascotSkin === "normal"
                    ? "bg-[#FFE600] dark:bg-amber-400 text-zinc-950 shadow-xs font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GraduationCap className="w-3 h-3" />
                <span>Normal</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMascotSkin("turbo");
                  ComicAudio.playPowerUp();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-[10px] uppercase transition-all ${
                  mascotSkin === "turbo"
                    ? "bg-[#00E5FF] dark:bg-cyan-400 text-zinc-950 shadow-xs font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>Turbo</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMascotSkin("200iq");
                  ComicAudio.playPowerUp();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-[10px] uppercase transition-all ${
                  mascotSkin === "200iq"
                    ? "bg-[#FF6B00] dark:bg-orange-500 text-white shadow-xs font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Brain className="w-3 h-3" />
                <span>Pro Focus</span>
              </button>
            </div>

            {/* Clean badges floating around mascot */}
            <div className="absolute -top-3 right-0 sm:right-2 z-20">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold text-xs backdrop-blur-xs shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>100% Gratuito</span>
              </span>
            </div>

            <div className="absolute top-8 -left-4 sm:-left-8 z-20">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold text-xs backdrop-blur-xs shadow-xs">
                <Flame className="w-3.5 h-3.5" />
                <span>+350 alumnos</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
