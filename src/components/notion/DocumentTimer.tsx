import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Clock, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentTimerProps {
  onSaveTime: (seconds: number, documentId?: string, subjectId?: string) => void;
  autoStart?: boolean;
  documentId?: string;
  subjectId?: string;
}

export function DocumentTimer({ 
  onSaveTime, 
  autoStart = true,
  documentId,
  subjectId
}: DocumentTimerProps) {
  const [isRunning, setIsRunning] = useState(autoStart);
  const [seconds, setSeconds] = useState(0);
  const [savedSeconds, setSavedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(0);
  
  // Use refs to always have current values available for cleanup
  const secondsRef = useRef(0);
  const savedSecondsRef = useRef(0);
  const onSaveTimeRef = useRef(onSaveTime);
  const documentIdRef = useRef(documentId);
  const subjectIdRef = useRef(subjectId);
  
  // Keep refs in sync
  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);
  
  useEffect(() => {
    savedSecondsRef.current = savedSeconds;
  }, [savedSeconds]);
  
  useEffect(() => {
    onSaveTimeRef.current = onSaveTime;
  }, [onSaveTime]);

  useEffect(() => {
    // Only update if we have a value, to avoid losing it during unmount/cleanup
    if (documentId) documentIdRef.current = documentId;
  }, [documentId]);

  useEffect(() => {
    if (subjectId) subjectIdRef.current = subjectId;
  }, [subjectId]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (seconds > 0 && seconds - lastSaveRef.current >= 30) {
      const toSave = seconds - savedSeconds;
      if (toSave > 0) {
        onSaveTime(toSave, documentId, subjectId);
        setSavedSeconds(seconds);
        lastSaveRef.current = seconds;
      }
    }
  }, [seconds, savedSeconds, onSaveTime, documentId, subjectId]);

  // Save on unmount - using refs to get current values
  useEffect(() => {
    return () => {
      const unsavedSeconds = secondsRef.current - savedSecondsRef.current;
      if (unsavedSeconds > 0) {
        onSaveTimeRef.current(unsavedSeconds, documentIdRef.current, subjectIdRef.current);
      }
    };
  }, []);

  const handleSaveNow = () => {
    const toSave = seconds - savedSeconds;
    if (toSave > 0) {
      onSaveTime(toSave, documentId, subjectId);
      setSavedSeconds(seconds);
      lastSaveRef.current = seconds;
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
        isRunning ? "bg-neon-green/20 text-neon-green" : "bg-secondary text-muted-foreground"
      )}>
        <Clock className="w-4 h-4" />
        <span className="font-mono font-medium tabular-nums">
          {formatTime(seconds)}
        </span>
      </div>
      
      <button
        onClick={() => setIsRunning(!isRunning)}
        className={cn(
          "p-2 rounded-lg transition-colors",
          isRunning 
            ? "bg-neon-red/20 text-neon-red hover:bg-neon-red/30" 
            : "bg-neon-green/20 text-neon-green hover:bg-neon-green/30"
        )}
        title={isRunning ? "Pausar" : "Reanudar"}
      >
        {isRunning ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>

      {seconds - savedSeconds > 0 && (
        <button
          onClick={handleSaveNow}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          title="Guardar tiempo ahora"
        >
          <Save className="w-4 h-4" />
        </button>
      )}

      {isRunning && (
        <span className="text-xs text-muted-foreground animate-pulse">
          Grabando...
        </span>
      )}
    </div>
  );
}
