import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PublicDeck {
  id: string;
  nombre: string;
  description: string | null;
  category: string | null;
  total_cards: number;
  download_count: number;
  rating_sum: number;
  rating_count: number;
  user_id: string;
  subject_id: string;
  created_at: string;
  creator?: {
    username: string | null;
    display_id: number;
    nombre: string | null;
    nivel: number;
  };
  subject?: {
    nombre: string;
    year: number;
  };
}

interface FlashcardPreview {
  id: string;
  pregunta: string;
  respuesta: string;
}

interface ProfileData {
  user_id: string;
  username: string | null;
  display_id: number;
  nombre: string | null;
}

interface SubjectData {
  id: string;
  nombre: string;
  year: number;
}

export function useMarketplace() {
  const { user } = useAuth();
  const [publicDecks, setPublicDecks] = useState<PublicDeck[]>([]);
  const [myPublicDecks, setMyPublicDecks] = useState<PublicDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);

  const fetchPublicDecks = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("flashcard_decks")
      .select(`
        id, nombre, description, category, total_cards, 
        download_count, rating_sum, rating_count, user_id, 
        subject_id, created_at
      `)
      .eq("is_public", true)
      .gt("total_cards", 0)
      .order("download_count", { ascending: false });

    if (categoryFilter) {
      query = query.eq("category", categoryFilter);
    }

    const { data: decks, error } = await query;

    if (error) {
      console.error("Error fetching public decks:", error);
      setLoading(false);
      return;
    }

    // Get creator profiles and stats
    const userIds = [...new Set((decks || []).map(d => d.user_id))];
    const subjectIds = [...new Set((decks || []).map(d => d.subject_id))];

    const [profilesResult, statsResult, subjectsResult] = await Promise.all([
      supabase.from("profiles").select("user_id, username, display_id, nombre").in("user_id", userIds),
      supabase.from("user_stats").select("user_id, nivel").in("user_id", userIds),
      supabase.from("subjects").select("id, nombre, numero_materia").in("id", subjectIds)
    ]);

    const profileMap = new Map<string, ProfileData>((profilesResult.data || []).map((p: ProfileData) => [p.user_id, p]));
    const statsMap = new Map((statsResult.data || []).map(s => [s.user_id, s]));

    // Map subjects with correct field names
    const subjectMap = new Map<string, SubjectData>();
    (subjectsResult.data || []).forEach((s: { id: string; nombre: string; numero_materia: number }) => {
      subjectMap.set(s.id, { id: s.id, nombre: s.nombre, year: Math.ceil(s.numero_materia / 10) });
    });

    const enrichedDecks: PublicDeck[] = (decks || []).map(deck => {
      const profile = profileMap.get(deck.user_id);
      const stats = statsMap.get(deck.user_id);
      const subject = subjectMap.get(deck.subject_id);

      return {
        ...deck,
        creator: profile ? {
          username: profile.username || "Usuario",
          display_id: profile.display_id,
          nombre: profile.nombre || (profile.username ? null : "Usuario"),
          nivel: stats?.nivel || 1
        } : undefined,
        subject: subject ? {
          nombre: subject.nombre,
          year: subject.year
        } : undefined
      };
    });

    // Filter by search term, year and subject
    let filtered = enrichedDecks;

    if (searchTerm) {
      filtered = filtered.filter(d =>
        d.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.subject?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (yearFilter) {
      filtered = filtered.filter(d => d.subject?.year === yearFilter);
    }

    if (subjectFilter) {
      filtered = filtered.filter(d => d.subject_id === subjectFilter);
    }

    setPublicDecks(filtered);
    setLoading(false);
  }, [categoryFilter, searchTerm, yearFilter, subjectFilter]);

  const fetchMyPublicDecks = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("flashcard_decks")
      .select("id, nombre, description, category, total_cards, download_count, rating_sum, rating_count, user_id, subject_id, created_at")
      .eq("user_id", user.id)
      .eq("is_public", true);

    setMyPublicDecks((data || []) as PublicDeck[]);
  }, [user]);

  const getCategories = useCallback(async () => {
    const { data } = await supabase
      .from("flashcard_decks")
      .select("category")
      .eq("is_public", true)
      .not("category", "is", null);

    const categories = [...new Set((data || []).map(d => d.category).filter(Boolean))];
    return categories as string[];
  }, []);

  const publishDeck = async (deckId: string, description: string, category: string) => {
    const { error } = await supabase
      .from("flashcard_decks")
      .update({ is_public: true, description, category })
      .eq("id", deckId);

    if (error) {
      toast.error("Error al publicar mazo");
      return false;
    }

    toast.success("¡Mazo publicado en el marketplace!");
    await fetchMyPublicDecks();
    return true;
  };

  const unpublishDeck = async (deckId: string) => {
    const { error } = await supabase
      .from("flashcard_decks")
      .update({ is_public: false })
      .eq("id", deckId);

    if (error) {
      toast.error("Error al despublicar mazo");
      return false;
    }

    toast.success("Mazo retirado del marketplace");
    await fetchMyPublicDecks();
    return true;
  };

  const getDeckPreview = async (deckId: string): Promise<FlashcardPreview[]> => {
    const { data } = await supabase
      .from("flashcards")
      .select("id, pregunta, respuesta")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: true });

    return (data || []) as FlashcardPreview[];
  };

  const importDeck = async (sourceDeckId: string, subjectId: string) => {
    if (!user) return { error: "No autenticado" };

    // Get source deck info
    const { data: sourceDeck } = await supabase
      .from("flashcard_decks")
      .select("nombre, description")
      .eq("id", sourceDeckId)
      .single();

    if (!sourceDeck) return { error: "Mazo no encontrado" };

    // Get source cards
    const { data: sourceCards } = await supabase
      .from("flashcards")
      .select("pregunta, respuesta")
      .eq("deck_id", sourceDeckId);

    if (!sourceCards || sourceCards.length === 0) {
      return { error: "El mazo no tiene tarjetas" };
    }

    // Create new deck
    const { data: newDeck, error: deckError } = await supabase
      .from("flashcard_decks")
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        nombre: sourceDeck.nombre,
        total_cards: sourceCards.length
      })
      .select()
      .single();

    if (deckError || !newDeck) {
      return { error: "Error al crear el mazo" };
    }

    // Copy cards
    const newCards = sourceCards.map(card => ({
      user_id: user.id,
      deck_id: newDeck.id,
      pregunta: card.pregunta,
      respuesta: card.respuesta
    }));

    const { error: cardsError } = await supabase
      .from("flashcards")
      .insert(newCards);

    if (cardsError) {
      // Rollback: delete the deck
      await supabase.from("flashcard_decks").delete().eq("id", newDeck.id);
      return { error: "Error al copiar las tarjetas" };
    }

    // Increment download count
    await supabase
      .from("flashcard_decks")
      .update({ download_count: (await supabase.from("flashcard_decks").select("download_count").eq("id", sourceDeckId).single()).data?.download_count + 1 || 1 })
      .eq("id", sourceDeckId);

    toast.success("¡Mazo importado exitosamente!");
    return { error: null, deckId: newDeck.id };
  };

  const rateDeck = async (deckId: string, rating: number) => {
    if (!user) return;

    const { data: existing } = await supabase
      .from("deck_ratings")
      .select("id, rating")
      .eq("deck_id", deckId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Update existing rating - calculate diff and update deck ratings
      const diff = rating - existing.rating;
      await supabase.from("deck_ratings").update({ rating }).eq("id", existing.id);
      const { data: deck } = await supabase.from("flashcard_decks").select("rating_sum").eq("id", deckId).single();
      if (deck) {
        await supabase.from("flashcard_decks").update({
          rating_sum: deck.rating_sum + diff
        }).eq("id", deckId);
      }
    } else {
      // Insert new rating
      await supabase.from("deck_ratings").insert({ deck_id: deckId, user_id: user.id, rating });
      const { data: deck } = await supabase.from("flashcard_decks").select("rating_sum, rating_count").eq("id", deckId).single();
      if (deck) {
        await supabase.from("flashcard_decks").update({
          rating_sum: deck.rating_sum + rating,
          rating_count: deck.rating_count + 1
        }).eq("id", deckId);
      }
    }

    await fetchPublicDecks();
  };

  useEffect(() => {
    fetchPublicDecks();
    fetchMyPublicDecks();
  }, [fetchPublicDecks, fetchMyPublicDecks]);

  return {
    publicDecks,
    myPublicDecks,
    loading,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    yearFilter,
    setYearFilter,
    subjectFilter,
    setSubjectFilter,
    getCategories,
    publishDeck,
    unpublishDeck,
    getDeckPreview,
    importDeck,
    rateDeck,
    refetch: fetchPublicDecks
  };
}
