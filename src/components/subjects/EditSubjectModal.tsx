import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubjectWithStatus } from "@/hooks/useSubjects";

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
    try {
      await onSubmit(subject.id, {
        nombre,
        codigo: codigo.toUpperCase(),
        año,
        numero_materia: numeroMateria,
      });
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl gradient-text flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Editar Información M.
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nombre de la materia</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Análisis Matemático I"
                className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Código de Materia</label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej: AM1"
                  maxLength={10}
                  className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">N° Correlativo</label>
                <input
                  type="number"
                  value={numeroMateria}
                  onChange={(e) => setNumeroMateria(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
                <p className="text-[10px] text-muted-foreground mt-1">N° de materia universal en el plan</p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Año de Cursada</label>
                <select
                  value={año}
                  onChange={(e) => setAño(parseInt(e.target.value))}
                  className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {[1, 2, 3, 4, 5, 6].map(y => (
                    <option key={y} value={y}>Año {y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 rounded-xl font-medium bg-secondary hover:bg-secondary/80 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nombre || !codigo || loading}
              className={cn(
                "flex-1 py-3 rounded-xl font-medium transition-all",
                nombre && codigo
                  ? "bg-gradient-to-r from-neon-cyan to-neon-purple text-background hover:opacity-90"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
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
