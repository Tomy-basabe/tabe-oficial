import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Building2, BookOpen, Check, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubjects } from "@/hooks/useSubjects";
import { supabase } from "@/integrations/supabase/client";
import { AVAILABLE_FACULTADES, AVAILABLE_CAREERS } from "@/lib/careerData";
import { toast } from "sonner";
import { ComicBadge } from "@/components/comic/ComicBadge";

export function CareerPlanOnboardingModal() {
  const { user, isGuest } = useAuth();
  const { subjects, importCareerPlan } = useSubjects();

  const [isOpen, setIsOpen] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [saving, setSaving] = useState(false);

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-lg bg-card text-foreground border-4 border-foreground shadow-[10px_10px_0_0_hsl(var(--foreground))] rounded-3xl p-6 sm:p-8 space-y-6">
        <DialogHeader className="text-left space-y-2">
          <div className="flex items-center gap-2">
            <ComicBadge variant="yellow" size="sm">
              ✨ Paso Único
            </ComicBadge>
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Personalizá tu Experiencia
            </span>
          </div>
          <DialogTitle className="font-black text-2xl sm:text-3xl uppercase tracking-tight text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFE600] text-black border-3 border-foreground shadow-[3px_3px_0_0_#000] flex items-center justify-center shrink-0 -rotate-3">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span>Elegí tu Facultad y Carrera</span>
          </DialogTitle>
          <p className="text-xs sm:text-sm font-bold text-muted-foreground leading-relaxed">
            Configurá tu institución universitaria para adaptar automáticamente tus materias, herramientas de estudio y compañeros.
          </p>
        </DialogHeader>

        {/* Flujo en Cascada: Paso 1 y Paso 2 */}
        <div className="space-y-5">
          {/* Paso 1: Dropdown de Facultad / Universidad */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#00E5FF]" />
              <span>1. Facultad o Universidad</span>
            </label>
            <Select value={selectedFacultad} onValueChange={handleFacultadChange}>
              <SelectTrigger className="w-full h-12 bg-background border-3 border-foreground rounded-2xl font-bold text-xs sm:text-sm shadow-[2px_2px_0_0_hsl(var(--foreground))] focus:ring-0">
                <SelectValue placeholder="Seleccioná tu universidad o instituto..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-3 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))] max-h-60 z-50">
                {AVAILABLE_FACULTADES.map((fac) => (
                  <SelectItem key={fac.id} value={fac.id} className="font-bold text-xs sm:text-sm cursor-pointer py-2.5">
                    {fac.fullLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paso 2: Dropdown de Carrera (Habilitado según la facultad elegida) */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#BFFF00]" />
              <span>2. Carrera</span>
              {!selectedFacultad && (
                <span className="text-[10px] font-bold text-muted-foreground normal-case">
                  (Primero elegí una facultad)
                </span>
              )}
            </label>

            {availableCareers.length > 0 ? (
              <div className="space-y-3">
                <Select
                  value={selectedCareer}
                  onValueChange={setSelectedCareer}
                  disabled={!selectedFacultad}
                >
                  <SelectTrigger className="w-full h-12 bg-background border-3 border-foreground rounded-2xl font-bold text-xs sm:text-sm shadow-[2px_2px_0_0_hsl(var(--foreground))] focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed">
                    <SelectValue placeholder="Seleccioná tu carrera..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-3 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))] max-h-60 z-50">
                    {availableCareers.map((car) => (
                      <SelectItem key={car.id} value={car.id} className="font-bold text-xs sm:text-sm cursor-pointer py-2.5">
                        {car.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="OTRA" className="font-black text-xs sm:text-sm text-primary cursor-pointer py-2.5">
                      ✏️ Otra carrera (escribir a mano)
                    </SelectItem>
                  </SelectContent>
                </Select>

                {selectedCareer === "OTRA" && (
                  <Input
                    placeholder="Escribí el nombre de tu carrera..."
                    value={customCareer}
                    onChange={(e) => setCustomCareer(e.target.value)}
                    className="h-11 bg-background border-2 border-foreground rounded-xl font-bold text-xs sm:text-sm shadow-[2px_2px_0_0_hsl(var(--foreground))]"
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
                className="h-12 bg-background border-3 border-foreground rounded-2xl font-bold text-xs sm:text-sm shadow-[2px_2px_0_0_hsl(var(--foreground))] disabled:opacity-50 disabled:cursor-not-allowed"
              />
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 w-full border-t-2 border-foreground/15">
          {/* 3. Opción de Omitir */}
          <button
            type="button"
            onClick={handleDismiss}
            disabled={saving}
            className="text-xs font-black uppercase text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer py-2 px-1 transition-colors"
          >
            No encuentro mi facultad / Omitir
          </button>

          {/* Botón Guardar / Continuar */}
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !selectedFacultad || (!selectedCareer && !customCareer.trim())}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#BFFF00] hover:bg-[#a8e000] text-black font-black uppercase text-xs sm:text-sm rounded-2xl border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <span>Guardar y Continuar</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
