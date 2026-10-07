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
import { Clock, BookOpen, Sparkles, Coins, Calendar, Check, Zap, ChevronDown } from "lucide-react";
import { toLocalDateStr } from "@/lib/utils";

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

  const subjectsByYear = [...new Set(filteredSubjects.map(s => s.año || 0))]
    .sort((a, b) => a - b)
    .map(year => ({
      year,
      subjects: filteredSubjects.filter(s => (s.año || 0) === year),
    }));

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
      <DialogContent className="sm:max-w-[480px] bg-card border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl p-6 overflow-hidden">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#BFFF00] border-2 border-foreground rounded-xl flex items-center justify-center -rotate-3 shadow-[2px_2px_0_0_hsl(var(--foreground))] shrink-0">
              <Clock className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <DialogTitle className="font-black text-xl uppercase tracking-wider text-foreground">
                Cargar Tiempo Manual
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-muted-foreground uppercase">
                Registra horas de estudio presencial, libros o apuntes
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Quick Presets */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#FFD700]" />
              Duración Rápida
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
                    className={`py-1.5 px-2 rounded-lg border-2 border-foreground text-left transition-all ${
                      isSelected
                        ? "bg-[#BFFF00] text-black shadow-[2px_2px_0_0_hsl(var(--foreground))] translate-x-[-1px] translate-y-[-1px]"
                        : "bg-muted/50 hover:bg-muted text-foreground hover:translate-y-[-1px]"
                    }`}
                  >
                    <div className="font-black text-xs leading-none">{preset.label}</div>
                    <div className="text-[10px] font-bold text-muted-foreground leading-tight mt-0.5">{preset.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Duration (Hours and Minutes) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-horas" className="text-xs font-black uppercase text-foreground">
                Horas
              </Label>
              <Input
                id="manual-horas"
                type="number"
                min="0"
                max="24"
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
                className="bg-background border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] font-black text-base text-foreground rounded-lg h-10"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-minutos" className="text-xs font-black uppercase text-foreground">
                Minutos
              </Label>
              <Input
                id="manual-minutos"
                type="number"
                min="0"
                max="59"
                value={minutos}
                onChange={(e) => setMinutos(e.target.value)}
                className="bg-background border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] font-black text-base text-foreground rounded-lg h-10"
                required
              />
            </div>
          </div>

          {/* Date with quick buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="manual-fecha" className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00E5FF]" />
                Fecha
              </Label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-foreground bg-muted hover:bg-muted/80 text-foreground transition-all"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={handleSetYesterday}
                  className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-foreground bg-muted hover:bg-muted/80 text-foreground transition-all"
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
              className="bg-background border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] font-bold text-sm text-foreground rounded-lg h-10"
              required
            />
          </div>

          {/* Subject Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#FF9B71]" />
                Materia (Opcional)
              </Label>
              {years.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setYearFilter("")}
                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                      yearFilter === ""
                        ? "bg-[#BFFF00] text-black border-foreground"
                        : "bg-muted text-muted-foreground border-transparent"
                    }`}
                  >
                    Todas
                  </button>
                  {years.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setYearFilter(y)}
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                        yearFilter === y
                          ? "bg-[#BFFF00] text-black border-foreground"
                          : "bg-muted text-muted-foreground border-transparent"
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
              <SelectTrigger className="w-full h-11 bg-background border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-lg font-bold text-sm text-foreground focus:ring-0 focus:ring-offset-0 px-3 cursor-pointer">
                <SelectValue placeholder="Sin materia específica (Estudio general)" />
              </SelectTrigger>
              <SelectContent className="bg-card text-foreground border-2 border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] rounded-xl max-h-64 z-[9999]">
                <SelectItem value="none" className="font-bold text-sm cursor-pointer py-2 px-3 focus:bg-[#BFFF00] focus:text-black">
                  Sin materia específica (Estudio general)
                </SelectItem>
                {subjectsByYear.map(({ year, subjects: ys }) => (
                  <SelectGroup key={year}>
                    <SelectLabel className="text-[11px] font-black uppercase text-muted-foreground px-3 py-1 bg-muted/60 border-y border-foreground/10">
                      {year ? `Año ${year}` : "Otras materias"}
                    </SelectLabel>
                    {ys.map((s) => (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                        className="font-bold text-sm cursor-pointer py-2 px-3 focus:bg-[#BFFF00] focus:text-black"
                      >
                        {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Live Rewards Estimate Card */}
          <div className="bg-[#FFE600]/20 border-2 border-dashed border-foreground/40 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wide text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#FFD700] fill-current" />
              Recompensas calculadas:
            </span>
            <div className="flex items-center gap-2">
              <span className="bg-[#BFFF00] text-black font-black text-xs px-2 py-0.5 rounded border border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))]">
                +{xpGained} XP
              </span>
              <span className="bg-[#00E5FF] text-black font-black text-xs px-2 py-0.5 rounded border border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))] flex items-center gap-1">
                <Coins className="w-3 h-3" /> +{creditsGained}
              </span>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <button
              type="submit"
              disabled={loading || totalSeconds <= 0}
              className="w-full bg-[#BFFF00] text-black font-black uppercase text-xs sm:text-sm py-3 px-4 rounded-xl border-3 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] active:translate-y-[1px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
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
