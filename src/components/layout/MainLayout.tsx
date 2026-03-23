import { useState, useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { TabeLogo } from "@/components/ui/TabeLogo";
import { Outlet, Link, useLocation } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  NavItem, 
  baseNavItems, 
  adminNavItem, 
  ICON_MAP,
  CustomSidebarItem,
  ALL_AVAILABLE_ITEMS
} from "@/lib/sidebar-configs";
import { AdsterraBanner } from "@/components/ads/AdsterraBanner";
import { MobileNavbar } from "@/components/layout/MobileNavbar";


interface UserStats {
  xp_total: number;
  nivel: number;
}

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile state
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop state
  const location = useLocation();
  const { user, isGuest, profile } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
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

  // Logo color mapping
  const getLogoPath = () => {
    const theme = isGuest ? (profile?.active_theme || null) : profile?.active_theme;
    switch (theme) {
      case "theme-cyan": return "/logos/logo-cyan.png";
      case "theme-green": return "/logos/logo-green.png";
      case "theme-neon-gold": return "/logos/logo-gold.png";
      case "theme-red": return "/logos/logo-red.png";
      case "theme-pink": return "/logos/logo-pink.png";
      case "theme-black": return "/logos/logo-black.png";
      case "theme-white": return "/logos/logo-white.png";
      default: return "/logos/logo-purple.png";
    }
  };

  const logoPath = getLogoPath();

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  const navItems = isAdmin ? [...baseNavItems, adminNavItem] : baseNavItems;

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user && !isGuest) return;

      if (isGuest) {
        setUserStats({ xp_total: 4150, nivel: 42 });
        return;
      }

      const { data } = await supabase
        .from("user_stats")
        .select("xp_total, nivel")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setUserStats(data);
    };
    fetchUserStats();

    const channel = supabase
      .channel("sidebar-user-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_stats", filter: `user_id=eq.${user?.id}` }, () => fetchUserStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isGuest]);

  const xpData = (() => {
    if (!userStats) return { currentXp: 0, level: 1, progress: 0, xpForNext: 100 };
    const totalXp = userStats.xp_total || 0;
    const level = Math.floor(totalXp / 100) + 1;
    const current = totalXp % 100;
    return { currentXp: totalXp, level, progress: current, xpForNext: 100 - current };
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-[1001] h-16 bg-card/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-card/50 flex items-center justify-center p-0 border border-border/50 overflow-hidden shadow-lg">
            <img src={logoPath} alt="T.A.B.E Logo" className="w-full h-full object-cover scale-[1.3] bg-black" />
          </div>
          <span className="font-display font-bold text-lg gradient-text">T.A.B.E.</span>
        </Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full border-r border-sidebar-border transition-all duration-300 flex flex-col bg-sidebar",
          // Mobile logic
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Desktop collapse logic
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Toggle Button (Desktop Only) */}
        <div className="hidden lg:flex absolute -right-3 top-6 z-50">
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6 rounded-full bg-background border-border shadow-sm hover:bg-accent"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
          </Button>
        </div>

        {/* Logo */}
        <div className={cn("h-16 flex items-center border-b border-sidebar-border flex-shrink-0 transition-all overflow-hidden", isCollapsed ? "justify-center px-0" : "justify-start px-6 gap-3")}>
          <div className="w-10 h-10 rounded-xl bg-card/50 flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] flex-shrink-0 p-0 border border-border/50 overflow-hidden">
            <img src={logoPath} alt="T.A.B.E Logo" className="w-full h-full object-cover scale-[1.3] bg-black" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-display font-bold text-xl gradient-text truncate">T.A.B.E.</h1>
              <p className="text-xs text-muted-foreground truncate">Sistema Académico</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 overflow-hidden">
          <nav className={cn("space-y-2 py-4", isCollapsed ? "px-2" : "px-4")}>
            {(() => {
              const renderNavItem = (item: any, isInsideCategory = false) => {
                // Find matching base item to get the icon (including admin)
                // Use item.path (new) or item.id (legacy/folders)
                const targetPath = item.path || (item.type === "item" ? item.id : null);
                const baseItem = [...ALL_AVAILABLE_ITEMS, adminNavItem].find(b => b.path === targetPath);
                
                if (!baseItem && item.type === "item") return null;

                // Resilient icon selection: Prefer custom iconName unless it's a generic fallback
                const Icon = (item.iconName && item.iconName !== "FileText" && ICON_MAP[item.iconName]) 
                  || baseItem?.icon 
                  || (item.iconName && ICON_MAP[item.iconName])
                  || Folder;
                
                const path = targetPath || "#";
                const isActive = location.pathname === path;

                if (item.type === "category") {
                  return (
                    <Collapsible key={item.id} className="space-y-1">
                      <CollapsibleTrigger asChild>
                        <button
                          className={cn(
                            "w-full flex items-center rounded-xl transition-all duration-200 group relative",
                            isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
                            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <Icon className={cn("transition-all flex-shrink-0", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
                          {!isCollapsed && (
                            <>
                              <span className="font-semibold truncate flex-1 text-left">{item.label}</span>
                              <ChevronDown className="w-4 h-4 opacity-50 group-data-[state=open]:rotate-180 transition-transform" />
                            </>
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1 ml-4 border-l border-sidebar-border/50 pl-2">
                        {item.items?.map((subItem: any) => renderNavItem(subItem, true))}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    to={path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center rounded-xl transition-all duration-200 group relative",
                      isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isInsideCategory && !isCollapsed && "py-2"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn(
                        "transition-all flex-shrink-0",
                        isCollapsed ? "w-6 h-6" : "w-5 h-5",
                        isActive && "text-primary drop-shadow-[0_0_8px_hsl(var(--neon-cyan))]"
                      )}
                    />
                    {!isCollapsed && (
                      <span className={cn("font-medium truncate", isActive && "text-glow-cyan")}>
                        {item.label}
                      </span>
                    )}
                    {!isCollapsed && isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </Link>
                );
              };

              let displayItems = profile?.sidebar_config || baseNavItems.map(i => ({ id: i.path, label: i.label, type: "item" }));
              
              // Always show admin if user is admin and it's not in the config
              if (isAdmin && !displayItems.some((i: any) => i.id === "/admin" || (i.items?.some((s: any) => s.id === "/admin")))) {
                displayItems = [...displayItems, { id: "/admin", label: "Admin", type: "item" }];
              }

              return displayItems.map((item: any) => renderNavItem(item));
            })()}
          </nav>
        </ScrollArea>

        {/* User Progress Summary */}
        <div className={cn("border-t border-sidebar-border flex-shrink-0 transition-all", isCollapsed ? "p-2" : "p-4")}>
          <div className={cn("card-gamer rounded-xl bg-sidebar-accent/50", isCollapsed ? "p-2 flex flex-col items-center gap-1" : "p-4")}>
            <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3 mb-3")}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-gold to-neon-cyan flex items-center justify-center text-background font-display font-bold text-xs">
                {xpData.level}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">Nivel {xpData.level}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{xpData.currentXp.toLocaleString()} XP</p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <>
                <div className="progress-gamer h-1.5 mt-1">
                  <div
                    className="progress-gamer-bar transition-all duration-500"
                    style={{ width: `${xpData.progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                  {Math.round(xpData.xpForNext)} XP para prox. nivel
                </p>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className={cn(
        "min-h-screen transition-all duration-300 pt-16 pb-20 lg:pt-0 lg:pb-0",
        isCollapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        <Outlet />
        <AdsterraBanner />
      </main>

      {/* Global Widgets */}
      <GlobalPomodoroWidget />
      <AIBubbleWidget />
      <GuestModeBanner />
      
      {/* Mobile Navigation Bar */}
      <MobileNavbar />
    </div>
  );
}
