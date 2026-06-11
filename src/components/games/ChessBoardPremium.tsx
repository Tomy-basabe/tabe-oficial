import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { renderThemedPiece } from "./ChessAssets";
import type { ChessTheme } from "./ChessThemes";
import type { Square, Color, PieceSymbol } from "chess.js";

// ============================================================
// PREMIUM CHESS BOARD - Animated board with theme support
// ============================================================

interface BoardPiece {
  square: Square;
  type: PieceSymbol;
  color: Color;
}

interface ChessBoardPremiumProps {
  pieces: BoardPiece[];
  theme: ChessTheme;
  selectedSquare: Square | null;
  legalMoves: Square[];
  lastMove: { from: Square; to: Square } | null;
  inCheck: boolean;
  checkSquare: Square | null;
  isPlayerTurn: boolean;
  gameOver: boolean;
  disabled: boolean; // e.g. during question interruption
  onSquareClick: (square: Square) => void;
  flipped?: boolean;
}

// Convert chess.js square notation to row/col
function squareToRC(sq: Square): [number, number] {
  const col = sq.charCodeAt(0) - 97; // a=0, b=1...
  const row = 8 - parseInt(sq[1]); // 8=0, 7=1...
  return [row, col];
}

function rcToSquare(row: number, col: number): Square {
  return `${"abcdefgh"[col]}${8 - row}` as Square;
}

export default function ChessBoardPremium({
  pieces,
  theme,
  selectedSquare,
  legalMoves,
  lastMove,
  inCheck,
  checkSquare,
  isPlayerTurn,
  gameOver,
  disabled,
  onSquareClick,
  flipped = false,
}: ChessBoardPremiumProps) {
  const t = theme.board;

  // Build a lookup map for pieces
  const pieceMap = new Map<string, BoardPiece>();
  for (const p of pieces) {
    pieceMap.set(p.square, p);
  }

  const getSquareStyle = useCallback(
    (row: number, col: number, square: Square) => {
      const isDark = (row + col) % 2 === 1;
      const isSelected = selectedSquare === square;
      const isLegal = legalMoves.includes(square);
      const isLastFrom = lastMove?.from === square;
      const isLastTo = lastMove?.to === square;
      const isCheck = inCheck && checkSquare === square;
      const piece = pieceMap.get(square);
      const isCapture = isLegal && !!piece;

      let bg = isDark ? t.darkSquare : t.lightSquare;
      if (isSelected) bg = t.selectedSquare;
      else if (isLastFrom || isLastTo) bg = t.lastMoveSquare;
      if (isCheck) bg = t.checkColor;

      const canClick =
        !gameOver &&
        !disabled &&
        (isLegal || (piece?.color === "w" && isPlayerTurn));

      return { bg, isLegal, isCapture, canClick, isDark };
    },
    [selectedSquare, legalMoves, lastMove, inCheck, checkSquare, isPlayerTurn, gameOver, disabled, pieceMap, t]
  );

  const rows = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div
      className="relative rounded-xl overflow-hidden border-2 shadow-2xl"
      style={{
        borderColor: t.borderColor,
        backgroundColor: t.bgColor,
        boxShadow: `0 0 60px ${t.borderColor}`,
      }}
    >
      {/* Board texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
        }}
      />

      <div className="grid grid-cols-8 aspect-square max-w-[520px] mx-auto relative z-0">
        {rows.map((row) =>
          cols.map((col) => {
            const square = rcToSquare(row, col);
            const piece = pieceMap.get(square);
            const { bg, isLegal, isCapture, canClick } = getSquareStyle(row, col, square);

            return (
              <button
                key={square}
                onClick={() => onSquareClick(square)}
                disabled={!canClick && !isLegal}
                className={cn(
                  "aspect-square flex items-center justify-center relative transition-colors duration-150 select-none",
                  canClick && "cursor-pointer",
                  !canClick && !isLegal && "cursor-default"
                )}
                style={{ backgroundColor: bg }}
              >
                {/* Rank labels (left side) */}
                {col === (flipped ? 7 : 0) && (
                  <span
                    className="absolute top-0.5 left-1 text-[9px] md:text-[11px] font-bold pointer-events-none z-20 select-none"
                    style={{ color: t.labelColor }}
                  >
                    {8 - row}
                  </span>
                )}
                {/* File labels (bottom) */}
                {row === (flipped ? 0 : 7) && (
                  <span
                    className="absolute bottom-0 right-1 text-[9px] md:text-[11px] font-bold pointer-events-none z-20 select-none"
                    style={{ color: t.labelColor }}
                  >
                    {"abcdefgh"[col]}
                  </span>
                )}

                {/* Legal move dot */}
                {isLegal && !isCapture && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute w-[26%] h-[26%] rounded-full z-10"
                    style={{
                      backgroundColor: t.legalMoveColor,
                      boxShadow: `0 0 8px ${t.legalMoveColor}`,
                    }}
                  />
                )}

                {/* Capture ring */}
                {isCapture && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-[6%] rounded-full border-[3px] z-10"
                    style={{
                      borderColor: t.captureColor,
                      boxShadow: `inset 0 0 12px ${t.captureColor}`,
                    }}
                  />
                )}

                {/* Piece with animation */}
                <AnimatePresence mode="popLayout">
                  {piece && (
                    <motion.div
                      key={`${piece.color}${piece.type}_${piece.square}`}
                      layoutId={`piece_${piece.color}${piece.type}_${findPieceId(pieces, piece)}`}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{
                        scale: selectedSquare === square ? 1.12 : 1,
                        opacity: 1,
                      }}
                      exit={{ scale: 0.3, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                        mass: 0.8,
                      }}
                      className="w-[82%] h-[82%] z-20 relative"
                    >
                      {renderThemedPiece(piece.type, piece.color, theme)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// Generate a stable ID for each piece so layoutId animations work for sliding
function findPieceId(pieces: BoardPiece[], target: BoardPiece): string {
  // Group by color+type, then index within that group gives stable ordering
  let idx = 0;
  for (const p of pieces) {
    if (p.color === target.color && p.type === target.type) {
      if (p.square === target.square) return `${idx}`;
      idx++;
    }
  }
  return "0";
}
