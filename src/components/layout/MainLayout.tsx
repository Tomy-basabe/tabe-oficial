import { useState, useEffect, useMemo, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { TabeLogo } from "@/components/ui/TabeLogo";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Menu, 
  X, 
  PanelLeftClose, 
  PanelLeftOpen, 
  ChevronDown, 
  ChevronRight,
  Folder
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GlobalPomodoroWidget } from "@/components/pomodoro/GlobalPomodoroWidget";
import { AIBubbleWidget } from "@/components/ai/AIBubbleWidget";
import { GuestModeBanner } from "@/components/layout/GuestModeBanner";
import { GlobalNotificationManager } from "@/components/notifications/GlobalNotificationManager";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  NavItem, 
  baseNavItems, 
  adminNavItem, 
  ICON_MAP,
  CustomSidebarItem,
  ALL_AVAILABLE_ITEMS,
  DEFAULT_CATEGORIZED_SIDEBAR,
  ensureTabeAISecond
} from "@/lib/sidebar-configs";
import { isSuperAdmin } from "@/lib/adminAuth";

import { MobileNavbar } from "@/components/layout/MobileNavbar";
import { ComicEffectsProvider } from "@/components/comic/ComicEffectsProvider";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { preloadRoute } from "@/lib/routePreload";
import { performGlobalCalendarSync } from "@/lib/globalCalendarSync";

interface UserStats {
  xp_total: number;
  nivel: number;
}

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("tabe-sidebar-collapsed");
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return false;
  }); // Desktop state
  const location = useLocation();
  const navigate = useNavigate();
  const isAIPage = location.pathname === "/TABEAI" || location.pathname === "/asistente";
  const { user, isGuest, profile } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  // Global admin shortcut: Ctrl + Shift + Ñ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const key = (e.key || "").toLowerCase();
      const isEnie = key === "ñ" || e.key === "Ñ" || e.code === "Semicolon";

      if (isCtrlOrMeta && isShift && isEnie) {
        e.preventDefault();
        if (location.pathname !== "/calendario") {
          navigate("/calendario?openPurge=true");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [location.pathname, navigate]);

  // Categorized sidebar state - closed by default, opens on hover/click
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("tabe-sidebar-categories-open");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      "cat-academico": false,
      "cat-organizacion": false,
      "cat-comunidad": false
    };
  });
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // PWA auto-update check (especially for mobile/installed apps)
  useRegisterSW({
    onRegistered(r) {
      if (!r) return;
      
      // Check for updates every 10 minutes
      setInterval(() => {
        r.update();
      }, 10 * 60 * 1000);

      // Check for updates when the user returns to the app
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          r.update();
        }
      });
    }
  });

  const navItems = baseNavItems;
  
  // Auto-sync academic calendars (Google Calendar & Moodle Campus) in background silently
  useEffect(() => {
    if (!user || isGuest) return;

    let lastSyncTime = 0;
    const SYNC_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes cooldown to save bandwidth & quota

    // Run background sync once shortly after entry so initial rendering is ultra-fast
    const timer = setTimeout(() => {
      lastSyncTime = Date.now();
      performGlobalCalendarSync(user, { silent: true });
    }, 3500);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        if (now - lastSyncTime > SYNC_COOLDOWN_MS) {
          lastSyncTime = now;
          performGlobalCalendarSync(user, { silent: true });
        }
      }
    };

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastSyncTime > SYNC_COOLDOWN_MS) {
        lastSyncTime = now;
        performGlobalCalendarSync(user, { silent: true });
      }
    }, 30 * 60 * 1000); // Check at most every 30 minutes

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [user, isGuest]);

  useEffect(() => {
    if (!user && !isGuest) return;

    if (isGuest) {
      setUserStats({ xp_total: 4150, nivel: 42 });
      return;
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchUserStats = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_stats")
        .select("xp_total, nivel")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setUserStats(prev => {
          if (prev && prev.xp_total === data.xp_total && prev.nivel === data.nivel) {
            return prev;
          }
          return data;
        });
      }
    };
    fetchUserStats();

    const channel = supabase
      .channel(`sidebar-user-stats-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_stats", filter: `user_id=eq.${user.id}` },
        () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchUserStats();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user, isGuest]);

  const xpData = (() => {
    if (!userStats) return { currentXp: 0, level: 1, progress: 0, xpForNext: 100 };
    const totalXp = userStats.xp_total || 0;
    const level = Math.floor(totalXp / 100) + 1;
    const current = totalXp % 100;
    return { currentXp: totalXp, level, progress: current, xpForNext: 100 - current };
  })();

  const hasCategories = (items: any[]) => items?.some((i: any) => i.type === "category" && i.items && i.items.length > 0);
  const countTotalItems = (items: any[]): number => {
    if (!items) return 0;
    return items.reduce((acc, curr) => acc + 1 + (curr.items ? countTotalItems(curr.items) : 0), 0);
  };

  let savedLocalConfig = null;
  try {
    const local = localStorage.getItem("tabe-custom-sidebar-config");
    if (local) savedLocalConfig = JSON.parse(local);
  } catch (e) {}

  const userConfig = profile?.sidebar_config || savedLocalConfig;
  const isLegacyOrIncomplete = !userConfig || !hasCategories(userConfig) || countTotalItems(userConfig) < 10;

  const displayItems: CustomSidebarItem[] = useMemo(() => {
    const raw = isLegacyOrIncomplete
      ? DEFAULT_CATEGORIZED_SIDEBAR 
      : [...userConfig];
    return ensureTabeAISecond(raw);
  }, [isLegacyOrIncomplete, userConfig]);

  const prevPathRef = useRef(location.pathname);
  const closedByClickRef = useRef<Record<string, boolean>>({});

  // Auto-expand category if current route is inside it upon navigation
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      let hasChanges = false;
      let nextCategories = { ...openCategories };

      displayItems.forEach((item: any) => {
        if (item.type === "category" && item.items) {
          const isInside = item.items.some((sub: any) => (sub.path || sub.id) === location.pathname);
          if (isInside && !nextCategories[item.id]) {
            nextCategories[item.id] = true;
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        setOpenCategories(nextCategories);
        try { localStorage.setItem("tabe-sidebar-categories-open", JSON.stringify(nextCategories)); } catch (e) {}
      }
    }
  }, [location.pathname, displayItems]);

  const toggleCollapse = () => {
    try {
      ComicAudio.playPop();
    } catch (e) {}
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("tabe-sidebar-collapsed", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const toggleCategory = (catId: string) => {
    try {
      ComicAudio.playPop();
    } catch (e) {}
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const isCurrentlyOpen = hoveredCategory === catId && !closedByClickRef.current[catId];
    if (isCurrentlyOpen) {
      // Cierre inmediato al hacer click
      closedByClickRef.current[catId] = true;
      setHoveredCategory(null);
    } else {
      delete closedByClickRef.current[catId];
      setHoveredCategory(catId);
    }
  };

  return (
    <ComicEffectsProvider>
      <div 
        className="min-h-screen bg-background relative overflow-hidden"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--border)) 2px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      >
        {/* Neo-Brutalism Pattern Background */}
        {/* Mobile Header (El usuario especificó: sin panel vertical, todo en la barra horizontal de abajo) */}
        {!isAIPage && (
          <header className="lg:hidden fixed top-0 left-0 right-0 z-[1001] h-[calc(4rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] bg-card/95 backdrop-blur-md border-b-2 border-foreground/30 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.06)] flex items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2">
              <TabeLogo size={38} className="shrink-0" />
              <span className="font-extrabold text-lg tracking-tight text-foreground">TABE</span>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFE600] text-black border border-black shadow-[1.5px_1.5px_0_0_#000] -rotate-3">
                COMIC
              </span>
            </Link>

            {/* Quick Level / XP Badge on mobile header */}
            <Link 
              to="/metricas"
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-secondary border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-transform"
            >
              <div className="w-5 h-5 rounded-lg bg-[#1475e5] text-white flex items-center justify-center font-black text-[10px]">
                ⚡
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] font-black text-foreground">NV. {xpData.level}</span>
                <span className="text-[9px] font-bold text-muted-foreground">{xpData.currentXp} XP</span>
              </div>
            </Link>
          </header>
        )}

        {/* Sidebar (Desktop Only: en móvil todo está en la barra horizontal de abajo) */}
        {!isAIPage && (
          <aside
            className={cn(
              "hidden lg:flex fixed top-0 left-0 h-full border-r-4 border-foreground transition-all duration-300 flex-col bg-card shadow-[4px_0_0_0_hsl(var(--foreground))] z-40",
              isCollapsed ? "w-20" : "w-64"
            )}
          >
          {/* Toggle Button (Desktop Only) */}
          <div className="hidden lg:flex absolute -right-3.5 top-5 z-50">
            <Button
              size="icon"
              variant="outline"
              aria-label={isCollapsed ? "Desplegar panel lateral" : "Plegar / guardar panel lateral"}
              title={isCollapsed ? "Desplegar panel lateral" : "Plegar / guardar panel lateral"}
              className="h-7 w-7 rounded-xl bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-[#ffe033] hover:scale-105 active:translate-y-[1px] transition-all cursor-pointer"
              onClick={toggleCollapse}
            >
              {isCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5 stroke-[2.5]" /> : <PanelLeftClose className="h-3.5 w-3.5 stroke-[2.5]" />}
            </Button>
          </div>

          {/* Logo Header */}
          <div className={cn("h-16 flex items-center border-b-3 border-foreground flex-shrink-0 transition-all overflow-hidden bg-secondary/30", isCollapsed ? "justify-center px-0" : "justify-between px-4 sm:px-5 gap-2")}>
            <div className="flex items-center gap-3 min-w-0">
              <TabeLogo size={42} className="shrink-0" />
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-black text-xl tracking-tight text-foreground truncate">TABE</h1>
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFE600] text-black border-2 border-black shadow-[1.5px_1.5px_0_0_#000] -rotate-3">
                      COMIC
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-muted-foreground truncate">Tu espacio académico</p>
                </div>
              )}
            </div>
          </div>

        {/* Navigation */}
        {isCollapsed ? (
          <nav className="flex-1 overflow-visible space-y-2 py-3.5 px-2">
            {(() => {
              const renderNavItem = (item: any, isInsideCategory = false, index = 0) => {
                const targetPath = item.path || (item.type === "item" ? item.id : null);
                if (targetPath === "/admin" && !isSuperAdmin(user)) return null;
                const baseItem = [...ALL_AVAILABLE_ITEMS, adminNavItem].find(b => b.path === targetPath);
                
                if (!baseItem && item.type === "item") return null;

                const Icon = (item.iconName && item.iconName !== "FileText" && ICON_MAP[item.iconName]) 
                  || baseItem?.icon 
                  || (item.iconName && ICON_MAP[item.iconName])
                  || Folder;
                
                const path = targetPath || "#";
                const isActive = location.pathname === path;

                if (item.type === "category") {
                  const hasActiveChild = item.items?.some((sub: any) => (sub.path || sub.id) === location.pathname);
                  const isHovered = hoveredCategory === item.id && !closedByClickRef.current[item.id];

                  return (
                    <div
                      key={item.id}
                      className="space-y-1.5 my-2 relative group/cat"
                      onMouseEnter={() => {
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                        if (!closedByClickRef.current[item.id]) {
                          setHoveredCategory(item.id);
                        }
                      }}
                      onMouseLeave={() => {
                        delete closedByClickRef.current[item.id];
                        hoverTimeoutRef.current = setTimeout(() => {
                          setHoveredCategory((prev) => (prev === item.id ? null : prev));
                        }, 220);
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          ComicAudio.playPop();
                          toggleCategory(item.id);
                        }}
                        className={cn(
                          "w-full flex items-center rounded-xl transition-all duration-150 group relative border-2 select-none justify-center p-2 cursor-pointer",
                          hasActiveChild || isHovered
                            ? "font-black text-foreground bg-secondary/80 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                            : "text-foreground/75 border-transparent hover:bg-secondary/60 hover:text-foreground hover:border-foreground/40 hover:scale-105"
                        )}
                        aria-label={item.label}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-lg border-2 border-foreground/50 flex items-center justify-center shrink-0 transition-colors",
                          hasActiveChild ? "bg-[#FFE600] text-black border-black" : "bg-card text-foreground"
                        )}>
                          <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      </button>

                      {/* Floating Category Menu on Hover with cool spring bounce entrance */}
                      {isHovered && item.items && (
                        <div className="absolute left-[calc(100%+10px)] top-0 z-50 bg-card border-3 border-foreground rounded-2xl p-2.5 shadow-[6px_6px_0_0_hsl(var(--foreground))] min-w-[210px] space-y-1.5 animate-sidebar-entrance">
                          <div className="absolute -left-3 top-0 w-3.5 h-full" />
                          <div className="absolute -left-2 top-3.5 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-foreground" />
                          <div className="px-2 py-1 border-b-2 border-foreground/20 mb-1 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-[#FFE600] text-black flex items-center justify-center font-black text-xs border border-black shadow-[1px_1px_0_0_#000]">
                              <Icon className="w-3 h-3 stroke-[2.5]" />
                            </div>
                            <span className="font-black text-xs uppercase tracking-wider text-foreground">{item.label}</span>
                          </div>
                          <div className="space-y-1">
                            {item.items.map((subItem: any, subIndex: number) => renderNavItem(subItem, true, subIndex))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // Single link inside category flyout
                if (isInsideCategory) {
                  return (
                    <Link
                      key={item.id}
                      to={path}
                      onClick={() => {
                        ComicAudio.playPop();
                        setHoveredCategory(null);
                      }}
                      onMouseEnter={() => preloadRoute(path)}
                      onTouchStart={() => preloadRoute(path)}
                      onFocus={() => preloadRoute(path)}
                      style={{ animationDelay: `${index * 30}ms` }}
                      className={cn(
                        "flex items-center rounded-xl transition-all duration-150 group relative border-2 select-none gap-2 px-3 py-1.5 text-xs animate-sidebar-entrance",
                        isActive
                          ? "font-black bg-[#FFE600] text-black border-2 border-black shadow-[3px_3px_0_0_#000] translate-x-1"
                          : "text-foreground/85 border-transparent hover:border-foreground hover:bg-secondary/60 hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-x-0.5 hover:scale-[1.02] font-extrabold"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", isActive && "stroke-[2.5]")} />
                      <span className="truncate flex-1 text-left font-bold text-xs">
                        {item.label}
                      </span>
                      {(targetPath === "/TABEAI" || item.id === "item-/TABEAI") && (
                        <span className={cn(
                          "ml-auto text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none transition-colors",
                          isActive
                            ? "bg-black text-white border-black"
                            : "bg-[#00E5FF] text-black border-black shadow-[1px_1px_0_0_#000]"
                        )}>
                          AI
                        </span>
                      )}
                      {isActive && targetPath !== "/TABEAI" && item.id !== "item-/TABEAI" && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                      )}
                    </Link>
                  );
                }

                // Single item in collapsed dock
                return (
                  <div key={item.id} className="relative group/navitem">
                    <Link
                      to={path}
                      onClick={() => ComicAudio.playPop()}
                      onMouseEnter={() => preloadRoute(path)}
                      onTouchStart={() => preloadRoute(path)}
                      onFocus={() => preloadRoute(path)}
                      className={cn(
                        "flex items-center rounded-xl transition-all duration-150 group relative border-2 select-none justify-center p-2.5",
                        isActive
                          ? "font-black bg-[#FFE600] text-black border-2 border-black shadow-[3px_3px_0_0_#000] translate-x-1"
                          : "text-foreground/85 border-transparent hover:border-foreground hover:bg-card hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-x-0.5 hover:scale-105 font-extrabold"
                      )}
                      aria-label={item.label}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0",
                          isActive ? "stroke-[2.5]" : ""
                        )}
                      />
                    </Link>

                    {/* Popout badge only for this item when hovered */}
                    <div className="hidden group-hover/navitem:flex absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50 bg-card border-3 border-foreground rounded-xl px-3 py-1.5 shadow-[4px_4px_0_0_hsl(var(--foreground))] items-center gap-2 whitespace-nowrap pointer-events-none animate-sidebar-entrance">
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-foreground" />
                      <span className="font-black text-xs uppercase tracking-wider text-foreground">
                        {item.label}
                      </span>
                      {(targetPath === "/TABEAI" || item.id === "item-/TABEAI") && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#00E5FF] text-black border border-black shadow-[1px_1px_0_0_#000]">
                          AI
                        </span>
                      )}
                    </div>
                  </div>
                );
              };

              return displayItems.map((item: any, idx: number) => renderNavItem(item, false, idx));
            })()}
          </nav>
        ) : (
          <nav className="flex-1 overflow-visible space-y-2 py-3.5 px-3">
            {(() => {
              const renderNavItem = (item: any, isInsideCategory = false, index = 0) => {
                const targetPath = item.path || (item.type === "item" ? item.id : null);
                if (targetPath === "/admin" && !isSuperAdmin(user)) return null;
                const baseItem = [...ALL_AVAILABLE_ITEMS, adminNavItem].find(b => b.path === targetPath);
                
                if (!baseItem && item.type === "item") return null;

                const Icon = (item.iconName && item.iconName !== "FileText" && ICON_MAP[item.iconName]) 
                  || baseItem?.icon 
                  || (item.iconName && ICON_MAP[item.iconName])
                  || Folder;
                
                const path = targetPath || "#";
                const isActive = location.pathname === path;

                if (item.type === "category") {
                  const hasActiveChild = item.items?.some((sub: any) => (sub.path || sub.id) === location.pathname);
                  const isHovered = hoveredCategory === item.id && !closedByClickRef.current[item.id];

                  return (
                    <div
                      key={item.id}
                      className="space-y-1.5 my-2 relative group/cat"
                      onMouseEnter={() => {
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                        if (!closedByClickRef.current[item.id]) {
                          setHoveredCategory(item.id);
                        }
                      }}
                      onMouseLeave={() => {
                        delete closedByClickRef.current[item.id];
                        hoverTimeoutRef.current = setTimeout(() => {
                          setHoveredCategory((prev) => (prev === item.id ? null : prev));
                        }, 220);
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          toggleCategory(item.id);
                        }}
                        className={cn(
                          "w-full flex items-center rounded-xl transition-all duration-150 group relative border-2 select-none gap-2.5 px-3 py-2 cursor-pointer",
                          hasActiveChild || isHovered
                            ? "font-black text-foreground bg-secondary/80 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                            : "text-foreground/75 border-transparent hover:bg-secondary/60 hover:text-foreground hover:border-foreground/40 hover:translate-x-0.5"
                        )}
                        aria-label={item.label}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-lg border-2 border-foreground/50 flex items-center justify-center shrink-0 transition-colors",
                          hasActiveChild ? "bg-[#FFE600] text-black border-black" : "bg-card text-foreground"
                        )}>
                          <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                        <span className="font-black text-xs uppercase tracking-wider truncate flex-1 text-left">{item.label}</span>
                        <ChevronRight className={cn("w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform duration-150 stroke-[3]", isHovered && "rotate-90 opacity-100")} />
                      </button>

                      {/* Floating Category Menu to the right on Hover with cool spring bounce entrance */}
                      {isHovered && item.items && (
                        <div className="absolute left-[calc(100%+10px)] top-0 z-50 bg-card border-3 border-foreground rounded-2xl p-2.5 shadow-[6px_6px_0_0_hsl(var(--foreground))] min-w-[210px] space-y-1.5 animate-sidebar-entrance">
                          <div className="absolute -left-3 top-0 w-3.5 h-full" />
                          <div className="absolute -left-2 top-3.5 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-foreground" />
                          <div className="px-2 py-1 border-b-2 border-foreground/20 mb-1 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-[#FFE600] text-black flex items-center justify-center font-black text-xs border border-black shadow-[1px_1px_0_0_#000]">
                              <Icon className="w-3 h-3 stroke-[2.5]" />
                            </div>
                            <span className="font-black text-xs uppercase tracking-wider text-foreground">{item.label}</span>
                          </div>
                          <div className="space-y-1">
                            {item.items.map((subItem: any, subIndex: number) => renderNavItem(subItem, true, subIndex))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // Single link inside category flyout
                if (isInsideCategory) {
                  return (
                    <Link
                      key={item.id}
                      to={path}
                      onClick={() => {
                        ComicAudio.playPop();
                        setHoveredCategory(null);
                      }}
                      onMouseEnter={() => preloadRoute(path)}
                      onTouchStart={() => preloadRoute(path)}
                      onFocus={() => preloadRoute(path)}
                      style={{ animationDelay: `${index * 30}ms` }}
                      className={cn(
                        "flex items-center rounded-xl transition-all duration-150 group relative border-2 select-none gap-2 px-3 py-1.5 text-xs animate-sidebar-entrance",
                        isActive
                          ? "font-black bg-[#FFE600] text-black border-2 border-black shadow-[3px_3px_0_0_#000] translate-x-1"
                          : "text-foreground/85 border-transparent hover:border-foreground hover:bg-secondary/60 hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-x-0.5 hover:scale-[1.02] font-extrabold"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", isActive && "stroke-[2.5]")} />
                      <span className="truncate flex-1 text-left font-bold text-xs">
                        {item.label}
                      </span>
                      {(targetPath === "/TABEAI" || item.id === "item-/TABEAI") && (
                        <span className={cn(
                          "ml-auto text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none transition-colors",
                          isActive
                            ? "bg-black text-white border-black"
                            : "bg-[#00E5FF] text-black border-black shadow-[1px_1px_0_0_#000]"
                        )}>
                          AI
                        </span>
                      )}
                      {isActive && targetPath !== "/TABEAI" && item.id !== "item-/TABEAI" && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                      )}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    to={path}
                    onClick={() => ComicAudio.playPop()}
                    onMouseEnter={() => preloadRoute(path)}
                    onTouchStart={() => preloadRoute(path)}
                    onFocus={() => preloadRoute(path)}
                    className={cn(
                      "flex items-center rounded-xl transition-all duration-150 group relative border-2 select-none gap-3 px-3 py-2",
                      isActive
                        ? "font-black bg-[#FFE600] text-black border-2 border-black shadow-[3px_3px_0_0_#000] translate-x-1"
                        : "text-foreground/85 border-transparent hover:border-foreground hover:bg-card hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-x-0.5 hover:scale-[1.01] font-extrabold"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 transition-all flex-shrink-0",
                        isActive ? "stroke-[2.5]" : ""
                      )}
                    />
                    <span className="truncate flex-1 text-left font-black text-xs uppercase tracking-tight">
                      {item.label}
                    </span>
                    {(targetPath === "/TABEAI" || item.id === "item-/TABEAI") && (
                      <span className={cn(
                        "ml-auto text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none transition-colors",
                        isActive
                          ? "bg-black text-white border-black"
                          : "bg-[#00E5FF] text-black border-black shadow-[1px_1px_0_0_#000]"
                      )}>
                        AI
                      </span>
                    )}
                    {isActive && targetPath !== "/TABEAI" && item.id !== "item-/TABEAI" && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-black" />
                    )}
                  </Link>
                );
              };

              return displayItems.map((item: any, idx: number) => renderNavItem(item, false, idx));
            })()}
          </nav>
        )}

        {/* User Progress Summary - Comic Gamified Card */}
        <div className={cn("border-t-3 border-foreground flex-shrink-0 transition-all bg-secondary/20 relative group/xp", isCollapsed ? "p-2" : "p-3")}>
          <div className={cn(
            "rounded-2xl border-3 border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-all relative overflow-hidden",
            isCollapsed ? "p-2 flex flex-col items-center gap-1 cursor-pointer hover:border-black" : "p-3.5"
          )}>
            {/* Decorative comic corner */}
            <div className="absolute top-0 right-0 w-12 h-12 bg-[#FFE600]/15 rounded-bl-full pointer-events-none" />

            {isCollapsed ? (
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-xl bg-[#FFE600] text-black flex items-center justify-center font-black text-xs border-2 border-black shadow-[2px_2px_0_0_#000]">
                  {xpData.level}
                </div>
                <div className="w-8 h-1.5 bg-secondary rounded-full border border-black overflow-hidden mt-1">
                  <div className="h-full bg-[#FFE600]" style={{ width: `${xpData.progress}%` }} />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-2.5 relative z-10">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-[#FFE600] text-black flex items-center justify-center font-black text-base border-2 border-black shadow-[2px_2px_0_0_#000]">
                      {xpData.level}
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#FF2E93] text-white border-2 border-black flex items-center justify-center text-[10px] font-black shadow-xs">
                      ⚡
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-black text-xs tracking-tight text-foreground uppercase">
                        Nivel {xpData.level}
                      </span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#FFE600] text-black border border-black shadow-[1px_1px_0_0_#000]">
                        {Math.round(xpData.progress)}%
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-muted-foreground truncate mt-0.5">
                      <span className="text-foreground font-black">{xpData.currentXp.toLocaleString()}</span> XP total
                    </p>
                  </div>
                </div>

                {/* Chunky Comic XP Bar */}
                <div className="space-y-1 relative z-10">
                  <div className="h-3 bg-secondary rounded-full border-2 border-foreground overflow-hidden p-[1px] shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))]">
                    <div
                      className="h-full bg-gradient-to-r from-[#1475e5] via-[#00E5FF] to-[#BFFF00] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(6, xpData.progress)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground px-0.5">
                    <span className="font-black uppercase text-[9px]">Siguiente nivel</span>
                    <span className="font-black text-foreground">{Math.round(xpData.xpForNext)} XP</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Floating XP card when collapsed on hover */}
          {isCollapsed && (
            <div className="hidden group-hover/xp:block absolute left-[calc(100%+10px)] bottom-2 z-50 bg-card border-3 border-foreground rounded-2xl p-3.5 shadow-[6px_6px_0_0_hsl(var(--foreground))] w-56 animate-sidebar-entrance pointer-events-none">
              <div className="absolute -left-2 bottom-4 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-foreground" />
              <div className="flex items-center gap-3 mb-2.5 relative z-10">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-[#FFE600] text-black flex items-center justify-center font-black text-base border-2 border-black shadow-[2px_2px_0_0_#000]">
                    {xpData.level}
                  </div>
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#FF2E93] text-white border-2 border-black flex items-center justify-center text-[10px] font-black">
                    ⚡
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-black text-xs tracking-tight text-foreground uppercase">
                      Nivel {xpData.level}
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#FFE600] text-black border border-black shadow-[1px_1px_0_0_#000]">
                      {Math.round(xpData.progress)}%
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-muted-foreground truncate mt-0.5">
                    <span className="text-foreground font-black">{xpData.currentXp.toLocaleString()}</span> XP total
                  </p>
                </div>
              </div>

              {/* Chunky Comic XP Bar */}
              <div className="space-y-1 relative z-10">
                <div className="h-3 bg-secondary rounded-full border-2 border-foreground overflow-hidden p-[1px] shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))]">
                  <div
                    className="h-full bg-gradient-to-r from-[#1475e5] via-[#00E5FF] to-[#BFFF00] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(6, xpData.progress)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground px-0.5">
                  <span className="font-black uppercase text-[9px]">Siguiente nivel</span>
                  <span className="font-black text-foreground">{Math.round(xpData.xpForNext)} XP</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
      )}

      {/* Main Content */}
      <main className={cn(
        "min-h-screen transition-all duration-300 relative z-[1]",
        isAIPage 
          ? "w-full p-0 m-0" 
          : cn("pt-[calc(4.5rem+env(safe-area-inset-top,0px))] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pt-0 lg:pb-0", isCollapsed ? "lg:ml-20" : "lg:ml-64")
      )}>
        <Outlet />
      </main>

      {/* Global Widgets */}
      {!isAIPage && <GlobalPomodoroWidget />}
      {!isAIPage && <AIBubbleWidget />}
      <GuestModeBanner />
      <GlobalNotificationManager />
      
      {/* Mobile Navigation Bar */}
      {!isAIPage && <MobileNavbar />}
    </div>
  </ComicEffectsProvider>
  );
}
