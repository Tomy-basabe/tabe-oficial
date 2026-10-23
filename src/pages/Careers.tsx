import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { GraduationCap,
  ChevronRight,
  BookOpen,
  Clock,
  Target,
  ArrowRight,
  CheckCircle2,
  Search,
  Building2,
  Calendar,
  Layers,
  
  Check,
  Compass } from "lucide-react";
import { motion } from "framer-motion";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import {
  UniversityLogo,
  UTNLogo,
  UNCUYOLogo,
  UNSJLogo,
  UNLPLogo,
  DonBoscoLogo,
  ITGCLogo,
} from "@/components/icons/UniversityLogos";
import { cn } from "@/lib/utils";

interface UniversityDefinition {
  id: string;
  name: string;
  shortName: string;
  facultyInfo: string;
  location: string;
  badgeColor: string;
  accentColor: string;
}

const UNIVERSITIES: UniversityDefinition[] = [
  {
    id: "UTN",
    name: "Universidad Tecnológica Nacional",
    shortName: "UTN",
    facultyInfo: "Facultad Regional Mendoza (FRM) y Facultad Regional Córdoba (FRC)",
    location: "Mendoza / Córdoba",
    badgeColor: "bg-[#003865] text-white",
    accentColor: "#0072CE",
  },
  {
    id: "UNCUYO",
    name: "Universidad Nacional de Cuyo",
    shortName: "UNCUYO",
    facultyInfo: "Fac. de Ciencias Agrarias (FCA) y Fac. de Cs. Políticas y Sociales (FCPyS)",
    location: "Mendoza",
    badgeColor: "bg-[#004F9F] text-white",
    accentColor: "#004F9F",
  },
  {
    id: "UNSJ",
    name: "Universidad Nacional de San Juan",
    shortName: "UNSJ",
    facultyInfo: "Facultad de Ingeniería",
    location: "San Juan",
    badgeColor: "bg-[#7A0026] text-white",
    accentColor: "#8A1538",
  },
  {
    id: "UNLP",
    name: "Universidad Nacional de La Plata",
    shortName: "UNLP",
    facultyInfo: "Facultad de Ciencias Exactas",
    location: "La Plata, Buenos Aires",
    badgeColor: "bg-[#002B49] text-white",
    accentColor: "#002B49",
  },
  {
    id: "DONBOSCO",
    name: "Facultad Don Bosco",
    shortName: "Don Bosco",
    facultyInfo: "Facultad Don Bosco de Enología y Ciencias de la Alimentación",
    location: "Rodeo del Medio, Mendoza",
    badgeColor: "bg-[#6A1B29] text-white",
    accentColor: "#722F37",
  },
  {
    id: "ITGC",
    name: "IES 9-002 Tomás Godoy Cruz",
    shortName: "IES 9-002",
    facultyInfo: "Instituto de Educación Superior 9-002 Tomás Godoy Cruz",
    location: "Godoy Cruz, Mendoza",
    badgeColor: "bg-[#1E3A8A] text-white",
    accentColor: "#1E3A8A",
  },
];

// Map of template filename prefix to University ID and details
const CAREER_METADATA: Record<
  string,
  {
    name: string;
    universityId: string;
    faculty: string;
    icon: any;
    color: string;
  }
> = {
  sistemas: {
    name: "Ingeniería en Sistemas de Información",
    universityId: "UTN",
    faculty: "UTN Facultad Regional Mendoza",
    icon: GraduationCap,
    color: "#0072CE",
  },
  civil: {
    name: "Ingeniería Civil",
    universityId: "UTN",
    faculty: "UTN Facultad Regional Mendoza",
    icon: Target,
    color: "#ff9415",
  },
  electromecanica: {
    name: "Ingeniería Electromecánica",
    universityId: "UTN",
    faculty: "UTN Facultad Regional Mendoza",
    icon: Target,
    color: "#10b981",
  },
  quimica: {
    name: "Ingeniería Química",
    universityId: "UTN",
    faculty: "UTN Facultad Regional Mendoza",
    icon: BookOpen,
    color: "#e53935",
  },
  telecomunicaciones: {
    name: "Ingeniería en Telecomunicaciones",
    universityId: "UTN",
    faculty: "UTN Facultad Regional Mendoza",
    icon: Target,
    color: "#8b5cf6",
  },
  electronica: {
    name: "Ingeniería Electrónica",
    universityId: "UTN",
    faculty: "UTN Facultad Regional Mendoza",
    icon: Target,
    color: "#06b6d4",
  },
  mecanica_utn_frc: {
    name: "Ingeniería Mecánica",
    universityId: "UTN",
    faculty: "UTN Facultad Regional Córdoba",
    icon: Target,
    color: "#3b82f6",
  },
  agronomia_uncuyo: {
    name: "Ingeniería Agronómica",
    universityId: "UNCUYO",
    faculty: "Facultad de Ciencias Agrarias (FCA)",
    icon: BookOpen,
    color: "#48bd22",
  },
  ciencia_politica_fcpys: {
    name: "Licenciatura en Ciencia Política y Adm. Pública",
    universityId: "UNCUYO",
    faculty: "Fac. de Cs. Políticas y Sociales (FCPyS)",
    icon: Target,
    color: "#10b981",
  },
  comunicacion_social_fcpys: {
    name: "Licenciatura en Comunicación Social",
    universityId: "UNCUYO",
    faculty: "Fac. de Cs. Políticas y Sociales (FCPyS)",
    icon: BookOpen,
    color: "#06b6d4",
  },
  gestion_politicas_publicas_fcpys: {
    name: "Tecnicatura en Gestión de Políticas Públicas",
    universityId: "UNCUYO",
    faculty: "Fac. de Cs. Políticas y Sociales (FCPyS)",
    icon: GraduationCap,
    color: "#f59e0b",
  },
  sociologia_fcpys: {
    name: "Licenciatura en Sociología",
    universityId: "UNCUYO",
    faculty: "Fac. de Cs. Políticas y Sociales (FCPyS)",
    icon: GraduationCap,
    color: "#a855f7",
  },
  trabajo_social_fcpys: {
    name: "Licenciatura en Trabajo Social",
    universityId: "UNCUYO",
    faculty: "Fac. de Cs. Políticas y Sociales (FCPyS)",
    icon: BookOpen,
    color: "#f43f5e",
  },
  tupa_fcpys: {
    name: "Tecnicatura Universitaria en Producción Audiovisual (TUPA)",
    universityId: "UNCUYO",
    faculty: "Fac. de Cs. Políticas y Sociales (FCPyS)",
    icon: Target,
    color: "#f97316",
  },
  electromecanica_unsj: {
    name: "Ingeniería Electromecánica",
    universityId: "UNSJ",
    faculty: "Facultad de Ingeniería",
    icon: Target,
    color: "#ff9415",
  },
  energia_electrica_unsj: {
    name: "Ingeniería en Energía Eléctrica",
    universityId: "UNSJ",
    faculty: "Facultad de Ingeniería",
    icon: Target,
    color: "#ffd21c",
  },
  mecanica_unsj: {
    name: "Ingeniería Mecánica",
    universityId: "UNSJ",
    faculty: "Facultad de Ingeniería",
    icon: Target,
    color: "#1475e5",
  },
  contactologia: {
    name: "Tecnicatura en Contactología",
    universityId: "UNLP",
    faculty: "Facultad de Ciencias Exactas",
    icon: GraduationCap,
    color: "#14b8a6",
  },
  licenciatura_enologia_donbosco: {
    name: "Licenciatura en Enología",
    universityId: "DONBOSCO",
    faculty: "Facultad Don Bosco de Enología",
    icon: GraduationCap,
    color: "#722F37",
  },
  enologia_donbosco: {
    name: "Tecnicatura Universitaria en Enología",
    universityId: "DONBOSCO",
    faculty: "Facultad Don Bosco de Enología",
    icon: BookOpen,
    color: "#8B0000",
  },
  profesorado_primaria_godoy_cruz: {
    name: "Profesorado de Educación Primaria",
    universityId: "ITGC",
    faculty: "Instituto de Educación Superior 9-002",
    icon: GraduationCap,
    color: "#1E3A8A",
  },
};

// Carga todas las plantillas JSON de carreras
const careerTemplates = import.meta.glob("../data/*_template.json", { eager: true });

interface CareerItem {
  id: string;
  name: string;
  universityId: string;
  universityName: string;
  universityShort: string;
  faculty: string;
  degreeType: string;
  subjectsCount: number;
  years: number;
  icon: typeof GraduationCap;
  color: string;
  description: string;
  tags: string[];
}

export default function Careers() {
  const [selectedUniversity, setSelectedUniversity] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Process all career templates
  const allCareers: CareerItem[] = useMemo(() => {
    const list: CareerItem[] = [];

    for (const path in careerTemplates) {
      const mod: any = careerTemplates[path];
      const data: any = mod.default || mod;
      const id = path.split("/").pop()?.replace("_template.json", "") || "";
      const subjects: any[] = Array.isArray(data.subjects) ? data.subjects : [];
      const maxYear = Math.max(...subjects.map((s: any) => Number(s.año) || 0), 0);

      const meta = CAREER_METADATA[id] || {
        name: id.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        universityId: "UTN",
        faculty: "Universidad",
        icon: GraduationCap,
        color: "#0072CE",
      };
      const universityDef = UNIVERSITIES.find((u) => u.id === meta.universityId) || UNIVERSITIES[0];

      list.push({
        id,
        name: meta.name,
        universityId: meta.universityId,
        universityName: universityDef.name,
        universityShort: universityDef.shortName,
        faculty: meta.faculty,
        degreeType: "Grado",
        subjectsCount: subjects.length,
        years: maxYear || 5,
        icon: meta.icon,
        color: meta.color,
        description: `Plan de estudios con ${subjects.length} materias en ${maxYear || 5} años.`,
        tags: [],
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Filtered universities with their matching careers
  const displayedUniversities = useMemo(() => {
    return UNIVERSITIES.map((uni) => {
      const careersInUni = allCareers.filter((c) => {
        const matchesUni = c.universityId === uni.id;
        if (!matchesUni) return false;

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          c.name.toLowerCase().includes(q) ||
          c.faculty.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          uni.name.toLowerCase().includes(q) ||
          uni.shortName.toLowerCase().includes(q)
        );
      });

      return {
        ...uni,
        careers: careersInUni,
      };
    }).filter((uni) => {
      const matchesTab = selectedUniversity === "ALL" || selectedUniversity === uni.id;
      const hasCareers = uni.careers.length > 0;
      return matchesTab && hasCareers;
    });
  }, [allCareers, selectedUniversity, searchQuery]);

  const totalCareersCount = allCareers.length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-blue-500/20 selection:text-blue-600">
      <LandingNavbar />

      {/* Hero Header (Clean Apple/Notion style) */}
      <section className="relative pt-32 pb-14 md:pt-40 md:pb-20 overflow-hidden border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-[#121212]/50">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-5">

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight"
            >
              Planes de Estudio
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm sm:text-base md:text-lg text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed max-w-2xl mx-auto"
            >
              Explorá carreras agrupadas por institución con sus mapas de correlatividades, malla interactiva y carga directa a tu perfil.
            </motion.p>

            {/* Buscador minimalista */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-lg mx-auto relative pt-2"
            >
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-4 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar carrera (ej: Sistemas, Agronomía, Civil)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-20 py-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder:text-zinc-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 text-xs font-medium px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </motion.div>

            {/* Badges informativos */}
            <div className="flex flex-wrap justify-center gap-4 pt-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Validado por estudiantes
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> {totalCareersCount} Planes disponibles
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> 100% Gratuito
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Barra de Filtros por Universidad (Tabs modernas) */}
      <section className="sticky top-16 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60 py-2.5 shadow-2xs">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              onClick={() => setSelectedUniversity("ALL")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0",
                selectedUniversity === "ALL"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                  : "bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60"
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Todas ({totalCareersCount})</span>
            </button>

            {UNIVERSITIES.map((uni) => {
              const isSelected = selectedUniversity === uni.id;
              const count = allCareers.filter((c) => c.universityId === uni.id).length;

              return (
                <button
                  key={uni.id}
                  onClick={() => setSelectedUniversity(uni.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0",
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                      : "bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60"
                  )}
                >
                  <div className="w-3.5 h-3.5 shrink-0 rounded-md overflow-hidden flex items-center justify-center">
                    <UniversityLogo universityId={uni.id} className="w-3.5 h-3.5" />
                  </div>
                  <span>{uni.shortName}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-md font-medium",
                      isSelected
                        ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                        : "bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contenido Principal: Separado por Universidad */}
      <main className="py-12 md:py-16 flex-1">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl space-y-14">
          {displayedUniversities.length === 0 ? (
            <div className="text-center py-16 p-8 bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xs max-w-md mx-auto space-y-3">
              <Search className="w-8 h-8 text-zinc-400 mx-auto" />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No se encontraron carreras</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                No hay coincidencias para "{searchQuery}". Intentá buscar con otro término o limpiá el filtro.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedUniversity("ALL");
                }}
                className="px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium text-xs rounded-xl shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Restablecer Filtros
              </button>
            </div>
          ) : (
            displayedUniversities.map((uni) => (
              <section
                key={uni.id}
                id={`uni-${uni.id.toLowerCase()}`}
                className="space-y-5 scroll-mt-36"
              >
                {/* Encabezado limpio de la Universidad con Logo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6 bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center p-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 shrink-0">
                      <UniversityLogo universityId={uni.id} className="w-full h-full" />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold text-lg md:text-xl text-zinc-900 dark:text-zinc-100 truncate">
                          {uni.name}
                        </h2>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                          {uni.location}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate font-normal">
                        {uni.facultyInfo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-medium">
                      {uni.careers.length} {uni.careers.length === 1 ? "Carrera" : "Carreras"}
                    </span>
                  </div>
                </div>

                {/* Grilla de Carreras */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                  {uni.careers.map((career) => {
                    const CareerIcon = career.icon;

                    return (
                      <Link
                        key={career.id}
                        to={`/carreras/${career.id}`}
                        className="group relative p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full cursor-pointer"
                      >
                        <div>
                          {/* Cabecera de la tarjeta: Icono + Mini logo */}
                          <div className="flex items-center justify-between mb-3.5">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center p-2 border border-zinc-200/60 dark:border-zinc-700/60 transition-transform group-hover:scale-105"
                              style={{
                                backgroundColor: `${career.color}14`,
                                color: career.color,
                              }}
                            >
                              <CareerIcon className="w-5 h-5" />
                            </div>

                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                              <div className="w-3.5 h-3.5 shrink-0">
                                <UniversityLogo universityId={uni.id} className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                                {uni.shortName}
                              </span>
                            </div>
                          </div>

                          {/* Título de la Carrera */}
                          <h3 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 line-clamp-2 group-hover:text-blue-500 transition-colors mb-1">
                            {career.name}
                          </h3>

                          {/* Subtítulo de Facultad */}
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal line-clamp-1 mb-3">
                            {career.faculty}
                          </p>

                          {/* Datos métricos */}
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                              <BookOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              <span>{career.subjectsCount} Materias</span>
                            </div>
                            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                              <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              <span>{career.years} Años</span>
                            </div>
                          </div>
                        </div>

                        {/* Botón inferior Ver Plan */}
                        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-blue-500 transition-colors mt-auto">
                          <span>Ver Mapa y Plan</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </main>

      {/* Sección Herramientas integradas */}
      <section className="py-16 md:py-20 bg-zinc-50/50 dark:bg-[#121212]/50 border-t border-zinc-200/80 dark:border-zinc-800/80">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 text-xs font-medium mb-3">
              Herramientas Universitarias
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Todo lo que necesitás para tu carrera
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-normal mt-2 leading-relaxed">
              Desde el primer año hasta tu tesis: mapa de correlatividades, apuntes, pomodoro y tutor inteligente.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: Layers, label: "Correlatividades", val: "Árbol Interactivo" },
              { icon: Clock, label: "Productividad", val: "Pomodoro Focus" },
              { icon: Target, label: "Seguimiento", val: "Métricas & Notas" },
              { icon: GraduationCap, label: "Apoyo Académico", val: "Tutor IA Rioplatense" },
            ].map((item, i) => (
              <div
                key={i}
                className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs text-center space-y-2"
              >
                <div className="w-9 h-9 rounded-xl mx-auto flex items-center justify-center bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="text-[10px] uppercase font-medium text-zinc-400">{item.label}</div>
                <div className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Banner Call-to-action ¿No encontrás tu carrera? */}
      <section className="py-14 bg-white dark:bg-zinc-950 border-t border-zinc-200/80 dark:border-zinc-800/80">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="p-8 sm:p-10 rounded-3xl bg-zinc-900 text-white dark:bg-[#181818] border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 text-center md:text-left max-w-xl">
              <span className="px-2.5 py-1 bg-white/10 rounded-full text-[11px] font-medium text-zinc-300 border border-white/15">
                Plan Personalizado
              </span>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                ¿No encontrás tu carrera o universidad?
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed">
                Con TABE podés crear tu propio plan en segundos. Subí tu PDF o cargá tus materias y gestioná tus correlatividades y calendario.
              </p>
            </div>
            <Link
              to="/registro"
              className="px-5 py-2.5 bg-white text-zinc-900 hover:bg-zinc-100 font-medium text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 shrink-0 shadow-xs cursor-pointer"
            >
              <span>Crear mi Plan Gratis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
