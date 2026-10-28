import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Send, Loader2, Minimize2, Maximize2, Radio } from "lucide-react";
import { cn, orchestrateContentOpen } from "@/lib/utils";
import { useAIPersonas } from "@/hooks/useAIPersonas";
import { useAIChat, DisplayMessage } from "@/contexts/AIChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { ChatMessageContent } from "@/components/ai/ChatMessage";
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
    "/marketplace": "Comunidad - Recursos y aportes de estudiantes",
    "/comunidad": "Comunidad - Recursos y aportes de estudiantes",
    "/biblioteca": "Biblioteca - Archivos y documentos",
    "/logros": "Logros - Achievements del estudiante",
    "/apuntes": "Apuntes - Documentos y notas",
    "/notion": "Apuntes - Documentos y notas",
    "/amigos": "Amigos - Red social",
    "/configuracion": "Configuración - Ajustes de la cuenta",
    "/bosque": "Mi Bosque - Gamificación con plantas",
    "/tabetalk": "Tabetalk - Chat y llamadas",
    "/discord": "Tabetalk - Chat y llamadas",
};

export function AIBubbleWidget() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isGuest } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { messages, setMessages, inputValue: input, setInputValue: setInput, isStreaming, aiStatus, streamMessage, selectedModel } = useAIChat();
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
                if (result.event_created) toast.success("Evento agregado");
                if (result.flashcards_created) toast.success("Flashcards creadas");
                if (result.db_mutations && result.db_mutations.length > 0) {
                    result.db_mutations.forEach((m: any) => {
                        if (m.message) toast.success(m.message);
                    });
                }
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
            {/* Chat Panel (Apple / ChatGPT / Notion Glass Sheet) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="ai-bubble-panel"
                        ref={(node) => {
                            if (node) orchestrateContentOpen(node, { skipContainerClass: true });
                        }}
                        initial={{ opacity: 0, scale: 0.94, y: 18 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: 14, transition: { duration: 0.17, ease: [0.32, 0, 0.67, 0] } }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className={cn(
                            "fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-3 sm:right-4 z-[60] w-[380px] max-w-[calc(100vw-1.5rem)] rounded-[24px] flex flex-col overflow-hidden relative origin-bottom-right",
                            "bg-white/95 dark:bg-[#17171a]/95 backdrop-blur-2xl backdrop-saturate-150 border border-zinc-200/80 dark:border-zinc-800/90 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
                        )}
                        style={{ maxHeight: "min(540px, 68dvh)" }}
                    >
                        {/* Subtle ambient glow */}
                        <div className="absolute -top-16 -right-16 w-44 h-44 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent dark:from-indigo-500/15 dark:via-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200/70 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md relative z-10">
                            <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white p-1.5 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs shrink-0">
                                <ProfessionalAILogo className="w-full h-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[13px] font-semibold tracking-tight truncate text-zinc-900 dark:text-zinc-100">
                                        {activePersona?.name || "T.A.B.E. IA"}
                                    </p>
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                </div>
                                <div className="flex items-center gap-1.5 truncate">
                                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                                        {currentContext}
                                    </span>
                                    <span
                                        className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded-full border shrink-0 hidden sm:inline-block"
                                        style={{
                                            borderColor: `${selectedModel?.color || '#6366f1'}40`,
                                            color: selectedModel?.color || '#6366f1',
                                            backgroundColor: `${selectedModel?.color || '#6366f1'}12`,
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
                                    className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                                    title="Abrir página completa de la IA"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleToggle}
                                    className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                                    title="Minimizar"
                                >
                                    <Minimize2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 relative z-10" style={{ minHeight: "200px" }}>
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center py-8 text-zinc-500 dark:text-zinc-400">
                                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mb-2.5 p-2.5">
                                        <ProfessionalAILogo className="w-full h-full" />
                                    </div>
                                    <p className="text-xs font-medium leading-relaxed">
                                        Preguntame lo que quieras sobre<br />
                                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{currentContext}</span>
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
                                                ? "max-w-[85%] rounded-2xl px-3.5 py-2 font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-br-xs shadow-xs"
                                                : "flex-1 min-w-0 bg-transparent text-zinc-900 dark:text-zinc-100 font-normal py-0.5"
                                        )}
                                    >
                                        {!msg.content && isStreaming && (
                                            <AIThinkingIndicator personaName={activePersona?.name} state={aiStatus?.state} label={aiStatus?.label} detail={aiStatus?.detail} />
                                        )}
                                        {msg.content && msg.role === "assistant" ? (
                                            <ChatMessageContent content={msg.content} className="prose-p:leading-snug prose-p:my-1 text-xs md:text-sm" />
                                        ) : (
                                            <span className="whitespace-pre-wrap">{msg.content}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input (ChatGPT pill bar style) */}
                        <div className="px-3 py-2.5 border-t border-zinc-200/70 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md relative z-10">
                            <div className="flex items-center gap-1.5 bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/70 rounded-full pl-3.5 pr-1.5 py-1">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Preguntar a TABE IA..."
                                    disabled={isStreaming}
                                    className="flex-1 py-1 bg-transparent text-[14px] font-normal focus:outline-none disabled:opacity-50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                                />
                                <button
                                    onClick={() => navigate("/asistente?live=true")}
                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer shrink-0"
                                    title="Iniciar Modo de Voz en Vivo"
                                >
                                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                                </button>
                                <button
                                    onClick={handleSend}
                                    disabled={isStreaming || !input.trim()}
                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
                                >
                                    {isStreaming ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Send className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Bubble Button (Clean Apple / ChatGPT orb) */}
            <button
                onClick={handleToggle}
                className={cn(
                    "fixed bottom-[calc(4.4rem+env(safe-area-inset-bottom,0px))] right-3.5 md:bottom-6 md:right-6 z-[60] w-11 h-11 lg:w-13 lg:h-13 rounded-full flex items-center justify-center transition-all duration-200 group tour-header-ai cursor-pointer",
                    isOpen
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border border-zinc-700 dark:border-zinc-300 shadow-lg scale-95"
                        : "bg-zinc-900/95 dark:bg-white/95 text-white dark:text-zinc-900 border border-zinc-800/80 dark:border-zinc-200/80 shadow-[0_8px_24px_rgba(0,0,0,0.22)] dark:shadow-[0_8px_28px_rgba(255,255,255,0.16)] hover:scale-105 active:scale-95 backdrop-blur-md"
                )}
                title={isOpen ? "Cerrar IA" : "Abrir Asistente TABE IA"}
            >
                {isOpen ? (
                    <X className="w-4 h-4 stroke-[2.2]" />
                ) : (
                    <>
                        <ProfessionalAILogo className="w-5 h-5 lg:w-6 lg:h-6" />
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                    </>
                )}
            </button>
        </>
    );
}
