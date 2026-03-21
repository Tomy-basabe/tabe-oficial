import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap, Calendar, BookOpen, ChevronRight, FileJson, AlertCircle } from "lucide-react";

// Dynamic import of all career templates
const careerTemplates = import.meta.glob('../data/*_template.json', { eager: true });

export default function CareerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Find the template
  const templatePath = `../data/${id}_template.json`;
  const module: any = careerTemplates[templatePath];
  
  if (!module) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center card-gamer p-12 rounded-3xl border border-border max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Plan no encontrado</h1>
          <p className="text-muted-foreground mb-8">Lo sentimos, el plan de estudios que estás buscando no existe en nuestra base de datos pública.</p>
          <Link to="/carreras" className="inline-flex items-center gap-2 text-neon-cyan font-bold">
            <ArrowLeft className="w-5 h-5" /> Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  const data = module.default || module;
  const subjects = (data.subjects || []) as any[];
  const name = id?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || "Carrera Universitaria";
  
  // Group by year
  const years = [...new Set(subjects.map((s: any) => s.año))].sort((a: any, b: any) => (Number(a) || 0) - (Number(b) || 0)) as number[];

  // Structured Data (JSON-LD) for Google
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": name,
    "description": `Plan de estudios detallado para la carrera de ${name}. Incluye ${subjects.length} materias.`,
    "provider": {
      "@type": "Organization",
      "name": "TABE - Tu Asistente de Bolsillo Estudiantil",
      "url": "https://tabe.software"
    },
    "courseCode": id,
    "hasCourseInstance": subjects.map((s: any) => ({
      "@type": "CourseInstance",
      "name": s.nombre,
      "courseMode": "Presencial/Virtual",
      "location": "Argentina"
    }))
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>

      <nav className="border-b border-border/50 bg-background/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/carreras" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Volver a Carreras</span>
          </Link>
          <div className="font-display font-bold text-xl tracking-tight gradient-text">TABE</div>
        </div>
      </nav>

      <header className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-neon-cyan/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-border shadow-sm mb-6">
            <GraduationCap className="w-5 h-5 text-neon-cyan" />
            <span className="text-sm font-bold uppercase tracking-wider">Plan de Estudios Oficial</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 tracking-tight">
            {name}
          </h1>
          <div className="flex flex-wrap justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>{years.length} Años de cursado</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              <span>{subjects.length} Materias totales</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-32">
        <div className="max-w-5xl mx-auto space-y-12">
          {years.map((year) => (
            <section key={year} className="space-y-6">
              <div className="flex items-center gap-4 transition-all">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                <h2 className="text-2xl font-display font-bold px-6 py-2 rounded-2xl bg-secondary/50 border border-border/50 shadow-sm">
                  {year}° Año
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-border via-border to-transparent" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {subjects
                  .filter((s: any) => s.año === year)
                  .sort((a: any, b: any) => (a.numero_materia || 0) - (b.numero_materia || 0))
                  .map((subject: any) => (
                    <div 
                      key={subject.id} 
                      className="group card-gamer p-6 rounded-2xl border border-border/50 bg-background/40 hover:border-neon-cyan/30 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 leading-none mb-1">
                            <span className="w-1 h-1 rounded-full bg-neon-cyan shadow-[0_0_5px_cyan]" />
                            Materia {subject.numero_materia}
                          </div>
                          <h3 className="text-lg font-bold group-hover:text-neon-cyan transition-colors leading-tight">
                            {subject.nombre}
                          </h3>
                          {subject.codigo && (
                            <p className="text-xs text-muted-foreground font-mono">ID: {subject.codigo}</p>
                          )}
                        </div>
                        <FileJson className="w-5 h-5 text-muted-foreground/30 group-hover:text-neon-cyan/50 transition-colors" />
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-24 text-center max-w-2xl mx-auto p-12 rounded-[2rem] border border-border bg-secondary/10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-neon-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <h2 className="text-3xl font-display font-bold mb-6">¿Querés gestionar este plan?</h2>
          <p className="text-muted-foreground mb-10 leading-relaxed italic">
            Registrate en TABE para marcar tus materias aprobadas, ver correlatividades interactivas y recibir sugerencias de estudio personalizadas con nuestra IA.
          </p>
          <Link 
            to="/auth" 
            className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-2xl font-bold hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:scale-[1.02] transition-all"
          >
            Empezar gratis <ChevronRight className="w-5 h-5" />
          </Link>
        </section>
      </main>
    </div>
  );
}
