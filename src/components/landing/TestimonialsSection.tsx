import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TestimonialsColumn, TestimonialItem } from "@/components/ui/testimonials-columns-1";
import { KineticHeading } from "@/components/ui/kinetic-heading";

export function TestimonialsSection() {
  const [reviews, setReviews] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadReviews = async () => {
      try {
        const { data, error } = await supabase
          .from("user_reviews")
          .select("id, name, career, description, rating")
          .eq("is_approved", true)
          .gte("rating", 1)
          .order("created_at", { ascending: false });

        if (!mounted) return;

        if (error || !data || data.length === 0) {
          setReviews([]);
          return;
        }

        const formatted: TestimonialItem[] = data.map((r) => ({
          text: r.description,
          name: r.name,
          role: r.career || "Estudiante universitario",
          image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.name)}&backgroundColor=1475e5,ff9415,48bd22,FF2E93,00E5FF&fontSize=42&fontWeight=800`,
        }));

        setReviews(formatted);
      } catch {
        if (mounted) setReviews([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadReviews();

    return () => {
      mounted = false;
    };
  }, []);

  // Split real user reviews across 3 columns
  const col1 = reviews.filter((_, i) => i % 3 === 0);
  const col2 = reviews.filter((_, i) => i % 3 === 1);
  const col3 = reviews.filter((_, i) => i % 3 === 2);

  return (
    <section id="testimonios" className="py-24 bg-background text-foreground relative overflow-hidden select-none">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-4 mb-12"
        >
          <KineticHeading
            as="h2"
            effect="neon-glow"
            badge="OPINIONES DE ESTUDIANTES // VERIFICADAS"
            badgeColor="green"
            className="text-3xl md:text-5xl font-black uppercase tracking-tight"
          >
            QUÉ DICEN LOS{" "}
            <motion.span
              whileHover={{ scale: 1.1, rotate: -2 }}
              className="text-[#1475e5] underline decoration-wavy decoration-[#ff9415] inline-block cursor-pointer"
            >
              ESTUDIANTES
            </motion.span>
          </KineticHeading>
          <p className="text-muted-foreground font-medium text-sm md:text-base max-w-lg">
            Opiniones de universitarios que ya utilizan TABE para organizar su carrera.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 rounded-full border-3 border-[#1475e5] border-t-transparent animate-spin" />
          </div>
        ) : reviews.length > 0 ? (
          /* Real user reviews animated columns with mask */
          <div className="flex justify-center gap-6 mt-8 [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)] max-h-[680px] overflow-hidden">
            <TestimonialsColumn testimonials={col1.length > 0 ? col1 : reviews} duration={14} />
            {col2.length > 0 && (
              <TestimonialsColumn testimonials={col2} className="hidden md:block" duration={18} />
            )}
            {col3.length > 0 && (
              <TestimonialsColumn testimonials={col3} className="hidden lg:block" duration={16} />
            )}
          </div>
        ) : (
          <div className="max-w-md mx-auto text-center border-2 border-dashed border-border rounded-2xl p-8 bg-card/50">
            <p className="font-bold text-muted-foreground text-sm">
              Todavía no hay opiniones publicadas por los usuarios.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
