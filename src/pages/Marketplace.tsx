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


interface Subject {
  id: string;
  nombre: string;
  year: number;
}

export default function Marketplace() {
  const { user } = useAuth();
  const [myResources, setMyResources] = useState<any[]>([]);
  const [publishStep, setPublishStep] = useState<'type' | 'filter' | 'select' | 'details'>('type');
  const [selectedPublishType, setSelectedPublishType] = useState<'deck' | 'file' | 'folder' | 'quiz' | 'apunte' | null>(null);
  const [publishYear, setPublishYear] = useState<number | null>(null);
  const [publishSubject, setPublishSubject] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Raíz' }]);
  
  const {
    publicDecks,
    publicFiles,
    publicFolders,
    publicQuizzes,
    publicApuntes,
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
    importQuiz,
    importApunte
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
  const [importingResource, setImportingResource] = useState<{ id: string; type: "deck" | "file" | "folder" | "quiz" | "apunte"; data: any } | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [importing, setImporting] = useState(false);
  
  // Publish Modal State
  const [publishSelectOpen, setPublishSelectOpen] = useState(false);
  const [resourceToPublish, setResourceToPublish] = useState<{ id: string; type: 'deck' | 'file' | 'folder' | 'quiz' | 'apunte'; nombre: string } | null>(null);
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
        const [decksRes, filesRes, foldersRes, quizzesRes, apuntesRes] = await Promise.all([
          supabase.from("flashcard_decks").select("*").eq("user_id", user.id).gt("total_cards", 0),
          supabase.from("library_files").select("*").eq("user_id", user.id),
          supabase.from("library_folders").select("*").eq("user_id", user.id),
          supabase.from("quiz_decks").select("*").eq("user_id", user.id),
          supabase.from("notion_documents").select("*").eq("user_id", user.id)
        ]);

        setMyResources([
          ...(decksRes.data || []).map(d => ({ ...d, type: 'deck' })),
          ...(filesRes.data || []).map(f => ({ ...f, type: 'file' })),
          ...(foldersRes.data || []).map(f => ({ ...f, type: 'folder' })),
          ...(quizzesRes.data || []).map(q => ({ ...q, type: 'quiz' })),
          ...(apuntesRes.data || []).map(a => ({ ...a, type: 'apunte', nombre: a.titulo }))
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
    } else if (importingResource.type === 'apunte') {
      result = await importApunte(importingResource.id, selectedSubject || null);
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

  const ResourceCard = ({ item, type }: { item: any, type: "deck" | "file" | "folder" | "apunte" | "quiz" }) => {
    const Icon = type === 'deck' ? Layers : type === 'quiz' ? HelpCircle : type === 'file' ? FileText : type === 'apunte' ? GraduationCap : Folder;
    const colorClass = type === 'deck' ? "#C688EB" : type === 'quiz' ? "#FFD700" : type === 'file' ? "#00E5FF" : type === 'apunte' ? "#FF9B71" : "#FF5C5C";

    return (
      <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl hover:translate-y-[-4px] hover:shadow-[8px_8px_0_0_#000] transition-all flex flex-col h-full group">
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-14 h-14 rounded-lg border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000] group-hover:rotate-3 transition-transform flex-shrink-0"
                style={{ backgroundColor: colorClass }}
              >
                <Icon className="w-7 h-7 text-black" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-lg uppercase leading-tight line-clamp-2">{item.nombre}</h3>
                <p className="font-bold text-black/50 text-xs mt-1 uppercase">
                  {type === 'deck' ? `${item.total_cards} tarjetas` : type === 'quiz' ? `${item.total_questions} preguntas` : type === 'file' ? 'Archivo individual' : type === 'apunte' ? 'Apunte' : 'Carpeta completa'}
                </p>
              </div>
            </div>
          </div>

          {item.description && (
            <p className="text-sm font-medium text-black/70 line-clamp-2 mb-4 h-10">{item.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {item.subject && (
              <span className="text-[10px] font-black uppercase bg-gray-200 border-2 border-black px-2 py-1 rounded">
                Año {item.subject.year} · {item.subject.nombre}
              </span>
            )}
            {item.category && (
              <span className="text-[10px] font-black uppercase bg-black text-white border-2 border-black px-2 py-1 rounded">
                {item.category}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-sm font-bold mb-4 bg-gray-100 border-2 border-black rounded-lg p-2 shadow-[2px_2px_0_0_#000]">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-black" strokeWidth={3} />
              <span>{item.download_count}</span>
            </div>
            {renderStars(getAverageRating(item))}
          </div>

          {item.creator && (
            <div className="flex flex-col gap-1 mb-4 pb-4 border-b-4 border-black/10">
              <div className="flex items-center gap-2 text-sm font-black">
                <User className="w-4 h-4" strokeWidth={3} />
                <span className="truncate flex-1 uppercase">
                  {item.creator.nombre || item.creator.username || `#${item.creator.display_id}`}
                </span>
                <span className="bg-[#BFFF00] border-2 border-black text-[10px] px-2 py-0.5 rounded">Nv. {item.creator.nivel}</span>
              </div>
              {item.creator.carrera && (
                <div className="flex items-center gap-2 text-xs font-bold text-black/60 ml-6 uppercase">
                  <GraduationCap className="w-3 h-3" strokeWidth={3} />
                  <span className="truncate">{item.creator.carrera}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-auto">
            {type === 'deck' && (
              <Button 
                className="flex-1 bg-white text-black border-2 border-black hover:bg-gray-100 font-black uppercase shadow-[2px_2px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-y-[2px]" 
                onClick={() => handlePreview(item)}
              >
                <Eye className="w-4 h-4 mr-2" strokeWidth={3} /> Preview
              </Button>
            )}
            <Button
              className="flex-1 text-black border-2 border-black font-black uppercase shadow-[2px_2px_0_0_#000] hover:shadow-[0px_0px_0_0_#000] hover:translate-y-[2px] transition-all"
              style={{ backgroundColor: colorClass }}
              onClick={() => {
                if (type === 'deck') {
                  setImportingResource({ id: item.id, type: 'deck', data: item });
                  setImportOpen(true);
                } else if (type === 'quiz') {
                  setImportingResource({ id: item.id, type: 'quiz', data: item });
                  setImportOpen(true);
                } else if (type === 'apunte') {
                  setImportingResource({ id: item.id, type: 'apunte', data: item });
                  setImportOpen(true);
                } else {
                  setImportingResource({ id: item.id, type, data: item });
                  handleImport(); // Direct import for files/folders for now (to root)
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" strokeWidth={3} /> Importar
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase text-black flex items-center gap-3">
            <Store className="w-10 h-10 text-black" strokeWidth={3} /> Marketplace
          </h1>
          <p className="text-black/60 font-bold uppercase mt-1">Descubre recursos compartidos por la comunidad</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            onClick={() => setPublishSelectOpen(true)}
            className="w-full md:w-auto bg-[#00E5FF] text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:bg-[#00cce6] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all font-black uppercase h-14 px-6 rounded-xl text-lg"
          >
            <Upload className="w-6 h-6 mr-2" strokeWidth={3} /> Publicar Recurso
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-black/50" strokeWidth={3} />
            <Input
              placeholder="Buscar en el marketplace..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 bg-white border-4 border-black rounded-xl font-bold text-lg shadow-[4px_4px_0_0_#000] focus-visible:ring-0 focus-visible:border-black focus-visible:shadow-[2px_2px_0_0_#000]"
            />
          </div>
          <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? null : v)}>
            <SelectTrigger className="w-full md:w-48 h-14 bg-white border-4 border-black rounded-xl font-bold text-lg shadow-[4px_4px_0_0_#000] focus:ring-0">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent className="bg-white border-4 border-black rounded-xl shadow-[4px_4px_0_0_#000]">
              <SelectItem value="all" className="font-bold focus:bg-gray-100">Todas</SelectItem>
              {categories.map(cat => <SelectItem key={cat} value={cat} className="font-bold focus:bg-gray-100">{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="decks" className="space-y-6">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
          <TabsList className="flex w-max md:w-full bg-gray-200 p-1 border-4 border-black rounded-xl h-auto">
            <TabsTrigger value="decks" className="data-[state=active]:bg-white data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0_0_#000] font-black uppercase py-3 px-4 rounded-lg text-black transition-all flex-1 min-w-[120px]">
              <Layers className="w-5 h-5 mr-2 shrink-0" strokeWidth={2.5} /> Mazos
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="data-[state=active]:bg-white data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0_0_#000] font-black uppercase py-3 px-4 rounded-lg text-black transition-all flex-1 min-w-[150px]">
              <HelpCircle className="w-5 h-5 mr-2 shrink-0" strokeWidth={2.5} /> Quizzes
            </TabsTrigger>
            <TabsTrigger value="apuntes" className="data-[state=active]:bg-white data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0_0_#000] font-black uppercase py-3 px-4 rounded-lg text-black transition-all flex-1 min-w-[120px]">
              <GraduationCap className="w-5 h-5 mr-2 shrink-0" strokeWidth={2.5} /> Apuntes
            </TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-white data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0_0_#000] font-black uppercase py-3 px-4 rounded-lg text-black transition-all flex-1 min-w-[120px]">
              <FileText className="w-5 h-5 mr-2 shrink-0" strokeWidth={2.5} /> Archivos
            </TabsTrigger>
            <TabsTrigger value="folders" className="data-[state=active]:bg-white data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0_0_#000] font-black uppercase py-3 px-4 rounded-lg text-black transition-all flex-1 min-w-[120px]">
              <Folder className="w-5 h-5 mr-2 shrink-0" strokeWidth={2.5} /> Carpetas
            </TabsTrigger>
            <TabsTrigger value="my-posts" className="data-[state=active]:bg-white data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0_0_#000] font-black uppercase py-3 px-4 rounded-lg text-black transition-all flex-1 min-w-[180px]">
              <Upload className="w-5 h-5 mr-2 shrink-0" strokeWidth={2.5} /> Mis Pubs
            </TabsTrigger>
          </TabsList>
        </div>

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

        <TabsContent value="quizzes">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-64 bg-secondary/20 animate-pulse rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicQuizzes.map(quiz => <ResourceCard key={quiz.id} item={quiz} type="quiz" />)}
              {publicQuizzes.length === 0 && <p className="text-center py-20 text-muted-foreground col-span-full">No se encontraron cuestionarios</p>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="apuntes">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicApuntes.map(apunte => <ResourceCard key={apunte.id} item={apunte} type="apunte" />)}
            {publicApuntes.length === 0 && <p className="text-center py-20 text-muted-foreground col-span-full">No se encontraron apuntes</p>}
          </div>
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

        <TabsContent value="my-posts" className="space-y-6">
          <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl overflow-hidden">
            <div className="bg-black text-white p-4">
              <h2 className="font-black uppercase text-xl">Tus contribuciones al Marketplace</h2>
            </div>
            <div className="p-4 space-y-3">
              {myResources.filter(r => r.is_public).map(resource => (
                <div key={resource.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-100 border-2 border-black rounded-lg gap-4 shadow-[2px_2px_0_0_#000]">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded border-2 border-black flex items-center justify-center shadow-[1px_1px_0_0_#000]",
                      resource.type === 'deck' ? "bg-[#C688EB]" : resource.type === 'file' ? "bg-[#00E5FF]" : resource.type === 'apunte' ? "bg-[#FF9B71]" : "bg-[#FFD700]"
                    )}>
                      {resource.type === 'deck' ? <Layers className="w-5 h-5 text-black" strokeWidth={2.5} /> : resource.type === 'file' ? <FileText className="w-5 h-5 text-black" strokeWidth={2.5} /> : resource.type === 'apunte' ? <GraduationCap className="w-5 h-5 text-black" strokeWidth={2.5} /> : <Folder className="w-5 h-5 text-black" strokeWidth={2.5} />}
                    </div>
                    <div>
                      <span className="font-black uppercase text-lg block leading-tight">{resource.nombre}</span>
                      <span className="font-bold text-black/50 text-xs uppercase">{resource.type}</span>
                    </div>
                  </div>
                  <Button 
                    className="bg-[#FF5C5C] text-black border-2 border-black hover:bg-[#e64c4c] hover:shadow-[0_0_0_0_#000] hover:translate-y-[2px] transition-all font-black uppercase rounded-lg shadow-[2px_2px_0_0_#000] w-full sm:w-auto" 
                    onClick={() => unpublishResource(resource.type as any, resource.id)}
                  >
                    <X className="w-4 h-4 mr-2" strokeWidth={3} /> Retirar
                  </Button>
                </div>
              ))}
              {myResources.filter(r => r.is_public).length === 0 && <p className="text-center py-10 font-black text-black/50 uppercase text-lg">Aún no has participado en el marketplace</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Modal for Decks */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-white border-4 border-black shadow-[8px_8px_0_0_#000] rounded-xl max-w-lg">
          <DialogHeader className="border-b-4 border-black pb-4">
            <DialogTitle className="font-black uppercase text-2xl">{previewDeck?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div 
              className="min-h-[250px] p-8 bg-[#FFD700] rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000] cursor-pointer flex flex-col justify-center text-center transition-transform hover:scale-[1.02]" 
              onClick={() => setShowAnswer(!showAnswer)}
            >
              <p className="text-sm font-black uppercase text-black/50 mb-4 bg-white/50 inline-block mx-auto px-3 py-1 rounded-full border-2 border-black">{showAnswer ? "Respuesta" : "Pregunta"}</p>
              <p className="text-2xl font-black">{showAnswer ? previewCards[previewIndex]?.respuesta : previewCards[previewIndex]?.pregunta}</p>
            </div>
            <div className="flex items-center justify-between bg-gray-100 p-2 rounded-lg border-2 border-black">
              <Button 
                variant="outline" 
                className="bg-white border-2 border-black shadow-[2px_2px_0_0_#000] hover:shadow-[0px_0px_0_0_#000] hover:translate-y-[2px]" 
                onClick={() => { setPreviewIndex(i => Math.max(0, i - 1)); setShowAnswer(false); }} 
                disabled={previewIndex === 0}
              >
                <ChevronLeft strokeWidth={3} />
              </Button>
              <span className="font-black text-lg">{previewIndex + 1} / {previewCards.length}</span>
              <Button 
                variant="outline" 
                className="bg-white border-2 border-black shadow-[2px_2px_0_0_#000] hover:shadow-[0px_0px_0_0_#000] hover:translate-y-[2px]" 
                onClick={() => { setPreviewIndex(i => Math.min(previewCards.length - 1, i + 1)); setShowAnswer(false); }} 
                disabled={previewIndex === previewCards.length - 1}
              >
                <ChevronRight strokeWidth={3} />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal Specially for Decks and Apuntes (needs subject) */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="bg-white border-4 border-black shadow-[8px_8px_0_0_#000] rounded-xl">
          <DialogHeader className="border-b-4 border-black pb-4">
            <DialogTitle className="font-black uppercase text-2xl">Importar {importingResource?.type === 'deck' ? 'Mazo' : importingResource?.type === 'quiz' ? 'Cuestionario' : 'Apunte'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="h-12 border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl font-bold text-lg focus:ring-0 focus:border-black">
                <SelectValue placeholder="Seleccionar materia (Opcional para apuntes)" />
              </SelectTrigger>
              <SelectContent className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl">
                {subjects.map(s => <SelectItem key={s.id} value={s.id} className="font-bold focus:bg-gray-100">{s.nombre} ({s.year}°)</SelectItem>)}
              </SelectContent>
            </Select>
            <Button 
              className="w-full bg-[#00E5FF] text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:bg-[#00cce6] hover:translate-y-[2px] hover:shadow-[0px_0px_0_0_#000] transition-all font-black uppercase h-14 rounded-xl text-lg" 
              onClick={handleImport} 
              disabled={importing || (importingResource?.type === 'deck' && !selectedSubject)}
            >
                {importing ? "Importando..." : `Importar ${importingResource?.type === 'deck' ? 'Mazo' : importingResource?.type === 'quiz' ? 'Cuestionario' : 'Apunte'}`}
            </Button>
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
        <DialogContent className="bg-white border-4 border-black shadow-[8px_8px_0_0_#000] rounded-xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b-4 border-black pb-4">
            <DialogTitle className="font-black uppercase text-2xl">
              {publishStep === 'type' && "¿Qué quieres publicar?"}
              {publishStep === 'filter' && "Filtros de publicación"}
              {publishStep === 'select' && "Selecciona el recurso"}
              {publishStep === 'details' && "Detalles de la publicación"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {publishStep === 'type' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  className="p-6 bg-[#00E5FF] rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-4px] hover:shadow-[8px_8px_0_0_#000] cursor-pointer flex flex-col items-center gap-4 transition-all"
                  onClick={() => { setSelectedPublishType('file'); setPublishStep('filter'); }}
                >
                  <div className="p-4 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000]"><FileText className="w-10 h-10 text-black" strokeWidth={2.5} /></div>
                  <span className="font-black uppercase text-xl text-center">Archivo / Carpeta</span>
                </div>
                <div 
                  className="p-6 bg-[#C688EB] rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-4px] hover:shadow-[8px_8px_0_0_#000] cursor-pointer flex flex-col items-center gap-4 transition-all"
                  onClick={() => { setSelectedPublishType('deck'); setPublishStep('filter'); }}
                >
                  <div className="p-4 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000]"><Layers className="w-10 h-10 text-black" strokeWidth={2.5} /></div>
                  <span className="font-black uppercase text-xl text-center">Flashcards</span>
                </div>
                <div 
                  className="p-6 bg-[#FFD700] rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-4px] hover:shadow-[8px_8px_0_0_#000] cursor-pointer flex flex-col items-center gap-4 transition-all"
                  onClick={() => { setSelectedPublishType('quiz'); setPublishStep('filter'); }}
                >
                  <div className="p-4 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000]"><HelpCircle className="w-10 h-10 text-black" strokeWidth={2.5} /></div>
                  <span className="font-black uppercase text-xl text-center">Cuestionario</span>
                </div>
                <div 
                  className="p-6 bg-[#FF9B71] rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-4px] hover:shadow-[8px_8px_0_0_#000] cursor-pointer flex flex-col items-center gap-4 transition-all"
                  onClick={() => { setSelectedPublishType('apunte'); setPublishStep('filter'); }}
                >
                  <div className="p-4 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000]"><GraduationCap className="w-10 h-10 text-black" strokeWidth={2.5} /></div>
                  <span className="font-black uppercase text-xl text-center">Apunte</span>
                </div>
              </div>
            )}

            {publishStep === 'filter' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-sm font-bold text-black/60 uppercase">Filtra por año y materia para encontrar tus recursos:</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-black">Año</label>
                      <Select value={publishYear?.toString()} onValueChange={(v) => { setPublishYear(parseInt(v)); setPublishSubject(null); }}>
                        <SelectTrigger className="h-12 border-4 border-black shadow-[2px_2px_0_0_#000] rounded-lg font-bold"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl">
                          {[1, 2, 3, 4, 5, 6].map(y => <SelectItem key={y} value={y.toString()} className="font-bold">{y}° Año</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black uppercase text-black">Materia</label>
                       <Select 
                        value={publishSubject || "all"} 
                        onValueChange={(v) => setPublishSubject(v === "all" ? null : v)}
                        disabled={!publishYear}
                      >
                         <SelectTrigger className="h-12 border-4 border-black shadow-[2px_2px_0_0_#000] rounded-lg font-bold"><SelectValue placeholder="Todas" /></SelectTrigger>
                         <SelectContent className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl">
                            <SelectItem value="all" className="font-bold">Todas</SelectItem>
                            {subjects.filter(s => s.year === publishYear).map(s => (
                              <SelectItem key={s.id} value={s.id} className="font-bold">{s.nombre}</SelectItem>
                            ))}
                         </SelectContent>
                       </Select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button className="flex-1 bg-white text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:bg-gray-100 font-black uppercase h-14 rounded-xl text-lg" onClick={() => setPublishStep('type')}>Atrás</Button>
                  <Button className="flex-1 bg-[#BFFF00] text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:bg-[#a6e600] font-black uppercase h-14 rounded-xl text-lg" onClick={() => setPublishStep('select')}>Continuar</Button>
                </div>
              </div>
            )}

            {publishStep === 'select' && (
              <div className="space-y-6">
                {selectedPublishType === 'file' && (
                   <div className="space-y-2">
                     <div className="flex items-center gap-2 overflow-x-auto pb-2 text-sm bg-gray-100 border-2 border-black p-2 rounded-lg">
                       {folderHistory.map((h, i) => (
                         <React.Fragment key={i}>
                           {i > 0 && <ChevronRight className="w-5 h-5 text-black shrink-0" strokeWidth={3} />}
                           <button 
                             className={`hover:bg-black hover:text-white px-2 py-1 rounded transition-colors whitespace-nowrap uppercase ${i === folderHistory.length - 1 ? 'font-black text-black' : 'font-bold text-black/60'}`}
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

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
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
                      return <div className="text-center py-12 text-black/50 font-black uppercase text-xl border-4 border-dashed border-black rounded-xl">No se encontraron recursos.</div>;
                    }

                    return filtered.map(r => (
                      <div 
                        key={`${r.type}-${r.id}`}
                        className="flex items-center justify-between p-4 bg-white rounded-xl border-4 border-black hover:bg-gray-100 shadow-[4px_4px_0_0_#000] hover:translate-y-[2px] hover:shadow-[0_0_0_0_#000] cursor-pointer transition-all group"
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
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-lg border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000]",
                            r.type === 'deck' ? "bg-[#C688EB]" : r.type === 'file' ? "bg-[#00E5FF]" : r.type === 'folder' ? "bg-[#FFD700]" : r.type === 'quiz' ? "bg-[#FFD700]" : "bg-[#FF9B71]"
                          )}>
                            {r.type === 'deck' && <Layers className="w-6 h-6 text-black" strokeWidth={2.5} />}
                            {r.type === 'file' && <FileText className="w-6 h-6 text-black" strokeWidth={2.5} />}
                            {r.type === 'folder' && <Folder className="w-6 h-6 text-black" strokeWidth={2.5} />}
                            {r.type === 'quiz' && <HelpCircle className="w-6 h-6 text-black" strokeWidth={2.5} />}
                            {r.type === 'apunte' && <GraduationCap className="w-6 h-6 text-black" strokeWidth={2.5} />}
                          </div>
                          <span className="font-black text-lg uppercase">{r.nombre}</span>
                        </div>
                        {r.type === 'folder' ? <ChevronRight className="w-6 h-6 text-black" strokeWidth={3} /> : <span className="bg-black text-white px-3 py-1 text-xs font-black uppercase rounded">Seleccionar</span>}
                      </div>
                    ));
                  })()}
                </div>
                <Button className="w-full bg-white text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:bg-gray-100 font-black uppercase h-14 rounded-xl text-lg" onClick={() => setPublishStep('filter')}>Atrás</Button>
              </div>
            )}

            {publishStep === 'details' && resourceToPublish && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="p-4 bg-gray-100 rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                   <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-lg border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000]",
                      resourceToPublish.type === 'deck' ? "bg-[#C688EB]" : resourceToPublish.type === 'file' ? "bg-[#00E5FF]" : resourceToPublish.type === 'folder' ? "bg-[#FFD700]" : resourceToPublish.type === 'quiz' ? "bg-[#FFD700]" : "bg-[#FF9B71]"
                    )}>
                      {resourceToPublish.type === 'deck' && <Layers className="w-6 h-6 text-black" strokeWidth={2.5} />}
                      {resourceToPublish.type === 'file' && <FileText className="w-6 h-6 text-black" strokeWidth={2.5} />}
                      {resourceToPublish.type === 'folder' && <Folder className="w-6 h-6 text-black" strokeWidth={2.5} />}
                      {resourceToPublish.type === 'quiz' && <HelpCircle className="w-6 h-6 text-black" strokeWidth={2.5} />}
                      {resourceToPublish.type === 'apunte' && <GraduationCap className="w-6 h-6 text-black" strokeWidth={2.5} />}
                    </div>
                    <div>
                      <span className="font-black text-lg block uppercase leading-tight">{resourceToPublish.nombre}</span>
                      <span className="text-xs text-black/60 uppercase font-bold tracking-wider">{resourceToPublish.type}</span>
                    </div>
                   </div>
                   <Button className="bg-white text-black border-2 border-black hover:bg-gray-100 font-black uppercase h-10 px-4 rounded-lg shadow-[2px_2px_0_0_#000]" onClick={() => setPublishStep('select')}>Cambiar</Button>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-black text-black uppercase tracking-tight">Descripción</label>
                  <Textarea 
                    placeholder="Describe este recurso para que otros sepan de qué se trata..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[120px] bg-white border-4 border-black focus-visible:ring-0 focus-visible:border-black rounded-xl font-bold shadow-[4px_4px_0_0_#000] p-4 text-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-black text-black uppercase tracking-tight">Categoría / Etiquetas</label>
                  <Input 
                    placeholder="Ej: Medicina, Ingeniería, Resúmenes..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-14 bg-white border-4 border-black focus-visible:ring-0 focus-visible:border-black rounded-xl font-bold shadow-[4px_4px_0_0_#000] px-4 text-lg"
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <Button className="flex-1 bg-white text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:bg-gray-100 font-black uppercase h-14 rounded-xl text-lg" onClick={() => setPublishStep('select')}>Volver</Button>
                  <Button 
                    className="flex-1 bg-[#BFFF00] text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:bg-[#a6e600] hover:translate-y-[2px] hover:shadow-[0_0_0_0_#000] transition-all font-black uppercase h-14 rounded-xl text-lg"
                    onClick={handlePublish}
                    disabled={isPublishing || !description.trim() || !category.trim()}
                  >
                    {isPublishing ? <Loader2 className="w-6 h-6 animate-spin" /> : "Publicar Ahora"}
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
