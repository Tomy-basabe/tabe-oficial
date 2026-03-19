import { CheckCircle2, Sparkles, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PricingSection() {
    const benefits = [
        "Acceso ilimitado a todo el contenido",
        "Asistente IA sin restricciones (Ilimitado)",
        "Flashcards y Cuestionarios sin límites",
        "Marketplace totalmente abierto",
        "Estadísticas avanzadas habilitadas para todos",
    ];

    return (
        <section id="planes" className="py-24 relative overflow-hidden bg-secondary/30">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neon-purple/5 via-background to-background -z-10" />

            <div className="container mx-auto px-4 md:px-6 max-w-4xl">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 mb-6 animate-bounce">
                        <Sparkles className="w-4 h-4" />
                        <span className="font-bold text-sm uppercase tracking-wider">¡Nueva Era T.A.B.E!</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-display font-bold mb-6">
                        Todo es Gratis. <span className="gradient-text">Para Siempre.</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Hemos eliminado todas las suscripciones. Ahora todos los estudiantes tienen acceso al 100% de las funciones de T.A.B.E. sin pagar un centavo.
                    </p>
                </div>

                <div className="card-gamer border-neon-cyan shadow-[0_0_30px_rgba(0,255,170,0.1)] p-8 md:p-12 max-w-2xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1 space-y-6">
                            <h3 className="text-2xl font-bold flex items-center gap-2">
                                <CheckCircle2 className="w-6 h-6 text-neon-cyan" />
                                Beneficios Desbloqueados
                            </h3>
                            <ul className="space-y-4">
                                {benefits.map((b, i) => (
                                    <li key={i} className="flex items-start gap-3 text-lg">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neon-cyan" />
                                        <span>{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="w-full md:w-auto text-center md:text-right space-y-4">
                            <div className="space-y-1">
                                <p className="text-muted-foreground line-through text-lg">$5.000 ARS</p>
                                <p className="text-5xl font-black font-display text-neon-cyan">$0</p>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Soporte por Anuncios</p>
                            </div>
                            <Button 
                                size="lg"
                                className="w-full md:w-auto bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-bold px-8 shadow-lg shadow-neon-cyan/20"
                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            >
                                Empezar a Estudiar
                            </Button>
                        </div>
                    </div>
                    
                    <div className="mt-12 p-4 bg-secondary/50 rounded-xl border border-border flex items-center gap-4">
                        <Megaphone className="w-8 h-8 text-neon-purple shrink-0" />
                        <p className="text-xs text-muted-foreground italic">
                            Nota: Para mantener este servicio gratuito, verás algunos anuncios no intrusivos mientras usas la plataforma. ¡Gracias por apoyarnos!
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
