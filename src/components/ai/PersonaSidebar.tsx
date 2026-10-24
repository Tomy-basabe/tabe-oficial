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
                                    className="w-7 h-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 rounded-lg transition-colors cursor-pointer"
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
                                    "group flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all border",
                                    activePersona?.id === persona.id
                                        ? "bg-zinc-200/70 dark:bg-zinc-800/80 border-zinc-300/80 dark:border-zinc-700/80 shadow-2xs text-zinc-900 dark:text-zinc-100"
                                        : "border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300"
                                )}
                                onClick={() => onSelectPersona(persona)}
                            >
                            {persona.avatar_emoji && persona.avatar_emoji !== "🤖" ? (
                                <span className="text-xl flex-shrink-0 select-none">{persona.avatar_emoji}</span>
                            ) : (
                                <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 p-0.5 flex items-center justify-center shadow-2xs shrink-0">
                                    <TabeAIIcon className="w-full h-full" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold truncate block text-zinc-900 dark:text-zinc-100">
                                    {persona.name}
                                </span>
                                {persona.description && (
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">
                                        {persona.description}
                                    </span>
                                )}
                            </div>
                            {activePersona?.id === persona.id && (
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                            <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                    className="w-6 h-6 rounded-md hover:bg-zinc-300/60 dark:hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditPersona(persona);
                                    }}
                                    title="Editar IA"
                                    aria-label="Editar IA"
                                >
                                    <Pencil className="w-3 h-3" />
                                </button>
                                {!persona.is_default && (
                                    <button
                                        className="w-6 h-6 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeletePersona(persona.id);
                                        }}
                                        title="Eliminar IA"
                                        aria-label="Eliminar IA"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
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
                <div className="px-2 pb-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between select-none">
                    <span className="flex items-center gap-1.5">
                        Recientes
                    </span>
                    {sessions.length > 0 && onClearAllSessions && (
                        <button
                            type="button"
                            onClick={onClearAllSessions}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 px-2 py-0.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer group"
                            title="Limpiar todo el historial"
                        >
                            <Trash2 className="w-3 h-3 group-hover:scale-110 transition-transform" />
                            <span>Limpiar</span>
                        </button>
                    )}
                </div>

                {sessions.length === 0 ? (
                    <div className="py-10 text-center px-4 flex flex-col items-center justify-center gap-2 text-zinc-400">
                        <MessageSquare className="w-5 h-5 stroke-[1.5] text-zinc-300 dark:text-zinc-600" />
                        <span className="text-xs font-normal">Sin conversaciones previas</span>
                    </div>
                ) : (
                    sessions.map((session) => (
                        <div
                            key={session.id}
                            className={cn(
                                "group relative flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-colors w-full select-none cursor-pointer",
                                currentSessionId === session.id
                                    ? "bg-zinc-200/80 dark:bg-[#2f2f2f] text-zinc-900 dark:text-zinc-100 font-medium shadow-2xs"
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
                                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-all shrink-0 cursor-pointer"
                                title="Eliminar conversación"
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