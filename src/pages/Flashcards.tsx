import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layers, Plus, GraduationCap, BookOpen, Zap, Trash2, X, ShoppingBag, Edit2, ShieldCheck, Check, AlertTriangle, Loader2, Search, ArrowRight, Save } from "lucide-react";
import { useMarketplace } from "@/hooks/useMarketplace";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FlashcardDeck } from "@/components/flashcards/FlashcardDeck";
import { StudyMode } from "@/components/flashcards/StudyMode";
import { CompletionScreen } from "@/components/flashcards/CompletionScreen";
import { useAchievements } from "@/hooks/useAchievements";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { toLocalDateStr } from "@/lib/utils";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { HoldButton } from "@/components/ui/HoldButton";
import { TabeLogo } from "@/components/ui/TabeLogo";

interface Deck {
  id: string;
  nombre: string;
  subject_id: string;
  total_cards: number;
  subject?: { nombre: string; codigo: string; año: number };
}

interface Flashcard {
  id: string;
  deck_id?: string;
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

let flashcardDecksCache: Deck[] | null = null;
let flashcardSubjectsCache: Subject[] | null = null;

const FLASHCARDS_CACHE_KEY = "tabe-flashcards-cache";
const FLASHCARDS_SUBJECTS_CACHE_KEY = "tabe-subjects-cache";

function getCachedFlashcardDecks(): Deck[] {
  if (flashcardDecksCache !== null) return flashcardDecksCache;
  try {
    const stored = localStorage.getItem(FLASHCARDS_CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        flashcardDecksCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading flashcard decks cache", e);
  }
  return [];
}

function setCachedFlashcardDecks(decks: Deck[]) {
  flashcardDecksCache = decks;
  try {
    localStorage.setItem(FLASHCARDS_CACHE_KEY, JSON.stringify(decks));
  } catch (e) {
    console.error("Error saving flashcard decks cache", e);
  }
}

function getCachedFlashcardSubjects(): Subject[] {
  if (flashcardSubjectsCache !== null) return flashcardSubjectsCache;
  try {
    const stored = localStorage.getItem(FLASHCARDS_SUBJECTS_CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        flashcardSubjectsCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading flashcard subjects cache", e);
  }
  return [];
}

function setCachedFlashcardSubjects(subs: Subject[]) {
  flashcardSubjectsCache = subs;
  try {
    localStorage.setItem(FLASHCARDS_SUBJECTS_CACHE_KEY, JSON.stringify(subs));
  } catch (e) {
    console.error("Error saving flashcard subjects cache", e);
  }
}

export default function Flashcards() {
  const { user, isGuest } = useAuth();
  const { checkAndUnlockAchievements } = useAchievements();
  const { incrementUsage } = useUsageLimits();
  const [subjects, setSubjects] = useState<Subject[]>(() => getCachedFlashcardSubjects());
  const [decks, setDecks] = useState<Deck[]>(() => getCachedFlashcardDecks());
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const activeYears = useMemo(() => {
    const unique = [...new Set(subjects.map(s => Number(s.año)).filter(y => !isNaN(y) && y > 0))].sort((a, b) => a - b);
    return unique.filter(year => subjects.some(s => Number(s.año) === year));
  }, [subjects]);

  useEffect(() => {
    if (selectedYear !== null && !activeYears.includes(selectedYear)) {
      setSelectedYear(null);
      setSelectedSubject(null);
    }
  }, [activeYears, selectedYear]);

  const { publishResource } = useMarketplace();
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishingDeck, setPublishingDeck] = useState<Deck | null>(null);
  const [pubDescription, setPubDescription] = useState("");
  const [pubCategory, setPubCategory] = useState("");
  const [pubIsAnonymous, setPubIsAnonymous] = useState(false);
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
  const [isDeletingDeck, setIsDeletingDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckYear, setNewDeckYear] = useState<number | null>(null);
  const [newDeckSubject, setNewDeckSubject] = useState<string | null>(null);
  const [newCardQuestion, setNewCardQuestion] = useState("");
  const [newCardAnswer, setNewCardAnswer] = useState("");
  const [loading, setLoading] = useState(() => flashcardDecksCache === null);

  // Edit Deck State
  const [showEditDeckModal, setShowEditDeckModal] = useState(false);
  const [deckToEdit, setDeckToEdit] = useState<Deck | null>(null);
  const [newSubjectId, setNewSubjectId] = useState<string>("");

  // Quick Card Edit State in Manage Modal
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editAnswerText, setEditAnswerText] = useState("");
  const [manageSearchQuery, setManageSearchQuery] = useState("");

  // Import Cards State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTargetDeck, setImportTargetDeck] = useState<Deck | null>(null);
  const [importStep, setImportStep] = useState(1);
  const [importSourceYear, setImportSourceYear] = useState<number | null>(null);
  const [importSourceSubject, setImportSourceSubject] = useState<string | null>(null);
  const [importSourceDeck, setImportSourceDeck] = useState<Deck | null>(null);
  const [importSourceCards, setImportSourceCards] = useState<Flashcard[]>([]);
  const [selectedImportCards, setSelectedImportCards] = useState<string[]>([]);
  const [importSearchQuery, setImportSearchQuery] = useState("");

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

  // Refs for tracking
  const studyTimeRef = useRef(0);
  const selectedDeckRef = useRef<Deck | null>(null);
  const studyStateRef = useRef<StudyState>("browsing");

  useEffect(() => { studyTimeRef.current = studyTime; }, [studyTime]);
  useEffect(() => { selectedDeckRef.current = selectedDeck; }, [selectedDeck]);
  useEffect(() => { studyStateRef.current = studyState; }, [studyState]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (studyState === "studying") {
      interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          setStudyTime(prev => prev + 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [studyState]);

  const fetchSubjects = async () => {
    try {
      if (isGuest) {
        const guestSubs: Subject[] = [{ id: "mock", nombre: "Uso de Tablero", codigo: "TAB1", año: 1 }];
        setCachedFlashcardSubjects(guestSubs);
        setSubjects(guestSubs);
        return guestSubs;
      }
      let query = supabase
        .from("subjects")
        .select("id, nombre, codigo, año")
        .order("año", { ascending: true });

      if (user) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (!error && data) {
        setCachedFlashcardSubjects(data);
        setSubjects(data);
        return data;
      }
    } catch (e) {
      console.error("Error fetching flashcard subjects:", e);
    }
    return getCachedFlashcardSubjects();
  };

  const fetchDecks = async (showLoading = false) => {
    if (!user && !isGuest) {
      setLoading(false);
      return;
    }
    if (showLoading && flashcardDecksCache === null) {
      setLoading(true);
    }

    try {
      if (isGuest) {
        const guestDecks: Deck[] = [
          { id: "mock-deck-1", nombre: "Uso de Flashcards", subject_id: "mock", total_cards: 5, subject: { nombre: "Uso de Tablero", codigo: "TAB1", año: 1 } },
        ];
        setCachedFlashcardDecks(guestDecks);
        setDecks(guestDecks);
        return;
      }

      const { data, error } = await supabase
        .from("flashcard_decks")
        .select("id, user_id, subject_id, nombre, total_cards, created_at, subjects(nombre, codigo, año)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const mapped = data.map((d: any) => ({ ...d, subject: d.subjects }));
        setCachedFlashcardDecks(mapped);
        setDecks(mapped);
      } else {
        const { data: rawData } = await supabase
          .from("flashcard_decks")
          .select("id, user_id, subject_id, nombre, total_cards, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (rawData) {
          const subs = getCachedFlashcardSubjects();
          const mapped = rawData.map((d: any) => {
            const s = subs.find(sub => sub.id === d.subject_id);
            return { ...d, subject: s ? { nombre: s.nombre, codigo: s.codigo, año: s.año } : undefined };
          });
          setCachedFlashcardDecks(mapped);
          setDecks(mapped);
        }
      }
    } catch (err) {
      console.error("Error fetching decks:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    if (!user && !isGuest) {
      setLoading(false);
      return;
    }

    if (flashcardDecksCache === null) {
      setLoading(true);
    }

    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    try {
      await Promise.allSettled([fetchSubjects(), fetchDecks(false)]);
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [user, isGuest]);

  const fetchCards = async (deckId: string) => {
    if (isGuest) {
      if (deckId === "mock-deck-1") {
        const anatomyMocks = [
          { pregunta: "¿Para qué sirven las Flashcards?", respuesta: "Tarjetas de memoria que ayudan a repasar conceptos clave de forma rápida y efectiva." },
          { pregunta: "¿Cómo funciona el sistema de estudio?", respuesta: "Observas la pregunta, piensas la respuesta y volteas la tarjeta para comprobar tu retención." },
          { pregunta: "¿Qué evalúa este modo de estudio?", respuesta: "Evalúa tu recuerdo activo (active recall), reforzando vías neuronales antes de ver la solución." },
          { pregunta: "¿Qué es la repetición espaciada?", respuesta: "Técnica de aprendizaje que programa repasos en intervalos crecientes para fijar datos en la memoria a largo plazo." },
          { pregunta: "¿Cómo me ayuda la IA con las flashcards?", respuesta: "Puedes pedirle en el chat que genere paquetes de tarjetas automáticas desde tus apuntes o notas." },
        ].map((c, i) => ({
          id: `mock-card-1-${i}`,
          deck_id: deckId,
          ...c,
          veces_correcta: 2,
          veces_incorrecta: 0,
          veces_parcial: 1
        }));
        setCards(anatomyMocks);
        return anatomyMocks;
      }
      return [];
    }

    const { data, error } = await supabase
      .from("flashcards")
      .select("id, deck_id, pregunta, respuesta, veces_correcta, veces_incorrecta, created_at")
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
    if (!newDeckName.trim()) {
      toast.error("Por favor, ingresá el nombre del mazo");
      return;
    }

    if (isGuest) {
      const subjectObj = subjects.find(s => s.id === newDeckSubject);
      const newGuestDeck: Deck = {
        id: `mock-deck-${Date.now()}`,
        nombre: newDeckName.trim(),
        subject_id: newDeckSubject || "mock",
        total_cards: 0,
        subject: subjectObj ? { nombre: subjectObj.nombre, codigo: subjectObj.codigo, año: subjectObj.año } : undefined
      };
      const updated = [newGuestDeck, ...decks];
      setDecks(updated);
      setCachedFlashcardDecks(updated);
      setNewDeckName("");
      setNewDeckYear(null);
      setNewDeckSubject(null);
      setShowNewDeckModal(false);
      setSelectedDeck(newGuestDeck);
      setCards([]);
      setShowNewCardModal(true);
      toast.success("¡Mazo creado! Ya podés agregar tus tarjetas.");
      return;
    }

    if (!user) {
      toast.error("Iniciá sesión para guardar tus mazos");
      return;
    }

    try {
      const { data: newDeckData, error } = await supabase
        .from("flashcard_decks")
        .insert({
          user_id: user.id,
          subject_id: newDeckSubject || null,
          nombre: newDeckName.trim(),
        })
        .select("id, user_id, subject_id, nombre, total_cards, created_at")
        .single();

      if (error || !newDeckData) {
        console.error("Error creating deck:", error);
        toast.error(`Error al crear el mazo: ${error?.message || "error al guardar"}`);
        return;
      }

      toast.success("¡Mazo creado! Ya podés cargar tus tarjetas.");
      await incrementUsage('flashcard_mazos');
      const subjectObj = subjects.find(s => s.id === newDeckSubject);
      const fullDeck: Deck = {
        ...newDeckData,
        total_cards: 0,
        subject: subjectObj ? { nombre: subjectObj.nombre, codigo: subjectObj.codigo, año: subjectObj.año } : undefined
      };
      setNewDeckName("");
      setNewDeckYear(null);
      setNewDeckSubject(null);
      setShowNewDeckModal(false);
      setSelectedDeck(fullDeck);
      setCards([]);
      setShowNewCardModal(true);
      fetchDecks();
      checkAndUnlockAchievements();
    } catch (err: any) {
      console.error("Error creating deck exception:", err);
      toast.error("Error al crear el mazo");
    }
  };

  const createCard = async () => {
    if (!selectedDeck || !newCardQuestion.trim() || !newCardAnswer.trim()) return;

    if (isGuest) {
      const newGuestCard: Flashcard = {
        id: `guest-card-${Date.now()}`,
        deck_id: selectedDeck.id,
        pregunta: newCardQuestion.trim(),
        respuesta: newCardAnswer.trim(),
        veces_correcta: 0,
        veces_incorrecta: 0,
        veces_parcial: 0
      };
      const updated = [...cards, newGuestCard];
      setCards(updated);
      setSelectedDeck({ ...selectedDeck, total_cards: updated.length });
      setDecks(prev => prev.map(d => d.id === selectedDeck.id ? { ...d, total_cards: updated.length } : d));
      setNewCardQuestion("");
      setNewCardAnswer("");
      toast.success("¡Tarjeta agregada al mazo!");
      return;
    }

    if (!user) return;

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

      const updatedCards = await fetchCards(selectedDeck.id);
      await supabase
        .from("flashcard_decks")
        .update({ total_cards: updatedCards.length })
        .eq("id", selectedDeck.id);

      setSelectedDeck({ ...selectedDeck, total_cards: updatedCards.length });
      fetchDecks();
      checkAndUnlockAchievements();
    }
  };

  const handleCardResult = useCallback(async (cardId: string, status: 'correct' | 'partial' | 'incorrect') => {
    if (status === 'correct') {
      setCorrectCount(prev => prev + 1);
    }

    if (isGuest) return;

    const card = cards.find(c => c.id === cardId);
    if (card) {
      const updates: any = {};
      if (status === 'correct') updates.veces_correcta = (card.veces_correcta || 0) + 1;
      if (status === 'incorrect') updates.veces_incorrecta = (card.veces_incorrecta || 0) + 1;

      await supabase
        .from("flashcards")
        .update(updates)
        .eq("id", cardId);
    }
  }, [cards, isGuest]);

  const handleStudyComplete = useCallback(async () => {
    if (user && selectedDeck) {
      await supabase
        .from("study_sessions")
        .insert({
          user_id: user.id,
          subject_id: selectedDeck.subject_id,
          duracion_segundos: Math.min(studyTime, 43200),
          tipo: "flashcard",
          completada: true,
          fecha: toLocalDateStr(),
        });
      checkAndUnlockAchievements();
    }
    setStudyState("completed");
  }, [user, selectedDeck, studyTime, checkAndUnlockAchievements]);

  const startStudying = async (deck: Deck, filter: 'all' | 'known' | 'partial' | 'unknown' = 'all') => {
    let fetchedCards = await fetchCards(deck.id);
    if (fetchedCards.length === 0) {
      toast.error("Este mazo no tiene tarjetas aún");
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
        partial: "No hay tarjetas marcadas como 'a medias' todavía",
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
    setManagePage(1);
    setManageSearchQuery("");
    setEditingCardId(null);
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

    if (isGuest) {
      const updated = decks.filter(d => d.id !== deckToDelete.id);
      setDecks(updated);
      setCachedFlashcardDecks(updated);
      toast.success("Mazo eliminado correctamente");
      setShowDeleteDeckModal(false);
      setDeckToDelete(null);
      return;
    }

    setIsDeletingDeck(true);
    try {
      await supabase
        .from("flashcards")
        .delete()
        .eq("deck_id", deckToDelete.id);

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
    } finally {
      setIsDeletingDeck(false);
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

      const updatedCards = cards.filter(c => c.id !== cardId);
      setCards(updatedCards);

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

  const startEditCard = (card: Flashcard) => {
    setEditingCardId(card.id);
    setEditQuestionText(card.pregunta);
    setEditAnswerText(card.respuesta);
  };

  const saveEditCard = async (cardId: string) => {
    if (!editQuestionText.trim() || !editAnswerText.trim()) {
      toast.error("Pregunta y respuesta no pueden estar vacías");
      return;
    }

    if (isGuest) {
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, pregunta: editQuestionText.trim(), respuesta: editAnswerText.trim() } : c));
      setEditingCardId(null);
      toast.success("Tarjeta actualizada");
      return;
    }

    try {
      const { error } = await supabase
        .from("flashcards")
        .update({
          pregunta: editQuestionText.trim(),
          respuesta: editAnswerText.trim(),
        })
        .eq("id", cardId);

      if (error) throw error;

      setCards(prev => prev.map(c => c.id === cardId ? { ...c, pregunta: editQuestionText.trim(), respuesta: editAnswerText.trim() } : c));
      setEditingCardId(null);
      toast.success("Tarjeta actualizada");
    } catch (e) {
      console.error("Error updating card:", e);
      toast.error("Error al guardar cambios de la tarjeta");
    }
  };

  const stopStudying = async () => {
    if (user && selectedDeck && studyTime > 0) {
      await supabase
        .from("study_sessions")
        .insert({
          user_id: user.id,
          subject_id: selectedDeck.subject_id,
          duracion_segundos: Math.min(studyTime, 43200),
          tipo: "flashcard",
          completada: false,
          fecha: toLocalDateStr(),
        });
      toast.success("Progreso de sesión guardado");
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

  const filteredDecks = useMemo(() => {
    return decks.filter(deck => {
      const matchesYear = !selectedYear || deck.subject?.año === selectedYear;
      const matchesSubject = !selectedSubject || deck.subject_id === selectedSubject;
      const matchesSearch = !searchQuery.trim() ||
        deck.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (deck.subject?.nombre && deck.subject.nombre.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesYear && matchesSubject && matchesSearch;
    });
  }, [decks, selectedYear, selectedSubject, searchQuery]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => !selectedYear || s.año === selectedYear);
  }, [subjects, selectedYear]);

  const newDeckModalSubjects = useMemo(() => {
    return subjects.filter(s => !newDeckYear || s.año === newDeckYear);
  }, [subjects, newDeckYear]);

  // Edit Deck Functions
  const handleEditDeck = (deck: Deck) => {
    setDeckToEdit(deck);
    setNewSubjectId(deck.subject_id || "none");
    setShowEditDeckModal(true);
  };

  const saveDeckSubject = async () => {
    if (!deckToEdit) return;
    const subjectIdToSave = newSubjectId === "none" ? null : newSubjectId;

    if (isGuest) {
      const s = subjects.find(sub => sub.id === subjectIdToSave);
      const updated = decks.map(d => d.id === deckToEdit.id ? { ...d, subject_id: subjectIdToSave || "", subject: s ? { nombre: s.nombre, codigo: s.codigo, año: s.año } : undefined } : d);
      setDecks(updated);
      setCachedFlashcardDecks(updated);
      toast.success("Materia actualizada");
      setShowEditDeckModal(false);
      return;
    }

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
    setImportSearchQuery("");
  };

  const handleImportSelectDeck = async (sourceDeck: Deck) => {
    setImportSourceDeck(sourceDeck);
    const fetched = await fetchCards(sourceDeck.id);
    setImportSourceCards(fetched || []);
    setImportPage(1);
    setImportStep(2);
  };

  const handleImportConfirm = async () => {
    if (!importTargetDeck || selectedImportCards.length === 0) return;

    const cardsToCopy = importSourceCards.filter(c => selectedImportCards.includes(c.id));

    if (isGuest) {
      const newGuestCards = cardsToCopy.map((c, i) => ({
        id: `guest-imported-${Date.now()}-${i}`,
        deck_id: importTargetDeck.id,
        pregunta: c.pregunta,
        respuesta: c.respuesta,
        veces_correcta: 0,
        veces_incorrecta: 0,
        veces_parcial: 0
      }));
      setDecks(prev => prev.map(d => d.id === importTargetDeck.id ? { ...d, total_cards: d.total_cards + newGuestCards.length } : d));
      toast.success(`${newGuestCards.length} tarjetas importadas`);
      setShowImportModal(false);
      return;
    }

    if (!user) return;

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
      toast.error("Error al importar tarjetas");
    } else {
      toast.success(`${newCards.length} tarjetas importadas`);
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

  const selectAllImportCards = (filteredCards: Flashcard[]) => {
    const allFilteredIds = filteredCards.map(c => c.id);
    const allSelected = allFilteredIds.every(id => selectedImportCards.includes(id));
    if (allSelected) {
      setSelectedImportCards(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedImportCards(prev => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  const handleMergeDecks = async () => {
    if (selectedDecksToMerge.length < 2 || !mergeNewDeckName.trim() || !mergeSubjectId) {
      toast.error("Completa todos los campos y selecciona al menos 2 mazos");
      return;
    }
    setIsMerging(true);
    try {
      if (isGuest) {
        const subjectObj = subjects.find(s => s.id === mergeSubjectId);
        const newMergedDeck: Deck = {
          id: `mock-merged-${Date.now()}`,
          nombre: mergeNewDeckName.trim(),
          subject_id: mergeSubjectId,
          total_cards: 10,
          subject: subjectObj ? { nombre: subjectObj.nombre, codigo: subjectObj.codigo, año: subjectObj.año } : undefined
        };
        setDecks(prev => [newMergedDeck, ...prev]);
        toast.success(`¡Mazo "${mergeNewDeckName}" creado con éxito!`);
        setShowMergeModal(false);
        resetMergeState();
        return;
      }

      if (!user) return;

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
    const success = await publishResource("deck", publishingDeck.id, pubDescription, pubCategory, pubIsAnonymous);
    if (success) {
      setShowPublishModal(false);
      setPublishingDeck(null);
      setPubDescription("");
      setPubCategory("");
      setPubIsAnonymous(false);
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

  const filteredSourceDecks = useMemo(() => {
    return decks.filter(deck => {
      if (deck.id === importTargetDeck?.id) return false;
      const matchesYear = !importSourceYear || deck.subject?.año === importSourceYear;
      const matchesSubject = !importSourceSubject || deck.subject_id === importSourceSubject;
      return matchesYear && matchesSubject;
    });
  }, [decks, importTargetDeck, importSourceYear, importSourceSubject]);

  const filteredSourceSubjects = useMemo(() => {
    return subjects.filter(s => !importSourceYear || s.año === importSourceYear);
  }, [subjects, importSourceYear]);

  // Filtered cards in Manage modal
  const filteredManageCards = useMemo(() => {
    if (!manageSearchQuery.trim()) return cards;
    const query = manageSearchQuery.toLowerCase();
    return cards.filter(c => c.pregunta.toLowerCase().includes(query) || c.respuesta.toLowerCase().includes(query));
  }, [cards, manageSearchQuery]);

  // Filtered cards in Import modal Step 2
  const filteredImportCards = useMemo(() => {
    if (!importSearchQuery.trim()) return importSourceCards;
    const query = importSearchQuery.toLowerCase();
    return importSourceCards.filter(c => c.pregunta.toLowerCase().includes(query) || c.respuesta.toLowerCase().includes(query));
  }, [importSourceCards, importSearchQuery]);

  // Suggested community categories
  const suggestedCategories = ["Medicina", "Ingeniería", "Programación", "Derecho", "Psicología", "Idiomas"];

  // Study Mode Active View
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

  // Completion Screen View
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

  // Browsing Mode View
  return (
    <div className="tabe-page p-4 lg:p-7 space-y-5 min-h-screen max-w-7xl mx-auto">
      {/* Header Notion/ChatGPT */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 p-5 sm:p-6 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0 shadow-2xs text-zinc-700 dark:text-zinc-300">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Flashcards
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Tarjetas de memoria para repasar conceptos y definiciones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMergeModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            Fusionar Mazos
          </button>
          <button
            onClick={() => setShowNewDeckModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Mazo
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono leading-none">{decks.length}</p>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 truncate">Mazos activos</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono leading-none">
              {decks.reduce((acc, d) => acc + d.total_cards, 0)}
            </p>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 truncate">Tarjetas totales</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono leading-none">
              {new Set(decks.map(d => d.subject_id).filter(Boolean)).size}
            </p>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 truncate">Materias vinculadas</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs col-span-2 lg:col-span-1">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">FlashCards</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">De los mejores metodos para practicar la memoria del estudiante</p>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        {/* Buscador de mazos */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar mazo o materia..."
            className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filtros de año y materia */}
        <div className="flex flex-col gap-2.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/80 overflow-x-auto">
              <button
                onClick={() => { setSelectedYear(null); setSelectedSubject(null); }}
                className={cn(
                  "relative px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap select-none",
                  !selectedYear
                    ? "text-white dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                {!selectedYear && (
                  <motion.span
                    layoutId="flashcards-year-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-zinc-100 shadow-2xs"
                  />
                )}
                <span className="relative z-10">Todos los años</span>
              </button>
              {activeYears.map(year => {
                const isSelected = selectedYear === year;
                return (
                  <button
                    key={year}
                    onClick={() => { setSelectedYear(year); setSelectedSubject(null); }}
                    className={cn(
                      "relative px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap select-none",
                      isSelected
                        ? "text-white dark:text-zinc-900"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="flashcards-year-pill"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-zinc-100 shadow-2xs"
                      />
                    )}
                    <span className="relative z-10">{year}° Año</span>
                  </button>
                );
              })}
            </div>
          </div>

          {subjects.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mr-1 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                Materias:
              </span>
              <button
                type="button"
                onClick={() => setSelectedSubject(null)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border",
                  !selectedSubject
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                    : "bg-white dark:bg-[#212121] text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                )}
              >
                Todas
              </button>
              <AnimatePresence mode="popLayout">
                {filteredSubjects.map(subject => {
                  const isSubSelected = selectedSubject === subject.id;
                  return (
                    <motion.button
                      layout
                      key={subject.id}
                      type="button"
                      initial={{ opacity: 0, scale: 0.82, y: 6, filter: "blur(4px)" }}
                      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.78, y: -6, filter: "blur(4px)", transition: { duration: 0.18, ease: [0.32, 0, 0.67, 0] } }}
                      transition={{
                        layout: { type: "spring", stiffness: 380, damping: 28, mass: 0.7 },
                        duration: 0.22,
                      }}
                      onClick={() => setSelectedSubject(isSubSelected ? null : subject.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border truncate max-w-[200px]",
                        isSubSelected
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                          : "bg-white dark:bg-[#212121] text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      )}
                    >
                      {subject.nombre}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Grid de Mazos */}
      <div className="tour-flashcards-decks">
        {loading ? (
          <LoadingScreen message="Cargando flashcards..." submessage="Preparando tus mazos de estudio y repaso espaciado" />
        ) : filteredDecks.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-8">
            <div className="w-11 h-11 mx-auto mb-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-400 dark:text-zinc-500 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              {searchQuery || selectedYear || selectedSubject ? "No se encontraron mazos con estos filtros" : "No hay mazos creados"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 max-w-sm mx-auto">
              {searchQuery || selectedYear || selectedSubject
                ? "Prueba con otra palabra clave o limpia los filtros activos para ver tus mazos."
                : "Crea tu primer mazo para empezar a estudiar de forma interactiva con repetición espaciada."}
            </p>
            {searchQuery || selectedYear || selectedSubject ? (
              <button
                onClick={() => { setSearchQuery(""); setSelectedYear(null); setSelectedSubject(null); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-colors border border-zinc-200/60 dark:border-zinc-700/60 cursor-pointer"
              >
                Limpiar filtros
              </button>
            ) : (
              <button
                onClick={() => setShowNewDeckModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Crear primer mazo
              </button>
            )}
          </div>
        ) : (
          <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <AnimatePresence mode="popLayout">
              {filteredDecks.map((deck, index) => (
                <motion.div
                  layout
                  key={deck.id}
                  initial={{ opacity: 0, scale: 0.88, y: 14, filter: "blur(5px)" }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                  exit={{
                    opacity: 0,
                    scale: 0.84,
                    y: -12,
                    filter: "blur(6px)",
                    transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] },
                  }}
                  transition={{
                    layout: { type: "spring", stiffness: 360, damping: 28, mass: 0.72 },
                    duration: 0.26,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="h-full"
                >
                  <FlashcardDeck
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
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── MODAL 1: NUEVO MAZO ── */}
      <Dialog open={showNewDeckModal} onOpenChange={setShowNewDeckModal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl p-5 sm:p-6">
          <DialogHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
            <DialogTitle className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-500" />
              Nuevo Mazo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                Nombre del mazo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder="Ej: Unidad 1 - Fisiología Celular"
                className="w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newDeckName.trim()) {
                    createDeck();
                  }
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Vincular a Materia (Opcional)</label>
                {newDeckYear && (
                  <button
                    type="button"
                    onClick={() => { setNewDeckYear(null); setNewDeckSubject(null); }}
                    className="text-[11px] font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    Quitar filtro
                  </button>
                )}
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {(activeYears.length > 0 ? activeYears : [1, 2, 3, 4, 5, 6]).map(year => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      if (newDeckYear === year) {
                        setNewDeckYear(null);
                        setNewDeckSubject(null);
                      } else {
                        setNewDeckYear(year);
                        setNewDeckSubject(null);
                      }
                    }}
                    className={cn(
                      "py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                      newDeckYear === year
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                        : "bg-white dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    {year}°
                  </button>
                ))}
              </div>
            </div>

            {newDeckYear && newDeckModalSubjects.length > 0 && (
              <div className="space-y-1 animate-fade-in">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block">Materia</label>
                <Select value={newDeckSubject || "none"} onValueChange={(val) => setNewDeckSubject(val === "none" ? null : val)}>
                  <SelectTrigger className="w-full h-9 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors shadow-2xs">
                    <SelectValue placeholder="Seleccionar materia" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg rounded-xl max-h-56 text-xs">
                    <SelectItem value="none" textValue="General (Sin materia específica)" className="py-1.5 cursor-pointer">
                      <span className="flex items-center gap-2">
                        <TabeLogo size={14} className="shrink-0 object-contain" />
                        <span>General (Sin materia específica)</span>
                      </span>
                    </SelectItem>
                    {newDeckModalSubjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id} className="py-1.5 cursor-pointer">
                        {subject.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowNewDeckModal(false)}
                className="border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={createDeck}
                disabled={!newDeckName.trim()}
                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg px-4 py-1.5 text-xs font-medium transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Crear Mazo
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: NUEVA TARJETA ── */}
      <Dialog open={showNewCardModal} onOpenChange={setShowNewCardModal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl p-5 sm:p-6">
          <DialogHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-zinc-500" />
                Nueva Tarjeta
              </DialogTitle>
              {selectedDeck && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 max-w-[150px] truncate">
                  {selectedDeck.nombre}
                </span>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-3.5 pt-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                Pregunta o Concepto <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={newCardQuestion}
                onChange={(e) => setNewCardQuestion(e.target.value)}
                placeholder="Escribe la pregunta, término o fórmula a memorizar..."
                rows={3}
                className="w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors resize-none"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                Respuesta o Definición <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={newCardAnswer}
                onChange={(e) => setNewCardAnswer(e.target.value)}
                placeholder="Escribe la respuesta esperada o explicación concisa..."
                rows={3}
                className="w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors resize-none"
              />
            </div>

            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              💡 Tip: respuestas breves y directas facilitan el active recall y la memorización espaciada.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowNewCardModal(false)}
                className="border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={createCard}
                disabled={!newCardQuestion.trim() || !newCardAnswer.trim()}
                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg px-4 py-1.5 text-xs font-medium transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Agregar Tarjeta
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: GESTIONAR TARJETAS CON BÚSQUEDA Y EDICIÓN INLINE ── */}
      <Dialog open={showManageCardsModal} onOpenChange={setShowManageCardsModal}>
        <DialogContent className="sm:max-w-xl bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl p-5 sm:p-6 max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-zinc-500" />
                <span>Gestionar Tarjetas</span>
              </DialogTitle>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                {selectedDeck?.nombre} ({cards.length})
              </span>
            </div>

            {/* Buscador dentro del mazo */}
            {cards.length > 3 && (
              <div className="relative mt-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={manageSearchQuery}
                  onChange={(e) => {
                    setManageSearchQuery(e.target.value);
                    setManagePage(1);
                  }}
                  placeholder="Buscar en preguntas o respuestas..."
                  className="w-full pl-8.5 pr-7 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors"
                />
                {manageSearchQuery && (
                  <button
                    onClick={() => setManageSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
            {cards.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 dark:text-zinc-400">
                <Layers className="w-9 h-9 mx-auto mb-2 text-zinc-400 dark:text-zinc-600 opacity-60" />
                <p className="text-xs font-medium">Este mazo aún no tiene tarjetas</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Haz clic en "Agregar Tarjeta" para comenzar a cargarlas</p>
              </div>
            ) : filteredManageCards.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-500">
                No hay tarjetas que coincidan con "{manageSearchQuery}"
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {filteredManageCards.slice((managePage - 1) * ITEMS_PER_PAGE, managePage * ITEMS_PER_PAGE).map((card) => {
                    const isEditing = editingCardId === card.id;

                    return (
                      <div
                        key={card.id}
                        className="p-3 bg-zinc-50/70 dark:bg-zinc-900/60 rounded-lg border border-zinc-200/70 dark:border-zinc-800/70 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                      >
                        {isEditing ? (
                          <div className="space-y-2 animate-fade-in">
                            <input
                              type="text"
                              value={editQuestionText}
                              onChange={(e) => setEditQuestionText(e.target.value)}
                              placeholder="Pregunta..."
                              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                              autoFocus
                            />
                            <textarea
                              value={editAnswerText}
                              onChange={(e) => setEditAnswerText(e.target.value)}
                              placeholder="Respuesta..."
                              rows={2}
                              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none"
                            />
                            <div className="flex items-center justify-end gap-1.5 pt-1">
                              <button
                                onClick={() => setEditingCardId(null)}
                                className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => saveEditCard(card.id)}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-md text-xs font-medium shadow-2xs"
                              >
                                <Save className="w-3 h-3" />
                                Guardar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2">
                                {card.pregunta}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                                {card.respuesta}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-[11px] font-mono">
                                <span className="text-emerald-600 dark:text-emerald-400">✓ {card.veces_correcta}</span>
                                <span className="text-rose-500 dark:text-rose-400">✗ {card.veces_incorrecta}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => startEditCard(card)}
                                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
                                title="Editar tarjeta"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <HoldButton
                                size="icon-sm"
                                radius={8}
                                backgroundColor="transparent"
                                fillColor="#f43f5e"
                                textColor="currentColor"
                                fillTextColor="#ffffff"
                                holdTime={1100}
                                icon={<Trash2 className="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-500 transition-colors" />}
                                doneIcon={<Check className="w-3.5 h-3.5 text-white" />}
                                doneLabel=""
                                onHold={() => deleteCard(card.id)}
                                className="rounded-md transition-colors hover:bg-rose-500/10 shrink-0 cursor-pointer"
                                title="Mantén presionado para borrar esta tarjeta"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {filteredManageCards.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between gap-3 pt-3 px-1">
                    <button
                      disabled={managePage === 1}
                      onClick={() => setManagePage(p => p - 1)}
                      className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                      {managePage} / {Math.ceil(filteredManageCards.length / ITEMS_PER_PAGE)}
                    </span>
                    <button
                      disabled={managePage === Math.ceil(filteredManageCards.length / ITEMS_PER_PAGE)}
                      onClick={() => setManagePage(p => p + 1)}
                      className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-3 mt-auto border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-mono">
              Total: {cards.length} tarjetas
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowManageCardsModal(false)}
                className="border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setShowManageCardsModal(false);
                  setShowNewCardModal(true);
                }}
                className="inline-flex items-center gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Tarjeta
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 4: EDITAR MATERIA DEL MAZO ── */}
      <Dialog open={showEditDeckModal} onOpenChange={setShowEditDeckModal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl p-5 sm:p-6">
          <DialogHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
            <DialogTitle className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-zinc-500" />
              Editar Materia - {deckToEdit?.nombre}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Asigna o modifica la materia vinculada a este mazo para mantenerlo categorizado correctamente.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block">Materia</label>
              <Select value={newSubjectId} onValueChange={setNewSubjectId}>
                <SelectTrigger className="w-full h-9 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs">
                  <SelectValue placeholder="Seleccionar materia..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg rounded-xl max-h-56 text-xs">
                  <SelectItem value="none" textValue="Sin materia vinculada" className="py-1.5 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <TabeLogo size={14} className="shrink-0 object-contain" />
                      <span>Sin materia vinculada</span>
                    </span>
                  </SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id} className="py-1.5 cursor-pointer">
                      {subject.nombre} ({subject.año}° Año)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowEditDeckModal(false)}
                className="border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={saveDeckSubject}
                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg px-4 py-1.5 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 5: IMPORTAR TARJETAS ── */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl p-5 sm:p-6 max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
            <DialogTitle className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="truncate">Importar a "{importTargetDeck?.nombre}"</span>
            </DialogTitle>
          </DialogHeader>

          {importStep === 1 ? (
            <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Selecciona un mazo de origen para clonar o importar sus tarjetas hacia este mazo.
              </p>

              {/* Filtro por Año */}
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">Filtrar por Año</label>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <button
                    onClick={() => { setImportSourceYear(null); setImportSourceSubject(null); }}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer border",
                      !importSourceYear
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                        : "bg-white dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    Todos
                  </button>
                  {(activeYears.length > 0 ? activeYears : [1, 2, 3, 4, 5, 6]).map(year => (
                    <button
                      key={year}
                      onClick={() => { setImportSourceYear(year); setImportSourceSubject(null); }}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border",
                        importSourceYear === year
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                          : "bg-white dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      )}
                    >
                      {year}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro por Materia con Select */}
              {importSourceYear && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block">Filtrar por Materia</label>
                  <Select value={importSourceSubject || "all"} onValueChange={(val) => setImportSourceSubject(val === "all" ? null : val)}>
                    <SelectTrigger className="w-full h-9 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs">
                      <SelectValue placeholder="Todas las materias" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg rounded-xl text-xs">
                      <SelectItem value="all" className="cursor-pointer py-1.5">Todas las materias</SelectItem>
                      {filteredSourceSubjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id} className="cursor-pointer py-1.5">{subject.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Lista de Mazos Disponibles */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block">
                  Seleccionar Mazo ({filteredSourceDecks.length})
                </label>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredSourceDecks.length === 0 ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 italic py-3 text-center">No se encontraron otros mazos disponibles.</p>
                  ) : (
                    filteredSourceDecks.map(deck => (
                      <button
                        key={deck.id}
                        onClick={() => handleImportSelectDeck(deck)}
                        className="w-full p-3 bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-left flex justify-between items-center group cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors truncate">{deck.nombre}</p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{deck.subject?.nombre || "Sin materia"}</p>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                          {deck.total_cards} {deck.total_cards === 1 ? "carta" : "cartas"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col py-3">
              <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
                <button
                  onClick={() => setImportStep(1)}
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  ← Volver a mazos
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    {selectedImportCards.length} seleccionadas
                  </span>
                  <button
                    onClick={() => selectAllImportCards(filteredImportCards)}
                    className="text-xs px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    {filteredImportCards.every(c => selectedImportCards.includes(c.id)) ? "Deseleccionar" : "Seleccionar todas"}
                  </button>
                </div>
              </div>

              {/* Buscador dentro del mazo origen */}
              {importSourceCards.length > 3 && (
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    value={importSearchQuery}
                    onChange={(e) => {
                      setImportSearchQuery(e.target.value);
                      setImportPage(1);
                    }}
                    placeholder="Filtrar tarjetas..."
                    className="w-full pl-8.5 pr-3 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                  />
                </div>
              )}

              <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
                {filteredImportCards.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-500">
                    No se encontraron tarjetas en este mazo.
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      {filteredImportCards.slice((importPage - 1) * ITEMS_PER_PAGE, importPage * ITEMS_PER_PAGE).map(card => {
                        const isSelected = selectedImportCards.includes(card.id);
                        return (
                          <div
                            key={card.id}
                            onClick={() => toggleImportCardSelection(card.id)}
                            className={cn(
                              "p-2.5 rounded-lg border cursor-pointer transition-colors flex items-start gap-2.5 select-none",
                              isSelected
                                ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-400 dark:border-zinc-600"
                                : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                              isSelected
                                ? "bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100 text-white dark:text-zinc-900"
                                : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                            )}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">{card.pregunta}</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">{card.respuesta}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredImportCards.length > ITEMS_PER_PAGE && (
                      <div className="flex items-center justify-between gap-3 pt-2 px-1">
                        <button
                          disabled={importPage === 1}
                          onClick={() => setImportPage(p => p - 1)}
                          className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          Anterior
                        </button>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                          {importPage} / {Math.ceil(filteredImportCards.length / ITEMS_PER_PAGE)}
                        </span>
                        <button
                          disabled={importPage === Math.ceil(filteredImportCards.length / ITEMS_PER_PAGE)}
                          onClick={() => setImportPage(p => p + 1)}
                          className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          Siguiente
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="pt-3 mt-auto border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportConfirm}
                  disabled={selectedImportCards.length === 0}
                  className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg px-4 py-1.5 text-xs font-medium transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Importar {selectedImportCards.length} {selectedImportCards.length === 1 ? "tarjeta" : "tarjetas"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL 6: FUSIONAR MAZOS ── */}
      <Dialog open={showMergeModal} onOpenChange={setShowMergeModal}>
        <DialogContent className="sm:max-w-xl bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl p-5 sm:p-6 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
            <DialogTitle className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-500" />
              Fusionar Mazos
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  1. Seleccionar Mazos a Combinar
                </label>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  {selectedDecksToMerge.length} seleccionados (mínimo 2)
                </span>
              </div>

              {/* Filtros de mazos de origen */}
              <div className="space-y-2 bg-zinc-50/70 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80">
                <div className="flex gap-1 overflow-x-auto pb-1">
                  <button
                    onClick={() => { setMergeSourceYearFilter(null); setMergeSourceSubjectFilter(null); }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer border",
                      !mergeSourceYearFilter
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                        : "bg-white dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    Todos
                  </button>
                  {(activeYears.length > 0 ? activeYears : [1, 2, 3, 4, 5, 6]).map(year => (
                    <button
                      key={year}
                      onClick={() => { setMergeSourceYearFilter(year); setMergeSourceSubjectFilter(null); }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer border",
                        mergeSourceYearFilter === year
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                          : "bg-white dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      )}
                    >
                      {year}° Año
                    </button>
                  ))}
                </div>

                {mergeSourceYearFilter && (
                  <Select value={mergeSourceSubjectFilter || "all"} onValueChange={(val) => setMergeSourceSubjectFilter(val === "all" ? null : val)}>
                    <SelectTrigger className="w-full h-8 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/80 px-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs">
                      <SelectValue placeholder="Todas las materias del año" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg rounded-xl text-xs">
                      <SelectItem value="all" className="cursor-pointer py-1.5">Todas las materias del año</SelectItem>
                      {subjects.filter(s => s.año === mergeSourceYearFilter).map(s => (
                        <SelectItem key={s.id} value={s.id} className="cursor-pointer py-1.5">{s.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Lista seleccionable de mazos */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {decks
                  .filter(deck => {
                    const matchesYear = !mergeSourceYearFilter || deck.subject?.año === mergeSourceYearFilter;
                    const matchesSubject = !mergeSourceSubjectFilter || deck.subject_id === mergeSourceSubjectFilter;
                    return matchesYear && matchesSubject;
                  })
                  .map(deck => {
                    const isSelected = selectedDecksToMerge.includes(deck.id);
                    return (
                      <div
                        key={deck.id}
                        onClick={() => toggleMergeDeckSelection(deck.id)}
                        className={cn(
                          "p-2.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-between group select-none",
                          isSelected
                            ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-400 dark:border-zinc-600"
                            : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                            isSelected
                              ? "bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100 text-white dark:text-zinc-900"
                              : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                          )}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{deck.nombre}</p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{deck.subject?.nombre || "Sin materia"}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                          {deck.total_cards} {deck.total_cards === 1 ? "carta" : "cartas"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Configurar nuevo mazo fusionado */}
            <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                2. Configurar Nuevo Mazo Combinado
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">Año</label>
                  <div className="flex gap-1 overflow-x-auto pb-0.5">
                    {(activeYears.length > 0 ? activeYears : [1, 2, 3, 4, 5, 6]).map(year => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => { setMergeYear(year); setMergeSubjectId(null); }}
                        className={cn(
                          "w-7 h-7 rounded-lg text-xs font-medium transition-colors border shrink-0 cursor-pointer",
                          mergeYear === year
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                            : "bg-white dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        )}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">Materia Destino</label>
                  <Select disabled={!mergeYear} value={mergeSubjectId || ""} onValueChange={setMergeSubjectId}>
                    <SelectTrigger className="w-full h-8 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 disabled:opacity-40 shadow-2xs">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg rounded-xl text-xs">
                      {subjects.filter(s => s.año === mergeYear).map(s => (
                        <SelectItem key={s.id} value={s.id} className="cursor-pointer py-1.5">{s.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">Nombre del Mazo Combinado</label>
                <input
                  type="text"
                  value={mergeNewDeckName}
                  onChange={(e) => setMergeNewDeckName(e.target.value)}
                  placeholder="Ej: Repaso General - Primer Parcial"
                  className="w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 py-1.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 mt-auto border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowMergeModal(false)}
              className="border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleMergeDecks}
              disabled={isMerging || selectedDecksToMerge.length < 2 || !mergeNewDeckName.trim() || !mergeSubjectId}
              className="inline-flex items-center gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg px-4 py-1.5 text-xs font-medium transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isMerging ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Combinando...
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  Confirmar Combinación
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 7: ELIMINAR MAZO CON SEGURIDAD ── */}
      <Dialog
        open={showDeleteDeckModal}
        onOpenChange={(open) => {
          if (!isDeletingDeck) {
            setShowDeleteDeckModal(open);
            if (!open) setDeckToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl p-5 sm:p-6 overflow-hidden">
          <DialogHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Eliminar Mazo
                </DialogTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Confirmación de seguridad requerida
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Preview del mazo */}
          <div className="my-2 p-3 rounded-lg bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                  Mazo seleccionado
                </span>
                <h4 className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate" title={deckToDelete?.nombre}>
                  {deckToDelete?.nombre}
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                {deckToDelete?.subject?.nombre || "General"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs text-zinc-500 dark:text-zinc-400">
              <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>
                Contiene <strong className="text-zinc-800 dark:text-zinc-200 font-semibold font-mono">{deckToDelete?.total_cards ?? 0}</strong> {deckToDelete?.total_cards === 1 ? "tarjeta" : "tarjetas"} de estudio
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
              Esta acción no se puede deshacer. Se eliminarán todas las tarjetas y estadísticas de repaso acumuladas.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={() => setShowDeleteDeckModal(false)}
              disabled={isDeletingDeck}
              className="border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <HoldButton
              backgroundColor="#dc2626"
              fillColor="#991b1b"
              textColor="#ffffff"
              fillTextColor="#ffffff"
              radius={8}
              size="sm"
              holdTime={1400}
              icon={<Trash2 className="w-3.5 h-3.5" />}
              doneIcon={<Check className="w-3.5 h-3.5" />}
              doneLabel="¡Mazo Eliminado!"
              disabled={isDeletingDeck}
              onHold={confirmDeleteDeck}
              className="rounded-lg px-3.5 py-1.5 text-xs font-medium cursor-pointer shadow-2xs border-0"
            >
              Mantener para eliminar
            </HoldButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 8: PUBLICAR EN LA COMUNIDAD ── */}
      <Dialog open={showPublishModal} onOpenChange={(open) => {
        setShowPublishModal(open);
        if (!open) setPubIsAnonymous(false);
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl p-5 sm:p-6">
          <DialogHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
            <DialogTitle className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-zinc-500" />
              Publicar mazo en la Comunidad
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 pt-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                Descripción <span className="text-rose-500">*</span>
              </label>
              <textarea
                className="w-full h-20 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors resize-none"
                placeholder="Describe qué conceptos o unidades contiene este mazo..."
                value={pubDescription}
                onChange={(e) => setPubDescription(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                Categoría <span className="text-rose-500">*</span>
              </label>
              <input
                className="w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 py-1.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors"
                placeholder="Ej: Medicina, Ingeniería, Historia..."
                value={pubCategory}
                onChange={(e) => setPubCategory(e.target.value)}
              />
              {/* Categorías sugeridas en un click */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {suggestedCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPubCategory(cat)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer",
                      pubCategory === cat
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-700/60 hover:bg-zinc-200"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle anónimo estilo Notion */}
            <div
              onClick={() => setPubIsAnonymous(!pubIsAnonymous)}
              className={cn(
                "p-2.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-between select-none",
                pubIsAnonymous
                  ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-400 dark:border-zinc-600"
                  : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                  pubIsAnonymous
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                    : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200/80 dark:border-zinc-800/80"
                )}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-xs text-zinc-900 dark:text-zinc-100">Publicar como anónimo</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    Oculta tu perfil y carrera ante los demás usuarios.
                  </p>
                </div>
              </div>
              <div className={cn(
                "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                pubIsAnonymous
                  ? "bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100 text-white dark:text-zinc-900"
                  : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              )}>
                {pubIsAnonymous && <Check className="w-3 h-3" />}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handlePublishDeck}
                disabled={isPublishing || !pubDescription.trim() || !pubCategory.trim()}
                className="inline-flex items-center gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg px-4 py-1.5 text-xs font-medium transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  "Publicar Ahora"
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
