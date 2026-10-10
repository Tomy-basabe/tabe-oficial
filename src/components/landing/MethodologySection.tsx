import { Target, Brain, Trophy, Repeat } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { KineticHeading } from "@/components/ui/kinetic-heading";
import { StaggeredText } from "@/components/ui/staggered-text";

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
                <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                    <KineticHeading
                        as="h2"
                        effect="neon-glow"
                        badge="METODOLOGÍA TABE"
                        badgeColor="green"
                        className="text-3xl md:text-5xl font-black"
                    >
                        <StaggeredText text="Cuatro pilares para" duration={0.4} />{" "}
                        <span className="relative inline-block text-[#48bd22] cursor-pointer px-1.5">
                            <span className="relative z-10 underline decoration-[#48bd22] decoration-wavy">
                                <StaggeredText text="aprobar" duration={0.4} />
                            </span>
                            <span className="absolute inset-x-0 bottom-1 h-3 bg-[#48bd22]/20 -rotate-1 rounded-sm -z-0" />
                        </span>
                    </KineticHeading>
                    <p className="text-lg text-muted-foreground font-bold">Un sistema probado que transforma tu forma de estudiar.</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                    {steps.map((s, i) => {
                        const Icon = s.icon;
                        const isLightYellow = s.color === "#ffd21c";
                        return (
                            <motion.div 
                                key={i}
                                whileHover={{ y: -8, scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="group relative bg-card rounded-xl p-6 border-[2.5px] border-foreground dark:border-zinc-800 transition-all duration-200 cursor-pointer select-none"
                                style={{
                                    boxShadow: `5px 5px 0 0 ${s.color}`,
                                }}
                            >
                                {/* Number badge with comic tilt */}
                                <div className="absolute -top-3 -right-2 w-8 h-8 rounded-lg border-2 border-foreground dark:border-zinc-700 flex items-center justify-center text-xs font-black transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110 shadow-[1.5px_1.5px_0_0_#000] dark:shadow-none"
                                    style={{ backgroundColor: s.color, color: isLightYellow ? "#09090b" : "#ffffff" }}>
                                    {s.num}
                                </div>
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 border-2 border-foreground dark:border-zinc-700 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6 shadow-[2.5px_2.5px_0_0_#000] dark:shadow-none"
                                    style={{ backgroundColor: s.color }}>
                                    <Icon className={cn("w-7 h-7", isLightYellow ? "text-zinc-950" : "text-white")} />
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
