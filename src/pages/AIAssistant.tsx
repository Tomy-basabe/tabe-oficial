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
import { ModelLogo } from "@/components/icons/ModelLogos";
import { cleanAIResponse } from "@/lib/aiClientService";
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
    selectedModel, setSelectedModel,
    powerLevel, setPowerLevel
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
    const currentModelId = selectedModel.id;
    const currentModelName = selectedModel.shortName || selectedModel.name;

    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        modelId: currentModelId,
        modelName: currentModelName,
      },
    ]);

    let fullContent = "";

    // onReset: called when the primary model fails and a fallback takes over.
    // Clears the partial error text so the fallback response starts cleanly.
    const handleReset = () => {
      fullContent = "";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, content: "" } : m
        )
      );
    };

    streamMessage(
      conversationHistory,
      activePersona.id,
      (delta) => {
        fullContent += delta;
        const cleaned = cleanAIResponse(fullContent);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: cleaned } : m
          )
        );
      },
      async (result) => {
        if (result.event_created) toast.success("Evento agregado");
        if (result.flashcards_created) toast.success("Flashcards creadas");

        const finalSaved = cleanAIResponse(result.content || fullContent);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: finalSaved } : m
          )
        );

        // Save assistant response to DB
        if (sessionId && finalSaved) {
          await saveMessage(sessionId, "assistant", finalSaved);
        }
      },
      (error) => {
        toast.error(error.message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: `Error: ${error.message}` } : m
          )
        );
      },
      undefined,   // context_page
      undefined,   // modelOverride
      undefined,   // powerOverride
      handleReset  // onReset
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

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col h-full min-w-0">

        {/* ── HEADER ─────────────────────────────────────── */}
        <div className="shrink-0 px-3 py-2 md:px-6 md:py-3 border-b-2 border-foreground bg-card flex items-center gap-2 md:gap-3">
          {/* Sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))] text-foreground hover:bg-muted shrink-0 w-8 h-8 md:w-9 md:h-9"
            title="Historial y personalidades"
          >
            <Menu className="w-4 h-4" />
          </Button>

          {/* Back link — only on md+ */}
          <Link
            to="/dashboard"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-foreground bg-background text-foreground font-black text-xs uppercase shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-all shrink-0 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Volver
          </Link>

          {/* Avatar + name */}
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-black text-white dark:bg-white dark:text-black p-1.5 flex items-center justify-center border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] shrink-0">
            <TabeAIIcon className="w-full h-full text-white dark:text-black" />
          </div>

          <div className="flex flex-col justify-center min-w-0 flex-1">
            <h1 className="font-black text-base md:text-xl uppercase text-foreground leading-tight truncate">
              {activePersona?.name || "TABE IA"}
            </h1>
            {activePersona?.description && (
              <p className="font-bold text-muted-foreground text-[10px] md:text-xs uppercase tracking-wide truncate hidden sm:block">
                {activePersona.description}
              </p>
            )}
          </div>

          {/* Status badge */}
          <div className="px-2 py-1 bg-[#BFFF00] !text-black border-2 border-foreground rounded-full font-black uppercase text-[10px] md:text-xs flex items-center gap-1.5 shadow-[2px_2px_0_0_hsl(var(--foreground))] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
            <span className="hidden xs:inline">Online</span>
          </div>

          {/* External link — only on md+ */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open("/TABEAI", "_blank")}
            className="border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))] text-foreground shrink-0 hidden md:flex w-8 h-8"
            title="Abrir en pestaña nueva"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        {/* ── MESSAGES ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-3xl mx-auto px-3 py-4 md:px-6 md:py-6 space-y-1">

            {/* Quick actions — horizontal scroll on mobile */}
            {messages.length <= 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 snap-x snap-mandatory scrollbar-none md:grid md:grid-cols-5 md:overflow-visible md:pb-0">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="flex flex-col items-center justify-center gap-2 p-3 bg-card border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] rounded-xl hover:translate-y-[-2px] hover:shadow-[5px_5px_0_0_hsl(var(--foreground))] transition-all text-center group shrink-0 w-28 md:w-auto snap-start"
                    >
                      <div className="p-2 rounded-lg bg-muted border-2 border-foreground text-foreground group-hover:bg-[#00E5FF] group-hover:!text-black transition-colors">
                        <Icon className="w-4 h-4" strokeWidth={2.5} />
                      </div>
                      <span className="text-[11px] font-black uppercase text-foreground leading-tight">
                        {action.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Messages */}
            <div className="space-y-4 pb-2 min-h-[200px]">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 md:gap-3 group",
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "w-8 h-8 border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                      message.role === "assistant"
                        ? "bg-black text-white dark:bg-white dark:text-black p-1.5"
                        : "bg-[#FFD700] text-black"
                    )}
                  >
                    {message.role === "assistant" ? (
                      activePersona?.avatar_emoji && activePersona.avatar_emoji !== "🤖" ? (
                        <span className="text-base leading-none">{activePersona.avatar_emoji}</span>
                      ) : (
                        <TabeAIIcon className="w-full h-full text-white dark:text-black" />
                      )
                    ) : (
                      <User className="w-4 h-4 text-black" strokeWidth={2.5} />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={cn(
                      "max-w-[78%] md:max-w-[75%] rounded-xl px-3 py-2.5 md:px-4 md:py-3 border-2 md:border-4 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] md:shadow-[4px_4px_0_0_hsl(var(--foreground))] overflow-hidden",
                      message.role === "user"
                        ? "bg-[#BFFF00] !text-black"
                        : "bg-card text-foreground"
                    )}
                  >
                    {/* Model badge */}
                    {message.role === "assistant" && message.id !== "init" && (
                      <div className="flex items-center gap-1 pb-1.5 mb-1.5 border-b border-foreground/15 text-[10px] font-black uppercase text-muted-foreground">
                        <div className="w-4 h-4 rounded flex items-center justify-center p-0.5 bg-background border border-foreground/30 shrink-0">
                          <ModelLogo modelId={message.modelId || selectedModel.id} className="w-3 h-3" />
                        </div>
                        <span className="text-foreground tracking-tight font-black truncate">
                          {message.modelName || selectedModel.shortName}
                        </span>
                        <span className="text-[9px] text-muted-foreground/80 font-bold ml-auto shrink-0">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    )}

                    <div className="text-sm md:text-base font-bold leading-relaxed break-words">
                      {renderContent(message.content, message.role)}
                    </div>

                    {message.role === "user" && (
                      <div className="flex items-center gap-1 mt-1 text-[9px] font-black uppercase !text-black/60">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* ── INPUT BAR ──────────────────────────────────── */}
        <div className="shrink-0 px-2 py-2 md:px-6 md:py-4 bg-transparent sticky bottom-0 z-20">
          <div className="max-w-3xl mx-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.txt,.md"
            />

            <div className="flex flex-col bg-card rounded-2xl border-2 md:border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] md:shadow-[6px_6px_0_0_hsl(var(--foreground))] focus-within:ring-2 focus-within:ring-primary">
              {/* Textarea */}
              <textarea
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
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
                    : `Preguntale a ${activePersona?.name || "tu IA"}...`
                }
                className="w-full px-3 py-2.5 bg-transparent border-none focus:outline-none text-sm md:text-base font-bold placeholder:text-muted-foreground placeholder:font-bold resize-none overflow-y-auto text-foreground"
                style={{ minHeight: "44px", maxHeight: "160px" }}
                rows={1}
                disabled={isStreaming || isUploading}
              />

              {/* Bottom action bar */}
              <div className="flex items-center justify-between px-2 pb-2 gap-1.5">
                {/* Left: attach + model selector */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-foreground hover:bg-muted border border-foreground/20 hover:border-foreground rounded-lg h-7 w-7 shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isStreaming}
                    title="Adjuntar PDF/Texto"
                  >
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="w-3.5 h-3.5" strokeWidth={2.5} />
                    )}
                  </Button>

                  <div className="min-w-0 flex-1 overflow-hidden">
                    <ModelSelector
                      selectedModel={selectedModel}
                      onSelectModel={(m) => {
                        setSelectedModel(m);
                        toast.success(`${m.shortName || m.name}`);
                      }}
                      powerLevel={powerLevel}
                      onSelectPowerLevel={(p) => {
                        setPowerLevel(p);
                        toast.success(`Potencia: ${p.toUpperCase()}`);
                      }}
                      disabled={isStreaming}
                    />
                  </div>
                </div>

                {/* Right: mic + send */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-foreground hover:bg-muted border border-foreground/20 hover:border-foreground rounded-lg h-7 w-7"
                    onClick={startVoiceInput}
                    title="Dictar por voz"
                    disabled={isStreaming}
                  >
                    <Mic className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </Button>

                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isStreaming}
                    className={cn(
                      "rounded-xl font-black uppercase text-xs transition-all border-2 border-foreground h-8 px-3 flex items-center gap-1 shrink-0",
                      inputValue.trim() && !isStreaming
                        ? "bg-[#00E5FF] !text-black hover:bg-[#00cce6] shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                        : "bg-muted text-muted-foreground cursor-not-allowed border-foreground/30"
                    )}
                  >
                    <span className="hidden sm:inline">Enviar</span>
                    <Send className="w-3.5 h-3.5" strokeWidth={3} />
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-[9px] text-center font-black uppercase text-muted-foreground mt-1.5 px-2">
              {activePersona?.name || "T.A.B.E. IA"} puede cometer errores.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
