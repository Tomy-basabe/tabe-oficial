import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Trash2,
  Loader2,
  ExternalLink,
  Upload,
  Copy,
  Repeat,
  GraduationCap,
  Zap,
  
  Edit2,
  MapPin,
  Clock,
  BookOpen,
  Filter, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, parseLocalDate } from "@/lib/utils";
import { useCalendarEvents, CalendarEvent, EventType, CreateEventData } from "@/hooks/useCalendarEvents";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/contexts/AuthContext";
import { AddEventModal } from "@/components/calendar/AddEventModal";
import { ImportICSModal } from "@/components/calendar/ImportICSModal";
import { GoogleCalendarSyncModal } from "@/components/calendar/GoogleCalendarSyncModal";
import { MoodleConnectModal } from "@/components/moodle/MoodleConnectModal";
import { isMoodleConnected, performMoodleAutoSync } from "@/lib/moodleService";
import { ExamsListModal } from "@/components/calendar/ExamsListModal";
import { PurgeEventsModal } from "@/components/calendar/PurgeEventsModal";
import { generateGoogleCalendarUrl } from "@/lib/googleCalendarUrl";
import {
  isGoogleCalendarConnected,
  isAutoSyncEnabled,
  extractAndStoreTokenFromUrl,
  stripGoogleEventId,
} from "@/lib/googleCalendarSync";
import { performGlobalCalendarSync } from "@/lib/globalCalendarSync";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useConfirm } from "@/contexts/ConfirmModalContext";

export const eventTypeColors: Record<EventType, string> = {
  P1: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 dark:border-emerald-500/30",
  P2: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25 dark:border-sky-500/30",
  Global: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 dark:border-amber-500/30",
  "Recuperatorio P1": "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 dark:border-rose-500/30",
  "Recuperatorio P2": "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 dark:border-rose-500/30",
  "Recuperatorio Global": "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 dark:border-rose-500/30",
  Final: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25 dark:border-purple-500/30",
  Estudio: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25 dark:border-zinc-500/30",
  TP: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25 dark:border-orange-500/30",
  Entrega: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/25 dark:border-pink-500/30",
  Clase: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25 dark:border-blue-500/30",
  Otro: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25 dark:border-slate-500/30",
};

export const eventTypeDots: Record<EventType, string> = {
  P1: "bg-emerald-500",
  P2: "bg-sky-500",
  Global: "bg-amber-500",
  "Recuperatorio P1": "bg-rose-500",
  "Recuperatorio P2": "bg-rose-500",
  "Recuperatorio Global": "bg-rose-500",
  Final: "bg-purple-500",
  Estudio: "bg-zinc-500",
  TP: "bg-orange-500",
  Entrega: "bg-pink-500",
  Clase: "bg-blue-500",
  Otro: "bg-slate-500",
};

const recurrenceLabels: Record<string, string> = {
  DAILY: "Diario",
  WEEKLY: "Semanal",
  MONTHLY: "Mensual",
  YEARLY: "Anual",
};

const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function Calendar() {
  const { confirm } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const editEventId = searchParams.get("editEventId");

  const {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    getEventsForDate,
    refetch,
    cleanupDuplicates,
  } = useCalendarEvents();
  const { rawSubjects } = useSubjects();
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showMoodleModal, setShowMoodleModal] = useState(false);
  const [showExamsModal, setShowExamsModal] = useState(false);
  const [monthTransition, setMonthTransition] = useState<"enter" | "exit" | null>(null);
  const [isGCalConnected, setIsGCalConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMoodleSyncing, setIsMoodleSyncing] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>("all");

  // Años académicos disponibles de las materias cargadas
  const availableAcademicYears = useMemo(() => {
    return [...new Set(rawSubjects.map((s) => s.año))].sort((a, b) => a - b);
  }, [rawSubjects]);

  // Años para el selector de navegación del calendario
  const calendarYearOptions = useMemo(() => {
    const base = currentDate.getFullYear();
    const list = [];
    for (let y = base - 3; y <= base + 3; y++) {
      list.push(y);
    }
    return list;
  }, [currentDate]);

  const getFilteredEventsForDate = (date: Date) => {
    const dayEvents = getEventsForDate(date);
    if (filterAcademicYear === "all") return dayEvents;
    const targetYearNum = parseInt(filterAcademicYear, 10);
    const subjectIdsForYear = new Set(
      rawSubjects.filter((s) => s.año === targetYearNum).map((s) => s.id)
    );
    return dayEvents.filter((e) => !e.subject_id || subjectIdsForYear.has(e.subject_id));
  };

  // Auto-abrir modal para editar evento si viene con ?editEventId=... (ej: desde sección Exámenes)
  useEffect(() => {
    if (!editEventId || events.length === 0) return;

    const targetEvent = events.find(
      (e) => e.id === editEventId || (e.isVirtual && e.id.startsWith(editEventId))
    );

    if (targetEvent) {
      const eventDate = parseLocalDate(targetEvent.fecha);
      setSelectedDate(eventDate);
      setCurrentDate(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
      setEventToEdit(targetEvent);
      setShowAddModal(true);

      const newParams = new URLSearchParams(searchParams);
      newParams.delete("editEventId");
      setSearchParams(newParams, { replace: true });
    }
  }, [editEventId, events, searchParams, setSearchParams]);

  const hasAttemptedInitialSync = useRef(false);

  const handleCleanupDuplicates = async () => {
    if (isCleaningDuplicates) return;
    const ok = await confirm({
      title: "¿Limpiar eventos duplicados?",
      description: "¿Deseas buscar y eliminar todos los eventos duplicados en TABE y en Google Calendar? Conservaremos la copia más completa.",
      confirmText: "Limpiar duplicados",
      cancelText: "Cancelar",
      variant: "warning",
    });
    if (!ok) return;

    setIsCleaningDuplicates(true);
    toast.info("Escaneando y limpiando eventos duplicados...", { icon: "🧹" });
    try {
      const res = await cleanupDuplicates();
      if (res.tabeDuplicatesRemoved === 0 && res.googleDuplicatesRemoved === 0) {
        toast.info("¡Tu calendario ya está limpio! No se encontraron eventos duplicados.");
      } else {
        toast.success(
          `Limpieza completada: ${res.tabeDuplicatesRemoved} eliminados en TABE${
            res.googleDuplicatesRemoved > 0 ? ` y ${res.googleDuplicatesRemoved} en Google Calendar` : ""
          }.`,
          { icon: "✨", duration: 5000 }
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al limpiar duplicados");
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const isMoodleConn = isMoodleConnected(user?.user_metadata);

  const handleMoodleButtonClick = async () => {
    if (isMoodleSyncing) return;
    if (!isMoodleConnected(user?.user_metadata)) {
      setShowMoodleModal(true);
      return;
    }
    setIsMoodleSyncing(true);
    try {
      const res = await performMoodleAutoSync(user!.id, user?.user_metadata);
      if (res.success) {
        await refetch();
        toast.success("Campus Virtual sincronizado", { icon: "🎓", duration: 2000 });
      } else {
        toast.error(res.message || "Error al sincronizar con Moodle");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al sincronizar");
    } finally {
      setIsMoodleSyncing(false);
    }
  };

  const handleManualSync = async () => {
    if (isSyncing) return;
    if (!isGoogleCalendarConnected(user) && !isMoodleConnected(user?.user_metadata)) {
      setShowSyncModal(true);
      return;
    }
    setIsSyncing(true);
    toast.info("Sincronizando calendarios en tiempo real...", { icon: "⚡" });
    try {
      const res = await performGlobalCalendarSync(user, { force: true, silent: false });
      await refetch();
      setIsGCalConnected(isGoogleCalendarConnected(user));
      const gRes = res.google;
      const mRes = res.moodle;
      if (gRes?.success || mRes?.success) {
        toast.success("Sincronización completada con éxito", { icon: "✅", duration: 3000 });
      } else if (gRes?.message) {
        if (gRes.message.includes("expirad") || gRes.message.includes("no conectado")) {
          setShowSyncModal(true);
        } else {
          toast.error(gRes.message, { duration: 4000 });
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  // Listen to background sync updates from MainLayout
  useEffect(() => {
    const handleSync = () => {
      refetch();
      setIsGCalConnected(isGoogleCalendarConnected(user));
    };
    window.addEventListener("tabe_calendar_synced", handleSync);
    return () => window.removeEventListener("tabe_calendar_synced", handleSync);
  }, [refetch, user]);

  useEffect(() => {
    extractAndStoreTokenFromUrl();
    const conn = isGoogleCalendarConnected(user);
    setIsGCalConnected(conn);

    if (!loading && user && (conn || isMoodleConnected(user.user_metadata)) && isAutoSyncEnabled() && !hasAttemptedInitialSync.current) {
      hasAttemptedInitialSync.current = true;
      performGlobalCalendarSync(user, { silent: true }).then((res) => {
        if ((res.google && (res.google.added > 0 || res.google.updated > 0)) ||
            (res.moodle && (res.moodle.added > 0 || res.moodle.updated > 0))) {
          refetch();
        }
      }).catch(err => {
        console.warn("Auto-sync error on calendar load:", err);
      });
    }
  }, [loading, user]);

  // Atajo admin: Ctrl + Shift + Ñ para purgar eventos masivos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const key = (e.key || "").toLowerCase();
      const isEnie = key === "ñ" || e.key === "Ñ" || e.code === "Semicolon";

      if (isCtrlOrMeta && isShift && isEnie) {
        e.preventDefault();
        setShowPurgeModal((prev) => !prev);
      }
    };

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("openPurge") === "true" || window.location.hash === "#purge") {
        setShowPurgeModal(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const changeMonth = (direction: number) => {
    setMonthTransition("exit");
    setTimeout(() => {
      setCurrentDate(new Date(year, month + direction, 1));
      setMonthTransition("enter");
      setTimeout(() => setMonthTransition(null), 250);
    }, 120);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const handleAddEvent = (date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
    setEventToEdit(null);
    setShowAddModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEventToEdit(event);
    setShowAddModal(true);
  };

  const handleExportToGoogle = (event: CalendarEvent) => {
    const url = generateGoogleCalendarUrl({
      title: event.titulo,
      date: event.fecha,
      time: event.hora || undefined,
      description: stripGoogleEventId(event.notas) || undefined,
    });
    window.open(url, "_blank");
    toast.success("Abriendo Google Calendar...");
  };

  const handleDeleteEvent = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    const isRecurring = event?.recurrence_rule || event?.isVirtual;

    const ok = await confirm({
      title: isRecurring ? "¿Eliminar repeticiones del evento?" : "¿Eliminar este evento?",
      description: isRecurring
        ? `Este es un evento recurrente ("${event?.titulo || "Evento"}"). ¿Deseas eliminar TODAS sus repeticiones del calendario?`
        : `¿Estás seguro de eliminar el evento "${event?.titulo || "Evento"}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (ok) {
      await deleteEvent(eventId);
    }
  };

  const handleDuplicateEvent = async (event: CalendarEvent) => {
    await duplicateEvent(event);
  };

  const renderCalendarDays = () => {
    const days = [];

    // Celdas vacías del mes anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="min-h-[64px] sm:min-h-[88px] lg:h-32 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/20 border border-transparent"
        />
      );
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getFilteredEventsForDate(date);
      const today = isToday(date);
      const selected = isSelected(date);

      days.push(
        <div
          key={day}
          role="button"
          tabIndex={0}
          onClick={() => {
            setSelectedDate(date);
            if (dayEvents.length === 0) {
              handleAddEvent(date);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSelectedDate(date);
            }
          }}
          onDoubleClick={() => handleAddEvent(date)}
          className={cn(
            "min-h-[64px] sm:min-h-[88px] h-auto lg:h-32 p-1.5 sm:p-2 rounded-xl text-left relative group cursor-pointer",
            "transition-all duration-150 flex flex-col border",
            today
              ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/40 shadow-xs"
              : "border-zinc-200/70 dark:border-zinc-800/70 bg-white dark:bg-[#1e1e1e] hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 hover:border-zinc-300 dark:hover:border-zinc-700",
            selected && !today && "ring-2 ring-zinc-900/80 dark:ring-zinc-100/80 bg-zinc-50/90 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700"
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors",
                today
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100"
              )}
            >
              {day}
            </span>

            {/* Quick add on hover */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddEvent(date);
              }}
              aria-label={`Agregar evento el día ${day}`}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              title="Agregar evento"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-1 space-y-1 overflow-hidden flex-1">
            {dayEvents.slice(0, 2).map((event) => {
              const customStyle = event.color
                ? { backgroundColor: `${event.color}20`, borderColor: `${event.color}40`, color: event.color }
                : undefined;

              return (
                <div
                  key={event.id}
                  className={cn(
                    "text-[10px] sm:text-[11px] font-medium px-1.5 py-0.5 rounded-md border truncate flex items-center gap-1 leading-tight",
                    "transition-transform hover:scale-[1.01]",
                    !event.color && (eventTypeColors[event.tipo_examen] || "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700")
                  )}
                  style={customStyle}
                >
                  {event.recurrence_rule && <Repeat className="w-2.5 h-2.5 flex-shrink-0 opacity-70" />}
                  <span className="truncate">{event.titulo}</span>
                </div>
              );
            })}
            {dayEvents.length > 2 && (
              <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 pl-0.5">
                +{dayEvents.length - 2} más
              </p>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const selectedDateEvents = selectedDate ? getFilteredEventsForDate(selectedDate) : [];

  if (loading && events.length === 0) {
    return <LoadingScreen message="Cargando Calendario..." submessage="Organizando eventos académicos..." />;
  }

  return (
    <div className="tabe-page p-4 lg:p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Notion-style Header Bento Card */}
      <div className="neo-bento-card p-5 lg:p-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0 shadow-2xs">
            <CalendarIcon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Calendario Académico
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-normal mt-0.5">
              Planificá y visualizá tus exámenes, clases y entregas en un solo lugar.
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="h-9 px-3.5 text-xs sm:text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
          >
            Hoy
          </button>

          <button
            type="button"
            onClick={() => setShowExamsModal(true)}
            className="h-9 px-3.5 text-xs sm:text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <GraduationCap className="w-4 h-4 text-purple-500" />
            <span>Exámenes</span>
          </button>

          {/* Botón Google con indicador de estado estilo Notion pill */}
          <button
            type="button"
            onClick={() => setShowSyncModal(true)}
            title={
              isGCalConnected
                ? "Google Calendar conectado (Clic para sincronizar o configurar)"
                : "Google Calendar desconectado (Clic para conectar)"
            }
            className="h-9 px-3 text-xs sm:text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-2xs flex items-center gap-2"
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0 transition-colors",
                isGCalConnected
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : "bg-rose-500 animate-pulse"
              )}
            />
            <span>Google</span>
          </button>

          {/* Botón Moodle con indicador de estado */}
          <button
            type="button"
            onClick={handleMoodleButtonClick}
            title={
              isMoodleConn
                ? "Campus Virtual Moodle conectado (Clic para sincronizar)"
                : "Campus Virtual Moodle desconectado (Clic para conectar)"
            }
            className="h-9 px-3 text-xs sm:text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-2xs flex items-center gap-2"
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0 transition-colors",
                isMoodleConn
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : "bg-amber-500 animate-pulse"
              )}
            />
            <span>Moodle</span>
          </button>

          {/* Sincronización Rápida */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing || isMoodleSyncing}
            title="Sincronizar todo ahora (Google Calendar y Campus Virtual)"
            className="h-9 px-3 text-xs sm:text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSyncing || isMoodleSyncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            )}
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          {/* Limpiar duplicados */}
          <button
            type="button"
            onClick={handleCleanupDuplicates}
            disabled={isCleaningDuplicates}
            title="Buscar y eliminar eventos duplicados"
            className="h-9 px-2.5 sm:px-3 text-xs sm:text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {isCleaningDuplicates ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
            ) : (
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
            )}
            <span className="hidden md:inline">Limpiar</span>
          </button>

          {/* Importar ICS */}
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="h-9 px-3 text-xs sm:text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Importar</span>
          </button>

          {/* Botón Primario: Nuevo Evento */}
          <button
            type="button"
            onClick={() => handleAddEvent()}
            className="h-9 px-3.5 text-xs sm:text-sm font-medium rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Evento</span>
          </button>
        </div>
      </div>

      {/* Google Calendar Connection Status Banner (Callout suave estilo Notion) */}
      {!isGCalConnected && !loading && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-xs sm:text-sm flex items-center gap-2">
                <span>Google Calendar no vinculado en esta sesión</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                  Opcional
                </span>
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5 font-normal">
                Conectá tu cuenta de Google para sincronizar tus parciales y clases en ambas direcciones en tiempo real.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSyncModal(true)}
            className="w-full md:w-auto px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-zinc-950 font-medium text-xs rounded-lg transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Conectar Google Calendar</span>
          </button>
        </div>
      )}

      {/* Main Grid: Calendario + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Calendar View (3 cols) */}
        <div className="lg:col-span-3 neo-bento-card p-4 sm:p-6 overflow-hidden space-y-4">
          {/* Month & Year Navigation + Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Desplegable de Mes */}
              <Select
                value={month.toString()}
                onValueChange={(val) => {
                  const m = parseInt(val, 10);
                  setCurrentDate(new Date(year, m, 1));
                }}
              >
                <SelectTrigger className="h-8.5 px-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg">
                  {months.map((mName, idx) => (
                    <SelectItem key={idx} value={idx.toString()} className="text-xs font-medium">
                      {mName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Desplegable de Año */}
              <Select
                value={year.toString()}
                onValueChange={(val) => {
                  const y = parseInt(val, 10);
                  setCurrentDate(new Date(y, month, 1));
                }}
              >
                <SelectTrigger className="h-8.5 px-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg">
                  {calendarYearOptions.map((y) => (
                    <SelectItem key={y} value={y.toString()} className="text-xs font-medium">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {/* Desplegable de Filtro por Año Académico */}
              {availableAcademicYears.length > 0 && (
                <div className="w-[145px]">
                  <Select
                    value={filterAcademicYear}
                    onValueChange={setFilterAcademicYear}
                  >
                    <SelectTrigger className="h-8 px-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 shadow-2xs transition-colors flex items-center gap-1.5 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100">
                      <GraduationCap className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <SelectValue placeholder="Año de carrera" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg">
                      <SelectItem value="all" className="text-xs font-medium">Todos los años</SelectItem>
                      {availableAcademicYears.map((y) => (
                        <SelectItem key={y} value={y.toString()} className="text-xs font-medium">
                          {y}° Año
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Botones de Mes anterior / siguiente */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors shadow-2xs"
                  onClick={() => changeMonth(-1)}
                  title="Mes anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors shadow-2xs"
                  onClick={() => changeMonth(1)}
                  title="Mes siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-center text-[11px] sm:text-xs font-semibold text-zinc-400 dark:text-zinc-500 py-1 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div
            className={cn(
              "grid grid-cols-7 gap-1 sm:gap-1.5 transition-all duration-200",
              monthTransition === "exit" && "opacity-0 translate-y-1",
              monthTransition === "enter" && "opacity-100 translate-y-0",
              monthTransition === null && "opacity-100"
            )}
          >
            {renderCalendarDays()}
          </div>
        </div>

        {/* Sidebar: Eventos del día seleccionado (1 col) */}
        <div className="neo-bento-card p-5 h-fit sticky top-20 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-zinc-500" />
              <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 capitalize">
                {selectedDate
                  ? selectedDate.toLocaleDateString("es-AR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  : "Selecciona un día"}
              </h3>
            </div>
            {selectedDate && isToday(selectedDate) && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                Hoy
              </span>
            )}
          </div>

          {/* Lista de eventos del día */}
          {selectedDate && selectedDateEvents.length === 0 && (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-zinc-400 opacity-60" />
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Día libre</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">No hay eventos para esta fecha.</p>
              <button
                type="button"
                onClick={() => handleAddEvent()}
                className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar evento</span>
              </button>
            </div>
          )}

          {selectedDateEvents.length > 0 && (
            <div className="space-y-3">
              {selectedDateEvents.map((event) => {
                const customStyle = event.color
                  ? { borderLeftColor: event.color }
                  : undefined;

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#1a1a1a] shadow-2xs transition-all hover:border-zinc-300 dark:hover:border-zinc-700 border-l-4",
                      !event.color && (eventTypeColors[event.tipo_examen] ? "border-l-primary" : "border-l-zinc-400")
                    )}
                    style={customStyle}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border",
                              eventTypeColors[event.tipo_examen] || "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", eventTypeDots[event.tipo_examen] || "bg-zinc-400")} />
                            {event.tipo_examen}
                          </span>
                          {event.recurrence_rule && (
                            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                              <Repeat className="w-2.5 h-2.5" />
                              {recurrenceLabels[event.recurrence_rule]}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                          {event.titulo}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEditEvent(event)}
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Editar evento"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Metadata */}
                    <div className="mt-2.5 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {event.is_all_day ? (
                        <p className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>Todo el día</span>
                        </p>
                      ) : event.hora ? (
                        <p className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>{event.hora} {event.hora_fin ? `- ${event.hora_fin}` : ""} hs</span>
                        </p>
                      ) : null}

                      {event.subject_nombre && (
                        <p className="flex items-center gap-1.5 truncate">
                          <BookOpen className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span className="truncate">{event.subject_nombre}</span>
                        </p>
                      )}

                      {event.ubicacion && (
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span className="truncate">{event.ubicacion}</span>
                        </p>
                      )}
                    </div>

                    {stripGoogleEventId(event.notas) && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 whitespace-pre-line leading-relaxed">
                        {stripGoogleEventId(event.notas)}
                      </p>
                    )}

                    {/* Acciones */}
                    <div className="flex items-center justify-between gap-1.5 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() => handleExportToGoogle(event)}
                        className="h-7 px-2.5 rounded-md text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Google</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateEvent(event)}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Duplicar evento"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Eliminar evento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => handleAddEvent()}
                className="w-full py-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar otro evento</span>
              </button>
            </div>
          )}

          {/* Leyenda de tipos de eventos estilo Notion */}
          <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tipos de evento</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(eventTypeDots).map(([type, dotColor]) => (
                <div key={type} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
                  <span className="truncate text-[11px] font-normal">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      <AddEventModal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEventToEdit(null);
        }}
        onSubmit={async (data) => {
          if (eventToEdit) {
            const { id, ...updateData } = data as any;
            await updateEvent(id || eventToEdit.id, updateData);
          } else {
            await createEvent(data as CreateEventData);
          }
        }}
        onDelete={async (id) => {
          await deleteEvent(id);
          toast.success("Evento eliminado");
        }}
        subjects={rawSubjects}
        initialDate={selectedDate || undefined}
        editEvent={eventToEdit}
      />

      {/* Import ICS Modal */}
      <ImportICSModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={async (eventsToImport) => {
          for (const eventData of eventsToImport) {
            await createEvent(eventData);
          }
        }}
      />

      {/* Google Calendar Sync Modal */}
      <GoogleCalendarSyncModal
        open={showSyncModal}
        onClose={() => {
          setShowSyncModal(false);
          setIsGCalConnected(isGoogleCalendarConnected(user));
        }}
        onOpenImport={() => setShowImportModal(true)}
        events={events}
        createEvent={createEvent}
        updateEvent={updateEvent}
        refetch={refetch}
        onCleanupDuplicates={handleCleanupDuplicates}
      />

      {/* Exams Modal */}
      <ExamsListModal
        open={showExamsModal}
        onClose={() => setShowExamsModal(false)}
        events={events}
        subjects={rawSubjects}
        onEditExam={(event) => {
          setShowExamsModal(false);
          handleEditEvent(event);
        }}
      />

      {/* Moodle Sync Modal */}
      <MoodleConnectModal
        open={showMoodleModal}
        onClose={() => setShowMoodleModal(false)}
        onSyncComplete={() => {
          refetch();
        }}
      />

      {/* Secret Admin Purge Modal (Ctrl + Shift + Ñ) */}
      <PurgeEventsModal
        open={showPurgeModal}
        onClose={() => setShowPurgeModal(false)}
        events={events}
        onPurged={async () => {
          await refetch();
        }}
      />
    </div>
  );
}
