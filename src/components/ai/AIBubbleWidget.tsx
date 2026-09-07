import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X, Send, Loader2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIPersonas } from "@/hooks/useAIPersonas";
import { useAIChat, DisplayMessage } from "@/contexts/AIChatContext";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// Proprietary TABE Neural AI Logo (custom engineered for TABE)
export function ProfessionalAILogo({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={cn("transition-transform duration-300 group-hover:scale-105", className)}
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Central Radiant Intelligence Spark */}
            <path d="M12 7.2C12 9.85 9.85 12 7.2 12C9.85 12 12 14.15 12 16.8C12 14.15 14.15 12 16.8 12C14.15 12 12 9.85 12 7.2Z" />

            {/* 4 Interlocking Orbital Neural Ribbons (Rotational 90° Symmetry) */}
            <path d="M12 2.2C16.86 2.2 20.8 6.14 20.8 11C20.8 12.6 20.35 14.1 19.55 15.4L17.2 14.05C17.7 13.15 18 12.1 18 11C18 7.69 15.31 5 12 5C10.9 5 9.85 5.3 8.95 5.8L7.6 3.45C8.9 2.65 10.4 2.2 12 2.2Z" />
            <path d="M21.8 12C21.8 16.86 17.86 20.8 13 20.8C11.4 20.8 9.9 20.35 8.6 19.55L9.95 17.2C10.85 17.7 11.9 18 13 18C16.31 18 19 15.31 19 12C19 10.9 18.7 9.85 18.2 8.95L20.55 7.6C21.35 8.9 21.8 10.4 21.8 12Z" />
            <path d="M12 21.8C7.14 21.8 3.2 17.86 3.2 13C3.2 11.4 3.65 9.9 4.45 8.6L6.8 9.95C6.3 10.85 6 11.9 6 13C6 16.31 8.69 19 12 19C13.1 19 14.15 18.7 15.05 18.2L16.4 20.55C15.1 21.35 13.6 21.8 12 21.8Z" />
            <path d="M2.2 12C2.2 7.14 6.14 3.2 11 3.2C12.6 3.2 14.1 3.65 15.4 4.45L14.05 6.8C13.15 6.3 12.1 6 11 6C7.69 6 5 8.69 5 12C5 13.1 5.3 14.15 5.8 15.05L3.45 16.4C2.65 15.1 2.2 13.6 2.2 12Z" />
        </svg>
    );
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { messages, setMessages, inputValue: input, setInputValue: setInput, isStreaming, streamMessage } = useAIChat();
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

        const userMsg: DisplayMessage = {
            id: `u-${Date.now()}`,
            role: "user",
            content: text,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");

        const assistantId = `a-${Date.now()}`;
        setMessages((prev) => [
            ...prev,
            { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
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
                        "fixed bottom-24 right-3 sm:right-4 z-[60] w-[360px] max-w-[calc(100vw-1.5rem)] bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden",
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
                                <ProfessionalAILogo className="w-10 h-10 mb-2 opacity-35 text-primary" />
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
                    "fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[60] w-12 h-12 lg:w-14 lg:h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 group tour-header-ai",
                    isOpen
                        ? "bg-secondary hover:bg-secondary/80 text-foreground scale-90"
                        : "bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground hover:scale-110 hover:shadow-xl hover:shadow-primary/30"
                )}
                title={isOpen ? "Cerrar IA" : "Abrir Asistente IA"}
            >
                {isOpen ? (
                    <X className="w-5 h-5" />
                ) : (
                    <>
                        <ProfessionalAILogo className="w-6 h-6 lg:w-7 lg:h-7" />
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
                    </>
                )}
            </button>
        </>
    );
}
