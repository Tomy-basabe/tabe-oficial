import { FunctionSquare, Atom, Zap, Lightbulb, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function SpecializationSection() {
    return (
        <section className="py-20 md:py-28 bg-secondary/30 relative">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <motion.div 
                        whileHover={{ scale: 1.05, y: -2 }}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1475e5]/10 border-2 border-[#1475e5]/30 text-xs font-black text-[#1475e5] uppercase mb-4 shadow-[2px_2px_0_0_#1475e5] cursor-pointer"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Especialización Académica</span>
                    </motion.div>
                    <h2 className="text-3xl md:text-5xl font-black mb-4">
                        Formación Universitaria{" "}
                        <motion.span 
                            whileHover={{ scale: 1.08, rotate: -2 }}
                            className="relative inline-block text-[#1475e5] cursor-pointer px-1"
                        >
                            <span className="relative z-10">Integral</span>
                            <span className="absolute inset-x-0 bottom-1 h-3 bg-[#1475e5]/20 -rotate-1 rounded-sm -z-0" />
                        </motion.span>
                    </h2>
                    <p className="text-lg text-muted-foreground">Dominá cualquier materia con nuestro método.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {/* Analíticas */}
                    <motion.div 
                        whileHover={{ y: -8, scale: 1.015 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="group bg-card rounded-xl p-8 border-2 border-border shadow-[4px_4px_0_0_#1475e5] transition-shadow duration-200 hover:shadow-[8px_8px_0_0_#1475e5] cursor-pointer"
                    >
                        <div className="w-14 h-14 rounded-xl bg-[#1475e5]/10 border-2 border-[#1475e5]/30 flex items-center justify-center mb-6 transition-transform duration-200 group-hover:scale-115 group-hover:-rotate-6">
                            <FunctionSquare className="w-7 h-7 text-[#1475e5]" />
                        </div>
                        <h3 className="text-2xl font-extrabold mb-3 transition-colors duration-200 group-hover:text-[#1475e5]">Materias Analíticas</h3>
                        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">Desde Álgebra Lineal hasta Análisis de Datos y Finanzas. Enfocamos en la intuición y resolución práctica.</p>
                        <ul className="space-y-3">
                            {["Resolución de Problemas", "Análisis Lógico", "Interpretación de Datos", "Ejercicios Prácticos"].map((item, i) => (
                                <motion.li 
                                    key={i} 
                                    whileHover={{ x: 4 }}
                                    className="flex items-center gap-3 text-sm font-bold text-foreground/90 transition-colors hover:text-[#1475e5]"
                                >
                                    <Zap className="w-4 h-4 text-[#1475e5]" /> {item}
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Teóricas */}
                    <motion.div 
                        whileHover={{ y: -8, scale: 1.015 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="group bg-card rounded-xl p-8 border-2 border-border shadow-[4px_4px_0_0_#ff9415] transition-shadow duration-200 hover:shadow-[8px_8px_0_0_#ff9415] cursor-pointer"
                    >
                        <div className="w-14 h-14 rounded-xl bg-[#ff9415]/10 border-2 border-[#ff9415]/30 flex items-center justify-center mb-6 transition-transform duration-200 group-hover:scale-115 group-hover:rotate-6">
                            <Atom className="w-7 h-7 text-[#ff9415]" />
                        </div>
                        <h3 className="text-2xl font-extrabold mb-3 transition-colors duration-200 group-hover:text-[#ff9415]">Materias Teóricas</h3>
                        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">Dejás de memorizar para empezar a visualizar. Conectamos la teoría con la realidad.</p>
                        <ul className="space-y-3">
                            {["Conexión de Conceptos", "Aplicación a la Realidad", "Casos de Estudio", "Mapas Conceptuales"].map((item, i) => (
                                <motion.li 
                                    key={i} 
                                    whileHover={{ x: 4 }}
                                    className="flex items-center gap-3 text-sm font-bold text-foreground/90 transition-colors hover:text-[#ff9415]"
                                >
                                    <Lightbulb className="w-4 h-4 text-[#ff9415]" /> {item}
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
