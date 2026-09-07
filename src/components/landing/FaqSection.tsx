import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Sparkles } from "lucide-react";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { useComic } from "@/components/comic/ComicEffectsProvider";
import { ComicAudio } from "@/components/comic/ComicAudio";

export function FaqSection() {
  const { triggerBurst } = useComic();

  const faqs = [
    {
      q: "¿Necesito conocimientos previos para usar TABE?",
      a: "¡Para nada! La plataforma está diseñada para acompañarte desde tu primer día universitario. Podés organizar materias, cargar apuntes y empezar a estudiar desde cero.",
      color: "#FFE600",
    },
    {
      q: "¿Cómo empiezo a estudiar gratis?",
      a: "Te registrás en menos de 10 segundos con tu correo o como invitado. No pedimos tarjeta de crédito ni datos bancarios.",
      color: "#00E5FF",
    },
    {
      q: "¿Qué incluye el acceso a la plataforma?",
      a: "Acceso total al Asistente IA, generador de quizzes y flashcards con repetición espaciada, cronómetro Pomodoro con 'Mi Bosque' y mapa de correlatividades.",
      color: "#FF2E93",
    },
    {
      q: "¿Cómo me ayuda la Inteligencia Artificial?",
      a: "Nuestra IA lee tus apuntes, resúmenes o dudas y te genera preguntas de examen reales, analogías sencillas y explicaciones paso a paso sin vueltas.",
      color: "#00FF66",
    },
    {
      q: "¿Sirve para cualquier carrera universitaria?",
      a: "Sí, es 100% adaptable. Alumnos de Ingeniería, Medicina, Abogacía, Ciencias Económicas y Psicología ya dominan sus parciales con TABE.",
      color: "#FF6B00",
    },
  ];

  const handleTriggerClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, "RESPUESTA!");
    ComicAudio.playPop();
  };

  return (
    <section id="faq" className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4 md:px-6 max-w-3xl relative z-10">
        <div className="text-center mb-16 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <ComicBadge variant="green" rotate="left" size="md">
              <HelpCircle className="w-3.5 h-3.5" /> DUDAS RESUELTAS
            </ComicBadge>
            <ComicBadge variant="cyan" rotate="right" size="md">
              <Sparkles className="w-3.5 h-3.5" /> FAQ CÓMIC
            </ComicBadge>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-foreground">
            Preguntas <span className="text-[#1475e5] underline decoration-wavy decoration-[#FFE600]">Frecuentes</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg font-bold">
            Todo lo que necesitás saber antes de dar el salto al estudio inteligente.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="bg-card border-[2.5px] border-foreground rounded-2xl px-6 shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] transition-all duration-200 select-none overflow-hidden"
              style={{
                borderLeftWidth: "6px",
                borderLeftColor: faq.color,
              }}
            >
              <AccordionTrigger
                onClick={handleTriggerClick}
                className="text-left font-black text-base sm:text-lg uppercase tracking-tight py-5 hover:no-underline transition-colors"
              >
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm sm:text-base font-bold leading-relaxed pb-5 pt-1">
                <div className="p-3.5 rounded-xl bg-secondary/50 border border-foreground/30 shadow-xs">
                  {faq.a}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
