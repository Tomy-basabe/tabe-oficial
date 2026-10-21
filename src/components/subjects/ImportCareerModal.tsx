import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, Info, FileUp, Check } from "lucide-react";
import { AVAILABLE_FACULTADES, AVAILABLE_CAREERS } from "@/lib/careerData";
import { cn } from "@/lib/utils";

interface ImportCareerModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (careerId: string) => Promise<void>;
  onOpenAiImport?: () => void;
}

export const ImportCareerModal = ({ open, onClose, onImport, onOpenAiImport }: ImportCareerModalProps) => {
  const [selectedFacultad, setSelectedFacultad] = useState<string>("UTN");
  const [selectedCareer, setSelectedCareer] = useState<string>("sistemas");
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    setLoading(true);
    try {
      await onImport(selectedCareer);
      onClose();
    } catch (error) {
      console.error("Error in modal import:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && !v && onClose()}>
      <DialogContent 
        className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl w-full max-w-4xl w-[94vw] h-[85vh] max-h-[760px] flex flex-col p-0 overflow-hidden"
      >
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <BookOpen className="h-4 w-4 text-zinc-500" />
                Importar plan de estudios
              </DialogTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Selecciona tu universidad y carrera para cargar el plan con correlatividades oficiales precargadas.
              </p>
            </div>
          </div>

          {onOpenAiImport && (
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0">
                  <FileUp className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                    ¿Tienes tu plan en PDF, Excel o foto?
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Importa y extrae automáticamente todas las asignaturas y correlatividades desde tu archivo.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenAiImport();
                }}
                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-medium px-3 py-1.5 h-auto rounded-lg shadow-2xs shrink-0 transition-colors"
              >
                <FileUp className="w-3.5 h-3.5 mr-1.5" />
                Subir Archivo
              </Button>
            </div>
          )}
        </DialogHeader>

        {/* Body: Split View */}
        <div className="flex flex-1 min-h-0 overflow-hidden bg-white dark:bg-[#212121]">
          {/* Left: Universities list */}
          <div className="w-48 sm:w-56 shrink-0 border-r border-zinc-100 dark:border-zinc-800/80 flex flex-col bg-zinc-50/50 dark:bg-zinc-900/30 overflow-y-auto p-2 space-y-0.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 px-2 py-1">
              Universidad
            </p>
            {AVAILABLE_FACULTADES.map(f => {
              const count = AVAILABLE_CAREERS.filter(c => c.facultad === f.id).length;
              const isSelected = selectedFacultad === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedFacultad(f.id);
                    const first = AVAILABLE_CAREERS.find(c => c.facultad === f.id);
                    if (first) setSelectedCareer(first.id);
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between border",
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium border-transparent shadow-2xs"
                      : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
                  )}
                >
                  <span className="truncate pr-1">{f.label}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0",
                    isSelected ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900" : "text-zinc-400"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Career cards list */}
          <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-5 overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {AVAILABLE_FACULTADES.find(f => f.id === selectedFacultad)?.fullLabel}
              </span>
              <span className="text-[11px] text-zinc-500">
                {AVAILABLE_CAREERS.filter(c => c.facultad === selectedFacultad).length} carreras
              </span>
            </div>

            {/* Scrollable Grid of Careers */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_CAREERS.filter(c => c.facultad === selectedFacultad).map(c => {
                  const isSelected = selectedCareer === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCareer(c.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-colors flex items-start justify-between gap-2.5",
                        isSelected
                          ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100/70 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1e1e1e] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200"
                      )}
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                          {c.label}
                        </p>
                        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                          Plan Oficial
                        </span>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 text-center sm:text-left">
            <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>Se importarán las materias con códigos y correlativas al plan actual.</span>
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs font-medium px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 h-auto rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-medium px-4 py-2 h-auto rounded-lg shadow-2xs transition-colors"
              onClick={handleImport}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Importando...</>
              ) : (
                <><BookOpen className="h-3.5 w-3.5 mr-1.5" /> Importar carrera seleccionada</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
