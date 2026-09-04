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
    <div className="p-4 lg:p-8 space-y-8 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-black text-4xl uppercase text-black">
          Configuración
        </h1>
        <p className="text-black/60 font-bold uppercase text-sm">
          Administra tu cuenta y preferencias
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-[#BFFF00] border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-20 h-20 rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000] bg-white flex items-center justify-center text-black font-black text-3xl uppercase">
            {userInitials}
          </div>
          <div className="flex-1">
            <h2 className="font-black text-2xl uppercase tracking-tight">{userName}</h2>
            <p className="font-bold text-black/70 mt-1">{userEmail}</p>
          </div>
        </div>
      </div>

      {/* Virtual Assistant Section */}
      {/* Virtual Assistant Section */}
      {!isGuest && (
        <div className="space-y-3">
          <h3 className="font-black uppercase text-lg">Asistente Virtual (Bot)</h3>
          <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl overflow-hidden transition-all">
            <button
              onClick={() => toggleSection("bot")}
              className="w-full flex items-center gap-4 p-5 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] bg-[#00E5FF] flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-black" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="font-black uppercase text-base">WhatsApp y Telegram</p>
                <p className="font-bold text-sm text-black/60 mt-1">
                  {botStatus?.telegram_id || botStatus?.whatsapp_number 
                    ? "¡Vinculado y listo!" 
                    : "Interactúa con T.A.B.E. desde tu chat preferido"}
                </p>
              </div>
              <div className="w-10 h-10 border-2 border-black rounded-lg bg-gray-100 flex items-center justify-center">
                {expandedSection === "bot" ? (
                  <ChevronDown className="w-6 h-6 text-black" strokeWidth={3} />
                ) : (
                  <ChevronRight className="w-6 h-6 text-black" strokeWidth={3} />
                )}
              </div>
            </button>

            {expandedSection === "bot" && (
              <div className="p-5 pt-0 border-t-4 border-black space-y-4 animate-in fade-in slide-in-from-top-2 bg-gray-50">
                <div className="pt-4 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000]">
                    <div className="flex items-center gap-3">
                      <Send className="w-5 h-5 text-black" strokeWidth={2.5} />
                      <span className="font-black uppercase text-sm">Telegram Bot</span>
                    </div>
                    {botStatus?.telegram_id ? (
                      <span className="text-xs px-3 py-1 font-black uppercase rounded bg-[#BFFF00] border-2 border-black">Vinculado</span>
                    ) : (
                      <span className="text-xs px-3 py-1 font-black uppercase rounded bg-gray-200 border-2 border-black">No vinculado</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000]">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 text-black fill-current">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      </div>
                      <span className="font-black uppercase text-sm">WhatsApp Bot</span>
                    </div>
                    {botStatus?.whatsapp_number ? (
                      <span className="text-xs px-3 py-1 font-black uppercase rounded bg-[#BFFF00] border-2 border-black">Vinculado</span>
                    ) : (
                      <span className="text-xs px-3 py-1 font-black uppercase rounded bg-gray-200 border-2 border-black">No vinculado</span>
                    )}
                  </div>

                  {!botStatus?.telegram_id && !botStatus?.whatsapp_number && (
                    <div className="bg-white border-2 border-black shadow-[2px_2px_0_0_#000] rounded-xl p-5 space-y-4 text-center">
                      {botStatus?.linking_code ? (
                        <div className="space-y-4">
                          <p className="text-sm font-black uppercase tracking-wider text-black">Tu código de vinculación</p>
                          <div className="text-4xl font-black bg-gray-100 py-3 rounded-lg border-2 border-black tracking-[0.2em] inline-block px-8 animate-pulse">
                            {botStatus.linking_code}
                          </div>
                          <p className="text-sm font-bold text-black/70 max-w-[250px] mx-auto">
                            Envía este código al bot de Telegram o WhatsApp para vincular tu cuenta.
                          </p>
                          <button 
                            onClick={generateLinkingCode}
                            disabled={loadingBot}
                            className="font-black uppercase text-sm hover:underline mt-2"
                          >
                            Generar uno nuevo
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={generateLinkingCode}
                          disabled={loadingBot}
                          className="w-full py-4 px-4 rounded-xl bg-[#00E5FF] border-4 border-black text-black font-black uppercase text-sm shadow-[4px_4px_0_0_#000] hover:bg-[#00cce6] hover:translate-y-[2px] hover:shadow-[0_0_0_0_#000] transition-all flex items-center justify-center gap-2"
                        >
                          {loadingBot ? "Generando..." : "Generar Código de Vínculo"}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-[#FFD700] border-4 border-black shadow-[2px_2px_0_0_#000]">
                    <p className="text-sm font-bold text-black">
                      <span className="font-black uppercase">Instrucciones:</span> Buscá @tabeai_bot en Telegram o el número oficial en WhatsApp y enviale el código de 6 dígitos que generaste arriba.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar Customization */}
      {/* Sidebar Customization */}
      {!isGuest && (
        <div className="space-y-3">
          <h3 className="font-black uppercase text-lg">Personalización</h3>
          <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl overflow-hidden transition-all">
            <button
              onClick={() => toggleSection("sidebar")}
              className="w-full flex items-center gap-4 p-5 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] bg-[#FF9B71] flex items-center justify-center">
                <PanelLeft className="w-6 h-6 text-black" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="font-black uppercase text-base">Panel Lateral</p>
                <p className="font-bold text-sm text-black/60 mt-1">Personaliza el orden y agrupa por categorías</p>
              </div>
              <div className="w-10 h-10 border-2 border-black rounded-lg bg-gray-100 flex items-center justify-center">
                {expandedSection === "sidebar" ? (
                  <ChevronDown className="w-6 h-6 text-black" strokeWidth={3} />
                ) : (
                  <ChevronRight className="w-6 h-6 text-black" strokeWidth={3} />
                )}
              </div>
            </button>

            {expandedSection === "sidebar" && (
              <div className="p-5 border-t-4 border-black animate-in fade-in slide-in-from-top-2 bg-gray-50">
                <SidebarCustomizer />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Integrations */}
      <div className="space-y-3">
        <h3 className="font-black uppercase text-lg">Integraciones</h3>
        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl overflow-hidden divide-y-4 divide-black">
          <div className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] bg-[#C688EB] flex items-center justify-center">
              <Calendar className="w-6 h-6 text-black" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="font-black uppercase text-base">Google Calendar</p>
              <p className="font-bold text-sm text-black/60 mt-1">Exportá eventos con el botón "Agregar a Google Calendar"</p>
            </div>
            <span className="text-xs px-3 py-1 font-black uppercase rounded bg-[#BFFF00] border-2 border-black">
              Disponible
            </span>
          </div>
          <button className="w-full flex items-center gap-4 p-5 hover:bg-gray-100 transition-colors text-left">
            <div className="w-12 h-12 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] bg-gray-200 flex items-center justify-center">
              <Link className="w-6 h-6 text-black" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="font-black uppercase text-base">Otras integraciones</p>
              <p className="font-bold text-sm text-black/60 mt-1">Conectar más servicios</p>
            </div>
            <div className="w-10 h-10 border-2 border-black rounded-lg bg-gray-100 flex items-center justify-center">
              <ChevronRight className="w-6 h-6 text-black" strokeWidth={3} />
            </div>
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="space-y-3">
        <h3 className="font-black uppercase text-lg">Apariencia</h3>
        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] bg-gray-200 flex items-center justify-center">
                {theme === "dark" ? (
                  <Moon className="w-6 h-6 text-black" strokeWidth={2.5} />
                ) : theme === "light" ? (
                  <Sun className="w-6 h-6 text-black" strokeWidth={2.5} />
                ) : (
                  <Monitor className="w-6 h-6 text-black" strokeWidth={2.5} />
                )}
              </div>
              <div>
                <p className="font-black uppercase text-base">Tema del sistema</p>
                <p className="font-bold text-sm text-black/60 mt-1">
                  Elige cómo se ve T.A.B.E.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-4 transition-all ${theme === "light"
                  ? "bg-[#BFFF00] border-black shadow-[4px_4px_0_0_#000] translate-y-[-2px]"
                  : "bg-white border-black shadow-[2px_2px_0_0_#000] hover:bg-gray-100"
                  }`}
              >
                <Sun className="w-6 h-6 text-black" strokeWidth={3} />
                <span className="font-black uppercase text-xs">Claro</span>
              </button>

              <button
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-4 transition-all ${theme === "dark"
                  ? "bg-[#00E5FF] border-black shadow-[4px_4px_0_0_#000] translate-y-[-2px]"
                  : "bg-white border-black shadow-[2px_2px_0_0_#000] hover:bg-gray-100"
                  }`}
              >
                <Moon className="w-6 h-6 text-black" strokeWidth={3} />
                <span className="font-black uppercase text-xs">Oscuro</span>
              </button>

              <button
                onClick={() => setTheme("system")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-4 transition-all ${theme === "system"
                  ? "bg-[#FFD700] border-black shadow-[4px_4px_0_0_#000] translate-y-[-2px]"
                  : "bg-white border-black shadow-[2px_2px_0_0_#000] hover:bg-gray-100"
                  }`}
              >
                <Monitor className="w-6 h-6 text-black" strokeWidth={3} />
                <span className="font-black uppercase text-xs">Auto</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Color Selection */}
      <div className="space-y-3">
        <h3 className="font-black uppercase text-lg">Color Principal</h3>
        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5">
          <div className="flex flex-wrap gap-4 justify-between sm:justify-start">
            {[
              { id: null, color: "bg-[#C688EB]", name: "Violeta" },
              { id: "theme-cyan", color: "bg-[#00E5FF]", name: "Cyan" },
              { id: "theme-green", color: "bg-[#BFFF00]", name: "Lima" },
              { id: "theme-neon-gold", color: "bg-[#FFD700]", name: "Dorado" },
              { id: "theme-red", color: "bg-[#FF5C5C]", name: "Rojo" },
              { id: "theme-pink", color: "bg-[#FF66CC]", name: "Rosado" },
              { id: "theme-black", color: "bg-black", name: "Negro" },
              { id: "theme-white", color: "bg-white", name: "Blanco" },
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
                      document.documentElement.classList.remove("theme-cyan", "theme-green", "theme-neon-gold", "theme-red", "theme-pink", "theme-black", "theme-white");
                      if (t.id) {
                        document.documentElement.classList.add(t.id);
                      }
                    } else {
                      updateTheme(t.id || "");
                    }
                  }}
                  title={t.name}
                  className={`w-12 h-12 rounded-xl border-4 border-black flex-shrink-0 transition-transform shadow-[2px_2px_0_0_#000] ${t.color} ${isActive ? "scale-110 translate-y-[-2px] shadow-[4px_4px_0_0_#000]" : "hover:scale-105"
                    }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Pomodoro Settings */}
      <div className="space-y-3">
        <h3 className="font-black uppercase text-lg">Pomodoro</h3>
        <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between p-3 border-2 border-black rounded-xl bg-gray-50">
            <span className="font-black uppercase text-sm">Tiempo de trabajo</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updatePomodoroSetting("work", -1)}
                className="w-10 h-10 border-2 border-black rounded-lg bg-white shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:translate-y-[2px] hover:shadow-[0_0_0_0_#000] transition-all font-black text-xl"
              >
                -
              </button>
              <span className="font-black text-2xl w-12 text-center">{pomodoroSettings.work}</span>
              <button
                onClick={() => updatePomodoroSetting("work", 1)}
                className="w-10 h-10 border-2 border-black rounded-lg bg-[#FF5C5C] shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:translate-y-[2px] hover:shadow-[0_0_0_0_#000] transition-all font-black text-xl"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border-2 border-black rounded-xl bg-gray-50">
            <span className="font-black uppercase text-sm">Descanso corto</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updatePomodoroSetting("shortBreak", -1)}
                className="w-10 h-10 border-2 border-black rounded-lg bg-white shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:translate-y-[2px] hover:shadow-[0_0_0_0_#000] transition-all font-black text-xl"
              >
                -
              </button>
              <span className="font-black text-2xl w-12 text-center">{pomodoroSettings.shortBreak}</span>
              <button
                onClick={() => updatePomodoroSetting("shortBreak", 1)}
                className="w-10 h-10 border-2 border-black rounded-lg bg-[#BFFF00] shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:translate-y-[2px] hover:shadow-[0_0_0_0_#000] transition-all font-black text-xl"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border-2 border-black rounded-xl bg-gray-50">
            <span className="font-black uppercase text-sm">Descanso largo</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updatePomodoroSetting("longBreak", -1)}
                className="w-10 h-10 border-2 border-black rounded-lg bg-white shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:translate-y-[2px] hover:shadow-[0_0_0_0_#000] transition-all font-black text-xl"
              >
                -
              </button>
              <span className="font-black text-2xl w-12 text-center">{pomodoroSettings.longBreak}</span>
              <button
                onClick={() => updatePomodoroSetting("longBreak", 1)}
                className="w-10 h-10 border-2 border-black rounded-lg bg-[#00E5FF] shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:translate-y-[2px] hover:shadow-[0_0_0_0_#000] transition-all font-black text-xl"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Review Section (Hidden for guests) */}
      {!isGuest && (
        <div className="space-y-3">
          <h3 className="font-black uppercase text-lg">Valorar T.A.B.E.</h3>
          <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl overflow-hidden transition-all">
            <button
              className="w-full flex items-center gap-4 p-5 hover:bg-gray-100 transition-colors text-left"
              onClick={() => toggleSection("review")}
            >
              <div className="w-12 h-12 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] bg-[#FFD700] flex items-center justify-center flex-shrink-0">
                <Star className="w-6 h-6 text-black" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="font-black uppercase text-base">Dejar una valoración</p>
                <p className="font-bold text-sm text-black/60 mt-1">Comparte tu experiencia con otros estudiantes</p>
              </div>
              <div className="w-10 h-10 border-2 border-black rounded-lg bg-gray-100 flex items-center justify-center">
                {expandedSection === "review" ? (
                  <ChevronDown className="w-6 h-6 text-black" strokeWidth={3} />
                ) : (
                  <ChevronRight className="w-6 h-6 text-black" strokeWidth={3} />
                )}
              </div>
            </button>

            {expandedSection === "review" && (
              <div className="p-5 border-t-4 border-black bg-gray-50 animate-in fade-in slide-in-from-top-2">
                <ReviewForm userName={userName!} userId={user?.id!} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full bg-[#FF5C5C] border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 flex items-center justify-center gap-4 hover:bg-[#ff4d4d] hover:translate-y-[2px] hover:shadow-[0_0_0_0_#000] transition-all mt-8"
      >
        <LogOut className="w-6 h-6 text-black" strokeWidth={3} />
        <span className="font-black uppercase text-lg text-black">Cerrar sesión</span>
      </button>

      {/* Version */}
      <p className="text-center font-black uppercase text-sm text-black/40 mt-8">
        T.A.B.E. v2.8.0
      </p>
    </div>
  );
}
