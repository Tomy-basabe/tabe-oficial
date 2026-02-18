
import { usePomodoro } from "@/contexts/PomodoroContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, Pause, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function GlobalPomodoroWidget() {
    const { timeLeft, isActive, toggleTimer, formatTime, mode } = usePomodoro();
    const location = useLocation();
    const navigate = useNavigate();

    // No mostrar si estamos en la página dedicada o en el asistente (ya tiene su widget)
    // Actually, user wants it to be persistent. Maybe show everywhere EXCEPT where a full timer is shown?
    // Let's hide it on /pomodoro page primarily.
    if (location.pathname === "/pomodoro") return null;

    // Solo mostrar si el timer está corriendo o pausado pero con tiempo > 0 (activo en sesión)
    // O siempre si el usuario lo activó. Por simplicidad, si hay una sesión "activa" (tiempo != default o isActive)
    // Pero para no molestar, digamos si isActive o timeLeft < total
    const isSessionActive = isActive || timeLeft < (mode === 'work' ? 25 : mode === 'shortBreak' ? 5 : 15) * 60;

    if (!isSessionActive) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="bg-card/90 backdrop-blur-xl border border-primary/20 rounded-2xl shadow-2xl p-3 flex items-center gap-3 w-64 ring-1 ring-border/50">

                {/* Progress Ring Mini */}
                <div
                    className="cursor-pointer relative w-10 h-10 flex items-center justify-center bg-secondary rounded-full"
                    onClick={() => navigate("/pomodoro")}
                >
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
                </div>

                <div className="flex-1 min-w-0" onClick={() => navigate("/pomodoro")}>
                    <p className="text-xs font-medium text-muted-foreground truncate uppercase tracking-wider">{mode === 'work' ? 'Focus' : 'Descanso'}</p>
                    <p className="text-lg font-mono font-bold leading-none">{formatTime(timeLeft)}</p>
                </div>

                <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-primary/20" onClick={toggleTimer}>
                        {isActive ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                    </Button>
                    {/* Close/Stop button? Or just minimize? Let's assume standard controls. */}
                </div>
            </div>
        </div>
    );
}
