import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Trophy, Flag, Gauge, Medal, Users, Loader2, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ============================================================
// TYPES & CONSTANTS
// ============================================================

interface QuizDeck { id: string; nombre: string; total_questions: number; }
interface QuizQuestion { id: string; pregunta: string; explicacion: string | null; options: { id: string; texto: string; es_correcta: boolean }[]; }

interface LobbyPlayer {
  userId: string;
  displayName: string;
}

interface RaceKart {
  id: string;
  name: string;
  isBot: boolean;
  isMe: boolean;
  color: string;
  position: number;
  finished: boolean;
  finishOrder: number | null;
}

type GamePhase = "select_deck" | "lobby" | "racing" | "result";

const MAX_PLAYERS = 8;
const LOBBY_TIMEOUT = 15;
const LOBBY_CHANNEL = "kart_matchmaking_v2";

const KART_PALETTE = [
  { hex: "#22d3ee" }, // Cyan
  { hex: "#ef4444" }, // Red
  { hex: "#a855f7" }, // Purple
  { hex: "#f59e0b" }, // Amber
  { hex: "#10b981" }, // Emerald
  { hex: "#ec4899" }, // Pink
  { hex: "#6366f1" }, // Indigo
  { hex: "#84cc16" }, // Lime
];

// ============================================================
// KART SVG
// ============================================================

function KartSVG({ color, turbo, position, isPlayer }: { color: string; turbo: boolean; position: number; isPlayer: boolean }) {
  return (
    <div className="absolute transition-all duration-500 ease-out" style={{ left: `${Math.min(position, 95)}%`, bottom: "0" }}>
      {turbo && (
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex gap-0.5">
          <div className="w-4 h-1 rounded-full bg-orange-400 animate-pulse" />
          <div className="w-6 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
          <div className="w-3 h-1 rounded-full bg-red-500 animate-pulse" />
        </div>
      )}
      <svg viewBox="0 0 80 40" className="w-12 h-6 md:w-14 md:h-7 drop-shadow-lg">
        <rect x="10" y="12" width="60" height="18" rx="6" fill={color} />
        <rect x="20" y="5" width="30" height="14" rx="4" fill={color} opacity="0.85" />
        <rect x="24" y="8" width="10" height="8" rx="2" fill="#bfdbfe" opacity="0.7" />
        <rect x="36" y="8" width="10" height="8" rx="2" fill="#bfdbfe" opacity="0.7" />
        <circle cx="22" cy="34" r="6" fill="#1e293b" />
        <circle cx="22" cy="34" r="3" fill="#64748b" />
        <circle cx="58" cy="34" r="6" fill="#1e293b" />
        <circle cx="58" cy="34" r="3" fill="#64748b" />
        <rect x="55" y="15" width="8" height="3" rx="1" fill="#fbbf24" opacity="0.9" />
      </svg>
      {isPlayer && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-transparent border-t-white animate-bounce" />
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function KartRaceGame() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ---- Profile ----
  const [myDisplayName, setMyDisplayName] = useState("Jugador");

  // ---- Deck selection ----
  const [decks, setDecks] = useState<QuizDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<QuizDeck | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>("select_deck");

  // ---- Lobby ----
  const [lobbyTimer, setLobbyTimer] = useState(0);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const channelRef = useRef<any>(null);
  const lobbyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const raceStartedRef = useRef(false);

  // ---- Racing ----
  const [karts, setKarts] = useState<RaceKart[]>([]);
  const myKartIndexRef = useRef(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answeredCorrectly, setAnsweredCorrectly] = useState<boolean | null>(null);
  const [questionsUsed, setQuestionsUsed] = useState<Set<string>>(new Set());
  const [turbo, setTurbo] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const botTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const raceEndedRef = useRef(false);

  // ============================================================
  // INITIAL DATA
  // ============================================================

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("nombre, username, display_id")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setMyDisplayName(
            (data as any).nombre || (data as any).username || `Jugador #${(data as any).display_id}`
          );
        }
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("quiz_decks")
      .select("id, nombre, total_questions")
      .eq("user_id", user.id)
      .gt("total_questions", 0)
      .then(({ data }) => {
        if (data) setDecks(data as unknown as QuizDeck[]);
      });
  }, [user]);

  // ============================================================
  // QUIZ QUESTION FETCHER
  // ============================================================

  const fetchRandomQuestion = useCallback(async () => {
    if (!selectedDeck) return null;
    const { data: questions } = await supabase
      .from("quiz_questions")
      .select("id, pregunta, explicacion")
      .eq("deck_id", selectedDeck.id);
    if (!questions || questions.length === 0) return null;

    const available = questions.filter((q) => !questionsUsed.has(q.id));
    const pool = available.length > 0 ? available : questions;
    if (available.length === 0) setQuestionsUsed(new Set());

    const q = pool[Math.floor(Math.random() * pool.length)];
    const { data: options } = await supabase
      .from("quiz_options")
      .select("id, texto, es_correcta")
      .eq("question_id", q.id);

    setQuestionsUsed((prev) => new Set(prev).add(q.id));
    return {
      ...q,
      options: (options || []) as { id: string; texto: string; es_correcta: boolean }[],
    } as QuizQuestion;
  }, [selectedDeck, questionsUsed]);

  const loadNextQuestion = useCallback(async () => {
    setSelectedAnswer(null);
    setAnsweredCorrectly(null);
    const q = await fetchRandomQuestion();
    if (q) setCurrentQuestion(q);
  }, [fetchRandomQuestion]);

  // ============================================================
  // LOBBY – ENTER / LEAVE
  // ============================================================

  const enterLobby = () => {
    if (!selectedDeck || !user) return;
    raceStartedRef.current = false;
    setGamePhase("lobby");
    setLobbyTimer(0);

    const me: LobbyPlayer = { userId: user.id, displayName: myDisplayName };
    setLobbyPlayers([me]);

    const channel = supabase.channel(LOBBY_CHANNEL, {
      config: { broadcast: { self: false } },
    });

    // --- Broadcast listeners ---

    channel.on("broadcast", { event: "kart_join" }, ({ payload }) => {
      if (raceStartedRef.current) return;
      setLobbyPlayers((prev) => {
        if (prev.find((p) => p.userId === payload.userId)) return prev;
        if (prev.length >= MAX_PLAYERS) return prev;
        return [...prev, { userId: payload.userId, displayName: payload.displayName }];
      });
      // Tell the new player about myself
      channel.send({ type: "broadcast", event: "kart_present", payload: me });
    });

    channel.on("broadcast", { event: "kart_present" }, ({ payload }) => {
      if (raceStartedRef.current) return;
      setLobbyPlayers((prev) => {
        if (prev.find((p) => p.userId === payload.userId)) return prev;
        if (prev.length >= MAX_PLAYERS) return prev;
        return [...prev, { userId: payload.userId, displayName: payload.displayName }];
      });
    });

    // Position updates used during the race phase
    channel.on("broadcast", { event: "kart_pos" }, ({ payload }) => {
      setKarts((prev) =>
        prev.map((k) =>
          k.id === payload.userId
            ? { ...k, position: payload.position, finished: payload.finished, finishOrder: payload.finishOrder }
            : k
        )
      );
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: "kart_join", payload: me });
      }
    });

    channelRef.current = channel;

    // Timer 0 → 15
    lobbyTimerRef.current = setInterval(() => {
      setLobbyTimer((prev) => {
        const next = prev + 1;
        if (next >= LOBBY_TIMEOUT) clearInterval(lobbyTimerRef.current!);
        return next;
      });
    }, 1000);
  };

  const leaveLobby = () => {
    if (lobbyTimerRef.current) clearInterval(lobbyTimerRef.current);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setGamePhase("select_deck");
    setLobbyTimer(0);
    setLobbyPlayers([]);
  };

  // Auto-start when timer expires or lobby is full
  useEffect(() => {
    if (gamePhase !== "lobby" || raceStartedRef.current) return;
    if (lobbyTimer >= LOBBY_TIMEOUT || lobbyPlayers.length >= MAX_PLAYERS) {
      raceStartedRef.current = true;
      buildAndStartRace(lobbyPlayers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyTimer, lobbyPlayers.length, gamePhase]);

  // ============================================================
  // BUILD & START RACE
  // ============================================================

  const buildAndStartRace = (players: LobbyPlayer[]) => {
    if (lobbyTimerRef.current) clearInterval(lobbyTimerRef.current);
    raceEndedRef.current = false;

    // Consistent ordering across all clients
    const sorted = [...players].sort((a, b) => a.userId.localeCompare(b.userId));
    const raceKarts: RaceKart[] = [];
    let myIdx = 0;

    sorted.forEach((p, i) => {
      if (p.userId === user?.id) myIdx = i;
      raceKarts.push({
        id: p.userId,
        name: p.displayName,
        isBot: false,
        isMe: p.userId === user?.id,
        color: KART_PALETTE[i].hex,
        position: 0,
        finished: false,
        finishOrder: null,
      });
    });

    // Fill the rest with bots
    for (let i = sorted.length; i < MAX_PLAYERS; i++) {
      raceKarts.push({
        id: `bot_${i}`,
        name: `Bot ${i - sorted.length + 1}`,
        isBot: true,
        isMe: false,
        color: KART_PALETTE[i].hex,
        position: 0,
        finished: false,
        finishOrder: null,
      });
    }

    setKarts(raceKarts);
    myKartIndexRef.current = myIdx;
    setQuestionCount(0);
    setCorrectCount(0);
    setQuestionsUsed(new Set());
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setAnsweredCorrectly(null);
    setGamePhase("racing");
  };

  // Solo mode (skip lobby)
  const startSoloRace = () => {
    if (!selectedDeck || !user) return;
    raceStartedRef.current = true;
    buildAndStartRace([{ userId: user.id, displayName: myDisplayName }]);
  };

  // Load first question when race begins
  useEffect(() => {
    if (gamePhase === "racing" && !currentQuestion) {
      loadNextQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase]);

  // ============================================================
  // BOT MOVEMENT (every 1.2 s)
  // ============================================================

  useEffect(() => {
    if (gamePhase !== "racing") return;

    botTimerRef.current = setInterval(() => {
      setKarts((prev) => {
        let finishIdx = prev.filter((k) => k.finished).length;
        return prev.map((k) => {
          if (!k.isBot || k.finished) return k;
          const newPos = Math.min(k.position + 1 + Math.random() * 2.5, 100);
          if (newPos >= 100) {
            finishIdx++;
            return { ...k, position: 100, finished: true, finishOrder: finishIdx };
          }
          return { ...k, position: newPos };
        });
      });
    }, 1200);

    return () => {
      if (botTimerRef.current) clearInterval(botTimerRef.current);
    };
  }, [gamePhase]);

  // ============================================================
  // RACE END CHECK
  // ============================================================

  useEffect(() => {
    if (gamePhase !== "racing" || raceEndedRef.current) return;

    const myKart = karts[myKartIndexRef.current];
    const finishedCount = karts.filter((k) => k.finished).length;

    if (myKart?.finished || finishedCount >= MAX_PLAYERS - 1) {
      raceEndedRef.current = true;
      if (botTimerRef.current) clearInterval(botTimerRef.current);

      if (!myKart?.finished) {
        setKarts((prev) => {
          const fc = prev.filter((k) => k.finished).length;
          return prev.map((k) =>
            k.isMe ? { ...k, finished: true, finishOrder: fc + 1 } : k
          );
        });
      }

      setTimeout(() => setGamePhase("result"), 1200);
    }
  }, [karts, gamePhase]);

  // ============================================================
  // ANSWER HANDLING
  // ============================================================

  const handleAnswer = (optionId: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(optionId);
    const correct = currentQuestion?.options.find((o) => o.id === optionId)?.es_correcta || false;
    setAnsweredCorrectly(correct);
    setQuestionCount((c) => c + 1);

    if (correct) {
      setCorrectCount((c) => c + 1);
      const boost = 12 + Math.random() * 8;
      setTurbo(true);
      setTimeout(() => setTurbo(false), 600);

      setKarts((prev) => {
        const idx = myKartIndexRef.current;
        const newPos = Math.min(prev[idx].position + boost, 100);
        const isFinish = newPos >= 100;
        const finishCount = prev.filter((k) => k.finished).length;

        const next = prev.map((k, i) => {
          if (i !== idx) return k;
          return {
            ...k,
            position: newPos,
            finished: isFinish,
            finishOrder: isFinish ? finishCount + 1 : k.finishOrder,
          };
        });

        // Broadcast to online players
        channelRef.current?.send({
          type: "broadcast",
          event: "kart_pos",
          payload: {
            userId: user?.id,
            position: newPos,
            finished: isFinish,
            finishOrder: isFinish ? finishCount + 1 : null,
          },
        });

        return next;
      });
    } else {
      setKarts((prev) => {
        const idx = myKartIndexRef.current;
        const newPos = Math.max(prev[idx].position - 3, 0);
        const next = prev.map((k, i) => (i === idx ? { ...k, position: newPos } : k));

        channelRef.current?.send({
          type: "broadcast",
          event: "kart_pos",
          payload: { userId: user?.id, position: newPos, finished: false, finishOrder: null },
        });

        return next;
      });
    }

    setTimeout(() => loadNextQuestion(), 900);
  };

  // Keyboard shortcuts 1-4
  useEffect(() => {
    if (gamePhase !== "racing" || !currentQuestion || selectedAnswer) return;
    const handler = (e: KeyboardEvent) => {
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < (currentQuestion?.options.length || 0)) {
        handleAnswer(currentQuestion!.options[idx].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase, currentQuestion, selectedAnswer]);

  // ============================================================
  // CLEANUP ON UNMOUNT
  // ============================================================

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (lobbyTimerRef.current) clearInterval(lobbyTimerRef.current);
      if (botTimerRef.current) clearInterval(botTimerRef.current);
    };
  }, []);

  // ============================================================
  // RENDER: SELECT DECK
  // ============================================================

  if (gamePhase === "select_deck") {
    return (
      <div className="min-h-screen p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/juegos")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <Gauge className="w-6 h-6 text-red-500" /> Carrera de Karts
          </h1>
        </div>

        <Card className="card-gamer">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                <Gauge className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="font-display font-bold text-xl mb-2">Elegí tu mazo</h2>
              <p className="text-muted-foreground text-sm">
                Carrera de hasta 8 jugadores. Respondé rápido para ganar turbo y llegar al podio.
              </p>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {decks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No tenés mazos todavía</p>
                  <Button variant="outline" onClick={() => navigate("/cuestionarios")}>
                    Crear cuestionario
                  </Button>
                </div>
              ) : (
                decks.map((deck) => (
                  <button
                    key={deck.id}
                    onClick={() => setSelectedDeck(deck)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all duration-200",
                      selectedDeck?.id === deck.id
                        ? "border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                        : "border-border/50 bg-secondary/30 hover:bg-secondary/60"
                    )}
                  >
                    <p className="font-medium">{deck.nombre}</p>
                    <p className="text-xs text-muted-foreground">{deck.total_questions} preguntas</p>
                  </button>
                ))
              )}
            </div>

            {selectedDeck && (
              <div className="space-y-2 pt-2">
                <Button
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-lg py-6 font-display font-bold"
                  onClick={enterLobby}
                >
                  <Wifi className="w-5 h-5 mr-2" /> Buscar carrera online
                </Button>
                <Button
                  variant="outline"
                  className="w-full py-5 font-display"
                  onClick={startSoloRace}
                >
                  <WifiOff className="w-4 h-4 mr-2" /> Jugar solo vs Bots
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // RENDER: LOBBY
  // ============================================================

  if (gamePhase === "lobby") {
    const progress = (lobbyTimer / LOBBY_TIMEOUT) * 100;
    const onlineCount = lobbyPlayers.length;
    const botsNeeded = MAX_PLAYERS - onlineCount;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="card-gamer max-w-md w-full">
          <CardContent className="p-6 space-y-6">
            {/* Circular Timer */}
            <div className="text-center">
              <div className="relative w-28 h-28 mx-auto mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-secondary/40"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="url(#kartTimerGrad)"
                    strokeWidth="2.5"
                    strokeDasharray={`${progress}, 100`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="kartTimerGrad">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display font-bold text-3xl tabular-nums">{lobbyTimer}</span>
                  <span className="text-[10px] text-muted-foreground">/ {LOBBY_TIMEOUT}s</span>
                </div>
              </div>

              <h2 className="font-display font-bold text-xl mb-1">Buscando jugadores…</h2>
              <p className="text-muted-foreground text-sm">
                {onlineCount}/{MAX_PLAYERS} conectados · Empieza en{" "}
                {Math.max(0, LOBBY_TIMEOUT - lobbyTimer)}s
              </p>
            </div>

            {/* Player Slots */}
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: MAX_PLAYERS }).map((_, i) => {
                const player = lobbyPlayers[i];
                return (
                  <div
                    key={i}
                    className={cn(
                      "aspect-square rounded-xl border-2 flex flex-col items-center justify-center text-center p-1.5 transition-all duration-500",
                      player
                        ? "border-neon-green/50 bg-neon-green/10 animate-in fade-in zoom-in-95"
                        : "border-border/30 bg-secondary/20 border-dashed"
                    )}
                  >
                    {player ? (
                      <>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center mb-0.5"
                          style={{ backgroundColor: KART_PALETTE[i].hex + "30" }}
                        >
                          <svg viewBox="0 0 80 40" className="w-6 h-3">
                            <rect x="10" y="12" width="60" height="18" rx="6" fill={KART_PALETTE[i].hex} />
                            <circle cx="22" cy="34" r="5" fill="#1e293b" />
                            <circle cx="58" cy="34" r="5" fill="#1e293b" />
                          </svg>
                        </div>
                        <span className="text-[9px] font-medium truncate w-full leading-tight">
                          {player.displayName}
                        </span>
                        {player.userId === user?.id && (
                          <span className="text-[8px] text-neon-cyan font-bold">(Tú)</span>
                        )}
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-4 h-4 text-muted-foreground/30 animate-spin" />
                        <span className="text-[8px] text-muted-foreground/40 mt-0.5">
                          Esperando
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {onlineCount >= 2
                  ? `${onlineCount} jugadores online · ${botsNeeded > 0 ? `${botsNeeded} bots completarán` : "¡Lobby completo!"}`
                  : "Si no se encuentran rivales, jugarás contra bots"}
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={leaveLobby}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Cancelar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // RENDER: RACING
  // ============================================================

  if (gamePhase === "racing") {
    const onlinePlayerCount = karts.filter((k) => !k.isBot).length;
    const botCount = karts.filter((k) => k.isBot).length;

    return (
      <div className="min-h-screen p-3 md:p-6 space-y-3 max-w-2xl mx-auto">
        {/* Race Track */}
        <Card className="card-gamer overflow-hidden">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="text-xs">
                <Flag className="w-3 h-3 mr-1" /> Copa TABE ({onlinePlayerCount}{" "}
                {onlinePlayerCount === 1 ? "jugador" : "online"} + {botCount} bots)
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Pregunta #{questionCount + 1}
              </Badge>
            </div>

            {/* 8-lane track */}
            <div className="space-y-0.5">
              {karts.map((kart) => (
                <div
                  key={kart.id}
                  className={cn(
                    "relative h-8 md:h-9 rounded-lg border overflow-hidden transition-all",
                    kart.isMe
                      ? "bg-gradient-to-r from-slate-800 to-slate-700 border-cyan-500/40"
                      : "bg-gradient-to-r from-slate-800/80 to-slate-700/80 border-slate-600/60"
                  )}
                >
                  {/* Road markings */}
                  <div className="absolute inset-0 flex items-center">
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className="h-[1px] w-3 bg-yellow-500/25 mx-1.5" />
                    ))}
                  </div>
                  {/* Finish flag */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px]">🏁</div>
                  {/* Kart */}
                  <KartSVG
                    color={kart.color}
                    turbo={kart.isMe ? turbo : false}
                    position={kart.position}
                    isPlayer={kart.isMe}
                  />
                  {/* Label */}
                  <div
                    className={cn(
                      "absolute left-1 top-0 text-[7px] md:text-[8px] font-bold drop-shadow-md leading-tight",
                      kart.isMe
                        ? "text-cyan-400"
                        : kart.isBot
                        ? "text-slate-500"
                        : "text-orange-300"
                    )}
                  >
                    {kart.isMe ? "TÚ" : kart.name}
                    {kart.isBot && " 🤖"}
                    {kart.finished && kart.finishOrder && ` (#${kart.finishOrder})`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Question */}
        {currentQuestion && (
          <Card className="card-gamer">
            <CardContent className="p-4 md:p-5 space-y-3">
              <h3 className="font-medium text-base md:text-lg leading-snug">
                {currentQuestion.pregunta}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = selectedAnswer === option.id;
                  const showCorrect = selectedAnswer !== null && option.es_correcta;
                  const showWrong = isSelected && !option.es_correcta;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleAnswer(option.id)}
                      disabled={!!selectedAnswer}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all duration-300 flex items-start gap-2",
                        !selectedAnswer && "hover:bg-secondary/60 hover:border-red-500/30 cursor-pointer",
                        selectedAnswer && "cursor-default",
                        showCorrect && "border-neon-green bg-neon-green/10",
                        showWrong && "border-destructive bg-destructive/10",
                        !showCorrect && !showWrong && selectedAnswer && "opacity-50",
                        !selectedAnswer && "border-border/50 bg-secondary/30"
                      )}
                    >
                      <span className="text-xs font-bold text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-medium">{option.texto}</p>
                    </button>
                  );
                })}
              </div>
              {answeredCorrectly !== null && (
                <div
                  className={cn(
                    "text-center text-sm font-medium py-1",
                    answeredCorrectly ? "text-neon-green" : "text-destructive"
                  )}
                >
                  {answeredCorrectly
                    ? "🚀 ¡Turbo! +velocidad"
                    : "💥 Respuesta incorrecta, retrocedés"}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ============================================================
  // RENDER: RESULT
  // ============================================================

  const sortedKarts = [...karts].sort((a, b) => {
    if (a.finishOrder && b.finishOrder) return a.finishOrder - b.finishOrder;
    if (a.finishOrder) return -1;
    if (b.finishOrder) return 1;
    return b.position - a.position;
  });

  const myKart = karts.find((k) => k.isMe);
  const playerPosition = myKart?.finishOrder || sortedKarts.findIndex((k) => k.isMe) + 1;
  const isPodium = playerPosition <= 3;

  let xpEarned = 20;
  if (playerPosition === 1) xpEarned = 150;
  else if (playerPosition === 2) xpEarned = 80;
  else if (playerPosition === 3) xpEarned = 40;

  const medalEmoji = playerPosition === 1 ? "🥇" : playerPosition === 2 ? "🥈" : playerPosition === 3 ? "🥉" : "";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="card-gamer max-w-md w-full overflow-hidden">
        <div
          className={cn(
            "p-8 text-center",
            playerPosition === 1
              ? "bg-gradient-to-br from-neon-gold/20 to-red-500/10"
              : isPodium
              ? "bg-gradient-to-br from-slate-300/20 to-secondary"
              : "bg-gradient-to-br from-destructive/20 to-secondary"
          )}
        >
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-background/30 flex items-center justify-center">
            {playerPosition === 1 ? (
              <Trophy className="w-12 h-12 text-neon-gold" />
            ) : isPodium ? (
              <Medal className="w-12 h-12 text-slate-300" />
            ) : (
              <Gauge className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
          <h2 className="font-display font-bold text-3xl mb-2">
            {medalEmoji} {playerPosition}º Lugar
          </h2>
          <p className="text-muted-foreground">
            {correctCount}/{questionCount} respuestas correctas
          </p>

          {/* Podium table */}
          <div className="mt-4 text-left bg-background/50 rounded-xl p-3 space-y-1 border border-border/50 max-h-52 overflow-y-auto">
            {sortedKarts.map((kart, i) => (
              <div
                key={kart.id}
                className={cn(
                  "flex justify-between items-center px-2 py-1.5 rounded text-sm transition-all",
                  kart.isMe && "bg-white/10 font-bold"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs font-bold text-muted-foreground">
                    #{i + 1}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: kart.color }}
                  />
                  <span className="truncate max-w-[120px]">{kart.name}</span>
                  {kart.isBot && (
                    <span className="text-[10px] text-muted-foreground">🤖</span>
                  )}
                  {!kart.isBot && !kart.isMe && (
                    <span className="text-[10px] text-orange-400">🌐</span>
                  )}
                </div>
                {kart.isMe && (
                  <span className="text-xs text-neon-cyan font-bold">(Tú)</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-neon-gold/10 border border-neon-gold/20">
            <Zap className="w-5 h-5 text-neon-gold" />
            <span className="font-display font-bold text-neon-gold">+{xpEarned} XP</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/juegos")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-red-500 to-orange-500"
              onClick={() => {
                if (channelRef.current) {
                  supabase.removeChannel(channelRef.current);
                  channelRef.current = null;
                }
                if (botTimerRef.current) clearInterval(botTimerRef.current);
                raceStartedRef.current = false;
                raceEndedRef.current = false;
                setGamePhase("select_deck");
              }}
            >
              Otra carrera
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
