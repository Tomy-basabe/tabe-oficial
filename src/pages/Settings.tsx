import { useState, useEffect } from "react";
import { Bell, Calendar, Link, LogOut, Moon, Sun, ChevronRight, ChevronDown, Star, Monitor, MessageSquare, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { ReviewForm } from "@/components/settings/ReviewForm";
import { useTheme } from "@/hooks/useTheme";
import { SidebarCustomizer } from "@/components/settings/SidebarCustomizer";
import { PanelLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [botStatus, setBotStatus] = useState<{ telegram_id: any; whatsapp_number: any; linking_code: string | null } | null>(null);
  const [loadingBot, setLoadingBot] = useState(false);

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

  useEffect(() => {
    if (user && !isGuest) {
      fetchBotStatus();
    }
  }, [user, isGuest]);

  const fetchBotStatus = async () => {
    const { data } = await (supabase as any)
      .from("user_bots")
      .select("telegram_id, whatsapp_number, linking_code")
      .eq("user_id", user?.id)
      .maybeSingle();
    setBotStatus(data as any);
  };

  const generateLinkingCode = async () => {
    if (!user) return;
    setLoadingBot(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await (supabase as any)
      .from("user_bots")
      .upsert({
        user_id: user.id,
        linking_code: code,
        linking_expires_at: expiresAt
      }, { onConflict: "user_id" });

    if (error) {
      toast.error("Error al generar el código");
    } else {
      setBotStatus(prev => ({ ...(prev || { telegram_id: null, whatsapp_number: null }), linking_code: code }));
      toast.success("Código generado. Vence en 10 minutos.");
    }
    setLoadingBot(false);
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

      {/* Virtual Assistant Section */}
      {!isGuest && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Asistente Virtual (Bot)</h3>
          <div className="card-gamer rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection("bot")}
              className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-neon-cyan" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">WhatsApp y Telegram</p>
                <p className="text-xs text-muted-foreground">
                  {botStatus?.telegram_id || botStatus?.whatsapp_number 
                    ? "¡Vinculado y listo!" 
                    : "Interactúa con T.A.B.E. desde tu chat preferido"}
                </p>
              </div>
              {expandedSection === "bot" ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {expandedSection === "bot" && (
              <div className="p-4 pt-0 border-t border-border space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="pt-4 space-y-4">
                  <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Send className="w-4 h-4 text-sky-400" />
                      <span className="text-sm">Telegram Bot</span>
                    </div>
                    {botStatus?.telegram_id ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green border border-neon-green/20">Vinculado</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">No vinculado</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 text-green-500 fill-current">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      </div>
                      <span className="text-sm">WhatsApp Bot</span>
                    </div>
                    {botStatus?.whatsapp_number ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green border border-neon-green/20">Vinculado</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">No vinculado</span>
                    )}
                  </div>

                  {!botStatus?.telegram_id && !botStatus?.whatsapp_number && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4">
                      {botStatus?.linking_code ? (
                        <div className="text-center space-y-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Tu código de vinculación</p>
                          <div className="text-3xl font-display font-bold text-primary tracking-[0.2em] animate-pulse">
                            {botStatus.linking_code}
                          </div>
                          <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                            Envía este código al bot de Telegram o WhatsApp para vincular tu cuenta.
                          </p>
                          <button 
                            onClick={generateLinkingCode}
                            disabled={loadingBot}
                            className="text-[10px] text-primary hover:underline"
                          >
                            Generar uno nuevo
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={generateLinkingCode}
                          disabled={loadingBot}
                          className="w-full py-3 px-4 rounded-xl bg-primary text-white font-display font-semibold text-sm shadow-[0_0_20px_rgba(var(--neon-cyan-rgb),0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          {loadingBot ? "Generando..." : "Generar Código de Vínculo"}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                    <p className="text-[10px] leading-relaxed text-orange-400">
                      <span className="font-bold">Instrucciones:</span> Buscá @TA_BE_Bot en Telegram o el número oficial en WhatsApp y enviale el código de 6 dígitos que generaste arriba.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
              { id: "theme-black", color: "bg-[#999999]", name: "Gris/Negro" },
              { id: "theme-white", color: "bg-[#FFFFFF] border border-gray-300", name: "Blanco" },
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
                      document.documentElement.classList.remove("theme-cyan", "theme-green", "theme-neon-gold", "theme-red", "theme-pink", "theme-black", "theme-white");
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
