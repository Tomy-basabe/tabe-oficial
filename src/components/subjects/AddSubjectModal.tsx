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
        nombre,
        codigo: codigo.toUpperCase(),
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

  const subjectsByYear = years.map(y => ({
    year: y,
    subjects: existingSubjects.filter(s => s.año === y),
  }));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-xl bg-card border-[3px] border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black text-2xl uppercase tracking-widest text-foreground flex items-center gap-2">
            <Plus className="w-6 h-6 text-[#ffd21c] fill-[#ffd21c]" />
            Agregar Nueva Materia
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-black uppercase tracking-widest text-foreground">Nombre de la materia</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="EJ: ANÁLISIS MATEMÁTICO I"
                className="w-full mt-2 px-4 py-3 bg-background rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] focus:outline-none focus:translate-y-1 focus:shadow-none transition-all uppercase font-black"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-black uppercase tracking-widest text-foreground">Código</label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="EJ: AM1"
                  maxLength={10}
                  className="w-full mt-2 px-4 py-3 bg-background rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] focus:outline-none focus:translate-y-1 focus:shadow-none transition-all uppercase font-black"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-black uppercase tracking-widest text-foreground">Año</label>
                <Select value={año.toString()} onValueChange={(val) => setAño(parseInt(val))}>
                  <SelectTrigger className="w-full mt-2 px-4 py-3 bg-background rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] focus:outline-none focus:translate-y-1 focus:shadow-none transition-all h-auto uppercase font-black">
                    <SelectValue placeholder="SELECCIONE" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl font-black uppercase tracking-widest">
                    {years.length > 0 ? years.map(y => (
                      <SelectItem key={y} value={y.toString()} className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">AÑO {y}</SelectItem>
                    )) : [1, 2, 3, 4, 5, 6].map(y => (
                      <SelectItem key={y} value={y.toString()} className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">AÑO {y}</SelectItem>
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
                className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#1475e5] hover:underline"
              >
                <BookOpen className="w-5 h-5" />
                {showDependencies ? "OCULTAR CORRELATIVAS" : "AGREGAR CORRELATIVAS"}
              </button>

              {showDependencies && (
                <div className="mt-6 space-y-6 animate-fade-in bg-muted/30 border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))] p-4 max-h-[300px] overflow-y-auto">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Selecciona las materias necesarias para cursar esta materia
                  </p>

                  {subjectsByYear.map(({ year, subjects }) => 
                    subjects.length > 0 && (
                      <div key={year} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-foreground text-background font-black flex items-center justify-center text-xs">
                            {year}
                          </span>
                          <p className="text-xs font-black uppercase tracking-widest text-foreground">AÑO {year}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {subjects.map(subject => {
                            const isRegular = requiereRegular.includes(subject.id);
                            const isAprobada = requiereAprobada.includes(subject.id);

                            return (
                              <div 
                                key={subject.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-background border-[3px] border-foreground rounded-xl gap-3"
                              >
                                <span className="text-xs font-black uppercase tracking-widest">
                                  {subject.codigo} - {subject.nombre}
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleRegular(subject.id)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 border-2 border-foreground",
                                      isRegular 
                                        ? "bg-[#1475e5] text-white shadow-[2px_2px_0_0_#000] -translate-y-0.5" 
                                        : "bg-background text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    <Clock className="w-3 h-3" />
                                    Regular
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleAprobada(subject.id)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 border-2 border-foreground",
                                      isAprobada 
                                        ? "bg-[#ffd21c] text-black shadow-[2px_2px_0_0_#000] -translate-y-0.5" 
                                        : "bg-background text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
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
                    <div className="p-4 bg-background border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl space-y-3 mt-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground">CORRELATIVAS SELECCIONADAS:</p>
                      <div className="flex flex-wrap gap-2">
                        {requiereRegular.map(id => {
                          const subject = existingSubjects.find(s => s.id === id);
                          return (
                            <span 
                              key={id} 
                              className="px-2 py-1 bg-[#1475e5] text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border-2 border-foreground"
                            >
                              {subject?.codigo} Regular
                              <button type="button" onClick={() => toggleRegular(id)} className="hover:bg-black/20 rounded p-0.5 ml-1">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                        {requiereAprobada.map(id => {
                          const subject = existingSubjects.find(s => s.id === id);
                          return (
                            <span 
                              key={id} 
                              className="px-2 py-1 bg-[#ffd21c] text-black rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border-2 border-foreground"
                            >
                              {subject?.codigo} Aprobada
                              <button type="button" onClick={() => toggleAprobada(id)} className="hover:bg-black/20 rounded p-0.5 ml-1">
                                <X className="w-3 h-3" />
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
          <div className="flex gap-4 pt-4 border-t-[3px] border-foreground/20">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3.5 rounded-xl font-black uppercase tracking-widest transition-all bg-background border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-1 hover:shadow-none text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nombre || !codigo || loading}
              className={cn(
                "flex-1 py-3.5 rounded-xl font-black uppercase tracking-widest transition-all border-[3px] border-foreground",
                nombre && codigo && !loading
                  ? "bg-[#ffd21c] text-black shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-1 hover:shadow-none"
                  : "bg-muted text-muted-foreground opacity-70 cursor-not-allowed shadow-none translate-y-1"
              )}
            >
              {loading ? "CREANDO..." : "CREAR MATERIA"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
