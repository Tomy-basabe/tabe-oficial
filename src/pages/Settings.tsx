import { useState } from "react";
import { User, Bell, Calendar, Link, LogOut, Moon, ChevronRight, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { user, signOut } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  const userName = user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Usuario";
  const userInitials = userName.slice(0, 2).toUpperCase();
  const userEmail = user?.email || "";

  const handleLogout = async () => {
    await signOut();
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text">
          Configuración
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra tu cuenta y preferencias
        </p>
      </div>

      {/* Profile Card */}
      <div className="card-gamer rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-gold to-neon-cyan flex items-center justify-center text-background font-display font-bold text-xl">
            {userInitials}
          </div>
          <div className="flex-1">
            <h2 className="font-display font-semibold text-lg">{userName}</h2>
            <p className="text-muted-foreground text-sm">{userEmail}</p>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground px-1">Cuenta</h3>
        <div className="card-gamer rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection("notifications")}
            className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Notificaciones</p>
              <p className="text-xs text-muted-foreground">Alertas de exámenes y recordatorios</p>
            </div>
            {expandedSection === "notifications" ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          
          {expandedSection === "notifications" && (
            <div className="p-4 pt-0 border-t border-border">
              <NotificationSettings />
            </div>
          )}
        </div>
      </div>

      {/* Integrations */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground px-1">Integraciones</h3>
        <div className="card-gamer rounded-xl overflow-hidden divide-y divide-border">
          <button className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Google Calendar</p>
              <p className="text-xs text-muted-foreground">Sincronizar eventos</p>
            </div>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
              Próximamente
            </span>
          </button>
          <button className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Link className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Otras integraciones</p>
              <p className="text-xs text-muted-foreground">Conectar más servicios</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground px-1">Apariencia</h3>
        <div className="card-gamer rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Moon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Tema oscuro</p>
                <p className="text-xs text-muted-foreground">Activo por defecto</p>
              </div>
            </div>
            <div className="w-12 h-6 bg-primary rounded-full relative">
              <div className="absolute right-1 top-1 w-4 h-4 bg-primary-foreground rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Pomodoro Settings */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground px-1">Pomodoro</h3>
        <div className="card-gamer rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Tiempo de trabajo</span>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80">-</button>
              <span className="font-display font-bold w-12 text-center">25</span>
              <button className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80">+</button>
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Descanso corto</span>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80">-</button>
              <span className="font-display font-bold w-12 text-center">5</span>
              <button className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80">+</button>
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Descanso largo</span>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80">-</button>
              <span className="font-display font-bold w-12 text-center">15</span>
              <button className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80">+</button>
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button 
        onClick={handleLogout}
        className="w-full card-gamer rounded-xl p-4 flex items-center gap-4 text-destructive hover:bg-destructive/10 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
          <LogOut className="w-5 h-5 text-destructive" />
        </div>
        <span className="font-medium">Cerrar sesión</span>
      </button>

      {/* Version */}
      <p className="text-center text-xs text-muted-foreground">
        StudyHub v1.0.0 • Tu compañero de estudio
      </p>
    </div>
  );
}
