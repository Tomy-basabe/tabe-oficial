import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Play,
  Pause,
  RotateCcw,
  Settings,
  Coffee,
  BookOpen,
  
  Save,
  CheckSquare,
  PictureInPicture2,
  X,
  Timer,
  BellOff,
  Keyboard } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePomodoro, TimerMode } from "@/contexts/PomodoroContext";
import { PomodoroSettings } from "@/components/pomodoro/PomodoroSettings";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { SubjectStudyStats } from "@/components/pomodoro/SubjectStudyStats";
import { useSubjects } from "@/hooks/useSubjects";
import { TabeLogo } from "@/components/ui/TabeLogo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  year: number;
}

const modeConfig = {
  work: {
    label: "Foco",
    fullLabel: "Tiempo de Concentración",
    icon: BookOpen,
    strokeColor: "#f43f5e", // rose-500
    activeBadge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  shortBreak: {
    label: "Descanso Corto",
    fullLabel: "Pausa Breve",
    icon: Coffee,
    strokeColor: "#14b8a6", // teal-500
    activeBadge: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
  longBreak: {
    label: "Descanso Largo",
    fullLabel: "Pausa Extendida",
    icon: Coffee,
    strokeColor: "#f59e0b", // amber-500
    activeBadge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
};

const CIRCLE_RADIUS = 104;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~653.45

export default function Pomodoro() {
  const { user, isGuest } = useAuth();

  // Consume Global Context
  const {
    mode,
    timeLeft,
    isActive,
    isRinging,
    toggleTimer,
    resetTimer,
    stopAlarm,
    changeMode,
    formatTime,
    progress,
    selectedSubject,
    setSelectedSubject,
    completedPomodoros,
    settings: pomodoroSettings,
    updateSettings,
    isPipSupported,
    isPipActive,
    togglePip,
  } = usePomodoro();

  const { subjects: careerSubjects } = useSubjects();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [activeTaskTitle, setActiveTaskTitle] = useState<string | null>(null);

  // Atajo de teclado: Barra espaciadora para iniciar/pausar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable ||
            target.getAttribute("role") === "combobox")
        ) {
          return;
        }

        e.preventDefault();
        if (isRinging) {
          stopAlarm();
        } else {
          toggleTimer();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTimer, stopAlarm, isRinging]);

  const activeSubjects = useMemo(() => {
    if (!careerSubjects || careerSubjects.length === 0) return subjects;
    return careerSubjects
      .filter((s) => s.status !== "aprobada")
      .map((s) => ({
        id: s.id,
        nombre: s.nombre,
        codigo: s.codigo,
        year: s.año,
        status: s.status,
      }));
  }, [careerSubjects, subjects]);

  const approvedSubjects = useMemo(() => {
    if (!careerSubjects || careerSubjects.length === 0) return [];
    return careerSubjects
      .filter((s) => s.status === "aprobada")
      .map((s) => ({
        id: s.id,
        nombre: s.nombre,
        codigo: s.codigo,
        year: s.año,
        status: s.status,
      }));
  }, [careerSubjects]);

  const activeYears = useMemo(() => {
    const all = [...activeSubjects, ...approvedSubjects];
    const unique = [
      ...new Set(
        all
          .map((s) => Number(s.year))
          .filter((y) => !isNaN(y) && y > 0)
      ),
    ].sort((a, b) => a - b);
    return unique.filter((year) => all.some((s) => Number(s.year) === year));
  }, [activeSubjects, approvedSubjects]);

  useEffect(() => {
    if (yearFilter !== "all" && !activeYears.includes(Number(yearFilter))) {
      setYearFilter("all");
    }
  }, [activeYears, yearFilter]);

  // Parse query parameters (?subject=...&task=...)
  useEffect(() => {
    const subParam = searchParams.get("subject");
    const taskParam = searchParams.get("task");

    if (subParam) {
      setSelectedSubject(subParam);
    }

    if (taskParam && user) {
      supabase
        .from("study_tasks" as any)
        .select("id, titulo, subject_id")
        .eq("id", taskParam)
        .maybeSingle()
        .then(({ data }: any) => {
          if (data) {
            setActiveTaskTitle(data.titulo);
            if (data.subject_id) {
              setSelectedSubject(data.subject_id);
            }
          }
        });
    }
  }, [searchParams, user, setSelectedSubject]);

  useEffect(() => {
    if (!user && !isGuest) {
      setLoading(false);
      return;
    }
    fetchSubjects();
  }, [user, isGuest]);

  const fetchSubjects = async () => {
    if (!user || isGuest) return;
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, nombre, codigo, año")
        .eq("user_id", user.id)
        .order("nombre", { ascending: true });

      if (error) throw error;
      setSubjects(
        (data || []).map((s: any) => ({
          id: s.id,
          nombre: s.nombre,
          codigo: s.codigo,
          year: s.año,
        }))
      );
    } catch (error) {
      console.warn("Could not fetch subjects for Pomodoro:", error);
    } finally {
      setLoading(false);
    }
  };

  const config = modeConfig[mode];
  const Icon = config.icon;

  if (loading) {
    return (
      <LoadingScreen
        message="Cargando Pomodoro..."
        submessage="Preparando tu sala de estudio..."
      />
    );
  }

  const selectedSubjectObj = [...activeSubjects, ...approvedSubjects].find(
    (s) => s.id === selectedSubject
  );

  const cycleGoal = pomodoroSettings?.longBreakInterval || 4;
  const currentCycleInBlock = completedPomodoros % cycleGoal;

  return (
    <div className="tabe-page p-4 lg:p-8 space-y-6 pb-24 lg:pb-8 min-h-screen">
      {/* Header Notion/ChatGPT */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 p-5 sm:p-6 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center shrink-0">
            <Timer className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Técnica Pomodoro
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-normal">
              Estudia en bloques de concentración y descansa con precisión
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isActive && mode === "work" && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-pulse">
              <Save className="w-3.5 h-3.5" />
              <span>Guardando sesión...</span>
            </div>
          )}

          {isPipSupported && (
            <button
              onClick={togglePip}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors border shadow-2xs cursor-pointer",
                isPipActive
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold"
                  : "bg-white dark:bg-[#212121] border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
              )}
              title={
                isPipActive
                  ? "Cerrar ventana flotante (PiP)"
                  : "Minimizar a ventana flotante (Document PiP)"
              }
            >
              <PictureInPicture2 className="w-4 h-4 text-zinc-500" />
              <span>{isPipActive ? "PiP Activo" : "Ventana Flotante"}</span>
            </button>
          )}

          <button
            onClick={() => navigate("/tareas")}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#212121] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <CheckSquare className="w-4 h-4 text-zinc-500" />
            <span>Gestor de Tareas</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Ajustes</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timer Principal */}
        <div className="lg:col-span-2 rounded-xl p-6 sm:p-8 lg:p-10 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] shadow-2xs flex flex-col items-center justify-center relative">
          {/* Mode Selector Segmented Control */}
          <div className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl flex items-center gap-1 border border-zinc-200/60 dark:border-zinc-700/50 mb-8 sm:mb-10 max-w-full overflow-x-auto">
            {(Object.keys(modeConfig) as TimerMode[]).map((m) => {
              const mConfig = modeConfig[m];
              const MIcon = mConfig.icon;
              const isCurrent = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => changeMode(m)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap",
                    isCurrent
                      ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  {isCurrent && (
                    <motion.span
                      layoutId="pomodoro-mode-pill"
                      transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.7 }}
                      className="absolute inset-0 rounded-lg bg-white dark:bg-zinc-700 shadow-2xs"
                    />
                  )}
                  <MIcon className="relative z-10 w-4 h-4 text-zinc-500" />
                  <span className="relative z-10">{mConfig.label}</span>
                </button>
              );
            })}
          </div>

          {/* Timer Display Circular SVG */}
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 select-none">
              <svg
                viewBox="0 0 240 240"
                className="w-full h-full transform -rotate-90"
              >
                {/* Background Track */}
                <circle
                  cx="120"
                  cy="120"
                  r={CIRCLE_RADIUS}
                  fill="none"
                  stroke="currentColor"
                  className="text-zinc-100 dark:text-zinc-800/70"
                  strokeWidth="8"
                />
                {/* Dynamic Progress Stroke */}
                <circle
                  cx="120"
                  cy="120"
                  r={CIRCLE_RADIUS}
                  fill="none"
                  stroke={config.strokeColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={
                    CIRCUMFERENCE *
                    (1 - Math.min(100, Math.max(0, progress)) / 100)
                  }
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Timer Content Centered */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isRinging ? (
                  <>
                    <BellOff className="w-9 h-9 sm:w-11 sm:h-11 mb-2 text-rose-500 animate-bounce" />
                    <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-bold text-rose-600 dark:text-rose-400 tracking-tight animate-pulse">
                      ¡TIEMPO!
                    </span>
                    <span className="text-xs font-medium text-rose-500 mt-1 animate-pulse">
                      Alarma sonando
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 mb-1 text-zinc-400 dark:text-zinc-500">
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wider">
                        {config.label}
                      </span>
                    </div>

                    <span className="font-mono text-5xl sm:text-6xl lg:text-7xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight tabular-nums">
                      {formatTime(timeLeft)}
                    </span>

                    <div className="mt-2 flex items-center gap-1.5">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          isActive
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-zinc-300 dark:bg-zinc-600"
                        )}
                      />
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {isActive ? "En curso" : "En pausa"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mt-8 sm:mt-10 w-full">
              {/* Reset Button */}
              <button
                onClick={resetTimer}
                disabled={isRinging}
                className={cn(
                  "w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center justify-center shadow-2xs cursor-pointer",
                  isRinging && "opacity-30 cursor-not-allowed"
                )}
                title="Reiniciar cronómetro"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Main Play / Pause Button */}
              {isRinging ? (
                <button
                  onClick={stopAlarm}
                  className="px-8 py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm flex items-center gap-2.5 transition-all shadow-sm animate-pulse cursor-pointer"
                >
                  <BellOff className="w-5 h-5" />
                  <span>Detener Alarma</span>
                </button>
              ) : (
                <button
                  onClick={toggleTimer}
                  className={cn(
                    "h-14 px-8 rounded-full font-medium text-sm transition-all flex items-center gap-2.5 shadow-sm active:scale-[0.98] cursor-pointer",
                    isActive
                      ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700/60"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900"
                  )}
                >
                  {isActive ? (
                    <>
                      <Pause className="w-5 h-5" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span>Iniciar</span>
                    </>
                  )}
                </button>
              )}

              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(true)}
                disabled={isRinging}
                aria-label="Abrir ajustes"
                className={cn(
                  "w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center justify-center shadow-2xs cursor-pointer",
                  isRinging && "opacity-30 cursor-not-allowed"
                )}
                title="Configuración del temporizador"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* PiP Button */}
              {isPipSupported && (
                <button
                  onClick={togglePip}
                  disabled={isRinging}
                  aria-label="Ventana flotante"
                  title={
                    isPipActive
                      ? "Cerrar ventana flotante (PiP)"
                      : "Minimizar a ventana flotante"
                  }
                  className={cn(
                    "w-12 h-12 rounded-full border transition-colors flex items-center justify-center shadow-2xs cursor-pointer",
                    isPipActive
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30 font-semibold"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300",
                    isRinging && "opacity-30 cursor-not-allowed"
                  )}
                >
                  <PictureInPicture2 className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Pomodoro Cycles Counter & Spacebar Hint */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
              <div className="flex items-center gap-1.5">
                {[...Array(cycleGoal)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-7 h-2 rounded-full transition-all",
                      i < currentCycleInBlock
                        ? "bg-rose-500"
                        : "bg-zinc-200 dark:bg-zinc-800"
                    )}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {completedPomodoros} {completedPomodoros === 1 ? "ciclo completado" : "ciclos completados"} hoy
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500 ml-2">
                <Keyboard className="w-3 h-3" />
                Espacio para pausar
              </span>
            </div>
          </div>
        </div>

        {/* Barra Lateral / Sesión de Estudio */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Sesión de Estudio
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Asigna tu tiempo a una materia
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Filtro por Año */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                  Filtrar por año
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setYearFilter("all")}
                    className={cn(
                      "relative px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                      yearFilter === "all"
                        ? "text-white dark:text-zinc-900 font-semibold"
                        : "bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 border border-zinc-200/60 dark:border-zinc-700/50"
                    )}
                  >
                    {yearFilter === "all" && (
                      <motion.span
                        layoutId="pomodoro-year-pill"
                        transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.7 }}
                        className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-zinc-100 shadow-2xs"
                      />
                    )}
                    <span className="relative z-10">Todos</span>
                  </button>
                  {activeYears.map((year) => {
                    const isSelectedYear = yearFilter === year.toString();
                    return (
                      <button
                        key={year}
                        onClick={() => {
                          const val = year.toString();
                          setYearFilter(val);
                          if (selectedSubject) {
                            const all = [...activeSubjects, ...approvedSubjects];
                            const subj = all.find((s) => s.id === selectedSubject);
                            if (subj && subj.year.toString() !== val) {
                              setSelectedSubject(null);
                            }
                          }
                        }}
                        className={cn(
                          "relative px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                          isSelectedYear
                            ? "text-white dark:text-zinc-900 font-semibold"
                            : "bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 border border-zinc-200/60 dark:border-zinc-700/50"
                        )}
                      >
                        {isSelectedYear && (
                          <motion.span
                            layoutId="pomodoro-year-pill"
                            transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.7 }}
                            className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-zinc-100 shadow-2xs"
                          />
                        )}
                        <span className="relative z-10">{year}° Año</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Materia */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                  Materia
                </label>
                <Select
                  value={selectedSubject || "none"}
                  onValueChange={(val) =>
                    setSelectedSubject(val === "none" ? null : val)
                  }
                >
                  <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium shadow-2xs h-10">
                    <SelectValue placeholder="Sin materia específica" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#212121] border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg max-h-72">
                    <SelectItem
                      value="none"
                      textValue="Sin materia específica (Estudio Libre)"
                      className="text-xs font-medium cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <TabeLogo size={14} className="shrink-0 object-contain" />
                        <span>Sin materia específica (Estudio Libre)</span>
                      </span>
                    </SelectItem>

                    {activeSubjects.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-medium uppercase text-zinc-400 px-2 py-1.5 tracking-wider">
                          Materias en Cursada
                        </SelectLabel>
                        {activeSubjects
                          .filter(
                            (s) =>
                              yearFilter === "all" ||
                              s.year.toString() === yearFilter
                          )
                          .map((subject) => (
                            <SelectItem
                              key={subject.id}
                              value={subject.id}
                              className="text-xs font-medium cursor-pointer my-0.5"
                            >
                              {subject.nombre} ({subject.codigo})
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    )}

                    {approvedSubjects.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-medium uppercase text-emerald-600 dark:text-emerald-400 px-2 py-1.5 tracking-wider">
                          Materias Aprobadas
                        </SelectLabel>
                        {approvedSubjects
                          .filter(
                            (s) =>
                              yearFilter === "all" ||
                              s.year.toString() === yearFilter
                          )
                          .map((subject) => (
                            <SelectItem
                              key={subject.id}
                              value={subject.id}
                              className="text-xs font-medium cursor-pointer my-0.5"
                            >
                              {subject.nombre} ({subject.codigo})
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Indicador de Materia Activa */}
              {selectedSubjectObj && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-medium text-zinc-400 block uppercase tracking-wider">
                        Estudiando ahora
                      </span>
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                        {selectedSubjectObj.nombre}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSubject(null)}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Desvincular materia"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Banner de Tarea en Foco */}
              {activeTaskTitle && (
                <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-between gap-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-medium text-teal-700 dark:text-teal-300 block uppercase">
                        Tarea en foco
                      </span>
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate block">
                        {activeTaskTitle}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTaskTitle(null)}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Quitar tarea en foco"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sincronización en la nube */}
          <div className="rounded-xl p-4 border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  Sincronización en tiempo real
                </p>
                <p className="text-[11px] text-zinc-400">
                  Autoguardado persistente en Supabase
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Configuración Notion/ChatGPT */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#212121] border-zinc-200 dark:border-zinc-800 p-0 rounded-2xl overflow-hidden shadow-xl">
          <PomodoroSettings
            settings={pomodoroSettings}
            onSettingsChange={updateSettings}
            onClose={() => setShowSettings(false)}
            isRunning={isActive}
          />
        </DialogContent>
      </Dialog>

      {/* Horas de Estudio por Materia */}
      <div className="pt-2">
        <SubjectStudyStats />
      </div>
    </div>
  );
}
