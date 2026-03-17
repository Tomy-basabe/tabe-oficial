import { Sparkles, ArrowRight, CheckCircle2, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
export function HeroSection() {
    const whatsappUrl = "https://wa.me/5492617737367?text=Hola,%20quiero%20formar%20parte%20de%20TABE%20y%20mejorar%20mi%20rendimiento%20en%20exactas!";

    return (
        <section id="hero" className="relative pt-28 pb-16 flex flex-col items-center overflow-hidden">
            {/* Background gradients */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/20 rounded-full blur-[100px] -z-10" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[100px] -z-10" />

            <div className="container mx-auto px-4 md:px-6 relative z-20 flex flex-col items-center text-center">

                {/* Text Content */}
                <div className="max-w-4xl space-y-8 animate-fade-in-up flex flex-col items-center" style={{ animationDelay: "0.2s" }}>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border text-sm font-medium text-muted-foreground">
                        <Sparkles className="w-4 h-4 text-neon-gold" />
                        <span>Plataforma Educativa de Alto Rendimiento</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[1.1] tracking-tight">
                        Domina tus materias con un{" "}
                        <span className="gradient-text">método universitario real.</span>
                    </h1>

                    <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                        No dejes tu rendimiento al azar. Preparación estratégica, resolución guiada y tecnología interactiva para estudiantes exigentes.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto items-center">
                        <Link
                            to="/auth"
                            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-2xl font-bold text-xl hover:shadow-[0_0_40px_rgba(0,255,170,0.4)] transition-all hover:-translate-y-1 active:scale-95 active:-translate-y-0 relative overflow-hidden group/btn"
                        >
                            <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                            Entrar a la App
                            <ArrowRight className="w-6 h-6 text-white group-hover/btn:translate-x-1.5 transition-transform" />
                        </Link>
                        
                        <Link
                            to="/carreras"
                            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-background/50 backdrop-blur-md text-foreground border border-neon-cyan/50 rounded-2xl font-bold text-lg hover:border-neon-cyan transition-all hover:-translate-y-1 active:scale-95 relative overflow-hidden group/careers animate-pulse-glow"
                        >
                            <div className="absolute inset-0 bg-neon-cyan/5 opacity-0 group-hover/careers:opacity-100 transition-opacity" />
                            <GraduationCap className="w-6 h-6 text-neon-cyan group-hover/careers:rotate-12 transition-transform" />
                            <span>Planes de Carrera</span>
                            <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-neon-purple text-[10px] text-white rounded-full font-black animate-bounce">
                                NUEVO
                            </span>
                        </Link>

                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-secondary/50 text-muted-foreground border border-border rounded-2xl font-bold text-lg hover:text-foreground transition-all hover:-translate-y-1 active:scale-95"
                        >
                            Contacto
                        </a>
                    </div>

                    <div className="flex flex-wrap justify-center items-center gap-6 pt-6 text-sm font-medium text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-neon-green" />
                            Acceso inmediato
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-neon-green" />
                            Validado por alumnos
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 pointer-events-none" />
        </section>
    );
}
