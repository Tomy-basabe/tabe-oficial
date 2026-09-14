import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings2, Sparkles, BookOpen, Hash, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubjectWithStatus } from "@/hooks/useSubjects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComicAudio } from "@/components/comic/ComicAudio";

interface EditSubjectModalProps {
  subject: SubjectWithStatus | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (subjectId: string, data: { nombre: string; codigo: string; año: number; numero_materia: number }) => Promise<void>;
}

export function EditSubjectModal({ subject, open, onClose, onSubmit }: EditSubjectModalProps) {
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [año, setAño] = useState(1);
  const [numeroMateria, setNumeroMateria] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subject && open) {
      setNombre(subject.nombre);
      setCodigo(subject.codigo);
      setAño(subject.año);
      setNumeroMateria(subject.numero_materia);
    }
  }, [subject, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !codigo || !subject) return;

    setLoading(true);
    ComicAudio.playPowerUp();
    try {
      await onSubmit(subject.id, {
        nombre: nombre.trim(),
        codigo: codigo.trim().toUpperCase(),
        año,
        numero_materia: numeroMateria,
      });
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    ComicAudio.playPop();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md bg-card border-4 border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl p-5 sm:p-6">
        <DialogHeader className="space-y-2 pb-3 border-b-2 border-border/80 text-left">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-[#FFE600] text-black font-black text-xs uppercase border-2 border-black shadow-[1.5px_1.5px_0_0_#000] -rotate-1">
              EDITAR MATERIA
            </span>
            {subject && (
              <span className="px-2 py-0.5 rounded-lg bg-secondary text-foreground font-black text-xs uppercase border-2 border-black shadow-[1.5px_1.5px_0_0_#000]">
                {subject.codigo}
              </span>
            )}
          </div>
          <DialogTitle className="font-black text-xl sm:text-2xl uppercase tracking-tight text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#00E5FF] text-black border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center shrink-0">
              <Settings2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            Información de la Materia
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-3.5">
            <div>
              <label className="font-black text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#FFE600]" /> Nombre de la Materia
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Análisis Matemático I"
                className="w-full mt-1.5 px-4 py-3 bg-secondary/50 rounded-xl border-3 border-black shadow-[3px_3px_0_0_#000] font-black text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-[#FFE600] transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-black text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" /> Código
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej: AM1"
                  maxLength={10}
                  className="w-full mt-1.5 px-4 py-3 bg-secondary/50 rounded-xl border-3 border-black shadow-[3px_3px_0_0_#000] font-black text-sm text-foreground uppercase placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-[#00E5FF] transition-all"
                  required
                />
              </div>

              <div>
                <label className="font-black text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#FF2E93]" /> N° Correlativo
                </label>
                <input
                  type="number"
                  value={numeroMateria}
                  onChange={(e) => setNumeroMateria(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full mt-1.5 px-4 py-3 bg-secondary/50 rounded-xl border-3 border-black shadow-[3px_3px_0_0_#000] font-black text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-[#FF2E93] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-black text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#48BD22]" /> Año en el Plan
              </label>
              <Select value={año.toString()} onValueChange={(val) => setAño(parseInt(val))}>
                <SelectTrigger className="w-full mt-1.5 px-4 py-3 bg-secondary/50 rounded-xl border-3 border-black shadow-[3px_3px_0_0_#000] font-black text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-[#48BD22] h-auto">
                  <SelectValue placeholder="Seleccione el año" />
                </SelectTrigger>
                <SelectContent className="bg-card border-3 border-black shadow-[5px_5px_0_0_#000] rounded-xl font-black">
                  {[1, 2, 3, 4, 5, 6].map(y => (
                    <SelectItem key={y} value={y.toString()} className="font-black uppercase text-xs cursor-pointer focus:bg-[#FFE600] focus:text-black">
                      Año {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t-2 border-border/80">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 rounded-xl font-black uppercase text-xs tracking-wider bg-secondary hover:bg-secondary/80 border-2 border-black shadow-[3px_3px_0_0_#000] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nombre.trim() || !codigo.trim() || loading}
              className={cn(
                "flex-1 py-3 rounded-xl font-black uppercase text-xs tracking-wider border-3 border-black transition-all",
                nombre.trim() && codigo.trim() && !loading
                  ? "bg-[#FFE600] text-black shadow-[4px_4px_0_0_#000] hover:bg-[#ffe033] active:translate-y-[1px]"
                  : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed border-muted"
              )}
            >
              {loading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
