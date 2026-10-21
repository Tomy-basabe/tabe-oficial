import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Building2, BookOpen, ArrowRight, Loader2, Sparkles, FileUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubjects } from "@/hooks/useSubjects";
import { supabase } from "@/integrations/supabase/client";
import { AVAILABLE_FACULTADES, AVAILABLE_CAREERS } from "@/lib/careerData";
import { toast } from "sonner";
import { AICareerImportModal } from "@/components/subjects/AICareerImportModal";

export function CareerPlanOnboardingModal() {
  const { user, isGuest } = useAuth();
  const { subjects, importCareerPlan, importCustomCareerPlan } = useSubjects();

  const [isOpen, setIsOpen] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Estados de selección en cascada
  const [selectedFacultad, setSelectedFacultad] = useState<string>("");
  const [selectedCareer, setSelectedCareer] = useState<string>("");
  const [customCareer, setCustomCareer] = useState<string>("");

  const storageKey = user
    ? `tabe_academic_onboarding_dismissed_${user.id}`
    : "tabe_academic_onboarding_dismissed_guest";

  // 1. Condición de visualización: verificar si ya completó u omitió en DB/perfil o localStorage
  useEffect(() => {
    let isMounted = true;

    const checkAcademicStatus = async () => {
      // Si ya está marcado en localStorage, no mostrar nunca
      if (localStorage.getItem(storageKey) === "true") {
        if (isMounted) setLoadingCheck(false);
        return;
      }

      // Si es invitado, verificar sólo localStorage
      if (isGuest || !user) {
        if (isMounted) {
          setLoadingCheck(false);
          // Si el invitado no lo omitió, mostrarlo tras un breve delay
          if (!localStorage.getItem(storageKey)) {
            setTimeout(() => {
              if (isMounted) setIsOpen(true);
            }, 800);
          }
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("carrera, facultad, academic_profile_completed, academic_onboarding_dismissed")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("No se pudo verificar el perfil académico:", error.message);
        }

        const profileData = data as any;
        const isCompleted =
          profileData?.academic_profile_completed === true ||
          profileData?.academic_onboarding_dismissed === true ||
          (profileData?.carrera && profileData.carrera.trim() !== "");

        if (isCompleted) {
          // Persistir en localStorage para evitar consultas futuras y no mostrarlo nunca más
          localStorage.setItem(storageKey, "true");
          if (isMounted) setIsOpen(false);
        } else {
          // Usuario nuevo sin facultad/carrera: mostrar modal una única vez
          setTimeout(() => {
            if (isMounted) setIsOpen(true);
          }, 800);
        }
      } catch (err) {
        console.error("Error al verificar perfil académico:", err);
      } finally {
        if (isMounted) setLoadingCheck(false);
      }
    };

    checkAcademicStatus();

    return () => {
      isMounted = false;
    };
  }, [user, isGuest, storageKey]);

  // Carreras disponibles para la facultad seleccionada (Paso 2)
  const availableCareers = useMemo(() => {
    if (!selectedFacultad) return [];
    return AVAILABLE_CAREERS.filter((c) => c.facultad === selectedFacultad);
  }, [selectedFacultad]);

  // Reiniciar carrera si cambia la facultad
  const handleFacultadChange = (facultadId: string) => {
    setSelectedFacultad(facultadId);
    setSelectedCareer("");
    setCustomCareer("");
  };

  // 3. Opción de omitir: persiste en DB y localStorage, cierra y no vuelve a preguntar
  const handleDismiss = async () => {
    localStorage.setItem(storageKey, "true");
    setIsOpen(false);

    if (user && !isGuest) {
      try {
        await supabase
          .from("profiles")
          .update({
            academic_onboarding_dismissed: true,
          } as any)
          .eq("user_id", user.id);
      } catch (e) {
        console.error("Error guardando omisión académica:", e);
      }
    }
  };

  // 2. Guardar y Continuar: persiste facultad y carrera en profiles
  const handleSave = async () => {
    const facultadObj = AVAILABLE_FACULTADES.find((f) => f.id === selectedFacultad);
    const careerObj = AVAILABLE_CAREERS.find((c) => c.id === selectedCareer);

    const facultadName = facultadObj?.fullLabel || facultadObj?.label || selectedFacultad;
    const careerName = selectedCareer === "OTRA" ? customCareer.trim() : (careerObj?.label || selectedCareer);

    if (!selectedFacultad) {
      toast.error("Por favor, selecciona una facultad o universidad.");
      return;
    }

    if (!careerName) {
      toast.error("Por favor, selecciona o escribe el nombre de tu carrera.");
      return;
    }

    setSaving(true);
    try {
      localStorage.setItem(storageKey, "true");

      if (user && !isGuest) {
        const { error } = await supabase
          .from("profiles")
          .update({
            facultad: facultadName,
            carrera: careerName,
            academic_profile_completed: true,
            academic_onboarding_dismissed: true,
          } as any)
          .eq("user_id", user.id);

        if (error) {
          console.error("Error al actualizar perfil:", error);
        }

        // Si la carrera elegida tiene template oficial y el usuario no tiene materias aún, importarla automáticamente
        if (careerObj?.file && subjects.length === 0) {
          try {
            await importCareerPlan(careerObj.file);
          } catch (importErr) {
            console.warn("No se pudo autoimportar el plan de estudios:", importErr);
          }
        }
      }

      toast.success("🎓 ¡Perfil académico configurado exitosamente!");
      setIsOpen(false);
    } catch (err) {
      console.error("Error al guardar selección académica:", err);
      toast.error("Ocurrió un error al guardar tu perfil académico.");
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
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
          {/* Header Estilo Notion / ChatGPT */}
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px] font-medium border border-zinc-200/60 dark:border-zinc-700/60">
                <Sparkles className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                Configuración inicial
              </span>
            </div>

            <DialogTitle className="font-semibold text-xl sm:text-2xl tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span>Elegí tu Facultad y Carrera</span>
            </DialogTitle>

            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed">
              Configurá tu institución universitaria para adaptar automáticamente tus materias, correlatividades oficiales y herramientas de estudio.
            </p>
          </DialogHeader>

          {/* Formulario en Cascada */}
          <div className="space-y-4 pt-1">
            {/* Paso 1: Dropdown de Facultad / Universidad */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-zinc-400" />
                <span>1. Facultad o Universidad</span>
              </label>
              <Select value={selectedFacultad} onValueChange={handleFacultadChange}>
                <SelectTrigger className="w-full h-11 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3.5 py-2 font-normal text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 transition-colors focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none">
                  <SelectValue placeholder="Seleccioná tu universidad o instituto..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl max-h-60 p-1.5 z-50 text-zinc-900 dark:text-zinc-100">
                  {AVAILABLE_FACULTADES.map((fac) => (
                    <SelectItem
                      key={fac.id}
                      value={fac.id}
                      className="font-medium text-xs sm:text-sm cursor-pointer py-2 px-3 rounded-lg text-zinc-700 dark:text-zinc-300 focus:bg-zinc-100 dark:focus:bg-zinc-800/80 focus:text-zinc-900 dark:focus:text-zinc-100 transition-colors"
                    >
                      {fac.fullLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Paso 2: Dropdown de Carrera */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-zinc-400" />
                <span>2. Carrera</span>
                {!selectedFacultad && (
                  <span className="text-[11px] font-normal text-zinc-400">
                    (Primero seleccioná una facultad)
                  </span>
                )}
              </label>

              {availableCareers.length > 0 ? (
                <div className="space-y-2.5">
                  <Select
                    value={selectedCareer}
                    onValueChange={setSelectedCareer}
                    disabled={!selectedFacultad}
                  >
                    <SelectTrigger className="w-full h-11 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3.5 py-2 font-normal text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 transition-colors focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                      <SelectValue placeholder="Seleccioná tu carrera..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl max-h-60 p-1.5 z-50 text-zinc-900 dark:text-zinc-100">
                      {availableCareers.map((car) => (
                        <SelectItem
                          key={car.id}
                          value={car.id}
                          className="font-medium text-xs sm:text-sm cursor-pointer py-2 px-3 rounded-lg text-zinc-700 dark:text-zinc-300 focus:bg-zinc-100 dark:focus:bg-zinc-800/80 focus:text-zinc-900 dark:focus:text-zinc-100 transition-colors"
                        >
                          {car.label}
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
                      placeholder="Escribí el nombre de tu carrera..."
                      value={customCareer}
                      onChange={(e) => setCustomCareer(e.target.value)}
                      className="h-10 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none shadow-2xs"
                    />
                  )}
                </div>
              ) : (
                <Input
                  placeholder={
                    selectedFacultad
                      ? "Escribí el nombre de tu carrera..."
                      : "Seleccioná primero una facultad"
                  }
                  value={customCareer}
                  onChange={(e) => setCustomCareer(e.target.value)}
                  disabled={!selectedFacultad}
                  className="h-11 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:outline-none shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                />
              )}
            </div>

            {/* Alternativa de Importación Asistida con IA */}
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

          <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 w-full border-t border-zinc-100 dark:border-zinc-800/80">
            {/* Opción de Omitir */}
            <button
              type="button"
              onClick={handleDismiss}
              disabled={saving}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors py-2 px-2.5 rounded-lg hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 cursor-pointer"
            >
              No encuentro mi facultad / Omitir por ahora
            </button>

            {/* Botón Guardar / Continuar */}
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !selectedFacultad || (!selectedCareer && !customCareer.trim())}
              className="w-full sm:w-auto px-5 py-2.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs sm:text-sm font-medium rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Guardar y Continuar</span>
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
            setShowAiModal(false);
            setIsOpen(false);
            toast.success("🎓 ¡Plan de estudios importado exitosamente con IA!");
          }}
          existingSubjectsCount={subjects.length}
        />
      )}
    </>
  );
}
