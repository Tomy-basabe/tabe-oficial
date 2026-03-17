import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Brain, Clock, Zap, Target, Sparkles, GraduationCap } from "lucide-react";

export default function StudyGuides() {
  const guides = [
    {
      title: "Método Pomodoro: Productividad Real",
      description: "Aprendé a usar intervalos de 25 minutos para maximizar tu enfoque y evitar el agotamiento mental.",
      icon: <Clock className="w-8 h-8 text-neon-cyan" />,
      content: `El método Pomodoro no es solo un temporizador; es un sistema de gestión de la atención. Desarrollado por Francesco Cirillo, busca combatir la ansiedad que genera el paso del tiempo ("el devenir"). 
      
      ¿Cómo aplicarlo en TABE? 
      1. Elegí una materia de tu plan. 
      2. Configurá el temporizador por 25 minutos de enfoque absoluto (sin celular). 
      3. Tomá un descanso de 5 minutos al sonar la alarma. 
      4. Después de 4 "pomodoros", tomá un descanso largo de 15-30 minutos.
      
      Esta técnica aprovecha los picos de concentración del cerebro humano, evitando que la fatiga cognitiva degrade tu capacidad de retención. En carreras de ingeniería o exactas, donde el esfuerzo mental es intenso, los descansos cortos permiten que la 'red neuronal por defecto' procese la información difícil en segundo plano.`
    },
    {
      title: "Active Recall y Repaso Espaciado",
      description: "La técnica científica definitiva para no olvidar lo que estudiaste ayer.",
      icon: <Brain className="w-8 h-8 text-neon-purple" />,
      content: `El Active Recall (Evocación Activa) es el proceso de estimular activamente la memoria durante el proceso de aprendizaje. En lugar de releer un texto (estudio pasivo), te obligas a recuperar la información de tu mente. 
      
      Combinado con el Repaso Espaciado (Spaced Repetition), esta técnica utiliza la "curva del olvido" de Ebbinghaus a tu favor. TABE automatiza este proceso mediante algoritmos que detectan cuándo es más probable que olvides un concepto, mostrándote esa flashcard o cuestionario en el momento exacto para consolidar la memoria a largo plazo. Estudiar menos horas, pero con mayor impacto científico.`
    },
    {
      title: "Técnica de Feynman y Toma de Apuntes",
      description: "Si no podés explicarlo de forma simple, es porque no lo entendiste lo suficiente.",
      icon: <Target className="w-8 h-8 text-neon-green" />,
      content: `La toma de apuntes evolutiva y la técnica de Feynman son pilares en TABE. La idea es simple: tomá un concepto complejo y tratá de explicárselo a alguien que no sabe nada del tema (o a nuestra IA). 
      
      Al intentar simplificar la explicación, detectarás "agujeros" en tu conocimiento. En TABE, fomentamos el uso de mapas mentales y diagramas de flujo para materias como Análisis Matemático o Física, donde la relación entre conceptos es más importante que la definición aislada. Los apuntes no deben ser una copia de la pizarra, sino una síntesis de tu propia comprensión.`
    },
    {
      title: "IA en la Educación: Tu Tutor 24/7",
      description: "La inteligencia artificial como copiloto, no como sustituto del pensamiento.",
      icon: <Sparkles className="w-8 h-8 text-neon-gold" />,
      content: `En la era de la IA, el valor del estudiante no está en memorizar datos, sino en saber conectar ideas. TABE utiliza modelos de lenguaje de última generación para actuar como un tutor socrático. 
      
      En lugar de darte la respuesta directa, nuestra IA te guía mediante preguntas para que vos mismo llegues a la solución. Puede resumir papers científicos, explicar teoremas complejos con analogías cotidianas y generar exámenes de práctica basados en tus propios archivos. Es la herramienta definitiva para el estudiante autodidacta que busca la excelencia sin límites geográficos ni horarios.`
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
