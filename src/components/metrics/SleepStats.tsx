import { useState, useEffect, useCallback, useMemo } from "react";
import { useSleepLogs, SleepLog } from "@/hooks/useSleepLogs";
import { DateRange } from "@/components/metrics/DateRangeFilter";
import { 
  differenceInDays, format, 
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
import { useConfirm } from "@/contexts/ConfirmModalContext";

interface SleepStatsProps {
  dateRange: DateRange;
}

export function SleepStats({ dateRange }: SleepStatsProps) {
  const { confirm } = useConfirm();
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
    const formattedDate = format(parseISO(log.fecha), "d 'de' MMMM", { locale: es });
    const ok = await confirm({
      title: "¿Eliminar registro de descanso?",
      description: `¿Estás seguro de eliminar el registro del ${formattedDate}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (ok) {
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
            <div key={i} className="neo-bento-card p-5 animate-pulse">
              <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-3" />
              <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded w-20 mb-2" />
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-28" />
            </div>
          ))}
        </div>
        <div className="h-64 neo-bento-card p-6 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neo-bento-card p-5 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Promedio diario</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {formatHours(avgHours)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Horas de descanso</p>
        </div>

        <div className="neo-bento-card p-5 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Descanso Bueno</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center">
              <Star className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {qualityCounts.buena} <span className="text-sm font-normal text-zinc-400">días</span>
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Reparador y continuo</p>
        </div>

        <div className="neo-bento-card p-5 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Descanso Regular</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center">
              <CloudMoon className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {qualityCounts.regular} <span className="text-sm font-normal text-zinc-400">días</span>
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">Interrupciones leves</p>
        </div>

        <div className="neo-bento-card p-5 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Descanso Insuficiente</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {qualityCounts.mala} <span className="text-sm font-normal text-zinc-400">días</span>
          </p>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">Insomnio o déficit</p>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 neo-bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <MoonStar className="w-4 h-4 text-indigo-500" />
                <h2 className="font-semibold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
                  Horas de Descanso por Noche
                </h2>
              </div>
              <button 
                onClick={handleAdd}
                className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Descanso
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center mb-2.5">
                  <Moon className="w-5 h-5 text-zinc-400" />
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 font-medium text-sm">No hay registros para este período</p>
                <p className="text-zinc-400 text-xs mt-0.5 mb-3">
                  Empieza a registrar tus horas de descanso
                </p>
                <button 
                  onClick={handleAdd}
                  className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                >
                  Cargar mi primer registro
                </button>
              </div>
            ) : (
              <div className="flex items-end justify-between gap-1 sm:gap-2 h-48 overflow-x-auto pb-2 px-1 no-scrollbar border-b border-zinc-100 dark:border-zinc-800/80">
                {chartData.map((item, idx) => (
                  <div key={`${item.date}-${idx}`} className="flex-1 min-w-[28px] max-w-[50px] flex flex-col items-center justify-end gap-1.5 h-full group relative">
                    <div className="w-full flex-1 flex flex-col justify-end">
                      <div
                        className={cn(
                          "w-full transition-all duration-300 rounded-t-md relative",
                          item.calidad === 'buena' ? "bg-emerald-500" :
                          item.calidad === 'regular' ? "bg-amber-500" :
                          item.calidad === 'mala' ? "bg-rose-500" :
                          "bg-zinc-100 dark:bg-zinc-800/60"
                        )}
                        style={{
                          height: `${Math.min(Math.max((item.horas / 12) * 100, item.horas > 0 ? 8 : 4), 100)}%`,
                        }}
                      >
                        {item.horas > 0 && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap z-20 pointer-events-none shadow-md">
                            {formatHours(item.horas)} · {item.calidad || 'Registrado'}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 leading-tight">{item.label}</span>
                    <span className="text-[9px] text-zinc-400 leading-tight">{item.sublabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-zinc-400 font-medium">Total descansado en el período</p>
              <p className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {formatHours(logs.reduce((acc, l) => acc + (Number(l.horas) || 0), 0))}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Bueno</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Regular</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Malo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sleep Quality & Advice Card */}
        <div className="neo-bento-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-500" /> Análisis de Higiene
            </h3>

            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/40">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Objetivo Diario</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  7 a 9 horas por noche para una consolidación óptima de la memoria y agilidad mental.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-md border",
                    avgHours >= 7 
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" 
                      : avgHours >= 6 
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" 
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                  )}>
                    {avgHours >= 7 ? "✓ En rango ideal" : avgHours >= 6 ? "⚠ Descanso ajustado" : "✗ Déficit de sueño"}
                  </div>
                </div>
              </div>

              {avgHours > 0 && avgHours < 7 && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 rounded-xl">
                  <p className="text-xs font-semibold">Consejo de Rendimiento</p>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1">
                    Dormir menos de 7 horas reduce la retención a largo plazo hasta un 30%. Intenta adelantar 30 minutos tu hora de acostarte.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-4">
            <p className="text-[11px] text-zinc-400 text-center">
              Los registros se sincronizan con tus métricas de enfoque
            </p>
          </div>
        </div>
      </div>

      {/* History Log Table */}
      {logs.length > 0 && (
        <div className="neo-bento-card p-6">
          <h3 className="font-semibold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            Historial de Noches Registradas ({logs.length})
          </h3>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
            {logs.slice().reverse().map(log => (
              <div 
                key={log.id}
                className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-850/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0",
                    log.calidad === 'buena' ? "bg-emerald-500" :
                    log.calidad === 'regular' ? "bg-amber-500" : "bg-rose-500"
                  )} />
                  <div>
                    <p className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                      {format(parseISO(log.fecha), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    <p className="text-[11px] text-zinc-400 capitalize">
                      Calidad {log.calidad}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700 px-2.5 py-0.5 rounded-md">
                    {formatHours(log.horas)}
                  </span>
                  <button
                    onClick={() => handleEdit(log)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Editar registro"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(log)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
