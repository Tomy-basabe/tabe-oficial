import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Settings, Coffee, BookOpen, Target, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type TimerMode = "work" | "shortBreak" | "longBreak";

interface Subject {
  id: string;
  nombre: string;
  codigo: string;
}

interface TodayStats {
  totalSeconds: number;
  pomodoros: number;
}

const defaultSettings = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
};

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
  const { user } = useAuth();
  const [mode, setMode] = useState<TimerMode>("work");
  const [timeLeft, setTimeLeft] = useState(defaultSettings.work * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<TodayStats>({ totalSeconds: 0, pomodoros: 0 });
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalTime = defaultSettings[mode] * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  // Fetch subjects and today's stats
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("id, nombre, codigo")
        .order("año", { ascending: true });

      if (subjectsError) throw subjectsError;
      setSubjects(subjectsData || []);

      // Fetch today's sessions
      const today = new Date().toISOString().split('T')[0];
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("study_sessions")
        .select("duracion_segundos, completada")
        .eq("fecha", today)
        .eq("tipo", "pomodoro");

      if (sessionsError) throw sessionsError;

      const totalSeconds = (sessionsData || []).reduce((acc, s) => acc + s.duracion_segundos, 0);
      const pomodoros = (sessionsData || []).filter(s => s.completada).length;
      
      setTodayStats({ totalSeconds, pomodoros });
      setCompletedPomodoros(pomodoros);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  // Auto-save session every 30 seconds while running
  useEffect(() => {
    if (isRunning && mode === "work" && elapsedSeconds > 0) {
      saveIntervalRef.current = setInterval(() => {
        saveCurrentSession(false);
      }, 30000);
    }

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [isRunning, mode, elapsedSeconds]);

  const saveCurrentSession = async (completed: boolean) => {
    if (!user || mode !== "work" || elapsedSeconds === 0) return;

    try {
      const { error } = await supabase
        .from("study_sessions")
        .insert({
          user_id: user.id,
          subject_id: selectedSubject,
          duracion_segundos: elapsedSeconds,
          tipo: "pomodoro",
          completada: completed,
          fecha: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      // Update user stats
      await updateUserStats(elapsedSeconds);

      // Update today's stats locally
      setTodayStats(prev => ({
        totalSeconds: prev.totalSeconds + elapsedSeconds,
        pomodoros: completed ? prev.pomodoros + 1 : prev.pomodoros,
      }));

      setElapsedSeconds(0);
      
      if (completed) {
        toast.success("¡Sesión de pomodoro completada! 🎉");
      }
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };

  const updateUserStats = async (seconds: number) => {
    if (!user) return;

    try {
      // Get current stats
      const { data: stats, error: fetchError } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      const hours = Math.floor(seconds / 3600);
      const xpGained = Math.floor(seconds / 60) * 2; // 2 XP per minute

      if (stats) {
        const { error } = await supabase
          .from("user_stats")
          .update({
            horas_estudio_total: stats.horas_estudio_total + hours,
            xp_total: stats.xp_total + xpGained,
          })
          .eq("user_id", user.id);

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error updating stats:", error);
    }
  };

  const handleTimerComplete = async () => {
    setIsRunning(false);
    
    if (mode === "work") {
      await saveCurrentSession(true);
      const newCount = completedPomodoros + 1;
      setCompletedPomodoros(newCount);
      
      // Play notification sound (optional)
      playNotificationSound();
      
      // Check if it's time for a long break
      if (newCount % defaultSettings.longBreakInterval === 0) {
        switchMode("longBreak");
      } else {
        switchMode("shortBreak");
      }
    } else {
      switchMode("work");
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleEIrg8TTq2oeCU2S0t2wfkwph9LTrWwcDVuO0d23hU8oj9LVq2kbEF2K0d+5h1Apj9TVqWgaEmGF0eC8ilIpjNTWpmcZFGKB0OK+jFQqidTXo2UYFmR90OS/jlYqhtTYoGMXGGZ50Oa+kFgrg9TZnWEXGmd10Oe9klorftTanaEYG2lx0Om8k1wrf9Tan2EZHWptzOq7lF0seNPbnmAZH2tryet9lV4sdtPcnWAaIGxoyet5l18uc9PenWAbIW1kyut1mWAucNPfnGEcIm5gy+tymmEubtPgnWIcI25cy+pvnGIubNThnmMdJG5Yy+psnWMua9TinmQeJW9UzOpqn2Quade");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      // Audio not supported
    }
  };

  const switchMode = (newMode: TimerMode) => {
    // Save current session if switching away from work
    if (mode === "work" && isRunning && elapsedSeconds > 0) {
      saveCurrentSession(false);
    }
    
    setMode(newMode);
    setTimeLeft(defaultSettings[newMode] * 60);
    setIsRunning(false);
    setElapsedSeconds(0);
    setSessionStartTime(null);
  };

  const toggleTimer = () => {
    if (!isRunning) {
      setSessionStartTime(new Date());
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = async () => {
    // Save partial session before reset
    if (mode === "work" && elapsedSeconds > 60) { // Only save if > 1 minute
      await saveCurrentSession(false);
    }
    
    setIsRunning(false);
    setTimeLeft(defaultSettings[mode] * 60);
    setElapsedSeconds(0);
    setSessionStartTime(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
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
            Pomodoro Timer
          </h1>
          <p className="text-muted-foreground mt-1">
            Técnica de productividad para maximizar tu enfoque
          </p>
        </div>
        {isRunning && mode === "work" && (
          <div className="flex items-center gap-2 text-sm text-neon-green">
            <Save className="w-4 h-4 animate-pulse" />
            Guardando automáticamente...
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
                  onClick={() => switchMode(m)}
                  disabled={isRunning}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    mode === m
                      ? cn(mConfig.bgColor, mConfig.color, "border", mConfig.borderColor)
                      : "bg-secondary hover:bg-secondary/80",
                    isRunning && "opacity-50 cursor-not-allowed"
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
                {mode === "work" && elapsedSeconds > 0 && (
                  <span className="text-xs text-muted-foreground mt-1">
                    +{formatDuration(elapsedSeconds)} esta sesión
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mt-8">
              <button
                onClick={resetTimer}
                className="p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
              <button
                onClick={toggleTimer}
                className={cn(
                  "p-6 rounded-2xl transition-all",
                  isRunning
                    ? "bg-neon-red/20 text-neon-red hover:bg-neon-red/30"
                    : cn(config.bgColor, config.color, "hover:opacity-80"),
                  "glow-cyan"
                )}
              >
                {isRunning ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </button>
              <button className="p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
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
          <div className="card-gamer rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Materia Actual</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <button
                onClick={() => setSelectedSubject(null)}
                disabled={isRunning}
                className={cn(
                  "w-full p-3 rounded-lg text-left text-sm transition-all",
                  selectedSubject === null
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-secondary hover:bg-secondary/80",
                  isRunning && "opacity-50 cursor-not-allowed"
                )}
              >
                Sin materia específica
              </button>
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  disabled={isRunning}
                  className={cn(
                    "w-full p-3 rounded-lg text-left text-sm transition-all",
                    selectedSubject === subject.id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-secondary hover:bg-secondary/80",
                    isRunning && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="font-medium">{subject.codigo}</span>
                  <span className="text-muted-foreground ml-2">{subject.nombre}</span>
                </button>
              ))}
              {subjects.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay materias cargadas
                </p>
              )}
            </div>
          </div>

          {/* Today's Stats */}
          <div className="card-gamer rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Hoy</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Tiempo estudiado</span>
                <span className="font-display font-bold text-neon-cyan">
                  {formatDuration(todayStats.totalSeconds + elapsedSeconds)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Pomodoros</span>
                <span className="font-display font-bold text-neon-gold">{todayStats.pomodoros}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Objetivo diario</span>
                <span className="font-display font-bold text-neon-green">
                  {todayStats.pomodoros}/6
                </span>
              </div>
              <div className="progress-gamer h-2 mt-2">
                <div 
                  className="progress-gamer-bar transition-all" 
                  style={{ width: `${Math.min((todayStats.pomodoros / 6) * 100, 100)}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Quick Settings */}
          <div className="card-gamer rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Configuración</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Trabajo</span>
                <span>{defaultSettings.work} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Descanso corto</span>
                <span>{defaultSettings.shortBreak} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Descanso largo</span>
                <span>{defaultSettings.longBreak} min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
