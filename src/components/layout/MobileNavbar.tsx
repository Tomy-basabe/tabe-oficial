import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  Calendar,
  Timer,
  BarChart3,
  Settings,
  Layers,
  ClipboardList,
  Trophy,
  TreeDeciduous,
  Repeat2,
  Clock,
  LayoutGrid,
  X,
  CheckSquare,
  Search,
  Sun,
  Moon,
  Globe,
} from "lucide-react";
import {
  DashboardCustomIcon,
  PlanCarreraIcon,
  ExamenesIcon,
  BibliotecaCustomIcon,
  CorrelatividadesCustomIcon,
  ComunidadCustomIcon,
  AmigosCustomIcon,
  UniversidadCatIcon,
  EstudioCatIcon,
  ProductividadCatIcon,
  RecreacionCatIcon,
} from "@/components/icons/TabeSectionIcons";
import { ApuntesIcon } from "@/components/icons/NotionIcon";
import { TabeAIIcon } from "@/components/icons/TabeAIIcon";
import { ArcadeIcon } from "@/components/icons/ArcadeIcon";
import { TabeLogo } from "@/components/ui/TabeLogo";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { preloadRoute } from "@/lib/routePreload";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

export interface NavSectionItem {
  icon: any;
  label: string;
  path: string;
  badge?: string;
  color: string;
  bgTint: string;
  bgActive: string;
}

export const ALL_MOBILE_NAV_ITEMS: {
  category: string;
  categoryLabel: string;
  icon: any;
  items: NavSectionItem[];
}[] = [
    {
      category: "principal",
      categoryLabel: "General",
      icon: DashboardCustomIcon,
      items: [
        {
          icon: DashboardCustomIcon,
          label: "Inicio",
          path: "/dashboard",
          color: "text-blue-600 dark:text-blue-400",
          bgTint: "bg-blue-500/10 dark:bg-blue-500/15",
          bgActive: "bg-blue-600 text-white",
        },
        {
          icon: TabeAIIcon,
          label: "TABE IA",
          path: "/TABEAI",
          badge: "AI",
          color: "text-violet-600 dark:text-violet-400",
          bgTint: "bg-violet-500/10 dark:bg-violet-500/15",
          bgActive: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
        },
      ],
    },
    {
      category: "academico",
      categoryLabel: "Académico",
      icon: UniversidadCatIcon,
      items: [
        {
          icon: Globe,
          label: "Mi Campus",
          path: "/campus",
          color: "text-blue-600 dark:text-blue-400",
          bgTint: "bg-blue-500/10 dark:bg-blue-500/15",
          bgActive: "bg-blue-600 text-white",
        },
        {
          icon: PlanCarreraIcon,
          label: "Carrera",
          path: "/carrera",
          color: "text-emerald-600 dark:text-emerald-400",
          bgTint: "bg-emerald-500/10 dark:bg-emerald-500/15",
          bgActive: "bg-emerald-600 text-white",
        },
        {
          icon: ExamenesIcon,
          label: "Exámenes",
          path: "/examenes",
          color: "text-rose-600 dark:text-rose-400",
          bgTint: "bg-rose-500/10 dark:bg-rose-500/15",
          bgActive: "bg-rose-600 text-white",
        },
        {
          icon: Clock,
          label: "Consultas",
          path: "/consultas",
          color: "text-sky-600 dark:text-sky-400",
          bgTint: "bg-sky-500/10 dark:bg-sky-500/15",
          bgActive: "bg-sky-600 text-white",
        },
        {
          icon: CorrelatividadesCustomIcon,
          label: "Correlativas",
          path: "/mapa",
          color: "text-pink-600 dark:text-pink-400",
          bgTint: "bg-pink-500/10 dark:bg-pink-500/15",
          bgActive: "bg-pink-600 text-white",
        },
      ],
    },
    {
      category: "estudio",
      categoryLabel: "Estudio",
      icon: EstudioCatIcon,
      items: [
        {
          icon: ApuntesIcon,
          label: "Apuntes",
          path: "/apuntes",
          color: "text-zinc-800 dark:text-zinc-200",
          bgTint: "bg-zinc-500/10 dark:bg-zinc-400/15",
          bgActive: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
        },
        {
          icon: Layers,
          label: "Flashcards",
          path: "/flashcards",
          color: "text-purple-600 dark:text-purple-400",
          bgTint: "bg-purple-500/10 dark:bg-purple-500/15",
          bgActive: "bg-purple-600 text-white",
        },
        {
          icon: ClipboardList,
          label: "Cuestionarios",
          path: "/cuestionarios",
          color: "text-amber-600 dark:text-amber-400",
          bgTint: "bg-amber-500/10 dark:bg-amber-500/15",
          bgActive: "bg-amber-500 text-black",
        },
        {
          icon: BibliotecaCustomIcon,
          label: "Biblioteca",
          path: "/biblioteca",
          color: "text-indigo-600 dark:text-indigo-400",
          bgTint: "bg-indigo-500/10 dark:bg-indigo-500/15",
          bgActive: "bg-indigo-600 text-white",
        },
      ],
    },
    {
      category: "organizacion",
      categoryLabel: "Productividad",
      icon: ProductividadCatIcon,
      items: [
        {
          icon: Calendar,
          label: "Calendario",
          path: "/calendario",
          color: "text-orange-600 dark:text-orange-400",
          bgTint: "bg-orange-500/10 dark:bg-orange-500/15",
          bgActive: "bg-orange-600 text-white",
        },
        {
          icon: Timer,
          label: "Pomodoro",
          path: "/pomodoro",
          color: "text-rose-600 dark:text-rose-400",
          bgTint: "bg-rose-500/10 dark:bg-rose-500/15",
          bgActive: "bg-rose-600 text-white",
        },
        {
          icon: CheckSquare,
          label: "Tareas",
          path: "/tareas",
          color: "text-teal-600 dark:text-teal-400",
          bgTint: "bg-teal-500/10 dark:bg-teal-500/15",
          bgActive: "bg-teal-600 text-white",
        },
        {
          icon: Repeat2,
          label: "Rutinas",
          path: "/rutinas",
          color: "text-blue-600 dark:text-blue-400",
          bgTint: "bg-blue-500/10 dark:bg-blue-500/15",
          bgActive: "bg-blue-600 text-white",
        },
        {
          icon: BarChart3,
          label: "Métricas",
          path: "/metricas",
          color: "text-fuchsia-600 dark:text-fuchsia-400",
          bgTint: "bg-fuchsia-500/10 dark:bg-fuchsia-500/15",
          bgActive: "bg-fuchsia-600 text-white",
        },
      ],
    },
    {
      category: "comunidad",
      categoryLabel: "Comunidad & Juegos",
      icon: RecreacionCatIcon,
      items: [
        {
          icon: ComunidadCustomIcon,
          label: "Comunidad",
          path: "/comunidad",
          color: "text-teal-600 dark:text-teal-400",
          bgTint: "bg-teal-500/10 dark:bg-teal-500/15",
          bgActive: "bg-teal-600 text-white",
        },
        {
          icon: TreeDeciduous,
          label: "Mi Bosque",
          path: "/bosque",
          color: "text-emerald-600 dark:text-emerald-400",
          bgTint: "bg-emerald-500/10 dark:bg-emerald-500/15",
          bgActive: "bg-emerald-600 text-white",
        },
        {
          icon: ArcadeIcon,
          label: "Juegos",
          path: "/juegos",
          badge: "HOT",
          color: "text-orange-600 dark:text-orange-400",
          bgTint: "bg-orange-500/10 dark:bg-orange-500/15",
          bgActive: "bg-orange-600 text-white",
        },
        {
          icon: AmigosCustomIcon,
          label: "Amigos",
          path: "/amigos",
          color: "text-cyan-600 dark:text-cyan-400",
          bgTint: "bg-cyan-500/10 dark:bg-cyan-500/15",
          bgActive: "bg-cyan-500 text-black",
        },
        {
          icon: Trophy,
          label: "Logros",
          path: "/logros",
          color: "text-amber-600 dark:text-amber-400",
          bgTint: "bg-amber-500/10 dark:bg-amber-500/15",
          bgActive: "bg-amber-500 text-black",
        },
        {
          icon: Settings,
          label: "Ajustes",
          path: "/configuracion",
          color: "text-zinc-600 dark:text-zinc-400",
          bgTint: "bg-zinc-500/10 dark:bg-zinc-400/15",
          bgActive: "bg-zinc-700 text-white",
        },
      ],
    },
  ];

// Flat list for horizontal scroll dock
export const FLAT_MOBILE_ITEMS: NavSectionItem[] = ALL_MOBILE_NAV_ITEMS.flatMap(
  (sec) => sec.items
);

const SHEET_CATEGORIES = [
  { id: "todas", label: "Todos" },
  { id: "principal", label: "General" },
  { id: "academico", label: "Académico" },
  { id: "organizacion", label: "Productividad" },
  { id: "comunidad", label: "Comunidad" },
];

export function MobileNavbar() {
  const location = useLocation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);

  // Auto-scroll the active item into view horizontally with smooth centering
  useEffect(() => {
    if (activeItemRef.current && scrollContainerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [location.pathname]);

  // Reset search when closing sheet
  useEffect(() => {
    if (!sheetOpen) {
      setSearchQuery("");
    }
  }, [sheetOpen]);

  const filteredSheetItems = useMemo(() => {
    const q = searchQuery
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return ALL_MOBILE_NAV_ITEMS.filter(
      (sec) => selectedCategory === "todas" || sec.category === selectedCategory
    )
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => {
          if (!q) return true;
          const normLabel = item.label
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          const normCat = sec.categoryLabel
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          return normLabel.includes(q) || normCat.includes(q);
        }),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [selectedCategory, searchQuery]);

  return (
    <nav
      aria-label="Navegación principal móvil y tablet"
      className={cn(
        "tabe-mobile-nav lg:hidden fixed bottom-0 left-0 right-0 z-[1001] safe-area-bottom transition-all duration-300",
        "bg-white/88 dark:bg-[#161618]/90 backdrop-blur-2xl border-t border-zinc-200/80 dark:border-zinc-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_-10px_34px_rgba(0,0,0,0.45)]",
        "md:bottom-3 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(720px,94vw)] md:rounded-2xl md:border md:border-zinc-200/90 md:dark:border-zinc-800/90 md:shadow-[0_18px_42px_-10px_rgba(0,0,0,0.16)] md:dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.65)] md:pb-0"
      )}
    >
      <div className="flex items-center px-1.5 py-1 md:px-2 md:py-1.5">
        {/* Horizontal scrollable track with Apple/Notion spring pill */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-1 px-1 py-0.5"
        >
          {FLAT_MOBILE_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/dashboard" &&
                location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                ref={isActive ? activeItemRef : null}
                to={item.path}
                onClick={() => ComicAudio.playPop()}
                onMouseEnter={() => preloadRoute(item.path)}
                onTouchStart={() => preloadRoute(item.path)}
                className={cn(
                  "tabe-btn-action relative flex flex-col items-center justify-center min-w-[60px] sm:min-w-[66px] px-2.5 py-1.5 rounded-xl transition-colors select-none shrink-0 group",
                  isActive
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-dock-active-pill"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 32,
                      mass: 0.75,
                    }}
                    className="absolute inset-0 rounded-xl bg-zinc-900/[0.07] dark:bg-white/[0.11] border border-zinc-900/[0.08] dark:border-white/[0.12] shadow-2xs"
                  />
                )}

                <div className="relative z-10 flex items-center justify-center">
                  <Icon
                    className={cn(
                      "w-[19px] h-[19px] transition-transform duration-200",
                      isActive
                        ? cn("scale-105 stroke-[2.2]", item.color)
                        : "group-active:scale-90"
                    )}
                  />
                  {item.badge && (
                    <span
                      className={cn(
                        "absolute -top-1.5 -right-2.5 px-1 py-0.2 rounded-full text-[8px] font-semibold tracking-tight leading-tight border",
                        item.badge === "AI"
                          ? "bg-violet-600 text-white border-violet-400/40"
                          : "bg-orange-500 text-white border-orange-300/40"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                <span
                  className={cn(
                    "relative z-10 text-[10px] tracking-tight mt-1 whitespace-nowrap truncate max-w-[58px] transition-all",
                    isActive
                      ? "font-semibold text-zinc-900 dark:text-white"
                      : "font-medium text-zinc-500 dark:text-zinc-400"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Subtle Vertical Divider */}
        <div className="w-[1px] h-7 bg-zinc-200/90 dark:bg-zinc-800/90 mx-1 shrink-0" />

        {/* "Menú / Todos" App Library Launcher Button */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              onClick={() => ComicAudio.playPowerUp()}
              className="tabe-btn-action flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl shrink-0 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70 transition-all cursor-pointer select-none"
              title="Abrir menú de todos los apartados"
            >
              <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shadow-2xs">
                <LayoutGrid className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-[10px] font-semibold tracking-tight text-zinc-700 dark:text-zinc-300 mt-0.5">
                Menú
              </span>
            </button>
          </SheetTrigger>

          {/* Apple / Notion / ChatGPT Style Bottom Sheet */}
          <SheetContent
            side="bottom"
            hideCloseButton
            className={cn(
              "w-full max-h-[86dvh] p-0 rounded-t-[28px] border-t border-x border-zinc-200/80 dark:border-zinc-800/80",
              "bg-white/95 dark:bg-[#161618]/95 backdrop-blur-2xl shadow-[0_-20px_60px_rgba(0,0,0,0.18)] flex flex-col z-[1100]",
              "md:max-w-2xl md:mx-auto md:bottom-4 md:rounded-[28px] md:border"
            )}
          >
            {/* Top Drag Handle & Header */}
            <div className="pt-2.5 pb-3 px-4 sm:px-6 flex flex-col items-center border-b border-zinc-200/70 dark:border-zinc-800/70 shrink-0">
              <div className="w-9 h-1 bg-zinc-300/90 dark:bg-zinc-700 rounded-full mb-3" />

              <div className="w-full flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-xs p-1">
                    <TabeLogo size={20} className="shrink-0" />
                  </div>
                  <div>
                    <SheetTitle className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight text-left">
                      Espacio T.A.B.E.
                    </SheetTitle>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal text-left">
                      Navegación rápida y herramientas
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Quick Theme Toggle inside Mobile Menu */}
                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                      ComicAudio.playPop();
                    }}
                    className="tabe-btn-action h-8 px-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 text-xs font-medium hover:bg-zinc-200/70 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    aria-label="Cambiar tema"
                  >
                    {resolvedTheme === "dark" ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden xs:inline">Claro</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-zinc-600" />
                        <span className="hidden xs:inline">Oscuro</span>
                      </>
                    )}
                  </button>

                  <SheetClose className="tabe-btn-action w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer">
                    <X className="w-4 h-4" />
                  </SheetClose>
                </div>
              </div>

              {/* Spotlight Instant Search Bar */}
              <div className="relative w-full mt-3">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar apartado (ej. Apuntes, Pomodoro, Cuestionarios...)"
                  className="w-full pl-8 pr-8 py-2 rounded-xl text-xs bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 dark:focus:ring-white/15 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills with Spring layoutId (Pilar 3) */}
              <div className="flex items-center gap-1 mt-2.5 p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/80 w-full overflow-x-auto no-scrollbar">
                {SHEET_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        ComicAudio.playPop();
                      }}
                      className={cn(
                        "tabe-btn-action relative flex-1 min-w-fit px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer select-none",
                        isSelected
                          ? "text-white dark:text-zinc-900"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      )}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="mobile-sheet-cat-pill"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 32,
                          }}
                          className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-white shadow-2xs"
                        />
                      )}
                      <span className="relative z-10">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Animated FLIP Content Grid (Pilar 3 + Pilar 4) */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
              <AnimatePresence mode="popLayout">
                {filteredSheetItems.length === 0 ? (
                  <motion.div
                    key="empty-search"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="py-10 text-center text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    No se encontraron apartados para "{searchQuery}"
                  </motion.div>
                ) : (
                  filteredSheetItems.map((sec) => (
                    <motion.div
                      layout
                      key={sec.category}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{
                        opacity: 0,
                        scale: 0.94,
                        y: -8,
                        transition: { duration: 0.16, ease: [0.32, 0, 0.67, 0] },
                      }}
                      transition={{
                        layout: { type: "spring", stiffness: 360, damping: 28 },
                        duration: 0.22,
                      }}
                      className="space-y-2.5"
                    >
                      <div className="flex items-center gap-2 px-1">
                        {sec.icon && <sec.icon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />}
                        <h4 className="font-semibold text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          {sec.categoryLabel}
                        </h4>
                        <div className="flex-1 h-[1px] bg-zinc-200/70 dark:bg-zinc-800/70" />
                      </div>

                      <motion.div
                        layout
                        className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5"
                      >
                        <AnimatePresence mode="popLayout">
                          {sec.items.map((item) => {
                            const isActive = location.pathname === item.path;
                            const Icon = item.icon;

                            return (
                              <motion.div
                                layout
                                key={item.path}
                                initial={{ opacity: 0, scale: 0.88, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{
                                  opacity: 0,
                                  scale: 0.84,
                                  y: -6,
                                  transition: {
                                    duration: 0.16,
                                    ease: [0.32, 0, 0.67, 0],
                                  },
                                }}
                                transition={{
                                  layout: {
                                    type: "spring",
                                    stiffness: 380,
                                    damping: 28,
                                    mass: 0.7,
                                  },
                                  duration: 0.22,
                                }}
                              >
                                <Link
                                  to={item.path}
                                  onClick={() => {
                                    ComicAudio.playPop();
                                    setSheetOpen(false);
                                  }}
                                  onMouseEnter={() => preloadRoute(item.path)}
                                  onTouchStart={() => preloadRoute(item.path)}
                                  className={cn(
                                    "tabe-btn-action flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center group relative w-full select-none",
                                    isActive
                                      ? "bg-zinc-900/[0.06] dark:bg-white/[0.09] border-zinc-900/30 dark:border-white/30 text-zinc-900 dark:text-white shadow-xs"
                                      : "bg-zinc-50/80 dark:bg-zinc-900/50 border-zinc-200/70 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300"
                                  )}
                                >
                                  {item.badge && (
                                    <span
                                      className={cn(
                                        "absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full text-[8px] font-semibold tracking-tight leading-tight",
                                        item.badge === "AI"
                                          ? "bg-violet-600 text-white"
                                          : "bg-orange-500 text-white"
                                      )}
                                    >
                                      {item.badge}
                                    </span>
                                  )}

                                  <div
                                    className={cn(
                                      "w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-active:scale-90",
                                      item.bgTint,
                                      item.color
                                    )}
                                  >
                                    <Icon className="w-4 h-4 stroke-[2.1]" />
                                  </div>

                                  <span
                                    className={cn(
                                      "text-xs mt-2 leading-tight truncate w-full",
                                      isActive
                                        ? "text-zinc-900 dark:text-white font-semibold"
                                        : "text-zinc-700 dark:text-zinc-300 font-medium"
                                    )}
                                  >
                                    {item.label}
                                  </span>
                                </Link>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Safe-Area Quick Action Bar */}
            <div className="px-4 sm:px-6 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/40 shrink-0">
              <SheetClose asChild>
                <button
                  type="button"
                  onClick={() => ComicAudio.playPop()}
                  className="tabe-btn-action w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-xs shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
                >
                  Listo
                </button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
