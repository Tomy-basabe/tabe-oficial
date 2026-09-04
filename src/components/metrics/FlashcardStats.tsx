import { useState } from "react";
import { 
  Layers, Target, Clock, TrendingUp, Brain, 
  CheckCircle2, XCircle, Sparkles, ChevronRight,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFlashcardStats } from "@/hooks/useFlashcardStats";

export function FlashcardStats() {
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
  } = useFlashcardStats();

  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card-gamer rounded-xl p-5 animate-pulse">
              <div className="w-10 h-10 bg-secondary rounded-xl mb-3" />
              <div className="h-6 bg-secondary rounded w-16 mb-2" />
              <div className="h-4 bg-secondary rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const selectedDeckData = deckStats.find(d => d.id === selectedDeck);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#FF9B71] border-4 border-black rounded-xl shadow-[4px_4px_0_0_#000] flex items-center justify-center -rotate-3">
          <Layers className="w-6 h-6 text-black" strokeWidth={3} />
        </div>
        <div>
          <h2 className="font-black text-2xl uppercase tracking-wider text-black">Estadísticas de Flashcards</h2>
          <p className="font-bold text-sm text-black/60 uppercase mt-1">Análisis detallado de tu aprendizaje</p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
          <div className="w-10 h-10 bg-[#00E5FF] border-2 border-black rounded-lg flex items-center justify-center mb-3 rotate-3 group-hover:rotate-0 transition-transform">
            <Brain className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <p className="text-3xl font-black text-black tracking-tighter">{totalCardsStudied}</p>
          <p className="text-xs font-bold text-black/60 uppercase">Respuestas totales</p>
        </div>

        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
          <div className="w-10 h-10 bg-[#BFFF00] border-2 border-black rounded-lg flex items-center justify-center mb-3 -rotate-6 group-hover:rotate-0 transition-transform">
            <Target className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <p className="text-3xl font-black text-black tracking-tighter">{overallAccuracy.toFixed(0)}%</p>
          <p className="text-xs font-bold text-black/60 uppercase">Precisión global</p>
        </div>

        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
          <div className="w-10 h-10 bg-[#C688EB] border-2 border-black rounded-lg flex items-center justify-center mb-3 rotate-6 group-hover:rotate-0 transition-transform">
            <Clock className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <p className="text-3xl font-black text-black tracking-tighter">{formatTime(averageTimePerCard)}</p>
          <p className="text-xs font-bold text-black/60 uppercase">Promedio por tarjeta</p>
        </div>

        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
          <div className="w-10 h-10 bg-[#FFD700] border-2 border-black rounded-lg flex items-center justify-center mb-3 -rotate-3 group-hover:rotate-0 transition-transform">
            <Flame className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <p className="text-3xl font-black text-black tracking-tighter">{studyStreak}</p>
          <p className="text-xs font-bold text-black/60 uppercase">Días de racha</p>
        </div>
      </div>

      {/* Weekly Evolution Chart */}
      <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6 border-b-4 border-black pb-4">
          <h3 className="font-black uppercase text-xl text-black">Evolución Semanal</h3>
          <span className="font-bold text-sm bg-[#FF9B71] border-2 border-black shadow-[2px_2px_0_0_#000] px-3 py-1 rounded-lg">
            Tiempo total: {formatDuration(totalStudyTime)}
          </span>
        </div>

        {sessionsThisWeek.length > 0 ? (
          <div className="flex items-end justify-between gap-2 h-32 px-2">
            {(() => {
              // Group sessions by day
              const dayMap: Record<string, number> = {};
              const today = new Date();
              
              for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const key = date.toISOString().split('T')[0];
                dayMap[key] = 0;
              }
              
              sessionsThisWeek.forEach(s => {
                if (dayMap[s.date] !== undefined) {
                  dayMap[s.date] += s.duration_seconds;
                }
              });

              const values = Object.values(dayMap);
              const maxVal = Math.max(...values, 1);
              const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

              return Object.entries(dayMap).map(([date, seconds], i) => {
                const d = new Date(date);
                const dayName = days[d.getDay()];
                const height = (seconds / maxVal) * 100;
                
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full h-full flex items-end">
                      <div
                        className={cn(
                          "w-full transition-all duration-500 rounded-t-sm",
                          seconds > 0 
                            ? "bg-[#FF9B71] border-2 border-black border-b-0 shadow-[2px_0_0_0_#000]" 
                            : "bg-gray-200 border-2 border-transparent"
                        )}
                        style={{ height: `${Math.max(height, 4)}%` }}
                      >
                        {seconds > 0 && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap z-10 pointer-events-none">
                            {formatTime(seconds)}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-black uppercase">{dayName}</span>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center font-bold text-black/50 uppercase text-sm">
            No hay sesiones esta semana
          </div>
        )}
      </div>

      {/* Deck Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Deck List */}
        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-6">
          <h3 className="font-black uppercase text-xl text-black mb-4">Rendimiento por Mazo</h3>
          
          {deckStats.length === 0 ? (
            <p className="text-black/60 font-bold uppercase text-sm text-center py-8">
              No hay mazos creados aún
            </p>
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {deckStats.map(deck => {
                const isSelected = selectedDeck === deck.id;
                return (
                  <button
                    key={deck.id}
                    onClick={() => setSelectedDeck(isSelected ? null : deck.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl transition-all border-4 border-black group",
                      isSelected 
                        ? "bg-[#BFFF00] shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.1)] translate-y-[2px]" 
                        : "bg-white shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-black uppercase truncate">{deck.nombre}</p>
                        <p className="text-xs font-bold text-black/60 uppercase truncate">{deck.subject_nombre}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xl font-black px-2 py-1 border-2 border-black rounded-lg",
                          deck.accuracy >= 70 ? "bg-[#BFFF00] text-black" :
                          deck.accuracy >= 40 ? "bg-[#FFD700] text-black" :
                          deck.accuracy > 0 ? "bg-[#FF5C5C] text-black" : "bg-gray-200 text-black/60"
                        )}>
                          {deck.accuracy > 0 ? `${deck.accuracy.toFixed(0)}%` : "-"}
                        </span>
                        <ChevronRight className={cn(
                          "w-5 h-5 text-black transition-transform",
                          isSelected && "rotate-90"
                        )} strokeWidth={3} />
                      </div>
                    </div>
                    
                    {/* Mini progress bar */}
                    <div className="h-2 bg-gray-200 border-2 border-black rounded-full overflow-hidden shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.1)]">
                      <div 
                        className="h-full bg-black transition-all border-r-2 border-black"
                        style={{ width: `${deck.accuracy}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Deck Detail */}
        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-6">
          <h3 className="font-black uppercase text-xl text-black mb-4">
            {selectedDeckData ? selectedDeckData.nombre : "Selecciona un mazo"}
          </h3>
          
          {selectedDeckData ? (
            <div className="space-y-6">
              {/* Accuracy Stats */}
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center p-4 bg-[#BFFF00] rounded-xl border-4 border-black shadow-[2px_2px_0_0_#000]">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-black" strokeWidth={2.5} />
                  <p className="text-2xl font-black text-black">
                    {selectedDeckData.total_correct}
                  </p>
                  <p className="text-xs font-bold text-black/60 uppercase">Correctas</p>
                </div>
                <div className="flex-1 text-center p-4 bg-[#FF5C5C] rounded-xl border-4 border-black shadow-[2px_2px_0_0_#000]">
                  <XCircle className="w-6 h-6 mx-auto mb-2 text-black" strokeWidth={2.5} />
                  <p className="text-2xl font-black text-black">
                    {selectedDeckData.total_incorrect}
                  </p>
                  <p className="text-xs font-bold text-black/60 uppercase">Incorrectas</p>
                </div>
              </div>

              {/* Card Categories */}
              <div>
                <p className="text-sm font-black uppercase text-black mb-3">Estado de las tarjetas</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black rounded-full bg-[#BFFF00]" />
                      <span className="text-sm font-bold uppercase text-black/80">Dominadas (&gt;70%)</span>
                    </div>
                    <span className="font-black text-lg text-black">{selectedDeckData.mastered_cards}</span>
                  </div>
                  <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black rounded-full bg-[#FFD700]" />
                      <span className="text-sm font-bold uppercase text-black/80">Aprendiendo (30-70%)</span>
                    </div>
                    <span className="font-black text-lg text-black">{selectedDeckData.learning_cards}</span>
                  </div>
                  <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black rounded-full bg-[#FF5C5C]" />
                      <span className="text-sm font-bold uppercase text-black/80">Difíciles (&lt;30%)</span>
                    </div>
                    <span className="font-black text-lg text-black">{selectedDeckData.difficult_cards}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black rounded-full bg-gray-300" />
                      <span className="text-sm font-bold uppercase text-black/80">Sin estudiar</span>
                    </div>
                    <span className="font-black text-lg text-black/50">{selectedDeckData.new_cards}</span>
                  </div>
                </div>
              </div>

              {/* Visual breakdown */}
              <div>
                <p className="text-sm font-black uppercase text-black mb-2">Distribución</p>
                <div className="h-6 rounded-lg overflow-hidden flex bg-gray-200 border-2 border-black shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.1)]">
                  {selectedDeckData.mastered_cards > 0 && (
                    <div 
                      className="bg-[#BFFF00] h-full border-r-2 border-black" 
                      style={{ width: `${(selectedDeckData.mastered_cards / selectedDeckData.total_cards) * 100}%` }}
                    />
                  )}
                  {selectedDeckData.learning_cards > 0 && (
                    <div 
                      className="bg-[#FFD700] h-full border-r-2 border-black" 
                      style={{ width: `${(selectedDeckData.learning_cards / selectedDeckData.total_cards) * 100}%` }}
                    />
                  )}
                  {selectedDeckData.difficult_cards > 0 && (
                    <div 
                      className="bg-[#FF5C5C] h-full border-r-2 border-black" 
                      style={{ width: `${(selectedDeckData.difficult_cards / selectedDeckData.total_cards) * 100}%` }}
                    />
                  )}
                  {selectedDeckData.new_cards > 0 && (
                    <div 
                      className="bg-gray-300 h-full border-r-2 border-black" 
                      style={{ width: `${(selectedDeckData.new_cards / selectedDeckData.total_cards) * 100}%` }}
                    />
                  )}
                </div>
              </div>

              {/* Recommendation */}
              {selectedDeckData.difficult_cards > 0 && (
                <div className="p-4 bg-[#C688EB] rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000]">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 text-black flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <div>
                      <p className="text-sm font-black uppercase text-black">Recomendación</p>
                      <p className="text-xs font-bold text-black/80 mt-1">
                        Tienes {selectedDeckData.difficult_cards} tarjeta{selectedDeckData.difficult_cards > 1 ? 's' : ''} difícil{selectedDeckData.difficult_cards > 1 ? 'es' : ''}. 
                        El sistema las priorizará.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-black/50 text-sm font-bold uppercase">
              <div className="text-center">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" strokeWidth={2} />
                <p>Selecciona un mazo</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
