import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Review {
    id: string;
    name: string;
    career: string;
    rating: number;
    description: string;
}

export function TestimonialsSection() {
    const [testimonials, setTestimonials] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const { data, error } = await supabase
                .from("user_reviews")
                .select("*")
                .order("rating", { ascending: false })
                .order("created_at", { ascending: false })
                .limit(6);

            if (error) {
                console.error("Error fetching reviews:", error);
                return;
            }

            if (data) {
                setTestimonials(data);
            }
        } catch (error) {
            console.error("Unexpected error fetching reviews:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || testimonials.length === 0) {
        return null; // Don't show the section if no reviews exist yet
    }

    return (
        <section className="py-24 relative overflow-hidden bg-background">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
                        Historias de <span className="text-neon-cyan">Éxito</span>
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Estudiantes que transformaron la frustración en resultados académicos reales usando T.A.B.E.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {testimonials.map((t) => (
                        <div key={t.id} className="relative bg-card border border-border rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <Quote className="absolute top-6 right-6 w-8 h-8 text-secondary/50" />
                            <div className="flex items-center gap-1 mb-6">
                                {[...Array(5)].map((_, j) => (
                                    <Star
                                        key={j}
                                        className={`w-4 h-4 ${j < t.rating ? "text-neon-gold fill-neon-gold" : "text-muted-foreground/30"}`}
                                    />
                                ))}
                            </div>
                            <p className="text-muted-foreground leading-relaxed mb-8 relative z-10 italic">
                                "{t.description}"
                            </p>
                            <div>
                                <div className="font-bold text-foreground">{t.name}</div>
                                <div className="text-sm text-neon-cyan font-medium">{t.career}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
