import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Building2, BookOpen, ArrowRight, Loader2, FileUp, Sliders, MapPin, AlertTriangle, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubjects } from "@/hooks/useSubjects";
import { supabase } from "@/integrations/supabase/client";
import { ALL_PROVINCIAS, ALL_FACULTADES, AVAILABLE_CAREERS } from "@/lib/careerData";
import { toast } from "sonner";
import { AICareerImportModal } from "@/components/subjects/AICareerImportModal";

export function CareerPlanOnboardingModal() {
  const { user, isGuest } = useAuth();
  const { subjects, importCareerPlan, importCustomCareerPlan, deleteAllSubjects } = useSubjects();

  const [isOpen, setIsOpen] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Estados de selección en cascada: Provincia -> Universidad -> Carrera
  const [selectedProvincia, setSelectedProvincia] = useState<string>("");
  const [selectedFacultad, setSelectedFacultad] = useState<string>("");
  const [customFacultad, setCustomFacultad] = useState<string>("");
  const [selectedCareer, setSelectedCareer] = useState<string>("");
  const [customCareer, setCustomCareer] = useState<string>("");

  const storageKey = user
    ? `tabe_career_onboarding_v2_${user.id}`
    : "tabe_career_onboarding_v2_guest";

  // 1. Condición de visualización: se pregunta una única vez al entrar a la App
  useEffect(() => {
    let isMounted = true;

    const checkAcademicStatus = async () => {
      // Si el usuario ya lo respondió u omitió en esta versión, no volver a mostrar nunca
      if (localStorage.getItem(storageKey) === "true") {
        if (isMounted) setLoadingCheck(false);
        return;
      }

      // Si es invitado, mostrar sólo si no fue omitido en localStorage
      if (isGuest || !user) {
        if (isMounted) {
          setLoadingCheck(false);
          setTimeout(() => {
            if (isMounted && !localStorage.getItem(storageKey)) {
              setIsOpen(true);
            }
          }, 600);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("academic_onboarding_dismissed")
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
          // Mostrar el asistente una única vez
          setTimeout(() => {
            if (isMounted) setIsOpen(true);
          }, 600);
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

  // Universidades filtradas por la provincia seleccionada (Paso 2)
  const availableFacultades = useMemo(() => {
    if (!selectedProvincia) return [];
    if (selectedProvincia === "OTRA_PROVINCIA") {
      return ALL_FACULTADES;
    }
    return ALL_FACULTADES.filter((f) => f.provinciaId === selectedProvincia);
  }, [selectedProvincia]);

  // Carreras disponibles para la facultad seleccionada (Paso 3)
  const availableCareers = useMemo(() => {
    if (!selectedFacultad) return [];
    return AVAILABLE_CAREERS.filter((c) => c.facultad === selectedFacultad);
  }, [selectedFacultad]);

  // Reiniciar universidad y carrera si cambia la provincia
  const handleProvinciaChange = (provinciaId: string) => {
    setSelectedProvincia(provinciaId);
    setSelectedFacultad("");
    setCustomFacultad("");
    setSelectedCareer("");
    setCustomCareer("");
  };

  // Reiniciar carrera si cambia la facultad
  const handleFacultadChange = (facultadId: string) => {
    setSelectedFacultad(facultadId);
    setCustomFacultad("");
    setSelectedCareer("");
    setCustomCareer("");
  };

  // Helper para verificar si la universidad está válidamente completada
  const isUniversityValid = useMemo(() => {
    if (!selectedProvincia) return false;
    if (!selectedFacultad) return false;
    if (selectedFacultad === "OTRA_FACULTAD") {
      return customFacultad.trim().length > 0;
    }
    return true;
  }, [selectedProvincia, selectedFacultad, customFacultad]);

  // 2. Opción A: Guardar ÚNICAMENTE la universidad y omitir plan de materias
  // (Conserva las materias actuales sin sobrescribir nada)
  const handleSaveUniversityOnly = async () => {
    const provObj = ALL_PROVINCIAS.find((p) => p.id === selectedProvincia);
    const facultadObj = ALL_FACULTADES.find((f) => f.id === selectedFacultad);

    const facultadName =
      selectedFacultad === "OTRA_FACULTAD"
        ? customFacultad.trim()
        : facultadObj?.fullLabel || facultadObj?.label || selectedFacultad;

    if (!selectedProvincia) {
      toast.error("Por favor, selecciona primero tu provincia.");
      return;
    }

    if (!facultadName) {
      toast.error("Por favor, selecciona tu universidad (o elige 'Otro' para escribirla).");
      return;
    }

    setSaving(true);
    try {
      localStorage.setItem(storageKey, "true");

      const provLabel = provObj?.label || selectedProvincia;
      const fullFacultadWithProv = `${facultadName} (${provLabel})`;

      if (user && !isGuest) {
        await supabase
          .from("profiles")
          .update({
            facultad: fullFacultadWithProv,
            academic_profile_completed: true,
            academic_onboarding_dismissed: true,
          } as any)
          .eq("user_id", user.id);
      }

      toast.success(`🎓 Universidad guardada: ${facultadName}`, {
        description: "Tus materias actuales se conservaron intactas.",
      });
      setIsOpen(false);
    } catch (err) {
      console.error("Error al guardar universidad:", err);
      toast.error("Ocurrió un error al guardar tu universidad.");
    } finally {
      setSaving(false);
    }
  };

  // 3. Opción B: Guardar universidad y CARGAR PLAN DE CARRERA (sobrescribe materias)
  const handleSaveAndImport = async () => {
    const provObj = ALL_PROVINCIAS.find((p) => p.id === selectedProvincia);
    const facultadObj = ALL_FACULTADES.find((f) => f.id === selectedFacultad);
    const careerObj = AVAILABLE_CAREERS.find((c) => c.id === selectedCareer);

    const facultadName =
      selectedFacultad === "OTRA_FACULTAD"
        ? customFacultad.trim()
        : facultadObj?.fullLabel || facultadObj?.label || selectedFacultad;

    const careerName =
      selectedCareer === "OTRA"
        ? customCareer.trim()
        : careerObj?.label || customCareer.trim() || selectedCareer;

    if (!selectedProvincia) {
      toast.error("Por favor, selecciona tu provincia.");
      return;
    }

    if (!facultadName) {
      toast.error("Por favor, selecciona o escribe tu universidad o instituto.");
      return;
    }

    if (!careerName) {
      toast.error("Por favor, selecciona o escribe el nombre de tu carrera.");
      return;
    }

    setSaving(true);
    try {
      localStorage.setItem(storageKey, "true");

      // Si la carrera elegida tiene un template oficial de materias y correlatividades
      if (careerObj?.file) {
        // Sobrescribir: limpiar materias previas si existían
        if (subjects.length > 0) {
          try {
            await deleteAllSubjects();
          } catch (delErr) {
            console.warn("Limpieza de materias previas:", delErr);
          }
        }

        // Cargar las materias y correlatividades oficiales del nuevo plan
        try {
          await importCareerPlan(careerObj.id, true);
        } catch (importErr) {
          console.error("Error al importar plan oficial:", importErr);
        }
      }

      // Actualizar perfil de usuario
      if (user && !isGuest) {
        const provLabel = provObj?.label || selectedProvincia;
        const fullFacultadWithProv = `${facultadName} (${provLabel})`;

        await supabase
          .from("profiles")
          .update({
            facultad: fullFacultadWithProv,
            carrera: careerName,
            academic_profile_completed: true,
            academic_onboarding_dismissed: true,
          } as any)
          .eq("user_id", user.id);
      }

      toast.success(
        careerObj?.file
          ? "🎓 ¡Plan de carrera cargado exitosamente!"
          : "🎓 ¡Perfil académico configurado correctamente!"
      );
      setIsOpen(false);
    } catch (err) {
      console.error("Error al guardar selección académica:", err);
      toast.error("Ocurrió un error al cargar tu plan.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingCheck || !isOpen) {
    return null;
  }

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Solo permitir cerrar si ya guardó universidad
            if (isUniversityValid) {
              handleSaveUniversityOnly();
            } else {
              toast.warning("Por favor elegí a qué universidad pertenecés para continuar.");
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-6 sm:p-7 space-y-4 max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px] font-medium border border-zinc-200/60 dark:border-zinc-700/60">
                <Sliders className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                Configuración Académica
              </span>
            </div>

            <DialogTitle className="font-semibold text-xl sm:text-2xl tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span>Tu Universidad y Plan de Estudio</span>
            </DialogTitle>

            <DialogDescription className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed">
              Indicanos a qué institución pertenecés. La carga de plan de materias es opcional; si ya tenés tus materias cargadas, podés omitir el plan y solo guardar tu universidad.
            </DialogDescription>
          </DialogHeader>

          {/* AVISO IMPORTANTE */}
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 p-3.5 sm:p-4 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs leading-relaxed">
              <p className="font-semibold text-amber-950 dark:text-amber-100 text-[13px]">
                ¿Ya tenés tus materias cargadas?
              </p>
              <p className="text-amber-800/90 dark:text-amber-300/90">
                Seleccioná tu universidad y tocá en <strong>"Guardar universidad (omitir materias)"</strong> para no sobrescribir nada. Solo hacé clic en <strong>"Cargar Plan de Carrera"</strong> si querés importar el plan oficial completo.
              </p>
            </div>
          </div>

          {/* Formulario en Cascada */}
          <div className="space-y-3.5 pt-1">
            {/* Paso 1: Dropdown de Provincia (Obligatorio) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-zinc-400" />
                <span>1. Provincia</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">*Requerido</span>
              </label>
              <Select value={selectedProvincia} onValueChange={handleProvinciaChange}>
                <SelectTrigger className="w-full h-11 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3.5 py-2 font-normal text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 transition-colors focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none">
                  <SelectValue placeholder="Seleccioná tu provincia..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl max-h-60 p-1.5 z-50 text-zinc-900 dark:text-zinc-100">
                  {ALL_PROVINCIAS.map((prov) => (
                    <SelectItem
                      key={prov.id}
                      value={prov.id}
                      className="font-medium text-xs sm:text-sm cursor-pointer py-2 px-3 rounded-lg text-zinc-700 dark:text-zinc-300 focus:bg-zinc-100 dark:focus:bg-zinc-800/80 focus:text-zinc-900 dark:focus:text-zinc-100 transition-colors"
                    >
                      {prov.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Paso 2: Dropdown de Universidad (Obligatorio) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-zinc-400" />
                <span>2. Universidad a la que pertenecés</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">*Requerido</span>
              </label>
              <Select
                value={selectedFacultad}
                onValueChange={handleFacultadChange}
                disabled={!selectedProvincia}
              >
                <SelectTrigger className="w-full h-11 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3.5 py-2 font-normal text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 transition-colors focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                  <SelectValue placeholder={selectedProvincia ? "Seleccioná tu universidad..." : "Seleccioná primero tu provincia"} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl max-h-60 p-1.5 z-50 text-zinc-900 dark:text-zinc-100">
                  {availableFacultades.map((fac) => (
                    <SelectItem
                      key={fac.id}
                      value={fac.id}
                      className="font-medium text-xs sm:text-sm cursor-pointer py-2 px-3 rounded-lg text-zinc-700 dark:text-zinc-300 focus:bg-zinc-100 dark:focus:bg-zinc-800/80 focus:text-zinc-900 dark:focus:text-zinc-100 transition-colors"
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{fac.fullLabel}</span>
                        {fac.hasOfficialTemplates && (
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold px-1.5 py-0.5 rounded shrink-0">
                            ⭐ Planes listos
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem
                    value="OTRA_FACULTAD"
                    className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-2 cursor-pointer py-2 px-3 rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-800/80 transition-colors"
                  >
                    ✏️ Otro (escribir mi universidad o instituto)
                  </SelectItem>
                </SelectContent>
              </Select>

              {selectedFacultad === "OTRA_FACULTAD" && (
                <Input
                  placeholder="Escribí el nombre exacto de tu universidad o instituto..."
                  value={customFacultad}
                  onChange={(e) => setCustomFacultad(e.target.value)}
                  className="h-10 mt-1.5 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none shadow-2xs"
                />
              )}
            </div>

            {/* Paso 3: Dropdown de Carrera (Opcional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-zinc-400" />
                  <span>3. Plan de Carrera</span>
                </label>
                <span className="text-[11px] font-normal text-zinc-400 dark:text-zinc-500">
                  (Opcional - podés omitirlo)
                </span>
              </div>

              {availableCareers.length > 0 ? (
                <div className="space-y-2">
                  <Select
                    value={selectedCareer}
                    onValueChange={setSelectedCareer}
                    disabled={!selectedFacultad}
                  >
                    <SelectTrigger className="w-full h-11 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3.5 py-2 font-normal text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 transition-colors focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                      <SelectValue placeholder="Seleccioná tu carrera si deseás cargar el plan..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl max-h-60 p-1.5 z-50 text-zinc-900 dark:text-zinc-100">
                      {availableCareers.map((car) => (
                        <SelectItem
                          key={car.id}
                          value={car.id}
                          className="font-medium text-xs sm:text-sm cursor-pointer py-2 px-3 rounded-lg text-zinc-700 dark:text-zinc-300 focus:bg-zinc-100 dark:focus:bg-zinc-800/80 focus:text-zinc-900 dark:focus:text-zinc-100 transition-colors"
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{car.label}</span>
                            {car.file && (
                              <span className="text-[10px] bg-blue-500/15 text-blue-700 dark:text-blue-400 font-medium px-1.5 py-0.5 rounded shrink-0">
                                Plan oficial listo
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem
                        value="OTRA"
                        className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-2 cursor-pointer py-2 px-3 rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-800/80 transition-colors"
                      >
                        ✏️ Otra carrera (escribir a mano)
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {selectedCareer === "OTRA" && (
                    <Input
                      placeholder="Escribí el nombre exacto de tu carrera..."
                      value={customCareer}
                      onChange={(e) => setCustomCareer(e.target.value)}
                      className="h-10 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none shadow-2xs"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Input
                    placeholder={
                      selectedFacultad
                        ? "Escribí tu carrera (opcional)..."
                        : "Seleccioná primero tu universidad"
                    }
                    value={customCareer}
                    onChange={(e) => setCustomCareer(e.target.value)}
                    disabled={!selectedFacultad}
                    className="h-11 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {selectedFacultad && (
                    <p className="text-[11px] text-zinc-400 px-1">
                      Esta institución aún no tiene materias pre-cargadas. Podés guardar tu universidad ahora y configurar tus materias manualmente o subirlas con IA.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Alternativa de Importación con IA */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                    ¿Tenés tu plan en PDF o foto?
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Extraé materias y correlativas automáticamente con IA.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowAiModal(true)}
                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-medium px-3 py-1.5 h-auto rounded-lg shadow-2xs shrink-0 transition-colors"
              >
                Subir con IA
              </Button>
            </div>
          </div>

          {/* Footer con los 2 botones claros */}
          <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 w-full border-t border-zinc-100 dark:border-zinc-800/80">
            {/* Botón 1: Guardar universidad (omitir materias) */}
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveUniversityOnly}
              disabled={saving || !isUniversityValid}
              className="w-full sm:w-auto text-xs sm:text-sm font-medium border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl py-2.5 px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Guardar universidad (omitir materias)</span>
            </Button>

            {/* Botón 2: Cargar Plan de Carrera */}
            <Button
              type="button"
              onClick={handleSaveAndImport}
              disabled={
                saving ||
                !isUniversityValid ||
                (!selectedCareer && !customCareer.trim())
              }
              className="w-full sm:w-auto px-5 py-2.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs sm:text-sm font-medium rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cargando plan...</span>
                </>
              ) : (
                <>
                  <span>Cargar Plan de Carrera</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal IA de subida de archivos si el usuario prefiere su propio PDF/Excel */}
      {showAiModal && (
        <AICareerImportModal
          open={showAiModal}
          onClose={() => setShowAiModal(false)}
          onImport={async (data) => {
            await importCustomCareerPlan(data);
            if (user && !isGuest) {
              const facName = data.facultad || selectedFacultad || "Universidad";
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
