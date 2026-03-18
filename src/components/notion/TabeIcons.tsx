/**
 * T.A.B.E. Custom Icons — SVG icon system
 * Replaces native emojis with custom neon-style icons that match the gamer aesthetic.
 * Each icon is a React component returning inline SVG.
 */

import React from "react";

// === TYPE ===
export interface TabeIcon {
    id: string;
    name: string;
    category: string;
    component: React.FC<{ size?: number; className?: string }>;
    /** Fallback character for text-only contexts */
    fallback: string;
}

// === SVG ICON COMPONENTS ===
// Mini neon-line-art style icons, 24x24 viewBox, stroke-based

const IconBook: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 7h6M9 11h4" stroke="url(#neon1)" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon1" x1="9" y1="7" x2="15" y2="11"><stop stopColor="#a855f7" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconPen: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 5l4 4" stroke="url(#neon2)" strokeWidth="1.5" />
        <defs><linearGradient id="neon2" x1="15" y1="5" x2="19" y2="9"><stop stopColor="#f59e0b" /><stop offset="1" stopColor="#ef4444" /></linearGradient></defs>
    </svg>
);

const IconFlask: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 3h6M10 3v6.5L4 20a1 1 0 00.87 1.5h14.26A1 1 0 0020 20l-6-10.5V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 15h10" stroke="url(#neon3)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="9" cy="18" r="1" fill="#22d3ee" />
        <circle cx="13" cy="17" r="0.8" fill="#a855f7" />
        <defs><linearGradient id="neon3" x1="7" y1="15" x2="17" y2="15"><stop stopColor="#22d3ee" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
    </svg>
);

const IconCode: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M16 18l6-6-6-6" stroke="url(#neon4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14.5 4l-5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <defs><linearGradient id="neon4" x1="16" y1="6" x2="22" y2="18"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

const IconTarget: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <circle cx="12" cy="12" r="2" fill="url(#neon5)" />
        <defs><radialGradient id="neon5"><stop stopColor="#ef4444" /><stop offset="1" stopColor="#f59e0b" /></radialGradient></defs>
    </svg>
);

const IconBrain: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 2a6 6 0 00-6 6c0 2.5 1.5 4.5 3 5.5V22h6v-8.5c1.5-1 3-3 3-5.5a6 6 0 00-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <path d="M10 18h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <circle cx="10" cy="9" r="1" fill="url(#neon6)" />
        <circle cx="14" cy="9" r="1" fill="url(#neon6)" />
        <defs><radialGradient id="neon6"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#f59e0b" /></radialGradient></defs>
    </svg>
);

const IconRocket: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.7-.84.7-1.98 0-2.83a1.97 1.97 0 00-3 .17z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 13l-2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15.5 2.5s5 2.04 5 8c0 3.16-2 5.7-4.5 7.5L13 15l-3-3 3-3c1.8-2.5 2.5-6.5 2.5-6.5z" stroke="url(#neon7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16.5" cy="8.5" r="1" fill="currentColor" />
        <defs><linearGradient id="neon7" x1="10" y1="2" x2="20" y2="18"><stop stopColor="#f59e0b" /><stop offset="0.5" stopColor="#ef4444" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
    </svg>
);

const IconStar: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="url(#neon8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon8" x1="2" y1="2" x2="22" y2="22"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#f59e0b" /></linearGradient></defs>
    </svg>
);

const IconLightning: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="url(#neon9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon9" x1="3" y1="2" x2="22" y2="22"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#ef4444" /></linearGradient></defs>
    </svg>
);

const IconHeart: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="url(#neon10)" strokeWidth="1.5" />
        <defs><linearGradient id="neon10" x1="2" y1="3" x2="22" y2="22"><stop stopColor="#ec4899" /><stop offset="1" stopColor="#ef4444" /></linearGradient></defs>
    </svg>
);

const IconMath: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M5 8h6M8 5v6" stroke="url(#neon11)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 7l6 6M20 7l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <path d="M5 17h1.5l1.5-3 2 6 1.5-3H13" stroke="url(#neon11)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon11" x1="5" y1="5" x2="13" y2="20"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

const IconGlobe: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="12" cy="12" rx="4" ry="10" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <path d="M2 12h20" stroke="url(#neon12)" strokeWidth="1.5" />
        <defs><linearGradient id="neon12" x1="2" y1="12" x2="22" y2="12"><stop stopColor="#22d3ee" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
    </svg>
);

const IconMusic: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6" cy="18" r="3" stroke="url(#neon13)" strokeWidth="1.5" />
        <circle cx="18" cy="16" r="3" stroke="url(#neon13)" strokeWidth="1.5" />
        <defs><linearGradient id="neon13" x1="3" y1="13" x2="21" y2="19"><stop stopColor="#ec4899" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

const IconPalette: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 2a10 10 0 00-1 19.95c.56.05 1.05-.38 1.05-.95v-2.4c0-.83.68-1.5 1.5-1.5h2.4c.83 0 1.5-.68 1.5-1.5a4 4 0 00-4-4H12a10 10 0 010-9.6z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="7.5" cy="10.5" r="1.2" fill="#ef4444" />
        <circle cx="12" cy="7.5" r="1.2" fill="#fbbf24" />
        <circle cx="16.5" cy="10.5" r="1.2" fill="#22d3ee" />
        <circle cx="9" cy="14.5" r="1.2" fill="#a855f7" />
    </svg>
);

const IconCrown: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M2 20h20L19 7l-5 5-2-8-2 8-5-5-3 13z" stroke="url(#neon14)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon14" x1="2" y1="4" x2="22" y2="20"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#f59e0b" /></linearGradient></defs>
    </svg>
);

const IconShield: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 12l2 2 4-4" stroke="url(#neon15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon15" x1="9" y1="10" x2="15" y2="14"><stop stopColor="#22c55e" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconFire: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 22c4.97 0 8-3.03 8-7 0-3-2-5.5-4-7.5-1 1-1.5 2.5-2.5 2.5S12 8 12 6c0-1 .5-2 1-3-1 0-3 1-5 3-2.5 2.5-4 5-4 8 0 4.42 3.58 8 8 8z" stroke="url(#neon16)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 22c-2 0-3-1.5-3-3.5 0-2 1.5-3 3-4.5 1.5 1.5 3 2.5 3 4.5S14 22 12 22z" stroke="url(#neon16b)" strokeWidth="1.5" />
        <defs>
            <linearGradient id="neon16" x1="4" y1="3" x2="20" y2="22"><stop stopColor="#f59e0b" /><stop offset="1" stopColor="#ef4444" /></linearGradient>
            <linearGradient id="neon16b" x1="9" y1="14" x2="15" y2="22"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#f59e0b" /></linearGradient>
        </defs>
    </svg>
);

const IconGamepad: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4 8a4 4 0 014-4h8a4 4 0 014 4v2a8 8 0 01-16 0V8z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 8v4M6 10h4" stroke="url(#neon17)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="15" cy="9" r="1" fill="url(#neon17)" />
        <circle cx="17" cy="11" r="1" fill="currentColor" opacity="0.5" />
        <defs><linearGradient id="neon17" x1="6" y1="8" x2="18" y2="12"><stop stopColor="#a855f7" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconLeaf: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 0-8 0-5 5z" stroke="url(#neon18)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <path d="M4 21c4-6 8-9 14-16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        <defs><linearGradient id="neon18" x1="3" y1="3" x2="22" y2="22"><stop stopColor="#22c55e" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconDiamond: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M6 3h12l4 6-10 13L2 9l4-6z" stroke="url(#neon19)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 9h20" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        <path d="M10 3l-2 6 4 13 4-13-2-6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.3" />
        <defs><linearGradient id="neon19" x1="2" y1="3" x2="22" y2="22"><stop stopColor="#06b6d4" /><stop offset="0.5" stopColor="#8b5cf6" /><stop offset="1" stopColor="#ec4899" /></linearGradient></defs>
    </svg>
);

const IconAtom: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <ellipse cx="12" cy="12" rx="10" ry="4" stroke="url(#neon20)" strokeWidth="1.5" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="1.5" transform="rotate(120 12 12)" opacity="0.5" />
        <circle cx="12" cy="12" r="2" fill="url(#neon20b)" />
        <defs>
            <linearGradient id="neon20" x1="2" y1="8" x2="22" y2="16"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient>
            <radialGradient id="neon20b"><stop stopColor="#22d3ee" /><stop offset="1" stopColor="#8b5cf6" /></radialGradient>
        </defs>
    </svg>
);

// === NEW ICONS (50 MORE) ===

// Estudio (10)
const IconClock: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 6v6l4 2" stroke="url(#neon21)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon21" x1="12" y1="6" x2="16" y2="14"><stop stopColor="#a855f7" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconCalendar: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16 2v4M8 2v4M3 10h18" stroke="url(#neon22)" strokeWidth="1.5" />
        <defs><linearGradient id="neon22" x1="3" y1="2" x2="21" y2="10"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#ef4444" /></linearGradient></defs>
    </svg>
);

const IconTrophy: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 5c0 6 2 9 6 9s6-3 6-9H6z" stroke="url(#neon23)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 14v4M9 22h6" stroke="currentColor" strokeWidth="1.5" />
        <defs><linearGradient id="neon23" x1="6" y1="5" x2="18" y2="14"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#f59e0b" /></linearGradient></defs>
    </svg>
);

const IconMedal: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="8" r="7" stroke="url(#neon24)" strokeWidth="1.5" />
        <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <defs><linearGradient id="neon24" x1="5" y1="1" x2="19" y2="15"><stop stopColor="#a855f7" /><stop offset="1" stopColor="#ec4899" /></linearGradient></defs>
    </svg>
);

const IconGraduation: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M22 10L12 5 2 10l10 5 10-5z" stroke="url(#neon25)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon25" x1="2" y1="5" x2="22" y2="15"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

const IconLightbulb: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 18h6M10 22h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 2a7 7 0 00-7 7c0 2.3 1.1 4.5 3 6v1a1 1 0 001 1h6a1 1 0 001-1v-1c1.9-1.5 3-3.7 3-6a7 7 0 00-7-7z" stroke="url(#neon26)" strokeWidth="1.5" />
        <defs><linearGradient id="neon26" x1="5" y1="2" x2="19" y2="16"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#f59e0b" /></linearGradient></defs>
    </svg>
);

const IconCompass: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" stroke="url(#neon27)" strokeWidth="1.5" strokeLinejoin="round" />
        <defs><linearGradient id="neon27" x1="7" y1="7" x2="17" y2="17"><stop stopColor="#ef4444" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconMap: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9 3v15M15 6v15" stroke="url(#neon28)" strokeWidth="1.5" opacity="0.6" />
        <defs><linearGradient id="neon28" x1="9" y1="3" x2="15" y2="21"><stop stopColor="#22c55e" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconSearch: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="11" cy="11" r="8" stroke="url(#neon29)" strokeWidth="1.5" />
        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon29" x1="3" y1="3" x2="19" y2="19"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
    </svg>
);

const IconBookmark: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" stroke="url(#neon30)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon30" x1="5" y1="3" x2="19" y2="21"><stop stopColor="#ec4899" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

// Ciencia (10)
const IconDna: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M8 3c0 4 8 5 8 9s-8 5-8 9M16 3c0 4-8 5-8 9s8 5 8 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <path d="M8 7h8M8 12h8M8 17h8" stroke="url(#neon31)" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon31" x1="8" y1="7" x2="16" y2="17"><stop stopColor="#22d3ee" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
    </svg>
);

const IconBacteria: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 21a9 9 0 100-18 9 9 0 000 18z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9" cy="9" r="1.5" fill="url(#neon32)" />
        <circle cx="15" cy="13" r="1" fill="currentColor" opacity="0.6" />
        <circle cx="11" cy="15" r="1.2" fill="url(#neon32)" />
        <defs><radialGradient id="neon32"><stop stopColor="#22c55e" /><stop offset="1" stopColor="#06b6d4" /></radialGradient></defs>
    </svg>
);

const IconSatellite: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M13 7l5 5M9 11l5 5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M17 2l5 5-10 10-5-5L17 2z" stroke="url(#neon33)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M4.5 14.5c-1.5 1.5-1.5 3.5 0 5s3.5 1.5 5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <circle cx="3" cy="21" r="1" fill="currentColor" />
        <defs><linearGradient id="neon33" x1="17" y1="2" x2="12" y2="17"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

const IconTelescope: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M3 21l3-3M12 21l-3-3M6 18h6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M19 3l-11 11 3 3 11-11-3-3z" stroke="url(#neon34)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M14 5l3 3" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <defs><linearGradient id="neon34" x1="19" y1="3" x2="8" y2="14"><stop stopColor="#a855f7" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconRobot: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="5" y="8" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 12h.01M15 12h.01" stroke="url(#neon35)" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 8V5M10 5h4M5 14H3M19 14h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon35" x1="9" y1="12" x2="15" y2="12"><stop stopColor="#22d3ee" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
    </svg>
);

const IconBattery: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="2" y="7" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M22 11v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 10v4" stroke="url(#neon36)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 10v4" stroke="url(#neon36)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        <path d="M11 10v4" stroke="url(#neon36)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <defs><linearGradient id="neon36" x1="5" y1="10" x2="11" y2="14"><stop stopColor="#22c55e" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconBolt: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="url(#neon37)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon37" x1="3" y1="2" x2="22" y2="22"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#ef4444" /></linearGradient></defs>
    </svg>
);

const IconMagnet: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M17 11V5a5 5 0 00-10 0v6M5 11h4M15 11h4M5 15l2 3M19 15l-2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 11v4c0 2.76 2.24 5 5 5s5-2.24 5-5v-4" stroke="url(#neon38)" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon38" x1="7" y1="11" x2="17" y2="20"><stop stopColor="#ef4444" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconPill: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4.83 4.83a6.6 6.6 0 119.34 9.34l-7.07 7.07a6.6 6.6 0 11-9.34-9.34l7.07-7.07z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8.5 8.5l7 7" stroke="url(#neon39)" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon39" x1="8.5" y1="8.5" x2="15.5" y2="15.5"><stop stopColor="#ec4899" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

const IconMicroscope: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M6 18h6M3 21h12M6 14h6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 3v8M12 5l-3 3M12 11a3 3 0 11-6 0" stroke="url(#neon40)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="9" cy="4" r="1" stroke="currentColor" strokeWidth="1" />
        <defs><linearGradient id="neon40" x1="6" y1="3" x2="12" y2="14"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#22c55e" /></linearGradient></defs>
    </svg>
);

// Gaming (10)
const IconSword: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M14.5 17.5L3 6V3h3l11.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 19l4 4M19 13l4 4M15 15l6 6" stroke="url(#neon41)" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon41" x1="13" y1="13" x2="23" y2="23"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

const IconAxe: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M14 12V4a1 1 0 00-1-1H7a1 1 0 00-1 1v8l4 4 4-4z" stroke="url(#neon42)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M10 16l-7 7M8 18l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon42" x1="6" y1="3" x2="14" y2="16"><stop stopColor="#ef4444" /><stop offset="1" stopColor="#f59e0b" /></linearGradient></defs>
    </svg>
);

const IconBow: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M22 2L2 22M22 10V2H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 3c1 5 1 10 0 13a15 15 0 0113 0" stroke="url(#neon43)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <defs><linearGradient id="neon43" x1="8" y1="3" x2="21" y2="16"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#ef4444" /></linearGradient></defs>
    </svg>
);

const IconPotion: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 3h6M10 3v4l-4 8a4 4 0 004 5h4a4 4 0 004-5l-4-8V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 15h10" stroke="url(#neon44)" strokeWidth="1.5" />
        <circle cx="10" cy="17" r="1" fill="url(#neon44)" />
        <defs><linearGradient id="neon44" x1="7" y1="15" x2="17" y2="20"><stop stopColor="#a855f7" /><stop offset="1" stopColor="#ec4899" /></linearGradient></defs>
    </svg>
);

const IconSkull: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 2a8 8 0 00-8 8v3a4 4 0 004 4h8a4 4 0 004-4v-3a8 8 0 00-8-8z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9" cy="10" r="1.5" fill="url(#neon45)" />
        <circle cx="15" cy="10" r="1.5" fill="url(#neon45)" />
        <path d="M10 14h4M12 14v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <defs><linearGradient id="neon45" x1="9" y1="10" x2="15" y2="10"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

const IconGhost: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 10h.01M15 10h.01" stroke="url(#neon46)" strokeWidth="2" strokeLinecap="round" />
        <path d="M18 11V7a6 6 0 00-12 0v10c0 2 2 4 4 4l2-2 2 2 2-2 2 2c2 0 4-2 4-4v-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon46" x1="9" y1="10" x2="15" y2="10"><stop stopColor="#22d3ee" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
    </svg>
);

const IconAlien: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 2C7 2 3 7 3 12c0 4 3 9 9 10 6-1 9-6 9-10 0-5-4-10-9-10z" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="8" cy="12" rx="2" ry="4" fill="url(#neon47)" transform="rotate(-20 8 12)" />
        <ellipse cx="16" cy="12" rx="2" ry="4" fill="url(#neon47)" transform="rotate(20 16 12)" />
        <defs><linearGradient id="neon47" x1="8" y1="12" x2="16" y2="12"><stop stopColor="#22c55e" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconJoystick: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="6" y="15" width="12" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 15V6M10 6h4M12 6a3 3 0 100-6 3 3 0 000 6z" stroke="url(#neon48)" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon48" x1="12" y1="2" x2="12" y2="15"><stop stopColor="#a855f7" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconMonitor: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 7h12" stroke="url(#neon49)" strokeWidth="1.5" opacity="0.6" />
        <defs><linearGradient id="neon49" x1="6" y1="7" x2="18" y2="7"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

const IconMouse: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="6" y="3" width="12" height="18" rx="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 3v4M6 10h12" stroke="url(#neon50)" strokeWidth="1.5" opacity="0.4" />
        <defs><linearGradient id="neon50" x1="12" y1="3" x2="12" y2="10"><stop stopColor="#f59e0b" /><stop offset="1" stopColor="#ef4444" /></linearGradient></defs>
    </svg>
);

// Expresiones (10)
const IconSun: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="5" stroke="url(#neon51)" strokeWidth="1.5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon51" x1="7" y1="7" x2="17" y2="17"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#f59e0b" /></linearGradient></defs>
    </svg>
);

const IconMoon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="url(#neon52)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon52" x1="11" y1="3" x2="21" y2="13"><stop stopColor="#a855f7" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconCloud: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" stroke="url(#neon53)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon53" x1="5" y1="10" x2="18" y2="20"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

const IconRain: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M16 13a4 4 0 00-8 0" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <path d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 19v2M12 19v2M16 19v2" stroke="url(#neon54)" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon54" x1="8" y1="19" x2="16" y2="21"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
    </svg>
);

const IconSnowflake: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 2v20M20 12H4M17.66 17.66L6.34 6.34M17.66 6.34L6.34 17.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <path d="M12 2l2 2-2 2-2-2 2-2zM22 12l-2 2-2-2 2-2 2 2zM12 22l-2-2 2-2 2 2-2 2zM2 12l2-2 2 2-2 2-2-2z" stroke="url(#neon55)" strokeWidth="1.5" />
        <defs><linearGradient id="neon55" x1="2" y1="2" x2="22" y2="22"><stop stopColor="#22d3ee" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconWind: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 4c0 2-2 3-2 3M17 10h-8M17 14h-5M13 18h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <path d="M20 4h-11a3 3 0 100 6h11M17 14H4a3 3 0 110-6h1M13 18H7a3 3 0 100 6h1" stroke="url(#neon56)" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon56" x1="4" y1="4" x2="20" y2="18"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#22c55e" /></linearGradient></defs>
    </svg>
);

const IconAnchor: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 8v12M5 12H2M22 12h-3M5 12a7 7 0 0014 0" stroke="url(#neon57)" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon57" x1="5" y1="12" x2="19" y2="20"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

const IconKey: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="7.5" cy="15.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M21 2l-9.6 9.6M15.5 7.5l2 2M18.5 4.5l2 2" stroke="url(#neon58)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="7.5" cy="15.5" r="1" fill="url(#neon58)" />
        <defs><linearGradient id="neon58" x1="12" y1="2" x2="21" y2="11"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#ef4444" /></linearGradient></defs>
    </svg>
);

const IconLock: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 11V7a5 5 0 0110 0v4" stroke="url(#neon59)" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon59" x1="7" y1="4" x2="17" y2="11"><stop stopColor="#a855f7" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconBell: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z" stroke="url(#neon60)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.5" />
        <defs><linearGradient id="neon60" x1="6" y1="4" x2="18" y2="17"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#f59e0b" /></linearGradient></defs>
    </svg>
);

// Ocio (10)
const IconCamera: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="13" r="4" stroke="url(#neon61)" strokeWidth="1.5" />
        <defs><linearGradient id="neon61" x1="8" y1="9" x2="16" y2="17"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
    </svg>
);

const IconMic: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="9" y="2" width="6" height="11" rx="3" stroke="url(#neon62)" strokeWidth="1.5" />
        <path d="M19 10v1a7 7 0 01-14 0v-1M12 21v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon62" x1="9" y1="2" x2="15" y2="13"><stop stopColor="#ec4899" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

const IconSpeaker: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="14" r="4" stroke="url(#neon63)" strokeWidth="1.5" />
        <circle cx="12" cy="6" r="2" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <defs><linearGradient id="neon63" x1="8" y1="10" x2="16" y2="18"><stop stopColor="#a855f7" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
    </svg>
);

const IconHeadphones: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M3 18v-6a9 9 0 0118 0v6" stroke="url(#neon64)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="14" width="4" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="17" y="14" width="4" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <defs><linearGradient id="neon64" x1="3" y1="6" x2="21" y2="18"><stop stopColor="#ec4899" /><stop offset="1" stopColor="#ef4444" /></linearGradient></defs>
    </svg>
);

const IconTv: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="2" y="7" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M17 2l-5 5-5-5" stroke="url(#neon65)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon65" x1="7" y1="2" x2="17" y2="7"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

const IconPhone: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 18h.01" stroke="url(#neon66)" strokeWidth="2" strokeLinecap="round" />
        <defs><linearGradient id="neon66" x1="12" y1="18" x2="12" y2="18.1"><stop stopColor="#22d3ee" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
    </svg>
);

const IconMail: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M22 6l-10 7L2 6" stroke="url(#neon67)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon67" x1="2" y1="6" x2="22" y2="13"><stop stopColor="#06b6d4" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    </svg>
);

const IconGift: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="8" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 22V8M3 12h18M12 8a4 4 0 01-4-4 4 4 0 118 0 4 4 0 01-4 4z" stroke="url(#neon68)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs><linearGradient id="neon68" x1="3" y1="4" x2="21" y2="22"><stop stopColor="#ec4899" /><stop offset="1" stopColor="#ef4444" /></linearGradient></defs>
    </svg>
);

const IconCoffee: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 1v3M10 1v3M14 1v3" stroke="url(#neon69)" strokeWidth="1.5" strokeLinecap="round" />
        <defs><linearGradient id="neon69" x1="6" y1="1" x2="14" y2="4"><stop stopColor="#f59e0b" /><stop offset="1" stopColor="#ec4899" /></linearGradient></defs>
    </svg>
);

const IconPizza: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M15 11l-3 3M12 7l-2 2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <path d="M20 11L4 3l8 17 8-9z" stroke="url(#neon70)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M2 3l18 8-1 1" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <defs><linearGradient id="neon70" x1="4" y1="3" x2="20" y2="11"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#ef4444" /></linearGradient></defs>
    </svg>
);

// === ICON CATALOG ===
export const tabeIcons: TabeIcon[] = [
    // Estudio
    { id: "book", name: "Libro", category: "Estudio", component: IconBook, fallback: "📖" },
    { id: "pen", name: "Pluma", category: "Estudio", component: IconPen, fallback: "✏️" },
    { id: "brain", name: "Cerebro", category: "Estudio", component: IconBrain, fallback: "🧠" },
    { id: "target", name: "Objetivo", category: "Estudio", component: IconTarget, fallback: "🎯" },
    { id: "lightning", name: "Rayo", category: "Estudio", component: IconLightning, fallback: "⚡" },
    { id: "clock", name: "Reloj", category: "Estudio", component: IconClock, fallback: "⏰" },
    { id: "calendar", name: "Calendario", category: "Estudio", component: IconCalendar, fallback: "📅" },
    { id: "trophy", name: "Trofeo", category: "Estudio", component: IconTrophy, fallback: "🏆" },
    { id: "medal", name: "Medalla", category: "Estudio", component: IconMedal, fallback: "🏅" },
    { id: "graduation", name: "Birrete", category: "Estudio", component: IconGraduation, fallback: "🎓" },
    { id: "lightbulb", name: "Bombilla", category: "Estudio", component: IconLightbulb, fallback: "💡" },
    { id: "compass", name: "Brújula", category: "Estudio", component: IconCompass, fallback: "🧭" },
    { id: "map", name: "Mapa", category: "Estudio", component: IconMap, fallback: "🗺️" },
    { id: "search", name: "Lupa", category: "Estudio", component: IconSearch, fallback: "🔍" },
    { id: "bookmark", name: "Marcador", category: "Estudio", component: IconBookmark, fallback: "🔖" },
    // Ciencia
    { id: "flask", name: "Matraz", category: "Ciencia", component: IconFlask, fallback: "🧪" },
    { id: "atom", name: "Átomo", category: "Ciencia", component: IconAtom, fallback: "⚛️" },
    { id: "math", name: "Matemática", category: "Ciencia", component: IconMath, fallback: "🧮" },
    { id: "code", name: "Código", category: "Ciencia", component: IconCode, fallback: "💻" },
    { id: "globe", name: "Mundo", category: "Ciencia", component: IconGlobe, fallback: "🌍" },
    { id: "dna", name: "ADN", category: "Ciencia", component: IconDna, fallback: "🧬" },
    { id: "bacteria", name: "Bacteria", category: "Ciencia", component: IconBacteria, fallback: "🦠" },
    { id: "satellite", name: "Satélite", category: "Ciencia", component: IconSatellite, fallback: "🛰️" },
    { id: "telescope", name: "Telescopio", category: "Ciencia", component: IconTelescope, fallback: "🔭" },
    { id: "robot", name: "Robot", category: "Ciencia", component: IconRobot, fallback: "🤖" },
    { id: "battery", name: "Batería", category: "Ciencia", component: IconBattery, fallback: "🔋" },
    { id: "bolt", name: "Voltio", category: "Ciencia", component: IconBolt, fallback: "⚡" },
    { id: "magnet", name: "Imán", category: "Ciencia", component: IconMagnet, fallback: "🧲" },
    { id: "pill", name: "Píldora", category: "Ciencia", component: IconPill, fallback: "💊" },
    { id: "microscope", name: "Microscopio", category: "Ciencia", component: IconMicroscope, fallback: "🔬" },
    // Gaming
    { id: "rocket", name: "Cohete", category: "Gaming", component: IconRocket, fallback: "🚀" },
    { id: "fire", name: "Fuego", category: "Gaming", component: IconFire, fallback: "🔥" },
    { id: "crown", name: "Corona", category: "Gaming", component: IconCrown, fallback: "👑" },
    { id: "shield", name: "Escudo", category: "Gaming", component: IconShield, fallback: "🛡️" },
    { id: "gamepad", name: "Control", category: "Gaming", component: IconGamepad, fallback: "🎮" },
    { id: "diamond", name: "Diamante", category: "Gaming", component: IconDiamond, fallback: "💎" },
    { id: "sword", name: "Espada", category: "Gaming", component: IconSword, fallback: "⚔️" },
    { id: "axe", name: "Hacha", category: "Gaming", component: IconAxe, fallback: "🪓" },
    { id: "bow", name: "Arco", category: "Gaming", component: IconBow, fallback: "🏹" },
    { id: "potion", name: "Poción", category: "Gaming", component: IconPotion, fallback: "🧪" },
    { id: "skull", name: "Calavera", category: "Gaming", component: IconSkull, fallback: "💀" },
    { id: "ghost", name: "Fantasma", category: "Gaming", component: IconGhost, fallback: "👻" },
    { id: "alien", name: "Alien", category: "Gaming", component: IconAlien, fallback: "👽" },
    { id: "joystick", name: "Joystick", category: "Gaming", component: IconJoystick, fallback: "🕹️" },
    { id: "monitor", name: "Monitor", category: "Gaming", component: IconMonitor, fallback: "🖥️" },
    { id: "mouse", name: "Ratón", category: "Gaming", component: IconMouse, fallback: "🖱️" },
    // Expresiones
    { id: "star", name: "Estrella", category: "Expresiones", component: IconStar, fallback: "⭐" },
    { id: "heart", name: "Corazón", category: "Expresiones", component: IconHeart, fallback: "❤️" },
    { id: "leaf", name: "Hoja", category: "Expresiones", component: IconLeaf, fallback: "🌿" },
    { id: "music", name: "Música", category: "Expresiones", component: IconMusic, fallback: "🎵" },
    { id: "palette", name: "Paleta", category: "Expresiones", component: IconPalette, fallback: "🎨" },
    { id: "sun", name: "Sol", category: "Expresiones", component: IconSun, fallback: "☀️" },
    { id: "moon", name: "Luna", category: "Expresiones", component: IconMoon, fallback: "🌙" },
    { id: "cloud", name: "Nube", category: "Expresiones", component: IconCloud, fallback: "☁️" },
    { id: "rain", name: "Lluvia", category: "Expresiones", component: IconRain, fallback: "🌧️" },
    { id: "snowflake", name: "Nieve", category: "Expresiones", component: IconSnowflake, fallback: "❄️" },
    { id: "wind", name: "Viento", category: "Expresiones", component: IconWind, fallback: "💨" },
    { id: "anchor", name: "Ancla", category: "Expresiones", component: IconAnchor, fallback: "⚓" },
    { id: "key", name: "Llave", category: "Expresiones", component: IconKey, fallback: "🔑" },
    { id: "lock", name: "Candado", category: "Expresiones", component: IconLock, fallback: "🔒" },
    { id: "bell", name: "Campana", category: "Expresiones", component: IconBell, fallback: "🔔" },
    // Ocio
    { id: "camera", name: "Cámara", category: "Ocio", component: IconCamera, fallback: "📷" },
    { id: "mic", name: "Micro", category: "Ocio", component: IconMic, fallback: "🎤" },
    { id: "speaker", name: "Altavoz", category: "Ocio", component: IconSpeaker, fallback: "🔊" },
    { id: "headphones", name: "Auriculares", category: "Ocio", component: IconHeadphones, fallback: "🎧" },
    { id: "tv", name: "TV", category: "Ocio", component: IconTv, fallback: "📺" },
    { id: "phone", name: "Fono", category: "Ocio", component: IconPhone, fallback: "📱" },
    { id: "mail", name: "Correo", category: "Ocio", component: IconMail, fallback: "📧" },
    { id: "gift", name: "Regalo", category: "Ocio", component: IconGift, fallback: "🎁" },
    { id: "coffee", name: "Café", category: "Ocio", component: IconCoffee, fallback: "☕" },
    { id: "pizza", name: "Pizza", category: "Ocio", component: IconPizza, fallback: "🍕" },
];

// Helpers
export const getIconById = (id: string): TabeIcon | undefined =>
    tabeIcons.find((i) => i.id === id);

export const getIconCategories = (): string[] =>
    [...new Set(tabeIcons.map((i) => i.category))];

/**
 * Renders a T.A.B.E. icon by ID. Falls back to the stored string if not a custom icon.
 */
export function TabeIconRenderer({
    iconId,
    size = 24,
    className,
}: {
    iconId: string;
    size?: number;
    className?: string;
}) {
    const icon = getIconById(iconId);
    if (icon) {
        const Comp = icon.component;
        return <Comp size={size} className={className} />;
    }
    // Legacy fallback: render as text (old emoji)
    return <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>{iconId}</span>;
}
