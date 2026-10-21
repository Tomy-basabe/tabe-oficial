import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, CheckCircle2, Clock, X, Link2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Subject, SubjectWithStatus } from "@/hooks/useSubjects";
import { ComicAudio } from "@/components/comic/ComicAudio";

interface EditDependenciesModalProps {
  subject: SubjectWithStatus | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (subjectId: string, requiere_regular: string[], requiere_aprobada: string[]) => Promise<void>;
  allSubjects: Subject[];
}

export function EditDependenciesModal({ 
  subject, 
  open, 
  onClose, 
  onUpdate, 
  allSubjects 
}: EditDependenciesModalProps) {
  const [requiereRegular, setRequiereRegular] = useState<string[]>([]);
  const [requiereAprobada, setRequiereAprobada] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subject && open) {
      const regularIds = subject.dependencies
        .filter(d => d.requiere_regular)
        .map(d => d.requiere_regular as string);
      const aprobadaIds = subject.dependencies
        .filter(d => d.requiere_aprobada)
        .map(d => d.requiere_aprobada as string);
      
      setRequiereRegular(regularIds);
      setRequiereAprobada(aprobadaIds);
      setSearchQuery("");
    }
  }, [subject, open]);

  if (!subject) return null;

  // Filter subjects that can be dependencies (earlier years or same year with lower numero)
  const availableSubjects = allSubjects.filter(s => 
    s.id !== subject.id && 
    (s.año < subject.año || (s.año === subject.año && s.numero_materia < subject.numero_materia))
  );

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return availableSubjects;
    const q = searchQuery.toLowerCase().trim();
    return availableSubjects.filter(
      s => s.nombre.toLowerCase().includes(q) || s.codigo.toLowerCase().includes(q)
    );
  }, [availableSubjects, searchQuery]);

  const subjectsByYear = useMemo(() => {
    return [...new Set(filteredSubjects.map(s => s.año))]
      .sort((a, b) => a - b)
      .map(year => ({
        year,
        subjects: filteredSubjects.filter(s => s.año === year),
      }));
  }, [filteredSubjects]);

  const handleSave = async () => {
    setLoading(true);
    ComicAudio.playPowerUp();
    try {
      await onUpdate(subject.id, requiereRegular, requiereAprobada);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    ComicAudio.playPop();
    onClose();
  };

  const toggleRegular = (subjectId: string) => {
    ComicAudio.playPop();
    if (requiereRegular.includes(subjectId)) {
      setRequiereRegular(prev => prev.filter(id => id !== subjectId));
    } else {
      setRequiereRegular(prev => [...prev, subjectId]);
      setRequiereAprobada(prev => prev.filter(id => id !== subjectId));
    }
  };

  const toggleAprobada = (subjectId: string) => {
    ComicAudio.playPop();
    if (requiereAprobada.includes(subjectId)) {
      setRequiereAprobada(prev => prev.filter(id => id !== subjectId));
    } else {
      setRequiereAprobada(prev => [...prev, subjectId]);
      setRequiereRegular(prev => prev.filter(id => id !== subjectId));
    }
  };

  const removeDependency = (subjectId: string) => {
    ComicAudio.playPop();
    setRequiereRegular(prev => prev.filter(id => id !== subjectId));
    setRequiereAprobada(prev => prev.filter(id => id !== subjectId));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-xl bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-xl p-5 sm:p-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="space-y-1.5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80 text-left shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
              Año {subject.año}
            </span>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
              {subject.codigo}
            </span>
          </div>
          <DialogTitle className="font-semibold text-lg sm:text-xl tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-zinc-500" />
            Correlativas de {subject.nombre}
          </DialogTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Define qué materias previas se deben tener regularizadas o aprobadas para cursar.
          </p>
        </DialogHeader>

        {/* Search and Active Selection Header */}
        <div className="py-2.5 space-y-2.5 shrink-0">
          {availableSubjects.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar materia por nombre o código..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs"
              />
            </div>
          )}

          {/* Selected Dependencies Summary Chips */}
          {(requiereRegular.length > 0 || requiereAprobada.length > 0) && (
            <div className="p-2.5 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg space-y-1.5">
              <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                Correlativas seleccionadas ({requiereRegular.length + requiereAprobada.length}):
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {requiereRegular.map(id => {
                  const s = allSubjects.find(sub => sub.id === id);
                  return (
                    <span 
                      key={id} 
                      className="px-2 py-0.5 bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 rounded-md text-xs font-medium flex items-center gap-1.5"
                    >
                      <span className="font-mono">{s?.codigo || id}</span>
                      <span className="text-[10px] opacity-75">Regular</span>
                      <button 
                        type="button" 
                        onClick={() => removeDependency(id)}
                        className="hover:opacity-100 opacity-60 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
                {requiereAprobada.map(id => {
                  const s = allSubjects.find(sub => sub.id === id);
                  return (
                    <span 
                      key={id} 
                      className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-medium flex items-center gap-1.5"
                    >
                      <span className="font-mono">{s?.codigo || id}</span>
                      <span className="text-[10px] opacity-75">Aprobada</span>
                      <button 
                        type="button" 
                        onClick={() => removeDependency(id)}
                        className="hover:opacity-100 opacity-60 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable list of available subjects */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 py-1">
          {availableSubjects.length === 0 ? (
            <div className="text-center py-8 space-y-1.5">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <p className="font-medium text-xs text-zinc-900 dark:text-zinc-100">
                Sin materias previas
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                Esta es una materia de primer año/primer orden en el plan, por lo que no cuenta con materias previas para exigir.
              </p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No se encontraron materias con el término "{searchQuery}".
              </p>
            </div>
          ) : (
            subjectsByYear.map(({ year, subjects }) => (
              <div key={year} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                    Año {year}
                  </span>
                  <div className="h-px flex-1 bg-zinc-100 dark:border-zinc-800" />
                </div>

                <div className="space-y-1">
                  {subjects.map(s => {
                    const isRegular = requiereRegular.includes(s.id);
                    const isAprobada = requiereAprobada.includes(s.id);

                    return (
                      <div 
                        key={s.id}
                        className={cn(
                          "flex items-center justify-between gap-2 p-2 rounded-lg border transition-colors",
                          isAprobada 
                            ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30"
                            : isRegular
                            ? "bg-sky-500/5 dark:bg-sky-500/10 border-sky-500/30"
                            : "bg-white dark:bg-[#1e1e1e] border-zinc-200/70 dark:border-zinc-800/70 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
                              {s.codigo}
                            </span>
                            <span className="text-xs text-zinc-800 dark:text-zinc-200 truncate">
                              {s.nombre}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleRegular(s.id)}
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
                            onClick={() => toggleAprobada(s.id)}
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
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg px-3.5 py-2 text-xs font-medium transition-colors shadow-2xs disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar correlativas"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
