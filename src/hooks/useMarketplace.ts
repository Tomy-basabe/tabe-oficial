import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PublicDeck {
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
    facultad?: string | null;
    carrera?: string | null;
  };
  subject?: {
    nombre: string;
    year: number;
  };
}

export interface PublicFile {
  id: string;
  nombre: string;
  tipo: string;
  url: string;
  storage_path: string | null;
  tamaño_bytes: number | null;
  description: string | null;
  category: string | null;
  download_count: number;
  rating_sum: number;
  rating_count: number;
  user_id: string;
  subject_id: string | null;
  created_at: string;
  creator?: PublicDeck["creator"];
}

export interface PublicQuiz {
  id: string;
  nombre: string;
  description: string | null;
  category: string | null;
  total_questions: number;
  download_count: number;
  rating_sum: number;
  rating_count: number;
  user_id: string;
  subject_id: string | null;
  created_at: string;
  creator?: PublicDeck["creator"];
  subject?: PublicDeck["subject"];
}

export interface PublicFolder {
  id: string;
  nombre: string;
  color: string | null;
  description: string | null;
  category: string | null;
  download_count: number;
  rating_sum: number;
  rating_count: number;
  user_id: string;
  subject_id: string | null;
  created_at: string;
  creator?: PublicDeck["creator"];
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
  facultad: string | null;
  carrera: string | null;
}

interface SubjectData {
  id: string;
  nombre: string;
  year: number;
}

export interface InventoryItem {
  id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  quantity: number;
}

export function useMarketplace() {
  const { user } = useAuth();
  const [publicDecks, setPublicDecks] = useState<PublicDeck[]>([]);
  const [publicFiles, setPublicFiles] = useState<PublicFile[]>([]);
  const [publicFolders, setPublicFolders] = useState<PublicFolder[]>([]);
  const [publicQuizzes, setPublicQuizzes] = useState<PublicQuiz[]>([]);
  const [myPublicDecks, setMyPublicDecks] = useState<PublicDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [userInventory, setUserInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  const fetchPublicResources = useCallback(async () => {
    setLoading(true);

    try {
      const [decksRes, filesRes, foldersRes, quizzesRes] = await Promise.all([
        supabase.from("flashcard_decks").select("*").eq("is_public", true).gt("total_cards", 0).order("download_count", { ascending: false }),
        supabase.from("library_files").select("*").eq("is_public", true).order("download_count", { ascending: false }),
        supabase.from("library_folders").select("*").eq("is_public", true).order("download_count", { ascending: false }),
        supabase.from("quiz_decks").select("*").eq("is_public", true).order("download_count", { ascending: false })
      ]);

      const allResources = [
        ...(decksRes.data || []),
        ...(filesRes.data || []),
        ...(foldersRes.data || []),
        ...(quizzesRes.data || [])
      ];

      const userIds = [...new Set(allResources.map(r => r.user_id))];
      const subjectIds = [...new Set(allResources.map(r => r.subject_id).filter(Boolean))];

      const [profilesResult, statsResult, subjectsResult] = await Promise.all([
        supabase.from("profiles").select("user_id, username, display_id, nombre, facultad, carrera").in("user_id", userIds),
        supabase.from("user_stats").select("user_id, nivel").in("user_id", userIds),
        supabase.from("subjects").select("id, nombre, año").in("id", subjectIds)
      ]);

      const profileMap = new Map<string, ProfileData>((profilesResult.data || []).map((p: ProfileData) => [p.user_id, p]));
      const statsMap = new Map((statsResult.data || []).map(s => [s.user_id, s]));
      const subjectMap = new Map<string, SubjectData>();
      (subjectsResult.data || []).forEach((s: any) => {
        subjectMap.set(s.id, { id: s.id, nombre: s.nombre, year: s.año });
      });

      const enrich = (item: any) => {
        const profile = profileMap.get(item.user_id);
        const stats = statsMap.get(item.user_id);
        const subject = item.subject_id ? subjectMap.get(item.subject_id) : null;

        return {
          ...item,
          creator: profile ? {
            username: profile.username || "Usuario",
            display_id: profile.display_id,
            nombre: profile.nombre || (profile.username ? null : "Usuario"),
            nivel: stats?.nivel || 1,
            facultad: profile.facultad || null,
            carrera: profile.carrera || null,
          } : undefined,
          subject: subject ? {
            nombre: subject.nombre,
            year: subject.year
          } : undefined
        };
      };

      const filter = (items: any[]) => {
        let filtered = items;
        if (searchTerm) {
          const lowerSearch = searchTerm.toLowerCase();
          filtered = filtered.filter(d =>
            d.nombre.toLowerCase().includes(lowerSearch) ||
            d.description?.toLowerCase().includes(lowerSearch)
          );
        }
        if (categoryFilter) filtered = filtered.filter(d => d.category === categoryFilter);
        if (yearFilter) filtered = filtered.filter(d => d.subject?.year === yearFilter);
        if (subjectFilter) filtered = filtered.filter(d => d.subject_id === subjectFilter);
        return filtered;
      };

      setPublicDecks(filter((decksRes.data || []).map(enrich)));
      setPublicFiles(filter((filesRes.data || []).map(enrich)));
      setPublicFolders(filter((foldersRes.data || []).map(enrich)));
      setPublicQuizzes(filter((quizzesRes.data || []).map(enrich)));

    } catch (error) {
      console.error("Error fetching public resources:", error);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchTerm, yearFilter, subjectFilter]);

  const fetchMyPublicDecks = useCallback(async () => {
    if (!user) return;
    const [decks] = await Promise.all([
      supabase.from("flashcard_decks").select("*").eq("user_id", user.id).eq("is_public", true)
    ]);
    setMyPublicDecks((decks.data || []) as PublicDeck[]);
  }, [user]);

  const publishResource = async (type: "deck" | "file" | "folder" | "quiz", id: string, description: string, category: string) => {
    const table = type === "deck" ? "flashcard_decks" : type === "file" ? "library_files" : type === "quiz" ? "quiz_decks" : "library_folders";
    const { error } = await supabase
      .from(table as any)
      .update({ is_public: true, description, category } as any)
      .eq("id", id);

    if (error) {
      toast.error(`Error al publicar ${type}`);
      return false;
    }

    toast.success(`¡${type === "deck" ? "Mazo" : type === "file" ? "Archivo" : type === "quiz" ? "Cuestionario" : "Carpeta"} publicado en el marketplace!`);
    await fetchMyPublicDecks();
    return true;
  };

  const unpublishResource = async (type: "deck" | "file" | "folder" | "quiz", id: string) => {
    const table = type === "deck" ? "flashcard_decks" : type === "file" ? "library_files" : type === "quiz" ? "quiz_decks" : "library_folders";
    const { error } = await supabase
      .from(table as any)
      .update({ is_public: false } as any)
      .eq("id", id);

    if (error) {
      toast.error(`Error al despublicar ${type}`);
      return false;
    }

    toast.success(`${type === "deck" ? "Mazo" : type === "file" ? "Archivo" : type === "quiz" ? "Cuestionario" : "Carpeta"} retirado del marketplace`);
    await fetchMyPublicDecks();
    return true;
  };

  const importFile = async (sourceFile: PublicFile, targetFolderId: string | null = null) => {
    if (!user) return { error: "No autenticado" };

    const { data: newFile, error } = await supabase
      .from("library_files")
      .insert({
        user_id: user.id,
        folder_id: targetFolderId,
        nombre: sourceFile.nombre,
        tipo: sourceFile.tipo,
        url: sourceFile.url,
        storage_path: sourceFile.storage_path,
        tamaño_bytes: sourceFile.tamaño_bytes,
        subject_id: sourceFile.subject_id
      })
      .select()
      .single();

    if (error) return { error: "Error al importar el archivo" };

    await (supabase.rpc as any)("increment_download_count", { row_id: sourceFile.id, table_name: "library_files" });

    return { error: null, fileId: newFile.id };
  };

  const getDeckPreview = async (deckId: string): Promise<FlashcardPreview[]> => {
    const { data, error } = await supabase
      .from("flashcards")
      .select("id, pregunta, respuesta")
      .eq("deck_id", deckId)
      .limit(10); // Limit preview to 10 cards
    
    if (error) {
      console.error("Error fetching deck preview:", error);
      return [];
    }
    return data || [];
  };

  const importFolder = async (sourceFolderId: string, targetParentId: string | null = null) => {
    if (!user) return { error: "No autenticado" };

    try {
      const { data: folder } = await supabase.from("library_folders").select("*").eq("id", sourceFolderId).single();
      if (!folder) throw new Error("Carpeta no encontrada");

      const { data: newFolder, error: folderError } = await supabase
        .from("library_folders")
        .insert({
          user_id: user.id,
          nombre: folder.nombre,
          color: folder.color,
          parent_folder_id: targetParentId,
          subject_id: folder.subject_id
        })
        .select()
        .single();

      if (folderError || !newFolder) throw new Error("Error al recrear carpeta");

      const { data: files } = await supabase.from("library_files").select("*").eq("folder_id", sourceFolderId);
      if (files && files.length > 0) {
        const filesToInsert = files.map(f => ({
          user_id: user.id,
          folder_id: newFolder.id,
          nombre: f.nombre,
          tipo: f.tipo,
          url: f.url,
          storage_path: f.storage_path,
          tamaño_bytes: f.tamaño_bytes,
          subject_id: f.subject_id
        }));
        await supabase.from("library_files").insert(filesToInsert);
      }

      const { data: subfolders } = await supabase.from("library_folders").select("id").eq("parent_folder_id", sourceFolderId);
      if (subfolders) {
        for (const sub of subfolders) {
          await importFolder(sub.id, newFolder.id);
        }
      }

      if (targetParentId === null) {
        await (supabase.rpc as any)("increment_download_count", { row_id: sourceFolderId, table_name: "library_folders" });
      }

      return { error: null, folderId: newFolder.id };
    } catch (err: any) {
      console.error("Import folder error:", err);
      return { error: err.message };
    }
  };

  const getCategories = useCallback(async () => {
    const [decks, files, folders] = await Promise.all([
      (supabase.from("flashcard_decks") as any).select("category").eq("is_public", true).not("category", "is", null),
      (supabase.from("library_files") as any).select("category").eq("is_public", true).not("category", "is", null),
      (supabase.from("library_folders") as any).select("category").eq("is_public", true).not("category", "is", null)
    ]);
    const categories = [
      ...(decks.data || []).map(d => d.category),
      ...(files.data || []).map(f => f.category),
      ...(folders.data || []).map(f => f.category)
    ];
    return [...new Set(categories.filter(Boolean))] as string[];
  }, []);

  const importDeck = async (sourceDeckId: string, subjectId: string) => {
    if (!user) return { error: "No autenticado" };

    const { data: sourceDeck } = await supabase.from("flashcard_decks").select("nombre, description").eq("id", sourceDeckId).single();
    if (!sourceDeck) return { error: "Mazo no encontrado" };

    const { data: sourceCards } = await supabase.from("flashcards").select("pregunta, respuesta").eq("deck_id", sourceDeckId);
    if (!sourceCards || sourceCards.length === 0) return { error: "El mazo no tiene tarjetas" };

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

    if (deckError || !newDeck) return { error: "Error al crear el mazo" };

    const newCards = sourceCards.map(card => ({
      user_id: user.id,
      deck_id: newDeck.id,
      pregunta: card.pregunta,
      respuesta: card.respuesta
    }));

    const { error: cardsError } = await supabase.from("flashcards").insert(newCards);
    if (cardsError) {
      await supabase.from("flashcard_decks").delete().eq("id", newDeck.id);
      return { error: "Error al copiar las tarjetas" };
    }

    await (supabase.rpc as any)("increment_download_count", { row_id: sourceDeckId, table_name: "flashcard_decks" });
    toast.success("¡Mazo importado exitosamente!");
    return { error: null, deckId: newDeck.id };
  };

  const importQuiz = async (sourceQuizId: string, subjectId: string) => {
    if (!user) return { error: "No autenticado" };

    const { data: sourceQuiz } = await supabase.from("quiz_decks").select("nombre, description").eq("id", sourceQuizId).single();
    if (!sourceQuiz) return { error: "Cuestionario no encontrado" };

    const { data: sourceQuestions } = await supabase.from("quiz_questions").select("id, pregunta, explicacion").eq("deck_id", sourceQuizId);
    if (!sourceQuestions || sourceQuestions.length === 0) return { error: "El cuestionario no tiene preguntas" };

    const { data: newQuiz, error: quizError } = await supabase
      .from("quiz_decks")
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        nombre: sourceQuiz.nombre,
        total_questions: sourceQuestions.length
      })
      .select()
      .single();

    if (quizError || !newQuiz) return { error: "Error al crear el cuestionario" };

    for (const q of sourceQuestions) {
        const { data: newQ, error: qError } = await supabase
            .from("quiz_questions")
            .insert({
                user_id: user.id,
                deck_id: newQuiz.id,
                pregunta: q.pregunta,
                explicacion: q.explicacion
            })
            .select()
            .single();
        
        if (newQ) {
            const { data: options } = await supabase.from("quiz_options").select("texto, es_correcta").eq("question_id", q.id);
            if (options && options.length > 0) {
                await supabase.from("quiz_options").insert(options.map(o => ({ ...o, question_id: newQ.id })));
            }
        }
    }

    await (supabase.rpc as any)("increment_download_count", { row_id: sourceQuizId, table_name: "quiz_decks" });
    toast.success("¡Cuestionario importado exitosamente!");
    return { error: null, quizId: newQuiz.id };
  };

  const rateDeck = async (deckId: string, rating: number) => {
    if (!user) return;
    const { data: existing } = await supabase.from("deck_ratings").select("id, rating").eq("deck_id", deckId).eq("user_id", user.id).single();
    if (existing) {
      const diff = rating - existing.rating;
      await supabase.from("deck_ratings").update({ rating }).eq("id", existing.id);
      const { data: deck } = await supabase.from("flashcard_decks").select("rating_sum").eq("id", deckId).single();
      if (deck) await supabase.from("flashcard_decks").update({ rating_sum: Number(deck.rating_sum) + diff }).eq("id", deckId);
    } else {
      await supabase.from("deck_ratings").insert({ deck_id: deckId, user_id: user.id, rating });
      const { data: deck } = await supabase.from("flashcard_decks").select("rating_sum, rating_count").eq("id", deckId).single();
      if (deck) await supabase.from("flashcard_decks").update({ rating_sum: Number(deck.rating_sum) + rating, rating_count: deck.rating_count + 1 }).eq("id", deckId);
    }
    await fetchPublicResources();
  };

  const fetchInventory = useCallback(async () => {
    if (!user) return;
    setLoadingInventory(true);
    const { data, error } = await supabase.from("user_inventory").select("*").eq("user_id", user.id);
    if (!error) setUserInventory(data || []);
    setLoadingInventory(false);
  }, [user]);

  const useItem = async (itemType: string, itemId: string, plantId?: string) => {
    if (!user) return;
    setLoadingInventory(true);
    try {
      const { data, error } = await (supabase.rpc as any)("use_inventory_item", { p_item_type: itemType, p_item_id: itemId, p_plant_id: plantId });
      if (error) throw error;
      const result = data as any;
      if (result.success) {
        toast.success(result.message);
        await fetchInventory();
      } else toast.error(result.message);
    } catch (err: any) {
      toast.error("Error al usar el objeto");
    } finally {
      setLoadingInventory(false);
    }
  };

  const equipItem = async (itemId: string, itemType: string) => {
    if (!user) return;
    setLoadingInventory(true);
    try {
      const { data, error } = await (supabase.rpc as any)("equip_inventory_item", { p_item_id: itemId, p_item_type: itemType });
      if (error) throw error;
      const result = data as any;
      if (result.success) {
        toast.success(result.message);
        window.location.reload();
      } else toast.error(result.message);
    } catch (err: any) {
      toast.error("Error al equipar el objeto");
    } finally {
      setLoadingInventory(false);
    }
  };

  useEffect(() => {
    if (user) fetchInventory();
  }, [user, fetchInventory]);

  useEffect(() => {
    fetchPublicResources();
    fetchMyPublicDecks();
  }, [fetchPublicResources, fetchMyPublicDecks]);

  return {
    publicDecks,
    publicFiles,
    publicFolders,
    publicQuizzes,
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
    publishResource,
    unpublishResource,
    importFile,
    importFolder,
    importDeck,
    importQuiz,
    getDeckPreview,
    rateDeck,
    userInventory,
    fetchInventory,
    useItem,
    equipItem,
    loadingInventory,
    refetch: fetchPublicResources
  };
}
