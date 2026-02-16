import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubjectWithStatus, SubjectStatus, PartialGrades } from "@/hooks/useSubjects";
import { CheckCircle2, Clock, BookOpen, Lock, RotateCcw, Trophy, Star, Link2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PartialGradesSection } from "./PartialGradesSection";

interface SubjectStatusModalProps {
  subject: SubjectWithStatus | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (subjectId: string, status: SubjectStatus, nota?: number) => Promise<void>;
  onUpdatePartialGrades?: (subjectId: string, grades: PartialGrades) => Promise<void>;
  onEditDependencies?: (subject: SubjectWithStatus) => void;
  onDelete?: (subjectId: string) => Promise<void>;
}

const statusOptions: { value: SubjectStatus; label: string; icon: any; color: string; description: string }[] = [
  {
    value: "aprobada",
    label: "Aprobada",
    icon: Trophy,
    color: "text-neon-gold bg-neon-gold/20 border-neon-gold",
    description: "¡Materia completada con éxito!"
  },
  {
    value: "regular",
    label: "Regular",
    icon: Clock,
    color: "text-neon-cyan bg-neon-cyan/20 border-neon-cyan",
    description: "Cursada aprobada, falta final"
  },
  {
    value: "cursable",
    label: "Cursable",
    icon: BookOpen,
    color: "text-neon-green bg-neon-green/20 border-neon-green",
    description: "Lista para cursar"
  },
  {
    value: "recursar",
    label: "Recursar",
    icon: RotateCcw,
    color: "text-neon-red bg-neon-red/20 border-neon-red",
    description: "Necesitas volver a cursar"
  },
];

export function SubjectStatusModal({
  subject,
  open,
  onClose,
  onUpdate,
  onUpdatePartialGrades,
  onEditDependencies,
  onDelete
}: SubjectStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<SubjectStatus | null>(null);
  const [nota, setNota] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset state when subject changes
  const subjectId = subject?.id;
  const currentPartialGrades = subject?.partialGrades || {};

  if (!subject) return null;

  const handleStatusSelect = (status: SubjectStatus) => {
    setSelectedStatus(status);
    if (status !== "aprobada") {
      setNota("");
    }
  };

  const handleSave = async () => {
    if (!selectedStatus) return;

    setLoading(true);
    try {
      const notaValue = selectedStatus === "aprobada" && nota ? parseFloat(nota) : undefined;
      await onUpdate(subject.id, selectedStatus, notaValue);
      onClose();
      setSelectedStatus(null);
      setNota("");
    } finally {
      setLoading(false);
    }
  };

  const handlePartialGradesUpdate = async (newGrades: PartialGrades) => {
    if (!onUpdatePartialGrades) return;
    setLoading(true);
    try {
      await onUpdatePartialGrades(subject.id, newGrades);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setLoading(true);
    try {
      await onDelete(subject.id);
      onClose();
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const isBlocked = subject.status === "bloqueada";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl gradient-text">
            {subject.nombre}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{subject.codigo} • Año {subject.año}</p>
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="py-6 space-y-4">
            <p className="text-center text-foreground">
              ¿Estás seguro de que quieres eliminar esta materia?
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl font-medium bg-secondary hover:bg-secondary/80 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-3 rounded-xl font-medium bg-neon-red text-background hover:opacity-90 transition-all"
              >
                {loading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        ) : isBlocked ? (
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
            <p className="text-center text-muted-foreground mb-4">
              Esta materia está bloqueada. Necesitas:
            </p>
            <div className="space-y-2 mb-4">
              {subject.requisitos_faltantes.map((req, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-neon-red" />
                  <span className="text-sm">{req}</span>
                </div>
              ))}
            </div>

            {/* Actions for blocked subjects */}
            <div className="flex gap-2">
              {onEditDependencies && (
                <button
                  onClick={() => onEditDependencies(subject)}
                  className="flex-1 py-2 rounded-xl font-medium bg-secondary hover:bg-secondary/80 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  Editar correlativas
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-2 px-4 rounded-xl font-medium bg-neon-red/10 text-neon-red hover:bg-neon-red/20 transition-all text-sm flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* Prerequisites Section (Correlativas) */}
            {subject.dependencyInfo && subject.dependencyInfo.length > 0 && (
              <div className="text-xs space-y-2 p-3 bg-muted/50 rounded-xl border border-border/50 animate-fade-in">
                <h4 className="font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Link2 className="w-3.5 h-3.5" />
                  Correlativas
                </h4>
                <div className="grid gap-2">
                  {/* Cursada (Regular) */}
                  {subject.dependencyInfo.some(d => d.type === 'regular') && (
                    <div>
                      <span className="text-muted-foreground font-medium block mb-1">Para cursar (Regular):</span>
                      <div className="flex flex-wrap gap-1">
                        {subject.dependencyInfo.filter(d => d.type === 'regular').map(d => (
                          <span key={d.id} className="px-2 py-0.5 bg-background rounded border border-border text-[10px] whitespace-nowrap shadow-sm">
                            #{d.numero_materia} {d.nombre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Final (Aprobada) */}
                  {subject.dependencyInfo.some(d => d.type === 'aprobada') && (
                    <div>
                      <span className="text-muted-foreground font-medium block mb-1">Para rendir (Aprobada):</span>
                      <div className="flex flex-wrap gap-1">
                        {subject.dependencyInfo.filter(d => d.type === 'aprobada').map(d => (
                          <span key={d.id} className="px-2 py-0.5 bg-background rounded border border-border text-[10px] whitespace-nowrap shadow-sm">
                            #{d.numero_materia} {d.nombre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Partial Grades Section */}
            {onUpdatePartialGrades && (
              <PartialGradesSection
                key={subjectId}
                grades={currentPartialGrades}
                onUpdate={handlePartialGradesUpdate}
                disabled={loading}
              />
            )}

            {/* Current Status */}
            {subject.nota && (
              <div className="flex items-center justify-center gap-2 p-3 bg-neon-gold/10 rounded-xl border border-neon-gold/30">
                <Star className="w-5 h-5 text-neon-gold" />
                <span className="text-neon-gold font-medium">Nota final materia: {subject.nota}</span>
              </div>
            )}

            {/* Status Options */}
            <div className="grid grid-cols-2 gap-3">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedStatus === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => handleStatusSelect(option.value)}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? option.color
                        : "border-border bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    <Icon className={cn("w-6 h-6 mb-2", isSelected ? "" : "text-muted-foreground")} />
                    <p className={cn("font-medium text-sm", isSelected ? "" : "text-foreground")}>
                      {option.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Nota Input for Aprobada */}
            {selectedStatus === "aprobada" && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-sm font-medium">Nota obtenida</label>
                <input
                  type="number"
                  min="4"
                  max="10"
                  step="0.5"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: 8"
                  className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-neon-gold/50"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {onEditDependencies && (
                <button
                  onClick={() => onEditDependencies(subject)}
                  className="py-3 px-4 rounded-xl font-medium bg-secondary hover:bg-secondary/80 transition-all text-sm flex items-center gap-2"
                >
                  <Link2 className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-3 px-4 rounded-xl font-medium bg-neon-red/10 text-neon-red hover:bg-neon-red/20 transition-all text-sm flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!selectedStatus || loading}
                className={cn(
                  "flex-1 py-3 rounded-xl font-medium transition-all",
                  selectedStatus
                    ? "bg-gradient-to-r from-neon-cyan to-neon-purple text-background hover:opacity-90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
