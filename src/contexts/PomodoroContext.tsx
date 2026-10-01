
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDateStr } from "@/lib/utils";
import { PomodoroPipWidget } from "@/components/pomodoro/PomodoroPipWidget";

export type TimerMode = "work" | "shortBreak" | "longBreak";
export type SoundType = "classic" | "zen" | "arcade";

export interface PomodoroSettings {
    work: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
    soundType: SoundType;
    continuousAlarm: boolean;
    autoPip: boolean;
}

const STORAGE_KEY = "pomodoro-settings";
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
    const [mode, setMode] = useState<TimerMode>("work");
    const [timeLeft, setTimeLeft] = useState(pomodoroSettings.work * 60);
    const [isActive, setIsActive] = useState(false);
    const [isRinging, setIsRinging] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const elapsedSecondsRef = useRef(0);
    const [completedPomodoros, setCompletedPomodoros] = useState(0);
    const [sessionStartDate, setSessionStartDate] = useState<string>(() => toLocalDateStr());

    // Document Picture-in-Picture (PiP) State & Refs
    const isPipSupported = typeof window !== "undefined" && "documentPictureInPicture" in window;
    const [isPipActive, setIsPipActive] = useState(false);
    const [pipWindow, setPipWindow] = useState<Window | null>(null);
    const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);
    const pipWindowRef = useRef<Window | null>(null);
    const isOpeningPipRef = useRef(false);
    const isActiveRef = useRef(false);
    const modeRef = useRef<TimerMode>("work");
    const silentAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        isActiveRef.current = isActive;
    }, [isActive]);

    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);

    // Loop de audio inaudible para mantener activa la sesión de MediaSession en Chromium (requerido para Auto-PiP)
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

    useEffect(() => {
        elapsedSecondsRef.current = elapsedSeconds;
    }, [elapsedSeconds]);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastTickRef = useRef<number | null>(null);

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
    }, [user, isGuest]);

    // Account settings take precedence over browser-local settings so a new
    // browser restores the same configuration after signing in.
    useEffect(() => {
        if (!user || isGuest) return;

        const cloudSettings = user.user_metadata?.[CLOUD_SETTINGS_KEY];
        if (!cloudSettings || typeof cloudSettings !== "object") return;

        const nextSettings = { ...DEFAULT_SETTINGS, ...cloudSettings } as PomodoroSettings;
        setPomodoroSettings(nextSettings);
        if (!isActive) {
            setTimeLeft(getMinutesForMode(mode, nextSettings) * 60);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
    }, [user, isGuest]);

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

        if (user && !isGuest) {
            supabase.auth.updateUser({
                data: { [CLOUD_SETTINGS_KEY]: newSettings },
            }).then(({ error }) => {
                if (error) console.error("Error saving Pomodoro settings:", error);
            });
        }
    };
    // Timer Tick (Background Tab Throttling Safe)
    useEffect(() => {
        if (isActive && timeLeft > 0) {
            // Only set lastTick if it's the beginning of a active cycle
            if (!lastTickRef.current) {
                lastTickRef.current = Date.now();
                if (timeLeft === getMinutesForMode(mode, pomodoroSettings) * 60) {
                    setSessionStartDate(toLocalDateStr());
                }
            }

            timerRef.current = setInterval(() => {
                if (!lastTickRef.current) return;
                
                const now = Date.now();
                const deltaSeconds = Math.floor((now - lastTickRef.current) / 1000);
                
                if (deltaSeconds > 0) {
                    lastTickRef.current += deltaSeconds * 1000;
                    
                    setTimeLeft((prev) => {
                        const newTimeLeft = Math.max(0, prev - deltaSeconds);
                        const actualDelta = prev - newTimeLeft;
                        
                        setElapsedSeconds((ePrev) => ePrev + actualDelta);
                        
                        return newTimeLeft;
                    });
                }
            }, 500); // Check every ~500ms to catch up accurately if 1000ms was skipped
        } else if (timeLeft <= 0 && isActive) {
            handleTimerComplete();
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            lastTickRef.current = null;
        }
        
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, timeLeft]);

    // Auto-save safety fallback (every 5 minutes of continuous work to protect against crashes without hammering database)
    useEffect(() => {
        if (isActive && mode === "work") {
            saveIntervalRef.current = setInterval(() => {
                saveCurrentSession(false);
            }, 5 * 60 * 1000);
        }
        return () => {
            if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
        };
    }, [isActive, mode, user]);


    const saveCurrentSession = async (completed: boolean) => {
        if (isGuest) {
            if (completed) {
                setCompletedPomodoros(prev => prev + 1);
            }
            setElapsedSeconds(0);
            return;
        }

        const currentElapsed = elapsedSecondsRef.current || elapsedSeconds;
        if (!user || mode !== "work" || currentElapsed === 0) return;

        try {
            const sessionDate = toLocalDateStr();
            const { error } = await supabase
                .from("study_sessions")
                .insert({
                    user_id: user.id,
                    subject_id: selectedSubject,
                    duracion_segundos: currentElapsed,
                    tipo: "pomodoro",
                    completada: completed,
                    fecha: sessionDate,
                });

            if (error) throw error;

            // Update user stats (XP)
            const hours = Math.floor(currentElapsed / 3600);
            let xpGained = Math.floor(currentElapsed / 60) * 2;

            const { data: stats } = await supabase
                .from("user_stats")
                .select("id, horas_estudio_total, xp_total, credits, xp_multiplier, xp_multiplier_ends_at")
                .eq("user_id", user.id)
                .single();
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
                    horas_estudio_total: (currentStats.horas_estudio_total || 0) + hours,
                    xp_total: (currentStats.xp_total || 0) + xpGained,
                    credits: (currentStats.credits || 0) + Math.floor(currentElapsed / 60), // 1 Credit per minute
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

        // Notificación de sistema (desktop/móvil)
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
                const notifTitle = mode === "work" ? "🍅 ¡Pomodoro terminado!" : "☕ ¡Descanso terminado!";
                const notifBody = mode === "work" 
                    ? "Excelente sesión de estudio. ¡Tomate un merecido descanso!"
                    : "El descanso finalizó. ¡Hora de volver a concentrarse!";
                new Notification(notifTitle, {
                    body: notifBody,
                    icon: "/favicon.ico",
                });
            } catch (err) {
                console.warn("No se pudo disparar notificación de sistema:", err);
            }
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

    const toggleTimer = () => {
        if (!isActive) {
            setSessionStartDate(toLocalDateStr());
            silentAudioRef.current?.play().catch(() => {});
            if (typeof Notification !== "undefined" && Notification.permission === "default") {
                Notification.requestPermission().catch(() => {});
            }
        } else {
            silentAudioRef.current?.pause();
        }
        setIsActive(!isActive);
    };

    const resetTimer = () => {
        if (mode === "work" && elapsedSeconds > 60) saveCurrentSession(false);
        silentAudioRef.current?.pause();
        setIsActive(false);
        stopAlarm();
        setTimeLeft(getMinutesForMode(mode, pomodoroSettings) * 60);
        setElapsedSeconds(0);
        lastTickRef.current = null;
        setSessionStartDate(toLocalDateStr());
    };

    const changeMode = (newMode: TimerMode) => {
        if (mode === "work" && isActive && elapsedSeconds > 0) saveCurrentSession(false);
        setMode(newMode);
        setIsActive(false);
        stopAlarm();
        setTimeLeft(getMinutesForMode(newMode, pomodoroSettings) * 60);
        setElapsedSeconds(0);
        lastTickRef.current = null;
        setSessionStartDate(toLocalDateStr());
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Document Picture-in-Picture (PiP) Implementation
    const closePip = useCallback(() => {
        const currentActive = pipWindowRef.current || (window as any).documentPictureInPicture?.window;
        if (currentActive && !currentActive.closed) {
            try {
                currentActive.close();
            } catch (e) {}
        }
        pipWindowRef.current = null;
        setPipWindow(null);
        setPipContainer(null);
        setIsPipActive(false);
    }, []);

    const openPip = useCallback(async () => {
        if (!isPipSupported) {
            toast.error("Tu navegador no soporta ventana flotante (Document PiP). Prueba en Google Chrome o Microsoft Edge.");
            return;
        }

        const currentActive = pipWindowRef.current || (window as any).documentPictureInPicture?.window;
        if (currentActive && !currentActive.closed) {
            try { currentActive.focus(); } catch (e) {}
            return;
        }

        try {
            // Solicitar permisos de notificación si están pendientes
            if (typeof Notification !== "undefined" && Notification.permission === "default") {
                Notification.requestPermission().catch(() => {});
            }

            const pipWin = await (window as any).documentPictureInPicture.requestWindow({
                width: 280,
                height: 180,
                disallowReturnToOpener: false,
            });

            pipWindowRef.current = pipWin;
            setPipWindow(pipWin);

            // Copiar estilos CSS del documento principal
            try {
                // 1. Clonar tags link y style existentes
                document.querySelectorAll("link[rel='stylesheet'], style").forEach((node) => {
                    pipWin.document.head.appendChild(node.cloneNode(true));
                });

                // 2. Copiar reglas de hojas de estilo cargadas
                [...document.styleSheets].forEach((styleSheet) => {
                    try {
                        if (styleSheet.cssRules) {
                            const newStyleEl = pipWin.document.createElement("style");
                            for (const cssRule of styleSheet.cssRules) {
                                newStyleEl.appendChild(pipWin.document.createTextNode(cssRule.cssText));
                            }
                            pipWin.document.head.appendChild(newStyleEl);
                        }
                    } catch {
                        // Ignorar hojas de estilo con restricciones CORS
                    }
                });

                // 3. Reglas base de reset para ventana compacta
                const resetStyle = pipWin.document.createElement("style");
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
                pipWin.document.head.appendChild(resetStyle);
            } catch (styleErr) {
                console.warn("Aviso al transferir estilos a PiP:", styleErr);
            }

            // Metadatos
            pipWin.document.title = "🍅 Pomodoro TABE";
            pipWin.document.body.className = "bg-white text-black m-0 p-0 overflow-hidden font-sans select-none";

            // Contenedor del portal React
            let container = pipWin.document.getElementById("pomodoro-pip-root");
            if (!container) {
                container = pipWin.document.createElement("div");
                container.id = "pomodoro-pip-root";
                container.style.width = "100%";
                container.style.height = "100%";
                pipWin.document.body.appendChild(container);
            }
            setPipContainer(container);
            setIsPipActive(true);

            // Escuchar cierre de la ventana flotante
            pipWin.addEventListener("pagehide", () => {
                pipWindowRef.current = null;
                setPipWindow(null);
                setPipContainer(null);
                setIsPipActive(false);
            });

        } catch (err: any) {
            console.error("Error al abrir ventana flotante PiP:", err);
            setIsPipActive(false);
        }
    }, [isPipSupported]);

    const togglePip = useCallback(async () => {
        const currentActive = pipWindowRef.current || (window as any).documentPictureInPicture?.window;
        if (currentActive && !currentActive.closed) {
            closePip();
        } else {
            await openPip();
        }
    }, [closePip, openPip]);

    // 1. MediaSession Metadata & Handlers (Auto-PiP estilo Google Meet en Chromium)
    useEffect(() => {
        if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

        try {
            navigator.mediaSession.playbackState = isActive ? "playing" : "paused";
            navigator.mediaSession.metadata = new MediaMetadata({
                title: `${mode === "work" ? "🍅" : "☕"} ${formatTime(timeLeft)} - Pomodoro`,
                artist: mode === "work" ? "Foco Total • TABE" : "Descanso • TABE",
                album: "Tu Asistente de Bolsillo",
                artwork: [
                    { src: "/favicon.ico", sizes: "64x64", type: "image/x-icon" },
                ],
            });
        } catch (e) {}
    }, [isActive, mode, timeLeft]);

    useEffect(() => {
        if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

        try {
            navigator.mediaSession.setActionHandler("enterpictureinpicture", async () => {
                const isAutoPip = pomodoroSettings.autoPip ?? true;
                const activeWin = pipWindowRef.current || (window as any).documentPictureInPicture?.window;
                if (isAutoPip && isActiveRef.current && !activeWin) {
                    await openPip();
                }
            });
        } catch (e) {
            console.warn("enterpictureinpicture no soportado:", e);
        }

        try {
            navigator.mediaSession.setActionHandler("play", () => {
                if (!isActiveRef.current) toggleTimer();
            });
            navigator.mediaSession.setActionHandler("pause", () => {
                if (isActiveRef.current) toggleTimer();
            });
            navigator.mediaSession.setActionHandler("nexttrack", () => {
                changeMode(modeRef.current === "work" ? "shortBreak" : "work");
            });
        } catch (e) {}

        return () => {
            try {
                navigator.mediaSession.setActionHandler("enterpictureinpicture", null);
                navigator.mediaSession.setActionHandler("play", null);
                navigator.mediaSession.setActionHandler("pause", null);
                navigator.mediaSession.setActionHandler("nexttrack", null);
            } catch (e) {}
        };
    }, [openPip, toggleTimer, changeMode, pomodoroSettings.autoPip]);

    // 2. VisibilityChange Handler (Auto-PiP al salir de pestaña y auto-cierre suave al regresar a TABE)
    useEffect(() => {
        const handleVisibilityChange = async () => {
            const isAutoPip = pomodoroSettings.autoPip ?? true;
            if (!isAutoPip || !isPipSupported) return;

            if (document.visibilityState === "hidden") {
                // El usuario cambió de pestaña o minimizó el navegador
                const activeWin = pipWindowRef.current || (window as any).documentPictureInPicture?.window;
                if (isActiveRef.current && !activeWin && !isOpeningPipRef.current) {
                    try {
                        isOpeningPipRef.current = true;
                        await openPip();
                    } catch (err) {
                        console.warn("Auto-PiP en visibilitychange:", err);
                    } finally {
                        isOpeningPipRef.current = false;
                    }
                }
            } else if (document.visibilityState === "visible") {
                // El usuario regresó a la pestaña de TABE: cerrar suavemente y restaurar vista
                const activeWin = pipWindowRef.current || (window as any).documentPictureInPicture?.window;
                if (activeWin && !activeWin.closed) {
                    closePip();
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [isPipSupported, pomodoroSettings.autoPip, openPip, closePip]);

    // Limpieza de ventana flotante al desmontar
    useEffect(() => {
        return () => {
            const activeWin = pipWindowRef.current || (window as any).documentPictureInPicture?.window;
            if (activeWin && !activeWin.closed) {
                activeWin.close();
            }
        };
    }, []);

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
