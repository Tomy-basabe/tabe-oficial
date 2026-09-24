import { useState, useEffect } from "react";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { useSleepLogs, SleepLog } from "@/hooks/useSleepLogs";
import { Moon, Star, AlertTriangle, CloudMoon, Clock, Calendar } from "lucide-react";
import { toLocalDateStr } from "@/lib/utils";
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
      <DialogContent className="sm:max-w-[425px] bg-card border-4 border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] rounded-xl text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-[#C688EB] border-2 border-foreground rounded-lg flex items-center justify-center -rotate-3">
              <Moon className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <DialogTitle className="font-black text-xl uppercase tracking-wider text-foreground">
              {isEdit ? "Editar Sueño" : "Registrar Sueño"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground font-bold text-xs uppercase">
            {isEdit ? "Modifica los datos de este registro de descanso." : "Registra las horas que descansaste anoche."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fecha" className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Fecha de la noche
            </Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-card border-2 border-foreground font-bold text-sm text-foreground focus:ring-0"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Tiempo total de sueño
            </Label>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="horas" className="text-[10px] text-muted-foreground font-bold uppercase">Horas</Label>
                <div className="relative">
                  <Input
                    id="horas"
                    type="number"
                    min="0"
                    max="24"
                    value={horas}
                    onChange={(e) => setHoras(e.target.value)}
                    className="bg-card border-2 border-foreground font-black text-foreground pl-9"
                    required
                  />
                  <CloudMoon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <div className="flex-1 space-y-1">
                <Label htmlFor="minutos" className="text-[10px] text-muted-foreground font-bold uppercase">Minutos</Label>
                <Input
                  id="minutos"
                  type="number"
                  min="0"
                  max="59"
                  step="5"
                  value={minutos}
                  onChange={(e) => setMinutos(e.target.value)}
                  className="bg-card border-2 border-foreground font-black text-foreground"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase text-foreground">Calidad del sueño</Label>
            <Select value={calidad} onValueChange={(v: any) => { setCalidad(v); setIsManualCalidad(true); }}>
              <SelectTrigger className="bg-card border-2 border-foreground font-bold text-foreground">
                <SelectValue placeholder="Selecciona calidad" />
              </SelectTrigger>
              <SelectContent className="bg-card border-2 border-foreground text-foreground">
                <SelectItem value="buena">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Star className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                    <span>Buena (Descanso reparador)</span>
                  </div>
                </SelectItem>
                <SelectItem value="regular">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <CloudMoon className="w-4 h-4 text-amber-500" />
                    <span>Regular (Interrupciones leves)</span>
                  </div>
                </SelectItem>
                <SelectItem value="mala">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span>Mala (Insomnio o cansancio)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#C688EB] hover:bg-[#b56fe0] text-black font-black uppercase border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-all rounded-lg h-11"
            >
              {isLoading ? "Guardando..." : isEdit ? "Guardar Cambios" : "Guardar Registro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
