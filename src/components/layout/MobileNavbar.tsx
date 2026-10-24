import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, GraduationCap, Calendar, Timer, BarChart3, Bot, Settings, Layers, ClipboardList, Library, Trophy, Users, Store, TreeDeciduous, Repeat2, Clock, Gamepad2, Compass, LayoutGrid, X, ChevronUp, CheckSquare, MessageSquare } from "lucide-react";
import { ApuntesIcon } from "@/components/icons/NotionIcon";
import { TabeAIIcon } from "@/components/icons/TabeAIIcon";
import { ComunidadIcon } from "@/components/icons/ComunidadIcon";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { preloadRoute } from "@/lib/routePreload";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";

export interface NavSectionItem {
  icon: any;
  label: string;
  path: string;
  badge?: string;
  color: string;
  bgActive: string;
}

export const ALL_MOBILE_NAV_ITEMS: {
  category: string;
  categoryLabel: string;
  icon: string;
  items: NavSectionItem[];
}[] = [
  {
    category: "principal",
    categoryLabel: "General",
    icon: "⚡",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", color: "text-[#1475e5]", bgActive: "bg-[#1475e5] text-white" },
      { icon: TabeAIIcon, label: "TABE IA", path: "/TABEAI", badge: "AI", color: "text-foreground", bgActive: "bg-white text-black dark:bg-black dark:text-white" },
    ]
  },
  {
    category: "academico",
    categoryLabel: "Académico",
    icon: "🎓",
    items: [
      { icon: GraduationCap, label: "Carrera", path: "/carrera", color: "text-[#48bd22]", bgActive: "bg-[#48bd22] text-white" },
      { icon: GraduationCap, label: "Exámenes", path: "/examenes", color: "text-[#ff4e4e]", bgActive: "bg-[#ff4e4e] text-white" },
      { icon: ApuntesIcon, label: "Apuntes", path: "/apuntes", color: "text-foreground", bgActive: "bg-foreground text-background" },
      { icon: Layers, label: "Flashcards", path: "/flashcards", color: "text-[#A855F7]", bgActive: "bg-[#A855F7] text-white" },
      { icon: ClipboardList, label: "Quizzes", path: "/cuestionarios", color: "text-[#EAB308]", bgActive: "bg-[#EAB308] text-black" },
      { icon: Clock, label: "Consultas", path: "/consultas", color: "text-[#6366F1]", bgActive: "bg-[#6366F1] text-white" },
      { icon: Library, label: "Biblioteca", path: "/biblioteca", color: "text-[#8B5CF6]", bgActive: "bg-[#8B5CF6] text-white" },
      { icon: Compass, label: "Correlativas", path: "/mapa", color: "text-[#F43F5E]", bgActive: "bg-[#F43F5E] text-white" },
    ]
  },
  {
    category: "organizacion",
    categoryLabel: "Productividad",
    icon: "⏱️",
    items: [
      { icon: Calendar, label: "Calendario", path: "/calendario", color: "text-[#FF6600]", bgActive: "bg-[#FF6600] text-white" },
      { icon: Timer, label: "Pomodoro", path: "/pomodoro", color: "text-[#FF2E93]", bgActive: "bg-[#FF2E93] text-white" },
      { icon: CheckSquare, label: "Tareas", path: "/tareas", color: "text-[#10B981]", bgActive: "bg-[#10B981] text-white" },
      { icon: Repeat2, label: "Rutinas", path: "/rutinas", color: "text-[#3B82F6]", bgActive: "bg-[#3B82F6] text-white" },
      { icon: BarChart3, label: "Métricas", path: "/metricas", color: "text-[#EC4899]", bgActive: "bg-[#EC4899] text-white" },
    ]
  },
  {
    category: "comunidad",
    categoryLabel: "Comunidad & Juegos",
    icon: "🎮",
    items: [
      { icon: TreeDeciduous, label: "Mi Bosque", path: "/bosque", color: "text-[#10B981]", bgActive: "bg-[#10B981] text-white" },
      { icon: Gamepad2, label: "Juegos", path: "/juegos", badge: "HOT", color: "text-[#F97316]", bgActive: "bg-[#F97316] text-white" },
      { icon: Users, label: "Amigos", path: "/amigos", color: "text-[#06B6D4]", bgActive: "bg-[#06B6D4] text-black" },
      { icon: Trophy, label: "Logros", path: "/logros", color: "text-[#FACC15]", bgActive: "bg-[#FACC15] text-black" },
      { icon: ComunidadIcon, label: "Comunidad", path: "/comunidad", color: "text-[#14B8A6]", bgActive: "bg-[#14B8A6] text-white" },
      { icon: Settings, label: "Ajustes", path: "/configuracion", color: "text-[#64748B]", bgActive: "bg-[#64748B] text-white" },
    ]
  }
];

// Flat list for horizontal scroll dock
export const FLAT_MOBILE_ITEMS: NavSectionItem[] = ALL_MOBILE_NAV_ITEMS.flatMap(sec => sec.items);

export function MobileNavbar() {
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);

  // Auto-scroll the active item into view horizontally
  useEffect(() => {
    if (activeItemRef.current && scrollContainerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
      });
    }
  }, [location.pathname]);

  const filteredSheetItems = selectedCategory === "todas"
    ? ALL_MOBILE_NAV_ITEMS
    : ALL_MOBILE_NAV_ITEMS.filter(c => c.category === selectedCategory);

  return (
    <nav className="tabe-mobile-nav lg:hidden fixed bottom-0 left-0 right-0 z-[1001] bg-card/95 backdrop-blur-xl border-t-3 border-foreground shadow-[0_-6px_20px_rgba(0,0,0,0.18)] safe-area-bottom">
      <div className="flex items-center">
        {/* Horizontal scrollable track containing ALL sections */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-1.5 px-2.5 py-2"
        >
          {FLAT_MOBILE_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
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
                  "flex flex-col items-center justify-center min-w-[62px] px-2 py-1.5 rounded-xl border transition-colors select-none shrink-0",
                  isActive
                    ? `bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100`
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                  {item.badge && !isActive && (
                    <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[8px] font-black bg-[#FF2E93] text-white border border-black leading-tight">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] tracking-tight mt-1 font-medium whitespace-nowrap truncate max-w-[58px]",
                  isActive ? "text-inherit" : "text-foreground/80"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Separator */}
        <div className="w-[2px] h-8 bg-border/80 my-auto shrink-0" />

        {/* "MÁS APARTADOS / TODOS" Button -> Opens Bottom Sheet from below (NEVER vertical sidebar) */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              onClick={() => ComicAudio.playPowerUp()}
              className="flex flex-col items-center justify-center px-3 py-2 shrink-0 text-foreground hover:text-primary transition-all group"
              title="Ver todos los apartados"
            >
              <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 transition-colors">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mt-0.5">
                Todos
              </span>
            </button>
          </SheetTrigger>

          {/* Bottom Sheet containing ALL sections organized by comic category */}
          <SheetContent 
            side="bottom" 
            hideCloseButton
            className="w-full max-h-[85vh] p-0 rounded-t-2xl border-t border-x border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] shadow-2xl flex flex-col z-[1100]"
          >
            {/* Top Comic Pull Bar */}
            <div className="pt-3 pb-2 px-6 flex flex-col items-center border-b border-zinc-100 dark:border-zinc-800/60 bg-transparent">
              <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mb-3" />
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs">
                    ⚡
                  </div>
                  <div>
                    <SheetTitle className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                      Todos los Apartados
                    </SheetTitle>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                      Toca cualquier opción para ir directo
                    </p>
                  </div>
                </div>
                <SheetClose className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  <X className="w-5 h-5 text-foreground" />
                </SheetClose>
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 mt-3 w-full overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: "todas", label: "✨ Todos" },
                  { id: "principal", label: "⚡ General" },
                  { id: "academico", label: "🎓 Académico" },
                  { id: "organizacion", label: "⏱️ Productividad" },
                  { id: "comunidad", label: "🎮 Comunidad" }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      ComicAudio.playPop();
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap border transition-colors shrink-0",
                      selectedCategory === cat.id
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-2xs"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-700/80 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {filteredSheetItems.map(sec => (
                <div key={sec.category} className="space-y-2.5">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-base">{sec.icon}</span>
                    <h4 className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                      {sec.categoryLabel}
                    </h4>
                    <div className="flex-1 h-[1px] bg-border/80" />
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {sec.items.map((item, idx) => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;

                      return (
                        <motion.div
                          key={item.path}
                          initial={{ opacity: 0, scale: 0.92, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
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
                              "flex flex-col items-center justify-center p-2.5 rounded-xl border transition-colors text-center group relative w-full",
                              isActive
                                ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                                : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            )}
                          >
                            {item.badge && (
                              <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full text-[8px] font-black bg-[#FF2E93] text-white border border-black shadow-xs">
                                {item.badge}
                              </span>
                            )}
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                              isActive ? "bg-zinc-200 dark:bg-zinc-700" : "bg-zinc-100 dark:bg-zinc-800",
                              item.color
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className={cn(
                              "text-xs font-medium mt-1.5 leading-tight truncate w-full",
                              isActive ? "text-zinc-900 dark:text-zinc-100 font-semibold" : "text-zinc-700 dark:text-zinc-300"
                            )}>
                              {item.label}
                            </span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Quick Dismiss Action */}
            <div className="p-3 border-t-2 border-border/60 bg-muted/20">
              <SheetClose asChild>
                <button 
                  onClick={() => ComicAudio.playPop()}
                  className="w-full py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium text-xs border border-transparent shadow-2xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  Cerrar Menú
                </button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
