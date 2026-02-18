import { useLocation, useNavigate } from "react-router-dom";
import { PhoneOff, Mic, MicOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDiscordVoice } from "@/contexts/DiscordVoiceContext";
import { usePomodoro } from "@/contexts/PomodoroContext";

/**
 * Floating mini-widget that shows the active voice call when the user
 * navigates away from /discord. Clicking it returns to the Discord page.
 */
export function GlobalDiscordVoiceWidget() {
    const location = useLocation();
    const navigate = useNavigate();
    const { inVoiceChannel, currentChannel, isAudioEnabled, isSpeaking, leaveVoiceChannel, toggleAudio } = useDiscordVoice();
    const { timeLeft, isActive, mode } = usePomodoro();

    // Don't show the widget if on the Discord page or not in a voice channel
    if (location.pathname === "/discord" || !inVoiceChannel || !currentChannel) {
        return null;
    }

    // Check if pomodoro widget is also visible (to offset ourselves above it)
    const isPomodoroVisible = location.pathname !== "/pomodoro" &&
        (isActive || timeLeft < (mode === 'work' ? 25 : mode === 'shortBreak' ? 5 : 15) * 60);

    return (
        <div className={cn(
            "fixed right-6 z-[9999] animate-in slide-in-from-bottom-4 duration-300 transition-all",
            isPomodoroVisible ? "bottom-[5.5rem]" : "bottom-6"
        )}>
            <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl shadow-black/30 p-3 flex items-center gap-3 min-w-[220px]">
                {/* Speaking indicator + channel name */}
                <button
                    onClick={() => navigate("/discord")}
                    className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                >
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all",
                        isSpeaking
                            ? "bg-green-500/20 ring-2 ring-green-500 discord-speaking-ring"
                            : "bg-primary/20"
                    )}>
                        {isSpeaking ? (
                            <Volume2 className="w-4 h-4 text-green-400" />
                        ) : (
                            <Volume2 className="w-4 h-4 text-primary" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-green-400 font-bold uppercase tracking-wide">En llamada</span>
                        <span className="text-xs text-foreground truncate font-medium">{currentChannel.name}</span>
                    </div>
                </button>

                {/* Quick controls */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleAudio}
                        className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                            isAudioEnabled
                                ? "text-muted-foreground hover:text-foreground hover:bg-white/10"
                                : "text-red-400 bg-red-500/20 hover:bg-red-500/30"
                        )}
                    >
                        {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={leaveVoiceChannel}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                        <PhoneOff className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

