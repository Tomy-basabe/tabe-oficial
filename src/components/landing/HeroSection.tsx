import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { HeroCarousel } from "./HeroCarousel";

export function HeroSection() {
    const whatsappUrl = "https://wa.me/5492617737367?text=Hola,%20quiero%20formar%20parte%20de%20TABE%20y%20mejorar%20mi%20rendimiento%20en%20exactas!";

    return (
        <section className="relative min-h-[100dvh] pt-28 pb-20 flex flex-col items-center overflow-hidden">
            {/* Background gradients */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/20 rounded-full blur-[100px] -z-10" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[100px] -z-10" />

            <div className="container mx-auto px-4 md:px-6 relative z-20 flex flex-col items-center text-center">

                {/* Interactive App Carousel - NOW THE VERY FIRST ELEMENT */}
                <div className="w-full max-w-6xl mx-auto mb-16 z-20 animate-fade-in-up">
                    <HeroCarousel />
                </div>

                {/* Text Content */}
                <div className="max-w-4xl space-y-8 animate-fade-in-up flex flex-col items-center" style={{ animationDelay: "0.2s" }}>
                    {/* T.A.B.E. Acronym Meaning */}
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-2">
                        <div className="flex flex-col items-center group transition-all duration-300 hover:-translate-y-1">
                            <span className="text-3xl md:text-4xl font-display font-black text-neon-cyan drop-shadow-[0_0_15px_rgba(0,255,255,0.3)]">T</span>
                            <span className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">Tomas</span>
                        </div>
                        <div className="flex flex-col items-center group transition-all duration-300 hover:-translate-y-1">
                            <span className="text-3xl md:text-4xl font-display font-black text-neon-purple drop-shadow-[0_0_15px_rgba(188,19,254,0.3)]">A</span>
                            <span className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">Aprendizaje</span>
                        </div>
                        <div className="flex flex-col items-center group transition-all duration-300 hover:-translate-y-1">
                            <span className="text-3xl md:text-4xl font-display font-black text-neon-cyan drop-shadow-[0_0_15px_rgba(0,255,255,0.3)]">B</span>
                            <span className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">Basado en</span>
                        </div>
                        <div className="flex flex-col items-center group transition-all duration-300 hover:-translate-y-1">
                            <span className="text-3xl md:text-4xl font-display font-black text-neon-purple drop-shadow-[0_0_15px_rgba(188,19,254,0.3)]">E</span>
                            <span className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">Experiencia</span>
                        </div>
                    </div>

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
            </div>

            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 pointer-events-none" />
        </section>
    );
}
