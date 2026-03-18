import { Link } from "react-router-dom";
import { ArrowLeft, GraduationCap, ChevronRight, BookOpen, Clock, Target, ArrowRight } from "lucide-react";

// Import all JSON templates from the data directory
const careerTemplates = import.meta.glob('../data/*_template.json', { eager: true });

const careers = Object.entries(careerTemplates).map(([path, module]: [string, any]) => {
  const id = path.split('/').pop()?.replace('_template.json', '') || '';
  const data = module.default || module;
  
  // Extract or derive metadata
  const subjects = data.subjects || [];
  const maxYear = Math.max(...subjects.map((s: any) => s.año || 0), 0);
  
  // Map IDs to human names (this could be improved by adding a 'name' field to JSONs)
  const nameMap: Record<string, { name: string, university: string, icon: any, color: string }> = {
    "agronomia_uncuyo": { 
      name: "Ingeniería en Agronomía", 
      university: "UNCUYO", 
      icon: <BookOpen className="w-6 h-6 text-neon-cyan" />, 
      color: "from-neon-cyan/20 to-neon-cyan/5" 
    },
    "civil": { 
      name: "Ingeniería Civil", 
      university: "UTN FRM / UNSJ", 
      icon: <Target className="w-6 h-6 text-neon-purple" />, 
      color: "from-neon-purple/20 to-neon-purple/5" 
    },
    "sistemas": { 
      name: "Ingeniería en Sistemas", 
      university: "UTN FRM", 
      icon: <GraduationCap className="w-6 h-6 text-neon-green" />, 
      color: "from-neon-green/20 to-neon-green/5" 
    },
    "electromecanica_unsj": { 
      name: "Ingeniería Electromecánica", 
      university: "UNSJ", 
      icon: <Target className="w-6 h-6 text-neon-orange" />, 
      color: "from-orange-500/20 to-orange-500/5" 
    },
    "energia_electrica_unsj": { 
      name: "Ingeniería en Energía Eléctrica", 
      university: "UNSJ", 
      icon: <Target className="w-6 h-6 text-yellow-400" />, 
      color: "from-yellow-400/20 to-yellow-400/5" 
    },
    "mecanica_unsj": { 
      name: "Ingeniería Mecánica", 
      university: "UNSJ", 
      icon: <Target className="w-6 h-6 text-blue-400" />, 
      color: "from-blue-400/20 to-blue-400/5" 
    },
    "quimica": { 
      name: "Ingeniería Química", 
      university: "UTN FRM", 
      icon: <BookOpen className="w-6 h-6 text-pink-400" />, 
      color: "from-pink-400/20 to-pink-400/5" 
    },
    "telecomunicaciones": { 
      name: "Ingeniería en Telecomunicaciones", 
      university: "UTN FRM", 
      icon: <Target className="w-6 h-6 text-indigo-400" />, 
      color: "from-indigo-400/20 to-indigo-400/5" 
    },
    "contactologia": { 
      name: "Tecnicatura en Contactología", 
      university: "UNLP", 
      icon: <GraduationCap className="w-6 h-6 text-teal-400" />, 
      color: "from-teal-400/20 to-teal-400/5" 
    },
    "mecanica_utn_frc": { 
      name: "Ingeniería Mecánica", 
      university: "UTN FRC", 
      icon: <Target className="w-6 h-6 text-blue-500" />, 
      color: "from-blue-500/20 to-blue-500/5" 
    }
  };

  const info = nameMap[id] || { 
    name: id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), 
    university: "Argentina", 
    icon: <BookOpen className="w-6 h-6 text-muted-foreground" />, 
    color: "from-muted/20 to-muted/5" 
  };

  return {
    id,
    ...info,
    description: `Plan de estudios detallado para ${info.name}. Incluye ${subjects.length} materias distribuidas en ${maxYear} años.`,
  };
});

export default function Careers() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Dynamic SEO Tags could be here if using Helmet, but index.html has static ones for now */}
      
      <nav className="border-b border-border/50 bg-background/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Volver al inicio</span>
          </Link>
          <div className="font-display font-bold text-xl tracking-tight gradient-text">TABE</div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-8 italic tracking-tighter">
            Planes de <span className="gradient-text">Carrera</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Explorá nuestra biblioteca abierta de planes de estudio universitarios. 
            Visualizá correlatividades, años de cursado y organizá tu futuro académico con herramientas de IA.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {careers.map((career) => (
            <Link 
              key={career.id} 
              to={`/carreras/${career.id}`}
              className={`group relative card-gamer p-6 rounded-2xl border border-border/50 bg-gradient-to-br ${career.color} hover:border-neon-cyan/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] transition-all duration-300 flex flex-col h-full`}
            >
              <div className="mb-6 w-12 h-12 rounded-xl bg-background/80 flex items-center justify-center border border-border group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm">
                {career.icon}
              </div>
              <h2 className="text-xl font-display font-bold mb-2 group-hover:text-neon-cyan transition-colors line-clamp-2">
                {career.name}
              </h2>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-0.5 rounded-full bg-background/50 text-[10px] font-bold text-neon-cyan border border-neon-cyan/20">
                  {career.university}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed line-clamp-3">
                {career.description}
              </p>
              <div className="mt-auto pt-4 border-t border-border/10 flex items-center justify-between text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                <span>Ver Plan Completo</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-32 p-8 md:p-16 rounded-[2.5rem] bg-secondary/20 border border-border/50 relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-neon-purple/20 rounded-full blur-[120px] group-hover:bg-neon-purple/30 transition-colors duration-700" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-neon-cyan/20 rounded-full blur-[120px] group-hover:bg-neon-cyan/30 transition-colors duration-700" />
          
          <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-xs font-bold mb-6 uppercase tracking-widest">
                Tu futuro, bajo control
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-8 leading-tight">
                ¿No encontrás tu <span className="gradient-text italic">carrera</span>?
              </h2>
              <p className="text-muted-foreground mb-10 text-lg leading-relaxed">
                No te preocupes. Con TABE podés crear tu propio plan personalizado en segundos. Subí tu PDF o cargá las materias manualmente y dejá que nuestra IA gestione tus correlatividades y tiempos.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link 
                  to="/auth" 
                  className="px-8 py-4 bg-foreground text-background rounded-2xl font-bold hover:scale-105 transition-all shadow-xl flex items-center gap-2"
                >
                  Empezar ahora <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: <BookOpen className="text-neon-cyan" />, label: "Materias", val: "Ilimitadas" },
                { icon: <Clock className="text-neon-purple" />, label: "Productividad", val: "Pomodoro" },
                { icon: <Target className="text-neon-green" />, label: "Seguimiento", val: "Métricas" },
                { icon: <GraduationCap className="text-neon-gold" />, label: "Apoyo", val: "Tutor IA" }
              ].map((item, i) => (
                <div key={i} className="card-gamer p-6 rounded-3xl bg-background/40 backdrop-blur-sm border border-white/5 hover:border-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center mb-4 shadow-inner">
                    {item.icon}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1">{item.label}</div>
                  <div className="text-lg font-display font-bold">{item.val}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
