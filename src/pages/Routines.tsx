import { useState, useMemo, useEffect } from "react";
import { format, addDays, isToday, isFuture, isPast, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
    ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
    CheckCircle, XCircle, CalendarDays, Flame,
    TrendingUp, RotateCcw, Clock, StopCircle, BookOpen,
    Filter, Check, Percent
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useSubjects, type Subject } from "@/hooks/useSubjects";
import {
    useRoutines,
    type Routine,
    type ResolvedRoutine,
    type RoutineLog,
    CATEGORIES,
    COLOR_OPTIONS,
    DAY_LABELS,
    TIME_BLOCKS,
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
    
    // Each hour is 64px (h-16 in tailwind)
    const top = ((startMin - gridStartMin) / 60) * 64;
    const height = ((endMin - startMin) / 60) * 64;
    
    return {
        top: `${top}px`,
        height: `${height}px`,
        minHeight: '24px'
    };
}

// Helper to determine overlap and widths
function calculateOverlaps(routines: ResolvedRoutine[]) {
    const sorted = [...routines].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const groups: ResolvedRoutine[][] = [];
    
    sorted.forEach(r => {
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

    const results = new Map<string, { width: string, left: string }>();
    groups.forEach(group => {
        const width = 100 / group.length;
        group.forEach((r, i) => {
            results.set(r.id, {
                width: `${width}%`,
                left: `${width * i}%`
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

function RoutineFormDialog({ open, initial, subjects, onClose, onSave }: FormDialogProps) {
    const [name, setName] = useState(initial?.name ?? "");
    const [desc, setDesc] = useState(initial?.description ?? "");
    const [category, setCategory] = useState(initial?.category ?? "general");
    const [subjectId, setSubjectId] = useState<string>(initial?.subject_id ?? "none");
    const [color, setColor] = useState(initial?.color ?? "#00FFAA");
    const [startTime, setStartTime] = useState(initial?.start_time?.slice(0, 5) ?? "08:00");
    const [endTime, setEndTime] = useState(initial?.end_time?.slice(0, 5) ?? "10:00");
    const [days, setDays] = useState<number[]>(initial?.days_of_week ?? []);
    const [startDate, setStartDate] = useState(initial?.start_date ?? format(new Date(), "yyyy-MM-dd"));
    const [hasEnd, setHasEnd] = useState(!!initial?.end_date);
    const [endDate, setEndDate] = useState(initial?.end_date ?? "");

    // Sync state when 'initial' changes or dialog opens
    useEffect(() => {
        if (open) {
            setName(initial?.name ?? "");
            setDesc(initial?.description ?? "");
            setCategory(initial?.category ?? "general");
            setSubjectId(initial?.subject_id ?? "none");
            setColor(initial?.color ?? "#00FFAA");
            setStartTime(initial?.start_time?.slice(0, 5) ?? "08:00");
            setEndTime(initial?.end_time?.slice(0, 5) ?? "10:00");
            setDays(initial?.days_of_week ?? []);
            setStartDate(initial?.start_date ?? format(new Date(), "yyyy-MM-dd"));
            setHasEnd(!!initial?.end_date);
            setEndDate(initial?.end_date ?? "");
        }
    }, [initial, open]);

    const toggleDay = (d: number) =>
        setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());

    const handleSave = () => {
        if (!name.trim() || days.length === 0) return;
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
            end_date: hasEnd ? endDate : undefined,
        });
        onClose();
    };

    // Group subjects by año
    const subjectsByYear = useMemo(() => {
        const map: Record<number, Subject[]> = {};
        subjects.forEach(s => {
            if (!map[s.año]) map[s.año] = [];
            map[s.año].push(s);
        });
        return map;
    }, [subjects]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initial ? "Editar Rutina" : "Nueva Rutina"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    {/* Name */}
                    <div>
                        <Label>Nombre *</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Estudiar Análisis" className="mt-1" />
                    </div>

                    {/* Description */}
                    <div>
                        <Label>Descripción (opcional)</Label>
                        <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Notas..." className="mt-1 h-16 resize-none" />
                    </div>

                    {/* Time range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Hora inicio *</Label>
                            <Select value={startTime} onValueChange={setStartTime}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-48">
                                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Hora fin *</Label>
                            <Select value={endTime} onValueChange={setEndTime}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-48">
                                    {TIME_OPTIONS.filter(t => t > startTime).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Materia */}
                    <div>
                        <Label>Materia (opcional)</Label>
                        <Select value={subjectId} onValueChange={setSubjectId}>
                            <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">General (sin materia)</SelectItem>
                                {Object.entries(subjectsByYear).sort(([a], [b]) => Number(a) - Number(b)).map(([año, subs]) => (
                                    subs.map(sub => (
                                        <SelectItem key={sub.id} value={sub.id}>
                                            {año}° — {sub.nombre}
                                        </SelectItem>
                                    ))
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Category */}
                    <div>
                        <Label>Categoría</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {CATEGORIES.map(c => (
                                <button key={c.id} onClick={() => setCategory(c.id)}
                                    className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                                        category === c.id ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                                    )}>
                                    {c.emoji} {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <Label>Color</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map(c => (
                                <button key={c} onClick={() => setColor(c)}
                                    className={cn("w-7 h-7 rounded-full border-2 transition-transform hover:scale-110",
                                        color === c ? "border-foreground scale-110" : "border-transparent"
                                    )} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>

                    {/* Days */}
                    <div>
                        <Label>Días de la semana *</Label>
                        <div className="mt-1 flex gap-1">
                            {DAY_LABELS.map((label, i) => (
                                <button key={i} onClick={() => toggleDay(i)}
                                    className={cn("flex-1 py-2 rounded-lg text-xs font-semibold border transition-all",
                                        days.includes(i) ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                                    )}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Fecha de inicio</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label className="flex items-center gap-2">
                                Fecha fin <input type="checkbox" checked={hasEnd} onChange={e => setHasEnd(e.target.checked)} className="ml-1" />
                            </Label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={!hasEnd} className="mt-1" />
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={!name.trim() || days.length === 0}>
                        {initial ? "Guardar cambios" : "Crear Rutina"}
                    </Button>
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
    onEdit: (routine: Routine) => void;
}

function RoutineLogDialog({ open, routine, dateStr, existingLog, onClose, onLog, onEdit }: LogDialogProps) {
    const [mode, setMode] = useState<"check" | "percentage">(existingLog ? (existingLog.completed ? "check" : "percentage") : "check");
    const [completed, setCompleted] = useState(existingLog?.completed ?? false);
    const [pct, setPct] = useState(existingLog?.completion_percentage ?? 50);
    const [notes, setNotes] = useState(existingLog?.notes ?? "");

    if (!routine) return null;

    const cat = CATEGORIES.find(c => c.id === routine.category);

    const handleSubmit = () => {
        if (mode === "check") {
            onLog(routine.id, dateStr, { completed, completion_percentage: completed ? 100 : 0, notes: notes || undefined });
        } else {
            onLog(routine.id, dateStr, { completed: pct === 100, completion_percentage: pct, notes: notes || undefined });
        }
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: routine.color }} />
                            {routine.name}
                        </DialogTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20" 
                            onClick={() => { onEdit(routine); onClose(); }}>
                            <Pencil className="w-4 h-4 text-primary" />
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {cat?.emoji} {timeLabel(routine.start_time)}–{timeLabel(routine.end_time)} · {format(parseISO(dateStr), "EEEE d MMM", { locale: es })}
                    </p>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    {/* Mode tabs */}
                    <div className="flex bg-secondary rounded-xl p-1">
                        <button onClick={() => setMode("check")}
                            className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1",
                                mode === "check" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                            <Check className="w-4 h-4" /> Sí/No
                        </button>
                        <button onClick={() => setMode("percentage")}
                            className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1",
                                mode === "percentage" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                            <Percent className="w-4 h-4" /> Porcentaje
                        </button>
                    </div>

                    {mode === "check" ? (
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setCompleted(true)}
                                className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                    completed ? "border-neon-green bg-neon-green/10 text-neon-green" : "border-border text-muted-foreground hover:border-neon-green/50")}>
                                <CheckCircle className="w-8 h-8" />
                                <span className="text-sm font-semibold">Cumplida</span>
                            </button>
                            <button onClick={() => setCompleted(false)}
                                className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                    !completed ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground hover:border-destructive/50")}>
                                <XCircle className="w-8 h-8" />
                                <span className="text-sm font-semibold">No cumplida</span>
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label>Cumplimiento</Label>
                                <span className={cn("text-2xl font-display font-bold",
                                    pct >= 80 ? "text-neon-green" : pct >= 50 ? "text-neon-gold" : "text-destructive"
                                )}>{pct}%</span>
                            </div>
                            <Slider value={[pct]} onValueChange={([v]) => setPct(v)} min={0} max={100} step={5} className="mt-2" />
                            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                                <span>0%</span><span>50%</span><span>100%</span>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <Label>Notas (opcional)</Label>
                        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="¿Algo a destacar?" className="mt-1 h-16 resize-none" />
                    </div>
                </div>

                <DialogFooter className="mt-2">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSubmit}>Guardar</Button>
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
    style 
}: { 
    routine: ResolvedRoutine; 
    log?: RoutineLog; 
    onClick: () => void;
    style?: React.CSSProperties;
}) {
    const isDone = log?.completed;
    const hasPct = log && !log.completed && log.completion_percentage > 0;

    return (
        <button onClick={onClick}
            style={style}
            className={cn(
                "absolute rounded-md px-2 py-1 border transition-all hover:z-10 hover:brightness-110 group overflow-hidden shadow-sm",
                isDone ? "border-neon-green/40 bg-neon-green/10" :
                    hasPct ? "border-neon-gold/40 bg-neon-gold/10" :
                        "border-white/10 bg-card/90 hover:border-primary/50"
            )}>
            {/* Color strip */}
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: routine.color }} />

            <div className="pl-1.5 h-full flex flex-col justify-start overflow-hidden">
                <p className={cn("text-[11px] font-bold truncate leading-tight",
                    isDone ? "text-neon-green" : hasPct ? "text-neon-gold" : "text-foreground"
                )}>
                    {routine.name}
                </p>
                <p className="text-[9px] text-muted-foreground font-mono opacity-80">
                    {timeLabel(routine.start_time)}–{timeLabel(routine.end_time)}
                </p>
                {hasPct && <span className="text-[9px] text-neon-gold font-bold mt-auto mb-0.5">{log!.completion_percentage}%</span>}
            </div>
        </button>
    );
}

// ────────────────────────────── Main Page ─────────────────────────────────────

export default function Routines() {
    const {
        routines, logs, loading, currentWeekStart,
        createRoutine, updateRoutine, deleteRoutine, stopRoutine, logRoutine,
        getRoutinesForDate, getLogForRoutineAndDate, weekStats, getRoutineStreak,
        goToPrevWeek, goToNextWeek, goToCurrentWeek,
    } = useRoutines();
    const { subjects } = useSubjects();

    const [formOpen, setFormOpen] = useState(false);
    const [editRoutine, setEditRoutine] = useState<Routine | null>(null);
    const [logTarget, setLogTarget] = useState<{ routine: ResolvedRoutine; dateStr: string } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [confirmStop, setConfirmStop] = useState<Routine | null>(null);

    // Filter state
    const [filterYear, setFilterYear] = useState<string>("all");
    const [filterSubject, setFilterSubject] = useState<string>("all");

    // Filter routines for display
    const filterRoutine = (r: ResolvedRoutine): boolean => {
        if (filterSubject !== "all") return r.subject_id === filterSubject;
        if (filterYear !== "all") {
            if (!r.subject_id) return false;
            const sub = subjects.find(s => s.id === r.subject_id);
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

    const weekDays = useMemo(() =>
        Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
        [currentWeekStart]
    );

    const stats = weekStats();

    // Build year options from subjects
    const yearOptions = useMemo(() => {
        const years = new Set(subjects.map(s => s.año));
        return Array.from(years).sort();
    }, [subjects]);

    // Filtered subjects by year
    const filteredSubjects = useMemo(() => {
        if (filterYear === "all") return subjects;
        return subjects.filter(s => s.año === Number(filterYear));
    }, [subjects, filterYear]);
    // Hourly blocks for the grid: 08:00 to 24:00
    const gridHours = Array.from({ length: 17 }, (_, i) => 8 + i); // 8 to 24

    return (
        <div className="p-4 lg:p-8 space-y-6">
            {/* Header omitted for brevity in chunk - same as before */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text">
                        Mis Rutinas
                    </h1>
                    <p className="text-muted-foreground mt-1">Organiza tu semana y registra tu cumplimiento</p>
                </div>
                <Button onClick={() => { setEditRoutine(null); setFormOpen(true); }}
                    className="bg-gradient-to-r from-neon-cyan to-neon-purple text-white hover:opacity-90 shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4 mr-2" /> Nueva Rutina
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 card-gamer rounded-xl p-3 border-white/5 bg-black/20 backdrop-blur-sm">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={filterYear} onValueChange={v => { setFilterYear(v); setFilterSubject("all"); }}>
                    <SelectTrigger className="w-[140px] h-9 bg-background/50 text-sm">
                        <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los años</SelectItem>
                        {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}° año</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                    <SelectTrigger className="w-[180px] h-9 bg-background/50 text-sm">
                        <SelectValue placeholder="Materia" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las materias</SelectItem>
                        {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
                {(filterYear !== "all" || filterSubject !== "all") && (
                    <Button variant="ghost" size="sm" onClick={() => { setFilterYear("all"); setFilterSubject("all"); }}
                        className="text-xs text-muted-foreground hover:text-foreground">
                        <RotateCcw className="w-3 h-3 mr-1" /> Limpiar
                    </Button>
                )}
            </div>

            {/* Week navigation */}
            <div className="flex items-center justify-between card-gamer rounded-xl p-2 border-white/5 bg-black/20">
                <Button variant="ghost" size="icon" onClick={goToPrevWeek} className="hover:bg-primary/20">
                    <ChevronLeft className="w-5 h-5 text-primary" />
                </Button>
                <div className="flex items-center gap-3">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    <span className="font-display font-semibold text-sm lg:text-base tracking-wider uppercase">
                        {format(currentWeekStart, "d MMM", { locale: es })} — {format(addDays(currentWeekStart, 6), "d MMM yyyy", { locale: es })}
                    </span>
                    <Button variant="secondary" size="sm" onClick={goToCurrentWeek} className="text-[10px] h-7 px-3 uppercase tracking-tighter">
                        Hoy
                    </Button>
                </div>
                <Button variant="ghost" size="icon" onClick={goToNextWeek} className="hover:bg-primary/20">
                    <ChevronRight className="w-5 h-5 text-primary" />
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Cumplimiento", val: `${stats.pct}%`, color: stats.pct >= 70 ? "text-neon-green" : stats.pct >= 40 ? "text-neon-gold" : "text-destructive" },
                    { label: "Programadas", val: stats.scheduled, color: "text-neon-cyan" },
                    { label: "Completadas", val: stats.done, color: "text-neon-gold" }
                ].map((s, i) => (
                    <div key={i} className="card-gamer rounded-xl p-3 text-center border-white/5 bg-black/30">
                        <p className={cn("text-2xl font-display font-bold leading-none", s.color)}>{s.val}</p>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">{s.label}</p>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Weekly Calendar Grid */}
                    <div className="card-gamer rounded-xl overflow-hidden border-white/10 shadow-2xl bg-black/40">
                        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                            {/* Sticky corner */}
                            <div className="h-12 border-b border-r border-white/10 bg-black/40" />
                            
                            {/* Day headers */}
                            {weekDays.map((day, i) => (
                                <div key={i} className={cn(
                                    "h-12 flex flex-col items-center justify-center border-b border-r last:border-r-0 border-white/10",
                                    isToday(day) ? "bg-primary/20 shadow-[inset_0_0_20px_rgba(var(--primary),0.1)]" : "bg-black/20"
                                )}>
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                        {DAY_LABELS[day.getDay()]}
                                    </span>
                                    <span className={cn("text-lg font-display font-bold leading-none",
                                        isToday(day) ? "text-primary text-glow-cyan" : "text-foreground"
                                    )}>{format(day, "d")}</span>
                                </div>
                            ))}

                            {/* Time sidebar */}
                            <div className="relative border-r border-white/10 bg-black/20">
                                {gridHours.map(h => (
                                    <div key={h} className="h-16 flex items-start justify-end pr-2 pt-1 border-b border-white/5 last:border-b-0">
                                        <span className="text-[10px] text-muted-foreground font-mono font-medium">
                                            {String(h).padStart(2, "0")}:00
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Grid Content */}
                            {weekDays.map((day, dayIdx) => {
                                const dateStr = format(day, "yyyy-MM-dd");
                                const dayRoutines = getRoutinesForDate(day).filter(filterRoutine);
                                const overlapStyles = calculateOverlaps(dayRoutines);

                                return (
                                    <div key={dayIdx} className={cn(
                                        "relative border-r last:border-r-0 border-white/10",
                                        isToday(day) && "bg-primary/[0.03]"
                                    )}>
                                        {/* Background horizontal lines */}
                                        {gridHours.map(h => (
                                            <div key={h} className="h-16 border-b border-white/5 last:border-b-0" />
                                        ))}
                                        
                                        {/* Routine Blocks */}
                                        {dayRoutines.map(r => {
                                            const pos = getPositionStyles(r.start_time, r.end_time);
                                            const overlap = overlapStyles.get(r.id);
                                            
                                            return (
                                                <RoutineBlock
                                                    key={r.id}
                                                    routine={r}
                                                    log={getLogForRoutineAndDate(r.id, dateStr)}
                                                    onClick={() => setLogTarget({ routine: r, dateStr })}
                                                    style={{
                                                        ...pos,
                                                        width: overlap?.width,
                                                        left: overlap?.left
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* Routine List */}
                    {routines.length > 0 && (
                        <div>
                            <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" /> Mis Rutinas
                            </h2>
                            <div className="space-y-3">
                                {routines.map(r => {
                                    const streak = getRoutineStreak(r.id);
                                    const cat = CATEGORIES.find(c => c.id === r.category);
                                    const dayNames = r.days_of_week.map(d => DAY_LABELS[d]).join(", ");
                                    const sub = r.subject_id ? subjects.find(s => s.id === r.subject_id) : null;

                                    return (
                                        <div key={r.id} className="card-gamer rounded-xl p-4 border border-border flex items-center gap-4">
                                            <div className="w-1.5 h-full min-h-[48px] rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold truncate">{r.name}</h3>
                                                    <span className="text-xs text-muted-foreground">{cat?.emoji}</span>
                                                </div>
                                                {sub && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <BookOpen className="w-3 h-3 text-primary" /> {sub.nombre}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    <Clock className="w-3 h-3 inline mr-1" />
                                                    {timeLabel(r.start_time)}–{timeLabel(r.end_time)} · {dayNames}
                                                </p>
                                                {r.end_date && (
                                                    <p className="text-xs text-muted-foreground">
                                                        hasta {format(parseISO(r.end_date), "d MMM yyyy", { locale: es })}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Streak */}
                                            <div className="hidden sm:block text-center">
                                                <p className="text-sm font-bold flex items-center gap-1">
                                                    <Flame className={cn("w-3 h-3", streak > 0 ? "text-orange-400" : "text-muted-foreground")} />
                                                    {streak}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">Racha</p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditRoutine(r); setFormOpen(true); }}>
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-orange-400 hover:text-orange-500" title="Cortar rutina" onClick={() => setConfirmStop(r)}>
                                                    <StopCircle className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(r.id)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Form Dialog */}
            <RoutineFormDialog
                open={formOpen}
                initial={editRoutine}
                subjects={subjects}
                onClose={() => { setFormOpen(false); setEditRoutine(null); }}
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
                onEdit={(r) => { setEditRoutine(r); setFormOpen(true); }}
            />

            {/* Stop Confirm Dialog */}
            <Dialog open={!!confirmStop} onOpenChange={() => setConfirmStop(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <StopCircle className="w-4 h-4 text-orange-400" /> Cortar rutina
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        La rutina <strong>"{confirmStop?.name}"</strong> quedará finalizada hoy. Se mantienen todos los registros pasados.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmStop(null)}>Cancelar</Button>
                        <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { if (confirmStop) stopRoutine(confirmStop.id); setConfirmStop(null); }}>
                            <StopCircle className="w-4 h-4 mr-1" /> Cortar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>¿Eliminar rutina?</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        Se eliminará la rutina y todos sus registros. Esta acción no se puede deshacer.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => { if (confirmDelete) deleteRoutine(confirmDelete); setConfirmDelete(null); }}>
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
