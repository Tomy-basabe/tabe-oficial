import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDateStr } from "@/lib/utils";
import { toast } from "sonner";

export interface StudyTimerContextType {
  isActive: boolean;
  isPaused: boolean;
  seconds: number;
  subjectId: string | null;
  documentId: string | null;
  documentTitle: string | null;
  startTimer: (subjectId: string | null, documentId: string, documentTitle?: string) => void;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => void;
  stopTimer: () => Promise<void>;
  resetTimer: () => Promise<void>;
  switchDocument: (subjectId: string | null, documentId: string, documentTitle?: string) => Promise<void>;
  formatTime: (totalSeconds: number) => string;
}

interface StoredTimerState {
  isActive: boolean;
  isPaused: boolean;
  startTime: number | null; // Date.now() when last started/resumed
  accumulatedSeconds: number; // Seconds accumulated before current run
  lastSavedSeconds: number; // Seconds already persisted to DB in this session
  subjectId: string | null;
  documentId: string | null;
  documentTitle: string | null;
  userId: string | null;
  updatedAt: number;
}

const STORAGE_KEY = "tabe_global_study_timer";

const loadStoredState = (userId?: string | null): StoredTimerState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredTimerState = JSON.parse(raw);
    // Discard state from different user
    if (userId && parsed.userId && parsed.userId !== userId) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const saveStoredState = (state: StoredTimerState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore quota */ }
};

const StudyTimerContext = createContext<StudyTimerContextType | undefined>(undefined);

export function StudyTimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [seconds, setSeconds] = useState<number>(0);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);

  // High precision timing refs
  const startTimeRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef<number>(0);
  const lastSavedSecondsRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const subjectIdRef = useRef<string | null>(null);
  const documentIdRef = useRef<string | null>(null);
  const documentTitleRef = useRef<string | null>(null);

  // Sync refs with state
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { subjectIdRef.current = subjectId; }, [subjectId]);
  useEffect(() => { documentIdRef.current = documentId; }, [documentId]);
  useEffect(() => { documentTitleRef.current = documentTitle; }, [documentTitle]);

  // Format seconds into MM:SS or HH:MM:SS
  const formatTime = useCallback((totalSeconds: number): string => {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Compute exact current total seconds using absolute timestamps (immune to background throttling)
  const computeExactSeconds = useCallback((): number => {
    if (!isActiveRef.current) return 0;
    if (isPausedRef.current || !startTimeRef.current) {
      return accumulatedSecondsRef.current;
    }
    const elapsedSinceStart = Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000));
    return accumulatedSecondsRef.current + elapsedSinceStart;
  }, []);

  // Persist current session time to database (study_sessions + notion_documents) and trigger Forest growth
  const flushUnsavedTime = useCallback(async (explicitSubjectId?: string | null, explicitDocId?: string | null) => {
    if (!user) return;

    // Check localStorage to sync with any other open tab
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.lastSavedSeconds === "number" && parsed.lastSavedSeconds > lastSavedSecondsRef.current) {
          lastSavedSecondsRef.current = parsed.lastSavedSeconds;
        }
      } catch {}
    }

    const currentTotal = computeExactSeconds();
    let unsaved = currentTotal - lastSavedSecondsRef.current;

    // Only record if at least 3 seconds were studied to avoid noise
    if (unsaved < 3) return;

    // SAFETY CAP: Never flush more than 1 hour (3600s) in a single burst
    if (unsaved > 3600) {
      console.warn(`[StudyTimer] Salto de tiempo anómalo detectado (${unsaved}s). Limitando a 3600s para evitar horas fantasma.`);
      unsaved = 3600;
    }

    const targetSubId = explicitSubjectId !== undefined ? explicitSubjectId : subjectIdRef.current;
    const targetDocId = explicitDocId !== undefined ? explicitDocId : documentIdRef.current;

    // Mark as saved in ref immediately to prevent race conditions from concurrent triggers
    lastSavedSecondsRef.current = currentTotal;

    try {
      // 1. Insert into study_sessions (Triggers racha, metricas, and Forest growth in Supabase)
      const { error: sessionError } = await supabase.from("study_sessions").insert({
        user_id: user.id,
        subject_id: targetSubId || null,
        duracion_segundos: unsaved,
        tipo: "apuntes",
        completada: true,
        fecha: toLocalDateStr(),
      });

      if (sessionError) {
        console.error("[StudyTimer] Error saving study session:", sessionError);
        return;
      }

      // 2. Also increment document total_time_seconds
      if (targetDocId) {
        const { data: doc } = await supabase
          .from("notion_documents")
          .select("total_time_seconds")
          .eq("id", targetDocId)
          .maybeSingle();

        if (doc) {
          await supabase
            .from("notion_documents")
            .update({ total_time_seconds: (doc.total_time_seconds || 0) + unsaved })
            .eq("id", targetDocId);
        }
      }

      // 3. Update storage snapshot
      saveStoredState({
        isActive: isActiveRef.current,
        isPaused: isPausedRef.current,
        startTime: startTimeRef.current,
        accumulatedSeconds: accumulatedSecondsRef.current,
        lastSavedSeconds: currentTotal,
        subjectId: targetSubId,
        documentId: targetDocId,
        documentTitle: documentTitleRef.current,
        userId: user.id,
        updatedAt: Date.now(),
      });

      // 4. Dispatch events for instantaneous Realtime updates in Forest and Analytics
      window.dispatchEvent(new CustomEvent("study-session-recorded", {
        detail: { seconds: unsaved, subjectId: targetSubId, tipo: "apuntes" }
      }));
      document.dispatchEvent(new CustomEvent("forest-activity-updated"));

      console.log(`[StudyTimer] Guardados ${unsaved}s de estudio para materia ${targetSubId || 'general'}`);
    } catch (e) {
      console.error("[StudyTimer] Failed to flush study time:", e);
    }
  }, [user, computeExactSeconds]);

  // Start timer for a document/subject
  const startTimer = useCallback((subId: string | null, docId: string, title?: string) => {
    const now = Date.now();
    startTimeRef.current = now;
    accumulatedSecondsRef.current = 0;
    lastSavedSecondsRef.current = 0;
    isActiveRef.current = true;
    isPausedRef.current = false;
    subjectIdRef.current = subId;
    documentIdRef.current = docId;
    documentTitleRef.current = title || null;

    setIsActive(true);
    setIsPaused(false);
    setSeconds(0);
    setSubjectId(subId);
    setDocumentId(docId);
    setDocumentTitle(title || null);

    saveStoredState({
      isActive: true,
      isPaused: false,
      startTime: now,
      accumulatedSeconds: 0,
      lastSavedSeconds: 0,
      subjectId: subId,
      documentId: docId,
      documentTitle: title || null,
      userId: user?.id || null,
      updatedAt: now,
    });
  }, [user?.id]);

  // Pause timer
  const pauseTimer = useCallback(async () => {
    if (!isActiveRef.current || isPausedRef.current) return;
    const exact = computeExactSeconds();
    accumulatedSecondsRef.current = exact;
    startTimeRef.current = null;
    isPausedRef.current = true;

    setIsPaused(true);
    setSeconds(exact);

    // Save unsaved time to DB immediately upon pausing
    await flushUnsavedTime();

    saveStoredState({
      isActive: true,
      isPaused: true,
      startTime: null,
      accumulatedSeconds: exact,
      lastSavedSeconds: lastSavedSecondsRef.current,
      subjectId: subjectIdRef.current,
      documentId: documentIdRef.current,
      documentTitle: documentTitleRef.current,
      userId: user?.id || null,
      updatedAt: Date.now(),
    });

    toast.info("Cronómetro pausado. Tiempo guardado.", { duration: 2500 });
  }, [computeExactSeconds, flushUnsavedTime, user?.id]);

  // Resume timer
  const resumeTimer = useCallback(() => {
    if (!isActiveRef.current || !isPausedRef.current) return;
    const now = Date.now();
    startTimeRef.current = now;
    isPausedRef.current = false;

    setIsPaused(false);

    saveStoredState({
      isActive: true,
      isPaused: false,
      startTime: now,
      accumulatedSeconds: accumulatedSecondsRef.current,
      lastSavedSeconds: lastSavedSecondsRef.current,
      subjectId: subjectIdRef.current,
      documentId: documentIdRef.current,
      documentTitle: documentTitleRef.current,
      userId: user?.id || null,
      updatedAt: now,
    });
  }, [user?.id]);

  // Stop timer and persist total
  const stopTimer = useCallback(async () => {
    if (!isActiveRef.current) return;
    const total = computeExactSeconds();
    setSeconds(total);

    // Flush any pending seconds to DB
    await flushUnsavedTime();

    startTimeRef.current = null;
    accumulatedSecondsRef.current = 0;
    lastSavedSecondsRef.current = 0;
    isActiveRef.current = false;
    isPausedRef.current = false;

    setIsActive(false);
    setIsPaused(false);
    setSeconds(0);

    localStorage.removeItem(STORAGE_KEY);
    toast.success("Sesión de estudio registrada con éxito.", { duration: 3000 });
  }, [computeExactSeconds, flushUnsavedTime]);

  // Reset timer
  const resetTimer = useCallback(async () => {
    await stopTimer();
  }, [stopTimer]);

  // Switch document/subpage: preserves timer if same subject/materia or same root apunte!
  const switchDocument = useCallback(async (newSubId: string | null, newDocId: string, newTitle?: string) => {
    // If not active, simply record the new document context
    if (!isActiveRef.current) {
      setSubjectId(newSubId);
      setDocumentId(newDocId);
      setDocumentTitle(newTitle || null);
      return;
    }

    const currentSub = subjectIdRef.current;
    const sameSubject = (currentSub === newSubId) || (!currentSub && !newSubId);

    if (sameSubject) {
      // PERSISTENCIA ENTRE SUBPÁGINAS: Same subject or subpage within the note: KEEP RUNNING!
      documentIdRef.current = newDocId;
      documentTitleRef.current = newTitle || documentTitleRef.current;
      setDocumentId(newDocId);
      if (newTitle) setDocumentTitle(newTitle);

      saveStoredState({
        isActive: isActiveRef.current,
        isPaused: isPausedRef.current,
        startTime: startTimeRef.current,
        accumulatedSeconds: accumulatedSecondsRef.current,
        lastSavedSeconds: lastSavedSecondsRef.current,
        subjectId: currentSub,
        documentId: newDocId,
        documentTitle: newTitle || documentTitleRef.current,
        userId: user?.id || null,
        updatedAt: Date.now(),
      });
      console.log(`[StudyTimer] Navegación entre subpáginas de materia ${currentSub}. Cronómetro conservado.`);
    } else {
      // Switched to a DIFFERENT subject/materia:
      // Flush previous subject's time to DB
      console.log(`[StudyTimer] Cambio de materia (${currentSub} -> ${newSubId}). Guardando tiempo previo...`);
      await flushUnsavedTime(currentSub, documentIdRef.current);

      // Start fresh count for the new subject
      const now = Date.now();
      startTimeRef.current = now;
      accumulatedSecondsRef.current = 0;
      lastSavedSecondsRef.current = 0;
      subjectIdRef.current = newSubId;
      documentIdRef.current = newDocId;
      documentTitleRef.current = newTitle || null;

      setSeconds(0);
      setSubjectId(newSubId);
      setDocumentId(newDocId);
      setDocumentTitle(newTitle || null);

      saveStoredState({
        isActive: true,
        isPaused: false,
        startTime: now,
        accumulatedSeconds: 0,
        lastSavedSeconds: 0,
        subjectId: newSubId,
        documentId: newDocId,
        documentTitle: newTitle || null,
        userId: user?.id || null,
        updatedAt: now,
      });
    }
  }, [user?.id, flushUnsavedTime]);

  // Initialize and restore state from localStorage on mount with cold-boot safety
  useEffect(() => {
    const saved = loadStoredState(user?.id);
    if (saved && saved.isActive) {
      const now = Date.now();
      const lastUpdateTimestamp = saved.updatedAt || saved.startTime || 0;
      const timeSinceLastActive = now - lastUpdateTimestamp;

      // STALE / DISCONNECT GUARD:
      // If more than 5 minutes elapsed since the last recorded activity, the browser/tab
      // was closed or machine was asleep. DO NOT add offline elapsed time. Restore as PAUSED.
      const isStaleOrWasClosed = timeSinceLastActive > 5 * 60 * 1000;

      subjectIdRef.current = saved.subjectId;
      documentIdRef.current = saved.documentId;
      documentTitleRef.current = saved.documentTitle;
      lastSavedSecondsRef.current = saved.lastSavedSeconds || 0;

      if (!saved.isPaused && saved.startTime && !isStaleOrWasClosed) {
        // Fast refresh within 5 minutes: compute exact background seconds
        const elapsedSinceStart = Math.max(0, Math.floor((now - saved.startTime) / 1000));
        const total = (saved.accumulatedSeconds || 0) + elapsedSinceStart;
        startTimeRef.current = saved.startTime;
        accumulatedSecondsRef.current = saved.accumulatedSeconds || 0;
        isPausedRef.current = false;
        setSeconds(total);
        setIsPaused(false);
      } else {
        // Was offline or already paused: freeze accumulated seconds and remain paused
        startTimeRef.current = null;
        const total = saved.accumulatedSeconds || saved.lastSavedSeconds || 0;
        accumulatedSecondsRef.current = total;
        isPausedRef.current = true;
        setSeconds(total);
        setIsPaused(true);

        saveStoredState({
          ...saved,
          isPaused: true,
          startTime: null,
          accumulatedSeconds: total,
          updatedAt: now,
        });
      }

      isActiveRef.current = true;
      setIsActive(true);
      setSubjectId(saved.subjectId);
      setDocumentId(saved.documentId);
      setDocumentTitle(saved.documentTitle);
    }
  }, [user?.id]);

  // Multi-tab synchronization via storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const data: StoredTimerState = JSON.parse(e.newValue);
        if (user?.id && data.userId && data.userId !== user.id) return;

        // Keep lastSavedSeconds updated across tabs so only genuine increments are flushed
        if (typeof data.lastSavedSeconds === "number" && data.lastSavedSeconds > lastSavedSecondsRef.current) {
          lastSavedSecondsRef.current = data.lastSavedSeconds;
        }

        // Sync pause/resume state
        if (data.isPaused !== isPausedRef.current) {
          isPausedRef.current = data.isPaused;
          setIsPaused(data.isPaused);
          if (data.isPaused) {
            startTimeRef.current = null;
            accumulatedSecondsRef.current = data.accumulatedSeconds || 0;
            setSeconds(data.accumulatedSeconds || 0);
          } else if (data.startTime) {
            startTimeRef.current = data.startTime;
            accumulatedSecondsRef.current = data.accumulatedSeconds || 0;
          }
        }

        if (data.isActive !== isActiveRef.current) {
          isActiveRef.current = data.isActive;
          setIsActive(data.isActive);
        }
      } catch {}
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user?.id]);

  // AFK / Inactivity detector: auto-pause if user is idle for 15 minutes
  const lastUserInteractionRef = useRef<number>(Date.now());
  useEffect(() => {
    const markInteraction = () => {
      lastUserInteractionRef.current = Date.now();
    };

    const events = ["mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((ev) => window.addEventListener(ev, markInteraction, { passive: true }));

    const idleChecker = setInterval(() => {
      if (isActiveRef.current && !isPausedRef.current) {
        const idleDuration = Date.now() - lastUserInteractionRef.current;
        if (idleDuration >= 15 * 60 * 1000) {
          console.warn("[StudyTimer] Inactividad prolongada (15m sin interacción). Pausando cronómetro automáticamente.");
          pauseTimer();
          toast.info("Cronómetro de estudio pausado por inactividad.", { duration: 4000 });
        }
      }
    }, 15000); // Check every 15 seconds

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, markInteraction));
      clearInterval(idleChecker);
    };
  }, [pauseTimer]);

  // Periodic tick + visibility listener + heartbeat update
  const lastHeartbeatRef = useRef<number>(0);
  useEffect(() => {
    const updateTick = () => {
      if (!isActiveRef.current || isPausedRef.current || !startTimeRef.current) return;
      const exact = computeExactSeconds();
      setSeconds(exact);

      const now = Date.now();
      // Heartbeat: update updatedAt in localStorage every 5 seconds to provide accurate disconnect timestamp
      if (now - lastHeartbeatRef.current >= 5000) {
        lastHeartbeatRef.current = now;
        const currentSaved = loadStoredState(user?.id);
        if (currentSaved && currentSaved.isActive && !currentSaved.isPaused) {
          saveStoredState({
            ...currentSaved,
            updatedAt: now,
          });
        }
      }

      // Auto-save to DB every 5 minutes (300 seconds) of unsaved study time
      if (exact - lastSavedSecondsRef.current >= 300) {
        flushUnsavedTime();
      }
    };

    const interval = setInterval(updateTick, 1000);

    // BACKGROUND / TIMESTAMP REAL: When tab becomes visible again or window gains focus,
    // recalculate immediately using absolute timestamps
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        updateTick();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("pageshow", handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("pageshow", handleVisibilityOrFocus);
    };
  }, [computeExactSeconds, flushUnsavedTime, user?.id]);

  // Tab unload safety: flush any unsaved time on tab close / reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!user || !isActiveRef.current || isPausedRef.current) return;
      const exact = computeExactSeconds();
      let unsaved = exact - lastSavedSecondsRef.current;
      if (unsaved >= 5) {
        if (unsaved > 3600) unsaved = 3600;
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (url && key) {
          const tokenKey = 'sb-' + new URL(url).hostname.split('.')[0] + '-auth-token';
          const tokenStr = localStorage.getItem(tokenKey);
          let token = key;
          if (tokenStr) {
            try { token = JSON.parse(tokenStr).access_token || key; } catch {}
          }
          fetch(`${url}/rest/v1/study_sessions`, {
            method: 'POST',
            headers: {
              'apikey': key,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              subject_id: subjectIdRef.current || null,
              duracion_segundos: unsaved,
              tipo: "apuntes",
              completada: true,
              fecha: toLocalDateStr(),
            }),
            keepalive: true,
          }).catch(() => {});
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [user, computeExactSeconds]);

  return (
    <StudyTimerContext.Provider
      value={{
        isActive,
        isPaused,
        seconds,
        subjectId,
        documentId,
        documentTitle,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        resetTimer,
        switchDocument,
        formatTime,
      }}
    >
      {children}
    </StudyTimerContext.Provider>
  );
}

export function useStudyTimer() {
  const context = useContext(StudyTimerContext);
  if (!context) {
    throw new Error("useStudyTimer must be used within a StudyTimerProvider");
  }
  return context;
}
