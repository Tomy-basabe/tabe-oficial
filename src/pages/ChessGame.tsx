import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Trophy, Crown, RotateCcw, Swords, Bot, Settings2, BookOpen, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChessDefs, renderPremiumPiece } from "@/components/games/ChessAssets";
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
// CHESS ENGINE
// ======================================
type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
type PieceColor = "w" | "b";
interface Piece { type: PieceType; color: PieceColor; }
type Board = (Piece | null)[];
type Pos = number; // 0-63

function initBoard(): Board {
  const b: Board = Array(64).fill(null);
  const backRow: PieceType[] = ["R","N","B","Q","K","B","N","R"];
  for (let i = 0; i < 8; i++) {
    b[i] = { type: backRow[i], color: "b" };
    b[8 + i] = { type: "P", color: "b" };
    b[48 + i] = { type: "P", color: "w" };
    b[56 + i] = { type: backRow[i], color: "w" };
  }
  return b;
}

function toRC(pos: Pos): [number, number] { return [Math.floor(pos / 8), pos % 8]; }
function toPos(r: number, c: number): Pos { return r * 8 + c; }
function inBounds(r: number, c: number): boolean { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function getPseudoLegalMoves(board: Board, pos: Pos): Pos[] {
  const piece = board[pos];
  if (!piece) return [];
  const [r, c] = toRC(pos);
  const moves: Pos[] = [];
  const color = piece.color;
  const enemy = color === "w" ? "b" : "w";

  const addIfValid = (nr: number, nc: number) => {
    if (!inBounds(nr, nc)) return false;
    const target = board[toPos(nr, nc)];
    if (target && target.color === color) return false;
    moves.push(toPos(nr, nc));
    return !target; // can continue sliding if empty
  };

  const slide = (dr: number, dc: number) => {
    for (let i = 1; i < 8; i++) {
      if (!addIfValid(r + dr * i, c + dc * i)) break;
    }
  };

  switch (piece.type) {
    case "P": {
      const dir = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      if (inBounds(r + dir, c) && !board[toPos(r + dir, c)]) {
        moves.push(toPos(r + dir, c));
        if (r === startRow && !board[toPos(r + 2 * dir, c)]) {
          moves.push(toPos(r + 2 * dir, c));
        }
      }
      for (const dc of [-1, 1]) {
        if (inBounds(r + dir, c + dc)) {
          const t = board[toPos(r + dir, c + dc)];
          if (t && t.color === enemy) moves.push(toPos(r + dir, c + dc));
        }
      }
      break;
    }
    case "N":
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) addIfValid(r + dr, c + dc);
      break;
    case "B": slide(-1,-1); slide(-1,1); slide(1,-1); slide(1,1); break;
    case "R": slide(-1,0); slide(1,0); slide(0,-1); slide(0,1); break;
    case "Q": slide(-1,-1); slide(-1,1); slide(1,-1); slide(1,1); slide(-1,0); slide(1,0); slide(0,-1); slide(0,1); break;
    case "K":
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) addIfValid(r + dr, c + dc);
      break;
  }
  return moves;
}

function findKing(board: Board, color: PieceColor): Pos {
  return board.findIndex(p => p?.type === "K" && p?.color === color);
}

function isInCheck(board: Board, color: PieceColor): boolean {
  const kingPos = findKing(board, color);
  if (kingPos === -1) return true;
  const enemy = color === "w" ? "b" : "w";
  for (let i = 0; i < 64; i++) {
    if (board[i]?.color === enemy) {
      if (getPseudoLegalMoves(board, i).includes(kingPos)) return true;
    }
  }
  return false;
}

function getLegalMoves(board: Board, pos: Pos): Pos[] {
  const piece = board[pos];
  if (!piece) return [];
  return getPseudoLegalMoves(board, pos).filter(to => {
    const newBoard = [...board];
    newBoard[to] = newBoard[pos];
    newBoard[pos] = null;
    return !isInCheck(newBoard, piece.color);
  });
}

function makeMove(board: Board, from: Pos, to: Pos): Board {
  const newBoard = [...board];
  const piece = newBoard[from]!;
  newBoard[to] = piece;
  newBoard[from] = null;
  const [tr] = toRC(to);
  if (piece.type === "P" && (tr === 0 || tr === 7)) {
    newBoard[to] = { type: "Q", color: piece.color };
  }
  return newBoard;
}

function hasAnyLegalMove(board: Board, color: PieceColor): boolean {
  for (let i = 0; i < 64; i++) {
    if (board[i]?.color === color && getLegalMoves(board, i).length > 0) return true;
  }
  return false;
}

function evaluateBoard(board: Board): number {
  const values: Record<PieceType, number> = { P: 10, N: 30, B: 30, R: 50, Q: 90, K: 900 };
  let score = 0;
  for (let i=0; i<64; i++) {
    const p = board[i];
    if (p) {
      const val = values[p.type];
      const [r, c] = toRC(i);
      const posBonus = (p.type === "P" || p.type === "N") ? (Math.abs(3.5-r) + Math.abs(3.5-c)) * -1 : 0;
      const total = val + posBonus;
      score += (p.color === "b" ? 1 : -1) * total;
    }
  }
  return score;
}

function minimax(board: Board, depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
  if (depth === 0) return evaluateBoard(board);
  const color = isMaximizing ? "b" : "w";
  let moves: {f: Pos, t: Pos}[] = [];
  for (let i = 0; i < 64; i++) {
    if (board[i]?.color === color) {
      const legal = getLegalMoves(board, i);
      for(const l of legal) moves.push({f: i, t: l});
    }
  }
  if (moves.length === 0) return isInCheck(board, color) ? (isMaximizing ? -9999 : 9999) : 0;

  moves.sort((a,b) => (board[b.t] ? 1 : 0) - (board[a.t] ? 1 : 0));

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      const nb = makeMove(board, m.f, m.t);
      const ev = minimax(nb, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const m of moves) {
      const nb = makeMove(board, m.f, m.t);
      const ev = minimax(nb, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBotMove(board: Board, level: number): { from: Pos; to: Pos } | null {
  let moves: {from: Pos, to: Pos}[] = [];
  for (let i = 0; i < 64; i++) {
    if (board[i]?.color === "b") {
      for (const to of getLegalMoves(board, i)) moves.push({from: i, to});
    }
  }
  if (moves.length === 0) return null;

  if (level === 1) return moves[Math.floor(Math.random() * moves.length)];

  if (level === 2) {
    const captures = moves.filter(m => board[m.to] !== null);
    if (captures.length > 0) return captures[Math.floor(Math.random() * captures.length)];
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depthMap: Record<number, number> = { 3: 1, 4: 2, 5: 3 };
  const depth = depthMap[level] || 1;
  let bestScore = -Infinity;
  let bestMoves: {from: Pos, to: Pos}[] = [];

  moves.sort(() => Math.random() - 0.5);

  for (const m of moves) {
    const nb = makeMove(board, m.from, m.to);
    const score = minimax(nb, depth - 1, -Infinity, Infinity, false);
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
  
  const [decks, setDecks] = useState<QuizDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<QuizDeck | null>(null);

  const [phase, setPhase] = useState<"menu" | "playing">("menu");
  const [level, setLevel] = useState<number>(3);
  const [myElo, setMyElo] = useState<number>(1200);

  const [board, setBoard] = useState<Board>(initBoard());
  const [selected, setSelected] = useState<Pos | null>(null);
  const [legalMoves, setLegalMoves] = useState<Pos[]>([]);
  const [isWhiteTurn, setIsWhiteTurn] = useState(true);
  const [gameOver, setGameOver] = useState<"checkmate_w" | "checkmate_b" | "stalemate" | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Pos; to: Pos } | null>(null);
  const [capturedWhite, setCapturedWhite] = useState<Piece[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<Piece[]>([]);
  const [inCheck, setInCheck] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [eloDelta, setEloDelta] = useState<number | null>(null);

  // Random Question Interruption State
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

  const startGame = () => {
    if (!selectedDeck) return; // Must select a deck to play
    setBoard(initBoard());
    setSelected(null);
    setLegalMoves([]);
    setIsWhiteTurn(true);
    setGameOver(null);
    setLastMove(null);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setInCheck(false);
    setMoveCount(0);
    setEloDelta(null);
    setQuestionsUsed(new Set());
    setActiveQuestion(null);
    setQuestionResult(null);
    setPhase("playing");
  };

  const triggerRandomQuestion = async () => {
    const q = await fetchRandomQuestion();
    if (q) {
      setActiveQuestion(q);
      setQuestionTimeLeft(5);
      setQuestionResult(null);
      
      questionTimerRef.current = setInterval(() => {
        setQuestionTimeLeft((prev) => {
          if (prev <= 1) {
            handleQuestionTimeout();
            return 0;
          }
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
      // Penalty: Skip player's turn!
      setIsWhiteTurn(false);
    }, 2000);
  };

  const answerQuestion = (optionId: string) => {
    clearQuestionTimer();
    const correct = activeQuestion?.options.find((o) => o.id === optionId)?.es_correcta || false;
    setQuestionResult(correct ? "correct" : "wrong");
    
    setTimeout(() => {
      setActiveQuestion(null);
      if (!correct) {
        // Penalty: Skip player's turn!
        setIsWhiteTurn(false);
      }
      // If correct, they keep their turn (isWhiteTurn remains true)
    }, 2000);
  };

  useEffect(() => {
    return () => clearQuestionTimer();
  }, []);

  const handleCellClick = useCallback((pos: Pos) => {
    if (gameOver || !isWhiteTurn || activeQuestion) return;
    const piece = board[pos];

    if (selected !== null) {
      if (legalMoves.includes(pos)) {
        const captured = board[pos];
        const newBoard = makeMove(board, selected, pos);
        setBoard(newBoard);
        setLastMove({ from: selected, to: pos });
        setSelected(null);
        setLegalMoves([]);
        setMoveCount(c => c + 1);

        if (captured) setCapturedBlack(prev => [...prev, captured]);

        if (!hasAnyLegalMove(newBoard, "b")) {
          setGameOver(isInCheck(newBoard, "b") ? "checkmate_w" : "stalemate");
          return;
        }
        setInCheck(isInCheck(newBoard, "b"));
        setIsWhiteTurn(false);
        return;
      }
      if (piece?.color === "w") {
        setSelected(pos);
        setLegalMoves(getLegalMoves(board, pos));
        return;
      }
      setSelected(null);
      setLegalMoves([]);
      return;
    }
    if (piece?.color === "w") {
      setSelected(pos);
      setLegalMoves(getLegalMoves(board, pos));
    }
  }, [board, selected, legalMoves, isWhiteTurn, gameOver, activeQuestion]);

  // Bot Turn
  useEffect(() => {
    if (isWhiteTurn || gameOver || phase !== "playing" || activeQuestion) return;
    
    const timer = setTimeout(() => {
      const move = getBotMove(board, level);
      if (!move) {
        setGameOver(isInCheck(board, "b") ? "checkmate_w" : "stalemate");
        return;
      }
      const captured = board[move.to];
      const newBoard = makeMove(board, move.from, move.to);
      setBoard(newBoard);
      setLastMove(move);
      setMoveCount(c => c + 1);
      if (captured) setCapturedWhite(prev => [...prev, captured]);

      if (!hasAnyLegalMove(newBoard, "w")) {
        setGameOver(isInCheck(newBoard, "w") ? "checkmate_b" : "stalemate");
        return;
      }
      setInCheck(isInCheck(newBoard, "w"));
      
      // Before handing turn back to player, 15% chance to trigger a question
      if (Math.random() < 0.15) {
        triggerRandomQuestion();
      } else {
        setIsWhiteTurn(true);
      }

    }, level > 3 ? 100 : 600);
    
    return () => clearTimeout(timer);
  }, [isWhiteTurn, gameOver, board, level, phase, activeQuestion]);

  // ELO calculation
  useEffect(() => {
    if (gameOver && eloDelta === null) {
      const botElo = 800 + (level * 200); 
      const expectedScore = 1 / (1 + Math.pow(10, (botElo - myElo) / 400));
      const actualScore = gameOver === "checkmate_w" ? 1 : gameOver === "stalemate" ? 0.5 : 0;
      const kFactor = 32;
      const change = Math.round(kFactor * (actualScore - expectedScore));
      
      setEloDelta(change);
      const newElo = Math.max(100, myElo + change);
      setMyElo(newElo);
      saveLocalElo(newElo);
    }
  }, [gameOver, eloDelta, level, myElo]);

  if (phase === "menu") {
    return (
      <div className="min-h-screen p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden">
        <ChessDefs />
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none flex items-center justify-center">
          <div className="w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.15)_0%,_transparent_70%)]" />
        </div>

        <div className="z-10 text-center space-y-2 mb-6">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={() => navigate("/juegos")}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center backdrop-blur-xl border border-cyan-500/30">
            <Crown className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
            Ajedrez Académico
          </h1>
          <Badge variant="outline" className="text-cyan-400 border-cyan-400/50 text-sm px-4 py-1">
            ELO Actual: <strong className="ml-2 text-white">{myElo}</strong>
          </Badge>
        </div>

        <div className="w-full max-w-xl z-10 space-y-4">
          <Card className="card-gamer border-cyan-500/30">
            <CardContent className="p-6 text-center space-y-4">
              <BookOpen className="w-10 h-10 mx-auto text-cyan-400 mb-2" />
              <h2 className="text-xl font-bold font-display">1. Elegí tu mazo de estudio</h2>
              <p className="text-xs text-muted-foreground">Durante la partida, el bot intentará interrumpirte. Si fallas una pregunta, ¡pierdes el turno!</p>
              
              <div className="space-y-2 max-h-[20vh] overflow-y-auto mt-4 text-left">
                {decks.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center">No tenés mazos. Crea uno primero.</p>
                ) : (
                  decks.map((deck) => (
                    <button key={deck.id} onClick={() => setSelectedDeck(deck)} className={cn("w-full text-left p-3 rounded-lg border transition-all duration-200", selectedDeck?.id === deck.id ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_10px_rgba(34,211,238,0.2)]" : "border-border/50 bg-secondary/30 hover:bg-secondary/60")}>
                      <p className="font-medium text-sm">{deck.nombre}</p>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {selectedDeck && (
            <Card className="card-gamer border-cyan-400/60 transition-all shadow-[0_0_20px_rgba(34,211,238,0.1)]">
              <CardContent className="p-6 text-center space-y-4">
                <Bot className="w-12 h-12 mx-auto text-cyan-400" />
                <h2 className="text-xl font-bold font-display">2. Nivel de la IA</h2>
                
                <div className="pt-2">
                  <div className="flex justify-center gap-3">
                    {[1,2,3,4,5].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setLevel(lvl)}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                          level === lvl ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.6)] scale-110" : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-white"
                        )}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
                
                <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 mt-4 text-lg font-bold h-12" onClick={startGame}>
                  <Swords className="w-5 h-5 mr-2" /> ¡Jugar Partida!
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // PLAYING PHASE
  const isPlayerWin = gameOver === "checkmate_w";
  const isDraw = gameOver === "stalemate";

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4 max-w-2xl mx-auto relative">
      <ChessDefs />
      
      {/* Active Question Modal Interruption */}
      {activeQuestion && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
                    if (option.es_correcta) btnStyle = "border-neon-green bg-neon-green/20";
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
                <div className={cn("font-bold text-lg mt-4 animate-in slide-in-from-bottom-2", questionResult === "correct" ? "text-neon-green" : "text-destructive")}>
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
             <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
              TABE Chess
            </h1>
            <span className="text-xs text-cyan-400 font-medium">Tú ({myElo}) vs Bot Lvl {level}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">Jugada #{moveCount}</Badge>
          <Button variant="ghost" size="icon" onClick={startGame} title="Reiniciar"><RotateCcw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <Badge className={cn("text-sm px-4 py-1.5 shadow-lg", isWhiteTurn ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50" : "bg-purple-900/50 text-purple-300 border-purple-500/30")}>
          {gameOver
            ? (isPlayerWin ? "🏆 ¡Jaque Mate! Ganaste" : isDraw ? "🤝 Tablas" : "😔 Jaque Mate. Perdiste")
            : inCheck
              ? "⚠️ ¡Jaque!"
              : isWhiteTurn ? "♔ Tu turno (blancas)" : "♚ Bot pensando..."}
        </Badge>
        {/* Captured pieces */}
        <div className="flex gap-4">
          <div className="flex -space-x-2">
            {capturedBlack.map((p, i) => (
              <div key={i} className="w-6 h-6">{renderPremiumPiece(p.type, p.color)}</div>
            ))}
          </div>
          <div className="flex -space-x-2">
            {capturedWhite.map((p, i) => (
              <div key={i} className="w-6 h-6">{renderPremiumPiece(p.type, p.color)}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Chess Board */}
      <Card className="card-gamer overflow-hidden bg-slate-900 border-slate-700">
        <CardContent className="p-2 md:p-4">
          <div className="grid grid-cols-8 aspect-square max-w-[480px] mx-auto border border-cyan-500/30 rounded-lg overflow-hidden shadow-[0_0_40px_rgba(34,211,238,0.15)] bg-slate-800">
            {board.map((piece, idx) => {
              const [r, c] = toRC(idx);
              const isDark = (r + c) % 2 === 1;
              const isSelected = selected === idx;
              const isLegal = legalMoves.includes(idx);
              const isLastFrom = lastMove?.from === idx;
              const isLastTo = lastMove?.to === idx;
              const isCaptureLegal = isLegal && !!piece;

              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  className={cn(
                    "aspect-square flex items-center justify-center relative transition-colors duration-200 select-none",
                    isDark ? "bg-[#1e293b]" : "bg-[#334155]", // Dark premium slate tiles
                    isSelected && "bg-cyan-500/40 shadow-[inset_0_0_15px_rgba(34,211,238,0.6)]",
                    (isLastFrom || isLastTo) && !isSelected && "bg-purple-500/30",
                    piece?.color === "w" && isWhiteTurn && !gameOver && !activeQuestion && "cursor-pointer",
                    isLegal && !gameOver && !activeQuestion && "cursor-pointer"
                  )}
                >
                  {/* Rank/File labels */}
                  {c === 0 && <span className="absolute top-0.5 left-0.5 text-[8px] md:text-[10px] font-bold text-slate-500">{8 - r}</span>}
                  {r === 7 && <span className="absolute bottom-0 right-0.5 text-[8px] md:text-[10px] font-bold text-slate-500">{"abcdefgh"[c]}</span>}

                  {/* Legal move indicators */}
                  {isLegal && !isCaptureLegal && (
                    <div className="absolute w-3 h-3 md:w-4 md:h-4 rounded-full bg-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  )}
                  {isCaptureLegal && (
                    <div className="absolute inset-0 rounded border-[3px] border-red-500/80 shadow-[inset_0_0_10px_rgba(239,68,68,0.5)]" />
                  )}

                  {/* SVG Piece */}
                  {piece && (
                    <div className={cn("w-[80%] h-[80%] z-10 transition-transform", isSelected && "scale-110")}>
                      {renderPremiumPiece(piece.type, piece.color)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Game Over Overlay */}
      {gameOver && (
        <Card className="card-gamer border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.2)] mt-4">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
              {isPlayerWin ? <Trophy className="w-10 h-10 text-cyan-400" /> : <Crown className="w-10 h-10 text-muted-foreground" />}
            </div>
            <h2 className="font-display font-bold text-3xl text-white">
              {isPlayerWin ? "¡Jaque Mate!" : isDraw ? "Tablas" : "Derrota"}
            </h2>
            <p className="text-muted-foreground text-sm">Partida terminada en {moveCount} jugadas</p>
            
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
                  <p className="font-bold text-cyan-400">{myElo}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setPhase("menu")}>
                 Ir al Menú
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500" onClick={startGame}>
                <RotateCcw className="w-4 h-4 mr-2" /> Revancha
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
