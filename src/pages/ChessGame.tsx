import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Trophy, Crown, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ======================================
// CHESS ENGINE (simplified but playable)
// ======================================
type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
type PieceColor = "w" | "b";
interface Piece { type: PieceType; color: PieceColor; }
type Board = (Piece | null)[];
type Pos = number; // 0-63

const PIECE_SYMBOLS: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

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
      // Forward
      if (inBounds(r + dir, c) && !board[toPos(r + dir, c)]) {
        moves.push(toPos(r + dir, c));
        if (r === startRow && !board[toPos(r + 2 * dir, c)]) {
          moves.push(toPos(r + 2 * dir, c));
        }
      }
      // Captures
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
    // Auto-promote pawns
    const [tr] = toRC(to);
    if (piece.type === "P" && (tr === 0 || tr === 7)) {
      newBoard[to] = { type: "Q", color: piece.color };
    }
    return !isInCheck(newBoard, piece.color);
  });
}

function makeMove(board: Board, from: Pos, to: Pos): Board {
  const newBoard = [...board];
  const piece = newBoard[from]!;
  newBoard[to] = piece;
  newBoard[from] = null;
  // Auto-promote
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

// Simple evaluation for bot
function evaluate(board: Board): number {
  const values: Record<PieceType, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
  let score = 0;
  for (const p of board) {
    if (p) score += (p.color === "b" ? 1 : -1) * values[p.type];
  }
  return score;
}

function botMove(board: Board): { from: Pos; to: Pos } | null {
  let bestScore = -Infinity;
  let bestMoves: { from: Pos; to: Pos }[] = [];

  for (let i = 0; i < 64; i++) {
    if (board[i]?.color !== "b") continue;
    for (const to of getLegalMoves(board, i)) {
      const nb = makeMove(board, i, to);
      const s = evaluate(nb) + Math.random() * 0.5; // slight randomness
      // Look one more ply for captures
      let bonus = 0;
      if (board[to]) bonus += 2; // capture bonus
      if (isInCheck(nb, "w")) bonus += 1.5; // check bonus
      const total = s + bonus;
      if (total > bestScore) { bestScore = total; bestMoves = [{ from: i, to }]; }
      else if (total === bestScore) bestMoves.push({ from: i, to });
    }
  }
  return bestMoves.length > 0 ? bestMoves[Math.floor(Math.random() * bestMoves.length)] : null;
}

// ======================================
// COMPONENT
// ======================================
export default function ChessGame() {
  const navigate = useNavigate();
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

  const handleCellClick = useCallback((pos: Pos) => {
    if (gameOver || !isWhiteTurn) return;
    const piece = board[pos];

    if (selected !== null) {
      // Try to move
      if (legalMoves.includes(pos)) {
        const captured = board[pos];
        const newBoard = makeMove(board, selected, pos);
        setBoard(newBoard);
        setLastMove({ from: selected, to: pos });
        setSelected(null);
        setLegalMoves([]);
        setMoveCount(c => c + 1);

        if (captured) setCapturedBlack(prev => [...prev, captured]);

        // Check game state
        if (!hasAnyLegalMove(newBoard, "b")) {
          setGameOver(isInCheck(newBoard, "b") ? "checkmate_w" : "stalemate");
          return;
        }
        setInCheck(isInCheck(newBoard, "b"));
        setIsWhiteTurn(false);
        return;
      }
      // Click on own piece to reselect
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

  // Bot turn
  useEffect(() => {
    if (isWhiteTurn || gameOver) return;
    const timer = setTimeout(() => {
      const move = botMove(board);
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
    }, 600);
    return () => clearTimeout(timer);
  }, [isWhiteTurn, gameOver, board]);

  const resetGame = () => {
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
  };

  const isPlayerWin = gameOver === "checkmate_w";
  const isDraw = gameOver === "stalemate";

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/juegos")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-400" /> Ajedrez
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">Jugada #{moveCount}</Badge>
          <Button variant="ghost" size="icon" onClick={resetGame} title="Reiniciar"><RotateCcw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <Badge className={cn("text-sm px-4 py-1.5", isWhiteTurn ? "bg-white/20 text-white border-white/30" : "bg-slate-700/50 text-slate-300 border-slate-600/30")}>
          {gameOver
            ? (isPlayerWin ? "🏆 ¡Jaque Mate! Ganaste" : isDraw ? "🤝 Tablas" : "😔 Jaque Mate. Perdiste")
            : inCheck
              ? "⚠️ ¡Jaque!"
              : isWhiteTurn ? "♔ Tu turno (blancas)" : "♚ Pensando..."}
        </Badge>
        {/* Captured pieces */}
        <div className="flex gap-2 text-sm">
          <div className="flex">{capturedBlack.map((p, i) => <span key={i} className="text-sm opacity-70">{PIECE_SYMBOLS[`${p.color}${p.type}`]}</span>)}</div>
          <div className="flex">{capturedWhite.map((p, i) => <span key={i} className="text-sm opacity-70">{PIECE_SYMBOLS[`${p.color}${p.type}`]}</span>)}</div>
        </div>
      </div>

      {/* Chess Board */}
      <Card className="card-gamer overflow-hidden">
        <CardContent className="p-2 md:p-4">
          <div className="grid grid-cols-8 aspect-square max-w-[480px] mx-auto border-2 border-amber-900/50 rounded-lg overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
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
                    "aspect-square flex items-center justify-center relative transition-all duration-150 text-2xl md:text-4xl select-none",
                    isDark ? "bg-amber-800/80" : "bg-amber-200/90",
                    isSelected && "bg-cyan-500/50 shadow-[inset_0_0_15px_rgba(34,211,238,0.5)]",
                    isLastFrom && "bg-yellow-500/30",
                    isLastTo && "bg-yellow-500/40",
                    piece?.color === "w" && isWhiteTurn && !gameOver && "cursor-pointer hover:brightness-110",
                    isLegal && !gameOver && "cursor-pointer"
                  )}
                >
                  {/* Rank/File labels */}
                  {c === 0 && <span className="absolute top-0.5 left-0.5 text-[8px] md:text-[10px] font-bold opacity-40">{8 - r}</span>}
                  {r === 7 && <span className="absolute bottom-0 right-0.5 text-[8px] md:text-[10px] font-bold opacity-40">{"abcdefgh"[c]}</span>}

                  {/* Legal move indicator */}
                  {isLegal && !isCaptureLegal && (
                    <div className="absolute w-3 h-3 md:w-4 md:h-4 rounded-full bg-cyan-400/40 shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
                  )}
                  {isCaptureLegal && (
                    <div className="absolute inset-1 rounded-full border-[3px] border-red-500/50" />
                  )}

                  {/* Piece */}
                  {piece && (
                    <span className={cn(
                      "relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-transform",
                      piece.color === "w" ? "text-white" : "text-slate-900",
                      isSelected && "scale-110",
                      piece.color === "w" && "[text-shadow:_0_0_10px_rgba(255,255,255,0.3)]",
                      piece.color === "b" && "[text-shadow:_0_0_10px_rgba(0,0,0,0.3)]"
                    )}>
                      {PIECE_SYMBOLS[`${piece.color}${piece.type}`]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Game Over Overlay */}
      {gameOver && (
        <Card className="card-gamer">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/20 flex items-center justify-center">
              {isPlayerWin ? <Trophy className="w-10 h-10 text-neon-gold" /> : <Crown className="w-10 h-10 text-muted-foreground" />}
            </div>
            <h2 className="font-display font-bold text-2xl">
              {isPlayerWin ? "¡Jaque Mate!" : isDraw ? "Tablas" : "Derrota"}
            </h2>
            <p className="text-muted-foreground text-sm">Partida terminada en {moveCount} jugadas</p>
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-neon-gold/10 border border-neon-gold/20">
              <Zap className="w-5 h-5 text-neon-gold" />
              <span className="font-display font-bold text-neon-gold">+{isPlayerWin ? 150 : isDraw ? 60 : 20} XP</span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/juegos")}><ArrowLeft className="w-4 h-4 mr-2" /> Volver</Button>
              <Button className="flex-1 bg-gradient-to-r from-amber-500 to-amber-700" onClick={resetGame}>
                <RotateCcw className="w-4 h-4 mr-2" /> Revancha
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
