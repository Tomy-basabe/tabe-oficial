import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Brain, Clock, Zap, Target, Sparkles, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudyGuides() {
  const guides = [
    {
      title: "Método Pomodoro: Productividad Real",
      description: "Aprendé a usar intervalos de 25 minutos para maximizar tu enfoque y evitar el agotamiento mental.",
      icon: <Clock className="w-8 h-8 text-[#ff4e4e]" />,
      color: "border-[#ff4e4e]",
      bg: "bg-[#ff4e4e]/10",
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
      icon: <Brain className="w-8 h-8 text-[#805ad5]" />,
      color: "border-[#805ad5]",
      bg: "bg-[#805ad5]/10",
      content: `El Active Recall (Evocación Activa) es el proceso de estimular activamente la memoria durante el proceso de aprendizaje. En lugar de releer un texto (estudio pasivo), te obligas a recuperar la información de tu mente. 
      
      Combinado con el Repaso Espaciado (Spaced Repetition), esta técnica utiliza la "curva del olvido" de Ebbinghaus a tu favor. TABE automatiza este proceso mediante algoritmos que detectan cuándo es más probable que olvides un concepto, mostrándote esa flashcard o cuestionario en el momento exacto para consolidar la memoria a largo plazo. Estudiar menos horas, pero con mayor impacto científico.`
    },
    {
      title: "Técnica de Feynman y Toma de Apuntes",
      description: "Si no podés explicarlo de forma simple, es porque no lo entendiste lo suficiente.",
      icon: <Target className="w-8 h-8 text-[#25d06c]" />,
      color: "border-[#25d06c]",
      bg: "bg-[#25d06c]/10",
      content: `La toma de apuntes evolutiva y la técnica de Feynman son pilares en TABE. La idea es simple: tomá un concepto complejo y tratá de explicárselo a alguien que no sabe nada del tema (o a nuestra IA). 
      
      Al intentar simplificar la explicación, detectarás "agujeros" en tu conocimiento. En TABE, fomentamos el uso de mapas mentales y diagramas de flujo para materias como Análisis Matemático o Física, donde la relación entre conceptos es más importante que la definición aislada. Los apuntes no deben ser una copia de la pizarra, sino una síntesis de tu propia comprensión.`
    },
    {
      title: "IA en la Educación: Tu Tutor 24/7",
      description: "La inteligencia artificial como copiloto, no como sustituto del pensamiento.",
      icon: <Sparkles className="w-8 h-8 text-[#ffd21c]" />,
      color: "border-[#ffd21c]",
      bg: "bg-[#ffd21c]/10",
      content: `En la era de la IA, el valor del estudiante no está en memorizar datos, sino en saber conectar ideas. TABE utiliza modelos de lenguaje de última generación para actuar como un tutor socrático. 
      
      En lugar de darte la respuesta directa, nuestra IA te guía mediante preguntas para que vos mismo llegues a la solución. Puede resumir papers científicos, explicar teoremas complejos con analogías cotidianas y generar exámenes de práctica basados en tus propios archivos. Es la herramienta definitiva para el estudiante autodidacta que busca la excelencia sin límites geográficos ni horarios.`
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b-[3px] border-foreground bg-background sticky top-0 z-50 shadow-[0_4px_0_0_#000] dark:shadow-[0_4px_0_0_#fff]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-foreground font-black uppercase tracking-widest hover:-translate-x-1 transition-transform">
            <ArrowLeft className="w-5 h-5" />
            <span>Volver al inicio</span>
          </Link>
          <div className="font-display font-black text-2xl tracking-widest text-foreground">TABE</div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-16 p-8 bg-card border-[3px] border-foreground shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#fff] rounded-2xl">
          <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-widest mb-6">
            Guías de <span className="bg-foreground text-background px-4 py-1 rounded-sm ml-2">Estudio</span>
          </h1>
          <p className="text-xl text-foreground font-bold max-w-2xl mx-auto uppercase tracking-wider">
            Metodologías probadas y tecnología de vanguardia para elevar tu rendimiento académico.
          </p>
        </div>

        <div className="space-y-8">
          {guides.map((guide, idx) => (
            <section key={idx} className={`bg-card p-8 rounded-2xl border-[3px] shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#fff] transition-transform hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#000] dark:hover:shadow-[8px_8px_0_0_#fff] ${guide.color}`}>
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-xl border-[3px] border-foreground shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff] ${guide.bg}`}>
                  {guide.icon}
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-black uppercase tracking-widest leading-none">{guide.title}</h2>
              </div>
              <p className="text-lg text-foreground font-bold uppercase tracking-wider leading-relaxed mb-6">
                {guide.description}
              </p>
              <div className="p-6 rounded-xl bg-background border-[3px] border-foreground shadow-inner text-foreground font-bold leading-relaxed whitespace-pre-line">
                {guide.content}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 text-center p-12 rounded-3xl bg-[#ffd21c] border-[3px] border-foreground shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#fff]">
          <GraduationCap className="w-16 h-16 mx-auto mb-6 text-black" />
          <h2 className="text-3xl font-display font-black uppercase tracking-widest mb-4 text-black">¿Listo para aplicar estas técnicas?</h2>
          <p className="text-black font-bold uppercase tracking-wider mb-8 max-w-lg mx-auto">
            TABE integra todas estas metodologías en una sola plataforma gratuita para estudiantes.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-background text-foreground hover:bg-foreground hover:text-background border-[3px] border-foreground shadow-[4px_4px_0_0_#000] text-xl px-12 py-8 rounded-xl font-black uppercase tracking-widest transition-all hover:translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]">
              Registrarme Gratis
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
