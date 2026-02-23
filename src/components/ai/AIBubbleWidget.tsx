import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Bot, X, Send, Loader2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useAIPersonas } from "@/hooks/useAIPersonas";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface BubbleMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
}

const PAGE_CONTEXT_MAP: Record<string, string> = {
    "/": "Dashboard - Vista general del estudiante",
    "/carrera": "Plan de Carrera - Materias y progreso académico",
    "/calendario": "Calendario - Eventos y agenda académica",
    "/pomodoro": "Pomodoro - Timer de estudio",
    "/metricas": "Métricas - Estadísticas de estudio",
    "/flashcards": "Flashcards - Mazos de estudio",
    "/marketplace": "Marketplace - Tienda de mazos",
    "/biblioteca": "Biblioteca - Archivos y documentos",
    "/logros": "Logros - Achievements del estudiante",
    "/notion": "Notion - Documentos y apuntes",
    "/amigos": "Amigos - Red social",
    "/configuracion": "Configuración - Ajustes de la cuenta",
    "/bosque": "Mi Bosque - Gamificación con plantas",
    "/discord": "Discord - Chat y comunidad",
};

export function AIBubbleWidget() {
    const location = useLocation();
    const { user, isGuest } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<BubbleMessage[]>([]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { isStreaming, streamMessage } = useStreamingChat();
    const { activePersona } = useAIPersonas();

    // Hide on /asistente page
    if (location.pathname === "/asistente") return null;
    if (!user && !isGuest) return null;

    const currentContext = PAGE_CONTEXT_MAP[location.pathname] || "Otra sección";

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isStreaming) return;

        const userMsg: BubbleMessage = {
            id: `u-${Date.now()}`,
            role: "user",
            content: text,
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");

        const assistantId = `a-${Date.now()}`;
        setMessages((prev) => [
            ...prev,
            { id: assistantId, role: "assistant", content: "" },
        ]);

        const chatHistory = [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
        ];

        await streamMessage(
            chatHistory,
            activePersona?.id || "",
            (delta) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId
                            ? { ...m, content: m.content + delta }
                            : m
                    )
                );
            },
            (result) => {
                if (result.content && result.content !== "") {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId ? { ...m, content: result.content } : m
                        )
                    );
                }
                setTimeout(scrollToBottom, 100);
            },
            (error) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId
                            ? { ...m, content: `❌ ${error.message}` }
                            : m
                    )
                );
            },
            currentContext
        );

        setTimeout(scrollToBottom, 100);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    };

    return (
        <>
            {/* Chat Panel */}
            {isOpen && (
                <div
                    className={cn(
                        "fixed bottom-20 right-4 z-[60] w-[360px] max-w-[calc(100vw-2rem)] bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden",
                        "animate-in fade-in slide-in-from-bottom-4 duration-300"
                    )}
                    style={{ maxHeight: "min(500px, 60vh)" }}
                >
                    {/* Header */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-gradient-to-r from-primary/5 to-transparent">
                        <span className="text-lg">{activePersona?.avatar_emoji || "🤖"}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                                {activePersona?.name || "T.A.B.E. IA"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                                📍 {currentContext}
                            </p>
                        </div>
                        <button
                            onClick={handleToggle}
                            className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ minHeight: "200px" }}>
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground/60">
                                <Bot className="w-10 h-10 mb-2 opacity-30" />
                                <p className="text-xs">
                                    Preguntame lo que quieras sobre<br />
                                    <span className="font-medium text-primary/70">{currentContext}</span>
                                </p>
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex",
                                    msg.role === "user" ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-br-md"
                                            : "bg-secondary/80 text-foreground rounded-bl-md"
                                    )}
                                >
                                    {!msg.content && isStreaming && (
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    )}
                                    {msg.content && msg.role === "assistant" ? (
                                        <div className="prose prose-sm dark:prose-invert prose-p:leading-snug prose-p:my-1 prose-pre:bg-black/50 prose-pre:p-2 prose-pre:rounded-lg prose-math:text-base prose-math:font-medium max-w-none break-words text-foreground">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <span className="whitespace-pre-wrap">{msg.content}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="px-3 py-2.5 border-t border-border/40 bg-background/50">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribí tu mensaje..."
                                disabled={isStreaming}
                                className="flex-1 px-3 py-2 bg-secondary/50 border border-border/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isStreaming || !input.trim()}
                                className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isStreaming ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Bubble Button */}
            <button
                onClick={handleToggle}
                className={cn(
                    "fixed bottom-4 right-4 z-[60] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 group tour-header-ai",
                    isOpen
                        ? "bg-secondary hover:bg-secondary/80 text-foreground scale-90"
                        : "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:scale-110 hover:shadow-xl hover:shadow-primary/25"
                )}
                title={isOpen ? "Cerrar IA" : "Abrir Asistente IA"}
            >
                {isOpen ? (
                    <X className="w-5 h-5" />
                ) : (
                    <>
                        <Bot className="w-6 h-6" />
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                    </>
                )}
            </button>
        </>
    );
}
