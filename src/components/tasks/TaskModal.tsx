import { useState, useEffect } from "react";
import { StudyTask, CreateTaskInput, TaskPriority, TaskStatus } from "@/types/tasks";
import { X, Check, BookOpen, Calendar, Timer, CheckSquare, Clock, Zap, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubjectSelect } from "@/components/subjects/SubjectSelect";

interface SubjectOption {
  id: string;
  nombre: string;
  codigo?: string;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: CreateTaskInput) => Promise<void>;
  initialTask?: StudyTask | null;
  subjects: SubjectOption[];
  defaultSubjectId?: string | null;
  defaultStatus?: TaskStatus;
}

const PRESETS = [
  "Entregar TP",
  "Leer Unidad",
  "Guía de Ejercicios",
  "Resumen Teórico",
  "Repaso de Parcial",
  "Preparar Consulta",
];

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  initialTask,
  subjects,
  defaultSubjectId,
  defaultStatus,
}: TaskModalProps) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [estado, setEstado] = useState<TaskStatus>(defaultStatus || "todo");
  const [prioridad, setPrioridad] = useState<TaskPriority>("media");
  const [fechaLimite, setFechaLimite] = useState("");
  const [pomodorosEstimados, setPomodorosEstimados] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitulo(initialTask.titulo);
      setDescripcion(initialTask.descripcion || "");
      setSubjectId(initialTask.subject_id || "");
      setEstado(initialTask.estado);
      setPrioridad(initialTask.prioridad);
      setFechaLimite(initialTask.fecha_limite || "");
      setPomodorosEstimados(initialTask.pomodoros_estimados || 2);
    } else {
      setTitulo("");
      setDescripcion("");
      setSubjectId(defaultSubjectId && defaultSubjectId !== "all" ? defaultSubjectId : "");
      setEstado(defaultStatus || "todo");
      setPrioridad("media");
      setFechaLimite("");
      setPomodorosEstimados(2);
    }
  }, [initialTask, defaultSubjectId, defaultStatus, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        subject_id: subjectId || null,
        estado,
        prioridad,
        fecha_limite: fechaLimite || null,
        pomodoros_estimados: pomodorosEstimados,
      });
      onClose();
    } catch (err) {
      console.error("Error saving task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyPreset = (preset: string) => {
    const selectedSub = subjects.find((s) => s.id === subjectId);
    const subName = selectedSub ? ` - ${selectedSub.nombre}` : "";
    setTitulo(`${preset}${subName}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xl w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                {initialTask ? "Editar Tarea" : "Nueva Tarea de Estudio"}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                {initialTask ? "Modifica los detalles de tu pendiente" : "Organiza una entrega, lectura o repaso"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Presets */}
          {!initialTask && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block">
                Plantillas rápidas:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/70 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/70 text-zinc-700 dark:text-zinc-300 font-medium text-xs border border-zinc-200/60 dark:border-zinc-700/50 transition-colors cursor-pointer"
                  >
                    + {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Título de la tarea</span>
              <span className="text-zinc-400 text-[11px]">Obligatorio</span>
            </label>
            <input
              type="text"
              required
              placeholder="ej. Entregar TP1 de Física, Leer Unidad 3..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:border-zinc-400 transition-colors"
            />
          </div>

          {/* Materia Asociada */}
          <SubjectSelect
            value={subjectId || ""}
            onChange={(val) => setSubjectId(val)}
            label="Materia Asociada"
            placeholder="Sin materia específica (General)"
            allowNone
            noneLabel="Sin materia específica (General)"
            showYearFilter
          />

          {/* Estado & Prioridad */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Estado</label>
              <Select
                value={estado}
                onValueChange={(val) => setEstado(val as TaskStatus)}
              >
                <SelectTrigger className="w-full px-3 py-2 h-auto bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg rounded-xl">
                  <SelectItem value="todo" className="font-medium cursor-pointer rounded-lg text-xs">
                    <span className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Por Hacer</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="in_progress" className="font-medium cursor-pointer rounded-lg text-xs">
                    <span className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-blue-500" />
                      <span>En Progreso</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="done" className="font-medium cursor-pointer rounded-lg text-xs">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Completada</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Prioridad</label>
              <Select
                value={prioridad}
                onValueChange={(val) => setPrioridad(val as TaskPriority)}
              >
                <SelectTrigger className="w-full px-3 py-2 h-auto bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg rounded-xl">
                  <SelectItem value="baja" className="font-medium cursor-pointer rounded-lg text-xs">
                    <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                      <span className="w-2 h-2 rounded-full bg-zinc-400" />
                      <span>Baja</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="media" className="font-medium cursor-pointer rounded-lg text-xs">
                    <span className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Media</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="alta" className="font-medium cursor-pointer rounded-lg text-xs">
                    <span className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Alta</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fecha Límite & Pomodoros Estimados */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>Fecha Límite</span>
              </label>
              <input
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-rose-500" />
                <span>Pomodoros (Estimados)</span>
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={pomodorosEstimados}
                onChange={(e) => setPomodorosEstimados(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Notas o Detalles adicionales
            </label>
            <textarea
              rows={2}
              placeholder="Detalles sobre qué capítulos leer o requisitos del TP..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3.5 py-2 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl text-xs font-normal text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 resize-none transition-colors"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !titulo.trim()}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Guardando..." : initialTask ? "Guardar Cambios" : "Crear Tarea"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
