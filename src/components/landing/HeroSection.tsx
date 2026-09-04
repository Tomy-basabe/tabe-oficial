import { ArrowRight, CheckCircle2, BookOpen, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function HeroSection() {
    return (
        <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
            {/* Subtle decorative bars (like the typography page) */}
            <motion.div animate={{ x: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute top-24 left-[5%] w-20 h-[6px] bg-[#ff9415] rounded-full -rotate-[17deg] opacity-60" />
            <motion.div animate={{ x: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="absolute top-20 right-[8%] w-16 h-[6px] bg-[#1475e5] rounded-full -rotate-[17deg] opacity-50" />
            <motion.div animate={{ y: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 6 }} className="absolute bottom-28 right-[6%] w-20 h-[6px] bg-[#ff9415] rounded-full -rotate-[17deg] opacity-50" />
            <motion.div animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 7 }} className="absolute bottom-40 left-[12%] w-6 h-[6px] bg-[#48bd22] rounded-full opacity-40" />

            <div className="container mx-auto px-4 md:px-6">
                <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-20">

                    {/* Text */}
                    <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="flex-1 max-w-2xl space-y-7 text-center lg:text-left"
                    >
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1475e5]/10 border-2 border-[#1475e5]/20 text-sm font-extrabold text-[#1475e5]">
                            <Sparkles className="w-4 h-4" />
                            Plataforma Educativa Universitaria
                        </div>

                        {/* Headline — NO gradient, solid colored word */}
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-black leading-[1.05] tracking-tight">
                            Estudia con método.{" "}
                            <span className="text-[#ff9415] inline-block hover:-rotate-2 transition-transform duration-200">Aprobá</span>{" "}
                            con estilo.
                        </h1>

                        {/* Sub */}
                        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto lg:mx-0">
                            La plataforma todo‑en‑uno que combina organización académica, gamificación e inteligencia artificial para que domines tus materias.
                        </p>

                        {/* CTAs — neo-brutalist solid shadow buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
                            <Link to="/registro"
                                className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-foreground text-background rounded-xl font-extrabold text-lg border-2 border-foreground shadow-[4px_4px_0_0_#ff9415] transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#ff9415] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#ff9415]">
                                Empezar Gratis
                                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </Link>
                            <Link to="/carreras"
                                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-card text-foreground rounded-xl font-extrabold text-lg border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_hsl(var(--border))] active:translate-y-0.5 active:shadow-none">
                                <BookOpen className="w-5 h-5 text-[#1475e5]" />
                                Ver Carreras
                            </Link>
                        </div>

                        {/* Trust */}
                        <div className="flex flex-wrap justify-center lg:justify-start gap-5 pt-2 text-sm font-bold text-muted-foreground">
                            {["Acceso inmediato", "Validado por alumnos", "100% gratuito"].map(t => (
                                <span key={t} className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-[#48bd22]" />
                                    {t}
                                </span>
                            ))}
                        </div>
                    </motion.div>

                    {/* Logo visual */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                        className="flex-shrink-0 relative"
                    >
                        <motion.img
                            animate={{ y: [0, -15, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            src="/logo.png"
                            alt="TABE 2.0"
                            className="w-56 h-56 md:w-72 md:h-72 lg:w-[380px] lg:h-[380px] object-contain drop-shadow-2xl"
                        />
                        {/* Colored dots around the logo */}
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute -top-3 right-4 w-4 h-4 rounded-full bg-[#ff9415] shadow-[2px_2px_0_0_rgba(0,0,0,.15)]" />
                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 3, delay: 0.5 }} className="absolute top-1/3 -right-3 w-3 h-3 rounded-full bg-[#48bd22] shadow-[2px_2px_0_0_rgba(0,0,0,.15)]" />
                        <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 2.5, delay: 1 }} className="absolute bottom-8 -left-2 w-3.5 h-3.5 rounded-full bg-[#1475e5] shadow-[2px_2px_0_0_rgba(0,0,0,.15)]" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 4, delay: 1.5 }} className="absolute -bottom-2 right-1/3 w-3 h-3 rounded-full bg-[#ffd21c] shadow-[2px_2px_0_0_rgba(0,0,0,.15)]" />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
