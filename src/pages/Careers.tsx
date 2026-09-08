import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
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
  Sparkles,
} from "lucide-react";
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

// Dynamically load all JSON career templates
const careerTemplates = import.meta.glob("../data/*_template.json", { eager: true });

export default function Careers() {
  const [selectedUniversity, setSelectedUniversity] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Process and enrich all career data from templates
  const allCareers = useMemo(() => {
    return Object.entries(careerTemplates)
      .map(([path, module]: [string, any]) => {
        const id = path.split("/").pop()?.replace("_template.json", "") || "";
        const data = module.default || module;
        const subjects = data.subjects || [];
        const maxYear = Math.max(...subjects.map((s: any) => Number(s.año) || 0), 0);

        const meta = CAREER_METADATA[id] || {
          name: id
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" "),
          universityId: "UTN",
          faculty: "Universidad",
          icon: GraduationCap,
          color: "#0072CE",
        };

        const uni = UNIVERSITIES.find((u) => u.id === meta.universityId) || UNIVERSITIES[0];

        return {
          id,
          name: meta.name,
          universityId: meta.universityId,
          universityName: uni.name,
          faculty: meta.faculty,
          subjectsCount: subjects.length,
          years: maxYear || 5,
          icon: meta.icon,
          color: meta.color,
          description: `Plan de estudios estructurado con ${subjects.length} materias distribuidas en ${maxYear || 5} años con correlatividades y seguimiento en tiempo real.`,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Filtered universities based on tab and search
  const displayedUniversities = useMemo(() => {
    return UNIVERSITIES.map((uni) => {
      const uniCareers = allCareers.filter((c) => {
        const matchesUni = c.universityId === uni.id;
        const matchesSearch =
          searchQuery.trim() === "" ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.faculty.toLowerCase().includes(searchQuery.toLowerCase()) ||
          uni.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesUni && matchesSearch;
      });

      return {
        ...uni,
        careers: uniCareers,
      };
    }).filter((uni) => {
      const matchesTab = selectedUniversity === "ALL" || selectedUniversity === uni.id;
      const hasCareers = uni.careers.length > 0;
      return matchesTab && hasCareers;
    });
  }, [allCareers, selectedUniversity, searchQuery]);

  const totalCareersCount = allCareers.length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-[#BFFF00] selection:text-black">
      <LandingNavbar />

      {/* Hero Header */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden bg-secondary/40 border-b-4 border-foreground">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-5">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#BFFF00] text-black border-2 border-foreground text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_hsl(var(--foreground))]">
              <Building2 className="w-4 h-4" />
              Catálogo Oficial por Universidades
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-none text-foreground">
              Planes de <span className="text-[#ff9415] italic">Carrera</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground font-bold leading-relaxed max-w-2xl mx-auto">
              Explorá todos los planes de estudio universitarios agrupados por institución con sus logos oficiales, mapas de correlatividades y seguimiento académico inteligente.
            </p>

            {/* Buscador interactivo en vivo */}
            <div className="max-w-xl mx-auto relative pt-2">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 absolute left-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar carrera (ej: Sistemas, Agronomía, Civil, Trabajo Social)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-4 border-foreground bg-card text-foreground font-bold text-sm shadow-[4px_4px_0_0_hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-primary placeholder:font-bold placeholder:text-muted-foreground/70"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 text-xs font-black uppercase px-2 py-1 bg-muted border border-foreground/30 rounded-md text-foreground hover:bg-muted/80"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Micro badges informativos */}
            <div className="flex flex-wrap justify-center gap-4 pt-2 text-xs font-black text-muted-foreground uppercase">
              {["Validado por estudiantes", "Mapas de Correlatividades", `${totalCareersCount} Planes disponibles`, "100% Gratuito"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 bg-card px-3 py-1 rounded-xl border-2 border-foreground/20 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Barra de Filtros por Universidad (Tabs con logos oficiales) */}
      <section className="sticky top-16 z-40 bg-card border-b-4 border-foreground py-3 shadow-[0_4px_0_0_hsl(var(--foreground))]">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedUniversity("ALL")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-tight whitespace-nowrap border-2 transition-all cursor-pointer shrink-0",
                selectedUniversity === "ALL"
                  ? "bg-foreground text-background border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                  : "bg-background text-foreground border-foreground/30 hover:border-foreground"
              )}
            >
              <Building2 className="w-4 h-4" />
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
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-tight whitespace-nowrap border-2 transition-all cursor-pointer shrink-0",
                    isSelected
                      ? "bg-foreground text-background border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                      : "bg-background text-foreground border-foreground/30 hover:border-foreground"
                  )}
                >
                  <div className="w-4 h-4 shrink-0 rounded-md overflow-hidden flex items-center justify-center">
                    <UniversityLogo universityId={uni.id} className="w-4 h-4" />
                  </div>
                  <span>{uni.shortName}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded font-black border",
                      isSelected
                        ? "bg-background text-foreground border-transparent"
                        : "bg-muted text-muted-foreground border-foreground/20"
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
        <div className="container mx-auto px-4 md:px-6 max-w-7xl space-y-16">
          {displayedUniversities.length === 0 ? (
            <div className="text-center py-20 p-8 bg-card border-4 border-foreground rounded-3xl shadow-[8px_8px_0_0_hsl(var(--foreground))] max-w-md mx-auto space-y-4">
              <Search className="w-12 h-12 text-muted-foreground mx-auto" />
              <h3 className="text-xl font-black uppercase">No se encontraron carreras</h3>
              <p className="text-sm font-bold text-muted-foreground">
                No hay coincidencias para "{searchQuery}". Intentá buscar con otro término o limpiá el filtro.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedUniversity("ALL");
                }}
                className="px-4 py-2 bg-[#00E5FF] text-black font-black uppercase text-xs rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px]"
              >
                Restablecer Filtros
              </button>
            </div>
          ) : (
            displayedUniversities.map((uni) => (
              <section
                key={uni.id}
                id={`uni-${uni.id.toLowerCase()}`}
                className="space-y-6 scroll-mt-36"
              >
                {/* Encabezado prominente de la Universidad con Logo Oficial */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6 bg-card border-4 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))]">
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Logo Oficial Grande de la Universidad */}
                    <div className="w-14 h-14 md:w-16 md:md:h-16 rounded-2xl flex items-center justify-center p-1.5 bg-background border-3 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] shrink-0 hover:scale-105 transition-transform">
                      <UniversityLogo universityId={uni.id} className="w-full h-full" />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-black text-xl md:text-2xl uppercase tracking-tight text-foreground truncate">
                          {uni.name}
                        </h2>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-secondary text-foreground border border-foreground/30">
                          {uni.location}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm font-bold text-muted-foreground mt-0.5 truncate">
                        {uni.facultyInfo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="px-3 py-1.5 rounded-xl bg-[#BFFF00] text-black border-2 border-foreground text-xs font-black uppercase shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                      {uni.careers.length} {uni.careers.length === 1 ? "Carrera" : "Carreras"}
                    </span>
                  </div>
                </div>

                {/* Grilla de Carreras de esta Universidad */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {uni.careers.map((career) => {
                    const CareerIcon = career.icon;

                    return (
                      <Link
                        key={career.id}
                        to={`/carreras/${career.id}`}
                        className="group relative p-5 bg-card rounded-2xl border-3 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-3px] hover:shadow-[7px_7px_0_0_hsl(var(--foreground))] active:translate-y-[1px] transition-all flex flex-col justify-between h-full cursor-pointer"
                      >
                        <div>
                          {/* Cabecera de la tarjeta: Icono temático + Mini logo oficial de la universidad */}
                          <div className="flex items-center justify-between mb-3.5">
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center p-2 border-2 border-foreground shadow-xs group-hover:scale-110 group-hover:-rotate-2 transition-transform"
                              style={{
                                backgroundColor: `${career.color}18`,
                                color: career.color,
                              }}
                            >
                              <CareerIcon className="w-6 h-6" />
                            </div>

                            {/* Badge oficial de la universidad con su logo */}
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background border border-foreground/30 shadow-2xs">
                              <div className="w-3.5 h-3.5 shrink-0">
                                <UniversityLogo universityId={uni.id} className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-black uppercase text-foreground">
                                {uni.shortName}
                              </span>
                            </div>
                          </div>

                          {/* Título de la Carrera */}
                          <h3 className="text-base md:text-lg font-black uppercase tracking-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-1.5">
                            {career.name}
                          </h3>

                          {/* Subtítulo de Facultad */}
                          <p className="text-[11px] font-bold text-muted-foreground uppercase line-clamp-1 mb-3">
                            {career.faculty}
                          </p>

                          {/* Datos métricos de la carrera */}
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-secondary/50 border border-foreground/15 text-[11px] font-bold text-foreground">
                              <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{career.subjectsCount} Materias</span>
                            </div>
                            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-secondary/50 border border-foreground/15 text-[11px] font-bold text-foreground">
                              <Calendar className="w-3.5 h-3.5 text-[#ff9415] shrink-0" />
                              <span>{career.years} Años</span>
                            </div>
                          </div>
                        </div>

                        {/* Botón inferior Ver Plan */}
                        <div className="pt-3 border-t-2 border-foreground/15 flex items-center justify-between text-xs font-black uppercase text-foreground group-hover:text-primary transition-colors mt-auto">
                          <span>Ver Mapa y Plan</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
      <section className="py-16 md:py-20 bg-secondary/30 border-t-4 border-foreground">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block px-3 py-1 rounded-md bg-[#ff9415]/15 border-2 border-[#ff9415] text-xs font-black uppercase text-[#ff9415] mb-3">
              Herramientas Universitarias
            </span>
            <h2 className="text-2xl md:text-4xl font-black uppercase text-foreground">
              Todo lo que necesitás para tu carrera
            </h2>
            <p className="text-sm md:text-base font-bold text-muted-foreground mt-2">
              Desde el primer año hasta tu tesis: mapa de correlatividades, apuntes, pomodoro y tutor de IA.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: Layers, label: "Correlatividades", val: "Árbol Interactivo", color: "#1475e5" },
              { icon: Clock, label: "Productividad", val: "Pomodoro Focus", color: "#ff9415" },
              { icon: Target, label: "Seguimiento", val: "Métricas & Notas", color: "#48bd22" },
              { icon: Sparkles, label: "Apoyo Académico", val: "Tutor IA Rioplatense", color: "#8b5cf6" },
            ].map((item, i) => (
              <div
                key={i}
                className="p-5 bg-card rounded-2xl border-3 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] text-center space-y-2"
              >
                <div
                  className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center border-2 border-foreground"
                  style={{ backgroundColor: `${item.color}15`, color: item.color }}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="text-[10px] uppercase font-black text-muted-foreground">{item.label}</div>
                <div className="text-xs md:text-sm font-black text-foreground">{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Banner Call-to-action ¿No encontrás tu carrera? */}
      <section className="py-16 bg-card border-t-4 border-foreground">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="p-8 md:p-12 rounded-3xl bg-[#FFD700] text-black border-4 border-black shadow-[8px_8px_0_0_#000] flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl text-center md:text-left">
              <span className="px-3 py-1 bg-black text-white rounded-full text-xs font-black uppercase">
                Plan Personalizado
              </span>
              <h3 className="text-2xl md:text-4xl font-black uppercase leading-tight">
                ¿No encontrás tu carrera o universidad?
              </h3>
              <p className="font-bold text-sm md:text-base text-black/80">
                Con TABE podés crear tu propio plan en segundos. Subí tu PDF o cargá tus materias y dejá que nuestra IA gestione tus correlatividades y calendario.
              </p>
            </div>
            <Link
              to="/registro"
              className="px-6 py-3.5 bg-black text-white hover:bg-black/90 font-black uppercase text-xs md:text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_#fff] hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center gap-2 shrink-0"
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