import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Layers, Plus, Sparkles, GraduationCap,
  BookOpen, Zap, Trash2, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FlashcardDeck } from "@/components/flashcards/FlashcardDeck";
import { StudyMode } from "@/components/flashcards/StudyMode";
import { CompletionScreen } from "@/components/flashcards/CompletionScreen";
import { useAchievements } from "@/hooks/useAchievements";
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
}

interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  año: number;
}

type StudyState = "browsing" | "studying" | "completed";

export default function Flashcards() {
  const { user } = useAuth();
  const { checkAndUnlockAchievements } = useAchievements();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
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

  useEffect(() => {
    if (user) {
      fetchSubjects();
      fetchDecks();
    }
  }, [user]);

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
    if (!user) return;
    setLoading(true);
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
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setCards(data);
      return data;
    }
    return [];
  };

  const createDeck = async () => {
    if (!user || !selectedSubject || !newDeckName.trim()) return;

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
      setNewDeckName("");
      setShowNewDeckModal(false);
      fetchDecks();
      // Verificar logros después de crear un mazo
      checkAndUnlockAchievements();
    }
  };

  const createCard = async () => {
    if (!user || !selectedDeck || !newCardQuestion.trim() || !newCardAnswer.trim()) return;

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
      toast.success("¡Tarjeta agregada!");
      setNewCardQuestion("");
      setNewCardAnswer("");
      setShowNewCardModal(false);

      // Update deck card count
      const updatedCards = await fetchCards(selectedDeck.id);
      await supabase
        .from("flashcard_decks")
        .update({ total_cards: updatedCards.length })
        .eq("id", selectedDeck.id);

      fetchDecks();
      // Verificar logros después de crear una tarjeta
      checkAndUnlockAchievements();
    }
  };

  const handleCardResult = useCallback(async (correct: boolean) => {
    if (!cards.length) return;

    // Find the card that was just answered (we track this via correctCount + incorrectCount)
    const answeredIndex = correctCount + (cards.length - correctCount - (cards.length - 1));
    const card = cards[answeredIndex] || cards[0];

    if (correct) {
      setCorrectCount(prev => prev + 1);
    }

    // Update card stats in database
    if (card) {
      await supabase
        .from("flashcards")
        .update({
          veces_correcta: correct ? card.veces_correcta + 1 : card.veces_correcta,
          veces_incorrecta: correct ? card.veces_incorrecta : card.veces_incorrecta + 1,
        })
        .eq("id", card.id);
    }
  }, [cards, correctCount]);

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
          fecha: new Date().toISOString().split('T')[0],
        });
      // Verificar logros después de completar estudio de flashcards
      checkAndUnlockAchievements();
    }
    setStudyState("completed");
  }, [user, selectedDeck, studyTime, checkAndUnlockAchievements]);

  const startStudying = async (deck: Deck) => {
    const fetchedCards = await fetchCards(deck.id);
    if (fetchedCards.length === 0) {
      toast.error("Este mazo no tiene tarjetas");
      return;
    }
    setSelectedDeck(deck);
    setCards(fetchedCards);
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
    await fetchCards(deck.id);
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
          fecha: new Date().toISOString().split('T')[0],
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
      veces_incorrecta: 0
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
        <button
          onClick={() => setShowNewDeckModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-xl font-semibold hover:shadow-lg hover:shadow-neon-cyan/25 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Nuevo Mazo
        </button>
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
          {[1, 2, 3, 4, 5].map(year => (
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
                {[1, 2, 3, 4, 5].map(year => (
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
              cards.map((card) => (
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
              ))
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
                  {[1, 2, 3, 4, 5].map(year => (
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

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {importSourceCards.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Este mazo está vacío.
                  </div>
                ) : (
                  importSourceCards.map(card => (
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
                  ))
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
    </div>
  );
}
