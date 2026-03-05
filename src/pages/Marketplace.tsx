import { useState, useEffect } from "react";
import {
  Store, Search, Download, Star, User, Tag, Eye, ChevronLeft, ChevronRight,
  Layers, Upload, X, GraduationCap, Calendar, FileText, Folder
} from "lucide-react";
import { useMarketplace, PublicDeck, PublicFile, PublicFolder } from "@/hooks/useMarketplace";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MarketplaceModal } from "@/components/marketplace/MarketplaceModal";

interface Subject {
  id: string;
  nombre: string;
  year: number;
}

export default function Marketplace() {
  const { user } = useAuth();
  const {
    publicDecks,
    publicFiles,
    publicFolders,
    myPublicDecks,
    loading,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    yearFilter,
    setYearFilter,
    getCategories,
    publishResource,
    unpublishResource,
    getDeckPreview,
    importDeck,
    importFile,
    importFolder
  } = useMarketplace();

  const [categories, setCategories] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [myResources, setMyResources] = useState<Array<{ id: string; nombre: string; type: string; is_public: boolean; subject_id: string }>>([]);

  // Preview Modal State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDeck, setPreviewDeck] = useState<PublicDeck | null>(null);
  const [previewCards, setPreviewCards] = useState<Array<{ id: string; pregunta: string; respuesta: string }>>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Import Modal State
  const [importOpen, setImportOpen] = useState(false);
  const [importingResource, setImportingResource] = useState<{ id: string; type: "deck" | "file" | "folder"; data: any } | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const cats = await getCategories();
      setCategories(cats);

      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("id, nombre, año")
        .order("año", { ascending: true });

      setSubjects((subjectsData || []).map(s => ({ id: s.id, nombre: s.nombre, year: s.año })));

      if (user) {
        const [decks, files, folders] = await Promise.all([
          supabase.from("flashcard_decks").select("id, nombre, is_public, subject_id").eq("user_id", user.id).gt("total_cards", 0),
          supabase.from("library_files").select("id, nombre, is_public, subject_id").eq("user_id", user.id),
          supabase.from("library_folders").select("id, nombre, is_public, subject_id").eq("user_id", user.id)
        ]);

        setMyResources([
          ...(decks.data || []).map(d => ({ ...d, type: 'deck' })),
          ...(files.data || []).map(f => ({ ...f, type: 'file' })),
          ...(folders.data || []).map(f => ({ ...f, type: 'folder' }))
        ]);
      }
    };
    loadData();
  }, [user, getCategories]);

  const handlePreview = async (deck: PublicDeck) => {
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
    if (!importingResource || (importingResource.type === 'deck' && !selectedSubject)) return;
    setImporting(true);

    let result: { error: string | null } = { error: "Tipo desconocido" };

    if (importingResource.type === 'deck') {
      result = await importDeck(importingResource.id, selectedSubject);
    } else if (importingResource.type === 'file') {
      result = await importFile(importingResource.data, null);
    } else if (importingResource.type === 'folder') {
      result = await importFolder(importingResource.id, null);
    }

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("¡Importado correctamente!");
      setImportOpen(false);
      setImportingResource(null);
    }
    setImporting(false);
  };

  const availableYears = [...new Set(subjects.map(s => s.year))].sort();

  const getAverageRating = (item: any) => {
    if (!item.rating_count) return 0;
    return item.rating_sum / item.rating_count;
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={cn("w-3 h-3", star <= rating ? "fill-neon-gold text-neon-gold" : "text-muted-foreground")} />
      ))}
    </div>
  );

  const ResourceCard = ({ item, type }: { item: any, type: "deck" | "file" | "folder" }) => {
    const Icon = type === 'deck' ? Layers : type === 'file' ? FileText : Folder;
    const colorClass = type === 'deck' ? "from-neon-purple to-neon-cyan" : type === 'file' ? "from-neon-green to-neon-cyan" : "from-neon-gold to-neon-orange";

    return (
      <Card className="card-gamer hover:glow-purple transition-all group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center", colorClass)}>
                <Icon className="w-6 h-6 text-background" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold line-clamp-1">{item.nombre}</h3>
                <p className="text-xs text-muted-foreground">
                  {type === 'deck' ? `${item.total_cards} tarjetas` : type === 'file' ? 'Archivo individual' : 'Carpeta completa'}
                </p>
              </div>
            </div>
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 h-10">{item.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            {item.subject && (
              <Badge variant="outline" className="text-[10px] bg-primary/10">
                Año {item.subject.year} · {item.subject.nombre}
              </Badge>
            )}
            {item.category && (
              <Badge variant="secondary" className="text-[10px]">
                {item.category}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between text-xs mb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Download className="w-3 h-3" />
              <span>{item.download_count}</span>
            </div>
            {renderStars(getAverageRating(item))}
          </div>

          {item.creator && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
              <User className="w-3 h-3" />
              <span className="truncate flex-1">
                {item.creator.nombre || item.creator.username || `#${item.creator.display_id}`}
              </span>
              <Badge variant="outline" className="text-[10px]">Nv. {item.creator.nivel}</Badge>
            </div>
          )}

          <div className="flex gap-2">
            {type === 'deck' && (
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePreview(item)}>
                <Eye className="w-4 h-4 mr-2" /> Preview
              </Button>
            )}
            <Button
              size="sm"
              className={cn("flex-1 bg-gradient-to-r", colorClass)}
              onClick={() => {
                if (type === 'deck') {
                  setImportingResource({ id: item.id, type: 'deck', data: item });
                  setImportOpen(true);
                } else {
                  setImportingResource({ id: item.id, type, data: item });
                  handleImport(); // Direct import for files/folders for now (to root)
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" /> Importar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
            <Store className="w-8 h-8 text-neon-purple" /> Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">Descubre recursos compartidos por la comunidad</p>
        </div>
        <MarketplaceModal />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en el marketplace..."
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
              <SelectItem value="all">Todas</SelectItem>
              {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="decks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-secondary/50">
          <TabsTrigger value="decks"><Layers className="w-4 h-4 mr-2" /> Mazos</TabsTrigger>
          <TabsTrigger value="files"><FileText className="w-4 h-4 mr-2" /> Archivos</TabsTrigger>
          <TabsTrigger value="folders"><Folder className="w-4 h-4 mr-2" /> Carpetas</TabsTrigger>
          <TabsTrigger value="my-posts"><Upload className="w-4 h-4 mr-2" /> Publicaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="decks">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-64 bg-secondary/20 animate-pulse rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicDecks.map(deck => <ResourceCard key={deck.id} item={deck} type="deck" />)}
              {publicDecks.length === 0 && <p className="text-center py-20 text-muted-foreground col-span-full">No se encontraron mazos</p>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="files">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicFiles.map(file => <ResourceCard key={file.id} item={file} type="file" />)}
            {publicFiles.length === 0 && <p className="text-center py-20 text-muted-foreground col-span-full">No se encontraron archivos</p>}
          </div>
        </TabsContent>

        <TabsContent value="folders">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicFolders.map(folder => <ResourceCard key={folder.id} item={folder} type="folder" />)}
            {publicFolders.length === 0 && <p className="text-center py-20 text-muted-foreground col-span-full">No se encontraron carpetas</p>}
          </div>
        </TabsContent>

        <TabsContent value="my-posts" className="space-y-4">
          <Card className="card-gamer bg-secondary/20">
            <CardHeader><CardTitle className="text-lg">Tus contribuciones al Marketplace</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {myResources.filter(r => r.is_public).map(resource => (
                <div key={resource.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    {resource.type === 'deck' ? <Layers className="w-4 h-4 text-neon-purple" /> : resource.type === 'file' ? <FileText className="w-4 h-4 text-neon-green" /> : <Folder className="w-4 h-4 text-neon-gold" />}
                    <span>{resource.nombre}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => unpublishResource(resource.type as any, resource.id)}>
                    <X className="w-4 h-4 mr-2" /> Retirar
                  </Button>
                </div>
              ))}
              {myResources.filter(r => r.is_public).length === 0 && <p className="text-center py-4 text-muted-foreground">Aún no has participado en el marketplace</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Modal for Decks */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>{previewDeck?.nombre}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="min-h-[200px] p-6 bg-secondary/50 rounded-xl cursor-pointer flex flex-col justify-center text-center" onClick={() => setShowAnswer(!showAnswer)}>
              <p className="text-sm text-muted-foreground mb-4">{showAnswer ? "Respuesta" : "Pregunta"}</p>
              <p className="text-lg font-medium">{showAnswer ? previewCards[previewIndex]?.respuesta : previewCards[previewIndex]?.pregunta}</p>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => { setPreviewIndex(i => Math.max(0, i - 1)); setShowAnswer(false); }} disabled={previewIndex === 0}><ChevronLeft /></Button>
              <span className="text-sm">{previewIndex + 1} / {previewCards.length}</span>
              <Button variant="outline" size="sm" onClick={() => { setPreviewIndex(i => Math.min(previewCards.length - 1, i + 1)); setShowAnswer(false); }} disabled={previewIndex === previewCards.length - 1}><ChevronRight /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal Specially for Decks (needs subject) */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Importar Mazo</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger><SelectValue placeholder="Seleccionar materia" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre} ({s.year}°)</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={handleImport} disabled={importing || !selectedSubject}>{importing ? "Importando..." : "Importar Mazo"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
