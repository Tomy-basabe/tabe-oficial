import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Layers, Plus, Sparkles, GraduationCap,
  BookOpen, Zap, Trash2, X, ShoppingBag, Edit2
} from "lucide-react";
import { useMarketplace } from "@/hooks/useMarketplace";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FlashcardDeck } from "@/components/flashcards/FlashcardDeck";
import { StudyMode } from "@/components/flashcards/StudyMode";
import { CompletionScreen } from "@/components/flashcards/CompletionScreen";
import { useAchievements } from "@/hooks/useAchievements";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { toLocalDateStr } from "@/lib/utils";
interface Deck {
  id: string;
  nombre: string;
  subject_id: string;
  total_cards: number;
  subject?: { nombre: string; codigo: string; año: number };
}

interface Flashcard {
  id: string;
  pregunta: string;
  respuesta: string;
  veces_correcta: number;
  veces_incorrecta: number;
  veces_parcial: number;
}

interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  año: number;
}

type StudyState = "browsing" | "studying" | "completed";

export default function Flashcards() {
  const { user, isGuest } = useAuth();
  const { checkAndUnlockAchievements } = useAchievements();
  const { canUse, incrementUsage, getRemaining, isPremium } = useUsageLimits();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const { publishResource } = useMarketplace();
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishingDeck, setPublishingDeck] = useState<Deck | null>(null);
  const [pubDescription, setPubDescription] = useState("");
  const [pubCategory, setPubCategory] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [studyState, setStudyState] = useState<StudyState>("browsing");
  const [studyTime, setStudyTime] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [showManageCardsModal, setShowManageCardsModal] = useState(false);
  const [showDeleteDeckModal, setShowDeleteDeckModal] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [newCardQuestion, setNewCardQuestion] = useState("");
  const [newCardAnswer, setNewCardAnswer] = useState("");
  const [loading, setLoading] = useState(true);

  // Edit Deck State
  const [showEditDeckModal, setShowEditDeckModal] = useState(false);
  const [deckToEdit, setDeckToEdit] = useState<Deck | null>(null);
  const [newSubjectId, setNewSubjectId] = useState<string>("");

  // Import Cards State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTargetDeck, setImportTargetDeck] = useState<Deck | null>(null);
  const [importStep, setImportStep] = useState(1);
  const [importSourceYear, setImportSourceYear] = useState<number | null>(null);
  const [importSourceSubject, setImportSourceSubject] = useState<string | null>(null);
  const [importSourceDeck, setImportSourceDeck] = useState<Deck | null>(null);
  const [importSourceCards, setImportSourceCards] = useState<Flashcard[]>([]);
  const [selectedImportCards, setSelectedImportCards] = useState<string[]>([]);

  // Merge Decks State
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedDecksToMerge, setSelectedDecksToMerge] = useState<string[]>([]);
  const [mergeNewDeckName, setMergeNewDeckName] = useState("");
  const [mergeYear, setMergeYear] = useState<number | null>(null);
  const [mergeSubjectId, setMergeSubjectId] = useState<string | null>(null);
  const [mergeSourceYearFilter, setMergeSourceYearFilter] = useState<number | null>(null);
  const [mergeSourceSubjectFilter, setMergeSourceSubjectFilter] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // Pagination State
  const [managePage, setManagePage] = useState(1);
  const [importPage, setImportPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Refs for exit-save (to ensure time is saved on unmount/exit)
  const studyTimeRef = useRef(0);
  const selectedDeckRef = useRef<Deck | null>(null);
  const studyStateRef = useRef<StudyState>("browsing");

  useEffect(() => { studyTimeRef.current = studyTime; }, [studyTime]);
  useEffect(() => { selectedDeckRef.current = selectedDeck; }, [selectedDeck]);
  useEffect(() => { studyStateRef.current = studyState; }, [studyState]);

  useEffect(() => {
    if (user || isGuest) {
      fetchSubjects();
      fetchDecks();
    }
  }, [user, isGuest]);

  // Study timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (studyState === "studying") {
      interval = setInterval(() => {
        setStudyTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [studyState]);

  // Save study session on tab switch / page close / navigate away
  useEffect(() => {
    const handleExitSave = () => {
      if (studyStateRef.current === "studying" && studyTimeRef.current > 0 && user && selectedDeckRef.current) {
        const deck = selectedDeckRef.current;
        supabase.from("study_sessions").insert({
          user_id: user.id,
          subject_id: deck.subject_id,
          duracion_segundos: studyTimeRef.current,
          tipo: "flashcard",
          completada: false,
          fecha: toLocalDateStr(),
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleExitSave();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleExitSave);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleExitSave);
    };
  }, [user]);

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .order("año", { ascending: true });

    if (!error && data) {
      setSubjects(data);
    }
  };

  const fetchDecks = async () => {
    if (!user && !isGuest) return;
    setLoading(true);

    if (isGuest) {
      setDecks([
        { id: "mock-deck-1", nombre: "Uso de Flashcards", subject_id: "mock", total_cards: 5, subject: { nombre: "Uso de Tablero", codigo: "TAB1", año: 1 } },
      ]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("flashcard_decks")
      .select("*, subjects(nombre, codigo, año)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const mapped = data.map((d: any) => ({ ...d, subject: d.subjects }));
      setDecks(mapped);
    }
    setLoading(false);
  };

  const fetchCards = async (deckId: string) => {
    if (isGuest) {
      if (deckId === "mock-deck-1") {
        const anatomyMocks = [
          { pregunta: "¿Para qué sirven las Flashcards?", respuesta: "Las flashcards son tarjetas de memoria que ayudan a repasar conceptos clave de forma rápida y efectiva." },
          { pregunta: "¿Cómo funciona el sistema de estudio?", respuesta: "Te mostramos la pregunta. Pensás la respuesta y luego la volteás para ver si acertaste." },
          { pregunta: "Aquí puedes colocar preguntas", respuesta: "Aquí pondrías la respuesta correcta que debes memorizar." },
          { pregunta: "¿Qué evalúa este modo de estudio?", respuesta: "Evalúa tu retención activa, obligándote a recordar el concepto antes de leerlo." },
          { pregunta: "¿Cómo me ayuda la IA con esto?", respuesta: "Puedes abrir el chat con la IA y pedirle que genere flashcards automáticamente a partir de tus apuntes." },
        ].map((c, i) => ({
          id: `mock-card-1-${i}`,
          ...c,
          veces_correcta: Math.floor(Math.random() * 20),
          veces_incorrecta: Math.floor(Math.random() * 5),
          veces_parcial: Math.floor(Math.random() * 5)
        }));
        setCards(anatomyMocks);
        return anatomyMocks;
      }

      const formulasMocks = [
        { pregunta: "¿Por qué estudiar en bloques pequeños?", respuesta: "Mejora la atención y evita la fatiga, técnica conocida como Pomodoro." },
        { pregunta: "¿Qué es el repaso espaciado?", respuesta: "Repasar la información en intervalos cada vez mayores para fijarla a largo plazo." },
        { pregunta: "Aquí puedes colocar tips", respuesta: "Y aquí la explicación de cómo aplicarlos en tu día a día." },
        { pregunta: "¿Por qué es importante dormir bien?", respuesta: "El sueño consolida la memoria de lo aprendido durante el día." },
        { pregunta: "¿Cómo empezar a organizarse?", respuesta: "Utiliza la vista de Calendario de Tabe para planificar tus sesiones y no procrastinar." },
      ].map((c, i) => ({
        id: `mock-card-2-${i}`,
        ...c,
        veces_correcta: Math.floor(Math.random() * 10),
        veces_incorrecta: Math.floor(Math.random() * 3),
        veces_parcial: Math.floor(Math.random() * 3)
      }));
      setCards(formulasMocks);
      return formulasMocks;
    }

    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const mappedCards = data.map(c => ({
        ...c,
        veces_parcial: (c as any).veces_parcial || 0
      })) as Flashcard[];
      setCards(mappedCards);
      return mappedCards;
    }
    return [];
  };

  const createDeck = async () => {
    if (!user || !selectedSubject || !newDeckName.trim()) return;

    // Check monthly deck limit for free users
    if (!isPremium && !canUse('flashcard_mazos')) {
      return;
    }

    const { error } = await supabase
      .from("flashcard_decks")
      .insert({
        user_id: user.id,
        subject_id: selectedSubject,
        nombre: newDeckName.trim(),
      });

    if (error) {
      toast.error("Error al crear el mazo");
    } else {
      toast.success("¡Mazo creado exitosamente!");
      await incrementUsage('flashcard_mazos');
      setNewDeckName("");
      setShowNewDeckModal(false);
      fetchDecks();
      // Verificar logros después de crear un mazo
      checkAndUnlockAchievements();
    }
  };

  const createCard = async () => {
    if (!user || !selectedDeck || !newCardQuestion.trim() || !newCardAnswer.trim()) return;

    // No per-deck card limit - unlimited cards per deck

    const { error } = await supabase
      .from("flashcards")
      .insert({
        user_id: user.id,
        deck_id: selectedDeck.id,
        pregunta: newCardQuestion.trim(),
        respuesta: newCardAnswer.trim(),
      });

    if (error) {
      toast.error("Error al crear la tarjeta");
    } else {
      toast.success("¡Tarjeta agregada! Podés seguir creando más.");
      setNewCardQuestion("");
      setNewCardAnswer("");
      // Keep modal open so user can continue creating cards

      // Update deck card count
      const updatedCards = await fetchCards(selectedDeck.id);
      await supabase
        .from("flashcard_decks")
        .update({ total_cards: updatedCards.length })
        .eq("id", selectedDeck.id);

      // Update selectedDeck in memory to reflect new card count
      setSelectedDeck({ ...selectedDeck, total_cards: updatedCards.length });
      fetchDecks();
      // Verificar logros después de crear una tarjeta
      checkAndUnlockAchievements();
    }
  };

  const handleCardResult = useCallback(async (cardId: string, status: 'correct' | 'partial' | 'incorrect') => {
    if (status === 'correct') {
      setCorrectCount(prev => prev + 1);
    }

    if (isGuest) return;

    // Let's find the card in state to get current values.
    const card = cards.find(c => c.id === cardId);
    if (card) {
      const updates: any = {};
      if (status === 'correct') updates.veces_correcta = (card.veces_correcta || 0) + 1;
      if (status === 'partial') updates.veces_parcial = (card.veces_parcial || 0) + 1;
      if (status === 'incorrect') updates.veces_incorrecta = (card.veces_incorrecta || 0) + 1;
      
      await supabase
        .from("flashcards")
        .update(updates)
        .eq("id", cardId);
    }
  }, [cards, isGuest]);

  const handleStudyComplete = useCallback(async () => {
    // Save study session
    if (user && selectedDeck) {
      await supabase
        .from("study_sessions")
        .insert({
          user_id: user.id,
          subject_id: selectedDeck.subject_id,
          duracion_segundos: studyTime,
          tipo: "flashcard",
          completada: true,
          fecha: toLocalDateStr(),
        });
      // Verificar logros después de completar estudio de flashcards
      checkAndUnlockAchievements();
    }
    setStudyState("completed");
  }, [user, selectedDeck, studyTime, checkAndUnlockAchievements]);

  const startStudying = async (deck: Deck, filter: 'all' | 'known' | 'partial' | 'unknown' = 'all') => {
    let fetchedCards = await fetchCards(deck.id);
    if (fetchedCards.length === 0) {
      toast.error("Este mazo no tiene tarjetas");
      return;
    }

    if (filter !== 'all') {
      fetchedCards = fetchedCards.filter(card => {
        if (filter === 'known') return card.veces_correcta >= 3;
        if (filter === 'partial') return card.veces_correcta > 0 && card.veces_correcta < 3;
        if (filter === 'unknown') return card.veces_correcta === 0;
        return true;
      });
    }

    if (fetchedCards.length === 0) {
      const messages = {
        known: "No hay tarjetas marcadas como 'sabidas' todavía",
        partial: "No hay tarjetas marcadas como 'sabidas a medias' todavía",
        unknown: "No hay tarjetas 'no sabidas' en este mazo"
      };
      toast.info(messages[filter as keyof typeof messages] || "No hay tarjetas con este filtro");
      return;
    }

    const mappedCards = fetchedCards.map(c => ({
      ...c,
      veces_parcial: (c as any).veces_parcial || 0
    })) as Flashcard[];
    setSelectedDeck(deck);
    setCards(mappedCards);
    setStudyTime(0);
    setCorrectCount(0);
    setStudyState("studying");
  };

  const handleAddCard = (deck: Deck) => {
    setSelectedDeck(deck);
    fetchCards(deck.id);
    setShowNewCardModal(true);
  };

  const handleManageCards = async (deck: Deck) => {
    setSelectedDeck(deck);
    setManagePage(1); // Reset to first page
    const fetched = await fetchCards(deck.id);
    setCards(fetched);
    setShowManageCardsModal(true);
  };

  const handleDeleteDeckClick = (deck: Deck) => {
    setDeckToDelete(deck);
    setShowDeleteDeckModal(true);
  };

  const confirmDeleteDeck = async () => {
    if (!deckToDelete) return;

    try {
      // First delete all cards in the deck
      await supabase
        .from("flashcards")
        .delete()
        .eq("deck_id", deckToDelete.id);

      // Then delete the deck
      const { error } = await supabase
        .from("flashcard_decks")
        .delete()
        .eq("id", deckToDelete.id);

      if (error) throw error;

      toast.success("Mazo eliminado correctamente");
      setShowDeleteDeckModal(false);
      setDeckToDelete(null);
      fetchDecks();
    } catch (error) {
      console.error("Error deleting deck:", error);
      toast.error("Error al eliminar el mazo");
    }
  };

  const deleteCard = async (cardId: string) => {
    if (!selectedDeck) return;

    try {
      const { error } = await supabase
        .from("flashcards")
        .delete()
        .eq("id", cardId);

      if (error) throw error;

      // Update local state
      const updatedCards = cards.filter(c => c.id !== cardId);
      setCards(updatedCards);

      // Update deck card count
      await supabase
        .from("flashcard_decks")
        .update({ total_cards: updatedCards.length })
        .eq("id", selectedDeck.id);

      fetchDecks();
      toast.success("Tarjeta eliminada");
    } catch (error) {
      console.error("Error deleting card:", error);
      toast.error("Error al eliminar la tarjeta");
    }
  };

  const stopStudying = async () => {
    // Save partial session
    if (user && selectedDeck && studyTime > 0) {
      await supabase
        .from("study_sessions")
        .insert({
          user_id: user.id,
          subject_id: selectedDeck.subject_id,
          duracion_segundos: studyTime,
          tipo: "flashcard",
          completada: false,
          fecha: toLocalDateStr(),
        });
      toast.success("Sesión guardada");
    }
    resetStudy();
  };

  const resetStudy = () => {
    setStudyState("browsing");
    setSelectedDeck(null);
    setCards([]);
    setStudyTime(0);
    setCorrectCount(0);
  };

  const restartStudy = () => {
    setStudyTime(0);
    setCorrectCount(0);
    setStudyState("studying");
  };

  const filteredDecks = decks.filter(deck => {
    const matchesYear = !selectedYear || deck.subject?.año === selectedYear;
    const matchesSubject = !selectedSubject || deck.subject_id === selectedSubject;
    return matchesYear && matchesSubject;
  });

  const filteredSubjects = subjects.filter(s => !selectedYear || s.año === selectedYear);

  // Edit Deck Functions
  const handleEditDeck = (deck: Deck) => {
    setDeckToEdit(deck);
    setNewSubjectId(deck.subject_id || "");
    setShowEditDeckModal(true);
  };

  const saveDeckSubject = async () => {
    if (!deckToEdit) return;

    // Allow null if empty string is passed (or handle based on UI preference)
    const subjectIdToSave = newSubjectId || null;

    const { error } = await supabase
      .from("flashcard_decks")
      .update({ subject_id: subjectIdToSave })
      .eq("id", deckToEdit.id);

    if (error) {
      toast.error("Error al actualizar la materia");
    } else {
      toast.success("Materia actualizada");
      setShowEditDeckModal(false);
      fetchDecks();
    }
  };

  // Import Cards Functions
  const handleImportCards = (targetDeck: Deck) => {
    setImportTargetDeck(targetDeck);
    resetImportState();
    setShowImportModal(true);
  };

  const resetImportState = () => {
    setImportStep(1);
    setImportSourceYear(null);
    setImportSourceSubject(null);
    setImportSourceDeck(null);
    setImportSourceCards([]);
    setSelectedImportCards([]);
  };

  const handleImportSelectDeck = async (sourceDeck: Deck) => {
    setImportSourceDeck(sourceDeck);
    const cards = await fetchCards(sourceDeck.id);
    setImportSourceCards(cards || []);
    setImportPage(1); // Reset to first page
    setImportStep(2);
  };

  const handleImportConfirm = async () => {
    if (!user || !importTargetDeck || selectedImportCards.length === 0) return;

    const cardsToCopy = importSourceCards.filter(c => selectedImportCards.includes(c.id));

    // Prepare new cards for insertion
    const newCards = cardsToCopy.map(c => ({
      user_id: user.id,
      deck_id: importTargetDeck.id,
      pregunta: c.pregunta,
      respuesta: c.respuesta,
      veces_correcta: 0,
      veces_incorrecta: 0,
      veces_parcial: 0
    }));

    const { error } = await supabase.from("flashcards").insert(newCards);

    if (error) {
      toast.error("Error al importar cartas");
    } else {
      toast.success(`${newCards.length} cartas importadas`);

      // Update deck count
      const currentCount = importTargetDeck.total_cards;
      await supabase
        .from("flashcard_decks")
        .update({ total_cards: currentCount + newCards.length })
        .eq("id", importTargetDeck.id);

      setShowImportModal(false);
      fetchDecks();
    }
  };

  const toggleImportCardSelection = (cardId: string) => {
    setSelectedImportCards(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const handleMergeDecks = async () => {
    if (!user || selectedDecksToMerge.length < 2 || !mergeNewDeckName.trim() || !mergeSubjectId) {
      toast.error("Completa todos los campos y selecciona al menos 2 mazos");
      return;
    }
    setIsMerging(true);
    try {
      // 1. Create the new deck
      const { data: newDeck, error: deckError } = await supabase
        .from("flashcard_decks")
        .insert({
          user_id: user.id,
          subject_id: mergeSubjectId,
          nombre: mergeNewDeckName.trim(),
        })
        .select()
        .single();

      if (deckError) throw deckError;

      // 2. Fetch all cards from selected decks
      const { data: allSourceCards, error: cardsError } = await supabase
        .from("flashcards")
        .select("pregunta, respuesta")
        .in("deck_id", selectedDecksToMerge);

      if (cardsError) throw cardsError;

      if (!allSourceCards || allSourceCards.length === 0) {
        toast.error("Los mazos seleccionados no tienen tarjetas.");
        setIsMerging(false);
        return;
      }

      // 3. Clone cards into the new deck
      const cardsToInsert = allSourceCards.map(c => ({
        user_id: user.id,
        deck_id: newDeck.id,
        pregunta: c.pregunta,
        respuesta: c.respuesta,
        veces_correcta: 0,
        veces_incorrecta: 0,
        veces_parcial: 0
      }));

      const { error: insertError } = await supabase
        .from("flashcards")
        .insert(cardsToInsert);

      if (insertError) throw insertError;

      // 4. Update the total_cards count for the new deck
      await supabase
        .from("flashcard_decks")
        .update({ total_cards: cardsToInsert.length })
        .eq("id", newDeck.id);

      toast.success(`¡Mazo "${mergeNewDeckName}" creado con ${cardsToInsert.length} tarjetas!`);
      setShowMergeModal(false);
      resetMergeState();
      fetchDecks();
      checkAndUnlockAchievements();
    } catch (error) {
      console.error("Error merging decks:", error);
      toast.error("Error al combinar los mazos");
    } finally {
      setIsMerging(false);
    }
  };

  const handlePublishDeck = async () => {
    if (!publishingDeck || !pubDescription.trim() || !pubCategory.trim()) return;
    setIsPublishing(true);
    const success = await publishResource("deck", publishingDeck.id, pubDescription, pubCategory);
    if (success) {
      setShowPublishModal(false);
      setPublishingDeck(null);
      setPubDescription("");
      setPubCategory("");
      fetchDecks();
    }
    setIsPublishing(false);
  };

  const resetMergeState = () => {
    setSelectedDecksToMerge([]);
    setMergeNewDeckName("");
    setMergeYear(null);
    setMergeSubjectId(null);
    setMergeSourceYearFilter(null);
    setMergeSourceSubjectFilter(null);
  };

  const toggleMergeDeckSelection = (deckId: string) => {
    setSelectedDecksToMerge(prev =>
      prev.includes(deckId)
        ? prev.filter(id => id !== deckId)
        : [...prev, deckId]
    );
  };

  const selectAllImportCards = () => {
    if (selectedImportCards.length === importSourceCards.length) {
      setSelectedImportCards([]);
    } else {
      setSelectedImportCards(importSourceCards.map(c => c.id));
    }
  };

  const filteredSourceDecks = decks.filter(deck => {
    // Exclude current target deck
    if (deck.id === importTargetDeck?.id) return false;

    const matchesYear = !importSourceYear || deck.subject?.año === importSourceYear;
    const matchesSubject = !importSourceSubject || deck.subject_id === importSourceSubject;
    return matchesYear && matchesSubject;
  });

  const filteredSourceSubjects = subjects.filter(s => !importSourceYear || s.año === importSourceYear);

  // Study Mode
  if (studyState === "studying" && selectedDeck && cards.length > 0) {
    return (
      <StudyMode
        deckName={selectedDeck.nombre}
        cards={cards}
        studyTime={studyTime}
        onExit={stopStudying}
        onCardResult={handleCardResult}
        onComplete={handleStudyComplete}
      />
    );
  }

  // Completion Screen
  if (studyState === "completed" && selectedDeck) {
    return (
      <CompletionScreen
        deckName={selectedDeck.nombre}
        totalCards={cards.length}
        correctCount={correctCount}
        studyTime={studyTime}
        onRestart={restartStudy}
        onExit={resetStudy}
      />
    );
  }

  // Browsing Mode
  return (
    <div className="p-4 lg:p-8 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center glow-cyan">
            <BookOpen className="w-7 h-7 text-background" />
          </div>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text flex items-center gap-2">
              Flashcards
              <Sparkles className="w-6 h-6 text-neon-gold animate-pulse" />
            </h1>
            <p className="text-muted-foreground mt-0.5">
              Estudia con tarjetas interactivas
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowMergeModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-secondary text-foreground border border-border rounded-xl font-semibold hover:bg-secondary/80 transition-all hover:scale-105"
          >
            <Layers className="w-5 h-5 text-neon-cyan" />
            Juntar Mazos
          </button>
          <button
            onClick={() => setShowNewDeckModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-xl font-semibold hover:shadow-lg hover:shadow-neon-cyan/25 transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Nuevo Mazo
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-gamer rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neon-cyan/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold">{decks.length}</p>
            <p className="text-xs text-muted-foreground">Mazos</p>
          </div>
        </div>
        <div className="card-gamer rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold">
              {decks.reduce((acc, d) => acc + d.total_cards, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Tarjetas</p>
          </div>
        </div>
        <div className="card-gamer rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neon-green/20 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-neon-green" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold">
              {new Set(decks.map(d => d.subject_id)).size}
            </p>
            <p className="text-xs text-muted-foreground">Materias</p>
          </div>
        </div>
        <div className="card-gamer rounded-xl p-4 flex items-center gap-3 col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-lg bg-neon-gold/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-neon-gold" />
          </div>
          <div>
            <p className="text-sm font-medium text-neon-gold">¡Estudia hoy!</p>
            <p className="text-xs text-muted-foreground">Mantén tu racha</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setSelectedYear(null); setSelectedSubject(null); }}
            className={cn(
              "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
              !selectedYear
                ? "bg-gradient-to-r from-neon-cyan to-neon-purple text-background"
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            Todos
          </button>
          {[1, 2, 3, 4, 5, 6].map(year => (
            <button
              key={year}
              onClick={() => { setSelectedYear(year); setSelectedSubject(null); }}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                selectedYear === year
                  ? "bg-gradient-to-r from-neon-cyan to-neon-purple text-background"
                  : "bg-secondary hover:bg-secondary/80"
              )}
            >
              Año {year}
            </button>
          ))}
        </div>

        {selectedYear && filteredSubjects.length > 0 && (
          <select
            value={selectedSubject || ""}
            onChange={(e) => setSelectedSubject(e.target.value || null)}
            className="px-4 py-2.5 bg-secondary rounded-xl text-sm border border-border font-medium"
          >
            <option value="">Todas las materias</option>
            {filteredSubjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Decks Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-gamer rounded-2xl p-6 animate-pulse">
              <div className="flex justify-between mb-4">
                <div className="w-14 h-14 bg-secondary rounded-xl" />
                <div className="w-16 h-6 bg-secondary rounded-lg" />
              </div>
              <div className="h-6 bg-secondary rounded mb-2 w-3/4" />
              <div className="h-4 bg-secondary rounded w-1/2 mb-4" />
              <div className="h-2 bg-secondary rounded-full mb-4" />
              <div className="flex gap-2">
                <div className="flex-1 h-10 bg-secondary rounded-xl" />
                <div className="w-10 h-10 bg-secondary rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDecks.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-secondary/50 flex items-center justify-center">
            <Layers className="w-12 h-12 text-muted-foreground opacity-50" />
          </div>
          <h3 className="font-display text-xl font-bold mb-2">No hay mazos creados</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Crea tu primer mazo de flashcards para empezar a estudiar de forma interactiva
          </p>
          <button
            onClick={() => setShowNewDeckModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-xl font-semibold hover:shadow-lg hover:shadow-neon-cyan/25 transition-all"
          >
            Crear primer mazo
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDecks.map((deck, index) => (
            <FlashcardDeck
              key={deck.id}
              deck={deck}
              index={index}
              onStartStudy={startStudying}
              onAddCard={handleAddCard}
              onDeleteDeck={handleDeleteDeckClick}
              onManageCards={handleManageCards}
              onEditDeck={handleEditDeck}
              onImportCards={handleImportCards}
              onPublishDeck={(deck) => {
                setPublishingDeck(deck);
                setShowPublishModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* New Deck Modal */}
      <Dialog open={showNewDeckModal} onOpenChange={setShowNewDeckModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display gradient-text text-xl flex items-center gap-2">
              <Layers className="w-5 h-5 text-neon-cyan" />
              Nuevo Mazo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Seleccionar Año</label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5, 6].map(year => (
                  <button
                    key={year}
                    onClick={() => { setSelectedYear(year); setSelectedSubject(null); }}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-sm font-semibold transition-all",
                      selectedYear === year
                        ? "bg-gradient-to-r from-neon-cyan to-neon-purple text-background"
                        : "bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    {year}°
                  </button>
                ))}
              </div>
            </div>

            {selectedYear && (
              <div className="animate-fade-in">
                <label className="text-sm font-medium text-muted-foreground">Materia</label>
                <select
                  value={selectedSubject || ""}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full mt-2 px-4 py-3 bg-secondary rounded-xl border border-border font-medium"
                >
                  <option value="">Seleccionar materia</option>
                  {filteredSubjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedSubject && (
              <div className="animate-fade-in">
                <label className="text-sm font-medium text-muted-foreground">Nombre del mazo</label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Ej: Unidad 1 - Conceptos básicos"
                  className="w-full mt-2 px-4 py-3 bg-secondary rounded-xl border border-border"
                />
              </div>
            )}

            <button
              onClick={createDeck}
              disabled={!selectedSubject || !newDeckName.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-neon-cyan/25"
            >
              Crear Mazo
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Card Modal */}
      <Dialog open={showNewCardModal} onOpenChange={setShowNewCardModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display gradient-text text-xl flex items-center gap-2">
              <Plus className="w-5 h-5 text-neon-cyan" />
              Nueva Tarjeta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Pregunta</label>
              <textarea
                value={newCardQuestion}
                onChange={(e) => setNewCardQuestion(e.target.value)}
                placeholder="Escribe la pregunta..."
                rows={3}
                className="w-full mt-2 px-4 py-3 bg-secondary rounded-xl border border-border resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Respuesta</label>
              <textarea
                value={newCardAnswer}
                onChange={(e) => setNewCardAnswer(e.target.value)}
                placeholder="Escribe la respuesta..."
                rows={3}
                className="w-full mt-2 px-4 py-3 bg-secondary rounded-xl border border-border resize-none"
              />
            </div>

            <button
              onClick={createCard}
              disabled={!newCardQuestion.trim() || !newCardAnswer.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-neon-cyan/25"
            >
              Agregar Tarjeta
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Cards Modal */}
      <Dialog open={showManageCardsModal} onOpenChange={setShowManageCardsModal}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display gradient-text text-xl flex items-center gap-2">
              <Layers className="w-5 h-5 text-neon-cyan" />
              Gestionar Tarjetas - {selectedDeck?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {cards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Este mazo no tiene tarjetas</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cards.slice((managePage - 1) * ITEMS_PER_PAGE, managePage * ITEMS_PER_PAGE).map((card) => (
                    <div
                      key={card.id}
                      className="p-4 bg-secondary rounded-xl border border-border group hover:border-neon-cyan/30 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-2">{card.pregunta}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{card.respuesta}</p>
                          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="text-neon-green">✓ {card.veces_correcta}</span>
                            <span className="text-destructive">✗ {card.veces_incorrecta}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteCard(card.id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {cards.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between gap-4 mt-6 px-1">
                    <button
                      disabled={managePage === 1}
                      onClick={() => setManagePage(p => p - 1)}
                      className="flex-1 py-2 bg-secondary rounded-xl text-sm font-medium disabled:opacity-30"
                    >
                      Anterior
                    </button>
                    <span className="text-xs font-medium text-muted-foreground">
                      Página {managePage} de {Math.ceil(cards.length / ITEMS_PER_PAGE)}
                    </span>
                    <button
                      disabled={managePage === Math.ceil(cards.length / ITEMS_PER_PAGE)}
                      onClick={() => setManagePage(p => p + 1)}
                      className="flex-1 py-2 bg-secondary rounded-xl text-sm font-medium disabled:opacity-30"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="pt-4 border-t border-border">
            <button
              onClick={() => {
                setShowManageCardsModal(false);
                setShowNewCardModal(true);
              }}
              className="w-full py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar Tarjeta
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Deck Subject Modal */}
      <Dialog open={showEditDeckModal} onOpenChange={setShowEditDeckModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display gradient-text text-xl flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-neon-cyan" />
              Editar Materia - {deckToEdit?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <p className="text-sm text-muted-foreground">
              Asigna una materia a este mazo para organizarlo mejor.
            </p>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Materia</label>
              <select
                value={newSubjectId}
                onChange={(e) => setNewSubjectId(e.target.value)}
                className="w-full mt-2 px-4 py-3 bg-secondary rounded-xl border border-border font-medium"
              >
                <option value="">Sin materia</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.nombre}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={saveDeckSubject}
              className="w-full py-3.5 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-neon-cyan/25"
            >
              Guardar Cambios
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Cards Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display gradient-text text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-neon-gold" />
              Importar Cartas a "{importTargetDeck?.nombre}"
            </DialogTitle>
          </DialogHeader>

          {importStep === 1 ? (
            <div className="flex-1 overflow-y-auto py-4 space-y-5">
              <p className="text-sm text-muted-foreground">
                Selecciona un mazo existente para copiar sus cartas.
              </p>

              {/* Year Filter */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Filtrar por Año</label>
                <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => { setImportSourceYear(null); setImportSourceSubject(null); }}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                      !importSourceYear
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    Todos
                  </button>
                  {[1, 2, 3, 4, 5, 6].map(year => (
                    <button
                      key={year}
                      onClick={() => { setImportSourceYear(year); setImportSourceSubject(null); }}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        importSourceYear === year
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80"
                      )}
                    >
                      {year}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Filter */}
              {importSourceYear && (
                <div className="animate-fade-in">
                  <label className="text-sm font-medium text-muted-foreground">Filtrar por Materia</label>
                  <select
                    value={importSourceSubject || ""}
                    onChange={(e) => setImportSourceSubject(e.target.value || null)}
                    className="w-full mt-2 px-3 py-2 bg-secondary rounded-lg border border-border text-sm"
                  >
                    <option value="">Todas las materias</option>
                    {filteredSourceSubjects.map(subject => (
                      <option key={subject.id} value={subject.id}>{subject.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Decks List */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Seleccionar Mazo ({filteredSourceDecks.length})</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {filteredSourceDecks.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-2">No se encontraron mazos.</p>
                  ) : (
                    filteredSourceDecks.map(deck => (
                      <button
                        key={deck.id}
                        onClick={() => handleImportSelectDeck(deck)}
                        className="w-full p-3 bg-secondary rounded-xl hover:bg-secondary/80 transition-all text-left flex justify-between items-center group"
                      >
                        <div>
                          <p className="font-medium text-sm group-hover:text-neon-cyan transition-colors">{deck.nombre}</p>
                          <p className="text-xs text-muted-foreground">{deck.subject?.nombre || "Sin materia"}</p>
                        </div>
                        <span className="text-xs font-medium bg-background/50 px-2 py-1 rounded">
                          {deck.total_cards} cartas
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col py-4">
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => setImportStep(1)}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  ← Volver
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {selectedImportCards.length} seleccionadas
                  </span>
                  <button
                    onClick={selectAllImportCards}
                    className="text-xs px-2 py-1 bg-secondary rounded hover:bg-secondary/80"
                  >
                    {selectedImportCards.length === importSourceCards.length ? "Deseleccionar" : "Todas"}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {importSourceCards.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Este mazo está vacío.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {importSourceCards.slice((importPage - 1) * ITEMS_PER_PAGE, importPage * ITEMS_PER_PAGE).map(card => (
                        <div
                          key={card.id}
                          onClick={() => toggleImportCardSelection(card.id)}
                          className={cn(
                            "p-3 rounded-xl border border-border cursor-pointer transition-all flex gap-3",
                            selectedImportCards.includes(card.id)
                              ? "bg-neon-cyan/10 border-neon-cyan"
                              : "bg-secondary hover:border-neon-cyan/50"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5",
                            selectedImportCards.includes(card.id)
                              ? "bg-neon-cyan border-neon-cyan"
                              : "border-muted-foreground"
                          )}>
                            {selectedImportCards.includes(card.id) && <Plus className="w-3 h-3 text-background" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-2">{card.pregunta}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{card.respuesta}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {importSourceCards.length > ITEMS_PER_PAGE && (
                      <div className="flex items-center justify-between gap-4 mt-6 mb-2 px-1">
                        <button
                          disabled={importPage === 1}
                          onClick={() => setImportPage(p => p - 1)}
                          className="flex-1 py-2 bg-secondary rounded-xl text-sm font-medium disabled:opacity-30"
                        >
                          Anterior
                        </button>
                        <span className="text-xs font-medium text-muted-foreground">
                          {importPage} / {Math.ceil(importSourceCards.length / ITEMS_PER_PAGE)}
                        </span>
                        <button
                          disabled={importPage === Math.ceil(importSourceCards.length / ITEMS_PER_PAGE)}
                          onClick={() => setImportPage(p => p + 1)}
                          className="flex-1 py-2 bg-secondary rounded-xl text-sm font-medium disabled:opacity-30"
                        >
                          Siguiente
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="pt-4 mt-auto border-t border-border">
                <button
                  onClick={handleImportConfirm}
                  disabled={selectedImportCards.length === 0}
                  className="w-full py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
                >
                  Importar {selectedImportCards.length} Cartas
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Merge Decks Modal */}
      <Dialog open={showMergeModal} onOpenChange={setShowMergeModal}>
        <DialogContent className="sm:max-w-xl bg-card border-border max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display gradient-text text-xl flex items-center gap-2">
              <Layers className="w-6 h-6 text-neon-cyan" />
              Combinar Mazos de Flashcards
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-muted-foreground">
                  1. Seleccionar Mazos ({selectedDecksToMerge.length} seleccionados)
                </label>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  Mínimo 2 mazos
                </span>
              </div>

              {/* Source Deck Filters */}
              <div className="space-y-3 bg-secondary/30 p-3 rounded-xl border border-border/50">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => { setMergeSourceYearFilter(null); setMergeSourceSubjectFilter(null); }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap",
                      !mergeSourceYearFilter
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}
                  >
                    Todos
                  </button>
                  {[1, 2, 3, 4, 5, 6].map(year => (
                    <button
                      key={year}
                      onClick={() => { setMergeSourceYearFilter(year); setMergeSourceSubjectFilter(null); }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap",
                        mergeSourceYearFilter === year
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}
                    >
                      {year}° Año
                    </button>
                  ))}
                </div>

                {mergeSourceYearFilter && (
                  <select
                    value={mergeSourceSubjectFilter || ""}
                    onChange={(e) => setMergeSourceSubjectFilter(e.target.value || null)}
                    className="w-full px-3 py-1.5 bg-background/50 rounded-lg border border-border text-[11px] outline-none"
                  >
                    <option value="">Todas las materias del año</option>
                    {subjects.filter(s => s.año === mergeSourceYearFilter).map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                {decks
                  .filter(deck => {
                    const matchesYear = !mergeSourceYearFilter || deck.subject?.año === mergeSourceYearFilter;
                    const matchesSubject = !mergeSourceSubjectFilter || deck.subject_id === mergeSourceSubjectFilter;
                    return matchesYear && matchesSubject;
                  })
                  .map(deck => (
                    <div
                      key={deck.id}
                      onClick={() => toggleMergeDeckSelection(deck.id)}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group",
                        selectedDecksToMerge.includes(deck.id)
                          ? "bg-neon-cyan/10 border-neon-cyan/50"
                          : "bg-secondary/50 border-border hover:border-neon-cyan/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                          selectedDecksToMerge.includes(deck.id)
                            ? "bg-neon-cyan border-neon-cyan"
                            : "border-muted-foreground/30"
                        )}>
                          {selectedDecksToMerge.includes(deck.id) && <Plus className="w-3.5 h-3.5 text-background" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{deck.nombre}</p>
                          <p className="text-[10px] text-muted-foreground">{deck.subject?.nombre || "Sin materia"}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono bg-background/40 px-2 py-0.5 rounded text-muted-foreground">
                        {deck.total_cards} cards
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-border/50">
              <label className="text-sm font-semibold text-muted-foreground block">
                2. Configurar Nuevo Mazo
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground ml-1">Año</label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {[1, 2, 3, 4, 5, 6].map(year => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => { setMergeYear(year); setMergeSubjectId(null); }}
                        className={cn(
                          "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                          mergeYear === year
                            ? "bg-neon-cyan text-background"
                            : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
                        )}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground ml-1">Materia</label>
                  <select
                    value={mergeSubjectId || ""}
                    onChange={(e) => setMergeSubjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary/50 rounded-lg border border-border text-xs focus:ring-1 focus:ring-neon-cyan outline-none"
                    disabled={!mergeYear}
                  >
                    <option value="">Seleccionar...</option>
                    {subjects.filter(s => s.año === mergeYear).map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground ml-1">Nombre del Mazo Combinado</label>
                <input
                  type="text"
                  value={mergeNewDeckName}
                  onChange={(e) => setMergeNewDeckName(e.target.value)}
                  placeholder="Ej: Final - Repaso General"
                  className="w-full px-4 py-3 bg-secondary/50 rounded-xl border border-border text-sm focus:ring-1 focus:ring-neon-cyan outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 mt-auto border-t border-border flex gap-3">
            <button
              onClick={() => setShowMergeModal(false)}
              className="flex-1 py-3 text-sm font-semibold hover:bg-secondary/50 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleMergeDecks}
              disabled={isMerging || selectedDecksToMerge.length < 2 || !mergeNewDeckName.trim() || !mergeSubjectId}
              className="flex-[2] py-3.5 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-neon-cyan/20 flex items-center justify-center gap-2"
            >
              {isMerging ? (
                <>
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  Combinando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Confirmar Combinación
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Deck Confirmation Modal */}
      <Dialog open={showDeleteDeckModal} onOpenChange={setShowDeleteDeckModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Eliminar Mazo
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              ¿Estás seguro de que deseas eliminar el mazo <span className="font-semibold text-foreground">"{deckToDelete?.nombre}"</span>?
            </p>
            <p className="text-sm text-destructive mt-2">
              Esta acción eliminará todas las tarjetas ({deckToDelete?.total_cards}) y no se puede deshacer.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteDeckModal(false)}
              className="flex-1 py-3 bg-secondary rounded-xl font-semibold hover:bg-secondary/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDeleteDeck}
              className="flex-1 py-3 bg-destructive text-destructive-foreground rounded-xl font-semibold hover:bg-destructive/90 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal de Publicar en Marketplace */}
      <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Publicar mazo en el Marketplace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                className="w-full h-24 p-3 bg-secondary rounded-lg border border-border focus:ring-2 focus:ring-neon-cyan/50"
                placeholder="Describe qué contiene este mazo..."
                value={pubDescription}
                onChange={(e) => setPubDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <input
                className="w-full p-3 bg-secondary rounded-lg border border-border focus:ring-2 focus:ring-neon-cyan/50"
                placeholder="Ej: Medicina, Historia, Programación..."
                value={pubCategory}
                onChange={(e) => setPubCategory(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPublishModal(false)}>Cancelar</Button>
              <Button
                className="flex-1 bg-neon-cyan text-black hover:bg-neon-cyan/90"
                onClick={handlePublishDeck}
                disabled={isPublishing || !pubDescription.trim() || !pubCategory.trim()}
              >
                {isPublishing ? "Publicando..." : "Publicar Ahora"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
