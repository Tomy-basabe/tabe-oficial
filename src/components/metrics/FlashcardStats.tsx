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
            <div key={i} className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 animate-pulse">
              <div className="w-10 h-10 bg-muted rounded-xl mb-3 border-2 border-foreground/20" />
              <div className="h-6 bg-muted rounded w-20 mb-2 border border-foreground/10" />
              <div className="h-4 bg-muted rounded w-28 border border-foreground/10" />
            </div>
          ))}
        </div>
        <div className="h-48 bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6 animate-pulse" />
      </div>
    );
  }

  const selectedDeckData = deckStats.find(d => d.id === selectedDeck);

  // Calculate evolution dates based on dateRange or last 7 days
  const evolutionDays = (() => {
    const to = dateRange?.to ? dateRange.to : new Date();
    const from = dateRange?.from ? dateRange.from : subDays(to, 6);
    const diff = Math.min(Math.max(differenceInDays(to, from) + 1, 1), 31);
    
    // Create interval array
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
          <div className="w-12 h-12 bg-[#FF9B71] border-4 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))] flex items-center justify-center -rotate-3 shrink-0">
            <Layers className="w-6 h-6 text-black" strokeWidth={3} />
          </div>
          <div>
            <h2 className="font-black text-2xl uppercase tracking-wider text-foreground">
              Estadísticas de Flashcards
            </h2>
            <p className="font-bold text-xs sm:text-sm text-muted-foreground uppercase mt-0.5">
              Análisis detallado de tu aprendizaje y retención
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/flashcards")}
          className="bg-[#BFFF00] text-black font-black uppercase text-xs px-4 py-2 border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all flex items-center gap-2 self-start sm:self-auto rounded-lg"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Ir a Flashcards
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all group">
          <div className="w-10 h-10 bg-[#00E5FF] border-2 border-foreground rounded-lg flex items-center justify-center mb-3 rotate-3 group-hover:rotate-0 transition-transform">
            <Brain className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter">
            {totalCardsStudied}
          </p>
          <p className="text-xs font-bold text-muted-foreground uppercase mt-1">Respuestas totales</p>
          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold">
            <span className="text-emerald-500">✓ {totalCorrect}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-rose-500">✗ {totalIncorrect}</span>
          </div>
        </div>

        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all group">
          <div className="w-10 h-10 bg-[#BFFF00] border-2 border-foreground rounded-lg flex items-center justify-center mb-3 -rotate-6 group-hover:rotate-0 transition-transform">
            <Target className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter">
            {overallAccuracy.toFixed(0)}%
          </p>
          <p className="text-xs font-bold text-muted-foreground uppercase mt-1">Precisión global</p>
          <div className="mt-2 h-2 w-full bg-muted border-2 border-foreground rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#BFFF00] transition-all"
              style={{ width: `${Math.min(overallAccuracy, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all group">
          <div className="w-10 h-10 bg-[#C688EB] border-2 border-foreground rounded-lg flex items-center justify-center mb-3 rotate-6 group-hover:rotate-0 transition-transform">
            <Clock className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter">
            {formatTime(averageTimePerCard)}
          </p>
          <p className="text-xs font-bold text-muted-foreground uppercase mt-1">Promedio por tarjeta</p>
          <p className="text-[10px] font-bold text-muted-foreground mt-2 truncate">
            {formatDuration(totalStudyTime)} tiempo total
          </p>
        </div>

        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all group">
          <div className="w-10 h-10 bg-[#FFD700] border-2 border-foreground rounded-lg flex items-center justify-center mb-3 -rotate-3 group-hover:rotate-0 transition-transform">
            <Flame className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter">
            {studyStreak}
          </p>
          <p className="text-xs font-bold text-muted-foreground uppercase mt-1">Días de racha</p>
          <p className="text-[10px] font-bold text-[#FFD700] mt-2">
            {studyStreak > 0 ? "¡Excelente constancia! 🔥" : "¡Empieza una racha hoy!"}
          </p>
        </div>
      </div>

      {/* Evolution Chart */}
      <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 border-b-4 border-foreground pb-4">
          <div>
            <h3 className="font-black uppercase text-lg sm:text-xl text-foreground">
              Evolución de Estudio
            </h3>
            <p className="text-xs font-bold text-muted-foreground uppercase">
              Tiempo invertido en sesiones de repaso
            </p>
          </div>
          <span className="font-bold text-xs sm:text-sm bg-[#FF9B71] text-black border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] px-3 py-1 rounded-lg self-start sm:self-auto">
            Total período: {formatDuration(totalStudyTime)}
          </span>
        </div>

        {hasEvolutionActivity ? (
          <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-36 px-1 sm:px-2 overflow-x-auto no-scrollbar">
            {evolutionDays.map((d, i) => {
              const seconds = sessionMap.get(d.dateStr) || 0;
              const height = (seconds / maxEvolutionVal) * 100;

              return (
                <div key={d.dateStr} className="flex-1 min-w-[28px] max-w-[50px] flex flex-col items-center gap-2 group relative">
                  <div className="w-full h-24 flex items-end justify-center relative">
                    <div
                      className={cn(
                        "w-full transition-all duration-300 rounded-t-sm",
                        seconds > 0 
                          ? "bg-[#FF9B71] border-2 border-foreground border-b-0 shadow-[2px_0_0_0_hsl(var(--foreground))]" 
                          : "bg-muted border border-border/40"
                      )}
                      style={{ height: `${Math.max(height, 6)}%` }}
                    />
                    {seconds > 0 && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background px-2 py-1 rounded text-[10px] font-black whitespace-nowrap z-20 pointer-events-none shadow-md">
                        {formatTime(seconds)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[10px] font-black text-foreground uppercase">{d.label}</span>
                    <span className="text-[9px] font-bold text-muted-foreground">{d.sublabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center font-bold text-muted-foreground uppercase text-xs sm:text-sm text-center px-4">
            <Clock className="w-8 h-8 mb-2 opacity-40 text-muted-foreground" />
            <p>No hay sesiones registradas en este período</p>
            <p className="text-[10px] lowercase text-muted-foreground/80 mt-1">Completa repasos en flashcards para ver tu actividad aquí</p>
          </div>
        )}
      </div>

      {/* Deck Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Deck List */}
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 border-b-2 border-foreground/20 pb-3">
            <h3 className="font-black uppercase text-lg sm:text-xl text-foreground">Rendimiento por Mazo</h3>
            <span className="text-xs font-bold text-muted-foreground uppercase">{deckStats.length} mazos</span>
          </div>
          
          {deckStats.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Layers className="w-12 h-12 mx-auto text-muted-foreground opacity-40 mb-3" />
              <p className="text-foreground font-black uppercase text-base">No hay mazos creados aún</p>
              <p className="text-muted-foreground font-bold text-xs uppercase mt-1 mb-4">
                Creá tu primer mazo para repasar con tarjetas interactivas
              </p>
              <button
                onClick={() => navigate("/flashcards")}
                className="bg-[#BFFF00] text-black font-black uppercase text-xs px-4 py-2 border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-all rounded-lg inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
                Crear Mazo Ahora
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
              {deckStats.map(deck => {
                const isSelected = selectedDeck === deck.id;
                return (
                  <button
                    key={deck.id}
                    onClick={() => setSelectedDeck(deck.id)}
                    className={cn(
                      "w-full text-left p-3.5 sm:p-4 rounded-xl transition-all border-4 border-foreground group",
                      isSelected 
                        ? "bg-[#BFFF00] text-black shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.1)] translate-y-[2px]" 
                        : "bg-card text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_0_hsl(var(--foreground))]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className={cn("font-black uppercase truncate text-sm sm:text-base", isSelected ? "text-black" : "text-foreground")}>
                          {deck.nombre}
                        </p>
                        <p className={cn("text-xs font-bold uppercase truncate", isSelected ? "text-black/70" : "text-muted-foreground")}>
                          {deck.subject_nombre} · {deck.total_cards} tarjetas
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          "text-sm font-black px-2 py-0.5 border-2 border-foreground rounded-lg",
                          deck.accuracy >= 70 ? "bg-[#BFFF00] text-black" :
                          deck.accuracy >= 40 ? "bg-[#FFD700] text-black" :
                          deck.accuracy > 0 ? "bg-[#FF5C5C] text-black" : "bg-muted text-muted-foreground"
                        )}>
                          {deck.accuracy > 0 ? `${deck.accuracy.toFixed(0)}%` : "-"}
                        </span>
                        <ChevronRight className={cn(
                          "w-4 h-4 transition-transform",
                          isSelected ? "rotate-90 text-black" : "text-foreground"
                        )} strokeWidth={3} />
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="h-2 bg-muted border border-foreground rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all",
                          isSelected ? "bg-black" : "bg-primary"
                        )}
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
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 border-b-2 border-foreground/20 pb-3">
            <h3 className="font-black uppercase text-lg sm:text-xl text-foreground truncate">
              {selectedDeckData ? selectedDeckData.nombre : "Detalle de Mazo"}
            </h3>
            {selectedDeckData && (
              <button
                onClick={() => navigate("/flashcards")}
                className="text-xs font-black uppercase text-foreground hover:underline flex items-center gap-1 shrink-0"
              >
                Practicar <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {selectedDeckData ? (
            <div className="space-y-5">
              {/* Accuracy Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3.5 bg-[#BFFF00] rounded-xl border-4 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-black" strokeWidth={2.5} />
                  <p className="text-2xl font-black text-black">
                    {selectedDeckData.total_correct}
                  </p>
                  <p className="text-[10px] font-bold text-black/80 uppercase">Aciertos</p>
                </div>
                <div className="text-center p-3.5 bg-[#FF5C5C] rounded-xl border-4 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <XCircle className="w-5 h-5 mx-auto mb-1 text-black" strokeWidth={2.5} />
                  <p className="text-2xl font-black text-black">
                    {selectedDeckData.total_incorrect}
                  </p>
                  <p className="text-[10px] font-bold text-black/80 uppercase">Errores</p>
                </div>
              </div>

              {/* Card Categories */}
              <div>
                <p className="text-xs font-black uppercase text-foreground mb-2.5">Estado de las tarjetas</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-foreground rounded-full bg-[#BFFF00]" />
                      <span className="font-bold uppercase text-foreground">Dominadas (&gt;70%)</span>
                    </div>
                    <span className="font-black text-foreground">{selectedDeckData.mastered_cards}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-foreground rounded-full bg-[#FFD700]" />
                      <span className="font-bold uppercase text-foreground">En Progreso (30-70%)</span>
                    </div>
                    <span className="font-black text-foreground">{selectedDeckData.learning_cards}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-foreground rounded-full bg-[#FF5C5C]" />
                      <span className="font-bold uppercase text-foreground">Difíciles (&lt;30%)</span>
                    </div>
                    <span className="font-black text-foreground">{selectedDeckData.difficult_cards}</span>
                  </div>
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-foreground rounded-full bg-muted" />
                      <span className="font-bold uppercase text-muted-foreground">Sin estudiar</span>
                    </div>
                    <span className="font-black text-muted-foreground">{selectedDeckData.new_cards}</span>
                  </div>
                </div>
              </div>

              {/* Visual distribution */}
              <div>
                <p className="text-xs font-black uppercase text-foreground mb-1.5">Distribución</p>
                <div className="h-5 rounded-lg overflow-hidden flex bg-muted border-2 border-foreground shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.1)]">
                  {selectedDeckData.total_cards > 0 ? (
                    <>
                      {selectedDeckData.mastered_cards > 0 && (
                        <div 
                          className="bg-[#BFFF00] h-full border-r border-foreground" 
                          style={{ width: `${(selectedDeckData.mastered_cards / selectedDeckData.total_cards) * 100}%` }}
                          title={`Dominadas: ${selectedDeckData.mastered_cards}`}
                        />
                      )}
                      {selectedDeckData.learning_cards > 0 && (
                        <div 
                          className="bg-[#FFD700] h-full border-r border-foreground" 
                          style={{ width: `${(selectedDeckData.learning_cards / selectedDeckData.total_cards) * 100}%` }}
                          title={`En Progreso: ${selectedDeckData.learning_cards}`}
                        />
                      )}
                      {selectedDeckData.difficult_cards > 0 && (
                        <div 
                          className="bg-[#FF5C5C] h-full border-r border-foreground" 
                          style={{ width: `${(selectedDeckData.difficult_cards / selectedDeckData.total_cards) * 100}%` }}
                          title={`Difíciles: ${selectedDeckData.difficult_cards}`}
                        />
                      )}
                      {selectedDeckData.new_cards > 0 && (
                        <div 
                          className="bg-muted h-full" 
                          style={{ width: `${(selectedDeckData.new_cards / selectedDeckData.total_cards) * 100}%` }}
                          title={`Sin estudiar: ${selectedDeckData.new_cards}`}
                        />
                      )}
                    </>
                  ) : (
                    <div className="w-full bg-muted" />
                  )}
                </div>
              </div>

              {/* Actionable recommendation */}
              {selectedDeckData.difficult_cards > 0 ? (
                <div className="p-3.5 bg-[#C688EB] text-black rounded-xl border-4 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-5 h-5 text-black shrink-0 mt-0.5" strokeWidth={2.5} />
                    <div>
                      <p className="text-xs font-black uppercase text-black">Recomendación Activa</p>
                      <p className="text-[11px] font-bold text-black/80 mt-0.5">
                        Tienes {selectedDeckData.difficult_cards} tarjeta{selectedDeckData.difficult_cards > 1 ? 's' : ''} con baja precisión. Dale un repaso enfocado antes de tu próximo examen.
                      </p>
                    </div>
                  </div>
                </div>
              ) : selectedDeckData.accuracy >= 80 ? (
                <div className="p-3.5 bg-[#BFFF00] text-black rounded-xl border-4 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-5 h-5 text-black shrink-0 mt-0.5" strokeWidth={2.5} />
                    <div>
                      <p className="text-xs font-black uppercase text-black">¡Mazo Dominado!</p>
                      <p className="text-[11px] font-bold text-black/80 mt-0.5">
                        Excelente nivel de retención en este mazo ({selectedDeckData.accuracy}%). Podés espaciar tus sesiones de repaso.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-xs font-bold uppercase text-center p-4">
              <div>
                <Layers className="w-10 h-10 mx-auto mb-2 opacity-40 text-muted-foreground" />
                <p>Selecciona un mazo a la izquierda para ver su análisis</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
