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

// Professional frontier AI logo (GPT geometric vortex / Claude aesthetic)
export function ProfessionalAILogo({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={cn("transition-transform duration-300 group-hover:scale-105", className)}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4947zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7866A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.1635a.0804.0804 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.402-.6863zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1635a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.6069 1.4997-2.602-1.4997z"/>
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
