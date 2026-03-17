import { useState } from "react";
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
import { useSleepLogs } from "@/hooks/useSleepLogs";
import { Moon, Star, AlertTriangle, CloudMoon } from "lucide-react";

interface SleepLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SleepLogDialog({ open, onOpenChange, onSuccess }: SleepLogDialogProps) {
  const { addSleepLog, loading } = useSleepLogs();
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [horas, setHoras] = useState("8");
  const [minutos, setMinutos] = useState("0");
  const [calidad, setCalidad] = useState<'buena' | 'regular' | 'mala'>('buena');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseFloat(horas) || 0;
    const m = parseFloat(minutos) || 0;
    const totalHoras = h + (m / 60);
    
    const success = await addSleepLog({
      fecha,
      horas: parseFloat(totalHoras.toFixed(2)),
      calidad
    });
    if (success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gradient-card border-primary/30 overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:height-[1px] before:bg-gradient-to-r before:from-transparent before:via-neon-purple/50 before:to-transparent">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl gradient-text flex items-center gap-2">
            <Moon className="w-5 h-5 text-neon-purple" />
            Registrar Sueño
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Lleva un seguimiento de tu descanso para optimizar tu rendimiento.
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
            <Select value={calidad} onValueChange={(v: any) => setCalidad(v)}>
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
              {loading ? "Guardando..." : "Guardar Registro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
