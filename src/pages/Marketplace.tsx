import React, { useState, useEffect } from "react";
import {
  Store, Search, Download, Star, User, Tag, Eye, ChevronLeft, ChevronRight,
  Layers, Upload, X, GraduationCap, Calendar, FileText, Folder, Loader2,
  HelpCircle
} from "lucide-react";
import { useMarketplace, PublicDeck, PublicFile, PublicFolder, PublicQuiz } from "@/hooks/useMarketplace";
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
  const [myResources, setMyResources] = useState<any[]>([]);
  const [publishStep, setPublishStep] = useState<'type' | 'filter' | 'select' | 'details'>('type');
  const [selectedPublishType, setSelectedPublishType] = useState<'deck' | 'file' | 'folder' | 'quiz' | null>(null);
  const [publishYear, setPublishYear] = useState<number | null>(null);
  const [publishSubject, setPublishSubject] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Raíz' }]);
  
  const {
    publicDecks,
    publicFiles,
    publicFolders,
    publicQuizzes,
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
    getDeckPreview,
    importDeck,
    importFile,
    importFolder,
    importQuiz
  } = useMarketplace();

  const [categories, setCategories] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

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
  
  // Publish Modal State
  const [publishSelectOpen, setPublishSelectOpen] = useState(false);
  const [resourceToPublish, setResourceToPublish] = useState<{ id: string; type: 'deck' | 'file' | 'folder' | 'quiz'; nombre: string } | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const cats = await getCategories();
      setCategories(cats);

      const { data: subjectsData, error: subjectsError } = await (supabase
        .from("subjects")
        .select('id, nombre, "año"') as any);

      if (subjectsError) {
        console.error("Error loading subjects:", subjectsError);
      } else {
        setSubjects((subjectsData || []).map(s => ({ id: s.id, nombre: s.nombre, year: s.año })));
      }

      if (user) {
        const [decksRes, filesRes, foldersRes, quizzesRes] = await Promise.all([
          supabase.from("flashcard_decks").select("*").eq("user_id", user.id).gt("total_cards", 0),
          supabase.from("library_files").select("*").eq("user_id", user.id),
          supabase.from("library_folders").select("*").eq("user_id", user.id),
          supabase.from("quiz_decks").select("*").eq("user_id", user.id)
        ]);

        setMyResources([
          ...(decksRes.data || []).map(d => ({ ...d, type: 'deck' })),
          ...(filesRes.data || []).map(f => ({ ...f, type: 'file' })),
          ...(foldersRes.data || []).map(f => ({ ...f, type: 'folder' })),
          ...(quizzesRes.data || []).map(q => ({ ...q, type: 'quiz' }))
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
    } else if (importingResource.type === 'quiz') {
      result = await importQuiz(importingResource.id, selectedSubject);
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

  const handlePublish = async () => {
    if (!resourceToPublish || !description.trim() || !category.trim()) return;
    setIsPublishing(true);
    const success = await publishResource(resourceToPublish.type, resourceToPublish.id, description, category);
    if (success) {
      setPublishSelectOpen(false);
      setResourceToPublish(null);
      setDescription("");
      setCategory("");
      // Recargar recursos propios
      window.location.reload();
    }
    setIsPublishing(false);
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
        <div className="flex gap-2">
          <Button 
            onClick={() => setPublishSelectOpen(true)}
            className="bg-neon-cyan text-black hover:bg-neon-cyan/90 font-bold border-none shadow-lg shadow-neon-cyan/20"
          >
            <Upload className="w-4 h-4 mr-2" /> Publicar Recurso
          </Button>
          <MarketplaceModal />
        </div>
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

      {/* Select Resource to Publish Modal */}
      <Dialog open={publishSelectOpen} onOpenChange={(open) => {
        setPublishSelectOpen(open);
        if (!open) {
          setPublishStep('type');
          setResourceToPublish(null);
          setSelectedPublishType(null);
          setPublishYear(null);
          setPublishSubject(null);
          setCurrentFolderId(null);
          setFolderHistory([{id: null, name: 'Raíz'}]);
        }
      }}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {publishStep === 'type' && "¿Qué quieres publicar?"}
              {publishStep === 'filter' && "Filtros de publicación"}
              {publishStep === 'select' && "Selecciona el recurso"}
              {publishStep === 'details' && "Detalles de la publicación"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {publishStep === 'type' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div 
                  className="p-6 bg-secondary/30 rounded-2xl border-2 border-transparent hover:border-neon-green hover:bg-neon-green/5 cursor-pointer flex flex-col items-center gap-4 transition-all"
                  onClick={() => { setSelectedPublishType('file'); setPublishStep('filter'); }}
                >
                  <div className="p-4 bg-neon-green/20 rounded-xl"><FileText className="w-8 h-8 text-neon-green" /></div>
                  <span className="font-bold">Archivo / Carpeta</span>
                </div>
                <div 
                  className="p-6 bg-secondary/30 rounded-2xl border-2 border-transparent hover:border-neon-purple hover:bg-neon-purple/5 cursor-pointer flex flex-col items-center gap-4 transition-all"
                  onClick={() => { setSelectedPublishType('deck'); setPublishStep('filter'); }}
                >
                  <div className="p-4 bg-neon-purple/20 rounded-xl"><Layers className="w-8 h-8 text-neon-purple" /></div>
                  <span className="font-bold">Flashcards</span>
                </div>
                <div 
                  className="p-6 bg-secondary/30 rounded-2xl border-2 border-transparent hover:border-neon-gold hover:bg-neon-gold/5 cursor-pointer flex flex-col items-center gap-4 transition-all"
                  onClick={() => { setSelectedPublishType('quiz'); setPublishStep('filter'); }}
                >
                  <div className="p-4 bg-neon-gold/20 rounded-xl"><HelpCircle className="w-8 h-8 text-neon-gold" /></div>
                  <span className="font-bold">Cuestionario</span>
                </div>
              </div>
            )}

            {publishStep === 'filter' && (
              <div className="space-y-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Filtra por año y materia para encontrar tus recursos:</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Año</label>
                      <Select value={publishYear?.toString()} onValueChange={(v) => { setPublishYear(parseInt(v)); setPublishSubject(null); }}>
                        <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map(y => <SelectItem key={y} value={y.toString()}>{y}° Año</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase text-muted-foreground">Materia</label>
                       <Select 
                        value={publishSubject || "all"} 
                        onValueChange={(v) => setPublishSubject(v === "all" ? null : v)}
                        disabled={!publishYear}
                      >
                         <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                         <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {subjects.filter(s => s.year === publishYear).map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                            ))}
                         </SelectContent>
                       </Select>
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-neon-cyan text-black font-bold" onClick={() => setPublishStep('select')}>Continuar</Button>
                <Button variant="ghost" className="w-full" onClick={() => setPublishStep('type')}>Atrás</Button>
              </div>
            )}

            {publishStep === 'select' && (
              <div className="space-y-4">
                {selectedPublishType === 'file' && (
                   <div className="space-y-2">
                     <div className="flex items-center gap-2 overflow-x-auto pb-2 text-sm">
                       {folderHistory.map((h, i) => (
                         <React.Fragment key={i}>
                           {i > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                           <button 
                             className={`hover:text-neon-cyan transition-colors whitespace-nowrap ${i === folderHistory.length - 1 ? 'font-bold text-neon-cyan' : 'text-muted-foreground'}`}
                             onClick={() => {
                               const newHistory = folderHistory.slice(0, i + 1);
                               setFolderHistory(newHistory);
                               setCurrentFolderId(h.id);
                             }}
                           >
                             {h.name}
                           </button>
                         </React.Fragment>
                       ))}
                     </div>
                   </div>
                )}

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {(() => {
                    let filtered = myResources.filter(r => !r.is_public);
                    
                    if (selectedPublishType === 'file') {
                      // Filter for folders and files
                      filtered = filtered.filter(r => r.type === 'file' || r.type === 'folder');
                      
                      // Filter by subject if selected
                      if (publishSubject) {
                        filtered = filtered.filter(r => r.subject_id === publishSubject);
                      }
                      
                      // Navigation logic
                      filtered = filtered.filter(r => {
                        if (r.type === 'file') return r.folder_id === currentFolderId;
                        if (r.type === 'folder') return r.parent_folder_id === currentFolderId;
                        return false;
                      });
                    } else {
                      // Filter for decks or quizzes
                      filtered = filtered.filter(r => r.type === selectedPublishType);
                      if (publishSubject) {
                        filtered = filtered.filter(r => r.subject_id === publishSubject);
                      }
                    }

                    if (filtered.length === 0) {
                      return <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-2xl border-2 border-dashed border-border">No se encontraron recursos.</div>;
                    }

                    return filtered.map(r => (
                      <div 
                        key={`${r.type}-${r.id}`}
                        className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border hover:border-neon-cyan/50 cursor-pointer transition-all group"
                        onClick={() => {
                          if (r.type === 'folder') {
                            setCurrentFolderId(r.id);
                            setFolderHistory([...folderHistory, { id: r.id, name: r.nombre }]);
                          } else {
                            setResourceToPublish({ id: r.id, type: r.type as any, nombre: r.nombre });
                            setPublishStep('details');
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {r.type === 'deck' && <Layers className="w-5 h-5 text-neon-purple" />}
                          {r.type === 'file' && <FileText className="w-5 h-5 text-neon-green" />}
                          {r.type === 'folder' && <Folder className="w-5 h-5 text-neon-gold" />}
                          {r.type === 'quiz' && <HelpCircle className="w-5 h-5 text-neon-gold" />}
                          <span className="font-medium group-hover:text-neon-cyan transition-colors">{r.nombre}</span>
                        </div>
                        {r.type === 'folder' ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <Badge variant="outline">Seleccionar</Badge>}
                      </div>
                    ));
                  })()}
                </div>
                <Button variant="ghost" className="w-full" onClick={() => setPublishStep('filter')}>Atrás</Button>
              </div>
            )}

            {publishStep === 'details' && resourceToPublish && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="p-4 bg-neon-cyan/10 rounded-2xl border border-neon-cyan/30 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                    {resourceToPublish.type === 'deck' && <Layers className="w-5 h-5 text-neon-purple" />}
                    {resourceToPublish.type === 'file' && <FileText className="w-5 h-5 text-neon-green" />}
                    {resourceToPublish.type === 'folder' && <Folder className="w-5 h-5 text-neon-gold" />}
                    {resourceToPublish.type === 'quiz' && <HelpCircle className="w-5 h-5 text-neon-gold" />}
                    <div>
                      <span className="font-bold text-lg block">{resourceToPublish.nombre}</span>
                      <span className="text-xs text-neon-cyan uppercase font-bold tracking-wider">{resourceToPublish.type}</span>
                    </div>
                   </div>
                   <Button variant="ghost" size="sm" onClick={() => setPublishStep('select')}>Cambiar</Button>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-tight">Descripción</label>
                  <Textarea 
                    placeholder="Describe este recurso para que otros sepan de qué se trata..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[120px] bg-secondary/30 border-border focus:border-neon-cyan focus:ring-neon-cyan/20 rounded-xl"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-tight">Categoría / Etiquetas</label>
                  <Input 
                    placeholder="Ej: Medicina, Ingeniería, Resúmenes..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-secondary/30 border-border focus:border-neon-cyan focus:ring-neon-cyan/20 rounded-xl"
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setPublishStep('select')}>Volver</Button>
                  <Button 
                    className="flex-1 bg-neon-cyan text-black hover:bg-neon-cyan/90 font-bold rounded-xl h-12 shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all"
                    onClick={handlePublish}
                    disabled={isPublishing || !description.trim() || !category.trim()}
                  >
                    {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publicar Ahora"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
