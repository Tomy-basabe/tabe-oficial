import { Link } from "react-router-dom";
import { GraduationCap, ChevronRight, BookOpen, Clock, Target, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";

const careerTemplates = import.meta.glob('../data/*_template.json', { eager: true });

const careers = Object.entries(careerTemplates).map(([path, module]: [string, any]) => {
  const id = path.split('/').pop()?.replace('_template.json', '') || '';
  const data = module.default || module;
  
  const subjects = data.subjects || [];
  const maxYear = Math.max(...subjects.map((s: any) => s.año || 0), 0);
  
  const nameMap: Record<string, { name: string, university: string, icon: any, color: string }> = {
    "agronomia_uncuyo": { 
      name: "Ingeniería en Agronomía", 
      university: "UNCUYO", 
      icon: <BookOpen className="w-6 h-6 text-[#1475e5]" />, 
      color: "from-[#1475e5]/20 to-[#1475e5]/5" 
    },
    "civil": { 
      name: "Ingeniería Civil", 
      university: "UTN FRM / UNSJ", 
      icon: <Target className="w-6 h-6 text-[#ff9415]" />, 
      color: "from-[#ff9415]/20 to-[#ff9415]/5" 
    },
    "sistemas": { 
      name: "Ingeniería en Sistemas", 
      university: "UTN FRM", 
      icon: <GraduationCap className="w-6 h-6 text-[#48bd22]" />, 
      color: "from-[#48bd22]/20 to-[#48bd22]/5" 
    },
    "electromecanica_unsj": { 
      name: "Ingeniería Electromecánica", 
      university: "UNSJ", 
      icon: <Target className="w-6 h-6 text-[#ff9415]" />, 
      color: "from-[#ff9415]/20 to-[#ff9415]/5" 
    },
    "energia_electrica_unsj": { 
      name: "Ingeniería en Energía Eléctrica", 
      university: "UNSJ", 
      icon: <Target className="w-6 h-6 text-[#ffd21c]" />, 
      color: "from-[#ffd21c]/20 to-[#ffd21c]/5" 
    },
    "mecanica_unsj": { 
      name: "Ingeniería Mecánica", 
      university: "UNSJ", 
      icon: <Target className="w-6 h-6 text-[#1475e5]" />, 
      color: "from-[#1475e5]/20 to-[#1475e5]/5" 
    },
    "quimica": { 
      name: "Ingeniería Química", 
      university: "UTN FRM", 
      icon: <BookOpen className="w-6 h-6 text-[#e53935]" />, 
      color: "from-[#e53935]/20 to-[#e53935]/5" 
    },
    "telecomunicaciones": { 
      name: "Ingeniería en Telecomunicaciones", 
      university: "UTN FRM", 
      icon: <Target className="w-6 h-6 text-[#8b5cf6]" />, 
      color: "from-[#8b5cf6]/20 to-[#8b5cf6]/5" 
    },
    "contactologia": { 
      name: "Tecnicatura en Contactología", 
      university: "UNLP", 
      icon: <GraduationCap className="w-6 h-6 text-[#14b8a6]" />, 
      color: "from-[#14b8a6]/20 to-[#14b8a6]/5" 
    },
    "mecanica_utn_frc": { 
      name: "Ingeniería Mecánica", 
      university: "UTN FRC", 
      icon: <Target className="w-6 h-6 text-[#3b82f6]" />, 
      color: "from-[#3b82f6]/20 to-[#3b82f6]/5" 
    },
    "gestion_politicas_publicas_fcpys": { 
      name: "Tecnicatura en Gestión de Políticas Públicas", 
      university: "UNCUYO FCPyS", 
      icon: <GraduationCap className="w-6 h-6 text-[#f59e0b]" />, 
      color: "from-[#f59e0b]/20 to-[#f59e0b]/5" 
    },
    "trabajo_social_fcpys": { 
      name: "Licenciatura en Trabajo Social", 
      university: "UNCUYO FCPyS", 
      icon: <BookOpen className="w-6 h-6 text-[#f43f5e]" />, 
      color: "from-[#f43f5e]/20 to-[#f43f5e]/5" 
    },
    "sociologia_fcpys": { 
      name: "Licenciatura en Sociología", 
      university: "UNCUYO FCPyS", 
      icon: <GraduationCap className="w-6 h-6 text-[#a855f7]" />, 
      color: "from-[#a855f7]/20 to-[#a855f7]/5" 
    },
    "ciencia_politica_fcpys": { 
      name: "Lic. en Ciencia Política y Adm. Pública", 
      university: "UNCUYO FCPyS", 
      icon: <Target className="w-6 h-6 text-[#10b981]" />, 
      color: "from-[#10b981]/20 to-[#10b981]/5" 
    },
    "comunicacion_social_fcpys": { 
      name: "Licenciatura en Comunicación Social", 
      university: "UNCUYO FCPyS", 
      icon: <BookOpen className="w-6 h-6 text-[#06b6d4]" />, 
      color: "from-[#06b6d4]/20 to-[#06b6d4]/5" 
    },
    "tupa_fcpys": { 
      name: "Tec. en Producción Audiovisual (TUPA)", 
      university: "UNCUYO FCPyS", 
      icon: <Target className="w-6 h-6 text-[#f97316]" />, 
      color: "from-[#f97316]/20 to-[#f97316]/5" 
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
    description: `Plan de estudios para ${info.name}. ${subjects.length} materias en ${maxYear} años.`,
  };
});

const brandColors = ["#ff9415", "#1475e5", "#48bd22", "#ffd21c", "#e53935", "#8b5cf6", "#14b8a6", "#f59e0b"];

export default function Careers() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />

      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden bg-secondary/40">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block px-4 py-2 rounded-lg bg-[#48bd22]/10 border-2 border-[#48bd22]/20 text-sm font-extrabold text-[#48bd22] mb-5">
              🎓 Biblioteca Abierta
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-black leading-[1.05] tracking-tighter mb-6">
              Planes de <span className="text-[#ff9415] italic">Carrera</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Explorá nuestra biblioteca de planes de estudio universitarios. Visualizá correlatividades, años de cursado y organizá tu futuro académico con herramientas de IA.
            </p>
            <div className="flex flex-wrap justify-center gap-5 pt-6 text-sm font-bold text-muted-foreground">
              {["Validado por alumnos", "Actualizado 2025", "100% gratuito", "Correlatividades incluidas"].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#48bd22]" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {careers.map((career, index) => {
              const cardColor = brandColors[index % brandColors.length];
              return (
                <Link 
                  key={career.id} 
                  to={`/carreras/${career.id}`}
                  className={`group relative card-gamer p-6 rounded-2xl border-2 border-border bg-gradient-to-br hover:border-${cardColor.replace('#', '')} hover:shadow-[8px_8px_0_0_${cardColor.replace('#', '')}] transition-all duration-300 flex flex-col h-full`}
                >
                  <div className="mb-6 w-12 h-12 rounded-xl bg-background/80 flex items-center justify-center border-2 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 shadow-sm" style={{ borderColor: cardColor }}>
                    {career.icon}
                  </div>
                  <h2 className={`text-xl font-black mb-2 group-hover:text-[${cardColor}] transition-colors line-clamp-2`}>
                    {career.name}
                  </h2>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-2 py-0.5 rounded-full bg-background/50 text-[10px] font-bold text-[${cardColor}] border border-[${cardColor}]/20`}>
                      {career.university}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed line-clamp-3 flex-1">
                    {career.description}
                  </p>
                  <div className="mt-auto pt-4 border-t border-border/10 flex items-center justify-between text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                    <span>Ver Plan Completo</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-secondary/40">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-4 py-2 rounded-lg bg-[#ff9415]/10 border-2 border-[#ff9415]/20 text-sm font-extrabold text-[#ff9415] mb-5">
              🛠️ Herramientas
            </span>
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Todo lo que <span className="text-[#ff9415]">necesitás</span> en una app
            </h2>
            <p className="text-lg text-muted-foreground">Más que planes de carrera: tu asistente de estudio completo.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: BookOpen, label: "Materias", val: "Ilimitadas", color: "#1475e5" },
              { icon: Clock, label: "Productividad", val: "Pomodoro", color: "#ff9415" },
              { icon: Target, label: "Seguimiento", val: "Métricas", color: "#48bd22" },
              { icon: GraduationCap, label: "Apoyo", val: "Tutor IA", color: "#ffd21c" },
            ].map((item, i) => (
              <div key={i} className="group p-6 bg-card rounded-xl border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] transition-all duration-200 hover:-translate-y-2 hover:shadow-[8px_8px_0_0_hsl(var(--border))]">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 border-2 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3" style={{ borderColor: item.color, backgroundColor: item.color + "15" }}>
                  <item.icon className="w-6 h-6" style={{ color: item.color }} />
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1">{item.label}</div>
                <div className="text-lg font-black" style={{ color: item.color }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-5xl mx-auto p-8 md:p-16 rounded-[2.5rem] bg-secondary/20 border-2 border-border/50 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#ff9415]/20 rounded-full blur-[120px] group-hover:bg-[#ff9415]/30 transition-colors duration-700" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#48bd22]/20 rounded-full blur-[120px] group-hover:bg-[#48bd22]/30 transition-colors duration-700" />
            
            <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="inline-block px-4 py-2 rounded-lg bg-[#ffd21c]/10 border-2 border-[#ffd21c]/20 text-sm font-extrabold text-[#ffd21c] mb-5">
                  Tu futuro, bajo control
                </span>
                <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
                  ¿No encontrás tu <span className="text-[#ff9415] italic">carrera</span>?
                </h2>
                <p className="text-muted-foreground mb-10 text-lg leading-relaxed">
                  No te preocupes. Con TABE podés crear tu propio plan personalizado en segundos. Subí tu PDF o cargá las materias manualmente y dejá que nuestra IA gestione tus correlatividades y tiempos.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link 
                    to="/auth" 
                    className="group px-8 py-4 bg-foreground text-background rounded-xl font-extrabold border-2 border-foreground shadow-[4px_4px_0_0_#ff9415] transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#ff9415] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#ff9415] flex items-center gap-2"
                  >
                    Empezar ahora <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                {[
                  { icon: <BookOpen className="text-[#1475e5]" />, label: "Materias", val: "Ilimitadas", color: "#1475e5" },
                  { icon: <Clock className="text-[#ff9415]" />, label: "Productividad", val: "Pomodoro", color: "#ff9415" },
                  { icon: <Target className="text-[#48bd22]" />, label: "Seguimiento", val: "Métricas", color: "#48bd22" },
                  { icon: <GraduationCap className="text-[#ffd21c]" />, label: "Apoyo", val: "Tutor IA", color: "#ffd21c" },
                ].map((item, i) => (
                  <div key={i} className={`group p-6 bg-card rounded-xl border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] transition-all duration-200 hover:-translate-y-2 hover:shadow-[8px_8px_0_0_hsl(var(--border))] hover:border-${item.color.replace('#', '')} hover:shadow-[8px_8px_0_0_${item.color.replace('#', '')}]`}>
                    <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center mb-4 shadow-inner">
                      {item.icon}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1">{item.label}</div>
                    <div className="text-lg font-black" style={{ color: item.color }}>{item.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}