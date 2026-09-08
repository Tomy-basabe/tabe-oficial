import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Send, Bot, User, Sparkles, BookOpen, FileQuestion, Calendar, Menu, Mic, X, Paperclip, Loader2, ArrowLeft, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { useAIPersonas, AIPersona, AIChatMessage } from "@/hooks/useAIPersonas";
import { useAIChat } from "@/contexts/AIChatContext";
import { AdsterraBanner } from "@/components/ads/AdsterraBanner";
import { PersonaSidebar } from "@/components/ai/PersonaSidebar";
import { PersonaOnboarding } from "@/components/ai/PersonaOnboarding";
import { PersonaEditModal } from "@/components/ai/PersonaEditModal";
import { ModelSelector } from "@/components/ai/ModelSelector";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { TabeAIIcon } from "@/components/icons/TabeAIIcon";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// Interface DisplayMessage is now exported from AIChatContext, we can import it
import { DisplayMessage } from "@/contexts/AIChatContext";

const quickActions = [
  { id: "explain", label: "Explicar tema", icon: BookOpen, prompt: "Explícame el concepto de " },
  { id: "quiz", label: "Simulacro", icon: FileQuestion, prompt: "Hazme un simulacro de examen de " },
  { id: "plan", label: "Plan de estudio", icon: Calendar, prompt: "Genera un plan de estudio para " },
  { id: "schedule", label: "Agendar", icon: Calendar, prompt: "Agendame " },
  { id: "progress", label: "Mi progreso", icon: Sparkles, prompt: "Analizá mi progreso académico y dame recomendaciones" },
];

function getGreeting(persona: AIPersona): DisplayMessage {
  return {
    id: "init",
    role: "assistant",
    content: `¡Hola! 👋 Soy **${persona.name}**, tu asistente académico personal.\n\n¿En qué te puedo ayudar hoy?`,
    timestamp: new Date(),
  };
}

export default function AIAssistant() {
  const { user, isGuest } = useAuth();
  
  // Use global chat state
  const {
    messages, setMessages,
    inputValue, setInputValue,
    currentSessionId, setCurrentSessionId,
    currentSessionRef,
    isStreaming, streamMessage,
    selectedModel, setSelectedModel
  } = useAIChat();

  const {
    personas,
    activePersona,
    sessions,
    loading,
    switchPersona,
    createPersona,
    updatePersona,
    deletePersona,
    loadSessions,
    createSession,
    deleteSession,
    loadMessages,
    saveMessage,
  } = useAIPersonas();
  const { canUse, incrementUsage } = useUsageLimits();

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== "undefined" ? window.innerWidth >= 768 : false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editingPersona, setEditingPersona] = useState<AIPersona | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const prevPersonaIdRef = useRef<string | null>(null);

  // Load sessions when persona changes
  useEffect(() => {
    if (activePersona) {
      loadSessions(activePersona.id);
      
      // Solo reiniciar mensajes si la persona REALMENTE cambió (el usuario seleccionó otra IA)
      if (prevPersonaIdRef.current && prevPersonaIdRef.current !== activePersona.id) {
        if (!isStreaming) {
          setCurrentSessionId(null);
          currentSessionRef.current = null;
          setMessages([getGreeting(activePersona)]);
        }
      } else if (!messages.length) {
        setMessages([getGreeting(activePersona)]);
      }
      prevPersonaIdRef.current = activePersona.id;
    }
  }, [activePersona?.id]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [messages, isStreaming]);

  // ---- Persona actions ----
  const handleSelectPersona = (persona: AIPersona) => {
    switchPersona(persona);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleCreatePersona = async (data: {
    name: string;
    avatar_emoji: string;
    description: string;
    personality_prompt: string;
  }) => {
    const persona = await createPersona(data);
    if (persona) {
      toast.success(`${data.avatar_emoji} ${data.name} creada`);
      setShowOnboarding(false);
    } else {
      toast.error("Error al crear la IA");
    }
  };

  const handleDeletePersona = async (id: string) => {
    if (window.confirm("¿Seguro que querés eliminar esta IA y todo su historial?")) {
      const ok = await deletePersona(id);
      if (ok) {
        toast.success("IA eliminada corporativamente");
      }
    }
  };

  const handleEditPersona = async (id: string, updates: Partial<AIPersona>) => {
    const ok = await updatePersona(id, updates);
    if (ok) {
      toast.success("IA actualizada correctamente");
      setEditingPersona(null);
    } else {
      toast.error("Error al actualizar la IA");
    }
  };

  // ---- Session actions ----
  const handleNewChat = () => {
    if (!isStreaming) {
      setCurrentSessionId(null);
      currentSessionRef.current = null;
      if (activePersona) {
        setMessages([getGreeting(activePersona)]);
      }
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    currentSessionRef.current = sessionId;
    const msgs = await loadMessages(sessionId);
    if (msgs.length > 0) {
      setMessages(
        msgs.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
        }))
      );
    }
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    const ok = await deleteSession(sessionId);
    if (ok && currentSessionRef.current === sessionId) {
      handleNewChat();
    }
  };

  const handleClearAllSessions = async () => {
    if (!activePersona) return;
    
    if (!window.confirm("¿Seguro que querés borrar TODO el historial de sesiones de esta IA? Esta acción no se puede deshacer.")) {
      return;
    }

    const toDelete = [...sessions];
    let count = 0;
    for (const s of toDelete) {
      const ok = await deleteSession(s.id);
      if (ok) count++;
    }
    handleNewChat();
    toast.success(`${count} conversación(es) eliminadas`);
  };

  // ---- File upload ----
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      if (file.type === "application/pdf") {
        const { extractTextFromPdf } = await import("@/lib/pdf-utils");
        const text = await extractTextFromPdf(file);
        setInputValue((prev) => `${prev ? prev + "\n\n" : ""}📄 **Contenido de ${file.name}:**\n${text}`);
        toast.success("PDF procesado");
      } else if (file.type === "text/plain" || file.name.endsWith(".md")) {
        const text = await file.text();
        setInputValue((prev) => `${prev ? prev + "\n\n" : ""}📄 **Contenido de ${file.name}:**\n${text}`);
        toast.success("Archivo procesado");
      } else {
        toast.error("Formato no soportado. Usa PDF o TXT.");
      }
    } catch {
      toast.error("Error al leer el archivo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ---- Send message ----
  const handleSend = async () => {
    // Sin límites (Ads-only model)
    const userMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    // Limpiar saludo inicial para empezar el chat real
    const existingMessages = messages.filter((m) => m.id !== "init");
    const newMessages = [...existingMessages, userMessage];
    setMessages(newMessages);
    setInputValue("");

    // Create or reuse session
    let sessionId = currentSessionRef.current;
    if (!sessionId) {
      const title = inputValue.slice(0, 40) + (inputValue.length > 40 ? "..." : "");
      const session = await createSession(activePersona.id, title);
      if (!session) {
        toast.error("Error al crear la sesión");
        return;
      }
      sessionId = session.id;
      currentSessionRef.current = sessionId;
      setCurrentSessionId(sessionId);

      // Save any initial messages that are real (skip the greeting)
    }

    // Save user message to DB
    await saveMessage(sessionId, "user", inputValue);
    await incrementUsage("ia_daily");

    // Prepare conversation for the AI
    const conversationHistory = newMessages
      .filter((m) => m.id !== "init")
      .map((m) => ({ role: m.role, content: m.content }));

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: "", timestamp: new Date() },
    ]);

    let fullContent = "";

    streamMessage(
      conversationHistory,
      activePersona.id, // pass persona ID instead of personality string
      (delta) => {
        fullContent += delta;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: fullContent } : m
          )
        );
      },
      async (result) => {
        if (result.event_created) toast.success("Evento agregado");
        if (result.flashcards_created) toast.success("Flashcards creadas");

        // Save assistant response to DB
        if (sessionId && fullContent) {
          await saveMessage(sessionId, "assistant", fullContent);
        }
      },
      (error) => {
        toast.error(error.message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: `Error: ${error.message}` } : m
          )
        );
      }
    );
  };

  const handleQuickAction = (prompt: string) => setInputValue(prompt);

  const startVoiceInput = () => {
    try {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) { toast.error("No soportado"); return; }
      const recognition = new SpeechRecognition();
      recognition.lang = "es-AR";
      recognition.interimResults = false;
      toast.info("Escuchando... 🎙️");
      recognition.onresult = (e: any) => {
        const t = e.results[0][0].transcript;
        if (t) { setInputValue((prev) => prev + (prev ? " " : "") + t); toast.success("Escuchado"); }
      };
      recognition.start();
    } catch {
      toast.error("Error al iniciar voz");
    }
  };

  const renderContent = (content: string, role: "user" | "assistant") => {
    if (!content)
      return (
        <div className="flex items-center gap-2 text-muted-foreground/80 italic animate-pulse">
          <Sparkles className="w-4 h-4 text-neon-cyan" />
          <span className="text-neon-cyan/80">Pensando...</span>
        </div>
      );

    if (role === "user") {
      return content.split("\n").map((line, i) => <div key={i} className="!text-black font-bold">{line}</div>);
    }

    return (
      <div className="prose prose-sm dark:prose-invert prose-p:leading-snug prose-p:my-1 prose-pre:bg-black/50 prose-pre:p-2 prose-pre:rounded-lg prose-math:text-base prose-math:font-medium max-w-none break-words text-foreground font-semibold">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  if (loading) {
    return <LoadingScreen message="Cargando Asistente T.A.B.E..." submessage="Iniciando inteligencia artificial..." />;
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] lg:h-screen bg-background overflow-hidden relative">
      <PersonaSidebar
        personas={personas}
        activePersona={activePersona}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectPersona={(p) => {
          handleSelectPersona(p);
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        onCreatePersona={() => setShowOnboarding(true)}
        onEditPersona={setEditingPersona}
        onDeletePersona={handleDeletePersona}
        onSelectSession={(s) => {
          handleSelectSession(s);
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        onNewChat={() => {
          handleNewChat();
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        onDeleteSession={handleDeleteSession}
        onClearAllSessions={handleClearAllSessions}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {showOnboarding && (
        <PersonaOnboarding
          onComplete={handleCreatePersona}
          onCancel={() => setShowOnboarding(false)}
        />
      )}

      {editingPersona && (
        <PersonaEditModal
          persona={editingPersona}
          onComplete={handleEditPersona}
          onCancel={() => setEditingPersona(null)}
        />
      )}

      <div className="flex-1 flex flex-col h-full relative">
        <div className="absolute left-4 top-4 z-50 flex items-center gap-2 md:hidden">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-foreground bg-card text-foreground font-black text-xs uppercase shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-y-[1px]"
            title="Volver a TABE"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn("bg-card/90 backdrop-blur-sm border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] text-foreground rounded-xl", isSidebarOpen && "hidden")}
            title="Ver conversaciones y personalidades"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Link
                    to="/dashboard"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-foreground bg-card text-foreground font-black text-xs uppercase shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] active:translate-y-[1px] transition-all shrink-0 group"
                    title="Volver a la plataforma principal"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Volver a TABE</span>
                  </Link>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:flex border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] text-foreground hover:bg-muted shrink-0"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    title={isSidebarOpen ? "Ocultar panel lateral" : "Mostrar historial y personalidades"}
                  >
                    <Menu className="w-5 h-5 text-foreground" />
                  </Button>
                  <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black p-2 flex items-center justify-center border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] shrink-0">
                    <TabeAIIcon className="w-full h-full text-white dark:text-black" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <h1 className="font-black text-2xl lg:text-3xl uppercase text-foreground leading-tight">
                      {activePersona?.name || "TABE IA"}
                    </h1>
                    {activePersona?.description && (
                      <p className="font-bold text-muted-foreground text-xs lg:text-sm uppercase tracking-wide">
                        {activePersona.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                  <ModelSelector
                    selectedModel={selectedModel}
                    onSelectModel={(m) => {
                      setSelectedModel(m);
                      toast.success(`Modelo activo: ${m.name}`);
                    }}
                    disabled={isStreaming}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open("/TABEAI", "_blank")}
                    className="border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] text-foreground shrink-0 hidden sm:flex"
                    title="Abrir en pestaña nueva"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <div className="px-3 py-1.5 bg-[#BFFF00] !text-black border-2 border-foreground rounded-full font-black uppercase text-xs flex items-center gap-2 shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                    <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                    Online
                  </div>
                </div>
              </div>
            </div>

            {messages.length <= 1 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="flex flex-col items-center justify-center gap-3 p-4 bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all text-center group"
                    >
                      <div className="p-3 rounded-xl bg-muted border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] text-foreground group-hover:bg-[#00E5FF] group-hover:!text-black transition-colors">
                        <Icon className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                      <span className="text-sm font-black uppercase text-foreground">
                        {action.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="space-y-6 pb-24 min-h-[300px]">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4 group",
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-xl flex items-center justify-center flex-shrink-0 mt-1",
                      message.role === "assistant"
                        ? "bg-black text-white dark:bg-white dark:text-black p-2"
                        : "bg-[#FFD700] text-black"
                    )}
                  >
                    {message.role === "assistant" ? (
                      activePersona?.avatar_emoji && activePersona.avatar_emoji !== "🤖" ? (
                        <span className="text-lg font-black">{activePersona.avatar_emoji}</span>
                      ) : (
                        <TabeAIIcon className="w-full h-full text-white dark:text-black" />
                      )
                    ) : (
                      <User className="w-5 h-5 text-black" strokeWidth={2.5} />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[85%] lg:max-w-[75%] rounded-xl px-5 py-4 border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] overflow-hidden relative",
                      message.role === "user"
                        ? "bg-[#BFFF00] !text-black"
                        : "bg-card text-foreground"
                    )}
                  >
                    <div className="text-base font-bold space-y-2 leading-relaxed break-words">
                      {renderContent(message.content, message.role)}
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-2 mt-2 text-[10px] font-black uppercase",
                        message.role === "user"
                          ? "!text-black/70"
                          : "text-muted-foreground"
                      )}
                    >
                      <span>
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6 bg-transparent sticky bottom-0 z-20">
          <div className="max-w-3xl mx-auto relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.txt,.md"
            />
            <div className="flex gap-2 items-end bg-card p-3 rounded-xl border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))]">
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground mb-1 hover:bg-muted border-2 border-transparent hover:border-foreground rounded-lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isStreaming}
                title="Adjuntar PDF/Texto"
              >
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Paperclip className="w-6 h-6" strokeWidth={2.5} />
                )}
              </Button>

              <textarea
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  // Auto-resize
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isUploading
                    ? "Procesando archivo..."
                    : `Preguntale a ${activePersona?.name || "tu IA"}... (Shift+Enter para nueva línea)`
                }
                className="flex-1 px-4 py-3 bg-transparent border-none focus:outline-none text-base font-bold placeholder:text-muted-foreground placeholder:font-bold resize-none overflow-y-auto text-foreground"
                style={{ minHeight: "44px", maxHeight: "200px" }}
                rows={1}
                disabled={isStreaming || isUploading}
              />

              <div className="flex gap-2 pb-1 pr-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-foreground mb-1 hover:bg-muted border-2 border-transparent hover:border-foreground rounded-lg"
                  onClick={startVoiceInput}
                  title="Dictar por voz"
                  disabled={isStreaming}
                >
                  <Mic className="w-6 h-6" strokeWidth={2.5} />
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isStreaming}
                  size="icon"
                  className={cn(
                    "rounded-xl transition-all duration-300 border-4 border-foreground mb-1 h-12 w-12",
                    inputValue.trim() && !isStreaming
                      ? "bg-[#00E5FF] !text-black hover:bg-[#00cce6] hover:translate-y-[2px] shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                      : "bg-muted text-muted-foreground cursor-not-allowed shadow-[2px_2px_0_0_hsl(var(--foreground)/0.2)]"
                  )}
                >
                  <Send className="w-6 h-6" strokeWidth={3} />
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-center font-black uppercase text-muted-foreground mt-4">
              {activePersona?.name || "T.A.B.E. IA"} puede cometer errores. El modo offline para archivos está activo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
