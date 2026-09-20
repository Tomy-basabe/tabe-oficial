import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Send, Loader2, Minimize2, Maximize2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIPersonas } from "@/hooks/useAIPersonas";
import { useAIChat, DisplayMessage } from "@/contexts/AIChatContext";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { TabeAIIcon } from "@/components/icons/TabeAIIcon";
import { AIThinkingIndicator } from "@/components/ai/AIThinkingIndicator";
import "katex/dist/katex.min.css";

// Proprietary TABE Neural AI Logo (custom engineered for TABE)
export function ProfessionalAILogo({
    className = "w-6 h-6",
    inverted = true,
}: {
    className?: string;
    inverted?: boolean;
}) {
    return <TabeAIIcon className={className} variant="gradient" inverted={inverted} />;
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
    const navigate = useNavigate();
    const { user, isGuest } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { messages, setMessages, inputValue: input, setInputValue: setInput, isStreaming, streamMessage, selectedModel } = useAIChat();
    const { activePersona } = useAIPersonas();

    // Hide on /asistente or /TABEAI page
    if (location.pathname === "/asistente" || location.pathname === "/TABEAI") return null;
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
            currentContext,
            undefined,
            undefined,
            // onReset: limpia el mensaje si el modelo falla y entra el fallback
            () => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId ? { ...m, content: "" } : m
                    )
                );
            }
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
        // En computadoras: abrir en una página aparte donde solo sea de la IA
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
            navigate("/TABEAI");
            return;
        }
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
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate("/TABEAI");
                                }}
                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                                title="Abrir página completa de la IA"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleToggle}
                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                                title="Minimizar"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 relative z-10" style={{ minHeight: "200px" }}>
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground/60">
                                <div className="w-14 h-14 flex items-center justify-center mb-2">
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
                                    "flex gap-2",
                                    msg.role === "user" ? "justify-end" : "justify-start items-start"
                                )}
                            >
                                {msg.role === "assistant" && (
                                    <div className="w-6 h-6 shrink-0 mt-0.5">
                                        <ProfessionalAILogo className="w-full h-full" />
                                    </div>
                                )}
                                <div
                                    className={cn(
                                        "text-sm leading-relaxed",
                                        msg.role === "user"
                                            ? "max-w-[85%] rounded-2xl px-3.5 py-2 font-bold bg-[#1475e5] text-white border-2 border-black/20 dark:border-transparent rounded-br-sm shadow-sm"
                                            : "flex-1 min-w-0 bg-transparent text-foreground font-normal py-0.5"
                                    )}
                                >
                                    {!msg.content && isStreaming && (
                                        <AIThinkingIndicator personaName={activePersona?.name} />
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
                                onClick={() => navigate("/asistente?live=true")}
                                className="p-2 rounded-xl bg-[#00E5FF] hover:bg-[#00cce6] text-black transition-all border-2 border-black/20 shadow-sm cursor-pointer"
                                title="Iniciar Modo de Voz en Vivo (ChatGPT / Gemini Live)"
                            >
                                <Radio className="w-4 h-4 stroke-[2.5] animate-pulse" />
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={isStreaming || !input.trim()}
                                className="p-2 rounded-xl bg-gradient-to-br from-[#1475e5] to-[#805ad5] text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed border-2 border-black/20 shadow-sm cursor-pointer"
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
