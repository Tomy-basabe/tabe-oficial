import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap, Calendar, BookOpen, ChevronRight, FileJson, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversityLogo } from "@/components/icons/UniversityLogos";
import { usePageTitle } from "@/hooks/useDynamicTitle";

// Dynamic import of all career templates
const careerTemplates = import.meta.glob('../data/*_template.json', { eager: true });

export default function CareerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Find the template
  const templatePath = `../data/${id}_template.json`;
  const module: any = careerTemplates[templatePath];
  
  const data = module?.default || module;
  const subjects = (data?.subjects || []) as any[];
  const name = id?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || "Carrera Universitaria";
  
  // Título dinámico para la carrera activa
  usePageTitle(module ? name : "Carrera");

  if (!module) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg p-10 sm:p-12 rounded-3xl max-w-md">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Plan no encontrado</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-normal mb-6">
            El plan de estudios que estás buscando no existe en nuestra base de datos pública.
          </p>
          <Button onClick={() => navigate("/carreras")} variant="default" className="rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-medium px-4 py-2">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Volver al listado
          </Button>
        </div>
      </div>
    );
  }

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
      "url": "https://tabe.com.ar"
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

      <nav className="border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/carreras")} 
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group px-3 py-1.5 h-auto rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-medium">Volver a Carreras</span>
          </Button>
          <div className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">TABE</div>
        </div>
      </nav>

      <header className="relative py-16 sm:py-20 overflow-hidden bg-zinc-50/50 dark:bg-[#121212]/50 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
          <div className="flex flex-col items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center p-2 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
              <UniversityLogo universityId={id || ""} className="w-full h-full" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-medium">
              <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
              <span>Plan de Estudios Oficial</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight text-zinc-900 dark:text-zinc-100">
            {name}
          </h1>
          <div className="flex flex-wrap justify-center gap-3 text-zinc-600 dark:text-zinc-400 pt-2">
            <div className="flex items-center gap-2 bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800 px-3.5 py-1.5 rounded-xl shadow-2xs text-xs font-medium">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <span>{years.length} Años de cursado</span>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800 px-3.5 py-1.5 rounded-xl shadow-2xs text-xs font-medium">
              <BookOpen className="w-4 h-4 text-zinc-400" />
              <span>{subjects.length} Materias totales</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 pb-28 max-w-5xl">
        <div className="space-y-12">
          {years.map((year) => (
            <section key={year} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold px-3 py-1 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                  {year}° Año
                </span>
                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              </div>

              <div className="grid md:grid-cols-2 gap-3.5">
                {subjects
                  .filter((s: any) => s.año === year)
                  .sort((a: any, b: any) => (a.numero_materia || 0) - (b.numero_materia || 0))
                  .map((subject: any) => (
                    <div 
                      key={subject.id} 
                      className="group bg-white dark:bg-[#1a1a1a] p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            Materia {subject.numero_materia}
                          </span>
                          <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                            {subject.nombre}
                          </h3>
                          {subject.codigo && (
                            <p className="text-xs text-zinc-400 font-mono">ID: {subject.codigo}</p>
                          )}
                        </div>
                        <FileJson className="w-5 h-5 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors shrink-0" />
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-20 text-center max-w-2xl mx-auto p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-[#151515] shadow-sm">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
            ¿Querés gestionar este plan?
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6 font-normal text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Registrate en TABE para marcar tus materias aprobadas, ver correlatividades interactivas y recibir sugerencias de estudio.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/registro")} 
            className="text-xs sm:text-sm font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl px-5 py-2.5 h-auto cursor-pointer"
          >
            Empezar gratis <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </section>
      </main>
    </div>
  );
}
