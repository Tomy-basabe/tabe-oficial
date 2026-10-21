import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, X, BookOpen, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Subject, CreateSubjectData } from "@/hooks/useSubjects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddSubjectModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSubjectData) => Promise<unknown>;
  existingSubjects: Subject[];
  years: number[];
}

export function AddSubjectModal({ open, onClose, onSubmit, existingSubjects, years }: AddSubjectModalProps) {
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [año, setAño] = useState(1);
  const [requiereRegular, setRequiereRegular] = useState<string[]>([]);
  const [requiereAprobada, setRequiereAprobada] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDependencies, setShowDependencies] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !codigo) return;

    setLoading(true);
    try {
      await onSubmit({
        nombre: nombre.trim(),
        codigo: codigo.trim().toUpperCase(),
        año,
        requiere_regular: requiereRegular,
        requiere_aprobada: requiereAprobada,
      });
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNombre("");
    setCodigo("");
    setAño(1);
    setRequiereRegular([]);
    setRequiereAprobada([]);
    setShowDependencies(false);
    onClose();
  };

  const toggleRegular = (subjectId: string) => {
    if (requiereRegular.includes(subjectId)) {
      setRequiereRegular(prev => prev.filter(id => id !== subjectId));
    } else {
      setRequiereRegular(prev => [...prev, subjectId]);
      // Remove from aprobada if it was there
      setRequiereAprobada(prev => prev.filter(id => id !== subjectId));
    }
  };

  const toggleAprobada = (subjectId: string) => {
    if (requiereAprobada.includes(subjectId)) {
      setRequiereAprobada(prev => prev.filter(id => id !== subjectId));
    } else {
      setRequiereAprobada(prev => [...prev, subjectId]);
      // Remove from regular if it was there
      setRequiereRegular(prev => prev.filter(id => id !== subjectId));
    }
  };

  const subjectsByYear = years
    .map(y => ({
      year: y,
      subjects: existingSubjects.filter(s => s.año === y),
    }))
    .filter(({ subjects }) => subjects.length > 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80 text-left">
          <DialogTitle className="font-semibold text-lg sm:text-xl tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-zinc-500" />
            Agregar nueva materia
          </DialogTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Crea una nueva asignatura en tu plan de carrera y define sus correlativas.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Basic Info */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                Nombre de la materia
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Análisis Matemático I"
                className="w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Código
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej: AM1"
                  maxLength={10}
                  className="w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 uppercase focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs transition-colors"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Año
                </label>
                <Select value={año.toString()} onValueChange={(val) => setAño(parseInt(val))}>
                  <SelectTrigger className="w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs h-auto">
                    <SelectValue placeholder="Seleccione el año" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg">
                    {Array.from(new Set([1, 2, 3, 4, 5, 6, ...years])).sort((a, b) => a - b).map(y => (
                      <SelectItem key={y} value={y.toString()} className="text-xs font-medium cursor-pointer">
                        Año {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dependencies Section */}
          {existingSubjects.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowDependencies(!showDependencies)}
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <BookOpen className="w-4 h-4 text-zinc-400" />
                {showDependencies ? "Ocultar correlativas" : "Configurar correlativas previas"}
              </button>

              {showDependencies && (
                <div className="mt-3 space-y-3 bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg p-3 max-h-[260px] overflow-y-auto">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Selecciona las materias necesarias para cursar esta asignatura:
                  </p>

                  {subjectsByYear.map(({ year, subjects }) => 
                    subjects.length > 0 && (
                      <div key={year} className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            Año {year}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {subjects.map(subject => {
                            const isRegular = requiereRegular.includes(subject.id);
                            const isAprobada = requiereAprobada.includes(subject.id);

                            return (
                              <div 
                                key={subject.id}
                                className="flex items-center justify-between p-2 bg-white dark:bg-[#1e1e1e] border border-zinc-200/70 dark:border-zinc-800/70 rounded-md gap-2"
                              >
                                <span className="text-xs text-zinc-800 dark:text-zinc-200 truncate">
                                  <span className="font-mono font-medium text-zinc-500 mr-1.5">{subject.codigo}</span>
                                  {subject.nombre}
                                </span>
                                <div className="flex gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleRegular(subject.id)}
                                    className={cn(
                                      "px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 border",
                                      isRegular 
                                        ? "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30" 
                                        : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:text-zinc-800"
                                    )}
                                  >
                                    <Clock className="w-2.5 h-2.5" />
                                    Regular
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleAprobada(subject.id)}
                                    className={cn(
                                      "px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 border",
                                      isAprobada 
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" 
                                        : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:text-zinc-800"
                                    )}
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    Aprobada
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  )}

                  {/* Selected dependencies summary */}
                  {(requiereRegular.length > 0 || requiereAprobada.length > 0) && (
                    <div className="p-2.5 bg-white dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-md space-y-1.5 mt-2">
                      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Correlativas seleccionadas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {requiereRegular.map(id => {
                          const subject = existingSubjects.find(s => s.id === id);
                          return (
                            <span 
                              key={id} 
                              className="px-2 py-0.5 bg-sky-500/10 text-sky-700 dark:text-sky-400 rounded text-[10px] font-medium flex items-center gap-1 border border-sky-500/20"
                            >
                              {subject?.codigo} Regular
                              <button type="button" onClick={() => toggleRegular(id)} className="hover:text-sky-900 dark:hover:text-sky-200 ml-0.5">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          );
                        })}
                        {requiereAprobada.map(id => {
                          const subject = existingSubjects.find(s => s.id === id);
                          return (
                            <span 
                              key={id} 
                              className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-medium flex items-center gap-1 border border-emerald-500/20"
                            >
                              {subject?.codigo} Aprobada
                              <button type="button" onClick={() => toggleAprobada(id)} className="hover:text-emerald-900 dark:hover:text-emerald-200 ml-0.5">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nombre || !codigo || loading}
              className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg px-3.5 py-2 text-xs font-medium transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creando..." : "Crear materia"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
