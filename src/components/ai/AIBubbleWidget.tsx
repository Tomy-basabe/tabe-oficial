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

    const { messages, setMessages, inputValue: input, setInputValue: setInput, isStreaming, streamMessage, selectedModel } = useAIChat();
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
                        "fixed bottom-24 right-3 sm:right-4 z-[60] w-[375px] max-w-[calc(100vw-1.5rem)] rounded-2xl flex flex-col overflow-hidden relative",
                        // Light Mode: Fondo degradé nítido con borde negro sólido y sombra neobrutalista
                        "bg-gradient-to-b from-white via-slate-50 to-indigo-50/40 border-[3px] border-black shadow-[8px_8px_0_0_#000000]",
                        // Dark Mode: Fondo cósmico profundo con borde cian tenue y glow tecnológico
                        "dark:bg-gradient-to-b dark:from-[#0c1222] dark:via-[#090d18] dark:to-[#05070e] dark:border-cyan-500/40 dark:shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.18)]",
                        "animate-in fade-in slide-in-from-bottom-4 duration-300"
                    )}
                    style={{ maxHeight: "min(520px, 65vh)" }}
                >
                    {/* Atmospheric background glows */}
                    <div className="absolute -top-16 -right-16 w-44 h-44 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-transparent dark:from-cyan-500/15 dark:via-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-gradient-to-tr from-cyan-500/10 via-emerald-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-black/10 dark:border-cyan-500/20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md relative z-10">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1475e5] via-[#805ad5] to-[#00E5FF] p-1.5 text-white flex items-center justify-center border-2 border-black dark:border-cyan-400/60 shadow-[2px_2px_0_0_#000000] dark:shadow-[0_0_10px_rgba(6,182,212,0.4)] shrink-0">
                            <ProfessionalAILogo className="w-full h-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <p className="text-sm font-black uppercase tracking-wide truncate text-foreground">
                                    {activePersona?.name || "T.A.B.E. IA"}
                                </p>
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                                <span className="text-[10px] font-bold text-muted-foreground truncate">
                                    📍 {currentContext}
                                </span>
                                <span
                                    className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded border shrink-0 hidden sm:inline-block"
                                    style={{
                                        borderColor: `${selectedModel?.color || '#00E5FF'}60`,
                                        color: selectedModel?.color || '#00E5FF',
                                        backgroundColor: `${selectedModel?.color || '#00E5FF'}15`,
                                    }}
                                >
                                    {selectedModel?.name?.split(" ")[0] || "IA"}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleToggle}
                            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                            title="Minimizar"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 relative z-10" style={{ minHeight: "200px" }}>
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground/60">
                                <div className="w-12 h-12 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center p-2.5 mb-2 border border-black/20 dark:border-white/20 shadow-sm">
                                    <ProfessionalAILogo className="w-full h-full" />
                                </div>
                                <p className="text-xs font-bold">
                                    Preguntame lo que quieras sobre<br />
                                    <span className="font-black text-foreground uppercase">{currentContext}</span>
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
                                        "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed font-semibold",
                                        msg.role === "user"
                                            ? "bg-[#1475e5] text-white border-2 border-black/20 dark:border-transparent rounded-br-sm shadow-sm"
                                            : "bg-white/90 dark:bg-slate-800/90 text-foreground border-2 border-black/10 dark:border-cyan-500/20 rounded-bl-sm shadow-sm"
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
                    <div className="px-3 py-2.5 border-t border-black/10 dark:border-cyan-500/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md relative z-10">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribí tu mensaje..."
                                disabled={isStreaming}
                                className="flex-1 px-3.5 py-2 bg-slate-100 dark:bg-slate-800/70 border-2 border-black/10 dark:border-cyan-500/30 rounded-xl text-sm font-bold focus:outline-none focus:border-primary disabled:opacity-50 text-foreground placeholder:text-muted-foreground/60"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isStreaming || !input.trim()}
                                className="p-2 rounded-xl bg-gradient-to-br from-[#1475e5] to-[#805ad5] text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed border-2 border-black/20 shadow-sm"
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
                    "fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[60] w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center transition-all duration-300 group tour-header-ai",
                    isOpen
                        ? "bg-card text-foreground border-[3px] border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] scale-90"
                        : cn(
                            // Light Mode: Fondo negro y logo blanco con sombra brutalista
                            "bg-black text-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0_0_rgba(0,0,0,0.4)] hover:scale-110",
                            // Dark Mode: Fondo blanco y logo negro con halo blanco limpio
                            "dark:bg-white dark:text-black dark:border-white dark:shadow-[0_0_20px_rgba(255,255,255,0.35)] dark:hover:shadow-[0_0_28px_rgba(255,255,255,0.55)]"
                        )
                )}
                title={isOpen ? "Cerrar IA" : "Abrir Asistente TABE IA"}
            >
                {isOpen ? (
                    <X className="w-5 h-5 stroke-[2.5]" />
                ) : (
                    <>
                        <ProfessionalAILogo className="w-6 h-6 lg:w-7 lg:h-7" />
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-black dark:border-background shadow-sm animate-pulse" />
                    </>
                )}
            </button>
        </>
    );
}
