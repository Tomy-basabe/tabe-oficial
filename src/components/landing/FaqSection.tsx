import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export function FaqSection() {
    const faqs = [
        { q: "¿Necesito conocimientos previos?", a: "No. La plataforma está diseñada para reforzar las bases desde cero, explicando cada paso fundamental antes de avanzar." },
        { q: "¿Cómo empiezo a estudiar?", a: "Registrate gratis en segundos y empezá a usar todas las herramientas. No necesitás tarjetas ni pagos." },
        { q: "¿Qué incluye el acceso?", a: "Acceso ilimitado al asistente IA, generación automática de cuestionarios y flashcards, y métricas avanzadas." },
        { q: "¿Cómo me ayuda la IA?", a: "Nuestra IA analiza tus apuntes y documentos para generar material de estudio personalizado: resúmenes, quizzes y flashcards." },
        { q: "¿Sirve para mi carrera?", a: "Sí. TABE se adapta a cualquier carrera: Medicina, Ingeniería, Derecho, Economía y más." },
    ];

    return (
        <section id="faq" className="py-20 md:py-28">
            <div className="container mx-auto px-4 md:px-6 max-w-3xl">
                <div className="text-center mb-14">
                    <span className="inline-block px-4 py-2 rounded-lg bg-[#48bd22]/10 border-2 border-[#48bd22]/20 text-sm font-extrabold text-[#48bd22] mb-5">
                        ❓ FAQ
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black mb-4">Preguntas Frecuentes</h2>
                    <p className="text-muted-foreground text-lg">Todo lo que necesitás saber antes de empezar.</p>
                </div>

                <Accordion type="single" collapsible className="w-full space-y-3">
                    {faqs.map((faq, i) => (
                        <AccordionItem key={i} value={`item-${i}`}
                            className="border-2 border-border rounded-xl px-5 shadow-[3px_3px_0_0_hsl(var(--border))] data-[state=open]:shadow-[3px_3px_0_0_#1475e5] data-[state=open]:border-[#1475e5]/40 transition-all">
                            <AccordionTrigger className="text-left font-extrabold text-base hover:no-underline py-4">
                                {faq.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4">
                                {faq.a}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}
