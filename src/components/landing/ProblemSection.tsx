import { AlertTriangle, Clock, TrendingDown, BookX } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { KineticHeading } from "@/components/ui/kinetic-heading";

const problems = [
    { icon: BookX, title: "Material desorganizado", desc: "PDFs perdidos, apuntes sueltos y links olvidados.", color: "#ff9415" },
    { icon: Clock, title: "Horas sin resultados", desc: "Estudiar mucho no significa estudiar bien.", color: "#1475e5" },
    { icon: TrendingDown, title: "Desmotivación", desc: "Sin metas claras ni feedback, es fácil abandonar.", color: "#ffd21c" },
    { icon: AlertTriangle, title: "Recursar materias", desc: "Sin plan de carrera claro perdés cuatrimestres.", color: "#e53935" },
];

export function ProblemSection() {
    return (
        <section id="problema" className="py-20 md:py-28 relative">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto mb-14 space-y-4">
                    <KineticHeading
                        as="h2"
                        effect="strike-highlight"
                        badge="EL PROBLEMA UNIVERSITARIO"
                        badgeColor="pink"
                        className="text-3xl md:text-5xl font-black"
                    >
                        ¿Te suena{" "}
                        <motion.span 
                            whileHover={{ scale: 1.12, rotate: 3 }}
                            className="relative inline-block text-red-500 cursor-pointer px-1.5"
                        >
                            <span className="relative z-10 underline decoration-red-500 decoration-wavy">familiar?</span>
                            <span className="absolute inset-x-0 bottom-1 h-3 bg-red-500/20 rotate-1 rounded-sm -z-0" />
                        </motion.span>
                    </KineticHeading>
                    <p className="text-lg text-muted-foreground font-bold">Los problemas más comunes que enfrentan los universitarios. TABE los resuelve.</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
                    {problems.map((p, i) => {
                        const Icon = p.icon;
                        const isLightYellow = p.color === "#ffd21c";
                        return (
                            <motion.div 
                                key={i}
                                whileHover={{ y: -6, scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="group bg-card rounded-xl p-6 border-[2.5px] border-foreground dark:border-zinc-800 transition-all duration-200 cursor-pointer select-none"
                                style={{
                                    boxShadow: `5px 5px 0 0 ${p.color}`,
                                }}
                            >
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 border-2 border-foreground dark:border-zinc-700 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6 shadow-[2px_2px_0_0_#000] dark:shadow-none"
                                    style={{ backgroundColor: p.color }}>
                                    <Icon className={cn("w-6 h-6", isLightYellow ? "text-zinc-950" : "text-white")} />
                                </div>
                                <h3 className="font-black text-lg mb-2 transition-colors duration-200 group-hover:text-foreground uppercase tracking-tight">{p.title}</h3>
                                <p className="text-sm font-bold text-muted-foreground leading-relaxed">{p.desc}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
