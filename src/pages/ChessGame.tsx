import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Trophy, Crown, RotateCcw, Swords, Bot, BookOpen, Clock, Palette, ChevronRight, Shield, Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Chess } from "chess.js";
import type { Square, Move, PieceSymbol, Color } from "chess.js";
import { ChessThemeDefs, renderThemedPiece } from "@/components/games/ChessAssets";
import ChessBoardPremium from "@/components/games/ChessBoardPremium";
import { CHESS_THEMES, getThemeById, getSavedTheme, saveTheme } from "@/components/games/ChessThemes";
import type { ChessTheme } from "@/components/games/ChessThemes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// ======================================
// ELO SYSTEM (Local Storage)
// ======================================
const getLocalElo = () => {
  const e = localStorage.getItem("tabe_chess_elo");
  return e ? parseInt(e) : 1200;
};
const saveLocalElo = (elo: number) => {
  localStorage.setItem("tabe_chess_elo", elo.toString());
};

// ======================================
// TYPES
// ======================================
interface QuizDeck { id: string; nombre: string; total_questions: number; }
interface QuizQuestion { id: string; pregunta: string; explicacion: string | null; options: { id: string; texto: string; es_correcta: boolean }[]; }

// ======================================
// BOT ENGINE (uses chess.js instance)
// ======================================
function evaluateBoard(game: Chess): number {
  const values: Record<PieceSymbol, number> = { p: 10, n: 30, b: 32, r: 50, q: 90, k: 900 };
  let score = 0;
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        const val = values[p.type];
        // Positional bonus: center control
        const posBonus = (p.type === "p" || p.type === "n")
          ? (Math.abs(3.5 - r) + Math.abs(3.5 - c)) * -1
          : 0;
        const total = val + posBonus;
        score += (p.color === "b" ? 1 : -1) * total;
      }
    }
  }
  return score;
}

function minimax(game: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
  if (depth === 0 || game.isGameOver()) {
    if (game.isCheckmate()) return isMaximizing ? -9999 : 9999;
    if (game.isDraw() || game.isStalemate()) return 0;
    return evaluateBoard(game);
  }

  const moves = game.moves({ verbose: true });
  // Order captures first for better pruning
  moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      game.move(m);
      const ev = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const m of moves) {
      game.move(m);
      const ev = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBotMove(game: Chess, level: number): Move | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Level 1: Random
  if (level === 1) return moves[Math.floor(Math.random() * moves.length)];

  // Level 2: Prefer captures
  if (level === 2) {
    const captures = moves.filter(m => m.captured);
    if (captures.length > 0 && Math.random() > 0.3) {
      return captures[Math.floor(Math.random() * captures.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Levels 3-5: Minimax with increasing depth
  const depthMap: Record<number, number> = { 3: 2, 4: 3, 5: 4 };
  const depth = depthMap[level] || 2;
  let bestScore = -Infinity;
  let bestMoves: Move[] = [];

  // Shuffle for variety
  const shuffled = [...moves].sort(() => Math.random() - 0.5);

  for (const m of shuffled) {
    game.move(m);
    const score = minimax(game, depth - 1, -Infinity, Infinity, false);
    game.undo();
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [m];
    } else if (score === bestScore) {
      bestMoves.push(m);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// ======================================
// COMPONENT
// ======================================
export default function ChessGame() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Decks
  const [decks, setDecks] = useState<QuizDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<QuizDeck | null>(null);

  // Game config
  const [phase, setPhase] = useState<"menu" | "playing">("menu");
  const [level, setLevel] = useState<number>(3);
  const [myElo, setMyElo] = useState<number>(1200);
  const [themeId, setThemeId] = useState<string>(getSavedTheme());
  const theme: ChessTheme = useMemo(() => getThemeById(themeId), [themeId]);

  // Chess.js instance
  const gameRef = useRef<Chess>(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [gameOver, setGameOver] = useState<"checkmate_w" | "checkmate_b" | "stalemate" | "draw" | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [eloDelta, setEloDelta] = useState<number | null>(null);
  const [capturedWhite, setCapturedWhite] = useState<{ type: PieceSymbol; color: Color }[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<{ type: PieceSymbol; color: Color }[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  // Study interruptions
  const [questionsUsed, setQuestionsUsed] = useState<Set<string>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<QuizQuestion | null>(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(5);
  const [questionResult, setQuestionResult] = useState<"correct" | "wrong" | "timeout" | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setMyElo(getLocalElo()); }, []);

  // Fetch Decks
  useEffect(() => {
    if (!user) return;
    supabase.from("quiz_decks").select("id, nombre, total_questions").eq("user_id", user.id).gt("total_questions", 0)
      .then(({ data }) => { if (data) setDecks(data as unknown as QuizDeck[]); });
  }, [user]);

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

  // ---- Game lifecycle ----
  const syncState = useCallback(() => {
    setFen(gameRef.current.fen());
  }, []);

  const startGame = () => {
    if (!selectedDeck) return;
    gameRef.current = new Chess();
    syncState();
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setGameOver(null);
    setMoveCount(0);
    setEloDelta(null);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setMoveHistory([]);
    setQuestionsUsed(new Set());
    setActiveQuestion(null);
    setQuestionResult(null);
    saveTheme(themeId);
    setPhase("playing");
  };

  const checkGameEnd = useCallback(() => {
    const g = gameRef.current;
    if (g.isCheckmate()) {
      setGameOver(g.turn() === "b" ? "checkmate_w" : "checkmate_b");
      return true;
    }
    if (g.isStalemate()) { setGameOver("stalemate"); return true; }
    if (g.isDraw() || g.isThreefoldRepetition() || g.isInsufficientMaterial()) {
      setGameOver("draw"); return true;
    }
    return false;
  }, []);

  // ---- Question interruptions ----
  const triggerRandomQuestion = async () => {
    const q = await fetchRandomQuestion();
    if (q) {
      setActiveQuestion(q);
      setQuestionTimeLeft(5);
      setQuestionResult(null);
      questionTimerRef.current = setInterval(() => {
        setQuestionTimeLeft((prev) => {
          if (prev <= 1) { handleQuestionTimeout(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const clearQuestionTimer = () => {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
  };

  const handleQuestionTimeout = () => {
    clearQuestionTimer();
    setQuestionResult("timeout");
    setTimeout(() => {
      setActiveQuestion(null);
      // Penalty: Bot gets a free move
      doBotMove();
    }, 2000);
  };

  const answerQuestion = (optionId: string) => {
    clearQuestionTimer();
    const correct = activeQuestion?.options.find((o) => o.id === optionId)?.es_correcta || false;
    setQuestionResult(correct ? "correct" : "wrong");
    setTimeout(() => {
      setActiveQuestion(null);
      if (!correct) {
        // Penalty: Bot gets a free move
        doBotMove();
      }
      // If correct, player keeps their turn
    }, 2000);
  };

  useEffect(() => { return () => clearQuestionTimer(); }, []);

  // ---- Square interaction ----
  const handleSquareClick = useCallback((square: Square) => {
    if (gameOver || gameRef.current.turn() !== "w" || activeQuestion) return;
    const g = gameRef.current;

    if (selectedSquare) {
      // Try making the move
      const moveResult = g.move({ from: selectedSquare, to: square, promotion: "q" });
      if (moveResult) {
        if (moveResult.captured) {
          setCapturedBlack((prev) => [...prev, { type: moveResult.captured as PieceSymbol, color: "b" }]);
        }
        setLastMove({ from: moveResult.from as Square, to: moveResult.to as Square });
        setMoveCount((c) => c + 1);
        setMoveHistory((h) => [...h, moveResult.san]);
        syncState();
        setSelectedSquare(null);
        setLegalMoves([]);

        if (checkGameEnd()) return;

        // Schedule bot move
        setTimeout(() => doBotMove(), level > 3 ? 200 : 500);
        return;
      }
      // If invalid, check if clicked own piece to reselect
      const piece = g.get(square);
      if (piece && piece.color === "w") {
        setSelectedSquare(square);
        setLegalMoves(g.moves({ square, verbose: true }).map((m) => m.to as Square));
        return;
      }
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // First click: select own piece
    const piece = g.get(square);
    if (piece && piece.color === "w") {
      setSelectedSquare(square);
      setLegalMoves(g.moves({ square, verbose: true }).map((m) => m.to as Square));
    }
  }, [selectedSquare, gameOver, activeQuestion, syncState, checkGameEnd, level]);

  // ---- Bot move ----
  const doBotMove = useCallback(() => {
    const g = gameRef.current;
    if (g.isGameOver() || g.turn() !== "b") return;

    const move = getBotMove(g, level);
    if (!move) return;

    const result = g.move(move);
    if (!result) return;

    if (result.captured) {
      setCapturedWhite((prev) => [...prev, { type: result.captured as PieceSymbol, color: "w" }]);
    }
    setLastMove({ from: result.from as Square, to: result.to as Square });
    setMoveCount((c) => c + 1);
    setMoveHistory((h) => [...h, result.san]);
    syncState();

    if (checkGameEnd()) return;

    // 15% chance to trigger a study question before player's turn
    if (Math.random() < 0.15) {
      triggerRandomQuestion();
    }
  }, [level, syncState, checkGameEnd]);

  // ---- ELO calculation ----
  useEffect(() => {
    if (gameOver && eloDelta === null) {
      const botElo = 800 + (level * 200);
      const expectedScore = 1 / (1 + Math.pow(10, (botElo - myElo) / 400));
      const actualScore = gameOver === "checkmate_w" ? 1 : gameOver === "stalemate" || gameOver === "draw" ? 0.5 : 0;
      const kFactor = 32;
      const change = Math.round(kFactor * (actualScore - expectedScore));
      setEloDelta(change);
      const newElo = Math.max(100, myElo + change);
      setMyElo(newElo);
      saveLocalElo(newElo);
    }
  }, [gameOver, eloDelta, level, myElo]);

  // ---- Derive board pieces from FEN ----
  const boardPieces = useMemo(() => {
    const g = gameRef.current;
    const result: { square: Square; type: PieceSymbol; color: Color }[] = [];
    const board = g.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          result.push({ square: p.square as Square, type: p.type, color: p.color });
        }
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);

  const isWhiteTurn = gameRef.current.turn() === "w";
  const inCheck = gameRef.current.isCheck();
  const checkSquare = inCheck
    ? (boardPieces.find((p) => p.type === "k" && p.color === gameRef.current.turn())?.square || null)
    : null;

  // ========================
  // MENU PHASE
  // ========================
  if (phase === "menu") {
    return (
      <div className="min-h-screen p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden">
        <ChessThemeDefs theme={theme} />

        {/* Background glow */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none flex items-center justify-center">
          <div
            className="w-[800px] h-[800px]"
            style={{
              background: `radial-gradient(ellipse at center, ${theme.board.borderColor} 0%, transparent 70%)`,
            }}
          />
        </div>

        <div className="z-10 text-center space-y-2 mb-6">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={() => navigate("/juegos")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div
            className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center backdrop-blur-xl border"
            style={{
              background: `linear-gradient(135deg, ${theme.board.borderColor}, rgba(168,85,247,0.2))`,
              borderColor: theme.board.borderColor,
            }}
          >
            <Crown className="w-10 h-10" style={{ color: theme.pieces.white.stroke }} />
          </div>
          <h1
            className="text-3xl md:text-5xl font-display font-bold bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(to right, ${theme.pieces.white.stroke}, ${theme.pieces.black.accent})`,
            }}
          >
            Ajedrez Académico
          </h1>
          <Badge variant="outline" className="text-sm px-4 py-1" style={{ color: theme.pieces.white.stroke, borderColor: theme.board.borderColor }}>
            ELO Actual: <strong className="ml-2 text-white">{myElo}</strong>
          </Badge>
        </div>

        <div className="w-full max-w-xl z-10 space-y-4">
          {/* Theme Selector */}
          <Card className="card-gamer" style={{ borderColor: theme.board.borderColor }}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-5 h-5" style={{ color: theme.pieces.white.stroke }} />
                <h2 className="text-lg font-bold font-display">Elegí tu estilo</h2>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {CHESS_THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setThemeId(t.id); saveTheme(t.id); }}
                    className={cn(
                      "rounded-xl p-1.5 border-2 transition-all duration-300 group",
                      themeId === t.id
                        ? "scale-105 shadow-lg"
                        : "border-border/30 hover:border-border/60 opacity-70 hover:opacity-100"
                    )}
                    style={themeId === t.id ? { borderColor: t.preview.accent, boxShadow: `0 0 20px ${t.preview.accent}40` } : {}}
                    title={t.name}
                  >
                    {/* Mini board preview */}
                    <div className="grid grid-cols-4 rounded-lg overflow-hidden aspect-square">
                      {Array.from({ length: 16 }).map((_, i) => {
                        const r = Math.floor(i / 4);
                        const c = i % 4;
                        const isDark = (r + c) % 2 === 1;
                        return (
                          <div
                            key={i}
                            style={{ backgroundColor: isDark ? t.preview.dark : t.preview.light }}
                            className="aspect-square"
                          />
                        );
                      })}
                    </div>
                    <p className="text-[10px] md:text-xs text-center mt-1 font-medium truncate">{t.name}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">{theme.description}</p>
            </CardContent>
          </Card>

          {/* Deck Selector */}
          <Card className="card-gamer" style={{ borderColor: `${theme.board.borderColor}80` }}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" style={{ color: theme.pieces.white.stroke }} />
                <h2 className="text-lg font-bold font-display">Elegí tu mazo de estudio</h2>
              </div>
              <p className="text-xs text-muted-foreground">Durante la partida, el bot intentará interrumpirte. Si fallas una pregunta, ¡pierdes el turno!</p>
              <div className="space-y-2 max-h-[18vh] overflow-y-auto">
                {decks.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-3">No tenés mazos. Crea uno primero.</p>
                ) : (
                  decks.map((deck) => (
                    <button
                      key={deck.id}
                      onClick={() => setSelectedDeck(deck)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all duration-200",
                        selectedDeck?.id === deck.id
                          ? "bg-white/5 shadow-md"
                          : "border-border/50 bg-secondary/30 hover:bg-secondary/60"
                      )}
                      style={selectedDeck?.id === deck.id ? { borderColor: theme.pieces.white.stroke, boxShadow: `0 0 12px ${theme.board.borderColor}` } : {}}
                    >
                      <p className="font-medium text-sm">{deck.nombre}</p>
                      <p className="text-xs text-muted-foreground">{deck.total_questions} preguntas</p>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Level + Start */}
          {selectedDeck && (
            <Card className="card-gamer transition-all" style={{ borderColor: theme.board.borderColor, boxShadow: `0 0 25px ${theme.board.borderColor}30` }}>
              <CardContent className="p-5 text-center space-y-4">
                <Bot className="w-10 h-10 mx-auto" style={{ color: theme.pieces.white.stroke }} />
                <h2 className="text-lg font-bold font-display">Nivel de la IA</h2>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLevel(lvl)}
                      className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                        level === lvl
                          ? "text-white scale-110"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-white"
                      )}
                      style={level === lvl ? {
                        backgroundColor: theme.pieces.white.stroke,
                        boxShadow: `0 0 18px ${theme.pieces.white.stroke}`,
                      } : {}}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {level === 1 && "Principiante (800 ELO)"}
                  {level === 2 && "Aficionado (1000 ELO)"}
                  {level === 3 && "Intermedio (1200 ELO)"}
                  {level === 4 && "Avanzado (1400 ELO)"}
                  {level === 5 && "Gran Maestro (1600 ELO)"}
                </p>

                <Button
                  className="w-full mt-2 text-lg font-bold h-12 text-white"
                  onClick={startGame}
                  style={{
                    background: `linear-gradient(to right, ${theme.pieces.white.stroke}, ${theme.pieces.black.accent})`,
                  }}
                >
                  <Swords className="w-5 h-5 mr-2" /> ¡Jugar Partida!
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ========================
  // PLAYING PHASE
  // ========================
  const isPlayerWin = gameOver === "checkmate_w";
  const isDraw = gameOver === "stalemate" || gameOver === "draw";

  return (
    <div className="min-h-screen p-3 md:p-6 space-y-3 max-w-2xl mx-auto relative">
      <ChessThemeDefs theme={theme} />

      {/* Question Interruption Modal */}
      {activeQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-200">
            <CardContent className="p-6 text-center space-y-4">
              <div className="flex justify-between items-center mb-2">
                <Badge variant="destructive" className="animate-pulse">¡INTERRUPCIÓN!</Badge>
                <div className="flex items-center gap-1 font-bold text-red-400 text-lg">
                  <Clock className="w-5 h-5" /> 00:0{questionTimeLeft}
                </div>
              </div>
              <h3 className="font-medium text-lg leading-snug">{activeQuestion.pregunta}</h3>
              <div className="grid grid-cols-1 gap-2 pt-2">
                {activeQuestion.options.map((option, idx) => {
                  let btnStyle = "border-border/50 bg-secondary/30 hover:bg-secondary/60";
                  if (questionResult) {
                    if (option.es_correcta) btnStyle = "border-green-500 bg-green-500/20";
                    else btnStyle = "border-destructive bg-destructive/20 opacity-50";
                  }
                  return (
                    <button
                      key={option.id}
                      onClick={() => !questionResult && answerQuestion(option.id)}
                      disabled={!!questionResult}
                      className={cn("w-full text-left p-3 rounded-xl border transition-all duration-300 flex items-start gap-2", btnStyle)}
                    >
                      <span className="text-xs font-bold text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">{idx + 1}</span>
                      <p className="text-sm font-medium">{option.texto}</p>
                    </button>
                  );
                })}
              </div>
              {questionResult && (
                <div className={cn("font-bold text-lg mt-4 animate-in slide-in-from-bottom-2", questionResult === "correct" ? "text-green-400" : "text-destructive")}>
                  {questionResult === "correct" ? "¡Salvado! Mueves tú." : questionResult === "timeout" ? "¡Tiempo agotado! Pierdes el turno." : "¡Incorrecto! Pierdes el turno."}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setPhase("menu")}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-display font-bold flex items-center gap-2">
              TABE Chess
              <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.board.borderColor}30`, color: theme.pieces.white.stroke }}>
                {theme.name}
              </span>
            </h1>
            <span className="text-xs font-medium" style={{ color: theme.pieces.white.stroke }}>
              Tú ({myElo}) vs Bot Lvl {level}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">#{moveCount}</Badge>
          <Button variant="ghost" size="icon" onClick={startGame} title="Reiniciar"><RotateCcw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <Badge
          className="text-sm px-4 py-1.5 shadow-lg border"
          style={{
            backgroundColor: isWhiteTurn ? `${theme.pieces.white.stroke}20` : `${theme.pieces.black.accent}20`,
            borderColor: isWhiteTurn ? `${theme.pieces.white.stroke}50` : `${theme.pieces.black.accent}30`,
            color: isWhiteTurn ? theme.pieces.white.stroke : theme.pieces.black.highlight,
          }}
        >
          {gameOver
            ? (isPlayerWin ? "🏆 ¡Jaque Mate! Ganaste" : isDraw ? "🤝 Tablas" : "😔 Jaque Mate. Perdiste")
            : inCheck
              ? "⚠️ ¡Jaque!"
              : isWhiteTurn ? "♔ Tu turno (blancas)" : "♚ Bot pensando..."}
        </Badge>
        {/* Captured pieces */}
        <div className="flex gap-3">
          <div className="flex -space-x-1">
            {capturedBlack.map((p, i) => (
              <div key={i} className="w-5 h-5">{renderThemedPiece(p.type, p.color, theme)}</div>
            ))}
          </div>
          <div className="flex -space-x-1">
            {capturedWhite.map((p, i) => (
              <div key={i} className="w-5 h-5">{renderThemedPiece(p.type, p.color, theme)}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Chess Board */}
      <ChessBoardPremium
        pieces={boardPieces}
        theme={theme}
        selectedSquare={selectedSquare}
        legalMoves={legalMoves}
        lastMove={lastMove}
        inCheck={inCheck}
        checkSquare={checkSquare}
        isPlayerTurn={isWhiteTurn}
        gameOver={!!gameOver}
        disabled={!!activeQuestion}
        onSquareClick={handleSquareClick}
      />

      {/* Move History (last 10) */}
      {moveHistory.length > 0 && (
        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground font-mono px-1">
          {moveHistory.slice(-12).map((san, i) => {
            const globalIdx = moveHistory.length - 12 + i;
            const moveNum = Math.floor((globalIdx < 0 ? i : globalIdx) / 2) + 1;
            const isWhite = (globalIdx < 0 ? i : globalIdx) % 2 === 0;
            return (
              <span key={i} className={cn("px-1 rounded", isWhite ? "text-foreground/70" : "text-foreground/50")}>
                {isWhite && <span className="text-muted-foreground mr-0.5">{moveNum}.</span>}
                {san}
              </span>
            );
          })}
        </div>
      )}

      {/* Game Over Overlay */}
      {gameOver && (
        <Card className="card-gamer mt-3" style={{ borderColor: `${theme.pieces.white.stroke}50`, boxShadow: `0 0 30px ${theme.board.borderColor}` }}>
          <CardContent className="p-6 text-center space-y-4">
            <div
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${theme.board.borderColor}, ${theme.pieces.black.accent}30)` }}
            >
              {isPlayerWin ? (
                <Trophy className="w-10 h-10" style={{ color: theme.pieces.white.stroke }} />
              ) : isDraw ? (
                <Shield className="w-10 h-10 text-muted-foreground" />
              ) : (
                <Flag className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <h2 className="font-display font-bold text-3xl text-white">
              {isPlayerWin ? "¡Jaque Mate!" : isDraw ? "Tablas" : "Derrota"}
            </h2>
            <p className="text-muted-foreground text-sm">
              Partida terminada en {moveCount} jugadas
              {gameOver === "draw" && " · Empate por repetición o material insuficiente"}
              {gameOver === "stalemate" && " · Rey ahogado"}
            </p>

            {/* ELO Update */}
            {eloDelta !== null && (
              <div className="flex items-center justify-center gap-4 py-2">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">ELO Anterior</p>
                  <p className="font-bold">{myElo - eloDelta}</p>
                </div>
                <div className={cn("flex items-center gap-1 font-bold text-lg", eloDelta > 0 ? "text-green-400" : eloDelta < 0 ? "text-red-400" : "text-slate-400")}>
                  {eloDelta > 0 ? "+" : ""}{eloDelta}
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Nuevo ELO</p>
                  <p className="font-bold" style={{ color: theme.pieces.white.stroke }}>{myElo}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setPhase("menu")}>
                Ir al Menú
              </Button>
              <Button
                className="flex-1 text-white"
                onClick={startGame}
                style={{ background: `linear-gradient(to right, ${theme.pieces.white.stroke}, ${theme.pieces.black.accent})` }}
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Revancha
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
