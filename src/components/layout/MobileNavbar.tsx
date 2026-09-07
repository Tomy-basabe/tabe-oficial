import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  GraduationCap, 
  Calendar, 
  Timer, 
  BarChart3, 
  Bot, 
  Settings, 
  Layers, 
  ClipboardList, 
  Library, 
  Trophy, 
  Users, 
  Store, 
  TreeDeciduous, 
  Repeat2, 
  Clock, 
  Gamepad2, 
  Compass, 
  LayoutGrid, 
  X, 
  Sparkles,
  ChevronUp
} from "lucide-react";
import { NotionIcon } from "@/components/icons/NotionIcon";
import { ComicAudio } from "@/components/comic/ComicAudio";
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
      { icon: Bot, label: "TABE IA", path: "/TABEAI", badge: "AI", color: "text-[#00E5FF]", bgActive: "bg-[#00E5FF] text-black" },
    ]
  },
  {
    category: "academico",
    categoryLabel: "Académico",
    icon: "🎓",
    items: [
      { icon: GraduationCap, label: "Carrera", path: "/carrera", color: "text-[#48bd22]", bgActive: "bg-[#48bd22] text-white" },
      { icon: NotionIcon, label: "Apuntes", path: "/apuntes", color: "text-foreground", bgActive: "bg-foreground text-background" },
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
      { icon: Store, label: "Marketplace", path: "/marketplace", color: "text-[#14B8A6]", bgActive: "bg-[#14B8A6] text-white" },
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
                className={cn(
                  "flex flex-col items-center justify-center min-w-[62px] px-2 py-1.5 rounded-xl border-2 transition-all duration-200 select-none shrink-0",
                  isActive
                    ? `${item.bgActive} border-foreground shadow-[2.5px_2.5px_0_0_#000] translate-y-[-2px]`
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
                  "text-[10px] tracking-tight mt-1 font-extrabold whitespace-nowrap truncate max-w-[58px]",
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
              <div className="w-10 h-10 rounded-xl bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-all">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-foreground mt-0.5">
                Todos
              </span>
            </button>
          </SheetTrigger>

          {/* Bottom Sheet containing ALL sections organized by comic category */}
          <SheetContent 
            side="bottom" 
            className="w-full max-h-[85vh] p-0 rounded-t-[28px] border-t-4 border-x-4 border-foreground bg-card shadow-[0_-12px_40px_rgba(0,0,0,0.35)] flex flex-col z-[1100]"
          >
            {/* Top Comic Pull Bar */}
            <div className="pt-3 pb-2 px-6 flex flex-col items-center border-b-2 border-border/60 bg-muted/30">
              <div className="w-12 h-1.5 bg-foreground/30 rounded-full mb-3" />
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FFE600] border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center text-black font-black text-xs">
                    ⚡
                  </div>
                  <div>
                    <SheetTitle className="text-base font-black uppercase text-foreground leading-tight">
                      Todos los Apartados
                    </SheetTitle>
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Toca cualquier opción para ir directo
                    </p>
                  </div>
                </div>
                <SheetClose className="p-1.5 rounded-xl bg-secondary border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-transform">
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
                      "px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-tight whitespace-nowrap border-2 transition-all shrink-0",
                      selectedCategory === cat.id
                        ? "bg-[#00E5FF] text-black border-black shadow-[2px_2px_0_0_#000]"
                        : "bg-secondary text-muted-foreground border-transparent hover:text-foreground"
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
                    {sec.items.map(item => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => {
                            ComicAudio.playPop();
                            setSheetOpen(false);
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-center group relative",
                            isActive
                              ? `${item.bgActive} border-foreground shadow-[3px_3px_0_0_#000] translate-y-[-2px]`
                              : "bg-card border-foreground/30 shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:border-foreground hover:translate-y-[-2px]"
                          )}
                        >
                          {item.badge && (
                            <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full text-[8px] font-black bg-[#FF2E93] text-white border border-black shadow-xs">
                              {item.badge}
                            </span>
                          )}
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                            isActive ? "bg-black/15 text-inherit" : "bg-muted text-foreground"
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className={cn(
                            "text-xs font-black mt-2 leading-tight truncate w-full",
                            isActive ? "text-inherit" : "text-foreground"
                          )}>
                            {item.label}
                          </span>
                        </Link>
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
                  className="w-full py-2.5 rounded-xl bg-foreground text-background font-black text-xs uppercase tracking-wider border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-y-[1px]"
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
