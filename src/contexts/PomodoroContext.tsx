
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TimerMode = "work" | "shortBreak" | "longBreak";

const TIMER_MODES = {
    work: { label: "Trabajo", minutes: 25 }, // Changed 'focus' to 'work' to match page logic
    shortBreak: { label: "Descanso Corto", minutes: 5 },
    longBreak: { label: "Descanso Largo", minutes: 15 },
};

const MOTIVATIONAL_QUOTES = [
    "¡Dale que sos ingeniero!",
    "El dolor es temporal, el título es para siempre.",
    "Un Pomodoro más, una materia menos.",
    "Concentración total. Modo Dios activado.",
    "Si fuera fácil, cualquiera lo haría.",
];

interface PomodoroContextType {
    mode: TimerMode;
    timeLeft: number;
    isActive: boolean;
    soundEnabled: boolean;
    selectedSubject: string | null;
    toggleTimer: () => void;
    resetTimer: () => void;
    changeMode: (mode: TimerMode) => void;
    setSoundEnabled: (enabled: boolean) => void;
    setSelectedSubject: (id: string | null) => void;
    formatTime: (seconds: number) => string;
    progress: number;
    completedPomodoros: number;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [mode, setMode] = useState<TimerMode>("work");
    const [timeLeft, setTimeLeft] = useState(TIMER_MODES.work.minutes * 60);
    const [isActive, setIsActive] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [completedPomodoros, setCompletedPomodoros] = useState(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load today's stats on init
    useEffect(() => {
        if (user) {
            const fetchToday = async () => {
                const today = new Date().toISOString().split('T')[0];
                const { data } = await supabase.from("study_sessions").select("completada").eq("fecha", today).eq("tipo", "pomodoro").eq("user_id", user.id);
                if (data) setCompletedPomodoros(data.filter(s => s.completada).length);
            };
            fetchToday();
        }
    }, [user]);

    // Timer Tick
    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            handleTimerComplete();
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, timeLeft]);

    // Auto-save logic (every 30s)
    useEffect(() => {
        if (isActive && mode === "work" && elapsedSeconds > 0) {
            saveIntervalRef.current = setInterval(() => {
                saveCurrentSession(false);
            }, 30000);
        }
        return () => {
            if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
        };
    }, [isActive, mode, elapsedSeconds, user]);


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

            // Update user stats (XP)
            const hours = Math.floor(elapsedSeconds / 3600);
            const xpGained = Math.floor(elapsedSeconds / 60) * 2;

            const { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", user.id).single();
            if (stats) {
                const currentStats = stats as any;
                await supabase.from("user_stats").update({
                    horas_estudio_total: currentStats.horas_estudio_total + hours,
                    xp_total: currentStats.xp_total + xpGained,
                    credits: (currentStats.credits || 0) + Math.floor(elapsedSeconds / 60), // 1 Credit per minute
                }).eq("user_id", user.id);
            }

            setElapsedSeconds(0);
            if (completed) {
                setCompletedPomodoros(prev => prev + 1);
            }
        } catch (e) { console.error("Save error", e); }
    };

    const handleTimerComplete = () => {
        setIsActive(false);
        if (soundEnabled) {
            const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
            audio.play().catch(e => console.error("Audio error", e));
        }

        if (mode === "work") {
            saveCurrentSession(true);
            toast.success(`Pomodoro terminado!`, {
                description: MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)],
            });
            // Auto switch logic could go here, but keep it manual for now or auto-suggest
        } else {
            toast.info("Descanso terminado. ¡A volver!");
            setMode("work");
            setTimeLeft(TIMER_MODES.work.minutes * 60);
        }
    };

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        if (mode === "work" && elapsedSeconds > 60) saveCurrentSession(false);
        setIsActive(false);
        setTimeLeft(TIMER_MODES[mode].minutes * 60);
        setElapsedSeconds(0);
    };

    const changeMode = (newMode: TimerMode) => {
        if (mode === "work" && isActive && elapsedSeconds > 0) saveCurrentSession(false);
        setMode(newMode);
        setIsActive(false);
        setTimeLeft(TIMER_MODES[newMode].minutes * 60);
        setElapsedSeconds(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const totalTime = TIMER_MODES[mode].minutes * 60;
    const progress = ((totalTime - timeLeft) / totalTime) * 100;

    return (
        <PomodoroContext.Provider value={{
            mode,
            timeLeft,
            isActive,
            soundEnabled,
            selectedSubject,
            toggleTimer,
            resetTimer,
            changeMode,
            setSoundEnabled,
            setSelectedSubject,
            formatTime,
            progress,
            completedPomodoros
        }}>
            {children}
        </PomodoroContext.Provider>
    );
}

export function usePomodoro() {
    const context = useContext(PomodoroContext);
    if (context === undefined) {
        throw new Error('usePomodoro must be used within a PomodoroProvider');
    }
    return context;
}
