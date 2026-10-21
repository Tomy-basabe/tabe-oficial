import { useState, useEffect } from "react";
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
import { Clock, BookOpen, Sparkles, Coins, Calendar, Check, Zap, CheckCircle2, Loader2 } from "lucide-react";
import { toLocalDateStr } from "@/lib/utils";
import { invalidateDashboardStatsCache } from "@/hooks/useDashboardStats";

interface ManualStudyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  subjects: { id: string; nombre: string; año?: number }[];
}

const PRESET_DURATIONS = [
  { label: "25m", sub: "Pomodoro", h: "0", m: "25" },
  { label: "45m", sub: "Bloque", h: "0", m: "45" },
  { label: "1h 00m", sub: "Estándar", h: "1", m: "0" },
  { label: "1h 30m", sub: "Intenso", h: "1", m: "30" },
  { label: "2h 00m", sub: "Maratón", h: "2", m: "0" },
  { label: "3h 00m", sub: "Profundo", h: "3", m: "0" },
];

export function ManualStudyDialog({ open, onOpenChange, onSuccess, subjects }: ManualStudyDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fecha, setFecha] = useState(toLocalDateStr(new Date()));
  const [horas, setHoras] = useState("1");
  const [minutos, setMinutos] = useState("0");
  const [subjectId, setSubjectId] = useState("");
  const [yearFilter, setYearFilter] = useState<number | "">("");

  useEffect(() => {
    if (open) {
      setFecha(toLocalDateStr(new Date()));
      setHoras("1");
      setMinutos("0");
      setSubjectId("");
    }
  }, [open]);

  const years = [...new Set(subjects.filter(s => s.año).map(s => s.año!))].sort((a, b) => a - b);

  const filteredSubjects = yearFilter
    ? subjects.filter(s => s.año === yearFilter)
    : subjects;

  const h = parseFloat(horas) || 0;
  const m = parseFloat(minutos) || 0;
  const totalSeconds = Math.round(h * 3600 + m * 60);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const xpGained = totalMinutes * 2;
  const creditsGained = totalMinutes;

  const handleSetToday = () => setFecha(toLocalDateStr(new Date()));
  const handleSetYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setFecha(toLocalDateStr(yesterday));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (totalSeconds <= 0) {
      toast.error("La duración debe ser mayor a 0 minutos");
      return;
    }

    if (totalSeconds > 86400) {
      toast.error("No puedes registrar más de 24 horas en una sesión");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("study_sessions")
        .insert({
          user_id: user.id,
          fecha,
          duracion_segundos: totalSeconds,
          tipo: "pomodoro",
          completada: true,
          subject_id: subjectId || null,
        });

      if (error) throw error;

      // Actualizar XP y Créditos en user_stats
      const hours = Math.floor(totalSeconds / 3600);
      const { data: stats } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (stats) {
        const currentStats = stats as any;
        await supabase
          .from("user_stats")
          .update({
            horas_estudio_total: (currentStats.horas_estudio_total || 0) + hours,
            xp_total: (currentStats.xp_total || 0) + xpGained,
            credits: (currentStats.credits || 0) + creditsGained,
            nivel: Math.floor(((currentStats.xp_total || 0) + xpGained) / 100) + 1,
          })
          .eq("user_id", user.id);

        await supabase.rpc("check_and_unlock_achievements", { p_user_id: user.id });
      }

      // Invalidar caché del dashboard para reflejar el nuevo tiempo inmediatamente
      invalidateDashboardStatsCache();

      toast.success(`¡Tiempo guardado! +${xpGained} XP y +${creditsGained} Créditos ganados`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error adding manual study time:", error);
      toast.error(`Error al registrar: ${error?.message || "Contacte soporte"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-xl overflow-hidden">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
              <Clock className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
                Cargar Tiempo Manual
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                Registra horas de estudio presencial, libros o apuntes
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Quick Presets */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Duración rápida
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_DURATIONS.map((preset) => {
                const isSelected = horas === preset.h && minutos === preset.m;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setHoras(preset.h);
                      setMinutos(preset.m);
                    }}
                    className={`py-2 px-2.5 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                        : "bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-700/70"
                    }`}
                  >
                    <div className="font-semibold text-xs leading-none">{preset.label}</div>
                    <div className={`text-[10px] leading-tight mt-1 ${isSelected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400"}`}>
                      {preset.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Duration (Hours and Minutes) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-horas" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Horas
              </Label>
              <Input
                id="manual-horas"
                type="number"
                min="0"
                max="24"
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-medium text-sm text-zinc-900 dark:text-zinc-100 rounded-lg h-9 shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-400"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-minutos" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Minutos
              </Label>
              <Input
                id="manual-minutos"
                type="number"
                min="0"
                max="59"
                value={minutos}
                onChange={(e) => setMinutos(e.target.value)}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-medium text-sm text-zinc-900 dark:text-zinc-100 rounded-lg h-9 shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-400"
                required
              />
            </div>
          </div>

          {/* Date with quick buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="manual-fecha" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Fecha
              </Label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={handleSetYesterday}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
                >
                  Ayer
                </button>
              </div>
            </div>
            <Input
              id="manual-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-medium text-sm text-zinc-900 dark:text-zinc-100 rounded-lg h-9 shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-400"
              required
            />
          </div>

          {/* Subject Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                Materia (Opcional)
              </Label>
              {years.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setYearFilter("")}
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors ${
                      yearFilter === ""
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                        : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                    }`}
                  >
                    Todas
                  </button>
                  {years.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setYearFilter(y)}
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors ${
                        yearFilter === y
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                          : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                      }`}
                    >
                      {y}°
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Select
              value={subjectId || "none"}
              onValueChange={(val) => setSubjectId(val === "none" ? "" : val)}
            >
              <SelectTrigger className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg font-medium text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs focus:ring-1 focus:ring-zinc-400 px-3 cursor-pointer">
                <SelectValue placeholder="Sin materia específica (Estudio general)" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-xl max-h-64 z-[9999]">
                <SelectItem value="none" className="font-medium text-xs sm:text-sm cursor-pointer py-1.5 px-3">
                  Sin materia específica (Estudio general)
                </SelectItem>

                {filteredSubjects.filter(s => (s as any).status !== "aprobada").length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 flex items-center gap-1.5 my-1">
                      <BookOpen className="w-3 h-3 text-sky-500" />
                      Materias en cursada / pendientes
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

                {filteredSubjects.filter(s => (s as any).status === "aprobada").length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider px-3 py-1.5 bg-emerald-500/10 flex items-center gap-1.5 my-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Materias aprobadas
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

          {/* Live Rewards Estimate Card */}
          <div className="bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Recompensas calculadas:
            </span>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-xs px-2 py-0.5 rounded-md border border-amber-500/20">
                +{xpGained} XP
              </span>
              <span className="bg-sky-500/10 text-sky-700 dark:text-sky-400 font-semibold text-xs px-2 py-0.5 rounded-md border border-sky-500/20 flex items-center gap-1">
                <Coins className="w-3 h-3" /> +{creditsGained}
              </span>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <button
              type="submit"
              disabled={loading || totalSeconds <= 0}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </div>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Registrar {h > 0 ? `${h}h ` : ""}{m > 0 ? `${m}m` : ""} de Estudio</span>
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
