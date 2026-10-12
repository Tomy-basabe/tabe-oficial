import { MessageSquare, Trash2, Plus, MessageCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import HoldButton from "@/components/ui/HoldButton";

export interface ChatSession {
    id: string;
    title: string;
    date: Date;
}

interface ChatHistoryProps {
    sessions: ChatSession[];
    currentSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onDeleteSession: (id: string, e: React.MouseEvent) => void;
    isOpen: boolean;
}

export function ChatHistory({
    sessions,
    currentSessionId,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    isOpen
}: ChatHistoryProps) {

    if (!isOpen) return null;

    return (
        <div className="w-64 h-[calc(100vh-4rem)] border-r border-border/40 bg-background/50 backdrop-blur-sm flex flex-col hidden md:flex sticky top-16 left-0 shrink-0">
            <div className="p-4 border-b border-border/40">
                <Button
                    onClick={onNewChat}
                    className="w-full justify-start gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-none shadow-none font-medium"
                    variant="outline"
                >
                    <Plus className="w-4 h-4" /> Nuevo Chat
                </Button>
            </div>

            <ScrollArea className="flex-1 px-3 py-3">
                <div className="space-y-1">
                    {sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/60 gap-2">
                            <MessageCircle className="w-8 h-8 opacity-20" />
                            <span className="text-xs">Sin historial reciente</span>
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => onSelectSession(session.id)}
                                className={cn(
                                    "group flex items-center justify-between p-2.5 rounded-lg text-sm transition-all cursor-pointer hover:bg-accent/50",
                                    currentSessionId === session.id
                                        ? "bg-accent text-accent-foreground font-medium shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                                    <MessageSquare className={cn(
                                        "w-3.5 h-3.5 flex-shrink-0 transition-colors",
                                        currentSessionId === session.id ? "text-primary" : "text-muted-foreground/70"
                                    )} />
                                    <span className="truncate text-xs leading-none py-1">{session.title}</span>
                                </div>
                                <HoldButton
                                    size="icon-sm"
                                    holdTime={1000}
                                    backgroundColor="transparent"
                                    fillColor="#ef4444"
                                    textColor="currentColor"
                                    fillTextColor="#ffffff"
                                    icon={<Trash2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-destructive shrink-0" />}
                                    doneIcon={<Check className="w-3.5 h-3.5 text-white shrink-0" />}
                                    doneLabel=""
                                    onHold={() => onDeleteSession(session.id, {} as any)}
                                    title="Mantén presionado para borrar chat"
                                    aria-label="Borrar chat"
                                    className="opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 shrink-0"
                                />
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
