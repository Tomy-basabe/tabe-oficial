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
    <img
      src="/universities/don-bosco.jpg"
      alt="Facultad Don Bosco"
      title="Facultad Don Bosco"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}

export function ITGCLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/ies-tomas-godoy-cruz.jpg"
      alt="IES 9-002 Tomás Godoy Cruz"
      title="IES 9-002 Tomás Godoy Cruz"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
    />
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
