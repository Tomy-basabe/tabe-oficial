import React, { useState, useEffect, useRef } from "react";
import {
  RoadmapLevel,
  LevelStudyPack,
  LevelQuizQuestion,
  OralExamQuestion,
  OralAnswerEvaluation,
  StudyPreference,
} from "@/types/studyRoadmap";
import { generateLevelStudyPack, evaluateOralAnswer } from "@/services/studyRoadmapService";
import { getLevelWorkload } from "@/lib/roadmapHeuristics";
import { ComicConfetti } from "./ComicConfetti";
import { IsoCubesLoader } from "./IsoCubesLoader";
import { MermaidRenderer } from "./MermaidRenderer";
import { EmojiPng } from "@/components/common/EmojiPng";
import {
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Volume2,
  VolumeX,
  FileText,
  Clock,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Layers,
  Target,
  Sparkles,
  Check,
  RefreshCw,
  ShieldAlert,
  Radio,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Mic,
  MicOff,
  Award,
  Send,
  MessageSquare,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LevelStudyModalProps {
  level: RoadmapLevel | null;
  roadmapId?: string;
  subjectName: string;
  targetMastery?: number;
  eventLabel?: string;
  studyPreference?: StudyPreference;
  isOpen: boolean;
  onClose: () => void;
  onLevelComplete: (levelNumber: number, scorePercent?: number) => void;
}

// ── HELPER DE LIMPIEZA DE TEXTO PARA LOCUCIÓN HUMANA FLUIDA ──
function cleanTextForNaturalSpeech(text: string): string {
  if (!text) return "";
  let clean = text;

  // 1. Eliminar bloques de código y markdown
  clean = clean.replace(/```[\s\S]*?```/g, "");
  clean = clean.replace(/`([^`]+)`/g, "$1");
  clean = clean.replace(/#{1,6}\s+/g, "");
  clean = clean.replace(/\*\*([^*]+)\*\*/g, "$1");
  clean = clean.replace(/\*([^*]+)\*/g, "$1");
  clean = clean.replace(/__([^_]+)__/g, "$1");
  clean = clean.replace(/_([^_]+)_/g, "$1");
  clean = clean.replace(/~~([^~]+)~~/g, "$1");

  // 2. Eliminar viñetas, guiones y comillas que traban la prosodia
  clean = clean.replace(/^[\*\-\+•▸→«»"“”]\s+/gm, "");
  clean = clean.replace(/[•▸→«»]/g, "");

  // 3. Eliminar emojis
  clean = clean.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");

  // 4. Reemplazar abreviaturas y símbolos técnicos por dicción hablada natural
  clean = clean.replace(/\bp\.?\s*ej\.?\b/gi, "por ejemplo");
  clean = clean.replace(/\bej\.?\b/gi, "por ejemplo");
  clean = clean.replace(/\betc\.?\b/gi, "etcétera");
  clean = clean.replace(/\bvs\.?\b/gi, "versus");
  clean = clean.replace(/\bn[°º]\s*/gi, "número ");
  clean = clean.replace(/%/g, " por ciento ");
  clean = clean.replace(/\+/g, " más ");
  clean = clean.replace(/&/g, " y ");
  clean = clean.replace(/\//g, " o ");
  clean = clean.replace(/\s*=\s*/g, " es igual a ");

  // 5. Suavizar pausas para respiración natural
  clean = clean.replace(/\.{2,}/g, ".");
  clean = clean.replace(/[:;]\s*/g, ", ");
  clean = clean.replace(/\s+/g, " ");

  return clean.trim();
}

// ── CALIFICADOR DE CALIDAD DE VOZ (PRIORIZA VOCES NEURALES / NATURALES HUMANAS) ──
function rateVoiceQuality(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const lang = (voice.lang || "").toLowerCase();

  // Filtrar voces SAPI5 robóticas y mecánicas heredadas
  const isDesktopRobotic =
    name.includes("desktop") ||
    name.includes("espeak") ||
    name.includes("sapi") ||
    name.includes("sam") ||
    name.includes("helena desktop") ||
    name.includes("sabina desktop") ||
    name.includes("raul desktop") ||
    name.includes("laura desktop");

  if (isDesktopRobotic) return 5;

  let score = 20;

  // Idioma español
  if (lang.startsWith("es")) {
    score += 40;
    if (lang.includes("ar") || lang.includes("419") || lang.includes("mx") || lang.includes("us")) {
      score += 15;
    }
  }

  // Voces neuronales de alta fidelidad humana
  if (name.includes("online (natural)") || name.includes("natural")) {
    score += 100;
  } else if (name.includes("neural") || name.includes("multilingual")) {
    score += 85;
  } else if (name.includes("google")) {
    score += 70;
  } else if (name.includes("siri") || name.includes("premium")) {
    score += 65;
  }

  // Servicios remotos en la nube
  if (voice.localService === false) {
    score += 25;
  }

  return score;
}

function renderFormattedGuideContent(content: string) {
  if (!content) return null;
  const mermaidRegex = /(?:\[DIAGRAMA CONCEPTUAL MERMAID\]:\s*)?```mermaid\s*([\s\S]*?)```/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mermaidRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      parts.push(
        <div key={`text-${lastIndex}`} className="whitespace-pre-line leading-relaxed font-medium">
          {textBefore.trim()}
        </div>
      );
    }

    const mermaidCode = match[1].trim();
    parts.push(
      <MermaidRenderer
        key={`mermaid-${match.index}`}
        code={mermaidCode}
        title="Diagrama Conceptual de Examen (Mermaid)"
      />
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText.trim()) {
    parts.push(
      <div key="text-end" className="whitespace-pre-line leading-relaxed font-medium">
        {remainingText.trim()}
      </div>
    );
  }

  if (parts.length > 0) {
    return <div className="space-y-3">{parts}</div>;
  }

  return <div className="whitespace-pre-line leading-relaxed font-medium">{content}</div>;
}

type MainTab = "guia" | "podcast" | "flashcards" | "cuestionario" | "oral";

export const LevelStudyModal: React.FC<LevelStudyModalProps> = ({
  level,
  roadmapId,
  subjectName,
  targetMastery = 80,
  eventLabel,
  studyPreference = "practicar",
  isOpen,
  onClose,
  onLevelComplete,
}) => {
  const [pack, setPack] = useState<LevelStudyPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTab>("guia");

  // ── ESTADO PODCAST Y VOCES ──
  const [podcastPlaying, setPodcastPlaying] = useState(false);
  const [podcastSpeed, setPodcastSpeed] = useState<number>(1.25);
  const [podcastChapterIdx, setPodcastChapterIdx] = useState(0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const keepAliveTimerRef = useRef<any>(null);

  // ── ESTADO FLASHCARDS ──
  const [cardIndex, setCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Set<number>>(new Set());

  // ── ESTADO CUESTIONARIO ESCRITO ──
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState<
    Array<{ question: LevelQuizQuestion; chosen: number }>
  >([]);
  const [isWrittenFinished, setIsWrittenFinished] = useState(false);

  // ── ESTADO EXAMEN ORAL CON IA ──
  const [oralIndex, setOralIndex] = useState(0);
  const [oralTranscript, setOralTranscript] = useState("");
  const [isRecordingOral, setIsRecordingOral] = useState(false);
  const [evaluatingOral, setEvaluatingOral] = useState(false);
  const [oralEvaluations, setOralEvaluations] = useState<OralAnswerEvaluation[]>([]);
  const [currentOralEval, setCurrentOralEval] = useState<OralAnswerEvaluation | null>(null);
  const [isOralFinished, setIsOralFinished] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  // ── ESTADO GUÍA Y CONFETI ──
  const [showRawExcerpt, setShowRawExcerpt] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const workload = getLevelWorkload(targetMastery);

  // Watchdog keep-alive para que Chrome no congele el sintetizador de voz en textos largos
  const startKeepAlive = () => {
    stopKeepAlive();
    keepAliveTimerRef.current = setInterval(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  };

  const stopKeepAlive = () => {
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }
  };

  // Cargar voces en el navegador con selección de la voz más humana disponible
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      const spanishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("es"));
      const pool = spanishVoices.length > 0 ? spanishVoices : voices;
      const sorted = [...pool].sort((a, b) => rateVoiceQuality(b) - rateVoiceQuality(a));
      setAvailableVoices(sorted);

      const savedName = localStorage.getItem("tabe_study_voice_name");
      setSelectedVoice((current) => {
        if (savedName) {
          const match = sorted.find((v) => v.name === savedName);
          if (match) return match;
        }
        // Si no hay voz o la actual es de calidad muy baja (robótica desktop), actualizar a la mejor voz natural
        if (!current || rateVoiceQuality(current) < 50) {
          return sorted[0] || null;
        }
        return current;
      });
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      stopKeepAlive();
    };
  }, []);

  const handleSelectVoice = (voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
    try {
      localStorage.setItem("tabe_study_voice_name", voice.name);
    } catch (e) {}
  };

  const testVoice = (voiceToTest?: SpeechSynthesisVoice | null) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    stopKeepAlive();

    const targetVoice = voiceToTest || selectedVoice;
    const phrase = cleanTextForNaturalSpeech(
      "Hola, soy tu evaluador en TABE AI. Tengo una locución humana y pausada para tus repasos y exámenes."
    );
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = "es-AR";
    utterance.rate = 0.96;
    utterance.pitch = 1.0;
    if (targetVoice) utterance.voice = targetVoice;

    startKeepAlive();
    utterance.onend = () => stopKeepAlive();
    utterance.onerror = () => stopKeepAlive();
    window.speechSynthesis.speak(utterance);
  };

  // Detener cualquier audio al salir
  const stopAllSpeech = () => {
    stopKeepAlive();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPodcastPlaying(false);
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecordingOral(false);
  };

  const loadStudyPack = (forceRegenerate = false) => {
    if (!level) return;
    setLoading(true);
    stopAllSpeech();
    setCurrentQIndex(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setScore(0);
    setWrongAnswers([]);
    setIsWrittenFinished(false);
    setCardIndex(0);
    setIsCardFlipped(false);
    setOralIndex(0);
    setOralTranscript("");
    setOralEvaluations([]);
    setCurrentOralEval(null);
    setIsOralFinished(false);
    setShowConfetti(false);

    generateLevelStudyPack(level, subjectName, {
      roadmapId,
      targetMastery,
      eventLabel,
      studyPreference,
      forceRegenerate,
    })
      .then((res) => {
        setPack(res);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!isOpen || !level) {
      stopAllSpeech();
      setPack(null);
      return;
    }

    if (studyPreference === "podcast" || studyPreference === "escuchar") {
      setActiveTab("podcast");
    } else if (studyPreference === "leer") {
      setActiveTab("guia");
    } else {
      setActiveTab("guia");
    }

    setMasteredCards(new Set());
    loadStudyPack(false);

    return () => {
      stopAllSpeech();
    };
  }, [isOpen, level?.level, subjectName]);

  // ── REPRODUCTOR DE PODCAST CON IA (LOCUCIÓN HUMANA NATURAL) ──
  const playPodcastChapter = (chapterIdx: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !pack) return;
    window.speechSynthesis.cancel();
    stopKeepAlive();

    const chapters = pack.podcastScript.chapters;
    let textToNarrate = "";

    if (chapterIdx === 0) {
      textToNarrate = `${pack.podcastScript.introduction}. ${chapters[0]?.heading || ""}. ${chapters[0]?.narration || ""}`;
    } else if (chapterIdx < chapters.length) {
      const c = chapters[chapterIdx];
      textToNarrate = `${c.heading}. ${c.narration}. Punto clave: ${c.keyTakeaway}.`;
    } else {
      textToNarrate = pack.podcastScript.conclusion;
    }

    const cleanSpeech = cleanTextForNaturalSpeech(textToNarrate);
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = "es-AR";
    utterance.rate = Math.max(0.75, Math.min(1.5, podcastSpeed * 0.96));
    utterance.pitch = 1.0;
    if (selectedVoice) utterance.voice = selectedVoice;

    startKeepAlive();
    utterance.onend = () => {
      stopKeepAlive();
      if (chapterIdx + 1 <= chapters.length) {
        setPodcastChapterIdx(chapterIdx + 1);
        playPodcastChapter(chapterIdx + 1);
      } else {
        setPodcastPlaying(false);
      }
    };
    utterance.onerror = () => {
      stopKeepAlive();
      setPodcastPlaying(false);
    };

    setPodcastChapterIdx(chapterIdx);
    setPodcastPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const togglePodcastPlay = () => {
    if (podcastPlaying) {
      window.speechSynthesis.cancel();
      stopKeepAlive();
      setPodcastPlaying(false);
    } else {
      playPodcastChapter(podcastChapterIdx);
    }
  };

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    stopKeepAlive();

    const cleanSpeech = cleanTextForNaturalSpeech(text);
    if (!cleanSpeech) return;

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = "es-AR";
    utterance.rate = 0.96;
    utterance.pitch = 1.0;
    if (selectedVoice) utterance.voice = selectedVoice;

    startKeepAlive();
    utterance.onend = () => stopKeepAlive();
    utterance.onerror = () => stopKeepAlive();
    window.speechSynthesis.speak(utterance);
  };

  // ── SELECTOR DE VOZ NEOBRUTALISTA ──
  const renderVoiceSelector = (variant: "compact" | "card" = "compact") => {
    if (availableVoices.length === 0) return null;
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2.5 p-2.5 rounded-xl border-2 border-foreground bg-card shadow-[2px_2px_0_0_#000] flex-wrap",
          variant === "card" && "bg-muted/40"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Volume2 className="w-4 h-4 text-primary shrink-0" />
          <span className="text-[10px] font-black uppercase text-foreground shrink-0">
            Voz del Profesor (IA):
          </span>
          <select
            value={selectedVoice?.name || ""}
            onChange={(e) => {
              const v = availableVoices.find((x) => x.name === e.target.value);
              if (v) handleSelectVoice(v);
            }}
            className="bg-background text-foreground border border-foreground/40 rounded-lg px-2 py-1 text-xs font-bold max-w-[220px] sm:max-w-xs truncate cursor-pointer focus:outline-none"
          >
            {availableVoices.map((v) => {
              const q = rateVoiceQuality(v);
              const label =
                q >= 80 ? `⭐ ${v.name} (Ultra Humana)` : q >= 60 ? `🌐 ${v.name} (Cloud HD)` : v.name;
              return (
                <option key={v.name} value={v.name}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <button
          type="button"
          onClick={() => testVoice(selectedVoice)}
          className="px-2.5 py-1 rounded-lg border border-foreground bg-[#FFE600] text-black text-[10px] font-black uppercase hover:bg-[#ebd300] cursor-pointer flex items-center gap-1 shadow-[1px_1px_0_0_#000] transition-transform active:scale-95 shrink-0"
          title="Escuchar muestra de esta voz"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Probar Voz</span>
          <EmojiPng emoji="🔊" size="xs" />
        </button>
      </div>
    );
  };

  // ── EXAMEN ORAL CON IA: RECONOCIMIENTO DE VOZ ──
  const toggleOralRecording = () => {
    if (isRecordingOral) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
      }
      setIsRecordingOral(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info("Reconocimiento de voz no soportado por este navegador. Podés escribir tu respuesta oral en el cuadro.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "es-AR";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecordingOral(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + " ";
        }
        setOralTranscript((prev) => (prev ? `${prev} ${transcript}`.trim() : transcript.trim()));
      };

      recognition.onerror = () => {
        setIsRecordingOral(false);
      };

      recognition.onend = () => {
        setIsRecordingOral(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn("Error iniciando reconocimiento:", e);
      setIsRecordingOral(false);
    }
  };

  const handleDeliverOralAnswer = async () => {
    if (!pack || !pack.oralQuestions[oralIndex] || !oralTranscript.trim()) {
      toast.warning("Por favor grabá o escribí tu respuesta antes de entregar.");
      return;
    }

    if (isRecordingOral && speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      setIsRecordingOral(false);
    }

    setEvaluatingOral(true);
    const q = pack.oralQuestions[oralIndex];

    try {
      const evalResult = await evaluateOralAnswer({
        question: q,
        transcript: oralTranscript,
        subjectName,
        targetMastery,
      });

      setCurrentOralEval(evalResult);
      setOralEvaluations((prev) => [...prev, evalResult]);

      // Narrar la devolución oral si el usuario tiene audio activo
      if (evalResult.feedbackOral) {
        speakText(evalResult.feedbackOral);
      }
    } finally {
      setEvaluatingOral(false);
    }
  };

  const handleNextOralQuestion = () => {
    if (!pack) return;
    setCurrentOralEval(null);
    setOralTranscript("");

    if (oralIndex + 1 < pack.oralQuestions.length) {
      const nextIdx = oralIndex + 1;
      setOralIndex(nextIdx);
      // Pronunciar la siguiente pregunta
      const nextQ = pack.oralQuestions[nextIdx];
      if (nextQ) speakText(nextQ.pregunta);
    } else {
      // Examen oral finalizado
      setIsOralFinished(true);
      const totalScore = oralEvaluations.reduce((acc, curr) => acc + curr.puntaje, 0);
      const avgScore = Number((totalScore / Math.max(1, oralEvaluations.length)).toFixed(1));
      const passedOral = avgScore >= 7.0;

      if (passedOral) {
        setShowConfetti(true);
        onLevelComplete(level.level, Math.round(avgScore * 10));
      }
    }
  };

  if (!isOpen || !level) return null;

  const questions = pack?.questions || [];
  const flashcards = pack?.flashcards || [];
  const oralQuestions = pack?.oralQuestions || [];
  const currentQ = questions[currentQIndex];
  const currentCard = flashcards[cardIndex];
  const currentOralQ = oralQuestions[oralIndex];

  // Métricas del cuestionario escrito
  const requiredWrittenCorrect = Math.max(
    1,
    Math.ceil((questions.length * workload.requiredAccuracyPercent) / 100)
  );
  const writtenAccuracy =
    questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const passedWritten = score >= requiredWrittenCorrect;

  // Métricas del examen oral
  const oralAverage =
    oralEvaluations.length > 0
      ? Number(
          (
            oralEvaluations.reduce((a, b) => a + b.puntaje, 0) /
            oralEvaluations.length
          ).toFixed(1)
        )
      : 0;
  const passedOral = oralAverage >= 7.0;

  // Flashcards aprobadas
  const flashcardsMasteredRatio =
    flashcards.length > 0 ? Math.round((masteredCards.size / flashcards.length) * 100) : 0;
  const passedFlashcards = flashcardsMasteredRatio >= 75;

  return (
    <>
      <ComicConfetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl bg-card border-4 border-foreground rounded-2xl shadow-[8px_8px_0_0_hsl(var(--foreground))] overflow-hidden flex flex-col max-h-[94vh]">
          {/* ── HEADER SUPERIOR NEOBRUTALISTA ── */}
          <div className="px-4 sm:px-6 py-3.5 border-b-4 border-foreground bg-[#FFE600] flex items-center justify-between text-black shrink-0 gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-black text-sm border-2 border-black shrink-0 shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]">
                N{level.level}
              </span>
              <div className="min-w-0">
                <h3 className="font-black text-sm sm:text-base uppercase tracking-wider leading-tight truncate">
                  {level.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="font-bold text-[11px] uppercase opacity-85 truncate">
                    {subjectName}
                  </span>
                  {level.estimatedMinutes && (
                    <span className="px-1.5 py-0.5 rounded bg-black/15 text-[10px] font-black uppercase flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {level.estimatedMinutes} min
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded bg-black text-[#FFE600] text-[10px] font-black uppercase">
                    Meta: {targetMastery}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  stopAllSpeech();
                  onClose();
                }}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border-2 border-black flex items-center justify-center text-black font-black transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-[2px_2px_0_0_#000]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── BARRA DE PESTAÑAS (FASE 1: APRENDER | FASE 2: RENDIR) ── */}
          {!loading && pack && (
            <div className="px-4 sm:px-6 py-2.5 bg-muted/60 border-b-2 border-foreground flex items-center justify-between gap-2 overflow-x-auto shrink-0">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Grupo Aprender */}
                <div className="flex items-center gap-1.5 bg-background border-2 border-foreground/40 rounded-xl p-1">
                  <span className="text-[9px] font-black uppercase px-1.5 text-muted-foreground hidden sm:inline">
                    Aprender:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      stopAllSpeech();
                      setActiveTab("guia");
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg border-2 border-foreground text-[11px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer",
                      activeTab === "guia"
                        ? "bg-[#FFE600] text-black shadow-[2px_2px_0_0_#000]"
                        : "bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Guía</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopAllSpeech();
                      setActiveTab("podcast");
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg border-2 border-foreground text-[11px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer",
                      activeTab === "podcast"
                        ? "bg-[#00E5FF] text-black shadow-[2px_2px_0_0_#000]"
                        : "bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Podcast IA</span>
                  </button>
                </div>

                {/* Grupo Rendir */}
                <div className="flex items-center gap-1.5 bg-background border-2 border-foreground/40 rounded-xl p-1">
                  <span className="text-[9px] font-black uppercase px-1.5 text-muted-foreground hidden sm:inline">
                    Rendir:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      stopAllSpeech();
                      setActiveTab("flashcards");
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg border-2 border-foreground text-[11px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer",
                      activeTab === "flashcards"
                        ? "bg-[#FFE600] text-black shadow-[2px_2px_0_0_#000]"
                        : "bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Flashcards</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopAllSpeech();
                      setActiveTab("cuestionario");
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg border-2 border-foreground text-[11px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer",
                      activeTab === "cuestionario"
                        ? "bg-[#BFFF00] text-black shadow-[2px_2px_0_0_#000]"
                        : "bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Cuestionario</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopAllSpeech();
                      setActiveTab("oral");
                      if (pack.oralQuestions[oralIndex]) {
                        speakText(pack.oralQuestions[oralIndex].pregunta);
                      }
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg border-2 border-foreground text-[11px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer",
                      activeTab === "oral"
                        ? "bg-[#FF3366] text-white shadow-[2px_2px_0_0_#000]"
                        : "bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Examen Oral</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadStudyPack(true)}
                className="px-2 py-1 rounded-lg border-2 border-foreground bg-card hover:bg-muted text-[10px] font-black uppercase flex items-center gap-1 shrink-0 cursor-pointer"
                title="Regenerar contenido con IA"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden md:inline">Regenerar</span>
              </button>
            </div>
          )}

          {/* ── CONTENIDO PRINCIPAL ── */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
            {loading ? (
              <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                <IsoCubesLoader
                  compact
                  title="Construyendo Módulo con Podcast y Examen Oral..."
                  subtitle={`Generando podcast con voz en tiempo real, flashcards y mesa de examen para "${level.title}"`}
                />
              </div>
            ) : activeTab === "guia" && pack ? (
              /* ──────────────── TAB 1: GUÍA TEÓRICA ──────────────── */
              <div className="space-y-4">
                <div className="p-4 bg-muted/60 border-2 border-foreground rounded-2xl shadow-[3px_3px_0_0_hsl(var(--foreground))] space-y-3">
                  <span className="text-[10px] font-black uppercase text-primary tracking-wider block">
                    Objetivo Académico del Nivel {level.level}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-foreground leading-relaxed">
                    {pack.studyGuide.overview}
                  </p>

                  {level.keyTopics && level.keyTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {level.keyTopics.map((topic, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-lg bg-[#FFE600] text-black border-2 border-foreground text-[11px] font-black shadow-[1.5px_1.5px_0_0_#000]"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Secciones teóricas */}
                <div className="space-y-3.5">
                  {pack.studyGuide.sections.map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-card border-2 border-foreground rounded-2xl shadow-[3px_3px_0_0_hsl(var(--foreground))] space-y-2.5"
                    >
                      <h4 className="font-black text-sm sm:text-base uppercase text-foreground flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-black shrink-0">
                          {idx + 1}
                        </span>
                        <span>{sec.heading}</span>
                      </h4>

                      <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium pl-1">
                        {renderFormattedGuideContent(sec.content)}
                      </div>

                      {sec.keyPoints && sec.keyPoints.length > 0 && (
                        <div className="p-3 rounded-xl bg-muted/70 border border-foreground/30 space-y-1.5 mt-2">
                          <span className="text-[10px] font-black uppercase text-primary block">
                            📌 Puntos Clave:
                          </span>
                          <ul className="space-y-1">
                            {sec.keyPoints.map((kp, kIdx) => (
                              <li key={kIdx} className="text-xs font-bold text-foreground flex items-start gap-1.5">
                                <span className="text-primary font-black">•</span>
                                <span>{kp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Claves de examen */}
                {pack.studyGuide.examTips && pack.studyGuide.examTips.length > 0 && (
                  <div className="p-4 bg-[#FFE600]/20 border-2 border-foreground rounded-2xl shadow-[3px_3px_0_0_hsl(var(--foreground))] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
                      <ShieldAlert className="w-4 h-4 text-[#FF3366]" />
                      <span>Trampas Comunes de Examen</span>
                    </div>
                    <ul className="space-y-1.5">
                      {pack.studyGuide.examTips.map((tip, idx) => (
                        <li key={idx} className="text-xs font-bold text-foreground/90 flex items-start gap-2">
                          <span className="font-black text-[#FF3366]">▸</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Botón para pasar al Podcast o a rendir */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("podcast")}
                    className="flex-1 py-3 px-4 bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black uppercase text-xs border-2 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Radio className="w-4 h-4" />
                    <span>Escuchar el Podcast del Nivel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("oral")}
                    className="flex-1 py-3 px-4 bg-[#FF3366] hover:bg-[#e02454] text-white font-black uppercase text-xs border-2 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Rendir Examen Oral con IA</span>
                  </button>
                </div>
              </div>
            ) : activeTab === "podcast" && pack ? (
              /* ──────────────── TAB 2: PODCAST CON IA (VOZ EN TIEMPO REAL) ──────────────── */
              <div className="space-y-5">
                {/* Tarjeta Reproductor de Podcast Neobrutalista */}
                <div className="p-5 sm:p-6 rounded-3xl border-4 border-foreground bg-gradient-to-br from-[#00E5FF]/20 via-card to-[#FFE600]/20 shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <span className="px-3 py-1 rounded-full bg-[#00E5FF] text-black border-2 border-foreground font-black text-[10px] uppercase shadow-[2px_2px_0_0_#000] inline-flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        <span>Podcast Académico con IA · Modo Voz</span>
                      </span>
                      <h4 className="text-lg sm:text-xl font-black uppercase text-foreground">
                        {pack.podcastScript.title}
                      </h4>
                      <p className="text-xs text-muted-foreground font-bold">
                        Duración estimada: ~{pack.podcastScript.estimatedMinutes} min • Narración en tiempo real con IA
                      </p>
                    </div>

                    {/* Selector de velocidad */}
                    <div className="flex items-center gap-1 bg-card border-2 border-foreground rounded-xl p-1 shadow-[2px_2px_0_0_#000]">
                      <span className="text-[9px] font-black uppercase px-1 text-muted-foreground">Vel:</span>
                      {[0.8, 1.0, 1.25, 1.5].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => {
                            setPodcastSpeed(spd);
                            if (podcastPlaying) playPodcastChapter(podcastChapterIdx);
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all",
                            podcastSpeed === spd
                              ? "bg-[#FFE600] text-black border border-foreground"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visualizador de Ondas de Sonido Animadas */}
                  <div className="p-4 rounded-2xl bg-black border-2 border-foreground flex items-center justify-center gap-1.5 h-16 overflow-hidden">
                    {[12, 28, 42, 20, 36, 50, 24, 40, 16, 48, 30, 22, 44, 26, 38].map((height, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1.5 rounded-full transition-all duration-200",
                          i % 3 === 0
                            ? "bg-[#FFE600]"
                            : i % 3 === 1
                              ? "bg-[#00E5FF]"
                              : "bg-[#FF3366]",
                          podcastPlaying ? "animate-pulse" : "opacity-30"
                        )}
                        style={{
                          height: podcastPlaying ? `${Math.max(8, (height * (i % 2 === 0 ? 1 : 1.3)) % 48)}px` : "8px",
                          animationDelay: `${i * 0.08}s`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Controles Principales del Podcast */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      disabled={podcastChapterIdx === 0}
                      onClick={() => playPodcastChapter(Math.max(0, podcastChapterIdx - 1))}
                      className="p-3 rounded-2xl border-2 border-foreground bg-card hover:bg-muted disabled:opacity-40 shadow-[2px_2px_0_0_#000] cursor-pointer"
                      title="Capítulo anterior"
                    >
                      <SkipBack className="w-5 h-5 text-foreground" />
                    </button>

                    <button
                      type="button"
                      onClick={togglePodcastPlay}
                      className={cn(
                        "px-6 py-3.5 rounded-2xl border-3 border-foreground font-black text-sm uppercase flex items-center gap-2 shadow-[4px_4px_0_0_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer",
                        podcastPlaying
                          ? "bg-[#FF3366] text-white animate-pulse"
                          : "bg-[#BFFF00] text-black"
                      )}
                    >
                      {podcastPlaying ? (
                        <>
                          <Pause className="w-5 h-5 fill-current" />
                          <span>Pausar Podcast</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5 fill-current" />
                          <span>Reproducir Podcast</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={podcastChapterIdx >= pack.podcastScript.chapters.length}
                      onClick={() => playPodcastChapter(podcastChapterIdx + 1)}
                      className="p-3 rounded-2xl border-2 border-foreground bg-card hover:bg-muted disabled:opacity-40 shadow-[2px_2px_0_0_#000] cursor-pointer"
                      title="Siguiente capítulo"
                    >
                      <SkipForward className="w-5 h-5 text-foreground" />
                    </button>
                  </div>

                  {/* Selector y Test de Voz Humana */}
                  {renderVoiceSelector("card")}

                  {/* Selector de Capítulos */}
                  <div className="space-y-2 pt-2 border-t-2 border-foreground/20">
                    <span className="text-[10px] font-black uppercase text-foreground block">
                      Capítulos del Episodio ({pack.podcastScript.chapters.length}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pack.podcastScript.chapters.map((ch, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => playPodcastChapter(idx)}
                          className={cn(
                            "p-2.5 rounded-xl border-2 border-foreground text-left transition-all flex items-start gap-2 cursor-pointer shadow-[2px_2px_0_0_#000]",
                            podcastChapterIdx === idx
                              ? "bg-[#FFE600] text-black font-black"
                              : "bg-card text-foreground hover:bg-muted font-bold"
                          )}
                        >
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-black text-white shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs truncate block">{ch.heading}</span>
                            <span className="text-[9px] opacity-75 truncate block">{ch.keyTakeaway}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Transcripción Sincronizada del Podcast */}
                <div className="p-4 rounded-2xl border-2 border-foreground bg-card space-y-2">
                  <div className="flex items-center justify-between text-xs font-black uppercase">
                    <span>Guión Completo del Podcast</span>
                    <span className="text-muted-foreground text-[10px]">Lectura asistida</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto text-xs font-medium text-foreground/90 whitespace-pre-line leading-relaxed p-2 bg-muted/40 rounded-xl border border-foreground/20">
                    {pack.podcastScript.fullNarration}
                  </div>
                </div>

                {/* CTA para rendir */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("oral")}
                    className="flex-1 py-3 px-4 bg-[#FF3366] hover:bg-[#e02454] text-white font-black uppercase text-xs border-2 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Rendir Examen Oral con la IA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("cuestionario")}
                    className="flex-1 py-3 px-4 bg-[#BFFF00] hover:bg-[#a6df00] text-black font-black uppercase text-xs border-2 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Target className="w-4 h-4" />
                    <span>Rendir Cuestionario Escrito</span>
                  </button>
                </div>
              </div>
            ) : activeTab === "flashcards" && pack && currentCard ? (
              /* ──────────────── TAB 3: FLASHCARDS (AUTOEVALUACIÓN) ──────────────── */
              <div className="space-y-5 py-2">
                <div className="flex items-center justify-between text-xs font-black uppercase text-muted-foreground">
                  <span>
                    Tarjeta {cardIndex + 1} de {flashcards.length}
                  </span>
                  <span className="text-primary">
                    Dominadas: {masteredCards.size} / {flashcards.length} ({flashcardsMasteredRatio}%)
                  </span>
                </div>

                <div
                  onClick={() => setIsCardFlipped((f) => !f)}
                  className={cn(
                    "min-h-[220px] p-6 rounded-2xl border-4 border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] flex flex-col items-center justify-center text-center cursor-pointer transition-all select-none",
                    isCardFlipped ? "bg-[#BFFF00] text-black" : "bg-card text-foreground hover:bg-muted/40"
                  )}
                >
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border-2 border-foreground mb-4",
                      isCardFlipped ? "bg-black text-[#BFFF00]" : "bg-[#00E5FF] text-black"
                    )}
                  >
                    {isCardFlipped ? "Respuesta Teórica" : "Pregunta de Memoria (Tocar para dar vuelta)"}
                  </span>

                  <p
                    className={cn(
                      "text-sm sm:text-base leading-relaxed max-w-xl",
                      isCardFlipped ? "font-bold text-black" : "font-black text-foreground"
                    )}
                  >
                    {isCardFlipped ? currentCard.answer : currentCard.question}
                  </p>

                  <span className="mt-6 text-[10px] font-black uppercase opacity-65">
                    🔄 Hacé clic para alternar pregunta y respuesta
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <button
                    type="button"
                    disabled={cardIndex === 0}
                    onClick={() => {
                      setCardIndex((i) => Math.max(0, i - 1));
                      setIsCardFlipped(false);
                    }}
                    className="px-4 py-2.5 rounded-xl border-2 border-foreground bg-card hover:bg-muted disabled:opacity-40 text-xs font-black uppercase cursor-pointer"
                  >
                    ← Anterior
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMasteredCards((prev) => {
                          const next = new Set(prev);
                          next.delete(cardIndex);
                          return next;
                        });
                        if (cardIndex + 1 < flashcards.length) {
                          setCardIndex((i) => i + 1);
                          setIsCardFlipped(false);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl border-2 border-foreground bg-[#FFE600] text-black text-xs font-black uppercase shadow-[3px_3px_0_0_#000] cursor-pointer"
                    >
                      🔄 Repasar Luego
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMasteredCards((prev) => {
                          const next = new Set(prev);
                          next.add(cardIndex);
                          return next;
                        });
                        if (cardIndex + 1 < flashcards.length) {
                          setCardIndex((i) => i + 1);
                          setIsCardFlipped(false);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl border-2 border-foreground bg-[#BFFF00] text-black text-xs font-black uppercase shadow-[3px_3px_0_0_#000] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>¡Dominada!</span>
                    </button>
                  </div>
                </div>

                {/* Si dominó la mayoría, puede dar por aprobado el nivel con flashcards */}
                {passedFlashcards && (
                  <div className="p-4 rounded-2xl bg-[#BFFF00]/20 border-3 border-foreground shadow-[4px_4px_0_0_#000] flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                    <div>
                      <span className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                        <EmojiPng emoji="🎉" size="sm" />
                        <span>¡Excelente retención! Dominaste {masteredCards.size} de {flashcards.length} tarjetas.</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground font-bold">
                        Podés aprobar el nivel ahora con flashcards o probar el examen oral.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowConfetti(true);
                        onLevelComplete(level.level, flashcardsMasteredRatio);
                      }}
                      className="px-5 py-2.5 bg-[#BFFF00] hover:bg-[#a6df00] text-black font-black uppercase text-xs border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_#000] cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <span>Aprobar Nivel con Flashcards</span>
                      <EmojiPng emoji="🚀" size="xs" />
                    </button>
                  </div>
                )}
              </div>
            ) : activeTab === "cuestionario" && pack ? (
              /* ──────────────── TAB 4: CUESTIONARIO ESCRITO ──────────────── */
              isWrittenFinished ? (
                <div className="py-4 space-y-5">
                  <div className="text-center space-y-3">
                    <div
                      className={cn(
                        "w-20 h-20 mx-auto rounded-2xl text-black border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] flex items-center justify-center p-2",
                        passedWritten ? "bg-[#BFFF00]" : "bg-[#FF3366] text-white"
                      )}
                    >
                      <EmojiPng emoji={passedWritten ? "🏆" : "📚"} size="xl" />
                    </div>

                    <div>
                      <h4 className="text-xl font-black uppercase tracking-wide">
                        {passedWritten
                          ? `¡Nivel ${level.level} Aprobado con ${writtenAccuracy}%!`
                          : `Puntaje obtenido: ${writtenAccuracy}% (Requerido: ${workload.requiredAccuracyPercent}%)`}
                      </h4>
                      <p className="text-xs sm:text-sm font-bold text-muted-foreground mt-1">
                        Acertaste {score} de {questions.length} preguntas escritas.
                      </p>
                    </div>
                  </div>

                  {wrongAnswers.length > 0 && (
                    <div className="p-4 rounded-2xl border-2 border-foreground bg-muted/50 space-y-3 text-left">
                      <span className="text-xs font-black uppercase text-[#FF3366] block">
                        🔍 Repaso de Preguntas Falladas ({wrongAnswers.length}):
                      </span>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                        {wrongAnswers.map((item, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-card border-2 border-foreground/50 text-xs space-y-1">
                            <p className="font-black text-foreground">{item.question.pregunta}</p>
                            <p className="text-[#FF3366] font-bold">
                              ✗ Tu respuesta: {item.question.opciones[item.chosen]}
                            </p>
                            <p className="text-emerald-600 dark:text-[#BFFF00] font-black">
                              ✓ Correcta: {item.question.opciones[item.question.correcta]}
                            </p>
                            <p className="text-muted-foreground font-medium pt-0.5 flex items-center gap-1">
                              <EmojiPng emoji="💡" size="xs" />
                              <span>{item.question.explicacion}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {passedWritten ? (
                    <button
                      onClick={() => {
                        stopAllSpeech();
                        onClose();
                      }}
                      className="w-full py-3.5 bg-[#BFFF00] hover:bg-[#a6df00] text-black font-black uppercase text-sm border-3 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>¡Avanzar al Siguiente Nivel!</span>
                      <EmojiPng emoji="🚀" size="xs" />
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentQIndex(0);
                          setSelectedOption(null);
                          setIsAnswerChecked(false);
                          setScore(0);
                          setWrongAnswers([]);
                          setIsWrittenFinished(false);
                        }}
                        className="flex-1 py-3 bg-[#FFE600] text-black font-black uppercase text-xs border-2 border-foreground rounded-xl shadow-[3px_3px_0_0_#000] cursor-pointer"
                      >
                        Reintentar Cuestionario
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("oral")}
                        className="flex-1 py-3 bg-[#FF3366] text-white font-black uppercase text-xs border-2 border-foreground rounded-xl shadow-[3px_3px_0_0_#000] cursor-pointer"
                      >
                        Probar Examen Oral
                      </button>
                    </div>
                  )}
                </div>
              ) : currentQ ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-black uppercase">
                    <span>
                      Pregunta {currentQIndex + 1} de {questions.length}
                    </span>
                    <span className="text-primary">
                      Aciertos: {score} / {requiredWrittenCorrect} necesarios
                    </span>
                  </div>

                  <h4 className="font-black text-sm md:text-base text-foreground leading-snug whitespace-pre-line">
                    {currentQ.pregunta}
                  </h4>

                  <div className="space-y-2.5">
                    {currentQ.opciones.map((op, idx) => {
                      const isSelected = selectedOption === idx;
                      const isCorrect = idx === currentQ.correcta;

                      let btnStyle = "bg-card text-foreground hover:bg-muted";
                      if (isSelected) btnStyle = "bg-[#FFE600] !text-black shadow-none";
                      if (isAnswerChecked) {
                        if (isCorrect) btnStyle = "bg-[#BFFF00] !text-black font-black";
                        else if (isSelected && !isCorrect) btnStyle = "bg-[#FF3366] text-white font-black";
                      }

                      return (
                        <button
                          key={idx}
                          disabled={isAnswerChecked}
                          onClick={() => {
                            if (!isAnswerChecked) setSelectedOption(idx);
                          }}
                          className={cn(
                            "w-full p-3.5 text-left text-xs md:text-sm font-bold border-2 border-foreground rounded-xl transition-all shadow-[3px_3px_0_0_hsl(var(--foreground))] flex items-center justify-between cursor-pointer",
                            btnStyle
                          )}
                        >
                          <span>{op}</span>
                          {isAnswerChecked && isCorrect && <CheckCircle2 className="w-4 h-4 text-black shrink-0 ml-2" />}
                          {isAnswerChecked && isSelected && !isCorrect && <AlertCircle className="w-4 h-4 text-white shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswerChecked && currentQ.explicacion && (
                    <div className="p-3.5 bg-muted border-2 border-foreground rounded-xl text-xs text-foreground font-medium">
                      <span className="font-black block uppercase text-[10px] text-primary mb-0.5">
                        💡 Fundamentación:
                      </span>
                      {currentQ.explicacion}
                    </div>
                  )}

                  {/* Botones siguiente pregunta */}
                  <div className="flex justify-end pt-2">
                    {!isAnswerChecked ? (
                      <button
                        disabled={selectedOption === null}
                        onClick={() => {
                          if (selectedOption === null) return;
                          setIsAnswerChecked(true);
                          if (selectedOption === currentQ.correcta) setScore((s) => s + 1);
                          else setWrongAnswers((prev) => [...prev, { question: currentQ, chosen: selectedOption }]);
                        }}
                        className="px-6 py-2.5 bg-[#FFE600] disabled:opacity-50 text-black font-black uppercase text-xs border-2 border-foreground rounded-xl shadow-[3px_3px_0_0_#000] cursor-pointer"
                      >
                        Verificar Respuesta
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (currentQIndex + 1 < questions.length) {
                            setCurrentQIndex((i) => i + 1);
                            setSelectedOption(null);
                            setIsAnswerChecked(false);
                          } else {
                            setIsWrittenFinished(true);
                            if (score >= requiredWrittenCorrect) {
                              setShowConfetti(true);
                              onLevelComplete(level.level, Math.round((score / questions.length) * 100));
                            }
                          }
                        }}
                        className="px-6 py-2.5 bg-[#BFFF00] text-black font-black uppercase text-xs border-2 border-foreground rounded-xl shadow-[3px_3px_0_0_#000] flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{currentQIndex + 1 < questions.length ? "Siguiente" : "Ver Resultados"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ) : null
            ) : activeTab === "oral" && pack ? (
              /* ──────────────── TAB 5: EXAMEN ORAL CON LA IA ──────────────── */
              isOralFinished ? (
                <div className="py-4 space-y-5 text-center">
                  <div
                    className={cn(
                      "w-20 h-20 mx-auto rounded-2xl border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] flex items-center justify-center p-2",
                      passedOral ? "bg-[#BFFF00] text-black" : "bg-[#FF3366] text-white"
                    )}
                  >
                    <EmojiPng emoji={passedOral ? "🎓" : "🎙️"} size="xl" />
                  </div>

                  <div>
                    <h4 className="text-xl font-black uppercase tracking-wide">
                      {passedOral
                        ? `¡Examen Oral Aprobado! Promedio: ${oralAverage} / 10`
                        : `Promedio Oral: ${oralAverage} / 10 (Requiere 7.0 para aprobar)`}
                    </h4>
                    <p className="text-xs sm:text-sm font-bold text-muted-foreground mt-1">
                      {passedOral
                        ? "Demostraste dominio conceptual y solidez en la exposición oral ante la IA."
                        : "Estuviste cerca. Te recomendamos repasar los conceptos antes de volver a rendir."}
                    </p>
                  </div>

                  {/* Desglose de evaluaciones por pregunta */}
                  <div className="space-y-3 text-left max-h-64 overflow-y-auto pr-1">
                    {oralEvaluations.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl border-2 border-foreground bg-card space-y-1.5 shadow-[2px_2px_0_0_#000]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-foreground">
                            Pregunta #{idx + 1}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-black px-2 py-0.5 rounded-md border border-foreground",
                              ev.puntaje >= 7 ? "bg-[#BFFF00] text-black" : "bg-[#FF3366] text-white"
                            )}
                          >
                            Nota: {ev.puntaje}/10
                          </span>
                        </div>
                        <p className="text-xs text-foreground font-medium">{ev.feedbackOral}</p>
                      </div>
                    ))}
                  </div>

                  {passedOral ? (
                    <button
                      onClick={() => {
                        stopAllSpeech();
                        onClose();
                      }}
                      className="w-full py-3.5 bg-[#BFFF00] hover:bg-[#a6df00] text-black font-black uppercase text-sm border-3 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>¡Avanzar en el Mapa!</span>
                      <EmojiPng emoji="🚀" size="xs" />
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOralIndex(0);
                          setOralTranscript("");
                          setOralEvaluations([]);
                          setCurrentOralEval(null);
                          setIsOralFinished(false);
                          if (pack.oralQuestions[0]) speakText(pack.oralQuestions[0].pregunta);
                        }}
                        className="flex-1 py-3 bg-[#FFE600] text-black font-black uppercase text-xs border-2 border-foreground rounded-xl shadow-[3px_3px_0_0_#000] cursor-pointer"
                      >
                        Rendir Recuperatorio Oral
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("cuestionario")}
                        className="flex-1 py-3 bg-[#00E5FF] text-black font-black uppercase text-xs border-2 border-foreground rounded-xl shadow-[3px_3px_0_0_#000] cursor-pointer"
                      >
                        Rendir Cuestionario Escrito
                      </button>
                    </div>
                  )}
                </div>
              ) : currentOralQ ? (
                <div className="space-y-4">
                  {/* Selector de Voz Humana del Profesor */}
                  {renderVoiceSelector("compact")}

                  {/* Encabezado de la mesa de examen oral */}
                  <div className="p-4 rounded-2xl bg-[#FF3366]/15 border-2 border-foreground shadow-[3px_3px_0_0_#000] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[#FF3366] flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 animate-pulse" />
                        <span>Mesa de Examen Oral con IA · Pregunta {oralIndex + 1} de {oralQuestions.length}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => speakText(currentOralQ.pregunta)}
                        className="px-2.5 py-1 rounded-lg bg-card border border-foreground text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer hover:bg-muted"
                        title="Escuchar al profesor repetir la pregunta"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Repetir Pregunta</span>
                      </button>
                    </div>

                    <h4 className="text-sm sm:text-base font-black text-foreground leading-snug">
                      «{currentOralQ.pregunta}»
                    </h4>

                    {currentOralQ.criterios && (
                      <div className="text-[10px] font-bold text-muted-foreground pt-1 border-t border-foreground/15">
                        <span>Criterio evaluado por la cátedra: {currentOralQ.criterios.join(" • ")}</span>
                      </div>
                    )}
                  </div>

                  {/* Área de Respuesta Oral / Grabación */}
                  {!currentOralEval ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl border-3 border-foreground bg-card shadow-[4px_4px_0_0_#000] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-foreground">
                            Tu Respuesta Oral:
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                            {isRecordingOral ? (
                              <>
                                <EmojiPng emoji="🔴" size="xs" />
                                <span>Grabando micrófono en vivo...</span>
                              </>
                            ) : (
                              <>
                                <EmojiPng emoji="🎙️" size="xs" />
                                <span>Listo para responder</span>
                              </>
                            )}
                          </span>
                        </div>

                        <textarea
                          rows={4}
                          value={oralTranscript}
                          onChange={(e) => setOralTranscript(e.target.value)}
                          placeholder="Pulsá el botón del micrófono para responder hablando, o escribí tu respuesta oral aquí..."
                          className="w-full p-3 rounded-xl border-2 border-foreground bg-background text-xs sm:text-sm font-medium focus:outline-none resize-none text-foreground"
                        />

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={toggleOralRecording}
                            className={cn(
                              "px-4 py-2.5 rounded-xl border-2 border-foreground font-black text-xs uppercase flex items-center gap-2 shadow-[2px_2px_0_0_#000] cursor-pointer transition-transform active:scale-95",
                              isRecordingOral
                                ? "bg-[#FF3366] text-white animate-pulse"
                                : "bg-[#00E5FF] text-black hover:bg-[#00cce6]"
                            )}
                          >
                            {isRecordingOral ? (
                              <>
                                <MicOff className="w-4 h-4" />
                                <span>Pausar Micrófono</span>
                              </>
                            ) : (
                              <>
                                <Mic className="w-4 h-4" />
                                <span>{oralTranscript ? "Seguir Hablando" : "Responder Hablando"}</span>
                                <EmojiPng emoji="🎙️" size="xs" />
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={evaluatingOral || !oralTranscript.trim()}
                            onClick={handleDeliverOralAnswer}
                            className="px-5 py-2.5 rounded-xl border-2 border-foreground bg-[#BFFF00] hover:bg-[#a6df00] disabled:opacity-40 text-black font-black text-xs uppercase shadow-[3px_3px_0_0_#000] flex items-center gap-1.5 cursor-pointer"
                          >
                            {evaluatingOral ? (
                              <>
                                <Sparkles className="w-4 h-4 animate-spin" />
                                <span>Evaluando respuesta...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Entregar Respuesta al Profesor</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Devolución del Profesor en la pregunta oral */
                    <div className="p-5 rounded-2xl border-3 border-foreground bg-card shadow-[4px_4px_0_0_#000] space-y-4 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                          <span>Evaluación del Profesor:</span>
                        </span>
                        <span
                          className={cn(
                            "text-sm font-black px-3 py-1 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_#000]",
                            currentOralEval.puntaje >= 7
                              ? "bg-[#BFFF00] text-black"
                              : "bg-[#FF3366] text-white"
                          )}
                        >
                          Calificación: {currentOralEval.puntaje} / 10
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-muted border-2 border-foreground/40 text-xs font-bold text-foreground space-y-1">
                        <span className="text-[10px] font-black uppercase text-primary block">
                          📢 Devolución Verbal:
                        </span>
                        <p>{currentOralEval.feedbackOral}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 space-y-1">
                          <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-[#BFFF00] block">
                            ✓ Puntos Fuertes:
                          </span>
                          <ul className="space-y-0.5">
                            {currentOralEval.aspectosPositivos.map((ap, idx) => (
                              <li key={idx} className="font-medium">• {ap}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 space-y-1">
                          <span className="text-[10px] font-black uppercase text-amber-600 block">
                            ⚠ A Mejorar:
                          </span>
                          <ul className="space-y-0.5">
                            {currentOralEval.aspectosAMejorar.map((am, idx) => (
                              <li key={idx} className="font-medium">• {am}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleNextOralQuestion}
                          className="px-6 py-2.5 bg-[#BFFF00] hover:bg-[#a6df00] text-black font-black uppercase text-xs border-2 border-foreground rounded-xl shadow-[3px_3px_0_0_#000] flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>
                            {oralIndex + 1 < oralQuestions.length
                              ? `Siguiente Pregunta Oral (${oralIndex + 2}/${oralQuestions.length})`
                              : "Finalizar Mesa Oral"}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
