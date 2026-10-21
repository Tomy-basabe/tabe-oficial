import { useState, useEffect } from "react";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSleepLogs, SleepLog } from "@/hooks/useSleepLogs";
import { Moon, Star, AlertTriangle, CloudMoon, Clock, Calendar, Check, Loader2 } from "lucide-react";
import { cn, toLocalDateStr } from "@/lib/utils";
import { subDays } from "date-fns";

interface SleepLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editLog?: SleepLog | null;
}

export function SleepLogDialog({ open, onOpenChange, onSuccess, editLog }: SleepLogDialogProps) {
  const { addSleepLog, updateSleepLog, loading: hookLoading } = useSleepLogs();
  const [submitting, setSubmitting] = useState(false);

  const getYesterdayDate = () => {
    return toLocalDateStr(subDays(new Date(), 1));
  };

  const [fecha, setFecha] = useState(getYesterdayDate());
  const [horas, setHoras] = useState("8");
  const [minutos, setMinutos] = useState("0");
  const [calidad, setCalidad] = useState<'buena' | 'regular' | 'mala'>('buena');
  const [isManualCalidad, setIsManualCalidad] = useState(false);

  useEffect(() => {
    if (open) {
      setSubmitting(false);
      if (editLog) {
        setFecha(editLog.fecha);
        const h = Math.floor(editLog.horas);
        const m = Math.round((editLog.horas - h) * 60);
        setHoras(String(h));
        setMinutos(String(m));
        setCalidad(editLog.calidad);
        setIsManualCalidad(true);
      } else {
        setFecha(getYesterdayDate());
        setHoras("8");
        setMinutos("0");
        setIsManualCalidad(false);
      }
    }
  }, [open, editLog]);

  useEffect(() => {
    if (isManualCalidad) return;
    
    const h = parseFloat(horas) || 0;
    const m = parseFloat(minutos) || 0;
    const total = h + (m / 60);

    if (total < 6) {
      setCalidad('mala');
    } else if (total >= 7.5) {
      setCalidad('buena');
    } else {
      setCalidad('regular');
    }
  }, [horas, minutos, isManualCalidad]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    const safetyTimer = setTimeout(() => setSubmitting(false), 5000);

    try {
      const h = parseFloat(horas) || 0;
      const m = parseFloat(minutos) || 0;
      const totalHoras = Math.min(Math.max(h + (m / 60), 0.5), 24);
      
      const logData = {
        fecha,
        horas: parseFloat(totalHoras.toFixed(2)),
        calidad
      };

      let result;
      if (editLog) {
        result = await updateSleepLog(editLog.id, logData);
      } else {
        result = await addSleepLog(logData);
      }

      if (result) {
        onSuccess();
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Error in handleSubmit sleep log:", err);
    } finally {
      clearTimeout(safetyTimer);
      setSubmitting(false);
    }
  };

  const isEdit = !!editLog;
  const isLoading = submitting || hookLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xl p-6 text-foreground">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
                {isEdit ? "Editar descanso" : "Registrar descanso"}
              </DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-xs font-normal">
                {isEdit ? "Modifica los datos de este registro de descanso." : "Registra las horas que descansaste anoche."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Fecha */}
          <div className="space-y-1.5">
            <Label htmlFor="fecha" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Fecha de la noche
            </Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg font-medium text-sm text-zinc-900 dark:text-zinc-100 h-9 shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-400"
              required
            />
          </div>

          {/* Horas y Minutos */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" /> Tiempo total de descanso
            </Label>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="horas" className="text-[10px] text-zinc-500 font-medium">Horas</Label>
                <div className="relative">
                  <Input
                    id="horas"
                    type="number"
                    min="0"
                    max="24"
                    value={horas}
                    onChange={(e) => setHoras(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg font-medium text-sm text-zinc-900 dark:text-zinc-100 h-9 pl-8 shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-400"
                    required
                  />
                  <CloudMoon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                </div>
              </div>

              <div className="flex-1 space-y-1">
                <Label htmlFor="minutos" className="text-[10px] text-zinc-500 font-medium">Minutos</Label>
                <Input
                  id="minutos"
                  type="number"
                  min="0"
                  max="59"
                  step="5"
                  value={minutos}
                  onChange={(e) => setMinutos(e.target.value)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg font-medium text-sm text-zinc-900 dark:text-zinc-100 h-9 shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-400"
                  required
                />
              </div>
            </div>
          </div>

          {/* Calidad del Sueño - Tarjetas Visuales Notion Style */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Calidad del sueño</Label>
              {!isManualCalidad && (
                <span className="text-[10px] text-zinc-400 italic">Sugerida por horas</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCalidad("buena");
                  setIsManualCalidad(true);
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1",
                  calidad === "buena"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-2xs ring-1 ring-emerald-500/30"
                    : "bg-zinc-50/70 dark:bg-zinc-850/50 border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <Star className={cn("w-4 h-4", calidad === "buena" ? "text-emerald-500 fill-emerald-500" : "text-zinc-400")} />
                <span className="text-xs font-medium">Buena</span>
                <span className="text-[9px] text-zinc-400 leading-tight">Reparador</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCalidad("regular");
                  setIsManualCalidad(true);
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1",
                  calidad === "regular"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 shadow-2xs ring-1 ring-amber-500/30"
                    : "bg-zinc-50/70 dark:bg-zinc-850/50 border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <CloudMoon className={cn("w-4 h-4", calidad === "regular" ? "text-amber-500" : "text-zinc-400")} />
                <span className="text-xs font-medium">Regular</span>
                <span className="text-[9px] text-zinc-400 leading-tight">Interrumpido</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCalidad("mala");
                  setIsManualCalidad(true);
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1",
                  calidad === "mala"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 shadow-2xs ring-1 ring-rose-500/30"
                    : "bg-zinc-50/70 dark:bg-zinc-850/50 border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <AlertTriangle className={cn("w-4 h-4", calidad === "mala" ? "text-rose-500" : "text-zinc-400")} />
                <span className="text-xs font-medium">Mala</span>
                <span className="text-[9px] text-zinc-400 leading-tight">Cansancio</span>
              </button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium text-xs sm:text-sm rounded-xl h-10 shadow-xs transition-all cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </div>
              ) : isEdit ? (
                "Guardar cambios"
              ) : (
                "Guardar registro"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
