
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDateStr } from "@/lib/utils";

export type TimerMode = "work" | "shortBreak" | "longBreak";
export type SoundType = "classic" | "zen" | "arcade";

export interface PomodoroSettings {
    work: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
    soundType: SoundType;
    continuousAlarm: boolean;
}

const STORAGE_KEY = "pomodoro-settings";

const DEFAULT_SETTINGS: PomodoroSettings = {
    work: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakInterval: 4,
    soundType: 'classic',
    continuousAlarm: false,
};

const loadSettings = (): PomodoroSettings => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch { /* fallback */ }
    return DEFAULT_SETTINGS;
};

const getMinutesForMode = (mode: TimerMode, settings: PomodoroSettings): number => {
    return settings[mode];
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
    isRinging: boolean;
    soundEnabled: boolean;
    selectedSubject: string | null;
    toggleTimer: () => void;
    resetTimer: () => void;
    stopAlarm: () => void;
    changeMode: (mode: TimerMode) => void;
    setSoundEnabled: (enabled: boolean) => void;
    setSelectedSubject: (id: string | null) => void;
    formatTime: (seconds: number) => string;
    progress: number;
    completedPomodoros: number;
    settings: PomodoroSettings;
    updateSettings: (newSettings: PomodoroSettings) => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: ReactNode }) {
    const { user, isGuest } = useAuth();
    const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>(loadSettings);
    const [mode, setMode] = useState<TimerMode>("work");
    const [timeLeft, setTimeLeft] = useState(pomodoroSettings.work * 60);
    const [isActive, setIsActive] = useState(false);
    const [isRinging, setIsRinging] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [completedPomodoros, setCompletedPomodoros] = useState(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load today's stats on init
    useEffect(() => {
        if (isGuest) {
            setCompletedPomodoros(2); // Mock completed pomodoros for guests
            return;
        }
        if (user) {
            const fetchToday = async () => {
                const today = toLocalDateStr();
                const { data } = await supabase.from("study_sessions").select("completada").eq("fecha", today).eq("tipo", "pomodoro").eq("user_id", user.id);
                if (data) setCompletedPomodoros(data.filter(s => s.completada).length);
            };
            fetchToday();
        }
    }, [user]);

    // Listen for localStorage changes from Settings page
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                try {
                    const newSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(e.newValue) };
                    setPomodoroSettings(newSettings);
                    if (!isActive) {
                        setTimeLeft(getMinutesForMode(mode, newSettings) * 60);
                    }
                } catch { /* ignore */ }
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [isActive, mode]);

    const updateSettings = (newSettings: PomodoroSettings) => {
        setPomodoroSettings(newSettings);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        if (!isActive) {
            setTimeLeft(getMinutesForMode(mode, newSettings) * 60);
        }
    };

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
        if (isGuest) {
            if (completed) {
                setCompletedPomodoros(prev => prev + 1);
            }
            setElapsedSeconds(0);
            return;
        }

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
                    fecha: toLocalDateStr(),
                });

            if (error) throw error;

            // Update user stats (XP)
            const hours = Math.floor(elapsedSeconds / 3600);
            let xpGained = Math.floor(elapsedSeconds / 60) * 2;

            const { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", user.id).single();
            if (stats) {
                const currentStats = stats as any;

                // Check for active XP multiplier
                if (currentStats.xp_multiplier && currentStats.xp_multiplier > 1) {
                    const endDate = currentStats.xp_multiplier_ends_at ? new Date(currentStats.xp_multiplier_ends_at) : null;
                    if (endDate && endDate > new Date()) {
                        xpGained = Math.floor(xpGained * currentStats.xp_multiplier);
                        toast.info(`¡XP Boost activo! Ganaste ${xpGained} XP (x${currentStats.xp_multiplier})`);
                    }
                }

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

    // Reliable alarm using Web Audio API (no external dependencies)
    const playAlarm = useCallback(() => {
        const type = pomodoroSettings.soundType || 'classic';
        const isContinuous = pomodoroSettings.continuousAlarm || false;

        const playSequence = () => {
            try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                
                const playTone = (time: number, freq: number, duration: number, type: OscillatorType = 'sine') => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = type;
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.3, time);
                    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
                    osc.start(time);
                    osc.stop(time + duration);
                };

                const now = ctx.currentTime;

                if (type === 'classic') {
                    // 3 beeps
                    playTone(now, 880, 0.2, 'square');
                    playTone(now + 0.3, 1100, 0.2, 'square');
                    playTone(now + 0.6, 1320, 0.3, 'square');
                } else if (type === 'zen') {
                    // Soft, long sustaining bowl/bell
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(432, now); // Healing frequency
                    gain.gain.setValueAtTime(0, now);
                    gain.gain.linearRampToValueAtTime(0.4, now + 0.5); // Slow attack
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 5.0); // Long decay
                    osc.start(now);
                    osc.stop(now + 6.0);
                } else if (type === 'arcade') {
                    // Fast arpeggio
                    playTone(now, 440, 0.1, 'sawtooth');
                    playTone(now + 0.1, 554, 0.1, 'sawtooth');
                    playTone(now + 0.2, 659, 0.1, 'sawtooth');
                    playTone(now + 0.3, 880, 0.3, 'sawtooth');
                }

                // Auto suspend ctx to save resources after sequence finishes
                setTimeout(() => { if (ctx.state !== 'closed') ctx.close(); }, 7000);
            } catch (e) {
                console.error("Audio error", e);
            }
        };

        // Play once initially
        playSequence();

        // If continuous, set up loop
        if (isContinuous) {
            setIsRinging(true);
            const intervalTime = type === 'zen' ? 7000 : 3000;
            alarmIntervalRef.current = setInterval(() => {
                playSequence();
            }, intervalTime);
        }

    }, [pomodoroSettings]);

    const stopAlarm = useCallback(() => {
        setIsRinging(false);
        if (alarmIntervalRef.current) {
            clearInterval(alarmIntervalRef.current);
            alarmIntervalRef.current = null;
        }
    }, []);

    // Clean up interval on unmount
    useEffect(() => {
        return () => {
            if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
        };
    }, []);

    const handleTimerComplete = () => {
        setIsActive(false);
        if (soundEnabled) {
            playAlarm();
        }

        if (mode === "work") {
            saveCurrentSession(true);
            toast.success(`Pomodoro terminado!`, {
                description: MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)],
            });
        } else {
            toast.info("Descanso terminado. ¡A volver!");
            setMode("work");
            setTimeLeft(pomodoroSettings.work * 60);
        }
    };

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        if (mode === "work" && elapsedSeconds > 60) saveCurrentSession(false);
        setIsActive(false);
        stopAlarm();
        setTimeLeft(getMinutesForMode(mode, pomodoroSettings) * 60);
        setElapsedSeconds(0);
    };

    const changeMode = (newMode: TimerMode) => {
        if (mode === "work" && isActive && elapsedSeconds > 0) saveCurrentSession(false);
        setMode(newMode);
        setIsActive(false);
        stopAlarm();
        setTimeLeft(getMinutesForMode(newMode, pomodoroSettings) * 60);
        setElapsedSeconds(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const totalTime = getMinutesForMode(mode, pomodoroSettings) * 60;
    const progress = ((totalTime - timeLeft) / totalTime) * 100;

    return (
        <PomodoroContext.Provider value={{
            mode,
            timeLeft,
            isActive,
            isRinging,
            soundEnabled,
            selectedSubject,
            toggleTimer,
            resetTimer,
            stopAlarm,
            changeMode,
            setSoundEnabled,
            setSelectedSubject,
            formatTime,
            progress,
            completedPomodoros,
            settings: pomodoroSettings,
            updateSettings,
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
