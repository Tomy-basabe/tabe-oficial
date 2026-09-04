import { Plus, Trash2, MessageSquare, MessageCircle, Eraser, Pencil } from "lucide-react";
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
    onEditPersona: (persona: AIPersona) => void;
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
    onEditPersona,
    onDeletePersona,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    onClearAllSessions,
    isOpen,
}: PersonaSidebarProps) {
    return (
        <div className={cn(
            "w-72 h-[calc(100vh-4rem)] border-r-4 border-black bg-white flex flex-col sticky top-16 left-0 shrink-0 z-40 transition-all duration-300",
            isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            !isOpen && "hidden md:flex"
        )}>
            {/* Mobile Close Button */}
            <div className="md:hidden absolute right-[-40px] top-2">
                <Button 
                    variant="secondary" 
                    size="icon" 
                    className="rounded-full shadow-lg border border-border"
                    onClick={() => onSelectPersona(activePersona!)} // This is a bit of a hack to trigger the state parent logic if needed, but easier to just use the toggle in parent.
                >
                    <Plus className="w-4 h-4 rotate-45" />
                </Button>
            </div>
            {/* Personas section */}
            <div className="p-4 border-b-4 border-black">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-black text-black uppercase tracking-wider">
                        Tus IAs
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-black hover:bg-[#BFFF00] border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[2px_2px_0_0_#000]"
                        onClick={onCreatePersona}
                        title="Crear nueva IA"
                    >
                        <Plus className="w-5 h-5" strokeWidth={3} />
                    </Button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {personas.map((persona) => (
                        <div
                            key={persona.id}
                            className={cn(
                                "group flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all border-2 border-transparent",
                                activePersona?.id === persona.id
                                    ? "bg-[#C688EB] text-black border-black shadow-[2px_2px_0_0_#000]"
                                    : "text-black hover:bg-gray-100 hover:border-black hover:shadow-[2px_2px_0_0_#000]"
                            )}
                            onClick={() => onSelectPersona(persona)}
                        >
                            <span className="text-2xl flex-shrink-0">{persona.avatar_emoji}</span>
                            <div className="flex-1 min-w-0">
                                <span className="text-sm font-black uppercase truncate block">
                                    {persona.name}
                                </span>
                                {persona.description && (
                                    <span className="text-[10px] text-black/70 font-bold truncate block">
                                        {persona.description}
                                    </span>
                                )}
                            </div>
                            {activePersona?.id === persona.id && (
                                <div className="w-2 h-2 rounded-full bg-black flex-shrink-0 border-2 border-black" />
                            )}
                            <div className="flex bg-white rounded-md shadow-[2px_2px_0_0_#000] border-2 border-black opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-6 h-6 hover:bg-[#BFFF00] text-black rounded-none rounded-l-md flex-shrink-0 border-r-2 border-black"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditPersona(persona);
                                    }}
                                    title="Editar IA"
                                >
                                    <Pencil className="w-3 h-3" strokeWidth={3} />
                                </Button>
                                {!persona.is_default && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-6 h-6 hover:bg-[#FF5C5C] text-black rounded-none rounded-r-md flex-shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeletePersona(persona.id);
                                        }}
                                        title="Eliminar IA"
                                    >
                                        <Trash2 className="w-3 h-3" strokeWidth={3} />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat sessions section */}
            <div className="p-4 border-b-4 border-black flex gap-2">
                <Button
                    onClick={onNewChat}
                    className="flex-1 justify-center gap-2 bg-[#00E5FF] hover:bg-[#00cce6] text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#000] font-black uppercase text-xs h-10 rounded-xl"
                >
                    <Plus className="w-4 h-4" strokeWidth={3} /> Nuevo Chat
                </Button>
                {sessions.length > 0 && onClearAllSessions && (
                    <Button
                        onClick={onClearAllSessions}
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-black border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl hover:bg-[#FF5C5C] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#000]"
                        title="Borrar todo el historial"
                    >
                        <Eraser className="w-4 h-4" strokeWidth={2.5} />
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-2">
                    {sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-black/40 gap-2">
                            <MessageCircle className="w-10 h-10" strokeWidth={1.5} />
                            <span className="text-sm font-black uppercase">Sin historial</span>
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => onSelectSession(session.id)}
                                className={cn(
                                    "group flex items-center justify-between p-3 rounded-xl text-sm transition-all cursor-pointer hover:bg-gray-100 border-2 border-transparent hover:border-black",
                                    currentSessionId === session.id
                                        ? "bg-[#BFFF00] text-black font-black shadow-[2px_2px_0_0_#000] border-black"
                                        : "text-black/70 hover:text-black font-bold"
                                )}
                            >
                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                    <MessageSquare
                                        className={cn(
                                            "w-4 h-4 flex-shrink-0",
                                            currentSessionId === session.id
                                                ? "text-black"
                                                : "text-black/70"
                                        )}
                                        strokeWidth={2.5}
                                    />
                                    <span className="truncate text-sm">{session.title}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-8 h-8 opacity-70 hover:opacity-100 transition-all hover:bg-[#FF5C5C] hover:text-black shrink-0 border-2 border-transparent hover:border-black rounded-lg hover:shadow-[2px_2px_0_0_#000]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSession(session.id);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
