import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Send, Bot, User,  BookOpen, FileQuestion, Calendar, Menu, Mic, X,
  Paperclip, Loader2, ArrowLeft, ExternalLink, Brain, Trash2, Radio, Compass,
  MessageSquare, Target, LayoutGrid, Flame, Plus, ChevronDown, Check,
  Image as ImageIcon, MoreVertical, Volume2, SlidersHorizontal, Square,
  Copy, History, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSubjects } from "@/hooks/useSubjects";
import { useDashboardStats } from "@/hooks/useDashboardStats";
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
import { AVAILABLE_AI_MODELS, DEFAULT_AI_MODEL, AITask } from "@/config/aiModels";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { AIPromptBar } from "@/components/ai/AIPromptBar";
import { TabeAIIcon } from "@/components/icons/TabeAIIcon";
import { AIThinkingIndicator } from "@/components/ai/AIThinkingIndicator";
import { ChatMessageContent } from "@/components/ai/ChatMessage";
import { HoldButton } from "@/components/ui/HoldButton";
import { ParticleTitle } from "@/components/ui/particle-title";
import { VoicePoweredOrb } from "@/components/ui/voice-powered-orb";
import { TabeLogo } from "@/components/ui/TabeLogo";
import "katex/dist/katex.min.css";
import { supabase } from "@/integrations/supabase/client";

// Interface DisplayMessage is now exported from AIChatContext, we can import it
import { DisplayMessage } from "@/contexts/AIChatContext";
import { useConfirm } from "@/contexts/ConfirmModalContext";

const quickActions = [
  { id: "roadmap", label: "Rutas de Examen", icon: Compass, prompt: "", path: "/tabe-ai/examenes" },
  { id: "explain", label: "Explicar tema", icon: BookOpen, prompt: "Explícame el concepto de " },
  { id: "quiz", label: "Simulacro", icon: FileQuestion, prompt: "Hazme un simulacro de examen de " },
  { id: "plan", label: "Plan de estudio", icon: Calendar, prompt: "Genera un plan de estudio para " },
  { id: "schedule", label: "Agendar", icon: Calendar, prompt: "Agendame " },
  { id: "progress", label: "Mi progreso", icon: Target, prompt: "Analizá mi progreso académico y dame recomendaciones" },
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
  const { confirm } = useConfirm();
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();

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
  const [liveAudioStream, setLiveAudioStream] = useState<MediaStream | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const liveActiveRef = useRef(false);
  const speechRecognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("live") === "true" || searchParams.get("voice") === "true") {
      startLiveVoiceSession();
    }
  }, [searchParams]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const { subjects } = useSubjects();
  const { userStats } = useDashboardStats();
  const [selectedSubject, setSelectedSubject] = useState<string>("Todas las materias");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isWelcomeScreen =
    messages.length === 0 ||
    (messages.length === 1 && Boolean(messages[0]?.id?.startsWith("init")));
  const isTurnLockedRef = useRef(false);
  const postSpeechCooldownTimerRef = useRef<any>(null);

  const [welcomeIntroVisible, setWelcomeIntroVisible] = useState(true);
  const [welcomeContentReady, setWelcomeContentReady] = useState(false);

  useEffect(() => {
    // Al entrar en la app aparece únicamente "¿Qué quieres aprender hoy?" centrado.
    // Tras 2.4s se disuelve suavemente y revela fluidamente el resto de la interfaz.
    const t1 = setTimeout(() => {
      setWelcomeIntroVisible(false);
    }, 3700);

    const t2 = setTimeout(() => {
      setWelcomeContentReady(true);
    }, 4200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const dismissWelcomeIntro = useCallback(() => {
    setWelcomeIntroVisible(false);
    setWelcomeContentReady(true);
  }, []);
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
    const okToProceed = await confirm({
      title: "¿Eliminar IA y su historial?",
      description: "¿Seguro que querés eliminar esta IA personalizada y todo su historial de chats? Esta acción no se puede deshacer.",
      confirmText: "Eliminar IA",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (okToProceed) {
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
      setInputValue("");
      setAttachedImage(null);
      if (activePersona) {
        getProactiveGreeting(activePersona, user?.id).then(({ message, context }) => {
          setMessages([message]);
          setProactiveContext(context);
        });
      } else {
        setMessages([]);
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

    const ok = await confirm({
      title: "¿Borrar todo el historial?",
      description: "Esta acción borrará TODAS las sesiones y conversaciones guardadas de esta IA. No se puede deshacer.",
      confirmText: "Borrar todo",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!ok) {
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

  // Obtener voz natural en español para síntesis de voz en vivo
  const getNaturalSpanishVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang.startsWith("es") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Online"))) ||
      voices.find((v) => v.lang.startsWith("es") || v.lang.includes("es")) ||
      voices[0] ||
      null
    );
  }, []);

  // Streaming TTS para respuesta de voz ultra-rápida (oración por oración en tiempo real)
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingQueueRef = useRef(false);

  const resetSpeechQueue = useCallback(() => {
    speechQueueRef.current = [];
    isSpeakingQueueRef.current = false;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const processNextSpeechQueue = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis || !liveActiveRef.current) {
      isSpeakingQueueRef.current = false;
      setIsAiSpeaking(false);
      return;
    }

    if (speechQueueRef.current.length === 0) {
      isSpeakingQueueRef.current = false;
      setIsAiSpeaking(false);
      if (liveActiveRef.current && speechRecognitionRef.current) {
        try { speechRecognitionRef.current.start(); } catch (_) {}
      }
      return;
    }

    const nextChunk = speechQueueRef.current.shift();
    if (!nextChunk) {
      processNextSpeechQueue();
      return;
    }

    isSpeakingQueueRef.current = true;
    setIsAiSpeaking(true);
    setIsAiThinking(false);

    const utterance = new SpeechSynthesisUtterance(nextChunk);
    const voice = getNaturalSpanishVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = "es-ES";
    utterance.rate = 1.1; // Ágil y dinámico para mínima latencia

    utterance.onend = () => {
      processNextSpeechQueue();
    };
    utterance.onerror = () => {
      processNextSpeechQueue();
    };

    window.speechSynthesis.speak(utterance);
  }, [getNaturalSpanishVoice]);

  const enqueueAiSpeechChunk = useCallback((chunk: string) => {
    if (!liveActiveRef.current) return;
    const clean = chunk.replace(/[*_#`$]/g, "").replace(/\n+/g, " ").trim();
    if (!clean || clean.length < 2) return;

    speechQueueRef.current.push(clean);
    if (!isSpeakingQueueRef.current) {
      processNextSpeechQueue();
    }
  }, [processNextSpeechQueue]);

  // Manejar intervención hablada en vivo del usuario y obtener respuesta de la IA al instante
  const handleLiveUserUtterance = useCallback(async (spokenText: string) => {
    const text = spokenText.trim();
    if (!text || !liveActiveRef.current || isStreaming) return;

    setLiveTranscript(text);
    setIsAiThinking(true);
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (_) {}
    }

    const userMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    const currentMsgs = messages.filter((m) => !m.id?.startsWith("init"));
    const updatedMsgs = [...currentMsgs, userMessage];
    setMessages(updatedMsgs);

    let sessionId = currentSessionRef.current;
    if (!sessionId) {
      const session = await createSession(activePersona.id, `Voz: ${text.slice(0, 30)}`);
      if (session) {
        sessionId = session.id;
        currentSessionRef.current = sessionId;
        setCurrentSessionId(sessionId);
      }
    }
    if (sessionId) {
      saveMessage(sessionId, "user", text).catch(() => {});
    }

    const conversationHistory = updatedMsgs.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Inyectar instrucción para que el modelo responda de forma ultra-directa y oral
    const liveVoiceHistory = [
      {
        role: "system",
        content: "Estás respondiendo por voz en vivo. Responde de forma muy concisa, directa, amigable y conversacional (máximo 1 o 2 oraciones breves). No uses markdown, asteriscos ni listas.",
      },
      ...conversationHistory,
    ];

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        modelId: selectedModel.id,
        modelName: selectedModel.shortName || selectedModel.name,
      },
    ]);

    resetSpeechQueue();
    let fullAiResponse = "";
    let speechBuffer = "";

    // Modelo ultra-rápido para voz en vivo
    const liveVoiceModel = AVAILABLE_AI_MODELS.find(m => m.id === "gemini-2.5-flash") || selectedModel;

    streamMessage(
      liveVoiceHistory,
      activePersona.id,
      (delta) => {
        fullAiResponse += delta;
        speechBuffer += delta;

        const cleaned = cleanAIResponse(fullAiResponse);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: cleaned } : m))
        );

        // Streaming TTS: en cuanto detecta fin de frase (. ? ! : o salto de línea), lo habla de inmediato
        const match = speechBuffer.match(/^([\s\S]+?[.?!:\n])(\s+[\s\S]*)$/);
        if (match) {
          const sentence = match[1].trim();
          speechBuffer = match[2] || "";
          if (sentence.length > 2) {
            enqueueAiSpeechChunk(sentence);
          }
        }
      },
      (result) => {
        const finalContent = cleanAIResponse(result.content || fullAiResponse);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: finalContent } : m))
        );
        if (sessionId) {
          saveMessage(sessionId, "assistant", finalContent).catch(() => {});
        }
        // Enviar remanente del buffer si existiera
        if (speechBuffer.trim()) {
          enqueueAiSpeechChunk(speechBuffer.trim());
        } else if (speechQueueRef.current.length === 0 && !isSpeakingQueueRef.current && finalContent) {
          enqueueAiSpeechChunk(finalContent);
        }
      },
      () => {
        setIsAiThinking(false);
        setIsAiSpeaking(false);
        resetSpeechQueue();
        toast.error("Error al procesar respuesta de voz");
      },
      undefined,
      liveVoiceModel
    );
  }, [messages, isStreaming, activePersona, selectedModel, streamMessage, createSession, saveMessage, enqueueAiSpeechChunk, resetSpeechQueue]);

  const startLiveVoiceSession = async () => {
    // 1. Abrir conversación nueva limpia
    handleNewChat();
    setShowLiveVoice(true);
    liveActiveRef.current = true;
    setIsAiSpeaking(false);
    setIsAiThinking(false);
    setLiveTranscript("");

    // 2. Conectar stream de micrófono para el visualizador reactivo de ondas
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLiveAudioStream(stream);
    } catch (err) {
      console.warn("No se pudo obtener micrófono para el visualizador:", err);
    }

    // 3. Iniciar reconocimiento de voz continuo en español
    try {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "es-AR";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let interim = "";
          let final = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          if (interim) setLiveTranscript(interim);
          if (final) {
            setLiveTranscript(final);
            handleLiveUserUtterance(final);
          } else if (interim) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              if (interim.trim() && liveActiveRef.current) {
                handleLiveUserUtterance(interim);
              }
            }, 600); // 600ms de silencio para respuesta rápida inmediata
          }
        };

        recognition.onerror = (e: any) => {
          if (e.error !== "no-speech") {
            console.warn("Speech recognition error:", e.error);
          }
        };

        recognition.onend = () => {
          if (liveActiveRef.current && !isAiSpeaking) {
            try { recognition.start(); } catch (_) {}
          }
        };

        speechRecognitionRef.current = recognition;
        recognition.start();
      } else {
        startVoiceRecording();
      }
    } catch (err) {
      console.warn("Error al iniciar reconocimiento:", err);
      startVoiceRecording();
    }
  };

  const closeLiveVoiceSession = () => {
    liveActiveRef.current = false;
    setShowLiveVoice(false);
    setIsAiSpeaking(false);
    setIsAiThinking(false);
    setLiveTranscript("");
    resetSpeechQueue();

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (_) {}
      speechRecognitionRef.current = null;
    }

    if (liveAudioStream) {
      liveAudioStream.getTracks().forEach((track) => track.stop());
      setLiveAudioStream(null);
    }
    if (isRecording) stopVoiceRecording();
  };

  const startVoiceInputFallback = () => {
    try {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) { toast.error("Tu navegador no soporta entrada de voz"); return; }
      const recognition = new SpeechRecognition();
      recognition.lang = "es-AR";
      recognition.interimResults = false;
      recognition.onresult = (e: any) => {
        const t = e.results[0][0].transcript;
        if (t) { setInputValue((prev) => prev + (prev ? " " : "") + t); }
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

  // ---- Send message logic ----
  const executeSendMessage = async (
    textContent: string,
    imageToSend?: { data: string; mime_type: string },
    previewToSend?: string
  ) => {
    if (!textContent.trim() && !imageToSend) return;

    const userMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: "user",
      content: textContent || "Analiza esta imagen adjunta:",
      timestamp: new Date(),
      imageUrl: previewToSend,
    };

    setAttachedImage(null);

    // Limpiar saludo inicial para empezar el chat real
    const existingMessages = messages.filter((m) => !m.id?.startsWith("init"));
    const newMessages = [...existingMessages, userMessage];
    setMessages(newMessages);
    setInputValue("");

    // Create or reuse session
    let sessionId = currentSessionRef.current;
    if (!sessionId) {
      const title = (textContent || "Consulta con imagen").slice(0, 40);
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
    const normalizedInput = textContent.toLowerCase();
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

    const subjectPrefix = selectedSubject && selectedSubject !== "Todas las materias"
      ? `[Materia de enfoque: ${selectedSubject}]\n`
      : "";

    // Prepare conversation for the AI
    const rawHistory = newMessages.filter((m) => m.id !== "init");
    const conversationHistory = rawHistory.map((m, idx) => ({
      role: m.role,
      content: idx === rawHistory.length - 1 && subjectPrefix
        ? `${subjectPrefix}${m.content}`
        : m.content,
    }));

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
        if (result.quiz_created) {
          const qCount = result.quiz_created.questions_count ?? 0;
          const qName = result.quiz_created.deck?.nombre || "Cuestionario";
          toast.success(`¡Cuestionario "${qName}" creado con éxito! (${qCount} preguntas)`);
        }

        let finalCleaned = cleanAIResponse(result.content || "");
        if (!finalCleaned.trim()) {
          if (result.quiz_created) {
            const qCount = result.quiz_created.questions_count ?? 0;
            const qName = result.quiz_created.deck?.nombre || "Cuestionario";
            finalCleaned = `¡Listo! He creado el cuestionario **"${qName}"** con ${qCount} preguntas. Ya podés encontrarlo en tu sección de Cuestionarios listo para practicar.`;
          } else if (result.flashcards_created) {
            const cCount = result.flashcards_created.cards_count ?? 0;
            const dName = result.flashcards_created.deck?.nombre || "Mazo";
            finalCleaned = `¡Listo! Creé el mazo de flashcards **"${dName}"** con ${cCount} tarjetas de estudio.`;
          } else {
            finalCleaned = cleanAIResponse(fullContent);
          }
        }

        const finalSaved = finalCleaned;
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

  const handleSend = async () => {
    if (!inputValue.trim() && !attachedImage) return;
    const imageToSend = attachedImage
      ? { data: attachedImage.base64, mime_type: attachedImage.mimeType }
      : undefined;
    await executeSendMessage(inputValue, imageToSend, attachedImage?.preview);
  };

  const handlePromptBoxSend = async (message: string, files?: File[]) => {
    let imageToSend: { data: string; mime_type: string } | undefined = undefined;
    let previewToSend: string | undefined = undefined;

    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            resolve(res.includes(",") ? res.split(",")[1] : res);
          };
          reader.readAsDataURL(file);
        });
        imageToSend = { data: base64Data, mime_type: file.type || "image/jpeg" };
        previewToSend = URL.createObjectURL(file);
      }
    }

    if (!message.trim() && !imageToSend) return;

    let finalPrompt = message;
    if (message.startsWith("[Search: ")) {
      const query = message.replace(/^\[Search:\s*/, "").replace(/\]$/, "");
      finalPrompt = `🔍 [Búsqueda e Investigación Web]: ${query}`;
    } else if (message.startsWith("[Think: ")) {
      const thoughtQuery = message.replace(/^\[Think:\s*/, "").replace(/\]$/, "");
      finalPrompt = `🧠 [Modo Pensamiento Profundo / Razonamiento Académico]: ${thoughtQuery}`;
    } else if (message.startsWith("[Canvas: ")) {
      const canvasQuery = message.replace(/^\[Canvas:\s*/, "").replace(/\]$/, "");
      finalPrompt = `🎨 [Modo Canvas / Esquema Estructurado]: ${canvasQuery}`;
    }

    await executeSendMessage(finalPrompt, imageToSend, previewToSend);
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
        <div className="py-2">
          <AIThinkingIndicator personaName={activePersona?.name} />
        </div>
      );
    }

    if (role === "user") {
      // Limpiar prefijos internos de búsqueda/tags para que el usuario solo vea su texto limpio
      const cleanText = content
        .replace(/^\[(?:Search|Think|Image|Canvas):\s*([\s\S]*?)\]$/i, "$1")
        .replace(/^🔍\s*\[Búsqueda e Investigación Web\]:\s*/i, "")
        .replace(/^🧠\s*\[Modo Pensamiento Profundo.*?\]:\s*/i, "")
        .replace(/^🎨\s*\[Modo Imagen.*?\]:\s*/i, "")
        .trim();

      return <div className="whitespace-pre-wrap break-words">{cleanText}</div>;
    }

    return <ChatMessageContent content={content} />;
  };

  if (loading) {
    return <LoadingScreen message="Cargando Asistente T.A.B.E..." submessage="Iniciando inteligencia artificial..." />;
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden relative bg-background text-foreground">
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

      {/* Input de archivo persistente en el DOM (disponible tanto en inicio como en chat) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf,.txt,.md,image/*,audio/*"
      />

      <div className="flex-1 flex flex-col h-full min-w-0 relative z-10">

        {/* ── HEADER NOTION/GPT STYLE ──────────────────────── */}
        <header className="shrink-0 px-3 py-2 md:px-6 md:py-2.5 border-b border-border/60 bg-background/80 backdrop-blur-md flex items-center justify-between gap-2 z-20">
          {/* Left: Back + TABE AI Brand */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className={cn(
                "flex items-center gap-1.5 h-8 px-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs select-none",
                isSidebarOpen
                  ? "bg-zinc-200 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600 text-foreground font-semibold"
                  : "border-border/70 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground font-medium"
              )}
              title="Abrir historial de conversaciones y configuración"
            >
              <History className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs">Historial</span>
              {sessions && sessions.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-700 text-foreground font-bold">
                  {sessions.length}
                </span>
              )}
            </Button>
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs hover:shadow-xs select-none"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-muted-foreground group-hover:text-foreground" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 cursor-pointer text-left group"
              title="Nuevo chat"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-card border border-border flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                {activePersona?.avatar_emoji && activePersona.avatar_emoji !== "🤖" ? (
                  <span className="leading-none text-base">{activePersona.avatar_emoji}</span>
                ) : (
                  <TabeAIIcon size={22} animate={isStreaming} withGlow={true} />
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm md:text-base tracking-tight text-foreground">
                  TABE
                </span>
                <span className="text-[10px] uppercase bg-foreground/10 text-foreground px-1.5 py-0.5 rounded-md font-semibold border border-foreground/15">
                  AI
                </span>
              </div>
            </button>
          </div>

          {/* Center: Segmented Navigation Pill (PREGUNTAR | EXÁMENES | APPS) */}
          <nav className="flex items-center bg-muted/60 border border-border/50 rounded-full p-0.5 text-xs font-medium">
            <button
              onClick={() => {}}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-background text-foreground shadow-2xs font-semibold transition-all cursor-pointer"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Chat</span>
            </button>

            <Link
              to="/tabe-ai/examenes"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Rutas de estudio y exámenes"
            >
              <Target className="w-3 h-3" />
              <span>Exámenes</span>
            </Link>

            <button
              onClick={startLiveVoiceSession}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Voz en vivo"
            >
              <Mic className="w-3 h-3 text-primary" />
              <span className="hidden xs:inline">Voz</span>
            </button>
          </nav>

          {/* Right: Apuntes Online / Racha / Más / Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Apuntes Online Pill */}
            <Link
              to="/apuntes"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground border border-border text-[11px] font-medium transition-all"
              title="Ir a Apuntes Online"
            >
              <BookOpen className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Apuntes Online</span>
            </Link>

            {/* Racha de estudio */}
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 border border-border text-[11px] font-semibold text-foreground"
              title={`Racha de estudio: ${userStats?.racha_actual || 0} días`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{userStats?.racha_actual || 0}</span>
            </div>

            {/* Delete current chat if active */}
            {currentSessionId && (
              <HoldButton
                size="icon"
                radius={12}
                backgroundColor="var(--card, #ffffff)"
                fillColor="#FF5C5C"
                textColor="#dc2626"
                fillTextColor="#ffffff"
                holdTime={1400}
                icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
                doneIcon={<Check className="w-3.5 h-3.5 text-white" />}
                doneLabel=""
                onHold={() => handleDeleteSession(currentSessionId)}
                className="border border-border/60 rounded-xl shrink-0 hover:bg-muted/60 transition-colors"
                title="Mantené presionado para borrar este chat"
              />
            )}

            {/* User Avatar */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-8 h-8 rounded-full border border-border bg-muted text-foreground font-semibold flex items-center justify-center text-xs cursor-pointer overflow-hidden hover:scale-105 transition-transform"
              title="Abrir menú y perfil"
            >
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt={userName} className="w-full h-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </button>
          </div>
        </header>

        {/* ── MESSAGES / HERO AREA ───────────────────────────── */}
        <div
          className={cn(
            "flex-1 scroll-smooth relative",
            isWelcomeScreen || showLiveVoice
              ? "flex flex-col items-center justify-center overflow-hidden px-4"
              : "overflow-y-auto"
          )}
        >
          {showLiveVoice ? (
            /* Modo Voz en Vivo: VoicePoweredOrb WebGL + Controles flotantes Apple/ChatGPT */
            <div className="absolute inset-0 flex flex-col justify-between items-center z-20 px-4 py-8 bg-background/95 backdrop-blur-2xl animate-in fade-in duration-300">
              {/* Header de sesión de voz */}
              <div className="w-full max-w-md flex items-center justify-between px-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold tracking-tight text-foreground uppercase">
                    TABE AI · Voz en vivo
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/40">
                  Audio Interactivo
                </span>
              </div>

              {/* Centro: Orbe visualizador 3D reactivo a la voz */}
              <div className="flex-1 w-full flex flex-col items-center justify-center relative my-2">
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
                  <VoicePoweredOrb
                    className="w-full h-full"
                    hue={isAiSpeaking ? 160 : isAiThinking ? 45 : 210}
                    enableVoiceControl={true}
                    voiceSensitivity={1.3}
                    maxRotationSpeed={isAiSpeaking ? 1.5 : 0.8}
                    maxHoverIntensity={isAiSpeaking ? 0.9 : 0.5}
                  />
                </div>

                {/* Subtítulo dinámico / estado de voz */}
                <div className="mt-4 text-center max-w-md px-4 min-h-[44px] flex items-center justify-center">
                  {isAiSpeaking ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-medium animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>TABE AI está hablando...</span>
                    </div>
                  ) : isAiThinking ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Pensando respuesta...</span>
                    </div>
                  ) : liveTranscript ? (
                    <div className="inline-flex items-center px-4 py-1.5 rounded-2xl bg-zinc-900/90 dark:bg-white/90 text-white dark:text-zinc-900 text-xs sm:text-sm font-medium shadow-md max-w-sm text-center">
                      <span>"{liveTranscript}"</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-muted/60 border border-border/50 text-muted-foreground text-xs font-medium">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span>Te escucho, habla cuando quieras</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Controles de llamada inferiores estilo Apple/ChatGPT */}
              <div className="flex items-center justify-center gap-4 pt-2">
                {/* Botón Silenciar Micrófono */}
                <button
                  type="button"
                  onClick={() => {
                    if (speechRecognitionRef.current) {
                      try { speechRecognitionRef.current.stop(); } catch (_) {}
                      toast.info("Micrófono pausado");
                    }
                  }}
                  className="w-12 h-12 rounded-full border border-border/80 bg-muted/50 hover:bg-muted text-foreground flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Pausar escucha"
                >
                  <Mic className="w-5 h-5 text-muted-foreground" />
                </button>

                {/* Botón Finalizar llamada (Circular rojo estilo Siri/ChatGPT) */}
                <button
                  type="button"
                  onClick={closeLiveVoiceSession}
                  className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg hover:shadow-red-500/25 active:scale-95"
                  title="Finalizar conversación de voz"
                >
                  <X className="w-6 h-6 stroke-[2.4]" />
                </button>
              </div>
            </div>
          ) : isWelcomeScreen ? (
            /* Pantalla Inicial Estilo Apple / Notion / ChatGPT */
            <div
              className="flex-1 flex flex-col items-center justify-center w-full min-h-[75vh] max-w-2xl mx-auto px-4 text-center z-10 select-none"
            >
              {!welcomeContentReady ? (
                /* Fase 1: Únicamente el texto centrado que se disuelve */
                <div
                  onClick={dismissWelcomeIntro}
                  className={cn(
                    "w-full flex items-center justify-center transition-all duration-700 ease-out cursor-pointer",
                    welcomeIntroVisible
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-95 blur-xs pointer-events-none"
                  )}
                >
                  <ParticleTitle
                    text="¿Qué quieres aprender hoy?"
                    className="h-[220px] sm:h-[280px] w-full"
                  />
                </div>
              ) : (
                /* Fase 2: Interfaz Limpia Estilo ChatGPT con Logo de TABE */
                <div className="w-full flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out select-none py-6">
                  {/* Logo TABE (reemplaza la estrella) */}
                  <div className="mb-4">
                    <TabeLogo
                      size={54}
                      variant="ai"
                      className="drop-shadow-sm select-none transition-transform hover:scale-105 duration-300"
                    />
                  </div>

                  {/* Título sobrio estilo ChatGPT */}
                  <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground mb-6">
                    ¿Por dónde empezamos?
                  </h1>

                  {/* Barra de Entrada Centralizada en Pantalla de Bienvenida */}
                  <div className="w-full max-w-2xl text-left">
                    <AIPromptBar
                      value={inputValue}
                      onChange={setInputValue}
                      onSend={(msg, files) => {
                        if (files && files.length > 0) {
                          handlePromptBoxSend(msg, files);
                        } else {
                          executeSendMessage(
                            msg,
                            attachedImage
                              ? { data: attachedImage.base64, mime_type: attachedImage.mimeType }
                              : undefined,
                            attachedImage?.preview
                          );
                        }
                      }}
                      isLoading={isStreaming || isUploading}
                      placeholder="Pregúntale a TABE AI..."
                      attachedImage={attachedImage}
                      onRemoveImage={() => setAttachedImage(null)}
                      onAttachClick={() => fileInputRef.current?.click()}
                      selectedModel={selectedModel}
                      powerLevel={powerLevel}
                      onSelectPowerLevel={setPowerLevel}
                      onSelectModel={setSelectedModel}
                      selectedSubject={selectedSubject}
                      subjects={subjects}
                      onSelectSubject={setSelectedSubject}
                      onOpenLiveVoice={startLiveVoiceSession}
                      isLiveVoiceActive={showLiveVoice}
                      isRecordingVoice={isRecording}
                      recordingSeconds={recordingSeconds}
                      onStartVoiceRecording={startVoiceRecording}
                      onStopVoiceRecording={stopVoiceRecording}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
                <div className="max-w-3xl mx-auto px-3 py-4 md:px-6 md:py-6 space-y-4 md:space-y-6">
                  {messages
                    .filter((m) => !m.id?.startsWith("init"))
                    .map((message) => {
                      const isThinking = message.role === "assistant" && !message.content;
                      
                      if (message.role === "user") {
                        return (
                          <div key={message.id} className="flex justify-end my-4 select-text">
                            <div className="max-w-[85%] sm:max-w-[70%] rounded-3xl px-5 py-3 bg-[#f4f4f4] dark:bg-[#2f2f2f] text-zinc-900 dark:text-zinc-100 text-[15px] leading-relaxed shadow-2xs">
                              {renderContent(message.content, message.role)}
                            </div>
                          </div>
                        );
                      }

                      // Mensaje del Asistente estilo ChatGPT auténtico: fluido, limpio, sin recuadros toscos
                      return (
                        <div key={message.id} className="flex gap-4 my-6 items-start group select-text">
                          {/* Avatar mínimo de TABE AI */}
                          <div className="shrink-0 mt-0.5 select-none">
                            {activePersona?.avatar_emoji && activePersona.avatar_emoji !== "🤖" ? (
                              <div className="w-7 h-7 rounded-full bg-card border border-border/80 flex items-center justify-center text-sm shadow-2xs">
                                {activePersona.avatar_emoji}
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-card border border-border/80 flex items-center justify-center p-1 shadow-2xs">
                                <TabeAIIcon size={18} animate={isThinking} withGlow={isThinking} />
                              </div>
                            )}
                          </div>

                          {/* Contenido de respuesta */}
                          <div className="flex-1 min-w-0">
                            <div className="leading-relaxed text-[15px] text-zinc-900 dark:text-zinc-100">
                              {renderContent(message.content, message.role)}
                            </div>

                            {/* Botón copiar sutil estilo ChatGPT */}
                            {!isThinking && message.content && (
                              <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity select-none">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(message.content);
                                    toast.success("Copiado al portapapeles");
                                  }}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
                                  title="Copiar respuesta"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

        {/* ── UNIFIED ALL-IN-ONE PROMPT BAR (se oculta completamente en modo voz en vivo) ────────────────── */}
        {!showLiveVoice && !isWelcomeScreen && (
          <div className="shrink-0 px-3 py-2.5 md:px-6 md:py-3.5 bg-background/80 backdrop-blur-md border-t border-border/60 z-20 animate-in fade-in duration-300">
            <div className="max-w-3xl mx-auto">
              <AIPromptBar
                value={inputValue}
                onChange={setInputValue}
                onSend={(msg, files) => {
                  handlePromptBoxSend(msg, files);
                }}
                isLoading={isStreaming || isUploading}
                placeholder={
                  isUploading
                    ? "Procesando archivo adjunto..."
                    : showLiveVoice
                      ? "Hablando en vivo con TABE AI... (Di algo o escribe)"
                      : isRecording
                        ? "Grabando tu voz..."
                        : "Pregunta a TABE AI, consulta tus apuntes o pega una imagen..."
                }
                attachedImage={attachedImage}
                onRemoveImage={() => setAttachedImage(null)}
                onAttachClick={() => fileInputRef.current?.click()}
                selectedModel={selectedModel}
                powerLevel={powerLevel}
                onSelectPowerLevel={setPowerLevel}
                onSelectModel={setSelectedModel}
                selectedSubject={selectedSubject}
                subjects={subjects}
                onSelectSubject={(sub) => setSelectedSubject(sub)}
                onOpenLiveVoice={() => {
                  if (showLiveVoice) {
                    closeLiveVoiceSession();
                  } else {
                    startLiveVoiceSession();
                  }
                }}
                isLiveVoiceActive={showLiveVoice}
                isRecordingVoice={isRecording}
                recordingSeconds={recordingSeconds}
                onStartVoiceRecording={startVoiceRecording}
                onStopVoiceRecording={stopVoiceRecording}
              />

              <p className="text-[10px] text-center font-medium text-muted-foreground/60 mt-2 px-2 select-none">
                {activePersona?.name || "TABE AI"} puede cometer errores. Verifica información académica sensible.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

