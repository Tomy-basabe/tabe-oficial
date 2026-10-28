import React from "react";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";
import { ALL_FACULTADES } from "@/lib/careerData";
import { getUniversityLogoUrl } from "@/data/universityLogos";

interface LogoProps {
  className?: string;
  size?: number;
}

// ─────────────────────────────────────────────
// Componente Base con Imagen Remota Oficial + Fallback
// ─────────────────────────────────────────────

export function OfficialLogo({
  remoteUrl,
  fallbackLocal,
  alt,
  title,
  className = "w-6 h-6",
  size,
}: {
  remoteUrl?: string;
  fallbackLocal?: string;
  alt: string;
  title?: string;
  className?: string;
  size?: number;
}) {
  const [currentSrc, setCurrentSrc] = React.useState<string>(remoteUrl || fallbackLocal || "");
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setCurrentSrc(remoteUrl || fallbackLocal || "");
    setHasError(false);
  }, [remoteUrl, fallbackLocal]);

  if (hasError && !fallbackLocal) {
    return <GenericInstituteLogo className={className} size={size} label={alt} />;
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      title={title || alt}
      referrerPolicy="no-referrer"
      className={cn("shrink-0 object-contain", className)}
      style={size ? { width: size, height: size } : undefined}
      loading="lazy"
      onError={() => {
        if (fallbackLocal && currentSrc !== fallbackLocal) {
          setCurrentSrc(fallbackLocal);
        } else {
          setHasError(true);
        }
      }}
    />
  );
}

// ─────────────────────────────────────────────
// Componentes de Logos Oficiales Individuales
// ─────────────────────────────────────────────

export function UTNLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <OfficialLogo
      remoteUrl="https://upload.wikimedia.org/wikipedia/commons/6/67/UTN_logo.jpg"
      fallbackLocal="/universities/utn.png"
      alt="UTN - Universidad Tecnológica Nacional"
      title="UTN - Universidad Tecnológica Nacional"
      className={className}
      size={size}
    />
  );
}

export function UNCUYOLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <OfficialLogo
      remoteUrl="https://derecho.uncuyo.edu.ar/cache/logo-fd-color1_315_600_c.png"
      fallbackLocal="/universities/uncuyo.png"
      alt="UNCUYO - Universidad Nacional de Cuyo"
      title="UNCUYO - Universidad Nacional de Cuyo"
      className={className}
      size={size}
    />
  );
}

export function UMendozaLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <OfficialLogo
      remoteUrl="https://upload.wikimedia.org/wikipedia/commons/4/41/UM_logo.png"
      fallbackLocal="/universities/umendoza.png"
      alt="Universidad de Mendoza"
      title="Universidad de Mendoza"
      className={className}
      size={size}
    />
  );
}

export function UMazaLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <OfficialLogo
      remoteUrl="https://upload.wikimedia.org/wikipedia/commons/a/ab/Universidad_Juan_Agust%C3%ADn_Maza.png"
      fallbackLocal="/universities/umaza.png"
      alt="Universidad Juan Agustín Maza"
      title="Universidad Juan Agustín Maza"
      className={className}
      size={size}
    />
  );
}

export function UCongresoLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <OfficialLogo
      remoteUrl="https://www.ucongreso.edu.ar/wp-content/themes/ucongreso/images/logo.svg"
      fallbackLocal="/universities/ucongreso.svg"
      alt="Universidad de Congreso"
      title="Universidad de Congreso"
      className={className}
      size={size}
    />
  );
}

export function UDALogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <OfficialLogo
      remoteUrl="https://www.uda.edu.ar/images/2017/05/19/logo-tablet-06.png"
      fallbackLocal="/universities/uda.png"
      alt="Universidad del Aconcagua"
      title="Universidad del Aconcagua"
      className={className}
      size={size}
    />
  );
}

export function UChampagnatLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <OfficialLogo
      remoteUrl="https://upload.wikimedia.org/wikipedia/commons/3/3c/Logo_Universidad_Champagnat.svg"
      fallbackLocal="/universities/uchampagnat.svg"
      alt="Universidad Champagnat"
      title="Universidad Champagnat"
      className={className}
      size={size}
    />
  );
}

export function UCALogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <OfficialLogo
      remoteUrl="https://upload.wikimedia.org/wikipedia/commons/c/cb/Universidad_Cat%C3%B3lica_Argentina.png"
      fallbackLocal="/universities/uca.png"
      alt="Pontificia Universidad Católica Argentina"
      title="Pontificia Universidad Católica Argentina"
      className={className}
      size={size}
    />
  );
}

export function USiglo21Logo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <OfficialLogo
      remoteUrl="https://upload.wikimedia.org/wikipedia/commons/0/07/Logo_de_la_Universidad_Siglo_21.svg"
      fallbackLocal="/universities/ues21.svg"
      alt="Universidad Siglo 21"
      title="Universidad Siglo 21"
      className={className}
      size={size}
    />
  );
}

export function UNSJLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <OfficialLogo
      remoteUrl="https://fi.unsj.edu.ar/panel_fi/img/logo_unsj_min_.png"
      fallbackLocal="/universities/unsj.png"
      alt="UNSJ - Universidad Nacional de San Juan"
      title="UNSJ - Universidad Nacional de San Juan"
      className={className}
      size={size}
    />
  );
}

export function UNLPLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <OfficialLogo
      remoteUrl="https://upload.wikimedia.org/wikipedia/commons/2/24/Unlp_marca_escudo.png"
      fallbackLocal="/universities/unlp.png"
      alt="UNLP - Universidad Nacional de La Plata"
      title="UNLP - Universidad Nacional de La Plata"
      className={className}
      size={size}
    />
  );
}

export function DonBoscoLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <OfficialLogo
      remoteUrl="https://enologia.donbosco.org.ar/wp-content/uploads/2021/03/cropped-logo-don-bosco.png"
      fallbackLocal="/universities/don-bosco.jpg"
      alt="Facultad Don Bosco"
      title="Facultad Don Bosco"
      className={cn("rounded-xs", className)}
      size={size}
    />
  );
}

export function ITGCLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <OfficialLogo
      remoteUrl="https://ies9002.mendoza.edu.ar/wp-content/uploads/2020/06/logo-itgc.png"
      fallbackLocal="/universities/ies-tomas-godoy-cruz.jpg"
      alt="IES 9-002 Tomás Godoy Cruz"
      title="IES 9-002 Tomás Godoy Cruz"
      className={cn("rounded-xs", className)}
      size={size}
    />
  );
}

export function InsutecLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <OfficialLogo
      remoteUrl="https://www.insutec.edu.ar/wp-content/uploads/2025/03/logo.png"
      fallbackLocal="/universities/insutec.png"
      alt="INSUTEC 9-019"
      title="Instituto Superior Tecnológico INSUTEC 9-019"
      className={className}
      size={size}
    />
  );
}

export function IESTomasGodoyCruzLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100" height="100" rx="20" fill="#0E3A75" />
      <circle cx="50" cy="50" r="38" stroke="#F59E0B" strokeWidth="3" fill="#12488E" />
      <path d="M50 24L62 38H38L50 24Z" fill="#F59E0B" />
      <rect x="47" y="38" width="6" height="24" fill="#F59E0B" />
      <text x="50" y="74" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">
        ITGC
      </text>
      <text x="50" y="85" textAnchor="middle" fill="#93C5FD" fontSize="8" fontWeight="700" fontFamily="sans-serif">
        9-002
      </text>
    </svg>
  );
}

export function INSUTECLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100" height="100" rx="20" fill="#0F172A" />
      <circle cx="50" cy="50" r="38" stroke="#06B6D4" strokeWidth="3" fill="#0369A1" />
      <circle cx="50" cy="42" r="16" stroke="#38BDF8" strokeWidth="4" strokeDasharray="6 3" />
      <path d="M42 42L50 34L58 42" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <text x="50" y="73" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="sans-serif">
        INSUTEC
      </text>
      <text x="50" y="84" textAnchor="middle" fill="#BAE6FD" fontSize="8" fontWeight="700" fontFamily="sans-serif">
        9-019
      </text>
    </svg>
  );
}

export function IESBelgranoLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100" height="100" rx="20" fill="#0891B2" />
      <circle cx="50" cy="50" r="38" stroke="#FFFFFF" strokeWidth="3" fill="#0E7490" />
      <circle cx="50" cy="38" r="12" fill="#F59E0B" />
      <text x="50" y="66" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="sans-serif">
        BELGRANO
      </text>
      <text x="50" y="78" textAnchor="middle" fill="#A5F3FC" fontSize="8" fontWeight="700" fontFamily="sans-serif">
        IES 9-008
      </text>
    </svg>
  );
}

export function IESMaipuLogo({ className = "w-6 h-6", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100" height="100" rx="20" fill="#047857" />
      <circle cx="50" cy="50" r="38" stroke="#34D399" strokeWidth="3" fill="#065F46" />
      <path d="M50 26C42 36 34 46 50 60C66 46 58 36 50 26Z" fill="#34D399" />
      <text x="50" y="74" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900" fontFamily="sans-serif">
        MAIPÚ
      </text>
      <text x="50" y="85" textAnchor="middle" fill="#A7F3D0" fontSize="8" fontWeight="700" fontFamily="sans-serif">
        IES 9-023
      </text>
    </svg>
  );
}

export function GenericInstituteLogo({
  className = "w-6 h-6",
  size,
  label = "UNIV",
}: LogoProps & { label?: string }) {
  const cleanLabel = (label || "UNIV")
    .replace(/universidad|facultad|instituto|nacional|regional|sede|provincial/gi, "")
    .trim();
  const initials =
    cleanLabel
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .join("")
      .slice(0, 4)
      .toUpperCase() || "UNIV";

  return (
    <div
      className={cn(
        "shrink-0 rounded-lg bg-linear-to-br from-blue-700 via-indigo-800 to-slate-900 text-white flex items-center justify-center font-black tracking-tight border border-blue-400/30 shadow-2xs select-none",
        className
      )}
      style={size ? { width: size, height: size, fontSize: Math.max(7, Math.round(size * 0.3)) } : { fontSize: "10px" }}
      title={label}
    >
      {initials}
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

  // 1. Coincidencia en el catálogo oficial de facultades
  const faculty = ALL_FACULTADES.find(
    (f) =>
      f.id.toLowerCase() === norm ||
      f.label.toLowerCase() === norm ||
      f.fullLabel.toLowerCase().includes(norm)
  );

  // 2. Prioridad máxima al catálogo centralizado en universityLogos.ts (140 facultades locales verificadas)
  const resolvedLogo = getUniversityLogoUrl(faculty?.id || universityId);
  if (resolvedLogo) {
    return (
      <OfficialLogo
        remoteUrl={resolvedLogo}
        fallbackLocal={resolvedLogo.startsWith("/") ? resolvedLogo : undefined}
        alt={faculty?.label || universityId}
        title={faculty?.fullLabel || universityId}
        className={className}
        size={size}
      />
    );
  }

  // UTN (Mendoza, San Rafael, Córdoba, FRBA, etc.)
  if (norm.includes("utn") || norm.includes("tecnologica")) {
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/6/67/UTN_logo.jpg"}
        fallbackLocal="/universities/utn.png"
        alt="UTN - Universidad Tecnológica Nacional"
        title="UTN - Universidad Tecnológica Nacional"
        className={className}
        size={size}
      />
    );
  }

  // UNCUYO
  if (norm.includes("uncuyo") || norm.includes("cuyo")) {
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://derecho.uncuyo.edu.ar/cache/logo-fd-color1_315_600_c.png"}
        fallbackLocal="/universities/uncuyo.png"
        alt="UNCUYO - Universidad Nacional de Cuyo"
        title="UNCUYO - Universidad Nacional de Cuyo"
        className={className}
        size={size}
      />
    );
  }

  // Universidad de Mendoza
  if (
    norm.includes("umendoza") ||
    norm === "um" ||
    norm.includes("univ. mendoza") ||
    norm.includes("universidad de mendoza")
  ) {
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/4/41/UM_logo.png"}
        fallbackLocal="/universities/umendoza.png"
        alt="Universidad de Mendoza"
        title="Universidad de Mendoza"
        className={className}
        size={size}
      />
    );
  }

  // Universidad Juan Agustín Maza
  if (norm.includes("umaza") || norm.includes("maza")) {
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/a/ab/Universidad_Juan_Agust%C3%ADn_Maza.png"}
        fallbackLocal="/universities/umaza.png"
        alt="Universidad Juan Agustín Maza"
        title="Universidad Juan Agustín Maza"
        className={className}
        size={size}
      />
    );
  }

  // Universidad de Congreso
  if (norm.includes("ucongreso") || norm.includes("congreso")) {
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://www.ucongreso.edu.ar/wp-content/themes/ucongreso/images/logo.svg"}
        fallbackLocal="/universities/ucongreso.svg"
        alt="Universidad de Congreso"
        title="Universidad de Congreso"
        className={className}
        size={size}
      />
    );
  }

  // Universidad del Aconcagua
  if (norm.includes("uda") || norm.includes("aconcagua")) {
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://www.uda.edu.ar/images/2017/05/19/logo-tablet-06.png"}
        fallbackLocal="/universities/uda.png"
        alt="Universidad del Aconcagua"
        title="Universidad del Aconcagua"
        className={className}
        size={size}
      />
    );
  }

  // Universidad Champagnat
  if (norm.includes("champagnat") || norm.includes("uch")) {
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/3/3c/Logo_Universidad_Champagnat.svg"}
        fallbackLocal="/universities/uchampagnat.svg"
        alt="Universidad Champagnat"
        title="Universidad Champagnat"
        className={className}
        size={size}
      />
    );
  }

  // Pontificia Universidad Católica Argentina
  if (norm.includes("uca") || norm.includes("catolica")) {
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/c/cb/Universidad_Cat%C3%B3lica_Argentina.png"}
        fallbackLocal="/universities/uca.png"
        alt="Pontificia Universidad Católica Argentina"
        title="Pontificia Universidad Católica Argentina"
        className={className}
        size={size}
      />
    );
  }

  // Universidad Siglo 21
  if (norm.includes("siglo") || norm.includes("ues21") || norm.includes("21")) {
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/0/07/Logo_de_la_Universidad_Siglo_21.svg"}
        fallbackLocal="/universities/ues21.svg"
        alt="Universidad Siglo 21"
        title="Universidad Siglo 21"
        className={className}
        size={size}
      />
    );
  }

  // UNSJ
  if (norm.includes("unsj") || (norm.includes("san juan") && !norm.includes("congreso"))) {
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://fi.unsj.edu.ar/panel_fi/img/logo_unsj_min_.png"}
        fallbackLocal="/universities/unsj.png"
        alt="UNSJ - Universidad Nacional de San Juan"
        title="UNSJ - Universidad Nacional de San Juan"
        className={className}
        size={size}
      />
    );
  }

  // UCCuyo
  if (norm.includes("uccuyo") || (norm.includes("cuyo") && norm.includes("catolica"))) {
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://www.uccuyo.edu.ar/images/logo_uccuyo.png"}
        alt="UCCuyo - Universidad Católica de Cuyo"
        title="Universidad Católica de Cuyo"
        className={className}
        size={size}
      />
    );
  }

  // UNLP
  if (norm.includes("unlp") || norm.includes("la plata")) {
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/2/24/Unlp_marca_escudo.png"}
        fallbackLocal="/universities/unlp.png"
        alt="UNLP - Universidad Nacional de La Plata"
        title="UNLP - Universidad Nacional de La Plata"
        className={className}
        size={size}
      />
    );
  }

  // Don Bosco
  if (norm.includes("bosco") || norm.includes("donbosco") || norm.includes("enologia")) {
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://enologia.donbosco.org.ar/wp-content/uploads/2021/03/cropped-logo-don-bosco.png"}
        fallbackLocal="/universities/don-bosco.jpg"
        alt="Facultad Don Bosco"
        title="Facultad Don Bosco"
        className={cn("rounded-xs", className)}
        size={size}
      />
    );
  }

  // Tomás Godoy Cruz
  if (norm.includes("itgc") || norm.includes("godoy") || norm.includes("9-002")) {
    return <IESTomasGodoyCruzLogo className={className} size={size} />;
  }

  // INSUTEC
  if (norm.includes("insutec") || norm.includes("9-019")) {
    return <INSUTECLogo className={className} size={size} />;
  }

  // IES Belgrano 9-008
  if (norm.includes("belgrano") || norm.includes("9-008") || norm === "ies_belgrano") {
    return <IESBelgranoLogo className={className} size={size} />;
  }

  // IES Maipú 9-023
  if (norm.includes("maipu") || norm.includes("9-023") || norm === "ies_maipu") {
    return <IESMaipuLogo className={className} size={size} />;
  }

  // Si tiene logoUrl en la configuración oficial
  if (faculty?.logoUrl) {
    return (
      <OfficialLogo
        remoteUrl={faculty.logoUrl}
        alt={faculty.label}
        title={faculty.fullLabel}
        className={className}
        size={size}
      />
    );
  }

  // Fallback institucional general (monograma con sigla oficial en lugar de edificio genérico)
  return <GenericInstituteLogo className={className} size={size} label={faculty?.label || universityId} />;
}
