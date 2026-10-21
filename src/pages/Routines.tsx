import { useState, useMemo, useEffect } from "react";
import { format, addDays, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
    ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
    CheckCircle2, XCircle, CalendarDays, Flame,
    TrendingUp, RotateCcw, Clock, StopCircle, BookOpen,
    Filter, Check, Percent, LayoutGrid, Calendar, List,
    Sparkles, AlertTriangle, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useSubjects, type Subject } from "@/hooks/useSubjects";
import { SubjectSelect } from "@/components/subjects/SubjectSelect";
import { TabeLogo } from "@/components/ui/TabeLogo";
import HoldButton from "@/components/ui/HoldButton";
import {
    useRoutines,
    type Routine,
    type ResolvedRoutine,
    type RoutineLog,
    CATEGORIES,
    COLOR_OPTIONS,
    DAY_LABELS,
} from "@/hooks/useRoutines";

// ─────────────────────────────── Time Helpers ────────────────────────────────

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

function getPositionStyles(start: string, end: string, minHour: number = 8) {
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    const gridStartMin = minHour * 60;

    // Each hour is 60px
    const top = ((startMin - gridStartMin) / 60) * 60;
    const height = Math.max(((endMin - startMin) / 60) * 60, 26);

    return {
        top: `${top}px`,
        height: `${height}px`,
        minHeight: "26px",
    };
}

function calculateOverlaps(routines: ResolvedRoutine[]) {
    const sorted = [...routines].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const groups: ResolvedRoutine[][] = [];

    sorted.forEach((r) => {
        let placed = false;
        for (const group of groups) {
            const lastInGroup = group[group.length - 1];
            if (r.start_time < lastInGroup.end_time) {
                group.push(r);
                placed = true;
                break;
            }
        }
        if (!placed) groups.push([r]);
    });

    const results = new Map<string, { width: string; left: string }>();
    groups.forEach((group) => {
        const width = 100 / group.length;
        group.forEach((r, i) => {
            results.set(r.id, {
                width: `${width}%`,
                left: `${width * i}%`,
            });
        });
    });
    return results;
}

function timeLabel(t: string): string {
    return t.slice(0, 5);
}

// ─────────────────────────────── Form Dialog ─────────────────────────────────

interface FormDialogProps {
    open: boolean;
    initial?: Routine | null;
    subjects: Subject[];
    onClose: () => void;
    onSave: (data: any) => void;
}

function RoutineFormDialog({ open, initial, onClose, onSave }: FormDialogProps) {
    const defaultStart = format(new Date(), "yyyy-MM-dd");
    const defaultEnd = format(addDays(new Date(), 120), "yyyy-MM-dd");

    const [name, setName] = useState(initial?.name ?? "");
    const [desc, setDesc] = useState(initial?.description ?? "");
    const [category, setCategory] = useState(initial?.category ?? "general");
    const [subjectId, setSubjectId] = useState<string>(initial?.subject_id ?? "none");
    const [color, setColor] = useState(initial?.color ?? "#10B981");
    const [startTime, setStartTime] = useState(initial?.start_time?.slice(0, 5) ?? "08:00");
    const [endTime, setEndTime] = useState(initial?.end_time?.slice(0, 5) ?? "10:00");
    const [days, setDays] = useState<number[]>(initial?.days_of_week ?? []);
    const [startDate, setStartDate] = useState(initial?.start_date ?? defaultStart);
    const [endDate, setEndDate] = useState(initial?.end_date ?? defaultEnd);

    useEffect(() => {
        if (open) {
            const start = initial?.start_date ?? format(new Date(), "yyyy-MM-dd");
            const end = initial?.end_date ?? format(addDays(initial?.start_date ? parseISO(initial.start_date) : new Date(), 120), "yyyy-MM-dd");
            setName(initial?.name ?? "");
            setDesc(initial?.description ?? "");
            setCategory(initial?.category ?? "general");
            setSubjectId(initial?.subject_id ?? "none");
            setColor(initial?.color ?? "#10B981");
            setStartTime(initial?.start_time?.slice(0, 5) ?? "08:00");
            setEndTime(initial?.end_time?.slice(0, 5) ?? "10:00");
            setDays(initial?.days_of_week ?? [1, 2, 3, 4, 5]);
            setStartDate(start);
            setEndDate(end);
        }
    }, [initial, open]);

    const toggleDay = (d: number) =>
        setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Ingresa un nombre para la rutina");
            return;
        }
        if (days.length === 0) {
            toast.error("Selecciona al menos un día de la semana");
            return;
        }
        if (!startDate) {
            toast.error("Ingresa una fecha de inicio");
            return;
        }
        if (!endDate) {
            toast.error("La fecha de fin es obligatoria");
            return;
        }
        if (endDate < startDate) {
            toast.error("La fecha de fin no puede ser anterior a la fecha de inicio");
            return;
        }

        onSave({
            name: name.trim(),
            description: desc.trim() || undefined,
            category,
            subject_id: subjectId === "none" ? null : subjectId,
            color,
            start_time: startTime,
            end_time: endTime,
            days_of_week: days,
            start_date: startDate,
            end_date: endDate,
        });
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl p-6 text-zinc-900 dark:text-zinc-100">
                <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                            {initial ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                                {initial ? "Editar Rutina" : "Nueva Rutina"}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Define los horarios, días y categoría para organizar tus actividades.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 pt-3">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            Nombre de la rutina <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Repaso de Álgebra, Gimnasio, Cursada..."
                            className="bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 transition-colors"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            Descripción / Notas <span className="text-zinc-400 text-[11px] font-normal">(opcional)</span>
                        </Label>
                        <Textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Detalles, objetivos o aula correspondiente..."
                            className="h-16 resize-none bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 transition-colors"
                        />
                    </div>

                    {/* Time range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Hora inicio *</Label>
                            <Select value={startTime} onValueChange={setStartTime}>
                                <SelectTrigger className="bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-normal">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-[#1f1f1f] border border-zinc-200 dark:border-zinc-800 max-h-48 rounded-xl">
                                    {TIME_OPTIONS.map((t) => (
                                        <SelectItem key={t} value={t} className="text-xs cursor-pointer">
                                            {t}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Hora fin *</Label>
                            <Select value={endTime} onValueChange={setEndTime}>
                                <SelectTrigger className="bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-normal">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-[#1f1f1f] border border-zinc-200 dark:border-zinc-800 max-h-48 rounded-xl">
                                    {TIME_OPTIONS.filter((t) => t > startTime).map((t) => (
                                        <SelectItem key={t} value={t} className="text-xs cursor-pointer">
                                            {t}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Materia */}
                    <SubjectSelect
                        value={subjectId === "none" ? "" : subjectId}
                        onChange={(val) => setSubjectId(val || "none")}
                        label="Materia asociada"
                        placeholder="General (sin materia)"
                        allowNone
                        noneLabel={
                            <span className="flex items-center gap-2">
                                <TabeLogo size={14} className="shrink-0 object-contain" />
                                <span>General (hábito o sin materia)</span>
                            </span>
                        }
                        showYearFilter
                    />

                    {/* Category */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Categoría</Label>
                        <div className="flex flex-wrap gap-1.5">
                            {CATEGORIES.map((c) => {
                                const isSelected = category === c.id;
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setCategory(c.id)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer border",
                                            isSelected
                                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs"
                                                : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                                        )}
                                    >
                                        <span>{c.emoji}</span>
                                        <span>{c.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Color */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Color distintivo</Label>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {COLOR_OPTIONS.map((c) => {
                                const isSelected = color.toLowerCase() === c.toLowerCase();
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        style={{ backgroundColor: c }}
                                        className={cn(
                                            "w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center relative",
                                            isSelected
                                                ? "ring-2 ring-offset-2 ring-zinc-900 dark:ring-white scale-110 shadow-xs"
                                                : "hover:scale-105 opacity-85 hover:opacity-100"
                                        )}
                                    >
                                        {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900 drop-shadow-xs" strokeWidth={3} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Days */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            Días de la semana <span className="text-red-500">*</span>
                        </Label>
                        <div className="grid grid-cols-7 gap-1.5 pt-0.5">
                            {DAY_LABELS.map((label, i) => {
                                const isDaySelected = days.includes(i);
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => toggleDay(i)}
                                        className={cn(
                                            "py-2 rounded-xl text-xs font-medium transition-all text-center cursor-pointer border",
                                            isDaySelected
                                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs font-semibold"
                                                : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                                        )}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Fecha de inicio *</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setStartDate(val);
                                    if (endDate && val && endDate < val) {
                                        setEndDate(val);
                                    }
                                }}
                                className="bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 transition-colors"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Fecha fin *</Label>
                            <Input
                                type="date"
                                min={startDate}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!name.trim() || days.length === 0 || !startDate || !endDate}
                        className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-medium transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {initial ? "Guardar Cambios" : "Crear Rutina"}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ────────────────────────────── Log Dialog ────────────────────────────────────

interface LogDialogProps {
    open: boolean;
    routine: ResolvedRoutine | null;
    dateStr: string;
    existingLog?: RoutineLog;
    onClose: () => void;
    onLog: (routineId: string, date: string, data: any) => void;
    onEdit: (routine: ResolvedRoutine) => void;
}

function RoutineLogDialog({ open, routine, dateStr, existingLog, onClose, onLog, onEdit }: LogDialogProps) {
    const [completed, setCompleted] = useState<boolean>(existingLog?.completed ?? true);
    const [pct, setPct] = useState<number>(existingLog?.completion_percentage ?? 100);
    const [notes, setNotes] = useState<string>(existingLog?.notes ?? "");
    const [mode, setMode] = useState<"check" | "percentage">("check");

    useEffect(() => {
        if (existingLog) {
            setCompleted(existingLog.completed);
            setPct(existingLog.completion_percentage);
            setNotes(existingLog.notes || "");
            setMode(existingLog.completion_percentage !== 100 && existingLog.completion_percentage !== 0 ? "percentage" : "check");
        } else {
            setCompleted(true);
            setPct(100);
            setNotes("");
            setMode("check");
        }
    }, [existingLog, open]);

    if (!routine) return null;

    const cat = CATEGORIES.find((c) => c.id === routine.category);

    const handleSubmit = () => {
        onLog(routine.id, dateStr, {
            completed: mode === "check" ? completed : pct >= 50,
            completion_percentage: mode === "check" ? (completed ? 100 : 0) : pct,
            notes: notes.trim() || undefined,
        });
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl p-6 text-zinc-900 dark:text-zinc-100">
                <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                            <span
                                className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-zinc-900"
                                style={{ backgroundColor: routine.color }}
                            />
                            <span className="truncate">{routine.name}</span>
                        </DialogTitle>
                        <button
                            type="button"
                            title="Editar rutina"
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            onClick={() => {
                                onEdit(routine);
                                onClose();
                            }}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-1">
                        <span>{cat?.emoji}</span>
                        <span>{timeLabel(routine.start_time)}–{timeLabel(routine.end_time)}</span>
                        <span>·</span>
                        <span className="capitalize">{format(parseISO(dateStr), "EEEE d 'de' MMMM", { locale: es })}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-3">
                    {/* Mode segmented control */}
                    <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900/80 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={() => setMode("check")}
                            className={cn(
                                "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                mode === "check"
                                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                        >
                            <Check className="w-3.5 h-3.5" /> Estado (Sí / No)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("percentage")}
                            className={cn(
                                "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                mode === "percentage"
                                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                        >
                            <Percent className="w-3.5 h-3.5" /> Porcentaje de avance
                        </button>
                    </div>

                    {mode === "check" ? (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => setCompleted(true)}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all cursor-pointer",
                                    completed
                                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500"
                                        : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                                )}
                            >
                                <CheckCircle2 className={cn("w-6 h-6", completed ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400")} />
                                <span className="text-xs font-semibold">Cumplida</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setCompleted(false)}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all cursor-pointer",
                                    !completed
                                        ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-500 text-rose-900 dark:text-rose-200 shadow-xs ring-1 ring-rose-500"
                                        : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                                )}
                            >
                                <XCircle className={cn("w-6 h-6", !completed ? "text-rose-600 dark:text-rose-400" : "text-zinc-400")} />
                                <span className="text-xs font-semibold">No realizada</span>
                            </button>
                        </div>
                    ) : (
                        <div className="bg-zinc-50/70 dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Nivel de cumplimiento</Label>
                                <span
                                    className={cn(
                                        "text-xl font-bold font-mono",
                                        pct >= 80 ? "text-emerald-600 dark:text-emerald-400" : pct >= 50 ? "text-amber-500" : "text-rose-500"
                                    )}
                                >
                                    {pct}%
                                </span>
                            </div>
                            <Slider value={[pct]} onValueChange={([v]) => setPct(v)} min={0} max={100} step={5} className="mt-2" />
                            {/* Preset pills */}
                            <div className="flex items-center justify-between gap-1.5 pt-1">
                                {[0, 25, 50, 75, 100].map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setPct(preset)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border",
                                            pct === preset
                                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                                                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-700 hover:bg-zinc-100"
                                        )}
                                    >
                                        {preset}%
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1.5 pt-1">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            Notas de la sesión <span className="text-zinc-400 text-[11px] font-normal">(opcional)</span>
                        </Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="¿Qué lograste? ¿Hubo algún imprevisto?"
                            className="h-20 resize-none bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 transition-colors"
                        />
                    </div>
                </div>

                <DialogFooter className="mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-medium transition-all shadow-xs cursor-pointer"
                    >
                        Guardar Registro
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ───────────────────────────── Routine Block ─────────────────────────────────

function RoutineBlock({
    routine,
    log,
    onClick,
    style,
    subjectName,
}: {
    routine: ResolvedRoutine;
    log?: RoutineLog;
    onClick: () => void;
    style?: React.CSSProperties;
    subjectName?: string;
}) {
    const isDone = log?.completed;
    const hasPct = log && !log.completed && log.completion_percentage > 0;

    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                ...style,
                borderLeftColor: routine.color,
            }}
            className={cn(
                "absolute rounded-lg px-2 py-1 text-left transition-all duration-150 cursor-pointer",
                "border border-zinc-200/90 dark:border-zinc-700/80 border-l-[3.5px]",
                "bg-white/95 dark:bg-[#1e1e21]/95 shadow-2xs hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-600",
                "hover:z-30 hover:scale-[1.01] group overflow-hidden flex flex-col justify-start"
            )}
        >
            <div className="w-full flex items-center justify-between gap-1">
                <span className="text-[11px] sm:text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-primary transition-colors">
                    {routine.name}
                </span>
                {isDone && (
                    <span className="shrink-0 flex items-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                )}
                {hasPct && (
                    <span className="shrink-0 text-[10px] font-mono font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 rounded">
                        {log!.completion_percentage}%
                    </span>
                )}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                <Clock className="w-2.5 h-2.5 shrink-0 opacity-70" />
                <span>{timeLabel(routine.start_time)}–{timeLabel(routine.end_time)}</span>
            </div>

            {subjectName && (
                <div className="flex items-center gap-1 text-[9px] text-zinc-600 dark:text-zinc-300 truncate mt-0.5">
                    <BookOpen className="w-2.5 h-2.5 shrink-0 opacity-70" />
                    <span className="truncate">{subjectName}</span>
                </div>
            )}
        </button>
    );
}

// ────────────────────────────── Main Page ─────────────────────────────────────

export default function Routines() {
    const {
        routines,
        loading,
        currentWeekStart,
        createRoutine,
        updateRoutine,
        deleteRoutine,
        stopRoutine,
        logRoutine,
        getRoutinesForDate,
        getLogForRoutineAndDate,
        weekStats,
        getRoutineStreak,
        goToPrevWeek,
        goToNextWeek,
        goToCurrentWeek,
    } = useRoutines();
    const { subjects } = useSubjects();

    const [formOpen, setFormOpen] = useState(false);
    const [editRoutine, setEditRoutine] = useState<Routine | null>(null);
    const [logTarget, setLogTarget] = useState<{ routine: ResolvedRoutine; dateStr: string } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [confirmStop, setConfirmStop] = useState<Routine | null>(null);

    // View mode: "grid" | "list" | "both"
    const [viewMode, setViewMode] = useState<"grid" | "list" | "both">("both");

    // Filter state
    const [filterYear, setFilterYear] = useState<string>("all");
    const [filterSubject, setFilterSubject] = useState<string>("all");

    // Filter routines for display
    const filterRoutine = (r: ResolvedRoutine): boolean => {
        if (filterSubject !== "all") return r.subject_id === filterSubject;
        if (filterYear !== "all") {
            if (!r.subject_id) return false;
            const sub = subjects.find((s) => s.id === r.subject_id);
            return sub?.año === Number(filterYear);
        }
        return true;
    };

    const handleSave = async (data: any) => {
        if (editRoutine) {
            await updateRoutine(editRoutine.id, data);
        } else {
            await createRoutine(data);
        }
        setEditRoutine(null);
        setFormOpen(false);
    };

    const weekDays = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
        [currentWeekStart]
    );

    const stats = weekStats();

    // Subject map for fast lookup
    const subjectMap = useMemo(() => {
        const map = new Map<string, Subject>();
        subjects.forEach((s) => map.set(s.id, s));
        return map;
    }, [subjects]);

    // Build year options from subjects
    const yearOptions = useMemo(() => {
        const years = new Set(subjects.map((s) => s.año));
        return Array.from(years).sort((a, b) => a - b);
    }, [subjects]);

    // Filtered subjects by year
    const filteredSubjects = useMemo(() => {
        if (filterYear === "all") return subjects;
        return subjects.filter((s) => s.año === Number(filterYear));
    }, [subjects, filterYear]);

    // Hourly blocks for the grid: 08:00 to 24:00
    const gridHours = Array.from({ length: 17 }, (_, i) => 8 + i);

    return (
        <div className="tabe-page max-w-7xl mx-auto p-3.5 sm:p-6 lg:p-8 space-y-6 pb-28 lg:pb-14">
            {/* Header Section (Notion / ChatGPT Style) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center shrink-0 text-zinc-800 dark:text-zinc-200 shadow-2xs">
                        <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                                Mis Rutinas & Horarios
                            </h1>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                                {routines.length} activas
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Planifica tu semana, organiza bloques de estudio o hábitos y registra tu progreso diario.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
                    {/* View Switcher Tabs */}
                    <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-medium">
                        <button
                            type="button"
                            onClick={() => setViewMode("both")}
                            className={cn(
                                "px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                                viewMode === "both"
                                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Vista Completa</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("grid")}
                            className={cn(
                                "px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                                viewMode === "grid"
                                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Grilla</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                                viewMode === "list"
                                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                            )}
                        >
                            <List className="w-3.5 h-3.5" />
                            <span>Lista</span>
                        </button>
                    </div>

                    {/* New Routine CTA */}
                    <button
                        type="button"
                        onClick={() => {
                            setEditRoutine(null);
                            setFormOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs sm:text-sm font-medium transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nueva Rutina</span>
                    </button>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Metric 1 */}
                <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                            Cumplimiento Semanal
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
                                {stats.pct}%
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {stats.pct >= 70 ? "¡Excelente ritmo!" : stats.pct >= 40 ? "En buen camino" : "Por comenzar"}
                            </span>
                        </div>
                    </div>
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                        stats.pct >= 70
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : stats.pct >= 40
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                            : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500"
                    )}>
                        <TrendingUp className="w-5 h-5" />
                    </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                            Bloques Programados
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
                                {stats.scheduled}
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                esta semana
                            </span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                    </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                            Bloques Completados
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
                                {stats.done}
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                de {stats.scheduled}
                            </span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Navigation & Filters Bar */}
            <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Week Navigation */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={goToPrevWeek}
                        title="Semana anterior"
                        className="p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <CalendarDays className="w-4 h-4 text-zinc-400 shrink-0 hidden sm:block" />
                        <span className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 capitalize">
                            {format(currentWeekStart, "d 'de' MMM", { locale: es })} — {format(addDays(currentWeekStart, 6), "d 'de' MMM yyyy", { locale: es })}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={goToNextWeek}
                        title="Semana siguiente"
                        className="p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={goToCurrentWeek}
                        className="px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                    >
                        Hoy
                    </button>
                </div>

                {/* Filter selects */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Filtrar:</span>
                    </div>

                    {/* Year filter */}
                    <div className="w-[130px]">
                        <Select
                            value={filterYear}
                            onValueChange={(v) => {
                                setFilterYear(v);
                                setFilterSubject("all");
                            }}
                        >
                            <SelectTrigger className="h-9 px-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800 text-xs font-normal rounded-xl">
                                <SelectValue placeholder="Año" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#1f1f1f] border-zinc-200 dark:border-zinc-800 rounded-xl">
                                <SelectItem value="all" className="text-xs cursor-pointer">
                                    Todos los años
                                </SelectItem>
                                {yearOptions.map((y) => (
                                    <SelectItem key={y} value={String(y)} className="text-xs cursor-pointer">
                                        {y}° año
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Subject filter */}
                    <div className="w-[180px]">
                        <Select value={filterSubject} onValueChange={setFilterSubject}>
                            <SelectTrigger className="h-9 px-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800 text-xs font-normal rounded-xl truncate">
                                <SelectValue placeholder="Materia" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#1f1f1f] border-zinc-200 dark:border-zinc-800 rounded-xl max-h-56">
                                <SelectItem value="all" className="text-xs cursor-pointer">
                                    Todas las materias
                                </SelectItem>
                                {filteredSubjects.map((s) => (
                                    <SelectItem key={s.id} value={s.id} className="text-xs cursor-pointer">
                                        {s.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {(filterYear !== "all" || filterSubject !== "all") && (
                        <button
                            type="button"
                            onClick={() => {
                                setFilterYear("all");
                                setFilterSubject("all");
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Limpiar</span>
                        </button>
                    )}
                </div>
            </div>

            {loading && routines.length === 0 ? (
                <LoadingScreen message="Cargando Rutinas..." submessage="Organizando tus horarios y bloques de estudio..." />
            ) : (
                <>
                    {/* Weekly Calendar Grid View */}
                    {(viewMode === "grid" || viewMode === "both") && (
                        <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <div className="min-w-[760px] grid grid-cols-[64px_repeat(7,1fr)]">
                                    {/* Corner Header */}
                                    <div className="h-12 border-b border-r border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-center">
                                        <Clock className="w-4 h-4 text-zinc-400" />
                                    </div>

                                    {/* Day Headers */}
                                    {weekDays.map((day, i) => {
                                        const today = isToday(day);
                                        return (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "h-12 flex flex-col items-center justify-center border-b border-r last:border-r-0 border-zinc-200/80 dark:border-zinc-800 px-1",
                                                    today
                                                        ? "bg-zinc-100/80 dark:bg-zinc-800/60"
                                                        : "bg-zinc-50/60 dark:bg-zinc-900/60"
                                                )}
                                            >
                                                <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 dark:text-zinc-400">
                                                    {DAY_LABELS[day.getDay()]}
                                                </span>
                                                <div
                                                    className={cn(
                                                        "text-xs font-semibold mt-0.5 w-6 h-6 rounded-full flex items-center justify-center leading-none",
                                                        today
                                                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                                                            : "text-zinc-800 dark:text-zinc-200"
                                                    )}
                                                >
                                                    {format(day, "d")}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Time Column */}
                                    <div className="relative border-r border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30 select-none">
                                        {gridHours.map((h) => (
                                            <div
                                                key={h}
                                                className="h-[60px] flex items-start justify-end pr-2.5 pt-1 border-b border-zinc-100 dark:border-zinc-800/40 last:border-b-0"
                                            >
                                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-medium">
                                                    {String(h).padStart(2, "0")}:00
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Day Columns */}
                                    {weekDays.map((day, dayIdx) => {
                                        const dateStr = format(day, "yyyy-MM-dd");
                                        const dayRoutines = getRoutinesForDate(day).filter(filterRoutine);
                                        const overlapStyles = calculateOverlaps(dayRoutines);
                                        const today = isToday(day);

                                        return (
                                            <div
                                                key={dayIdx}
                                                className={cn(
                                                    "relative border-r last:border-r-0 border-zinc-200/80 dark:border-zinc-800",
                                                    today ? "bg-zinc-50/40 dark:bg-zinc-900/20" : "bg-transparent"
                                                )}
                                            >
                                                {/* Hour grid guidelines */}
                                                {gridHours.map((h) => (
                                                    <div
                                                        key={h}
                                                        className="h-[60px] border-b border-zinc-100 dark:border-zinc-800/40 last:border-b-0"
                                                    />
                                                ))}

                                                {/* Routine Blocks inside this day */}
                                                {dayRoutines.map((r) => {
                                                    const pos = getPositionStyles(r.start_time, r.end_time);
                                                    const overlap = overlapStyles.get(r.id);
                                                    const sub = r.subject_id ? subjectMap.get(r.subject_id) : undefined;

                                                    return (
                                                        <RoutineBlock
                                                            key={r.id}
                                                            routine={r}
                                                            log={getLogForRoutineAndDate(r.id, dateStr)}
                                                            onClick={() => setLogTarget({ routine: r, dateStr })}
                                                            subjectName={sub?.nombre}
                                                            style={{
                                                                ...pos,
                                                                width: overlap?.width,
                                                                left: overlap?.left,
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Routine Cards Directory / List View */}
                    {(viewMode === "list" || viewMode === "both") && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-zinc-500" />
                                    <span>Directorio de Rutinas</span>
                                </h2>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {routines.length} configuradas
                                </span>
                            </div>

                            {routines.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {routines.map((r) => {
                                        const streak = getRoutineStreak(r.id);
                                        const cat = CATEGORIES.find((c) => c.id === r.category);
                                        const dayNames = r.days_of_week.map((d) => DAY_LABELS[d]).join(", ");
                                        const sub = r.subject_id ? subjectMap.get(r.subject_id) : null;

                                        return (
                                            <div
                                                key={r.id}
                                                className="bg-white dark:bg-[#18181b] rounded-2xl p-4 sm:p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between gap-3 group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className="w-2.5 h-10 rounded-full shrink-0 mt-0.5"
                                                        style={{ backgroundColor: r.color }}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">
                                                                {r.name}
                                                            </h3>
                                                            <span className="text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-md flex items-center gap-1 border border-zinc-200/60 dark:border-zinc-700/60">
                                                                <span>{cat?.emoji}</span>
                                                                <span>{cat?.label}</span>
                                                            </span>
                                                        </div>

                                                        {r.description && (
                                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                                                                {r.description}
                                                            </p>
                                                        )}

                                                        <div className="flex flex-wrap items-center gap-2 mt-2.5">
                                                            {sub && (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 px-2 py-0.5 rounded-lg">
                                                                    <BookOpen className="w-3 h-3" />
                                                                    <span className="truncate max-w-[150px]">{sub.nombre}</span>
                                                                </span>
                                                            )}
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 px-2 py-0.5 rounded-lg">
                                                                <Clock className="w-3 h-3" />
                                                                <span>{timeLabel(r.start_time)}–{timeLabel(r.end_time)}</span>
                                                                <span>·</span>
                                                                <span>{dayNames}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
                                                    {/* Streak */}
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
                                                        <Flame className={cn("w-3.5 h-3.5", streak > 0 ? "fill-current" : "")} />
                                                        <span>{streak} {streak === 1 ? "día de racha" : "días de racha"}</span>
                                                    </div>

                                                    {/* Action buttons */}
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditRoutine(r);
                                                                setFormOpen(true);
                                                            }}
                                                            title="Editar rutina"
                                                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmStop(r)}
                                                            title="Finalizar hoy"
                                                            className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                                                        >
                                                            <StopCircle className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmDelete(r.id)}
                                                            title="Eliminar rutina"
                                                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-8 sm:p-12 text-center shadow-xs flex flex-col items-center justify-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                        <CalendarDays className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                        Sin rutinas programadas
                                    </h3>
                                    <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm max-w-sm">
                                        Define tus bloques de estudio, cursadas presenciales o hábitos diarios para visualizarlos de forma organizada.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditRoutine(null);
                                            setFormOpen(true);
                                        }}
                                        className="mt-2 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs sm:text-sm font-medium transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Crear mi primera rutina</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Form Dialog */}
            <RoutineFormDialog
                open={formOpen}
                initial={editRoutine}
                subjects={subjects}
                onClose={() => {
                    setFormOpen(false);
                    setEditRoutine(null);
                }}
                onSave={handleSave}
            />

            {/* Log Dialog */}
            <RoutineLogDialog
                open={!!logTarget}
                routine={logTarget?.routine ?? null}
                dateStr={logTarget?.dateStr ?? ""}
                existingLog={logTarget ? getLogForRoutineAndDate(logTarget.routine.id, logTarget.dateStr) : undefined}
                onClose={() => setLogTarget(null)}
                onLog={logRoutine}
                onEdit={(r) => {
                    setEditRoutine(r);
                    setFormOpen(true);
                }}
            />

            {/* Stop Confirm Dialog */}
            <Dialog open={!!confirmStop} onOpenChange={() => setConfirmStop(null)}>
                <DialogContent className="max-w-md bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl p-6 text-zinc-900 dark:text-zinc-100">
                    <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <StopCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                                    Finalizar rutina a partir de hoy
                                </DialogTitle>
                                <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    Esta rutina dejará de aparecer en fechas futuras.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="py-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        La rutina <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">"{confirmStop?.name}"</strong> quedará finalizada hoy. Todos los registros y estadísticas pasadas se mantendrán intactos.
                    </div>

                    <DialogFooter className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setConfirmStop(null)}
                            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (confirmStop) stopRoutine(confirmStop.id);
                                setConfirmStop(null);
                            }}
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <StopCircle className="w-4 h-4" />
                            <span>Finalizar hoy</span>
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
                <DialogContent className="max-w-md bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl p-6 text-zinc-900 dark:text-zinc-100">
                    <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                                    ¿Eliminar rutina definitivamente?
                                </DialogTitle>
                                <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    Esta acción no se puede deshacer.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="my-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed font-normal">
                            Se eliminará la rutina y todos sus registros de progreso acumulados. Si solo deseas que no continúe en el futuro, utiliza la opción <strong>"Finalizar hoy"</strong>.
                        </p>
                    </div>

                    <DialogFooter className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <HoldButton
                            size="sm"
                            radius={12}
                            holdTime={1400}
                            backgroundColor="#e11d48"
                            fillColor="#9f1239"
                            textColor="#ffffff"
                            fillTextColor="#ffffff"
                            icon={<Trash2 className="w-3.5 h-3.5 shrink-0 text-white mr-1.5" />}
                            doneIcon={<Check className="w-3.5 h-3.5 shrink-0 text-white mr-1.5" />}
                            doneLabel="Eliminada"
                            onHold={() => {
                                if (confirmDelete) deleteRoutine(confirmDelete);
                                setConfirmDelete(null);
                            }}
                            className="px-4 py-2 text-xs font-medium cursor-pointer"
                        >
                            Mantener para Eliminar
                        </HoldButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
