import { cn } from "@/lib/utils";
import type { ChessTheme } from "./ChessThemes";

// ============================================================
// CHESS ASSETS - Premium SVG pieces with per-theme styling
// ============================================================

interface PieceProps {
  color: "w" | "b";
  theme: ChessTheme;
  className?: string;
}

// Unique gradient IDs per theme + color (avoids SVG ID collisions)
const gid = (theme: ChessTheme, color: "w" | "b", suffix: string) =>
  `${theme.id}_${color}_${suffix}`;

// ---- SVG DEFS (rendered once per theme) ----
export function ChessThemeDefs({ theme }: { theme: ChessTheme }) {
  const mkGrad = (color: "w" | "b") => {
    const c = color === "w" ? theme.pieces.white : theme.pieces.black;
    return (
      <>
        <linearGradient id={gid(theme, color, "base")} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={c.gradient[0]} stopOpacity="0.95" />
          <stop offset="50%" stopColor={c.gradient[1]} stopOpacity="0.9" />
          <stop offset="100%" stopColor={c.gradient[2]} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={gid(theme, color, "hl")} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.highlight} stopOpacity="0.8" />
          <stop offset="100%" stopColor={c.accent} stopOpacity="0.1" />
        </linearGradient>
        <radialGradient id={gid(theme, color, "shine")} cx="40%" cy="30%" r="50%">
          <stop offset="0%" stopColor={c.highlight} stopOpacity="0.5" />
          <stop offset="100%" stopColor={c.highlight} stopOpacity="0" />
        </radialGradient>
      </>
    );
  };

  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        {mkGrad("w")}
        {mkGrad("b")}
        <filter id={`${theme.id}_shadow`} x="-20%" y="-10%" width="140%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor={theme.pieces.shadow} floodOpacity="0.7" />
        </filter>
        {theme.pieces.glowIntensity > 0 && (
          <>
            <filter id={`${theme.id}_glow_w`} x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation={theme.pieces.glowIntensity} result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id={`${theme.id}_glow_b`} x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation={theme.pieces.glowIntensity + 1} result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.4" />
              </feComponentTransfer>
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </>
        )}
      </defs>
    </svg>
  );
}

// ---- FILL HELPERS ----
const f = (theme: ChessTheme, color: "w" | "b") => ({
  base: `url(#${gid(theme, color, "base")})`,
  hl: `url(#${gid(theme, color, "hl")})`,
  shine: `url(#${gid(theme, color, "shine")})`,
  stroke: color === "w" ? theme.pieces.white.stroke : theme.pieces.black.stroke,
  shadow: `url(#${theme.id}_shadow)`,
  glow: theme.pieces.glowIntensity > 0 ? `url(#${theme.id}_glow_${color})` : undefined,
});

// ============================================================
// PIECE COMPONENTS - Detailed SVG with 3D illusion
// ============================================================

export function ThemePawn({ color, theme, className }: PieceProps) {
  const s = f(theme, color);
  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} filter={s.shadow}>
      <g filter={s.glow}>
        {/* Base pedestal */}
        <ellipse cx="50" cy="82" rx="26" ry="6" fill={s.base} stroke={s.stroke} strokeWidth="1.5" />
        <path d="M26 80 C26 75 30 72 35 72 L65 72 C70 72 74 75 74 80" fill={s.base} stroke={s.stroke} strokeWidth="1.5" />
        {/* Stem */}
        <path d="M38 72 L42 45 L58 45 L62 72 Z" fill={s.base} stroke={s.stroke} strokeWidth="1.2" />
        {/* Collar ring */}
        <ellipse cx="50" cy="45" rx="12" ry="4" fill={s.base} stroke={s.stroke} strokeWidth="1" />
        {/* Head sphere */}
        <circle cx="50" cy="30" r="14" fill={s.base} stroke={s.stroke} strokeWidth="2" />
        <circle cx="50" cy="30" r="14" fill={s.shine} />
        {/* Specular highlight */}
        <ellipse cx="44" cy="24" rx="5" ry="3" fill={s.hl} opacity="0.7" />
        {/* Base highlight line */}
        <path d="M30 78 L70 78" stroke={s.hl} strokeWidth="1.5" opacity="0.5" />
      </g>
    </svg>
  );
}

export function ThemeRook({ color, theme, className }: PieceProps) {
  const s = f(theme, color);
  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} filter={s.shadow}>
      <g filter={s.glow}>
        {/* Wide base */}
        <ellipse cx="50" cy="82" rx="28" ry="6" fill={s.base} stroke={s.stroke} strokeWidth="1.5" />
        <path d="M24 80 C24 74 30 70 36 70 L64 70 C70 70 76 74 76 80" fill={s.base} stroke={s.stroke} strokeWidth="1.5" />
        {/* Tower body */}
        <rect x="34" y="38" rx="2" ry="2" width="32" height="32" fill={s.base} stroke={s.stroke} strokeWidth="1.5" />
        {/* Vertical groove details */}
        <line x1="42" y1="42" x2="42" y2="66" stroke={s.hl} strokeWidth="1.5" opacity="0.4" />
        <line x1="50" y1="42" x2="50" y2="66" stroke={s.hl} strokeWidth="1.5" opacity="0.3" />
        <line x1="58" y1="42" x2="58" y2="66" stroke={s.hl} strokeWidth="1.5" opacity="0.4" />
        {/* Battlements (crenellations) */}
        <path d="M28 38 L72 38 L72 24 L63 24 L63 32 L56 32 L56 24 L44 24 L44 32 L37 32 L37 24 L28 24 Z" fill={s.base} stroke={s.stroke} strokeWidth="2" />
        {/* Battlement top shine */}
        <rect x="30" y="24" width="6" height="2" rx="1" fill={s.hl} opacity="0.5" />
        <rect x="46" y="24" width="8" height="2" rx="1" fill={s.hl} opacity="0.5" />
        <rect x="65" y="24" width="6" height="2" rx="1" fill={s.hl} opacity="0.5" />
        {/* Collar band */}
        <rect x="32" y="36" rx="1" ry="1" width="36" height="4" fill={s.base} stroke={s.stroke} strokeWidth="1" />
        {/* Base band */}
        <path d="M28 76 L72 76" stroke={s.hl} strokeWidth="2" opacity="0.4" />
      </g>
    </svg>
  );
}

export function ThemeKnight({ color, theme, className }: PieceProps) {
  const s = f(theme, color);
  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} filter={s.shadow}>
      <g filter={s.glow}>
        {/* Base */}
        <ellipse cx="50" cy="82" rx="26" ry="6" fill={s.base} stroke={s.stroke} strokeWidth="1.5" />
        <path d="M26 80 C26 74 32 70 38 70 L62 70 C68 70 74 74 74 80" fill={s.base} stroke={s.stroke} strokeWidth="1.5" />
        {/* Horse head profile - detailed */}
        <path d="M36 70 L64 70 L60 42 C68 38 72 26 62 16 C56 10 48 12 42 16 C36 20 30 28 28 40 L26 52 C30 56 36 58 38 64 Z" fill={s.base} stroke={s.stroke} strokeWidth="2" />
        {/* Mane */}
        <path d="M56 18 C52 22 50 28 52 36" fill="none" stroke={s.stroke} strokeWidth="2.5" opacity="0.6" />
        <path d="M52 20 C48 24 47 30 50 38" fill="none" stroke={s.stroke} strokeWidth="1.5" opacity="0.4" />
        {/* Ear */}
        <path d="M48 16 L44 8 L52 14" fill={s.base} stroke={s.stroke} strokeWidth="1.5" />
        {/* Eye */}
        <circle cx="44" cy="26" r="3.5" fill={color === "w" ? theme.pieces.white.highlight : theme.pieces.black.highlight} />
        <circle cx="44" cy="26" r="1.5" fill={color === "w" ? "#0891b2" : "#000"} />
        {/* Nostril */}
        <circle cx="32" cy="44" r="2" fill={s.stroke} opacity="0.5" />
        {/* Mouth line */}
        <path d="M28 48 C32 50 36 48 38 44" fill="none" stroke={s.stroke} strokeWidth="1.5" opacity="0.5" />
        {/* Body texture / highlight */}
        <path d="M40 50 C44 56 42 64 40 68" fill="none" stroke={s.hl} strokeWidth="2" opacity="0.4" />
        {/* Shine on head */}
        <ellipse cx="46" cy="22" rx="4" ry="6" fill={s.shine} opacity="0.6" />
      </g>
    </svg>
  );
}

export function ThemeBishop({ color, theme, className }: PieceProps) {
  const s = f(theme, color);
  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} filter={s.shadow}>
      <g filter={s.glow}>
        {/* Base */}
        <ellipse cx="50" cy="82" rx="24" ry="6" fill={s.base} stroke={s.stroke} strokeWidth="1.5" />
        <path d="M28 80 C28 74 34 70 40 70 L60 70 C66 70 72 74 72 80" fill={s.base} stroke={s.stroke} strokeWidth="1.5" />
        {/* Column */}
        <path d="M40 70 L44 48 L56 48 L60 70 Z" fill={s.base} stroke={s.stroke} strokeWidth="1.2" />
        {/* Collar */}
        <ellipse cx="50" cy="48" rx="10" ry="4" fill={s.base} stroke={s.stroke} strokeWidth="1" />
        {/* Mitre (bishop hat) */}
        <path d="M50 10 C36 24 34 38 50 48 C66 38 64 24 50 10 Z" fill={s.base} stroke={s.stroke} strokeWidth="2" />
        {/* Diagonal slit on mitre */}
        <path d="M44 22 L56 38" fill="none" stroke={s.stroke} strokeWidth="2" opacity="0.6" />
        {/* Top ball/cross */}
        <circle cx="50" cy="8" r="4" fill={s.stroke} />
        <circle cx="50" cy="8" r="4" fill={s.shine} />
        {/* Mitre shine */}
        <ellipse cx="44" cy="26" rx="4" ry="8" fill={s.shine} opacity="0.5" />
        {/* Base highlight */}
        <path d="M32 78 L68 78" stroke={s.hl} strokeWidth="1.5" opacity="0.4" />
      </g>
    </svg>
  );
}

export function ThemeQueen({ color, theme, className }: PieceProps) {
  const s = f(theme, color);
  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} filter={s.shadow}>
      <g filter={s.glow}>
        {/* Base */}
        <ellipse cx="50" cy="84" rx="28" ry="6" fill={s.base} stroke={s.stroke} strokeWidth="1.5" />
        <path d="M24 82 C24 76 30 72 36 72 L64 72 C70 72 76 76 76 82" fill={s.base} stroke={s.stroke} strokeWidth="1.5" />
        {/* Body */}
        <path d="M36 72 L40 52 L60 52 L64 72 Z" fill={s.base} stroke={s.stroke} strokeWidth="1.2" />
        {/* Collar ring */}
        <ellipse cx="50" cy="52" rx="13" ry="4" fill={s.base} stroke={s.stroke} strokeWidth="1" />
        {/* Crown prongs */}
        <path d="M18 28 L34 48 L50 22 L66 48 L82 28 L68 52 L32 52 Z" fill={s.base} stroke={s.stroke} strokeWidth="2" />
        {/* Crown jewels (top balls) */}
        <circle cx="18" cy="26" r="4" fill={s.stroke} />
        <circle cx="50" cy="20" r="5" fill={s.stroke} />
        <circle cx="82" cy="26" r="4" fill={s.stroke} />
        {/* Inter-prong jewels */}
        <circle cx="34" cy="24" r="3" fill={s.stroke} opacity="0.6" />
        <circle cx="66" cy="24" r="3" fill={s.stroke} opacity="0.6" />
        {/* Crown shine */}
        <ellipse cx="42" cy="34" rx="6" ry="8" fill={s.shine} opacity="0.4" />
        {/* Body band decoration */}
        <path d="M38 58 L62 58" stroke={s.hl} strokeWidth="2" opacity="0.5" />
        <path d="M36 64 L64 64" stroke={s.hl} strokeWidth="1.5" opacity="0.3" />
        {/* Base highlight */}
        <path d="M28 80 L72 80" stroke={s.hl} strokeWidth="2" opacity="0.4" />
      </g>
    </svg>
  );
}

export function ThemeKing({ color, theme, className }: PieceProps) {
  const s = f(theme, color);
  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} filter={s.shadow}>
      <g filter={s.glow}>
        {/* Base */}
        <ellipse cx="50" cy="84" rx="28" ry="6" fill={s.base} stroke={s.stroke} strokeWidth="1.5" />
        <path d="M24 82 C24 76 30 72 36 72 L64 72 C70 72 76 76 76 82" fill={s.base} stroke={s.stroke} strokeWidth="1.5" />
        {/* Body */}
        <path d="M36 72 L40 50 L60 50 L64 72 Z" fill={s.base} stroke={s.stroke} strokeWidth="1.2" />
        {/* Collar ring */}
        <ellipse cx="50" cy="50" rx="13" ry="4" fill={s.base} stroke={s.stroke} strokeWidth="1" />
        {/* Crown band */}
        <path d="M28 48 L72 48 L68 30 L32 30 Z" fill={s.base} stroke={s.stroke} strokeWidth="2" />
        {/* Crown arch details */}
        <path d="M32 30 Q40 22 50 30" fill="none" stroke={s.stroke} strokeWidth="2" opacity="0.5" />
        <path d="M50 30 Q60 22 68 30" fill="none" stroke={s.stroke} strokeWidth="2" opacity="0.5" />
        {/* Crown top velvet */}
        <ellipse cx="50" cy="30" rx="18" ry="3" fill={s.base} stroke={s.stroke} strokeWidth="1" />
        {/* Cross */}
        <rect x="47" y="6" width="6" height="22" rx="2" fill={s.stroke} />
        <rect x="40" y="12" width="20" height="6" rx="2" fill={s.stroke} />
        {/* Cross shine */}
        <rect x="48" y="8" width="2" height="18" rx="1" fill={s.hl} opacity="0.6" />
        {/* Crown jewel center */}
        <circle cx="50" cy="40" r="3" fill={s.stroke} opacity="0.7" />
        {/* Body band */}
        <path d="M38 58 L62 58" stroke={s.hl} strokeWidth="2" opacity="0.5" />
        <path d="M36 64 L64 64" stroke={s.hl} strokeWidth="1.5" opacity="0.3" />
        {/* Body shine */}
        <ellipse cx="46" cy="60" rx="5" ry="8" fill={s.shine} opacity="0.3" />
        {/* Base highlight */}
        <path d="M28 80 L72 80" stroke={s.hl} strokeWidth="2" opacity="0.4" />
      </g>
    </svg>
  );
}

// ============================================================
// RENDER HELPER
// ============================================================
export function renderThemedPiece(
  type: string,
  color: "w" | "b",
  theme: ChessTheme,
  className?: string
) {
  const props: PieceProps = { color, theme, className };
  switch (type) {
    case "p": case "P": return <ThemePawn {...props} />;
    case "n": case "N": return <ThemeKnight {...props} />;
    case "b": case "B": return <ThemeBishop {...props} />;
    case "r": case "R": return <ThemeRook {...props} />;
    case "q": case "Q": return <ThemeQueen {...props} />;
    case "k": case "K": return <ThemeKing {...props} />;
    default: return null;
  }
}

// Legacy compat (used in captured pieces display, etc.)
export { ChessThemeDefs as ChessDefs };

import { getThemeById } from "./ChessThemes";

export function renderPremiumPiece(type: string, color: "w" | "b", className?: string) {
  return renderThemedPiece(type, color, getThemeById("neon"), className);
}
