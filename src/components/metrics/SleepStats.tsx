import { useState, useEffect, useCallback } from "react";
import { useSleepLogs, SleepLog } from "@/hooks/useSleepLogs";
import { DateRange } from "@/components/metrics/DateRangeFilter";
import { 
  differenceInDays, eachDayOfInterval, format, 
  parseISO
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
  const { getSleepLogs, deleteSleepLog, loading: logsLoading } = useSleepLogs();
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<SleepLog | null>(null);

  const fetchLogs = useCallback(async () => {
    const data = await getSleepLogs(dateRange.from, dateRange.to);
    setLogs(data);
  }, [getSleepLogs, dateRange]);

  useEffect(() => {
    fetchLogs();
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
    if (confirm(`¿Eliminar el registro del ${format(parseISO(log.fecha), "d 'de' MMMM", { locale: es })}?`)) {
      const success = await deleteSleepLog(log.id);
      if (success) fetchLogs();
    }
  };

  const totalDays = differenceInDays(dateRange.to, dateRange.from) + 1;
  const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

  const chartData = allDays.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayLog = logs.find(l => l.fecha === dateStr);
    
    return {
      label: format(date, 'EEE', { locale: undefined }),
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

  const getQualityLabel = (quality: string) => {
    switch (quality) {
      case 'buena': return 'Buena';
      case 'regular': return 'Regular';
      case 'mala': return 'Mala';
      default: return quality;
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'buena': return <Star className="w-3.5 h-3.5 text-neon-green" />;
      case 'regular': return <CloudMoon className="w-3.5 h-3.5 text-neon-gold" />;
      case 'mala': return <AlertTriangle className="w-3.5 h-3.5 text-neon-red" />;
      default: return null;
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
        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 border-2 border-black rounded-lg bg-[#C688EB] flex items-center justify-center -rotate-3 group-hover:rotate-0 transition-transform">
              <TrendingUp className="w-6 h-6 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs text-black/60 uppercase font-bold">Promedio</p>
              <p className="text-3xl font-black text-black tracking-tighter">{formatHours(avgHours)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-black rounded-lg bg-[#BFFF00] flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
              <Star className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-black/60 uppercase">Sueño Bueno</p>
              <p className="text-2xl font-black text-black">{qualityCounts.buena} días</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-black rounded-lg bg-[#FFD700] flex items-center justify-center -rotate-3 group-hover:rotate-0 transition-transform">
              <CloudMoon className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-black/60 uppercase">Sueño Regular</p>
              <p className="text-2xl font-black text-black">{qualityCounts.regular} días</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-black rounded-lg bg-[#FF5C5C] flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
              <AlertTriangle className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-black/60 uppercase">Sueño Malo</p>
              <p className="text-2xl font-black text-black">{qualityCounts.mala} días</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6 border-b-4 border-black pb-4">
            <div className="flex items-center gap-2">
              <MoonStar className="w-6 h-6 text-black" strokeWidth={3} />
              <h2 className="font-black uppercase text-xl text-black">Horas de Sueño</h2>
            </div>
            <Button 
              onClick={handleAdd}
              className="bg-[#C688EB] text-black border-2 border-black hover:bg-[#b078d4] hover:translate-y-[2px] hover:shadow-[0px_0px_0_0_#000] shadow-[2px_2px_0_0_#000] transition-all font-bold h-10 gap-2 rounded-lg"
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
              Registrar Sueño
            </Button>
          </div>

          {logsLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-black border-t-[#C688EB] rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4">
              <Moon className="w-12 h-12 text-black/30 mb-2" strokeWidth={2} />
              <p className="text-black/60 font-bold uppercase text-sm">No hay registros para este periodo</p>
              <Button 
                variant="link" 
                onClick={handleAdd}
                className="text-black font-black uppercase mt-2 underline"
              >
                Cargar mi primer sueño
              </Button>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-1 h-48 overflow-x-auto pb-2 px-2">
              {chartData.map((item, idx) => (
                <div key={`${item.date}-${idx}`} className="flex-1 min-w-[28px] max-w-[60px] flex flex-col items-center justify-end gap-1 h-full group">
                  <div className="w-full flex-1 flex flex-col justify-end">
                    <div
                      className={cn(
                        "w-full transition-all duration-500 rounded-t-sm relative border-2 border-transparent",
                        item.calidad === 'buena' ? "bg-[#BFFF00] border-black border-b-0 shadow-[2px_0_0_0_#000]" :
                        item.calidad === 'regular' ? "bg-[#FFD700] border-black border-b-0 shadow-[2px_0_0_0_#000]" :
                        item.calidad === 'mala' ? "bg-[#FF5C5C] border-black border-b-0 shadow-[2px_0_0_0_#000]" :
                        "bg-gray-200"
                      )}
                      style={{
                        height: `${Math.max((item.horas / 12) * 100, 4)}%`,
                      }}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap z-10 pointer-events-none">
                        {formatHours(item.horas)} - {item.calidad || 'Sin datos'}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-black uppercase leading-tight">{item.label}</span>
                  <span className="text-[9px] font-bold text-black/50 leading-tight">{item.sublabel}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t-4 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-black/60 uppercase mb-1">Total del periodo</p>
              <p className="text-3xl font-black text-black">
                {formatHours(logs.reduce((acc, l) => acc + l.horas, 0))}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-black uppercase text-black">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 border-2 border-black rounded-sm bg-[#BFFF00]" />
                <span>Bueno</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 border-2 border-black rounded-sm bg-[#FFD700]" />
                <span>Regular</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 border-2 border-black rounded-sm bg-[#FF5C5C]" />
                <span>Malo</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-6">
          <h3 className="font-black uppercase text-xl text-black mb-6 flex items-center gap-2 border-b-4 border-black pb-4">
            <Moon className="w-6 h-6 text-black" strokeWidth={3} />
            Análisis
          </h3>
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#C688EB] border-4 border-black shadow-[2px_2px_0_0_#000]">
              <p className="text-sm text-black font-black uppercase mb-1">Consejo Pro</p>
              <p className="text-xs font-bold text-black/80 leading-relaxed">
                {avgHours < 7 
                  ? "Tu promedio de sueño está por debajo de las 7 horas recomendadas. Trata de aumentar tu descanso para mejorar la retención de memoria."
                  : "¡Excelente descanso! Mantener un ritmo de sueño constante ayuda a que tu cerebro procese mejor lo estudiado durante el día."}
              </p>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-black/60">Distribución de Calidad</p>
              {[
                { label: 'Buena', count: qualityCounts.buena, color: '#BFFF00' },
                { label: 'Regular', count: qualityCounts.regular, color: '#FFD700' },
                { label: 'Mala', count: qualityCounts.mala, color: '#FF5C5C' },
              ].map(q => {
                const percentage = logs.length > 0 ? (q.count / logs.length) * 100 : 0;
                return (
                  <div key={q.label}>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-black uppercase">{q.label}</span>
                      <span className="font-black text-black px-2 py-0.5 border-2 border-black rounded bg-gray-100">{Math.round(percentage)}%</span>
                    </div>
                    <div className="h-4 bg-gray-200 border-2 border-black rounded-full overflow-hidden shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.1)]">
                      <div 
                        className="h-full border-r-2 border-black transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: q.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Logs list with edit/delete */}
      {logs.length > 0 && (
        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-6">
          <h3 className="font-black uppercase text-xl text-black mb-6 flex items-center gap-2 border-b-4 border-black pb-4">
            <Moon className="w-6 h-6 text-black" strokeWidth={3} />
            Registros del Periodo
          </h3>
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {[...logs].reverse().map(log => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-100 border-2 border-black hover:translate-y-[-2px] hover:shadow-[2px_2px_0_0_#000] transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-white border-2 border-black rounded-lg flex items-center justify-center">
                    {log.calidad === 'buena' ? <Star className="w-5 h-5 text-black" strokeWidth={2.5} /> :
                     log.calidad === 'regular' ? <CloudMoon className="w-5 h-5 text-black" strokeWidth={2.5} /> :
                     <AlertTriangle className="w-5 h-5 text-black" strokeWidth={2.5} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black uppercase text-black truncate">
                      {format(parseISO(log.fecha), "EEEE d 'de' MMM", { locale: es })}
                    </p>
                    <p className="text-xs font-bold text-black/60 uppercase mt-0.5">
                      {formatHours(log.horas)} · {getQualityLabel(log.calidad)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                  <button
                    onClick={() => handleEdit(log)}
                    className="p-2 rounded-lg bg-white border-2 border-black hover:bg-gray-200 text-black transition-all shadow-[2px_2px_0_0_#000]"
                    title="Editar registro"
                  >
                    <Pencil className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => handleDelete(log)}
                    className="p-2 rounded-lg bg-[#FF5C5C] border-2 border-black hover:bg-red-500 text-black transition-all shadow-[2px_2px_0_0_#000]"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
