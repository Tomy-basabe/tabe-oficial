import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Send, Bot, User, Sparkles, BookOpen, FileQuestion, Calendar, Menu, Mic, X,
  Paperclip, Loader2, ArrowLeft, ExternalLink, Brain, Trash2, Radio, Compass,
  MessageSquare, Target, LayoutGrid, Flame, Plus, ChevronDown, Check,
  Image as ImageIcon, MoreVertical, Volume2, SlidersHorizontal, Square
} from "lucide-react";
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
import { AVAILABLE_AI_MODELS, AITask } from "@/config/aiModels";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { AIPromptBar } from "@/components/ai/AIPromptBar";
import { TabeAIIcon } from "@/components/icons/TabeAIIcon";
import { AIThinkingIndicator } from "@/components/ai/AIThinkingIndicator";
import { ChatMessageContent } from "@/components/ai/ChatMessage";
import { HoldButton } from "@/components/ui/HoldButton";
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
  const showAvatarVideo = showLiveVoice || isWelcomeScreen;

  // ── 3D Avatar Video Controller (Intro, Rebobinado t->0, Loop y Cierre continuo) ──
  const avatarIntroRef = useRef<HTMLVideoElement>(null);
  const avatarIntroRevRef = useRef<HTMLVideoElement>(null);
  const avatarLoopRef = useRef<HTMLVideoElement>(null);
  const avatarOutroRef = useRef<HTMLVideoElement>(null);
  const [avatarStage, setAvatarStage] = useState<"idle" | "intro" | "intro-reversing" | "loop" | "closing-from-loop">("idle");

  // Precalentamiento de decodificadores de hardware
  useEffect(() => {
    [avatarIntroRef, avatarIntroRevRef, avatarLoopRef, avatarOutroRef].forEach((ref) => {
      if (ref.current) {
        ref.current.load();
      }
    });
  }, []);

  // Pausar reproducción cuando el avatar no esté visible para ahorrar GPU/recursos
  useEffect(() => {
    if (!showAvatarVideo) {
      [avatarIntroRef, avatarIntroRevRef, avatarLoopRef, avatarOutroRef].forEach((ref) => {
        if (ref.current && !ref.current.paused) {
          ref.current.pause();
        }
      });
    }
  }, [showAvatarVideo]);

  useEffect(() => {
    const intro = avatarIntroRef.current;
    const introRev = avatarIntroRevRef.current;
    const loop = avatarLoopRef.current;
    const outro = avatarOutroRef.current;

    if (showLiveVoice) {
      // Activar voz en vivo: arranca la intro hacia adelante desde 0s
      if (introRev) introRev.pause();
      if (loop) loop.pause();
      if (outro) outro.pause();
      if (intro) {
        intro.currentTime = 0;
        intro.play().then(() => {
          setAvatarStage("intro");
        }).catch(() => {
          setAvatarStage("intro");
        });
      }
    } else {
      // Cancelar / Finalizar voz en vivo
      if (avatarStage === "intro") {
        // CASO 1: Cancelado antes de llegar al bucle (ej: seg 3 -> vuelve de 3 a 0)
        const t = intro ? intro.currentTime : 0;
        if (intro) intro.pause();
        if (t > 0.15 && introRev) {
          // intro-rev dura 4.04s. Al segundo t le corresponde (4.04 - t)
          const revStart = Math.min(3.95, Math.max(0, 4.04 - t));
          introRev.currentTime = revStart;
          // Esperar a que el fotograma esté pintado (seeked) antes de conmutar para cero saltos
          const onSeeked = () => {
            introRev.play().catch(() => {});
            setAvatarStage("intro-reversing");
          };
          introRev.addEventListener("seeked", onSeeked, { once: true });
        } else {
          setAvatarStage("idle");
          if (intro) intro.currentTime = 0;
        }
      } else if (avatarStage === "loop") {
        // CASO 2: Cancelado en el bucle -> continúa desde ese segundo cancelado hasta el final (10s)
        const loopTime = loop ? loop.currentTime : 0;
        if (loop) loop.pause();
        // tabe-voice-pingpong dura ~3.54s: 0 a 1.77s (ida 4.0 a 5.75), 1.77 a 3.54s (vuelta 5.75 a 4.0)
        let equivTime = 4.0;
        if (loopTime <= 1.77) {
          equivTime = 4.0 + loopTime;
        } else {
          equivTime = 5.75 - (loopTime - 1.77);
        }
        equivTime = Math.min(5.75, Math.max(4.0, equivTime));

        if (outro) {
          outro.currentTime = equivTime;
          // Esperar a que el decodificador de GPU tenga el fotograma listo
          const onSeeked = () => {
            outro.play().catch(() => {});
            setAvatarStage("closing-from-loop");
          };
          outro.addEventListener("seeked", onSeeked, { once: true });
        } else {
          setAvatarStage("idle");
        }
      } else if (avatarStage === "intro-reversing" || avatarStage === "closing-from-loop") {
        // Ya está en animación de salida fluida, dejar que termine
      } else {
        setAvatarStage("idle");
        if (intro) { intro.pause(); intro.currentTime = 0; }
        if (introRev) introRev.pause();
        if (loop) loop.pause();
        if (outro) outro.pause();
      }
    }
  }, [showLiveVoice]);

  const handleIntroEnded = () => {
    if (showLiveVoice) {
      const loop = avatarLoopRef.current;
      if (loop) {
        loop.currentTime = 0;
        loop.play().then(() => {
          setAvatarStage("loop");
        }).catch(() => {
          setAvatarStage("loop");
        });
      } else {
        setAvatarStage("loop");
      }
    } else {
      setAvatarStage("idle");
    }
  };

  const handleIntroRevEnded = () => {
    // Al terminar el rebobinado suave de t a 0, queda en reposo
    setAvatarStage("idle");
    const intro = avatarIntroRef.current;
    if (intro) {
      intro.currentTime = 0;
      intro.pause();
    }
  };

  const handleOutroEnded = () => {
    // Al terminar de reproducirse hasta el segundo 10 final, queda en reposo
    setAvatarStage("idle");
    const intro = avatarIntroRef.current;
    if (intro) {
      intro.currentTime = 0;
      intro.pause();
    }
  };



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
    } else if (message.startsWith("[Image: ")) {
      const imageQuery = message.replace(/^\[Image:\s*/, "").replace(/\]$/, "");
      const seed = Math.floor(Math.random() * 900000) + 100000;
      finalPrompt = `🎨 [Modo Imagen / Generación Visual con Flux]: Crea una imagen artística y detallada de nivel profesional sobre "${imageQuery}".
Obligatorio: Inserta en tu respuesta la imagen en Markdown utilizando el motor Flux sin marca de agua:
![${imageQuery}](https://image.pollinations.ai/prompt/${encodeURIComponent(imageQuery + ", 8k, photorealistic, highly detailed, clean masterpiece")}?model=flux&width=1024&height=1024&seed=${seed}&nologo=true&enhance=true)
Y añade una breve explicación o análisis didáctico de la ilustración en español.`;
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
        <AIThinkingIndicator
          personaName={activePersona?.name}
          statusText="Analizando contexto, materias y apuntes..."
        />
      );
    }

    if (role === "user") {
      return content.split("\n").map((line, i) => <div key={i} className="text-black leading-relaxed font-bold">{line}</div>);
    }

    return <ChatMessageContent content={content} />;
  };

  if (loading) {
    return <LoadingScreen message="Cargando Asistente T.A.B.E..." submessage="Iniciando inteligencia artificial..." />;
  }

  return (
    <div
      className="flex h-[100dvh] w-full overflow-hidden relative bg-white"
      style={{
        backgroundColor: "#FFFFFF",
      }}
    >
      {/* ── 3D AVATAR BACKGROUND VIDEO CON FONDO BLANCO Y ENCUADRE NÍTIDO ──────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 w-full h-full pointer-events-none z-0 flex items-center justify-center overflow-hidden bg-white transition-opacity duration-300",
          showAvatarVideo ? "opacity-100" : "opacity-0 invisible pointer-events-none"
        )}
        style={{
          backgroundColor: "#FFFFFF",
        }}
      >
        <div className="relative w-full max-w-4xl aspect-video flex items-center justify-center">
          {/* 1. Intro Video (0s a 4.00s) / Reposo en frame 0 */}
          <video
            ref={avatarIntroRef}
            src="/videos/tabe-voice-intro.mp4"
            muted
            playsInline
            preload="auto"
            controls={false}
            onEnded={handleIntroEnded}
            style={{
              maskImage: "radial-gradient(ellipse 70% 65% at 50% 50%, black 45%, transparent 92%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 65% at 50% 50%, black 45%, transparent 92%)",
            }}
            className={cn(
              "absolute inset-0 w-full h-full object-contain",
              avatarStage === "intro" || avatarStage === "idle"
                ? "opacity-100 z-10"
                : "opacity-0 pointer-events-none z-0"
            )}
          />

          {/* 2. Intro Reverse Video (Rebobinado fluido de t a 0s si cancela en intro) */}
          <video
            ref={avatarIntroRevRef}
            src="/videos/tabe-voice-intro-rev.mp4"
            muted
            playsInline
            preload="auto"
            controls={false}
            onEnded={handleIntroRevEnded}
            style={{
              maskImage: "radial-gradient(ellipse 70% 65% at 50% 50%, black 45%, transparent 92%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 65% at 50% 50%, black 45%, transparent 92%)",
            }}
            className={cn(
              "absolute inset-0 w-full h-full object-contain",
              avatarStage === "intro-reversing"
                ? "opacity-100 z-10"
                : "opacity-0 pointer-events-none z-0"
            )}
          />

          {/* 3. Bucle Ping-Pong continuo por GPU (00.04 a 00.05 18f simétrico) */}
          <video
            ref={avatarLoopRef}
            src="/videos/tabe-voice-pingpong.mp4"
            muted
            playsInline
            loop
            preload="auto"
            controls={false}
            style={{
              maskImage: "radial-gradient(ellipse 70% 65% at 50% 50%, black 45%, transparent 92%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 65% at 50% 50%, black 45%, transparent 92%)",
            }}
            className={cn(
              "absolute inset-0 w-full h-full object-contain",
              avatarStage === "loop"
                ? "opacity-100 z-10"
                : "opacity-0 pointer-events-none z-0"
            )}
          />

          {/* 4. Video Completo Outro (continúa desde el frame exacto cancelado en el bucle hasta el final) */}
          <video
            ref={avatarOutroRef}
            src="/videos/tabe-voice-avatar.mp4"
            muted
            playsInline
            preload="auto"
            controls={false}
            onEnded={handleOutroEnded}
            style={{
              maskImage: "radial-gradient(ellipse 70% 65% at 50% 50%, black 45%, transparent 92%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 65% at 50% 50%, black 45%, transparent 92%)",
            }}
            className={cn(
              "absolute inset-0 w-full h-full object-contain",
              avatarStage === "closing-from-loop"
                ? "opacity-100 z-10"
                : "opacity-0 pointer-events-none z-0"
            )}
          />
        </div>
      </div>

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

      <div className="flex-1 flex flex-col h-full min-w-0 relative z-10">

        {/* ── HEADER ASTRA AI STYLE ──────────────────────── */}
        <header className="shrink-0 px-3 py-2 md:px-6 md:py-2.5 border-b-2 border-foreground bg-card/95 backdrop-blur-md flex items-center justify-between gap-2 z-20">
          {/* Left: Back + TABE AI Brand */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <Link
              to="/dashboard"
              className="w-8 h-8 md:w-9 md:h-9 rounded-xl border-2 border-foreground bg-card hover:bg-muted text-foreground flex items-center justify-center shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-transform active:scale-95"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="w-4 h-4 md:w-4.5 md:h-4.5" />
            </Link>

            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 cursor-pointer text-left group"
              title="Nuevo chat"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-card border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                {activePersona?.avatar_emoji && activePersona.avatar_emoji !== "🤖" ? (
                  <span className="leading-none text-base">{activePersona.avatar_emoji}</span>
                ) : (
                  <TabeAIIcon size={22} animate={isStreaming} withGlow={true} />
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="font-black text-sm md:text-base tracking-tight uppercase text-foreground">
                  TABE
                </span>
                <span className="text-[10px] font-black uppercase bg-[#FFE600] text-black px-1.5 py-0.5 rounded-md border-2 border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))]">
                  AI
                </span>
              </div>
            </button>
          </div>

          {/* Center: Segmented Navigation Pill (PREGUNTAR | EXÁMENES | APPS) */}
          <nav className="flex items-center bg-background border-2 border-foreground rounded-full p-1 shadow-[2px_2px_0_0_hsl(var(--foreground))] text-xs font-black uppercase">
            {/* Tab: Preguntar */}
            <button
              onClick={() => {
                if (messages.length > 1) {
                  // Ya estamos en preguntar
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-foreground text-background shadow-xs transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-[11px] md:text-xs tracking-wider">Preguntar</span>
            </button>

            {/* Tab: Exámenes -> redirects to /tabe-ai/examenes */}
            <Link
              to="/tabe-ai/examenes"
              className="flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-foreground hover:bg-muted transition-all cursor-pointer group"
              title="Ir a Rutas de Estudio Gamificadas por Niveles"
            >
              <Target className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-[11px] md:text-xs tracking-wider">Exámenes</span>
            </Link>

            {/* Tab: Apps / Historial */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-foreground hover:bg-muted transition-all cursor-pointer"
              title="Personalidades y Chats Anteriores"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden xs:inline text-[11px] md:text-xs tracking-wider">Apps</span>
            </button>
          </nav>

          {/* Right: Apuntes Online / Racha / Más / Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Apuntes Online Pill */}
            <Link
              to="/apuntes"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE600] hover:bg-[#ffe100] text-black border-2 border-foreground text-[10px] md:text-xs font-black uppercase shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-all"
              title="Ir a Apuntes Online"
            >
              <BookOpen className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Apuntes Online</span>
            </Link>

            {/* Racha de estudio */}
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-card border-2 border-foreground text-[10px] md:text-xs font-black uppercase shadow-[2px_2px_0_0_hsl(var(--foreground))]"
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
                className="border-2 border-foreground rounded-xl shrink-0 shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                title="Mantené presionado para borrar este chat"
              />
            )}

            {/* User Avatar */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-8 h-8 rounded-full border-2 border-foreground bg-[#FFE600] text-black font-black flex items-center justify-center text-xs shadow-[2px_2px_0_0_hsl(var(--foreground))] cursor-pointer overflow-hidden hover:scale-105 transition-transform"
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
            /* Modo Voz en Vivo: Video limpio de TABE + Controles flotantes en la parte inferior */
            <div className="absolute inset-0 flex flex-col justify-end items-center z-20 px-4 pb-8 sm:pb-10 pointer-events-none">
              {/* Subtítulo dinámico / estado de voz discreto flotante en la parte inferior */}
              <div className="mb-4 text-center max-w-md px-4 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                {isAiSpeaking ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-black shadow-md backdrop-blur-md animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>TABE AI está hablando...</span>
                  </div>
                ) : isAiThinking ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border-2 border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs sm:text-sm font-black shadow-md backdrop-blur-md animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                    <span>Pensando respuesta...</span>
                  </div>
                ) : liveTranscript ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/80 text-white text-xs sm:text-sm font-bold shadow-lg backdrop-blur-md max-w-sm text-center border-2 border-white/20">
                    <span>"{liveTranscript}"</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 dark:bg-zinc-900/90 border-2 border-foreground/30 text-foreground text-xs sm:text-sm font-bold shadow-md backdrop-blur-md">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span>Te escucho, habla cuando quieras</span>
                  </div>
                )}
              </div>

              {/* Botón CUADRADO para finalizar la conversación */}
              <div className="pointer-events-auto flex flex-col items-center gap-1.5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button
                  type="button"
                  onClick={closeLiveVoiceSession}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FF4747] hover:bg-red-600 active:scale-95 text-white flex flex-col items-center justify-center gap-1 shadow-[3px_3px_0_0_#000] border-2 border-black transition-all cursor-pointer hover:shadow-[1px_1px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
                  title="Finalizar conversación de voz"
                >
                  <Square className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
                  <span className="text-[10px] font-black uppercase tracking-wider">FIN</span>
                </button>
                <span className="text-[11px] font-black text-black uppercase tracking-wider select-none bg-white/70 px-2 py-0.5 rounded-md backdrop-blur-xs">
                  Finalizar
                </span>
              </div>
            </div>
          ) : isWelcomeScreen ? (
            /* Saludo situado bien arriba para despejar completamente el avatar 3D central */
            <div className="absolute top-3 sm:top-4 md:top-5 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500 w-full max-w-xl px-4 pointer-events-none z-20">
              <h1 className="text-base sm:text-lg md:text-xl font-black text-zinc-900 tracking-tight select-none backdrop-blur-xs bg-white/50 dark:bg-zinc-900/50 px-4 py-1.5 rounded-xl border border-white/70 dark:border-zinc-800/70 shadow-xs">
                ¡Hola {userName}, bienvenido! 👋
              </h1>
            </div>
          ) : (
                <div className="max-w-3xl mx-auto px-3 py-3 md:px-6 md:py-5 space-y-3.5 md:space-y-4">
                  {messages
                    .filter((m) => !m.id?.startsWith("init"))
                    .map((message) => {
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
              )}
            </div>

        {/* ── UNIFIED ALL-IN-ONE PROMPT BAR (se oculta completamente en modo voz en vivo) ────────────────── */}
        {!showLiveVoice && (
          <div className="shrink-0 px-3 py-2.5 md:px-6 md:py-3.5 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 z-20">
            <div className="max-w-3xl mx-auto">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.txt,.md,image/*,audio/*"
              />

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
                onSelectPowerLevel={(level) => {
                  setPowerLevel(level);
                  toast.success(`Modo: ${level.toUpperCase()}`);
                }}
                onSelectModel={(m) => {
                  setSelectedModel(m);
                  toast.success(`${m.shortName || m.name}`);
                }}
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

