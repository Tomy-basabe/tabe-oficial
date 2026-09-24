import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toLocalDateStr } from "@/lib/utils";
import { DateRange } from "@/components/metrics/DateRangeFilter";
import { subDays, format } from "date-fns";

export interface DeckStats {
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

export interface SessionStats {
  date: string;
  duration_seconds: number;
  cards_studied: number;
}

export interface FlashcardStatsData {
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

export function useFlashcardStats(dateRange?: DateRange): FlashcardStatsData {
  const { user, isGuest } = useAuth();
  const [deckStats, setDeckStats] = useState<DeckStats[]>([]);
  const [sessionsThisWeek, setSessionsThisWeek] = useState<SessionStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    // 1. If guest, serve rich mock data immediately
    if (isGuest) {
      const today = new Date();
      const mockDecks: DeckStats[] = [
        {
          id: "mock-deck-1",
          nombre: "Biología Celular",
          subject_nombre: "Biología General",
          total_cards: 40,
          total_correct: 86,
          total_incorrect: 14,
          accuracy: 86,
          mastered_cards: 25,
          learning_cards: 10,
          difficult_cards: 3,
          new_cards: 2,
        },
        {
          id: "mock-deck-2",
          nombre: "Algoritmos y Estructuras",
          subject_nombre: "Programación I",
          total_cards: 30,
          total_correct: 52,
          total_incorrect: 22,
          accuracy: 70,
          mastered_cards: 15,
          learning_cards: 10,
          difficult_cards: 4,
          new_cards: 1,
        },
        {
          id: "mock-deck-3",
          nombre: "Historia Económica",
          subject_nombre: "Economía",
          total_cards: 25,
          total_correct: 18,
          total_incorrect: 24,
          accuracy: 43,
          mastered_cards: 4,
          learning_cards: 9,
          difficult_cards: 8,
          new_cards: 4,
        },
      ];

      const mockSessions: SessionStats[] = [];
      const rangeDays = dateRange ? Math.min(Math.max(Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 3600 * 24)) + 1, 1), 30) : 7;
      const startDate = dateRange ? dateRange.to : today;

      for (let i = 0; i < rangeDays; i++) {
        const d = subDays(startDate, i);
        if (i % 2 === 0 || i === 1) {
          mockSessions.push({
            date: toLocalDateStr(d),
            duration_seconds: 600 + ((i * 350) % 1800),
            cards_studied: 15 + ((i * 7) % 25),
          });
        }
      }

      setDeckStats(mockDecks);
      setSessionsThisWeek(mockSessions.reverse());
      setLoading(false);
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch decks
      const { data: decks, error: decksErr } = await supabase
        .from("flashcard_decks")
        .select("id, nombre, total_cards, subject_id, subjects(nombre)")
        .eq("user_id", user.id);

      if (decksErr) {
        console.warn("Error fetching flashcard decks:", decksErr);
      }

      // Fetch all flashcards for this user
      const { data: cards, error: cardsErr } = await supabase
        .from("flashcards")
        .select("id, deck_id, veces_correcta, veces_incorrecta")
        .eq("user_id", user.id);

      if (cardsErr) {
        console.warn("Error fetching flashcards:", cardsErr);
      }

      // Fetch study sessions for date range (or default to last 30 days)
      const fromDate = dateRange?.from ? dateRange.from : subDays(new Date(), 30);
      const toDate = dateRange?.to ? dateRange.to : new Date();
      const fromStr = toLocalDateStr(fromDate);
      const toStr = toLocalDateStr(toDate);

      const { data: sessions, error: sessErr } = await supabase
        .from("study_sessions")
        .select("fecha, duracion_segundos")
        .eq("user_id", user.id)
        .eq("tipo", "flashcard")
        .gte("fecha", fromStr)
        .lte("fecha", `${toStr}T23:59:59.999Z`)
        .order("fecha", { ascending: true });

      if (sessErr) {
        console.warn("Error fetching flashcard study sessions:", sessErr);
      }

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
          const cCorrect = Number(card.veces_correcta) || 0;
          const cIncorrect = Number(card.veces_incorrecta) || 0;
          const total = cCorrect + cIncorrect;
          totalCorrect += cCorrect;
          totalIncorrect += cIncorrect;

          if (total === 0) {
            newCards++;
          } else {
            const accuracy = cCorrect / total;
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
          subject_nombre: deck.subjects?.nombre || "General",
          total_cards: deck.total_cards || deckCards.length,
          total_correct: totalCorrect,
          total_incorrect: totalIncorrect,
          accuracy: Math.round(accuracy * 10) / 10,
          mastered_cards: masteredCards,
          learning_cards: learningCards,
          difficult_cards: difficultCards,
          new_cards: newCards,
        };
      });

      // Calculate session stats normalized with toLocalDateStr
      const sessionStats: SessionStats[] = (sessions || []).map((s: any) => ({
        date: toLocalDateStr(s.fecha),
        duration_seconds: Number(s.duracion_segundos) || 0,
        cards_studied: 0,
      }));

      setDeckStats(calculatedDeckStats);
      setSessionsThisWeek(sessionStats);
    } catch (error) {
      console.error("Error fetching flashcard stats:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isGuest, dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

  useEffect(() => {
    let mounted = true;
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    fetchStats().finally(() => {
      clearTimeout(safetyTimer);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
    };
  }, [fetchStats]);

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

  const dateSet = new Set(sessionsThisWeek.map(s => s.date));
  let studyStreak = 0;
  let checkDate: Date | null = null;

  if (dateSet.has(todayStr)) {
    checkDate = new Date();
  } else if (dateSet.has(yesterdayStr)) {
    checkDate = new Date(yesterday);
  }

  if (checkDate) {
    const cur = new Date(checkDate);
    for (let i = 0; i < 365; i++) {
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
