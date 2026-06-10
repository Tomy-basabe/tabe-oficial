import { cn } from "@/lib/utils";

interface PieceProps {
  color: "w" | "b";
  className?: string;
}

// ---------------------------------------------------------
// Helper gradients and filters (rendered once in the board)
// ---------------------------------------------------------
export function ChessDefs() {
  return (
    <svg width="0" height="0" className="absolute">
      <defs>
        {/* White pieces: Neon Cyan / Glass */}
        <linearGradient id="whiteBase" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="whiteHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.1" />
        </linearGradient>

        {/* Black pieces: Dark Purple / Gold */}
        <linearGradient id="blackBase" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#3b0764" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#000000" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="blackHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.1" />
        </linearGradient>

        {/* Filters for 3D/Neon pop */}
        <filter id="neonGlowWhite" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="neonGlowBlack" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComponentTransfer in="blur" result="glow">
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* Drop shadow for depth */}
        <filter id="pieceShadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.6" />
        </filter>
      </defs>
    </svg>
  );
}

// ---------------------------------------------------------
// Pieces SVG Components
// ---------------------------------------------------------

const getFills = (color: "w" | "b") => ({
  base: color === "w" ? "url(#whiteBase)" : "url(#blackBase)",
  hl: color === "w" ? "url(#whiteHighlight)" : "url(#blackHighlight)",
  stroke: color === "w" ? "#67e8f9" : "#d8b4fe",
  shadow: "url(#pieceShadow)",
  glow: color === "w" ? "url(#neonGlowWhite)" : "url(#neonGlowBlack)",
});

export function PremiumPawn({ color, className }: PieceProps) {
  const f = getFills(color);
  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} filter={f.shadow}>
      <g filter={f.glow}>
        <path d="M30 80 L70 80 L65 70 L35 70 Z" fill={f.base} stroke={f.stroke} strokeWidth="1" />
        <path d="M40 70 L60 70 L55 40 L45 40 Z" fill={f.base} stroke={f.stroke} strokeWidth="1" />
        <circle cx="50" cy="30" r="15" fill={f.base} stroke={f.stroke} strokeWidth="2" />
        <path d="M42 22 Q50 18 55 25" fill="none" stroke={f.hl} strokeWidth="3" strokeLinecap="round" />
        <path d="M32 75 L68 75" fill="none" stroke={f.hl} strokeWidth="2" />
      </g>
    </svg>
  );
}

export function PremiumRook({ color, className }: PieceProps) {
  const f = getFills(color);
  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} filter={f.shadow}>
      <g filter={f.glow}>
        <path d="M25 80 L75 80 L70 70 L30 70 Z" fill={f.base} stroke={f.stroke} strokeWidth="1" />
        <rect x="35" y="40" width="30" height="30" fill={f.base} stroke={f.stroke} strokeWidth="1" />
        <path d="M30 40 L70 40 L70 25 L60 25 L60 35 L55 35 L55 25 L45 25 L45 35 L40 35 L40 25 L30 25 Z" fill={f.base} stroke={f.stroke} strokeWidth="2" />
        <line x1="38" y1="45" x2="38" y2="65" stroke={f.hl} strokeWidth="2" />
        <line x1="28" y1="75" x2="72" y2="75" stroke={f.hl} strokeWidth="2" />
      </g>
    </svg>
  );
}

export function PremiumKnight({ color, className }: PieceProps) {
  const f = getFills(color);
  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} filter={f.shadow}>
      <g filter={f.glow}>
        <path d="M30 80 L70 80 L65 70 L35 70 Z" fill={f.base} stroke={f.stroke} strokeWidth="1" />
        <path d="M35 70 L65 70 L60 40 C70 35 70 20 55 20 C45 20 35 30 30 45 C40 45 45 50 45 60 Z" fill={f.base} stroke={f.stroke} strokeWidth="2" />
        {/* Eye */}
        <circle cx="48" cy="30" r="3" fill={color === "w" ? "#fff" : "#fbbf24"} />
        <path d="M38 48 Q45 55 42 62" fill="none" stroke={f.hl} strokeWidth="2" />
        <line x1="32" y1="75" x2="68" y2="75" stroke={f.hl} strokeWidth="2" />
      </g>
    </svg>
  );
}

export function PremiumBishop({ color, className }: PieceProps) {
  const f = getFills(color);
  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} filter={f.shadow}>
      <g filter={f.glow}>
        <path d="M30 80 L70 80 L65 70 L35 70 Z" fill={f.base} stroke={f.stroke} strokeWidth="1" />
        <path d="M40 70 L60 70 L55 50 L45 50 Z" fill={f.base} stroke={f.stroke} strokeWidth="1" />
        <path d="M50 15 C35 30 35 45 50 50 C65 45 65 30 50 15 Z" fill={f.base} stroke={f.stroke} strokeWidth="2" />
        {/* Cross */}
        <line x1="50" y1="5" x2="50" y2="15" stroke={f.stroke} strokeWidth="2" />
        <line x1="45" y1="10" x2="55" y2="10" stroke={f.stroke} strokeWidth="2" />
        {/* Slit */}
        <path d="M50 25 L50 40" fill="none" stroke={f.hl} strokeWidth="2" />
        <line x1="32" y1="75" x2="68" y2="75" stroke={f.hl} strokeWidth="2" />
      </g>
    </svg>
  );
}

export function PremiumQueen({ color, className }: PieceProps) {
  const f = getFills(color);
  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} filter={f.shadow}>
      <g filter={f.glow}>
        <path d="M25 80 L75 80 L70 70 L30 70 Z" fill={f.base} stroke={f.stroke} strokeWidth="1" />
        <path d="M35 70 L65 70 L55 50 L45 50 Z" fill={f.base} stroke={f.stroke} strokeWidth="1" />
        <path d="M20 25 L35 45 L50 20 L65 45 L80 25 L65 50 L35 50 Z" fill={f.base} stroke={f.stroke} strokeWidth="2" />
        <circle cx="20" cy="25" r="4" fill={f.stroke} />
        <circle cx="50" cy="20" r="4" fill={f.stroke} />
        <circle cx="80" cy="25" r="4" fill={f.stroke} />
        <path d="M40 55 L60 55" fill="none" stroke={f.hl} strokeWidth="2" />
        <line x1="28" y1="75" x2="72" y2="75" stroke={f.hl} strokeWidth="2" />
      </g>
    </svg>
  );
}

export function PremiumKing({ color, className }: PieceProps) {
  const f = getFills(color);
  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} filter={f.shadow}>
      <g filter={f.glow}>
        <path d="M25 80 L75 80 L70 70 L30 70 Z" fill={f.base} stroke={f.stroke} strokeWidth="1" />
        <path d="M35 70 L65 70 L60 45 L40 45 Z" fill={f.base} stroke={f.stroke} strokeWidth="1" />
        <path d="M30 45 L70 45 L65 25 L35 25 Z" fill={f.base} stroke={f.stroke} strokeWidth="2" />
        {/* Cross */}
        <line x1="50" y1="5" x2="50" y2="25" stroke={f.stroke} strokeWidth="4" />
        <line x1="40" y1="15" x2="60" y2="15" stroke={f.stroke} strokeWidth="4" />
        {/* Detail */}
        <path d="M45 35 L55 35" fill="none" stroke={f.hl} strokeWidth="2" />
        <line x1="28" y1="75" x2="72" y2="75" stroke={f.hl} strokeWidth="2" />
      </g>
    </svg>
  );
}

export function renderPremiumPiece(type: string, color: "w" | "b", className?: string) {
  switch (type) {
    case "P": return <PremiumPawn color={color} className={className} />;
    case "N": return <PremiumKnight color={color} className={className} />;
    case "B": return <PremiumBishop color={color} className={className} />;
    case "R": return <PremiumRook color={color} className={className} />;
    case "Q": return <PremiumQueen color={color} className={className} />;
    case "K": return <PremiumKing color={color} className={className} />;
    default: return null;
  }
}
