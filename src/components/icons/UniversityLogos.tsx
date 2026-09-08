import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

// ─────────────────────────────────────────────
// Logos con imagen oficial
// ─────────────────────────────────────────────

export function UTNLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/utn.png"
      alt="UTN - Universidad Tecnológica Nacional"
      title="UTN - Universidad Tecnológica Nacional"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}

export function UNCUYOLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/uncuyo.png"
      alt="UNCUYO - Universidad Nacional de Cuyo"
      title="UNCUYO - Universidad Nacional de Cuyo"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}

export function UNSJLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/unsj.png"
      alt="UNSJ - Universidad Nacional de San Juan"
      title="UNSJ - Universidad Nacional de San Juan"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}

export function UNLPLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/unlp.png"
      alt="UNLP - Universidad Nacional de La Plata"
      title="UNLP - Universidad Nacional de La Plata"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}

// ─────────────────────────────────────────────
// Logos SVG (sin imagen oficial proporcionada)
// ─────────────────────────────────────────────

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
      <text x="50" y="88" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="900" fontSize="9" letterSpacing="1">
        DON BOSCO
      </text>
    </svg>
  );
}

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
      <path d="M50 25 L54 38 L46 38 Z" fill="#F59E0B" />
      <circle cx="50" cy="22" r="3" fill="#EF4444" />
      <path d="M47 38 L48 55 L52 55 L53 38 Z" fill="#FFFFFF" />
      <path
        d="M34 52 C42 50 48 51 50 54 C52 51 58 50 66 52 L66 66 C58 64 52 65 50 68 C48 65 42 64 34 66 Z"
        fill="#FFFFFF"
        stroke="#1E3A8A"
        strokeWidth="1.5"
      />
      <text x="50" y="88" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="900" fontSize="10" letterSpacing="1">
        IES 9-002
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────
// Resolver universal
// ─────────────────────────────────────────────

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

  // Fallback
  return <UNCUYOLogo className={className} size={size} />;
}
