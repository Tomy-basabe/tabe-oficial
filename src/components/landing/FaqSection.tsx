import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export function FaqSection() {
  const faqs = [
    {
      q: "¿Necesito conocimientos previos para usar TABE?",
      a: "No, en absoluto. La plataforma está diseñada para acompañarte desde tu primer día universitario. Podés organizar tus materias, subir apuntes y practicar preguntas de examen desde cero.",
    },
    {
      q: "¿Cómo empiezo a estudiar gratis?",
      a: "Te registrás en pocos segundos con tu correo electrónico o ingresás como invitado. No solicitamos tarjeta de crédito ni datos de pago.",
    },
    {
      q: "¿Qué herramientas incluye la plataforma?",
      a: "Acceso al Tutor IA contextual, generador de cuestionarios y flashcards con repetición espaciada, cronómetro Pomodoro con seguimiento de hábitos y mapas interactivos de correlatividades.",
    },
    {
      q: "¿Cómo asiste la Inteligencia Artificial?",
      a: "Nuestra IA analiza tus apuntes y resúmenes para generar preguntas de examen realistas, analogías claras y explicaciones paso a paso sin desvíos.",
    },
    {
      q: "¿Sirve para cualquier carrera universitaria?",
      a: "Sí, es completamente adaptable. Estudiantes de Ingeniería, Medicina, Abogacía, Ciencias Económicas y Humanidades ya gestionan sus materias y exámenes en TABE.",
    },
  ];

  return (
    <section id="faq" className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4 md:px-6 max-w-3xl relative z-10">
        
        <div className="text-center mb-16 space-y-3">
          <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider">
            Preguntas Frecuentes
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Todo lo que necesitás saber
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
            Respuestas directas a las dudas habituales sobre el funcionamiento de TABE.
          </p>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 sm:p-8 shadow-xs">
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-b border-zinc-100 dark:border-zinc-800/80 last:border-0 pb-3"
              >
                <AccordionTrigger className="text-left text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 hover:no-underline py-2.5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed pt-1">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

      </div>
    </section>
  );
}
