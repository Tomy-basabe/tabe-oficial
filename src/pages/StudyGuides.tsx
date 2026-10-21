import { Link } from "react-router-dom";
import { ArrowRight, Brain, Clock, Target, Bot } from "lucide-react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";

const GUIDES = [
  {
    icon: Clock,
    title: "Método Pomodoro",
    subtitle: "Productividad",
    description: "Intervalos de 25 minutos para sostener el foco sin agotarte.",
    content: [
      "El método Pomodoro es un sistema de gestión de la atención desarrollado por Francesco Cirillo. Divide el estudio en bloques cortos y reduce la ansiedad que genera el paso del tiempo.",
      "Cómo aplicarlo en TABE: elegí una materia de tu plan, configurá 25 minutos de enfoque sin celular, descansá 5 minutos cuando suene la alarma y, tras 4 pomodoros, tomá un descanso largo de 15 a 30 minutos.",
      "La técnica aprovecha los picos de concentración y evita que la fatiga cognitiva degrade tu retención.",
    ],
  },
  {
    icon: Brain,
    title: "Active Recall",
    subtitle: "Repaso espaciado",
    description: "La técnica con más respaldo científico para no olvidar lo que estudiás.",
    content: [
      "La evocación activa consiste en recuperar la información desde tu memoria en lugar de releer el texto. Estudiar de forma pasiva da sensación de dominio, pero consolida menos.",
      "Combinada con el repaso espaciado, usa la curva del olvido de Ebbinghaus a tu favor. TABE detecta cuándo es más probable que olvides un concepto y te muestra esa flashcard en el momento justo.",
    ],
  },
  {
    icon: Target,
    title: "Técnica de Feynman",
    subtitle: "Toma de apuntes",
    description: "Si no podés explicarlo de forma simple, todavía no lo entendiste del todo.",
    content: [
      "Tomá un concepto complejo e intentá explicárselo a alguien que no sabe del tema. Al simplificar, aparecen los huecos en tu conocimiento.",
      "En materias donde importa la relación entre conceptos, los mapas mentales y los diagramas de flujo funcionan mejor que la definición aislada. Tus apuntes deben ser una síntesis propia, no una copia del pizarrón.",
    ],
  },
  {
    icon: Bot,
    title: "IA como tutor",
    subtitle: "Estudio asistido",
    description: "La inteligencia artificial como copiloto, no como sustituto del pensamiento.",
    content: [
      "El valor del estudiante está en conectar ideas más que en memorizar datos. TABE usa modelos de lenguaje como tutor socrático.",
      "En lugar de darte la respuesta directa, te guía con preguntas hasta que llegues vos. También resume textos, explica teoremas con analogías y genera exámenes de práctica a partir de tus propios archivos.",
    ],
  },
];

export default function StudyGuides() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LandingNavbar />

      <main className="flex-1">
        <header className="pt-32 pb-12 md:pt-40 md:pb-16 border-b border-border/50">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.1]">
              Guías de estudio
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Metodologías probadas para estudiar mejor, con menos horas y sin quemarte.
            </p>
          </div>
        </header>

        <section className="container mx-auto px-4 sm:px-6 max-w-5xl py-14 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {GUIDES.map((g) => {
              const Icon = g.icon;
              return (
                <article
                  key={g.title}
                  className="flex flex-col p-6 md:p-7 rounded-2xl border border-border/70 bg-card shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary border border-border/60 flex items-center justify-center text-foreground">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-muted-foreground">{g.subtitle}</span>
                  </div>
                  <h2 className="mt-5 text-xl font-semibold tracking-tight">{g.title}</h2>
                  <p className="mt-1.5 text-sm text-foreground/80 leading-relaxed">{g.description}</p>
                  <div className="mt-5 pt-5 border-t border-border/60 space-y-3 text-sm text-muted-foreground leading-relaxed">
                    {g.content.map((p) => (
                      <p key={p.slice(0, 24)}>{p}</p>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-14 text-center p-10 md:p-14 rounded-3xl border border-border/70 bg-card shadow-sm">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">¿Listo para aplicarlas?</h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto text-sm md:text-base">
              TABE integra todas estas metodologías en una sola plataforma gratuita.
            </p>
            <Link
              to="/registro"
              className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Registrarme gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
