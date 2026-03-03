import { CheckCircle2, ArrowRight, ShieldCheck, Crown, Sparkles } from "lucide-react";

const plans = [
    {
        id: "mensual",
        name: "Mensual",
        price: 5000,
        period: "/mes",
        savings: null,
        highlight: false,
        whatsappMsg: "Hola,%20quiero%20el%20plan%20MENSUAL%20de%20TABE%20($5.000)",
    },
    {
        id: "semestral",
        name: "Semestral",
        price: 25000,
        period: "/6 meses",
        savings: { amount: 5000, percent: "17%" },
        highlight: true,
        whatsappMsg: "Hola,%20quiero%20el%20plan%20SEMESTRAL%20de%20TABE%20($25.000)",
    },
    {
        id: "anual",
        name: "Anual",
        price: 45000,
        period: "/año",
        savings: { amount: 15000, percent: "25%" },
        highlight: false,
        whatsappMsg: "Hola,%20quiero%20el%20plan%20ANUAL%20de%20TABE%20($45.000)",
    },
];

export function PricingSection() {
    const benefits = [
        "Acceso ilimitado a todo el contenido",
        "Asistente IA sin restricciones",
        "Flashcards, Cuestionarios y Apuntes ilimitados",
        "Visor PDF con IA integrada",
        "Estadísticas avanzadas y gamificación",
    ];

    return (
        <section id="planes" className="py-24 relative overflow-hidden bg-secondary/30">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neon-purple/5 via-background to-background -z-10" />

            <div className="container mx-auto px-4 md:px-6 max-w-6xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
                        Inversión en tu Futuro
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Elegí el plan que mejor se adapte a tu ritmo. Pagá a través de WhatsApp y activamos tu cuenta al instante.
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative rounded-2xl overflow-hidden border flex flex-col transition-all duration-300 hover:-translate-y-1 ${plan.highlight
                                ? "border-neon-cyan shadow-[0_0_30px_rgba(0,255,170,0.15)] bg-card scale-[1.03]"
                                : "border-border bg-card/80 hover:border-muted-foreground/30"
                                }`}
                        >
                            {/* Top glow line */}
                            {plan.highlight && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan to-neon-purple" />
                            )}

                            {/* Popular badge */}
                            {plan.highlight && (
                                <div className="absolute top-4 right-4">
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
                                        <Sparkles className="w-3 h-3" />
                                        Más elegido
                                    </span>
                                </div>
                            )}

                            <div className="p-8 flex flex-col flex-1">
                                {/* Plan Name */}
                                <h3 className="text-lg font-bold mb-6">{plan.name}</h3>

                                {/* Price */}
                                <div className="mb-2">
                                    <div className="flex items-end gap-1">
                                        <span className="text-4xl font-black font-display bg-gradient-to-br from-foreground to-foreground/70 text-transparent bg-clip-text">
                                            ${plan.price.toLocaleString("es-AR")}
                                        </span>
                                        <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>
                                    </div>
                                </div>

                                {/* Savings badge */}
                                {plan.savings ? (
                                    <div className="flex items-center gap-2 mb-6">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-neon-green/15 text-neon-green border border-neon-green/25">
                                            <ShieldCheck className="w-3 h-3" />
                                            Ahorrás ${plan.savings.amount.toLocaleString("es-AR")} ({plan.savings.percent})
                                        </span>
                                    </div>
                                ) : (
                                    <div className="mb-6">
                                        <span className="text-xs text-muted-foreground">Sin compromiso</span>
                                    </div>
                                )}

                                {/* Monthly equivalent for semestral/anual */}
                                {plan.id !== "mensual" && (
                                    <p className="text-xs text-muted-foreground mb-6 -mt-3">
                                        Equivale a <span className="font-semibold text-foreground">
                                            ${Math.round(plan.price / (plan.id === "semestral" ? 6 : 12)).toLocaleString("es-AR")}
                                        </span>/mes
                                    </p>
                                )}

                                {/* Benefits */}
                                <ul className="space-y-3 mb-8 flex-1">
                                    {benefits.map((b, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${plan.highlight ? "text-neon-cyan" : "text-muted-foreground"}`} />
                                            <span>{b}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA */}
                                <a
                                    href={`https://wa.me/5492617737367?text=${plan.whatsappMsg}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${plan.highlight
                                        ? "bg-gradient-to-r from-neon-cyan to-neon-purple text-white hover:shadow-[0_0_30px_rgba(0,255,170,0.3)] hover:-translate-y-0.5"
                                        : "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                                        }`}
                                >
                                    <Crown className="w-4 h-4" />
                                    Elegir {plan.name}
                                    <ArrowRight className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-center text-sm text-muted-foreground max-w-lg mx-auto">
                    Contactanos por WhatsApp, realizá la transferencia y activamos tu cuenta Premium al instante. Sin tarjeta, sin complicaciones.
                </p>
            </div>
        </section>
    );
}
