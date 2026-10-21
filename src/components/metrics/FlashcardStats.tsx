import { useState, useEffect } from "react";
import { 
  Layers, Target, Clock, Brain, 
  CheckCircle2, XCircle, Sparkles, ChevronRight,
  Flame, Plus, ArrowUpRight
} from "lucide-react";
import { cn, toLocalDateStr } from "@/lib/utils";
import { useFlashcardStats } from "@/hooks/useFlashcardStats";
import { DateRange } from "@/components/metrics/DateRangeFilter";
import { useNavigate } from "react-router-dom";
import { subDays, eachDayOfInterval, format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

interface FlashcardStatsProps {
  dateRange?: DateRange;
}

export function FlashcardStats({ dateRange }: FlashcardStatsProps) {
  const {
    deckStats,
    totalCardsStudied,
    totalCorrect,
    totalIncorrect,
    overallAccuracy,
    totalStudyTime,
    averageTimePerCard,
    sessionsThisWeek,
    studyStreak,
    loading,
  } = useFlashcardStats(dateRange);

  const navigate = useNavigate();
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);

  // Auto-select first deck
  useEffect(() => {
    if (!selectedDeck && deckStats.length > 0) {
      setSelectedDeck(deckStats[0].id);
    } else if (selectedDeck && !deckStats.some(d => d.id === selectedDeck)) {
      setSelectedDeck(deckStats[0]?.id || null);
    }
  }, [deckStats, selectedDeck]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "0s";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return "0m";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

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
        <div className="h-48 neo-bento-card p-6 animate-pulse" />
      </div>
    );
  }

  const selectedDeckData = deckStats.find(d => d.id === selectedDeck);

  // Calculate evolution dates based on dateRange or last 7 days
  const evolutionDays = (() => {
    const to = dateRange?.to ? dateRange.to : new Date();
    const from = dateRange?.from ? dateRange.from : subDays(to, 6);
    const diff = Math.min(Math.max(differenceInDays(to, from) + 1, 1), 31);
    
    const daysArr: { dateStr: string; label: string; sublabel: string }[] = [];
    for (let i = diff - 1; i >= 0; i--) {
      const d = subDays(to, i);
      daysArr.push({
        dateStr: toLocalDateStr(d),
        label: format(d, "EEE", { locale: es }),
        sublabel: format(d, "d/M"),
      });
    }
    return daysArr;
  })();

  const sessionMap = new Map<string, number>();
  sessionsThisWeek.forEach(s => {
    const prev = sessionMap.get(s.date) || 0;
    sessionMap.set(s.date, prev + s.duration_seconds);
  });

  const evolutionValues = evolutionDays.map(d => sessionMap.get(d.dateStr) || 0);
  const maxEvolutionVal = Math.max(...evolutionValues, 1);
  const hasEvolutionActivity = evolutionValues.some(v => v > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 rounded-lg flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg sm:text-xl tracking-tight text-zinc-900 dark:text-zinc-100">
              Estadísticas de Flashcards
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">
              Análisis detallado de tu aprendizaje y retención activa
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/flashcards")}
          className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Ir a Flashcards
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neo-bento-card p-5 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Respuestas totales</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/60 dark:border-zinc-700/60">
              <Brain className="w-4 h-4 text-sky-500" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {totalCardsStudied}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[11px] font-medium">
            <span className="text-emerald-600 dark:text-emerald-400">✓ {totalCorrect}</span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span className="text-rose-600 dark:text-rose-400">✗ {totalIncorrect}</span>
          </div>
        </div>

        <div className="neo-bento-card p-5 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Precisión global</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/60 dark:border-zinc-700/60">
              <Target className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {overallAccuracy.toFixed(0)}%
          </p>
          <div className="mt-2 h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.min(overallAccuracy, 100)}%` }}
            />
          </div>
        </div>

        <div className="neo-bento-card p-5 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Promedio por tarjeta</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/60 dark:border-zinc-700/60">
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {formatTime(averageTimePerCard)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-2 truncate">
            {formatDuration(totalStudyTime)} tiempo total
          </p>
        </div>

        <div className="neo-bento-card p-5 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Días de racha</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/60 dark:border-zinc-700/60">
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {studyStreak}
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 font-medium">
            {studyStreak > 0 ? "¡Gran constancia! 🔥" : "¡Empieza una racha hoy!"}
          </p>
        </div>
      </div>

      {/* Evolution Chart */}
      <div className="neo-bento-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <h3 className="font-semibold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
              Evolución de Estudio
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Tiempo invertido en sesiones de repaso
            </p>
          </div>
          <span className="text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60 px-3 py-1 rounded-lg self-start sm:self-auto">
            Total período: {formatDuration(totalStudyTime)}
          </span>
        </div>

        {hasEvolutionActivity ? (
          <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-36 px-1 sm:px-2 overflow-x-auto no-scrollbar">
            {evolutionDays.map((d) => {
              const seconds = sessionMap.get(d.dateStr) || 0;
              const height = (seconds / maxEvolutionVal) * 100;

              return (
                <div key={d.dateStr} className="flex-1 min-w-[28px] max-w-[48px] flex flex-col items-center gap-2 group relative">
                  <div className="w-full h-24 flex items-end justify-center relative">
                    <div
                      className={cn(
                        "w-full transition-all duration-200 rounded-t-md",
                        seconds > 0 
                          ? "bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white" 
                          : "bg-zinc-100 dark:bg-zinc-800/60"
                      )}
                      style={{ height: `${Math.max(height, 6)}%` }}
                    />
                    {seconds > 0 && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap z-20 pointer-events-none shadow-md">
                        {formatTime(seconds)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">{d.label}</span>
                    <span className="text-[9px] text-zinc-400">{d.sublabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center text-zinc-400 text-xs text-center px-4">
            <Clock className="w-7 h-7 mb-2 opacity-40" />
            <p className="font-medium text-zinc-600 dark:text-zinc-400">No hay sesiones registradas en este período</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Completa repasos en flashcards para ver tu actividad aquí</p>
          </div>
        )}
      </div>

      {/* Deck Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Deck List */}
        <div className="neo-bento-card p-6">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="font-semibold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
              Rendimiento por Mazo
            </h3>
            <span className="text-xs text-zinc-400 font-medium">{deckStats.length} mazos</span>
          </div>
          
          {deckStats.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Layers className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-zinc-800 dark:text-zinc-200 font-medium text-sm">No hay mazos creados aún</p>
              <p className="text-zinc-400 text-xs mt-1 mb-4">
                Creá tu primer mazo para repasar con tarjetas interactivas
              </p>
              <button
                onClick={() => navigate("/flashcards")}
                className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium text-xs px-3.5 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear mazo ahora
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
              {deckStats.map(deck => {
                const isSelected = selectedDeck === deck.id;
                return (
                  <button
                    key={deck.id}
                    onClick={() => setSelectedDeck(deck.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl transition-all border group cursor-pointer",
                      isSelected 
                        ? "bg-zinc-100/90 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700" 
                        : "bg-white dark:bg-zinc-850/40 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium truncate text-sm text-zinc-900 dark:text-zinc-100">
                          {deck.nombre}
                        </p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          {deck.subject_nombre} · {deck.total_cards} tarjetas
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-md border",
                          deck.accuracy >= 70 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" :
                          deck.accuracy >= 40 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" :
                          deck.accuracy > 0 ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700"
                        )}>
                          {deck.accuracy > 0 ? `${deck.accuracy.toFixed(0)}%` : "-"}
                        </span>
                        <ChevronRight className={cn(
                          "w-4 h-4 text-zinc-400 transition-transform",
                          isSelected ? "rotate-90 text-zinc-800 dark:text-zinc-200" : ""
                        )} />
                      </div>
                    </div>
                    
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all"
                        style={{ width: `${Math.min(deck.accuracy, 100)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Deck Detail */}
        <div className="neo-bento-card p-6">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="font-semibold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
              {selectedDeckData ? selectedDeckData.nombre : "Detalle de Mazo"}
            </h3>
            {selectedDeckData && (
              <button
                onClick={() => navigate("/flashcards")}
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                Practicar <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {selectedDeckData ? (
            <div className="space-y-4">
              {/* Accuracy Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-400">
                    {selectedDeckData.total_correct}
                  </p>
                  <p className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300 uppercase">Aciertos</p>
                </div>
                <div className="text-center p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <XCircle className="w-4 h-4 mx-auto mb-1 text-rose-600 dark:text-rose-400" />
                  <p className="text-xl font-semibold text-rose-700 dark:text-rose-400">
                    {selectedDeckData.total_incorrect}
                  </p>
                  <p className="text-[10px] font-medium text-rose-800 dark:text-rose-300 uppercase">Errores</p>
                </div>
              </div>

              {/* Card Categories */}
              <div>
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Estado de las tarjetas</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-zinc-600 dark:text-zinc-400">Dominadas (&gt;70%)</span>
                    </div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedDeckData.mastered_cards}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-zinc-600 dark:text-zinc-400">En Progreso (30-70%)</span>
                    </div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedDeckData.learning_cards}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="text-zinc-600 dark:text-zinc-400">Difíciles (&lt;30%)</span>
                    </div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedDeckData.difficult_cards}</span>
                  </div>
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                      <span className="text-zinc-400">Sin estudiar</span>
                    </div>
                    <span className="text-zinc-400">{selectedDeckData.new_cards}</span>
                  </div>
                </div>
              </div>

              {/* Visual distribution */}
              <div>
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Distribución</p>
                <div className="h-3 rounded-full overflow-hidden flex bg-zinc-100 dark:bg-zinc-800">
                  {selectedDeckData.total_cards > 0 ? (
                    <>
                      {selectedDeckData.mastered_cards > 0 && (
                        <div 
                          className="bg-emerald-500 h-full" 
                          style={{ width: `${(selectedDeckData.mastered_cards / selectedDeckData.total_cards) * 100}%` }}
                          title={`Dominadas: ${selectedDeckData.mastered_cards}`}
                        />
                      )}
                      {selectedDeckData.learning_cards > 0 && (
                        <div 
                          className="bg-amber-500 h-full" 
                          style={{ width: `${(selectedDeckData.learning_cards / selectedDeckData.total_cards) * 100}%` }}
                          title={`En Progreso: ${selectedDeckData.learning_cards}`}
                        />
                      )}
                      {selectedDeckData.difficult_cards > 0 && (
                        <div 
                          className="bg-rose-500 h-full" 
                          style={{ width: `${(selectedDeckData.difficult_cards / selectedDeckData.total_cards) * 100}%` }}
                          title={`Difíciles: ${selectedDeckData.difficult_cards}`}
                        />
                      )}
                      {selectedDeckData.new_cards > 0 && (
                        <div 
                          className="bg-zinc-200 dark:bg-zinc-700 h-full" 
                          style={{ width: `${(selectedDeckData.new_cards / selectedDeckData.total_cards) * 100}%` }}
                          title={`Sin estudiar: ${selectedDeckData.new_cards}`}
                        />
                      )}
                    </>
                  ) : (
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800" />
                  )}
                </div>
              </div>

              {/* Actionable recommendation */}
              {selectedDeckData.difficult_cards > 0 ? (
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold">Recomendación de repaso</p>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                        Tienes {selectedDeckData.difficult_cards} tarjeta{selectedDeckData.difficult_cards > 1 ? 's' : ''} con baja precisión. Dale un repaso enfocado antes de tu próximo examen.
                      </p>
                    </div>
                  </div>
                </div>
              ) : selectedDeckData.accuracy >= 80 ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold">¡Mazo dominado!</p>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                        Excelente nivel de retención ({selectedDeckData.accuracy}%). Podés espaciar tus sesiones de repaso.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-zinc-400 text-xs text-center p-4">
              <div>
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Selecciona un mazo a la izquierda para ver su análisis</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
