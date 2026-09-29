import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, GraduationCap, ArrowRight, X, FileSpreadsheet, FileText, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubjects } from "@/hooks/useSubjects";
import { AICareerImportModal } from "@/components/subjects/AICareerImportModal";

export function CareerPlanOnboardingModal() {
  const { user, isGuest } = useAuth();
  const { subjects, loading, importCustomCareerPlan } = useSubjects();
  const [openWelcome, setOpenWelcome] = useState(false);
  const [openAiModal, setOpenAiModal] = useState(false);

  const storageKey = user ? `tabe_career_onboarding_dismissed_${user.id}` : "tabe_career_onboarding_dismissed_guest";

  useEffect(() => {
    // Only show if user is loaded, not in loading state, has 0 subjects, and hasn't dismissed before
    if (!loading && subjects.length === 0) {
      const dismissed = localStorage.getItem(storageKey);
      if (!dismissed) {
        // Short delay so page mounts cleanly before opening modal
        const timer = setTimeout(() => {
          setOpenWelcome(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, subjects.length, storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true");
    setOpenWelcome(false);
  };

  const handleOpenAiUploader = () => {
    localStorage.setItem(storageKey, "true");
    setOpenWelcome(false);
    setOpenAiModal(true);
  };

  return (
    <>
      <Dialog open={openWelcome} onOpenChange={(v) => !v && handleDismiss()}>
        <DialogContent className="sm:max-w-md bg-card border-[3px] border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl p-6 space-y-5">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#FFE600] text-black font-black text-[10px] uppercase border-2 border-foreground shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))] -rotate-1">
                ¡BIENVENIDO!
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Primeros pasos
              </span>
            </div>
            <DialogTitle className="font-black text-xl sm:text-2xl uppercase tracking-tight text-foreground flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#ffd21c] text-black border-2 border-foreground shadow-[2px_2px_0_0_#000] flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              Configurá tu Plan de Carrera
            </DialogTitle>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide leading-relaxed">
              ¿Tenés el plan de estudios de tu carrera en una planilla de Excel, PDF o foto del programa?
            </p>
          </DialogHeader>

          {/* Value Prop Banner */}
          <div className="p-4 bg-muted/40 border-[2px] border-foreground rounded-xl space-y-3 shadow-[3px_3px_0_0_hsl(var(--foreground))]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#ffd21c] fill-[#ffd21c] shrink-0" />
              <p className="text-xs font-black uppercase text-foreground">
                Carga Automática con IA
              </p>
            </div>
            <p className="text-xs font-medium text-foreground/90 leading-relaxed">
              Subí uno o varios archivos y nuestra Inteligencia Artificial detectará todas tus materias, los años de cursado y las correlatividades en segundos.
            </p>
            <div className="flex items-center gap-3 pt-1 text-[11px] font-black uppercase text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#25d06c]" /> Excel
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#ff4e4e]" /> PDF
              </span>
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-[#1475e5]" /> Fotos
              </span>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 sm:justify-between items-center w-full">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDismiss}
              className="w-full sm:w-auto text-xs font-black uppercase text-muted-foreground hover:text-foreground"
            >
              Omitir por ahora
            </Button>
            <Button
              type="button"
              onClick={handleOpenAiUploader}
              className="w-full sm:w-auto bg-[#25d06c] hover:bg-[#25d06c]/90 text-black border-[2px] border-foreground shadow-[3px_3px_0_0_#000] text-xs font-black uppercase transition-all hover:-translate-y-0.5"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 fill-black" />
              Cargar Plan con IA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Career Import Modal */}
      <AICareerImportModal
        open={openAiModal}
        onClose={() => setOpenAiModal(false)}
        onImport={importCustomCareerPlan}
        existingSubjectsCount={subjects.length}
      />
    </>
  );
}
