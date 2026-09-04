import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Brain, Clock, Zap, Target, Sparkles, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function StudyGuides() {
  const guides = [
    {
      title: "Método Pomodoro",
      subtitle: "Productividad Real",
      description: "Aprendé a usar intervalos de 25 minutos para maximizar tu enfoque y evitar el agotamiento mental.",
      icon: <Clock className="w-8 h-8 text-black" />,
      color: "bg-red-50/50 dark:bg-card border-red-200/30", // Red
      content: `El método Pomodoro no es solo un temporizador; es un sistema de gestión de la atención. Desarrollado por Francesco Cirillo, busca combatir la ansiedad que genera el paso del tiempo. 
      
      ¿Cómo aplicarlo en TABE? 
      1. Elegí una materia de tu plan. 
      2. Configurá el temporizador por 25 minutos de enfoque absoluto (sin celular). 
      3. Tomá un descanso de 5 minutos al sonar la alarma. 
      4. Después de 4 "pomodoros", tomá un descanso largo de 15-30 minutos.
      
      Esta técnica aprovecha los picos de concentración del cerebro humano, evitando que la fatiga cognitiva degrade tu capacidad de retención.`
    },
    {
      title: "Active Recall",
      subtitle: "Repaso Espaciado",
      description: "La técnica científica definitiva para no olvidar lo que estudiás.",
      icon: <Brain className="w-8 h-8 text-purple-500" />,
      color: "bg-purple-50/50 dark:bg-card border-purple-200/30", // Purple
      content: `El Active Recall (Evocación Activa) es el proceso de estimular activamente la memoria. En lugar de releer un texto (estudio pasivo), te obligás a recuperar la información de tu mente. 
      
      Combinado con el Repaso Espaciado (Spaced Repetition), esta técnica utiliza la "curva del olvido" de Ebbinghaus a tu favor. TABE automatiza este proceso mediante algoritmos que detectan cuándo es más probable que olvides un concepto, mostrándote esa flashcard en el momento exacto para consolidar la memoria a largo plazo.`
    },
    {
      title: "Técnica de Feynman",
      subtitle: "Toma de Apuntes",
      description: "Si no podés explicarlo de forma simple, es porque no lo entendiste lo suficiente.",
      icon: <Target className="w-8 h-8 text-green-500" />,
      color: "bg-green-50/50 dark:bg-card border-green-200/30", // Green
      content: `La toma de apuntes evolutiva y la técnica de Feynman son pilares en TABE. La idea es simple: tomá un concepto complejo y tratá de explicárselo a alguien que no sabe nada del tema. 
      
      Al intentar simplificar la explicación, detectarás "agujeros" en tu conocimiento. Fomentamos el uso de mapas mentales y diagramas de flujo para materias donde la relación entre conceptos es más importante que la definición aislada. Los apuntes no deben ser una copia de la pizarra, sino una síntesis de tu propia comprensión.`
    },
    {
      title: "IA Educativa",
      subtitle: "Tu Tutor 24/7",
      description: "La inteligencia artificial como copiloto, no como sustituto del pensamiento.",
      icon: <Sparkles className="w-8 h-8 text-yellow-500" />,
      color: "bg-yellow-50/50 dark:bg-card border-yellow-200/30", // Yellow
      content: `En la era de la IA, el valor del estudiante no está en memorizar datos, sino en saber conectar ideas. TABE utiliza modelos de lenguaje de última generación para actuar como un tutor socrático. 
      
      En lugar de darte la respuesta directa, nuestra IA te guía mediante preguntas para que vos mismo llegues a la solución. Puede resumir papers científicos, explicar teoremas complejos con analogías cotidianas y generar exámenes de práctica basados en tus propios archivos.`
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b-[3px] border-foreground bg-card sticky top-0 z-50 shadow-[0_4px_0_0_#000] dark:shadow-[0_4px_0_0_#fff]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-foreground font-black uppercase tracking-widest opacity-80 hover:opacity-100 hover:-translate-x-1 transition-all">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Volver al inicio</span>
          </Link>
          <div className="font-display font-black text-2xl tracking-widest text-foreground">TABE</div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12 p-10 neo-bento-card bento-hover-blue relative overflow-hidden bg-blue-50/30 dark:bg-background">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-4 bg-[#1475e5] border-b-[3px] border-foreground"></div>
          
          <h1 className="text-4xl md:text-6xl font-display font-black uppercase tracking-widest mb-6 mt-4 text-foreground">
            Guías de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1475e5] to-[#805ad5] drop-shadow-[2px_2px_0_#000] dark:drop-shadow-[2px_2px_0_#fff]">Estudio</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground font-medium max-w-2xl mx-auto">
            Metodologías probadas y tecnología de vanguardia para elevar tu rendimiento académico sin quemarte la cabeza.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {guides.map((guide, idx) => (
            <section 
              key={idx} 
              className={cn("neo-bento-card flex flex-col group", guide.color)}
            >
              {/* Header Icon */}
              <div className="h-16 relative">
                <div className="absolute top-6 left-6 w-14 h-14 bg-background border-[3px] border-foreground rounded-xl flex items-center justify-center shadow-[4px_4px_0_0_hsl(var(--foreground))]">
                  {guide.icon}
                </div>
              </div>

              <div className="p-6 pt-10 flex flex-col flex-1">
                <div className="mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{guide.subtitle}</h3>
                  <h2 className="text-2xl font-display font-black uppercase tracking-wider text-foreground leading-tight">{guide.title}</h2>
                </div>
                
                <p className="text-base text-foreground font-semibold mb-6">
                  {guide.description}
                </p>
                
                <div className="mt-auto pt-4 border-t-[3px] border-foreground/10">
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line font-medium">
                    {guide.content}
                  </p>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 text-center p-12 neo-bento-card bento-hover-yellow bg-yellow-50/50 dark:bg-background">
          <GraduationCap className="w-16 h-16 mx-auto mb-6 text-[#ffd21c]" />
          <h2 className="text-3xl font-display font-black uppercase tracking-widest mb-4 text-foreground">¿Listo para aplicar estas técnicas?</h2>
          <p className="text-black font-bold text-lg mb-8 max-w-lg mx-auto">
            TABE integra todas estas metodologías en una sola plataforma gratuita para estudiantes.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 text-xl px-12 py-8 rounded-xl font-black uppercase tracking-widest transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] active:translate-y-0 active:shadow-none mt-4">
              Registrarme Gratis
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
