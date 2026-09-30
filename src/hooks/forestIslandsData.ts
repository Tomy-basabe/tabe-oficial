export type IslandId = "classic" | "pizza" | "gaming" | "study" | "cosmic";

export interface IslandDecoration {
  emoji: string;
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
    emoji: "🌲",
    tagline: "Bosque Verde Tradicional",
    description: "Pradera fértil con césped esmeralda, flores silvestres y aire puro de montaña.",
    accentColor: "#BFFF00",
    badgeBg: "bg-emerald-500",
    skyDay: "from-[#7dd3fc] via-[#bae6fd] to-[#e0f2fe]",
    skyNight: "from-[#090d16] via-[#111827] to-[#1e1b4b]",
    groundDay: "bg-[#65A30D]",
    groundNight: "bg-[#1E3A1A]",
    groundHighlightDay: "bg-[#A3E635]",
    groundHighlightNight: "bg-[#4D7C0F]",
    crustShadowDay: "shadow-[0_16px_0_0_#3F2E1E,0_28px_0_0_#2B1E12,12px_36px_0_0_#000]",
    crustShadowNight: "shadow-[0_16px_0_0_#141E11,0_28px_0_0_#0A1009,12px_36px_0_0_#000]",
    sunColor: "bg-[#FFE600]",
    sunBorder: "border-black",
    sunIconColor: "text-black",
    moonColor: "bg-amber-200",
    decorations: [
      { emoji: "🌼", className: "top-4 left-8 text-xs select-none opacity-80", label: "Margarita" },
      { emoji: "🌸", className: "top-6 right-12 text-xs select-none opacity-80", label: "Flor de cerezo" },
      { emoji: "🍄", className: "bottom-6 left-16 text-xs select-none opacity-85", label: "Hongo" },
      { emoji: "🌼", className: "bottom-5 right-20 text-xs select-none opacity-80", label: "Flor silvestre" },
      { emoji: "🪨", className: "top-1/2 left-4 text-xs select-none opacity-60", label: "Roca de río" },
    ],
    emptyStateAdvice: "¡Comienza una sesión de estudio para ver brotar tu primer roble en el bosque!",
  },
  {
    id: "pizza",
    name: "Isla Pizza",
    shortName: "Pizza",
    emoji: "🍕",
    tagline: "Terreno Crocante & Queso Fundido",
    description: "Suelo de masa horneada al punto, lago de queso mozzarella y toppings de concentración.",
    accentColor: "#FF9900",
    badgeBg: "bg-amber-500",
    skyDay: "from-[#FDBA74] via-[#FED7AA] to-[#FFF7ED]",
    skyNight: "from-[#290c0c] via-[#431407] to-[#1c0804]",
    groundDay: "bg-[#D97706]",
    groundNight: "bg-[#78350F]",
    groundHighlightDay: "bg-[#FBBF24]",
    groundHighlightNight: "bg-[#B45309]",
    crustShadowDay: "shadow-[0_16px_0_0_#92400E,0_28px_0_0_#5B210B,12px_36px_0_0_#000]",
    crustShadowNight: "shadow-[0_16px_0_0_#451A03,0_28px_0_0_#260D02,12px_36px_0_0_#000]",
    sunColor: "bg-[#EF4444]",
    sunBorder: "border-black",
    sunIconColor: "text-amber-200",
    moonColor: "bg-amber-300",
    decorations: [
      { emoji: "🍕", className: "top-4 left-8 text-sm select-none drop-shadow-sm", label: "Porción de pizza" },
      { emoji: "🧀", className: "top-6 right-12 text-sm select-none drop-shadow-sm", label: "Mozzarella fundida" },
      { emoji: "🍅", className: "bottom-6 left-16 text-xs select-none", label: "Tomate cherry" },
      { emoji: "🫒", className: "bottom-5 right-20 text-xs select-none", label: "Aceituna negra" },
      { emoji: "🌿", className: "top-1/2 left-4 text-xs select-none", label: "Hojas de orégano" },
    ],
    emptyStateAdvice: "¡Hornea tu esfuerzo! Estudia con Pomodoro para plantar deliciosas creaciones.",
  },
  {
    id: "gaming",
    name: "Isla Gaming",
    shortName: "Gaming",
    emoji: "🕹️",
    tagline: "Atmósfera Retro & Neón Arcade",
    description: "Suelo de placa arcade digital, luces neón cian y violeta, y estética retro-futurista.",
    accentColor: "#00E5FF",
    badgeBg: "bg-cyan-500",
    skyDay: "from-[#3B0764] via-[#581C87] to-[#6B21A8]",
    skyNight: "from-[#0F021B] via-[#1E0538] to-[#2E1065]",
    groundDay: "bg-[#7E22CE]",
    groundNight: "bg-[#3B0764]",
    groundHighlightDay: "bg-[#00E5FF]",
    groundHighlightNight: "bg-[#A855F7]",
    crustShadowDay: "shadow-[0_16px_0_0_#00E5FF,0_28px_0_0_#3B0764,12px_36px_0_0_#000]",
    crustShadowNight: "shadow-[0_16px_0_0_#06B6D4,0_28px_0_0_#1E0538,12px_36px_0_0_#000]",
    sunColor: "bg-[#00E5FF]",
    sunBorder: "border-black",
    sunIconColor: "text-black",
    moonColor: "bg-cyan-200",
    decorations: [
      { emoji: "👾", className: "top-4 left-8 text-sm select-none animate-bounce duration-1000", label: "Pixel monster" },
      { emoji: "🕹️", className: "top-6 right-12 text-sm select-none", label: "Joystick retro" },
      { emoji: "⚡", className: "bottom-6 left-16 text-xs select-none text-yellow-300", label: "Power up" },
      { emoji: "💎", className: "bottom-5 right-20 text-xs select-none", label: "Gema de concentración" },
      { emoji: "🎮", className: "top-1/2 left-4 text-xs select-none", label: "Game pad" },
    ],
    emptyStateAdvice: "¡Presiona Start! Conéctate al modo estudio para subir de nivel tu isla gamer.",
  },
  {
    id: "study",
    name: "Isla Estudio",
    shortName: "Estudio",
    emoji: "📚",
    tagline: "Escritorio de Roble & Biblioteca",
    description: "Superficie de madera noble y pergamino, rodeada de libros, café humeante y sabiduría.",
    accentColor: "#FFD21C",
    badgeBg: "bg-amber-600",
    skyDay: "from-[#E2D4B7] via-[#EDE0CA] to-[#FAF6EE]",
    skyNight: "from-[#17120C] via-[#2A1E14] to-[#3B291A]",
    groundDay: "bg-[#854D0E]",
    groundNight: "bg-[#451A03]",
    groundHighlightDay: "bg-[#CA8A04]",
    groundHighlightNight: "bg-[#78350F]",
    crustShadowDay: "shadow-[0_16px_0_0_#543006,0_28px_0_0_#311B03,12px_36px_0_0_#000]",
    crustShadowNight: "shadow-[0_16px_0_0_#2B1402,0_28px_0_0_#140901,12px_36px_0_0_#000]",
    sunColor: "bg-[#F59E0B]",
    sunBorder: "border-black",
    sunIconColor: "text-stone-900",
    moonColor: "bg-amber-100",
    decorations: [
      { emoji: "📖", className: "top-4 left-8 text-sm select-none", label: "Libro abierto" },
      { emoji: "☕", className: "top-6 right-12 text-sm select-none", label: "Café de estudio" },
      { emoji: "📜", className: "bottom-6 left-16 text-xs select-none", label: "Pergamino" },
      { emoji: "🖋️", className: "bottom-5 right-20 text-xs select-none", label: "Pluma estilográfica" },
      { emoji: "👓", className: "top-1/2 left-4 text-xs select-none", label: "Lentes de lectura" },
    ],
    emptyStateAdvice: "Tu escritorio académico espera tus apuntes. ¡Empieza una jornada de estudio!",
  },
  {
    id: "cosmic",
    name: "Isla Cósmica",
    shortName: "Cósmica",
    emoji: "🚀",
    tagline: "Superficie Lunar & Nebulosas",
    description: "Suelo de regolito lunar con cráteres brillantes, polvo de estrellas y vistas al cosmos.",
    accentColor: "#A855F7",
    badgeBg: "bg-purple-600",
    skyDay: "from-[#0F172A] via-[#1E1B4B] to-[#311042]",
    skyNight: "from-[#020617] via-[#0B0A1A] to-[#160B24]",
    groundDay: "bg-[#475569]",
    groundNight: "bg-[#1E293B]",
    groundHighlightDay: "bg-[#94A3B8]",
    groundHighlightNight: "bg-[#475569]",
    crustShadowDay: "shadow-[0_16px_0_0_#334155,0_28px_0_0_#1E293B,12px_36px_0_0_#000]",
    crustShadowNight: "shadow-[0_16px_0_0_#0F172A,0_28px_0_0_#020617,12px_36px_0_0_#000]",
    sunColor: "bg-[#C084FC]",
    sunBorder: "border-black",
    sunIconColor: "text-white",
    moonColor: "bg-slate-200",
    decorations: [
      { emoji: "🪐", className: "top-4 left-8 text-sm select-none", label: "Saturno" },
      { emoji: "☄️", className: "top-6 right-12 text-sm select-none animate-pulse", label: "Cometa" },
      { emoji: "🛸", className: "bottom-6 left-16 text-xs select-none", label: "Ovni explorador" },
      { emoji: "🌟", className: "bottom-5 right-20 text-xs select-none animate-ping duration-1000", label: "Estrella supernova" },
      { emoji: "🛰️", className: "top-1/2 left-4 text-xs select-none", label: "Satélite" },
    ],
    emptyStateAdvice: "El universo del conocimiento es infinito. ¡Despega tu concentración espacial!",
  },
];
