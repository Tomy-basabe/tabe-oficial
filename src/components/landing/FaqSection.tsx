import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export function FaqSection() {
    const faqs = [
        {
            q: "¿Necesito conocimientos previos?",
            a: "No obligatoriamente. La plataforma está diseñada para reforzar las bases desde cero, explicando cada paso fundamental antes de avanzar a temas más complejos."
        },
        {
            q: "¿Cómo empiezo a estudiar?",
            a: "¡Es muy fácil! Podés registrarte gratis en segundos y empezar a usar las herramientas básicas. No necesitás tarjetas ni pagos previos para probar el potencial de la plataforma."
        },
        {
            q: "¿Qué incluye el acceso Premium?",
            a: "Tabe Pro te da acceso ilimitado a nuestro asistente con IA, generación automática de cuestionarios y flashcards basadas en tus apuntes, y métricas avanzadas para trackear tu progreso real por materia."
        },
        {
            q: "¿Cómo me ayuda la IA de Tabe?",
            a: "Nuestra IA analiza tus propios apuntes y documentos para generar material de estudio personalizado. Puede crearte resúmenes, cuestionarios y flashcards exactas, ahorrándote horas de trabajo manual."
        },
        {
            q: "¿Sirve para mi carrera?",
            a: "Sí. Tabe está diseñado para ser flexible. Ya sea que estudies Medicina, Ingeniería, Derecho o cualquier otra carrera, nuestras herramientas de organización y estudio se adaptan a tus necesidades específicas."
        }
    ];

    return (
        <section id="faq" className="py-24 bg-background">
            <div className="container mx-auto px-4 md:px-6 max-w-3xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
                        Preguntas Frecuentes
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Todo lo que necesitas saber antes de empezar.
                    </p>
                </div>

                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, i) => (
                        <AccordionItem key={i} value={`item-${i}`} className="border-border">
                            <AccordionTrigger className="text-left font-bold text-lg hover:text-neon-cyan transition-colors">
                                {faq.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                                {faq.a}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}
