import { Brain, Target, Compass, Users } from "lucide-react";

export function MethodologySection() {
    const pillars = [
        {
            title: "Aprendizaje Basado en Experiencia",
            desc: "No más teoría al vacío. Aprende resolviendo problemas reales, enfrentando los parches comunes que traban a los estudiantes.",
            icon: Brain,
        },
        {
            title: "Comprensión Profunda",
            desc: "Entender el 'por qué' detrás de cada fórmula. Si memorizas, olvidas. Si comprendes, dominas el tema para siempre.",
            icon: Target,
        },
        {
            title: "Resolución Guiada",
            desc: "Paso a paso, desglosamos ejercicios complejos de parciales en partes manejables para construir tu intuición lógica y resolutiva.",
            icon: Compass,
        },
        {
            title: "Acompañamiento Estratégico",
            desc: "No estás solo. Nuestra plataforma y tutores te brindan feedback constante para corregir errores antes del examen.",
            icon: Users,
        },
    ];

    return (
        <section id="metodologia" className="py-24 relative overflow-hidden bg-background">
            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left Text */}
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 text-sm font-medium text-neon-cyan">
                            Nuestro Enfoque
                        </div>
                        <h2 className="text-3xl md:text-5xl font-display font-bold leading-tight">
                            Aprobar no es suerte, es <span className="gradient-text">metodología.</span>
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            El sistema TABE (Tomas Aprendizaje Basado en Experiencia) está diseñado para transformar estudiantes con bases débiles en alumnos destacados sin importar su carrera.
                        </p>

                        <div className="pt-8 grid gap-8">
                            {pillars.map((pillar, i) => {
                                const Icon = pillar.icon;
                                return (
                                    <div key={i} className="flex gap-4 group">
                                        <div className="mt-1 flex-shrink-0 w-12 h-12 rounded-xl bg-secondary flex items-center justify-center border border-border group-hover:bg-gradient-to-br from-neon-cyan to-neon-purple group-hover:border-transparent transition-all">
                                            <Icon className="w-6 h-6 text-foreground group-hover:text-background transition-colors" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold mb-2 group-hover:text-neon-cyan transition-colors">{pillar.title}</h3>
                                            <p className="text-muted-foreground leading-relaxed">{pillar.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Visual */}
                    <div className="relative">
                        {/* Glowing background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 rounded-3xl blur-[80px] -z-10" />

                        <div className="relative rounded-3xl border border-border bg-card p-8 shadow-2xl overflow-hidden aspect-square flex flex-col items-center justify-center">
                            {/* Abstract decorative elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/5 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-cyan/5 rounded-full blur-3xl" />

                            {/* Central Graph/Logic diagram */}
                            <div className="relative z-10 w-full max-w-sm">
                                <div className="flex justify-between items-end mb-4 px-4">
                                    <div className="w-16 h-24 bg-neon-cyan/20 rounded-t-lg border border-neon-cyan/30 flex items-end justify-center pb-2">
                                        <span className="text-xs font-bold text-neon-cyan">Base</span>
                                    </div>
                                    <div className="w-16 h-32 bg-neon-cyan/40 rounded-t-lg border border-neon-cyan/50 flex items-end justify-center pb-2">
                                        <span className="text-xs font-bold text-neon-cyan">Práctica</span>
                                    </div>
                                    <div className="w-16 h-48 bg-gradient-to-t from-neon-cyan to-neon-purple rounded-t-lg shadow-[0_0_30px_rgba(0,255,170,0.5)] flex items-end justify-center pb-2">
                                        <span className="text-xs font-bold text-background">Examen</span>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full" />
                                <div className="mt-8 p-4 rounded-xl border border-border bg-background shadow-lg backdrop-blur flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <span className="text-green-500 font-bold">✓</span>
                                    </div>
                                    <div>
                                        <div className="font-bold">Evolución del Alumno</div>
                                        <div className="text-xs text-muted-foreground">Progreso medido por TABE</div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
