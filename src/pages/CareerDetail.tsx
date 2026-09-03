import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap, Calendar, BookOpen, ChevronRight, FileJson, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <div className="text-center bg-card border-[3px] border-foreground shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#fff] p-12 rounded-3xl max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
          <h1 className="text-2xl font-black uppercase tracking-widest mb-4">Plan no encontrado</h1>
          <p className="text-muted-foreground font-bold mb-8">Lo sentimos, el plan de estudios que estás buscando no existe en nuestra base de datos pública.</p>
          <Button onClick={() => navigate("/carreras")} variant="default">
            <ArrowLeft className="w-5 h-5" /> Volver al listado
          </Button>
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
      "url": "https://www.tabe.software"
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

      <nav className="border-b-[3px] border-foreground/10 bg-background/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/carreras")} className="flex items-center gap-2 border-[3px] border-transparent hover:border-foreground transition-colors group px-3 py-1.5 h-auto">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold">Volver a Carreras</span>
          </Button>
          <div className="font-display font-black text-2xl tracking-widest uppercase">TABE</div>
        </div>
      </nav>

      <header className="relative py-20 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffd21c] text-black rounded-lg border-[3px] border-foreground shadow-[2px_2px_0_0_#000] mb-6">
            <GraduationCap className="w-5 h-5" />
            <span className="text-sm font-black uppercase tracking-widest">Plan de Estudios Oficial</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-black mb-6 tracking-widest uppercase">
            {name}
          </h1>
          <div className="flex flex-wrap justify-center gap-4 text-foreground">
            <div className="flex items-center gap-2 bg-card border-[3px] border-foreground px-4 py-2 rounded-lg shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff] font-bold">
              <Calendar className="w-5 h-5" />
              <span>{years.length} Años de cursado</span>
            </div>
            <div className="flex items-center gap-2 bg-card border-[3px] border-foreground px-4 py-2 rounded-lg shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff] font-bold">
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
                <div className="h-[3px] flex-1 bg-foreground/20 rounded-full" />
                <h2 className="text-2xl font-black px-6 py-2 rounded-lg bg-foreground text-background shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] uppercase tracking-widest border-[3px] border-transparent">
                  {year}° Año
                </h2>
                <div className="h-[3px] flex-1 bg-foreground/20 rounded-full" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {subjects
                  .filter((s: any) => s.año === year)
                  .sort((a: any, b: any) => (a.numero_materia || 0) - (b.numero_materia || 0))
                  .map((subject: any) => (
                    <div 
                      key={subject.id} 
                      className="group bg-card p-6 rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] dark:hover:shadow-[6px_6px_0_0_#fff] transition-all duration-300"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="inline-flex items-center gap-1.5 bg-foreground text-background px-2 py-0.5 rounded-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                              Materia {subject.numero_materia}
                            </span>
                          </div>
                          <h3 className="text-lg font-black leading-tight uppercase">
                            {subject.nombre}
                          </h3>
                          {subject.codigo && (
                            <p className="text-xs text-muted-foreground font-bold font-mono">ID: {subject.codigo}</p>
                          )}
                        </div>
                        <FileJson className="w-6 h-6 text-foreground/30 group-hover:text-foreground transition-colors shrink-0" />
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-24 text-center max-w-2xl mx-auto p-8 rounded-2xl border-[3px] border-foreground bg-card shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#fff]">
          <h2 className="text-3xl font-display font-black mb-4 uppercase tracking-widest">¿Querés gestionar este plan?</h2>
          <p className="text-muted-foreground mb-8 font-bold text-sm">
            Registrate en TABE para marcar tus materias aprobadas, ver correlatividades interactivas y recibir sugerencias de estudio personalizadas.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="text-lg bg-[#25d06c] text-black hover:bg-[#25d06c]/90">
            Empezar gratis <ChevronRight className="w-5 h-5" />
          </Button>
        </section>
      </main>
    </div>
  );
}
