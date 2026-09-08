import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * UTN (Universidad Tecnológica Nacional) Official Emblem
 * Official colors: #003865 (UTN Deep Blue), #0072CE (UTN Bright Blue), White
 */
export function UTNLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <title>UTN - Universidad Tecnológica Nacional</title>
      <rect width="100" height="100" rx="20" fill="#003865" />
      {/* Outer Gear Ring */}
      <circle cx="50" cy="50" r="38" stroke="#00A3E0" strokeWidth="4" strokeDasharray="6 4" />
      <circle cx="50" cy="50" r="32" fill="#002244" stroke="#FFFFFF" strokeWidth="2" />
      {/* Central Caliper & Flame (Engineering symbol) */}
      <path
        d="M50 20 L58 40 L54 44 L50 34 L46 44 L42 40 Z"
        fill="#FFB81C"
      />
      <circle cx="50" cy="27" r="3.5" fill="#E03A3E" />
      {/* Caliper arms */}
      <path
        d="M50 36 C42 44 32 58 36 74 C37 77 40 77 42 74 C44 71 46 64 50 60 C54 64 56 71 58 74 C60 77 63 77 64 74 C68 58 58 44 50 36 Z"
        fill="#FFFFFF"
      />
      <circle cx="50" cy="50" r="4.5" fill="#003865" stroke="#00A3E0" strokeWidth="2" />
      {/* UTN Acronym */}
      <text
        x="50"
        y="88"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="sans-serif"
        fontWeight="900"
        fontSize="13"
        letterSpacing="2"
      >
        UTN
      </text>
    </svg>
  );
}

/**
 * UNCUYO (Universidad Nacional de Cuyo) Official Emblem
 * Official colors: #004F9F (UNCUYO Blue), #F4B400 (Andean Sun Gold), White
 */
export function UNCUYOLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <title>UNCUYO - Universidad Nacional de Cuyo</title>
      <rect width="100" height="100" rx="20" fill="#004F9F" />
      {/* Sun rays & disk */}
      <circle cx="50" cy="38" r="14" fill="#F4B400" />
      <g stroke="#F4B400" strokeWidth="2.5" strokeLinecap="round">
        <line x1="50" y1="18" x2="50" y2="22" />
        <line x1="50" y1="54" x2="50" y2="58" />
        <line x1="30" y1="38" x2="34" y2="38" />
        <line x1="66" y1="38" x2="70" y2="38" />
        <line x1="36" y1="24" x2="39" y2="27" />
        <line x1="64" y1="24" x2="61" y2="27" />
        <line x1="36" y1="52" x2="39" y2="49" />
        <line x1="64" y1="52" x2="61" y2="49" />
      </g>
      {/* Mountain silhouette (Cordillera de los Andes) */}
      <path
        d="M20 70 L38 46 L48 58 L62 42 L80 70 Z"
        fill="#002D62"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      {/* Andean Condor Wings */}
      <path
        d="M22 52 C32 46 44 48 50 56 C56 48 68 46 78 52 C72 58 64 62 50 63 C36 62 28 58 22 52 Z"
        fill="#FFFFFF"
      />
      <circle cx="50" cy="54" r="2.5" fill="#004F9F" />
      {/* Text UNCUYO */}
      <text
        x="50"
        y="88"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="sans-serif"
        fontWeight="900"
        fontSize="11"
        letterSpacing="1"
      >
        UNCUYO
      </text>
    </svg>
  );
}

/**
 * UNSJ (Universidad Nacional de San Juan) Official Emblem
 * Official colors: #8A1538 (UNSJ Claret), #D4AF37 (Gold), White
 */
export function UNSJLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <title>UNSJ - Universidad Nacional de San Juan</title>
      <rect width="100" height="100" rx="20" fill="#7A0026" />
      {/* Inner circular seal */}
      <circle cx="50" cy="46" r="30" stroke="#D4AF37" strokeWidth="2.5" />
      {/* Radiant Sun of San Juan */}
      <circle cx="50" cy="38" r="10" fill="#D4AF37" />
      {/* Mountain Peak (Pie de Palo / Cordillera) */}
      <path
        d="M26 62 L42 42 L52 52 L62 38 L74 62 Z"
        fill="#52001A"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      {/* Book of Science & Knowledge */}
      <path
        d="M34 68 C42 66 48 66 50 69 C52 66 58 66 66 68 L64 74 C58 72 52 72 50 75 C48 72 42 72 36 74 Z"
        fill="#FFFFFF"
      />
      {/* Acronym UNSJ */}
      <text
        x="50"
        y="89"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="sans-serif"
        fontWeight="900"
        fontSize="12"
        letterSpacing="2"
      >
        UNSJ
      </text>
    </svg>
  );
}

/**
 * UNLP (Universidad Nacional de La Plata) Official Emblem
 * Official colors: #002B49 (Navy), #C5A059 (Gold), White
 */
export function UNLPLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <title>UNLP - Universidad Nacional de La Plata</title>
      <rect width="100" height="100" rx="20" fill="#002B49" />
      {/* Academic Crest Frame */}
      <circle cx="50" cy="46" r="32" stroke="#C5A059" strokeWidth="3" />
      {/* Laurel Wreath branches */}
      <path
        d="M30 46 C30 32 40 24 50 24 C60 24 70 32 70 46 C70 60 58 66 50 66 C42 66 30 60 30 46 Z"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        fill="#001C31"
      />
      {/* Open Book of Knowledge */}
      <path
        d="M36 40 C42 38 48 39 50 42 C52 39 58 38 64 40 L64 56 C58 54 52 55 50 58 C48 55 42 54 36 56 Z"
        fill="#C5A059"
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />
      {/* Torch of light / illumination */}
      <path d="M50 30 L53 36 L47 36 Z" fill="#FFB81C" />
      <circle cx="50" cy="28" r="2" fill="#E03A3E" />
      {/* Text UNLP */}
      <text
        x="50"
        y="88"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="sans-serif"
        fontWeight="900"
        fontSize="12"
        letterSpacing="2"
      >
        UNLP
      </text>
    </svg>
  );
}

/**
 * Don Bosco (Facultad Don Bosco / Enología) Official Emblem
 * Official colors: #722F37 (Wine Burgundy), #E5A93C (Warm Gold), White
 */
export function DonBoscoLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <title>Facultad Don Bosco</title>
      <rect width="100" height="100" rx="20" fill="#6A1B29" />
      {/* Wine Chalice and Grapes Emblem */}
      <circle cx="50" cy="46" r="30" stroke="#E5A93C" strokeWidth="2.5" />
      {/* Cross of St. John Bosco */}
      <path d="M50 24 L50 44 M43 31 L57 31" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      {/* Stylized Grape Cluster */}
      <circle cx="50" cy="50" r="3.5" fill="#E5A93C" />
      <circle cx="44" cy="54" r="3.5" fill="#E5A93C" />
      <circle cx="56" cy="54" r="3.5" fill="#E5A93C" />
      <circle cx="47" cy="60" r="3" fill="#E5A93C" />
      <circle cx="53" cy="60" r="3" fill="#E5A93C" />
      <circle cx="50" cy="65" r="2.5" fill="#E5A93C" />
      {/* Text Don Bosco */}
      <text
        x="50"
        y="88"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="sans-serif"
        fontWeight="900"
        fontSize="9"
        letterSpacing="1"
      >
        DON BOSCO
      </text>
    </svg>
  );
}

/**
 * IES Tomás Godoy Cruz Official Emblem
 * Official colors: #1E3A8A (Royal Navy), #F59E0B (Amber Gold), White
 */
export function ITGCLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      <title>IES 9-002 Tomás Godoy Cruz</title>
      <rect width="100" height="100" rx="20" fill="#1E3A8A" />
      <circle cx="50" cy="46" r="30" stroke="#F59E0B" strokeWidth="2.5" />
      {/* Torch of Teaching / Pedagogy */}
      <path d="M50 25 L54 38 L46 38 Z" fill="#F59E0B" />
      <circle cx="50" cy="22" r="3" fill="#EF4444" />
      <path d="M47 38 L48 55 L52 55 L53 38 Z" fill="#FFFFFF" />
      {/* Open Book */}
      <path
        d="M34 52 C42 50 48 51 50 54 C52 51 58 50 66 52 L66 66 C58 64 52 65 50 68 C48 65 42 64 34 66 Z"
        fill="#FFFFFF"
        stroke="#1E3A8A"
        strokeWidth="1.5"
      />
      {/* Text IES 9-002 */}
      <text
        x="50"
        y="88"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="sans-serif"
        fontWeight="900"
        fontSize="10"
        letterSpacing="1"
      >
        IES 9-002
      </text>
    </svg>
  );
}

/**
 * Universal University Logo resolver component
 */
export function UniversityLogo({
  universityId,
  className = "w-6 h-6",
  size,
}: {
  universityId: string;
  className?: string;
  size?: number;
}) {
  const norm = (universityId || "").toLowerCase();

  if (norm.includes("utn")) {
    return <UTNLogo className={className} size={size} />;
  }

  if (norm.includes("uncuyo") || norm.includes("cuyo")) {
    return <UNCUYOLogo className={className} size={size} />;
  }

  if (norm.includes("unsj") || norm.includes("san juan")) {
    return <UNSJLogo className={className} size={size} />;
  }

  if (norm.includes("unlp") || norm.includes("la plata")) {
    return <UNLPLogo className={className} size={size} />;
  }

  if (norm.includes("bosco") || norm.includes("donbosco") || norm.includes("enologia")) {
    return <DonBoscoLogo className={className} size={size} />;
  }

  if (norm.includes("itgc") || norm.includes("godoy") || norm.includes("ies")) {
    return <ITGCLogo className={className} size={size} />;
  }

  // Fallback to UNCUYO/UTN clean emblem
  return <UNCUYOLogo className={className} size={size} />;
}
