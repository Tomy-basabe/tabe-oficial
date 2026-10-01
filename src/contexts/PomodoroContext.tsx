/* REGLA ARQUITECTÓNICA: NINGÚN COMPONENTE VISUAL, HOOK O FUNCIONALIDAD PÚBLICA DEBE CONDICIONARSE AL ROL ADMIN. TODOS LOS USUARIOS USAN LA MISMA UI Y LÓGICA DE NEGOCIO SALVO LA RUTA PRIVADA /admin */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDateStr } from "@/lib/utils";
import { PomodoroPipWidget } from "@/components/pomodoro/PomodoroPipWidget";

export type TimerMode = "work" | "shortBreak" | "longBreak";
export type SoundType = "classic" | "zen" | "arcade";
export type PomodoroStatus = "idle" | "running" | "paused" | "completed";

export interface PomodoroSettings {
    work: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
    soundType: SoundType;
    continuousAlarm: boolean;
    autoPip: boolean;
}

interface StoredTimerState {
    status: PomodoroStatus;
    mode: TimerMode;
    remainingSeconds: number;
    targetEndTime: number | null;
    selectedSubject: string | null;
    elapsedSeconds: number;
    lastSavedAt: number;
}

const STORAGE_KEY = "pomodoro-settings";
const STATE_STORAGE_KEY = "pomodoro_timer_state";
const CLOUD_SETTINGS_KEY = "pomodoro_settings";

const DEFAULT_SETTINGS: PomodoroSettings = {
    work: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakInterval: 4,
    soundType: 'classic',
    continuousAlarm: false,
    autoPip: true,
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

const loadStoredTimerState = (settings: PomodoroSettings): {
    status: PomodoroStatus;
    mode: TimerMode;
    timeLeft: number;
    targetEndTime: number | null;
    selectedSubject: string | null;
    elapsedSeconds: number;
} => {
    try {
        const raw = localStorage.getItem(STATE_STORAGE_KEY);
        if (raw) {
            const parsed: StoredTimerState = JSON.parse(raw);
            const mode = parsed.mode || "work";
            const defaultTime = getMinutesForMode(mode, settings) * 60;

            if (parsed.status === "paused") {
                const remaining = typeof parsed.remainingSeconds === "number" && parsed.remainingSeconds > 0
                    ? parsed.remainingSeconds
                    : defaultTime;
                return {
                    status: "paused",
                    mode,
                    timeLeft: remaining,
                    targetEndTime: null,
                    selectedSubject: parsed.selectedSubject || null,
                    elapsedSeconds: parsed.elapsedSeconds || 0,
                };
            } else if (parsed.status === "running" && parsed.targetEndTime) {
                const now = Date.now();
                const secondsLeft = Math.max(0, Math.ceil((parsed.targetEndTime - now) / 1000));
                if (secondsLeft > 0) {
                    return {
                        status: "running",
                        mode,
                        timeLeft: secondsLeft,
                        targetEndTime: parsed.targetEndTime,
                        selectedSubject: parsed.selectedSubject || null,
                        elapsedSeconds: parsed.elapsedSeconds || 0,
                    };
                } else {
                    return {
                        status: "completed",
                        mode,
                        timeLeft: 0,
                        targetEndTime: null,
                        selectedSubject: parsed.selectedSubject || null,
                        elapsedSeconds: parsed.elapsedSeconds || 0,
                    };
                }
            }
        }
    } catch { /* ignore fallback */ }

    return {
        status: "idle",
        mode: "work",
        timeLeft: settings.work * 60,
        targetEndTime: null,
        selectedSubject: null,
        elapsedSeconds: 0,
    };
};

const MOTIVATIONAL_QUOTES = [
    "¡Dale que sos ingeniero!",
    "El dolor es temporal, el título es para siempre.",
    "Un Pomodoro más, una materia menos.",
    "Concentración total. Modo Dios activado.",
    "Si fuera fácil, cualquiera lo haría.",
];

interface PomodoroContextType {
    status: PomodoroStatus;
    mode: TimerMode;
    timeLeft: number;
    isActive: boolean;
    isPaused: boolean;
    isRinging: boolean;
    soundEnabled: boolean;
    selectedSubject: string | null;
    toggleTimer: () => void;
    startTimer: () => void;
    pauseTimer: () => void;
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
    isPipSupported: boolean;
    isPipActive: boolean;
    openPip: () => Promise<void>;
    closePip: () => void;
    togglePip: () => Promise<void>;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: ReactNode }) {
    const { user, isGuest } = useAuth();
    const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>(loadSettings);

    // Initial state restored safely from localStorage
    const initialTimer = loadStoredTimerState(pomodoroSettings);
    const [status, setStatus] = useState<PomodoroStatus>(initialTimer.status);
    const [mode, setMode] = useState<TimerMode>(initialTimer.mode);
    const [timeLeft, setTimeLeft] = useState<number>(initialTimer.timeLeft);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(initialTimer.selectedSubject);
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(initialTimer.elapsedSeconds);

    const [isRinging, setIsRinging] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [completedPomodoros, setCompletedPomodoros] = useState(0);

    // Refs for synchronization across ticks and background handlers
    const targetEndTimeRef = useRef<number | null>(initialTimer.targetEndTime);
    const statusRef = useRef<PomodoroStatus>(initialTimer.status);
    const modeRef = useRef<TimerMode>(initialTimer.mode);
    const timeLeftRef = useRef<number>(initialTimer.timeLeft);
    const elapsedSecondsRef = useRef<number>(initialTimer.elapsedSeconds);
    const selectedSubjectRef = useRef<string | null>(initialTimer.selectedSubject);
    const pomodoroSettingsRef = useRef<PomodoroSettings>(pomodoroSettings);

    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { modeRef.current = mode; }, [mode]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
    useEffect(() => { elapsedSecondsRef.current = elapsedSeconds; }, [elapsedSeconds]);
    useEffect(() => { selectedSubjectRef.current = selectedSubject; }, [selectedSubject]);
    useEffect(() => { pomodoroSettingsRef.current = pomodoroSettings; }, [pomodoroSettings]);

    // Document Picture-in-Picture (PiP) State & Refs
    const isPipSupported = typeof window !== "undefined" && "documentPictureInPicture" in window;
    const [isPipActive, setIsPipActive] = useState(false);
    const [pipWindow, setPipWindow] = useState<Window | null>(null);
    const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);
    const pipWindowRef = useRef<Window | null>(null);
    const isOpeningPipRef = useRef(false);
    const silentAudioRef = useRef<HTMLAudioElement | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Audio loop silencioso para mantener vivo el hilo multimedia en navegadores Chromium
    useEffect(() => {
        const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
        audio.loop = true;
        audio.volume = 0.001;
        silentAudioRef.current = audio;

        return () => {
            audio.pause();
            silentAudioRef.current = null;
        };
    }, []);

    // Helper: guardar estado del timer en localStorage
    const persistTimerState = useCallback((
        newStatus: PomodoroStatus,
        newRemaining: number,
        targetTime: number | null = null,
        newMode?: TimerMode
    ) => {
        try {
            const currentMode = newMode || modeRef.current;
            if (newStatus === "idle") {
                localStorage.removeItem(STATE_STORAGE_KEY);
                return;
            }
            const data: StoredTimerState = {
                status: newStatus,
                mode: currentMode,
                remainingSeconds: newRemaining,
                targetEndTime: newStatus === "running" ? targetTime : null,
                selectedSubject: selectedSubjectRef.current,
                elapsedSeconds: elapsedSecondsRef.current,
                lastSavedAt: Date.now(),
            };
            localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(data));
        } catch { /* ignore */ }
    }, []);

    // Cargar estadísticas del día
    useEffect(() => {
        if (isGuest) {
            setCompletedPomodoros(2);
            return;
        }
        if (user) {
            const fetchToday = async () => {
                const today = toLocalDateStr();
                const { data } = await supabase
                    .from("study_sessions")
                    .select("completada")
                    .eq("fecha", today)
                    .eq("tipo", "pomodoro")
                    .eq("user_id", user.id);
                if (data) setCompletedPomodoros(data.filter(s => s.completada).length);
            };
            fetchToday();
        }
    }, [user, isGuest]);

    // Sincronizar configuración en la nube sin afectar timers en pausa o corriendo
    useEffect(() => {
        if (!user || isGuest) return;

        const cloudSettings = user.user_metadata?.[CLOUD_SETTINGS_KEY];
        if (!cloudSettings || typeof cloudSettings !== "object") return;

        const nextSettings = { ...DEFAULT_SETTINGS, ...cloudSettings } as PomodoroSettings;
        setPomodoroSettings(nextSettings);

        // REGLA CRÍTICA: Solo actualizar timeLeft si el timer está 'idle'. NUNCA si está 'paused' o 'running'.
        if (statusRef.current === "idle") {
            const newMinutes = getMinutesForMode(modeRef.current, nextSettings) * 60;
            setTimeLeft(newMinutes);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
    }, [user, isGuest]);

    // Escuchar cambios de configuración desde otras pestañas/páginas
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                try {
                    const newSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(e.newValue) };
                    setPomodoroSettings(newSettings);
                    // Solo resetear si está idle
                    if (statusRef.current === "idle") {
                        setTimeLeft(getMinutesForMode(modeRef.current, newSettings) * 60);
                    }
                } catch { /* ignore */ }
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const updateSettings = (newSettings: PomodoroSettings) => {
        setPomodoroSettings(newSettings);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        if (statusRef.current === "idle") {
            setTimeLeft(getMinutesForMode(mode, newSettings) * 60);
        }

        if (user && !isGuest) {
            supabase.auth.updateUser({
                data: { [CLOUD_SETTINGS_KEY]: newSettings },
            }).catch(() => {});
        }
    };

    // Guardar sesión de estudio completada o parcial en la base de datos
    const saveCurrentSession = async (completed: boolean) => {
        if (isGuest) {
            if (completed) {
                setCompletedPomodoros(prev => prev + 1);
            }
            setElapsedSeconds(0);
            return;
        }

        const currentElapsed = elapsedSecondsRef.current;
        if (!user || modeRef.current !== "work" || currentElapsed === 0) return;

        try {
            const sessionDate = toLocalDateStr();
            const { error } = await supabase
                .from("study_sessions")
                .insert({
                    user_id: user.id,
                    subject_id: selectedSubjectRef.current,
                    duracion_segundos: currentElapsed,
                    tipo: "pomodoro",
                    completada: completed,
                    fecha: sessionDate,
                });

            if (error) throw error;

            const hours = Math.floor(currentElapsed / 3600);
            let xpGained = Math.floor(currentElapsed / 60) * 2;

            const { data: stats } = await supabase
                .from("user_stats")
                .select("id, horas_estudio_total, xp_total, credits, xp_multiplier, xp_multiplier_ends_at")
                .eq("user_id", user.id)
                .single();

            if (stats) {
                const currentStats = stats as any;
                if (currentStats.xp_multiplier && currentStats.xp_multiplier > 1) {
                    const endDate = currentStats.xp_multiplier_ends_at ? new Date(currentStats.xp_multiplier_ends_at) : null;
                    if (endDate && endDate > new Date()) {
                        xpGained = Math.floor(xpGained * currentStats.xp_multiplier);
                        toast.info(`¡XP Boost activo! Ganaste ${xpGained} XP (x${currentStats.xp_multiplier})`);
                    }
                }

                await supabase.from("user_stats").update({
                    horas_estudio_total: (currentStats.horas_estudio_total || 0) + hours,
                    xp_total: (currentStats.xp_total || 0) + xpGained,
                    credits: (currentStats.credits || 0) + Math.floor(currentElapsed / 60),
                }).eq("user_id", user.id);
            }

            setElapsedSeconds(0);
            if (completed) {
                setCompletedPomodoros(prev => prev + 1);
            }
        } catch (e) {
            console.error("Save session error:", e);
        }
    };

    // Alarma Web Audio API
    const playAlarm = useCallback(() => {
        const type = pomodoroSettingsRef.current.soundType || 'classic';
        const isContinuous = pomodoroSettingsRef.current.continuousAlarm || false;

        const playSequence = () => {
            try {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                if (!AudioCtx) return;
                const ctx = new AudioCtx();

                const playTone = (time: number, freq: number, duration: number, oscType: OscillatorType = 'sine') => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = oscType;
                    osc.frequency.setValueAtTime(freq, time);
                    gain.gain.setValueAtTime(0, time);
                    gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(time);
                    osc.stop(time + duration);
                };

                const now = ctx.currentTime;
                if (type === 'arcade') {
                    playTone(now, 523.25, 0.1, 'square');
                    playTone(now + 0.1, 659.25, 0.1, 'square');
                    playTone(now + 0.2, 783.99, 0.15, 'square');
                    playTone(now + 0.35, 1046.50, 0.3, 'square');
                } else if (type === 'zen') {
                    playTone(now, 432, 1.5, 'sine');
                    playTone(now + 0.8, 540, 2.0, 'sine');
                } else {
                    playTone(now, 880, 0.15, 'sine');
                    playTone(now + 0.2, 880, 0.15, 'sine');
                    playTone(now + 0.4, 880, 0.3, 'sine');
                }

                setTimeout(() => {
                    ctx.close().catch(() => {});
                }, 3000);
            } catch (err) {
                console.warn("Error playing alarm audio:", err);
            }
        };

        setIsRinging(true);
        playSequence();

        if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
        if (isContinuous) {
            alarmIntervalRef.current = setInterval(playSequence, 4000);
        }
    }, []);

    const stopAlarm = useCallback(() => {
        setIsRinging(false);
        if (alarmIntervalRef.current) {
            clearInterval(alarmIntervalRef.current);
            alarmIntervalRef.current = null;
        }
    }, []);

    // Manejar finalización del temporizador
    const handleTimerComplete = useCallback(() => {
        setStatus("completed");
        targetEndTimeRef.current = null;
        setTimeLeft(0);
        silentAudioRef.current?.pause();

        persistTimerState("completed", 0, null);

        if (soundEnabled) {
            playAlarm();
        }

        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
                const notifTitle = modeRef.current === "work" ? "🍅 ¡Pomodoro terminado!" : "☕ ¡Descanso terminado!";
                const notifBody = modeRef.current === "work"
                    ? "Excelente sesión de estudio. ¡Tomate un merecido descanso!"
                    : "El descanso finalizó. ¡Hora de volver a concentrarse!";
                new Notification(notifTitle, {
                    body: notifBody,
                    icon: "/favicon.ico",
                });
            } catch (err) {
                console.warn("No se pudo disparar notificación:", err);
            }
        }

        if (modeRef.current === "work") {
            saveCurrentSession(true);
            toast.success("¡Pomodoro terminado!", {
                description: MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)],
            });
        } else {
            toast.info("Descanso terminado. ¡A volver!");
            setMode("work");
            const workSecs = pomodoroSettingsRef.current.work * 60;
            setTimeLeft(workSecs);
            persistTimerState("idle", workSecs, null, "work");
        }
    }, [soundEnabled, playAlarm, persistTimerState]);

    // INICIAR TEMPORIZADOR
    const startTimer = useCallback(() => {
        stopAlarm();
        const currentSeconds = timeLeftRef.current > 0
            ? timeLeftRef.current
            : getMinutesForMode(modeRef.current, pomodoroSettingsRef.current) * 60;

        const newTargetEndTime = Date.now() + currentSeconds * 1000;
        targetEndTimeRef.current = newTargetEndTime;

        setTimeLeft(currentSeconds);
        setStatus("running");
        silentAudioRef.current?.play().catch(() => {});

        persistTimerState("running", currentSeconds, newTargetEndTime);

        if (typeof Notification !== "undefined" && Notification.permission === "default") {
            Notification.requestPermission().catch(() => {});
        }
    }, [stopAlarm, persistTimerState]);

    // PAUSAR TEMPORIZADOR (Congela exactamente los segundos restantes)
    const pauseTimer = useCallback(() => {
        // Calcular los segundos restantes actuales antes de borrar el target
        let frozenSeconds = timeLeftRef.current;
        if (targetEndTimeRef.current) {
            frozenSeconds = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
        }

        targetEndTimeRef.current = null;
        setTimeLeft(frozenSeconds);
        setStatus("paused");
        silentAudioRef.current?.pause();

        persistTimerState("paused", frozenSeconds, null);
    }, [persistTimerState]);

    // Alternar Inicio / Pausa
    const toggleTimer = useCallback(() => {
        if (statusRef.current === "running") {
            pauseTimer();
        } else {
            startTimer();
        }
    }, [startTimer, pauseTimer]);

    // RESETEAR TEMPORIZADOR
    const resetTimer = useCallback(() => {
        if (modeRef.current === "work" && elapsedSecondsRef.current > 60) {
            saveCurrentSession(false);
        }
        silentAudioRef.current?.pause();
        targetEndTimeRef.current = null;
        stopAlarm();

        const defaultSeconds = getMinutesForMode(modeRef.current, pomodoroSettingsRef.current) * 60;
        setTimeLeft(defaultSeconds);
        setElapsedSeconds(0);
        setStatus("idle");

        persistTimerState("idle", defaultSeconds, null);
    }, [stopAlarm, persistTimerState]);

    // CAMBIAR MODO (Trabajo / Descanso Corto / Descanso Largo)
    const changeMode = useCallback((newMode: TimerMode) => {
        if (modeRef.current === "work" && statusRef.current === "running" && elapsedSecondsRef.current > 0) {
            saveCurrentSession(false);
        }
        silentAudioRef.current?.pause();
        targetEndTimeRef.current = null;
        stopAlarm();

        setMode(newMode);
        const defaultSeconds = getMinutesForMode(newMode, pomodoroSettingsRef.current) * 60;
        setTimeLeft(defaultSeconds);
        setElapsedSeconds(0);
        setStatus("idle");

        persistTimerState("idle", defaultSeconds, null, newMode);
    }, [stopAlarm, persistTimerState]);

    // Loop de tick del temporizador usando targetEndTime (inmune a throttling de pestañas secundarias)
    useEffect(() => {
        if (status === "running") {
            const tick = () => {
                if (!targetEndTimeRef.current) return;
                const now = Date.now();
                const secondsLeft = Math.max(0, Math.ceil((targetEndTimeRef.current - now) / 1000));

                setTimeLeft(secondsLeft);
                setElapsedSeconds(prev => prev + 1);

                if (secondsLeft <= 0) {
                    handleTimerComplete();
                }
            };

            // Ejecución periódica cada 500ms
            timerRef.current = setInterval(tick, 500);
            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
    }, [status, handleTimerComplete]);

    // Auto-save cada 5 minutos de trabajo continuo
    useEffect(() => {
        if (status === "running" && mode === "work") {
            saveIntervalRef.current = setInterval(() => {
                saveCurrentSession(false);
            }, 5 * 60 * 1000);
        }
        return () => {
            if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
        };
    }, [status, mode]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // ═══ DOCUMENT PICTURE-IN-PICTURE (PiP) CON CICLO DE VIDA LIMPIO ═══
    const closePip = useCallback(() => {
        if (pipWindowRef.current) {
            try {
                pipWindowRef.current.close();
            } catch { /* ignore */ }
            pipWindowRef.current = null;
        }
        setPipWindow(null);
        setPipContainer(null);
        setIsPipActive(false);
    }, []);

    const openPip = useCallback(async () => {
        if (!isPipSupported) {
            toast.error("Tu navegador no soporta ventana flotante (Document PiP). Prueba en Google Chrome o Microsoft Edge.");
            return;
        }

        const dPip = (window as any).documentPictureInPicture;
        if (!dPip) return;

        // Si ya hay una ventana activa y no está cerrada, darle foco y evitar duplicados
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
            try { pipWindowRef.current.focus(); } catch { /* ignore */ }
            return;
        }

        if (isOpeningPipRef.current) return;
        isOpeningPipRef.current = true;

        try {
            if (typeof Notification !== "undefined" && Notification.permission === "default") {
                Notification.requestPermission().catch(() => {});
            }

            const newPipWindow: Window = await dPip.requestWindow({
                width: 280,
                height: 180,
                disallowReturnToOpener: false,
            });

            pipWindowRef.current = newPipWindow;
            setPipWindow(newPipWindow);
            setIsPipActive(true);

            // Copiar estilos CSS para renderizado idéntico
            try {
                document.querySelectorAll("link[rel='stylesheet'], style").forEach((node) => {
                    newPipWindow.document.head.appendChild(node.cloneNode(true));
                });

                [...document.styleSheets].forEach((styleSheet) => {
                    try {
                        if (styleSheet.cssRules) {
                            const newStyleEl = newPipWindow.document.createElement("style");
                            for (const cssRule of styleSheet.cssRules) {
                                newStyleEl.appendChild(newPipWindow.document.createTextNode(cssRule.cssText));
                            }
                            newPipWindow.document.head.appendChild(newStyleEl);
                        }
                    } catch { /* CORS */ }
                });

                const resetStyle = newPipWindow.document.createElement("style");
                resetStyle.textContent = `
                    * { box-sizing: border-box; }
                    html, body {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                        background-color: #ffffff;
                        color: #000000;
                        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        overflow: hidden;
                        user-select: none;
                        -webkit-user-select: none;
                    }
                    button { cursor: pointer; font-family: inherit; }
                `;
                newPipWindow.document.head.appendChild(resetStyle);
            } catch (styleErr) {
                console.warn("Aviso al transferir estilos a PiP:", styleErr);
            }

            newPipWindow.document.title = "🍅 Pomodoro TABE";
            newPipWindow.document.body.className = "bg-white text-black m-0 p-0 overflow-hidden font-sans select-none";

            let container = newPipWindow.document.getElementById("pomodoro-pip-root");
            if (!container) {
                container = newPipWindow.document.createElement("div");
                container.id = "pomodoro-pip-root";
                container.style.width = "100%";
                container.style.height = "100%";
                newPipWindow.document.body.appendChild(container);
            }
            setPipContainer(container);

            // REGLA CLAVE: Limpiar referencias al cerrar la ventana flotante (por botón X o script)
            newPipWindow.addEventListener("pagehide", () => {
                pipWindowRef.current = null;
                setPipWindow(null);
                setPipContainer(null);
                setIsPipActive(false);
            });

        } catch (err: any) {
            console.error("Error al abrir ventana flotante PiP:", err);
            pipWindowRef.current = null;
            setPipWindow(null);
            setPipContainer(null);
            setIsPipActive(false);
        } finally {
            isOpeningPipRef.current = false;
        }
    }, [isPipSupported]);

    const togglePip = useCallback(async () => {
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
            closePip();
        } else {
            await openPip();
        }
    }, [closePip, openPip]);

    // MediaSession Metadata para soporte nativo del sistema
    useEffect(() => {
        if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

        try {
            navigator.mediaSession.playbackState = status === "running" ? "playing" : "paused";
            navigator.mediaSession.metadata = new MediaMetadata({
                title: `${mode === "work" ? "🍅" : "☕"} ${formatTime(timeLeft)} - Pomodoro`,
                artist: mode === "work" ? "Foco Total • TABE" : "Descanso • TABE",
                album: "Tu Asistente de Bolsillo",
                artwork: [
                    { src: "/favicon.ico", sizes: "64x64", type: "image/x-icon" },
                ],
            });
        } catch { /* ignore */ }
    }, [status, mode, timeLeft]);

    useEffect(() => {
        if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

        try {
            navigator.mediaSession.setActionHandler("enterpictureinpicture", async () => {
                const isAutoPip = pomodoroSettingsRef.current.autoPip ?? true;
                if (isAutoPip && statusRef.current === "running" && !pipWindowRef.current) {
                    await openPip();
                }
            });
        } catch { /* not supported */ }

        try {
            navigator.mediaSession.setActionHandler("play", () => {
                if (statusRef.current !== "running") startTimer();
            });
            navigator.mediaSession.setActionHandler("pause", () => {
                if (statusRef.current === "running") pauseTimer();
            });
            navigator.mediaSession.setActionHandler("nexttrack", () => {
                changeMode(modeRef.current === "work" ? "shortBreak" : "work");
            });
        } catch { /* ignore */ }

        return () => {
            try {
                navigator.mediaSession.setActionHandler("enterpictureinpicture", null);
                navigator.mediaSession.setActionHandler("play", null);
                navigator.mediaSession.setActionHandler("pause", null);
                navigator.mediaSession.setActionHandler("nexttrack", null);
            } catch { /* ignore */ }
        };
    }, [openPip, startTimer, pauseTimer, changeMode]);

    // REAPERTURA Y LIMPIEZA MULTIPLE EN VISIBILITYCHANGE
    useEffect(() => {
        const handleVisibilityChange = async () => {
            const isAutoPip = pomodoroSettingsRef.current.autoPip ?? true;
            if (!isAutoPip || !isPipSupported) return;

            if (document.visibilityState === "hidden") {
                // Solo abre si el pomodoro está corriendo Y no hay ya una ventana activa abierta
                if (statusRef.current === "running" && !pipWindowRef.current && !isOpeningPipRef.current) {
                    try {
                        await openPip();
                    } catch (err) {
                        console.warn("Auto-PiP en visibilitychange:", err);
                    }
                }
            } else if (document.visibilityState === "visible") {
                // Al regresar a la pestaña, cierra la flotante y deja el foco en la web principal
                if (pipWindowRef.current) {
                    try {
                        pipWindowRef.current.close();
                    } catch { /* ignore */ }
                    pipWindowRef.current = null;
                    setPipWindow(null);
                    setPipContainer(null);
                    setIsPipActive(false);
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [isPipSupported, openPip]);

    // Limpieza al desmontar
    useEffect(() => {
        return () => {
            if (pipWindowRef.current) {
                try { pipWindowRef.current.close(); } catch { /* ignore */ }
                pipWindowRef.current = null;
            }
        };
    }, []);

    const totalTime = getMinutesForMode(mode, pomodoroSettings) * 60;
    const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
    const isActive = status === "running";
    const isPaused = status === "paused";

    return (
        <PomodoroContext.Provider value={{
            status,
            mode,
            timeLeft,
            isActive,
            isPaused,
            isRinging,
            soundEnabled,
            selectedSubject,
            toggleTimer,
            startTimer,
            pauseTimer,
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
            isPipSupported,
            isPipActive,
            openPip,
            closePip,
            togglePip,
        }}>
            {children}
            {isPipActive && pipContainer && pipWindow && createPortal(
                <PomodoroPipWidget pipWindow={pipWindow} />,
                pipContainer
            )}
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
