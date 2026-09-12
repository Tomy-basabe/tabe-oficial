import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

export interface AudioBookOptions {
  rate?: number;
  pitch?: number;
  voiceURI?: string;
}

export interface AudioBookState {
  isPlaying: boolean;
  isPaused: boolean;
  rate: number;
  pitch: number;
  currentSentenceIndex: number;
  totalSentences: number;
  currentSentence: string;
  progress: number; // 0 - 100
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  isSupported: boolean;
}

// Split text into natural, digestible sentence segments (< 200 chars each)
export function splitTextIntoSentences(text: string): string[] {
  if (!text || typeof text !== "string") return [];

  // Clean markdown / formatting artifacts
  const clean = text
    .replace(/```[\s\S]*?```/g, " Bloque de código omitido. ") // replace code blocks
    .replace(/`([^`]+)`/g, "$1") // remove inline code backticks
    .replace(/https?:\/\/\S+/g, " enlace ") // replace raw URLs
    .replace(/[#*_~>]/g, "") // remove markdown header/quote chars
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return [];

  // Split by sentence delimiters: . ! ? ; : and newlines
  const rawSentences = clean.match(/[^.!?¡¿\n]+[.!?¡¿\n]+|[^.!?¡¿\n]+$/g) || [clean];
  const result: string[] = [];

  for (const raw of rawSentences) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length < 2) continue;

    // If a sentence is long (> 220 chars), break it down by commas or clauses
    if (trimmed.length > 220) {
      const clauses = trimmed.match(/[^,;:—]+[,;:—]+|[^,;:—]+$/g) || [trimmed];
      for (const clause of clauses) {
        const cTrimmed = clause.trim();
        if (cTrimmed.length > 1) {
          result.push(cTrimmed);
        }
      }
    } else {
      result.push(trimmed);
    }
  }

  return result.length > 0 ? result : [clean];
}

export function useAudioBook() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRateState] = useState<number>(() => {
    const saved = localStorage.getItem("tabe_audiobook_rate");
    return saved ? parseFloat(saved) : 1;
  });
  const [pitch, setPitch] = useState<number>(1);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState<string[]>([]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Active refs to eliminate stale closure bugs during continuous playback
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const sentencesRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);
  const rateRef = useRef(rate);
  const pitchRef = useRef(pitch);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const keepAliveTimerRef = useRef<number | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Sync refs
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { sentencesRef.current = sentences; }, [sentences]);
  useEffect(() => { currentIndexRef.current = currentSentenceIndex; }, [currentSentenceIndex]);
  useEffect(() => { rateRef.current = rate; }, [rate]);
  useEffect(() => { pitchRef.current = pitch; }, [pitch]);
  useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);

  // Load available voices and select best Spanish voice
  const loadVoices = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }

    const allVoices = window.speechSynthesis.getVoices();
    if (!allVoices || allVoices.length === 0) return;

    // Filter to Spanish voices first, then include others if needed
    const spanishVoices = allVoices.filter(v => v.lang.toLowerCase().startsWith("es"));
    const sorted = spanishVoices.length > 0 ? spanishVoices : allVoices;
    setAvailableVoices(sorted);

    // Pick saved or best Spanish voice
    const savedVoiceName = localStorage.getItem("tabe_audiobook_voice");
    let chosen: SpeechSynthesisVoice | undefined;

    if (savedVoiceName) {
      chosen = sorted.find(v => v.name === savedVoiceName);
    }

    if (!chosen) {
      // Preference: Natural or Google voices in Spanish, or default Spanish
      chosen = sorted.find(v => v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Neural"))
        || sorted.find(v => v.lang.startsWith("es-"))
        || sorted[0];
    }

    if (chosen) {
      setSelectedVoice(chosen);
      selectedVoiceRef.current = chosen;
    }
  }, []);

  useEffect(() => {
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadVoices]);

  // Keep-alive mechanism to prevent Chrome from killing SpeechSynthesis during pauses or long speeches
  const startKeepAlive = useCallback(() => {
    if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
    keepAliveTimerRef.current = window.setInterval(() => {
      if (window.speechSynthesis && isPlayingRef.current && !isPausedRef.current) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 9000);
  }, []);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }
  }, []);

  // Cancel current speech safely
  const cancelSpeech = useCallback(() => {
    stopKeepAlive();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn("Error cancelling speech:", err);
      }
    }
  }, [stopKeepAlive]);

  // Speak a single sentence by index
  const playSentence = useCallback((index: number) => {
    const list = sentencesRef.current;
    if (!list || list.length === 0 || index < 0 || index >= list.length) {
      setIsPlaying(false);
      setIsPaused(false);
      stopKeepAlive();
      return;
    }

    cancelSpeech();

    const sentenceText = list[index];
    const utterance = new SpeechSynthesisUtterance(sentenceText);
    utterance.rate = rateRef.current;
    utterance.pitch = pitchRef.current;

    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current;
      utterance.lang = selectedVoiceRef.current.lang;
    } else {
      utterance.lang = "es-ES";
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentSentenceIndex(index);
      startKeepAlive();
    };

    utterance.onend = () => {
      if (!isPlayingRef.current) return;

      const nextIndex = index + 1;
      if (nextIndex < sentencesRef.current.length) {
        setCurrentSentenceIndex(nextIndex);
        // Small timeout gives the audio engine time to breathe between sentences
        setTimeout(() => {
          if (isPlayingRef.current) {
            playSentence(nextIndex);
          }
        }, 60);
      } else {
        // Finished entire text!
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSentenceIndex(0);
        stopKeepAlive();
        toast.success("Lectura completada");
      }
    };

    utterance.onerror = (e) => {
      // Ignored intentional cancellations
      if (e.error === "canceled" || e.error === "interrupted") return;
      console.warn("TTS sentence error:", e.error);

      // Advance if still playing
      if (isPlayingRef.current && index + 1 < sentencesRef.current.length) {
        setTimeout(() => playSentence(index + 1), 100);
      } else {
        setIsPlaying(false);
        stopKeepAlive();
      }
    };

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [cancelSpeech, startKeepAlive, stopKeepAlive]);

  // Main API: Start reading text from startIndex (default 0)
  const play = useCallback((fullText?: string, startIndex = 0) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Tu navegador no soporta lectura por voz (Web Speech API)");
      return;
    }

    if (fullText) {
      const parsed = splitTextIntoSentences(fullText);
      if (parsed.length === 0) {
        toast.error("El apunte no contiene texto legible");
        return;
      }
      setSentences(parsed);
      sentencesRef.current = parsed;
      const validIndex = Math.min(Math.max(0, startIndex), parsed.length - 1);
      setCurrentSentenceIndex(validIndex);
      currentIndexRef.current = validIndex;
      setIsPlaying(true);
      setIsPaused(false);
      isPlayingRef.current = true;
      isPausedRef.current = false;
      playSentence(validIndex);
    } else {
      // Resume current text from currentSentenceIndex
      if (sentencesRef.current.length === 0) return;
      setIsPlaying(true);
      setIsPaused(false);
      isPlayingRef.current = true;
      isPausedRef.current = false;
      playSentence(currentIndexRef.current);
    }
  }, [playSentence]);

  // Rock-solid pause: cancels engine utterance so it NEVER freezes or drops after long idle times
  const pause = useCallback(() => {
    isPlayingRef.current = false;
    isPausedRef.current = true;
    setIsPlaying(false);
    setIsPaused(true);
    cancelSpeech();
    toast.info("Lectura pausada. Se reanudará en la misma frase.");
  }, [cancelSpeech]);

  // Resume smoothly right from the paused sentence
  const resume = useCallback(() => {
    if (sentencesRef.current.length === 0) return;
    setIsPlaying(true);
    setIsPaused(false);
    isPlayingRef.current = true;
    isPausedRef.current = false;
    playSentence(currentIndexRef.current);
  }, [playSentence]);

  // Stop completely
  const stop = useCallback(() => {
    isPlayingRef.current = false;
    isPausedRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentenceIndex(0);
    currentIndexRef.current = 0;
    cancelSpeech();
  }, [cancelSpeech]);

  // Jump to specific sentence
  const jumpToSentence = useCallback((index: number) => {
    const list = sentencesRef.current;
    if (list.length === 0) return;
    const clamped = Math.max(0, Math.min(index, list.length - 1));
    setCurrentSentenceIndex(clamped);
    currentIndexRef.current = clamped;

    if (isPlayingRef.current) {
      playSentence(clamped);
    }
  }, [playSentence]);

  // Jump by percentage (0 to 100)
  const jumpToPercentage = useCallback((percent: number) => {
    const list = sentencesRef.current;
    if (list.length === 0) return;
    const index = Math.floor((percent / 100) * list.length);
    jumpToSentence(index);
  }, [jumpToSentence]);

  // Next / Previous sentence
  const nextSentence = useCallback(() => {
    jumpToSentence(currentIndexRef.current + 1);
  }, [jumpToSentence]);

  const prevSentence = useCallback(() => {
    jumpToSentence(currentIndexRef.current - 1);
  }, [jumpToSentence]);

  // Speed controls: 0.75, 1, 1.25, 1.5, 1.75, 2
  const setRate = useCallback((newRate: number) => {
    const clamped = Math.max(0.5, Math.min(newRate, 2));
    setRateState(clamped);
    rateRef.current = clamped;
    localStorage.setItem("tabe_audiobook_rate", clamped.toString());

    // If currently playing, restart current sentence smoothly with new rate
    if (isPlayingRef.current) {
      playSentence(currentIndexRef.current);
    }
  }, [playSentence]);

  // Voice selector
  const changeVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
    selectedVoiceRef.current = voice;
    localStorage.setItem("tabe_audiobook_voice", voice.name);

    if (isPlayingRef.current) {
      playSentence(currentIndexRef.current);
    }
  }, [playSentence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, [cancelSpeech]);

  // Calculated progress
  const totalSentences = sentences.length;
  const progress = totalSentences > 0 ? Math.round(((currentSentenceIndex + 1) / totalSentences) * 100) : 0;
  const currentSentence = sentences[currentSentenceIndex] || "";

  return {
    isPlaying,
    isPaused,
    rate,
    pitch,
    currentSentenceIndex,
    totalSentences,
    currentSentence,
    progress,
    availableVoices,
    selectedVoice,
    isSupported,
    play,
    pause,
    resume,
    stop,
    jumpToSentence,
    jumpToPercentage,
    nextSentence,
    prevSentence,
    setRate,
    setPitch,
    changeVoice,
    setSentences,
  };
}
