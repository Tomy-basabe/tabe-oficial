export type IslandId = "classic" | "pizza" | "gaming" | "study" | "cosmic";

export interface IslandDecoration {
  emoji?: string;
  className: string;
  label: string;
}

export interface IslandTheme {
  id: IslandId;
  name: string;
  shortName: string;
  emoji: string;
  tagline: string;
  description: string;
  accentColor: string;
  badgeBg: string;
  // Sky Gradients
  skyDay: string;
  skyNight: string;
  // Terrain / Earth Ground
  groundDay: string;
  groundNight: string;
  groundHighlightDay: string;
  groundHighlightNight: string;
  // 3D Isometric Soil Crust (layers of earth underneath)
  crustShadowDay: string;
  crustShadowNight: string;
  // Celestial elements
  sunColor: string;
  sunBorder: string;
  sunIconColor: string;
  moonColor: string;
  // Soil surface decorations (scattered stones, toppings, items)
  decorations: IslandDecoration[];
  emptyStateAdvice: string;
}

export const FOREST_ISLANDS: IslandTheme[] = [
  {
    id: "classic",
    name: "Isla Clásica",
    shortName: "Clásica",
    emoji: "",
    tagline: "Bosque Verde Tradicional",
    description: "Pradera fértil con césped esmeralda, flora silvestre y aire puro de montaña.",
    accentColor: "#10B981",
    badgeBg: "bg-emerald-500",
    skyDay: "from-[#7dd3fc] via-[#bae6fd] to-[#e0f2fe]",
    skyNight: "from-[#090d16] via-[#111827] to-[#1e1b4b]",
    groundDay: "bg-[#65A30D]",
    groundNight: "bg-[#1E3A1A]",
    groundHighlightDay: "bg-[#A3E635]",
    groundHighlightNight: "bg-[#4D7C0F]",
    crustShadowDay: "shadow-[0_16px_0_0_#3F2E1E,0_28px_0_0_#2B1E12,0_36px_24px_0_rgba(0,0,0,0.4)]",
    crustShadowNight: "shadow-[0_16px_0_0_#141E11,0_28px_0_0_#0A1009,0_36px_24px_0_rgba(0,0,0,0.5)]",
    sunColor: "bg-[#FFE600]",
    sunBorder: "border-amber-300",
    sunIconColor: "text-amber-900",
    moonColor: "bg-amber-200",
    decorations: [],
    emptyStateAdvice: "Comienza una sesión de estudio para ver brotar tu primer roble en el bosque.",
  },
  {
    id: "pizza",
    name: "Isla Gastronómica",
    shortName: "Gastro",
    emoji: "",
    tagline: "Terreno Cálido & Horno Rústico",
    description: "Suelo de tonos dorados horneados al punto, atmósfera cálida y energía de concentración.",
    accentColor: "#F59E0B",
    badgeBg: "bg-amber-500",
    skyDay: "from-[#FDBA74] via-[#FED7AA] to-[#FFF7ED]",
    skyNight: "from-[#290c0c] via-[#431407] to-[#1c0804]",
    groundDay: "bg-[#D97706]",
    groundNight: "bg-[#78350F]",
    groundHighlightDay: "bg-[#FBBF24]",
    groundHighlightNight: "bg-[#B45309]",
    crustShadowDay: "shadow-[0_16px_0_0_#92400E,0_28px_0_0_#5B210B,0_36px_24px_0_rgba(0,0,0,0.4)]",
    crustShadowNight: "shadow-[0_16px_0_0_#451A03,0_28px_0_0_#260D02,0_36px_24px_0_rgba(0,0,0,0.5)]",
    sunColor: "bg-[#EF4444]",
    sunBorder: "border-red-400",
    sunIconColor: "text-amber-100",
    moonColor: "bg-amber-300",
    decorations: [],
    emptyStateAdvice: "Prepara tu esfuerzo académico. Estudia con Pomodoro para plantar tus mejores ideas.",
  },
  {
    id: "gaming",
    name: "Isla Digital",
    shortName: "Digital",
    emoji: "",
    tagline: "Atmósfera Neón & Alta Frecuencia",
    description: "Suelo tecnológico digital, luminiscencias cian y violeta, y ambientación futurista.",
    accentColor: "#06B6D4",
    badgeBg: "bg-cyan-500",
    skyDay: "from-[#3B0764] via-[#581C87] to-[#6B21A8]",
    skyNight: "from-[#0F021B] via-[#1E0538] to-[#2E1065]",
    groundDay: "bg-[#7E22CE]",
    groundNight: "bg-[#3B0764]",
    groundHighlightDay: "bg-[#00E5FF]",
    groundHighlightNight: "bg-[#A855F7]",
    crustShadowDay: "shadow-[0_16px_0_0_#00E5FF,0_28px_0_0_#3B0764,0_36px_24px_0_rgba(0,0,0,0.5)]",
    crustShadowNight: "shadow-[0_16px_0_0_#06B6D4,0_28px_0_0_#1E0538,0_36px_24px_0_rgba(0,0,0,0.6)]",
    sunColor: "bg-[#00E5FF]",
    sunBorder: "border-cyan-300",
    sunIconColor: "text-zinc-900",
    moonColor: "bg-cyan-200",
    decorations: [],
    emptyStateAdvice: "Inicia tu sesión de enfoque para subir de nivel y desbloquear flora digital.",
  },
  {
    id: "study",
    name: "Isla Académica",
    shortName: "Academia",
    emoji: "",
    tagline: "Escritorio de Roble & Biblioteca",
    description: "Superficie de madera noble y pergamino, inspirada en bibliotecas clásicas y sabiduría.",
    accentColor: "#D97706",
    badgeBg: "bg-amber-600",
    skyDay: "from-[#E2D4B7] via-[#EDE0CA] to-[#FAF6EE]",
    skyNight: "from-[#17120C] via-[#2A1E14] to-[#3B291A]",
    groundDay: "bg-[#854D0E]",
    groundNight: "bg-[#451A03]",
    groundHighlightDay: "bg-[#CA8A04]",
    groundHighlightNight: "bg-[#78350F]",
    crustShadowDay: "shadow-[0_16px_0_0_#543006,0_28px_0_0_#311B03,0_36px_24px_0_rgba(0,0,0,0.4)]",
    crustShadowNight: "shadow-[0_16px_0_0_#2B1402,0_28px_0_0_#140901,0_36px_24px_0_rgba(0,0,0,0.5)]",
    sunColor: "bg-[#F59E0B]",
    sunBorder: "border-amber-300",
    sunIconColor: "text-amber-950",
    moonColor: "bg-amber-100",
    decorations: [],
    emptyStateAdvice: "Tu escritorio académico espera tus apuntes. Empieza una jornada de concentración.",
  },
  {
    id: "cosmic",
    name: "Isla Cósmica",
    shortName: "Cósmica",
    emoji: "",
    tagline: "Superficie Lunar & Nebulosas",
    description: "Suelo de regolito espacial con cráteres de cristal, polvo estelar y vistas al cosmos.",
    accentColor: "#8B5CF6",
    badgeBg: "bg-purple-600",
    skyDay: "from-[#0F172A] via-[#1E1B4B] to-[#311042]",
    skyNight: "from-[#020617] via-[#0B0A1A] to-[#160B24]",
    groundDay: "bg-[#475569]",
    groundNight: "bg-[#1E293B]",
    groundHighlightDay: "bg-[#94A3B8]",
    groundHighlightNight: "bg-[#475569]",
    crustShadowDay: "shadow-[0_16px_0_0_#334155,0_28px_0_0_#1E293B,0_36px_24px_0_rgba(0,0,0,0.4)]",
    crustShadowNight: "shadow-[0_16px_0_0_#0F172A,0_28px_0_0_#020617,0_36px_24px_0_rgba(0,0,0,0.6)]",
    sunColor: "bg-[#C084FC]",
    sunBorder: "border-purple-300",
    sunIconColor: "text-white",
    moonColor: "bg-slate-200",
    decorations: [],
    emptyStateAdvice: "El universo del conocimiento es infinito. Expande tu concentración en gravedad cero.",
  },
];
