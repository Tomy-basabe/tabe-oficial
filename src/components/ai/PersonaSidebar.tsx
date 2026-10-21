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
            <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex gap-2">
                <Button
                    onClick={onNewChat}
                    className="flex-1 justify-center gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-lg font-medium text-xs h-9 shadow-2xs transition-colors"
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
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                className="shrink-0"
                            >
                                <HoldButton
                                    size="icon-sm"
                                    radius={8}
                                    backgroundColor="#ffffff"
                                    fillColor="#FF5C5C"
                                    textColor="#dc2626"
                                    fillTextColor="#ffffff"
                                    holdTime={1200}
                                    icon={<Trash2 className="w-3.5 h-3.5 text-red-600" strokeWidth={2.5} />}
                                    doneIcon={<Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />}
                                    doneLabel=""
                                    onHold={() => onDeleteSession(session.id)}
                                    className="border-2 border-black shadow-[1.5px_1.5px_0_0_#000]"
                                    title="Mantené presionado para eliminar este chat"
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </aside>
    );
}
