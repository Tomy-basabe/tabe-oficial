import { Star, MessageCircle, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { useComic } from "@/components/comic/ComicEffectsProvider";
import { ComicAudio } from "@/components/comic/ComicAudio";

type Testimonial = {
  id: string;
  name: string;
  career: string;
  quote: string;
  rating: number;
  panelNumber: string;
  themeColor: string;
  badgeColor: "yellow" | "cyan" | "green";
};

export function TestimonialsSection() {
  const { triggerBurst } = useComic();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const marqueePausedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const loadReviews = async () => {
      const { data, error } = await supabase
        .from("user_reviews")
        .select("id, name, career, description, rating")
        .gte("rating", 1)
        .order("created_at", { ascending: false });

      if (!mounted || error || !data) return;
      setTestimonials(data.map((review, index) => ({
        id: review.id,
        name: review.name,
        career: review.career,
        quote: review.description,
        rating: Math.max(1, Math.min(5, review.rating)),
        panelNumber: "",
        themeColor: ["#ff9415", "#1475e5", "#48bd22"][index % 3],
        badgeColor: (["yellow", "cyan", "green"] as const)[index % 3],
      })));
    };
    loadReviews();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const marquee = marqueeRef.current;
    if (!marquee || testimonials.length === 0) return;

    const group = marquee.querySelector<HTMLElement>(".testimonial-marquee-group");
    if (!group) return;

    const groupWidth = group.offsetWidth;
    marquee.scrollLeft = groupWidth;

    const handleScroll = () => {
      if (marquee.scrollLeft <= groupWidth * 0.5) {
        marquee.scrollLeft += groupWidth;
      } else if (marquee.scrollLeft >= groupWidth * 1.5) {
        marquee.scrollLeft -= groupWidth;
      }
    };

    marquee.addEventListener("scroll", handleScroll, { passive: true });
    const timer = window.setInterval(() => {
      if (!marqueePausedRef.current) marquee.scrollLeft += 1;
    }, 24);

    return () => {
      marquee.removeEventListener("scroll", handleScroll);
      window.clearInterval(timer);
    };
  }, [testimonials]);

  const handlePanelClick = (t: Testimonial, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, `${t.rating}/5`);
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
            Opiniones reales de estudiantes que usan TABE para organizarse y estudiar mejor.
          </p>
        </div>

        {/* 3 Comic Strip Panels */}
        {testimonials.length > 0 ? (
        <div
          ref={marqueeRef}
          className="testimonial-marquee-shell max-w-6xl mx-auto"
          aria-label="Opiniones de estudiantes"
          onMouseEnter={() => { marqueePausedRef.current = true; }}
          onMouseLeave={() => { marqueePausedRef.current = false; }}
          onTouchStart={() => { marqueePausedRef.current = true; }}
          onTouchEnd={() => { marqueePausedRef.current = false; }}
        >
          <div className="testimonial-marquee-track">
          {[0, 1, 2].map((groupIndex) => (
            <div className="testimonial-marquee-group" key={groupIndex} aria-hidden={groupIndex === 1}>
            {testimonials.map((t) => (
            <motion.div
              key={`${t.id}-${groupIndex}`}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => handlePanelClick(t, e)}
              className="testimonial-marquee-card group bg-card rounded-2xl p-6 border-[3px] border-foreground flex flex-col justify-between cursor-pointer select-none transition-all duration-200"
              style={{ boxShadow: `6px 6px 0 0 ${t.themeColor}` }}
            >
              {/* Panel Top Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-foreground mb-4">
                <span aria-hidden="true" />
                <ComicBadge variant={t.badgeColor} rotate="none" size="sm">
                  <span className="flex items-center gap-0.5" aria-label={`Calificación ${t.rating} de 5`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`w-3 h-3 ${star <= Math.round(t.rating) ? "fill-current" : "opacity-40"}`} />
                    ))}
                  </span>
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
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(t.rating) ? "fill-[#FFE600] text-black" : "text-muted-foreground"}`} />
                  ))}
                </div>
              </div>
            </motion.div>
            ))}
            </div>
          ))}
          </div>
        </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center border-[3px] border-dashed border-foreground/40 rounded-2xl p-8">
            <p className="font-black uppercase text-muted-foreground">Todavía no hay opiniones publicadas.</p>
          </div>
        )}
      </div>
    </section>
  );
}
