import { Plus, Trash2, MessageSquare, MessageCircle, Bot, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AIPersona, AIChatSession } from "@/hooks/useAIPersonas";

interface PersonaSidebarProps {
    personas: AIPersona[];
    activePersona: AIPersona | null;
    sessions: AIChatSession[];
    currentSessionId: string | null;
    onSelectPersona: (persona: AIPersona) => void;
    onCreatePersona: () => void;
    onDeletePersona: (id: string) => void;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onDeleteSession: (id: string) => void;
    onClearAllSessions?: () => void;
    isOpen: boolean;
}

export function PersonaSidebar({
    personas,
    activePersona,
    sessions,
    currentSessionId,
    onSelectPersona,
    onCreatePersona,
    onDeletePersona,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    onClearAllSessions,
    isOpen,
}: PersonaSidebarProps) {
    if (!isOpen) return null;

    return (
        <div className="w-72 h-[calc(100vh-4rem)] border-r border-border/40 bg-background/50 backdrop-blur-sm flex flex-col hidden md:flex sticky top-16 left-0 shrink-0">
            {/* Personas section */}
            <div className="p-3 border-b border-border/40">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Tus IAs
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 text-muted-foreground hover:text-primary"
                        onClick={onCreatePersona}
                        title="Crear nueva IA"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>

                <div className="space-y-1 max-h-40 overflow-y-auto">
                    {personas.map((persona) => (
                        <div
                            key={persona.id}
                            className={cn(
                                "group flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all",
                                activePersona?.id === persona.id
                                    ? "bg-primary/10 text-foreground"
                                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                            )}
                            onClick={() => onSelectPersona(persona)}
                        >
                            <span className="text-lg flex-shrink-0">{persona.avatar_emoji}</span>
                            <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium truncate block">
                                    {persona.name}
                                </span>
                                {persona.description && (
                                    <span className="text-[10px] text-muted-foreground truncate block">
                                        {persona.description}
                                    </span>
                                )}
                            </div>
                            {activePersona?.id === persona.id && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                            )}
                            {!persona.is_default && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeletePersona(persona.id);
                                    }}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat sessions section */}
            <div className="p-3 border-b border-border/40 flex gap-2">
                <Button
                    onClick={onNewChat}
                    className="flex-1 justify-start gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-none shadow-none font-medium text-xs h-8"
                    variant="outline"
                >
                    <Plus className="w-3.5 h-3.5" /> Nuevo Chat
                </Button>
                {sessions.length > 0 && onClearAllSessions && (
                    <Button
                        onClick={onClearAllSessions}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Borrar todo el historial"
                    >
                        <Eraser className="w-3.5 h-3.5" />
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1 px-3 py-2">
                <div className="space-y-1">
                    {sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/60 gap-2">
                            <MessageCircle className="w-8 h-8 opacity-20" />
                            <span className="text-xs">Sin historial</span>
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => onSelectSession(session.id)}
                                className={cn(
                                    "group flex items-center justify-between p-2 rounded-lg text-sm transition-all cursor-pointer hover:bg-accent/50",
                                    currentSessionId === session.id
                                        ? "bg-accent text-accent-foreground font-medium shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                    <MessageSquare
                                        className={cn(
                                            "w-3.5 h-3.5 flex-shrink-0",
                                            currentSessionId === session.id
                                                ? "text-primary"
                                                : "text-muted-foreground/70"
                                        )}
                                    />
                                    <span className="truncate text-xs">{session.title}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-5 h-5 opacity-70 hover:opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSession(session.id);
                                    }}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
