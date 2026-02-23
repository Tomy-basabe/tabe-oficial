import { Star, Quote } from "lucide-react";

export function TestimonialsSection() {
    const testimonials = [
        {
            name: "Sofía M.",
            career: "Ingeniería Química",
            university: "Universidad Nacional de Cuyo",
            text: "Física I era mi pesadilla. La había recursado dos veces. Con el método de TABE, entendí por qué las fórmulas funcionaban en vez de memorizarlas. Aprobé con 8.",
        },
        {
            name: "Lucas R.",
            career: "Ingeniería en Sistemas",
            university: "UTN",
            text: "El salto del secundario a Análisis Matemático fue durísimo. Lo que más me sirvió de la plataforma fueron las resoluciones paso a paso y las flashcards para fórmulas.",
        },
        {
            name: "Martina Gomez",
            career: "Arquitectura",
            university: "Universidad de Mendoza",
            text: "Matemática Aplicada me parecía imposible. Estuve a punto de dejar la carrera. Entrar a TABE me salvó el año, literal. Ahora estudio con mucha más confianza.",
        }
    ];

    return (
        <section className="py-24 relative overflow-hidden bg-background">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
                        Historias de <span className="text-neon-cyan">Éxito</span>
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Estudiantes que transformaron la frustración en resultados académicos reales.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((t, i) => (
                        <div key={i} className="relative bg-card border border-border rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <Quote className="absolute top-6 right-6 w-8 h-8 text-secondary/50" />
                            <div className="flex items-center gap-1 mb-6">
                                {[...Array(5)].map((_, j) => (
                                    <Star key={j} className="w-4 h-4 text-neon-gold fill-neon-gold" />
                                ))}
                            </div>
                            <p className="text-muted-foreground leading-relaxed mb-8 relative z-10 italic">
                                "{t.text}"
                            </p>
                            <div>
                                <div className="font-bold text-foreground">{t.name}</div>
                                <div className="text-sm text-neon-cyan font-medium">{t.career}</div>
                                <div className="text-xs text-muted-foreground">{t.university}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
