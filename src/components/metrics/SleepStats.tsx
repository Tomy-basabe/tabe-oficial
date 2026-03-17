import { useState, useEffect, useCallback } from "react";
import { useSleepLogs, SleepLog } from "@/hooks/useSleepLogs";
import { DateRange } from "@/components/metrics/DateRangeFilter";
import { 
  differenceInDays, eachDayOfInterval, format, 
  parseISO
} from "date-fns";
import { cn } from "@/lib/utils";
import { 
  Moon, MoonStar, TrendingUp, Plus, 
  Star, CloudMoon, AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SleepLogDialog } from "./SleepLogDialog";

interface SleepStatsProps {
  dateRange: DateRange;
}

export function SleepStats({ dateRange }: SleepStatsProps) {
  const { getSleepLogs, loading: logsLoading } = useSleepLogs();
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    const data = await getSleepLogs(dateRange.from, dateRange.to);
    setLogs(data);
  }, [getSleepLogs, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalDays = differenceInDays(dateRange.to, dateRange.from) + 1;
  const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

  const chartData = allDays.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayLog = logs.find(l => l.fecha === dateStr);
    
    return {
      label: format(date, 'EEE', { locale: undefined }), // Use project local if available
      sublabel: format(date, 'dd/MM'),
      date: dateStr,
      horas: dayLog ? dayLog.horas : 0,
      calidad: dayLog ? dayLog.calidad : null,
    };
  });

  const avgHours = logs.length > 0 
    ? logs.reduce((acc, l) => acc + l.horas, 0) / logs.length 
    : 0;

  const qualityCounts = {
    buena: logs.filter(l => l.calidad === 'buena').length,
    regular: logs.filter(l => l.calidad === 'regular').length,
    mala: logs.filter(l => l.calidad === 'mala').length,
  };

  const getQualityColor = (quality: string | null) => {
    switch (quality) {
      case 'buena': return 'bg-neon-green';
      case 'regular': return 'bg-neon-gold';
      case 'mala': return 'bg-neon-red';
      default: return 'bg-secondary/30';
    }
  };

  const formatHours = (decimalHours: number) => {
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    if (m === 0) return `${h}h`;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="card-gamer rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-neon-purple" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Promedio</p>
              <p className="text-2xl font-display font-bold text-neon-purple">{formatHours(avgHours)}</p>
            </div>
          </div>
        </div>

        <div className="card-gamer rounded-xl p-5 border-neon-green/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neon-green/20 flex items-center justify-center">
              <Star className="w-4 h-4 text-neon-green" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sueño Bueno</p>
              <p className="text-lg font-display font-bold text-neon-green">{qualityCounts.buena} días</p>
            </div>
          </div>
        </div>

        <div className="card-gamer rounded-xl p-5 border-neon-gold/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neon-gold/20 flex items-center justify-center">
              <CloudMoon className="w-4 h-4 text-neon-gold" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sueño Regular</p>
              <p className="text-lg font-display font-bold text-neon-gold">{qualityCounts.regular} días</p>
            </div>
          </div>
        </div>

        <div className="card-gamer rounded-xl p-5 border-neon-red/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neon-red/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-neon-red" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sueño Malo</p>
              <p className="text-lg font-display font-bold text-neon-red">{qualityCounts.mala} días</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-gamer rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MoonStar className="w-5 h-5 text-neon-cyan" />
              <h2 className="font-display font-semibold text-lg">Horas de Sueño</h2>
            </div>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 h-8 gap-2"
            >
              <Plus className="w-4 h-4" />
              Registrar Sueño
            </Button>
          </div>

          {logsLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4">
              <Moon className="w-12 h-12 text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground">No hay registros para este periodo</p>
              <Button 
                variant="link" 
                onClick={() => setDialogOpen(true)}
                className="text-primary mt-2"
              >
                Cargar mi primer sueño
              </Button>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-1 h-48 overflow-x-auto pb-2">
              {chartData.map((item, idx) => (
                <div key={`${item.date}-${idx}`} className="flex-1 min-w-[28px] max-w-[60px] flex flex-col items-center justify-end gap-1 h-full group">
                  <div
                    className={cn(
                      "w-full rounded-t-lg transition-all duration-500 relative",
                      getQualityColor(item.calidad)
                    )}
                    style={{
                      height: `${Math.max((item.horas / 12) * 100, 4)}%`,
                    }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card px-2 py-1 rounded text-xs whitespace-nowrap border border-border z-10 shadow-lg">
                      {formatHours(item.horas)} - {item.calidad || 'Sin datos'}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground leading-tight">{item.label}</span>
                  <span className="text-[9px] text-muted-foreground/70 leading-tight">{item.sublabel}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total del periodo</p>
              <p className="text-2xl font-display font-bold gradient-text">
                {formatHours(logs.reduce((acc, l) => acc + l.horas, 0))}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-neon-green" />
                <span>Bueno</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-neon-gold" />
                <span>Regular</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-neon-red" />
                <span>Malo</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-gamer rounded-xl p-6">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Moon className="w-5 h-5 text-neon-purple" />
            Análisis de Descanso
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-sm text-foreground mb-1 font-semibold">Consejo Pro</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {avgHours < 7 
                  ? "Tu promedio de sueño está por debajo de las 7 horas recomendadas. Trata de aumentar tu descanso para mejorar la retención de memoria."
                  : "¡Excelente descanso! Mantener un ritmo de sueño constante ayuda a que tu cerebro procese mejor lo estudiado durante el día."}
              </p>
            </div>
            
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Distribución de Calidad</p>
              {[
                { label: 'Buena', count: qualityCounts.buena, color: 'neon-green' },
                { label: 'Regular', count: qualityCounts.regular, color: 'neon-gold' },
                { label: 'Mala', count: qualityCounts.mala, color: 'neon-red' },
              ].map(q => {
                const percentage = logs.length > 0 ? (q.count / logs.length) * 100 : 0;
                return (
                  <div key={q.label}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span>{q.label}</span>
                      <span className={`font-bold text-${q.color}`}>{Math.round(percentage)}%</span>
                    </div>
                    <div className="progress-gamer h-1.5">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", `bg-${q.color}`)}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <SleepLogDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        onSuccess={fetchLogs} 
      />
    </div>
  );
}
