import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  GraduationCap, 
  Building2, 
  BookOpen, 
  ArrowRight, 
  Loader2, 
  FileUp, 
  Sliders, 
  Search, 
  X, 
  Check, 
  Sparkles,
  Clock,
  HelpCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubjects } from "@/hooks/useSubjects";
import { supabase } from "@/integrations/supabase/client";
import { ALL_PROVINCIAS, ALL_FACULTADES, AVAILABLE_CAREERS, FacultadOption } from "@/lib/careerData";
import { UniversityLogo } from "@/components/icons/UniversityLogos";
import { toast } from "sonner";
import { AICareerImportModal } from "@/components/subjects/AICareerImportModal";
import careerStatsRaw from "@/lib/careerStats.json";
import { cn } from "@/lib/utils";

const careerStats = careerStatsRaw as Record<string, [number, number]>;

export function CareerPlanOnboardingModal() {
  const { user, isGuest } = useAuth();
  const { subjects, importCareerPlan, importCustomCareerPlan, deleteAllSubjects } = useSubjects();

  const [isOpen, setIsOpen] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Filtros y búsquedas
  const [provinciaFilter, setProvinciaFilter] = useState<string>("ALL");
  const [searchFacultad, setSearchFacultad] = useState<string>("");
  const [searchCareer, setSearchCareer] = useState<string>("");

  // Selecciones
  const [selectedFacultad, setSelectedFacultad] = useState<string>("");
  const [customFacultad, setCustomFacultad] = useState<string>("");
  const [isCustomFacultad, setIsCustomFacultad] = useState(false);

  const [selectedCareer, setSelectedCareer] = useState<string>("");
  const [customCareer, setCustomCareer] = useState<string>("");
  const [isCustomCareer, setIsCustomCareer] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const storageKey = user
    ? `tabe_career_onboarding_v2_${user.id}`
    : "tabe_career_onboarding_v2_guest";

  // 1. Condición de visualización: se pregunta una única vez al entrar a la App
  useEffect(() => {
    let isMounted = true;

    const checkAcademicStatus = async () => {
      // En modo invitado no forzar el asistente si ya fue cerrado
      if (isGuest || !user) {
        if (isMounted) {
          setLoadingCheck(false);
          setIsOpen(false);
        }
        return;
      }

      // Si el usuario ya lo respondió u omitió en esta versión, no volver a mostrar nunca
      if (localStorage.getItem(storageKey) === "true") {
        if (isMounted) setLoadingCheck(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("academic_onboarding_dismissed, facultad")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("No se pudo verificar el perfil académico:", error.message);
        }

        const profileData = data as any;
        if (profileData?.academic_onboarding_dismissed === true) {
          localStorage.setItem(storageKey, "true");
          if (isMounted) setIsOpen(false);
        } else {
          // Si ya tiene una facultad previa, la inicializamos
          if (profileData?.facultad) {
            const raw = profileData.facultad.trim();
            const match = ALL_FACULTADES.find(
              (f) =>
                f.id.toLowerCase() === raw.toLowerCase() ||
                f.label.toLowerCase() === raw.toLowerCase() ||
                f.fullLabel.toLowerCase().includes(raw.toLowerCase())
            );
            if (match) {
              setSelectedFacultad(match.id);
            } else {
              setIsCustomFacultad(true);
              setCustomFacultad(raw);
            }
          }

          setTimeout(() => {
            if (isMounted) setIsOpen(true);
          }, 500);
        }
      } catch (err) {
        console.error("Error al verificar onboarding académico:", err);
      } finally {
        if (isMounted) setLoadingCheck(false);
      }
    };

    checkAcademicStatus();

    return () => {
      isMounted = false;
    };
  }, [user, isGuest, storageKey]);

  // Lista de facultades filtradas por provincia y por término de búsqueda
  const filteredFacultades = useMemo(() => {
    const q = searchFacultad.trim().toLowerCase();
    return ALL_FACULTADES.filter((fac) => {
      // Filtro de provincia
      if (provinciaFilter !== "ALL" && fac.provinciaId !== provinciaFilter) {
        return false;
      }
      // Filtro de búsqueda textual
      if (!q) return true;
      const matchLabel = fac.label.toLowerCase().includes(q);
      const matchFull = fac.fullLabel.toLowerCase().includes(q);
      const matchId = fac.id.toLowerCase().includes(q);
      const prov = ALL_PROVINCIAS.find((p) => p.id === fac.provinciaId)?.label.toLowerCase() || "";
      const matchProv = prov.includes(q);
      return matchLabel || matchFull || matchId || matchProv;
    });
  }, [provinciaFilter, searchFacultad]);

  // Carreras asociadas a la facultad elegida (si tiene en el catálogo)
  const availableCareersForFacultad = useMemo(() => {
    if (!selectedFacultad) return [];
    return AVAILABLE_CAREERS.filter((c) => c.facultad === selectedFacultad);
  }, [selectedFacultad]);

  // Carreras filtradas por búsqueda textual
  const filteredCareers = useMemo(() => {
    const q = searchCareer.trim().toLowerCase();
    if (!q) return availableCareersForFacultad;
    return availableCareersForFacultad.filter((c) => c.label.toLowerCase().includes(q));
  }, [availableCareersForFacultad, searchCareer]);

  // Resolver nombre de la facultad elegida
  const resolvedFacultadObj = useMemo(() => {
    return ALL_FACULTADES.find((f) => f.id === selectedFacultad);
  }, [selectedFacultad]);

  const resolvedFacultadName = useMemo(() => {
    if (isCustomFacultad) return customFacultad.trim();
    if (!resolvedFacultadObj) return "";
    return resolvedFacultadObj.fullLabel || resolvedFacultadObj.label || selectedFacultad;
  }, [isCustomFacultad, customFacultad, resolvedFacultadObj, selectedFacultad]);

  // Omitir por ahora (cerrar sin trabar al usuario)
  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true");
    if (user && !isGuest) {
      supabase
        .from("profiles")
        .update({ academic_onboarding_dismissed: true } as any)
        .eq("user_id", user.id)
        .then(() => {});
    }
    setIsOpen(false);
  };

  // Guardar solo la universidad (sin alterar materias)
  const handleSaveUniversityOnly = async () => {
    if (!resolvedFacultadName) {
      toast.warning("Buscá y seleccioná tu universidad (o escribí su nombre)", {
        description: "Podés usar el buscador superior para encontrar tu institución.",
      });
      searchInputRef.current?.focus();
      return;
    }

    setSaving(true);
    try {
      localStorage.setItem(storageKey, "true");

      if (user && !isGuest) {
        await supabase
          .from("profiles")
          .update({
            facultad: resolvedFacultadName,
            academic_profile_completed: true,
            academic_onboarding_dismissed: true,
          } as any)
          .eq("user_id", user.id);
      } else {
        localStorage.setItem("tabe_guest_facultad", resolvedFacultadName);
      }

      toast.success(`🎓 Universidad guardada: ${resolvedFacultadName}`, {
        description: "Tus materias y apuntes actuales se conservaron intactos.",
      });
      setIsOpen(false);
    } catch (err) {
      console.error("Error al guardar universidad:", err);
      toast.error("Ocurrió un error al guardar tu universidad.");
    } finally {
      setSaving(false);
    }
  };

  // Guardar universidad y CARGAR PLAN DE CARRERA OFICIAL
  const handleSaveAndImportCareer = async () => {
    if (!resolvedFacultadName) {
      toast.warning("Seleccioná primero tu universidad");
      searchInputRef.current?.focus();
      return;
    }

    const careerObj = AVAILABLE_CAREERS.find((c) => c.id === selectedCareer);
    const careerName = isCustomCareer
      ? customCareer.trim()
      : careerObj?.label || customCareer.trim() || selectedCareer;

    if (!careerName) {
      toast.warning("Seleccioná la carrera que deseás importar");
      return;
    }

    setSaving(true);
    try {
      localStorage.setItem(storageKey, "true");

      if (careerObj?.file) {
        if (subjects.length > 0) {
          try {
            await deleteAllSubjects();
          } catch (delErr) {
            console.warn("Limpieza de materias previas:", delErr);
          }
        }
        await importCareerPlan(careerObj.id, true);
      }

      if (user && !isGuest) {
        await supabase
          .from("profiles")
          .update({
            facultad: resolvedFacultadName,
            carrera: careerName,
            academic_profile_completed: true,
            academic_onboarding_dismissed: true,
          } as any)
          .eq("user_id", user.id);
      } else {
        localStorage.setItem("tabe_guest_facultad", resolvedFacultadName);
        localStorage.setItem("tabe_guest_carrera", careerName);
      }

      toast.success(
        careerObj?.file
          ? "🎓 ¡Plan de carrera cargado exitosamente!"
          : "🎓 ¡Universidad y carrera guardadas!"
      );
      setIsOpen(false);
    } catch (err) {
      console.error("Error al cargar plan:", err);
      toast.error("Ocurrió un error al cargar el plan.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingCheck || !isOpen) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
        <DialogContent className="sm:max-w-xl bg-white dark:bg-[#1a1a1a] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-hidden flex flex-col">
          {/* Header */}
          <DialogHeader className="text-left space-y-1.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-medium border border-blue-200/60 dark:border-blue-800/50">
                <Sliders className="w-3 h-3 text-blue-500" />
                Configuración Inicial
              </span>

              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                Omitir por ahora
              </button>
            </div>

            <DialogTitle className="font-semibold text-lg sm:text-xl tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span>¿A qué Universidad pertenecés?</span>
            </DialogTitle>

            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed">
              Buscá y seleccioná tu institución. Es obligatorio indicar tu facultad; la carga de plan de materias es opcional y no sobrescribe tus materias a menos que lo desees.
            </DialogDescription>
          </DialogHeader>

          {/* Cuerpo interactivo scrolleable */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
            {/* 1. SECCIÓN DE BÚSQUEDA Y SELECCIÓN DE UNIVERSIDAD */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>1. Seleccioná tu Universidad o Instituto</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">*Requerido</span>
                </label>

                {resolvedFacultadName && (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Seleccionada
                  </span>
                )}
              </div>

              {/* Barra de Búsqueda Instantánea con Botón Limpiar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar por nombre (ej: UTN, Cuyo, UM, Siglo 21, Aconcagua, UBA...)"
                  value={searchFacultad}
                  onChange={(e) => setSearchFacultad(e.target.value)}
                  className="h-10 pl-9 pr-8 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 rounded-xl focus-visible:ring-1 focus-visible:ring-blue-500 shadow-2xs"
                />
                {searchFacultad && (
                  <button
                    type="button"
                    onClick={() => setSearchFacultad("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtro rápido por Provincia (Chips deslizables) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                <button
                  type="button"
                  onClick={() => setProvinciaFilter("ALL")}
                  className={cn(
                    "px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer border",
                    provinciaFilter === "ALL"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent font-medium"
                      : "bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-700/60 hover:bg-zinc-200/60"
                  )}
                >
                  Todas ({ALL_FACULTADES.length})
                </button>
                {ALL_PROVINCIAS.filter((p) => p.id !== "OTRA_PROVINCIA").map((prov) => {
                  const count = ALL_FACULTADES.filter((f) => f.provinciaId === prov.id).length;
                  if (count === 0) return null;
                  const isSel = provinciaFilter === prov.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => setProvinciaFilter(prov.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer border",
                        isSel
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent font-medium"
                          : "bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-700/60 hover:bg-zinc-200/60"
                      )}
                    >
                      {prov.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Lista Scrolleable de Facultades */}
              <div className="border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden bg-white dark:bg-[#1f1f1f] shadow-2xs">
                <div className="max-h-48 overflow-y-auto p-1.5 space-y-1">
                  {filteredFacultades.length === 0 ? (
                    <div className="p-4 text-center space-y-1">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                        No se encontraron universidades con "{searchFacultad}".
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomFacultad(true);
                          setSelectedFacultad("OTHER");
                          setCustomFacultad(searchFacultad);
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 underline font-medium cursor-pointer"
                      >
                        Usar "{searchFacultad}" como nombre de mi institución
                      </button>
                    </div>
                  ) : (
                    filteredFacultades.map((fac) => {
                      const isSelected = selectedFacultad === fac.id && !isCustomFacultad;
                      const careersCount = AVAILABLE_CAREERS.filter((c) => c.facultad === fac.id).length;

                      return (
                        <button
                          key={fac.id}
                          type="button"
                          onClick={() => {
                            setSelectedFacultad(fac.id);
                            setIsCustomFacultad(false);
                            setCustomFacultad("");
                            setSelectedCareer("");
                            setIsCustomCareer(false);
                          }}
                          className={cn(
                            "w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between gap-3 cursor-pointer",
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-500/40 text-blue-900 dark:text-blue-200 shadow-2xs font-medium"
                              : "border border-transparent hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 shrink-0 rounded-md overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center p-0.5">
                              <UniversityLogo universityId={fac.id} className="w-5 h-5" />
                            </div>
                            <div className="truncate">
                              <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                                {fac.label}
                              </p>
                              <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                {fac.fullLabel}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {careersCount > 0 ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-500/20">
                                {careersCount} {careersCount === 1 ? "carrera" : "carreras"}
                              </span>
                            ) : null}

                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}

                  {/* Opción para escribir a mano */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomFacultad(true);
                      setSelectedFacultad("OTHER");
                      setSelectedCareer("");
                    }}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between gap-2 border border-dashed cursor-pointer",
                      isCustomFacultad
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500/40 text-blue-900 dark:text-blue-200 font-medium"
                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">✏️</span>
                      <span>No encuentro mi institución / Otra universidad o instituto</span>
                    </div>
                    {isCustomFacultad && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                </div>
              </div>

              {/* Input si eligió escribir a mano */}
              {isCustomFacultad && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5 animate-in fade-in">
                  <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Escribí el nombre exacto de tu institución:
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej: Universidad Siglo 21 / Instituto Técnico / Otra"
                    value={customFacultad}
                    onChange={(e) => setCustomFacultad(e.target.value)}
                    autoFocus
                    className="h-9 text-xs bg-white dark:bg-[#18181b] rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* 2. SECCIÓN DE PLAN DE CARRERA (OPCIONAL) */}
            <div className="space-y-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                  <span>2. Plan de Carrera Oficial (Opcional)</span>
                </label>
                <span className="text-[10px] text-zinc-400 font-normal">
                  Podés omitirlo si ya tenés tus materias cargadas
                </span>
              </div>

              {availableCareersForFacultad.length > 0 ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder={`Buscar entre las ${availableCareersForFacultad.length} carreras disponibles...`}
                      value={searchCareer}
                      onChange={(e) => setSearchCareer(e.target.value)}
                      className="h-9 pl-8 text-xs bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xs"
                    />
                  </div>

                  <div className="border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden bg-white dark:bg-[#1f1f1f]">
                    <div className="max-h-36 overflow-y-auto p-1.5 space-y-1">
                      {filteredCareers.map((c) => {
                        const isSelected = selectedCareer === c.id && !isCustomCareer;
                        const fileKey = (c.file || c.id).split("/").pop()?.replace("_template", "") || "";
                        const [, maxYear] = careerStats[fileKey] || [36, 5];
                        const durationLabel = `${maxYear || 5} años`;

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCareer(c.id);
                              setIsCustomCareer(false);
                              setCustomCareer("");
                            }}
                            className={cn(
                              "w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer",
                              isSelected
                                ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-medium"
                                : "hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                            )}
                          >
                            <span className="truncate">{c.label}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-zinc-400" />
                                {durationLabel}
                              </span>
                              {isSelected && <Check className="w-3 h-3 text-emerald-600" />}
                            </div>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCareer(true);
                          setSelectedCareer("OTHER");
                        }}
                        className={cn(
                          "w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 border border-dashed cursor-pointer",
                          isCustomCareer
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-medium"
                            : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 text-zinc-500"
                        )}
                      >
                        <span>✏️ Otra carrera (escribir el nombre a mano)</span>
                        {isCustomCareer && <Check className="w-3 h-3 text-emerald-600" />}
                      </button>
                    </div>
                  </div>

                  {isCustomCareer && (
                    <Input
                      type="text"
                      placeholder="Escribí el nombre de tu carrera..."
                      value={customCareer}
                      onChange={(e) => setCustomCareer(e.target.value)}
                      className="h-9 text-xs bg-zinc-50 dark:bg-zinc-900/60 rounded-lg"
                    />
                  )}
                </div>
              ) : selectedFacultad ? (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Esta institución no tiene carreras automáticas en la base local aún. Podés escribir tu carrera o cargar tus materias con IA.
                  </p>
                  <Input
                    type="text"
                    placeholder="Nombre de tu carrera (opcional)..."
                    value={customCareer}
                    onChange={(e) => setCustomCareer(e.target.value)}
                    className="h-9 text-xs bg-white dark:bg-[#18181b] rounded-lg"
                  />
                </div>
              ) : (
                <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center">
                  <p className="text-xs text-zinc-400">
                    Buscá y seleccioná primero tu universidad para ver sus planes disponibles.
                  </p>
                </div>
              )}
            </div>

            {/* Alternativa con IA */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0">
                  <FileUp className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                    ¿Tenés tu plan en PDF o foto?
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Extraé materias y correlatividades con IA.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowAiModal(true)}
                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium px-3 py-1.5 h-auto rounded-lg shrink-0 cursor-pointer"
              >
                Subir con IA
              </Button>
            </div>
          </div>

          {/* Footer con Botones que FUNCIONAN SIEMPRE */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
            {/* Botón 1: Omitir / Guardar solo Universidad */}
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveUniversityOnly}
              disabled={saving}
              className="w-full sm:w-auto text-xs font-medium border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl py-2 px-4 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Guardar universidad (mantener mis materias)</span>
            </Button>

            {/* Botón 2: Importar Plan Oficial si eligió carrera */}
            {selectedCareer && selectedCareer !== "OTHER" ? (
              <Button
                type="button"
                onClick={handleSaveAndImportCareer}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-medium rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cargando plan...</span>
                  </>
                ) : (
                  <>
                    <span>Cargar Plan de Carrera</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSaveUniversityOnly}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar Selección</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal IA de subida de archivos */}
      {showAiModal && (
        <AICareerImportModal
          open={showAiModal}
          onClose={() => setShowAiModal(false)}
          onImport={async (data) => {
            await importCustomCareerPlan(data);
            if (user && !isGuest) {
              const facName = data.facultad || resolvedFacultadName || "Universidad";
              const carName = data.careerName || "Mi Carrera";
              await supabase
                .from("profiles")
                .update({
                  facultad: facName,
                  carrera: carName,
                  academic_profile_completed: true,
                  academic_onboarding_dismissed: true,
                } as any)
                .eq("user_id", user.id);
            }
            localStorage.setItem(storageKey, "true");
            setIsOpen(false);
          }}
        />
      )}
    </>
  );
}
