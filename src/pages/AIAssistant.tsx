import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, BookOpen, FileQuestion, Calendar, Menu, Mic, X, Paperclip, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useAIPersonas, AIPersona, AIChatMessage } from "@/hooks/useAIPersonas";
import { PersonaSidebar } from "@/components/ai/PersonaSidebar";
import { PersonaOnboarding } from "@/components/ai/PersonaOnboarding";
import { Button } from "@/components/ui/button";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

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
  const { user } = useAuth();
  const { isStreaming, streamMessage } = useStreamingChat();
  const {
    personas,
    activePersona,
    sessions,
    loading,
    switchPersona,
    createPersona,
    deletePersona,
    loadSessions,
    createSession,
    deleteSession,
    loadMessages,
    saveMessage,
  } = useAIPersonas();

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const currentSessionRef = useRef<string | null>(null);

  // Load sessions when persona changes
  useEffect(() => {
    if (activePersona) {
      loadSessions(activePersona.id);
      setCurrentSessionId(null);
      currentSessionRef.current = null;
      setMessages([getGreeting(activePersona)]);
    }
  }, [activePersona?.id, loadSessions]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [messages, isStreaming]);

  // ---- Persona actions ----
  const handleSelectPersona = (persona: AIPersona) => {
    switchPersona(persona);
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
    const persona = personas.find((p) => p.id === id);
    const ok = await deletePersona(id);
    if (ok) {
      toast.success(`${persona?.name || "IA"} eliminada`);
    }
  };

  // ---- Session actions ----
  const handleNewChat = () => {
    setCurrentSessionId(null);
    currentSessionRef.current = null;
    if (activePersona) {
      setMessages([getGreeting(activePersona)]);
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
    if (!inputValue.trim() || isStreaming || !user || !activePersona) return;

    const userMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
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

  const renderContent = (content: string) => {
    if (!content)
      return (
        <div className="flex items-center gap-2 text-muted-foreground/80 italic animate-pulse">
          <Sparkles className="w-4 h-4 text-neon-cyan" />
          <span className="text-neon-cyan/80">Pensando...</span>
        </div>
      );
    return content.split("\n").map((line, i) => {
      let p = line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>");
      if (p.startsWith("• "))
        p = `<span class="flex gap-2"><span>•</span><span>${p.slice(2)}</span></span>`;
      return <div key={i} dangerouslySetInnerHTML={{ __html: p }} />;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Cargando asistente...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <PersonaSidebar
        personas={personas}
        activePersona={activePersona}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectPersona={handleSelectPersona}
        onCreatePersona={() => setShowOnboarding(true)}
        onDeletePersona={handleDeletePersona}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onClearAllSessions={handleClearAllSessions}
        isOpen={isSidebarOpen}
      />

      {showOnboarding && (
        <PersonaOnboarding
          onComplete={handleCreatePersona}
          onCancel={() => setShowOnboarding(false)}
        />
      )}

      <div className="flex-1 flex flex-col h-full relative">
        <div className="absolute left-4 top-4 z-50 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X /> : <Menu />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden md:flex"
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                      <Menu className="w-5 h-5" />
                    </Button>
                    {activePersona?.avatar_emoji || "🤖"} {activePersona?.name || "Asistente IA"}
                  </h1>
                  {activePersona?.description && (
                    <p className="text-muted-foreground text-sm mt-0.5 ml-12">
                      {activePersona.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <div className="px-3 py-1.5 bg-neon-green/10 text-neon-green rounded-full text-xs font-medium flex items-center gap-1 border border-neon-green/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                    Online
                  </div>
                </div>
              </div>
            </div>

            {messages.length <= 1 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="flex flex-col items-center justify-center gap-2 p-3 bg-card hover:bg-accent/50 border border-border/50 rounded-xl transition-all text-center group"
                    >
                      <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
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
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm mt-1",
                      message.role === "assistant"
                        ? "bg-gradient-to-br from-neon-cyan to-neon-purple"
                        : "bg-secondary text-foreground"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <span className="text-sm">{activePersona?.avatar_emoji || "🤖"}</span>
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[85%] lg:max-w-[75%] rounded-2xl px-5 py-4 shadow-sm overflow-hidden",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border/50 rounded-tl-sm"
                    )}
                  >
                    <div className="text-sm space-y-2 leading-relaxed break-words">
                      {renderContent(message.content)}
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-50 transition-opacity text-[10px]",
                        message.role === "user"
                          ? "text-primary-foreground/70"
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

        <div className="p-4 lg:p-6 bg-gradient-to-t from-background via-background/95 to-transparent sticky bottom-0 z-20">
          <div className="max-w-3xl mx-auto relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.txt,.md"
            />
            <div className="absolute inset-0 bg-neon-cyan/5 blur-3xl -z-10 rounded-full opacity-20" />
            <div className="flex gap-2 items-end bg-card/80 backdrop-blur-xl p-2 rounded-2xl border border-border/50 shadow-lg">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary mb-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isStreaming}
                title="Adjuntar PDF/Texto"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Paperclip className="w-5 h-5" />
                )}
              </Button>

              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={
                  isUploading
                    ? "Procesando archivo..."
                    : `Preguntale a ${activePersona?.name || "tu IA"}...`
                }
                className="flex-1 px-4 py-3 bg-transparent border-none focus:outline-none text-sm placeholder:text-muted-foreground/50 max-h-32"
                disabled={isStreaming || isUploading}
              />

              <div className="flex gap-1 pb-1 pr-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={startVoiceInput}
                  title="Dictar por voz"
                  disabled={isStreaming}
                >
                  <Mic className="w-5 h-5" />
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isStreaming}
                  size="icon"
                  className={cn(
                    "rounded-xl transition-all duration-300",
                    inputValue.trim() && !isStreaming
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                      : "bg-secondary text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground/50 mt-2">
              {activePersona?.name || "T.A.B.E. IA"} puede cometer errores. El modo offline para archivos está activo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
