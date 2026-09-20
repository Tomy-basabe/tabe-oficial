import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Send, Bot, User, Sparkles, BookOpen, FileQuestion, Calendar, Menu, Mic, X, Paperclip, Loader2, ArrowLeft, ExternalLink, Brain, Trash2, Radio } from "lucide-react";
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
import { cleanAIResponse, transcribeAudio } from "@/lib/aiClientService";
import { AVAILABLE_AI_MODELS, AITask } from "@/config/aiModels";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { TabeAIIcon } from "@/components/icons/TabeAIIcon";
import { AIThinkingIndicator } from "@/components/ai/AIThinkingIndicator";
import { AILiveVoiceModal } from "@/components/ai/AILiveVoiceModal";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { supabase } from "@/integrations/supabase/client";

// Interface DisplayMessage is now exported from AIChatContext, we can import it
import { DisplayMessage } from "@/contexts/AIChatContext";

const quickActions = [
  { id: "explain", label: "Explicar tema", icon: BookOpen, prompt: "Explícame el concepto de " },
  { id: "quiz", label: "Simulacro", icon: FileQuestion, prompt: "Hazme un simulacro de examen de " },
  { id: "plan", label: "Plan de estudio", icon: Calendar, prompt: "Genera un plan de estudio para " },
  { id: "schedule", label: "Agendar", icon: Calendar, prompt: "Agendame " },
  { id: "progress", label: "Mi progreso", icon: Sparkles, prompt: "Analizá mi progreso académico y dame recomendaciones" },
];

export interface ProactiveContext {
  type: "exam" | "streak";
  subject?: string;
  examType?: string;
  daysStreak?: number;
}

async function getProactiveGreeting(
  persona: AIPersona,
  userId?: string
): Promise<{ message: DisplayMessage; context: ProactiveContext | null }> {
  const defaultGreeting: DisplayMessage = {
    id: "init",
    role: "assistant",
    content: `¡Hola! 👋 Soy **${persona.name}** (TABE AI), tu asistente académico personal.\n\nTengo acceso al 100% de tu información universitaria: carrera, materias, calificaciones, calendario de exámenes, apuntes, flashcards, rutinas y biblioteca.\n\n¿En qué te puedo ayudar hoy?`,
    timestamp: new Date(),
  };

  if (!userId) return { message: defaultGreeting, context: null };

  try {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split("T")[0];
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // 1. Check upcoming exam today or tomorrow
    const { data: upcomingEvents } = await supabase
      .from("calendar_events")
      .select("id, titulo, fecha, tipo_examen, subject_id, subjects(nombre)")
      .eq("user_id", userId)
      .neq("tipo_examen", "Estudio")
      .gte("fecha", todayStr)
      .lte("fecha", tomorrowStr)
      .order("fecha", { ascending: true })
      .limit(1);

    if (upcomingEvents && upcomingEvents.length > 0) {
      const ex = upcomingEvents[0];
      const isToday = ex.fecha === todayStr;
      const dayLabel = isToday ? "¡hoy mismo!" : "mañana";
      const subjectName = (ex as any).subjects?.nombre || ex.titulo || "tu materia";
      const examType = ex.tipo_examen || "parcial";

      return {
        message: {
          id: "init-proactive-exam",
          role: "assistant",
          content: `👋 ¡Hola! 🎓 Soy **${persona.name}**.\n\n⚠️ **Recordatorio importante:** Vi en tu calendario que ${dayLabel} tenés el ${examType} de **${subjectName}**.\n\n¿Querés que te tome un **simulacro rápido de preguntas de repaso** para llegar con la materia fresquísima, o preferís despejar alguna duda puntual de los apuntes?`,
          timestamp: new Date(),
        },
        context: {
          type: "exam",
          subject: subjectName,
          examType,
        },
      };
    }

    // 2. Check study streak in danger
    const { data: stats } = await supabase
      .from("user_stats")
      .select("racha_actual")
      .eq("user_id", userId)
      .maybeSingle();

    if (stats && stats.racha_actual >= 2) {
      const { data: todaySessions } = await supabase
        .from("study_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("fecha", todayStr)
        .limit(1);

      if (!todaySessions || todaySessions.length === 0) {
        return {
          message: {
            id: "init-proactive-streak",
            role: "assistant",
            content: `🔥 ¡Hola! Soy **${persona.name}**.\n\nVenís con una racha de **${stats.racha_actual} días consecutivos** de estudio en TABE, pero todavía no registraste ninguna sesión hoy.\n\n¿Hacemos un quiz de repaso de 5 minutos o registramos lo que viste hoy para no perder tu racha? 🎯`,
            timestamp: new Date(),
          },
          context: {
            type: "streak",
            daysStreak: stats.racha_actual,
          },
        };
      }
    }
  } catch (err) {
    console.error("Error checking proactive greeting:", err);
  }

  return { message: defaultGreeting, context: null };
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

  const userName =
    user?.user_metadata?.nombre ||
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.user_metadata?.name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Tomas";

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
  const { canUse, incrementUsage, reserveAITokens } = useUsageLimits();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editingPersona, setEditingPersona] = useState<AIPersona | null>(null);

  // Multimodal Image & Voice
  const [attachedImage, setAttachedImage] = useState<{ preview: string; base64: string; mimeType: string; name: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showLiveVoice, setShowLiveVoice] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("live") === "true" || searchParams.get("voice") === "true") {
      setShowLiveVoice(true);
    }
  }, [searchParams]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const prevPersonaIdRef = useRef<string | null>(null);
  const [proactiveContext, setProactiveContext] = useState<ProactiveContext | null>(null);

  // Load sessions and proactive greeting when persona changes
  useEffect(() => {
    if (activePersona) {
      loadSessions(activePersona.id);
      
      // Solo reiniciar mensajes si la persona REALMENTE cambió (el usuario seleccionó otra IA)
      if (prevPersonaIdRef.current && prevPersonaIdRef.current !== activePersona.id) {
        if (!isStreaming) {
          setCurrentSessionId(null);
          currentSessionRef.current = null;
          getProactiveGreeting(activePersona, user?.id).then(({ message, context }) => {
            setMessages([message]);
            setProactiveContext(context);
          });
        }
      } else if (!messages.length) {
        getProactiveGreeting(activePersona, user?.id).then(({ message, context }) => {
          setMessages([message]);
          setProactiveContext(context);
        });
      }
      prevPersonaIdRef.current = activePersona.id;
    }
  }, [activePersona?.id, user?.id]);

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
        getProactiveGreeting(activePersona, user?.id).then(({ message, context }) => {
          setMessages([message]);
          setProactiveContext(context);
        });
      }
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    currentSessionRef.current = sessionId;
    setProactiveContext(null);
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
    if (ok) {
      toast.success("Chat eliminado del historial");
      if (currentSessionRef.current === sessionId) {
        handleNewChat();
      }
    } else {
      toast.error("No se pudo eliminar el chat");
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

  // ---- Multimodal Handlers (Images & Audio) ----
  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 15MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const cleanBase64 = result.includes(",") ? result.split(",")[1] : result;
      setAttachedImage({
        preview: result,
        base64: cleanBase64,
        mimeType: file.type || "image/jpeg",
        name: file.name || "imagen.jpg",
      });
      toast.success("Imagen adjuntada 📸");
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processImageFile(file);
          break;
        }
      }
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/ogg" });
        if (audioBlob.size > 500) {
          toast.info("Transcribiendo audio con IA... 🎧");
          try {
            const text = await transcribeAudio(audioBlob);
            if (text) {
              const isLongAudio = text.length > 100;
              const promptSuffix = isLongAudio 
                ? "\n\n👉 *Por favor generame un resumen estructurado con puntos clave, conceptos y fechas mencionadas.*" 
                : "";
              setInputValue((prev) => prev + (prev ? " " : "") + text + promptSuffix);
              toast.success("Audio transcripto 🎙️");
            }
          } catch (e: any) {
            toast.error(e.message || "Error al transcribir");
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
      toast.info("Grabando audio... Haz clic en el micrófono para terminar 🎙️");
    } catch (err) {
      console.warn("MediaRecorder no disponible o permiso denegado, usando fallback WebSpeech:", err);
      startVoiceInputFallback();
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const startVoiceInputFallback = () => {
    try {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) { toast.error("Tu navegador no soporta entrada de voz"); return; }
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

  // ---- File upload ----
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      if (file.type.startsWith("image/")) {
        processImageFile(file);
      } else if (file.type.startsWith("audio/") || file.name.match(/\.(mp3|wav|m4a|ogg|aac|opus)$/i)) {
        toast.info("Transcribiendo audio con IA... 🎧");
        const text = await transcribeAudio(file);
        if (text) {
          const isLongAudio = text.length > 100;
          const promptSuffix = isLongAudio 
            ? "\n\n👉 *Por favor generame un resumen estructurado de esta clase con puntos clave, conceptos y fechas mencionadas.*"
            : "";
          setInputValue((prev) => `${prev ? prev + "\n\n" : ""}🎙️ **[Grabación/Audio de clase]:**\n${text}${promptSuffix}`);
          toast.success("Audio transcripto con éxito 🎧");
        }
      } else if (file.type === "application/pdf") {
        const { extractTextFromPdf } = await import("@/lib/pdf-utils");
        const text = await extractTextFromPdf(file);
        setInputValue((prev) => `${prev ? prev + "\n\n" : ""}📄 **Contenido de ${file.name}:**\n${text}`);
        toast.success("PDF procesado");
      } else if (file.type === "text/plain" || file.name.endsWith(".md")) {
        const text = await file.text();
        setInputValue((prev) => `${prev ? prev + "\n\n" : ""}📄 **Contenido de ${file.name}:**\n${text}`);
        toast.success("Archivo procesado");
      } else {
        toast.error("Formato no soportado. Usa imagen, audio, PDF o TXT.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al leer el archivo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ---- Send message ----
  const handleSend = async () => {
    if (!inputValue.trim() && !attachedImage) return;

    const imageToSend = attachedImage
      ? { data: attachedImage.base64, mime_type: attachedImage.mimeType }
      : undefined;
    const previewToSend = attachedImage?.preview;

    const userMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue || (attachedImage ? "Analiza esta imagen adjunta:" : ""),
      timestamp: new Date(),
      imageUrl: previewToSend,
    };

    setAttachedImage(null);

    // Limpiar saludo inicial para empezar el chat real
    const existingMessages = messages.filter((m) => m.id !== "init");
    const newMessages = [...existingMessages, userMessage];
    setMessages(newMessages);
    setInputValue("");

    // Create or reuse session
    let sessionId = currentSessionRef.current;
    if (!sessionId) {
      const title = (inputValue || "Consulta con imagen").slice(0, 40);
      const session = await createSession(activePersona.id, title);
      if (!session) {
        toast.error("Error al crear la sesión");
        return;
      }
      sessionId = session.id;
      currentSessionRef.current = sessionId;
      setCurrentSessionId(sessionId);
    }

    // Save user message to DB
    const normalizedInput = inputValue.toLowerCase();
    const task: AITask = normalizedInput.includes("quiz") || normalizedInput.includes("simulacro")
      ? "quiz"
      : normalizedInput.includes("flashcard") || normalizedInput.includes("tarjeta")
        ? "flashcards"
        : normalizedInput.includes("plan de estudio")
          ? "plan"
          : normalizedInput.includes("resum")
            ? "resumen"
            : "chat";
    const requestModel = selectedModel;

    // Persistencia asíncrona sin retrasar el inicio del stream
    saveMessage(sessionId, "user", userMessage.content).catch((err) =>
      console.warn("Could not persist user message:", err)
    );
    if (requestModel.provider !== "local") {
      incrementUsage("ia_daily").catch((err) =>
        console.warn("Could not increment usage:", err)
      );
    }

    // Prepare conversation for the AI
    const conversationHistory = newMessages
      .filter((m) => m.id !== "init")
      .map((m) => ({ role: m.role, content: m.content }));

    const assistantMsgId = (Date.now() + 1).toString();
    const currentModelId = requestModel.id;
    const currentModelName = requestModel.shortName || requestModel.name;

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
      requestModel,
      powerLevel,
      handleReset, // onReset
      imageToSend  // image
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
    if (!content) {
      return (
        <AIThinkingIndicator
          personaName={activePersona?.name}
          statusText="Analizando contexto, materias y apuntes..."
        />
      );
    }

    if (role === "user") {
      return content.split("\n").map((line, i) => <div key={i} className="text-black leading-relaxed font-bold">{line}</div>);
    }

    return (
      <div className="prose prose-sm md:prose-base dark:prose-invert prose-p:leading-relaxed prose-p:my-2 prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-3 prose-pre:rounded-xl prose-math:text-base prose-math:font-medium max-w-none break-words text-foreground font-normal">
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
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden relative">
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
      <div
        className={cn(
          "fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity duration-300",
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full min-w-0">

        {/* ── HEADER ─────────────────────────────────────── */}
        <div className="shrink-0 px-3 py-2 md:px-6 md:py-3 border-b-2 border-foreground bg-card flex items-center gap-2 md:gap-3 z-10">
          {/* Back link — available on mobile & desktop */}
          <Link
            to="/dashboard"
            className="flex items-center justify-center md:gap-1.5 w-8 h-8 md:w-auto md:px-3 md:py-1.5 rounded-xl border-2 border-foreground bg-card hover:bg-muted text-foreground font-black text-xs uppercase shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px] transition-all shrink-0 group"
            title="Volver al Dashboard"
            aria-label="Volver al Dashboard"
          >
            <ArrowLeft className="w-4 h-4 md:w-3.5 md:h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden md:inline">Volver</span>
          </Link>

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

          {/* Avatar + name with TABE AI 2.0 Logo */}
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-white text-black dark:bg-black dark:text-white border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center justify-center p-1 shrink-0">
            {activePersona?.avatar_emoji && activePersona.avatar_emoji !== "🤖" ? (
              <span className="leading-none text-sm">{activePersona.avatar_emoji}</span>
            ) : (
              <TabeAIIcon size={24} animate={isStreaming} withGlow={true} />
            )}
          </div>

          <div className="flex flex-col justify-center min-w-0 flex-1">
            <h1 className="font-black text-sm md:text-base uppercase text-foreground leading-tight tracking-wide truncate">
              {activePersona?.name || "TABE IA"}
            </h1>
            {activePersona?.description && (
              <p className="font-bold text-muted-foreground text-[10px] md:text-xs uppercase tracking-wide truncate hidden sm:block">
                {activePersona.description}
              </p>
            )}
          </div>

          {/* Status badge */}
          <div className="px-2.5 py-1 bg-[#BFFF00] !text-black border-2 border-foreground rounded-full font-black uppercase text-[10px] md:text-xs flex items-center gap-1.5 shadow-[2px_2px_0_0_hsl(var(--foreground))] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
            <span className="hidden xs:inline">Online</span>
          </div>

          {/* Live Voice Mode Button */}
          <button
            onClick={() => setShowLiveVoice(true)}
            className="px-2.5 sm:px-3 py-1 bg-[#00E5FF] hover:bg-[#00cce6] !text-black border-2 border-foreground rounded-xl font-black uppercase text-[10px] md:text-xs flex items-center gap-1.5 shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shrink-0"
            title="Modo de Voz en Vivo (ChatGPT / Gemini Live)"
          >
            <Radio className="w-3.5 h-3.5 text-black animate-pulse stroke-[2.5]" />
            <span className="hidden xs:inline">Modo Voz</span>
          </button>

          {/* Delete current chat button */}
          {currentSessionId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteSession(currentSessionId)}
              className="border-2 border-foreground bg-card rounded-xl text-red-600 hover:bg-[#FF5C5C] hover:!text-white shrink-0 w-8 h-8 md:w-9 md:h-9 shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-transform active:scale-90"
              title="Eliminar conversación actual"
              aria-label="Eliminar conversación actual"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

          {/* External link — only on md+ */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open("/TABEAI", "_blank")}
            className="border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))] text-foreground shrink-0 hidden md:flex w-8 h-8 hover:bg-muted"
            title="Abrir en pestaña nueva"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        {/* ── MESSAGES ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scroll-smooth relative">
          {/* Ambient subtle glow in the background */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-gradient-to-tr from-sky-400/10 via-purple-400/5 to-pink-400/5 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="max-w-3xl mx-auto px-3 py-4 md:px-6 md:py-6 space-y-4">

            {/* Hero empty state greeting when no messages yet or only init */}
            {messages.length <= 1 && (
              <div className="flex flex-col items-center justify-center pt-8 pb-4 text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-4 transition-transform hover:scale-105">
                  <TabeAIIcon size={84} animate={true} withGlow={true} />
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-foreground font-sans">
                  ¿Qué toca hoy, {userName}?
                </h2>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-muted-foreground max-w-md mt-2 mb-6">
                  {activePersona?.description || "Tu asistente académico inteligente para materias, exámenes y apuntes."}
                </p>

                {/* Proactive Context Actions Banner */}
                {proactiveContext?.type === 'exam' && (
                  <div className="w-full mb-4 p-3.5 sm:p-4 rounded-2xl bg-[#FFE600] text-black border-3 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] space-y-2.5 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎯</span>
                      <span className="font-black text-xs sm:text-sm uppercase tracking-wider">
                        Acciones recomendadas para {proactiveContext.subject}:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleQuickAction(`Hazme un simulacro de examen de 5 preguntas tipo quiz sobre ${proactiveContext.subject} para evaluar mis conocimientos`)}
                        className="px-3 py-1.5 rounded-lg bg-black text-[#BFFF00] font-black text-xs uppercase border-2 border-black hover:translate-y-[-1px] transition-all flex items-center gap-1.5 shadow-[2px_2px_0_0_#000] cursor-pointer"
                      >
                        <FileQuestion className="w-3.5 h-3.5" />
                        <span>Simulacro de 5 preguntas</span>
                      </button>
                      <button
                        onClick={() => handleQuickAction(`Explicame los temas más importantes, conceptos y fórmulas clave que suelen tomar en ${proactiveContext.subject}`)}
                        className="px-3 py-1.5 rounded-lg bg-white text-black font-black text-xs uppercase border-2 border-black hover:translate-y-[-1px] transition-all flex items-center gap-1.5 shadow-[2px_2px_0_0_#000] cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Repasar conceptos clave</span>
                      </button>
                      <button
                        onClick={() => handleQuickAction(`Dame una guía rápida de 3 pasos y recomendaciones para rendir mañana el examen de ${proactiveContext.subject} con tranquilidad`)}
                        className="px-3 py-1.5 rounded-lg bg-[#00E5FF] text-black font-black text-xs uppercase border-2 border-black hover:translate-y-[-1px] transition-all flex items-center gap-1.5 shadow-[2px_2px_0_0_#000] cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Tips para rendir</span>
                      </button>
                    </div>
                  </div>
                )}

                {proactiveContext?.type === 'streak' && (
                  <div className="w-full mb-4 p-3.5 sm:p-4 rounded-2xl bg-[#FF5C5C] text-white border-3 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] space-y-2.5 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🔥</span>
                      <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-black">
                        ¡Defendé tu racha de {proactiveContext.daysStreak} días!
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleQuickAction("Tomame un quiz express de 5 preguntas variadas de mis materias cursadas para registrar estudio")}
                        className="px-3 py-1.5 rounded-lg bg-black text-[#FFE600] font-black text-xs uppercase border-2 border-black hover:translate-y-[-1px] transition-all flex items-center gap-1.5 shadow-[2px_2px_0_0_#000] cursor-pointer"
                      >
                        <FileQuestion className="w-3.5 h-3.5" />
                        <span>Quiz express de 5 preguntas</span>
                      </button>
                      <button
                        onClick={() => handleQuickAction("Armame una sesión de estudio guiada de 15 minutos con técnica Pomodoro")}
                        className="px-3 py-1.5 rounded-lg bg-white text-black font-black text-xs uppercase border-2 border-black hover:translate-y-[-1px] transition-all flex items-center gap-1.5 shadow-[2px_2px_0_0_#000] cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Estudio guiado de 15 min</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick actions chips */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-xl mx-auto">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action.prompt)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-foreground bg-card hover:bg-muted text-foreground font-black text-xs uppercase shadow-[2.5px_2.5px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] active:translate-y-[1px] transition-all cursor-pointer group"
                      >
                        <Icon className="w-3.5 h-3.5 text-[#00E5FF] group-hover:scale-110 transition-transform" />
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-3.5 md:space-y-4 pb-4 min-h-[160px]">
              {messages.map((message) => {
                const isThinking = message.role === "assistant" && !message.content;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2.5 md:gap-3 group items-start",
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 mt-0.5">
                      {message.role === "assistant" ? (
                        activePersona?.avatar_emoji && activePersona.avatar_emoji !== "🤖" ? (
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-card border-2 border-foreground shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))] flex items-center justify-center text-sm">
                            {activePersona.avatar_emoji}
                          </div>
                        ) : (
                          <div className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center">
                            <TabeAIIcon size={28} animate={isThinking} withGlow={isThinking} />
                          </div>
                        )
                      ) : (
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-[#FFE600] text-black border-2 border-foreground shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))] flex items-center justify-center font-black">
                          <User className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>

                    {/* Bubble / Text Stream */}
                    <div
                      className={cn(
                        "transition-all",
                        message.role === "user"
                          ? "max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs px-4 py-2.5 bg-[#BFFF00] text-black border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] font-bold text-xs md:text-sm overflow-hidden"
                          : isThinking
                            ? "flex-1 min-w-0 py-1 bg-transparent border-none shadow-none flex items-center"
                            : "flex-1 min-w-0 bg-transparent border-none shadow-none px-0 py-0.5 text-foreground text-sm md:text-base font-normal leading-relaxed"
                      )}
                    >
                      {/* Model badge for assistant */}
                      {message.role === "assistant" && message.id !== "init" && message.content && (
                        <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 select-none">
                          <span className="text-foreground/90 font-black truncate">
                            {message.modelName || selectedModel.shortName}
                          </span>
                          <span className="text-muted-foreground/40">•</span>
                          <span className="text-[9px] text-muted-foreground/60 shrink-0">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      )}

                      {message.imageUrl && (
                        <div className="mb-2">
                          <img
                            src={message.imageUrl}
                            alt="Imagen adjunta"
                            className="max-h-60 max-w-full rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] object-contain bg-black/10"
                          />
                        </div>
                      )}

                      <div className="leading-relaxed break-words">
                        {renderContent(message.content, message.role)}
                      </div>

                      {message.role === "user" && (
                        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] font-black uppercase !text-black/60">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* ── GAMING COMIC FLOATING INPUT BAR ────────────────── */}
        <div className="shrink-0 px-3 py-2 md:px-6 md:py-3 bg-background/80 backdrop-blur-md sticky bottom-0 z-20">
          <div className="max-w-3xl mx-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.txt,.md,image/*,audio/*"
            />

            <div className="flex flex-col rounded-2xl sm:rounded-3xl border-2 md:border-3 border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))] focus-within:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all overflow-hidden">
              {/* Attached Image Preview */}
              {attachedImage && (
                <div className="p-2 border-b-2 border-foreground/20 bg-muted/50 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={attachedImage.preview}
                      alt="Vista previa"
                      className="w-11 h-11 rounded-xl object-cover border-2 border-foreground shadow-[1px_1px_0_0_#000]"
                    />
                    <div className="min-w-0">
                      <span className="text-[11px] font-black uppercase text-foreground block truncate">
                        {attachedImage.name}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground block">
                        Se analizará con IA multimodal al enviar
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="p-1 rounded-lg border-2 border-foreground bg-card hover:bg-destructive hover:text-white transition-colors"
                    title="Quitar imagen"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              )}

              {/* Recording Indicator */}
              {isRecording && (
                <div className="p-2 border-b-2 border-destructive/20 bg-destructive/15 flex items-center justify-between gap-2 animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-ping" />
                    <span className="text-xs font-black uppercase text-destructive tracking-wide">
                      Grabando audio ({Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, "0")})...
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="px-2.5 py-1 rounded-lg border-2 border-foreground bg-destructive text-white text-[10px] font-black uppercase shadow-[1px_1px_0_0_#000] hover:scale-95 transition-transform"
                  >
                    Detener y Transcribir ⏹️
                  </button>
                </div>
              )}

              {/* Textarea */}
              <textarea
                value={inputValue}
                onPaste={handlePaste}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
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
                    : attachedImage
                      ? "Escribe tu pregunta sobre la foto (o pulsa Enviar para analizarla)..."
                      : isRecording
                        ? "Grabando tu voz..."
                        : `Pregunta a ${activePersona?.name || "TABE IA"}...`
                }
                className="w-full px-4 pt-3 pb-2 bg-transparent border-none focus:outline-none text-xs md:text-sm font-bold placeholder:text-muted-foreground/75 resize-none overflow-y-auto text-foreground"
                style={{ minHeight: "44px", maxHeight: "140px" }}
                rows={1}
                disabled={isStreaming || isUploading}
              />

              {/* Bottom action bar inside gaming comic pill */}
              <div className="flex items-center justify-between px-3 pb-2 gap-2">
                {/* Left: attach (+) + model selector */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="border-2 border-foreground rounded-xl shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))] text-foreground hover:bg-muted h-7 w-7 sm:h-8 sm:w-8 shrink-0 transition-transform active:scale-95"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isStreaming}
                    title="Adjuntar Imagen, Audio, PDF o Texto"
                  >
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
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

                {/* Right: live voice + mic + send */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="border-2 border-foreground rounded-xl shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))] bg-[#00E5FF] hover:bg-[#00cce6] !text-black h-7 w-7 sm:h-8 sm:w-8 transition-transform active:scale-95 shrink-0"
                    onClick={() => setShowLiveVoice(true)}
                    title="Modo de Voz en Vivo (ChatGPT Live / Manos Libres)"
                    disabled={isStreaming}
                  >
                    <Radio className="w-3.5 h-3.5 stroke-[2.5] animate-pulse" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "border-2 border-foreground rounded-xl shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))] text-foreground hover:bg-muted h-7 w-7 sm:h-8 sm:w-8 transition-transform active:scale-95",
                      isRecording && "bg-destructive text-white border-destructive animate-pulse"
                    )}
                    onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                    title={isRecording ? "Detener grabación" : "Grabar audio / voz con IA"}
                    disabled={isStreaming}
                  >
                    <Mic className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </Button>

                  <Button
                    onClick={handleSend}
                    disabled={(!inputValue.trim() && !attachedImage) || isStreaming}
                    className={cn(
                      "rounded-xl font-black uppercase text-xs transition-all border-2 border-foreground h-8 px-3.5 flex items-center gap-1.5 shrink-0 shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-y-[1px]",
                      (inputValue.trim() || attachedImage) && !isStreaming
                        ? "bg-[#00E5FF] !text-black hover:bg-[#00cce6]"
                        : "bg-muted text-muted-foreground/60 cursor-not-allowed border-foreground/30 shadow-none"
                    )}
                  >
                    <span className="hidden sm:inline">Enviar</span>
                    <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-[9px] text-center font-bold uppercase text-muted-foreground/75 mt-1.5 px-2">
              {activePersona?.name || "TABE IA"} puede cometer errores. Verifica información importante.
            </p>
          </div>
        </div>

      </div>

      {showLiveVoice && (
        <AILiveVoiceModal
          isOpen={showLiveVoice}
          onClose={() => setShowLiveVoice(false)}
          activePersona={activePersona}
          selectedModel={selectedModel}
          powerLevel={powerLevel}
          onSaveMessage={async (text: string, isUser: boolean, imageUrl?: string) => {
            let sessionId = currentSessionRef.current;
            if (!sessionId) {
              const title = text.slice(0, 40) || "Conversación Live";
              const session = await createSession(activePersona.id, title);
              if (session) {
                sessionId = session.id;
                currentSessionRef.current = sessionId;
                setCurrentSessionId(sessionId);
              }
            }
            if (sessionId) {
              await saveMessage(sessionId, isUser ? "user" : "assistant", text);
            }
            if (isUser && selectedModel.provider !== "local") {
              incrementUsage("ia_daily").catch(() => {});
            }
          }}
          streamMessage={streamMessage}
          existingMessages={messages}
          onAddDisplayMessage={(msg: DisplayMessage) => {
            setMessages((prev) => [...prev.filter((m) => m.id !== "init"), msg]);
          }}
        />
      )}
    </div>
  );
}
