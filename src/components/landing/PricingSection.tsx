import { CheckCircle2, Sparkles, Megaphone } from "lucide-react";
import { Link } from "react-router-dom";

export function PricingSection() {
    const benefits = [
        "Acceso ilimitado a todo el contenido",
        "Asistente IA sin restricciones",
        "Flashcards y Cuestionarios sin límites",
        "Marketplace totalmente abierto",
        "Estadísticas avanzadas para todos",
    ];

    return (
        <section id="planes" className="py-20 md:py-28">
            <div className="container mx-auto px-4 md:px-6 max-w-4xl">
                <div className="text-center mb-14">
                    <span className="inline-block px-4 py-2 rounded-lg bg-[#1475e5]/10 border-2 border-[#1475e5]/20 text-sm font-extrabold text-[#1475e5] mb-6">
                        ✨ Nueva Era TABE
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black mb-5">
                        Todo es Gratis. <span className="text-[#1475e5]">Para Siempre.</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Eliminamos todas las suscripciones. 100% de las funciones sin pagar un centavo.
                    </p>
                </div>

                <div className="bg-card rounded-xl border-2 border-border shadow-[6px_6px_0_0_#1475e5] p-8 md:p-12 max-w-2xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1 space-y-5">
                            <h3 className="text-xl font-extrabold flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-[#48bd22]" />
                                Beneficios Desbloqueados
                            </h3>
                            <ul className="space-y-3">
                                {benefits.map((b, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm font-bold">
                                        <div className="mt-1.5 w-2 h-2 rounded-full bg-[#1475e5] flex-shrink-0" />
                                        {b}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="text-center space-y-4">
                            <div>
                                <p className="text-muted-foreground line-through text-lg">$5.000 ARS</p>
                                <p className="text-5xl font-black text-[#1475e5]">$0</p>
                                <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mt-1">Soporte por Anuncios</p>
                            </div>
                            <Link to="/registro"
                                className="inline-block w-full px-6 py-3.5 bg-foreground text-background rounded-lg font-extrabold text-sm border-2 border-foreground shadow-[3px_3px_0_0_#ff9415] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#ff9415] active:translate-y-0.5 active:shadow-none">
                                Empezar a Estudiar
                            </Link>
                        </div>
                    </div>
                    
                    <div className="mt-10 p-4 bg-secondary/60 rounded-lg border-2 border-border flex items-center gap-4">
                        <Megaphone className="w-6 h-6 text-[#ff9415] shrink-0" />
                        <p className="text-xs text-muted-foreground">
                            Para mantener este servicio gratuito, verás algunos anuncios no intrusivos. ¡Gracias por apoyarnos!
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
