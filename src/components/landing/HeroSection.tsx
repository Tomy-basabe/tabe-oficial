import { useState } from "react";
import { ArrowRight, CheckCircle2, BookOpen, Sparkles, Flame, Zap, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { useComic } from "@/components/comic/ComicEffectsProvider";
import { ComicAudio } from "@/components/comic/ComicAudio";

const MASCOT_QUOTES = [
  "¡Hacé click en mí para ganar +50 XP! ⚡",
  "¡Bienvenido a TABE! Estudiar nunca fue tan entretenido 🎮",
  "¡Modo Cómic Activado! Mirá cómo explotan las viñetas 💥",
  "¡Menos estrés, mejores notas! Sumate a la comunidad 🚀",
  "¡Organizate como un pro y disfrutá tus findes! 🎯",
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
      turbo: "⚡ TURBO SAIYAN!",
      "200iq": "🧠 200 IQ GALAXY!",
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
    <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
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
            {/* Comic Pill Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
              <ComicBadge
                variant="yellow"
                rotate="left"
                size="md"
                className="cursor-pointer"
                onClick={(e) => handleStickerClick(e, "OFICIAL!")}
              >
                <Sparkles className="w-3.5 h-3.5 fill-black" /> PLATAFORMA UNIVERSITARIA
              </ComicBadge>

              <ComicBadge
                variant="cyan"
                rotate="right"
                size="sm"
                className="cursor-pointer hidden sm:inline-flex"
                onClick={(e) => handleStickerClick(e, "POP ART!")}
              >
                <Zap className="w-3 h-3 fill-black" /> ESTILO DIBUJOS & CÓMIC
              </ComicBadge>
            </div>

            {/* Headline with interactive words */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-black leading-[1.05] tracking-tight text-foreground">
              Estudiá con{" "}
              <span className="relative inline-block cursor-pointer group">
                <span className="relative z-10 transition-colors duration-200 group-hover:text-[#1475e5]">
                  método.
                </span>
                <span className="absolute left-0 bottom-1.5 w-0 h-3 bg-[#1475e5]/25 -rotate-1 rounded-sm -z-0 transition-all duration-300 group-hover:w-full" />
              </span>{" "}
              <motion.span
                whileHover={{ scale: 1.1, rotate: -3 }}
                className="relative inline-block text-[#ff9415] cursor-pointer drop-shadow-sm px-1"
                onClick={(e) => handleStickerClick(e, "APROBADO!")}
              >
                <span className="relative z-10">Aprobá</span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  className="absolute inset-x-0 -bottom-1 h-3 bg-[#ff9415]/20 -rotate-2 rounded-md origin-left transition-transform duration-200"
                />
              </motion.span>{" "}
              <span className="relative inline-block cursor-pointer group">
                <span className="relative z-10 transition-colors duration-200 group-hover:text-[#48bd22]">
                  con estilo.
                </span>
                <span className="absolute left-0 bottom-1.5 w-0 h-3 bg-[#48bd22]/25 rotate-1 rounded-sm -z-0 transition-all duration-300 group-hover:w-full" />
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto lg:mx-0 font-bold">
              La plataforma todo‑en‑uno que combina organización académica, gamificación y diseño interactivo para que domines tus materias sin aburrirte.
            </p>

            {/* CTAs — Inked neo-brutalist buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/registro"
                  className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-foreground text-background rounded-xl font-black text-lg border-2 border-foreground shadow-[4px_4px_0_0_#ff9415] transition-all duration-200 hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#ff9415] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#ff9415]"
                >
                  Empezar Gratis
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1.5" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/carreras"
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
                  className="absolute -top-16 md:-top-20 z-30 px-4 py-2.5 rounded-2xl bg-[#FFE600] text-black font-black text-xs md:text-sm border-2 border-black shadow-[4px_4px_0_0_#000] max-w-xs text-center"
                >
                  {MASCOT_QUOTES[mascotQuoteIndex]}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black" />
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
                <span className="px-3 py-1 rounded-full bg-black text-[#FFE600] font-black text-[10px] tracking-wider uppercase border border-[#FFE600] shadow-[2px_2px_0_0_#000] whitespace-nowrap">
                  {mascotSkin === "normal" && "🎓 MODO ESTUDIANTE"}
                  {mascotSkin === "turbo" && "⚡ MODO TURBO SAIYAN"}
                  {mascotSkin === "200iq" && "🧠 MODO 200 IQ GALAXY"}
                </span>
              </div>
            </motion.div>

            {/* Mascot Comic Skin Selector Bar */}
            <div className="flex items-center gap-1.5 mt-4 p-1 rounded-xl bg-card border-2 border-foreground shadow-[2.5px_2.5px_0_0_#000] z-20 select-none">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMascotSkin("normal");
                  ComicAudio.playPop();
                }}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase transition-all ${
                  mascotSkin === "normal"
                    ? "bg-[#FFE600] text-black shadow-xs border border-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🎓 Normal
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMascotSkin("turbo");
                  ComicAudio.playPowerUp();
                }}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase transition-all ${
                  mascotSkin === "turbo"
                    ? "bg-[#00E5FF] text-black shadow-xs border border-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ⚡ Turbo
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMascotSkin("200iq");
                  ComicAudio.playPowerUp();
                }}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase transition-all ${
                  mascotSkin === "200iq"
                    ? "bg-[#FF6B00] text-white shadow-xs border border-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🧠 200 IQ
              </button>
            </div>

            {/* Interactive Comic Stickers Floating Around */}
            {/* Top-Right Sticker: 100% GRATIS */}
            <motion.div
              whileHover={{ scale: 1.15, rotate: 6 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => handleStickerClick(e, "100% GRATIS!")}
              className="absolute -top-4 right-0 sm:-right-2 md:right-2 z-20 cursor-pointer"
            >
              <ComicBadge variant="yellow" rotate="right" size="md">
                ✦ 100% GRATIS
              </ComicBadge>
            </motion.div>

            {/* Top-Left Sticker: +1.200 ALUMNOS (interactive counter) */}
            <motion.div
              whileHover={{ scale: 1.15, rotate: -6 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLikeStudents}
              className="absolute top-8 left-0 sm:-left-4 md:-left-8 z-20 cursor-pointer"
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF2E93] text-white font-black text-xs border-2 border-black shadow-[3px_3px_0_0_#000] -rotate-3 hover:rotate-0 transition-transform">
                <Flame className="w-4 h-4 fill-white" />
                <span>+{studentsCount.toLocaleString()} ALUMNOS</span>
              </div>
            </motion.div>

            {/* Bottom-Left Sticker: MODO TURBO */}
            <motion.div
              whileHover={{ scale: 1.15, rotate: 4 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => handleStickerClick(e, "TURBO ACTIVADO!")}
              className="absolute bottom-6 left-0 sm:-left-2 md:-left-6 z-20 cursor-pointer"
            >
              <ComicBadge variant="cyan" rotate="left" size="sm">
                <Zap className="w-3.5 h-3.5 fill-black" /> MODO TURBO
              </ComicBadge>
            </motion.div>

            {/* Bottom-Right Sticker: CERO DISTRACCIONES */}
            <motion.div
              whileHover={{ scale: 1.15, rotate: -4 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => handleStickerClick(e, "SIN DISTRACCIONES!")}
              className="absolute -bottom-2 right-1 sm:right-4 md:right-8 z-20 cursor-pointer"
            >
              <ComicBadge variant="green" rotate="right" size="sm">
                <Heart className="w-3.5 h-3.5 fill-black" /> CERO HUMO
              </ComicBadge>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
