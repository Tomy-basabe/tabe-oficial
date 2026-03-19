import { useState } from "react";
import { Bell, Calendar, Link, LogOut, Moon, Sun, ChevronRight, ChevronDown, Star, Monitor } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { ReviewForm } from "@/components/settings/ReviewForm";
import { useTheme } from "@/hooks/useTheme";
import { SidebarCustomizer } from "@/components/settings/SidebarCustomizer";
import { PanelLeft } from "lucide-react";

const STORAGE_KEY = "pomodoro-settings";

interface PomodoroSettingsType {
  work: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

const defaultSettings: PomodoroSettingsType = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
};

const loadSettings = (): PomodoroSettingsType => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed };
    }
  } catch {
    // Fallback to defaults
  }
  return defaultSettings;
};

const saveSettings = (settings: PomodoroSettingsType): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage not available
  }
};

export default function Settings() {
  const { user, isGuest, signOut, profile, updateTheme } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettingsType>(loadSettings);
  const { theme, setTheme } = useTheme();

  // Local state for guest theme representation
  const [guestActiveTheme, setGuestActiveTheme] = useState<string | null>(() => localStorage.getItem("active-theme-color"));

  const userName = user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Usuario";
  const userInitials = userName.slice(0, 2).toUpperCase();
  const userEmail = user?.email || "";

  const handleLogout = async () => {
    await signOut();
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const updatePomodoroSetting = (key: keyof PomodoroSettingsType, delta: number) => {
    const limits: Record<keyof PomodoroSettingsType, { min: number; max: number }> = {
      work: { min: 5, max: 60 },
      shortBreak: { min: 1, max: 15 },
      longBreak: { min: 5, max: 30 },
      longBreakInterval: { min: 2, max: 8 },
    };

    const newValue = Math.max(
      limits[key].min,
      Math.min(limits[key].max, pomodoroSettings[key] + delta)
    );

    const newSettings = { ...pomodoroSettings, [key]: newValue };
    setPomodoroSettings(newSettings);
    saveSettings(newSettings);
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

      {/* Sidebar Customization */}
      {!isGuest && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Personalización</h3>
          <div className="card-gamer rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection("sidebar")}
              className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <PanelLeft className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Panel Lateral</p>
                <p className="text-xs text-muted-foreground">Personaliza el orden y agrupa por categorías</p>
              </div>
              {expandedSection === "sidebar" ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {expandedSection === "sidebar" && (
              <div className="p-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
                <SidebarCustomizer />
              </div>
            )}
          </div>
        </div>
      )}


      {/* Integrations */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground px-1">Integraciones</h3>
        <div className="card-gamer rounded-xl overflow-hidden divide-y divide-border">
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Google Calendar</p>
              <p className="text-xs text-muted-foreground">Exportá eventos con el botón "Agregar a Google Calendar"</p>
            </div>
            <span className="text-xs text-neon-green bg-neon-green/10 px-2 py-1 rounded-full">
              Disponible
            </span>
          </div>
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
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                {theme === "dark" ? (
                  <Moon className="w-5 h-5 text-muted-foreground" />
                ) : theme === "light" ? (
                  <Sun className="w-5 h-5 text-neon-gold" />
                ) : (
                  <Monitor className="w-5 h-5 text-neon-cyan" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">Tema del sistema</p>
                <p className="text-xs text-muted-foreground">
                  Elige cómo se ve T.A.B.E.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${theme === "light"
                  ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(138,61,240,0.3)]"
                  : "bg-secondary/30 border-transparent hover:bg-secondary/50 text-muted-foreground"
                  }`}
              >
                <Sun className="w-5 h-5" />
                <span className="text-xs font-medium">Claro</span>
              </button>

              <button
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${theme === "dark"
                  ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(138,61,240,0.3)]"
                  : "bg-secondary/30 border-transparent hover:bg-secondary/50 text-muted-foreground"
                  }`}
              >
                <Moon className="w-5 h-5" />
                <span className="text-xs font-medium">Oscuro</span>
              </button>

              <button
                onClick={() => setTheme("system")}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${theme === "system"
                  ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(138,61,240,0.3)]"
                  : "bg-secondary/30 border-transparent hover:bg-secondary/50 text-muted-foreground"
                  }`}
              >
                <Monitor className="w-5 h-5" />
                <span className="text-xs font-medium">Auto</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Color Selection */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground px-1">Color Principal</h3>
        <div className="card-gamer rounded-xl p-4">
          <div className="flex flex-wrap gap-4 justify-between sm:justify-start">
            {[
              { id: null, color: "bg-[#8A3DF0]", name: "Violeta (Por defecto)" },
              { id: "theme-cyan", color: "bg-[#00D8FF]", name: "Cyan" },
              { id: "theme-green", color: "bg-[#00C853]", name: "Verde" },
              { id: "theme-neon-gold", color: "bg-[#FFB800]", name: "Dorado" },
              { id: "theme-red", color: "bg-[#FF3B30]", name: "Rojo" },
              { id: "theme-pink", color: "bg-[#FF66CC]", name: "Rosado" },
            ].map((t) => {
              const isActive = isGuest
                ? guestActiveTheme === t.id || (!guestActiveTheme && t.id === null)
                : profile?.active_theme === t.id || (!profile?.active_theme && t.id === null);

              return (
                <button
                  key={t.id || "default"}
                  onClick={() => {
                    if (isGuest) {
                      setGuestActiveTheme(t.id);
                      // Set DOM class manually for preview
                      document.documentElement.classList.remove("theme-cyan", "theme-green", "theme-neon-gold", "theme-red", "theme-pink");
                      if (t.id) {
                        document.documentElement.classList.add(t.id);
                      }
                    } else {
                      updateTheme(t.id || "");
                    }
                  }}
                  title={t.name}
                  className={`w-10 h-10 rounded-full flex-shrink-0 transition-transform ${t.color} ${isActive ? "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background" : "hover:scale-105 opacity-80"
                    }`}
                />
              );
            })}
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
              <button
                onClick={() => updatePomodoroSetting("work", -1)}
                className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all active:scale-95"
              >
                -
              </button>
              <span className="font-display font-bold w-12 text-center text-neon-cyan">{pomodoroSettings.work}</span>
              <button
                onClick={() => updatePomodoroSetting("work", 1)}
                className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all active:scale-95"
              >
                +
              </button>
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Descanso corto</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updatePomodoroSetting("shortBreak", -1)}
                className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all active:scale-95"
              >
                -
              </button>
              <span className="font-display font-bold w-12 text-center text-neon-green">{pomodoroSettings.shortBreak}</span>
              <button
                onClick={() => updatePomodoroSetting("shortBreak", 1)}
                className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all active:scale-95"
              >
                +
              </button>
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Descanso largo</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updatePomodoroSetting("longBreak", -1)}
                className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all active:scale-95"
              >
                -
              </button>
              <span className="font-display font-bold w-12 text-center text-neon-purple">{pomodoroSettings.longBreak}</span>
              <button
                onClick={() => updatePomodoroSetting("longBreak", 1)}
                className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all active:scale-95"
              >
                +
              </button>
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Section (Hidden for guests) */}
      {!isGuest && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Valorar T.A.B.E.</h3>
          <div className="card-gamer rounded-xl p-4 space-y-4">
            <div
              className="flex items-center gap-4 cursor-pointer hover:bg-secondary/50 p-2 -mx-2 rounded-lg transition-colors"
              onClick={() => toggleSection("review")}
            >
              <div className="w-10 h-10 rounded-xl bg-neon-gold/20 flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-neon-gold" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Dejar una valoración</p>
                <p className="text-xs text-muted-foreground">Comparte tu experiencia con otros estudiantes</p>
              </div>
              {expandedSection === "review" ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            {expandedSection === "review" && (
              <div className="pt-4 border-t border-border mt-2 animate-in fade-in slide-in-from-top-2">
                <ReviewForm userName={userName!} userId={user?.id!} />
              </div>
            )}
          </div>
        </div>
      )}

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
      <p className="text-right text-xs text-muted-foreground/40 mt-4 pr-2">
        T.A.B.E. v2.8.0
      </p>
    </div>
  );
}
