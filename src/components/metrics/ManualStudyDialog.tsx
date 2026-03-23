import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Clock, BookOpen, CloudMoon } from "lucide-react";
import { toLocalDateStr } from "@/lib/utils";

interface ManualStudyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  subjects: { id: string; nombre: string; año?: number }[];
}

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const h = parseFloat(horas) || 0;
    const m = parseFloat(minutos) || 0;
    const totalSeconds = Math.round(h * 3600 + m * 60);

    if (totalSeconds <= 0) {
      toast.error("La duración debe ser mayor a 0");
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

      // Actualizar XP y Créditos en el frontend (igual que Pomodoro)
      const hours = Math.floor(totalSeconds / 3600);
      const xpGained = Math.floor(totalSeconds / 60) * 2; // 2 XP por minuto

      const { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", user.id).single();
      if (stats) {
          const currentStats = stats as any;
          await supabase.from("user_stats").update({
              horas_estudio_total: (currentStats.horas_estudio_total || 0) + hours,
              xp_total: (currentStats.xp_total || 0) + xpGained,
              credits: (currentStats.credits || 0) + Math.floor(totalSeconds / 60), // 1 Crédito por min
              nivel: Math.floor(((currentStats.xp_total || 0) + xpGained) / 1000) + 1 // Subir de nivel automáticamente
          }).eq("user_id", user.id);
          
          await supabase.rpc('check_and_unlock_achievements', { p_user_id: user.id });
      }

      toast.success(`Tiempo registrado. +${xpGained} XP ganados`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error adding manual study time:", error);
      toast.error(`Error al registrar: ${error?.message || 'Contacte soporte'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gradient-card border-primary/30 overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:height-[1px] before:bg-gradient-to-r before:from-transparent before:via-neon-cyan/50 before:to-transparent">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl gradient-text flex items-center gap-2">
            <Clock className="w-5 h-5 text-neon-cyan" />
            Cargar Tiempo de Estudio
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Registra manualmente el tiempo que dedicaste a estudiar una materia.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="manual-fecha" className="text-sm font-medium">Fecha</Label>
            <Input
              id="manual-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-secondary/50 border-border focus:border-primary/50"
              required
            />
          </div>

          {/* Year Filter */}
          {years.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filtrar por año</Label>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setYearFilter("")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    yearFilter === ""
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80"
                  }`}
                >
                  Todos
                </button>
                {years.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYearFilter(y)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      yearFilter === y
                        ? "bg-primary/20 text-primary border-primary/40"
                        : "bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80"
                    }`}
                  >
                    Año {y}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Materia
            </Label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            >
              <option value="">Sin materia específica</option>
              {subjectsByYear.map(({ year, subjects: ys }) => (
                <optgroup key={year} label={year ? `Año ${year}` : "Sin año"}>
                  {ys.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Duración del estudio</Label>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="manual-horas" className="text-xs text-muted-foreground font-medium">Horas</Label>
                <div className="relative">
                  <Input
                    id="manual-horas"
                    type="number"
                    min="0"
                    max="24"
                    value={horas}
                    onChange={(e) => setHoras(e.target.value)}
                    className="bg-secondary/50 border-border focus:border-primary/50 pl-10"
                    required
                  />
                  <CloudMoon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="manual-minutos" className="text-xs text-muted-foreground font-medium">Minutos</Label>
                <Input
                  id="manual-minutos"
                  type="number"
                  min="0"
                  max="59"
                  value={minutos}
                  onChange={(e) => setMinutos(e.target.value)}
                  className="bg-secondary/50 border-border focus:border-primary/50"
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-bold hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
            >
              {loading ? "Guardando..." : "Registrar Tiempo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
