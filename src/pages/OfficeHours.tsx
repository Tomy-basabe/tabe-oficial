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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SUBJECT_COLORS = [
  { bg: "bg-[#FF5C5C]", border: "border-black", text: "text-black", solid: "#FF5C5C", label: "Rojo Fuerte" },
  { bg: "bg-[#4D9DE0]", border: "border-black", text: "text-black", solid: "#4D9DE0", label: "Azul Brillo" },
  { bg: "bg-[#E1BC29]", border: "border-black", text: "text-black", solid: "#E1BC29", label: "Amarillo" },
  { bg: "bg-[#3BB273]", border: "border-black", text: "text-black", solid: "#3BB273", label: "Verde Esmeralda" },
  { bg: "bg-[#7768AE]", border: "border-black", text: "text-black", solid: "#7768AE", label: "Púrpura" },
  { bg: "bg-[#FF9B71]", border: "border-black", text: "text-black", solid: "#FF9B71", label: "Naranja" },
  { bg: "bg-[#00E5FF]", border: "border-black", text: "text-black", solid: "#00E5FF", label: "Cian" },
  { bg: "bg-[#FF007F]", border: "border-black", text: "text-black", solid: "#FF007F", label: "Rosa Neón" },
  { bg: "bg-[#BFFF00]", border: "border-black", text: "text-black", solid: "#BFFF00", label: "Lima" },
  { bg: "bg-[#8A2BE2]", border: "border-black", text: "text-black", solid: "#8A2BE2", label: "Azul Violeta" },
  { bg: "bg-[#40E0D0]", border: "border-black", text: "text-black", solid: "#40E0D0", label: "Turquesa" },
  { bg: "bg-[#FF3333]", border: "border-black", text: "text-black", solid: "#FF3333", label: "Rojo Intenso" },
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

  // Helper to determine overlap and widths for schedule entries
  const calculateOverlaps = (entries: ScheduleEntry[]) => {
    const sorted = [...entries].sort((a, b) => {
      const aStart = a.startHour * 60 + a.startMinute;
      const bStart = b.startHour * 60 + b.startMinute;
      return aStart - bStart || (a.endHour * 60 + a.endMinute) - (b.endHour * 60 + b.endMinute);
    });

    const groups: ScheduleEntry[][] = [];
    sorted.forEach(entry => {
      let placed = false;
      const entryStart = entry.startHour * 60 + entry.startMinute;
      
      for (const group of groups) {
        // Check if the entry overlaps with the group's time span
        const overlapsWithGroup = group.some(item => {
          const itemStart = item.startHour * 60 + item.startMinute;
          const itemEnd = item.endHour * 60 + item.endMinute;
          const entryEnd = entry.endHour * 60 + entry.endMinute;
          return (entryStart < itemEnd && entryEnd > itemStart);
        });

        if (overlapsWithGroup) {
          group.push(entry);
          placed = true;
          break;
        }
      }
      if (!placed) groups.push([entry]);
    });

    const results = new Map<string, { width: string, left: string }>();
    groups.forEach(group => {
      const width = 100 / group.length;
      group.forEach((entry, i) => {
        results.set(entry.id, {
          width: `${width}%`,
          left: `${width * i}%`
        });
      });
    });
    return results;
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
      {/* Header Banner */}
      <div className="bg-[#FF9B71] rounded-2xl p-6 lg:p-8 border-4 border-black shadow-[8px_8px_0_0_#000] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative badge */}
        <div className="absolute top-4 right-4 bg-[#BFFF00] text-black font-black text-xs px-3 py-1 uppercase border-2 border-black rotate-[5deg] shadow-[2px_2px_0_0_#000] hidden md:block">
          ¡No cuelgues tus dudas!
        </div>
        
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-white border-4 border-black rounded-xl shadow-[4px_4px_0_0_#000] flex items-center justify-center rotate-[-6deg] flex-shrink-0">
            <Clock className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className="font-display text-3xl lg:text-4xl font-black uppercase tracking-wider text-black" style={{ textShadow: '2px 2px 0 #fff, 4px 4px 0 #000' }}>
              Consultas
            </h1>
            <p className="font-bold text-black/90 mt-1 text-sm sm:text-base bg-white/50 px-2 py-1 inline-block rounded-md border-2 border-black">
              Horarios de profesores organizados por materia
            </p>
          </div>
        </div>
        
        <button
          onClick={openNewModal}
          className="relative z-10 flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black border-4 border-black font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] hover:bg-[#00E5FF] transition-all w-full md:w-auto justify-center"
        >
          <Plus className="w-6 h-6" />
          Agregar Profesor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-6 bg-secondary/30 p-4 rounded-xl border-4 border-foreground shadow-[4px_4px_0_0_#000]">
        {/* Year Filter */}
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-foreground" />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setSelectedYear(null); setSelectedSubjectId(null); }}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-black uppercase tracking-wider border-[3px] transition-all",
                selectedYear === null ? "bg-[#FFE66D] border-black text-black shadow-[4px_4px_0_0_#000] translate-y-[-2px]" : "bg-white border-black text-black hover:bg-[#FFE66D]/50 hover:shadow-[2px_2px_0_0_#000]"
              )}
            >
              Todos
            </button>
            {years.map(year => (
              <button
                key={year}
                onClick={() => { setSelectedYear(year); setSelectedSubjectId(null); }}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-black uppercase tracking-wider border-[3px] transition-all",
                  selectedYear === year ? "bg-[#FFE66D] border-black text-black shadow-[4px_4px_0_0_#000] translate-y-[-2px]" : "bg-white border-black text-black hover:bg-[#FFE66D]/50 hover:shadow-[2px_2px_0_0_#000]"
                )}
              >
                Año {year}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Filter */}
        {selectedYear !== null && (
          <div className="flex gap-2 flex-wrap sm:border-l-[3px] border-black sm:pl-6">
            <button
              onClick={() => setSelectedSubjectId(null)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-black uppercase tracking-wider border-[3px] transition-all",
                selectedSubjectId === null ? "bg-[#00E5FF] border-black text-black shadow-[4px_4px_0_0_#000] translate-y-[-2px]" : "bg-white border-black text-black hover:bg-[#00E5FF]/50 hover:shadow-[2px_2px_0_0_#000]"
              )}
            >
              Todas
            </button>
            {subjects.map(sub => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-black uppercase tracking-wider border-[3px] transition-all",
                  selectedSubjectId === sub.id ? "bg-[#00E5FF] border-black text-black shadow-[4px_4px_0_0_#000] translate-y-[-2px]" : "bg-white border-black text-black hover:bg-[#00E5FF]/50 hover:shadow-[2px_2px_0_0_#000]"
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
                  "bg-white rounded-xl p-4 border-4 transition-all hover:translate-y-[-2px] shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000]",
                  color.border
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-10 h-10 rounded-full border-[3px] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_0_#000]", color.bg, color.border)}>
                      <User className={cn("w-5 h-5", color.text)} />
                    </div>
                    <div className="min-w-0 flex flex-col gap-1">
                      <p className="font-black text-lg truncate leading-tight">{prof.nombre}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground truncate max-w-[120px]" title={prof.subject_nombre}>
                          {prof.subject_nombre}
                        </span>
                        {prof.rol && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border-2 border-black",
                            prof.rol === "teoria" ? "bg-[#FFE66D] text-black" : "bg-[#00E5FF] text-black"
                          )}>
                            {prof.rol === "teoria" ? "Teoría" : "Práctica"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => openEditModal(prof)} className="p-1.5 rounded-lg bg-[#FFE66D] border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#000] transition-all">
                      <Edit2 className="w-3.5 h-3.5 text-black" />
                    </button>
                    <button onClick={() => handleDelete(prof.id)} className="p-1.5 rounded-lg bg-[#FF5C5C] border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#000] transition-all">
                      <Trash2 className="w-3.5 h-3.5 text-black" />
                    </button>
                  </div>
                </div>
                {prof.descripcion && (
                  <p className="text-sm font-medium text-muted-foreground mt-3 line-clamp-2 border-l-2 border-border pl-2">{prof.descripcion}</p>
                )}
                {profHours.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    {profHours.map(oh => {
                      const dayLabel = DAYS.find(d => d.key === oh.dia)?.label || oh.dia;
                      return (
                        <div key={oh.id} className={cn("text-xs font-bold rounded-lg px-2.5 py-1.5 flex items-center justify-between border-[3px] shadow-[2px_2px_0_0_#000]", color.bg, color.border)}>
                          <div className="flex items-center gap-1.5">
                            <Clock className={cn("w-3.5 h-3.5", color.text)} />
                            <span className={color.text}>{dayLabel}</span>
                          </div>
                          <span className={color.text}>{oh.hora_inicio.slice(0, 5)} – {oh.hora_fin.slice(0, 5)}</span>
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
      <div className="bg-white rounded-xl p-4 lg:p-6 border-4 border-black shadow-[6px_6px_0_0_#000]">
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
                    <div key={day.key} className="h-10 flex items-center justify-center text-sm font-black uppercase border-b-4 border-black">
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
                    const overlapStyles = calculateOverlaps(dayEntries);
                    
                    return (
                      <div key={day.key} className="relative border-l-[3px] border-black" style={{ height: `${HOURS.length * 48}px` }}>
                        {/* Grid lines */}
                        {HOURS.map((hour, i) => (
                          <div key={hour} className="absolute left-0 right-0 border-t-2 border-black/20" style={{ top: `${i * 48}px` }} />
                        ))}

                        {/* Schedule blocks */}
                        {dayEntries.map(entry => {
                          const color = SUBJECT_COLORS[entry.colorIndex % SUBJECT_COLORS.length];
                          const startPx = ((entry.startHour - 7) * 60 + entry.startMinute) * (48 / 60);
                          const endPx = ((entry.endHour - 7) * 60 + entry.endMinute) * (48 / 60);
                          const heightPx = endPx - startPx;
                          const overlap = overlapStyles.get(entry.id);

                          return (
                            <div
                              key={entry.id}
                              className={cn(
                                "absolute rounded-lg border-[3px] border-black flex flex-col justify-center px-2 cursor-pointer transition-all hover:scale-[1.03] hover:z-10 overflow-hidden shadow-[2px_2px_0_0_#000]",
                                color.bg
                              )}
                              style={{
                                top: `${startPx}px`,
                                height: `${Math.max(heightPx, 24)}px`,
                                width: overlap?.width || "calc(100% - 8px)",
                                left: overlap?.left || "4px",
                              }}
                              onMouseEnter={(e) => setTooltip({ entry, x: e.clientX, y: e.clientY })}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              <p className={cn("text-xs font-black truncate", color.text)}>{entry.professorName}</p>
                              {heightPx > 40 && (
                                <p className="text-[10px] font-bold text-black/70 truncate">{entry.subjectName}</p>
                              )}
                              {heightPx > 56 && (
                                <p className="text-[10px] font-bold text-black/70">
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
                      "px-3 py-1.5 rounded-md text-xs font-black uppercase border-[3px] border-black transition-all whitespace-nowrap",
                      mobileDayIndex === i ? "bg-[#FFE66D] shadow-[2px_2px_0_0_#000] translate-y-[-1px]" : "bg-white hover:bg-black/5"
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
                    <span className="w-12 text-xs font-bold text-muted-foreground text-right pr-2 -mt-2">{String(hour).padStart(2, "0")}:00</span>
                    <div className="flex-1 border-t-2 border-black/20" />
                  </div>
                ))}

                {(() => {
                  const dayEntries = scheduleEntries.filter(e => e.day === DAYS[mobileDayIndex].key);
                  const overlapStyles = calculateOverlaps(dayEntries);
                  return dayEntries.map(entry => {
                    const color = SUBJECT_COLORS[entry.colorIndex % SUBJECT_COLORS.length];
                    const startPx = ((entry.startHour - 7) * 60 + entry.startMinute) * (40 / 60);
                    const endPx = ((entry.endHour - 7) * 60 + entry.endMinute) * (40 / 60);
                    const heightPx = endPx - startPx;
                    const overlap = overlapStyles.get(entry.id);

                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "absolute rounded-lg border-[3px] border-black flex flex-col justify-center px-3 overflow-hidden shadow-[2px_2px_0_0_#000]",
                          color.bg
                        )}
                        style={{ 
                          top: `${startPx}px`, 
                          height: `${Math.max(heightPx, 28)}px`,
                          width: overlap ? `calc(${overlap.width} - 8px)` : "calc(100% - 64px)",
                          left: overlap ? `calc(48px + ((${overlap.left}) * (100% - 64px) / 100) + 4px)` : "56px"
                        }}
                      >
                        <p className={cn("text-sm font-black truncate", color.text)}>{entry.professorName}</p>
                        <p className="text-xs font-bold text-black/70 truncate">
                          {entry.subjectName} · {String(entry.startHour).padStart(2, "0")}:{String(entry.startMinute).padStart(2, "0")} – {String(entry.endHour).padStart(2, "0")}:{String(entry.endMinute).padStart(2, "0")}
                        </p>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white rounded-xl p-3 shadow-[4px_4px_0_0_#000] border-[3px] border-black pointer-events-none max-w-[250px]"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="font-black text-sm">{tooltip.entry.professorName}</p>
          <p className="text-xs font-bold">{tooltip.entry.subjectName}</p>
          {tooltip.entry.rol && (
            <p className="text-[10px] font-black uppercase tracking-wider bg-[#00E5FF] text-black border-2 border-black rounded px-1.5 py-0.5 inline-block mt-1">{tooltip.entry.rol === "teoria" ? "Teoría" : "Práctica"}</p>
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
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 border-4 border-black shadow-[8px_8px_0_0_#000]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-black uppercase text-xl text-black">
                {editingProfessor ? "Editar Profesor" : "Nuevo Profesor"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-[#FF5C5C] hover:shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] transition-all text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm font-black uppercase text-black/70">Nombre *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ej: Dr. García"
                  className="w-full mt-1 px-4 py-3 bg-white text-black rounded-lg border-[3px] border-black focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-all font-bold"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="text-sm font-black uppercase text-black/70">Materia *</label>
                <div className="mt-1">
                  <Select
                    value={formSubjectId}
                    onValueChange={setFormSubjectId}
                  >
                    <SelectTrigger className="w-full h-auto px-4 py-3 bg-white text-black rounded-lg border-[3px] border-black focus:ring-0 focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-all font-bold text-left truncate">
                      <SelectValue placeholder="Seleccionar materia..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] rounded-xl max-h-[200px]">
                      {(allSubjects || []).map(sub => (
                        <SelectItem key={sub.id} value={sub.id} className="font-bold focus:bg-black/5 cursor-pointer">
                          Año {sub.año} – {sub.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="text-sm font-black uppercase text-black/70">Rol (opcional)</label>
                <div className="mt-1">
                  <Select
                    value={formRol || "none"}
                    onValueChange={(val) => setFormRol(val === "none" ? "" : val)}
                  >
                    <SelectTrigger className="w-full h-auto px-4 py-3 bg-white text-black rounded-lg border-[3px] border-black focus:ring-0 focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-all font-bold text-left truncate">
                      <SelectValue placeholder="No especificado" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] rounded-xl">
                      <SelectItem value="none" className="font-bold focus:bg-black/5 cursor-pointer">No especificado</SelectItem>
                      <SelectItem value="teoria" className="font-bold focus:bg-black/5 cursor-pointer">Teoría</SelectItem>
                      <SelectItem value="practica" className="font-bold focus:bg-black/5 cursor-pointer">Práctica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-black uppercase text-black/70">Descripción (opcional)</label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Notas sobre el profesor..."
                  rows={2}
                  className="w-full mt-1 px-4 py-3 bg-white text-black rounded-lg border-[3px] border-black focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-all font-bold resize-none"
                />
              </div>

              {/* Color */}
              <div>
                <label className="text-sm font-black uppercase text-black/70">Color</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SUBJECT_COLORS.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => setFormColorIndex(i)}
                      className={cn(
                        "w-8 h-8 rounded-full border-[3px] border-black transition-all",
                        formColorIndex === i ? "scale-125 shadow-[2px_2px_0_0_#000]" : "hover:scale-110"
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
                  <label className="text-sm font-black uppercase text-black/70">Horarios de consulta</label>
                  <button onClick={addScheduleRow} className="text-xs font-black uppercase bg-[#00E5FF] text-black px-2 py-1 border-2 border-black rounded-md hover:translate-y-[-1px] hover:shadow-[2px_2px_0_0_#000] flex items-center gap-1 transition-all">
                    <Plus className="w-3 h-3" /> Agregar día
                  </button>
                </div>
                <div className="space-y-3 mt-3">
                  {formSchedules.map((sched, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#F4F4F5] border-[3px] border-black rounded-xl p-3 shadow-[2px_2px_0_0_#000]">
                      <div className="w-[120px]">
                        <Select
                          value={sched.dia}
                          onValueChange={(val) => updateScheduleRow(idx, "dia", val)}
                        >
                          <SelectTrigger className="w-full h-auto px-2 py-2 bg-white text-black rounded-lg border-2 border-black focus:ring-0 focus:outline-none font-bold text-xs truncate">
                            <SelectValue placeholder="Día" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-2 border-black shadow-[4px_4px_0_0_#000] rounded-xl">
                            {DAYS.map(d => (
                              <SelectItem key={d.key} value={d.key} className="font-bold focus:bg-black/5 cursor-pointer text-xs">{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <input
                        type="time"
                        value={sched.hora_inicio}
                        onChange={e => updateScheduleRow(idx, "hora_inicio", e.target.value)}
                        className="w-[100px] px-2 py-2 rounded-lg bg-white border-2 border-black font-bold text-xs focus:outline-none"
                      />
                      <span className="text-black font-black text-xs">a</span>
                      <input
                        type="time"
                        value={sched.hora_fin}
                        onChange={e => updateScheduleRow(idx, "hora_fin", e.target.value)}
                        className="w-[100px] px-2 py-2 rounded-lg bg-white border-2 border-black font-bold text-xs focus:outline-none"
                      />
                      {formSchedules.length > 1 && (
                        <button onClick={() => removeScheduleRow(idx)} className="p-1.5 ml-auto rounded-lg bg-[#FF5C5C] border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#000] transition-all">
                          <X className="w-4 h-4 text-black" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-white text-black font-black uppercase tracking-wider border-[3px] border-black hover:bg-[#FF5C5C] hover:shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formSubjectId}
                className="flex-1 px-4 py-3 rounded-xl bg-[#00E5FF] text-black font-black uppercase tracking-wider border-[3px] border-black hover:shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 disabled:hover:bg-[#00E5FF]"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : editingProfessor ? "Guardar" : "Agregar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
