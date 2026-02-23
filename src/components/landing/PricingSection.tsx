import { CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";

export function PricingSection() {
    const whatsappUrl = "https://wa.me/5492617737367?text=Hola,%20quiero%20el%20acceso%20único%20a%20TABE%20por%20$7.000";

    const benefits = [
        "Acceso ilimitado a todo el contenido de la plataforma",
        "Metodología guiada paso a paso",
        "Simuladores de parciales y flashcards",
        "Estadísticas de rendimiento y gamificación (Mi Bosque)",
        "Integración multiplataforma (Web y Mobile)",
        "Asistencia mediante IA interactiva"
    ];

    return (
        <section id="planes" className="py-24 relative overflow-hidden bg-secondary/30">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neon-purple/5 via-background to-background -z-10" />

            <div className="container mx-auto px-4 md:px-6 max-w-5xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
                        Inversión en tu Futuro
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Sin suscripciones mensuales. Un único pago para acceder a la herramienta definitiva para aprobar tus materias filtro.
                    </p>
                </div>

                <div className="relative rounded-3xl overflow-hidden border border-border bg-card shadow-2xl flex flex-col md:flex-row max-w-4xl mx-auto">
                    {/* Neon Glow Header Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan to-neon-purple" />

                    {/* Left Details */}
                    <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-border md:w-3/5">
                        <h3 className="text-2xl font-bold mb-2">Acceso Total Universitario</h3>
                        <p className="text-muted-foreground mb-8">
                            Tu cuenta te brindará acceso permanente a las actualizaciones y mejoras de la plataforma.
                        </p>
                        <ul className="space-y-4">
                            {benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-neon-cyan shrink-0 mt-0.5" />
                                    <span className="font-medium">{benefit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Right Price & CTA */}
                    <div className="p-8 md:p-12 bg-secondary/20 flex flex-col items-center justify-center text-center md:w-2/5">
                        <div className="mb-2 text-muted-foreground font-medium uppercase tracking-wider text-sm">
                            Pago Único
                        </div>
                        <div className="flex items-start justify-center text-6xl font-black mb-2 font-display bg-gradient-to-br from-foreground to-foreground/70 text-transparent bg-clip-text">
                            <span className="text-3xl mt-2 mr-1">$</span>7.000
                        </div>
                        <div className="text-sm text-neon-green font-medium flex items-center gap-1 mb-8">
                            <ShieldCheck className="w-4 h-4" /> Pagá una vez, usalo para siempre
                        </div>

                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-xl font-bold text-lg hover:shadow-[0_0_30px_rgba(0,255,170,0.3)] transition-all hover:-translate-y-1 active:scale-95 active:-translate-y-0"
                        >
                            Comprar Acceso
                            <ArrowRight className="w-5 h-5" />
                        </a>

                        <p className="text-xs text-muted-foreground mt-4">
                            Te enviaremos los pasos de pago por WhatsApp y luego activaremos tu usuario inmediatamente.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
