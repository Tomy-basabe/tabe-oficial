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
import { Trash2, Clock, Calendar, AlertTriangle, BookOpen, Filter } from "lucide-react";
import { cn, toLocalDateStr } from "@/lib/utils";

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

  const subjectsByYear = useMemo(() => {
    return [...new Set(filteredSubjects.map(s => s.año || 0))]
      .sort((a, b) => a - b)
      .map(year => ({
        year,
        subjects: filteredSubjects.filter(s => (s.año || 0) === year),
      }));
  }, [filteredSubjects]);

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
      <DialogContent className="max-w-md border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-none p-0 overflow-hidden">
        {/* Header rojo */}
        <div className="bg-red-500 px-6 pt-5 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-white/80 bg-red-600 flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]">
            <Trash2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <DialogTitle className="text-white text-lg font-black tracking-tight leading-tight">
              Eliminar Tiempo de Estudio
            </DialogTitle>
            <DialogDescription className="text-red-100 text-xs font-semibold mt-0.5">
              Descuenta horas o sesiones cargadas por error
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleDelete} className="p-6 space-y-4">
          {/* Fecha */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="font-black uppercase text-xs flex items-center gap-1.5 text-foreground">
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                Día
              </Label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="text-[10px] font-black uppercase px-2 py-0.5 border border-foreground bg-muted hover:bg-secondary transition-all"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={handleSetYesterday}
                  className="text-[10px] font-black uppercase px-2 py-0.5 border border-foreground bg-muted hover:bg-secondary transition-all"
                >
                  Ayer
                </button>
              </div>
            </div>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-none font-bold"
              required
            />
          </div>

          {/* Filtro por Año + Materia */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="font-black uppercase text-xs flex items-center gap-1.5 text-foreground">
                <BookOpen className="w-3.5 h-3.5 text-red-500" />
                Materia
              </Label>
              {years.length > 0 && (
                <div className="flex items-center gap-1">
                  <Filter className="w-3 h-3 text-muted-foreground" />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setYearFilter("")}
                      className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 border transition-all",
                        yearFilter === ""
                          ? "bg-foreground text-background border-foreground"
                          : "bg-muted text-muted-foreground border-border hover:border-foreground"
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
                          "text-[9px] font-black px-1.5 py-0.5 border transition-all",
                          yearFilter === y
                            ? "bg-foreground text-background border-foreground"
                            : "bg-muted text-muted-foreground border-border hover:border-foreground"
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
              <SelectTrigger className="border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-none font-bold bg-card text-foreground">
                <SelectValue placeholder="Selecciona materia" />
              </SelectTrigger>
              <SelectContent className="border-2 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-none bg-card text-foreground z-[9999]">
                <SelectItem value="all" className="font-black focus:bg-red-500 focus:text-white">
                  Todas las materias de este día
                </SelectItem>
                <SelectItem value="none" className="font-bold focus:bg-red-500 focus:text-white">
                  Sin materia asignada / General
                </SelectItem>
                {subjectsByYear.map(({ year, subjects: yearSubs }) => (
                  <SelectGroup key={year}>
                    {year > 0 && (
                      <SelectLabel className="text-[10px] font-black uppercase text-muted-foreground bg-muted/60 px-2 py-1">
                        {year}° Año
                      </SelectLabel>
                    )}
                    {yearSubs.map((s) => (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                        className="font-bold focus:bg-red-500 focus:text-white"
                      >
                        {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Banner de tiempo cargado en este día/materia */}
          <div className={cn(
            "p-3 border-2 border-foreground flex items-center justify-between",
            totalAvailableSeconds > 0
              ? "bg-amber-500/15 border-amber-500"
              : "bg-muted/60 border-border"
          )}>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Tiempo registrado en este día:
              </div>
              <div className="text-base font-black text-foreground">
                {formatDuration(totalAvailableSeconds)}
              </div>
            </div>
            {totalAvailableSeconds > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-black uppercase px-2.5 py-1 bg-foreground text-background border border-foreground hover:opacity-90 transition-all active:scale-95"
              >
                Eliminar todo
              </button>
            )}
          </div>

          {/* Cantidad a eliminar */}
          <div className="space-y-2">
            <Label className="font-black uppercase text-xs flex items-center gap-1.5 text-foreground">
              <Clock className="w-3.5 h-3.5 text-red-500" />
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
                      className="text-[11px] font-bold px-2 py-1 border border-foreground bg-muted hover:bg-red-500 hover:text-white transition-all"
                    >
                      {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Horas</span>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  value={horas}
                  onChange={(e) => setHoras(e.target.value)}
                  className="border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-none font-black text-lg text-center"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Minutos</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  step="5"
                  value={minutos}
                  onChange={(e) => setMinutos(e.target.value)}
                  className="border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-none font-black text-lg text-center"
                />
              </div>
            </div>

            {/* Alerta si supera el límite */}
            {isExceeded && (
              <div className="flex items-center gap-2 p-2 bg-red-500/15 border-2 border-red-500 text-red-600 dark:text-red-400 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  No puedes eliminar más tiempo del cargado (máx: {formatDuration(totalAvailableSeconds)})
                </span>
              </div>
            )}

            {totalAvailableSeconds === 0 && (
              <div className="p-2 bg-muted border border-border text-muted-foreground text-xs font-bold text-center">
                No hay tiempo registrado para este día y materia seleccionados.
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 py-2.5 border-2 border-foreground font-bold text-xs uppercase transition-all hover:bg-secondary shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !isValidAmount}
              className="flex-1 py-2.5 bg-red-500 text-white border-2 border-foreground font-black text-xs uppercase transition-all hover:bg-red-600 shadow-[2px_2px_0_0_hsl(var(--foreground))] disabled:opacity-40 disabled:pointer-events-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              {loading ? "Eliminando..." : "Eliminar Tiempo"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
