import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings2, BookOpen, Hash, Calendar } from "lucide-react";
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
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-xl p-5 sm:p-6">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
              Editar detalles
            </span>
            {subject && (
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                {subject.codigo}
              </span>
            )}
          </div>
          <DialogTitle className="font-semibold text-lg sm:text-xl tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-zinc-500" />
            Información de la materia
          </DialogTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Modifica el nombre oficial, código o ubicación de la asignatura en el plan.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-zinc-400" /> Nombre de la materia
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
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej: AM1"
                  maxLength={10}
                  className="w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 uppercase placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs transition-colors"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 mb-1">
                  <Hash className="w-3.5 h-3.5 text-zinc-400" /> N° de orden
                </label>
                <input
                  type="number"
                  value={numeroMateria}
                  onChange={(e) => setNumeroMateria(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Año en el plan
              </label>
              <Select value={año.toString()} onValueChange={(val) => setAño(parseInt(val))}>
                <SelectTrigger className="w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs h-auto">
                  <SelectValue placeholder="Seleccione el año" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg">
                  {[1, 2, 3, 4, 5, 6].map(y => (
                    <SelectItem key={y} value={y.toString()} className="text-xs font-medium cursor-pointer">
                      Año {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
              disabled={!nombre.trim() || !codigo.trim() || loading}
              className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg px-3.5 py-2 text-xs font-medium transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
