import { UserPlus, Compass, BookOpen, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { KineticHeading } from "@/components/ui/kinetic-heading";

const steps = [
    { icon: UserPlus, title: "Creá tu cuenta", desc: "Registrate gratis y elegí tu carrera. En 30 segundos ya tenés tu espacio listo.", color: "#ff9415" },
    { icon: Compass, title: "Explorá las herramientas", desc: "Flashcards, cuestionarios, apuntes, calendario, pomodoro... descubrí lo que necesitás.", color: "#48bd22" },
    { icon: BookOpen, title: "Organizá y estudiá", desc: "Subí tu material, creá tus mazos, usá la IA para generar quizzes y resúmenes.", color: "#1475e5" },
    { icon: Rocket, title: "Superá tus metas", desc: "Medí tu progreso, desbloqueá logros y compará tu rendimiento con amigos.", color: "#ffd21c" },
];

export function HowItWorksSection() {
    return (
        <section className="py-20 md:py-28">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                    <KineticHeading
                        as="h2"
                        effect="comic-pop"
                        badge="CÓMO FUNCIONA // PASO A PASO"
                        badgeColor="orange"
                        className="text-3xl md:text-5xl font-black tracking-tight"
                    >
                        Empezar es{" "}
                        <motion.span 
                            whileHover={{ scale: 1.1, rotate: 2 }}
                            className="relative inline-block text-[#ff9415] transition-transform duration-200 cursor-pointer px-1.5"
                        >
                            <span className="relative z-10 underline decoration-[#ff9415] decoration-wavy">muy fácil</span>
                            <span className="absolute -bottom-1 left-0 w-full h-2 bg-[#ff9415]/30 rounded-full" />
                        </motion.span>
                    </KineticHeading>
                    <p className="text-lg text-muted-foreground font-bold">Sin configuraciones eternas. Entrás, organizás y empezás a estudiar.</p>
                </div>

                <div className="max-w-3xl mx-auto space-y-0">
                    {steps.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <div key={i} className="flex items-start gap-6 py-7 px-4 rounded-2xl transition-all duration-200 hover:bg-muted/40 group cursor-default">
                                {/* Step circle + connector */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-14 h-14 rounded-xl border-2 flex items-center justify-center shadow-[3px_3px_0_0_rgba(0,0,0,.1)] transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-[5px_5px_0_0_rgba(0,0,0,.15)]"
                                        style={{ borderColor: s.color, backgroundColor: s.color }}>
                                        <Icon className="w-6 h-6 text-white transition-transform group-hover:scale-110" />
                                    </div>
                                    {i < steps.length - 1 && (
                                        <div className="absolute top-14 left-1/2 -translate-x-1/2 w-0.5 h-10 bg-border group-hover:bg-border/80" />
                                    )}
                                </div>
                                {/* Text */}
                                <div className="pt-2">
                                    <span className="text-xs font-black uppercase tracking-widest mb-1 block transition-transform group-hover:translate-x-1" style={{ color: s.color }}>Paso {i + 1}</span>
                                    <h3 className="font-extrabold text-xl mb-1 group-hover:text-primary transition-colors">{s.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{s.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
