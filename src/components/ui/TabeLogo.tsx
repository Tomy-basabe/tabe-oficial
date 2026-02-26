/**
 * Inline SVG of the TABE "T" logo, matching favicon.svg exactly.
 * Use this everywhere instead of lucide icons or generated images.
 */
export function TabeLogo({ size = 56, className = "" }: { size?: number; className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            width={size}
            height={size}
            className={className}
        >
            <defs>
                <linearGradient id="tabe-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "#0f0f1a" }} />
                    <stop offset="100%" style={{ stopColor: "#1a1a2e" }} />
                </linearGradient>
                <linearGradient id="tabe-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "#00d9ff" }} />
                    <stop offset="50%" style={{ stopColor: "#a855f7" }} />
                    <stop offset="100%" style={{ stopColor: "#f59e0b" }} />
                </linearGradient>
            </defs>
            <rect width="64" height="64" rx="14" fill="url(#tabe-bg)" />
            <rect x="2" y="2" width="60" height="60" rx="12" fill="none" stroke="url(#tabe-glow)" strokeWidth="2" opacity="0.6" />
            <text
                x="32"
                y="44"
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="900"
                fontSize="32"
                fill="url(#tabe-glow)"
            >
                T
            </text>
        </svg>
    );
}
