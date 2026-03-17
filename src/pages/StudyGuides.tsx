import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Brain, Clock, Zap, Target, Sparkles, GraduationCap } from "lucide-react";

export default function StudyGuides() {
  const guides = [
    {
      title: "Método Pomodoro: El secreto de la productividad",
      description: "Aprendé a usar intervalos de 25 minutos para maximizar tu enfoque y evitar el agotamiento mental.",
      icon: <Clock className="w-8 h-8 text-neon-cyan" />,
      content: `El método Pomodoro es una técnica de gestión del tiempo desarrollada por Francesco Cirillo a fines de la década de 1980. La técnica utiliza un temporizador para dividir el trabajo en intervalos, tradicionalmente de 25 minutos de duración, separados por breves descansos. Cada intervalo se conoce como un pomodoro, de la palabra italiana para 'tomate', en honor al temporizador de cocina con forma de tomate que Cirillo usó originalmente como estudiante universitario.`
    },
    {
      title: "Flashcards e Intervención Espaciada",
      description: "Descubrí por qué las flashcards son la herramienta de memorización más poderosa para estudiantes universitarios.",
      icon: <Brain className="w-8 h-8 text-neon-purple" />,
      content: `La repetición espaciada es una técnica de aprendizaje que se realiza con intervalos de tiempo crecientes entre cada repaso posterior de material de entrenamiento previamente aprendido, para explotar el efecto de espaciamiento psicológico. Las flashcards (tarjetas de memoria) combinadas con inteligencia artificial permiten que TABE te pregunte exactamente lo que estás a punto de olvidar.`
    },
    {
      title: "IA en la Educación: Cómo Estudiar más Inteligente",
      description: "La inteligencia artificial no es para copiar, es para comprender mejor. Usá TABE para explicar temas complejos.",
      icon: <Sparkles className="w-8 h-8 text-neon-gold" />,
      content: `TABE utiliza modelos de lenguaje avanzados para actuar como un tutor personal. Puede generar cuestionarios, resumir textos densos y explicar conceptos de física o matemática como si fuera un profesor particular disponible las 24 horas.`
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Volver al inicio</span>
          </Link>
          <div className="font-display font-bold text-xl tracking-tight gradient-text">TABE</div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Guías de <span className="gradient-text">Estudio</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Metodologías probadas y tecnología de vanguardia para elevar tu rendimiento académico.
          </p>
        </div>

        <div className="space-y-12">
          {guides.map((guide, idx) => (
            <section key={idx} className="card-gamer p-8 rounded-2xl border border-border bg-secondary/10">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-background border border-border/50">
                  {guide.icon}
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold">{guide.title}</h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                {guide.description}
              </p>
              <div className="p-6 rounded-xl bg-background/40 text-muted-foreground border-l-4 border-neon-cyan leading-relaxed italic">
                {guide.content}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-20 text-center p-12 rounded-3xl bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 border border-neon-cyan/20">
          <GraduationCap className="w-16 h-16 mx-auto mb-6 text-neon-cyan" />
          <h2 className="text-3xl font-display font-bold mb-4">¿Listo para aplicar estas técnicas?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            TABE integra todas estas metodologías en una sola plataforma gratuita para estudiantes.
          </p>
          <Link 
            to="/auth" 
            className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-full font-bold text-xl hover:scale-105 transition-transform"
          >
            Registrarme Gratis
          </Link>
        </div>
      </main>
    </div>
  );
}
