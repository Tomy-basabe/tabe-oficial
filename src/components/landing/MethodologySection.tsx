import { Target, Brain, Trophy, Repeat } from "lucide-react";

const steps = [
    { icon: Target, title: "Organizá", desc: "Plan de carrera, calendario y biblioteca. Todo en un solo lugar.", color: "#ff9415", num: "01" },
    { icon: Brain, title: "Estudiá", desc: "Flashcards, quizzes con IA, apuntes enriquecidos y Pomodoro.", color: "#48bd22", num: "02" },
    { icon: Repeat, title: "Medí", desc: "Métricas de estudio, racha diaria, horas por materia.", color: "#1475e5", num: "03" },
    { icon: Trophy, title: "Superá", desc: "Logros, XP, ranking con amigos y un bosque virtual.", color: "#ffd21c", num: "04" },
];

export function MethodologySection() {
    return (
        <section id="metodologia" className="py-20 md:py-28 bg-secondary/40">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <span className="inline-block px-4 py-2 rounded-lg bg-[#48bd22]/10 border-2 border-[#48bd22]/20 text-sm font-extrabold text-[#48bd22] mb-5">
                        🧠 Nuestra Metodología
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black mb-4">
                        Cuatro pilares para <span className="text-[#48bd22]">aprobar</span>
                    </h2>
                    <p className="text-lg text-muted-foreground">Un sistema probado que transforma tu forma de estudiar.</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                    {steps.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <div key={i} className="group relative bg-card rounded-xl p-6 border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] transition-all duration-200 hover:-translate-y-2 hover:shadow-[8px_8px_0_0_hsl(var(--border))]">
                                {/* Number badge */}
                                <div className="absolute -top-3 -right-2 w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-black"
                                    style={{ borderColor: s.color, backgroundColor: s.color + "18", color: s.color }}>
                                    {s.num}
                                </div>
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 border-2 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3"
                                    style={{ borderColor: s.color, backgroundColor: s.color + "15" }}>
                                    <Icon className="w-7 h-7" style={{ color: s.color }} />
                                </div>
                                <h3 className="font-extrabold text-xl mb-2">{s.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
