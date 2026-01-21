import { useState } from "react";
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
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotionIcon } from "@/components/icons/NotionIcon";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: GraduationCap, label: "Plan de Carrera", path: "/carrera" },
  { icon: NotionIcon, label: "Notion", path: "/notion" },
  { icon: Layers, label: "Flashcards", path: "/flashcards" },
  { icon: Library, label: "Biblioteca", path: "/biblioteca" },
  { icon: Calendar, label: "Calendario", path: "/calendario" },
  { icon: Timer, label: "Pomodoro", path: "/pomodoro" },
  { icon: BarChart3, label: "Métricas", path: "/metricas" },
  { icon: Trophy, label: "Logros", path: "/logros" },
  { icon: Bot, label: "Asistente IA", path: "/asistente" },
  { icon: Settings, label: "Configuración", path: "/configuracion" },
];

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

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
        <div className="h-16 flex items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center glow-cyan">
            <Zap className="w-6 h-6 text-background" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl gradient-text">T.A.B.E.</h1>
            <p className="text-xs text-muted-foreground">Sistema Académico</p>
          </div>
        </div>

        {/* Navigation with ScrollArea */}
        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="space-y-2">
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

        {/* User Progress Summary */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="card-gamer rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-gold to-neon-cyan flex items-center justify-center text-background font-display font-bold text-sm">
                TL
              </div>
              <div>
                <p className="font-medium text-sm">Nivel 12</p>
                <p className="text-xs text-muted-foreground">1,250 XP</p>
              </div>
            </div>
            <div className="progress-gamer h-2">
              <div className="progress-gamer-bar" style={{ width: "65%" }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">750 XP para nivel 13</p>
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
