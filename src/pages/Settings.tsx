import { useState, useEffect } from "react";
import { 
  Bell, 
  Calendar, 
  Link, 
  LogOut, 
  Moon, 
  Sun, 
  ChevronRight, 
  ChevronDown, 
  Star, 
  Monitor, 
  MessageSquare, 
  Send,
  Zap,
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle2,
  Loader2,
  Unlink
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { ReviewForm } from "@/components/settings/ReviewForm";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useComic } from "@/components/comic/ComicEffectsProvider";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { isGoogleCalendarConnected } from "@/lib/googleCalendarSync";
import { cn } from "@/lib/utils";

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
  const { 
    user, 
    isGuest, 
    signOut, 
    profile, 
    updateTheme,
    isGoogleLinked,
    googleIdentity,
    linkGoogleAccount,
    unlinkGoogleAccount
  } = useAuth();
  const { comicMode, toggleComicMode, soundEnabled, toggleSound, triggerBurst } = useComic();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettingsType>(loadSettings);
  const { theme, setTheme } = useTheme();
  const [botStatus, setBotStatus] = useState<{ telegram_id: any; whatsapp_number: any; linking_code: string | null } | null>(null);
  const [loadingBot, setLoadingBot] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);

  const userName = user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Usuario";
  const userInitials = userName.slice(0, 2).toUpperCase();
  const userEmail = user?.email || "";

  const handleLogout = async () => {
    await signOut();
  };

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    try {
      const { error } = await linkGoogleAccount();
      if (error) {
        toast.error("Error al vincular con Google: " + error.message);
      }
    } catch (e: any) {
      toast.error(e?.message || "Error al conectar con Google");
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!confirm("¿Seguro que quieres desvincular tu cuenta de Google? Si no tienes una contraseña configurada para tu email, podrías no poder acceder.")) return;
    setUnlinkingGoogle(true);
    try {
      const { error } = await unlinkGoogleAccount();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Cuenta de Google desvinculada exitosamente.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Error al desvincular Google");
    } finally {
      setUnlinkingGoogle(false);
    }
  };

  useEffect(() => {
    // Check if user just returned from Google OAuth linking with an error
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (params.get("error_description")) {
      toast.error(decodeURIComponent(params.get("error_description")!));
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (hash.includes("error_description")) {
      toast.error("Error al vincular con Google");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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
    <div className="p-4 lg:p-8 space-y-8 max-w-3xl mx-auto pb-24">      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-black text-4xl uppercase text-foreground">
          Configuración
        </h1>
        <p className="text-muted-foreground font-bold uppercase text-sm">
          Administra tu cuenta y preferencias
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-[#BFFF00] text-black border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-4 sm:gap-6 relative z-10 min-w-0">
          <div className="w-14 h-14 sm:w-20 sm:h-20 shrink-0 rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000] bg-white flex items-center justify-center text-black font-black text-xl sm:text-3xl uppercase">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-xl sm:text-2xl uppercase tracking-tight text-black truncate">{userName}</h2>
            <p className="font-bold text-black/70 mt-0.5 text-xs sm:text-sm truncate">{userEmail}</p>
          </div>
        </div>
      </div>

      {/* Google Account Linking Section */}
      {!isGuest && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-black uppercase text-lg text-foreground">Cuenta de Google</h3>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#00F0FF] text-black border-2 border-black shadow-[2px_2px_0_0_#000] -rotate-1">
              ACCESO Y CALENDARIO
            </span>
          </div>

          <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] bg-white flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black uppercase text-base text-foreground">Google</p>
                    {isGoogleLinked ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#00FF9D] text-black border-2 border-foreground shadow-[1px_1px_0_0_#000]">
                        Vinculado
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-muted text-muted-foreground border-2 border-foreground">
                        No Vinculado
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {isGoogleLinked
                      ? (googleIdentity?.identity_data?.email || userEmail || "Cuenta de Google asociada")
                      : "Asocia tu cuenta de Google para iniciar sesión con un clic y sincronizar tu calendario."}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                {isGoogleLinked ? (
                  <button
                    type="button"
                    onClick={handleUnlinkGoogle}
                    disabled={unlinkingGoogle}
                    className="px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-white text-black border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {unlinkingGoogle ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Unlink className="w-4 h-4 text-red-500" />
                    )}
                    Desvincular
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLinkGoogle}
                    disabled={linkingGoogle}
                    className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-[#FFE600] text-black border-3 border-foreground shadow-[3px_3px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_0_#000] active:translate-y-[1px] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {linkingGoogle ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Vincular cuenta de Google
                  </button>
                )}
              </div>
            </div>

            {/* Informational banner */}
            <div className="p-3 bg-muted/50 border-2 border-foreground/30 rounded-lg text-xs font-bold text-muted-foreground">
              {isGoogleLinked ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-[#00FF9D] shrink-0" />
                    <span>Tu cuenta de Google está asociada. Podés entrar usando Google o tu contraseña, y tu Google Calendar está vinculado.</span>
                  </p>
                  <a
                    href="/calendario"
                    className="text-primary hover:underline font-black text-xs uppercase tracking-wider shrink-0"
                  >
                    Ver Calendario →
                  </a>
                </div>
              ) : (
                <p>
                  💡 <strong>Beneficio:</strong> Podrás iniciar sesión usando el botón "Continuar con Google" o con tu correo y contraseña actuales. Tendrás una sola cuenta unificada y los exámenes de Google Calendar se sincronizarán con TABE.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Virtual Assistant Section */}
      {!isGuest && (
        <div className="space-y-3">
          <h3 className="font-black uppercase text-lg text-foreground">Asistente Virtual (Bot)</h3>
          <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl overflow-hidden transition-all">
            <button
              onClick={() => toggleSection("bot")}
              className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] bg-[#00E5FF] flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-black" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="font-black uppercase text-base text-foreground">WhatsApp y Telegram</p>
                <p className="font-bold text-sm text-muted-foreground mt-1">
                  {botStatus?.telegram_id || botStatus?.whatsapp_number 
                    ? "¡Vinculado y listo!" 
                    : "Interactúa con T.A.B.E. desde tu chat preferido"}
                </p>
              </div>
              <div className="w-10 h-10 border-2 border-foreground rounded-lg bg-muted flex items-center justify-center">
                {expandedSection === "bot" ? (
                  <ChevronDown className="w-6 h-6 text-foreground" strokeWidth={3} />
                ) : (
                  <ChevronRight className="w-6 h-6 text-foreground" strokeWidth={3} />
                )}
              </div>
            </button>

            {expandedSection === "bot" && (
              <div className="p-5 pt-0 border-t-4 border-foreground space-y-4 animate-in fade-in slide-in-from-top-2 bg-muted/20">
                <div className="pt-4 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-card border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                    <div className="flex items-center gap-3">
                      <Send className="w-5 h-5 text-foreground" strokeWidth={2.5} />
                      <span className="font-black uppercase text-sm text-foreground">Telegram Bot</span>
                    </div>
                    {botStatus?.telegram_id ? (
                      <span className="text-xs px-3 py-1 font-black uppercase rounded bg-[#BFFF00] text-black border-2 border-foreground">Vinculado</span>
                    ) : (
                      <span className="text-xs px-3 py-1 font-black uppercase rounded bg-muted text-muted-foreground border-2 border-foreground">No vinculado</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-card border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 text-foreground fill-current">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      </div>
                      <span className="font-black uppercase text-sm text-foreground">WhatsApp Bot</span>
                    </div>
                    {botStatus?.whatsapp_number ? (
                      <span className="text-xs px-3 py-1 font-black uppercase rounded bg-[#BFFF00] text-black border-2 border-foreground">Vinculado</span>
                    ) : (
                      <span className="text-xs px-3 py-1 font-black uppercase rounded bg-muted text-muted-foreground border-2 border-foreground">No vinculado</span>
                    )}
                  </div>

                  {!botStatus?.telegram_id && !botStatus?.whatsapp_number && (
                    <div className="bg-card border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-xl p-5 space-y-4 text-center">
                      {botStatus?.linking_code ? (
                        <div className="space-y-4">
                          <p className="text-sm font-black uppercase tracking-wider text-foreground">Tu código de vinculación</p>
                          <div className="text-4xl font-black bg-muted py-3 rounded-lg border-2 border-foreground tracking-[0.2em] inline-block px-8 animate-pulse text-foreground">
                            {botStatus.linking_code}
                          </div>
                          <p className="text-sm font-bold text-muted-foreground max-w-[250px] mx-auto">
                            Envía este código al bot de Telegram o WhatsApp para vincular tu cuenta.
                          </p>
                          <button 
                            onClick={generateLinkingCode}
                            disabled={loadingBot}
                            className="font-black uppercase text-sm text-foreground hover:underline mt-2"
                          >
                            Generar uno nuevo
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={generateLinkingCode}
                          disabled={loadingBot}
                          className="w-full py-4 px-4 rounded-xl bg-[#00E5FF] border-4 border-foreground text-black font-black uppercase text-sm shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:bg-[#00cce6] hover:translate-y-[2px] hover:shadow-[0_0_0_0_#000] transition-all flex items-center justify-center gap-2"
                        >
                          {loadingBot ? "Generando..." : "Generar Código de Vínculo"}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-[#FFD700] text-black border-4 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]">
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

      {/* Comic Mode & Sound Effects */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-black uppercase text-lg text-foreground">Efectos Cómic y Sonido</h3>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0_0_#000] -rotate-2">
            POW!
          </span>
        </div>

        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 sm:p-6 space-y-6">
          {/* Comic Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-border/70">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] bg-[#FFE600] flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-black fill-black" />
              </div>
              <div>
                <p className="font-black uppercase text-base text-foreground">Modo Cómic (Efectos Visuales)</p>
                <p className="font-bold text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Partículas, onomatopeyas flotantes y animaciones al interactuar
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                toggleComicMode();
                if (!comicMode) {
                  ComicAudio.playPop();
                  toast.success("¡Modo Cómic Activado! BOOM!");
                } else {
                  toast.info("Modo Cómic Desactivado");
                }
              }}
              className={cn(
                "px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider border-3 transition-all shrink-0 self-start sm:self-center flex items-center gap-2 cursor-pointer",
                comicMode
                  ? "bg-[#00FF66] text-black border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px]"
                  : "bg-muted text-muted-foreground border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:text-foreground"
              )}
            >
              <Sparkles className="w-4 h-4" />
              {comicMode ? "Activado (ON)" : "Desactivado (OFF)"}
            </button>
          </div>

          {/* Sound Effects Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-border/70">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] bg-[#00E5FF] flex items-center justify-center shrink-0">
                {soundEnabled ? (
                  <Volume2 className="w-6 h-6 text-black" strokeWidth={2.5} />
                ) : (
                  <VolumeX className="w-6 h-6 text-black" strokeWidth={2.5} />
                )}
              </div>
              <div>
                <p className="font-black uppercase text-base text-foreground">Efectos de Sonido</p>
                <p className="font-bold text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Retro pops, rebotes y fanfarrias estilo caricatura al hacer clics
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                toggleSound();
                if (!soundEnabled) {
                  ComicAudio.playPop();
                  toast.success("¡Sonidos activados!");
                } else {
                  toast.info("Sonidos silenciados");
                }
              }}
              className={cn(
                "px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider border-3 transition-all shrink-0 self-start sm:self-center flex items-center gap-2 cursor-pointer",
                soundEnabled
                  ? "bg-[#00E5FF] text-black border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px]"
                  : "bg-muted text-muted-foreground border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:text-foreground"
              )}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundEnabled ? "Con Sonido (ON)" : "Silenciado (OFF)"}
            </button>
          </div>

          {/* Sound Preview Test Pad */}
          <div className="p-4 rounded-xl bg-secondary/40 border-2 border-foreground space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black uppercase text-xs text-foreground tracking-wider flex items-center gap-1.5">
                <span>🔊 Probar Efectos de Sonido</span>
              </span>
              <span className="text-[10px] font-bold text-muted-foreground">Haz clic para escuchar</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  ComicAudio.playPop();
                  triggerBurst(e.clientX, e.clientY, "POP!");
                }}
                className="py-2.5 px-3 rounded-lg bg-[#FFE600] text-black font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>💥</span> Pop
              </button>
              <button
                type="button"
                onClick={(e) => {
                  ComicAudio.playPowerUp();
                  triggerBurst(e.clientX, e.clientY, "XP+!");
                }}
                className="py-2.5 px-3 rounded-lg bg-[#00E5FF] text-black font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>⚡</span> Power Up
              </button>
              <button
                type="button"
                onClick={(e) => {
                  ComicAudio.playBoing();
                  triggerBurst(e.clientX, e.clientY, "BOING!");
                }}
                className="py-2.5 px-3 rounded-lg bg-[#FF2E93] text-white border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🦘</span> Boing
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="space-y-3">
        <h3 className="font-black uppercase text-lg text-foreground">Integraciones</h3>
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl overflow-hidden divide-y-4 divide-foreground">
          <div className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] bg-[#C688EB] flex items-center justify-center">
              <Calendar className="w-6 h-6 text-black" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="font-black uppercase text-base text-foreground">Google Calendar</p>
              <p className="font-bold text-sm text-muted-foreground mt-1">
                {isGoogleLinked || isGoogleCalendarConnected()
                  ? "Sincronización bidireccional activa con tu cuenta de Google."
                  : "Sincroniza tus exámenes y sesiones en vivo con Google Calendar."}
              </p>
            </div>
            {isGoogleLinked || isGoogleCalendarConnected() ? (
              <a
                href="/calendario"
                className="text-xs px-3 py-1 font-black uppercase rounded bg-[#00FF9D] text-black border-2 border-foreground shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] transition-transform inline-flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sincronizado
              </a>
            ) : (
              <button
                onClick={handleLinkGoogle}
                disabled={linkingGoogle}
                className="text-xs px-3 py-1 font-black uppercase rounded bg-[#FFE600] text-black border-2 border-foreground shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] transition-transform"
              >
                {linkingGoogle ? "Conectando..." : "Conectar"}
              </button>
            )}
          </div>
          <button className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left">
            <div className="w-12 h-12 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] bg-muted flex items-center justify-center">
              <Link className="w-6 h-6 text-foreground" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="font-black uppercase text-base text-foreground">Otras integraciones</p>
              <p className="font-bold text-sm text-muted-foreground mt-1">Conectar más servicios</p>
            </div>
            <div className="w-10 h-10 border-2 border-foreground rounded-lg bg-muted flex items-center justify-center">
              <ChevronRight className="w-6 h-6 text-foreground" strokeWidth={3} />
            </div>
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="space-y-3">
        <h3 className="font-black uppercase text-lg text-foreground">Apariencia</h3>
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] bg-muted flex items-center justify-center">
                {theme === "dark" ? (
                  <Moon className="w-6 h-6 text-foreground" strokeWidth={2.5} />
                ) : theme === "light" ? (
                  <Sun className="w-6 h-6 text-foreground" strokeWidth={2.5} />
                ) : (
                  <Monitor className="w-6 h-6 text-foreground" strokeWidth={2.5} />
                )}
              </div>
              <div>
                <p className="font-black uppercase text-base text-foreground">Tema del sistema</p>
                <p className="font-bold text-sm text-muted-foreground mt-1">
                  Elige cómo se ve T.A.B.E.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-4 transition-all ${theme === "light"
                  ? "bg-[#BFFF00] text-black border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] translate-y-[-2px]"
                  : "bg-card text-foreground border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:bg-muted/50"
                  }`}
              >
                <Sun className="w-6 h-6" strokeWidth={3} />
                <span className="font-black uppercase text-xs">Claro</span>
              </button>

              <button
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-4 transition-all ${theme === "dark"
                  ? "bg-[#00E5FF] text-black border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] translate-y-[-2px]"
                  : "bg-card text-foreground border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:bg-muted/50"
                  }`}
              >
                <Moon className="w-6 h-6" strokeWidth={3} />
                <span className="font-black uppercase text-xs">Oscuro</span>
              </button>

              <button
                onClick={() => setTheme("system")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-4 transition-all ${theme === "system"
                  ? "bg-[#FFD700] text-black border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] translate-y-[-2px]"
                  : "bg-card text-foreground border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:bg-muted/50"
                  }`}
              >
                <Monitor className="w-6 h-6" strokeWidth={3} />
                <span className="font-black uppercase text-xs">Auto</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pomodoro Settings */}
      <div className="space-y-3">
        <h3 className="font-black uppercase text-lg text-foreground">Pomodoro</h3>
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between p-3 border-2 border-foreground rounded-xl bg-muted/40">
            <span className="font-black uppercase text-sm text-foreground">Tiempo de trabajo</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updatePomodoroSetting("work", -1)}
                className="w-10 h-10 border-2 border-foreground rounded-lg bg-card text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center justify-center hover:translate-y-[2px] hover:shadow-none transition-all font-black text-xl"
              >
                -
              </button>
              <span className="font-black text-2xl w-12 text-center text-foreground">{pomodoroSettings.work}</span>
              <button
                onClick={() => updatePomodoroSetting("work", 1)}
                className="w-10 h-10 border-2 border-foreground rounded-lg bg-[#FF5C5C] text-black shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center justify-center hover:translate-y-[2px] hover:shadow-none transition-all font-black text-xl"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border-2 border-foreground rounded-xl bg-muted/40">
            <span className="font-black uppercase text-sm text-foreground">Descanso corto</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updatePomodoroSetting("shortBreak", -1)}
                className="w-10 h-10 border-2 border-foreground rounded-lg bg-card text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center justify-center hover:translate-y-[2px] hover:shadow-none transition-all font-black text-xl"
              >
                -
              </button>
              <span className="font-black text-2xl w-12 text-center text-foreground">{pomodoroSettings.shortBreak}</span>
              <button
                onClick={() => updatePomodoroSetting("shortBreak", 1)}
                className="w-10 h-10 border-2 border-foreground rounded-lg bg-[#BFFF00] text-black shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center justify-center hover:translate-y-[2px] hover:shadow-none transition-all font-black text-xl"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border-2 border-foreground rounded-xl bg-muted/40">
            <span className="font-black uppercase text-sm text-foreground">Descanso largo</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updatePomodoroSetting("longBreak", -1)}
                className="w-10 h-10 border-2 border-foreground rounded-lg bg-card text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center justify-center hover:translate-y-[2px] hover:shadow-none transition-all font-black text-xl"
              >
                -
              </button>
              <span className="font-black text-2xl w-12 text-center text-foreground">{pomodoroSettings.longBreak}</span>
              <button
                onClick={() => updatePomodoroSetting("longBreak", 1)}
                className="w-10 h-10 border-2 border-foreground rounded-lg bg-[#00E5FF] text-black shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center justify-center hover:translate-y-[2px] hover:shadow-none transition-all font-black text-xl"
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
          <h3 className="font-black uppercase text-lg text-foreground">Valorar T.A.B.E.</h3>
          <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl overflow-hidden transition-all">
            <button
              className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
              onClick={() => toggleSection("review")}
            >
              <div className="w-12 h-12 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] bg-[#FFD700] flex items-center justify-center flex-shrink-0">
                <Star className="w-6 h-6 text-black" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="font-black uppercase text-base text-foreground">Dejar una valoración</p>
                <p className="font-bold text-sm text-muted-foreground mt-1">Comparte tu experiencia con otros estudiantes</p>
              </div>
              <div className="w-10 h-10 border-2 border-foreground rounded-lg bg-muted flex items-center justify-center">
                {expandedSection === "review" ? (
                  <ChevronDown className="w-6 h-6 text-foreground" strokeWidth={3} />
                ) : (
                  <ChevronRight className="w-6 h-6 text-foreground" strokeWidth={3} />
                )}
              </div>
            </button>

            {expandedSection === "review" && (
              <div className="p-5 border-t-4 border-foreground bg-muted/20 animate-in fade-in slide-in-from-top-2">
                <ReviewForm userName={userName!} userId={user?.id!} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full bg-[#FF5C5C] text-black border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 flex items-center justify-center gap-4 hover:bg-[#ff4d4d] hover:translate-y-[2px] hover:shadow-[0_0_0_0_#000] transition-all mt-8"
      >
        <LogOut className="w-6 h-6 text-black" strokeWidth={3} />
        <span className="font-black uppercase text-lg text-black">Cerrar sesión</span>
      </button>

      {/* Version */}
      <p className="text-center font-black uppercase text-sm text-muted-foreground mt-8">
        T.A.B.E. v2.8.0
      </p>
    </div>
  );
}
