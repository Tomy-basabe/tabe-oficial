import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Bell, Calendar, LogOut, Moon, Sun, ChevronRight, ChevronDown, Star, Monitor, MessageSquare, Send, Zap, Volume2, VolumeX, CheckCircle2, Check, Loader2, Unlink, GraduationCap, Building2, Copy, ExternalLink, Shield, FileText, Cookie, AlertOctagon, User, Clock, Palette, Minus, Plus, Radio, CheckCheck, Award } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { MoodleConnectModal } from "@/components/moodle/MoodleConnectModal";
import { GoogleCalendarSyncModal } from "@/components/calendar/GoogleCalendarSyncModal";
import { DeleteAccountModal } from "@/components/settings/DeleteAccountModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { resetCookieConsent } from "@/components/legal/CookieConsent";
import { getStoredMoodleSession, MoodleSession } from "@/lib/moodleService";
import { useAuth } from "@/contexts/AuthContext";
import { useSubjects } from "@/hooks/useSubjects";
import { ALL_PROVINCIAS, ALL_FACULTADES, AVAILABLE_FACULTADES, AVAILABLE_CAREERS } from "@/lib/careerData";
import { UniversityLogo } from "@/components/icons/UniversityLogos";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { ReviewForm } from "@/components/settings/ReviewForm";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getStoredGoogleFeedUrl } from "@/lib/googleCalendarSync";
import { cn } from "@/lib/utils";
import { usePomodoro } from "@/contexts/PomodoroContext";
import { useConfirm } from "@/contexts/ConfirmModalContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";

interface PomodoroSettingsType {
  work: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

type SettingsTab = "account" | "integrations" | "notifications" | "appearance" | "pomodoro" | "legal";

export default function Settings() {
  const { confirm } = useConfirm();
  const { deleteAllSubjects, importCareerPlan } = useSubjects();
  const { userStats } = useDashboardStats();

  // Estado del perfil académico (Facultad y Carrera)
  const [academicProfile, setAcademicProfile] = useState<{ facultad: string | null; carrera: string | null }>({
    facultad: null,
    carrera: null,
  });
  const [isAcademicModalOpen, setIsAcademicModalOpen] = useState(false);
  const [selectedProvincia, setSelectedProvincia] = useState("MENDOZA");
  const [selectedFacultad, setSelectedFacultad] = useState("");
  const [customFacultad, setCustomFacultad] = useState("");
  const [actionType, setActionType] = useState<"only_facultad" | "load_plan">("only_facultad");
  const [selectedCareer, setSelectedCareer] = useState("");
  const [isSavingAcademic, setIsSavingAcademic] = useState(false);

  // Cargar facultad y carrera desde profiles
  const fetchAcademicProfile = async () => {
    if (isGuest || !user) {
      try {
        const guestFac = localStorage.getItem("tabe_guest_facultad");
        const guestCar = localStorage.getItem("tabe_guest_carrera");
        setAcademicProfile({
          facultad: guestFac || null,
          carrera: guestCar || null,
        });
      } catch {}
      return;
    }
    try {
      const { data } = await supabase
        .from("profiles")
        .select("facultad, carrera")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setAcademicProfile({
          facultad: data.facultad || null,
          carrera: data.carrera || null,
        });
      }
    } catch (err) {
      console.error("Error al cargar perfil académico:", err);
    }
  };

  useEffect(() => {
    fetchAcademicProfile();
  }, [user]);

  // Facultades de la provincia seleccionada
  const facultadesForProvincia = useMemo(() => {
    return ALL_FACULTADES.filter((f) => f.provinciaId === selectedProvincia);
  }, [selectedProvincia]);

  // Carreras disponibles para la facultad seleccionada
  const availableCareersForModal = useMemo(() => {
    if (!selectedFacultad || selectedFacultad === "OTHER") return [];
    return AVAILABLE_CAREERS.filter((c) => c.facultad === selectedFacultad);
  }, [selectedFacultad]);

  const handleOpenAcademicModal = () => {
    setSelectedProvincia("MENDOZA");
    // Intentar pre-seleccionar la facultad actual del usuario
    if (academicProfile.facultad) {
      const match = ALL_FACULTADES.find(
        (f) =>
          f.id.toLowerCase() === academicProfile.facultad?.toLowerCase() ||
          academicProfile.facultad?.toLowerCase().includes(f.label.toLowerCase()) ||
          f.label.toLowerCase().includes(academicProfile.facultad?.toLowerCase() || "") ||
          (f.fullLabel && academicProfile.facultad?.toLowerCase().includes(f.fullLabel.toLowerCase()))
      );
      if (match) {
        setSelectedProvincia(match.provinciaId || "MENDOZA");
        setSelectedFacultad(match.id);
      } else {
        setSelectedFacultad("OTHER");
        setCustomFacultad(academicProfile.facultad);
      }
    } else {
      setSelectedFacultad("");
      setCustomFacultad("");
    }
    setActionType("only_facultad");
    setSelectedCareer("");
    setIsAcademicModalOpen(true);
  };

  const handleSaveAcademicChanges = async () => {

    if (!selectedFacultad) {
      toast.error("Por favor selecciona tu facultad o universidad");
      return;
    }

    if (selectedFacultad === "OTHER" && !customFacultad.trim()) {
      toast.error("Escribe el nombre de tu institución");
      return;
    }

    const facObj = ALL_FACULTADES.find((f) => f.id === selectedFacultad);
    const resolvedFacName =
      selectedFacultad === "OTHER"
        ? customFacultad.trim()
        : facObj?.fullLabel || facObj?.label || selectedFacultad;

    try {
      setIsSavingAcademic(true);

      if (isGuest || !user) {
        localStorage.setItem("tabe_guest_facultad", resolvedFacName);
        if (actionType === "only_facultad") {
          toast.success("Facultad actualizada con éxito");
        } else {
          if (!selectedCareer) {
            toast.error("Por favor selecciona una carrera");
            setIsSavingAcademic(false);
            return;
          }
          const confirmed = await confirm({
            title: "¿Sobrescribir materias actuales?",
            description: "Se reemplazarán las materias de tu espacio académico por las materias del nuevo plan oficial. ¿Deseas continuar?",
            confirmText: "Sí, cargar nuevo plan",
            cancelText: "Cancelar",
            variant: "warning",
          });
          if (!confirmed) {
            setIsSavingAcademic(false);
            return;
          }
          toast.loading("Cargando materias del nuevo plan...", { id: "academic-plan" });
          await deleteAllSubjects();
          await importCareerPlan(selectedCareer, true);
          const careerObj = AVAILABLE_CAREERS.find((c) => c.id === selectedCareer);
          localStorage.setItem("tabe_guest_carrera", careerObj?.label || selectedCareer);
          toast.success("¡Plan de carrera oficial importado con éxito!", { id: "academic-plan" });
        }
        await fetchAcademicProfile();
        setIsAcademicModalOpen(false);
        setIsSavingAcademic(false);
        return;
      }

      if (actionType === "only_facultad") {
        // Opción 1: Solo cambiar la facultad en el perfil sin tocar las materias
        const { error } = await supabase
          .from("profiles")
          .update({
            facultad: resolvedFacName,
          } as any)
          .eq("user_id", user.id);

        if (error) throw error;
        toast.success("Facultad actualizada con éxito");
      } else {
        // Opción 2: Cargar nuevo plan de carrera oficial
        if (!selectedCareer) {
          toast.error("Por favor selecciona una carrera");
          setIsSavingAcademic(false);
          return;
        }

        const confirmed = await confirm({
          title: "¿Sobrescribir materias actuales?",
          description: "Se reemplazarán las materias de tu espacio académico por las materias del nuevo plan oficial. ¿Deseas continuar?",
          confirmText: "Sí, cargar nuevo plan",
          cancelText: "Cancelar",
          variant: "warning",
        });

        if (!confirmed) {
          setIsSavingAcademic(false);
          return;
        }

        toast.loading("Cargando materias del nuevo plan...", { id: "academic-plan" });
        await deleteAllSubjects();
        await importCareerPlan(selectedCareer, true);

        // Actualizar perfil con la facultad y carrera
        const careerObj = AVAILABLE_CAREERS.find((c) => c.id === selectedCareer);
        await supabase
          .from("profiles")
          .update({
            facultad: resolvedFacName,
            carrera: careerObj?.label || selectedCareer,
            academic_profile_completed: true,
          } as any)
          .eq("user_id", user.id);

        toast.success("¡Plan de carrera oficial importado con éxito!", { id: "academic-plan" });
      }

      await fetchAcademicProfile();
      setIsAcademicModalOpen(false);
    } catch (err: any) {
      console.error("Error al guardar cambios académicos:", err);
      toast.error(`Error: ${err.message || "No se pudo actualizar"}`);
    } finally {
      setIsSavingAcademic(false);
    }
  };
  const { 
    user, 
    isGuest, 
    signOut, 
    profile, 
    isGoogleLinked,
    googleIdentity,
    linkGoogleAccount,
    unlinkGoogleAccount,
    connectGoogleCalendar
  } = useAuth();
  
  const { settings: pomodoroSettings, updateSettings } = usePomodoro();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [expandedBotSection, setExpandedBotSection] = useState(false);
  const [expandedReviewSection, setExpandedReviewSection] = useState(false);
  
  const [botStatus, setBotStatus] = useState<{ telegram_id: any; whatsapp_number: any; linking_code: string | null } | null>(null);
  const [loadingBot, setLoadingBot] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);
  const [showMoodleModal, setShowMoodleModal] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hasGoogleFeed, setHasGoogleFeed] = useState<boolean>(() => !!getStoredGoogleFeedUrl());
  const [moodleSession, setMoodleSession] = useState<MoodleSession | null>(() => getStoredMoodleSession());
  const [testingProactive, setTestingProactive] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setMoodleSession(getStoredMoodleSession());
    setHasGoogleFeed(!!getStoredGoogleFeedUrl(user?.user_metadata));
  }, [user]);

  useEffect(() => {
    if (user && !isGuest) {
      fetchBotStatus();
    }
  }, [user, isGuest]);

  useEffect(() => {
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

  const userName = user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Usuario";
  const userInitials = userName.slice(0, 2).toUpperCase();
  const userEmail = user?.email || "";

  const handleLogout = async () => {
    const ok = await confirm({
      title: "¿Cerrar sesión?",
      description: "¿Estás seguro de que deseas salir de tu cuenta de TABE?",
      confirmText: "Cerrar sesión",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (ok) {
      await signOut();
    }
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
    const ok = await confirm({
      title: "¿Desvincular cuenta de Google?",
      description: "¿Seguro que quieres desvincular tu cuenta de Google? Si no tienes una contraseña configurada para tu email, podrías perder el acceso directo.",
      confirmText: "Desvincular cuenta",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;
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

    updateSettings({ ...pomodoroSettings, [key]: newValue });
  };

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
      toast.success("Código generado. Válido por 10 minutos.");
    }
    setLoadingBot(false);
  };

  const handleTestProactiveReminder = async () => {
    if (!user) return;
    setTestingProactive(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-handler", {
        body: {
          action: "send_proactive_reminders",
          target_user_id: user.id,
          force_test: true,
        },
      });

      if (error) {
        toast.error("Error al enviar recordatorio: " + error.message);
      } else if (data && data.success && data.count > 0) {
        toast.success("¡Recordatorio proactivo enviado! Revisa tu WhatsApp o Telegram 📲");
      } else {
        toast.info("No se encontró número de WhatsApp o Telegram vinculado para enviar el recordatorio.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al invocar recordatorio");
    } finally {
      setTestingProactive(false);
    }
  };

  const handleUnlinkBot = async (platform: 'telegram' | 'whatsapp') => {
    if (!user) return;
    const update = platform === 'telegram' ? { telegram_id: null } : { whatsapp_number: null };
    const { error } = await (supabase as any)
      .from("user_bots")
      .update(update)
      .eq("user_id", user.id);
    if (!error) {
      setBotStatus((prev: any) => prev ? { ...prev, ...update } : null);
      toast.success(`${platform === 'telegram' ? 'Telegram' : 'WhatsApp'} desvinculado`);
    } else {
      toast.error("Error al desvincular");
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: any; description: string }[] = [
    { id: "account", label: "Cuenta", icon: User, description: "Perfil, seguridad y credenciales" },
    { id: "integrations", label: "Integraciones", icon: Zap, description: "Moodle, Google Calendar y bots" },
    { id: "notifications", label: "Notificaciones", icon: Bell, description: "Alertas web y recordatorios" },
    { id: "appearance", label: "Apariencia", icon: Palette, description: "Modo claro, oscuro y sonido" },
    { id: "pomodoro", label: "Pomodoro", icon: Clock, description: "Bloques de estudio y descansos" },
    { id: "legal", label: "Legal y Opinión", icon: Shield, description: "Términos, privacidad y valoración" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 pt-4 sm:pt-6">
      <div className="tabe-page max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Encabezado limpio estilo Notion/ChatGPT */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-zinc-200/70 dark:border-zinc-800/80">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Configuración
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Administra tu perfil, sincronizaciones externas y preferencias de estudio.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-400">
              TABE v2.8.0
            </span>
          </div>
        </div>

        {/* Layout en dos columnas estilo ChatGPT/Notion para Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Navegación lateral izquierda (Desktop) y Scroll Horizontal (Mobile) */}
          <aside className="md:col-span-4 lg:col-span-3">
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left whitespace-nowrap md:whitespace-normal cursor-pointer select-none",
                      isActive
                        ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="settings-tab-pill"
                        transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.7 }}
                        className="absolute inset-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 shadow-2xs"
                      />
                    )}
                    <Icon className={cn("relative z-10 w-4 h-4 shrink-0", isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400")} />
                    <div className="relative z-10 min-w-0">
                      <span className="block truncate">{tab.label}</span>
                      <span className="hidden lg:block text-[10px] text-zinc-400 font-normal truncate">
                        {tab.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Panel de Contenido Principal Derecho */}
          <main className="md:col-span-8 lg:col-span-9 space-y-5">
            
            {/* ========================================================================= */}
            {/* PESTAÑA: CUENTA */}
            {/* ========================================================================= */}
            {activeTab === "account" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                
                {/* Tarjeta de Perfil */}
                <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-13 h-13 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center font-semibold text-lg shrink-0 shadow-2xs">
                        {userInitials}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 truncate">
                            {userName}
                          </h2>
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {isGuest ? "Invitado" : "Estudiante"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate font-mono">
                          {userEmail || "Sin correo asociado"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </div>

                {/* Tarjeta de Institución Académica y Carrera */}
                <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-center shrink-0 p-1">
                        {academicProfile.facultad ? (
                          <UniversityLogo universityId={academicProfile.facultad} className="w-6 h-6" />
                        ) : (
                          <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                            Institución Académica y Carrera
                          </h3>
                          {academicProfile.facultad && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                              Asignada
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 font-medium truncate">
                          🏛️ {academicProfile.facultad || "Universidad no especificada"}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                          🎓 {academicProfile.carrera || "Carrera no especificada"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenAcademicModal}
                        className="h-8 px-3.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>Modificar facultad / plan</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Acceso con Google */}
                {!isGuest && (
                  <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                              Autenticación con Google
                            </h3>
                            {isGoogleLinked ? (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                Vinculado
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                Desconectado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                            {isGoogleLinked
                              ? `Asociado a ${googleIdentity?.identity_data?.email || userEmail}. Permite ingresar con un clic.`
                              : "Asocia tu cuenta de Google para iniciar sesión rápidamente sin recordar contraseñas."}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isGoogleLinked ? (
                          <button
                            type="button"
                            onClick={handleUnlinkGoogle}
                            disabled={unlinkingGoogle}
                            className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {unlinkingGoogle ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Unlink className="w-3.5 h-3.5 text-zinc-400" />
                            )}
                            <span>Desvincular</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleLinkGoogle}
                            disabled={linkingGoogle}
                            className="h-8 px-3.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                          >
                            {linkingGoogle ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Vincular cuenta</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isGuest && (
                  <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                          Sesión en Modo Demostración
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          Tus materias y apuntes actuales se encuentran guardados temporalmente en este navegador. Registra tu cuenta gratis para sincronizar tu progreso en la nube y acceder desde tu teléfono o computadora.
                        </p>
                      </div>
                    </div>
                    <div className="pt-1 flex items-center gap-2">
                      <RouterLink
                        to="/registro"
                        className="h-8 px-3.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>Registrarme y guardar mi progreso</span>
                      </RouterLink>
                    </div>
                  </div>
                )}

                {/* Zona de Peligro: Eliminación de Cuenta */}
                {!isGuest && (
                  <div className="p-5 rounded-2xl border border-red-200/80 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                        <AlertOctagon className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm text-red-900 dark:text-red-300">
                          Zona de peligro · Supresión de datos personales
                        </h3>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          En cumplimiento de la Ley 25.326 y el RGPD, puedes destruir permanentemente tu cuenta, apuntes, archivos de biblioteca, materias y progreso.
                        </p>
                      </div>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="h-8 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>Eliminar mi cuenta</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* PESTAÑA: INTEGRACIONES */}
            {/* ========================================================================= */}
            {activeTab === "integrations" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                
                {/* Campus Virtual / Moodle */}
                {!isGuest && (
                  <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-500/20 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                              Campus Virtual Moodle
                            </h3>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
                              UTN & Universidades
                            </span>
                            {moodleSession ? (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                Conectado
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                No vinculado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {moodleSession
                              ? `Sincronización activa como ${moodleSession.fullname}. Materias y fechas de exámenes al día.`
                              : "Conecta tu campus para importar materias y fechas de exámenes automáticamente."}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowMoodleModal(true)}
                          className={cn(
                            "h-8 px-3.5 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs",
                            moodleSession
                              ? "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                              : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100"
                          )}
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>{moodleSession ? "Gestionar Campus" : "Conectar Campus"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Google Calendar */}
                {!isGuest && (
                  <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-500/20 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                              Google Calendar
                            </h3>
                            {isGoogleLinked || hasGoogleFeed ? (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                Sincronizado
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                No vinculado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Sincroniza tus exámenes y entregas con tu agenda de Google en tiempo real.
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowGoogleModal(true)}
                          className="h-8 px-3.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{isGoogleLinked || hasGoogleFeed ? "Ajustes de Calendar" : "Sincronizar Calendar"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Asistente Virtual: WhatsApp y Telegram Bot */}
                {!isGuest && (
                  <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedBotSection(!expandedBotSection)}
                      className="w-full p-5 flex items-center justify-between text-left hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-500/20 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                              Asistente Bot (WhatsApp y Telegram)
                            </h3>
                            {botStatus?.telegram_id || botStatus?.whatsapp_number ? (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                Activo
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Chatea con TABE AI desde tu celular y recibe recordatorios antes de cada examen.
                          </p>
                        </div>
                      </div>

                      <div className="w-7 h-7 rounded-lg text-zinc-400 flex items-center justify-center">
                        {expandedBotSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </button>

                    {expandedBotSection && (
                      <div className="p-5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4 bg-zinc-50/40 dark:bg-zinc-900/20">
                        
                        {/* Telegram y WhatsApp tarjetas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Telegram */}
                          <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-2.5">
                              <Send className="w-4 h-4 text-sky-500" />
                              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Telegram Bot</span>
                            </div>
                            {botStatus?.telegram_id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                  Vinculado
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUnlinkBot('telegram')}
                                  className="text-[11px] text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                                >
                                  Desvincular
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
                                No vinculado
                              </span>
                            )}
                          </div>

                          {/* WhatsApp */}
                          <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-4 h-4 text-emerald-500 fill-current">
                                <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                              </div>
                              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">WhatsApp Bot</span>
                            </div>
                            {botStatus?.whatsapp_number ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                  Vinculado
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUnlinkBot('whatsapp')}
                                  className="text-[11px] text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                                >
                                  Desvincular
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
                                No vinculado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Generador de código */}
                        <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] space-y-3 text-center">
                          {botStatus?.linking_code ? (
                            <div className="space-y-3">
                              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                Tu código de vinculación temporal (válido por 10 min):
                              </p>
                              <div className="text-2xl sm:text-3xl font-mono font-semibold tracking-widest text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-900 py-2.5 px-6 rounded-lg border border-zinc-200 dark:border-zinc-800 inline-block shadow-2xs">
                                {botStatus.linking_code}
                              </div>
                              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                                <a
                                  href={`https://wa.me/15551639526?text=${botStatus.linking_code}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                                >
                                  <span>Enviar por WhatsApp</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(botStatus.linking_code || "");
                                    setCopiedCode(true);
                                    toast.success("Código copiado al portapapeles");
                                    setTimeout(() => setCopiedCode(false), 2000);
                                  }}
                                  className="h-8 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  {copiedCode ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  <span>{copiedCode ? "Copiado" : "Copiar"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={generateLinkingCode}
                                  disabled={loadingBot}
                                  className="h-8 px-2.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                >
                                  Nuevo código
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Genera un código de 6 dígitos y envíaselo al bot en Telegram o WhatsApp para vincular tu cuenta.
                              </p>
                              <button
                                type="button"
                                onClick={generateLinkingCode}
                                disabled={loadingBot}
                                className="h-8 px-4 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-medium text-xs shadow-2xs transition-colors cursor-pointer"
                              >
                                {loadingBot ? "Generando código..." : "Generar código de vinculación"}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Recordatorios Proactivos */}
                        {(botStatus?.telegram_id || botStatus?.whatsapp_number) && (
                          <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-amber-500" />
                                <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                                  Recordatorios Proactivos de TABE AI
                                </h4>
                              </div>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                Activo
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                              Un día antes de cada parcial agendado, TABE te contactará por chat para proponerte un simulacro interactivo de preguntas y resolver dudas.
                            </p>
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={handleTestProactiveReminder}
                                disabled={testingProactive}
                                className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <Bell className="w-3.5 h-3.5 text-amber-500" />
                                <span>{testingProactive ? "Enviando..." : "Enviar recordatorio de prueba a mi celular 📲"}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* PESTAÑA: NOTIFICACIONES */}
            {/* ========================================================================= */}
            {activeTab === "notifications" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-0.5">
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    Notificaciones y Avisos de Estudio
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Configura cuándo y cómo deseas recibir alertas en tu dispositivo.
                  </p>
                </div>
                <NotificationSettings />
              </div>
            )}

            {/* ========================================================================= */}
            {/* PESTAÑA: APARIENCIA */}
            {/* ========================================================================= */}
            {activeTab === "appearance" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                
                {/* Selector de Tema */}
                <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xs space-y-3.5">
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      Modo de color
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Elige cómo quieres visualizar la plataforma en este dispositivo.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: "light", label: "Claro", icon: Sun },
                      { id: "dark", label: "Oscuro", icon: Moon },
                      { id: "system", label: "Automático", icon: Monitor },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = theme === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTheme(item.id as any)}
                          className={cn(
                            "p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer",
                            isSelected
                              ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs"
                              : "border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 font-medium"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-xs">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* ========================================================================= */}
            {/* PESTAÑA: POMODORO */}
            {/* ========================================================================= */}
            {activeTab === "pomodoro" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xs space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      Duración del Temporizador Pomodoro
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Configura el tiempo en minutos para tus sesiones de estudio y pausas.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {/* Trabajo */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                      <div>
                        <h4 className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">Tiempo de estudio</h4>
                        <p className="text-[11px] text-zinc-400">Bloque de máxima concentración</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updatePomodoroSetting("work", -1)}
                          className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-14 text-center font-mono font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                          {pomodoroSettings.work} <span className="text-xs text-zinc-400 font-normal">min</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => updatePomodoroSetting("work", 1)}
                          className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Descanso corto */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                      <div>
                        <h4 className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">Descanso corto</h4>
                        <p className="text-[11px] text-zinc-400">Pausa breve entre sesiones</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updatePomodoroSetting("shortBreak", -1)}
                          className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-14 text-center font-mono font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                          {pomodoroSettings.shortBreak} <span className="text-xs text-zinc-400 font-normal">min</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => updatePomodoroSetting("shortBreak", 1)}
                          className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Descanso largo */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                      <div>
                        <h4 className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">Descanso largo</h4>
                        <p className="text-[11px] text-zinc-400">Pausa extendida cada 4 pomodoros</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updatePomodoroSetting("longBreak", -1)}
                          className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-14 text-center font-mono font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                          {pomodoroSettings.longBreak} <span className="text-xs text-zinc-400 font-normal">min</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => updatePomodoroSetting("longBreak", 1)}
                          className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PESTAÑA: LEGAL Y OPINIÓN */}
            {/* ========================================================================= */}
            {activeTab === "legal" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                
                {/* Valorar TABE */}
                {!isGuest && (
                  <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedReviewSection(!expandedReviewSection)}
                      className="w-full p-5 flex items-center justify-between text-left hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20 flex items-center justify-center shrink-0">
                          <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                            Dejar una reseña sobre TABE
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Comparte tu experiencia para ayudar a otros estudiantes en la comunidad.
                          </p>
                        </div>
                      </div>

                      <div className="w-7 h-7 rounded-lg text-zinc-400 flex items-center justify-center">
                        {expandedReviewSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </button>

                    {expandedReviewSection && (
                      <div className="p-5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/20">
                        <ReviewForm userName={userName!} userId={user?.id!} />
                      </div>
                    )}
                  </div>
                )}

                {/* Enlaces Legales */}
                <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xs space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      Marco Legal y Privacidad
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Consulta los acuerdos de servicio y la política de tratamiento de datos personales.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <RouterLink
                      to="/terminos"
                      className="p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center justify-between transition-colors shadow-2xs"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-500" />
                        <span>Términos del Servicio</span>
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                    </RouterLink>

                    <RouterLink
                      to="/privacidad"
                      className="p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center justify-between transition-colors shadow-2xs"
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span>Política de Privacidad</span>
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                    </RouterLink>
                  </div>

                  {/* Cookies */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-xs text-zinc-900 dark:text-zinc-100">Preferencias de cookies</h4>
                      <p className="text-[11px] text-zinc-400">Configura la activación de analíticas opcionales.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        resetCookieConsent();
                        toast.info("Abre el banner flotante para elegir tu preferencia de cookies.");
                      }}
                      className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Cookie className="w-3.5 h-3.5" />
                      <span>Gestionar cookies</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>

      </div>

      {/* Modal para Modificar Facultad y Carrera / Plan Oficial */}
      <Dialog open={isAcademicModalOpen} onOpenChange={setIsAcademicModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800 shadow-2xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-left space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200/60 dark:border-indigo-800/50">
                <GraduationCap className="w-3.5 h-3.5" />
                Perfil Académico
              </span>
            </div>
            <DialogTitle className="font-semibold text-lg sm:text-xl tracking-tight text-zinc-900 dark:text-zinc-100">
              Modificar Facultad y Plan de Carrera
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Personaliza tu universidad o importa un plan de estudios oficial para tu carrera.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            {/* Selector de Provincia */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Provincia
              </label>
              <Select value={selectedProvincia} onValueChange={(val) => {
                setSelectedProvincia(val);
                setSelectedFacultad("");
                setSelectedCareer("");
              }}>
                <SelectTrigger className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs rounded-xl">
                  <SelectValue placeholder="Selecciona provincia..." />
                </SelectTrigger>
                <SelectContent className="max-h-56 z-50">
                  {ALL_PROVINCIAS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selector de Facultad */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Universidad o Instituto
              </label>
              <Select value={selectedFacultad} onValueChange={(val) => {
                setSelectedFacultad(val);
                setSelectedCareer("");
              }}>
                <SelectTrigger className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs rounded-xl">
                  <SelectValue placeholder="Selecciona facultad o universidad..." />
                </SelectTrigger>
                <SelectContent className="max-h-56 z-50">
                  {facultadesForProvincia.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">
                      {f.fullLabel || f.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="OTHER" className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    + Otra institución (escribir manual)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Input para Otra Facultad */}
            {selectedFacultad === "OTHER" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Nombre de tu Institución
                </label>
                <Input
                  type="text"
                  placeholder="Ej: Universidad Siglo 21 / Instituto Técnico"
                  value={customFacultad}
                  onChange={(e) => setCustomFacultad(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            )}

            {/* Tipo de Acción */}
            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                ¿Qué deseas actualizar?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActionType("only_facultad")}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer select-none",
                    actionType === "only_facultad"
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-2xs"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  <div className="flex items-center gap-2 font-medium text-xs">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Solo mi institución</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    No toca tus materias actuales ni altera tu progreso.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType("load_plan")}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer select-none",
                    actionType === "load_plan"
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-2xs"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  <div className="flex items-center gap-2 font-medium text-xs">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Cargar nuevo plan oficial</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Importa las materias y correlatividades del plan de carrera.
                  </p>
                </button>
              </div>
            </div>

            {/* Selector de Carrera si eligió cargar plan */}
            {actionType === "load_plan" && (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Carrera oficial disponible
                </label>
                {availableCareersForModal.length > 0 ? (
                  <Select value={selectedCareer} onValueChange={setSelectedCareer}>
                    <SelectTrigger className="w-full h-9 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs rounded-xl">
                      <SelectValue placeholder="Selecciona tu carrera..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56 z-50">
                      {availableCareersForModal.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                    No hay planes automáticos predefinidos para esta institución aún. Puedes agregar tus materias manualmente en Mi Carrera.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAcademicModalOpen(false)}
              className="h-8 text-xs rounded-lg cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAcademicChanges}
              disabled={isSavingAcademic || (actionType === "load_plan" && !selectedCareer && availableCareersForModal.length > 0)}
              className="h-8 px-4 text-xs font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg cursor-pointer"
            >
              {isSavingAcademic ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" /> Guardar cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modales Vinculados */}
      <MoodleConnectModal
        open={showMoodleModal}
        onClose={() => {
          setShowMoodleModal(false);
          setMoodleSession(getStoredMoodleSession());
        }}
        onSyncComplete={() => {
          setMoodleSession(getStoredMoodleSession());
        }}
      />

      <GoogleCalendarSyncModal
        open={showGoogleModal}
        onClose={() => {
          setShowGoogleModal(false);
          setHasGoogleFeed(!!getStoredGoogleFeedUrl(user?.user_metadata));
        }}
        onOpenImport={() => {}}
      />

      <DeleteAccountModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
