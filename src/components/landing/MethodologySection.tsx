import { Target, Brain, Trophy, Repeat } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
    { icon: Target, title: "Organizá", desc: "Plan de carrera, calendario y biblioteca. Todo en un solo lugar.", color: "#ff9415", num: "01" },
    { icon: Brain, title: "Estudiá", desc: "Flashcards, quizzes con IA, apuntes enriquecidos y Pomodoro.", color: "#48bd22", num: "02" },
    { icon: Repeat, title: "Medí", desc: "Métricas de estudio, racha diaria, horas por materia.", color: "#1475e5", num: "03" },
    { icon: Trophy, title: "Superá", desc: "Logros, XP, ranking con amigos y un bosque virtual.", color: "#ffd21c", num: "04" },
];

export function MethodologySection() {
    return (
        <section id="metodologia" className="py-20 md:py-28 bg-secondary/30 relative">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <motion.span 
                        whileHover={{ scale: 1.05, y: -2 }}
                        className="inline-block px-4 py-2 rounded-lg bg-[#48bd22]/10 border-2 border-[#48bd22]/30 text-sm font-black text-[#48bd22] mb-5 shadow-[2px_2px_0_0_#48bd22] cursor-pointer"
                    >
                        🧠 Nuestra Metodología
                    </motion.span>
                    <h2 className="text-3xl md:text-5xl font-black mb-4">
                        Cuatro pilares para{" "}
                        <motion.span 
                            whileHover={{ scale: 1.08, rotate: -2 }}
                            className="relative inline-block text-[#48bd22] cursor-pointer px-1"
                        >
                            <span className="relative z-10">aprobar</span>
                            <span className="absolute inset-x-0 bottom-1 h-3 bg-[#48bd22]/20 -rotate-1 rounded-sm -z-0" />
                        </motion.span>
                    </h2>
                    <p className="text-lg text-muted-foreground">Un sistema probado que transforma tu forma de estudiar.</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                    {steps.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <motion.div 
                                key={i}
                                whileHover={{ y: -8, scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="group relative bg-card rounded-xl p-6 border-[2.5px] border-foreground transition-all duration-200 cursor-pointer select-none"
                                style={{
                                    boxShadow: `5px 5px 0 0 ${s.color}`,
                                }}
                            >
                                {/* Number badge with comic tilt */}
                                <div className="absolute -top-3 -right-2 w-8 h-8 rounded-lg border-2 border-foreground flex items-center justify-center text-xs font-black transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110 shadow-[1.5px_1.5px_0_0_#000]"
                                    style={{ backgroundColor: s.color, color: "#000" }}>
                                    {s.num}
                                </div>
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 border-2 border-foreground transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6 shadow-[2.5px_2.5px_0_0_#000]"
                                    style={{ backgroundColor: s.color }}>
                                    <Icon className="w-7 h-7 text-black" />
                                </div>
                                <h3 className="font-black text-xl mb-2 transition-colors duration-200 group-hover:text-foreground uppercase tracking-tight">{s.title}</h3>
                                <p className="text-sm font-bold text-muted-foreground leading-relaxed">{s.desc}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
