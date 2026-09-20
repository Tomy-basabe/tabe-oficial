import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Mic, MicOff, Video, VideoOff, SwitchCamera, Monitor, MonitorOff,
  Volume2, VolumeX, Sparkles, Radio, RotateCcw, Camera, ShieldAlert,
  ChevronDown, ChevronUp, Maximize2, Minimize2
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

// Clean text for speech synthesis (strip markdown, links, LaTeX markers)
function cleanTextForSpeech(text: string): string {
  if (!text) return "";
  let cleaned = text;
  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " Bloque de código omitido para lectura. ");
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
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 1 for visualizer
  const [userInterimTranscript, setUserInterimTranscript] = useState("");
  const [currentAiSpeechText, setCurrentAiSpeechText] = useState("");
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{ role: "user" | "assistant"; text: string; imagePreview?: string }>>([]);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  // Multimodal state (Camera & Screen Share)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScreenShareActive, setIsScreenShareActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [flashSnapshot, setFlashSnapshot] = useState(false);
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null);

  // References
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingTtsRef = useRef(false);
  const isStreamingAiRef = useRef(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sentenceBufferRef = useRef("");
  const accumulatedAiResponseRef = useRef("");
  const lastRecognizedRef = useRef("");
  const isComponentActiveRef = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Pick natural Spanish voice
  const initSpanishVoice = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    // Prioritize natural or Latin-American/Argentine Spanish
    const best =
      voices.find(v => v.lang.startsWith("es-AR") || v.lang.startsWith("es-419")) ||
      voices.find(v => v.lang.startsWith("es") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Sabina") || v.name.includes("Paulina") || v.name.includes("Elena"))) ||
      voices.find(v => v.lang.startsWith("es"));
    voiceRef.current = best || null;
  }, []);

  useEffect(() => {
    initSpanishVoice();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = initSpanishVoice;
    }
  }, [initSpanishVoice]);

  // TTS helper: cancels any current speech immediately (used for Barge-In)
  const stopTts = useCallback(() => {
    speechQueueRef.current = [];
    isSpeakingTtsRef.current = false;
    sentenceBufferRef.current = "";
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // TTS play next in queue
  const playNextSentence = useCallback(() => {
    if (isSoundMuted || speechQueueRef.current.length === 0) {
      isSpeakingTtsRef.current = false;
      if (!isStreamingAiRef.current) {
        setLiveState("listening");
      }
      return;
    }

    isSpeakingTtsRef.current = true;
    setLiveState("speaking");
    const sentence = speechQueueRef.current.shift()!;
    const cleaned = cleanTextForSpeech(sentence);
    if (!cleaned) {
      playNextSentence();
      return;
    }

    setCurrentAiSpeechText(cleaned);

    const utterance = new SpeechSynthesisUtterance(cleaned);
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.lang = voiceRef.current?.lang || "es-ES";
    utterance.rate = 1.06;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      activeUtteranceRef.current = null;
      playNextSentence();
    };
    utterance.onerror = () => {
      activeUtteranceRef.current = null;
      playNextSentence();
    };

    activeUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSoundMuted]);

  // Enqueue sentence for streaming speech
  const queueSentenceToSpeak = useCallback((text: string) => {
    if (isSoundMuted) return;
    speechQueueRef.current.push(text);
    if (!isSpeakingTtsRef.current) {
      playNextSentence();
    }
  }, [isSoundMuted, playNextSentence]);

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

    setUserInterimTranscript("");
    setLiveState("thinking");
    isStreamingAiRef.current = true;
    accumulatedAiResponseRef.current = "";
    sentenceBufferRef.current = "";
    stopTts();

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
      .slice(-6)
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
      await streamMessage(
        recentMsgs,
        activePersona.id,
        // onDelta
        (delta: string) => {
          accumulatedAiResponseRef.current += delta;
          sentenceBufferRef.current += delta;

          // Check if we have a full sentence to speak with low latency
          const match = sentenceBufferRef.current.match(/^([\s\S]+?([.!?\n]+|\:\s))(\s+[\s\S]*)$/);
          if (match && match[1].length >= 15) {
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

          if (!isSpeakingTtsRef.current) {
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
        powerLevel,
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
    powerLevel,
    stopTts
  ]);

  // Voice Activity & Speech Recognition Setup (continuous hands-free)
  useEffect(() => {
    if (!isOpen) return;
    isComponentActiveRef.current = true;

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Tu navegador no soporta reconocimiento de voz continuo en tiempo real");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "es-AR";
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

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
      // If user speaks while AI is talking or thinking, immediately cut off AI speech and listen!
      if (currentChunk.length > 1 && (isSpeakingTtsRef.current || isStreamingAiRef.current)) {
        stopTts();
        isStreamingAiRef.current = false;
        setLiveState("listening");
      }

      if (interim) {
        setUserInterimTranscript(interim);
        setLiveState("listening");
      }

      // Reset debounce silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      if (final.trim()) {
        lastRecognizedRef.current = final.trim();
        // Wait 1.1s of silence after final result before submitting to AI
        silenceTimerRef.current = setTimeout(() => {
          if (lastRecognizedRef.current && isComponentActiveRef.current) {
            const query = lastRecognizedRef.current;
            lastRecognizedRef.current = "";
            handleUserSpoke(query);
          }
        }, 1100);
      } else if (interim.trim().length > 3) {
        lastRecognizedRef.current = interim.trim();
        // If user pauses for 1.4s on interim without explicit final, auto submit
        silenceTimerRef.current = setTimeout(() => {
          if (lastRecognizedRef.current && isComponentActiveRef.current && !isStreamingAiRef.current) {
            const query = lastRecognizedRef.current;
            lastRecognizedRef.current = "";
            handleUserSpoke(query);
          }
        }, 1400);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") return;
      if (event.error === "audio-capture") {
        toast.error("No se detectó entrada de micrófono");
      }
    };

    recognition.onend = () => {
      // Auto-restart continuous recognition while modal is open and mic isn't muted
      if (isComponentActiveRef.current && !isMicMuted) {
        try {
          recognition.start();
        } catch (_) {}
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn("Could not start SpeechRecognition:", e);
    }

    return () => {
      isComponentActiveRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognition.stop();
      } catch (_) {}
    };
  }, [isOpen, isMicMuted, handleUserSpoke, stopTts]);

  // AudioContext Volume Meter for the Glowing Orb
  useEffect(() => {
    if (!isOpen) return;

    let localAudioCtx: AudioContext | null = null;
    let localStream: MediaStream | null = null;

    const startAudioMeter = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream = stream;
        micStreamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        localAudioCtx = new AudioCtx();
        audioContextRef.current = localAudioCtx;

        const source = localAudioCtx.createMediaStreamSource(stream);
        const analyser = localAudioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateMeter = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(1, Math.max(0, avg / 128));
          setAudioLevel(normalized);

          // Barge-In volume spike threshold while AI is speaking
          if (normalized > 0.35 && isSpeakingTtsRef.current) {
            stopTts();
            setLiveState("listening");
          }

          animFrameRef.current = requestAnimationFrame(updateMeter);
        };

        updateMeter();
      } catch (err) {
        console.warn("Audio meter setup error:", err);
      }
    };

    startAudioMeter();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      if (localAudioCtx && localAudioCtx.state !== "closed") {
        localAudioCtx.close().catch(() => {});
      }
    };
  }, [isOpen, stopTts]);

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
          toast.error("Compartir pantalla no está soportado en este dispositivo/navegador");
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

  // Clean exit on modal close
  const handleClose = () => {
    stopTts();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
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
                {activePersona?.name || "TABE IA"} Live Voice
              </h2>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live
              </div>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              {selectedModel.shortName} · Full-Duplex Multimodal
            </p>
          </div>
        </div>

        {/* Action Controls Top Right */}
        <div className="flex items-center gap-2">
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

        {/* ── THE INTERACTIVE LIVE ORB ────────────────────────── */}
        <div className="relative flex items-center justify-center my-auto">
          {/* Layer 3: Outer pulsating ambient glow */}
          <div
            className={cn(
              "absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl transition-all duration-700 pointer-events-none opacity-60",
              liveState === "listening" && "bg-gradient-to-tr from-cyan-500/50 via-sky-500/30 to-blue-600/50",
              liveState === "thinking" && "bg-gradient-to-tr from-purple-600/60 via-amber-500/40 to-pink-600/50 animate-pulse",
              liveState === "speaking" && "bg-gradient-to-tr from-emerald-500/60 via-teal-400/40 to-cyan-400/50",
              isMicMuted && "bg-rose-500/20"
            )}
            style={{
              transform: `scale(${1 + audioLevel * 0.45})`,
            }}
          />

          {/* Layer 2: Harmonic waveform rings */}
          <div
            className={cn(
              "absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border-2 transition-all duration-300",
              liveState === "listening" && "border-cyan-400/40 shadow-[0_0_40px_rgba(0,229,255,0.4)]",
              liveState === "thinking" && "border-amber-400/40 animate-spin shadow-[0_0_40px_rgba(251,191,36,0.3)]",
              liveState === "speaking" && "border-emerald-400/50 shadow-[0_0_50px_rgba(52,211,153,0.5)]",
              isMicMuted && "border-white/10"
            )}
            style={{
              transform: `scale(${1 + audioLevel * 0.35})`,
            }}
          />

          {/* Layer 1: Core dynamic sphere */}
          <div
            className={cn(
              "relative w-40 h-40 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-2xl border-4",
              liveState === "listening" && "bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 border-white/50 shadow-[0_0_60px_rgba(0,229,255,0.6)]",
              liveState === "thinking" && "bg-gradient-to-tr from-purple-700 via-pink-600 to-amber-500 border-amber-300/60 shadow-[0_0_60px_rgba(236,72,153,0.6)] animate-pulse",
              liveState === "speaking" && "bg-gradient-to-tr from-emerald-400 via-teal-500 to-cyan-400 border-white/60 shadow-[0_0_60px_rgba(52,211,153,0.7)]",
              isMicMuted && "bg-slate-800 border-rose-500/40"
            )}
            style={{
              transform: `scale(${1 + (liveState === "listening" ? audioLevel * 0.25 : liveState === "speaking" ? 0.08 : 0)})`,
            }}
          >
            {/* Center icon / visual state */}
            {liveState === "listening" && (
              <div className="flex items-center gap-1">
                {[40, 75, 100, 60, 90, 45].map((h, idx) => (
                  <span
                    key={idx}
                    className="w-1.5 bg-white rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(10, h * (audioLevel * 0.9 + 0.25))}px`,
                    }}
                  />
                ))}
              </div>
            )}
            {liveState === "thinking" && (
              <div className="flex flex-col items-center gap-1.5 animate-bounce">
                <Sparkles className="w-10 h-10 text-white animate-spin" />
              </div>
            )}
            {liveState === "speaking" && (
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
                liveState === "listening" && "bg-cyan-400 animate-ping",
                liveState === "thinking" && "bg-amber-400 animate-pulse",
                liveState === "speaking" && "bg-emerald-400 animate-ping",
                isMicMuted && "bg-rose-500"
              )}
            />
            <span className="text-xs font-black uppercase tracking-widest text-slate-200">
              {isMicMuted
                ? "Micrófono en Pausa"
                : liveState === "listening"
                ? "Escuchando... (Habla libremente)"
                : liveState === "thinking"
                ? "Pensando respuesta..."
                : "Hablando... (Interrumpe cuando quieras)"}
            </span>
          </div>

          {/* Subtitle / Realtime Speech Display */}
          <div className="min-h-[48px] flex items-center justify-center">
            {userInterimTranscript ? (
              <p className="text-base sm:text-lg font-bold text-cyan-200 bg-cyan-950/60 border border-cyan-500/30 px-4 py-2 rounded-2xl backdrop-blur-md animate-in fade-in">
                "{userInterimTranscript}"
              </p>
            ) : currentAiSpeechText && liveState === "speaking" ? (
              <p className="text-sm sm:text-base font-semibold text-slate-200 max-w-lg leading-relaxed line-clamp-2 px-4 py-1.5 bg-black/40 rounded-2xl border border-white/10 backdrop-blur-md">
                {currentAiSpeechText}
              </p>
            ) : (
              <p className="text-xs sm:text-sm font-bold text-slate-400 tracking-wide">
                Podes hablar fluidamente en tiempo real o apuntar tu cámara a apuntes o ejercicios.
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
              toast.info("Micrófono silenciado");
            } else {
              setLiveState("listening");
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
            if (next) stopTts();
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
