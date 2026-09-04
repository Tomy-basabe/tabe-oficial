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
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white border-4 border-black shadow-[8px_8px_0_0_#000] rounded-xl p-6">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase text-black">{initial ? "Editar Rutina" : "Nueva Rutina"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    {/* Name */}
                    <div>
                        <Label className="font-bold text-black uppercase tracking-wider text-xs">Nombre *</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Estudiar Análisis" className="mt-1 bg-white border-[3px] border-black rounded-lg shadow-[4px_4px_0_0_#000] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#000] transition-all font-bold text-black" />
                    </div>

                    {/* Description */}
                    <div>
                        <Label className="font-bold text-black uppercase tracking-wider text-xs">Descripción (opcional)</Label>
                        <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Notas..." className="mt-1 h-16 resize-none bg-white border-[3px] border-black rounded-lg shadow-[4px_4px_0_0_#000] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#000] transition-all font-bold text-black" />
                    </div>

                    {/* Time range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="font-bold text-black uppercase tracking-wider text-xs">Hora inicio *</Label>
                            <Select value={startTime} onValueChange={setStartTime}>
                                <SelectTrigger className="mt-1 bg-white border-[3px] border-black rounded-lg shadow-[4px_4px_0_0_#000] focus:ring-0 focus:shadow-[2px_2px_0_0_#000] transition-all font-bold text-black">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] max-h-48">
                                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t} className="font-bold text-black focus:bg-black/5 cursor-pointer">{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="font-bold text-black uppercase tracking-wider text-xs">Hora fin *</Label>
                            <Select value={endTime} onValueChange={setEndTime}>
                                <SelectTrigger className="mt-1 bg-white border-[3px] border-black rounded-lg shadow-[4px_4px_0_0_#000] focus:ring-0 focus:shadow-[2px_2px_0_0_#000] transition-all font-bold text-black">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] max-h-48">
                                    {TIME_OPTIONS.filter(t => t > startTime).map(t => <SelectItem key={t} value={t} className="font-bold text-black focus:bg-black/5 cursor-pointer">{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Materia */}
                    <div>
                        <Label className="font-bold text-black uppercase tracking-wider text-xs">Materia (opcional)</Label>
                        <Select value={subjectId} onValueChange={setSubjectId}>
                            <SelectTrigger className="mt-1 bg-white border-[3px] border-black rounded-lg shadow-[4px_4px_0_0_#000] focus:ring-0 focus:shadow-[2px_2px_0_0_#000] transition-all font-bold text-black text-left truncate">
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] max-h-[200px]">
                                <SelectItem value="none" className="font-bold text-black focus:bg-black/5 cursor-pointer">General (sin materia)</SelectItem>
                                {Object.entries(subjectsByYear).sort(([a], [b]) => Number(a) - Number(b)).map(([año, subs]) => (
                                    subs.map(sub => (
                                        <SelectItem key={sub.id} value={sub.id} className="font-bold text-black focus:bg-black/5 cursor-pointer">
                                            {año}° — {sub.nombre}
                                        </SelectItem>
                                    ))
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Category */}
                    <div>
                        <Label className="font-bold text-black uppercase tracking-wider text-xs">Categoría</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {CATEGORIES.map(c => (
                                <button key={c.id} onClick={() => setCategory(c.id)}
                                    className={cn("px-3 py-1.5 rounded-lg text-xs font-black border-[3px] border-black transition-all shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px]",
                                        category === c.id ? "bg-[#BFFF00] text-black" : "bg-white text-black hover:bg-black/5"
                                    )}>
                                    {c.emoji} {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <Label className="font-bold text-black uppercase tracking-wider text-xs">Color</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map(c => (
                                <button key={c} onClick={() => setColor(c)}
                                    className={cn("w-8 h-8 rounded-lg border-[3px] border-black transition-transform shadow-[2px_2px_0_0_#000]",
                                        color === c ? "scale-110 shadow-[4px_4px_0_0_#000]" : "hover:scale-110"
                                    )} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>

                    {/* Days */}
                    <div>
                        <Label className="font-bold text-black uppercase tracking-wider text-xs">Días de la semana *</Label>
                        <div className="mt-2 flex gap-1 sm:gap-2">
                            {DAY_LABELS.map((label, i) => (
                                <button key={i} onClick={() => toggleDay(i)}
                                    className={cn("flex-1 py-2 rounded-lg text-xs sm:text-sm font-black border-[3px] border-black transition-all shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px]",
                                        days.includes(i) ? "bg-[#00E5FF] text-black" : "bg-white text-black hover:bg-black/5"
                                    )}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="font-bold text-black uppercase tracking-wider text-xs">Fecha de inicio</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 bg-white border-[3px] border-black rounded-lg shadow-[4px_4px_0_0_#000] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#000] transition-all font-bold text-black" />
                        </div>
                        <div>
                            <Label className="font-bold text-black uppercase tracking-wider text-xs flex items-center gap-2">
                                Fecha fin <input type="checkbox" checked={hasEnd} onChange={e => setHasEnd(e.target.checked)} className="ml-1 w-4 h-4 border-2 border-black rounded accent-black" />
                            </Label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={!hasEnd} className="mt-1 bg-white border-[3px] border-black rounded-lg shadow-[4px_4px_0_0_#000] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#000] transition-all font-bold text-black disabled:opacity-50" />
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl border-4 border-black font-black uppercase bg-white text-black hover:bg-black/5 transition-colors w-full sm:w-auto">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={!name.trim() || days.length === 0}
                        className="px-6 py-3 rounded-xl border-4 border-black font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all bg-[#00E5FF] text-black disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_0_#000] w-full sm:w-auto">
                        {initial ? "Guardar" : "Crear"}
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
            <DialogContent className="max-w-sm bg-white border-4 border-black shadow-[8px_8px_0_0_#000] rounded-xl p-6">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase text-black">
                            <span className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-black" style={{ backgroundColor: routine.color }} />
                            {routine.name}
                        </DialogTitle>
                        <button className="h-8 w-8 flex items-center justify-center border-2 border-transparent hover:border-black rounded-lg transition-all text-black hover:bg-[#FFE66D]" 
                            onClick={() => { onEdit(routine); onClose(); }}>
                            <Pencil className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-sm font-bold text-black/70 flex items-center gap-1 mt-1">
                        {cat?.emoji} {timeLabel(routine.start_time)}–{timeLabel(routine.end_time)} · {format(parseISO(dateStr), "EEEE d MMM", { locale: es })}
                    </p>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    {/* Mode tabs */}
                    <div className="flex gap-2">
                        <button onClick={() => setMode("check")}
                            className={cn("flex-1 py-2 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-2 border-[3px] border-black shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px]",
                                mode === "check" ? "bg-[#BFFF00] text-black" : "bg-white text-black hover:bg-black/5")}>
                            <Check className="w-4 h-4" /> Sí/No
                        </button>
                        <button onClick={() => setMode("percentage")}
                            className={cn("flex-1 py-2 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-2 border-[3px] border-black shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px]",
                                mode === "percentage" ? "bg-[#00E5FF] text-black" : "bg-white text-black hover:bg-black/5")}>
                            <Percent className="w-4 h-4" /> Porc.
                        </button>
                    </div>

                    {mode === "check" ? (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <button onClick={() => setCompleted(true)}
                                className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border-4 border-black transition-all hover:translate-y-[-2px] shadow-[4px_4px_0_0_#000]",
                                    completed ? "bg-[#BFFF00] shadow-[6px_6px_0_0_#000]" : "bg-white hover:bg-[#BFFF00]/20")}>
                                <CheckCircle className="w-8 h-8 text-black" />
                                <span className="text-sm font-black uppercase tracking-wider text-black">Cumplida</span>
                            </button>
                            <button onClick={() => setCompleted(false)}
                                className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border-4 border-black transition-all hover:translate-y-[-2px] shadow-[4px_4px_0_0_#000]",
                                    !completed ? "bg-[#FF5C5C] shadow-[6px_6px_0_0_#000]" : "bg-white hover:bg-[#FF5C5C]/20")}>
                                <XCircle className="w-8 h-8 text-black" />
                                <span className="text-sm font-black uppercase tracking-wider text-black">No cumpl.</span>
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white p-4 rounded-xl border-[3px] border-black shadow-[4px_4px_0_0_#000] mt-4">
                            <div className="flex items-center justify-between mb-4">
                                <Label className="font-black uppercase tracking-wider text-black">Cumplimiento</Label>
                                <span className={cn("text-3xl font-black",
                                    pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-500" : "text-red-500"
                                )} style={{ WebkitTextStroke: '1px black' }}>{pct}%</span>
                            </div>
                            <Slider value={[pct]} onValueChange={([v]) => setPct(v)} min={0} max={100} step={5} className="mt-2" />
                            <div className="flex justify-between mt-2 text-xs font-bold text-black/60">
                                <span>0%</span><span>50%</span><span>100%</span>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="mt-4">
                        <Label className="font-bold text-black uppercase tracking-wider text-xs">Notas (opcional)</Label>
                        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="¿Algo a destacar?" className="mt-1 h-20 resize-none bg-white border-[3px] border-black rounded-lg shadow-[4px_4px_0_0_#000] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_#000] transition-all font-bold text-black" />
                    </div>
                </div>

                <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl border-4 border-black font-black uppercase bg-white text-black hover:bg-black/5 transition-colors w-full sm:w-auto">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="px-6 py-3 rounded-xl border-4 border-black font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all bg-[#BFFF00] text-black w-full sm:w-auto">
                        Guardar
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
            style={{ ...style, backgroundColor: routine.color }}
            className={cn(
                "absolute rounded-md px-2 py-1 border-[3px] border-black transition-all hover:z-10 hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#000] shadow-[2px_2px_0_0_#000] group overflow-hidden flex flex-col items-start justify-start text-left",
                isDone && "after:absolute after:inset-0 after:bg-white/40",
                hasPct && "after:absolute after:inset-0 after:bg-black/10"
            )}>
            
            <div className="relative z-10 w-full h-full flex flex-col justify-start overflow-hidden">
                <p className={cn("text-[11px] sm:text-xs font-black truncate leading-tight text-black mix-blend-color-burn")}>
                    {routine.name}
                </p>
                <p className="text-[9px] sm:text-[10px] text-black/80 font-black font-mono mt-0.5">
                    {timeLabel(routine.start_time)}–{timeLabel(routine.end_time)}
                </p>
                {isDone && <CheckCircle className="w-3 h-3 text-black absolute bottom-1 right-1 mix-blend-color-burn" />}
                {hasPct && <span className="text-[10px] text-black font-black absolute bottom-1 right-1 mix-blend-color-burn">{log!.completion_percentage}%</span>}
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
      {/* Header Banner */}
      <div className="bg-[#8B5CF6] rounded-2xl p-6 lg:p-8 border-4 border-black shadow-[8px_8px_0_0_#000] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative badge */}
        <div className="absolute top-4 right-4 bg-[#FFE66D] text-black font-black text-xs px-3 py-1 uppercase border-2 border-black rotate-[5deg] shadow-[2px_2px_0_0_#000] hidden md:block">
          ¡A meterle garra!
        </div>
        
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-white border-4 border-black rounded-xl shadow-[4px_4px_0_0_#000] flex items-center justify-center rotate-[-6deg] flex-shrink-0">
            <CalendarDays className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className="font-display text-3xl lg:text-4xl font-black uppercase tracking-wider text-black" style={{ textShadow: '2px 2px 0 #fff, 4px 4px 0 #000' }}>
              Mis Rutinas
            </h1>
            <p className="font-bold text-black/90 mt-1 text-sm sm:text-base bg-white/50 px-2 py-1 inline-block rounded-md border-2 border-black">
              Organiza tu semana y registra tu cumplimiento
            </p>
          </div>
        </div>
        
        <button
          onClick={() => { setEditRoutine(null); setFormOpen(true); }}
          className="relative z-10 flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black border-4 border-black font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] hover:bg-[#00E5FF] transition-all w-full md:w-auto justify-center"
        >
          <Plus className="w-6 h-6" />
          Nueva Rutina
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000]">
        <Filter className="w-5 h-5 text-black" />
        <div className="w-[140px]">
          <Select value={filterYear} onValueChange={v => { setFilterYear(v); setFilterSubject("all"); }}>
            <SelectTrigger className="w-full h-auto px-4 py-2 bg-white text-black rounded-lg border-[3px] border-black focus:ring-0 focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-all font-bold text-left truncate">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] rounded-xl">
              <SelectItem value="all" className="font-bold focus:bg-black/5 cursor-pointer">Todos los años</SelectItem>
              {yearOptions.map(y => <SelectItem key={y} value={String(y)} className="font-bold focus:bg-black/5 cursor-pointer">{y}° año</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[180px]">
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-full h-auto px-4 py-2 bg-white text-black rounded-lg border-[3px] border-black focus:ring-0 focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-all font-bold text-left truncate">
              <SelectValue placeholder="Materia" />
            </SelectTrigger>
            <SelectContent className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] rounded-xl max-h-[200px]">
              <SelectItem value="all" className="font-bold focus:bg-black/5 cursor-pointer">Todas las materias</SelectItem>
              {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id} className="font-bold focus:bg-black/5 cursor-pointer">{s.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {(filterYear !== "all" || filterSubject !== "all") && (
          <button onClick={() => { setFilterYear("all"); setFilterSubject("all"); }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border-[3px] border-black font-black uppercase text-xs bg-[#FF5C5C] text-black shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] transition-all">
            <RotateCcw className="w-4 h-4" /> Limpiar
          </button>
        )}
      </div>

      {/* Week navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl p-4 border-4 border-black shadow-[4px_4px_0_0_#000]">
        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <button onClick={goToPrevWeek} className="p-2 rounded-lg border-[3px] border-black bg-[#FFE66D] shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] transition-all text-black">
            <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
            <CalendarDays className="w-6 h-6 text-black hidden sm:block" />
            <span className="font-black text-sm lg:text-base tracking-wider uppercase text-black">
                {format(currentWeekStart, "d MMM", { locale: es })} — {format(addDays(currentWeekStart, 6), "d MMM yyyy", { locale: es })}
            </span>
            </div>
            <button onClick={goToNextWeek} className="p-2 rounded-lg border-[3px] border-black bg-[#FFE66D] shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] transition-all text-black">
            <ChevronRight className="w-5 h-5" />
            </button>
        </div>
        <button onClick={goToCurrentWeek} className="w-full sm:w-auto px-4 py-2 rounded-lg border-[3px] border-black bg-[#00E5FF] shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] transition-all text-black font-black uppercase text-xs">
          Hoy
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Cumplimiento", val: `${stats.pct}%`, color: stats.pct >= 70 ? "bg-[#BFFF00]" : stats.pct >= 40 ? "bg-[#FFE66D]" : "bg-[#FF5C5C]" },
          { label: "Programadas", val: stats.scheduled, color: "bg-[#00E5FF]" },
          { label: "Completadas", val: stats.done, color: "bg-[#FF9B71]" }
        ].map((s, i) => (
          <div key={i} className={cn("rounded-xl p-4 text-center border-4 border-black shadow-[4px_4px_0_0_#000] flex flex-col items-center justify-center transition-transform hover:scale-[1.02]", s.color)}>
            <p className="text-3xl lg:text-4xl font-black text-black leading-none drop-shadow-[2px_2px_0_#fff]">{s.val}</p>
            <p className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-black mt-2 bg-white/50 px-2 py-0.5 rounded border-2 border-black">{s.label}</p>
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
                    <div className="bg-white rounded-xl border-4 border-black shadow-[8px_8px_0_0_#000] overflow-hidden">
                        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                            {/* Sticky corner */}
                            <div className="h-12 border-b-4 border-r-4 border-black bg-[#FFE66D]" />
                            
                            {/* Day headers */}
                            {weekDays.map((day, i) => (
                                <div key={i} className={cn(
                                    "h-12 flex flex-col items-center justify-center border-b-4 border-r-4 last:border-r-0 border-black",
                                    isToday(day) ? "bg-[#00E5FF]" : "bg-[#FFE66D]"
                                )}>
                                    <span className="text-[10px] text-black uppercase font-black tracking-tighter">
                                        {DAY_LABELS[day.getDay()]}
                                    </span>
                                    <span className={cn("text-lg font-display font-black leading-none text-black")}>{format(day, "d")}</span>
                                </div>
                            ))}

                            {/* Time sidebar */}
                            <div className="relative border-r-4 border-black bg-white">
                                {gridHours.map(h => (
                                    <div key={h} className="h-16 flex items-start justify-end pr-2 pt-1 border-b-2 border-black/20 last:border-b-0">
                                        <span className="text-[10px] text-black/60 font-black font-mono">
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
                                        "relative border-r-4 last:border-r-0 border-black",
                                        isToday(day) ? "bg-[#00E5FF]/5" : "bg-white"
                                    )}>
                                        {/* Background horizontal lines */}
                                        {gridHours.map(h => (
                                            <div key={h} className="h-16 border-b-2 border-black/20 last:border-b-0" />
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
                            <h2 className="text-2xl font-display font-black uppercase tracking-widest mb-6 flex items-center gap-3 text-black">
                                <TrendingUp className="w-8 h-8 text-black" /> Mis Rutinas
                            </h2>
                            <div className="space-y-4">
                                {routines.map(r => {
                                    const streak = getRoutineStreak(r.id);
                                    const cat = CATEGORIES.find(c => c.id === r.category);
                                    const dayNames = r.days_of_week.map(d => DAY_LABELS[d]).join(", ");
                                    const sub = r.subject_id ? subjects.find(s => s.id === r.subject_id) : null;

                                    return (
                                        <div key={r.id} className="bg-white rounded-xl p-4 sm:p-5 border-4 border-black shadow-[4px_4px_0_0_#000] flex flex-col sm:flex-row sm:items-center gap-4 transition-transform hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000]">
                                            <div className="w-4 h-full min-h-[48px] rounded-full flex-shrink-0 border-2 border-black hidden sm:block" style={{ backgroundColor: r.color }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="font-black text-lg sm:text-xl truncate text-black">{r.name}</h3>
                                                    <span className="text-sm bg-black/5 px-2 py-0.5 rounded-md border-2 border-black">{cat?.emoji}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-xs font-bold text-black/80">
                                                    {sub && (
                                                        <span className="flex items-center gap-1 bg-[#00E5FF]/20 px-2 py-0.5 rounded border-2 border-black/20">
                                                            <BookOpen className="w-3 h-3" /> {sub.nombre}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1 bg-[#FFE66D]/40 px-2 py-0.5 rounded border-2 border-black/20">
                                                        <Clock className="w-3 h-3" />
                                                        {timeLabel(r.start_time)}–{timeLabel(r.end_time)} · {dayNames}
                                                    </span>
                                                    {r.end_date && (
                                                        <span className="flex items-center gap-1 bg-black/5 px-2 py-0.5 rounded border-2 border-black/20">
                                                            hasta {format(parseISO(r.end_date), "d MMM yyyy", { locale: es })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0">
                                                {/* Streak */}
                                                <div className="text-center bg-[#FF9B71]/20 px-3 py-1 rounded-lg border-2 border-black">
                                                    <p className="text-sm font-black flex items-center justify-center gap-1 text-black">
                                                        <Flame className={cn("w-4 h-4", streak > 0 ? "text-[#FF5C5C] fill-[#FF5C5C]" : "text-black")} />
                                                        {streak}
                                                    </p>
                                                    <p className="text-[9px] uppercase tracking-widest text-black/70 font-bold">Racha</p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button onClick={() => { setEditRoutine(r); setFormOpen(true); }}
                                                        className="p-2 bg-[#FFE66D] border-[3px] border-black rounded-lg shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] transition-all text-black">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setConfirmStop(r)} title="Cortar rutina"
                                                        className="p-2 bg-[#FF9B71] border-[3px] border-black rounded-lg shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] transition-all text-black">
                                                        <StopCircle className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setConfirmDelete(r.id)}
                                                        className="p-2 bg-[#FF5C5C] border-[3px] border-black rounded-lg shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] transition-all text-black">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
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
                <DialogContent className="max-w-sm bg-[#FF9B71] border-4 border-black shadow-[8px_8px_0_0_#000] rounded-xl p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase text-black">
                            <StopCircle className="w-6 h-6 text-black" /> Cortar rutina
                        </DialogTitle>
                    </DialogHeader>
                    <p className="font-bold text-black text-sm mt-2">
                        La rutina <strong>"{confirmStop?.name}"</strong> quedará finalizada hoy. Se mantienen todos los registros pasados.
                    </p>
                    <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button onClick={() => setConfirmStop(null)} className="px-6 py-3 rounded-xl border-4 border-black font-black uppercase bg-white text-black hover:bg-black/5 transition-colors w-full sm:w-auto">
                            Cancelar
                        </button>
                        <button onClick={() => { if (confirmStop) stopRoutine(confirmStop.id); setConfirmStop(null); }} className="px-6 py-3 rounded-xl border-4 border-black font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all bg-black text-white w-full sm:w-auto flex justify-center items-center gap-2">
                            <StopCircle className="w-5 h-5" /> Cortar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
                <DialogContent className="max-w-sm bg-[#FF5C5C] border-4 border-black shadow-[8px_8px_0_0_#000] rounded-xl p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase text-black">
                            <Trash2 className="w-6 h-6 text-black" /> ¿Eliminar rutina?
                        </DialogTitle>
                    </DialogHeader>
                    <p className="font-bold text-black text-sm mt-2">
                        Se eliminará la rutina y todos sus registros. Esta acción no se puede deshacer.
                    </p>
                    <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button onClick={() => setConfirmDelete(null)} className="px-6 py-3 rounded-xl border-4 border-black font-black uppercase bg-white text-black hover:bg-black/5 transition-colors w-full sm:w-auto">
                            Cancelar
                        </button>
                        <button onClick={() => { if (confirmDelete) deleteRoutine(confirmDelete); setConfirmDelete(null); }} className="px-6 py-3 rounded-xl border-4 border-black font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all bg-black text-white w-full sm:w-auto flex justify-center items-center gap-2">
                            Eliminar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
