import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Settings, Coffee, BookOpen, Target, Loader2, Save, Gamepad2, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { usePomodoro, TimerMode } from "@/contexts/PomodoroContext";
import { PomodoroSettings } from "@/components/pomodoro/PomodoroSettings";
import { Calendar, Filter, X } from "lucide-react";

interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  year: number;
}

const modeConfig = {
  work: {
    label: "Trabajo",
    icon: BookOpen,
    color: "text-black",
    bgColor: "bg-[#FF6B6B]",
    borderColor: "border-black",
  },
  shortBreak: {
    label: "Descanso Corto",
    icon: Coffee,
    color: "text-black",
    bgColor: "bg-[#4ECDC4]",
    borderColor: "border-black",
  },
  longBreak: {
    label: "Descanso Largo",
    icon: Target,
    color: "text-black",
    bgColor: "bg-[#FFE66D]",
    borderColor: "border-black",
  },
};

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
  } = usePomodoro();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>("all");

  // Still fetch subjects locally as that's UI data, not timer logic
  useEffect(() => {
    if (user || isGuest) {
      fetchSubjects();
    }
  }, [user, isGuest]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("subjects")
        .select("id, nombre, codigo, año")
        .order("nombre", { ascending: true });

      if (error) throw error;
      setSubjects((data || []).map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        codigo: s.codigo,
        year: s.año
      })));
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast.error("Error al cargar materias");
    } finally {
      setLoading(false);
    }
  };

  const config = modeConfig[mode];
  const Icon = config.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="tabe-page p-3 lg:p-8 space-y-4 lg:space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="relative overflow-hidden flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 bg-[#ff4747] border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-xl mb-6">
        {/* Decorative Element */}
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
          <Gamepad2 className="w-48 h-48 text-black" />
        </div>
        
        <div className="relative z-10">
          <h1 className="font-display text-3xl lg:text-4xl font-black uppercase tracking-tight text-black flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 lg:w-10 lg:h-10 text-black" />
            Pomodoro Global
          </h1>
          <p className="text-black font-bold uppercase tracking-wider mt-2 text-sm flex items-center gap-2">
            <Swords className="w-4 h-4" />
            ESTUDIÁ COMO JUGÁS. TÉCNICA POMODORO SINCRONIZADA.
          </p>
        </div>
        {isActive && mode === "work" && (
          <div className="relative z-10 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black bg-white px-4 py-2 border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000] animate-pulse">
            <Save className="w-4 h-4" />
            Guardando sesión...
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timer */}
        <div className="lg:col-span-2 rounded-xl p-4 sm:p-6 lg:p-10 border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] bg-background">
          {/* Mode Selector */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {(Object.keys(modeConfig) as TimerMode[]).map((m) => {
              const mConfig = modeConfig[m];
              return (
                <button
                  key={m}
                  onClick={() => changeMode(m)}
                  // disabled={isActive} // Allow changing mode even if active (context handles save)
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-black uppercase tracking-wider transition-all border-[3px] border-foreground",
                    mode === m
                      ? cn(mConfig.bgColor, mConfig.color, "shadow-[4px_4px_0_0_hsl(var(--foreground))] translate-y-[-2px]")
                      : "bg-muted text-muted-foreground hover:bg-muted/80 shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px]",
                    isActive && mode !== m && "opacity-50 hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-0"
                  )}
                >
                  {mConfig.label}
                </button>
              );
            })}
          </div>

          {/* Timer Display */}
          <div className="flex flex-col items-center">
            <div className="relative w-72 h-72 lg:w-80 lg:h-80 select-none">
              {/* Background Circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="12"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke={mode === "work" ? "#FF6B6B" : mode === "shortBreak" ? "#4ECDC4" : "#FFE66D"}
                  strokeWidth="12"
                  strokeLinecap="square"
                  strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                  strokeDashoffset={2 * Math.PI * 45 * (1 - progress / 100)}
                  className="transition-all duration-1000"
                />
              </svg>

              {/* Timer Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isRinging ? (
                  <>
                    <Target className={cn("w-10 h-10 mb-2 text-[#ff3366] animate-bounce")} />
                    <span className="font-display text-4xl lg:text-5xl font-black text-[#ff3366] tracking-tight uppercase animate-pulse">
                      ¡TIEMPO!
                    </span>
                    <span className="text-sm font-bold uppercase text-[#ff3366] tracking-wider mt-2 animate-pulse">
                      Alarma Sonando
                    </span>
                  </>
                ) : (
                  <>
                    <Icon className={cn("w-8 h-8 mb-2 text-foreground")} />
                    <span className="font-black text-5xl lg:text-7xl text-foreground tracking-tighter">
                      {formatTime(timeLeft)}
                    </span>
                    <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground mt-2">
                      {config.label}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 lg:gap-6 mt-8 sm:mt-10 w-full mb-4">
              <button
                onClick={resetTimer}
                disabled={isRinging}
                className={cn(
                  "p-4 rounded-xl border-[3px] border-foreground transition-all duration-200", 
                  isRinging ? "opacity-30 cursor-not-allowed" : "bg-muted text-foreground hover:bg-muted/80 shadow-[4px_4px_0_0_hsl(var(--foreground))] active:translate-y-[2px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                )}
              >
                <RotateCcw className="w-6 h-6 lg:w-7 lg:h-7" />
              </button>

              {isRinging ? (
                <button
                  onClick={stopAlarm}
                  className="px-8 py-6 rounded-2xl bg-[#ff3366] text-black border-4 border-foreground flex items-center gap-3 transition-all animate-pulse shadow-[8px_8px_0_0_hsl(var(--foreground))] active:translate-y-[4px] active:shadow-[4px_4px_0_0_hsl(var(--foreground))]"
                >
                  <Target className="w-7 h-7" />
                  <span className="font-black tracking-wider text-xl uppercase">APAGAR</span>
                </button>
              ) : (
                <button
                  onClick={toggleTimer}
                  className={cn(
                    "p-6 lg:p-8 rounded-2xl border-4 border-foreground transition-all duration-200",
                    isActive
                      ? "bg-[#ff3366] text-black shadow-[8px_8px_0_0_hsl(var(--foreground))] active:translate-y-[4px] active:shadow-[4px_4px_0_0_hsl(var(--foreground))]"
                      : cn(config.bgColor, config.color, "shadow-[8px_8px_0_0_hsl(var(--foreground))] active:translate-y-[4px] active:shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[10px_10px_0_0_hsl(var(--foreground))]")
                  )}
                >
                  {isActive ? (
                     <Pause className="w-10 h-10 lg:w-12 lg:h-12" />
                  ) : (
                    <Play className="w-10 h-10 lg:w-12 lg:h-12 ml-1" />
                  )}
                </button>
              )}

              <button
                onClick={() => setShowSettings(!showSettings)}
                disabled={isRinging}
                className={cn(
                  "p-4 rounded-xl border-[3px] border-foreground transition-all duration-200",
                  isRinging ? "opacity-30 cursor-not-allowed" : showSettings ? "bg-primary text-primary-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] translate-y-[2px]" : "bg-muted text-foreground hover:bg-muted/80 shadow-[4px_4px_0_0_hsl(var(--foreground))] active:translate-y-[2px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                )}
              >
                <Settings className="w-6 h-6 lg:w-7 lg:h-7" />
              </button>
            </div>


            {/* Pomodoros Counter */}
            <div className="mt-8 flex items-center gap-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 rounded-sm border-2 border-foreground transition-all",
                    i < completedPomodoros % 4
                      ? "bg-[#ffd21c] shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                      : "bg-muted"
                  )}
                />
              ))}
              <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-2">
                {completedPomodoros} hoy
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subject Selector */}
          <div className="rounded-xl p-6 tour-pomodoro-stats border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] bg-background">
            <h3 className="font-display font-black mb-6 flex items-center gap-2 text-xl tracking-tight">
              <BookOpen className="w-6 h-6 text-foreground" />
              SESIÓN DE ESTUDIO
            </h3>

            <div className="space-y-6">
              {/* Year Filter (Horizontal Button Group like Flashcards) */}
              <div className="space-y-3">
                <label className="text-xs font-black text-foreground uppercase tracking-wider ml-1">
                  FILTRAR POR AÑO
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setYearFilter("all");
                      // Optionally we don't reset subject if all is selected
                    }}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-bold transition-all border-[3px] border-foreground",
                      yearFilter === "all"
                        ? "bg-foreground text-background shadow-[4px_4px_0_0_hsl(var(--foreground))] translate-y-[-2px]"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                    )}
                  >
                    Todos
                  </button>
                  {[1, 2, 3, 4, 5, 6].map((year) => (
                    <button
                      key={year}
                      onClick={() => {
                        const val = year.toString();
                        setYearFilter(val);
                        if (selectedSubject) {
                          const subj = subjects.find(s => s.id === selectedSubject);
                          if (subj && subj.year.toString() !== val) {
                            setSelectedSubject(null);
                          }
                        }
                      }}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-bold transition-all border-[3px] border-foreground",
                        yearFilter === year.toString()
                          ? "bg-foreground text-background shadow-[4px_4px_0_0_hsl(var(--foreground))] translate-y-[-2px]"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                      )}
                    >
                      {year}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Selector (Styled Select like Flashcards) */}
              <div className="space-y-3">
                <label className="text-xs font-black text-foreground uppercase tracking-wider ml-1">
                  MATERIA
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none bg-foreground text-background border-l-[3px] border-foreground rounded-r-lg">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                  </div>
                  <select
                    value={selectedSubject || "none"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSubject(val === "none" ? null : val);
                    }}
                    className="w-full bg-background border-[3px] border-foreground p-3 pr-12 rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-foreground/20 transition-all appearance-none cursor-pointer shadow-[4px_4px_0_0_hsl(var(--foreground))]"
                  >
                    <option value="none">Sin materia específica</option>
                    {subjects
                      .filter(s => yearFilter === "all" || s.year.toString() === yearFilter)
                      .map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.nombre} ({subject.codigo})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Selection Status Indicator */}
              {selectedSubject && (
                <div className="mt-2 p-4 rounded-xl bg-[#ffd21c] border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] flex flex-col items-center gap-1 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-sm border-[1px] border-black bg-[#ff3366] animate-pulse" />
                    <span className="text-[10px] text-black font-black uppercase tracking-widest">Estudiando ahora</span>
                  </div>
                  <span className="font-display font-black text-black text-sm text-center line-clamp-2">
                    {subjects.find(s => s.id === selectedSubject)?.nombre}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="rounded-xl overflow-hidden border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] animate-in zoom-in-95 duration-200 bg-background">
              <PomodoroSettings
                settings={pomodoroSettings}
                onSettingsChange={updateSettings}
                onClose={() => setShowSettings(false)}
                isRunning={isActive}
              />
            </div>
          )}

          <div className="rounded-xl p-5 border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] bg-muted/30">
            <div className="flex items-center gap-3 justify-center mb-1">
              <div className="w-2 h-2 rounded-sm bg-[#00ff9d] border-[1px] border-black animate-pulse" />
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                Sincronización activa
              </p>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground text-center uppercase tracking-wider mt-2">
              Autoguardado cada 30s
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
