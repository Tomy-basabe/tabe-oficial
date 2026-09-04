import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Trophy, Flame, Zap, Target, Swords, Clock, ChevronRight, Users, Bot, Star, Gauge, Bomb, Grid, Crown, Goal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGames } from "@/hooks/useGames";
import { useAuth } from "@/contexts/AuthContext";
import { CareerSelectModal } from "@/components/games/CareerSelectModal";
import { cn } from "@/lib/utils";

export default function Games() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats, matchHistory, loading, userCarrera, submitCareerRequest, updateUserCarrera } = useGames();
  const [showCareerModal, setShowCareerModal] = useState(false);

  const handlePlayPenales = () => {
    if (!userCarrera) {
      setShowCareerModal(true);
      return;
    }
    navigate("/juegos/penales");
  };

  const handleCareerSelected = async (carrera: string, facultad: string) => {
    await updateUserCarrera(carrera, facultad);
    setShowCareerModal(false);
    navigate("/juegos/penales");
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-black flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#00E5FF] border-4 border-black shadow-[4px_4px_0_0_#000] flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-black" />
            </div>
            Arena de Juegos
          </h1>
          <p className="text-black/60 font-bold mt-2 uppercase text-sm">
            Competí con amigos o rivales al azar usando tus mazos de estudio
          </p>
        </div>
        {userCarrera && (
          <div className="px-4 py-2 font-black uppercase text-sm border-4 border-black rounded-xl bg-[#BFFF00] text-black shadow-[4px_4px_0_0_#000] rotate-[2deg]">
            🎓 {userCarrera}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Swords, label: "Partidas", value: stats.totalGames, color: "text-black", bg: "bg-[#00E5FF]" },
          { icon: Trophy, label: "Victorias", value: stats.wins, color: "text-black", bg: "bg-[#FFF7E6]" },
          { icon: Flame, label: "Mejor racha", value: stats.winStreak, color: "text-black", bg: "bg-[#FF5C5C]" },
          { icon: Zap, label: "XP Ganado", value: stats.totalXpEarned, color: "text-black", bg: "bg-[#C688EB]" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={cn("bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-2xl p-4 flex items-center gap-4 transition-transform hover:translate-y-[-2px]")}>
            <div className={cn("w-12 h-12 rounded-xl border-4 border-black flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_0_#000]", bg, color)}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-black text-black">{value}</p>
              <p className="text-xs font-bold text-black/60 uppercase truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-2xl font-black uppercase tracking-wider mb-6 flex items-center gap-3 text-black">
          <Target className="w-6 h-6 text-[#FF5C5C]" />
          Minijuegos Disponibles
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Penales */}
          <div
            className="bg-white border-4 border-black rounded-2xl group cursor-pointer hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#000] shadow-[4px_4px_0_0_#000] transition-all duration-300 overflow-hidden flex flex-col"
            onClick={handlePlayPenales}
          >
            <div className="relative">
              <div className="h-40 border-b-4 border-black bg-[#BFFF00] flex items-center justify-center">
                <Goal className="w-16 h-16 text-black" />
              </div>
              <div className="absolute top-4 right-4 bg-black text-white text-[10px] font-black uppercase px-3 py-1 border-2 border-white rotate-[3deg] shadow-[2px_2px_0_0_#fff]">
                DISPONIBLE
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="font-black uppercase text-xl mb-2 text-black">Tanda de Penales</h3>
              <p className="text-sm font-bold text-black/70 mb-4 flex-1">Pateá y atajá penales respondiendo preguntas de tu mazo.</p>
              <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase text-black/60">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> 1v1</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 3-5 min</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#BFFF00] bg-black px-2 py-1 rotate-[-2deg] border border-black"><Zap className="w-3 h-3" /> +100 XP</span>
              </div>
            </div>
          </div>

          {/* Karts */}
          <div
            className="bg-white border-4 border-black rounded-2xl group cursor-pointer hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#000] shadow-[4px_4px_0_0_#000] transition-all duration-300 overflow-hidden flex flex-col"
            onClick={() => navigate("/juegos/karts")}
          >
            <div className="relative">
              <div className="h-40 border-b-4 border-black bg-[#FF5C5C] flex items-center justify-center">
                <Gauge className="w-16 h-16 text-black" />
              </div>
              <div className="absolute top-4 right-4 bg-black text-white text-[10px] font-black uppercase px-3 py-1 border-2 border-white rotate-[3deg] shadow-[2px_2px_0_0_#fff]">
                DISPONIBLE
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="font-black uppercase text-xl mb-2 text-black">Carrera de Karts</h3>
              <p className="text-sm font-bold text-black/70 mb-4 flex-1">Respondé rápido para ganar turbo y llegar primero a la meta.</p>
              <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase text-black/60">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> 1v1</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 2-4 min</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#FF5C5C] bg-black px-2 py-1 rotate-[-2deg] border border-black"><Zap className="w-3 h-3" /> +120 XP</span>
              </div>
            </div>
          </div>

          {/* Batalla RPG */}
          <div
            className="bg-white border-4 border-black rounded-2xl group cursor-pointer hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#000] shadow-[4px_4px_0_0_#000] transition-all duration-300 overflow-hidden flex flex-col"
            onClick={() => navigate("/juegos/batalla")}
          >
            <div className="relative">
              <div className="h-40 border-b-4 border-black bg-[#C688EB] flex items-center justify-center">
                <Swords className="w-16 h-16 text-black" />
              </div>
              <div className="absolute top-4 right-4 bg-black text-white text-[10px] font-black uppercase px-3 py-1 border-2 border-white rotate-[3deg] shadow-[2px_2px_0_0_#fff]">
                DISPONIBLE
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="font-black uppercase text-xl mb-2 text-black">Batalla RPG</h3>
              <p className="text-sm font-bold text-black/70 mb-4 flex-1">Elegí tus ataques y respondé bien para hacer daño al enemigo.</p>
              <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase text-black/60">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> 1v1</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 5-8 min</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#C688EB] bg-black px-2 py-1 rotate-[-2deg] border border-black"><Zap className="w-3 h-3" /> +130 XP</span>
              </div>
            </div>
          </div>

          {/* La Bomba */}
          <div
            className="bg-white border-4 border-black rounded-2xl group cursor-pointer hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#000] shadow-[4px_4px_0_0_#000] transition-all duration-300 overflow-hidden flex flex-col"
            onClick={() => navigate("/juegos/bomba")}
          >
            <div className="relative">
              <div className="h-40 border-b-4 border-black bg-[#FF9B71] flex items-center justify-center">
                <Bomb className="w-16 h-16 text-black" />
              </div>
              <div className="absolute top-4 right-4 bg-black text-white text-[10px] font-black uppercase px-3 py-1 border-2 border-white rotate-[3deg] shadow-[2px_2px_0_0_#fff]">
                DISPONIBLE
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="font-black uppercase text-xl mb-2 text-black">La Bomba</h3>
              <p className="text-sm font-bold text-black/70 mb-4 flex-1">Respondé correctamente para pasarle la bomba al rival antes de que explote.</p>
              <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase text-black/60">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> 1v1</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 1-2 min</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#FF9B71] bg-black px-2 py-1 rotate-[-2deg] border border-black"><Zap className="w-3 h-3" /> +110 XP</span>
              </div>
            </div>
          </div>

          {/* Ta-Te-Ti */}
          <div
            className="bg-white border-4 border-black rounded-2xl group cursor-pointer hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#000] shadow-[4px_4px_0_0_#000] transition-all duration-300 overflow-hidden flex flex-col"
            onClick={() => navigate("/juegos/tateti")}
          >
            <div className="relative">
              <div className="h-40 border-b-4 border-black bg-[#00E5FF] flex items-center justify-center">
                <Grid className="w-16 h-16 text-black" />
              </div>
              <div className="absolute top-4 right-4 bg-black text-white text-[10px] font-black uppercase px-3 py-1 border-2 border-white rotate-[3deg] shadow-[2px_2px_0_0_#fff]">
                DISPONIBLE
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="font-black uppercase text-xl mb-2 text-black">Ta-Te-Ti Táctico</h3>
              <p className="text-sm font-bold text-black/70 mb-4 flex-1">Respondé bien para colocar tu ficha. ¡3 en línea gana!</p>
              <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase text-black/60">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> 1v1</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 2-5 min</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#00E5FF] bg-black px-2 py-1 rotate-[-2deg] border border-black"><Zap className="w-3 h-3" /> +100 XP</span>
              </div>
            </div>
          </div>

          {/* Ajedrez */}
          <div
            className="bg-white border-4 border-black rounded-2xl group cursor-pointer hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#000] shadow-[4px_4px_0_0_#000] transition-all duration-300 overflow-hidden flex flex-col"
            onClick={() => navigate("/juegos/ajedrez")}
          >
            <div className="relative">
              <div className="h-40 border-b-4 border-black bg-[#FFF7E6] flex items-center justify-center">
                <Crown className="w-16 h-16 text-black" />
              </div>
              <div className="absolute top-4 right-4 bg-black text-white text-[10px] font-black uppercase px-3 py-1 border-2 border-white rotate-[3deg] shadow-[2px_2px_0_0_#fff]">
                DISPONIBLE
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="font-black uppercase text-xl mb-2 text-black">Ajedrez</h3>
              <p className="text-sm font-bold text-black/70 mb-4 flex-1">Partida clásica de ajedrez contra la IA. ¡Dale jaque mate!</p>
              <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase text-black/60">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> vs IA</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 10-20 min</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#FFF7E6] bg-black px-2 py-1 rotate-[-2deg] border border-black"><Zap className="w-3 h-3" /> +150 XP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Match History */}
      <div>
        <h2 className="text-2xl font-black uppercase tracking-wider mb-6 flex items-center gap-3 text-black">
          <Clock className="w-6 h-6 text-[#C688EB]" />
          Últimas Partidas
        </h2>
        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-black/60 font-bold uppercase">Cargando...</div>
            ) : matchHistory.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <Gamepad2 className="w-16 h-16 mb-4 text-black/20" />
                <p className="text-black/60 font-bold uppercase mb-6">¡Aún no jugaste ninguna partida!</p>
                <button 
                  onClick={handlePlayPenales} 
                  className="bg-[#00E5FF] text-black font-black uppercase px-6 py-3 border-4 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all flex items-center gap-2 rounded-xl"
                >
                  <Swords className="w-5 h-5" />
                  Jugar ahora
                </button>
              </div>
            ) : (
              <div className="divide-y-4 divide-black">
                {matchHistory.map(match => {
                  const isWinner = match.winner_id === user?.id;
                  const isP1 = match.player1_id === user?.id;
                  const myScore = isP1 ? match.player1_score : match.player2_score;
                  const theirScore = isP1 ? match.player2_score : match.player1_score;

                  return (
                    <div key={match.id} className="flex items-center justify-between p-4 sm:p-6 bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl border-4 border-black flex items-center justify-center text-xl shadow-[2px_2px_0_0_#000]",
                          isWinner ? "bg-[#BFFF00]" : "bg-[#FF5C5C]"
                        )}>
                          {isWinner ? "🏆" : "😔"}
                        </div>
                        <div>
                          <p className="font-black uppercase text-black flex items-center gap-2">
                            {isWinner ? "Victoria" : "Derrota"}
                            {match.is_bot_match && (
                              <span className="text-black/50 text-xs px-2 py-0.5 border-2 border-black/20 rounded-md bg-gray-100">vs Bot</span>
                            )}
                          </p>
                          <p className="text-sm font-bold text-black/60 uppercase mt-1">
                            {new Date(match.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={cn("font-black text-xl sm:text-2xl", isWinner ? "text-[#7FB300]" : "text-[#E63939]")}>
                            {myScore} - {theirScore}
                          </p>
                        </div>
                        {match.xp_reward > 0 && (
                          <div className="font-black uppercase text-xs px-2 py-1 bg-black text-[#BFFF00] border-2 border-black rotate-[2deg]">
                            +{match.xp_reward} XP
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>

      {/* Career Select Modal */}
      <CareerSelectModal
        open={showCareerModal}
        onClose={() => setShowCareerModal(false)}
        onCareerSelected={handleCareerSelected}
        onRequestCareer={submitCareerRequest}
      />
    </div>
  );
}
