import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Trophy, Grid3X3, X, Circle, Gamepad2, Loader2, Bot, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useGames } from "@/hooks/useGames";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { supabase } from "@/integrations/supabase/client";
import { CareerSelectModal } from "@/components/games/CareerSelectModal";
import { cn } from "@/lib/utils";

interface QuizDeck { id: string; nombre: string; total_questions: number; }
interface QuizQuestion { id: string; pregunta: string; explicacion: string | null; options: { id: string; texto: string; es_correcta: boolean }[]; }
type GamePhase = "select_deck" | "searching" | "playing" | "result";
type CellValue = "X" | "O" | null;

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6]          // diags
];

function checkWin(board: CellValue[]): { winner: CellValue; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a,b,c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every(c => c !== null)) return { winner: null, line: null }; // draw
  return { winner: null, line: null };
}

export default function TicTacToeGame() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userCarrera, submitCareerRequest, updateUserCarrera } = useGames();
  const { status, matchId, opponentName, timeLeft, joinQueue, leaveQueue, setStatus, setMatchId } = useMatchmaking();

  // Career modal
  const [showCareerModal, setShowCareerModal] = useState(false);

  const [decks, setDecks] = useState<QuizDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<QuizDeck | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>("select_deck");

  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [pendingCell, setPendingCell] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answeredCorrectly, setAnsweredCorrectly] = useState<boolean | null>(null);
  const [questionsUsed, setQuestionsUsed] = useState<Set<string>>(new Set());
  const [winner, setWinner] = useState<"player" | "bot" | "draw" | null>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);

  // Online state
  const [isOnline, setIsOnline] = useState(false);
  const [mySymbol, setMySymbol] = useState<"X" | "O">("X");
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("quiz_decks").select("id, nombre, total_questions").eq("user_id", user.id).gt("total_questions", 0)
      .then(({ data }) => { if (data) setDecks(data as unknown as QuizDeck[]); });
  }, [user]);

  // Handle matchmaking status changes
  useEffect(() => {
    if (status === 'found') {
      setIsOnline(true);
      setupOnlineMatch();
    } else if (status === 'bot') {
      setIsOnline(false);
      startGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const setupOnlineMatch = async () => {
    if (!matchId || !user) return;
    // Determine who is X (player1 = X)
    const { data } = await supabase.from("game_matches" as any).select("player1_id").eq("id", matchId).single();
    const amPlayer1 = data && (data as any).player1_id === user.id;
    setMySymbol(amPlayer1 ? "X" : "O");
    setIsPlayerTurn(amPlayer1); // X goes first

    // Setup broadcast channel
    const channel = supabase.channel(`tictactoe_match_${matchId}`, {
      config: { broadcast: { self: false } }
    });

    channel.on("broadcast", { event: "ttt_move" }, ({ payload }) => {
      setBoard(payload.board);
      setIsPlayerTurn(payload.nextTurn === (amPlayer1 ? "X" : "O"));
      if (payload.lastMove !== undefined) {
        // Check win
        const result = checkWin(payload.board);
        if (result.winner) {
          setWinLine(result.line);
          const iWin = result.winner === (amPlayer1 ? "X" : "O");
          setWinner(iWin ? "player" : "bot");
          setTimeout(() => setGamePhase("result"), 1200);
        } else if (payload.board.every((c: CellValue) => c !== null)) {
          setWinner("draw");
          setTimeout(() => setGamePhase("result"), 1200);
        }
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    // Start game
    setGamePhase("playing");
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinLine(null);
    setPendingCell(null);
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setAnsweredCorrectly(null);
    setQuestionsUsed(new Set());
  };

  // Cleanup channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const fetchRandomQuestion = useCallback(async () => {
    if (!selectedDeck) return null;
    const { data: questions } = await supabase.from("quiz_questions").select("id, pregunta, explicacion").eq("deck_id", selectedDeck.id);
    if (!questions || questions.length === 0) return null;
    const available = questions.filter((q) => !questionsUsed.has(q.id));
    const pool = available.length > 0 ? available : questions;
    if (available.length === 0) setQuestionsUsed(new Set());
    const q = pool[Math.floor(Math.random() * pool.length)];
    const { data: options } = await supabase.from("quiz_options").select("id, texto, es_correcta").eq("question_id", q.id);
    setQuestionsUsed((prev) => new Set(prev).add(q.id));
    return { ...q, options: (options || []) as { id: string; texto: string; es_correcta: boolean }[] } as QuizQuestion;
  }, [selectedDeck, questionsUsed]);

  const startGame = () => {
    if (!selectedDeck) return;
    setGamePhase("playing");
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinLine(null);
    setIsPlayerTurn(true);
    setPendingCell(null);
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setAnsweredCorrectly(null);
    setQuestionsUsed(new Set());
    setMySymbol("X");
  };

  // Start searching
  const handleStartSearch = () => {
    if (!selectedDeck) return;
    if (!userCarrera) {
      setShowCareerModal(true);
      return;
    }
    setGamePhase('searching');
    joinQueue(selectedDeck.id, selectedDeck.nombre, userCarrera);
  };

  const handleCareerSelected = async (carrera: string, facultad: string) => {
    await updateUserCarrera(carrera, facultad);
    setShowCareerModal(false);
    if (selectedDeck) {
      setGamePhase('searching');
      joinQueue(selectedDeck.id, selectedDeck.nombre, carrera);
    }
  };

  const handleCancelSearch = () => {
    leaveQueue();
    setGamePhase('select_deck');
  };

  const handleCellClick = async (idx: number) => {
    if (board[idx] || !isPlayerTurn || pendingCell !== null || winner) return;
    setPendingCell(idx);
    const q = await fetchRandomQuestion();
    if (q) setCurrentQuestion(q);
  };

  const handleAnswer = (optionId: string) => {
    if (selectedAnswer || pendingCell === null) return;
    setSelectedAnswer(optionId);
    const correct = currentQuestion?.options.find((o) => o.id === optionId)?.es_correcta || false;
    setAnsweredCorrectly(correct);

    setTimeout(() => {
      const newBoard = [...board];

      if (correct) {
        newBoard[pendingCell!] = mySymbol;
      }

      setBoard(newBoard);
      setPendingCell(null);
      setSelectedAnswer(null);
      setAnsweredCorrectly(null);
      setCurrentQuestion(null);

      // Check win
      const result = checkWin(newBoard);
      if (result.winner === mySymbol) {
        setWinner("player");
        setWinLine(result.line);
        if (isOnline && channelRef.current) {
          channelRef.current.send({ type: "broadcast", event: "ttt_move", payload: { board: newBoard, nextTurn: mySymbol === "X" ? "O" : "X", lastMove: pendingCell } });
        }
        setTimeout(() => setGamePhase("result"), 1200);
        return;
      }
      if (newBoard.every(c => c !== null)) {
        setWinner("draw");
        if (isOnline && channelRef.current) {
          channelRef.current.send({ type: "broadcast", event: "ttt_move", payload: { board: newBoard, nextTurn: mySymbol === "X" ? "O" : "X", lastMove: pendingCell } });
        }
        setTimeout(() => setGamePhase("result"), 1200);
        return;
      }

      if (isOnline) {
        // Send move to opponent
        channelRef.current?.send({
          type: "broadcast",
          event: "ttt_move",
          payload: { board: newBoard, nextTurn: mySymbol === "X" ? "O" : "X", lastMove: pendingCell }
        });
        setIsPlayerTurn(false);
      } else {
        // Bot turn
        setIsPlayerTurn(false);
        setTimeout(() => {
          const emptyCells = newBoard.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
          if (emptyCells.length === 0) return;

          // Simple AI: try to win, block, or random
          let botMove = -1;
          for (const cell of emptyCells) {
            const test = [...newBoard]; test[cell] = "O";
            if (checkWin(test).winner === "O") { botMove = cell; break; }
          }
          if (botMove === -1) {
            for (const cell of emptyCells) {
              const test = [...newBoard]; test[cell] = "X";
              if (checkWin(test).winner === "X") { botMove = cell; break; }
            }
          }
          if (botMove === -1 && newBoard[4] === null) botMove = 4;
          if (botMove === -1) botMove = emptyCells[Math.floor(Math.random() * emptyCells.length)];

          const botBoard = [...newBoard];
          botBoard[botMove] = "O";
          setBoard(botBoard);

          const botResult = checkWin(botBoard);
          if (botResult.winner === "O") {
            setWinner("bot");
            setWinLine(botResult.line);
            setTimeout(() => setGamePhase("result"), 1200);
            return;
          }
          if (botBoard.every(c => c !== null)) {
            setWinner("draw");
            setTimeout(() => setGamePhase("result"), 1200);
            return;
          }

          setIsPlayerTurn(true);
        }, 800);
      }
    }, 800);
  };

  const handlePlayAgain = () => {
    setGamePhase("select_deck");
    setWinner(null);
    setIsOnline(false);
    setStatus('idle');
    setMatchId(null);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  // Keyboard: numpad 1-9
  useEffect(() => {
    if (gamePhase !== "playing" || !isPlayerTurn || pendingCell !== null) return;
    const handler = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        const map: Record<number, number> = { 7:0,8:1,9:2,4:3,5:4,6:5,1:6,2:7,3:8 };
        const idx = map[num];
        if (idx !== undefined && !board[idx]) handleCellClick(idx);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gamePhase, isPlayerTurn, pendingCell, board]);

  if (gamePhase === "select_deck") {
    return (
      <div className="min-h-screen p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/juegos")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <Grid3X3 className="w-6 h-6 text-emerald-500" /> Ta-Te-Ti Táctico
          </h1>
        </div>
        <Card className="card-gamer">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <Grid3X3 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="font-display font-bold text-xl mb-2">Elegí tu mazo</h2>
              <p className="text-muted-foreground text-sm">
                Respondé correctamente para colocar tu ficha. ¡El primero en hacer 3 en línea gana!
              </p>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {decks.map((deck) => (
                <button key={deck.id} onClick={() => setSelectedDeck(deck)} className={cn("w-full text-left p-4 rounded-xl border transition-all", selectedDeck?.id === deck.id ? "border-emerald-500 bg-emerald-500/10" : "border-border/50 bg-secondary/30 hover:bg-secondary/60")}>
                  <p className="font-medium">{deck.nombre}</p>
                  <p className="text-xs text-muted-foreground">{deck.total_questions} preguntas</p>
                </button>
              ))}
            </div>
            {selectedDeck && (
              <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-lg py-6 font-display font-bold" onClick={handleStartSearch}>
                <Gamepad2 className="w-5 h-5 mr-2" /> ¡Buscar Rival!
              </Button>
            )}
          </CardContent>
        </Card>

        <CareerSelectModal
          open={showCareerModal}
          onClose={() => setShowCareerModal(false)}
          onCareerSelected={handleCareerSelected}
          onRequestCareer={submitCareerRequest}
        />
      </div>
    );
  }

  // SEARCHING PHASE
  if (gamePhase === 'searching') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="card-gamer max-w-md w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="relative mx-auto w-32 h-32">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
              <div className="absolute inset-4 rounded-full border-2 border-teal-500/30 animate-ping" style={{ animationDelay: '0.5s' }} />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
              </div>
            </div>
            <div>
              <h2 className="font-display font-bold text-xl mb-2">Buscando rival...</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Emparejando con alguien de tu carrera
              </p>
            </div>
            <div className="relative w-20 h-20 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#ttt-gradient)" strokeWidth="2" strokeDasharray={`${(timeLeft / 15) * 100}, 100`} strokeLinecap="round" />
                <defs>
                  <linearGradient id="ttt-gradient">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display font-bold text-2xl">{timeLeft}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {timeLeft <= 5 ? "Si no se encuentra rival, jugarás contra el Bot 🤖" : "Buscando en tu carrera..."}
            </p>
            <Button variant="outline" onClick={handleCancelSearch}>Cancelar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gamePhase === "playing") {
    return (
      <div className="min-h-screen p-4 md:p-6 space-y-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/juegos")}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <Users className="w-3 h-3 mr-1" /> vs {opponentName || "Rival"}
              </Badge>
            ) : (
              <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                <Bot className="w-3 h-3 mr-1" /> vs Bot
              </Badge>
            )}
          </div>
          <Badge className={cn("text-sm px-4 py-1.5", isPlayerTurn ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-purple-500/20 text-purple-400 border-purple-500/30")}>
            {pendingCell !== null ? "📝 Respondé la pregunta" : isPlayerTurn ? `Tu turno (${mySymbol})` : `Turno del ${isOnline ? 'rival' : 'Bot'} (${mySymbol === 'X' ? 'O' : 'X'})`}
          </Badge>
        </div>

        {/* Board */}
        <Card className="card-gamer">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-2 max-w-[300px] mx-auto">
              {board.map((cell, idx) => {
                const isInWinLine = winLine?.includes(idx);
                const isPending = pendingCell === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleCellClick(idx)}
                    disabled={!!cell || !isPlayerTurn || pendingCell !== null || !!winner}
                    className={cn(
                      "aspect-square rounded-xl border-2 flex items-center justify-center transition-all duration-300 text-4xl font-bold",
                      !cell && isPlayerTurn && !pendingCell && !winner && "hover:bg-cyan-500/10 hover:border-cyan-500/30 cursor-pointer",
                      cell && "cursor-default",
                      isPending && "border-yellow-500 bg-yellow-500/10 animate-pulse",
                      isInWinLine && "border-neon-green bg-neon-green/20 scale-105",
                      !isPending && !isInWinLine && "border-border/50 bg-secondary/20"
                    )}
                  >
                    {cell === "X" && <X className={cn("w-10 h-10 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]", isInWinLine && "animate-bounce")} strokeWidth={3} />}
                    {cell === "O" && <Circle className={cn("w-10 h-10 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]", isInWinLine && "animate-bounce")} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Question overlay */}
        {currentQuestion && pendingCell !== null && (
          <Card className="card-gamer">
            <CardContent className="p-5 space-y-3">
              <Badge variant="secondary" className="text-xs">Respondé para colocar tu {mySymbol} en la casilla</Badge>
              <h3 className="font-medium text-base leading-snug">{currentQuestion.pregunta}</h3>
              <div className="space-y-2">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedAnswer === option.id;
                  const showCorrect = selectedAnswer !== null && option.es_correcta;
                  const showWrong = isSelected && !option.es_correcta;
                  return (
                    <button key={option.id} onClick={() => handleAnswer(option.id)} disabled={!!selectedAnswer}
                      className={cn("w-full text-left p-3 rounded-xl border transition-all duration-300",
                        !selectedAnswer && "hover:bg-secondary/60 cursor-pointer",
                        showCorrect && "border-neon-green bg-neon-green/10",
                        showWrong && "border-destructive bg-destructive/10",
                        !showCorrect && !showWrong && selectedAnswer && "opacity-50",
                        !selectedAnswer && "border-border/50 bg-secondary/30"
                      )}>
                      <p className="text-sm font-medium">{option.texto}</p>
                    </button>
                  );
                })}
              </div>
              {answeredCorrectly === false && (
                <p className="text-center text-sm text-destructive font-medium">❌ Incorrecto. Perdiste tu turno</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Result
  const isWin = winner === "player";
  const isDraw = winner === "draw";
  const xpEarned = isWin ? 100 : isDraw ? 50 : 20;
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="card-gamer max-w-md w-full overflow-hidden">
        <div className={cn("p-8 text-center", isWin ? "bg-gradient-to-br from-neon-gold/20 to-emerald-500/10" : isDraw ? "bg-gradient-to-br from-secondary to-secondary/50" : "bg-gradient-to-br from-destructive/20 to-secondary")}>
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-background/30 flex items-center justify-center">
            {isWin ? <Trophy className="w-12 h-12 text-neon-gold" /> : isDraw ? <Grid3X3 className="w-12 h-12 text-muted-foreground" /> : <X className="w-12 h-12 text-destructive" />}
          </div>
          <h2 className="font-display font-bold text-3xl mb-2">{isWin ? "¡Victoria!" : isDraw ? "Empate" : "Derrota"}</h2>
          {isOnline && (
            <p className="text-sm text-muted-foreground">vs {opponentName || "Rival online"}</p>
          )}
        </div>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-neon-gold/10 border border-neon-gold/20">
            <Zap className="w-5 h-5 text-neon-gold" />
            <span className="font-display font-bold text-neon-gold">+{xpEarned} XP</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/juegos")}><ArrowLeft className="w-4 h-4 mr-2" /> Volver</Button>
            <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500" onClick={handlePlayAgain}>
              Otra partida
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
