import { useState, useEffect } from "react";
import { Store, Search, Download, Star, User, Tag, Eye, ChevronLeft, ChevronRight, Layers, Upload, X } from "lucide-react";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  nombre: string;
  año: number;
}

export default function Marketplace() {
  const { user } = useAuth();
  const {
    publicDecks,
    myPublicDecks,
    loading,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    getCategories,
    publishDeck,
    unpublishDeck,
    getDeckPreview,
    importDeck
  } = useMarketplace();

  const [categories, setCategories] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [myDecks, setMyDecks] = useState<Array<{ id: string; nombre: string; total_cards: number; is_public: boolean }>>([]);
  
  // Preview Modal State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDeck, setPreviewDeck] = useState<typeof publicDecks[0] | null>(null);
  const [previewCards, setPreviewCards] = useState<Array<{ id: string; pregunta: string; respuesta: string }>>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Import Modal State
  const [importOpen, setImportOpen] = useState(false);
  const [importDeckId, setImportDeckId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [importing, setImporting] = useState(false);

  // Publish Modal State
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishDeckId, setPublishDeckId] = useState<string | null>(null);
  const [publishDescription, setPublishDescription] = useState("");
  const [publishCategory, setPublishCategory] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const cats = await getCategories();
      setCategories(cats);

      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("id, nombre, numero_materia")
        .order("numero_materia", { ascending: true });
      
      const mappedSubjects: Subject[] = (subjectsData || []).map((s: { id: string; nombre: string; numero_materia: number }) => ({
        id: s.id,
        nombre: s.nombre,
        año: Math.ceil(s.numero_materia / 10)
      }));
      setSubjects(mappedSubjects);

      if (user) {
        const { data: decksData } = await supabase
          .from("flashcard_decks")
          .select("id, nombre, total_cards, is_public")
          .eq("user_id", user.id)
          .gt("total_cards", 0);
        setMyDecks(decksData || []);
      }
    };
    loadData();
  }, [user, getCategories]);

  const handlePreview = async (deck: typeof publicDecks[0]) => {
    setPreviewDeck(deck);
    setPreviewIndex(0);
    setShowAnswer(false);
    setLoadingPreview(true);
    setPreviewOpen(true);

    const cards = await getDeckPreview(deck.id);
    setPreviewCards(cards);
    setLoadingPreview(false);
  };

  const handleImport = async () => {
    if (!importDeckId || !selectedSubject) return;
    setImporting(true);
    const result = await importDeck(importDeckId, selectedSubject);
    if (result.error) {
      toast.error(result.error);
    } else {
      setImportOpen(false);
      setImportDeckId(null);
      setSelectedSubject("");
    }
    setImporting(false);
  };

  const handlePublish = async () => {
    if (!publishDeckId || !publishDescription.trim()) {
      toast.error("Descripción requerida");
      return;
    }
    setPublishing(true);
    const success = await publishDeck(publishDeckId, publishDescription, publishCategory);
    if (success) {
      setPublishOpen(false);
      setPublishDeckId(null);
      setPublishDescription("");
      setPublishCategory("");
      // Refresh my decks
      const { data } = await supabase
        .from("flashcard_decks")
        .select("id, nombre, total_cards, is_public")
        .eq("user_id", user?.id)
        .gt("total_cards", 0);
      setMyDecks(data || []);
    }
    setPublishing(false);
  };

  const handleUnpublish = async (deckId: string) => {
    await unpublishDeck(deckId);
    // Refresh my decks
    const { data } = await supabase
      .from("flashcard_decks")
      .select("id, nombre, total_cards, is_public")
      .eq("user_id", user?.id)
      .gt("total_cards", 0);
    setMyDecks(data || []);
  };

  const getAverageRating = (deck: typeof publicDecks[0]) => {
    if (deck.rating_count === 0) return 0;
    return deck.rating_sum / deck.rating_count;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-4 h-4",
              star <= rating ? "fill-neon-gold text-neon-gold" : "text-muted-foreground"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
            <Store className="w-8 h-8 text-neon-purple" />
            Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">
            Descubre y comparte mazos de flashcards con la comunidad
          </p>
        </div>
      </div>

      <Tabs defaultValue="explore" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
          <TabsTrigger value="explore">
            <Search className="w-4 h-4 mr-2" />
            Explorar
          </TabsTrigger>
          <TabsTrigger value="my-decks">
            <Upload className="w-4 h-4 mr-2" />
            Mis Publicaciones
          </TabsTrigger>
        </TabsList>

        {/* Explore Tab */}
        <TabsContent value="explore" className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar mazos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? null : v)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Decks Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="card-gamer animate-pulse">
                  <CardContent className="p-6 h-48" />
                </Card>
              ))}
            </div>
          ) : publicDecks.length === 0 ? (
            <Card className="card-gamer">
              <CardContent className="p-8 text-center">
                <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No hay mazos públicos disponibles</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicDecks.map((deck) => (
                <Card key={deck.id} className="card-gamer hover:glow-purple transition-all group">
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
                          <Layers className="w-6 h-6 text-background" />
                        </div>
                        <div>
                          <h3 className="font-semibold line-clamp-1">{deck.nombre}</h3>
                          <p className="text-sm text-muted-foreground">{deck.total_cards} tarjetas</p>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {deck.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {deck.description}
                      </p>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {deck.category && (
                        <Badge variant="secondary" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {deck.category}
                        </Badge>
                      )}
                      {deck.subject && (
                        <Badge variant="outline" className="text-xs">
                          Año {deck.subject.year}
                        </Badge>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Download className="w-4 h-4" />
                          <span>{deck.download_count}</span>
                        </div>
                        {renderStars(getAverageRating(deck))}
                      </div>
                    </div>

                    {/* Creator */}
                    {deck.creator && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 pb-4 border-b border-border">
                        <User className="w-4 h-4" />
                        <span>
                          {deck.creator.nombre || deck.creator.username || `#${deck.creator.display_id}`}
                        </span>
                        <Badge variant="secondary" className="text-xs ml-auto">
                          Nv. {deck.creator.nivel}
                        </Badge>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePreview(deck)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Vista Previa
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-neon-cyan to-neon-purple"
                        onClick={() => {
                          setImportDeckId(deck.id);
                          setImportOpen(true);
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Importar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Decks Tab */}
        <TabsContent value="my-decks" className="space-y-4">
          <Card className="card-gamer">
            <CardHeader>
              <CardTitle className="text-lg">Publicar un Mazo</CardTitle>
            </CardHeader>
            <CardContent>
              {myDecks.filter(d => !d.is_public).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Crea mazos con tarjetas para poder publicarlos
                </p>
              ) : (
                <div className="space-y-3">
                  {myDecks.filter(d => !d.is_public).map((deck) => (
                    <div key={deck.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <p className="font-medium">{deck.nombre}</p>
                        <p className="text-sm text-muted-foreground">{deck.total_cards} tarjetas</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setPublishDeckId(deck.id);
                          setPublishOpen(true);
                        }}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Publicar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Published Decks */}
          {myDecks.filter(d => d.is_public).length > 0 && (
            <Card className="card-gamer">
              <CardHeader>
                <CardTitle className="text-lg">Mis Mazos Publicados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {myDecks.filter(d => d.is_public).map((deck) => (
                  <div key={deck.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="font-medium">{deck.nombre}</p>
                      <p className="text-sm text-muted-foreground">{deck.total_cards} tarjetas</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => handleUnpublish(deck.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Retirar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {previewDeck?.nombre}
            </DialogTitle>
          </DialogHeader>
          
          {loadingPreview ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : previewCards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Sin tarjetas</p>
          ) : (
            <div className="space-y-4">
              {/* Card Display */}
              <div
                className="min-h-[200px] p-6 bg-secondary/50 rounded-xl cursor-pointer"
                onClick={() => setShowAnswer(!showAnswer)}
              >
                <p className="text-sm text-muted-foreground mb-2">
                  {showAnswer ? "Respuesta" : "Pregunta"}
                </p>
                <p className="text-lg">
                  {showAnswer ? previewCards[previewIndex]?.respuesta : previewCards[previewIndex]?.pregunta}
                </p>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setPreviewIndex(Math.max(0, previewIndex - 1));
                    setShowAnswer(false);
                  }}
                  disabled={previewIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {previewIndex + 1} / {previewCards.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setPreviewIndex(Math.min(previewCards.length - 1, previewIndex + 1));
                    setShowAnswer(false);
                  }}
                  disabled={previewIndex === previewCards.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Toca la tarjeta para voltear
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Importar Mazo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Selecciona la materia donde guardar el mazo
              </label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar materia" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.nombre} (Año {subject.año})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleImport}
              disabled={importing || !selectedSubject}
            >
              {importing ? "Importando..." : "Importar Mazo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish Modal */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Publicar Mazo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Descripción *</label>
              <Textarea
                placeholder="Describe tu mazo para que otros usuarios sepan de qué trata..."
                value={publishDescription}
                onChange={(e) => setPublishDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Categoría (opcional)</label>
              <Input
                placeholder="Ej: Matemáticas, Historia, Programación..."
                value={publishCategory}
                onChange={(e) => setPublishCategory(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handlePublish}
              disabled={publishing || !publishDescription.trim()}
            >
              {publishing ? "Publicando..." : "Publicar en Marketplace"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
