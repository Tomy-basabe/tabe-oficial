import React from "react";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

interface LogoProps {
  className?: string;
  size?: number;
}

// ─────────────────────────────────────────────
// Componentes de Logos Oficiales
// ─────────────────────────────────────────────

export function UTNLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/utn.png"
      alt="UTN - Universidad Tecnológica Nacional"
      title="UTN - Universidad Tecnológica Nacional"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
      loading="lazy"
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
      loading="lazy"
    />
  );
}

export function UMendozaLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/umendoza.png"
      alt="Universidad de Mendoza"
      title="Universidad de Mendoza"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
      loading="lazy"
    />
  );
}

export function UMazaLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/umaza.png"
      alt="Universidad Juan Agustín Maza"
      title="Universidad Juan Agustín Maza"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
      loading="lazy"
    />
  );
}

export function UCongresoLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/ucongreso.svg"
      alt="Universidad de Congreso"
      title="Universidad de Congreso"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
      loading="lazy"
    />
  );
}

export function UDALogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/uda.png"
      alt="Universidad del Aconcagua"
      title="Universidad del Aconcagua"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
      loading="lazy"
    />
  );
}

export function UChampagnatLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/uchampagnat.svg"
      alt="Universidad Champagnat"
      title="Universidad Champagnat"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
      loading="lazy"
    />
  );
}

export function UCALogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/uca.png"
      alt="Pontificia Universidad Católica Argentina"
      title="Pontificia Universidad Católica Argentina"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
      loading="lazy"
    />
  );
}

export function USiglo21Logo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/ues21.svg"
      alt="Universidad Siglo 21"
      title="Universidad Siglo 21"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
      loading="lazy"
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
      loading="lazy"
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
      loading="lazy"
    />
  );
}

export function DonBoscoLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/don-bosco.jpg"
      alt="Facultad Don Bosco"
      title="Facultad Don Bosco"
      className={cn("shrink-0 object-contain rounded-xs", className)}
      style={size ? { width: size, height: size } : undefined}
      loading="lazy"
    />
  );
}

export function ITGCLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/ies-tomas-godoy-cruz.jpg"
      alt="IES 9-002 Tomás Godoy Cruz"
      title="IES 9-002 Tomás Godoy Cruz"
      className={cn("shrink-0 object-contain rounded-xs", className)}
      style={size ? { width: size, height: size } : undefined}
      loading="lazy"
    />
  );
}

export function InsutecLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <img
      src="/universities/insutec.png"
      alt="INSUTEC 9-019"
      title="Instituto Superior Tecnológico INSUTEC 9-019"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
      loading="lazy"
    />
  );
}

export function GenericInstituteLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center border border-zinc-200 dark:border-zinc-700",
        className
      )}
      style={size ? { width: size, height: size } : undefined}
    >
      <Building2 className="w-4 h-4" />
    </div>
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

  // UTN (Mendoza, San Rafael, Córdoba)
  if (norm.includes("utn") || norm.includes("tecnologica")) {
    return <UTNLogo className={className} size={size} />;
  }

  // UNCUYO
  if (norm.includes("uncuyo") || norm.includes("cuyo")) {
    return <UNCUYOLogo className={className} size={size} />;
  }

  // Universidad de Mendoza
  if (norm.includes("umendoza") || norm === "um" || norm.includes("univ. mendoza") || norm.includes("universidad de mendoza")) {
    return <UMendozaLogo className={className} size={size} />;
  }

  // Universidad Juan Agustín Maza
  if (norm.includes("umaza") || norm.includes("maza")) {
    return <UMazaLogo className={className} size={size} />;
  }

  // Universidad de Congreso
  if (norm.includes("ucongreso") || norm.includes("congreso")) {
    return <UCongresoLogo className={className} size={size} />;
  }

  // Universidad del Aconcagua
  if (norm.includes("uda") || norm.includes("aconcagua")) {
    return <UDALogo className={className} size={size} />;
  }

  // Universidad Champagnat
  if (norm.includes("champagnat") || norm.includes("uch")) {
    return <UChampagnatLogo className={className} size={size} />;
  }

  // Pontificia Universidad Católica Argentina
  if (norm.includes("uca") || norm.includes("catolica")) {
    return <UCALogo className={className} size={size} />;
  }

  // Universidad Siglo 21
  if (norm.includes("siglo") || norm.includes("ues21") || norm.includes("21")) {
    return <USiglo21Logo className={className} size={size} />;
  }

  // UNSJ
  if (norm.includes("unsj") || norm.includes("san juan")) {
    return <UNSJLogo className={className} size={size} />;
  }

  // UNLP
  if (norm.includes("unlp") || norm.includes("la plata")) {
    return <UNLPLogo className={className} size={size} />;
  }

  // Don Bosco
  if (norm.includes("bosco") || norm.includes("donbosco") || norm.includes("enologia")) {
    return <DonBoscoLogo className={className} size={size} />;
  }

  // Tomás Godoy Cruz
  if (norm.includes("itgc") || norm.includes("godoy") || norm.includes("9-002")) {
    return <ITGCLogo className={className} size={size} />;
  }

  // INSUTEC
  if (norm.includes("insutec") || norm.includes("9-019")) {
    return <InsutecLogo className={className} size={size} />;
  }

  // Fallback institucional general
  return <GenericInstituteLogo className={className} size={size} />;
}
