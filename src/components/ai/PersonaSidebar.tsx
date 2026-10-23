import { Plus, Trash2, MessageSquare, MessageCircle, Eraser, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AIPersona, AIChatSession } from "@/hooks/useAIPersonas";
import { TabeAIIcon } from "@/components/icons/TabeAIIcon";
import { HoldButton } from "@/components/ui/HoldButton";

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
        <aside
            aria-label="Panel de personalidades y conversaciones"
            className={cn(
                "h-full border-zinc-200/80 dark:border-zinc-800/80 bg-[#F7F7F5] dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 flex flex-col fixed md:relative top-0 left-0 shrink-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl md:shadow-none overflow-hidden select-none",
                isOpen
                    ? "w-72 max-w-[85vw] translate-x-0 opacity-100 border-r border-zinc-200/80 dark:border-zinc-800/80 pointer-events-auto"
                    : "w-0 max-w-0 -translate-x-full md:translate-x-0 opacity-0 pointer-events-none border-r-0"
            )}
        >
            <div className="w-72 h-full flex flex-col shrink-0">
                {/* Personas section */}
                <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                            Tus IAs
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg shadow-2xs"
                                onClick={onCreatePersona}
                                title="Crear nueva IA"
                            >
                                <Plus className="w-5 h-5" strokeWidth={3} />
                            </Button>
                            {onClose && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-8 h-8 text-foreground hover:bg-destructive hover:text-white border-2 border-foreground rounded-lg"
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
                                        ? "bg-[#00E5FF] !text-black border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                                        : "text-foreground hover:bg-muted border-transparent hover:border-foreground hover:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                                )}
                                onClick={() => onSelectPersona(persona)}
                            >
                            {persona.avatar_emoji && persona.avatar_emoji !== "🤖" ? (
                                <span className="text-2xl flex-shrink-0">{persona.avatar_emoji}</span>
                            ) : (
                                <div className="w-7 h-7 rounded-lg bg-white text-black dark:bg-black dark:text-white p-1 flex items-center justify-center border border-foreground/50 shadow-sm shrink-0">
                                    <TabeAIIcon className="w-full h-full" />
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
                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 shadow-xs" />
                            )}
                            <div className="flex bg-card rounded-md border border-zinc-200 dark:border-zinc-700 shadow-2xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
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
            <div className="p-3 border-b border-border/50">
                <Button
                    onClick={onNewChat}
                    className="w-full justify-between px-3.5 py-2.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-xl font-medium text-xs h-10 shadow-xs transition-all cursor-pointer"
                >
                    <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Nuevo chat
                    </span>
                    <span className="text-[10px] opacity-70 border border-current/30 px-1.5 py-0.2 rounded">Ctrl + K</span>
                </Button>
            </div>

            {/* Lista de Historial estilo ChatGPT */}
            <div className="flex-1 px-2.5 py-3 overflow-y-auto overflow-x-hidden space-y-1">
                <div className="px-2 pb-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Recientes</span>
                    {sessions.length > 0 && onClearAllSessions && (
                        <button
                            onClick={onClearAllSessions}
                            className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors lowercase cursor-pointer"
                            title="Borrar todo"
                        >
                            limpiar
                        </button>
                    )}
                </div>

                {sessions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-400 font-normal">
                        No hay conversaciones previas
                    </div>
                ) : (
                    sessions.map((session) => (
                        <div
                            key={session.id}
                            className={cn(
                                "group flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-colors w-full select-none cursor-pointer",
                                currentSessionId === session.id
                                    ? "bg-zinc-200/80 dark:bg-[#2f2f2f] text-zinc-900 dark:text-zinc-100 font-medium"
                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                            )}
                            onClick={() => onSelectSession(session.id)}
                        >
                            <span className="truncate flex-1 text-left">
                                {session.title || "Nueva conversación"}
                            </span>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSession(session.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 rounded transition-all shrink-0 cursor-pointer"
                                title="Eliminar chat"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    </aside>
    );
}