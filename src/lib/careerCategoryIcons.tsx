import React from "react";
import {
  Cpu,
  BookOpen,
  Stethoscope,
  Scale,
  PenTool,
  TrendingUp,
  GraduationCap,
  Layers,
  HeartPulse,
  Briefcase,
  Code,
  FlaskConical,
  Activity,
} from "lucide-react";

export type CareerCategoryType =
  | "ingenieria"
  | "licenciatura"
  | "medicina"
  | "derecho"
  | "arquitectura"
  | "economicas"
  | "profesorado"
  | "tecnicatura"
  | "salud"
  | "general";

export interface CareerCategoryMeta {
  category: CareerCategoryType;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  containerBg: string;
}

const CATEGORY_DEFINITIONS: Record<CareerCategoryType, CareerCategoryMeta> = {
  ingenieria: {
    category: "ingenieria",
    label: "Ingeniería",
    icon: Cpu,
    accentColor: "#2563eb", // Azul ingeniería
    badgeBg: "bg-blue-500/10 dark:bg-blue-500/15",
    badgeText: "text-blue-700 dark:text-blue-400",
    badgeBorder: "border-blue-500/20",
    containerBg: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/50",
  },
  licenciatura: {
    category: "licenciatura",
    label: "Licenciatura",
    icon: BookOpen,
    accentColor: "#7c3aed", // Violeta académico
    badgeBg: "bg-purple-500/10 dark:bg-purple-500/15",
    badgeText: "text-purple-700 dark:text-purple-400",
    badgeBorder: "border-purple-500/20",
    containerBg: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200/60 dark:border-purple-800/50",
  },
  medicina: {
    category: "medicina",
    label: "Medicina",
    icon: Stethoscope,
    accentColor: "#059669", // Verde médico / esmeralda
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    badgeText: "text-emerald-700 dark:text-emerald-400",
    badgeBorder: "border-emerald-500/20",
    containerBg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/50",
  },
  salud: {
    category: "salud",
    label: "Ciencias de la Salud",
    icon: HeartPulse,
    accentColor: "#0d9488", // Teal salud
    badgeBg: "bg-teal-500/10 dark:bg-teal-500/15",
    badgeText: "text-teal-700 dark:text-teal-400",
    badgeBorder: "border-teal-500/20",
    containerBg: "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-200/60 dark:border-teal-800/50",
  },
  derecho: {
    category: "derecho",
    label: "Derecho y Leyes",
    icon: Scale,
    accentColor: "#d97706", // Ámbar / dorado institucional
    badgeBg: "bg-amber-500/10 dark:bg-amber-500/15",
    badgeText: "text-amber-700 dark:text-amber-400",
    badgeBorder: "border-amber-500/20",
    containerBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/50",
  },
  arquitectura: {
    category: "arquitectura",
    label: "Arquitectura y Diseño",
    icon: PenTool,
    accentColor: "#db2777", // Rosa / magenta creativo
    badgeBg: "bg-pink-500/10 dark:bg-pink-500/15",
    badgeText: "text-pink-700 dark:text-pink-400",
    badgeBorder: "border-pink-500/20",
    containerBg: "bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border-pink-200/60 dark:border-pink-800/50",
  },
  economicas: {
    category: "economicas",
    label: "Ciencias Económicas",
    icon: TrendingUp,
    accentColor: "#0284c7", // Sky / finanzas
    badgeBg: "bg-sky-500/10 dark:bg-sky-500/15",
    badgeText: "text-sky-700 dark:text-sky-400",
    badgeBorder: "border-sky-500/20",
    containerBg: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-200/60 dark:border-sky-800/50",
  },
  profesorado: {
    category: "profesorado",
    label: "Educación",
    icon: GraduationCap,
    accentColor: "#ea580c", // Naranja educativo
    badgeBg: "bg-orange-500/10 dark:bg-orange-500/15",
    badgeText: "text-orange-700 dark:text-orange-400",
    badgeBorder: "border-orange-500/20",
    containerBg: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-200/60 dark:border-orange-800/50",
  },
  tecnicatura: {
    category: "tecnicatura",
    label: "Tecnicatura",
    icon: Layers,
    accentColor: "#0891b2", // Cyan técnico
    badgeBg: "bg-cyan-500/10 dark:bg-cyan-500/15",
    badgeText: "text-cyan-700 dark:text-cyan-400",
    badgeBorder: "border-cyan-500/20",
    containerBg: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border-cyan-200/60 dark:border-cyan-800/50",
  },
  general: {
    category: "general",
    label: "Grado Académico",
    icon: GraduationCap,
    accentColor: "#3b82f6",
    badgeBg: "bg-zinc-500/10 dark:bg-zinc-500/15",
    badgeText: "text-zinc-700 dark:text-zinc-300",
    badgeBorder: "border-zinc-500/20",
    containerBg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60",
  },
};

/**
 * Determina el ícono y estilo de una carrera según su titulación y especialidad
 */
export function getCareerCategoryMeta(careerName: string): CareerCategoryMeta {
  const lower = (careerName || "").toLowerCase();

  // 1. Medicina
  if (
    lower.includes("medicina") ||
    lower.includes("médico") ||
    lower.includes("medico")
  ) {
    return CATEGORY_DEFINITIONS.medicina;
  }

  // 2. Otras Ciencias de la Salud
  if (
    lower.includes("odontolog") ||
    lower.includes("farmacia") ||
    lower.includes("bioquímic") ||
    lower.includes("bioquimic") ||
    lower.includes("kinesiolog") ||
    lower.includes("enfermer") ||
    lower.includes("nutrici") ||
    lower.includes("veterinari") ||
    lower.includes("obstetric") ||
    lower.includes("fonoaudiolog") ||
    lower.includes("psicolog")
  ) {
    return CATEGORY_DEFINITIONS.salud;
  }

  // 3. Ingenierías (incluye bioingeniería)
  if (lower.includes("ingenier") || lower.includes("bioingenier")) {
    return CATEGORY_DEFINITIONS.ingenieria;
  }

  // 4. Derecho / Abogacía / Notariado
  if (
    lower.includes("abogac") ||
    lower.includes("derecho") ||
    lower.includes("notari") ||
    lower.includes("procurador") ||
    lower.includes("criminalístic") ||
    lower.includes("criminalistic")
  ) {
    return CATEGORY_DEFINITIONS.derecho;
  }

  // 5. Arquitectura y Diseño
  if (
    lower.includes("arquitect") ||
    lower.includes("diseño") ||
    lower.includes("diseno") ||
    lower.includes("urbanism")
  ) {
    return CATEGORY_DEFINITIONS.arquitectura;
  }

  // 6. Ciencias Económicas y Administración
  if (
    lower.includes("contador") ||
    lower.includes("administraci") ||
    lower.includes("econom") ||
    lower.includes("finanz") ||
    lower.includes("comercio") ||
    lower.includes("marketing") ||
    lower.includes("negocios") ||
    lower.includes("actuario")
  ) {
    return CATEGORY_DEFINITIONS.economicas;
  }

  // 7. Licenciaturas
  if (
    lower.includes("licenciatura") ||
    lower.includes("lic.") ||
    lower.includes("licenciado") ||
    lower.includes("licenciada")
  ) {
    return CATEGORY_DEFINITIONS.licenciatura;
  }

  // 8. Profesorados y Educación
  if (
    lower.includes("profesorado") ||
    lower.includes("educaci") ||
    lower.includes("pedagog") ||
    lower.includes("docen")
  ) {
    return CATEGORY_DEFINITIONS.profesorado;
  }

  // 9. Tecnicaturas
  if (
    lower.includes("tecnicatura") ||
    lower.includes("técnic") ||
    lower.includes("tecnic") ||
    lower.includes("tupa")
  ) {
    return CATEGORY_DEFINITIONS.tecnicatura;
  }

  return CATEGORY_DEFINITIONS.general;
}

/**
 * Componente de Icono o Badge de Carrera
 */
export function CareerCategoryBadge({
  careerName,
  showLabel = true,
  className = "",
}: {
  careerName: string;
  showLabel?: boolean;
  className?: string;
}) {
  const meta = getCareerCategoryMeta(careerName);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder} ${className}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}
