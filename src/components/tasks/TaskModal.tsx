import { useState, useEffect } from "react";
import { StudyTask, CreateTaskInput, TaskPriority, TaskStatus } from "@/types/tasks";
import { X, Check, BookOpen, Calendar, Timer, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

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
}: TaskModalProps) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [estado, setEstado] = useState<TaskStatus>("todo");
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
      setEstado("todo");
      setPrioridad("media");
      setFechaLimite("");
      setPomodorosEstimados(2);
    }
  }, [initialTask, defaultSubjectId, isOpen]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-card border-4 border-foreground rounded-2xl p-5 sm:p-7 shadow-[8px_8px_0_0_hsl(var(--foreground))] w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#00E5FF] text-black border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_#000]">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-display font-black text-lg uppercase tracking-tight text-foreground">
              {initialTask ? "Editar Tarea" : "Nueva Tarea de Estudio"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground border-2 border-foreground hover:bg-muted/80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Presets */}
          {!initialTask && (
            <div>
              <label className="text-[11px] font-black uppercase text-muted-foreground block mb-1.5">
                Plantillas rápidas para estudiantes:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-bold text-xs border border-foreground/50 hover:border-foreground transition-all"
                  >
                    + {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Título */}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-foreground">
              Título de la Tarea <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ej. Entregar TP1 de Física, Leer Unidad 3..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-background border-2 border-foreground rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-[#00E5FF] shadow-[2px_2px_0_0_hsl(var(--foreground))]"
            />
          </div>

          {/* Materia Asociada */}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-foreground">
              Materia Asociada
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-background border-2 border-foreground rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-[#00E5FF] shadow-[2px_2px_0_0_hsl(var(--foreground))]"
            >
              <option value="">Sin materia específica (General)</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nombre} {sub.codigo ? `(${sub.codigo})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Estado & Prioridad */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-foreground">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 bg-background border-2 border-foreground rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-[#00E5FF] shadow-[2px_2px_0_0_hsl(var(--foreground))]"
              >
                <option value="todo">Por Hacer 📌</option>
                <option value="in_progress">En Progreso ⚡</option>
                <option value="done">Completada ✅</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-foreground">Prioridad</label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-background border-2 border-foreground rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-[#00E5FF] shadow-[2px_2px_0_0_hsl(var(--foreground))]"
              >
                <option value="baja">Baja (Normal)</option>
                <option value="media">Media (Importante)</option>
                <option value="alta">Alta (Urgente 🔥)</option>
              </select>
            </div>
          </div>

          {/* Fecha Límite & Pomodoros Estimados */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Fecha Límite
              </label>
              <input
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                className="w-full px-3 py-2 bg-background border-2 border-foreground rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-[#00E5FF] shadow-[2px_2px_0_0_hsl(var(--foreground))]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-foreground flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-[#ff4747]" />
                Pomodoros Estimados
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={pomodorosEstimados}
                onChange={(e) => setPomodorosEstimados(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-background border-2 border-foreground rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-[#00E5FF] shadow-[2px_2px_0_0_hsl(var(--foreground))]"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-foreground">Notas o Detalles</label>
            <textarea
              rows={2}
              placeholder="Detalles sobre qué capítulos leer o requisitos del TP..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3.5 py-2 bg-background border-2 border-foreground rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#00E5FF] shadow-[2px_2px_0_0_hsl(var(--foreground))]"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t-2 border-border/70">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-muted text-foreground font-bold text-xs uppercase border-2 border-foreground hover:bg-muted/80"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !titulo.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#00FF9D] text-black font-black text-xs uppercase tracking-wider border-2 border-foreground shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? "Guardando..." : initialTask ? "Guardar Cambios" : "Crear Tarea"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
