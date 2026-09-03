import { FunctionSquare, Atom, Zap, Lightbulb } from "lucide-react";

export function SpecializationSection() {
    return (
        <section className="py-20 md:py-28 bg-secondary/40">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-black mb-4">Formación Universitaria Integral</h2>
                    <p className="text-lg text-muted-foreground">Dominá cualquier materia con nuestro método.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {/* Analíticas */}
                    <div className="group bg-card rounded-xl p-8 border-2 border-border shadow-[4px_4px_0_0_#1475e5] transition-all duration-200 hover:-translate-y-2 hover:shadow-[8px_8px_0_0_#1475e5]">
                        <div className="w-14 h-14 rounded-xl bg-[#1475e5]/10 border-2 border-[#1475e5]/30 flex items-center justify-center mb-6 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3">
                            <FunctionSquare className="w-7 h-7 text-[#1475e5]" />
                        </div>
                        <h3 className="text-2xl font-extrabold mb-3">Materias Analíticas</h3>
                        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">Desde Álgebra Lineal hasta Análisis de Datos y Finanzas. Enfocamos en la intuición y resolución práctica.</p>
                        <ul className="space-y-3">
                            {["Resolución de Problemas", "Análisis Lógico", "Interpretación de Datos", "Ejercicios Prácticos"].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm font-bold">
                                    <Zap className="w-4 h-4 text-[#1475e5]" /> {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Teóricas */}
                    <div className="group bg-card rounded-xl p-8 border-2 border-border shadow-[4px_4px_0_0_#ff9415] transition-all duration-200 hover:-translate-y-2 hover:shadow-[8px_8px_0_0_#ff9415]">
                        <div className="w-14 h-14 rounded-xl bg-[#ff9415]/10 border-2 border-[#ff9415]/30 flex items-center justify-center mb-6 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3">
                            <Atom className="w-7 h-7 text-[#ff9415]" />
                        </div>
                        <h3 className="text-2xl font-extrabold mb-3">Materias Teóricas</h3>
                        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">Dejás de memorizar para empezar a visualizar. Conectamos la teoría con la realidad.</p>
                        <ul className="space-y-3">
                            {["Conexión de Conceptos", "Aplicación a la Realidad", "Casos de Estudio", "Mapas Conceptuales"].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm font-bold">
                                    <Lightbulb className="w-4 h-4 text-[#ff9415]" /> {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
