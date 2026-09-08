import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { toLocalDateStr } from "@/lib/utils";

interface DeckStats {
  id: string;
  nombre: string;
  subject_nombre: string;
  total_cards: number;
  total_correct: number;
  total_incorrect: number;
  accuracy: number;
  mastered_cards: number; // Cards with >70% accuracy
  learning_cards: number; // Cards with 30-70% accuracy
  difficult_cards: number; // Cards with <30% accuracy
  new_cards: number; // Cards never studied
}

interface SessionStats {
  date: string;
  duration_seconds: number;
  cards_studied: number;
}

interface FlashcardStatsData {
  deckStats: DeckStats[];
  totalCardsStudied: number;
  totalCorrect: number;
  totalIncorrect: number;
  overallAccuracy: number;
  totalStudyTime: number;
  averageTimePerCard: number;
  sessionsThisWeek: SessionStats[];
  studyStreak: number;
  loading: boolean;
}

export function useFlashcardStats(): FlashcardStatsData {
  const { user } = useAuth();
  const [deckStats, setDeckStats] = useState<DeckStats[]>([]);
  const [sessionsThisWeek, setSessionsThisWeek] = useState<SessionStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch decks with their cards
      const { data: decks } = await supabase
        .from("flashcard_decks")
        .select("id, nombre, total_cards, subjects(nombre)")
        .eq("user_id", user.id);

      // Fetch all flashcards for this user
      const { data: cards } = await supabase
        .from("flashcards")
        .select("id, deck_id, veces_correcta, veces_incorrecta")
        .eq("user_id", user.id);

      // Fetch study sessions for this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: sessions } = await supabase
        .from("study_sessions")
        .select("fecha, duracion_segundos")
        .eq("user_id", user.id)
        .eq("tipo", "flashcard")
        .gte("fecha", weekAgo.toISOString().split('T')[0])
        .order("fecha", { ascending: true });

      // Calculate deck stats
      const calculatedDeckStats: DeckStats[] = (decks || []).map((deck: any) => {
        const deckCards = (cards || []).filter(c => c.deck_id === deck.id);
        
        let totalCorrect = 0;
        let totalIncorrect = 0;
        let masteredCards = 0;
        let learningCards = 0;
        let difficultCards = 0;
        let newCards = 0;

        deckCards.forEach(card => {
          const total = card.veces_correcta + card.veces_incorrecta;
          totalCorrect += card.veces_correcta;
          totalIncorrect += card.veces_incorrecta;

          if (total === 0) {
            newCards++;
          } else {
            const accuracy = card.veces_correcta / total;
            if (accuracy >= 0.7) masteredCards++;
            else if (accuracy >= 0.3) learningCards++;
            else difficultCards++;
          }
        });

        const totalAttempts = totalCorrect + totalIncorrect;
        const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

        return {
          id: deck.id,
          nombre: deck.nombre,
          subject_nombre: deck.subjects?.nombre || "Sin materia",
          total_cards: deck.total_cards || deckCards.length,
          total_correct: totalCorrect,
          total_incorrect: totalIncorrect,
          accuracy,
          mastered_cards: masteredCards,
          learning_cards: learningCards,
          difficult_cards: difficultCards,
          new_cards: newCards,
        };
      });

      // Calculate session stats
      const sessionStats: SessionStats[] = (sessions || []).map((s: any) => ({
        date: s.fecha,
        duration_seconds: s.duracion_segundos,
        cards_studied: 0, // Would need to track this in sessions
      }));

      setDeckStats(calculatedDeckStats);
      setSessionsThisWeek(sessionStats);
    } catch (error) {
      console.error("Error fetching flashcard stats:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, fetchStats]);

  // Realtime subscriptions con debounce para evitar loops
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedFetchStats = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchStats();
    }, 400);
  }, [fetchStats]);

  useRealtimeSubscription({
    table: "flashcard_decks",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: useCallback(() => {
      debouncedFetchStats();
    }, [debouncedFetchStats]),
    enabled: !!user,
  });

  useRealtimeSubscription({
    table: "flashcards",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: useCallback(() => {
      debouncedFetchStats();
    }, [debouncedFetchStats]),
    enabled: !!user,
  });

  // Calculate totals
  const totalCorrect = deckStats.reduce((acc, d) => acc + d.total_correct, 0);
  const totalIncorrect = deckStats.reduce((acc, d) => acc + d.total_incorrect, 0);
  const totalCardsStudied = totalCorrect + totalIncorrect;
  const overallAccuracy = totalCardsStudied > 0 ? (totalCorrect / totalCardsStudied) * 100 : 0;
  const totalStudyTime = sessionsThisWeek.reduce((acc, s) => acc + s.duration_seconds, 0);
  const averageTimePerCard = totalCardsStudied > 0 ? totalStudyTime / totalCardsStudied : 0;

  // Calculate study streak (consecutive days with sessions)
  const todayStr = toLocalDateStr(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterday);

  const dateSet = new Set(sessionsThisWeek.map(s => toLocalDateStr(s.date)));
  let studyStreak = 0;
  let checkDate: Date | null = null;

  if (dateSet.has(todayStr)) {
    checkDate = new Date();
  } else if (dateSet.has(yesterdayStr)) {
    checkDate = new Date(yesterday);
  }

  if (checkDate) {
    const cur = new Date(checkDate);
    while (true) {
      const curStr = toLocalDateStr(cur);
      if (dateSet.has(curStr)) {
        studyStreak++;
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return {
    deckStats,
    totalCardsStudied,
    totalCorrect,
    totalIncorrect,
    overallAccuracy,
    totalStudyTime,
    averageTimePerCard,
    sessionsThisWeek,
    studyStreak,
    loading,
  };
}
