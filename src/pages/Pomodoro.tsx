
import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Settings, Coffee, BookOpen, Target, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { usePomodoro, TimerMode } from "@/contexts/PomodoroContext";
import { PomodoroSettings } from "@/components/pomodoro/PomodoroSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    color: "text-neon-cyan",
    bgColor: "bg-neon-cyan/20",
    borderColor: "border-neon-cyan",
  },
  shortBreak: {
    label: "Descanso Corto",
    icon: Coffee,
    color: "text-neon-green",
    bgColor: "bg-neon-green/20",
    borderColor: "border-neon-green",
  },
  longBreak: {
    label: "Descanso Largo",
    icon: Target,
    color: "text-neon-purple",
    bgColor: "bg-neon-purple/20",
    borderColor: "border-neon-purple",
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
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text">
            Pomodoro Global
          </h1>
          <p className="text-muted-foreground mt-1">
            Tu tiempo se sincroniza en toda la app 🍅
          </p>
        </div>
        {isActive && mode === "work" && (
          <div className="flex items-center gap-2 text-sm text-neon-green">
            <Save className="w-4 h-4 animate-pulse" />
            Guardando sesión...
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timer */}
        <div className="lg:col-span-2 card-gamer rounded-xl p-6 lg:p-10">
          {/* Mode Selector */}
          <div className="flex justify-center gap-2 mb-8">
            {(Object.keys(modeConfig) as TimerMode[]).map((m) => {
              const mConfig = modeConfig[m];
              return (
                <button
                  key={m}
                  onClick={() => changeMode(m)}
                  // disabled={isActive} // Allow changing mode even if active (context handles save)
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    mode === m
                      ? cn(mConfig.bgColor, mConfig.color, "border", mConfig.borderColor)
                      : "bg-secondary hover:bg-secondary/80",
                    isActive && mode !== m && "opacity-50"
                  )}
                >
                  {mConfig.label}
                </button>
              );
            })}
          </div>

          {/* Timer Display */}
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 lg:w-80 lg:h-80">
              {/* Background Circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="hsl(var(--secondary))"
                  strokeWidth="8"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke={`hsl(var(--${mode === "work" ? "neon-cyan" : mode === "shortBreak" ? "neon-green" : "neon-purple"}))`}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                  strokeDashoffset={2 * Math.PI * 45 * (1 - progress / 100)}
                  className="transition-all duration-1000"
                  style={{
                    filter: `drop-shadow(0 0 10px hsl(var(--${mode === "work" ? "neon-cyan" : mode === "shortBreak" ? "neon-green" : "neon-purple"})))`,
                  }}
                />
              </svg>

              {/* Timer Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isRinging ? (
                  <>
                    <Target className={cn("w-8 h-8 mb-2 text-neon-red animate-bounce")} />
                    <span className="font-display text-4xl lg:text-5xl font-bold text-neon-red text-glow-red tracking-widest uppercase animate-pulse">
                      ¡TIEMPO!
                    </span>
                    <span className="text-sm text-neon-red font-medium mt-2 animate-pulse">
                      Alarma Sonando
                    </span>
                  </>
                ) : (
                  <>
                    <Icon className={cn("w-8 h-8 mb-2", config.color)} />
                    <span className={cn(
                      "font-display text-5xl lg:text-6xl font-bold",
                      config.color,
                      "text-glow-cyan"
                    )}>
                      {formatTime(timeLeft)}
                    </span>
                    <span className="text-sm text-muted-foreground mt-2">
                      {config.label}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mt-8">
              <button
                onClick={resetTimer}
                disabled={isRinging}
                className={cn(
                  "p-3 rounded-xl transition-colors", 
                  isRinging ? "opacity-30 cursor-not-allowed" : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <RotateCcw className="w-6 h-6" />
              </button>

              {isRinging ? (
                <button
                  onClick={stopAlarm}
                  className="px-8 py-6 rounded-2xl bg-neon-red/20 text-neon-red hover:bg-neon-red/40 border border-neon-red glow-red flex items-center gap-3 transition-all animate-pulse shadow-[0_0_30px_rgba(255,51,102,0.3)]"
                >
                  <Target className="w-6 h-6" />
                  <span className="font-bold tracking-wider">APAGAR ALARMA</span>
                </button>
              ) : (
                <button
                  onClick={toggleTimer}
                  className={cn(
                    "p-6 rounded-2xl transition-all",
                    isActive
                      ? "bg-neon-red/20 text-neon-red hover:bg-neon-red/30"
                      : cn(config.bgColor, config.color, "hover:opacity-80"),
                    "glow-cyan"
                  )}
                >
                  {isActive ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8 ml-1" />
                  )}
                </button>
              )}

              <button
                onClick={() => setShowSettings(!showSettings)}
                disabled={isRinging}
                className={cn(
                  "p-3 rounded-xl transition-colors",
                  isRinging ? "opacity-30 cursor-not-allowed" : showSettings ? "bg-primary/20 text-primary" : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>


            {/* Pomodoros Counter */}
            <div className="mt-8 flex items-center gap-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 rounded-full transition-all",
                    i < completedPomodoros % 4
                      ? "bg-neon-gold glow-gold"
                      : "bg-secondary"
                  )}
                />
              ))}
              <span className="text-sm text-muted-foreground ml-2">
                {completedPomodoros} pomodoros hoy
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subject Selector */}
          <div className="card-gamer rounded-xl p-6 tour-pomodoro-stats border border-white/5 bg-black/40 backdrop-blur-xl">
            <h3 className="font-display font-semibold mb-6 flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5 text-neon-cyan" />
              Sesión de Estudio
            </h3>

            <div className="space-y-5">
              {/* Year Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider ml-1">
                  Filtrar por Año
                </label>
                <Select value={yearFilter} onValueChange={(val) => {
                  setYearFilter(val);
                  // Reset subject selection if it doesn't belong to the new year filter
                  if (val !== "all" && selectedSubject) {
                    const subj = subjects.find(s => s.id === selectedSubject);
                    if (subj && subj.year.toString() !== val) {
                      setSelectedSubject(null);
                    }
                  }
                }}>
                  <SelectTrigger className="w-full bg-secondary/50 border-white/10 hover:border-neon-cyan/50 transition-colors h-11">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-neon-cyan" />
                      <SelectValue placeholder="Seleccionar año" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl">
                    <SelectItem value="all">Todos los años</SelectItem>
                    {[...new Set(subjects.map(s => s.year))].sort().map(year => (
                      <SelectItem key={year} value={year.toString()}>Año {year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject Selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider ml-1">
                  Materia
                </label>
                <Select 
                  value={selectedSubject || "none"} 
                  onValueChange={(val) => setSelectedSubject(val === "none" ? null : val)}
                >
                  <SelectTrigger className="w-full bg-secondary/50 border-white/10 hover:border-neon-purple/50 transition-colors h-11">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-neon-purple" />
                      <SelectValue placeholder="Seleccionar materia" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl max-h-[300px]">
                    <SelectItem value="none">Sin materia específica</SelectItem>
                    {subjects
                      .filter(s => yearFilter === "all" || s.year.toString() === yearFilter)
                      .map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          <div className="flex flex-col py-0.5">
                            <span className="font-medium">{subject.nombre}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {subject.codigo} • Año {subject.year}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selection Status */}
              {selectedSubject && (
                <div className="mt-4 p-4 rounded-xl bg-neon-cyan/5 border border-neon-cyan/20 flex flex-col gap-1 items-center text-center animate-in fade-in slide-in-from-top-2 duration-300">
                  <span className="text-[10px] text-neon-cyan font-bold uppercase tracking-widest">Estudiando ahora</span>
                  <span className="font-display font-bold text-sm text-glow-cyan">
                    {subjects.find(s => s.id === selectedSubject)?.nombre}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="card-gamer rounded-xl overflow-hidden border border-white/5 animate-in zoom-in-95 duration-200">
              <PomodoroSettings
                settings={pomodoroSettings}
                onSettingsChange={updateSettings}
                onClose={() => setShowSettings(false)}
                isRunning={isActive}
              />
            </div>
          )}

          <div className="card-gamer rounded-xl p-5 border border-white/5 bg-black/20">
            <div className="flex items-center gap-3 justify-center mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              <p className="text-xs text-muted-foreground">
                Sincronización en tiempo real activa
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground/60 text-center">
              Tu progreso se guarda automáticamente cada 30 segundos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
