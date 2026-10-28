import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  GraduationCap,
  Clock,
  BookOpen,
  ArrowRight,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  Layers,
  Sparkles,
  CheckCircle2,
  Building2,
  FileText,
} from "lucide-react";
import { UniversityLogo } from "@/components/icons/UniversityLogos";
import { loadCareerTemplate } from "@/lib/loadCareerTemplate";
import { cn } from "@/lib/utils";

interface TemplateSubject {
  id: string;
  codigo?: string;
  nombre: string;
  numero_materia: number;
  año: number;
  semestre?: number;
}

export interface UniversityDrawerItem {
  id: string;
  name: string;
  shortName: string;
  facultyInfo: string;
  location: string;
  provinciaName: string;
  cityName?: string;
  accentColor?: string;
  badgeColor?: string;
}

export interface DrawerCareerItem {
  id: string;
  name: string;
  universityId: string;
  degreeType: string;
  years: number;
  durationLabel: string;
  totalSubjects: number;
  icon: any;
  color: string;
  file?: string;
}

interface UniversityCareerDrawerProps {
  university: UniversityDrawerItem | null;
  careers: DrawerCareerItem[];
  isOpen: boolean;
  onClose: () => void;
}

export function UniversityCareerDrawer({
  university,
  careers,
  isOpen,
  onClose,
}: UniversityCareerDrawerProps) {
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedDegree, setSelectedDegree] = useState<string>("ALL");
  const [expandedCareerId, setExpandedCareerId] = useState<string | null>(null);
  const [subjectsCache, setSubjectsCache] = useState<Record<string, TemplateSubject[]>>({});
  const [loadingCareerId, setLoadingCareerId] = useState<string | null>(null);

  // Resetear estados al cambiar de universidad
  useEffect(() => {
    setSearchFilter("");
    setSelectedDegree("ALL");
    setExpandedCareerId(null);
  }, [university?.id]);

  // Manejar tecla ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Bloquear scroll del body al estar abierto en pantallas móviles
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Filtrado de carreras
  const filteredCareers = useMemo(() => {
    return careers.filter((career) => {
      const matchesSearch =
        !searchFilter.trim() ||
        career.name.toLowerCase().includes(searchFilter.toLowerCase().trim());

      const matchesDegree =
        selectedDegree === "ALL" ||
        (selectedDegree === "GRADO" &&
          (career.degreeType === "Grado" || career.name.toLowerCase().includes("ingenier"))) ||
        (selectedDegree === "TECNICATURA" && career.degreeType === "Tecnicatura");

      return matchesSearch && matchesDegree;
    });
  }, [careers, searchFilter, selectedDegree]);

  // Cargar materias al expandir plan
  const handleTogglePlan = async (career: DrawerCareerItem) => {
    if (expandedCareerId === career.id) {
      setExpandedCareerId(null);
      return;
    }

    setExpandedCareerId(career.id);

    // Si ya están en caché, no recargar
    if (subjectsCache[career.id]) return;

    setLoadingCareerId(career.id);
    try {
      const templateFile = career.file || `${career.id}_template`;
      const mod = await loadCareerTemplate(templateFile);
      if (mod?.default?.subjects) {
        setSubjectsCache((prev) => ({
          ...prev,
          [career.id]: mod.default.subjects,
        }));
      }
    } catch (err) {
      console.warn("No se pudo cargar el template dinámico para", career.id, err);
    } finally {
      setLoadingCareerId(null);
    }
  };

  if (!university) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop con Blur estilo Apple/Notion */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs z-50 cursor-pointer"
          />

          {/* Drawer Panel Flotante Lateral */}
          <motion.aside
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] md:w-[540px] bg-white dark:bg-[#151515] text-zinc-900 dark:text-zinc-100 z-50 shadow-2xl border-l border-zinc-200/80 dark:border-zinc-800 flex flex-col overflow-hidden"
          >
            {/* Header Institucional */}
            <div className="relative p-5 sm:p-6 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md shrink-0">
              {/* Botón Cerrar */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-200/70 hover:bg-zinc-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                title="Cerrar panel"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4 pr-10">
                {/* Logo Oficial */}
                <div className="w-14 h-14 rounded-2xl p-2 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden">
                  <UniversityLogo universityId={university.id} className="w-full h-full object-contain block" />
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
                      Sede Oficial
                    </span>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-500" />
                      {university.cityName || university.location}
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug">
                    {university.name}
                  </h2>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                    {university.facultyInfo !== university.name ? university.facultyInfo : university.provinciaName}
                  </p>
                </div>
              </div>

              {/* Sub-barra de Resumen */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-medium">
                  {careers.length} {careers.length === 1 ? "carrera oficial" : "carreras oficiales"}
                </span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  {university.provinciaName}
                </span>
              </div>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="p-4 border-b border-zinc-200/70 dark:border-zinc-800/70 bg-white/70 dark:bg-[#151515]/70 space-y-3 shrink-0">
              {/* Buscador de carreras */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar carrera en esta facultad..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all"
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-medium"
                  >
                    Borrar
                  </button>
                )}
              </div>

              {/* Filtros por Grado / Tecnicatura */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setSelectedDegree("ALL")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer",
                    selectedDegree === "ALL"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                      : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
                  )}
                >
                  Todas ({careers.length})
                </button>
                <button
                  onClick={() => setSelectedDegree("GRADO")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer",
                    selectedDegree === "GRADO"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                      : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
                  )}
                >
                  Grado
                </button>
                <button
                  onClick={() => setSelectedDegree("TECNICATURA")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer",
                    selectedDegree === "TECNICATURA"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                      : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
                  )}
                >
                  Tecnicaturas
                </button>
              </div>
            </div>

            {/* Listado con scroll de carreras */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 scrollbar-thin">
              {filteredCareers.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <Search className="w-8 h-8 text-zinc-400 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    No hay carreras coincidentes
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Probá cambiando el texto de búsqueda o el filtro de titulación.
                  </p>
                </div>
              ) : (
                filteredCareers.map((career) => {
                  const CareerIcon = career.icon || GraduationCap;
                  const isExpanded = expandedCareerId === career.id;
                  const isLoadingSubjects = loadingCareerId === career.id;
                  const subjects = subjectsCache[career.id] || [];

                  // Agrupar materias por año
                  const subjectsByYear = subjects.reduce<Record<number, TemplateSubject[]>>(
                    (acc, sub) => {
                      const year = sub.año || 1;
                      if (!acc[year]) acc[year] = [];
                      acc[year].push(sub);
                      return acc;
                    },
                    {}
                  );

                  return (
                    <div
                      key={career.id}
                      className="border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl bg-white dark:bg-[#1a1a1a] shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all overflow-hidden"
                    >
                      {/* Cabecera de la Carrera */}
                      <div className="p-4 sm:p-4.5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center p-2 shrink-0 border border-zinc-200/60 dark:border-zinc-700/60"
                              style={{
                                backgroundColor: `${career.color || "#3b82f6"}15`,
                                color: career.color || "#3b82f6",
                              }}
                            >
                              <CareerIcon className="w-4 h-4" />
                            </div>

                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 leading-snug">
                                {career.name}
                              </h3>
                              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                {career.degreeType}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Metadatos: Duración y materias */}
                        <div className="flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            {career.durationLabel}
                          </span>
                          <span className="flex items-center gap-1.5 font-medium">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                            {career.totalSubjects ? `${career.totalSubjects} materias` : "Plan modular"}
                          </span>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={() => handleTogglePlan(career)}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                              isExpanded
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700"
                            )}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{isExpanded ? "Ocultar Plan" : "Ver Plan de Estudios"}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <Link
                            to={`/carreras/${career.id}`}
                            className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/60 dark:border-blue-900/40 flex items-center gap-1 transition-colors shrink-0"
                            title="Abrir página completa de la carrera"
                          >
                            <span>Detalle</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      {/* Desplegable: Materias del Plan de Carrera */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="border-t border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-[#121212]/60 overflow-hidden"
                          >
                            <div className="p-4 space-y-4">
                              {isLoadingSubjects ? (
                                <div className="space-y-2 py-3">
                                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse w-1/3" />
                                  <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
                                  <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
                                </div>
                              ) : subjects.length === 0 ? (
                                <div className="p-4 text-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-xs text-zinc-500">
                                  Plan oficial disponible en vista detallada.
                                  <div className="mt-2">
                                    <Link
                                      to={`/carreras/${career.id}`}
                                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                                    >
                                      Explorar carrera completa <ArrowRight className="w-3 h-3" />
                                    </Link>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                                    <span>Estructura Curricular</span>
                                    <span>{subjects.length} materias totales</span>
                                  </div>

                                  {Object.entries(subjectsByYear)
                                    .sort(([a], [b]) => Number(a) - Number(b))
                                    .map(([yearNum, yearSubjects]) => (
                                      <div
                                        key={yearNum}
                                        className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 space-y-2"
                                      >
                                        <div className="flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                          <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                            {yearNum}° Año
                                          </span>
                                          <span className="text-[10px] font-normal text-zinc-400">
                                            {yearSubjects.length} materias
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-1.5 pt-1">
                                          {yearSubjects.map((sub, idx) => (
                                            <div
                                              key={sub.id || idx}
                                              className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800/60"
                                            >
                                              <span className="truncate pr-2">{sub.nombre}</span>
                                              {sub.semestre && (
                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400 shrink-0">
                                                  {sub.semestre}° Cuat.
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}

                                  {/* Botón inferior para abrir la página completa */}
                                  <div className="pt-2">
                                    <Link
                                      to={`/carreras/${career.id}`}
                                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                                    >
                                      <span>Ver correlatividades y plan completo</span>
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
