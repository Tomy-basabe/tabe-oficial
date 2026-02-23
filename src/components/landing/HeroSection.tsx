import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export function HeroSection() {
    const whatsappUrl = "https://wa.me/5492617737367?text=Hola,%20quiero%20formar%20parte%20de%20TABE%20y%20mejorar%20mi%20rendimiento%20en%20exactas!";

    return (
        <section className="relative min-h-[100dvh] pt-24 pb-12 flex items-center overflow-hidden">
            {/* Background gradients */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/20 rounded-full blur-[100px] -z-10" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[100px] -z-10" />

            <div className="container mx-auto px-4 md:px-6">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Text Content */}
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border text-sm font-medium text-muted-foreground">
                            <Sparkles className="w-4 h-4 text-neon-gold" />
                            <span>Plataforma Educativa de Alto Rendimiento</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.1] tracking-tight">
                            Domina tus materias con un{" "}
                            <span className="gradient-text">método universitario real.</span>
                        </h1>

                        <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
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

                        <div className="flex items-center gap-6 pt-6 text-sm font-medium text-muted-foreground">
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

                    {/* Visual Mockup */}
                    <div className="relative animate-fade-in lg:ml-10 mt-12 lg:mt-0">
                        <div className="relative rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-2xl aspect-[4/3] flex items-center justify-center">
                            {/* Inner container for background so it obeys border-radius */}
                            <div className="absolute inset-0 rounded-2xl overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/50 to-background opacity-50" />
                            </div>

                            {/* UI Content, also with overflow-hidden to keep items inside */}
                            <div className="w-full h-full p-6 flex flex-col gap-4 relative z-10 rounded-2xl overflow-hidden">
                                {/* Header Mockup */}
                                <div className="flex justify-between items-center pb-4 border-b border-border/50">
                                    <div className="w-32 h-6 rounded-md bg-secondary animate-pulse" />
                                    <div className="w-10 h-10 rounded-full bg-secondary animate-pulse" />
                                </div>
                                {/* Body Mockup */}
                                <div className="flex gap-4 flex-1">
                                    <div className="w-1/3 space-y-3">
                                        <div className="h-24 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 animate-pulse" />
                                        <div className="h-24 rounded-xl bg-neon-purple/10 border border-neon-purple/20 animate-pulse" />
                                        <div className="h-24 rounded-xl bg-secondary animate-pulse" />
                                    </div>
                                    <div className="flex-1 rounded-xl bg-secondary/50 border border-border/50 animate-pulse" />
                                </div>
                            </div>

                            {/* Floating Element 1 */}
                            <div className="absolute -left-6 top-20 bg-card border border-border shadow-xl rounded-xl p-4 flex items-center gap-3 animate-bounce shadow-neon-cyan/10">
                                <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center">
                                    <span className="text-xl">📈</span>
                                </div>
                                <div>
                                    <div className="text-sm font-bold">+40% Rendimiento</div>
                                    <div className="text-xs text-muted-foreground">Este mes</div>
                                </div>
                            </div>

                            {/* Floating Element 2 */}
                            <div className="absolute -right-6 bottom-20 bg-card border border-border shadow-xl rounded-xl p-4 flex flex-col gap-2 animate-pulse shadow-neon-purple/10" style={{ animationDelay: "1s" }}>
                                <div className="text-xs font-bold text-neon-purple">Flashcards</div>
                                <div className="flex gap-1">
                                    <div className="w-3 h-8 bg-green-500 rounded-sm" />
                                    <div className="w-3 h-10 bg-green-500 rounded-sm" />
                                    <div className="w-3 h-12 bg-green-500 rounded-sm" />
                                    <div className="w-3 h-14 bg-green-500 rounded-sm" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
