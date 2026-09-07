import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubjectWithStatus, SubjectStatus, PartialGrades } from "@/hooks/useSubjects";
import { CheckCircle2, Clock, BookOpen, Lock, RotateCcw, Trophy, Star, Link2, Trash2, Settings2, Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PartialGradesSection } from "./PartialGradesSection";
import { ComicAudio } from "@/components/comic/ComicAudio";

interface SubjectStatusModalProps {
  subject: SubjectWithStatus | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: (subjectId: string, status: SubjectStatus, nota?: number) => Promise<void>;
  onStatusChange?: (subjectId: string, status: SubjectStatus, nota?: number) => Promise<void>;
  onUpdatePartialGrades?: (subjectId: string, grades: PartialGrades) => Promise<void>;
  onGradesChange?: (subjectId: string, grades: PartialGrades) => Promise<void>;
  onEditDependencies?: (subject: SubjectWithStatus) => void;
  onEditDetails?: (subject: SubjectWithStatus) => void;
  onDelete?: (subjectId: string) => Promise<void>;
  readOnly?: boolean;
}

const statusOptions: { 
  value: SubjectStatus; 
  label: string; 
  icon: any; 
  badge: string;
  activeColor: string; 
  description: string;
}[] = [
  {
    value: "aprobada",
    label: "Aprobada",
    icon: Trophy,
    badge: "100%",
    activeColor: "bg-[#FFE600] text-black border-black shadow-[4px_4px_0_0_#000]",
    description: "¡Materia completada con éxito!"
  },
  {
    value: "regular",
    label: "Regular",
    icon: Clock,
    badge: "FINAL",
    activeColor: "bg-[#00E5FF] text-black border-black shadow-[4px_4px_0_0_#000]",
    description: "Cursada aprobada, falta final"
  },
  {
    value: "cursable",
    label: "Cursable",
    icon: BookOpen,
    badge: "LISTA",
    activeColor: "bg-[#48BD22] text-white border-black shadow-[4px_4px_0_0_#000]",
    description: "Habilitada para cursar"
  },
  {
    value: "recursar",
    label: "Recursar",
    icon: RotateCcw,
    badge: "REPITE",
    activeColor: "bg-[#FF2E93] text-white border-black shadow-[4px_4px_0_0_#000]",
    description: "Volver a cursar este año"
  },
];

export function SubjectStatusModal({
  subject,
  open,
  onClose,
  onUpdate,
  onStatusChange,
  onUpdatePartialGrades,
  onGradesChange,
  onEditDependencies,
  onEditDetails,
  onDelete,
  readOnly = false
}: SubjectStatusModalProps) {
  const saveStatus = onStatusChange || onUpdate;
  const saveGrades = onGradesChange || onUpdatePartialGrades;

  const [selectedStatus, setSelectedStatus] = useState<SubjectStatus | null>(null);
  const [nota, setNota] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset state when subject changes
  const subjectId = subject?.id;
  const currentPartialGrades = subject?.partialGrades || {};

  if (!subject) return null;

  const handleStatusSelect = (status: SubjectStatus) => {
    ComicAudio.playPop();
    setSelectedStatus(status);
    if (status !== "aprobada") {
      setNota("");
    }
  };

  const handleSave = async () => {
    if (!selectedStatus || readOnly || !saveStatus) return;

    setLoading(true);
    ComicAudio.playPowerUp();
    try {
      const notaValue = selectedStatus === "aprobada" && nota ? parseFloat(nota) : undefined;
      await saveStatus(subject.id, selectedStatus, notaValue);
      onClose();
      setSelectedStatus(null);
      setNota("");
    } finally {
      setLoading(false);
    }
  };

  const handlePartialGradesUpdate = async (newGrades: PartialGrades) => {
    if (!saveGrades) return;
    setLoading(true);
    try {
      await saveGrades(subject.id, newGrades);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setLoading(true);
    ComicAudio.playPop();
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
      <DialogContent className="sm:max-w-lg bg-card border-4 border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-2 pb-2 border-b-2 border-border/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-[#FFE600] text-black font-black text-xs uppercase border-2 border-black shadow-[1.5px_1.5px_0_0_#000] -rotate-1">
              Año {subject.año}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-secondary text-foreground font-black text-xs uppercase border-2 border-black shadow-[1.5px_1.5px_0_0_#000]">
              {subject.codigo}
            </span>
            <span className={cn(
              "px-2 py-0.5 rounded-lg font-black text-xs uppercase border-2 border-black shadow-[1.5px_1.5px_0_0_#000] ml-auto",
              subject.status === "aprobada" && "bg-[#48BD22] text-white",
              subject.status === "regular" && "bg-[#00E5FF] text-black",
              subject.status === "cursable" && "bg-[#FFE600] text-black",
              subject.status === "bloqueada" && "bg-muted text-muted-foreground",
              subject.status === "recursar" && "bg-[#FF2E93] text-white"
            )}>
              Estado: {subject.status}
            </span>
          </div>
          <DialogTitle className="font-black text-xl sm:text-2xl uppercase tracking-tight text-foreground text-left">
            {subject.nombre}
          </DialogTitle>
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="py-6 space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FF2E93] text-white border-3 border-black shadow-[4px_4px_0_0_#000] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 stroke-[3]" />
            </div>
            <div className="space-y-1">
              <p className="font-black text-lg uppercase text-foreground">
                ¿Eliminar esta materia?
              </p>
              <p className="font-bold text-xs text-muted-foreground max-w-xs mx-auto">
                Se borrarán sus correlatividades y notas registradas. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  ComicAudio.playPop();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 py-3 rounded-xl font-black uppercase text-xs tracking-wider bg-secondary hover:bg-secondary/80 border-2 border-black shadow-[3px_3px_0_0_#000] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-3 rounded-xl font-black uppercase text-xs tracking-wider bg-[#FF2E93] text-white border-2 border-black shadow-[3px_3px_0_0_#000] hover:opacity-90 active:translate-y-[1px] transition-all"
              >
                {loading ? "Eliminando..." : "Sí, Eliminar"}
              </button>
            </div>
          </div>
        ) : isBlocked ? (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-2xl bg-[#FF6600]/15 border-3 border-black shadow-[4px_4px_0_0_#000] space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#FF6600] text-white border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase text-foreground">
                    Materia Bloqueada por Correlativas
                  </h4>
                  <p className="text-xs font-bold text-muted-foreground">
                    Debes regularizar o aprobar las siguientes materias primero:
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                {subject.requisitos_faltantes.map((req, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 bg-card border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF2E93] border border-black shrink-0" />
                    <span className="text-xs font-black text-foreground">{req}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions for blocked subjects */}
            {!readOnly && (
              <div className="flex items-center gap-2 pt-1">
                {onEditDetails && (
                  <button
                    onClick={() => {
                      ComicAudio.playPop();
                      onEditDetails(subject);
                    }}
                    className="p-3 rounded-xl font-black bg-secondary hover:bg-secondary/80 border-2 border-black shadow-[2px_2px_0_0_#000] text-sm flex items-center justify-center transition-all"
                    title="Editar Información"
                  >
                    <Settings2 className="w-5 h-5" />
                  </button>
                )}
                {onEditDependencies && (
                  <button
                    onClick={() => {
                      ComicAudio.playPop();
                      onEditDependencies(subject);
                    }}
                    className="flex-1 py-3 px-3 rounded-xl font-black uppercase text-xs tracking-wider bg-[#FFE600] text-black border-2 border-black shadow-[3px_3px_0_0_#000] hover:bg-[#ffe033] transition-all flex items-center justify-center gap-2"
                  >
                    <Link2 className="w-4 h-4 stroke-[3]" />
                    Editar Correlativas
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      ComicAudio.playPop();
                      setShowDeleteConfirm(true);
                    }}
                    className="p-3 rounded-xl font-black bg-[#FF2E93]/20 text-[#FF2E93] hover:bg-[#FF2E93]/30 border-2 border-black shadow-[2px_2px_0_0_#000] transition-all"
                    title="Eliminar materia"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-3 space-y-4">
            {/* Partial Grades Section with Comic styling */}
            {onUpdatePartialGrades && (
              <PartialGradesSection
                key={subjectId}
                grades={currentPartialGrades}
                onUpdate={handlePartialGradesUpdate}
                disabled={loading || readOnly}
              />
            )}

            {/* Current Final Grade Badge */}
            {subject.nota && (
              <div className="flex items-center justify-center gap-2.5 p-3 bg-[#FFE600] text-black border-3 border-black rounded-2xl shadow-[3px_3px_0_0_#000]">
                <Star className="w-5 h-5 fill-black stroke-black" />
                <span className="font-black text-sm uppercase tracking-wide">
                  Nota Final Registrada: {subject.nota}
                </span>
              </div>
            )}

            {/* Status Options Section */}
            {!readOnly && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FFE600] fill-[#FFE600]" />
                  <label className="font-black text-xs uppercase tracking-wider text-foreground">
                    Cambiar Estado de la Materia
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {statusOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedStatus === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleStatusSelect(option.value)}
                        className={cn(
                          "p-3 rounded-2xl border-3 transition-colors text-left group relative",
                          isSelected
                            ? option.activeColor
                            : "border-black/40 bg-card hover:border-black shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:bg-secondary/60"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className={cn(
                            "w-8 h-8 rounded-xl border-2 border-black flex items-center justify-center",
                            isSelected ? "bg-black/15 text-inherit" : "bg-muted text-foreground"
                          )}>
                            <Icon className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-black text-white">
                            {option.badge}
                          </span>
                        </div>

                        <p className="font-black text-sm uppercase leading-tight">
                          {option.label}
                        </p>
                        <p className={cn(
                          "text-[10px] font-bold mt-0.5 leading-tight truncate",
                          isSelected ? "opacity-90" : "text-muted-foreground"
                        )}>
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nota Input for Aprobada */}
            {selectedStatus === "aprobada" && (
              <div className="p-3.5 rounded-2xl bg-[#FFE600]/20 border-3 border-black shadow-[4px_4px_0_0_#000] space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <label className="font-black text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" /> Calificación Final de Examen (1 - 10)
                  </label>
                  <span className="text-[10px] font-black bg-[#48BD22] text-white px-2 py-0.5 rounded-md border border-black">
                    Mínimo 4
                  </span>
                </div>
                <input
                  type="number"
                  min="4"
                  max="10"
                  step="0.5"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: 8, 9, 10"
                  className="w-full px-4 py-3 bg-white text-black font-black text-xl text-center rounded-xl border-3 border-black shadow-[3px_3px_0_0_#000] focus:outline-none focus:ring-4 focus:ring-[#FFE600]"
                />
              </div>
            )}

            {/* Action Buttons */}
            {!readOnly && (
              <div className="flex items-center gap-2 pt-2 border-t-2 border-border/80">
                {onEditDetails && (
                  <button
                    type="button"
                    onClick={() => {
                      ComicAudio.playPop();
                      onEditDetails(subject);
                    }}
                    className="p-3 rounded-xl font-black bg-secondary hover:bg-secondary/80 border-2 border-black shadow-[2px_2px_0_0_#000] text-sm flex items-center justify-center transition-all"
                    title="Editar Información"
                  >
                    <Settings2 className="w-5 h-5" />
                  </button>
                )}
                {onEditDependencies && (
                  <button
                    type="button"
                    onClick={() => {
                      ComicAudio.playPop();
                      onEditDependencies(subject);
                    }}
                    className="p-3 rounded-xl font-black bg-secondary hover:bg-secondary/80 border-2 border-black shadow-[2px_2px_0_0_#000] text-sm flex items-center justify-center transition-all"
                    title="Editar Correlativas"
                  >
                    <Link2 className="w-5 h-5 stroke-[2.5]" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      ComicAudio.playPop();
                      setShowDeleteConfirm(true);
                    }}
                    className="p-3 rounded-xl font-black bg-[#FF2E93]/20 text-[#FF2E93] hover:bg-[#FF2E93]/30 border-2 border-black shadow-[2px_2px_0_0_#000] transition-all"
                    title="Eliminar Materia"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!selectedStatus || loading}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl font-black uppercase text-xs sm:text-sm tracking-wider transition-all border-3 border-black",
                    selectedStatus
                      ? "bg-[#FFE600] text-black shadow-[4px_4px_0_0_#000] hover:bg-[#ffe033] active:translate-y-[1px]"
                      : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed border-muted"
                  )}
                >
                  {loading ? "Guardando..." : "¡Guardar Cambios!"}
                </button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
