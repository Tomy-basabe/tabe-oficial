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
  Folder,
  Sun,
  Moon,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
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
import { preloadRoute } from "@/lib/routePreload";
import { performGlobalCalendarSync, isWednesdaySyncDay } from "@/lib/globalCalendarSync";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/layout/PageTransition";

interface UserStats {
  xp_total: number;
  nivel: number;
}

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const sessionToggled = sessionStorage.getItem("tabe-sidebar-user-toggled");
      if (sessionToggled === "true") {
        const saved = localStorage.getItem("tabe-sidebar-collapsed");
        if (saved !== null) return JSON.parse(saved);
      }
    } catch (e) {}
    return true; // Por default cerrado al iniciar la app
  }); // Desktop state
  const location = useLocation();
  const navigate = useNavigate();
  const lowerPath = location.pathname.toLowerCase();
  const isAIPage =
    lowerPath.startsWith("/tabeai") ||
    lowerPath.startsWith("/tabe-ai") ||
    lowerPath.startsWith("/asistente");
  const isApuntesPage = lowerPath.startsWith("/apuntes") || lowerPath.startsWith("/notion");
  const isTabetalkPage = lowerPath.startsWith("/tabetalk") || lowerPath.startsWith("/discord");
  const isFullScreenPage = isAIPage || isApuntesPage || isTabetalkPage;
  const { user, isGuest, profile, signOut } = useAuth();
  const { toggleTheme, resolvedTheme } = useTheme();
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
  const userId = user?.id;
  
  // Auto-sync academic calendars (Google Calendar & Moodle Campus) weekly on Wednesdays
  useEffect(() => {
    if (!userId || isGuest) return;

    // Solo programar sincronización automática en background los días miércoles
    if (!isWednesdaySyncDay()) return;

    // Ejecutar una sola vez en background tras ingresar los miércoles
    const timer = setTimeout(() => {
      performGlobalCalendarSync(user, { silent: true });
    }, 4000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isWednesdaySyncDay()) {
        performGlobalCalendarSync(user, { silent: true });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId, isGuest]);

  useEffect(() => {
    if (!userId && !isGuest) return;

    if (isGuest) {
      setUserStats({ xp_total: 4150, nivel: 42 });
      return;
    }

    if (!userId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchUserStats = async () => {
      const { data } = await supabase
        .from("user_stats")
        .select("xp_total, nivel")
        .eq("user_id", userId)
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
      .channel(`sidebar-user-stats-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_stats", filter: `user_id=eq.${userId}` },
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
  }, [userId, isGuest]);

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

  // Sync normalized sidebar items (removing /tabetalk and ensuring all sections exist) to local storage
  useEffect(() => {
    try {
      const local = localStorage.getItem("tabe-custom-sidebar-config");
      if (local && displayItems && displayItems.length > 0) {
        const parsed = JSON.parse(local);
        const hasTabetalk = parsed?.some((i: any) => 
          (i.path || i.id) === "/tabetalk" || (i.items && i.items.some((sub: any) => (sub.path || sub.id) === "/tabetalk"))
        );
        const hasMarketplace = parsed?.some((i: any) => 
          (i.path || i.id) === "/marketplace" || (i.items && i.items.some((sub: any) => (sub.path || sub.id) === "/marketplace"))
        );
        const hasTabegochi = parsed?.some((i: any) => 
          (i.path || i.id) === "/tabegochi" || (i.items && i.items.some((sub: any) => (sub.path || sub.id) === "/tabegochi"))
        );
        if (hasTabetalk || hasMarketplace || hasTabegochi) {
          localStorage.setItem("tabe-custom-sidebar-config", JSON.stringify(displayItems));
        }
      }
    } catch (e) {}
  }, [displayItems]);

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
      
    } catch (e) {}
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("tabe-sidebar-collapsed", JSON.stringify(next));
        sessionStorage.setItem("tabe-sidebar-user-toggled", "true");
      } catch (e) {}
      return next;
    });
  };

  const toggleCategory = (catId: string) => {
    try {
      
    } catch (e) {}
    setHoveredCategory(null);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (isCollapsed) {
      setIsCollapsed(false);
      try {
        localStorage.setItem("tabe-sidebar-collapsed", JSON.stringify(false));
        sessionStorage.setItem("tabe-sidebar-user-toggled", "true");
      } catch (e) {}
      setOpenCategories(prev => {
        const next = { ...prev, [catId]: true };
        try { localStorage.setItem("tabe-sidebar-categories-open", JSON.stringify(next)); } catch (e) {}
        return next;
      });
      return;
    }

    const isCurrentlyOpen = !!openCategories[catId] || hoveredCategory === catId;
    if (isCurrentlyOpen) {
      // Cierre inmediato al hacer click: evita que el hover mantenga abierta la categoría mientras el cursor siga encima
      closedByClickRef.current[catId] = true;
      setOpenCategories(prev => {
        const next = { ...prev, [catId]: false };
        try { localStorage.setItem("tabe-sidebar-categories-open", JSON.stringify(next)); } catch (e) {}
        return next;
      });
    } else {
      delete closedByClickRef.current[catId];
      setOpenCategories(prev => {
        const next = { ...prev, [catId]: true };
        try { localStorage.setItem("tabe-sidebar-categories-open", JSON.stringify(next)); } catch (e) {}
        return next;
      });
    }
  };

  return (
    <ComicEffectsProvider>
      <div className="min-h-screen bg-white dark:bg-[#171717] text-zinc-900 dark:text-zinc-100 relative overflow-hidden">
        {/* Mobile Header */}
        {!isFullScreenPage && (
          <header className="lg:hidden fixed top-0 left-0 right-0 z-[1001] h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] bg-white/90 dark:bg-[#1f1f1f]/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2">
              <TabeLogo size={32} className="shrink-0" />
              <span className="font-semibold text-base tracking-tight text-zinc-900 dark:text-zinc-100">TABE</span>
            </Link>

            {/* Quick Level / XP Badge on mobile header */}
            <Link 
              to="/metricas"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
            >
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">NV. {xpData.level}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">({xpData.currentXp} XP)</span>
            </Link>
          </header>
        )}

        {/* Sidebar (Desktop Only) */}
        {!isFullScreenPage && (
          <aside
            className={cn(
              "hidden lg:flex fixed top-0 left-0 h-full border-r border-zinc-300 dark:border-zinc-700 transition-all duration-200 flex-col bg-[#F7F7F5] dark:bg-[#212121] z-40",
              isCollapsed ? "w-16" : "w-60"
            )}
          >
          {/* Toggle Button (Desktop Only) */}
          <div className="hidden lg:flex absolute -right-3 top-4 z-50">
            <button
              aria-label={isCollapsed ? "Desplegar panel lateral" : "Plegar / guardar panel lateral"}
              title={isCollapsed ? "Desplegar panel lateral" : "Plegar / guardar panel lateral"}
              className="h-6 w-6 rounded-md bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
              onClick={toggleCollapse}
            >
              {isCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Logo Header */}
          <div className={cn("h-14 flex items-center border-b border-zinc-300 dark:border-zinc-700 flex-shrink-0 transition-all overflow-hidden", isCollapsed ? "justify-center px-0" : "justify-between px-4 gap-2")}>
            <div className="flex items-center gap-2.5 min-w-0">
              <TabeLogo size={32} className="shrink-0" />
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 truncate">TABE</h1>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">Espacio académico</p>
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
                if (targetPath === "/tabetalk" || targetPath === "/discord") return null;
                if ((targetPath === "/tabe-admin" || targetPath === "/admin") && !isSuperAdmin(user)) return null;
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
                  const isHovered = hoveredCategory === item.id;

                  return (
                    <div
                      key={item.id}
                      className="space-y-1.5 my-2 relative group/cat"
                      onMouseEnter={() => {
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                        setHoveredCategory(item.id);
                      }}
                      onMouseLeave={() => {
                        hoverTimeoutRef.current = setTimeout(() => {
                          setHoveredCategory((prev) => (prev === item.id ? null : prev));
                        }, 250);
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          
                          toggleCategory(item.id);
                        }}
                        className={cn(
                          "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 select-none mx-auto cursor-pointer",
                          hasActiveChild || isHovered
                            ? "text-zinc-900 dark:text-zinc-100 bg-zinc-200/80 dark:bg-zinc-800 font-semibold"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                        )}
                        aria-label={item.label}
                      >
                        <Icon className={cn("w-5 h-5 transition-transform group-hover/cat:scale-105 flex-shrink-0", hasActiveChild ? "stroke-[2.2]" : "stroke-[2]")} />
                      </button>

                      {/* Floating Category Menu on Hover (Apple / Notion clean flyout) */}
                      {isHovered && item.items && (
                        <div className="absolute left-[calc(100%+8px)] top-0 z-50 bg-white/95 dark:bg-[#1a1a1d]/95 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800/90 rounded-xl p-1.5 shadow-xl min-w-[200px] space-y-0.5 animate-in fade-in-0 zoom-in-95 duration-150">
                          <div className="px-2.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800/60 mb-1 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-xs border border-zinc-200/60 dark:border-zinc-700/60">
                              <Icon className="w-3 h-3 stroke-[2]" />
                            </div>
                            <span className="font-semibold text-xs tracking-tight text-zinc-800 dark:text-zinc-200">{item.label}</span>
                          </div>
                          <div className="space-y-0.5">
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
                    <motion.div
                      key={item.id}
                      initial={isInsideCategory ? { opacity: 0, x: -6 } : false}
                      animate={isInsideCategory ? { opacity: 1, x: 0 } : undefined}
                      transition={isInsideCategory ? { duration: 0.2, delay: index * 0.03 } : undefined}
                    >
                    <Link
                      to={path}
                      onClick={() => {
                        
                        setHoveredCategory(null);
                      }}
                      onMouseEnter={() => preloadRoute(path)}
                      onTouchStart={() => preloadRoute(path)}
                      onFocus={() => preloadRoute(path)}
                      style={{ animationDelay: `${index * 30}ms` }}
                      className={cn(
                        "flex items-center rounded-lg transition-colors group relative select-none gap-2.5 px-2.5 py-1.5 text-xs",
                        isActive
                          ? "font-medium bg-zinc-100 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5 shrink-0 transition-colors text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200", isActive && "text-zinc-900 dark:text-zinc-100 stroke-[2.2]")} />
                      <span className="truncate flex-1 text-left font-medium text-xs">
                        {item.label}
                      </span>
                      {(targetPath === "/TABEAI" || item.id === "item-/TABEAI") && (
                        <span className="ml-auto text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded border bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700/80">
                          AI
                        </span>
                      )}
                      {isActive && targetPath !== "/TABEAI" && item.id !== "item-/TABEAI" && (
                        <span className="ml-auto w-1 h-1 rounded-full bg-zinc-900 dark:bg-zinc-100 shrink-0" />
                      )}
                    </Link>
                    </motion.div>
                  );
                }

                // Single item in collapsed dock
                return (
                  <div key={item.id} className="relative group/navitem">
                    <Link
                      to={path}
                      onMouseEnter={() => preloadRoute(path)}
                      onTouchStart={() => preloadRoute(path)}
                      onFocus={() => preloadRoute(path)}
                      className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 group relative select-none mx-auto cursor-pointer",
                        isActive
                          ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                      )}
                      aria-label={item.label}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5 transition-transform group-hover/navitem:scale-105 flex-shrink-0",
                          isActive ? "stroke-[2.2]" : "stroke-[2]"
                        )}
                      />
                    </Link>

                    {/* Popout tooltip only for this item when hovered (Apple minimalist style) */}
                    <div className="hidden group-hover/navitem:flex absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 bg-white dark:bg-[#1c1c1f] border border-zinc-200/80 dark:border-zinc-800/80 rounded-md px-2.5 py-1 shadow-md items-center gap-2 whitespace-nowrap pointer-events-none animate-in fade-in-0 zoom-in-95 duration-100">
                      <span className="font-medium text-xs tracking-tight text-zinc-900 dark:text-zinc-100">
                        {item.label}
                      </span>
                      {(targetPath === "/TABEAI" || item.id === "item-/TABEAI") && (
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80">
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
          <ScrollArea className="flex-1 overflow-hidden">
            <nav className="space-y-2 py-3.5 px-3">
              {(() => {
                const renderNavItem = (item: any, isInsideCategory = false, index = 0) => {
                  const targetPath = item.path || (item.type === "item" ? item.id : null);
                  if (targetPath === "/tabetalk" || targetPath === "/discord") return null;
                  if ((targetPath === "/tabe-admin" || targetPath === "/admin") && !isSuperAdmin(user)) return null;
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
                    const isOpen = !!openCategories[item.id];
                    const isHovered = hoveredCategory === item.id && !closedByClickRef.current[item.id];
                    const isVisible = isOpen || isHovered;

                    return (
                      <div
                        key={item.id}
                        className="space-y-1.5 my-2 relative"
                        onMouseEnter={() => {
                          if (!closedByClickRef.current[item.id]) {
                            setHoveredCategory(item.id);
                          }
                        }}
                        onMouseLeave={() => {
                          delete closedByClickRef.current[item.id];
                          setHoveredCategory((prev) => (prev === item.id ? null : prev));
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            toggleCategory(item.id);
                          }}
                          className={cn(
                            "w-full flex items-center rounded-lg transition-colors select-none gap-2 px-2.5 py-1.5 cursor-pointer text-xs font-medium",
                            hasActiveChild || isVisible
                              ? "text-zinc-900 dark:text-zinc-100 bg-zinc-200/50 dark:bg-zinc-800/60"
                              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-100"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors",
                            hasActiveChild 
                              ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold" 
                              : "bg-zinc-200/40 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400"
                          )}>
                            <Icon className="w-3.5 h-3.5 stroke-[2]" />
                          </div>
                          <span className="font-semibold text-xs tracking-tight truncate flex-1 text-left text-zinc-800 dark:text-zinc-200">{item.label}</span>
                          <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-transform duration-150 stroke-[2]", isVisible && "rotate-180")} />
                        </button>

                        {/* Regular expanded category list in normal sidebar */}
                        <AnimatePresence initial={false}>
                          {isVisible && item.items && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-0.5 ml-2 border-l border-zinc-200/80 dark:border-zinc-800/80 pl-2 my-1">
                                {item.items.map((subItem: any, subIndex: number) => renderNavItem(subItem, true, subIndex))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <motion.div
                      key={item.id}
                      initial={isInsideCategory ? { opacity: 0, x: -6 } : false}
                      animate={isInsideCategory ? { opacity: 1, x: 0 } : undefined}
                      transition={isInsideCategory ? { duration: 0.2, delay: index * 0.03 } : undefined}
                    >
                    <Link
                      to={path}
                      onMouseEnter={() => preloadRoute(path)}
                      onTouchStart={() => preloadRoute(path)}
                      onFocus={() => preloadRoute(path)}
                      className={cn(
                        "flex items-center rounded-lg transition-colors group relative select-none",
                        isInsideCategory ? "gap-2 px-2.5 py-1.5 text-xs" : "gap-2.5 px-3 py-2 text-xs",
                        isActive
                          ? "font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 transition-colors flex-shrink-0 text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200",
                          isActive && "text-zinc-900 dark:text-zinc-100 stroke-[2.2]"
                        )}
                      />
                      <span className={cn("truncate flex-1 text-left", isInsideCategory ? "font-medium text-xs text-zinc-700 dark:text-zinc-300" : "font-semibold text-xs tracking-tight text-zinc-800 dark:text-zinc-200")}>
                        {item.label}
                      </span>
                      {(targetPath === "/TABEAI" || item.id === "item-/TABEAI") && (
                        <span className="ml-auto text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded border bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700/80">
                          AI
                        </span>
                      )}
                      {isActive && targetPath !== "/TABEAI" && item.id !== "item-/TABEAI" && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 shrink-0" />
                      )}
                    </Link>
                    </motion.div>
                  );
                };

                return displayItems.map((item: any, idx: number) => renderNavItem(item, false, idx));
              })()}
            </nav>
          </ScrollArea>
        )}

          {/* Footer: Botones compactos para cambiar tema y cerrar sesión */}
          <div className={cn(
            "mt-auto border-t border-zinc-200/80 dark:border-zinc-800/80 shrink-0 transition-all select-none",
            isCollapsed ? "py-3 px-2 flex flex-col items-center gap-1.5" : "py-2.5 px-3 flex items-center justify-between gap-1"
          )}>
            {isCollapsed ? (
              <>
                {/* Cambiar tema (Colapsado) */}
                <div className="relative group/foot-theme">
                  <button
                    type="button"
                    onClick={() => {
                      
                      toggleTheme();
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                    aria-label={resolvedTheme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
                  >
                    {resolvedTheme === "dark" ? (
                      <Sun className="w-5 h-5 text-amber-400 stroke-[2.2]" />
                    ) : (
                      <Moon className="w-5 h-5 text-zinc-600 stroke-[2.2]" />
                    )}
                  </button>
                  <div className="hidden group-hover/foot-theme:flex absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 bg-white dark:bg-[#1c1c1f] border border-zinc-200/80 dark:border-zinc-800/80 rounded-md px-2.5 py-1 shadow-md items-center whitespace-nowrap pointer-events-none animate-in fade-in-0 zoom-in-95 duration-100">
                    <span className="font-medium text-xs tracking-tight text-zinc-900 dark:text-zinc-100">
                      {resolvedTheme === "dark" ? "Modo Claro" : "Modo Oscuro"}
                    </span>
                  </div>
                </div>

                {/* Cerrar sesión (Colapsado) */}
                <div className="relative group/foot-logout">
                  <button
                    type="button"
                    onClick={async () => {
                      
                      await signOut();
                      navigate("/login");
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    aria-label="Cerrar sesión"
                  >
                    <LogOut className="w-5 h-5 stroke-[2.2]" />
                  </button>
                  <div className="hidden group-hover/foot-logout:flex absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 bg-white dark:bg-[#1c1c1f] border border-zinc-200/80 dark:border-zinc-800/80 rounded-md px-2.5 py-1 shadow-md items-center whitespace-nowrap pointer-events-none animate-in fade-in-0 zoom-in-95 duration-100">
                    <span className="font-medium text-xs tracking-tight text-red-600 dark:text-red-400">
                      Cerrar sesión
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-xs font-semibold shrink-0">
                    {user?.email?.charAt(0).toUpperCase() || "T"}
                  </div>
                  <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 truncate">
                    {user?.email?.split("@")[0] || "Mi cuenta"}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Cambiar tema (Expandido) */}
                  <button
                    type="button"
                    onClick={() => {
                      
                      toggleTheme();
                    }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                    title={resolvedTheme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
                    aria-label={resolvedTheme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
                  >
                    {resolvedTheme === "dark" ? (
                      <Sun className="w-4 h-4 text-amber-400 stroke-[2.2]" />
                    ) : (
                      <Moon className="w-4 h-4 text-zinc-600 stroke-[2.2]" />
                    )}
                  </button>

                  {/* Cerrar sesión (Expandido) */}
                  <button
                    type="button"
                    onClick={async () => {
                      
                      await signOut();
                      navigate("/login");
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    title="Cerrar sesión"
                    aria-label="Cerrar sesión"
                  >
                    <LogOut className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>
              </>
            )}
          </div>

        </aside>
      )}

      {/* Main Content */}
      <main className={cn(
        "min-h-screen transition-all duration-300 relative z-[1]",
        isFullScreenPage 
          ? "w-full p-0 m-0" 
          : cn("pt-[calc(4.5rem+env(safe-area-inset-top,0px))] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pt-0 lg:pb-0", isCollapsed ? "lg:ml-20" : "lg:ml-64")
      )}>
        <PageTransition className="w-full h-full">
          <Outlet />
        </PageTransition>
      </main>

      {/* Global Widgets */}
      {!isFullScreenPage && <GlobalPomodoroWidget />}
      {!isFullScreenPage && <AIBubbleWidget />}
      <GuestModeBanner />
      <GlobalNotificationManager />
      
      {/* Mobile Navigation Bar */}
      {!isFullScreenPage && <MobileNavbar />}
    </div>
  </ComicEffectsProvider>
  );
}
