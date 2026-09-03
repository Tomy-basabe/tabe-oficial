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
    <div 
      className="min-h-screen bg-background relative overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--border)) 2px, transparent 0)`,
        backgroundSize: '32px 32px'
      }}
    >
      {/* Neo-Brutalism Pattern Background */}
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-[1001] h-16 bg-card/95 backdrop-blur-md border-b border-border/60 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.06)] flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <TabeLogo size={38} className="shrink-0" />
          <span className="font-extrabold text-lg tracking-tight text-foreground">TABE</span>
        </Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full border-r border-border/60 transition-all duration-300 flex flex-col bg-card shadow-[4px_0_20px_-4px_rgba(0,0,0,0.05)]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Toggle Button (Desktop Only) */}
        <div className="hidden lg:flex absolute -right-3 top-6 z-50">
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6 rounded-full bg-card border-border/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] hover:bg-secondary"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
          </Button>
        </div>

        {/* Logo */}
        <div className={cn("h-16 flex items-center border-b border-border/40 flex-shrink-0 transition-all overflow-hidden", isCollapsed ? "justify-center px-0" : "justify-start px-6 gap-3")}>
          <TabeLogo size={46} className="shrink-0" />
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-extrabold text-xl tracking-tight text-foreground truncate">TABE</h1>
              <p className="text-xs font-bold text-muted-foreground truncate">Tu espacio académico</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 overflow-hidden">
          <nav className={cn("space-y-2 py-4", isCollapsed ? "px-2" : "px-4")}>
            {(() => {
              const renderNavItem = (item: any, isInsideCategory = false, index = 0) => {
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
                            "w-full flex items-center rounded-xl transition-all duration-200 group relative border-2 border-transparent",
                            isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
                            "text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-border"
                          )}
                        >
                          <Icon className={cn("transition-all flex-shrink-0", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
                          {!isCollapsed && (
                            <>
                              <span className="font-bold truncate flex-1 text-left">{item.label}</span>
                              <ChevronDown className="w-4 h-4 opacity-50 group-data-[state=open]:rotate-180 transition-transform" />
                            </>
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1 ml-4 border-l-2 border-border pl-2">
                        {item.items?.map((subItem: any, subIndex: number) => renderNavItem(subItem, true, subIndex))}
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
                      "flex items-center rounded-xl transition-all duration-200 group relative border-2",
                      isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
                      isActive
                        ? "font-extrabold bg-foreground text-background border-foreground shadow-[3px_3px_0_0_#1475e5]"
                        : "text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground hover:border-border hover:-translate-y-0.5",
                      isInsideCategory && !isCollapsed && "py-2"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn(
                        "transition-all flex-shrink-0",
                        isCollapsed ? "w-6 h-6" : "w-5 h-5"
                      )}
                    />
                    {!isCollapsed && (
                      <span className="font-bold truncate">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              };

              let displayItems = profile?.sidebar_config 
                ? [...profile.sidebar_config] 
                : baseNavItems.map(i => ({ id: i.path, label: i.label, type: "item" }));
              
              if (!displayItems.some((i: any) => i.id === "/juegos" || i.path === "/juegos" || (i.items?.some((s: any) => s.id === "/juegos" || s.path === "/juegos")))) {
                displayItems.push({
                  id: "item-/juegos",
                  path: "/juegos",
                  label: "Juegos",
                  type: "item",
                  iconName: "Gamepad2"
                });
              }
              
              if (isAdmin && !displayItems.some((i: any) => i.id === "/admin" || (i.items?.some((s: any) => s.id === "/admin")))) {
                displayItems = [...displayItems, { id: "/admin", label: "Admin", type: "item" }];
              }

              return displayItems.map((item: any, idx: number) => renderNavItem(item, false, idx));
            })()}
          </nav>
        </ScrollArea>
        {/* User Progress Summary */}
        <div className={cn("border-t border-border/40 flex-shrink-0 transition-all", isCollapsed ? "p-2" : "p-4")}>
          <div className={cn("rounded-xl bg-secondary/50", isCollapsed ? "p-2 flex flex-col items-center gap-1" : "p-4")}>
            <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3 mb-3")}>
              <div className="w-8 h-8 rounded-full bg-[#1475e5] flex items-center justify-center text-white font-extrabold text-xs">
                {xpData.level}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="font-extrabold text-sm truncate">Nivel {xpData.level}</p>
                  <p className="text-[10px] font-bold text-muted-foreground truncate">{xpData.currentXp.toLocaleString()} XP</p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <>
                <div className="h-1.5 mt-1 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1475e5] rounded-full transition-all duration-500"
                    style={{ width: `${xpData.progress}%` }}
                  />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground mt-1.5 text-center">
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
        "min-h-screen transition-all duration-300 pt-16 pb-20 lg:pt-0 lg:pb-0 relative z-[1]",
        isCollapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        <Outlet />
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
