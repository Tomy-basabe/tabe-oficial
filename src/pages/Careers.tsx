import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Clock,
  Target,
  ArrowRight,
  Search,
  Building2,
  Calendar,
  Layers,
  Check,
  Compass,
  BookOpen,
  MapPin,
  ArrowDownAZ,
  Flame,
  Filter,
} from "lucide-react";
import { motion } from "framer-motion";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { UniversityLogo } from "@/components/icons/UniversityLogos";
import { cn } from "@/lib/utils";
import {
  AVAILABLE_CAREERS,
  ALL_FACULTADES,
  AVAILABLE_FACULTADES,
  ALL_PROVINCIAS,
} from "@/lib/careerData";
import careerStatsRaw from "@/lib/careerStats.json";

const careerStats = careerStatsRaw as Record<string, [number, number]>;

interface UniversityDefinition {
  id: string;
  name: string;
  shortName: string;
  facultyInfo: string;
  location: string;
  badgeColor: string;
  accentColor: string;
  provinciaId: string;
  provinciaName: string;
}

const PROVINCIA_LABELS: Record<string, string> = {
  CORDOBA: "Córdoba",
  MENDOZA: "Mendoza",
  SAN_LUIS: "San Luis",
  SAN_JUAN: "San Juan",
  BUENOS_AIRES: "Buenos Aires",
  CABA: "CABA",
  SANTA_FE: "Santa Fe",
};

const PROVINCES_ORDER = ["CORDOBA", "MENDOZA", "SAN_LUIS", "SAN_JUAN", "BUENOS_AIRES"];

// Colores de acento por defecto para las facultades
const FACULTY_COLORS: Record<string, { accent: string; badge: string; location: string }> = {
  UTN: { accent: "#0072CE", badge: "bg-[#003865] text-white", location: "Mendoza / Córdoba" },
  UTN_FRSR: { accent: "#0072CE", badge: "bg-[#003865] text-white", location: "San Rafael, Mendoza" },
  UNCUYO: { accent: "#004F9F", badge: "bg-[#004F9F] text-white", location: "Mendoza" },
  UNCUYO_FCPYS: { accent: "#004F9F", badge: "bg-[#004F9F] text-white", location: "Mendoza" },
  UMENDOZA: { accent: "#005a9c", badge: "bg-[#005a9c] text-white", location: "Mendoza" },
  UMAZA: { accent: "#1e3a8a", badge: "bg-[#1e3a8a] text-white", location: "Guaymallén, Mendoza" },
  UCONGRESO: { accent: "#0284c7", badge: "bg-[#0284c7] text-white", location: "Mendoza" },
  UDA: { accent: "#b91c1c", badge: "bg-[#b91c1c] text-white", location: "Mendoza" },
  UCHAMPAGNAT: { accent: "#047857", badge: "bg-[#047857] text-white", location: "Godoy Cruz, Mendoza" },
  UCA: { accent: "#1e40af", badge: "bg-[#1e40af] text-white", location: "Mendoza" },
  UES21: { accent: "#ea580c", badge: "bg-[#ea580c] text-white", location: "Mendoza" },
  DONBOSCO: { accent: "#722F37", badge: "bg-[#6A1B29] text-white", location: "Rodeo del Medio, Mendoza" },
  ITGC: { accent: "#1E3A8A", badge: "bg-[#1E3A8A] text-white", location: "Godoy Cruz, Mendoza" },
  INSUTEC: { accent: "#0284c7", badge: "bg-[#0369a1] text-white", location: "Mendoza" },
  IES_BELGRANO: { accent: "#0891b2", badge: "bg-[#0e7490] text-white", location: "Mendoza" },
  IES_MAIPU: { accent: "#059669", badge: "bg-[#047857] text-white", location: "Maipú, Mendoza" },
  UNSJ: { accent: "#8A1538", badge: "bg-[#7A0026] text-white", location: "San Juan" },
  UCCUYO: { accent: "#1e3a8a", badge: "bg-[#172554] text-white", location: "San Juan" },
  UCONGRESO_SJ: { accent: "#0284c7", badge: "bg-[#0369a1] text-white", location: "San Juan" },
  UNLP: { accent: "#002B49", badge: "bg-[#002B49] text-white", location: "La Plata, Buenos Aires" },
  // CÓRDOBA
  UNC_CBA: { accent: "#7B1113", badge: "bg-[#7B1113] text-white", location: "Córdoba" },
  UTN_FRC: { accent: "#0072CE", badge: "bg-[#003865] text-white", location: "Córdoba" },
  UTN_FRSF_CBA: { accent: "#0072CE", badge: "bg-[#003865] text-white", location: "San Francisco, Córdoba" },
  UTN_FRVM: { accent: "#0072CE", badge: "bg-[#003865] text-white", location: "Villa María, Córdoba" },
  UNRC: { accent: "#0284c7", badge: "bg-[#0369a1] text-white", location: "Río Cuarto, Córdoba" },
  UNVM: { accent: "#1e3a8a", badge: "bg-[#172554] text-white", location: "Villa María, Córdoba" },
  UCC_CBA: { accent: "#047857", badge: "bg-[#065f46] text-white", location: "Córdoba" },
  UBP: { accent: "#ea580c", badge: "bg-[#c2410c] text-white", location: "Córdoba" },
  UES21_CBA: { accent: "#ea580c", badge: "bg-[#ea580c] text-white", location: "Córdoba" },
  IUA: { accent: "#0284c7", badge: "bg-[#0284c7] text-white", location: "Córdoba" },
  IUCBC: { accent: "#0d9488", badge: "bg-[#0f766e] text-white", location: "Córdoba" },
  // SAN LUIS
  UNSL: { accent: "#1e40af", badge: "bg-[#1e3a8a] text-white", location: "San Luis" },
  UNVIME: { accent: "#059669", badge: "bg-[#047857] text-white", location: "Villa Mercedes, San Luis" },
  UNLC: { accent: "#d97706", badge: "bg-[#b45309] text-white", location: "Merlo, San Luis" },
  ULP: { accent: "#dc2626", badge: "bg-[#b91c1c] text-white", location: "La Punta, San Luis" },
  UCCUYO_SL: { accent: "#1e3a8a", badge: "bg-[#172554] text-white", location: "San Luis" },
};

// Generar dinámicamente las universidades a partir de las facultades disponibles
const UNIVERSITIES: UniversityDefinition[] = AVAILABLE_FACULTADES.map((f) => {
  const conf = FACULTY_COLORS[f.id] || {
    accent: "#3b82f6",
    badge: "bg-zinc-800 text-white",
    location: "Mendoza, Argentina",
  };

  const provName =
    PROVINCIA_LABELS[f.provinciaId] ||
    ALL_PROVINCIAS.find((p) => p.id === f.provinciaId)?.label ||
    f.provinciaId;

  return {
    id: f.id,
    name: f.fullLabel || f.label,
    shortName: f.label,
    facultyInfo: f.fullLabel || f.label,
    location: conf.location,
    badgeColor: conf.badge,
    accentColor: conf.accent,
    provinciaId: f.provinciaId,
    provinciaName: provName,
  };
});

interface CareerItem {
  id: string;
  name: string;
  universityId: string;
  universityName: string;
  universityShort: string;
  faculty: string;
  degreeType: string;
  years: number;
  durationLabel: string;
  totalSubjects: number;
  icon: any;
  color: string;
  provinciaId: string;
  provinciaName: string;
}

function getCareerIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("ingenier")) return Target;
  if (lower.includes("licenciatura")) return BookOpen;
  if (lower.includes("profesorado") || lower.includes("educaci")) return GraduationCap;
  if (lower.includes("tecnicatura")) return Layers;
  return GraduationCap;
}

type SortOption = "provincia" | "universidad" | "carreras_desc";

export default function Careers() {
  const [selectedProvince, setSelectedProvince] = useState<string>("ALL");
  const [selectedUniversity, setSelectedUniversity] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("provincia");

  const allCareers: CareerItem[] = useMemo(() => {
    const list: CareerItem[] = [];

    for (const career of AVAILABLE_CAREERS) {
      const fileKey = (career.file || career.id).split("/").pop()?.replace("_template", "") || "";
      const [, maxYear] = careerStats[fileKey] || [36, 5];

      const uniDef = UNIVERSITIES.find((u) => u.id === career.facultad) || {
        id: career.facultad,
        name: career.facultad,
        shortName: career.facultad,
        facultyInfo: career.facultad,
        location: "Mendoza, Argentina",
        badgeColor: "bg-zinc-800 text-white",
        accentColor: "#3b82f6",
        provinciaId: "MENDOZA",
        provinciaName: "Mendoza",
      };

      const icon = getCareerIcon(career.label);
      const degreeType = career.label.toLowerCase().includes("tecnicatura")
        ? "Tecnicatura"
        : career.label.toLowerCase().includes("profesorado")
        ? "Profesorado"
        : "Grado";

      const finalYears = maxYear || 5;
      const durationLabel = `${finalYears} ${finalYears === 1 ? "año" : "años"}`;
      const totalSubs = careerStats[fileKey]?.[0] || careerStats[career.id]?.[0] || 0;

      list.push({
        id: career.id,
        name: career.label,
        universityId: career.facultad,
        universityName: uniDef.name,
        universityShort: uniDef.shortName,
        faculty: uniDef.facultyInfo,
        degreeType,
        years: finalYears,
        durationLabel,
        totalSubjects: totalSubs,
        icon,
        color: uniDef.accentColor || "#0072CE",
        provinciaId: uniDef.provinciaId,
        provinciaName: uniDef.provinciaName,
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Estadísticas por provincia activa
  const provinceStats = useMemo(() => {
    const map = new Map<string, { id: string; label: string; count: number; unisCount: number }>();

    for (const uni of UNIVERSITIES) {
      const uniCareers = allCareers.filter((c) => c.universityId === uni.id);
      if (uniCareers.length === 0) continue;

      if (!map.has(uni.provinciaId)) {
        map.set(uni.provinciaId, {
          id: uni.provinciaId,
          label: uni.provinciaName,
          count: 0,
          unisCount: 0,
        });
      }
      const entry = map.get(uni.provinciaId)!;
      entry.count += uniCareers.length;
      entry.unisCount += 1;
    }

    return Array.from(map.values()).sort((a, b) => {
      const idxA = PROVINCES_ORDER.indexOf(a.id);
      const idxB = PROVINCES_ORDER.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.label.localeCompare(b.label);
    });
  }, [allCareers]);

  // Manejar cambio de provincia: si cambia, resetear universidad a ALL
  const handleProvinceChange = (provId: string) => {
    setSelectedProvince(provId);
    setSelectedUniversity("ALL");
  };

  // Universidades disponibles para la barra de filtro horizontal
  const availableUniversitiesForFilter = useMemo(() => {
    return UNIVERSITIES.filter((uni) => {
      if (selectedProvince !== "ALL" && uni.provinciaId !== selectedProvince) return false;
      return allCareers.some((c) => c.universityId === uni.id);
    });
  }, [selectedProvince, allCareers]);

  // Universidades filtradas con sus carreras coincidentes
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
          uni.name.toLowerCase().includes(q) ||
          uni.shortName.toLowerCase().includes(q) ||
          uni.provinciaName.toLowerCase().includes(q) ||
          uni.location.toLowerCase().includes(q)
        );
      });

      return {
        ...uni,
        careers: careersInUni,
      };
    }).filter((uni) => {
      const matchesProvince = selectedProvince === "ALL" || uni.provinciaId === selectedProvince;
      const matchesUni = selectedUniversity === "ALL" || selectedUniversity === uni.id;
      const hasCareers = uni.careers.length > 0;
      return matchesProvince && matchesUni && hasCareers;
    });
  }, [allCareers, selectedProvince, selectedUniversity, searchQuery]);

  // Secciones agrupadas según el modo de ordenamiento
  const groupedSections = useMemo(() => {
    if (sortBy === "universidad") {
      const sorted = [...displayedUniversities].sort((a, b) => a.name.localeCompare(b.name));
      return [{ id: "ALL", label: "Todas las Universidades (A - Z)", universities: sorted }];
    }

    if (sortBy === "carreras_desc") {
      const sorted = [...displayedUniversities].sort((a, b) => b.careers.length - a.careers.length);
      return [{ id: "ALL", label: "Universidades con Más Carreras", universities: sorted }];
    }

    // Por defecto: "provincia" (Agrupado y ordenado por Provincia)
    const groups: { id: string; label: string; universities: typeof displayedUniversities }[] = [];
    const provMap = new Map<string, typeof displayedUniversities>();

    for (const uni of displayedUniversities) {
      if (!provMap.has(uni.provinciaId)) {
        provMap.set(uni.provinciaId, []);
      }
      provMap.get(uni.provinciaId)!.push(uni);
    }

    const sortedProvKeys = Array.from(provMap.keys()).sort((a, b) => {
      const idxA = PROVINCES_ORDER.indexOf(a);
      const idxB = PROVINCES_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });

    for (const pId of sortedProvKeys) {
      const unis = provMap.get(pId)!;
      const label = PROVINCIA_LABELS[pId] || unis[0]?.provinciaName || pId;
      groups.push({
        id: pId,
        label,
        universities: unis.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    return groups;
  }, [displayedUniversities, sortBy]);

  const totalCareersCount = allCareers.length;
  const filteredCareersCount = displayedUniversities.reduce((acc, u) => acc + u.careers.length, 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-blue-500/20 selection:text-blue-600">
      <LandingNavbar />

      {/* Hero Header */}
      <section className="relative pt-32 pb-14 md:pt-40 md:pb-20 overflow-hidden border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-[#121212]/50">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 text-xs font-medium"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Directorio Académico Oficial</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight"
            >
              Facultades y Carreras
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm sm:text-base md:text-lg text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed max-w-2xl mx-auto"
            >
              Explorá las facultades y carreras oficiales ordenadas por provincia con su duración y logo institucional verificado.
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
                  placeholder="Buscar por carrera, universidad o provincia..."
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
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Facultades verificadas
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> {totalCareersCount} Carreras disponibles
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-500" /> {provinceStats.length} Provincias activas
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Barra de Filtros: Nivel 1 - Provincias + Selector de Orden */}
      <section className="sticky top-16 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60 py-2.5 shadow-2xs">
        <div className="container mx-auto px-4 md:px-6 space-y-2">
          {/* Fila de Provincias y Ordenamiento */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Tabs de Provincias */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mr-1 hidden sm:inline-block">
                Provincia:
              </span>

              <button
                onClick={() => handleProvinceChange("ALL")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0",
                  selectedProvince === "ALL"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                    : "bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60"
                )}
              >
                <MapPin className="w-3 h-3" />
                <span>Todas</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-md font-medium",
                    selectedProvince === "ALL"
                      ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                      : "bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {totalCareersCount}
                </span>
              </button>

              {provinceStats.map((prov) => {
                const isSelected = selectedProvince === prov.id;
                return (
                  <button
                    key={prov.id}
                    onClick={() => handleProvinceChange(prov.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0",
                      isSelected
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60"
                    )}
                  >
                    <span>{prov.label}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-md font-medium",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      {prov.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selector de Orden */}
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mr-1">
                Ordenar:
              </span>
              <div className="inline-flex rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900 p-0.5 text-xs">
                <button
                  onClick={() => setSortBy("provincia")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    sortBy === "provincia"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                  title="Ordenar y agrupar por Provincia"
                >
                  <MapPin className="w-3 h-3 text-blue-500" />
                  <span>Por Provincia</span>
                </button>
                <button
                  onClick={() => setSortBy("universidad")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    sortBy === "universidad"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                  title="Ordenar facultades de la A a la Z"
                >
                  <ArrowDownAZ className="w-3 h-3 text-zinc-500" />
                  <span>A - Z</span>
                </button>
                <button
                  onClick={() => setSortBy("carreras_desc")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    sortBy === "carreras_desc"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                  title="Facultades con más carreras primero"
                >
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span>+ Carreras</span>
                </button>
              </div>
            </div>
          </div>

          {/* Fila de Universidades / Facultades */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none border-t border-zinc-100 dark:border-zinc-800/60">
            <button
              onClick={() => setSelectedUniversity("ALL")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0",
                selectedUniversity === "ALL"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                  : "bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60"
              )}
            >
              <Building2 className="w-3 h-3" />
              <span>
                {selectedProvince === "ALL"
                  ? "Todas las Universidades"
                  : `Universidades de ${PROVINCIA_LABELS[selectedProvince] || selectedProvince}`}
              </span>
            </button>

            {availableUniversitiesForFilter.map((uni) => {
              const isSelected = selectedUniversity === uni.id;
              const count = allCareers.filter((c) => c.universityId === uni.id).length;
              if (count === 0) return null;

              return (
                <button
                  key={uni.id}
                  onClick={() => setSelectedUniversity(uni.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0",
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                      : "bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60"
                  )}
                >
                  <div className="w-4 h-4 shrink-0 rounded-md overflow-hidden flex items-center justify-center bg-white dark:bg-zinc-900 p-0.5 border border-zinc-200/60 dark:border-zinc-700/60">
                    <UniversityLogo universityId={uni.id} className="w-3.5 h-3.5" />
                  </div>
                  <span>{uni.shortName}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1 py-0.2 rounded font-medium",
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

      {/* Contenido Principal: Agrupado por Provincia y Universidades */}
      <main className="py-10 md:py-14 flex-1">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl space-y-12">
          {displayedUniversities.length === 0 ? (
            <div className="text-center py-16 p-8 bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xs max-w-md mx-auto space-y-3">
              <Search className="w-8 h-8 text-zinc-400 mx-auto" />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                No se encontraron carreras
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                {searchQuery
                  ? `No hay coincidencias para "${searchQuery}". Intentá buscar con otro término.`
                  : "No hay carreras disponibles para el filtro seleccionado."}
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedProvince("ALL");
                  setSelectedUniversity("ALL");
                }}
                className="px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium text-xs rounded-xl shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Restablecer Filtros
              </button>
            </div>
          ) : (
            groupedSections.map((section) => {
              const totalSectionCareers = section.universities.reduce(
                (acc, u) => acc + u.careers.length,
                0
              );

              return (
                <div key={section.id} className="space-y-8">
                  {/* Encabezado de Sección de Provincia (cuando está en modo agrupado) */}
                  {sortBy === "provincia" && (
                    <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 flex items-center justify-center shadow-2xs">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                            {section.label}
                          </h2>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {section.universities.length}{" "}
                            {section.universities.length === 1 ? "institución" : "instituciones"} ·{" "}
                            {totalSectionCareers}{" "}
                            {totalSectionCareers === 1 ? "carrera" : "carreras"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Universidades de la Sección */}
                  <div className="space-y-10">
                    {section.universities.map((uni) => (
                      <section
                        key={uni.id}
                        id={`uni-${uni.id.toLowerCase()}`}
                        className="space-y-4 scroll-mt-44"
                      >
                        {/* Encabezado limpio de la Universidad con Logo Oficial */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6 bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xs">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center p-2 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs shrink-0">
                              <UniversityLogo universityId={uni.id} className="w-full h-full" />
                            </div>

                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-lg md:text-xl text-zinc-900 dark:text-zinc-100 truncate">
                                  {uni.name}
                                </h3>
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
                              {uni.careers.length}{" "}
                              {uni.careers.length === 1 ? "Carrera" : "Carreras"}
                            </span>
                          </div>
                        </div>

                        {/* Grilla de Carreras de esta Universidad */}
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
                                  {/* Cabecera de la tarjeta: Icono + Mini logo oficial */}
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
                                      <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                                        <UniversityLogo
                                          universityId={uni.id}
                                          className="w-3.5 h-3.5"
                                        />
                                      </div>
                                      <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                                        {uni.shortName}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Título de la Carrera */}
                                  <h4 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 line-clamp-2 group-hover:text-blue-500 transition-colors mb-1">
                                    {career.name}
                                  </h4>

                                  {/* Subtítulo de Facultad */}
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 font-normal mb-3">
                                    {career.faculty}
                                  </p>

                                  {/* Duración y Materias destacadas */}
                                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 mb-2">
                                    <span className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                                      {career.durationLabel}
                                    </span>
                                    <span className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                                      {career.totalSubjects
                                        ? `${career.totalSubjects} materias`
                                        : career.degreeType}
                                    </span>
                                  </div>
                                </div>

                                {/* Pie de tarjeta con Call to Action sutil */}
                                <div className="pt-2 flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  <span>Ver carrera</span>
                                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
