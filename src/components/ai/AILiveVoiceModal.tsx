import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Mic, MicOff, Video, VideoOff, SwitchCamera, Monitor, MonitorOff,
  Volume2, VolumeX, Sparkles, Radio, ChevronDown, ChevronUp, Send,
  Zap, Volume1, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AIPersona } from "@/hooks/useAIPersonas";
import { DisplayMessage } from "@/contexts/AIChatContext";
import { AIModelOption, PowerEffort } from "@/config/aiModels";
import { StreamResult } from "@/lib/aiClientService";
import { TabeAIIcon } from "@/components/icons/TabeAIIcon";

interface AILiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePersona: AIPersona;
  selectedModel: AIModelOption;
  powerLevel: PowerEffort;
  onSaveMessage: (text: string, isUser: boolean, imageUrl?: string) => Promise<void>;
  streamMessage: (
    messages: Array<{ role: string; content: string }>,
    persona_id: string,
    onDelta: (text: string) => void,
    onComplete: (result: StreamResult) => void,
    onError: (error: Error) => void,
    context_page?: string,
    modelOverride?: AIModelOption,
    powerOverride?: PowerEffort,
    onReset?: () => void,
    image?: { data: string; mime_type: string }
  ) => Promise<void>;
  existingMessages: DisplayMessage[];
  onAddDisplayMessage: (msg: DisplayMessage) => void;
}

type LiveState = "idle" | "listening" | "thinking" | "speaking";
type VoiceLanguageMode = "es" | "es-AR" | "es-MX" | "es-ES";

// Clean text for speech synthesis (strip markdown, links, LaTeX markers)
function cleanTextForSpeech(text: string): string {
  if (!text) return "";
  let cleaned = text;
  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " Bloque de código omitido. ");
  // Remove inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  // Remove links [text](url)
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Remove bold / italic markdown
  cleaned = cleaned.replace(/[*_~]{1,3}/g, "");
  // Remove markdown headers
  cleaned = cleaned.replace(/^#+\s+/gm, "");
  // Replace simple math symbols with natural spoken words
  cleaned = cleaned.replace(/\$/g, "");
  cleaned = cleaned.replace(/\\approx/g, " aproximadamente ");
  cleaned = cleaned.replace(/\\cdot/g, " por ");
  cleaned = cleaned.replace(/\\times/g, " por ");
  cleaned = cleaned.replace(/\\pm/g, " más o menos ");
  cleaned = cleaned.replace(/\\leq/g, " menor o igual que ");
  cleaned = cleaned.replace(/\\geq/g, " mayor o igual que ");
  cleaned = cleaned.replace(/\\neq/g, " distinto de ");
  cleaned = cleaned.replace(/\\pi/g, " pi ");
  // Remove bullet points
  cleaned = cleaned.replace(/^[\*\-\+]\s+/gm, "");
  return cleaned.trim();
}

// Select natural human voice based on language mode
function pickBestVoice(voices: SpeechSynthesisVoice[], langMode: VoiceLanguageMode): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // Filter out any robotic desktop/SAPI legacy voices
  const naturalVoices = voices.filter(v => {
    const n = v.name.toLowerCase();
    return !n.includes("desktop") && !n.includes("espeak") && !n.includes("sabina") && !n.includes("helena");
  });

  const pool = naturalVoices.length > 0 ? naturalVoices : voices;

  const targetCode = langMode === "es-AR" ? "es-ar" : langMode === "es-MX" ? "es-mx" : "es-es";

  // Tier 1: Natural/Neural/Online/Google/Siri in the exact target dialect
  const dialectNeural = pool.find(v => {
    const l = (v.lang || "").toLowerCase();
    const n = v.name.toLowerCase();
    const isNeural = n.includes("natural") || n.includes("online") || n.includes("google") || n.includes("neural") || n.includes("siri");
    return (l.includes(targetCode) || (targetCode === "es-mx" && l.includes("es-419")) || (targetCode === "es-ar" && l.includes("es-ar"))) && isNeural;
  });
  if (dialectNeural) return dialectNeural;

  // Tier 2: Any voice in the exact dialect
  const dialectAny = pool.find(v => {
    const l = (v.lang || "").toLowerCase();
    return l.includes(targetCode) || (targetCode === "es-mx" && (l.includes("es-419") || l.includes("es-us")));
  });
  if (dialectAny) return dialectAny;

  // Tier 3: Any Natural/Neural/Google Spanish voice
  const anySpanishNeural = pool.find(v => {
    const l = (v.lang || "").toLowerCase();
    const n = v.name.toLowerCase();
    const isNeural = n.includes("natural") || n.includes("online") || n.includes("google") || n.includes("neural") || n.includes("siri");
    return l.startsWith("es") && isNeural;
  });
  if (anySpanishNeural) return anySpanishNeural;

  // Tier 4: Any Spanish voice
  const anySpanish = pool.find(v => (v.lang || "").toLowerCase().startsWith("es"));
  if (anySpanish) return anySpanish;

  return pool[0] || null;
}

export function AILiveVoiceModal({
  isOpen,
  onClose,
  activePersona,
  selectedModel,
  powerLevel,
  onSaveMessage,
  streamMessage,
  existingMessages,
  onAddDisplayMessage
}: AILiveVoiceModalProps) {
  // Core state
  const [liveState, setLiveState] = useState<LiveState>("listening");
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0.2); // for animated visualizer orb
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [userInterimTranscript, setUserInterimTranscript] = useState("");
  const [currentAiSpeechText, setCurrentAiSpeechText] = useState("");
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{ role: "user" | "assistant"; text: string; imagePreview?: string }>>([]);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [voiceLang, setVoiceLang] = useState<VoiceLanguageMode>("es-AR");
  const [currentVoiceName, setCurrentVoiceName] = useState<string>("Voz Humana Natural");

  // Multimodal state (Camera & Screen Share)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScreenShareActive, setIsScreenShareActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [flashSnapshot, setFlashSnapshot] = useState(false);
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null);

  // References
  const recognitionRef = useRef<any>(null);
  const isRecognizingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const restartTimeoutRef = useRef<any>(null);
  const isSpeakingTtsRef = useRef(false);
  const isStreamingAiRef = useRef(false);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingAudioQueueRef = useRef(false);
  const sentenceBufferRef = useRef("");
  const accumulatedAiResponseRef = useRef("");
  const lastRecognizedRef = useRef("");
  const isComponentActiveRef = useRef(false);
  const availableVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const activeUtterancesRef = useRef<Set<SpeechSynthesisUtterance>>(new Set());
  const keepAliveTimerRef = useRef<any>(null);

  // Stop any playing audio immediately (Instant Barge-in)
  const stopAudio = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingAudioQueueRef.current = false;
    isSpeakingTtsRef.current = false;
    sentenceBufferRef.current = "";

    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    activeUtterancesRef.current.clear();
  }, []);

  // Speak a single sentence using SpeechSynthesis with GC protection and Watchdog
  const speakUtterance = useCallback((textToSpeak: string, voice: SpeechSynthesisVoice | null): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = voiceLang === "es-AR" ? "es-AR" : voiceLang === "es-MX" ? "es-MX" : "es-ES";
      }

      utterance.rate = 1.08; // natural, brisk conversational pace
      utterance.pitch = 1.0;

      let hasFinished = false;
      let watchdogTimer: any = null;

      const cleanup = () => {
        if (hasFinished) return;
        hasFinished = true;
        if (watchdogTimer) clearTimeout(watchdogTimer);
        activeUtterancesRef.current.delete(utterance);
        resolve();
      };

      utterance.onend = cleanup;
      utterance.onerror = cleanup;

      // Hard watchdog: max 6.5 seconds per sentence chunk so the queue NEVER freezes
      const maxDuration = Math.min(6500, Math.max(1800, textToSpeak.length * 70));
      watchdogTimer = setTimeout(() => {
        cleanup();
      }, maxDuration);

      activeUtterancesRef.current.add(utterance);
      window.speechSynthesis.speak(utterance);
    });
  }, [voiceLang]);

  // Play natural human neural audio queue
  const playNextInAudioQueue = useCallback(async () => {
    if (isSoundMuted || audioQueueRef.current.length === 0) {
      isPlayingAudioQueueRef.current = false;
      isSpeakingTtsRef.current = false;
      if (!isStreamingAiRef.current) {
        setLiveState("listening");
      }
      return;
    }

    isPlayingAudioQueueRef.current = true;
    isSpeakingTtsRef.current = true;
    setLiveState("speaking");

    const textToPlay = audioQueueRef.current.shift()!;
    const cleaned = cleanTextForSpeech(textToPlay);
    if (!cleaned) {
      playNextInAudioQueue();
      return;
    }

    setCurrentAiSpeechText(cleaned);

    try {
      const activeVoice = pickBestVoice(availableVoicesRef.current, voiceLang);
      if (activeVoice) {
        setCurrentVoiceName(activeVoice.name);
      }
      await speakUtterance(cleaned, activeVoice);
    } catch (_) {
      // Continue to next sentence if any error
    }

    playNextInAudioQueue();
  }, [isSoundMuted, voiceLang, speakUtterance]);

  // Enqueue sentence for natural speech
  const queueSentenceToSpeak = useCallback((text: string) => {
    if (isSoundMuted) return;
    audioQueueRef.current.push(text);
    if (!isPlayingAudioQueueRef.current) {
      playNextInAudioQueue();
    }
  }, [isSoundMuted, playNextInAudioQueue]);

  // Keep-alive for SpeechSynthesis to avoid Chrome freezing on long speech
  useEffect(() => {
    if (!isOpen) return;
    keepAliveTimerRef.current = setInterval(() => {
      if (typeof window !== "undefined" && window.speechSynthesis && isSpeakingTtsRef.current) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 4500);

    return () => {
      if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
    };
  }, [isOpen]);

  // Pre-load and sync voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices && allVoices.length > 0) {
        availableVoicesRef.current = allVoices;
        const best = pickBestVoice(allVoices, voiceLang);
        if (best) setCurrentVoiceName(best.name);
      }
    };

    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [voiceLang]);

  // Capture frame from active video (Camera or Screen share)
  const captureSnapshot = useCallback((): { data: string; mime_type: string; preview: string } | null => {
    if (!videoRef.current || (!isCameraActive && !isScreenShareActive)) return null;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    try {
      const maxDim = 1024;
      let w = video.videoWidth;
      let h = video.videoHeight;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      const base64 = dataUrl.split(",")[1];

      // Flash effect
      setFlashSnapshot(true);
      setTimeout(() => setFlashSnapshot(false), 200);
      setSnapshotPreview(dataUrl);

      return { data: base64, mime_type: "image/jpeg", preview: dataUrl };
    } catch (e) {
      console.warn("Could not capture snapshot:", e);
      return null;
    }
  }, [isCameraActive, isScreenShareActive]);

  // Send completed user utterance to AI Stream
  const handleUserSpoke = useCallback(async (spokenText: string) => {
    const text = spokenText.trim();
    if (!text || isStreamingAiRef.current) return;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setUserInterimTranscript("");
    setIsUserTalking(false);
    setLiveState("thinking");
    isStreamingAiRef.current = true;
    accumulatedAiResponseRef.current = "";
    sentenceBufferRef.current = "";
    stopAudio();

    // Capture visual snapshot if camera or screen share is enabled
    const snapshot = captureSnapshot();

    // Add user turn to live transcript history
    setTranscriptHistory(prev => [
      ...prev,
      { role: "user", text, imagePreview: snapshot?.preview }
    ]);

    // Format recent history for model context
    const recentMsgs = existingMessages
      .filter(m => m.id !== "init" && m.id !== "init-proactive-exam" && m.id !== "init-proactive-streak")
      .slice(-4)
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));

    recentMsgs.push({ role: "user", content: text });

    // Save user message to main conversation
    const userMsgId = `live-u-${Date.now()}`;
    const userDisplayMsg: DisplayMessage = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: new Date(),
      imageUrl: snapshot?.preview
    };
    onAddDisplayMessage(userDisplayMsg);
    onSaveMessage(text, true, snapshot?.preview).catch(console.error);

    try {
      // Use "Modo Live de Voz Fluida" so useStreamingChat generates the 0ms conversational prompt
      // and powerOverride "bajo" to use the ultra-fast Groq model (<250ms response time)
      await streamMessage(
        recentMsgs,
        activePersona.id,
        // onDelta
        (delta: string) => {
          accumulatedAiResponseRef.current += delta;
          sentenceBufferRef.current += delta;

          // Check if we have a full sentence to speak with low latency (8+ chars and punctuation)
          const match = sentenceBufferRef.current.match(/^([\s\S]+?([.!?\n]+|\:\s))(\s+[\s\S]*)$/);
          if (match && match[1].length >= 6) {
            const sentenceToSpeak = match[1].trim();
            sentenceBufferRef.current = match[3] || "";
            queueSentenceToSpeak(sentenceToSpeak);
          }
        },
        // onComplete
        (result: StreamResult) => {
          isStreamingAiRef.current = false;
          const fullContent = result.content || accumulatedAiResponseRef.current;

          // Speak any remaining tail buffer
          if (sentenceBufferRef.current.trim().length > 0) {
            queueSentenceToSpeak(sentenceBufferRef.current.trim());
            sentenceBufferRef.current = "";
          }

          // Add assistant turn to live transcript history
          setTranscriptHistory(prev => [
            ...prev,
            { role: "assistant", text: fullContent }
          ]);

          // Save assistant message to main conversation
          const assistantMsgId = `live-a-${Date.now()}`;
          const assistantDisplayMsg: DisplayMessage = {
            id: assistantMsgId,
            role: "assistant",
            content: fullContent,
            timestamp: new Date()
          };
          onAddDisplayMessage(assistantDisplayMsg);
          onSaveMessage(fullContent, false).catch(console.error);

          if (!isSpeakingTtsRef.current && !isPlayingAudioQueueRef.current) {
            setLiveState("listening");
          }
        },
        // onError
        (err: Error) => {
          isStreamingAiRef.current = false;
          setLiveState("listening");
          toast.error("Error al procesar respuesta de voz");
          console.error("Live voice streaming error:", err);
        },
        "Modo Live de Voz Fluida",
        selectedModel,
        "bajo", // Ultra-fast model priority (200ms latency)
        undefined,
        snapshot ? { data: snapshot.data, mime_type: snapshot.mime_type } : undefined
      );
    } catch (e: any) {
      isStreamingAiRef.current = false;
      setLiveState("listening");
      toast.error(e.message || "Error al conectar con la IA");
    }
  }, [
    captureSnapshot,
    existingMessages,
    onAddDisplayMessage,
    onSaveMessage,
    streamMessage,
    activePersona.id,
    queueSentenceToSpeak,
    selectedModel,
    stopAudio
  ]);

  // Trigger submission with debounced silence detection
  const scheduleSubmission = useCallback((delayMs: number) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (lastRecognizedRef.current && isComponentActiveRef.current && !isStreamingAiRef.current) {
        const query = lastRecognizedRef.current;
        lastRecognizedRef.current = "";
        handleUserSpoke(query);
      }
    }, delayMs);
  }, [handleUserSpoke]);

  // Safely start or restart recognition
  const startRecognition = useCallback(() => {
    if (!recognitionRef.current || !isComponentActiveRef.current || isMicMuted) return;
    if (isRecognizingRef.current) return;

    try {
      recognitionRef.current.start();
      isRecognizingRef.current = true;
    } catch (err: any) {
      if (err.name === "InvalidStateError" || err.message?.includes("already started")) {
        isRecognizingRef.current = true;
      }
    }
  }, [isMicMuted]);

  // Voice Activity & Continuous Speech Recognition Setup (Zero-Contention, Snappy Turnaround)
  useEffect(() => {
    if (!isOpen) return;
    isComponentActiveRef.current = true;

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Tu navegador no soporta reconocimiento de voz en vivo");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = voiceLang === "es-AR" ? "es-AR" : voiceLang === "es-MX" ? "es-MX" : "es-ES";
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      if (liveState === "idle") setLiveState("listening");
    };

    recognition.onspeechstart = () => {
      setIsUserTalking(true);
      // Instant Barge-In: User spoke, cut AI speech immediately!
      if (isSpeakingTtsRef.current || isStreamingAiRef.current) {
        stopAudio();
        isStreamingAiRef.current = false;
        setLiveState("listening");
      }
    };

    recognition.onspeechend = () => {
      setIsUserTalking(false);
      // When user stops speaking, submit fast (300ms)
      if (lastRecognizedRef.current.trim().length > 1) {
        scheduleSubmission(300);
      }
    };

    recognition.onsoundstart = () => {
      setIsUserTalking(true);
    };

    recognition.onsoundend = () => {
      setIsUserTalking(false);
      if (lastRecognizedRef.current.trim().length > 1) {
        scheduleSubmission(350);
      }
    };

    recognition.onresult = (event: any) => {
      if (isMicMuted) return;

      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcriptPart;
        } else {
          interim += transcriptPart;
        }
      }

      const currentChunk = (final || interim).trim();

      // BARGE-IN: Natural user interruption!
      if (currentChunk.length > 1 && (isSpeakingTtsRef.current || isStreamingAiRef.current)) {
        stopAudio();
        isStreamingAiRef.current = false;
        setLiveState("listening");
      }

      if (currentChunk) {
        setUserInterimTranscript(currentChunk);
        lastRecognizedRef.current = currentChunk;
        setLiveState("listening");
        setIsUserTalking(true);
      }

      if (final.trim()) {
        lastRecognizedRef.current = final.trim();
        // Snappy turnaround: 280ms of silence after final result before submitting to AI
        scheduleSubmission(280);
      } else if (interim.trim().length > 1) {
        lastRecognizedRef.current = interim.trim();
        // If user pauses for 600ms on interim without explicit final, auto-submit
        scheduleSubmission(600);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") {
        setIsUserTalking(false);
        return;
      }
      if (event.error === "audio-capture") {
        toast.error("No se detectó entrada de micrófono");
      }
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setIsUserTalking(false);
      // Auto-restart continuous recognition with small safe delay to prevent InvalidStateError
      if (isComponentActiveRef.current && !isMicMuted) {
        restartTimeoutRef.current = setTimeout(() => {
          startRecognition();
        }, 120);
      }
    };

    startRecognition();

    return () => {
      isComponentActiveRef.current = false;
      isRecognizingRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      try {
        recognition.stop();
      } catch (_) {}
    };
  }, [isOpen, isMicMuted, voiceLang, scheduleSubmission, startRecognition, stopAudio, liveState]);

  // Keep-alive Heartbeat for SpeechRecognition
  useEffect(() => {
    if (!isOpen) return;
    const heartbeat = setInterval(() => {
      if (
        isComponentActiveRef.current &&
        !isMicMuted &&
        !isRecognizingRef.current &&
        liveState === "listening" &&
        !isStreamingAiRef.current
      ) {
        startRecognition();
      }
    }, 1200);

    return () => clearInterval(heartbeat);
  }, [isOpen, isMicMuted, liveState, startRecognition]);

  // Thinking State Watchdog (Never get stuck thinking for > 7.5s)
  useEffect(() => {
    if (liveState !== "thinking") return;
    const watchdog = setTimeout(() => {
      if (isStreamingAiRef.current) {
        console.warn("Watchdog: AI streaming timeout, recovering to listening");
        isStreamingAiRef.current = false;
        setLiveState("listening");
        toast.info("Te escucho, hazme otra pregunta...");
      }
    }, 7500);

    return () => clearTimeout(watchdog);
  }, [liveState]);

  // Visualizer Animation Loop (Driven by dynamic state without mic locking)
  useEffect(() => {
    if (!isOpen) return;
    let animId: number;
    let phase = 0;

    const tick = () => {
      phase += 0.08;
      if (liveState === "speaking") {
        // Equalizer wave cadence while AI speaks
        const level = 0.45 + Math.sin(phase * 1.5) * 0.35;
        setAudioLevel(level);
      } else if (isUserTalking || userInterimTranscript) {
        // High energy wave while user speaks
        const level = 0.55 + Math.sin(phase * 2.2) * 0.35;
        setAudioLevel(level);
      } else {
        // Idle gentle rhythmic breathing
        const level = 0.15 + Math.sin(phase * 0.8) * 0.08;
        setAudioLevel(level);
      }
      animId = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, liveState, isUserTalking, userInterimTranscript]);

  // Camera Management
  const toggleCamera = async () => {
    if (isCameraActive) {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
        videoStreamRef.current = null;
      }
      setIsCameraActive(false);
      setSnapshotPreview(null);
    } else {
      try {
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach(t => t.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: cameraFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        videoStreamRef.current = stream;
        setIsCameraActive(true);
        setIsScreenShareActive(false);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        toast.success("Cámara activada para visión multimodal en vivo 📷");
      } catch (err) {
        console.error("Camera access error:", err);
        toast.error("No se pudo acceder a la cámara. Verifica los permisos.");
      }
    }
  };

  const switchCameraFacing = async () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextFacing },
          audio: false
        });
        videoStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Could not switch camera facing:", err);
      }
    }
  };

  // Screen Share Management
  const toggleScreenShare = async () => {
    if (isScreenShareActive) {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
        videoStreamRef.current = null;
      }
      setIsScreenShareActive(false);
      setSnapshotPreview(null);
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          toast.error("Compartir pantalla no está soportado en este dispositivo");
          return;
        }
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach(t => t.stop());
        }
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        videoStreamRef.current = stream;
        setIsScreenShareActive(true);
        setIsCameraActive(false);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenShareActive(false);
        };
        toast.success("Pantalla compartida en vivo 🖥️");
      } catch (err) {
        console.error("Screen share error:", err);
      }
    }
  };

  // Manual Trigger: User taps the Orb to talk or send immediately
  const handleOrbTap = () => {
    // If AI is speaking, tap interrupts and listens
    if (isSpeakingTtsRef.current || isStreamingAiRef.current) {
      stopAudio();
      isStreamingAiRef.current = false;
      setLiveState("listening");
      toast.info("Interrumpido. Te escucho...");
      return;
    }

    // If user has transcript in progress, submit right now with 0ms delay!
    if (userInterimTranscript || lastRecognizedRef.current) {
      const textToSend = userInterimTranscript || lastRecognizedRef.current;
      setUserInterimTranscript("");
      lastRecognizedRef.current = "";
      handleUserSpoke(textToSend);
      return;
    }

    // If idle, ensure recognition is running
    startRecognition();
    toast.info("Te escucho... habla directamente");
  };

  // Clean exit on modal close
  const handleClose = () => {
    stopAudio();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-2xl text-white select-none animate-in fade-in duration-300">
      {/* ── TOP LIVE BAR ─────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 md:px-8 md:py-4 flex items-center justify-between border-b border-white/10 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 border-2 border-white/20 shadow-[0_0_20px_rgba(0,229,255,0.4)] flex items-center justify-center text-lg shrink-0">
            {activePersona?.avatar_emoji && activePersona.avatar_emoji !== "🤖" ? (
              activePersona.avatar_emoji
            ) : (
              <TabeAIIcon size={26} animate={liveState === "thinking"} withGlow={true} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-sm md:text-base uppercase tracking-wider text-white">
                {activePersona?.name || "TABE IA"} Live
              </h2>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Voz Natural Humana
              </div>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide truncate max-w-[220px] sm:max-w-xs">
              {currentVoiceName} · &lt;250ms
            </p>
          </div>
        </div>

        {/* Action Controls Top Right */}
        <div className="flex items-center gap-2">
          {/* Accent / Voice Dialect Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 text-xs">
            <button
              onClick={() => { setVoiceLang("es-AR"); toast.success("Voz Natural Rioplatense (Argentina)"); }}
              className={cn("px-2 py-1 rounded-lg font-bold text-[11px] transition-all", voiceLang === "es-AR" ? "bg-cyan-500 text-black font-black" : "text-slate-400 hover:text-white")}
              title="Acento Rioplatense"
            >
              🇦🇷 AR
            </button>
            <button
              onClick={() => { setVoiceLang("es-MX"); toast.success("Voz Natural Latino (México)"); }}
              className={cn("px-2 py-1 rounded-lg font-bold text-[11px] transition-all", voiceLang === "es-MX" ? "bg-cyan-500 text-black font-black" : "text-slate-400 hover:text-white")}
              title="Acento Latino"
            >
              🇲🇽 MX
            </button>
            <button
              onClick={() => { setVoiceLang("es-ES"); toast.success("Voz Natural Castellano (España)"); }}
              className={cn("px-2 py-1 rounded-lg font-bold text-[11px] transition-all", voiceLang === "es-ES" ? "bg-cyan-500 text-black font-black" : "text-slate-400 hover:text-white")}
              title="Acento España"
            >
              🇪🇸 ES
            </button>
          </div>

          <button
            onClick={() => setShowFullTranscript(prev => !prev)}
            className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
            title="Ver transcripción completa"
          >
            {showFullTranscript ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Historial</span>
          </button>

          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-xl border-2 border-white/20 bg-white/10 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
            title="Salir del Modo Live"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* ── FULL TRANSCRIPT OVERLAY DRAWER ────────────────────── */}
      {showFullTranscript && (
        <div className="absolute top-[65px] inset-x-0 bottom-[100px] z-30 bg-slate-950/95 p-4 md:p-8 overflow-y-auto border-b border-white/10 animate-in slide-in-from-top-4 duration-300">
          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              Transcripción de la Conversación en Vivo
            </h3>
            {transcriptHistory.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-8 text-center">
                Comienza a hablar para ver la transcripción en tiempo real...
              </p>
            ) : (
              transcriptHistory.map((turn, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-4 rounded-2xl border text-sm",
                    turn.role === "user"
                      ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-100 ml-8"
                      : "bg-slate-900/70 border-white/10 text-slate-200 mr-8"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1 text-[10px] font-black uppercase tracking-wider opacity-70">
                    {turn.role === "user" ? "Tú (Voz)" : activePersona.name}
                  </div>
                  {turn.imagePreview && (
                    <img
                      src={turn.imagePreview}
                      alt="Captura multimodal"
                      className="w-40 h-28 object-cover rounded-xl border border-white/20 mb-2"
                    />
                  )}
                  <p className="font-medium leading-relaxed">{turn.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── MAIN LIVE STAGE ───────────────────────────────────── */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-4 overflow-hidden">
        {/* Multimodal Video Preview (Camera or Screen share PiP) */}
        <div
          className={cn(
            "transition-all duration-500 rounded-3xl overflow-hidden border-2 border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.8)] relative bg-black",
            isCameraActive || isScreenShareActive
              ? "w-72 h-44 sm:w-96 sm:h-56 mb-4 opacity-100 scale-100"
              : "w-0 h-0 opacity-0 scale-90 pointer-events-none mb-0 border-0"
          )}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Multimodal active tag */}
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            {isCameraActive ? "Visión de Cámara" : "Pantalla Compartida"}
          </div>

          {/* Switch front/rear camera */}
          {isCameraActive && (
            <button
              onClick={switchCameraFacing}
              className="absolute top-2 right-2 p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white transition-all"
              title="Cambiar cámara (Frontal/Trasera)"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}

          {/* Snapshot Flash Overlay */}
          {flashSnapshot && (
            <div className="absolute inset-0 bg-white animate-out fade-out duration-300" />
          )}
        </div>

        {/* ── THE INTERACTIVE LIVE ORB (Click to talk / send / interrupt) ──────────────── */}
        <div
          onClick={handleOrbTap}
          className="relative flex items-center justify-center my-auto cursor-pointer group select-none"
          title="Toca para enviar tu voz o interrumpir"
        >
          {/* Layer 3: Outer pulsating ambient glow */}
          <div
            className={cn(
              "absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl transition-all duration-300 pointer-events-none opacity-60",
              liveState === "listening" && (isUserTalking ? "bg-gradient-to-tr from-cyan-400 via-sky-400 to-blue-500 scale-110 opacity-80" : "bg-gradient-to-tr from-cyan-500/50 via-sky-500/30 to-blue-600/50"),
              liveState === "thinking" && "bg-gradient-to-tr from-purple-600/60 via-amber-500/40 to-pink-600/50 animate-pulse",
              liveState === "speaking" && "bg-gradient-to-tr from-emerald-500/60 via-teal-400/40 to-cyan-400/50",
              isMicMuted && "bg-rose-500/20"
            )}
            style={{
              transform: `scale(${1 + audioLevel * 0.4})`,
            }}
          />

          {/* Layer 2: Harmonic waveform rings */}
          <div
            className={cn(
              "absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border-2 transition-all duration-200",
              liveState === "listening" && (isUserTalking ? "border-cyan-300 shadow-[0_0_50px_rgba(0,229,255,0.7)]" : "border-cyan-400/40 shadow-[0_0_40px_rgba(0,229,255,0.4)]"),
              liveState === "thinking" && "border-amber-400/40 animate-spin shadow-[0_0_40px_rgba(251,191,36,0.3)]",
              liveState === "speaking" && "border-emerald-400/50 shadow-[0_0_50px_rgba(52,211,153,0.5)]",
              isMicMuted && "border-white/10"
            )}
            style={{
              transform: `scale(${1 + audioLevel * 0.3})`,
            }}
          />

          {/* Layer 1: Core dynamic sphere */}
          <div
            className={cn(
              "relative w-40 h-40 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center transition-all duration-150 shadow-2xl border-4 group-hover:scale-105 active:scale-95",
              liveState === "listening" && (isUserTalking
                ? "bg-gradient-to-tr from-cyan-300 via-sky-400 to-blue-500 border-white shadow-[0_0_70px_rgba(0,229,255,0.8)]"
                : "bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 border-white/60 shadow-[0_0_60px_rgba(0,229,255,0.6)]"),
              liveState === "thinking" && "bg-gradient-to-tr from-purple-700 via-pink-600 to-amber-500 border-amber-300/70 shadow-[0_0_60px_rgba(236,72,153,0.6)] animate-pulse",
              liveState === "speaking" && "bg-gradient-to-tr from-emerald-400 via-teal-500 to-cyan-400 border-white/70 shadow-[0_0_60px_rgba(52,211,153,0.7)]",
              isMicMuted && "bg-slate-800 border-rose-500/40"
            )}
            style={{
              transform: `scale(${1 + (isUserTalking ? 0.08 : liveState === "speaking" ? 0.06 : 0)})`,
            }}
          >
            {/* Center icon / visual state */}
            {liveState === "listening" && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1">
                  {[35, 70, 95, 60, 90, 40].map((h, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "w-1.5 rounded-full transition-all duration-75",
                        isUserTalking ? "bg-white" : "bg-white/80"
                      )}
                      style={{
                        height: `${Math.max(12, h * (audioLevel * 0.9 + 0.2))}px`,
                      }}
                    />
                  ))}
                </div>
                {isUserTalking && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-black bg-white px-2 py-0.5 rounded-full shadow-md animate-bounce">
                    Escuchándote...
                  </span>
                )}
              </div>
            )}
            {liveState === "thinking" && (
              <div className="flex flex-col items-center gap-1.5">
                <Sparkles className="w-10 h-10 text-white animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-200">
                  Pensando...
                </span>
              </div>
            )}
            {liveState === "speaking" && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {[60, 95, 45, 100, 70, 85, 40].map((h, idx) => (
                    <span
                      key={idx}
                      className="w-1.5 bg-white rounded-full animate-pulse"
                      style={{
                        height: `${Math.max(16, h * 0.65)}px`,
                        animationDelay: `${idx * 120}ms`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-black bg-emerald-300 px-2 py-0.5 rounded-full shadow-md">
                  Hablando
                </span>
              </div>
            )}
            {isMicMuted && (
              <MicOff className="w-10 h-10 text-rose-400" />
            )}
          </div>
        </div>

        {/* ── STATE BADGE & REAL-TIME SUBTITLE ────────────────── */}
        <div className="mt-8 max-w-xl text-center px-4 z-10 space-y-3">
          {/* Status Label */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md shadow-lg">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                liveState === "listening" && (isUserTalking ? "bg-cyan-300 animate-ping" : "bg-cyan-400"),
                liveState === "thinking" && "bg-amber-400 animate-pulse",
                liveState === "speaking" && "bg-emerald-400 animate-ping",
                isMicMuted && "bg-rose-500"
              )}
            />
            <span className="text-xs font-black uppercase tracking-widest text-slate-200">
              {isMicMuted
                ? "Micrófono en Pausa"
                : liveState === "listening"
                ? (isUserTalking ? "Detectando tu voz..." : "Escuchando... Habla libremente")
                : liveState === "thinking"
                ? "Pensando respuesta instantánea..."
                : "Hablando... (Toca o habla para interrumpir)"}
            </span>
          </div>

          {/* Subtitle / Realtime Speech Display */}
          <div className="min-h-[52px] flex items-center justify-center">
            {userInterimTranscript ? (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
                <p className="text-base sm:text-lg font-bold text-cyan-200 bg-cyan-950/70 border-2 border-cyan-400/50 px-4 py-2 rounded-2xl backdrop-blur-md shadow-lg shadow-cyan-950/50">
                  "{userInterimTranscript}"
                </p>
                {/* Instant Send Button: 0ms delay */}
                <button
                  onClick={() => {
                    if (userInterimTranscript) {
                      const text = userInterimTranscript;
                      setUserInterimTranscript("");
                      handleUserSpoke(text);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-400/30"
                  title="Responder ahora sin esperar"
                >
                  <Zap className="w-4 h-4 fill-black stroke-none" />
                  <span className="hidden sm:inline">Enviar ya</span>
                </button>
              </div>
            ) : currentAiSpeechText && liveState === "speaking" ? (
              <p className="text-sm sm:text-base font-semibold text-slate-200 max-w-lg leading-relaxed px-4 py-2 bg-black/40 rounded-2xl border border-white/10 backdrop-blur-md animate-in fade-in">
                {currentAiSpeechText}
              </p>
            ) : (
              <p className="text-xs sm:text-sm font-bold text-slate-400 tracking-wide">
                Respuestas concisas y directas en voz humana natural. Puedes hablar sin tocar botones.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── FLOATING LIVE CONTROLS BAR ───────────────────────── */}
      <div className="shrink-0 p-4 md:p-6 flex items-center justify-center gap-3 md:gap-4 border-t border-white/10 bg-slate-950/80 backdrop-blur-xl z-20">
        {/* Mic Mute / Unmute */}
        <button
          onClick={() => {
            const next = !isMicMuted;
            setIsMicMuted(next);
            if (next) {
              setLiveState("idle");
              if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (_) {}
              }
              toast.info("Micrófono silenciado");
            } else {
              setLiveState("listening");
              startRecognition();
              toast.success("Micrófono activado");
            }
          }}
          className={cn(
            "w-12 h-12 md:w-14 md:h-14 rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95",
            isMicMuted
              ? "bg-rose-600/90 border-rose-400 text-white shadow-rose-600/30"
              : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
          )}
          title={isMicMuted ? "Activar micrófono" : "Silenciar micrófono"}
        >
          {isMicMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
        </button>

        {/* Camera Multimodal Toggle */}
        <button
          onClick={toggleCamera}
          className={cn(
            "w-12 h-12 md:w-14 md:h-14 rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95",
            isCameraActive
              ? "bg-cyan-500 border-cyan-300 text-black shadow-cyan-500/40"
              : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
          )}
          title={isCameraActive ? "Desactivar cámara" : "Activar cámara en vivo (Multimodal)"}
        >
          {isCameraActive ? <Video className="w-5 h-5 md:w-6 md:h-6" /> : <VideoOff className="w-5 h-5 md:w-6 md:h-6" />}
        </button>

        {/* Screen Share Multimodal Toggle */}
        <button
          onClick={toggleScreenShare}
          className={cn(
            "w-12 h-12 md:w-14 md:h-14 rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95",
            isScreenShareActive
              ? "bg-amber-400 border-amber-200 text-black shadow-amber-400/40"
              : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
          )}
          title={isScreenShareActive ? "Dejar de compartir pantalla" : "Compartir pantalla con la IA"}
        >
          {isScreenShareActive ? <Monitor className="w-5 h-5 md:w-6 md:h-6" /> : <MonitorOff className="w-5 h-5 md:w-6 md:h-6" />}
        </button>

        {/* Sound / Speaker Mute Toggle */}
        <button
          onClick={() => {
            const next = !isSoundMuted;
            setIsSoundMuted(next);
            if (next) stopAudio();
            toast.info(next ? "Voz de la IA silenciada" : "Voz de la IA activada");
          }}
          className={cn(
            "w-12 h-12 md:w-14 md:h-14 rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95",
            isSoundMuted
              ? "bg-amber-600/90 border-amber-400 text-white"
              : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
          )}
          title={isSoundMuted ? "Activar audio de la IA" : "Silenciar voz de la IA"}
        >
          {isSoundMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
        </button>

        {/* End Live Session Button */}
        <button
          onClick={handleClose}
          className="px-5 md:px-6 h-12 md:h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white border-2 border-red-400 font-black text-xs md:text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer active:scale-95 ml-2"
        >
          <X className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
          <span>Finalizar</span>
        </button>
      </div>
    </div>
  );
}
