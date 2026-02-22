import { Plus, Trash2, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AIPersona } from "@/hooks/useAIPersonas";

interface PersonaSidebarProps {
    personas: AIPersona[];
    activePersona: AIPersona | null;
    onSelectPersona: (persona: AIPersona) => void;
    onCreatePersona: () => void;
    onDeletePersona: (id: string) => void;
    onClearHistory?: () => void;
    isOpen: boolean;
    hasHistory: boolean;
}

export function PersonaSidebar({
    personas,
    activePersona,
    onSelectPersona,
    onCreatePersona,
    onDeletePersona,
    onClearHistory,
    isOpen,
    hasHistory,
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

            {/* Clear History Tool */}
            {hasHistory && onClearHistory && (
                <div className="p-3 mt-auto border-t border-border/40">
                    <Button
                        onClick={onClearHistory}
                        variant="ghost"
                        className="w-full justify-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Vacíar este chat"
                    >
                        <Eraser className="w-4 h-4" />
                        <span className="text-sm font-medium">Borrar el Historial</span>
                    </Button>
                </div>
            )}
        </div>
    );
}
