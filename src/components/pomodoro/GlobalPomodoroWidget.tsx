
import { usePomodoro } from "@/contexts/PomodoroContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, Pause, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function GlobalPomodoroWidget() {
    const { timeLeft, isActive, isRinging, toggleTimer, stopAlarm, formatTime, mode } = usePomodoro();
    const location = useLocation();
    const navigate = useNavigate();

    // No mostrar si estamos en la página dedicada
    if (location.pathname === "/pomodoro") return null;

    // Solo mostrar si el timer está corriendo, pausado pero con tiempo > 0 (activo en sesión)
    // o si está sonando la alarma.
    const isSessionActive = isActive || isRinging || timeLeft < (mode === 'work' ? 25 : mode === 'shortBreak' ? 5 : 15) * 60;

    if (!isSessionActive) return null;

    return (
        <div className="fixed bottom-4 right-[76px] z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className={cn(
                "backdrop-blur-xl border rounded-2xl shadow-2xl p-3 flex items-center gap-3 w-64 ring-1 overflow-hidden transition-all duration-300",
                isRinging ? "bg-neon-red/20 border-neon-red ring-neon-red/50 animate-pulse" : "bg-card/90 border-primary/20 ring-border/50"
            )}>

                {/* Progress Ring Mini */}
                <div
                    className={cn(
                        "cursor-pointer relative w-10 h-10 flex items-center justify-center rounded-full transition-colors",
                        isRinging ? "bg-neon-red/20" : "bg-secondary"
                    )}
                    onClick={() => navigate("/pomodoro")}
                >
                    {!isRinging ? (
                        <>
                            <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path
                                    className={cn(
                                        "stroke-current",
                                        mode === 'work' ? "text-primary" : mode === 'shortBreak' ? "text-neon-green" : "text-neon-cyan"
                                    )}
                                    strokeDasharray="100, 100"
                                    d="M18 2.0845
                                a 15.9155 15.9155 0 0 1 0 31.831
                                a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    strokeWidth="4"
                                />
                            </svg>
                            <span className="text-[10px] font-bold">{Math.ceil(timeLeft / 60)}m</span>
                        </>
                    ) : (
                        <BellOff className="w-5 h-5 text-neon-red" />
                    )}
                </div>

                <div className="flex-1 min-w-0" onClick={() => navigate("/pomodoro")}>
                    {isRinging ? (
                        <div>
                            <p className="text-xs font-bold text-neon-red uppercase tracking-wider animate-pulse">¡DESPIERTA!</p>
                            <p className="text-sm font-medium text-muted-foreground truncate">Tiempo finalizado</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs font-medium text-muted-foreground truncate uppercase tracking-wider">{mode === 'work' ? 'Focus' : 'Descanso'}</p>
                            <p className="text-lg font-mono font-bold leading-none">{formatTime(timeLeft)}</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-1 z-10">
                    {isRinging ? (
                        <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={stopAlarm}>
                            <BellOff className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-primary/20" onClick={toggleTimer}>
                            {isActive ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
