import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Trophy, Flame, Zap, Target, Swords, Clock, ChevronRight, Users, Bot, Star } from "lucide-react";
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
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            Arena de Juegos
          </h1>
          <p className="text-muted-foreground mt-1">
            Competí con amigos o rivales al azar usando tus mazos de estudio
          </p>
        </div>
        {userCarrera && (
          <Badge variant="secondary" className="text-xs px-3 py-1.5 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
            🎓 {userCarrera}
          </Badge>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Swords, label: "Partidas", value: stats.totalGames, color: "text-neon-cyan", bg: "from-neon-cyan/20 to-neon-cyan/5" },
          { icon: Trophy, label: "Victorias", value: stats.wins, color: "text-neon-gold", bg: "from-neon-gold/20 to-neon-gold/5" },
          { icon: Flame, label: "Mejor racha", value: stats.winStreak, color: "text-orange-500", bg: "from-orange-500/20 to-orange-500/5" },
          { icon: Zap, label: "XP Ganado", value: stats.totalXpEarned, color: "text-neon-purple", bg: "from-neon-purple/20 to-neon-purple/5" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <Card key={label} className={cn("card-gamer bg-gradient-to-br", bg)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-background/50 flex items-center justify-center flex-shrink-0", color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-display font-bold">{value}</p>
                <p className="text-xs text-muted-foreground truncate">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available Games */}
      <div>
        <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-neon-cyan" />
          Minijuegos Disponibles
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Penales - Available */}
          <Card
            className="card-gamer group cursor-pointer hover:glow-cyan transition-all duration-300 border-neon-cyan/20 hover:border-neon-cyan/50"
            onClick={handlePlayPenales}
          >
            <CardContent className="p-0">
              <div className="relative overflow-hidden rounded-t-xl">
                <div className="h-40 bg-gradient-to-br from-green-900/80 via-green-800/60 to-emerald-900/80 flex items-center justify-center relative">
                  {/* Soccer field lines */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <div className="w-32 h-24 border-2 border-white rounded-sm" />
                    <div className="absolute w-16 h-12 border-2 border-white rounded-sm" />
                  </div>
                  {/* Goal */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="text-6xl mb-1">⚽</div>
                    <div className="flex gap-1">
                      <div className="w-8 h-8 rounded bg-white/10 border border-white/20 flex items-center justify-center text-xs">←</div>
                      <div className="w-8 h-8 rounded bg-white/10 border border-white/20 flex items-center justify-center text-xs">↑</div>
                      <div className="w-8 h-8 rounded bg-white/10 border border-white/20 flex items-center justify-center text-xs">→</div>
                    </div>
                  </div>
                </div>
                <Badge className="absolute top-3 right-3 bg-neon-green/90 text-background text-[10px] font-bold">
                  DISPONIBLE
                </Badge>
              </div>
              <div className="p-4">
                <h3 className="font-display font-bold text-lg mb-1 group-hover:text-neon-cyan transition-colors">
                  ⚽ Tanda de Penales
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Pateá y atajá penales respondiendo preguntas de tu mazo. ¡Respondé bien para meter gol!
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 1v1</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 3-5 min</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-neon-gold" /> +100 XP</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coming Soon Games */}
          {[
            { emoji: "🧠", name: "Trivia Relámpago", desc: "Respondé más rápido que tu rival", badge: "PRÓXIMAMENTE" },
            { emoji: "🏃", name: "Carrera de Sabios", desc: "Avanzá respondiendo bien y llegá primero a la meta", badge: "PRÓXIMAMENTE" },
          ].map(game => (
            <Card key={game.name} className="card-gamer opacity-60 cursor-not-allowed">
              <CardContent className="p-0">
                <div className="h-40 bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center relative rounded-t-xl">
                  <span className="text-6xl opacity-40">{game.emoji}</span>
                  <Badge className="absolute top-3 right-3 bg-secondary text-muted-foreground text-[10px] font-bold border border-border">
                    {game.badge}
                  </Badge>
                </div>
                <div className="p-4">
                  <h3 className="font-display font-bold text-lg mb-1">{game.emoji} {game.name}</h3>
                  <p className="text-sm text-muted-foreground">{game.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Match History */}
      <div>
        <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-neon-purple" />
          Últimas Partidas
        </h2>
        <Card className="card-gamer">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando...</div>
            ) : matchHistory.length === 0 ? (
              <div className="p-8 text-center">
                <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">¡Aún no jugaste ninguna partida!</p>
                <Button onClick={handlePlayPenales} className="bg-gradient-to-r from-neon-cyan to-neon-purple">
                  <Swords className="w-4 h-4 mr-2" />
                  Jugar ahora
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {matchHistory.map(match => {
                  const isWinner = match.winner_id === user?.id;
                  const isP1 = match.player1_id === user?.id;
                  const myScore = isP1 ? match.player1_score : match.player2_score;
                  const theirScore = isP1 ? match.player2_score : match.player1_score;

                  return (
                    <div key={match.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                          isWinner ? "bg-neon-gold/20" : "bg-destructive/20"
                        )}>
                          {isWinner ? "🏆" : "😔"}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {isWinner ? "Victoria" : "Derrota"}
                            {match.is_bot_match && (
                              <span className="text-muted-foreground ml-1 text-xs">(vs Bot)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(match.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={cn("font-display font-bold text-lg", isWinner ? "text-neon-gold" : "text-destructive")}>
                            {myScore} - {theirScore}
                          </p>
                        </div>
                        {match.xp_reward > 0 && (
                          <Badge variant="secondary" className="text-neon-gold text-xs">
                            +{match.xp_reward} XP
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
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
