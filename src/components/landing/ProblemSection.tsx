import { AlertTriangle, BookX, ArrowDownRight, TrendingDown } from "lucide-react";

export function ProblemSection() {
    const problems = [
        {
            title: "Falta de Bases Sólidas",
            description: "Muchos estudiantes ingresan a la universidad sin los fundamentos necesarios, dificultando el avance en temas complejos.",
            icon: BookX,
            color: "text-red-500",
            bg: "bg-red-500/10",
            border: "border-red-500/20",
        },
        {
            title: "Métodos de Estudio Pasivos",
            description: "Leer apuntes o ver videos no es suficiente para las materias filtro. La falta de práctica activa condena al fracaso en el parcial.",
            icon: AlertTriangle,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            border: "border-orange-500/20",
        },
        {
            title: "La Brecha Secundaria-Universidad",
            description: "El salto de exigencia, velocidad y volumen de estudio entre el colegio y la facultad abruma a la mayoría durante el primer año.",
            icon: ArrowDownRight,
            color: "text-yellow-500",
            bg: "bg-yellow-500/10",
            border: "border-yellow-500/20",
        },
        {
            title: "Alta Tasa de Deserción",
            description: "Las materias filtro actúan como grandes obstáculos, llevando a frustración, demoras en la carrera y, frecuentemente, al abandono.",
            icon: TrendingDown,
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            border: "border-rose-500/20",
        },
    ];

    return (
        <section id="problema" className="py-24 relative overflow-hidden bg-secondary/30">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-display font-bold">
                        El sistema actual <span className="text-destructive">está fallando</span>
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Aprobar materias difíciles en la universidad requiere más que solo asistir y tomar nota.
                        Identificamos por qué la mayoría se queda en el camino.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {problems.map((problem, index) => {
                        const Icon = problem.icon;
                        return (
                            <div
                                key={index}
                                className={`p-6 md:p-8 rounded-2xl bg-card border ${problem.border} hover:shadow-xl transition-all duration-300 group`}
                            >
                                <div className={`w-14 h-14 rounded-xl ${problem.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <Icon className={`w-7 h-7 ${problem.color}`} />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{problem.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {problem.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
