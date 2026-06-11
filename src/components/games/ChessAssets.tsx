import React from "react";
import { ChessTheme, getThemeById } from "./ChessThemes";
import type { PieceSymbol, Color } from "chess.js";

// Generates the CSS variables for the board. Kept for backwards compatibility if needed.
export const ChessThemeDefs: React.FC<{ theme: ChessTheme }> = ({ theme }) => {
  return null; 
};

export function renderThemedPiece(type: PieceSymbol | string, color: Color | string, theme: ChessTheme, className?: string) {
  // URLs use w or b + piece letter (p, n, b, r, q, k)
  const pieceName = `${color}${type.toLowerCase()}`;
  const src = `https://images.chesscomfiles.com/chess-themes/pieces/${theme.pieceSetUrl}/150/${pieceName}.png`;
  
  return (
    <img 
      src={src} 
      alt={`${color} ${type}`}
      className={className || "w-full h-full object-contain drop-shadow-2xl"}
      style={{
        filter: theme.pieces.glowIntensity > 0 
          ? `drop-shadow(0 0 ${theme.pieces.glowIntensity * 5}px ${color === 'w' ? theme.pieces.white.accent : theme.pieces.black.accent}80)` 
          : 'none',
        transform: 'scale(1.15)', // make pieces slightly larger to fill squares nicely
      }}
      draggable={false}
    />
  );
}

// Legacy compat (used in captured pieces display, etc.)
export { ChessThemeDefs as ChessDefs };

export function renderPremiumPiece(type: string, color: "w" | "b", className?: string) {
  return renderThemedPiece(type, color, getThemeById("neon"), className);
}
