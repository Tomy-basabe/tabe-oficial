import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { HeroCarousel } from "./HeroCarousel";

export function HeroSection() {
    const whatsappUrl = "https://wa.me/5492617737367?text=Hola,%20quiero%20formar%20parte%20de%20TABE%20y%20mejorar%20mi%20rendimiento%20en%20exactas!";

    return (
        <section id="hero" className="relative min-h-[100dvh] pt-28 pb-20 flex flex-col items-center overflow-hidden">
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

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-xl font-bold text-lg hover:shadow-[0_0_30px_rgba(0,255,170,0.3)] transition-all hover:-translate-y-1 active:scale-95 active:-translate-y-0"
                        >
                            Quiero formar parte
                            <ArrowRight className="w-5 h-5" />
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

                {/* Interactive App Carousel - SCROLLING APP PREVIEWS */}
                <div className="mt-16 w-full max-w-6xl mx-auto z-20 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
                    <HeroCarousel />
                </div>

                {/* Secondary CTA Below Carousel */}
                <div className="mt-20 z-20 animate-fade-in-up pb-10" style={{ animationDelay: "0.6s" }}>
                    <div className="relative group">
                        {/* Glow effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>

                        <a
                            href="/auth"
                            className="relative inline-flex items-center justify-center gap-3 px-12 py-5 bg-background border border-border/50 text-foreground rounded-full font-bold text-xl hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 overflow-hidden"
                        >
                            {/* Hover shine effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                            <span className="relative z-10 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent drop-shadow-sm">
                                Entrar a la App
                            </span>
                            <ArrowRight className="relative z-10 w-6 h-6 text-neon-cyan group-hover:translate-x-1.5 transition-transform" />
                        </a>
                    </div>
                </div>
            </div>

            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 pointer-events-none" />
        </section>
    );
}
