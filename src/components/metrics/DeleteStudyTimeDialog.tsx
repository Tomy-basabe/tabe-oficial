import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectGroup,
  SelectItem, SelectLabel, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Trash2, Clock, Calendar, AlertTriangle, BookOpen, Filter, CheckCircle2, Check } from "lucide-react";
import { cn, toLocalDateStr } from "@/lib/utils";
import { invalidateDashboardStatsCache } from "@/hooks/useDashboardStats";
import HoldButton from "@/components/ui/HoldButton";

export interface StudySessionItem {
  id?: string;
  fecha: string;
  duracion_segundos: number;
  tipo: string;
  subject_id: string | null;
}

interface DeleteStudyTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  subjects: { id: string; nombre: string; año?: number }[];
  sessions: StudySessionItem[];
  initialDate?: string;
  initialSubjectId?: string;
}

export function DeleteStudyTimeDialog({
  open,
  onOpenChange,
  onSuccess,
  subjects,
  sessions,
  initialDate,
  initialSubjectId,
}: DeleteStudyTimeDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fecha, setFecha] = useState(initialDate || toLocalDateStr(new Date()));
  const [subjectId, setSubjectId] = useState(initialSubjectId || "all");
  const [yearFilter, setYearFilter] = useState<number | "">("");
  const [horas, setHoras] = useState("0");
  const [minutos, setMinutos] = useState("0");

  useEffect(() => {
    if (open) {
      setFecha(initialDate || toLocalDateStr(new Date()));
      setSubjectId(initialSubjectId || "all");
      setHoras("0");
      setMinutos("0");
    }
  }, [open, initialDate, initialSubjectId]);

  // Lista de años para el filtro
  const years = useMemo(() => {
    return [...new Set(subjects.filter(s => s.año).map(s => s.año!))].sort((a, b) => a - b);
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    return yearFilter ? subjects.filter(s => s.año === yearFilter) : subjects;
  }, [subjects, yearFilter]);

  // Calcular las sesiones que coinciden con la fecha y materia seleccionada
  const matchingSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchDate = s.fecha === fecha;
      if (!matchDate) return false;

      if (subjectId === "all") return true;
      if (subjectId === "none") return !s.subject_id;
      return s.subject_id === subjectId;
    });
  }, [sessions, fecha, subjectId]);

  // Total de segundos disponibles para eliminar en este contexto
  const totalAvailableSeconds = useMemo(() => {
    return matchingSessions.reduce((acc, s) => acc + s.duracion_segundos, 0);
  }, [matchingSessions]);

  const availableHours = Math.floor(totalAvailableSeconds / 3600);
  const availableMinutes = Math.floor((totalAvailableSeconds % 3600) / 60);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const h = parseFloat(horas) || 0;
  const m = parseFloat(minutos) || 0;
  const totalSecondsToDelete = Math.round(h * 3600 + m * 60);

  const isExceeded = totalSecondsToDelete > totalAvailableSeconds;
  const isValidAmount = totalSecondsToDelete > 0 && !isExceeded;

  const handleSetToday = () => setFecha(toLocalDateStr(new Date()));
  const handleSetYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setFecha(toLocalDateStr(yesterday));
  };

  // Botón para seleccionar todo el tiempo disponible
  const handleSelectAll = () => {
    setHoras(String(availableHours));
    setMinutos(String(availableMinutes));
  };

  const handlePreset = (presetMinutes: number) => {
    const hPreset = Math.floor(presetMinutes / 60);
    const mPreset = presetMinutes % 60;
    if (presetMinutes * 60 <= totalAvailableSeconds) {
      setHoras(String(hPreset));
      setMinutos(String(mPreset));
    } else {
      handleSelectAll();
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!isValidAmount) {
      if (isExceeded) {
        toast.error(`No puedes eliminar más tiempo del cargado (${formatDuration(totalAvailableSeconds)})`);
      } else {
        toast.error("Debes indicar una cantidad de tiempo mayor a 0");
      }
      return;
    }

    setLoading(true);
    try {
      // 1. Obtener las sesiones de la base de datos para esta fecha y materia
      let query = supabase
        .from("study_sessions")
        .select("id, duracion_segundos, fecha, subject_id")
        .eq("user_id", user.id)
        .eq("fecha", fecha)
        .order("duracion_segundos", { ascending: false });

      if (subjectId === "none") {
        query = query.is("subject_id", null);
      } else if (subjectId !== "all") {
        query = query.eq("subject_id", subjectId);
      }

      const { data: dbSessions, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      if (!dbSessions || dbSessions.length === 0) {
        toast.error("No se encontraron sesiones registradas para eliminar");
        setLoading(false);
        return;
      }

      let remainingToDelete = totalSecondsToDelete;

      for (const session of dbSessions) {
        if (remainingToDelete <= 0) break;

        if (session.duracion_segundos <= remainingToDelete) {
          // Eliminar la sesión por completo
          const { error: delErr } = await supabase
            .from("study_sessions")
            .delete()
            .eq("id", session.id);
          if (delErr) throw delErr;

          remainingToDelete -= session.duracion_segundos;
        } else {
          // Descontar parcialmente de la sesión
          const newDuration = session.duracion_segundos - remainingToDelete;
          const { error: updErr } = await supabase
            .from("study_sessions")
            .update({ duracion_segundos: newDuration })
            .eq("id", session.id);
          if (updErr) throw updErr;

          remainingToDelete = 0;
          break;
        }
      }

      // 2. Ajustar estadísticas del usuario
      const hoursDeleted = Math.floor(totalSecondsToDelete / 3600);
      const minutesDeleted = Math.floor(totalSecondsToDelete / 60);
      const xpDeleted = minutesDeleted * 2;
      const creditsDeleted = minutesDeleted;

      const { data: stats } = await supabase
        .from("user_stats")
        .select("horas_estudio_total, xp_total, credits")
        .eq("user_id", user.id)
        .maybeSingle();

      if (stats) {
        await supabase
          .from("user_stats")
          .update({
            horas_estudio_total: Math.max(0, (stats.horas_estudio_total || 0) - hoursDeleted),
            xp_total: Math.max(0, (stats.xp_total || 0) - xpDeleted),
            credits: Math.max(0, (stats.credits || 0) - creditsDeleted),
          })
          .eq("user_id", user.id);
      }

      // Invalidar caché del dashboard para reflejar las nuevas horas y XP inmediatamente
      invalidateDashboardStatsCache();

      toast.success(`Se eliminaron ${formatDuration(totalSecondsToDelete)} de estudio correctamente`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error("Error al eliminar tiempo de estudio:", err);
      toast.error(err.message || "Error al eliminar tiempo de estudio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Cabecera elegante */}
        <div className="p-5 pb-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-500/20">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100 text-base font-semibold tracking-tight">
              Eliminar Tiempo de Estudio
            </DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-xs font-normal mt-0.5">
              Descuenta horas o sesiones cargadas por error
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleDelete} className="p-5 space-y-4">
          {/* Fecha */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Día
              </Label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="text-[10px] font-medium px-2 py-0.5 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-md transition-colors"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={handleSetYesterday}
                  className="text-[10px] font-medium px-2 py-0.5 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-md transition-colors"
                >
                  Ayer
                </button>
              </div>
            </div>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg font-medium text-sm text-zinc-900 dark:text-zinc-100 h-9 shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-400"
              required
            />
          </div>

          {/* Filtro por Año + Materia */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                Materia
              </Label>
              {years.length > 0 && (
                <div className="flex items-center gap-1">
                  <Filter className="w-3 h-3 text-zinc-400" />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setYearFilter("")}
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors",
                        yearFilter === ""
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                          : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                      )}
                    >
                      Todos
                    </button>
                    {years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setYearFilter(y)}
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors",
                          yearFilter === y
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                            : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                        )}
                      >
                        {y}°
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg font-medium text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs focus:ring-1 focus:ring-zinc-400 px-3 cursor-pointer">
                <SelectValue placeholder="Selecciona materia" />
              </SelectTrigger>
              <SelectContent className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xl z-[9999] max-h-72">
                <SelectItem value="all" className="font-medium text-xs sm:text-sm cursor-pointer py-1.5 px-3">
                  Todas las materias de este día
                </SelectItem>
                <SelectItem value="none" className="font-medium text-xs sm:text-sm cursor-pointer py-1.5 px-3">
                  Sin materia asignada / General
                </SelectItem>

                {/* Materias en Cursada / Pendientes */}
                {filteredSubjects.filter(s => (s as any).status !== "aprobada").length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1.5 flex items-center gap-1.5 my-1">
                      <BookOpen className="w-3 h-3 text-sky-500" />
                      Materias en Cursada / Pendientes
                    </SelectLabel>
                    {filteredSubjects
                      .filter(s => (s as any).status !== "aprobada")
                      .map((s) => (
                        <SelectItem
                          key={s.id}
                          value={s.id}
                          className="font-medium text-xs sm:text-sm cursor-pointer py-1.5 px-3"
                        >
                          {s.nombre} {s.año ? `(Año ${s.año})` : ""}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                )}

                {/* Materias Aprobadas */}
                {filteredSubjects.filter(s => (s as any).status === "aprobada").length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 flex items-center gap-1.5 my-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Materias Aprobadas
                    </SelectLabel>
                    {filteredSubjects
                      .filter(s => (s as any).status === "aprobada")
                      .map((s) => (
                        <SelectItem
                          key={s.id}
                          value={s.id}
                          className="font-medium text-xs sm:text-sm cursor-pointer py-1.5 px-3"
                        >
                          {s.nombre} {s.año ? `(Año ${s.año})` : ""}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Banner de tiempo cargado en este día/materia */}
          <div className={cn(
            "p-3 rounded-xl border flex items-center justify-between",
            totalAvailableSeconds > 0
              ? "bg-amber-500/8 dark:bg-amber-500/10 border-amber-500/20 text-zinc-800 dark:text-zinc-200"
              : "bg-zinc-50 dark:bg-zinc-850 border-zinc-200/80 dark:border-zinc-800 text-zinc-500"
          )}>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Tiempo registrado en este día:
              </div>
              <div className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {formatDuration(totalAvailableSeconds)}
              </div>
            </div>
            {totalAvailableSeconds > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-medium px-2.5 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity active:scale-95 cursor-pointer shadow-2xs"
              >
                Eliminar todo
              </button>
            )}
          </div>

          {/* Cantidad a eliminar */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              Tiempo a eliminar
            </Label>

            {/* Presets rápidos */}
            {totalAvailableSeconds > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {[15, 30, 45, 60, 120].map((mins) => {
                  if (mins * 60 > totalAvailableSeconds) return null;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handlePreset(mins)}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                    >
                      {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-zinc-500">Horas</span>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  value={horas}
                  onChange={(e) => setHoras(e.target.value)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg font-semibold text-base text-center h-9 shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-400"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-zinc-500">Minutos</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  step="5"
                  value={minutos}
                  onChange={(e) => setMinutos(e.target.value)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg font-semibold text-base text-center h-9 shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-400"
                />
              </div>
            </div>

            {/* Alerta si supera el límite */}
            {isExceeded && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  No puedes eliminar más tiempo del cargado (máx: {formatDuration(totalAvailableSeconds)})
                </span>
              </div>
            )}

            {totalAvailableSeconds === 0 && (
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs font-medium text-center">
                No hay tiempo registrado para este día y materia seleccionados.
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 py-2 px-3 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <HoldButton
              size="md"
              holdTime={1400}
              radius={12}
              disabled={loading || !isValidAmount}
              backgroundColor="#18181b"
              fillColor="#dc2626"
              textColor="#ffffff"
              fillTextColor="#ffffff"
              icon={<Trash2 className="w-3.5 h-3.5 shrink-0" />}
              doneIcon={<Check className="w-3.5 h-3.5 shrink-0" />}
              doneLabel="Eliminado"
              onHold={() => {
                handleDelete({ preventDefault: () => {} } as any);
              }}
              className="flex-1 py-2 rounded-xl border border-transparent font-medium text-xs shadow-xs disabled:opacity-40"
            >
              {loading ? "Eliminando..." : "Mantener para Eliminar"}
            </HoldButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
