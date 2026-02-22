
import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  Calendar,
  Timer,
  BarChart3,
  Bot,
  Settings,
  Menu,
  X,
  Zap,
  Layers,
  Library,
  Trophy,
  Shield,
  Users,
  Store,
  TreeDeciduous,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotionIcon } from "@/components/icons/NotionIcon";
import { DiscordIcon } from "@/components/icons/DiscordIcon";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GlobalPomodoroWidget } from "@/components/pomodoro/GlobalPomodoroWidget";
import { Button } from "@/components/ui/button";

const baseNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: GraduationCap, label: "Plan de Carrera", path: "/carrera" },
  { icon: NotionIcon, label: "Notion", path: "/notion" },
  { icon: Layers, label: "Flashcards", path: "/flashcards" },
  { icon: Store, label: "Marketplace", path: "/marketplace" },
  { icon: Library, label: "Biblioteca", path: "/biblioteca" },
  { icon: Calendar, label: "Calendario", path: "/calendario" },
  { icon: Timer, label: "Pomodoro", path: "/pomodoro" },
  { icon: BarChart3, label: "Métricas", path: "/metricas" },
  { icon: TreeDeciduous, label: "Mi Bosque", path: "/bosque" },
  { icon: DiscordIcon, label: "Discord", path: "/discord" },
  { icon: Trophy, label: "Logros", path: "/logros" },
  { icon: Users, label: "Amigos", path: "/amigos" },
  { icon: Bot, label: "Asistente IA", path: "/asistente" },
  { icon: Settings, label: "Configuración", path: "/configuracion" },
];

const adminNavItem = { icon: Shield, label: "Admin", path: "/admin" };

interface UserStats {
  xp_total: number;
  nivel: number;
}

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile state
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop state
  const location = useLocation();
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
      if (!user) return;
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
  }, [user]);

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
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-card/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center p-1 border border-neon-cyan/30">
            <img src="/favicon.svg" alt="T.A.B.E Logo" className="w-full h-full object-contain" />
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center glow-cyan flex-shrink-0 p-1.5 border border-neon-cyan/30">
            <img src="/favicon.svg" alt="T.A.B.E Logo" className="w-full h-full object-contain" />
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
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center rounded-xl transition-all duration-200 group relative",
                    isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon
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
            })}
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
        "min-h-screen transition-all duration-300 pt-16 lg:pt-0",
        isCollapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        <Outlet />
      </main>

      {/* Global Widgets */}
      <GlobalPomodoroWidget />
    </div>
  );
}
