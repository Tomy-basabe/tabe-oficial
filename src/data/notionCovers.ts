export type NotionCoverCategory =
  | "Colors"
  | "Gradients"
  | "Patterns"
  | "Minimalist"
  | "Academic"
  | "Nature"
  | "Science"
  | "Technology"
  | "Arts"
  | "Business"
  | "Travel"
  | "Wellness"
  | "Dark";

export interface NotionCoverOption {
  id: string;
  name: string;
  url: string;
  category: NotionCoverCategory;
}

interface CoverPreset {
  id: string;
  name: string;
  category: NotionCoverCategory;
  colors: [string, string, string];
  icon: string;
  subtitle: string;
}

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const createCoverUrl = ({
  name,
  colors,
  icon,
  subtitle,
}: Omit<CoverPreset, "id" | "category">): string => {
  const safeName = escapeXml(name);
  const safeSubtitle = escapeXml(subtitle);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${colors[0]}"/>
          <stop offset="52%" stop-color="${colors[1]}"/>
          <stop offset="100%" stop-color="${colors[2]}"/>
        </linearGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="70"/></filter>
        <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse">
          <path d="M54 0H0V54" fill="none" stroke="#ffffff" stroke-opacity=".12"/>
        </pattern>
      </defs>
      <rect width="1600" height="900" fill="url(#background)"/>
      <circle cx="1350" cy="170" r="280" fill="#fff" opacity=".13" filter="url(#blur)"/>
      <circle cx="260" cy="760" r="240" fill="#000" opacity=".1" filter="url(#blur)"/>
      <rect width="1600" height="900" fill="url(#grid)"/>
      <path d="M0 710C300 560 430 890 760 700s460-30 840-190v390H0Z" fill="#000" opacity=".12"/>
      <text x="116" y="170" font-family="Arial,sans-serif" font-size="86" fill="#fff" opacity=".9">${icon}</text>
      <text x="116" y="650" font-family="Arial,sans-serif" font-size="58" font-weight="700" fill="#fff">${safeName}</text>
      <text x="120" y="710" font-family="Arial,sans-serif" font-size="24" letter-spacing="4" fill="#fff" opacity=".78">${safeSubtitle}</text>
      <rect x="120" y="760" width="110" height="7" rx="4" fill="#fff" opacity=".75"/>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

type RawCoverPreset = [
  string,
  string,
  NotionCoverCategory,
  [string, string, string],
  string,
  string,
];

const presets: RawCoverPreset[] = [
  ["grad", "Sunset Peach", "Gradients", ["#fb7185", "#f97316", "#facc15"], "◒", "CREATIVE NOTES"],
  ["grad", "Ocean Breeze", "Gradients", ["#0ea5e9", "#2563eb", "#312e81"], "≈", "FOCUS & FLOW"],
  ["grad", "Aurora Borealis", "Gradients", ["#0f766e", "#14b8a6", "#7e22ce"], "✦", "IDEAS IN MOTION"],
  ["grad", "Lavender Mist", "Gradients", ["#c084fc", "#8b5cf6", "#4338ca"], "✧", "CALM STUDY"],
  ["grad", "Lemon Sorbet", "Gradients", ["#fef08a", "#facc15", "#f97316"], "☼", "BRIGHT THINKING"],
  ["grad", "Rose Quartz", "Gradients", ["#fda4af", "#ec4899", "#9333ea"], "♡", "SOFT MOMENTS"],
  ["grad", "Mint Sunrise", "Gradients", ["#99f6e4", "#10b981", "#0f766e"], "❋", "FRESH START"],
  ["grad", "Blue Hour", "Gradients", ["#1e3a8a", "#4338ca", "#7c3aed"], "☾", "DEEP WORK"],
  ["pat", "Japanese Wave", "Patterns", ["#0f766e", "#115e59", "#134e4a"], "〰", "STUDIO ARCHIVE"],
  ["pat", "Terracotta Lines", "Patterns", ["#c2410c", "#ea580c", "#7c2d12"], "▱", "WARM IDEAS"],
  ["pat", "Midnight Dots", "Patterns", ["#111827", "#374151", "#111827"], "⠿", "NIGHT MODE"],
  ["pat", "Linen Grid", "Patterns", ["#d6d3d1", "#a8a29e", "#57534e"], "▦", "EVERYDAY NOTES"],
  ["pat", "Cobalt Waves", "Patterns", ["#1d4ed8", "#1e40af", "#172554"], "≋", "MOMENTUM"],
  ["pat", "Coral Confetti", "Patterns", ["#f43f5e", "#e11d48", "#9f1239"], "⁕", "PLAYFUL PROJECTS"],
  ["pat", "Sage Tiles", "Patterns", ["#84cc16", "#4d7c0f", "#365314"], "⌘", "ORGANIZED MIND"],
  ["pat", "Ink Marbling", "Patterns", ["#334155", "#475569", "#0f172a"], "∿", "RESEARCH LOG"],
  ["min", "Soft Concrete", "Minimalist", ["#d4d4d8", "#a1a1aa", "#52525b"], "□", "LESS, BETTER"],
  ["min", "Monochrome Geometry", "Minimalist", ["#18181b", "#3f3f46", "#71717a"], "△", "CLEAR THINKING"],
  ["min", "Paper Shadow", "Minimalist", ["#f5f5f4", "#d6d3d1", "#78716c"], "▤", "QUIET SPACE"],
  ["min", "Sienna Shape", "Minimalist", ["#f5f5f4", "#a16207", "#713f12"], "◼", "SIMPLE SYSTEMS"],
  ["min", "Slate Architecture", "Minimalist", ["#cbd5e1", "#64748b", "#334155"], "▥", "STRUCTURED WORK"],
  ["min", "Almond Balance", "Minimalist", ["#fef3c7", "#d97706", "#92400e"], "◐", "BALANCED NOTES"],
  ["min", "Graphite Lines", "Minimalist", ["#fafafa", "#525252", "#171717"], "╱", "PRECISION"],
  ["min", "Frosted Glass", "Minimalist", ["#e0f2fe", "#7dd3fc", "#0369a1"], "◇", "OPEN HORIZONS"],
  ["acad", "Library Bookshelves", "Academic", ["#78350f", "#92400e", "#451a03"], "▥", "READ • LEARN • GROW"],
  ["acad", "Vintage Desk", "Academic", ["#a16207", "#ca8a04", "#713f12"], "✎", "LECTURE NOTES"],
  ["acad", "Blueprint Mathematics", "Academic", ["#172554", "#1d4ed8", "#0c4a6e"], "∑", "SOLVE THE UNKNOWN"],
  ["acad", "Botany Field Guide", "Academic", ["#14532d", "#15803d", "#365314"], "❧", "FIELD STUDIES"],
  ["acad", "Language Lab", "Academic", ["#701a75", "#a21caf", "#4a044e"], "Aa", "WORDS & MEANING"],
  ["acad", "History Archive", "Academic", ["#44403c", "#78716c", "#292524"], "⌛", "PAST & CONTEXT"],
  ["acad", "Law Casebook", "Academic", ["#172554", "#334155", "#0f172a"], "§", "ARGUMENTS & EVIDENCE"],
  ["acad", "Exam Prep", "Academic", ["#991b1b", "#dc2626", "#7f1d1d"], "✓", "READY TO REVIEW"],
  ["nature", "Mossy Forest", "Nature", ["#14532d", "#166534", "#052e16"], "♧", "GROW SLOWLY"],
  ["nature", "Desert Dunes", "Nature", ["#f59e0b", "#c2410c", "#7c2d12"], "◒", "WIDE OPEN SPACE"],
  ["nature", "Alpine Morning", "Nature", ["#dbeafe", "#60a5fa", "#1e40af"], "△", "HIGHER PERSPECTIVE"],
  ["nature", "Tropical Leaves", "Nature", ["#064e3b", "#059669", "#166534"], "❧", "FRESH PERSPECTIVES"],
  ["nature", "Coastal Cliffs", "Nature", ["#164e63", "#0891b2", "#155e75"], "≈", "FIND YOUR CURRENT"],
  ["nature", "Wildflower Meadow", "Nature", ["#be185d", "#db2777", "#7e22ce"], "✿", "SMALL JOYS"],
  ["nature", "Autumn Trail", "Nature", ["#9a3412", "#ea580c", "#78350f"], "❧", "ONE STEP AT A TIME"],
  ["nature", "Moonlit Lake", "Nature", ["#172554", "#1e3a8a", "#312e81"], "☾", "REFLECT & RESET"],
  ["science", "Molecular Blue", "Science", ["#0c4a6e", "#0284c7", "#164e63"], "⚛", "DISCOVER MORE"],
  ["science", "Microscope Lab", "Science", ["#134e4a", "#0f766e", "#155e75"], "⚗", "OBSERVE • TEST • LEARN"],
  ["science", "Neural Network", "Science", ["#312e81", "#7c3aed", "#581c87"], "✺", "CONNECT THE DOTS"],
  ["science", "Astronomy Night", "Science", ["#020617", "#172554", "#3730a3"], "✦", "BEYOND THE VISIBLE"],
  ["science", "Geology Layers", "Science", ["#713f12", "#a16207", "#451a03"], "◈", "LAYERS OF KNOWLEDGE"],
  ["science", "Chemistry Notes", "Science", ["#14532d", "#16a34a", "#065f46"], "⚗", "FORMULAS & FINDINGS"],
  ["science", "Physics Motion", "Science", ["#7f1d1d", "#b91c1c", "#9a3412"], "∿", "FORCE & MOTION"],
  ["science", "Data Observatory", "Science", ["#0f172a", "#334155", "#0e7490"], "⌁", "MEASURE WHAT MATTERS"],
  ["tech", "Digital Future", "Technology", ["#0f172a", "#1d4ed8", "#06b6d4"], "⌘", "BUILD THE NEXT"],
  ["tech", "Cyber Neon", "Technology", ["#18181b", "#7e22ce", "#db2777"], "⌁", "SYSTEM ONLINE"],
  ["tech", "Code & Coffee", "Technology", ["#422006", "#92400e", "#292524"], "</>", "SHIP SMALL, LEARN FAST"],
  ["tech", "Interface Grid", "Technology", ["#172554", "#1e40af", "#0f766e"], "▦", "DESIGN WITH PURPOSE"],
  ["tech", "Cloud Systems", "Technology", ["#e0f2fe", "#0284c7", "#1e3a8a"], "☁", "CONNECTED WORK"],
  ["tech", "Robotics Lab", "Technology", ["#334155", "#64748b", "#0f172a"], "⚙", "MAKE IT MOVE"],
  ["tech", "Pixel Studio", "Technology", ["#4c1d95", "#7c3aed", "#be185d"], "▦", "CREATE DIGITALLY"],
  ["tech", "Security Vault", "Technology", ["#111827", "#374151", "#1e293b"], "◆", "PROTECT THE SIGNAL"],
  ["arts", "Watercolor Bloom", "Arts", ["#f43f5e", "#f97316", "#eab308"], "✿", "MAKE SOMETHING BEAUTIFUL"],
  ["arts", "Gallery Blue", "Arts", ["#1e3a8a", "#2563eb", "#4338ca"], "▧", "CURATE YOUR IDEAS"],
  ["arts", "Studio Clay", "Arts", ["#9a3412", "#c2410c", "#7c2d12"], "◉", "FORM & TEXTURE"],
  ["arts", "Film Grain", "Arts", ["#292524", "#57534e", "#1c1917"], "▣", "FRAME THE STORY"],
  ["arts", "Jazz Poster", "Arts", ["#701a75", "#be185d", "#4c1d95"], "♫", "RHYTHM & FLOW"],
  ["arts", "Theatre Lights", "Arts", ["#450a0a", "#b91c1c", "#701a75"], "✦", "TAKE THE STAGE"],
  ["arts", "Design Shapes", "Arts", ["#0f766e", "#0891b2", "#2563eb"], "◇", "THINK VISUALLY"],
  ["arts", "Poetry Evening", "Arts", ["#312e81", "#4c1d95", "#831843"], "❝", "WORDS THAT STAY"],
  ["business", "Startup Energy", "Business", ["#1d4ed8", "#2563eb", "#0f766e"], "↗", "MAKE IT HAPPEN"],
  ["business", "Market Strategy", "Business", ["#064e3b", "#047857", "#14532d"], "▥", "SEE THE BIG PICTURE"],
  ["business", "Team Workshop", "Business", ["#7c2d12", "#ea580c", "#9a3412"], "♧", "BETTER TOGETHER"],
  ["business", "Finance Ledger", "Business", ["#172554", "#334155", "#0f172a"], "$", "NUMBERS TELL STORIES"],
  ["business", "Product Roadmap", "Business", ["#4c1d95", "#7c3aed", "#1e3a8a"], "→", "FROM IDEA TO IMPACT"],
  ["business", "Leadership Notes", "Business", ["#78350f", "#b45309", "#92400e"], "★", "LEAD WITH CLARITY"],
  ["business", "Creative Brief", "Business", ["#be185d", "#db2777", "#9333ea"], "✦", "START WITH WHY"],
  ["business", "Project Board", "Business", ["#164e63", "#0e7490", "#155e75"], "▦", "PLAN • DO • SHIP"],
  ["travel", "Mediterranean Map", "Travel", ["#0c4a6e", "#0891b2", "#0f766e"], "⌖", "NEW PLACES, NEW IDEAS"],
  ["travel", "Mountain Route", "Travel", ["#334155", "#64748b", "#1e3a8a"], "⌁", "CHOOSE YOUR PATH"],
  ["travel", "Tokyo Nights", "Travel", ["#4c1d95", "#be185d", "#9f1239"], "✦", "CITY NOTEBOOK"],
  ["travel", "Road Trip", "Travel", ["#b45309", "#ea580c", "#9a3412"], "➜", "KEEP MOVING"],
  ["travel", "Island Time", "Travel", ["#0f766e", "#06b6d4", "#0284c7"], "≈", "SPACE TO BREATHE"],
  ["travel", "Train Window", "Travel", ["#1e3a8a", "#4338ca", "#581c87"], "▣", "JOURNEY NOTES"],
  ["travel", "Old Town", "Travel", ["#78350f", "#a16207", "#57534e"], "⌂", "STORIES IN EVERY STREET"],
  ["travel", "Northern Lights", "Travel", ["#064e3b", "#0f766e", "#312e81"], "✧", "FOLLOW THE WONDER"],
  ["well", "Morning Routine", "Wellness", ["#fef3c7", "#f59e0b", "#ea580c"], "☼", "START WITH INTENTION"],
  ["well", "Breathing Space", "Wellness", ["#ccfbf1", "#14b8a6", "#0f766e"], "◌", "PAUSE • BREATHE • BEGIN"],
  ["well", "Gentle Focus", "Wellness", ["#dbeafe", "#60a5fa", "#4338ca"], "♡", "KIND PRODUCTIVITY"],
  ["well", "Mindful Journal", "Wellness", ["#fce7f3", "#f472b6", "#9333ea"], "✿", "CHECK IN WITH YOURSELF"],
  ["well", "Healthy Habits", "Wellness", ["#dcfce7", "#22c55e", "#15803d"], "✓", "SMALL STEPS DAILY"],
  ["well", "Sleep & Reset", "Wellness", ["#172554", "#312e81", "#581c87"], "☾", "REST IS PRODUCTIVE"],
  ["well", "Balance Board", "Wellness", ["#fef9c3", "#84cc16", "#0f766e"], "◐", "FIND YOUR CENTER"],
  ["well", "Joy List", "Wellness", ["#fef3c7", "#fb7185", "#db2777"], "♡", "NOTICE THE GOOD"],
  ["dark", "Obsidian", "Dark", ["#09090b", "#27272a", "#18181b"], "◆", "FOCUS MODE"],
  ["dark", "Deep Ocean", "Dark", ["#020617", "#0f172a", "#164e63"], "≈", "NO DISTRACTIONS"],
  ["dark", "Plum Night", "Dark", ["#1e1b4b", "#312e81", "#581c87"], "✦", "LATE NIGHT IDEAS"],
  ["dark", "Forest Night", "Dark", ["#022c22", "#064e3b", "#14532d"], "♧", "QUIET MOMENTUM"],
  ["dark", "Graphite", "Dark", ["#18181b", "#3f3f46", "#52525b"], "▦", "CLARITY THROUGH SIMPLICITY"],
  ["dark", "Crimson Ink", "Dark", ["#1c1917", "#7f1d1d", "#450a0a"], "✎", "BOLD THOUGHTS"],
  ["dark", "Indigo Signal", "Dark", ["#111827", "#312e81", "#1e40af"], "⌁", "STAY IN THE FLOW"],
  ["dark", "Violet Static", "Dark", ["#18181b", "#581c87", "#86198f"], "⁕", "MAKE IT YOURS"],
].map(([prefix, name, category, colors, icon, subtitle]) => ({
  id: `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name,
  category: category as NotionCoverCategory,
  colors: colors as [string, string, string],
  icon,
  subtitle,
}));

const illustratedCovers: NotionCoverOption[] = presets.map((cover) => ({
  id: cover.id,
  name: cover.name,
  category: "Colors",
  url: createCoverUrl(cover),
}));

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&h=900&q=85`;

type PhotoCover = [string, string, NotionCoverCategory, string];

const photoPresets: PhotoCover[] = [
  ["photo-acad", "Biblioteca antigua", "Academic", "photo-1521587760476-6c12a4b040da"],
  ["photo-acad", "Escritorio de estudio", "Academic", "photo-1455390582262-044cdead277a"],
  ["photo-acad", "Libros y cafe", "Academic", "photo-1495446815901-a7297e633e8d"],
  ["photo-acad", "Cuaderno abierto", "Academic", "photo-1517842645767-c639042777db"],
  ["photo-acad", "Apuntes manuscritos", "Academic", "photo-1519682337058-a94d519337bc"],
  ["photo-acad", "Estanteria de libros", "Academic", "photo-1524995997946-a1c2e315a42f"],
  ["photo-acad", "Mesa de lectura", "Academic", "photo-1497633762265-9d179a990aa6"],
  ["photo-acad", "Lapices y papel", "Academic", "photo-1456324504439-367cee3b3c32"],
  ["photo-acad", "Sala de estudio", "Academic", "photo-1523050854058-8df90110c9f1"],
  ["photo-acad", "Notas de clase", "Academic", "photo-1434030216411-0b793f4b4173"],
  ["photo-nature", "Bosque entre niebla", "Nature", "photo-1448375240586-882707db888b"],
  ["photo-nature", "Montanas azules", "Nature", "photo-1464822759023-fed622ff2c3b"],
  ["photo-nature", "Lago de montana", "Nature", "photo-1500534623283-312aade485b7"],
  ["photo-nature", "Pinos al amanecer", "Nature", "photo-1448375240586-882707db888b"],
  ["photo-nature", "Sendero verde", "Nature", "photo-1441974231531-c6227db76b6e"],
  ["photo-nature", "Cascada natural", "Nature", "photo-1433086966358-54859d0ed716"],
  ["photo-nature", "Campo de flores", "Nature", "photo-1490750967868-88aa4486c946"],
  ["photo-nature", "Hojas tropicales", "Nature", "photo-1497250681960-ef046c08a56e"],
  ["photo-nature", "Desierto dorado", "Nature", "photo-1509316785289-025f5b846b35"],
  ["photo-nature", "Costa rocosa", "Nature", "photo-1500534623283-312aade485b7"],
  ["photo-city", "Ciudad de noche", "Travel", "photo-1519501025264-65ba15a82390"],
  ["photo-city", "Calles de Tokio", "Travel", "photo-1540959733332-eab4deabeeaf"],
  ["photo-city", "Arquitectura moderna", "Travel", "photo-1486406146926-c627a92ad1ab"],
  ["photo-city", "Calle europea", "Travel", "photo-1499856871958-5b9627545d1a"],
  ["photo-city", "Metro urbano", "Travel", "photo-1519003722824-194d4455a60c"],
  ["photo-city", "Edificios geometricos", "Travel", "photo-1480714378408-67cf0d13bc1b"],
  ["photo-city", "Camino costero", "Travel", "photo-1507525428034-b723cf961d3e"],
  ["photo-city", "Mapa y viaje", "Travel", "photo-1526778548025-fa2f459cd5c1"],
  ["photo-city", "Carretera abierta", "Travel", "photo-1465447142348-e9952c393450"],
  ["photo-city", "Estacion de tren", "Travel", "photo-1474487548417-781cb71495f3"],
  ["photo-food", "Cafe de especialidad", "Wellness", "photo-1495474472287-4d71bcdd2085"],
  ["photo-food", "Desayuno natural", "Wellness", "photo-1498837167922-ddd27525d352"],
  ["photo-food", "Frutas frescas", "Wellness", "photo-1610832958506-aa56368176cf"],
  ["photo-food", "Mesa saludable", "Wellness", "photo-1543362906-acfc16c67564"],
  ["photo-food", "Te de hierbas", "Wellness", "photo-1544787219-7f47ccb76574"],
  ["photo-food", "Cocina minimalista", "Wellness", "photo-1556910103-1c02745aae4d"],
  ["photo-food", "Pan artesanal", "Wellness", "photo-1509440159596-0249088772ff"],
  ["photo-food", "Cuenco de frutas", "Wellness", "photo-1490645935967-10de6ba17061"],
  ["photo-food", "Jugo verde", "Wellness", "photo-1610970881699-44a5587cabec"],
  ["photo-food", "Ritual de manana", "Wellness", "photo-1513558161293-cdaf765ed2fd"],
  ["photo-art", "Pintura y pinceles", "Arts", "photo-1460661419201-fd4cecdf8a8b"],
  ["photo-art", "Estudio creativo", "Arts", "photo-1513364776144-60967b0f800f"],
  ["photo-art", "Ceramica artesanal", "Arts", "photo-1493106641515-6b5631de4bb9"],
  ["photo-art", "Camara analogica", "Arts", "photo-1516035069371-29a1b244cc32"],
  ["photo-art", "Fotografia urbana", "Arts", "photo-1452780212940-6f5c0d14d848"],
  ["photo-art", "Vinilos y musica", "Arts", "photo-1461360228754-6e81c478b882"],
  ["photo-art", "Teatro vacio", "Arts", "photo-1503095396549-807759245b35"],
  ["photo-art", "Manos creando", "Arts", "photo-1452860606245-08befc0ff44b"],
  ["photo-art", "Paleta de colores", "Arts", "photo-1541701494587-cb58502866ab"],
  ["photo-art", "Escritura creativa", "Arts", "photo-1455390582262-044cdead277a"],
  ["photo-tech", "Laptop y codigo", "Technology", "photo-1498050108023-c5249f4df085"],
  ["photo-tech", "Escritorio digital", "Technology", "photo-1518770660439-4636190af475"],
  ["photo-tech", "Circuito electronico", "Technology", "photo-1550751827-4bd374c3f58b"],
  ["photo-tech", "Servidor iluminado", "Technology", "photo-1558494949-ef010cbdcc31"],
  ["photo-tech", "Robot industrial", "Technology", "photo-1485827404703-89b55fcc595e"],
  ["photo-tech", "Pantallas azules", "Technology", "photo-1531297484001-80022131f5a1"],
  ["photo-tech", "Teclado mecanico", "Technology", "photo-1587829741301-dc798b83add3"],
  ["photo-tech", "Diseno de interfaz", "Technology", "photo-1558655146-d09347e92766"],
  ["photo-tech", "Fibra optica", "Technology", "photo-1544197150-b99a580bb7a8"],
  ["photo-tech", "Auriculares y trabajo", "Technology", "photo-1492562080023-ab3db95bfbce"],
  ["photo-science", "Laboratorio", "Science", "photo-1532094349884-543bc11b234d"],
  ["photo-science", "Microscopio", "Science", "photo-1576086213369-97a306d36557"],
  ["photo-science", "Astronomia", "Science", "photo-1446776811953-b23d57bd21aa"],
  ["photo-science", "Cielo estrellado", "Science", "photo-1519681393784-d120267933ba"],
  ["photo-science", "Geologia", "Science", "photo-1526336024174-e58f5cdd8e13"],
  ["photo-science", "Planta en laboratorio", "Science", "photo-1531058020387-3be344556be6"],
  ["photo-science", "Formula en pizarra", "Science", "photo-1509228468518-180dd4864904"],
  ["photo-science", "Datos y analisis", "Science", "photo-1551288049-bebda4e38f71"],
  ["photo-science", "Investigacion", "Science", "photo-1582719478250-c89cae4dc85b"],
  ["photo-science", "Telescopio", "Science", "photo-1462331940025-496dfbfc7564"],
  ["photo-business", "Reunion de equipo", "Business", "photo-1556761175-b413da4baf72"],
  ["photo-business", "Planificacion", "Business", "photo-1454165804606-c3d57bc86b40"],
  ["photo-business", "Trabajo colaborativo", "Business", "photo-1521737711867-e3b97375f902"],
  ["photo-business", "Presentacion", "Business", "photo-1551836022-d5d88e9218df"],
  ["photo-business", "Cuaderno ejecutivo", "Business", "photo-1497215728101-856f4ea42174"],
  ["photo-business", "Grafico de crecimiento", "Business", "photo-1460925895917-afdab827c52f"],
  ["photo-business", "Oficina luminosa", "Business", "photo-1497366754035-f200968a6e72"],
  ["photo-business", "Ideas en post it", "Business", "photo-1531482615713-2afd69097998"],
  ["photo-business", "Manos en proyecto", "Business", "photo-1553877522-43269d4ea984"],
  ["photo-business", "Trabajo remoto", "Business", "photo-1556761175-5973dc0f32e7"],
  ["photo-dark", "Noche lluviosa", "Dark", "photo-1519608487953-e999c86e7455"],
  ["photo-dark", "Ciudad bajo la lluvia", "Dark", "photo-1519608487953-e999c86e7455"],
  ["photo-dark", "Montana nocturna", "Dark", "photo-1483347756197-71ef80e95f73"],
  ["photo-dark", "Cielo profundo", "Dark", "photo-1534791547706-2f7b86f0c5c7"],
  ["photo-dark", "Mar oscuro", "Dark", "photo-1518837695005-2083093ee35b"],
  ["photo-dark", "Luces desenfocadas", "Dark", "photo-1514525253161-7a46d19cd819"],
  ["photo-dark", "Neon urbano", "Dark", "photo-1519608487953-e999c86e7455"],
  ["photo-dark", "Sombras arquitectonicas", "Dark", "photo-1518005020951-ehebb0c5d9f2"],
  ["photo-dark", "Cafe nocturno", "Dark", "photo-1512568400610-62da28bc8a13"],
  ["photo-dark", "Luz de ventana", "Dark", "photo-1494438639946-1ebd1d20bf85"],
];

const photographicCovers: NotionCoverOption[] = photoPresets.map(
  ([prefix, name, category, imageId], index) => ({
    id: `${prefix}-${index + 1}`,
    name,
    category,
    url: photo(imageId),
  })
);

const additionalPhotoPresets: PhotoCover[] = [
  ["photo-life", "Mercado de flores", "Nature", "photo-1487070183336-b863922373d4"],
  ["photo-life", "Jardin botanico", "Nature", "photo-1585320806297-9794b3e4eeae"],
  ["photo-life", "Rama de eucalipto", "Nature", "photo-1512428813834-c702c7702b78"],
  ["photo-life", "Puesta de sol", "Nature", "photo-1472120435266-531912e61f4a"],
  ["photo-life", "Rio entre arboles", "Nature", "photo-1437482078695-73f5ca6c96e2"],
  ["photo-life", "Playa tranquila", "Travel", "photo-1507525428034-b723cf961d3e"],
  ["photo-life", "Olas del oceano", "Travel", "photo-1500534623283-312aade485b7"],
  ["photo-life", "Faro costero", "Travel", "photo-1494783367193-149034c05e8f"],
  ["photo-life", "Puerto al amanecer", "Travel", "photo-1530789253388-582c481c54b0"],
  ["photo-life", "Maleta de viaje", "Travel", "photo-1553531384-cc64ac80f931"],
  ["photo-life", "Bicicleta urbana", "Travel", "photo-1502744688674-c619d1586c9e"],
  ["photo-life", "Calle con lluvia", "Travel", "photo-1517999349371-c43520457b23"],
  ["photo-life", "Arquitectura blanca", "Travel", "photo-1497366811353-6870744d04b2"],
  ["photo-life", "Puente iluminado", "Travel", "photo-1477959858617-67f85cf4f1df"],
  ["photo-life", "Ventana con paisaje", "Travel", "photo-1500530855697-b586d89ba3ee"],
  ["photo-life", "Pizarra de ideas", "Business", "photo-1499750310107-5fef28a66643"],
  ["photo-life", "Agenda de trabajo", "Business", "photo-1517245386807-bb43f82c33c4"],
  ["photo-life", "Equipo reunido", "Business", "photo-1521737604893-d14cc237f11d"],
  ["photo-life", "Oficina de madera", "Business", "photo-1497366216548-37526070297c"],
  ["photo-life", "Mesa de proyecto", "Business", "photo-1542744173-8e7e53415bb0"],
  ["photo-life", "Persona trabajando", "Business", "photo-1499951360447-b19be8fe80f5"],
  ["photo-life", "Grafico financiero", "Business", "photo-1551288049-bebda4e38f71"],
  ["photo-life", "Apretón de manos", "Business", "photo-1521791055366-0d553872125f"],
  ["photo-life", "Sala de conferencias", "Business", "photo-1497366754035-f200968a6e72"],
  ["photo-life", "Laptop en cafe", "Technology", "photo-1516321318423-f06f85e504b3"],
  ["photo-life", "Codigo en pantalla", "Technology", "photo-1515879218367-8466d910aaa4"],
  ["photo-life", "Escritorio de programador", "Technology", "photo-1537432376769-00f5c2f4c8d2"],
  ["photo-life", "Placa electronica", "Technology", "photo-1518770660439-4636190af475"],
  ["photo-life", "Centro de datos", "Technology", "photo-1558494949-ef010cbdcc31"],
  ["photo-life", "Realidad virtual", "Technology", "photo-1617802690992-15d93263d3a9"],
  ["photo-life", "Impresion 3D", "Technology", "photo-1633412802994-5c058f151b66"],
  ["photo-life", "Telefono y cafe", "Technology", "photo-1512941937669-90a1b58e7e9c"],
  ["photo-life", "Dron en el cielo", "Technology", "photo-1473968512647-3e447244af8f"],
  ["photo-life", "Auriculares", "Technology", "photo-1505740420928-5e560c06d30e"],
  ["photo-life", "Reactivo de laboratorio", "Science", "photo-1582719478250-c89cae4dc85b"],
  ["photo-life", "Tubos de ensayo", "Science", "photo-1576086213369-97a306d36557"],
  ["photo-life", "Investigadora", "Science", "photo-1532094349884-543bc11b234d"],
  ["photo-life", "Luna llena", "Science", "photo-1532693322450-2cb5c511067d"],
  ["photo-life", "Via lactea", "Science", "photo-1462331940025-496dfbfc7564"],
  ["photo-life", "Nebulosa", "Science", "photo-1444703686981-a3abbc4d4fe3"],
  ["photo-life", "Piedras minerales", "Science", "photo-1518709268805-4e9042af9f23"],
  ["photo-life", "Cristales naturales", "Science", "photo-1513836279014-a89f7a76ae86"],
  ["photo-life", "Panal de abejas", "Science", "photo-1473929734674-9c0ae7b8b5c3"],
  ["photo-life", "Hojas bajo microscopio", "Science", "photo-1531058020387-3be344556be6"],
  ["photo-life", "Paleta sobre mesa", "Arts", "photo-1513364776144-60967b0f800f"],
  ["photo-life", "Pinceles coloridos", "Arts", "photo-1452860606245-08befc0ff44b"],
  ["photo-life", "Mesa de ceramica", "Arts", "photo-1493106641515-6b5631de4bb9"],
  ["photo-life", "Camara fotografica", "Arts", "photo-1516035069371-29a1b244cc32"],
  ["photo-life", "Pelicula fotografica", "Arts", "photo-1502982720700-bfff97f2ecac"],
  ["photo-life", "Microfono de estudio", "Arts", "photo-1598488035139-bdbb2231ce04"],
  ["photo-life", "Guitarra acustica", "Arts", "photo-1524368535928-5b5e00ddc76b"],
  ["photo-life", "Piano de concierto", "Arts", "photo-1520523839897-bd0b52f945a0"],
  ["photo-life", "Escenario vacio", "Arts", "photo-1503095396549-807759245b35"],
  ["photo-life", "Teatro iluminado", "Arts", "photo-1514306191717-452ec28c7814"],
  ["photo-life", "Taza de cafe", "Wellness", "photo-1495474472287-4d71bcdd2085"],
  ["photo-life", "Yoga al amanecer", "Wellness", "photo-1544367567-0f2fcb009e0b"],
  ["photo-life", "Meditacion", "Wellness", "photo-1506126613408-eca07ce68773"],
  ["photo-life", "Botella de agua", "Wellness", "photo-1523362628745-0c100150b504"],
  ["photo-life", "Comida fresca", "Wellness", "photo-1543362906-acfc16c67564"],
  ["photo-life", "Verduras de mercado", "Wellness", "photo-1542838132-92c53300491e"],
  ["photo-life", "Pan recien horneado", "Wellness", "photo-1509440159596-0249088772ff"],
  ["photo-life", "Frutos rojos", "Wellness", "photo-1498557850523-fd3d118b962e"],
  ["photo-life", "Habitacion serena", "Wellness", "photo-1505693416388-ac5ce068fe85"],
  ["photo-life", "Planta junto a ventana", "Wellness", "photo-1545241047-6083a3684587"],
  ["photo-life", "Noche con estrellas", "Dark", "photo-1519608487953-e999c86e7455"],
  ["photo-life", "Bosque oscuro", "Dark", "photo-1511497584788-876760111969"],
  ["photo-life", "Luces de ciudad", "Dark", "photo-1519608487953-e999c86e7455"],
  ["photo-life", "Calle neon", "Dark", "photo-1514525253161-7a46d19cd819"],
  ["photo-life", "Ventana nocturna", "Dark", "photo-1519682337058-a94d519337bc"],
  ["photo-life", "Luz roja", "Dark", "photo-1500530855697-b586d89ba3ee"],
  ["photo-life", "Nubes de tormenta", "Dark", "photo-1499346030926-9a72daac6c63"],
  ["photo-life", "Mar bajo la luna", "Dark", "photo-1518837695005-2083093ee35b"],
  ["photo-life", "Cielo violeta", "Dark", "photo-1500534623283-312aade485b7"],
  ["photo-life", "Cafe en penumbra", "Dark", "photo-1512568400610-62da28bc8a13"],
  ["photo-life", "Humo y luz", "Dark", "photo-1531058020387-3be344556be6"],
  ["photo-more", "Arbol solitario", "Nature", "photo-1515586000433-45406d8e6662"],
  ["photo-more", "Rocio en las hojas", "Nature", "photo-1501854140801-50d01698950b"],
  ["photo-more", "Arce de otono", "Nature", "photo-1509223197845-458d87318791"],
  ["photo-more", "Niebla del valle", "Nature", "photo-1483347756197-71ef80e95f73"],
  ["photo-more", "Prado al amanecer", "Nature", "photo-1470770841072-f978cf4d019e"],
  ["photo-more", "Rocas y mar", "Nature", "photo-1511497584788-876760111969"],
  ["photo-more", "Canyon de piedra", "Nature", "photo-1475924156734-496f6cac6ec1"],
  ["photo-more", "Nieve en la cumbre", "Nature", "photo-1486911278844-a81c5267e227"],
  ["photo-more", "Lago turquesa", "Nature", "photo-1469474968028-56623f02e42e"],
  ["photo-more", "Rio cristalino", "Nature", "photo-1437482078695-73f5ca6c96e2"],
  ["photo-more", "Puerto maritimo", "Travel", "photo-1500375592092-40eb2168fd21"],
  ["photo-more", "Avion sobre las nubes", "Travel", "photo-1436491865332-7a61a109cc05"],
  ["photo-more", "Brujula y mapa", "Travel", "photo-1524666041070-9c876c7b3f0f"],
  ["photo-more", "Mochila de aventura", "Travel", "photo-1551632811-561732d1e306"],
  ["photo-more", "Cabana en el bosque", "Travel", "photo-1449158743715-0a90ebb6d2d8"],
  ["photo-more", "Puente de madera", "Travel", "photo-1510798831971-661eb04b3739"],
  ["photo-more", "Cupula historica", "Travel", "photo-1539650116574-75c0c6d73f6e"],
  ["photo-more", "Plaza al atardecer", "Travel", "photo-1533105079780-92b9be482077"],
  ["photo-more", "Ventana del tren", "Travel", "photo-1473445361085-b9a07f55608b"],
  ["photo-more", "Camino entre edificios", "Travel", "photo-1449824913935-59a10b8d2000"],
  ["photo-more", "Notas adhesivas", "Business", "photo-1552664730-d307ca884978"],
  ["photo-more", "Escritorio compartido", "Business", "photo-1497366811353-6870744d04b2"],
  ["photo-more", "Cafe de oficina", "Business", "photo-1497366754035-f200968a6e72"],
  ["photo-more", "Pizarra estrategica", "Business", "photo-1556761175-4b46a572b786"],
  ["photo-more", "Reunion creativa", "Business", "photo-1517048676732-d65bc937f952"],
  ["photo-more", "Trabajo en equipo", "Business", "photo-1522071820081-009f0129c71c"],
  ["photo-more", "Notas y calendario", "Business", "photo-1506784983877-45594efa4cbe"],
  ["photo-more", "Plan anual", "Business", "photo-1450101499163-c8848c66ca85"],
  ["photo-more", "Escritorio ordenado", "Business", "photo-1497215728101-856f4ea42174"],
  ["photo-more", "Presentacion en equipo", "Business", "photo-1556761175-5973dc0f32e7"],
  ["photo-more", "Servidor azul", "Technology", "photo-1558494949-ef010cbdcc31"],
  ["photo-more", "Codigo oscuro", "Technology", "photo-1515879218367-8466d910aaa4"],
  ["photo-more", "Mouse y teclado", "Technology", "photo-1527443224154-c4a3942d3acf"],
  ["photo-more", "Smartphone moderno", "Technology", "photo-1511707171634-5f897ff02aa9"],
  ["photo-more", "Camara digital", "Technology", "photo-1516035069371-29a1b244cc32"],
  ["photo-more", "Cableado de red", "Technology", "photo-1551808525-51a94da548ce"],
  ["photo-more", "Luz de monitor", "Technology", "photo-1496171367470-9ed9a91ea931"],
  ["photo-more", "Dispositivo portatil", "Technology", "photo-1523275335684-37898b6baf30"],
  ["photo-more", "Reloj inteligente", "Technology", "photo-1524805444758-089113d48a6d"],
  ["photo-more", "Cascos inalambricos", "Technology", "photo-1484704849700-f032a568e944"],
  ["photo-more", "Modelo molecular", "Science", "photo-1532187863486-abf9dbad1b69"],
  ["photo-more", "Bata de laboratorio", "Science", "photo-1581093458791-9d42e3c7f8a2"],
  ["photo-more", "Pizarra cientifica", "Science", "photo-1532619675605-1ede6c2ed2b0"],
  ["photo-more", "Planeta azul", "Science", "photo-1614728263952-84ea256f9679"],
  ["photo-more", "Fosil antiguo", "Science", "photo-1581822261290-991b38693d1b"],
  ["photo-more", "Mapa estelar", "Science", "photo-1444703686981-a3abbc4d4fe3"],
  ["photo-more", "Telescopio nocturno", "Science", "photo-1516339901601-2e1b62dc0c45"],
  ["photo-more", "Mesa de ilustracion", "Arts", "photo-1513364776144-60967b0f800f"],
  ["photo-more", "Cinta de cassette", "Arts", "photo-1524368535928-5b5e00ddc76b"],
  ["photo-more", "Disco de vinilo", "Arts", "photo-1539375665275-f9de415ef9ac"],
  ["photo-more", "Teclado de piano", "Arts", "photo-1520523839897-bd0b52f945a0"],
  ["photo-more", "Libro de poemas", "Arts", "photo-1510172951991-856a654063f9"],
  ["photo-more", "Caballete", "Arts", "photo-1549490349-8643362247b5"],
  ["photo-more", "Galeria de arte", "Arts", "photo-1561214115-f2f134cc4912"],
  ["photo-more", "Sillon de lectura", "Wellness", "photo-1505693416388-ac5ce068fe85"],
  ["photo-more", "Velas aromaticas", "Wellness", "photo-1603006905003-be475563bc59"],
  ["photo-more", "Comida casera", "Wellness", "photo-1498837167922-ddd27525d352"],
  ["photo-more", "Ensalada fresca", "Wellness", "photo-1512621776951-a57141f2eefd"],
  ["photo-more", "Frutas sobre madera", "Wellness", "photo-1610832958506-aa56368176cf"],
  ["photo-more", "Te y libro", "Wellness", "photo-1544787219-7f47ccb76574"],
  ["photo-more", "Estiramiento", "Wellness", "photo-1518611012118-696072aa579a"],
  ["photo-more", "Senderismo", "Wellness", "photo-1551632811-561732d1e306"],
  ["photo-more", "Habitacion con plantas", "Wellness", "photo-1618220179428-22790b461013"],
  ["photo-more", "Amanecer tranquilo", "Wellness", "photo-1499209974431-9dddcece7f88"],
  ["photo-more", "Luna sobre el mar", "Dark", "photo-1518837695005-2083093ee35b"],
  ["photo-more", "Lluvia en la ventana", "Dark", "photo-1519692933481-e162a57d6721"],
  ["photo-more", "Edificio en sombras", "Dark", "photo-1487958449943-2429e8be8625"],
  ["photo-more", "Niebla nocturna", "Dark", "photo-1511497584788-876760111969"],
  ["photo-more", "Neon rosa", "Dark", "photo-1550745165-9bc0b252726f"],
  ["photo-more", "Luces del trafico", "Dark", "photo-1492684223066-81342ee5ff30"],
  ["photo-more", "Cielo con nubes", "Dark", "photo-1499346030926-9a72daac6c63"],
  ["photo-more", "Reflejo nocturno", "Dark", "photo-1519608487953-e999c86e7455"],
  ["photo-more", "Lampara encendida", "Dark", "photo-1507473885765-e6ed057f782c"],
  ["photo-more", "Silueta urbana", "Dark", "photo-1519501025264-65ba15a82390"],
];

const extraPhotographicCovers: NotionCoverOption[] = additionalPhotoPresets.map(
  ([prefix, name, category, imageId], index) => ({
    id: `${prefix}-${index + 1}`,
    name,
    category,
    url: photo(imageId),
  })
);

const allCoverOptions = [
  ...photographicCovers,
  ...extraPhotographicCovers,
  ...illustratedCovers,
];

export const NOTION_DEFAULT_COVERS: NotionCoverOption[] = Array.from(
  new Map(allCoverOptions.map((cover) => [cover.url, cover])).values()
);
