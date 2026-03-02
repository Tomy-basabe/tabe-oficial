import { useState, useMemo } from "react";
import { format, addDays, isToday, isFuture, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
    ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
    CheckCircle, XCircle, MinusCircle, CalendarDays, Flame,
    BarChart2, TrendingUp, RotateCcw, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
    useRoutines,
    type Routine,
    type RoutineLog,
    CATEGORIES,
    COLOR_OPTIONS,
    DAY_LABELS,
    DAY_LABELS_FULL,
} from "@/hooks/useRoutines";

// ─────────────────────────────────────────── helpers ──────────────────────────

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
    pending: { label: "Pendiente", icon: Clock, cls: "text-muted-foreground bg-muted/30" },
    completed: { label: "Cumplida", icon: CheckCircle, cls: "text-neon-green bg-neon-green/10" },
    partial: { label: "Parcial", icon: MinusCircle, cls: "text-neon-gold bg-neon-gold/10" },
    missed: { label: "No cumplida", icon: XCircle, cls: "text-destructive bg-destructive/10" },
};

// ─────────────────────────────────────────── Form Dialog ──────────────────────

interface RoutineFormDialogProps {
    open: boolean;
    initial?: Routine | null;
    onClose: () => void;
    onSave: (data: Parameters<ReturnType<typeof useRoutines>["createRoutine"]>[0]) => void;
}

function RoutineFormDialog({ open, initial, onClose, onSave }: RoutineFormDialogProps) {
    const [name, setName] = useState(initial?.name ?? "");
    const [desc, setDesc] = useState(initial?.description ?? "");
    const [category, setCategory] = useState(initial?.category ?? "general");
    const [color, setColor] = useState(initial?.color ?? "#00FFAA");
    const [days, setDays] = useState<number[]>(initial?.days_of_week ?? []);
    const [startDate, setStartDate] = useState(initial?.start_date ?? format(new Date(), "yyyy-MM-dd"));
    const [hasEnd, setHasEnd] = useState(!!initial?.end_date);
    const [endDate, setEndDate] = useState(initial?.end_date ?? "");

    const toggleDay = (d: number) =>
        setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());

    const handleSave = () => {
        if (!name.trim() || days.length === 0) return;
        onSave({
            name: name.trim(),
            description: desc.trim() || undefined,
            category,
            color,
            days_of_week: days,
            start_date: startDate,
            end_date: hasEnd ? endDate : undefined,
        });
        onClose();
    };

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
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Hacer ejercicio" className="mt-1" />
                    </div>

                    {/* Description */}
                    <div>
                        <Label>Descripción (opcional)</Label>
                        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Notas o detalles..." className="mt-1 h-20 resize-none" />
                    </div>

                    {/* Category */}
                    <div>
                        <Label>Categoría</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {CATEGORIES.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setCategory(c.id)}
                                    className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                                        category === c.id
                                            ? "border-primary bg-primary/20 text-primary"
                                            : "border-border text-muted-foreground hover:border-primary/50"
                                    )}
                                >
                                    {c.emoji} {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <Label>Color</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={cn("w-7 h-7 rounded-full border-2 transition-transform hover:scale-110",
                                        color === c ? "border-foreground scale-110" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Days */}
                    <div>
                        <Label>Días de la semana *</Label>
                        <div className="mt-1 flex gap-1">
                            {DAY_LABELS.map((label, i) => (
                                <button
                                    key={i}
                                    onClick={() => toggleDay(i)}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg text-xs font-semibold border transition-all",
                                        days.includes(i)
                                            ? "border-primary bg-primary/20 text-primary"
                                            : "border-border text-muted-foreground hover:border-primary/50"
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Fecha de inicio</Label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <Label className="flex items-center gap-2">
                                Fecha fin
                                <input type="checkbox" checked={hasEnd} onChange={(e) => setHasEnd(e.target.checked)} className="ml-1" />
                            </Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                disabled={!hasEnd}
                                className="mt-1"
                            />
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

// ─────────────────────────────────────────── Log Dialog ───────────────────────

interface RoutineLogDialogProps {
    open: boolean;
    routine: Routine | null;
    dateStr: string;
    existingLog?: RoutineLog;
    prevLogs: RoutineLog[];
    onClose: () => void;
    onLog: (routineId: string, dateStr: string, data: { status: "completed" | "partial" | "missed"; completion_percentage: number; notes?: string }) => void;
}

function RoutineLogDialog({ open, routine, dateStr, existingLog, prevLogs, onClose, onLog }: RoutineLogDialogProps) {
    const [status, setStatus] = useState<"completed" | "partial" | "missed">(
        (existingLog?.status as any) === "pending" || !existingLog ? "completed" : existingLog.status as any
    );
    const [pct, setPct] = useState(existingLog?.completion_percentage ?? 100);
    const [notes, setNotes] = useState(existingLog?.notes ?? "");

    if (!routine) return null;

    const cat = CATEGORIES.find((c) => c.id === routine.category);
    const isFut = isFuture(parseISO(dateStr + "T23:59:59"));

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: routine.color }} />
                        {routine.name}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        {cat?.emoji} {cat?.label} · {format(parseISO(dateStr), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                </DialogHeader>

                {isFut ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">
                        📅 Esta fecha está en el futuro. Podrás registrarla cuando llegue el día.
                    </p>
                ) : (
                    <div className="space-y-4 pt-2">
                        {/* Status buttons */}
                        <div>
                            <Label>Estado</Label>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {(["completed", "partial", "missed"] as const).map((s) => {
                                    const cfg = STATUS_CONFIG[s];
                                    const Icon = cfg.icon;
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => { setStatus(s); if (s === "completed") setPct(100); if (s === "missed") setPct(0); }}
                                            className={cn(
                                                "flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all",
                                                status === s ? `border-current ${cfg.cls}` : "border-border text-muted-foreground hover:border-primary/50"
                                            )}
                                        >
                                            <Icon className="w-5 h-5" />
                                            {cfg.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Partial percentage */}
                        {status === "partial" && (
                            <div>
                                <Label>Porcentaje completado: <strong>{pct}%</strong></Label>
                                <Slider
                                    value={[pct]}
                                    onValueChange={([v]) => setPct(v)}
                                    min={1} max={99} step={1}
                                    className="mt-3"
                                />
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <Label>Notas (opcional)</Label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="¿Cómo te fue? ¿Algo a mejorar?"
                                className="mt-1 h-20 resize-none"
                            />
                        </div>

                        {/* History */}
                        {prevLogs.length > 0 && (
                            <div>
                                <Label>Últimos registros</Label>
                                <div className="mt-2 flex gap-1.5 flex-wrap">
                                    {prevLogs.slice(0, 7).map((l) => {
                                        const cfg = STATUS_CONFIG[l.status];
                                        const Icon = cfg.icon;
                                        return (
                                            <div key={l.id} className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-xs", cfg.cls)}>
                                                <Icon className="w-3 h-3" />
                                                {l.status === "partial" ? `${l.completion_percentage}%` : format(parseISO(l.log_date), "d/M")}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className="mt-2">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    {!isFut && (
                        <Button onClick={() => { onLog(routine.id, dateStr, { status, completion_percentage: pct, notes: notes || undefined }); onClose(); }}>
                            Registrar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─────────────────────────────────────────── Main Page ────────────────────────

export default function Routines() {
    const {
        routines, logs, loading, currentWeekStart,
        createRoutine, updateRoutine, deleteRoutine, logRoutine,
        getRoutinesForDate, getLogForRoutineAndDate, weekStats, getRoutineStreak,
        goToPrevWeek, goToNextWeek, goToCurrentWeek,
    } = useRoutines();

    const [formOpen, setFormOpen] = useState(false);
    const [editRoutine, setEditRoutine] = useState<Routine | null>(null);
    const [logTarget, setLogTarget] = useState<{ routine: Routine; dateStr: string } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const weekDays = useMemo(() =>
        Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
        [currentWeekStart]
    );

    const stats = weekStats();

    const handleSave = (data: any) => {
        if (editRoutine) {
            updateRoutine(editRoutine.id, data);
        } else {
            createRoutine(data);
        }
        setEditRoutine(null);
    };

    const logTargetPrevLogs = useMemo(() => {
        if (!logTarget) return [];
        return logs
            .filter((l) => l.routine_id === logTarget.routine.id && l.log_date !== logTarget.dateStr)
            .sort((a, b) => b.log_date.localeCompare(a.log_date));
    }, [logs, logTarget]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-5xl">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-display font-bold gradient-text">Rutinas</h1>
                        <p className="text-muted-foreground text-sm mt-1">Construí hábitos consistentes semana a semana</p>
                    </div>
                    <Button onClick={() => { setEditRoutine(null); setFormOpen(true); }} className="gap-2 self-start sm:self-auto">
                        <Plus className="w-4 h-4" /> Nueva Rutina
                    </Button>
                </div>

                {/* Week navigation */}
                <div className="flex items-center justify-between mb-4 gap-2">
                    <Button variant="outline" size="icon" onClick={goToPrevWeek}><ChevronLeft className="w-4 h-4" /></Button>
                    <div className="text-center">
                        <p className="font-semibold">
                            {format(currentWeekStart, "d MMM", { locale: es })} — {format(addDays(currentWeekStart, 6), "d MMM yyyy", { locale: es })}
                        </p>
                        <button onClick={goToCurrentWeek} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mx-auto mt-0.5">
                            <RotateCcw className="w-3 h-3" /> Semana actual
                        </button>
                    </div>
                    <Button variant="outline" size="icon" onClick={goToNextWeek}><ChevronRight className="w-4 h-4" /></Button>
                </div>

                {/* Weekly progress bar */}
                <div className="card-gamer rounded-2xl p-4 mb-6 border border-border">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium flex items-center gap-1.5">
                            <BarChart2 className="w-4 h-4 text-primary" /> Progreso semanal
                        </span>
                        <span className="text-sm font-bold">{stats.pct}%</span>
                    </div>
                    <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                            className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                            style={{ width: `${stats.pct}%`, background: "linear-gradient(to right, var(--neon-cyan), var(--neon-purple))" }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                        {Math.round(stats.done)} de {stats.scheduled} rutinas completadas esta semana
                    </p>
                </div>

                {/* Weekly grid */}
                {routines.length === 0 ? (
                    <div className="card-gamer rounded-2xl p-12 text-center border border-dashed border-border mb-8">
                        <CalendarDays className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                        <h3 className="font-bold text-lg mb-2">Sin rutinas todavía</h3>
                        <p className="text-muted-foreground text-sm mb-4">Creá tu primera rutina y empezá a construir hábitos consistentes.</p>
                        <Button onClick={() => setFormOpen(true)} className="gap-2">
                            <Plus className="w-4 h-4" /> Crear mi primera rutina
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-7 gap-1.5 mb-8">
                        {weekDays.map((day) => {
                            const dateStr = format(day, "yyyy-MM-dd");
                            const dayRoutines = getRoutinesForDate(day);
                            const today = isToday(day);
                            const future = isFuture(new Date(dateStr + "T23:59:59"));

                            return (
                                <div key={dateStr} className={cn("rounded-xl p-2 min-h-[140px] border transition-colors", today ? "border-primary/50 bg-primary/5" : "border-border bg-card/50")}>
                                    <div className="text-center mb-2">
                                        <p className={cn("text-xs font-semibold", today ? "text-primary" : "text-muted-foreground")}>
                                            {DAY_LABELS[(day.getDay())]}
                                        </p>
                                        <p className={cn("text-sm font-bold", today ? "text-primary" : "")}>
                                            {format(day, "d")}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        {dayRoutines.length === 0 && (
                                            <p className="text-[10px] text-muted-foreground/50 text-center mt-2">—</p>
                                        )}
                                        {dayRoutines.map((r) => {
                                            const log = getLogForRoutineAndDate(r.id, dateStr);
                                            const cfg = STATUS_CONFIG[log?.status ?? "pending"];
                                            const Icon = cfg.icon;
                                            return (
                                                <button
                                                    key={r.id}
                                                    onClick={() => setLogTarget({ routine: r, dateStr })}
                                                    className={cn(
                                                        "w-full text-left rounded-lg px-1.5 py-1 text-[10px] font-medium border transition-all hover:scale-[1.02]",
                                                        log?.status === "completed" ? "border-neon-green/30 bg-neon-green/10"
                                                            : log?.status === "partial" ? "border-neon-gold/30 bg-neon-gold/10"
                                                                : log?.status === "missed" ? "border-destructive/30 bg-destructive/10"
                                                                    : future ? "border-border/50 bg-muted/10 opacity-50"
                                                                        : "border-border bg-muted/20 hover:border-primary/40"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                                                        <span className="truncate flex-1">{r.name}</span>
                                                        <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                                                    </div>
                                                    {log?.status === "partial" && (
                                                        <div className="h-0.5 bg-secondary rounded-full mt-1 overflow-hidden">
                                                            <div className="h-full bg-neon-gold" style={{ width: `${log.completion_percentage}%` }} />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Routine list & stats */}
                {routines.length > 0 && (
                    <div>
                        <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" /> Mis Rutinas
                        </h2>
                        <div className="space-y-3">
                            {routines.map((r) => {
                                const streak = getRoutineStreak(r.id);
                                const cat = CATEGORIES.find((c) => c.id === r.category);
                                const dayNames = r.days_of_week.map((d) => DAY_LABELS[d]).join(", ");
                                // total logs for this routine
                                const routineLogs = logs.filter((l) => l.routine_id === r.id);
                                const avgPct = routineLogs.length > 0
                                    ? Math.round(routineLogs.reduce((s, l) => s + l.completion_percentage, 0) / routineLogs.length)
                                    : 0;

                                return (
                                    <div key={r.id} className="card-gamer rounded-xl p-4 border border-border flex items-center gap-4">
                                        <div className="w-3 h-full min-h-[40px] rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold truncate">{r.name}</h3>
                                                <span className="text-xs text-muted-foreground">{cat?.emoji}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{dayNames}</p>
                                            {r.end_date && (
                                                <p className="text-xs text-muted-foreground">
                                                    hasta {format(parseISO(r.end_date), "d MMM yyyy", { locale: es })}
                                                </p>
                                            )}
                                        </div>

                                        {/* Stats */}
                                        <div className="hidden sm:flex items-center gap-4 text-center">
                                            <div>
                                                <p className="text-sm font-bold flex items-center gap-1">
                                                    <Flame className={cn("w-3 h-3", streak > 0 ? "text-orange-400" : "text-muted-foreground")} />
                                                    {streak}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">Racha</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">{avgPct}%</p>
                                                <p className="text-[10px] text-muted-foreground">Promedio</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditRoutine(r); setFormOpen(true); }}>
                                                <Pencil className="w-3.5 h-3.5" />
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
            </div>

            {/* Form Dialog */}
            <RoutineFormDialog
                open={formOpen}
                initial={editRoutine}
                onClose={() => { setFormOpen(false); setEditRoutine(null); }}
                onSave={handleSave}
            />

            {/* Log Dialog */}
            <RoutineLogDialog
                open={!!logTarget}
                routine={logTarget?.routine ?? null}
                dateStr={logTarget?.dateStr ?? ""}
                existingLog={logTarget ? getLogForRoutineAndDate(logTarget.routine.id, logTarget.dateStr) : undefined}
                prevLogs={logTargetPrevLogs}
                onClose={() => setLogTarget(null)}
                onLog={logRoutine}
            />

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
