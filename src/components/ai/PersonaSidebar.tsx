import { Plus, Trash2, MessageSquare, MessageCircle, Eraser, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AIPersona, AIChatSession } from "@/hooks/useAIPersonas";
import { TabeAIIcon } from "@/components/icons/TabeAIIcon";

interface PersonaSidebarProps {
    personas: AIPersona[];
    activePersona: AIPersona | null;
    sessions: AIChatSession[];
    currentSessionId: string | null;
    onSelectPersona: (persona: AIPersona) => void;
    onCreatePersona: () => void;
    onEditPersona: (persona: AIPersona) => void;
    onDeletePersona: (id: string) => void;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onDeleteSession: (id: string) => void;
    onClearAllSessions?: () => void;
    isOpen: boolean;
    onClose?: () => void;
}

export function PersonaSidebar({
    personas,
    activePersona,
    sessions,
    currentSessionId,
    onSelectPersona,
    onCreatePersona,
    onEditPersona,
    onDeletePersona,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    onClearAllSessions,
    isOpen,
    onClose,
}: PersonaSidebarProps) {
    return (
        <div className={cn(
            "w-72 max-w-[85vw] h-full border-r-4 border-foreground bg-card text-foreground flex flex-col fixed md:relative top-0 left-0 shrink-0 z-50 transition-all duration-300 shadow-2xl md:shadow-none",
            isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            !isOpen && "hidden md:flex"
        )}>
            {/* Personas section */}
            <div className="p-4 border-b-4 border-foreground">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-black text-foreground uppercase tracking-wider">
                        Tus IAs
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-foreground hover:bg-[#BFFF00] hover:!text-black border-2 border-foreground rounded-lg shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px]"
                            onClick={onCreatePersona}
                            title="Crear nueva IA"
                        >
                            <Plus className="w-5 h-5" strokeWidth={3} />
                        </Button>
                        {onClose && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden w-8 h-8 text-foreground hover:bg-destructive hover:text-white border-2 border-foreground rounded-lg"
                                onClick={onClose}
                                title="Cerrar panel"
                            >
                                <Plus className="w-4 h-4 rotate-45" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {personas.map((persona) => (
                        <div
                            key={persona.id}
                            className={cn(
                                "group flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all border-2",
                                activePersona?.id === persona.id
                                    ? "bg-[#C688EB] !text-black border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                                    : "text-foreground hover:bg-muted border-transparent hover:border-foreground hover:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                            )}
                            onClick={() => onSelectPersona(persona)}
                        >
                            {persona.avatar_emoji && persona.avatar_emoji !== "🤖" ? (
                                <span className="text-2xl flex-shrink-0">{persona.avatar_emoji}</span>
                            ) : (
                                <div className="w-7 h-7 rounded-lg bg-black text-white dark:bg-white dark:text-black p-1 flex items-center justify-center border border-foreground/50 shadow-sm shrink-0">
                                    <TabeAIIcon className="w-full h-full text-white dark:text-black" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <span className={cn(
                                    "text-sm font-black uppercase truncate block",
                                    activePersona?.id === persona.id ? "!text-black" : "text-foreground"
                                )}>
                                    {persona.name}
                                </span>
                                {persona.description && (
                                    <span className={cn(
                                        "text-[10px] font-bold truncate block",
                                        activePersona?.id === persona.id ? "!text-black/80" : "text-muted-foreground"
                                    )}>
                                        {persona.description}
                                    </span>
                                )}
                            </div>
                            {activePersona?.id === persona.id && (
                                <div className="w-2 h-2 rounded-full bg-black flex-shrink-0 border-2 border-black" />
                            )}
                            <div className="flex bg-card rounded-md shadow-[2px_2px_0_0_hsl(var(--foreground))] border-2 border-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-7 h-7 md:w-6 md:h-6 hover:bg-[#BFFF00] text-foreground hover:!text-black rounded-none rounded-l-md flex-shrink-0 border-r-2 border-foreground"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditPersona(persona);
                                    }}
                                    title="Editar IA"
                                    aria-label="Editar IA"
                                >
                                    <Pencil className="w-3.5 h-3.5 md:w-3 md:h-3" strokeWidth={3} />
                                </Button>
                                {!persona.is_default && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-7 h-7 md:w-6 md:h-6 hover:bg-[#FF5C5C] text-foreground hover:!text-black rounded-none rounded-r-md flex-shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeletePersona(persona.id);
                                        }}
                                        title="Eliminar IA"
                                        aria-label="Eliminar IA"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 md:w-3 md:h-3" strokeWidth={3} />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat sessions section */}
            <div className="p-4 border-b-4 border-foreground flex gap-2">
                <Button
                    onClick={onNewChat}
                    className="flex-1 justify-center gap-2 bg-[#00E5FF] hover:bg-[#00cce6] !text-black border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] font-black uppercase text-xs h-10 rounded-xl"
                >
                    <Plus className="w-4 h-4 !text-black" strokeWidth={3} /> Nuevo Chat
                </Button>
                {sessions.length > 0 && onClearAllSessions && (
                    <Button
                        onClick={onClearAllSessions}
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-foreground border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl hover:bg-[#FF5C5C] hover:!text-black hover:translate-y-[-2px]"
                        title="Borrar todo el historial"
                    >
                        <Eraser className="w-4 h-4" strokeWidth={2.5} />
                    </Button>
                )}
            </div>

            <div className="flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden space-y-2">
                {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                        <MessageCircle className="w-10 h-10" strokeWidth={1.5} />
                        <span className="text-sm font-black uppercase">Sin historial</span>
                    </div>
                ) : (
                    sessions.map((session) => (
                        <div
                            key={session.id}
                            className={cn(
                                "flex items-center justify-between gap-2 p-2 rounded-xl text-sm border-2 transition-all w-full select-none",
                                currentSessionId === session.id
                                    ? "bg-[#BFFF00] text-black border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                                    : "bg-background text-foreground hover:bg-muted border-foreground/40 hover:border-foreground shadow-xs"
                            )}
                        >
                            {/* Clickable area to switch chat */}
                            <button
                                type="button"
                                onClick={() => onSelectSession(session.id)}
                                className="flex items-center gap-2 flex-1 min-w-0 text-left py-1 cursor-pointer"
                                title={session.title}
                            >
                                <MessageSquare
                                    className={cn(
                                        "w-4 h-4 shrink-0",
                                        currentSessionId === session.id
                                            ? "text-black"
                                            : "text-muted-foreground"
                                    )}
                                    strokeWidth={2.5}
                                />
                                <span className={cn(
                                    "truncate text-xs md:text-sm block font-black",
                                    currentSessionId === session.id ? "text-black" : "text-foreground"
                                )}>
                                    {session.title}
                                </span>
                            </button>

                            {/* Prominent, always-visible delete button */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onDeleteSession(session.id);
                                }}
                                className="w-7 h-7 shrink-0 rounded-lg border-2 border-black bg-white hover:bg-[#FF5C5C] text-black hover:text-white flex items-center justify-center shadow-[1.5px_1.5px_0_0_#000] transition-transform active:scale-90 cursor-pointer"
                                title="Eliminar este chat"
                                aria-label="Eliminar este chat"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-red-600 hover:text-white" strokeWidth={2.5} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
