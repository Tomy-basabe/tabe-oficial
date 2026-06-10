import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Trophy, Crown, RotateCcw, Swords, Bot, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChessDefs, renderPremiumPiece } from "@/components/games/ChessAssets";

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
      // positional bonus (center control)
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
  if (moves.length === 0) return isInCheck(board, color) ? (isMaximizing ? -9999 : 9999) : 0; // checkmate/stalemate

  // simple move ordering (captures first)
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

  // Level 1: Random
  if (level === 1) return moves[Math.floor(Math.random() * moves.length)];

  // Level 2: Greedy captures, else random
  if (level === 2) {
    const captures = moves.filter(m => board[m.to] !== null);
    if (captures.length > 0) return captures[Math.floor(Math.random() * captures.length)];
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Level 3, 4, 5: Minimax
  const depthMap: Record<number, number> = { 3: 1, 4: 2, 5: 3 };
  const depth = depthMap[level] || 1;
  let bestScore = -Infinity;
  let bestMoves: {from: Pos, to: Pos}[] = [];

  // Randomize initial order to vary games
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

  useEffect(() => { setMyElo(getLocalElo()); }, []);

  const startGame = () => {
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
    setPhase("playing");
  };

  const handleCellClick = useCallback((pos: Pos) => {
    if (gameOver || !isWhiteTurn) return;
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
  }, [board, selected, legalMoves, isWhiteTurn, gameOver]);

  // Bot Turn
  useEffect(() => {
    if (isWhiteTurn || gameOver || phase !== "playing") return;
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
      setIsWhiteTurn(true);
    }, level > 3 ? 100 : 600); // give UI time to paint if slow calc
    return () => clearTimeout(timer);
  }, [isWhiteTurn, gameOver, board, level, phase]);

  // ELO calculation
  useEffect(() => {
    if (gameOver && eloDelta === null) {
      const botElo = 800 + (level * 200); // lvl1=1000, lvl5=1800
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
      <div className="min-h-screen p-4 md:p-6 space-y-6 flex flex-col items-center justify-center relative overflow-hidden">
        <ChessDefs />
        {/* Background deco */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none flex items-center justify-center">
          <div className="w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.15)_0%,_transparent_70%)]" />
        </div>

        <div className="z-10 text-center space-y-2 mb-8">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center backdrop-blur-xl border border-cyan-500/30">
            <Crown className="w-12 h-12 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
            TABE Chess
          </h1>
          <Badge variant="outline" className="text-cyan-400 border-cyan-400/50 text-sm px-4 py-1">
            ELO Actual: <strong className="ml-2 text-white">{myElo}</strong>
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-4 w-full max-w-2xl z-10">
          <Card className="card-gamer border-cyan-500/30 hover:border-cyan-400/60 cursor-pointer transition-all hover:scale-105" onClick={startGame}>
            <CardContent className="p-8 text-center space-y-4">
              <Bot className="w-16 h-16 mx-auto text-cyan-400" />
              <h2 className="text-2xl font-bold font-display">Jugar vs Bot</h2>
              <p className="text-sm text-muted-foreground">Entrena contra la inteligencia artificial para subir tu ELO.</p>
              
              <div className="pt-4 border-t border-border/50">
                <p className="text-xs mb-2 font-medium">NIVEL DE DIFICULTAD</p>
                <div className="flex justify-center gap-2">
                  {[1,2,3,4,5].map(lvl => (
                    <button
                      key={lvl}
                      onClick={(e) => { e.stopPropagation(); setLevel(lvl); }}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                        level === lvl ? "bg-cyan-500 text-white shadow-[0_0_10px_rgba(34,211,238,0.5)] scale-110" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {level === 1 && "Principiante (1000 ELO)"}
                  {level === 2 && "Aficionado (1200 ELO)"}
                  {level === 3 && "Intermedio (1400 ELO)"}
                  {level === 4 && "Avanzado (1600 ELO)"}
                  {level === 5 && "Gran Maestro (1800 ELO)"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-gamer border-purple-500/20 opacity-60 cursor-not-allowed">
            <CardContent className="p-8 text-center space-y-4 relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-purple-500 text-xs px-2 py-1 rounded font-bold">PRONTO</div>
              <Swords className="w-16 h-16 mx-auto text-purple-400" />
              <h2 className="text-2xl font-bold font-display">Jugar Online</h2>
              <p className="text-sm text-muted-foreground">Enfrentate a otros estudiantes en tiempo real. ¡Competí en el ranking!</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // PLAYING PHASE
  const isPlayerWin = gameOver === "checkmate_w";
  const isDraw = gameOver === "stalemate";

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <ChessDefs />
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
                    piece?.color === "w" && isWhiteTurn && !gameOver && "cursor-pointer",
                    isLegal && !gameOver && "cursor-pointer"
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
        <Card className="card-gamer border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
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
