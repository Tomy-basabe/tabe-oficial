import { AlertTriangle, Clock, TrendingDown, BookX } from "lucide-react";

const problems = [
    { icon: BookX, title: "Material desorganizado", desc: "PDFs perdidos, apuntes sueltos y links olvidados.", color: "#ff9415" },
    { icon: Clock, title: "Horas sin resultados", desc: "Estudiar mucho no significa estudiar bien.", color: "#1475e5" },
    { icon: TrendingDown, title: "Desmotivación", desc: "Sin metas claras ni feedback, es fácil abandonar.", color: "#ffd21c" },
    { icon: AlertTriangle, title: "Recursar materias", desc: "Sin plan de carrera claro perdés cuatrimestres.", color: "#e53935" },
];

export function ProblemSection() {
    return (
        <section id="problema" className="py-20 md:py-28">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <span className="inline-block px-4 py-2 rounded-lg bg-red-500/10 border-2 border-red-500/20 text-sm font-extrabold text-red-500 mb-5">
                        ⚠️ El problema
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black mb-4">
                        ¿Te suena <span className="text-red-500">familiar?</span>
                    </h2>
                    <p className="text-lg text-muted-foreground">Los problemas más comunes que enfrentan los universitarios. TABE los resuelve.</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
                    {problems.map((p, i) => {
                        const Icon = p.icon;
                        return (
                            <div key={i}
                                className="group bg-card rounded-xl p-6 border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] transition-all duration-200 hover:-translate-y-2 hover:shadow-[8px_8px_0_0_hsl(var(--border))] cursor-default">
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 border-2"
                                    style={{ borderColor: p.color, backgroundColor: p.color + "15" }}>
                                    <Icon className="w-6 h-6" style={{ color: p.color }} />
                                </div>
                                <h3 className="font-extrabold text-lg mb-2">{p.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
