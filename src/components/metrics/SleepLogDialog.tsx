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
import { Moon, Star, AlertTriangle, CloudMoon } from "lucide-react";

interface SleepLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editLog?: SleepLog | null;
}

export function SleepLogDialog({ open, onOpenChange, onSuccess, editLog }: SleepLogDialogProps) {
  const { addSleepLog, updateSleepLog, loading } = useSleepLogs();
  const getYesterdayDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const [fecha, setFecha] = useState(getYesterdayDate());
  const [horas, setHoras] = useState("8");
  const [minutos, setMinutos] = useState("0");
  const [calidad, setCalidad] = useState<'buena' | 'regular' | 'mala'>('buena');
  const [isManualCalidad, setIsManualCalidad] = useState(false);

  useEffect(() => {
    if (open) {
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
    } else if (total >= 8) {
      setCalidad('buena');
    } else {
      setCalidad('regular');
    }
  }, [horas, minutos, isManualCalidad]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseFloat(horas) || 0;
    const m = parseFloat(minutos) || 0;
    const totalHoras = h + (m / 60);
    
    const logData = {
      fecha,
      horas: parseFloat(totalHoras.toFixed(2)),
      calidad
    };

    let success;
    if (editLog) {
      success = await updateSleepLog(editLog.id, logData);
    } else {
      success = await addSleepLog(logData);
    }

    if (success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  const isEdit = !!editLog;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gradient-card border-primary/30 overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:height-[1px] before:bg-gradient-to-r before:from-transparent before:via-neon-purple/50 before:to-transparent">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl gradient-text flex items-center gap-2">
            <Moon className="w-5 h-5 text-neon-purple" />
            {isEdit ? "Editar Sueño" : "Registrar Sueño"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit ? "Modifica los datos de este registro de sueño." : "Lleva un seguimiento de tu descanso para optimizar tu rendimiento."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="fecha" className="text-sm font-medium">Fecha de la noche</Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-secondary/50 border-border focus:border-primary/50"
              required
            />
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium">Tiempo de sueño</Label>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="horas" className="text-xs text-muted-foreground font-medium">Horas</Label>
                <div className="relative">
                  <Input
                    id="horas"
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
                <Label htmlFor="minutos" className="text-xs text-muted-foreground font-medium">Minutos</Label>
                <Input
                  id="minutos"
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

          <div className="space-y-2">
            <Label className="text-sm font-medium">Calidad del sueño</Label>
            <Select value={calidad} onValueChange={(v: any) => { setCalidad(v); setIsManualCalidad(true); }}>
              <SelectTrigger className="bg-secondary/50 border-border">
                <SelectValue placeholder="Selecciona calidad" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="buena">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-neon-green" />
                    <span>Buena</span>
                  </div>
                </SelectItem>
                <SelectItem value="regular">
                  <div className="flex items-center gap-2">
                    <CloudMoon className="w-4 h-4 text-neon-gold" />
                    <span>Regular</span>
                  </div>
                </SelectItem>
                <SelectItem value="mala">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-neon-red" />
                    <span>Mala</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-bold hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
            >
              {loading ? "Guardando..." : isEdit ? "Guardar Cambios" : "Guardar Registro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
