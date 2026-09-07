import { Star, MessageCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { useComic } from "@/components/comic/ComicEffectsProvider";
import { ComicAudio } from "@/components/comic/ComicAudio";

const testimonials = [
  {
    name: "Valentina R.",
    career: "Ingeniería Industrial",
    quote: "TABE me ordenó la vida académica. El sistema de flashcards con repetición y las metas diarias hicieron que suba mi promedio a 9.2.",
    badge: "¡APROBÓ CON 10!",
    badgeColor: "yellow" as const,
    themeColor: "#ff9415",
    panelNumber: "VIÑETA #01",
    avatar: "👩‍🔬",
  },
  {
    name: "Martín L.",
    career: "Ingeniería en Sistemas",
    quote: "Lo que más uso es el mapa de correlatividades y los quizzes de práctica con IA. Salvó mi cuatrimestre cuando tenía 4 finales juntos.",
    badge: "¡4 FINALES SALVADOS!",
    badgeColor: "cyan" as const,
    themeColor: "#1475e5",
    panelNumber: "VIÑETA #02",
    avatar: "👨‍💻",
  },
  {
    name: "Camila S.",
    career: "Ciencias Económicas",
    quote: "El Pomodoro combinado con 'Mi Bosque' me quitó la adicción de revisar el celular cada 5 minutos. Estudiar se siente como un juego.",
    badge: "¡RACHA DE 45 DÍAS!",
    badgeColor: "green" as const,
    themeColor: "#48bd22",
    panelNumber: "VIÑETA #03",
    avatar: "📊",
  },
];

export function TestimonialsSection() {
  const { triggerBurst } = useComic();

  const handlePanelClick = (t: typeof testimonials[0], e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, t.badge);
    ComicAudio.playPop();
  };

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <ComicBadge variant="yellow" rotate="left" size="md">
              <MessageCircle className="w-3.5 h-3.5 fill-black" /> TESTIMONIOS CÓMIC
            </ComicBadge>
            <ComicBadge variant="pink" rotate="right" size="md">
              <Sparkles className="w-3.5 h-3.5" /> CASOS REALES
            </ComicBadge>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-foreground">
            Tira Cómica: Estudiantes que <span className="text-[#ff9415] underline decoration-wavy decoration-[#FFE600]">Aprobaron</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg font-bold">
            Historias universitarias reales de estudiantes que dejaron la procrastinación y dominaron sus materias.
          </p>
        </div>

        {/* 3 Comic Strip Panels */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => handlePanelClick(t, e)}
              className="group bg-card rounded-2xl p-6 border-[3px] border-foreground flex flex-col justify-between cursor-pointer select-none transition-all duration-200"
              style={{
                boxShadow: `6px 6px 0 0 ${t.themeColor}`,
              }}
            >
              {/* Panel Top Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-foreground mb-4">
                <span className="font-black text-xs uppercase tracking-widest text-muted-foreground">
                  {t.panelNumber}
                </span>
                <ComicBadge variant={t.badgeColor} rotate="none" size="sm">
                  {t.badge}
                </ComicBadge>
              </div>

              {/* Comic Speech Bubble */}
              <div className="relative p-4 rounded-xl bg-secondary/60 border-2 border-foreground mb-6 shadow-[3px_3px_0_0_#000]">
                <p className="text-xs sm:text-sm font-black text-foreground leading-relaxed">
                  "{t.quote}"
                </p>
                {/* Speech Bubble Tail */}
                <div className="absolute -bottom-2.5 left-8 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-foreground" />
              </div>

              {/* Author & Stars */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl border-2 border-foreground flex items-center justify-center text-xl shadow-[2px_2px_0_0_#000]"
                    style={{ backgroundColor: `${t.themeColor}30` }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase text-foreground leading-tight">
                      {t.name}
                    </h4>
                    <p className="text-xs font-bold text-muted-foreground">
                      {t.career}
                    </p>
                  </div>
                </div>

                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-[#FFE600] text-black" />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
