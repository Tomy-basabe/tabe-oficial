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
  Video
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotionIcon } from "@/components/icons/NotionIcon";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  { icon: Video, label: "Sala de Estudio", path: "/sala-estudio" },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Build nav items dynamically
  const navItems = isAdmin ? [...baseNavItems, adminNavItem] : baseNavItems;

  // Fetch user stats for XP display
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("user_stats")
        .select("xp_total, nivel")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setUserStats(data);
      }
    };

    fetchUserStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("sidebar-user-stats")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_stats",
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchUserStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Calculate XP progress to next level
  // Each level requires 100 XP: Level 1 = 0-99 XP, Level 2 = 100-199 XP, etc.
  const getXpProgress = () => {
    if (!userStats) return { currentXp: 0, level: 1, progress: 0, xpForNext: 100 };
    
    const totalXp = userStats.xp_total || 0;
    
    // Level is calculated as: floor(XP / 100) + 1
    const calculatedLevel = Math.floor(totalXp / 100) + 1;
    
    // XP within current level (0-99)
    const xpInCurrentLevel = totalXp % 100;
    
    // Progress percentage within current level
    const progress = xpInCurrentLevel;
    
    // XP remaining to next level
    const xpForNext = 100 - xpInCurrentLevel;
    
    return {
      currentXp: totalXp,
      level: calculatedLevel,
      progress,
      xpForNext,
    };
  };

  const xpData = getXpProgress();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-card/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
            <Zap className="w-5 h-5 text-background" />
          </div>
          <span className="font-display font-bold text-lg gradient-text">T.A.B.E.</span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-sidebar-border flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center glow-cyan">
            <Zap className="w-6 h-6 text-background" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl gradient-text">T.A.B.E.</h1>
            <p className="text-xs text-muted-foreground">Sistema Académico</p>
          </div>
        </div>

        {/* Navigation with ScrollArea - now takes remaining space */}
        <ScrollArea className="flex-1">
          <nav className="space-y-2 p-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 transition-all",
                      isActive && "text-primary drop-shadow-[0_0_8px_hsl(var(--neon-cyan))]"
                    )}
                  />
                  <span className={cn("font-medium", isActive && "text-glow-cyan")}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Progress Summary - Fixed at bottom, not absolute */}
        <div className="p-4 border-t border-sidebar-border flex-shrink-0">
          <div className="card-gamer rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-gold to-neon-cyan flex items-center justify-center text-background font-display font-bold text-sm">
                {xpData.level}
              </div>
              <div>
                <p className="font-medium text-sm">Nivel {xpData.level}</p>
                <p className="text-xs text-muted-foreground">{xpData.currentXp.toLocaleString()} XP</p>
              </div>
            </div>
            <div className="progress-gamer h-2">
              <div 
                className="progress-gamer-bar transition-all duration-500" 
                style={{ width: `${xpData.progress}%` }} 
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round(xpData.xpForNext)} XP para nivel {xpData.level + 1}
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
