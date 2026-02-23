import { FunctionSquare, Atom, Zap, Lightbulb } from "lucide-react";

export function SpecializationSection() {
    return (
        <section className="py-24 relative overflow-hidden bg-background">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
                        Formación Universitaria Integral
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Dominá cualquier materia con nuestro método. Nos enfocamos en darte las herramientas para superar los filtros de tu carrera.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Card Matematica */}
                    <div className="group relative rounded-3xl border border-border bg-card p-1 overflow-hidden transition-all hover:border-neon-cyan/50 hover:shadow-[0_0_40px_rgba(0,255,170,0.1)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative h-full bg-background rounded-[22px] p-8">
                            <div className="w-16 h-16 rounded-2xl bg-neon-cyan/10 flex items-center justify-center mb-6">
                                <FunctionSquare className="w-8 h-8 text-neon-cyan" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Materias Analíticas</h3>
                            <p className="text-muted-foreground mb-6">
                                Desde Álgebra Lineal hasta Análisis de Datos y Finanzas. Dejamos de lado la abstracción innecesaria para enfocarnos en la intuición y resolución práctica.
                            </p>
                            <ul className="space-y-3">
                                {["Resolución de Problemas", "Análisis Lógico", "Interpretación de Datos", "Ejercicios Prácticos"].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                                        <Zap className="w-4 h-4 text-neon-cyan" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Card Fisica */}
                    <div className="group relative rounded-3xl border border-border bg-card p-1 overflow-hidden transition-all hover:border-neon-purple/50 hover:shadow-[0_0_40px_rgba(176,38,255,0.1)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative h-full bg-background rounded-[22px] p-8">
                            <div className="w-16 h-16 rounded-2xl bg-neon-purple/10 flex items-center justify-center mb-6">
                                <Atom className="w-8 h-8 text-neon-purple" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Materias Teóricas</h3>
                            <p className="text-muted-foreground mb-6">
                                Dejás de memorizar conceptos de memoria para empezar a visualizar y analizar la información. Conectamos la teoría con la realidad mediante esquemas simples.
                            </p>
                            <ul className="space-y-3">
                                {["Conexión de Conceptos", "Aplicación a la Realidad", "Casos de Estudio", "Mapas Conceptuales"].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                                        <Lightbulb className="w-4 h-4 text-neon-purple" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
