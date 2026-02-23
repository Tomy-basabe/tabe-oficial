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
            q: "¿Cómo recibo mi usuario?",
            a: "Una vez que tocas el botón de comprar acceso, se abre un chat de WhatsApp con nuestro equipo. Al confirmar tu pago (sólo $7.000), te enviamos inmediatamente tu usuario y contraseña."
        },
        {
            q: "¿Cuánto tiempo me dura el acceso?",
            a: "El pago de $7.000 es un pago único. No hay suscripciones mensuales ni sorpresas. Tienes acceso permanente a los recursos y futuras actualizaciones."
        },
        {
            q: "¿Sirve para cualquier carrera?",
            a: "El contenido está enfocado en Matemática Universitaria y Física Aplicada (por ej. Álgebra, Análisis Matemático, Física I y II). Esto es común en Ingenierías, Exactas, Económicas y carreras afines."
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
