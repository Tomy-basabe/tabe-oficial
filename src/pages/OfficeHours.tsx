import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubjects } from "@/hooks/useSubjects";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/contexts/ConfirmModalContext";
import {
  Clock,
  Plus,
  Trash2,
  X,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  GraduationCap,
  Search,
  RotateCcw,
  CalendarDays,
  LayoutGrid,
  Check,
  Calendar,
  BookOpen,
  Copy,
  ExternalLink,
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { SubjectSelect } from "@/components/subjects/SubjectSelect";
import { Link } from "react-router-dom";

// Paleta refinada estilo Notion / ChatGPT (pasteles armoniosos y dark tints)
export const PROFESSOR_COLOR_THEMES = [
  {
    name: "Azul",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60",
    block: "bg-blue-500/15 border-blue-500/35 text-blue-950 dark:text-blue-100 hover:bg-blue-500/25",
    avatarBg: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
    solid: "#3b82f6",
  },
  {
    name: "Esmeralda",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
    block: "bg-emerald-500/15 border-emerald-500/35 text-emerald-950 dark:text-emerald-100 hover:bg-emerald-500/25",
    avatarBg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    solid: "#10b981",
  },
  {
    name: "Violeta",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60",
    block: "bg-violet-500/15 border-violet-500/35 text-violet-950 dark:text-violet-100 hover:bg-violet-500/25",
    avatarBg: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
    solid: "#8b5cf6",
  },
  {
    name: "Ámbar",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
    block: "bg-amber-500/15 border-amber-500/35 text-amber-950 dark:text-amber-100 hover:bg-amber-500/25",
    avatarBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    solid: "#f59e0b",
  },
  {
    name: "Rosa",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
    block: "bg-rose-500/15 border-rose-500/35 text-rose-950 dark:text-rose-100 hover:bg-rose-500/25",
    avatarBg: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    solid: "#f43f5e",
  },
  {
    name: "Cian",
    badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60",
    block: "bg-cyan-500/15 border-cyan-500/35 text-cyan-950 dark:text-cyan-100 hover:bg-cyan-500/25",
    avatarBg: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
    dot: "bg-cyan-500",
    solid: "#06b6d4",
  },
  {
    name: "Naranja",
    badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60",
    block: "bg-orange-500/15 border-orange-500/35 text-orange-950 dark:text-orange-100 hover:bg-orange-500/25",
    avatarBg: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
    solid: "#f97316",
  },
  {
    name: "Índigo",
    badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
    block: "bg-indigo-500/15 border-indigo-500/35 text-indigo-950 dark:text-indigo-100 hover:bg-indigo-500/25",
    avatarBg: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-500",
    solid: "#6366f1",
  },
  {
    name: "Teal",
    badge: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60",
    block: "bg-teal-500/15 border-teal-500/35 text-teal-950 dark:text-teal-100 hover:bg-teal-500/25",
    avatarBg: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
    dot: "bg-teal-500",
    solid: "#14b8a6",
  },
  {
    name: "Zinc",
    badge: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/60",
    block: "bg-zinc-500/15 border-zinc-400/35 text-zinc-950 dark:text-zinc-100 hover:bg-zinc-500/25",
    avatarBg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
    dot: "bg-zinc-500",
    solid: "#71717a",
  },
];

const DAYS = [
  { key: "lunes", label: "Lunes", short: "Lun", dayNum: 1 },
  { key: "martes", label: "Martes", short: "Mar", dayNum: 2 },
  { key: "miercoles", label: "Miércoles", short: "Mié", dayNum: 3 },
  { key: "jueves", label: "Jueves", short: "Jue", dayNum: 4 },
  { key: "viernes", label: "Viernes", short: "Vie", dayNum: 5 },
  { key: "sabado", label: "Sábado", short: "Sáb", dayNum: 6 },
];

const DAY_KEYS_BY_WEEKDAY: Record<number, string> = {
  1: "lunes",
  2: "martes",
  3: "miercoles",
  4: "jueves",
  5: "viernes",
  6: "sabado",
};

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
  subject_year?: number;
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
  descripcion: string | null;
  day: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  colorIndex: number;
  professorId: string;
}

export default function OfficeHours() {
  const { confirm } = useConfirm();
  const { user, isGuest } = useAuth();
  const { rawSubjects: allSubjects, getYears, loading: subjectsLoading } = useSubjects();

  const [professors, setProfessors] = useState<Professor[]>([]);
  const [officeHours, setOfficeHours] = useState<OfficeHour[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: Grilla o Tarjetas
  const [viewMode, setViewMode] = useState<"grid" | "cards">("grid");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  // Modal State: Formulario Crear / Editar
  const [showModal, setShowModal] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState<Professor | null>(null);
  const [formName, setFormName] = useState("");
  const [formRol, setFormRol] = useState<string>("");
  const [formDesc, setFormDesc] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formColorIndex, setFormColorIndex] = useState(0);
  const [formSchedules, setFormSchedules] = useState<{ dia: string; hora_inicio: string; hora_fin: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Quick View / Modal de Detalle de Consulta
  const [detailEntry, setDetailEntry] = useState<ScheduleEntry | null>(null);

  // Floating Tooltip
  const [tooltip, setTooltip] = useState<{ entry: ScheduleEntry; x: number; y: number } | null>(null);

  // Mobile day selector
  const todayWeekday = new Date().getDay();
  const initialMobileDay = todayWeekday >= 1 && todayWeekday <= 6 ? todayWeekday - 1 : 0;
  const [mobileDayIndex, setMobileDayIndex] = useState(initialMobileDay);

  const years = getYears();

  useEffect(() => {
    if (selectedYear !== "all" && !years.map(String).includes(selectedYear)) {
      setSelectedYear("all");
    }
  }, [years, selectedYear]);

  // Materias filtradas según el año seleccionado
  const availableSubjects = useMemo(() => {
    if (!allSubjects) return [];
    if (selectedYear === "all") return allSubjects;
    return allSubjects.filter(s => String(s.año) === selectedYear);
  }, [allSubjects, selectedYear]);

  // Cargar profesores y horarios
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

      const enriched: Professor[] = (profResult.data || []).map((p: any) => {
        const sub = allSubjects?.find(s => s.id === p.subject_id);
        return {
          ...p,
          subject_nombre: sub?.nombre || "Sin materia",
          subject_year: sub?.año,
        };
      });
      setProfessors(enriched);
      setOfficeHours(hoursResult.data || []);
    } catch (err) {
      console.error("Error fetching professors:", err);
      toast.error("Error al cargar profesores");
    } finally {
      setLoading(false);
    }
  }, [user?.id, isGuest, allSubjects]);

  useEffect(() => {
    fetchData();
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(safetyTimer);
  }, [fetchData]);

  // Parse time string to hours+minutes
  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return { hour: h, minute: m || 0 };
  };

  // Calcular duración en formato legible
  const formatDuration = (startStr: string, endStr: string) => {
    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = endStr.split(":").map(Number);
    const totalMinutes = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
    if (totalMinutes <= 0) return null;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  // Filtrado de profesores
  const filteredProfessors = useMemo(() => {
    return professors.filter((p) => {
      // Búsqueda por texto (nombre, materia, notas)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.nombre.toLowerCase().includes(q);
        const matchSubject = (p.subject_nombre || "").toLowerCase().includes(q);
        const matchDesc = (p.descripcion || "").toLowerCase().includes(q);
        const matchRole = p.rol ? (p.rol === "teoria" ? "teoría teoria" : "práctica practica").includes(q) : false;
        if (!matchName && !matchSubject && !matchDesc && !matchRole) return false;
      }

      // Filtro por año
      if (selectedYear !== "all") {
        if (String(p.subject_year) !== selectedYear) return false;
      }

      // Filtro por materia
      if (selectedSubjectId !== "all") {
        if (p.subject_id !== selectedSubjectId) return false;
      }

      // Filtro por rol
      if (selectedRole !== "all") {
        if (selectedRole === "none" && p.rol) return false;
        if (selectedRole !== "none" && p.rol !== selectedRole) return false;
      }

      return true;
    });
  }, [professors, searchQuery, selectedYear, selectedSubjectId, selectedRole]);

  // Construir schedule entries para la grilla
  const scheduleEntries = useMemo((): ScheduleEntry[] => {
    const allowedProfIds = new Set(filteredProfessors.map(p => p.id));

    return officeHours
      .filter(oh => allowedProfIds.has(oh.professor_id))
      .map(oh => {
        const prof = professors.find(p => p.id === oh.professor_id)!;
        const start = parseTime(oh.hora_inicio);
        const end = parseTime(oh.hora_fin);
        return {
          id: oh.id,
          professorName: prof.nombre,
          subjectName: prof.subject_nombre || "",
          rol: prof.rol,
          descripcion: prof.descripcion,
          day: oh.dia,
          startHour: start.hour,
          startMinute: start.minute,
          endHour: end.hour,
          endMinute: end.minute,
          colorIndex: prof.color_index,
          professorId: prof.id,
        };
      });
  }, [filteredProfessors, officeHours, professors]);

  // Estadísticas rápidas superiores
  const stats = useMemo(() => {
    const totalHoursCovered = officeHours.reduce((acc, curr) => {
      const [sh, sm] = curr.hora_inicio.split(":").map(Number);
      const [eh, em] = curr.hora_fin.split(":").map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      return acc + (diff > 0 ? diff / 60 : 0);
    }, 0);

    const uniqueSubjects = new Set(professors.map(p => p.subject_id)).size;

    return {
      profCount: professors.length,
      hoursCount: officeHours.length,
      weeklyHours: Math.round(totalHoursCovered * 10) / 10,
      uniqueSubjects,
    };
  }, [professors, officeHours]);

  // Modal: Abrir nuevo profesor
  const openNewModal = () => {
    setEditingProfessor(null);
    setFormName("");
    setFormRol("");
    setFormDesc("");
    setFormSubjectId(selectedSubjectId !== "all" ? selectedSubjectId : "");
    setFormColorIndex(Math.floor(Math.random() * PROFESSOR_COLOR_THEMES.length));
    setFormSchedules([{ dia: "lunes", hora_inicio: "08:00", hora_fin: "10:00" }]);
    setShowModal(true);
  };

  // Modal: Editar profesor
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
    setDetailEntry(null);
    setShowModal(true);
  };

  // Guardar profesor y horarios
  const handleSave = async () => {
    if (!user || !formName.trim() || !formSubjectId) {
      toast.error("Completá el nombre del profesor y la materia");
      return;
    }
    setSaving(true);
    try {
      if (editingProfessor) {
        // Actualizar docente
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

        // Eliminar horarios anteriores y reinsertar
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
        // Crear docente
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

        // Insertar horarios
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
        toast.success("Profesor agregado con éxito");
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

  // Eliminar profesor
  const handleDeleteProfessor = async (profId: string) => {
    const profToDelete = professors.find(p => p.id === profId);
    const ok = await confirm({
      title: "¿Eliminar profesor?",
      description: `¿Estás seguro de eliminar a "${profToDelete?.nombre || "este profesor"}" y sus horarios de consulta asignados? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar profesor",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await supabase.from("professor_office_hours").delete().eq("professor_id", profId);
      const { error } = await supabase.from("professors").delete().eq("id", profId);
      if (error) throw error;
      toast.success("Profesor eliminado correctamente");
      setDetailEntry(null);
      fetchData();
    } catch (err: any) {
      console.error("Error deleting professor:", err);
      toast.error(err?.message || "Error al eliminar profesor");
    }
  };

  // Copiar datos de consulta al portapapeles
  const handleCopyProfessorInfo = (prof: Professor) => {
    const profHours = officeHours.filter(oh => oh.professor_id === prof.id);
    const lines = [
      `👨‍🏫 Consulta con ${prof.nombre}`,
      `📚 Materia: ${prof.subject_nombre || "General"}${prof.rol ? ` (${prof.rol === "teoria" ? "Teoría" : "Práctica"})` : ""}`,
      prof.descripcion ? `📍 Notas: ${prof.descripcion}` : "",
      "⏰ Horarios de consulta:",
      ...profHours.map(oh => {
        const d = DAYS.find(day => day.key === oh.dia)?.label || oh.dia;
        return `  • ${d}: ${oh.hora_inicio.slice(0, 5)} a ${oh.hora_fin.slice(0, 5)}`;
      }),
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Información copiada al portapapeles");
  };

  // Manipulación de horarios en formulario modal
  const addScheduleRow = () => {
    setFormSchedules(prev => [...prev, { dia: "lunes", hora_inicio: "08:00", hora_fin: "10:00" }]);
  };

  const removeScheduleRow = (idx: number) => {
    setFormSchedules(prev => prev.filter((_, i) => i !== idx));
  };

  const updateScheduleRow = (idx: number, field: string, value: string) => {
    setFormSchedules(prev => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  // Superposición de horarios en grilla
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
        const overlapsWithGroup = group.some(item => {
          const itemStart = item.startHour * 60 + item.startMinute;
          const itemEnd = item.endHour * 60 + item.endMinute;
          const entryEnd = entry.endHour * 60 + entry.endMinute;
          return entryStart < itemEnd && entryEnd > itemStart;
        });

        if (overlapsWithGroup) {
          group.push(entry);
          placed = true;
          break;
        }
      }
      if (!placed) groups.push([entry]);
    });

    const results = new Map<string, { width: string; left: string }>();
    groups.forEach(group => {
      const width = 100 / group.length;
      group.forEach((entry, i) => {
        results.set(entry.id, {
          width: `${width}%`,
          left: `${width * i}%`,
        });
      });
    });
    return results;
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedYear !== "all" || selectedSubjectId !== "all" || selectedRole !== "all"
  );

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedYear("all");
    setSelectedSubjectId("all");
    setSelectedRole("all");
  };

  // Indicador de día actual
  const currentDayKey = DAY_KEYS_BY_WEEKDAY[todayWeekday] || "";
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const isTimeInGrid = currentHour >= 7 && currentHour < 22;
  const currentTimePx = isTimeInGrid ? ((currentHour - 7) * 60 + currentMinute) * (52 / 60) : null;

  if (loading && professors.length === 0 && !isGuest) {
    return <LoadingScreen message="Cargando Consultas..." submessage="Sincronizando horarios de docentes..." />;
  }

  return (
    <div className="tabe-page p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── HEADER NOTION/CHATGPT STYLE ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <Link to="/carrera" title="Volver a Mi Carrera">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Clock className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
                Consultas
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                {professors.length} {professors.length === 1 ? "profesor" : "profesores"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Horarios de atención docente organizados por materia y grilla semanal
            </p>
          </div>
        </div>

        {/* View Toggle & New Professor Button */}
        <div className="flex items-center gap-2.5 self-start md:self-center">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Grilla Semanal
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === "cards"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Profesores
            </button>
          </div>

          <Button
            onClick={openNewModal}
            className="h-9 px-3.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Profesor</span>
          </Button>
        </div>
      </div>

      {/* ── METRIC CHIPS NOTION STYLE ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block font-medium">Docentes Registrados</span>
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">{stats.profCount}</span>
        </div>
        <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block font-medium">Bloques Semanales</span>
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">{stats.hoursCount}</span>
        </div>
        <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block font-medium">Horas de Atención</span>
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">{stats.weeklyHours}h / sem</span>
        </div>
        <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block font-medium">Materias con Consulta</span>
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">{stats.uniqueSubjects}</span>
        </div>
      </div>

      {/* ── NOTION-STYLE FILTER & SEARCH BAR ── */}
      <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por profesor, materia o notas..."
              className="w-full h-8.5 pl-9 pr-8 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            {/* Year Select */}
            <Select
              value={selectedYear}
              onValueChange={(val) => {
                setSelectedYear(val);
                setSelectedSubjectId("all");
              }}
            >
              <SelectTrigger className="h-8.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-3 min-w-[125px] shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 focus:ring-1 focus:ring-zinc-400">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent className="border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-md rounded-xl shadow-md text-xs">
                <SelectItem value="all">Todos los años</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}° Año
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Subject Select */}
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
              <SelectTrigger className="h-8.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-3 min-w-[170px] max-w-[240px] shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 focus:ring-1 focus:ring-zinc-400 truncate">
                <SelectValue placeholder="Materia" />
              </SelectTrigger>
              <SelectContent className="border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-md rounded-xl shadow-md text-xs max-h-[280px]">
                <SelectItem value="all">Todas las materias</SelectItem>
                {availableSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="truncate">
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Role Select */}
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="h-8.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-3 min-w-[125px] shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 focus:ring-1 focus:ring-zinc-400">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent className="border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-md rounded-xl shadow-md text-xs">
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="teoria">Teoría</SelectItem>
                <SelectItem value="practica">Práctica</SelectItem>
                <SelectItem value="none">Sin rol específico</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8.5 px-2.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg flex items-center gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                title="Limpiar filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpiar</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Summary Pill Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px] text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span>
              Mostrando <strong className="text-zinc-800 dark:text-zinc-200">{filteredProfessors.length}</strong> {filteredProfessors.length === 1 ? "profesor" : "profesores"} ·{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">{scheduleEntries.length}</strong> {scheduleEntries.length === 1 ? "bloque horario" : "bloques horarios"}
            </span>
            {hasActiveFilters && (
              <span className="text-zinc-400 dark:text-zinc-500 font-medium">· Filtros activos</span>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              Teoría
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Práctica
            </span>
          </div>
        </div>
      </div>

      {/* ── PROFESSOR CARDS (VISIBLE EN MODO CARDS) ── */}
      {viewMode === "cards" && (
        <div>
          {filteredProfessors.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 sm:p-16 text-center rounded-2xl bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-500 mb-3 border border-zinc-200/60 dark:border-zinc-700/60">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                No se encontraron profesores
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
                {hasActiveFilters
                  ? "No hay docentes que coincidan con los filtros seleccionados."
                  : "Aún no tienes docentes cargados para tus consultas. Agrega a tu primer profesor."}
              </p>
              <div className="flex gap-2.5 mt-5">
                {hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs rounded-lg cursor-pointer">
                    Limpiar filtros
                  </Button>
                ) : (
                  <Button
                    onClick={openNewModal}
                    size="sm"
                    className="text-xs rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Agregar Profesor
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProfessors.map((prof) => {
                const theme = PROFESSOR_COLOR_THEMES[prof.color_index % PROFESSOR_COLOR_THEMES.length];
                const profHours = officeHours.filter((oh) => oh.professor_id === prof.id);

                return (
                  <div
                    key={prof.id}
                    className="group bg-white dark:bg-[#18181b] rounded-xl p-4 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs hover:shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-xs flex-shrink-0 border",
                              theme.avatarBg,
                              theme.badge
                            )}
                          >
                            {prof.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                              {prof.nombre}
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5" title={prof.subject_nombre}>
                              {prof.subject_nombre}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopyProfessorInfo(prof)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
                            title="Copiar información de consulta"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(prof)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
                            title="Editar profesor"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProfessor(prof.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Eliminar profesor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Role Pill & Year */}
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        {prof.rol ? (
                          <span
                            className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                              prof.rol === "teoria"
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                            )}
                          >
                            {prof.rol === "teoria" ? "Teoría" : "Práctica"}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200/60 dark:border-zinc-700/60">
                            General
                          </span>
                        )}

                        {prof.subject_year && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            · {prof.subject_year}° Año
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {prof.descripcion && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 bg-zinc-50 dark:bg-zinc-900/40 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/50">
                          {prof.descripcion}
                        </p>
                      )}
                    </div>

                    {/* Office hours chips */}
                    <div className="mt-3.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          Horarios asignados:
                        </span>
                        <span className="font-mono">{profHours.length}</span>
                      </div>

                      {profHours.length > 0 ? (
                        profHours.map((oh) => {
                          const dayLabel = DAYS.find((d) => d.key === oh.dia)?.label || oh.dia;
                          const dur = formatDuration(oh.hora_inicio, oh.hora_fin);
                          return (
                            <div
                              key={oh.id}
                              className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-zinc-800 dark:text-zinc-200">{dayLabel}</span>
                                {dur && (
                                  <span className="text-[10px] text-zinc-400">({dur})</span>
                                )}
                              </div>
                              <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                                {oh.hora_inicio.slice(0, 5)} – {oh.hora_fin.slice(0, 5)}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-[11px] text-zinc-400 italic py-1 text-center">
                          Sin horarios asignados
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TIMELINE VISUAL (GRILLA SEMANAL ESTILO NOTION CALENDAR) ── */}
      {viewMode === "grid" && (
        <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 sm:p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <div>
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                Grilla Semanal de Consultas
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Distribución de clases de apoyo de 07:00 a 22:00
              </p>
            </div>

            {/* Quick stats / actions */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {scheduleEntries.length} {scheduleEntries.length === 1 ? "consulta agendada" : "consultas agendadas"}
              </span>
            </div>
          </div>

          {scheduleEntries.length === 0 ? (
            <div className="my-6 p-8 sm:p-14 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  No hay horarios de consulta en esta vista
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {hasActiveFilters
                    ? "No hay horarios que coincidan con la búsqueda o filtros actuales."
                    : "Agrega a tus profesores con sus días y horarios de consulta para visualizarlos en la grilla semanal."}
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                {hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs rounded-lg cursor-pointer">
                    Limpiar filtros
                  </Button>
                ) : (
                  <Button
                    onClick={openNewModal}
                    size="sm"
                    className="text-xs rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Agregar Profesor
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Timeline */}
              <div className="hidden lg:block overflow-x-auto">
                <div className="min-w-[760px]">
                  {/* Header Row: Days */}
                  <div className="grid grid-cols-[64px_repeat(6,1fr)] gap-0 border-b border-zinc-200 dark:border-zinc-800/80 pb-2">
                    <div className="h-8 flex items-center justify-center text-[11px] font-mono text-zinc-400">
                      Hora
                    </div>
                    {DAYS.map((day) => {
                      const isToday = day.key === currentDayKey;
                      return (
                        <div
                          key={day.key}
                          className={cn(
                            "h-8 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors",
                            isToday
                              ? "text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/30"
                              : "text-zinc-600 dark:text-zinc-400"
                          )}
                        >
                          <span>{day.label}</span>
                          {isToday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" title="Hoy" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Body: Hours + Day Columns */}
                  <div className="grid grid-cols-[64px_repeat(6,1fr)] gap-0 relative">
                    {/* Hours labels column */}
                    <div className="relative" style={{ height: `${HOURS.length * 52}px` }}>
                      {HOURS.map((hour, i) => (
                        <div
                          key={hour}
                          className="absolute left-0 right-0 flex items-start justify-end pr-3"
                          style={{ top: `${i * 52 - 8}px` }}
                        >
                          <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                            {String(hour).padStart(2, "0")}:00
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    {DAYS.map((day) => {
                      const dayEntries = scheduleEntries.filter((e) => e.day === day.key);
                      const overlapStyles = calculateOverlaps(dayEntries);
                      const isToday = day.key === currentDayKey;

                      return (
                        <div
                          key={day.key}
                          className={cn(
                            "relative border-l border-zinc-100 dark:border-zinc-800/70 transition-colors",
                            isToday && "bg-blue-50/20 dark:bg-blue-950/10"
                          )}
                          style={{ height: `${HOURS.length * 52}px` }}
                        >
                          {/* Grid horizontal lines */}
                          {HOURS.map((hour, i) => (
                            <div
                              key={hour}
                              className="absolute left-0 right-0 border-t border-zinc-100 dark:border-zinc-800/40"
                              style={{ top: `${i * 52}px` }}
                            />
                          ))}

                          {/* Current Time Indicator Line (Notion Calendar Style) */}
                          {isToday && currentTimePx !== null && (
                            <div
                              className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                              style={{ top: `${currentTimePx}px` }}
                            >
                              <div className="w-2 h-2 rounded-full bg-rose-500 -ml-1 shadow-xs" />
                              <div className="flex-1 border-t-2 border-rose-500/80" />
                            </div>
                          )}

                          {/* Schedule blocks */}
                          {dayEntries.map((entry) => {
                            const theme = PROFESSOR_COLOR_THEMES[entry.colorIndex % PROFESSOR_COLOR_THEMES.length];
                            const startPx = ((entry.startHour - 7) * 60 + entry.startMinute) * (52 / 60);
                            const endPx = ((entry.endHour - 7) * 60 + entry.endMinute) * (52 / 60);
                            const heightPx = endPx - startPx;
                            const overlap = overlapStyles.get(entry.id);

                            return (
                              <div
                                key={entry.id}
                                onClick={() => setDetailEntry(entry)}
                                className={cn(
                                  "absolute rounded-lg border flex flex-col justify-center px-2.5 py-1 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs hover:z-20 overflow-hidden shadow-2xs backdrop-blur-xs",
                                  theme.block
                                )}
                                style={{
                                  top: `${startPx}px`,
                                  height: `${Math.max(heightPx, 28)}px`,
                                  width: overlap?.width || "calc(100% - 8px)",
                                  left: overlap?.left || "4px",
                                }}
                                onMouseEnter={(e) => setTooltip({ entry, x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setTooltip(null)}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", theme.dot)} />
                                  <p className="text-xs font-semibold truncate leading-tight">
                                    {entry.professorName}
                                  </p>
                                </div>
                                {heightPx > 42 && (
                                  <p className="text-[10px] opacity-80 truncate mt-0.5">
                                    {entry.subjectName}
                                  </p>
                                )}
                                {heightPx > 58 && (
                                  <p className="text-[10px] font-mono opacity-70 mt-0.5">
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

              {/* Mobile Timeline (Day slider) */}
              <div className="lg:hidden">
                {/* Day selector carousel */}
                <div className="flex items-center justify-between mb-4 bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                  <button
                    onClick={() => setMobileDayIndex(Math.max(0, mobileDayIndex - 1))}
                    disabled={mobileDayIndex === 0}
                    className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {DAYS[mobileDayIndex].label}
                    </span>
                    {DAYS[mobileDayIndex].key === currentDayKey && (
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                        Hoy
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setMobileDayIndex(Math.min(5, mobileDayIndex + 1))}
                    disabled={mobileDayIndex === 5}
                    className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Day tabs pills */}
                <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
                  {DAYS.map((day, i) => (
                    <button
                      key={day.key}
                      onClick={() => setMobileDayIndex(i)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer",
                        mobileDayIndex === i
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70"
                      )}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>

                {/* Mobile schedule content */}
                <div className="relative" style={{ height: `${HOURS.length * 44}px` }}>
                  {HOURS.map((hour, i) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 flex items-start"
                      style={{ top: `${i * 44}px`, height: "44px" }}
                    >
                      <span className="w-12 text-[11px] font-mono text-zinc-400 text-right pr-2.5 -mt-2">
                        {String(hour).padStart(2, "0")}:00
                      </span>
                      <div className="flex-1 border-t border-zinc-100 dark:border-zinc-800/40" />
                    </div>
                  ))}

                  {/* Mobile Current Time line */}
                  {DAYS[mobileDayIndex].key === currentDayKey && isTimeInGrid && (
                    <div
                      className="absolute left-12 right-0 z-30 pointer-events-none flex items-center"
                      style={{ top: `${((currentHour - 7) * 60 + currentMinute) * (44 / 60)}px` }}
                    >
                      <div className="w-2 h-2 rounded-full bg-rose-500 -ml-1" />
                      <div className="flex-1 border-t-2 border-rose-500/80" />
                    </div>
                  )}

                  {(() => {
                    const dayEntries = scheduleEntries.filter((e) => e.day === DAYS[mobileDayIndex].key);
                    const overlapStyles = calculateOverlaps(dayEntries);
                    return dayEntries.map((entry) => {
                      const theme = PROFESSOR_COLOR_THEMES[entry.colorIndex % PROFESSOR_COLOR_THEMES.length];
                      const startPx = ((entry.startHour - 7) * 60 + entry.startMinute) * (44 / 60);
                      const endPx = ((entry.endHour - 7) * 60 + entry.endMinute) * (44 / 60);
                      const heightPx = endPx - startPx;
                      const overlap = overlapStyles.get(entry.id);

                      return (
                        <div
                          key={entry.id}
                          onClick={() => setDetailEntry(entry)}
                          className={cn(
                            "absolute rounded-lg border flex flex-col justify-center px-3 py-1 overflow-hidden shadow-2xs backdrop-blur-xs cursor-pointer",
                            theme.block
                          )}
                          style={{
                            top: `${startPx}px`,
                            height: `${Math.max(heightPx, 32)}px`,
                            width: overlap ? `calc(${overlap.width} - 8px)` : "calc(100% - 64px)",
                            left: overlap ? `calc(52px + ((${overlap.left}) * (100% - 64px) / 100) + 4px)` : "56px",
                          }}
                        >
                          <p className="text-xs font-semibold truncate leading-tight">
                            {entry.professorName}
                          </p>
                          <p className="text-[10px] opacity-80 truncate">
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
      )}

      {/* ── NOTION / CHATGPT HOVER TOOLTIP ── */}
      {tooltip && !detailEntry && (
        <div
          className="fixed z-50 bg-zinc-900/95 dark:bg-zinc-950/95 text-white rounded-xl p-3 shadow-xl border border-zinc-800 backdrop-blur-md pointer-events-none max-w-[260px] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: tooltip.x + 14, top: tooltip.y - 12 }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                PROFESSOR_COLOR_THEMES[tooltip.entry.colorIndex % PROFESSOR_COLOR_THEMES.length].dot
              )}
            />
            <p className="font-semibold text-xs text-zinc-100 truncate">{tooltip.entry.professorName}</p>
          </div>
          <p className="text-[11px] text-zinc-300 font-medium">{tooltip.entry.subjectName}</p>
          {tooltip.entry.rol && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 inline-block mt-1.5">
              {tooltip.entry.rol === "teoria" ? "Teoría" : "Práctica"}
            </span>
          )}
          <p className="text-[11px] font-mono mt-1.5 text-zinc-400">
            {DAYS.find((d) => d.key === tooltip.entry.day)?.label}: {String(tooltip.entry.startHour).padStart(2, "0")}:{String(tooltip.entry.startMinute).padStart(2, "0")} – {String(tooltip.entry.endHour).padStart(2, "0")}:{String(tooltip.entry.endMinute).padStart(2, "0")}
          </p>
        </div>
      )}

      {/* ── NOTION QUICK VIEW POPOVER / MODAL DE DETALLE DE CONSULTA ── */}
      {detailEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDetailEntry(null)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Top Bar with Badge & Close */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-xs border",
                    PROFESSOR_COLOR_THEMES[detailEntry.colorIndex % PROFESSOR_COLOR_THEMES.length].avatarBg,
                    PROFESSOR_COLOR_THEMES[detailEntry.colorIndex % PROFESSOR_COLOR_THEMES.length].badge
                  )}
                >
                  {detailEntry.professorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                    {detailEntry.professorName}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {detailEntry.subjectName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailEntry(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Role & Day details */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-zinc-200/70 dark:border-zinc-800/70 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Día de atención:
                </span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 capitalize">
                  {DAYS.find((d) => d.key === detailEntry.day)?.label}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Horario:
                </span>
                <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                  {String(detailEntry.startHour).padStart(2, "0")}:{String(detailEntry.startMinute).padStart(2, "0")} – {String(detailEntry.endHour).padStart(2, "0")}:{String(detailEntry.endMinute).padStart(2, "0")}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Modalidad / Rol:
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                    detailEntry.rol === "teoria"
                      ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60"
                      : detailEntry.rol === "practica"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/60"
                  )}
                >
                  {detailEntry.rol === "teoria" ? "Teoría" : detailEntry.rol === "practica" ? "Práctica" : "General"}
                </span>
              </div>

              {detailEntry.descripcion && (
                <div className="pt-2 mt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400 block mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Notas / Ubicación:
                  </span>
                  <p className="text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
                    {detailEntry.descripcion}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions in Detail Modal */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={() => {
                  const targetProf = professors.find((p) => p.id === detailEntry.professorId);
                  if (targetProf) handleCopyProfessorInfo(targetProf);
                }}
                className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                title="Copiar datos al portapapeles"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const targetProf = professors.find((p) => p.id === detailEntry.professorId);
                    if (targetProf) openEditModal(targetProf);
                  }}
                  className="h-8.5 px-3 text-xs rounded-lg border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setDetailEntry(null)}
                  className="h-8.5 px-3.5 text-xs rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white cursor-pointer"
                >
                  Listo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTION/CHATGPT STYLE MODAL: CREAR / EDITAR PROFESOR ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <User className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                  {editingProfessor ? "Editar Profesor" : "Nuevo Profesor"}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Ingresá los datos del docente y definí sus días y horarios de consulta
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Professor Name */}
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Nombre del docente <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Dr. García, Ing. Martínez..."
                  className="w-full mt-1 h-9 px-3 text-xs bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder:text-zinc-400"
                />
              </div>

              {/* Subject Select */}
              <SubjectSelect
                value={formSubjectId}
                onChange={setFormSubjectId}
                placeholder="Seleccionar materia..."
                allowNone={false}
                showYearFilter={true}
                label="Materia"
                required={true}
              />

              {/* Academic Role */}
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Rol académico
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "", label: "General / Ambos" },
                    { value: "teoria", label: "Teoría" },
                    { value: "practica", label: "Práctica" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFormRol(item.value)}
                      className={cn(
                        "h-8.5 rounded-lg text-xs font-medium border transition-all cursor-pointer text-center",
                        formRol === item.value
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-2xs"
                          : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description / Notes */}
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Ej: Aula 302, link de Zoom, modalidad de consulta..."
                  rows={2}
                  className="w-full mt-1 p-2.5 text-xs bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all resize-none placeholder:text-zinc-400"
                />
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Color de identificación
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROFESSOR_COLOR_THEMES.map((theme, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormColorIndex(i)}
                      className={cn(
                        "w-7 h-7 rounded-full transition-transform flex items-center justify-center cursor-pointer border border-black/10 dark:border-white/10",
                        formColorIndex === i ? "scale-115 ring-2 ring-offset-2 ring-zinc-400 dark:ring-zinc-500" : "hover:scale-105 opacity-85 hover:opacity-100"
                      )}
                      style={{ backgroundColor: theme.solid }}
                      title={theme.name}
                    >
                      {formColorIndex === i && <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedules Section */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    Días y horarios de consulta
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addScheduleRow}
                    className="h-7 px-2.5 text-xs text-zinc-700 dark:text-zinc-300 rounded-lg border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Agregar día</span>
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {formSchedules.map((sched, idx) => {
                    const dur = formatDuration(sched.hora_inicio, sched.hora_fin);
                    return (
                      <div
                        key={idx}
                        className="flex flex-col gap-2 bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-2.5 shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          {/* Day Select */}
                          <div className="w-[110px] sm:w-[130px]">
                            <Select
                              value={sched.dia}
                              onValueChange={(val) => updateScheduleRow(idx, "dia", val)}
                            >
                              <SelectTrigger className="h-8 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-2.5">
                                <SelectValue placeholder="Día" />
                              </SelectTrigger>
                              <SelectContent className="border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-md rounded-xl shadow-md text-xs">
                                {DAYS.map((d) => (
                                  <SelectItem key={d.key} value={d.key} className="text-xs">
                                    {d.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Start Time */}
                          <input
                            type="time"
                            value={sched.hora_inicio}
                            onChange={(e) => updateScheduleRow(idx, "hora_inicio", e.target.value)}
                            className="h-8 w-[85px] sm:w-[95px] px-2 rounded-lg bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />

                          <span className="text-zinc-400 text-xs">a</span>

                          {/* End Time */}
                          <input
                            type="time"
                            value={sched.hora_fin}
                            onChange={(e) => updateScheduleRow(idx, "hora_fin", e.target.value)}
                            className="h-8 w-[85px] sm:w-[95px] px-2 rounded-lg bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />

                          {/* Remove Row */}
                          {formSchedules.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeScheduleRow(idx)}
                              className="p-1.5 ml-auto rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Eliminar horario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Duration preview badge */}
                        {dur && (
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 pl-1">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            <span>Duración de la sesión: <strong className="text-zinc-600 dark:text-zinc-300">{dur}</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowModal(false)}
                className="h-9 px-4 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formSubjectId}
                className="h-9 px-4 text-xs font-medium rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : editingProfessor ? (
                  "Guardar Cambios"
                ) : (
                  "Agregar Profesor"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
