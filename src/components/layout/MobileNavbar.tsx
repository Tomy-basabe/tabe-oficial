import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Calendar, 
  Timer, 
  Bot, 
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNavbar() {
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Calendar, label: "Calendario", path: "/calendario" },
    { icon: Timer, label: "Pomodoro", path: "/pomodoro" },
    { icon: Bot, label: "AI", path: "/TABEAI" },
    { icon: User, label: "Perfil", path: "/configuracion" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[1001] bg-card/80 backdrop-blur-xl border-t border-border/50 px-2 py-3 safe-area-bottom">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 min-w-[64px] transition-all duration-300",
                isActive ? "text-primary translate-y-[-4px]" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all duration-300",
                isActive ? "bg-primary/10 shadow-[0_0_20px_rgba(var(--neon-cyan-rgb),0.2)]" : ""
              )}>
                <Icon className={cn(
                  "w-6 h-6",
                  isActive && "text-glow-cyan"
                )} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-opacity duration-300",
                isActive ? "opacity-100" : "opacity-60"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
