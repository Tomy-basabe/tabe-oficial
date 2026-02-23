import { KeyRound, Smartphone, Rocket } from "lucide-react";

export function HowItWorksSection() {
    const steps = [
        {
            num: "01",
            title: "Recibe tu Acceso",
            desc: "Al confirmar tu inscripción por WhatsApp, te entregamos usuario y contraseña para nuestra plataforma web y móvil.",
            icon: KeyRound,
            color: "from-blue-500 to-cyan-500",
            delay: "0 delay-[0ms]",
        },
        {
            num: "02",
            title: "Estudia Interactivo",
            desc: "No más PDFs aburridos. Usa nuestras flashcards generadas por IA, cuestionarios y mapas de correlatividades.",
            icon: Smartphone,
            color: "from-neon-purple to-pink-500",
            delay: "delay-[200ms]",
        },
        {
            num: "03",
            title: "Mejora tu Rendimiento",
            desc: "Mide tu progreso, acumula horas de estudio en tu 'Bosque' personal y aprueba tu próximo examen.",
            icon: Rocket,
            color: "from-neon-green to-emerald-500",
            delay: "delay-[400ms]",
        }
    ];

    return (
        <section className="py-24 relative overflow-hidden bg-secondary/20">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-2xl mx-auto mb-20">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
                        Cómo Funciona TABE
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Un proceso simple y directo para que empieces a mejorar tus notas desde el primer día.
                    </p>
                </div>

                <div className="relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-border -z-10" />

                    <div className="grid md:grid-cols-3 gap-10">
                        {steps.map((step, i) => {
                            const Icon = step.icon;
                            return (
                                <div key={i} className={`relative flex flex-col items-center text-center animate-fade-in-up ${step.delay}`}>
                                    <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${step.color} p-1 mb-8 shadow-xl shadow-background/50 relative z-10`}>
                                        <div className="w-full h-full bg-card rounded-full flex flex-col items-center justify-center border-4 border-background">
                                            <Icon className="w-8 h-8 text-foreground" />
                                        </div>
                                    </div>

                                    <div className="absolute top-0 right-1/2 translate-x-12 -translate-y-4 text-6xl font-display font-black text-secondary/50 -z-10">
                                        {step.num}
                                    </div>

                                    <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed max-w-sm">
                                        {step.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
