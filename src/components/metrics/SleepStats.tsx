import { useState, useEffect, useCallback, useMemo } from "react";
import { useSleepLogs, SleepLog } from "@/hooks/useSleepLogs";
import { DateRange } from "@/components/metrics/DateRangeFilter";
import { 
  differenceInDays, eachDayOfInterval, format, 
  parseISO, subDays 
} from "date-fns";
import { es } from "date-fns/locale";
import { cn, toLocalDateStr } from "@/lib/utils";
import { 
  Moon, MoonStar, TrendingUp, Plus, 
  Star, CloudMoon, AlertTriangle, Pencil, Trash2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SleepLogDialog } from "./SleepLogDialog";

interface SleepStatsProps {
  dateRange: DateRange;
}

export function SleepStats({ dateRange }: SleepStatsProps) {
  const { getSleepLogs, deleteSleepLog } = useSleepLogs();
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<SleepLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSleepLogs(dateRange.from, dateRange.to);
      setLogs(data);
    } catch (e) {
      console.error("Error in fetchLogs:", e);
    } finally {
      setLoading(false);
    }
  }, [getSleepLogs, dateRange.from?.getTime(), dateRange.to?.getTime()]);

  useEffect(() => {
    let mounted = true;
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    fetchLogs().finally(() => {
      clearTimeout(safetyTimer);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
    };
  }, [fetchLogs]);

  const handleEdit = (log: SleepLog) => {
    setEditingLog(log);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingLog(null);
    setDialogOpen(true);
  };

  const handleDelete = async (log: SleepLog) => {
    if (confirm(`¿Eliminar el registro de descanso del ${format(parseISO(log.fecha), "d 'de' MMMM", { locale: es })}?`)) {
      const success = await deleteSleepLog(log.id);
      if (success) fetchLogs();
    }
  };

  const formatHours = (hours: number) => {
    if (!hours || isNaN(hours)) return "0h";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  // Safe days interval (clamped up to 31 days for clean chart display)
  const chartDays = useMemo(() => {
    const to = dateRange.to ? dateRange.to : new Date();
    const from = dateRange.from ? dateRange.from : subDays(to, 6);
    const totalDays = Math.min(Math.max(differenceInDays(to, from) + 1, 1), 31);

    const daysArr: Date[] = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      daysArr.push(subDays(to, i));
    }
    return daysArr;
  }, [dateRange.from?.getTime(), dateRange.to?.getTime()]);

  const chartData = useMemo(() => {
    return chartDays.map(date => {
      const dateStr = toLocalDateStr(date);
      const dayLog = logs.find(l => l.fecha === dateStr);
      
      return {
        label: format(date, 'EEE', { locale: es }),
        sublabel: format(date, 'd/M'),
        date: dateStr,
        horas: dayLog ? dayLog.horas : 0,
        calidad: dayLog ? dayLog.calidad : null,
      };
    });
  }, [chartDays, logs]);

  const avgHours = useMemo(() => {
    return logs.length > 0 
      ? logs.reduce((acc, l) => acc + (Number(l.horas) || 0), 0) / logs.length 
      : 0;
  }, [logs]);

  const qualityCounts = useMemo(() => {
    return {
      buena: logs.filter(l => l.calidad === 'buena').length,
      regular: logs.filter(l => l.calidad === 'regular').length,
      mala: logs.filter(l => l.calidad === 'mala').length,
    };
  }, [logs]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 animate-pulse">
              <div className="w-10 h-10 bg-muted rounded-xl mb-3 border-2 border-foreground/20" />
              <div className="h-6 bg-muted rounded w-20 mb-2 border border-foreground/10" />
              <div className="h-4 bg-muted rounded w-28 border border-foreground/10" />
            </div>
          ))}
        </div>
        <div className="h-64 bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 border-2 border-foreground rounded-lg bg-[#C688EB] flex items-center justify-center -rotate-3 group-hover:rotate-0 transition-transform shrink-0">
              <TrendingUp className="w-6 h-6 text-black" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase font-bold">Promedio</p>
              <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter truncate">
                {formatHours(avgHours)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-foreground rounded-lg bg-[#BFFF00] flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform shrink-0">
              <Star className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-muted-foreground uppercase">Sueño Bueno</p>
              <p className="text-xl sm:text-2xl font-black text-foreground">{qualityCounts.buena} días</p>
            </div>
          </div>
        </div>

        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-foreground rounded-lg bg-[#FFD700] flex items-center justify-center -rotate-3 group-hover:rotate-0 transition-transform shrink-0">
              <CloudMoon className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-muted-foreground uppercase">Sueño Regular</p>
              <p className="text-xl sm:text-2xl font-black text-foreground">{qualityCounts.regular} días</p>
            </div>
          </div>
        </div>

        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-foreground rounded-lg bg-[#FF5C5C] flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform shrink-0">
              <AlertTriangle className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-muted-foreground uppercase">Sueño Malo</p>
              <p className="text-xl sm:text-2xl font-black text-foreground">{qualityCounts.mala} días</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6 border-b-4 border-foreground pb-4">
            <div className="flex items-center gap-2.5">
              <MoonStar className="w-6 h-6 text-foreground" strokeWidth={3} />
              <h2 className="font-black uppercase text-lg sm:text-xl text-foreground">Horas de Sueño</h2>
            </div>
            <Button 
              onClick={handleAdd}
              className="bg-[#C688EB] text-black border-2 border-foreground hover:bg-[#b56fe0] hover:translate-y-[-1px] shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all font-black text-xs uppercase h-10 gap-2 rounded-lg"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              Registrar Sueño
            </Button>
          </div>

          {logs.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4">
              <div className="w-12 h-12 bg-[#C688EB]/20 border-2 border-foreground/30 rounded-xl flex items-center justify-center mb-3">
                <Moon className="w-6 h-6 text-foreground opacity-60" strokeWidth={2.5} />
              </div>
              <p className="text-foreground font-black uppercase text-sm">No hay registros para este periodo</p>
              <p className="text-muted-foreground font-bold text-xs uppercase mt-0.5 mb-3">
                Empieza a registrar tus horas de descanso
              </p>
              <button 
                onClick={handleAdd}
                className="bg-[#BFFF00] text-black font-black uppercase text-xs px-4 py-2 border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] rounded-lg transition-all"
              >
                Cargar mi primer sueño
              </button>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-1 sm:gap-2 h-48 overflow-x-auto pb-2 px-1 no-scrollbar">
              {chartData.map((item, idx) => (
                <div key={`${item.date}-${idx}`} className="flex-1 min-w-[28px] max-w-[55px] flex flex-col items-center justify-end gap-1.5 h-full group relative">
                  <div className="w-full flex-1 flex flex-col justify-end">
                    <div
                      className={cn(
                        "w-full transition-all duration-300 rounded-t-sm relative border-2 border-foreground",
                        item.calidad === 'buena' ? "bg-[#BFFF00] border-b-0 shadow-[2px_0_0_0_hsl(var(--foreground))]" :
                        item.calidad === 'regular' ? "bg-[#FFD700] border-b-0 shadow-[2px_0_0_0_hsl(var(--foreground))]" :
                        item.calidad === 'mala' ? "bg-[#FF5C5C] border-b-0 shadow-[2px_0_0_0_hsl(var(--foreground))]" :
                        "bg-muted/60 border-border/40"
                      )}
                      style={{
                        height: `${Math.min(Math.max((item.horas / 12) * 100, item.horas > 0 ? 8 : 4), 100)}%`,
                      }}
                    >
                      {item.horas > 0 && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background px-2 py-1 rounded text-[10px] font-black whitespace-nowrap z-20 pointer-events-none shadow-md">
                          {formatHours(item.horas)} · {item.calidad || 'Registrado'}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-foreground uppercase leading-tight">{item.label}</span>
                  <span className="text-[9px] font-bold text-muted-foreground leading-tight">{item.sublabel}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-5 border-t-4 border-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-0.5">Total descansado en el periodo</p>
              <p className="text-2xl sm:text-3xl font-black text-foreground">
                {formatHours(logs.reduce((acc, l) => acc + (Number(l.horas) || 0), 0))}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-black uppercase text-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 border-2 border-foreground rounded-sm bg-[#BFFF00]" />
                <span>Bueno</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 border-2 border-foreground rounded-sm bg-[#FFD700]" />
                <span>Regular</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 border-2 border-foreground rounded-sm bg-[#FF5C5C]" />
                <span>Malo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sleep Quality & Advice Card */}
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-black uppercase text-lg sm:text-xl text-foreground mb-4 border-b-2 border-foreground/20 pb-3 flex items-center gap-2">
              <Moon className="w-5 h-5 text-foreground" /> Análisis de Higiene
            </h3>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border-2 border-foreground bg-muted/40">
                <p className="text-xs font-black uppercase text-foreground mb-1">Objetivo Diario</p>
                <p className="text-xs font-bold text-muted-foreground">
                  7 a 9 horas por noche para una consolidación óptima de la memoria y agilidad mental.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className={cn(
                    "text-xs font-black px-2.5 py-1 rounded-md border-2 border-foreground",
                    avgHours >= 7 ? "bg-[#BFFF00] text-black" : avgHours >= 6 ? "bg-[#FFD700] text-black" : "bg-[#FF5C5C] text-black"
                  )}>
                    {avgHours >= 7 ? "✓ En rango ideal" : avgHours >= 6 ? "⚠ Descanso ajustado" : "✗ Déficit de sueño"}
                  </div>
                </div>
              </div>

              {avgHours > 0 && avgHours < 7 && (
                <div className="p-3.5 bg-[#FFD700] text-black rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <p className="text-xs font-black uppercase">Consejo de Rendimiento</p>
                  <p className="text-[11px] font-bold mt-1 text-black/80">
                    Dormir menos de 7 horas reduce la retención a largo plazo hasta un 30%. Intenta adelantar 30 minutos tu hora de acostarte.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t-2 border-foreground/20 mt-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase text-center">
              Los registros se sincronizan con tus métricas de enfoque
            </p>
          </div>
        </div>
      </div>

      {/* History Log Table */}
      {logs.length > 0 && (
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6">
          <h3 className="font-black uppercase text-lg sm:text-xl text-foreground mb-4 border-b-2 border-foreground/20 pb-3">
            Historial de Noches Registradas ({logs.length})
          </h3>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
            {logs.slice().reverse().map(log => (
              <div 
                key={log.id}
                className="flex items-center justify-between p-3 rounded-lg border-2 border-foreground bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full border border-foreground",
                    log.calidad === 'buena' ? "bg-[#BFFF00]" :
                    log.calidad === 'regular' ? "bg-[#FFD700]" : "bg-[#FF5C5C]"
                  )} />
                  <div>
                    <p className="font-black text-sm uppercase text-foreground">
                      {format(parseISO(log.fecha), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    <p className="text-xs font-bold text-muted-foreground uppercase">
                      Calidad {log.calidad}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-black text-base text-foreground bg-card border-2 border-foreground px-2.5 py-0.5 rounded-lg shadow-[1px_1px_0_0_hsl(var(--foreground))]">
                    {formatHours(log.horas)}
                  </span>
                  <button
                    onClick={() => handleEdit(log)}
                    className="p-1.5 rounded-lg bg-[#FFD700] border-2 border-foreground text-black hover:translate-y-[-1px] transition-all"
                    title="Editar registro"
                  >
                    <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => handleDelete(log)}
                    className="p-1.5 rounded-lg bg-[#FF5C5C] border-2 border-foreground text-black hover:translate-y-[-1px] transition-all"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog */}
      <SleepLogDialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingLog(null);
        }} 
        onSuccess={fetchLogs}
        editLog={editingLog}
      />
    </div>
  );
}
