import { useState, useCallback } from "react";
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
  description: string;
}[] = [
  {
    value: "aprobada",
    label: "Aprobada",
    icon: Trophy,
    badge: "100%",
    description: "Materia completada con éxito"
  },
  {
    value: "regular",
    label: "Regular",
    icon: Clock,
    badge: "Final",
    description: "Cursada aprobada, final pendiente"
  },
  {
    value: "cursable",
    label: "Cursable",
    icon: BookOpen,
    badge: "Lista",
    description: "Habilitada para cursar"
  },
  {
    value: "recursar",
    label: "Recursar",
    icon: RotateCcw,
    badge: "Repite",
    description: "Volver a cursar"
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

  const handlePartialGradesUpdate = useCallback(async (newGrades: PartialGrades) => {
    if (!saveGrades || !subject?.id) return;
    try {
      await saveGrades(subject.id, newGrades);
    } catch (err) {
      console.error("Error updating partial grades:", err);
    }
  }, [saveGrades, subject?.id]);

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

  const getStatusBadgeStyle = (status: SubjectStatus) => {
    switch (status) {
      case "aprobada":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      case "regular":
        return "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20";
      case "cursable":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "recursar":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";
      case "bloqueada":
      default:
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
              Año {subject.año}
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 font-mono">
              {subject.codigo}
            </span>
            <span className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded-md border ml-auto capitalize",
              getStatusBadgeStyle(subject.status)
            )}>
              {subject.status}
            </span>
          </div>
          <DialogTitle className="font-semibold text-lg sm:text-xl tracking-tight text-zinc-900 dark:text-zinc-100 text-left">
            {subject.nombre}
          </DialogTitle>
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="py-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                ¿Eliminar esta materia?
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                Se borrarán sus correlatividades y notas registradas. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  ComicAudio.playPop();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
              >
                {loading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-3 space-y-4">
            {/* Info Banner when blocked by correlatives */}
            {isBlocked && (
              <div className="p-3.5 rounded-lg bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-xs text-zinc-900 dark:text-zinc-100">
                        Materia bloqueada por correlativas
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Requisitos previos pendientes según el plan:
                      </p>
                    </div>
                  </div>
                  {onEditDependencies && !readOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        ComicAudio.playPop();
                        onEditDependencies(subject);
                      }}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 flex items-center gap-1.5 transition-colors"
                    >
                      <Link2 className="w-3 h-3" />
                      Editar correlativas
                    </button>
                  )}
                </div>

                <div className="space-y-1 pt-1">
                  {subject.requisitos_faltantes.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-white/60 dark:bg-zinc-900/40 border border-amber-500/15 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-xs text-zinc-700 dark:text-zinc-300">{req}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Partial Grades Section */}
            {saveGrades && (
              <PartialGradesSection
                key={subjectId}
                grades={currentPartialGrades}
                onUpdate={handlePartialGradesUpdate}
                disabled={readOnly}
              />
            )}

            {/* Current Final Grade Badge */}
            {subject.nota && (
              <div className="flex items-center justify-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  Nota final registrada: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{subject.nota}</span>
                </span>
              </div>
            )}

            {/* Status Options Section */}
            {!readOnly && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Cambiar estado de la materia
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedStatus === option.value;
                    const isOptionDisabled = isBlocked && option.value === "cursable";

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={isOptionDisabled}
                        onClick={() => {
                          if (isOptionDisabled) return;
                          handleStatusSelect(option.value);
                        }}
                        className={cn(
                          "p-3 rounded-lg border text-left transition-colors relative",
                          isOptionDisabled
                            ? "opacity-40 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
                            : isSelected
                            ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100/70 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#212121] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className={cn(
                            "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          )}>
                            {isOptionDisabled ? <Lock className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                            {isOptionDisabled ? "Bloq" : option.badge}
                          </span>
                        </div>

                        <p className="text-xs font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
                          {option.label}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight truncate">
                          {isOptionDisabled ? "Requisitos pendientes" : option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Botón para restablecer estado a automático */}
                {(subject.status === "aprobada" || subject.status === "regular" || subject.status === "recursar") && (
                  <button
                    type="button"
                    onClick={() => {
                      ComicAudio.playPop();
                      setSelectedStatus("cursable");
                      setNota("");
                    }}
                    className={cn(
                      "w-full py-2 px-3 rounded-lg border border-dashed text-xs font-medium flex items-center justify-center gap-1.5 transition-colors mt-1",
                      selectedStatus === "cursable"
                        ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100/70 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100"
                        : "border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    )}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restablecer estado (cálculo automático)
                  </button>
                )}
              </div>
            )}

            {/* Nota Input for Aprobada */}
            {selectedStatus === "aprobada" && (
              <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" /> Calificación final (1 - 10)
                  </label>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
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
                  placeholder="Ej: 8"
                  className="w-full px-3 py-2 bg-white dark:bg-[#1e1e1e] text-zinc-900 dark:text-zinc-100 font-medium text-base text-center rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                />
              </div>
            )}

            {/* Action Buttons */}
            {!readOnly && (
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                {onEditDetails && (
                  <button
                    type="button"
                    onClick={() => {
                      ComicAudio.playPop();
                      onEditDetails(subject);
                    }}
                    className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                    title="Editar información"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                )}
                {onEditDependencies && (
                  <button
                    type="button"
                    onClick={() => {
                      ComicAudio.playPop();
                      onEditDependencies(subject);
                    }}
                    className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                    title="Editar correlativas"
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      ComicAudio.playPop();
                      setShowDeleteConfirm(true);
                    }}
                    className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Eliminar materia"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!selectedStatus || loading}
                  className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg px-3.5 py-2 text-xs font-medium transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
