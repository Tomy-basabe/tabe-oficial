import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Trophy, Flame, Zap, Target, Swords, Clock, ChevronRight, Users, Bot, Gauge, Bomb, Crown, Goal, GraduationCap, Search, LayoutGrid, Play, KeyRound, Check, Minus, X, Shield, Layers, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGames } from "@/hooks/useGames";
import { useAuth } from "@/contexts/AuthContext";
import { CareerSelectModal } from "@/components/games/CareerSelectModal";
import { GameAuthModal } from "@/components/games/GameAuthRequired";
import { GameModeModal } from "@/components/games/GameModeModal";
import { useGameRoom } from "@/hooks/useGameRoom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GameCardItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  path: string;
  type: string;
  category: "1v1" | "solo";
  icon: any;
  playersBadge: string;
  durationBadge: string;
  xpReward: number;
  highlight?: boolean;
}

const GAMES_CATALOG: GameCardItem[] = [
  {
    id: "penales",
    title: "Tanda de Penales",
    subtitle: "Duelo de preguntas",
    description: "Pateá y atajá penales respondiendo preguntas académicas de tu mazo de estudio. Cada acierto define la dirección y potencia del disparo.",
    path: "/juegos/penales",
    type: "penales",
    category: "1v1",
    icon: Goal,
    playersBadge: "1 vs 1 / Bot",
    durationBadge: "3-5 min",
    xpReward: 100,
  },
  {
    id: "karts",
    title: "Carrera de Karts",
    subtitle: "Velocidad y reflejos",
    description: "Respondé con velocidad y precisión para ganar turbos acumulativos, sortear curvas y cruzar la línea de meta antes que tu oponente.",
    path: "/juegos/karts",
    type: "karts",
    category: "1v1",
    icon: Gauge,
    playersBadge: "1 vs 1 / Bot",
    durationBadge: "2-4 min",
    xpReward: 120,
  },
  {
    id: "batalla",
    title: "Batalla RPG",
    subtitle: "Combate estratégico",
    description: "Seleccioná tus habilidades y respondé correctamente para asestar golpes críticos, activar escudos mágicos y derrotar a tu contrincante.",
    path: "/juegos/batalla",
    type: "batalla",
    category: "1v1",
    icon: Swords,
    playersBadge: "1 vs 1 / Bot",
    durationBadge: "5-8 min",
    xpReward: 130,
  },
  {
    id: "bomba",
    title: "La Bomba",
    subtitle: "Tensión contrarreloj",
    description: "Respondé antes de que el temporizador llegue a cero para pasar la bomba al rival. Quien tenga el artefacto cuando expire el tiempo pierde.",
    path: "/juegos/bomba",
    type: "bomba",
    category: "1v1",
    icon: Bomb,
    playersBadge: "1 vs 1 / Bot",
    durationBadge: "1-2 min",
    xpReward: 110,
  },
  {
    id: "tateti",
    title: "Ta-Te-Ti Táctico",
    subtitle: "Estrategia por casillas",
    description: "Conquistá casillas respondiendo correctamente las preguntas académicas. Alineá tres fichas en línea para sellar la victoria.",
    path: "/juegos/tateti",
    type: "tateti",
    category: "1v1",
    icon: LayoutGrid,
    playersBadge: "1 vs 1 / Bot",
    durationBadge: "2-5 min",
    xpReward: 100,
  },
  {
    id: "ajedrez",
    title: "Ajedrez Clásico",
    subtitle: "Cálculo y táctica",
    description: "Partida clásica de ajedrez contra el motor de IA de TABE. Poné a prueba tu pensamiento analítico, aperturas y finales.",
    path: "/juegos/ajedrez",
    type: "ajedrez",
    category: "solo",
    icon: Crown,
    playersBadge: "vs IA",
    durationBadge: "10-20 min",
    xpReward: 150,
  },
];

export default function Games() {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const isTestUser = !user || isGuest;
  const { stats, matchHistory, loading, userCarrera, submitCareerRequest, updateUserCarrera } = useGames();
  const { createRoom, joinRoom, sendFriendChallenge } = useGameRoom();

  const [showCareerModal, setShowCareerModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedGameTitle, setSelectedGameTitle] = useState("");
  const [selectedGameType, setSelectedGameType] = useState("penales");
  const [selectedGamePath, setSelectedGamePath] = useState("/juegos/penales");
  const [modeModalOpen, setModeModalOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "1v1" | "solo">("all");

  const handleOpenGame = (gamePath: string, gameTitle: string, gameType: string) => {
    if (isTestUser) {
      toast.error("Debes iniciar sesión con tu cuenta para jugar.");
      setSelectedGameTitle(gameTitle);
      setShowAuthModal(true);
      return;
    }

    setSelectedGameTitle(gameTitle);
    setSelectedGamePath(gamePath);
    setSelectedGameType(gameType);
    setModeModalOpen(true);
  };

  const handleOpenQuickJoin = () => {
    if (isTestUser) {
      toast.error("Debes iniciar sesión para unirte a una sala.");
      setSelectedGameTitle("Partida con código");
      setShowAuthModal(true);
      return;
    }
    setSelectedGameTitle("Unirse con código");
    setSelectedGamePath("/juegos/penales");
    setSelectedGameType("penales");
    setModeModalOpen(true);
  };

  const handleCareerSelected = async (carrera: string, facultad: string) => {
    await updateUserCarrera(carrera, facultad);
    setShowCareerModal(false);
  };

  // Filtered games
  const filteredGames = useMemo(() => {
    return GAMES_CATALOG.filter((game) => {
      const matchesSearch =
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.subtitle.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        activeFilter === "all" || game.category === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 text-foreground max-w-7xl mx-auto">
      {/* Notion-style Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <span>Inicio</span>
            <span>/</span>
            <span className="text-foreground">Arena de Juegos</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Arena de Juegos
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Pon a prueba tus conocimientos, compite contra compañeros en tiempo real o desafía al bot de estudio.
              </p>
            </div>
          </div>
        </div>

        {/* Action Header Tools */}
        <div className="flex flex-wrap items-center gap-2.5">
          {userCarrera ? (
            <button
              onClick={() => setShowCareerModal(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors"
              title="Haz clic para cambiar tu carrera asignada"
            >
              <GraduationCap className="w-3.5 h-3.5 text-primary" />
              <span className="max-w-[180px] truncate">{userCarrera}</span>
              <span className="text-[10px] text-muted-foreground underline ml-0.5">Cambiar</span>
            </button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCareerModal(true)}
              className="h-8 text-xs font-medium border-border/80 flex items-center gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Configurar carrera</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenQuickJoin}
            className="h-8 text-xs font-medium border-border/80 flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Unirse con código</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid - Notion / Linear Minimalist Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { 
            icon: Swords, 
            label: "Partidas jugadas", 
            value: stats.totalGames, 
            helper: `${stats.losses} derrotas registradas` 
          },
          { 
            icon: Trophy, 
            label: "Victorias", 
            value: stats.wins, 
            helper: `${winRate}% de efectividad` 
          },
          { 
            icon: Flame, 
            label: "Mejor racha", 
            value: stats.winStreak, 
            helper: "Victorias consecutivas" 
          },
          { 
            icon: Zap, 
            label: "Experiencia ganada", 
            value: `${stats.totalXpEarned} XP`, 
            helper: "Puntos de progreso" 
          },
        ].map(({ icon: Icon, label, value, helper }) => (
          <div
            key={label}
            className="bg-card/70 border border-border/70 hover:border-border rounded-xl p-4 transition-all duration-200 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <div className="w-7 h-7 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground">
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{helper}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Catalog Section */}
      <div className="space-y-4">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          {/* Pills Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "Todos los juegos" },
              { id: "1v1", label: "1 vs 1 Multijugador" },
              { id: "solo", label: "Solitario / IA" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
                  activeFilter === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar minijuegos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/40 border-border/70 focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Games Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGames.map((game) => {
            const IconComponent = game.icon;
            const isFeatured = game.highlight;

            return (
              <div
                key={game.id}
                onClick={() => handleOpenGame(game.path, game.title, game.type)}
                className={cn(
                  "bg-card/70 border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between group cursor-pointer hover:shadow-md hover:border-primary/50 relative overflow-hidden",
                  isFeatured 
                    ? "md:col-span-2 lg:col-span-3 border-primary/30 bg-gradient-to-r from-card/90 via-card/70 to-primary/5"
                    : "border-border/70"
                )}
              >
                <div className="space-y-3">
                  {/* Top Badges & Icon */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                          {game.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">{game.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium bg-muted/70 text-muted-foreground px-2 py-0.5 rounded-md border border-border/50">
                        {game.playersBadge}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {game.description}
                  </p>
                </div>

                {/* Footer Metadata & Action */}
                <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground/70" />
                      {game.durationBadge}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-primary">
                      <Zap className="w-3 h-3" />
                      +{game.xpReward} XP
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-medium text-primary group-hover:translate-x-0.5 transition-transform">
                    <span>"Jugar"</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-12 bg-card/40 border border-border/60 rounded-xl">
            <Gamepad2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">No se encontraron juegos</p>
            <p className="text-xs text-muted-foreground mt-1">Prueba con otro término de búsqueda o limpia los filtros.</p>
          </div>
        )}
      </div>

      {/* Match History Section - Notion Table Style */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Historial de Partidas
            </h2>
          </div>
          {matchHistory.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {matchHistory.length} {matchHistory.length === 1 ? "partida registrada" : "partidas registradas"}
            </span>
          )}
        </div>

        <div className="bg-card/70 border border-border/70 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Cargando historial de partidas...
            </div>
          ) : matchHistory.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 border border-border flex items-center justify-center text-muted-foreground mb-3">
                <Gamepad2 className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Aún no has jugado ninguna partida</p>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                Desafía a tus compañeros o entrena tus respuestas contra la inteligencia artificial para comenzar tu historial.
              </p>
              <Button
                size="sm"
                onClick={() => handleOpenGame("/juegos/penales", "Tanda de Penales", "penales")}
                className="text-xs font-medium flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Iniciar primera partida
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {matchHistory.map((match) => {
                const currentUid = user?.id || "guest";
                const isWinner = match.winner_id === currentUid;
                const isDraw = !match.winner_id || match.winner_id === "draw";
                const isP1 = match.player1_id === currentUid;
                const myScore = isP1 ? match.player1_score : match.player2_score;
                const theirScore = isP1 ? match.player2_score : match.player1_score;

                const gameNames: Record<string, string> = {
                  penales: "Tanda de Penales",
                  tateti: "Ta-Te-Ti Táctico",
                  bomba: "La Bomba",
                  batalla: "Batalla RPG",
                  ajedrez: "Ajedrez Clásico",
                  karts: "Carrera de Karts",
                };
                const gameTitle = gameNames[match.game_type] || match.game_type;

                return (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-muted/40 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Status Icon Chip */}
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                          isWinner
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : isDraw
                            ? "bg-muted border-border/80 text-muted-foreground"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                        )}
                        title={isWinner ? "Victoria" : isDraw ? "Empate" : "Derrota"}
                      >
                        {isWinner ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : isDraw ? (
                          <Minus className="w-3.5 h-3.5" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">
                            {gameTitle}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                              isWinner
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : isDraw
                                ? "bg-muted border-border text-muted-foreground"
                                : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                            )}
                          >
                            {isWinner ? "Victoria" : isDraw ? "Empate" : "Derrota"}
                          </span>
                          {match.is_bot_match && (
                            <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                              vs Bot
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(match.created_at).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono font-medium text-sm text-foreground">
                        {myScore} - {theirScore}
                      </span>
                      {match.xp_reward > 0 && (
                        <span className="text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                          +{match.xp_reward} XP
                        </span>
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

      {/* Auth Required Modal */}
      <GameAuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        gameTitle={selectedGameTitle}
      />

      {/* Game Mode Selection Modal */}
      <GameModeModal
        open={modeModalOpen}
        onClose={() => setModeModalOpen(false)}
        gameTitle={selectedGameTitle}
        gameType={selectedGameType}
        onSelectQuickMatch={() => {
          setModeModalOpen(false);
          navigate(`${selectedGamePath}?mode=quick`);
        }}
        onSelectBotMatch={() => {
          setModeModalOpen(false);
          navigate(`${selectedGamePath}?mode=bot`);
        }}
        onCreateRoom={async () => {
          const res = await createRoom(selectedGameType);
          return res.code;
        }}
        onJoinRoom={async (code) => {
          const res = await joinRoom(code);
          if (res.room) {
            navigate(`${selectedGamePath}?room=${code}`);
            return true;
          }
          if (res.error) toast.error(res.error);
          return false;
        }}
        onInviteFriend={async (friendId, code) => {
          await sendFriendChallenge(friendId, selectedGameType, code);
        }}
      />
    </div>
  );
}
