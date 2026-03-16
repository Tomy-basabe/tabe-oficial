import { useState, useCallback, useRef, useEffect } from "react";

interface TTSOptions {
  pitch?: number;
  rate?: number;
  volume?: number;
  lang?: string;
}

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, []);

  const speak = useCallback((text: string, options: TTSOptions = {}) => {
    if (!window.speechSynthesis) {
      console.error("Speech Synthesis no es soportado en este navegador.");
      return;
    }

    // Limpiar cualquier audio previo
    stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = options.pitch ?? 1;
    utterance.rate = options.rate ?? 1;
    utterance.volume = options.volume ?? 1;
    utterance.lang = options.lang ?? "es-ES";

    // Intentar encontrar una voz en español
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith("es"));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [stop]);

  const pause = useCallback(() => {
    if (window.speechSynthesis && isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSpeaking, isPaused]);

  const resume = useCallback(() => {
    if (window.speechSynthesis && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speak, stop, pause, resume, isSpeaking, isPaused };
};
