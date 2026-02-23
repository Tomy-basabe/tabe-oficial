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

                    {/* Visual Mockup - Rich UI Preview */}
                    <div className="relative lg:ml-10 mt-12 lg:mt-0 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                        <div className="relative rounded-2xl border border-neon-cyan/20 bg-background/80 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,255,170,0.1)] overflow-hidden flex flex-col">
                            {/* Browser/Window Header */}
                            <div className="h-10 bg-secondary/50 border-b border-border/50 flex items-center px-4 gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                </div>
                                <div className="ml-4 h-5 flex-1 bg-background/50 rounded-md border border-border/50 flex items-center px-3">
                                    <span className="text-[10px] text-muted-foreground font-mono">tabe-oficial.com/dashboard</span>
                                </div>
                            </div>

                            {/* App Content */}
                            <div className="flex p-4 gap-4 h-[350px]">
                                {/* Sidebar Mock */}
                                <div className="w-1/4 hidden sm:flex flex-col gap-3 border-r border-border/50 pr-4">
                                    <div className="h-8 flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded bg-gradient-to-br from-neon-cyan to-neon-purple" />
                                        <div className="h-4 w-16 bg-foreground/20 rounded" />
                                    </div>
                                    <div className="h-8 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center px-2 gap-2">
                                        <div className="w-4 h-4 rounded bg-neon-cyan/50" />
                                        <div className="h-2 w-16 bg-neon-cyan/50 rounded" />
                                    </div>
                                    <div className="h-8 rounded-lg flex items-center px-2 gap-2 opacity-50">
                                        <div className="w-4 h-4 rounded bg-foreground/30" />
                                        <div className="h-2 w-20 bg-foreground/30 rounded" />
                                    </div>
                                    <div className="h-8 rounded-lg flex items-center px-2 gap-2 opacity-50">
                                        <div className="w-4 h-4 rounded bg-foreground/30" />
                                        <div className="h-2 w-14 bg-foreground/30 rounded" />
                                    </div>

                                    <div className="mt-auto h-16 rounded-xl border border-neon-gold/20 bg-neon-gold/5 p-2 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-neon-gold/20 flex items-center justify-center border border-neon-gold/30">
                                            <span className="text-xs">⚡</span>
                                        </div>
                                        <div>
                                            <div className="h-2 w-10 bg-neon-gold/50 rounded mb-1" />
                                            <div className="h-1.5 w-16 bg-neon-gold/30 rounded" />
                                        </div>
                                    </div>
                                </div>

                                {/* Main View Mock */}
                                <div className="flex-1 flex flex-col gap-4">
                                    <div className="flex gap-4">
                                        <div className="h-24 flex-1 rounded-xl bg-gradient-to-br from-neon-cyan/10 to-transparent border border-neon-cyan/20 p-4 flex flex-col justify-between relative overflow-hidden">
                                            <div className="h-3 w-20 bg-neon-cyan/40 rounded" />
                                            <div className="text-3xl font-display font-bold text-neon-cyan">8.5</div>
                                            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-neon-cyan/20 blur-xl rounded-full" />
                                        </div>
                                        <div className="h-24 flex-1 rounded-xl bg-gradient-to-br from-neon-purple/10 to-transparent border border-neon-purple/20 p-4 flex flex-col justify-between relative overflow-hidden">
                                            <div className="h-3 w-24 bg-neon-purple/40 rounded" />
                                            <div className="text-3xl font-display font-bold text-neon-purple">3</div>
                                            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-neon-purple/20 blur-xl rounded-full" />
                                        </div>
                                    </div>

                                    <div className="flex-1 rounded-xl border border-border/50 bg-secondary/30 p-4 flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <div className="h-3 w-32 bg-foreground/20 rounded" />
                                            <div className="h-2 w-8 bg-foreground/10 rounded" />
                                        </div>
                                        <div className="flex-1 flex gap-2 items-end">
                                            {[40, 70, 45, 90, 60, 100, 80].map((height, i) => (
                                                <div key={i} className="flex-1 bg-gradient-to-t from-neon-cyan/40 to-neon-cyan relative rounded-t-sm" style={{ height: `${height}%` }}>
                                                    {i === 3 && (
                                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-card border border-neon-cyan/30 text-[10px] py-0.5 px-1.5 rounded text-neon-cyan font-bold">+40%</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative Floating Overlay Elements */}
                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 bg-card/90 backdrop-blur-xl border border-neon-green/30 shadow-[0_0_20px_rgba(0,255,100,0.15)] rounded-full py-2 px-4 flex items-center gap-2 hover:scale-105 transition-transform cursor-default">
                                <CheckCircle2 className="w-4 h-4 text-neon-green" />
                                <span className="text-xs font-bold text-foreground">Examen Aprobado</span>
                            </div>

                            <div className="absolute -right-4 top-1/4 bg-card/90 backdrop-blur-xl border border-neon-purple/30 shadow-[0_0_20px_rgba(150,0,255,0.15)] rounded-2xl p-3 flex flex-col gap-1 items-center hover:scale-105 transition-transform cursor-default">
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Racha</div>
                                <div className="text-xl font-display font-bold text-neon-purple">🔥 7</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
