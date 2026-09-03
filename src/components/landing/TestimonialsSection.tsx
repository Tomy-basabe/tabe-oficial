import { Star, Quote } from "lucide-react";

const testimonials = [
    { name: "Valentina R.", career: "Ingeniería Industrial", text: "TABE me ayudó a organizar todas mis materias y subir mi promedio. El sistema de flashcards con IA es increíble.", color: "#ff9415" },
    { name: "Martín L.", career: "Ingeniería en Sistemas", text: "Lo mejor es el plan de carrera interactivo. Puedo ver qué materias me faltan y planificar el cuatrimestre.", color: "#1475e5" },
    { name: "Camila S.", career: "Ciencias Económicas", text: "El pomodoro con el bosque virtual me motiva a estudiar más. Es como un juego pero realmente funciona.", color: "#48bd22" },
];

export function TestimonialsSection() {
    return (
        <section className="py-20 md:py-28">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <span className="inline-block px-4 py-2 rounded-lg bg-[#ffd21c]/15 border-2 border-[#ffd21c]/25 text-sm font-extrabold text-[#d4a600] dark:text-[#ffd21c] mb-5">
                        ⭐ Testimonios
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black mb-4">
                        Estudiantes que <span className="text-[#ff9415]">confían</span> en TABE
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {testimonials.map((t, i) => (
                        <div key={i}
                            className="bg-card rounded-xl p-6 border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] transition-all duration-200 hover:-translate-y-2 hover:shadow-[8px_8px_0_0_hsl(var(--border))]"
                            style={{ borderLeftWidth: 4, borderLeftColor: t.color }}>
                            <Quote className="w-7 h-7 text-muted-foreground/20 mb-3" />
                            <p className="text-sm leading-relaxed mb-5 text-foreground/80">"{t.text}"</p>
                            <div className="flex gap-1 mb-3">
                                {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-[#ffd21c] text-[#ffd21c]" />)}
                            </div>
                            <p className="font-extrabold text-sm">{t.name}</p>
                            <p className="text-xs text-muted-foreground">{t.career}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
