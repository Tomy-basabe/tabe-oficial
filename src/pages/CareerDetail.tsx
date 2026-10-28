import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  GraduationCap,
  Calendar,
  ChevronRight,
  Building2,
  Clock,
  Award,
  BookOpen,
  Layers,
  Sparkles,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversityLogo } from "@/components/icons/UniversityLogos";
import { usePageTitle } from "@/hooks/useDynamicTitle";
import { loadCareerTemplate } from "@/lib/loadCareerTemplate";
import { AVAILABLE_CAREERS, ALL_FACULTADES } from "@/lib/careerData";
import { useAuth } from "@/contexts/AuthContext";
import careerStatsRaw from "@/lib/careerStats.json";
import { cn } from "@/lib/utils";

const careerStats = careerStatsRaw as Record<string, [number, number]>;

interface TemplateSubject {
  id: string;
  codigo?: string;
  nombre: string;
  numero_materia: number;
  año: number;
  semestre?: number;
}

interface TemplateDependency {
  subject_id: string;
  requiere_regular: string | null;
  requiere_aprobada: string | null;
}

export default function CareerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Buscar en el registro oficial de carreras
  const careerInfo = AVAILABLE_CAREERS.find(
    (c) => c.id === id || c.file === id || c.file?.split("/").pop() === id
  );

  const name =
    careerInfo?.label ||
    id?.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") ||
    "Carrera Universitaria";

  // Facultad
  const facultyObj = ALL_FACULTADES.find((f) => f.id === careerInfo?.facultad);
  const facultyName = facultyObj?.fullLabel || facultyObj?.label || careerInfo?.facultad || "Universidad";
  const facultyId = careerInfo?.facultad || id || "";

  // Duración estimada/oficial
  const fileKey = (careerInfo?.file || id || "").split("/").pop()?.replace("_template", "") || "";
  const [statTotalSubs, statMaxYear] = careerStats[fileKey] || careerStats[careerInfo?.id || ""] || [0, 5];
  const finalYears = statMaxYear || 5;
  const durationLabel = `${finalYears} ${finalYears === 1 ? "año" : "años"}`;

  const degreeType = name.toLowerCase().includes("tecnicatura")
    ? "Tecnicatura Universitaria"
    : name.toLowerCase().includes("profesorado")
    ? "Profesorado Universitario"
    : "Título de Grado";

  usePageTitle(!careerInfo && !id ? "Carrera no encontrada" : `${name} - ${facultyName}`);

  // Carga dinámica de materias del plan
  const [subjects, setSubjects] = useState<TemplateSubject[]>([]);
  const [dependencies, setDependencies] = useState<TemplateDependency[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState<boolean>(true);
  const [selectedYear, setSelectedYear] = useState<number | "ALL">("ALL");

  useEffect(() => {
    let isMounted = true;
    async function loadTemplate() {
      if (!careerInfo?.file) {
        setLoadingSubjects(false);
        return;
      }
      setLoadingSubjects(true);
      try {
        const mod = await loadCareerTemplate(careerInfo.file);

        if (isMounted && mod?.default) {
          setSubjects(mod.default.subjects || []);
          setDependencies(mod.default.dependencies || []);
        }
      } catch (err) {
        console.error("Error cargando materias de la carrera:", err);
      } finally {
        if (isMounted) setLoadingSubjects(false);
      }
    }
    loadTemplate();
    return () => {
      isMounted = false;
    };
  }, [careerInfo?.file]);

  // Agrupar materias por año
  const subjectsByYear = useMemo(() => {
    const map = new Map<number, TemplateSubject[]>();
    for (const s of subjects) {
      const y = s.año || 1;
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(s);
    }
    return map;
  }, [subjects]);

  const availableYears = useMemo(() => {
    return Array.from(subjectsByYear.keys()).sort((a, b) => a - b);
  }, [subjectsByYear]);

  // Mapa rápido de ID de materia a nombre para mostrar correlativas
  const subjectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subjects) {
      map.set(s.id, s.nombre);
    }
    return map;
  }, [subjects]);

  // Mapa de correlativas por materia
  const correlativesBySubject = useMemo(() => {
    const map = new Map<string, { aprobadas: string[]; regulares: string[] }>();
    for (const dep of dependencies) {
      if (!map.has(dep.subject_id)) {
        map.set(dep.subject_id, { aprobadas: [], regulares: [] });
      }
      const entry = map.get(dep.subject_id)!;
      if (dep.requiere_aprobada) {
        const reqName = subjectNameMap.get(dep.requiere_aprobada) || dep.requiere_aprobada;
        entry.aprobadas.push(reqName);
      }
      if (dep.requiere_regular) {
        const reqName = subjectNameMap.get(dep.requiere_regular) || dep.requiere_regular;
        entry.regulares.push(reqName);
      }
    }
    return map;
  }, [dependencies, subjectNameMap]);

  const displayedYears = selectedYear === "ALL" ? availableYears : [selectedYear];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar Superior */}
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

      <main className="container mx-auto px-4 py-12 flex-1 max-w-4xl space-y-10">
        {/* Tarjeta Centralizada de la Carrera y Facultad */}
        <div className="w-full bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-8 sm:p-10 shadow-sm space-y-6 text-center">
          {/* Logo oficial de la Facultad */}
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm mx-auto">
            <UniversityLogo universityId={facultyId} className="w-full h-full" />
          </div>

          {/* Nombre de la Facultad */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-medium">
            <Building2 className="w-4 h-4 text-blue-500" />
            <span>{facultyName}</span>
          </div>

          {/* Nombre de la Carrera */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
            {name}
          </h1>

          {/* Metadatos Clave */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 text-left">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Duración</p>
                <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">{durationLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 text-left">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Titulación</p>
                <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">{degreeType}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 text-left">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Materias</p>
                <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {subjects.length > 0 ? `${subjects.length} materias` : statTotalSubs > 0 ? `${statTotalSubs} materias` : "Plan oficial"}
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate(user ? "/carrera" : "/registro")}
              className="w-full sm:w-auto text-xs sm:text-sm font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl px-6 py-2.5 h-auto cursor-pointer shadow-sm"
            >
              {user ? "Gestionar en mi espacio" : "Registrarme en esta carrera"}{" "}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/carreras")}
              className="w-full sm:w-auto text-xs sm:text-sm font-medium border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl px-5 py-2.5 h-auto cursor-pointer"
            >
              Explorar otras carreras
            </Button>
          </div>
        </div>

        {/* Sección del Plan de Estudio y Materias */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500" />
                Plan de Estudio Oficial
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Todas las materias y correlativas estructuradas año por año.
              </p>
            </div>

            {/* Filtro por Año */}
            {availableYears.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedYear("ALL")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0",
                    selectedYear === "ALL"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  Todos ({subjects.length})
                </button>
                {availableYears.map((y) => (
                  <button
                    key={y}
                    onClick={() => setSelectedYear(y)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0",
                      selectedYear === y
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    )}
                  >
                    {y}° Año ({(subjectsByYear.get(y) || []).length})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Listado de Materias */}
          {loadingSubjects ? (
            <div className="p-12 text-center bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl">
              <div className="w-6 h-6 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Cargando materias del plan oficial...</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl space-y-2">
              <BookOpen className="w-8 h-8 text-zinc-400 mx-auto" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Plan en proceso de digitalización</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                Las materias detalladas de este plan se están sincronizando con el repositorio oficial.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {displayedYears.map((year) => {
                const yearSubjects = subjectsByYear.get(year) || [];
                if (yearSubjects.length === 0) return null;

                return (
                  <div
                    key={year}
                    className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs"
                  >
                    {/* Encabezado del año */}
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">
                          {year}°
                        </span>
                        <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                          {year}° Año
                        </h3>
                      </div>
                      <span className="text-xs text-zinc-500 font-medium">
                        {yearSubjects.length} {yearSubjects.length === 1 ? "materia" : "materias"}
                      </span>
                    </div>

                    {/* Grilla de Materias */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {yearSubjects.map((sub) => {
                        const correls = correlativesBySubject.get(sub.id);
                        const hasCorrels = correls && (correls.aprobadas.length > 0 || correls.regulares.length > 0);

                        return (
                          <div
                            key={sub.id}
                            className="p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                  #{sub.numero_materia} {sub.codigo && `• ${sub.codigo}`}
                                </span>
                                {sub.semestre && (
                                  <span className="text-[10px] text-zinc-500 font-medium">
                                    {sub.semestre}° Semestre
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                                {sub.nombre}
                              </h4>
                            </div>

                            {/* Correlatividades */}
                            {hasCorrels && (
                              <div className="mt-2.5 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/60 space-y-1">
                                {correls.aprobadas.length > 0 && (
                                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Aprobada: </span>
                                    {correls.aprobadas.join(", ")}
                                  </p>
                                )}
                                {correls.regulares.length > 0 && (
                                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                                    <span className="font-semibold text-sky-600 dark:text-sky-400">Regular: </span>
                                    {correls.regulares.join(", ")}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
