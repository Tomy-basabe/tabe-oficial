import React from "react";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";
import { ALL_FACULTADES } from "@/lib/careerData";

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
    return <GenericInstituteLogo className={className} size={size} />;
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      title={title || alt}
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

  // 1. Coincidencia en el catálogo oficial de facultades
  const faculty = ALL_FACULTADES.find(
    (f) =>
      f.id.toLowerCase() === norm ||
      f.label.toLowerCase() === norm ||
      f.fullLabel.toLowerCase().includes(norm)
  );

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
  if (norm.includes("unsj") || norm.includes("san juan")) {
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
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://ies9002.mendoza.edu.ar/wp-content/uploads/2020/06/logo-itgc.png"}
        fallbackLocal="/universities/ies-tomas-godoy-cruz.jpg"
        alt="IES 9-002 Tomás Godoy Cruz"
        title="IES 9-002 Tomás Godoy Cruz"
        className={cn("rounded-xs", className)}
        size={size}
      />
    );
  }

  // INSUTEC
  if (norm.includes("insutec") || norm.includes("9-019")) {
    return (
      <OfficialLogo
        remoteUrl={faculty?.logoUrl || "https://www.insutec.edu.ar/wp-content/uploads/2025/03/logo.png"}
        fallbackLocal="/universities/insutec.png"
        alt="INSUTEC 9-019"
        title="Instituto Superior Tecnológico INSUTEC 9-019"
        className={className}
        size={size}
      />
    );
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

  // Fallback institucional general
  return <GenericInstituteLogo className={className} size={size} />;
}
