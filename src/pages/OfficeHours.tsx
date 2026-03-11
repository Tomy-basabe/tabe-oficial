import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubjects } from "@/hooks/useSubjects";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Clock, Plus, Filter, Trash2, Edit2, X, User, BookOpen,
  ChevronLeft, ChevronRight, Loader2
} from "lucide-react";

// ── 12 colores predefinidos para las materias ──
const SUBJECT_COLORS = [
  { bg: "bg-rose-500/20", border: "border-rose-500/40", text: "text-rose-400", solid: "#f43f5e", label: "Rosa" },
  { bg: "bg-sky-500/20", border: "border-sky-500/40", text: "text-sky-400", solid: "#0ea5e9", label: "Celeste" },
  { bg: "bg-amber-500/20", border: "border-amber-500/40", text: "text-amber-400", solid: "#f59e0b", label: "Ámbar" },
  { bg: "bg-emerald-500/20", border: "border-emerald-500/40", text: "text-emerald-400", solid: "#10b981", label: "Esmeralda" },
  { bg: "bg-violet-500/20", border: "border-violet-500/40", text: "text-violet-400", solid: "#8b5cf6", label: "Violeta" },
  { bg: "bg-orange-500/20", border: "border-orange-500/40", text: "text-orange-400", solid: "#f97316", label: "Naranja" },
  { bg: "bg-cyan-500/20", border: "border-cyan-500/40", text: "text-cyan-400", solid: "#06b6d4", label: "Cian" },
  { bg: "bg-pink-500/20", border: "border-pink-500/40", text: "text-pink-400", solid: "#ec4899", label: "Rosa fuerte" },
  { bg: "bg-lime-500/20", border: "border-lime-500/40", text: "text-lime-400", solid: "#84cc16", label: "Lima" },
  { bg: "bg-indigo-500/20", border: "border-indigo-500/40", text: "text-indigo-400", solid: "#6366f1", label: "Índigo" },
  { bg: "bg-teal-500/20", border: "border-teal-500/40", text: "text-teal-400", solid: "#14b8a6", label: "Teal" },
  { bg: "bg-red-500/20", border: "border-red-500/40", text: "text-red-400", solid: "#ef4444", label: "Rojo" },
];

const DAYS = [
  { key: "lunes", label: "Lunes", short: "Lun" },
  { key: "martes", label: "Martes", short: "Mar" },
  { key: "miercoles", label: "Miércoles", short: "Mié" },
  { key: "jueves", label: "Jueves", short: "Jue" },
  { key: "viernes", label: "Viernes", short: "Vie" },
  { key: "sabado", label: "Sábado", short: "Sáb" },
];

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7:00 to 22:00

interface Professor {
  id: string;
  user_id: string;
  subject_id: string;
  nombre: string;
  rol: string | null;
  descripcion: string | null;
  color_index: number;
  created_at: string;
  subject_nombre?: string;
}

interface OfficeHour {
  id: string;
  professor_id: string;
  user_id: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
}

interface ScheduleEntry {
  id: string;
  professorName: string;
  subjectName: string;
  rol: string | null;
  day: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  colorIndex: number;
  professorId: string;
}

export default function OfficeHours() {
  const { user, isGuest } = useAuth();
  const { rawSubjects: allSubjects, getYears, loading: subjectsLoading } = useSubjects();

  const [professors, setProfessors] = useState<Professor[]>([]);
  const [officeHours, setOfficeHours] = useState<OfficeHour[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState<Professor | null>(null);
  const [formName, setFormName] = useState("");
  const [formRol, setFormRol] = useState<string>("");
  const [formDesc, setFormDesc] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formColorIndex, setFormColorIndex] = useState(0);
  const [formSchedules, setFormSchedules] = useState<{ dia: string; hora_inicio: string; hora_fin: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Tooltip
  const [tooltip, setTooltip] = useState<{ entry: ScheduleEntry; x: number; y: number } | null>(null);

  // Mobile day selector
  const [mobileDayIndex, setMobileDayIndex] = useState(0);

  const years = getYears();

  const subjects = useMemo(() => {
    if (!allSubjects) return [];
    return allSubjects.filter(s => selectedYear === null || s.año === selectedYear);
  }, [allSubjects, selectedYear]);

  // Fetch professors and hours
  const fetchData = useCallback(async () => {
    if (!user || isGuest) {
      setLoading(false);
      return;
    }
    try {
      const [profResult, hoursResult] = await Promise.all([
        supabase.from("professors").select("*").eq("user_id", user.id),
        supabase.from("professor_office_hours").select("*").eq("user_id", user.id),
      ]);
      if (profResult.error) throw profResult.error;
      if (hoursResult.error) throw hoursResult.error;

      // Enrich professors with subject names
      const enriched = (profResult.data || []).map((p: any) => {
        const sub = allSubjects?.find(s => s.id === p.subject_id);
        return { ...p, subject_nombre: sub?.nombre || "Sin materia" };
      });
      setProfessors(enriched);
      setOfficeHours(hoursResult.data || []);
    } catch (err) {
      console.error("Error fetching professors:", err);
      toast.error("Error al cargar profesores");
    } finally {
      setLoading(false);
    }
  }, [user, isGuest, allSubjects]);

  useEffect(() => {
    if (!subjectsLoading) fetchData();
  }, [fetchData, subjectsLoading]);

  // Parse time string to hours+minutes
  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return { hour: h, minute: m || 0 };
  };

  // Build schedule entries for the timeline
  const scheduleEntries = useMemo((): ScheduleEntry[] => {
    const filteredProfs = professors.filter(p => {
      if (selectedSubjectId) return p.subject_id === selectedSubjectId;
      if (selectedYear !== null) {
        const sub = allSubjects?.find(s => s.id === p.subject_id);
        return sub && sub.año === selectedYear;
      }
      return true;
    });

    return officeHours
      .filter(oh => filteredProfs.some(p => p.id === oh.professor_id))
      .map(oh => {
        const prof = professors.find(p => p.id === oh.professor_id)!;
        const start = parseTime(oh.hora_inicio);
        const end = parseTime(oh.hora_fin);
        return {
          id: oh.id,
          professorName: prof.nombre,
          subjectName: prof.subject_nombre || "",
          rol: prof.rol,
          day: oh.dia,
          startHour: start.hour,
          startMinute: start.minute,
          endHour: end.hour,
          endMinute: end.minute,
          colorIndex: prof.color_index,
          professorId: prof.id,
        };
      });
  }, [professors, officeHours, selectedSubjectId, selectedYear, allSubjects]);

  // Open modal for new professor
  const openNewModal = () => {
    setEditingProfessor(null);
    setFormName("");
    setFormRol("");
    setFormDesc("");
    setFormSubjectId(selectedSubjectId || "");
    setFormColorIndex(0);
    setFormSchedules([{ dia: "lunes", hora_inicio: "08:00", hora_fin: "10:00" }]);
    setShowModal(true);
  };

  // Open modal for editing
  const openEditModal = (prof: Professor) => {
    setEditingProfessor(prof);
    setFormName(prof.nombre);
    setFormRol(prof.rol || "");
    setFormDesc(prof.descripcion || "");
    setFormSubjectId(prof.subject_id);
    setFormColorIndex(prof.color_index);
    const profHours = officeHours.filter(oh => oh.professor_id === prof.id);
    setFormSchedules(
      profHours.length > 0
        ? profHours.map(oh => ({ dia: oh.dia, hora_inicio: oh.hora_inicio.slice(0, 5), hora_fin: oh.hora_fin.slice(0, 5) }))
        : [{ dia: "lunes", hora_inicio: "08:00", hora_fin: "10:00" }]
    );
    setShowModal(true);
  };

  // Save professor
  const handleSave = async () => {
    if (!user || !formName.trim() || !formSubjectId) {
      toast.error("Completá nombre y materia");
      return;
    }
    setSaving(true);
    try {
      if (editingProfessor) {
        // Update professor
        const { error } = await supabase
          .from("professors")
          .update({
            nombre: formName.trim(),
            rol: formRol || null,
            descripcion: formDesc.trim() || null,
            subject_id: formSubjectId,
            color_index: formColorIndex,
          })
          .eq("id", editingProfessor.id);
        if (error) throw error;

        // Delete old hours and re-insert
        await supabase.from("professor_office_hours").delete().eq("professor_id", editingProfessor.id);
        if (formSchedules.length > 0) {
          const { error: hError } = await supabase.from("professor_office_hours").insert(
            formSchedules.map(s => ({
              professor_id: editingProfessor.id,
              user_id: user.id,
              dia: s.dia,
              hora_inicio: s.hora_inicio,
              hora_fin: s.hora_fin,
            }))
          );
          if (hError) throw hError;
        }
        toast.success("Profesor actualizado");
      } else {
        // Create professor
        const { data: newProf, error } = await supabase
          .from("professors")
          .insert({
            user_id: user.id,
            subject_id: formSubjectId,
            nombre: formName.trim(),
            rol: formRol || null,
            descripcion: formDesc.trim() || null,
            color_index: formColorIndex,
          })
          .select()
          .single();
        if (error) throw error;

        // Insert hours
        if (formSchedules.length > 0) {
          const { error: hError } = await supabase.from("professor_office_hours").insert(
            formSchedules.map(s => ({
              professor_id: newProf.id,
              user_id: user.id,
              dia: s.dia,
              hora_inicio: s.hora_inicio,
              hora_fin: s.hora_fin,
            }))
          );
          if (hError) throw hError;
        }
        toast.success("Profesor agregado");
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error("Error saving professor:", err);
      toast.error(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // Delete professor
  const handleDelete = async (profId: string) => {
    if (!confirm("¿Eliminar este profesor y sus horarios?")) return;
    try {
      const { error } = await supabase.from("professors").delete().eq("id", profId);
      if (error) throw error;
      toast.success("Profesor eliminado");
      fetchData();
    } catch (err) {
      console.error("Error deleting:", err);
      toast.error("Error al eliminar");
    }
  };

  // Add schedule row in form
  const addScheduleRow = () => {
    setFormSchedules(prev => [...prev, { dia: "lunes", hora_inicio: "08:00", hora_fin: "10:00" }]);
  };

  const removeScheduleRow = (idx: number) => {
    setFormSchedules(prev => prev.filter((_, i) => i !== idx));
  };

  const updateScheduleRow = (idx: number, field: string, value: string) => {
    setFormSchedules(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  // Timeline block position
  const getBlockStyle = (entry: ScheduleEntry) => {
    const startOffset = (entry.startHour - 7) * 60 + entry.startMinute;
    const endOffset = (entry.endHour - 7) * 60 + entry.endMinute;
    const totalMinutes = 15 * 60; // 7:00 to 22:00 = 900min
    const top = (startOffset / totalMinutes) * 100;
    const height = ((endOffset - startOffset) / totalMinutes) * 100;
    return { top: `${top}%`, height: `${height}%` };
  };

  if (loading || subjectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando consultas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text flex items-center gap-3">
            <Clock className="w-7 h-7" />
            Consultas de Profesores
          </h1>
          <p className="text-muted-foreground mt-1">
            Horarios de consulta organizados por materia
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-medium hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Agregar Profesor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Year Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => { setSelectedYear(null); setSelectedSubjectId(null); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                selectedYear === null ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
              )}
            >
              Todos
            </button>
            {years.map(year => (
              <button
                key={year}
                onClick={() => { setSelectedYear(year); setSelectedSubjectId(null); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  selectedYear === year ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                )}
              >
                Año {year}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Filter */}
        {selectedYear !== null && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setSelectedSubjectId(null)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                selectedSubjectId === null ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "bg-secondary hover:bg-secondary/80"
              )}
            >
              Todas las materias
            </button>
            {subjects.map(sub => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  selectedSubjectId === sub.id ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "bg-secondary hover:bg-secondary/80"
                )}
              >
                {sub.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Professor Cards */}
      {professors.filter(p => {
        if (selectedSubjectId) return p.subject_id === selectedSubjectId;
        if (selectedYear !== null) {
          const sub = allSubjects?.find(s => s.id === p.subject_id);
          return sub && sub.año === selectedYear;
        }
        return true;
      }).length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {professors.filter(p => {
            if (selectedSubjectId) return p.subject_id === selectedSubjectId;
            if (selectedYear !== null) {
              const sub = allSubjects?.find(s => s.id === p.subject_id);
              return sub && sub.año === selectedYear;
            }
            return true;
          }).map(prof => {
            const color = SUBJECT_COLORS[prof.color_index % SUBJECT_COLORS.length];
            const profHours = officeHours.filter(oh => oh.professor_id === prof.id);
            return (
              <div
                key={prof.id}
                className={cn(
                  "card-gamer rounded-xl p-4 border-l-4 transition-all hover:scale-[1.02]",
                  color.border
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", color.bg)}>
                      <User className={cn("w-4 h-4", color.text)} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{prof.nombre}</p>
                      <p className={cn("text-xs", color.text)}>
                        {prof.subject_nombre}
                        {prof.rol && ` · ${prof.rol === "teoria" ? "Teoría" : "Práctica"}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEditModal(prof)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                      <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(prof.id)} className="p-1 rounded-lg hover:bg-destructive/20 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
                {prof.descripcion && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{prof.descripcion}</p>
                )}
                {profHours.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {profHours.map(oh => {
                      const dayLabel = DAYS.find(d => d.key === oh.dia)?.label || oh.dia;
                      return (
                        <div key={oh.id} className={cn("text-xs rounded-md px-2 py-1 flex items-center gap-1", color.bg)}>
                          <Clock className={cn("w-3 h-3", color.text)} />
                          <span className={color.text}>{dayLabel} {oh.hora_inicio.slice(0, 5)} – {oh.hora_fin.slice(0, 5)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TIMELINE VISUAL ── */}
      <div className="card-gamer rounded-xl p-4 lg:p-6">
        <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-neon-cyan" />
          Grilla Semanal de Consultas
        </h2>

        {scheduleEntries.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No hay horarios de consulta cargados</p>
            <button
              onClick={openNewModal}
              className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-medium hover:opacity-90 transition-all"
            >
              Agregar tu primer profesor
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Timeline */}
            <div className="hidden lg:block overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Header row */}
                <div className="grid grid-cols-[60px_repeat(6,1fr)] gap-0 mb-0">
                  <div className="h-10" />
                  {DAYS.map(day => (
                    <div key={day.key} className="h-10 flex items-center justify-center text-sm font-semibold text-foreground border-b border-border">
                      {day.label}
                    </div>
                  ))}
                </div>

                {/* Body: hours label column + 6 day columns */}
                <div className="grid grid-cols-[60px_repeat(6,1fr)] gap-0">
                  {/* Hours labels */}
                  <div className="relative" style={{ height: `${HOURS.length * 48}px` }}>
                    {HOURS.map((hour, i) => (
                      <div key={hour} className="absolute left-0 right-0 flex items-start justify-end pr-2" style={{ top: `${i * 48 - 8}px` }}>
                        <span className="text-xs text-muted-foreground">{String(hour).padStart(2, "0")}:00</span>
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {DAYS.map((day) => {
                    const dayEntries = scheduleEntries.filter(e => e.day === day.key);
                    return (
                      <div key={day.key} className="relative border-l border-border/30" style={{ height: `${HOURS.length * 48}px` }}>
                        {/* Grid lines */}
                        {HOURS.map((hour, i) => (
                          <div key={hour} className="absolute left-0 right-0 border-t border-border/20" style={{ top: `${i * 48}px` }} />
                        ))}

                        {/* Schedule blocks */}
                        {dayEntries.map(entry => {
                          const color = SUBJECT_COLORS[entry.colorIndex % SUBJECT_COLORS.length];
                          const startPx = ((entry.startHour - 7) * 60 + entry.startMinute) * (48 / 60);
                          const endPx = ((entry.endHour - 7) * 60 + entry.endMinute) * (48 / 60);
                          const heightPx = endPx - startPx;

                          return (
                            <div
                              key={entry.id}
                              className={cn(
                                "absolute left-1 right-1 rounded-lg border-2 flex flex-col justify-center px-2 cursor-pointer transition-all hover:scale-[1.03] hover:z-10 overflow-hidden shadow-sm",
                                color.bg, color.border
                              )}
                              style={{
                                top: `${startPx}px`,
                                height: `${Math.max(heightPx, 24)}px`,
                              }}
                              onMouseEnter={(e) => setTooltip({ entry, x: e.clientX, y: e.clientY })}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              <p className={cn("text-xs font-semibold truncate", color.text)}>{entry.professorName}</p>
                              {heightPx > 40 && (
                                <p className="text-[10px] text-muted-foreground truncate">{entry.subjectName}</p>
                              )}
                              {heightPx > 56 && (
                                <p className="text-[10px] text-muted-foreground">
                                  {String(entry.startHour).padStart(2, "0")}:{String(entry.startMinute).padStart(2, "0")} – {String(entry.endHour).padStart(2, "0")}:{String(entry.endMinute).padStart(2, "0")}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile Timeline (single day with swipe) */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setMobileDayIndex(Math.max(0, mobileDayIndex - 1))}
                  disabled={mobileDayIndex === 0}
                  className="p-2 rounded-lg bg-secondary disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold">{DAYS[mobileDayIndex].label}</span>
                <button
                  onClick={() => setMobileDayIndex(Math.min(5, mobileDayIndex + 1))}
                  disabled={mobileDayIndex === 5}
                  className="p-2 rounded-lg bg-secondary disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                {DAYS.map((day, i) => (
                  <button
                    key={day.key}
                    onClick={() => setMobileDayIndex(i)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                      mobileDayIndex === i ? "bg-primary text-primary-foreground" : "bg-secondary"
                    )}
                  >
                    {day.short}
                  </button>
                ))}
              </div>

              {/* Mobile day entries */}
              <div className="relative" style={{ height: `${HOURS.length * 40}px` }}>
                {HOURS.map((hour, i) => (
                  <div key={hour} className="absolute left-0 right-0 flex items-start" style={{ top: `${i * 40}px`, height: "40px" }}>
                    <span className="w-12 text-xs text-muted-foreground text-right pr-2 -mt-2">{String(hour).padStart(2, "0")}:00</span>
                    <div className="flex-1 border-t border-border/30" />
                  </div>
                ))}

                {scheduleEntries
                  .filter(e => e.day === DAYS[mobileDayIndex].key)
                  .map(entry => {
                    const color = SUBJECT_COLORS[entry.colorIndex % SUBJECT_COLORS.length];
                    const startPx = ((entry.startHour - 7) * 60 + entry.startMinute) * (40 / 60);
                    const endPx = ((entry.endHour - 7) * 60 + entry.endMinute) * (40 / 60);
                    const heightPx = endPx - startPx;

                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "absolute left-14 right-2 rounded-lg border-2 flex flex-col justify-center px-3 overflow-hidden",
                          color.bg, color.border
                        )}
                        style={{ top: `${startPx}px`, height: `${Math.max(heightPx, 28)}px` }}
                      >
                        <p className={cn("text-sm font-semibold truncate", color.text)}>{entry.professorName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.subjectName} · {String(entry.startHour).padStart(2, "0")}:{String(entry.startMinute).padStart(2, "0")} – {String(entry.endHour).padStart(2, "0")}:{String(entry.endMinute).padStart(2, "0")}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 card-gamer rounded-xl p-3 shadow-2xl border border-border pointer-events-none max-w-[250px]"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="font-semibold text-sm">{tooltip.entry.professorName}</p>
          <p className="text-xs text-muted-foreground">{tooltip.entry.subjectName}</p>
          {tooltip.entry.rol && (
            <p className="text-xs text-neon-cyan mt-1">{tooltip.entry.rol === "teoria" ? "Teoría" : "Práctica"}</p>
          )}
          <p className="text-xs mt-1">
            {DAYS.find(d => d.key === tooltip.entry.day)?.label}: {String(tooltip.entry.startHour).padStart(2, "0")}:{String(tooltip.entry.startMinute).padStart(2, "0")} – {String(tooltip.entry.endHour).padStart(2, "0")}:{String(tooltip.entry.endMinute).padStart(2, "0")}
          </p>
        </div>
      )}

      {/* ── MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto card-gamer rounded-2xl p-6 border border-border shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-bold text-lg">
                {editingProfessor ? "Editar Profesor" : "Nuevo Profesor"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nombre *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ej: Dr. García"
                  className="w-full mt-1 px-4 py-2 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Materia *</label>
                <select
                  value={formSubjectId}
                  onChange={e => setFormSubjectId(e.target.value)}
                  className="w-full mt-1 px-4 py-2 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                >
                  <option value="">Seleccionar materia...</option>
                  {(allSubjects || []).map(sub => (
                    <option key={sub.id} value={sub.id}>
                      Año {sub.año} – {sub.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rol */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Rol (opcional)</label>
                <select
                  value={formRol}
                  onChange={e => setFormRol(e.target.value)}
                  className="w-full mt-1 px-4 py-2 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                >
                  <option value="">No especificado</option>
                  <option value="teoria">Teoría</option>
                  <option value="practica">Práctica</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descripción (opcional)</label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Notas sobre el profesor..."
                  rows={2}
                  className="w-full mt-1 px-4 py-2 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                />
              </div>

              {/* Color */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Color</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SUBJECT_COLORS.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => setFormColorIndex(i)}
                      className={cn(
                        "w-7 h-7 rounded-full border-2 transition-all",
                        formColorIndex === i ? "scale-125 ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:scale-110"
                      )}
                      style={{ backgroundColor: color.solid }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* Schedules */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">Horarios de consulta</label>
                  <button onClick={addScheduleRow} className="text-xs text-neon-cyan hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Agregar día
                  </button>
                </div>
                <div className="space-y-2 mt-2">
                  {formSchedules.map((sched, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                      <select
                        value={sched.dia}
                        onChange={e => updateScheduleRow(idx, "dia", e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-background border border-border text-sm"
                      >
                        {DAYS.map(d => (
                          <option key={d.key} value={d.key}>{d.label}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={sched.hora_inicio}
                        onChange={e => updateScheduleRow(idx, "hora_inicio", e.target.value)}
                        className="w-24 px-2 py-1.5 rounded-lg bg-background border border-border text-sm"
                      />
                      <span className="text-muted-foreground text-sm">a</span>
                      <input
                        type="time"
                        value={sched.hora_fin}
                        onChange={e => updateScheduleRow(idx, "hora_fin", e.target.value)}
                        className="w-24 px-2 py-1.5 rounded-lg bg-background border border-border text-sm"
                      />
                      {formSchedules.length > 1 && (
                        <button onClick={() => removeScheduleRow(idx)} className="p-1 rounded hover:bg-destructive/20">
                          <X className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formSubjectId}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-medium hover:opacity-90 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editingProfessor ? "Guardar Cambios" : "Agregar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
