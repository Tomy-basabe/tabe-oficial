import { Link } from "react-router-dom";
import {
  Users,
  Target,
  Shield,
  BookOpen,
  Brain,
  ChevronRight,
  GraduationCap,
  Network,
  Cpu,
  Compass,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";

const METHODOLOGIES = [
  {
    icon: Brain,
    title: "Neurociencia Cognitiva",
    category: "Retención Activa",
    desc: "Algoritmos de repetición espaciada basados en la curva del olvido de Ebbinghaus para afianzar conceptos y fórmulas en memoria a largo plazo.",
    badge: "Algoritmo SM-2",
  },
  {
    icon: Cpu,
    title: "Tutoría Socrática con IA",
    category: "Pedagogía Asistida",
    desc: "Inteligencia artificial que no entrega respuestas prefabricadas, sino que guía tu razonamiento deductivo paso a paso con preguntas disparadoras.",
    badge: "Razonamiento Contextual",
  },
  {
    icon: Network,
    title: "Malla de Correlatividades",
    category: "Optimización de Ruta",
    desc: "Estructuras de grafos dirigidos que identifican prerrequisitos críticos y cuellos de botella para planificar cada cuatrimestre sin sorpresas.",
    badge: "Teoría de Grafos",
  },
];

const METRICS = [
  { value: "+350", label: "Estudiantes activos", detail: "En universidades de todo el país" },
  { value: "15+", label: "Carreras modeladas", detail: "Mallas y correlatividades oficiales" },
  { value: "100%", label: "Arquitectura Offline", detail: "PWA instalable con sincronización" },
  { value: "0$", label: "Acceso Universal", detail: "Gratuito para toda la comunidad académica" },
];

const VALUES = [
  {
    icon: Target,
    title: "Rigor y Claridad",
    desc: "Diseñamos cada función para reducir la fricción cognitiva y potenciar el estudio profundo, evitando distracciones innecesarias.",
  },
  {
    icon: Shield,
    title: "Privacidad Innegociable",
    desc: "Tus apuntes, calificaciones y proyectos son de tu exclusiva propiedad. Cumplimos estrictamente la Ley 25.326 y estándares RGPD.",
  },
  {
    icon: Users,
    title: "Comunidad Solidaria",
    desc: "Creemos en la democratización del conocimiento universitario. Apuntes compartidos, mazos colaborativos y apoyo mutuo.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-foreground">
      <LandingNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden border-b border-border/50">
          {/* Ambient Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/8 dark:bg-primary/10 rounded-full blur-[130px] pointer-events-none" />

          <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-4xl text-center">

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
              Potenciando a la próxima generación de universitarios.
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto font-normal">
              TABE combina pedagogía cognitiva, diseño minimalista y modelos de inteligencia artificial socrática para transformar la manera en que los estudiantes organizan, estudian y aprueban su carrera.
            </p>
          </div>
        </section>

        {/* Quiénes somos / Historia */}
        <section className="py-20 md:py-28 border-b border-border/50">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="space-y-6">

                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                  Nacido en Mendoza, expandido para toda la comunidad universitaria.
                </h2>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-normal">
                  TABE comenzó en las aulas de ingeniería ante una realidad palpable: la enorme dispersión de apuntes, fechas de examen, correlatividades confusas y la falta de un sistema integral que acompañe el esfuerzo cotidiano del estudiante.
                </p>

                <p className="text-base text-muted-foreground leading-relaxed font-normal">
                  Hoy, el proyecto evoluciona como una plataforma moderna y accesible donde cada estudiante cuenta con un espacio ordenado: apuntes con tipografía cuidada, temporizadores de enfoque con gamificación de islas y árboles, y un tutor de IA contextualizado a su plan de estudio.
                </p>

                <div className="pt-2 flex flex-wrap gap-2.5">
                  {[
                    "Creado por y para estudiantes",
                    "Validado en planes de estudio reales",
                    "Metodologías de estudio activas",
                    "Arquitectura liviana y offline",
                  ].map((item) => (
                    <div
                      key={item}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border/80 text-xs font-medium text-foreground"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphic Mockup / Card */}
              <div className="relative">
                <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-card/90 to-card/50 p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6 ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
                  <div className="flex items-center justify-between border-b border-border/60 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary">
                        <Compass className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">Ecosistema TABE</div>
                        <div className="text-xs text-muted-foreground">Arquitectura integral de estudio</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                      v3.4 Activa
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-secondary/60 border border-border/60">
                      <div className="text-xs text-muted-foreground font-medium">Repetición</div>
                      <div className="text-lg font-bold text-foreground mt-0.5">Flashcards SM-2</div>
                      <div className="text-[11px] text-muted-foreground mt-1">Retención activa a largo plazo</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-secondary/60 border border-border/60">
                      <div className="text-xs text-muted-foreground font-medium">Planificación</div>
                      <div className="text-lg font-bold text-foreground mt-0.5">Malla Dinámica</div>
                      <div className="text-[11px] text-muted-foreground mt-1">Correlatividades y avance</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-secondary/60 border border-border/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Editor Académico</div>
                      <div className="text-sm font-semibold text-foreground mt-0.5">Bloques matemáticos & KaTeX</div>
                    </div>
                    <div className="text-xs font-semibold text-primary">Exportación limpia</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Metodologías Científicas */}
        <section className="py-20 md:py-28 border-b border-border/50 bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="max-w-2xl mx-auto text-center mb-16 space-y-3">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Metodologías comprobadas, no atajos vacíos.
              </h2>
              <p className="text-base text-muted-foreground">
                Cada módulo de la plataforma responde a investigaciones concretas sobre aprendizaje y ciencias cognitivas.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {METHODOLOGIES.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.title}
                    className="group bg-card/90 backdrop-blur-sm border border-border/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-md border border-border/60">
                          {m.badge}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                        {m.category}
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2">
                        {m.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed font-normal">
                        {m.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Métricas e Impacto */}
        <section className="py-20 md:py-28 border-b border-border/50">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <div className="max-w-2xl mx-auto text-center mb-14 space-y-2">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Hecho para la realidad universitaria.
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {METRICS.map((met) => (
                <div
                  key={met.label}
                  className="bg-card border border-border/80 rounded-2xl p-6 text-center space-y-2 shadow-sm"
                >
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                    {met.value}
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {met.label}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {met.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Principios y Valores */}
        <section className="py-20 md:py-28 border-b border-border/50 bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="max-w-2xl mx-auto text-center mb-16 space-y-2">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Nuestros principios rectores.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {VALUES.map((val) => {
                const Icon = val.icon;
                return (
                  <div
                    key={val.title}
                    className="bg-card border border-border/80 rounded-2xl p-6 sm:p-7 shadow-sm space-y-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 text-primary flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      {val.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-normal">
                      {val.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl text-center">
            <div className="bg-card border border-border/80 rounded-3xl p-8 sm:p-12 md:p-16 shadow-xl relative overflow-hidden ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
              <div className="max-w-xl mx-auto space-y-6 relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                  Tu plan de carrera con la claridad que merecés.
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Sumate a los estudiantes que ya organizan sus materias, apuntes y exámenes con TABE de forma ágil y sin complicaciones.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Link
                    to="/registro"
                    className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-sm transition-all flex items-center gap-2"
                  >
                    <span>Comenzar gratis</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/carreras"
                    className="px-6 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold text-sm border border-border transition-colors flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Ver planes de estudio</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
