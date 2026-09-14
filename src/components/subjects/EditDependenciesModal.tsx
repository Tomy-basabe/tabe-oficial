import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, CheckCircle2, Clock, X, Link2, Search, Sparkles } from "lucide-react";
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
      <DialogContent className="sm:max-w-xl bg-card border-4 border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl p-4 sm:p-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="space-y-2 pb-3 border-b-2 border-border/80 text-left shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-[#FFE600] text-black font-black text-xs uppercase border-2 border-black shadow-[1.5px_1.5px_0_0_#000] -rotate-1">
              Año {subject.año}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-secondary text-foreground font-black text-xs uppercase border-2 border-black shadow-[1.5px_1.5px_0_0_#000]">
              {subject.codigo}
            </span>
          </div>
          <DialogTitle className="font-black text-xl sm:text-2xl uppercase tracking-tight text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center shrink-0">
              <Link2 className="w-4 h-4 stroke-[3]" />
            </div>
            Correlativas de {subject.nombre}
          </DialogTitle>
          <p className="text-xs font-bold text-muted-foreground">
            Elige qué materias previas se deben tener regularizadas o aprobadas para cursar.
          </p>
        </DialogHeader>

        {/* Search and Active Selection Header */}
        <div className="py-2 space-y-3 shrink-0">
          {availableSubjects.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar materia por nombre o código..."
                className="w-full pl-9 pr-4 py-2.5 bg-secondary/50 rounded-xl border-3 border-black shadow-[2px_2px_0_0_#000] font-black text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-[#FFE600]"
              />
            </div>
          )}

          {/* Selected Dependencies Summary Chips */}
          {(requiereRegular.length > 0 || requiereAprobada.length > 0) && (
            <div className="p-3 bg-secondary/40 border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-[#FFE600] fill-[#FFE600]" />
                Correlativas Seleccionadas ({requiereRegular.length + requiereAprobada.length}):
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {requiereRegular.map(id => {
                  const s = allSubjects.find(sub => sub.id === id);
                  return (
                    <span 
                      key={id} 
                      className="px-2 py-0.5 bg-[#00E5FF] text-black border-2 border-black shadow-[1.5px_1.5px_0_0_#000] rounded-lg text-xs font-black flex items-center gap-1.5"
                    >
                      <span>{s?.codigo || id}</span>
                      <span className="text-[10px] bg-black text-white px-1 rounded">REGULAR</span>
                      <button 
                        type="button" 
                        onClick={() => removeDependency(id)}
                        className="hover:scale-110 active:scale-95 transition-transform"
                      >
                        <X className="w-3 h-3 stroke-[3]" />
                      </button>
                    </span>
                  );
                })}
                {requiereAprobada.map(id => {
                  const s = allSubjects.find(sub => sub.id === id);
                  return (
                    <span 
                      key={id} 
                      className="px-2 py-0.5 bg-[#FFE600] text-black border-2 border-black shadow-[1.5px_1.5px_0_0_#000] rounded-lg text-xs font-black flex items-center gap-1.5"
                    >
                      <span>{s?.codigo || id}</span>
                      <span className="text-[10px] bg-black text-white px-1 rounded">APROBADA</span>
                      <button 
                        type="button" 
                        onClick={() => removeDependency(id)}
                        className="hover:scale-110 active:scale-95 transition-transform"
                      >
                        <X className="w-3 h-3 stroke-[3]" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable list of available subjects */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-1">
          {availableSubjects.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-muted border-2 border-black flex items-center justify-center mx-auto text-muted-foreground">
                <BookOpen className="w-7 h-7" />
              </div>
              <p className="font-black text-sm uppercase text-foreground">
                Sin materias previas
              </p>
              <p className="text-xs font-bold text-muted-foreground max-w-xs mx-auto">
                Esta es una materia de primer año/primer correlativo, no tiene asignaturas previas para exigir.
              </p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-bold text-xs text-muted-foreground">
                No se encontraron materias con el término "{searchQuery}".
              </p>
            </div>
          ) : (
            subjectsByYear.map(({ year, subjects }) => (
              <div key={year} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground font-black text-[11px] uppercase border border-black shadow-[1px_1px_0_0_#000]">
                    Año {year}
                  </span>
                  <div className="h-0.5 flex-1 bg-border/80" />
                </div>

                <div className="space-y-2">
                  {subjects.map(s => {
                    const isRegular = requiereRegular.includes(s.id);
                    const isAprobada = requiereAprobada.includes(s.id);

                    return (
                      <div 
                        key={s.id}
                        className={cn(
                          "flex items-center justify-between gap-2 p-2.5 rounded-xl border-2 border-black transition-all",
                          isAprobada 
                            ? "bg-[#FFE600]/15 shadow-[3px_3px_0_0_#000]"
                            : isRegular
                            ? "bg-[#00E5FF]/15 shadow-[3px_3px_0_0_#000]"
                            : "bg-card shadow-[2px_2px_0_0_#000] hover:bg-secondary/40"
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase px-1 rounded bg-black text-white shrink-0">
                              {s.codigo}
                            </span>
                            <span className="text-xs font-black text-foreground truncate">
                              {s.nombre}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleRegular(s.id)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-black uppercase border-2 border-black transition-all flex items-center gap-1",
                              isRegular 
                                ? "bg-[#00E5FF] text-black shadow-[2px_2px_0_0_#000] active:translate-y-[1px]" 
                                : "bg-card hover:bg-secondary text-muted-foreground"
                            )}
                          >
                            <Clock className="w-3 h-3 stroke-[2.5]" />
                            Regular
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleAprobada(s.id)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-black uppercase border-2 border-black transition-all flex items-center gap-1",
                              isAprobada 
                                ? "bg-[#FFE600] text-black shadow-[2px_2px_0_0_#000] active:translate-y-[1px]" 
                                : "bg-card hover:bg-secondary text-muted-foreground"
                            )}
                          >
                            <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
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
        <div className="flex gap-2.5 pt-3 border-t-2 border-border/80 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl font-black uppercase text-xs tracking-wider bg-secondary hover:bg-secondary/80 border-2 border-black shadow-[3px_3px_0_0_#000] transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 rounded-xl font-black uppercase text-xs tracking-wider bg-[#FFE600] text-black hover:bg-[#ffe033] border-3 border-black shadow-[4px_4px_0_0_#000] active:translate-y-[1px] transition-all"
          >
            {loading ? "Guardando..." : "¡Guardar Correlativas!"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
