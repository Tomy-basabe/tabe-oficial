import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, Plus, Star, Clock, Trash2, 
  ChevronRight, Search, Loader2, ArrowLeft,
  MoreHorizontal, GraduationCap, Save, FileUp
} from "lucide-react";
import { NotionIcon } from "@/components/icons/NotionIcon";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdvancedNotionEditor } from "@/components/notion/AdvancedNotionEditor";
import { DocumentTimer } from "@/components/notion/DocumentTimer";
import { EmojiPicker } from "@/components/notion/EmojiPicker";
import { TipTapPDFExporter } from "@/components/notion/TipTapPDFExporter";
import { ImportDocumentModal } from "@/components/notion/ImportDocumentModal";
import { useNotionDocuments, NotionDocument } from "@/hooks/useNotionDocuments";
import { useAchievements } from "@/hooks/useAchievements";
import { JSONContent } from "@tiptap/core";
import { tipTapTemplates, TipTapTemplate } from "@/lib/tipTapTemplates";
import { ensureTipTapFormat } from "@/lib/contentMigration";

interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  año: number;
}

export default function Notion() {
  const { user } = useAuth();
  const { documents, loading, createDocument, updateDocument, deleteDocument, addStudyTime, refetch } = useNotionDocuments();
  const { checkAndUnlockAchievements } = useAchievements();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<NotionDocument | null>(null);
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<NotionDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editorContent, setEditorContent] = useState<JSONContent | null>(null);
  const [localTitle, setLocalTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TipTapTemplate>(tipTapTemplates[0]);
  const [showImportModal, setShowImportModal] = useState(false);

  // Keep latest content out of React render loop to avoid Editor.js cursor jumps
  const editorContentRef = useRef<JSONContent | null>(null);
  const contentStateSyncTimeoutRef = useRef<number | null>(null);
  
  const lastSavedContentRef = useRef<string>("");

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase
        .from("subjects")
        .select("id, nombre, codigo, año")
        .order("año", { ascending: true });
      
      if (data) {
        setSubjects(data.map((s: any) => ({
          id: s.id,
          nombre: s.nombre,
          codigo: s.codigo,
          año: s.año
        })));
      }
    };
    fetchSubjects();
  }, []);

  const filteredSubjects = subjects.filter(s => 
    !selectedYear || s.año === selectedYear
  );

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.titulo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !selectedSubjectId || doc.subject_id === selectedSubjectId;
    const matchesYear = !selectedYear || doc.subject?.year === selectedYear;
    return matchesSearch && (selectedSubjectId ? matchesSubject : matchesYear || !selectedYear);
  });

  // Track content changes without re-rendering on every keystroke
  const handleContentUpdate = useCallback((content: JSONContent) => {
    if (!activeDocument) return;
    editorContentRef.current = content;

    // Sync to state (for PDF export) but debounced to keep typing smooth
    if (contentStateSyncTimeoutRef.current) {
      window.clearTimeout(contentStateSyncTimeoutRef.current);
    }
    contentStateSyncTimeoutRef.current = window.setTimeout(() => {
      setEditorContent(editorContentRef.current);
    }, 600);
  }, [activeDocument]);

  // Check if there are unsaved changes (content or title)
  const hasUnsavedChanges = useCallback(() => {
    if (!activeDocument) return false;
    const currentContent = JSON.stringify(editorContentRef.current ?? editorContent);
    const contentChanged = currentContent !== lastSavedContentRef.current;
    const titleChanged = localTitle !== activeDocument.titulo;
    return contentChanged || titleChanged;
  }, [editorContent, localTitle, activeDocument]);

  // Manual save function (saves content and title)
  const handleManualSave = useCallback(async () => {
    if (!activeDocument) return;
    
    setIsSaving(true);
    try {
      const updates: { contenido?: JSONContent; titulo?: string } = {};
      
      const contentToSave = editorContentRef.current ?? editorContent;
      if (contentToSave) {
        updates.contenido = contentToSave;
      }
      if (localTitle !== activeDocument.titulo) {
        updates.titulo = localTitle;
      }
      
      await updateDocument(activeDocument.id, updates);
      lastSavedContentRef.current = JSON.stringify(contentToSave);
      setActiveDocument(prev => prev ? { ...prev, titulo: localTitle } : null);
      toast.success("Apunte guardado");
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  }, [activeDocument, editorContent, localTitle, updateDocument]);

  // Notion-style save shortcut: Cmd/Ctrl + S
  useEffect(() => {
    if (!activeDocument) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
      if (!isSave) return;

      e.preventDefault();
      if (!isSaving && hasUnsavedChanges()) {
        handleManualSave();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeDocument, handleManualSave, hasUnsavedChanges, isSaving]);

  // Update local title only (no DB save on each keystroke)
  const handleTitleChange = useCallback((title: string) => {
    setLocalTitle(title);
  }, []);

  const handleEmojiUpdate = useCallback(async (emoji: string) => {
    if (!activeDocument) return;
    await updateDocument(activeDocument.id, { emoji });
    setActiveDocument(prev => prev ? { ...prev, emoji } : null);
  }, [activeDocument, updateDocument]);

  const handleCreateDocument = async () => {
    if (!selectedSubjectId) {
      toast.error("Selecciona una materia primero");
      return;
    }
    
    const templateContent = selectedTemplate.content;
    
    const newDoc = await createDocument(selectedSubjectId, selectedTemplate.name === "En blanco" ? "Sin título" : selectedTemplate.name);
    if (newDoc) {
      // Update with template content and emoji
      await updateDocument(newDoc.id, { 
        contenido: templateContent,
        emoji: selectedTemplate.emoji 
      });
      
      setActiveDocument({ ...newDoc, contenido: templateContent, emoji: selectedTemplate.emoji });
      setEditorContent(templateContent);
      setLocalTitle(selectedTemplate.name === "En blanco" ? "Sin título" : selectedTemplate.name);
      lastSavedContentRef.current = JSON.stringify(templateContent);
      setShowNewDocModal(false);
      setSelectedTemplate(tipTapTemplates[0]); // Reset template selection
      checkAndUnlockAchievements();
    }
  };

  const handleImportDocument = async (content: JSONContent, title: string, subjectId: string | null) => {
    // If a subject is selected, use it; otherwise use the subject from the imported file
    const targetSubjectId = selectedSubjectId || subjectId;
    
    if (!targetSubjectId) {
      toast.error("Selecciona una materia primero");
      return;
    }

    const newDoc = await createDocument(targetSubjectId, title);
    if (newDoc) {
      await updateDocument(newDoc.id, { contenido: content });
      
      setActiveDocument({ ...newDoc, contenido: content });
      setEditorContent(content);
      setLocalTitle(title);
      lastSavedContentRef.current = JSON.stringify(content);
      checkAndUnlockAchievements();
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    await deleteDocument(docToDelete.id);
    if (activeDocument?.id === docToDelete.id) {
      setActiveDocument(null);
      setEditorContent(null);
    }
    setShowDeleteModal(false);
    setDocToDelete(null);
  };

  const handleSaveTime = useCallback(async (seconds: number) => {
    if (!activeDocument) return;
    await addStudyTime(activeDocument.id, seconds, activeDocument.subject_id);
  }, [activeDocument, addStudyTime]);

  const openDocument = (doc: NotionDocument) => {
    // Convert EditorJS format to TipTap if needed
    const content = ensureTipTapFormat(doc.contenido) || { type: "doc", content: [{ type: "paragraph" }] };
    lastSavedContentRef.current = JSON.stringify(content);
    setEditorContent(content);
    editorContentRef.current = content;
    setLocalTitle(doc.titulo);
    setActiveDocument(doc);
  };

  const closeDocument = () => {
    if (hasUnsavedChanges()) {
      const shouldClose = window.confirm("Tienes cambios sin guardar. ¿Seguro que quieres salir?");
      if (!shouldClose) return;
    }
    setActiveDocument(null);
    setEditorContent(null);
    editorContentRef.current = null;
    setLocalTitle("");
    refetch();
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Document Editor View
  if (activeDocument) {
    return (
      <div className="flex flex-col h-full min-h-screen bg-background">
        {/* Document Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={closeDocument}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <EmojiPicker
                value={activeDocument.emoji}
                onChange={handleEmojiUpdate}
              />
              
              <input
                type="text"
                value={localTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-xl font-display font-bold bg-transparent border-none outline-none focus:ring-0 max-w-md"
                placeholder="Sin título"
              />
              
               {isSaving ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Guardando...
                </span>
               ) : hasUnsavedChanges() && (
                <span className="text-xs text-neon-gold">Sin guardar</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleManualSave}
                disabled={isSaving || !hasUnsavedChanges()}
                className="flex items-center gap-2 px-4 py-2 bg-neon-green/20 text-neon-green rounded-lg font-medium hover:bg-neon-green/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Guardar</span>
              </button>

              <DocumentTimer onSaveTime={handleSaveTime} />
              
              {user && (
                <TipTapPDFExporter
                  documentTitle={localTitle || activeDocument.titulo}
                  documentEmoji={activeDocument.emoji}
                  getContent={() => editorContentRef.current ?? editorContent}
                  subjectId={activeDocument.subject_id}
                  userId={user.id}
                />
              )}
              
              {activeDocument.subject && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-sm">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <span>{activeDocument.subject.codigo}</span>
                </div>
              )}
              
              <button
                onClick={() => {
                  setDocToDelete(activeDocument);
                  setShowDeleteModal(true);
                }}
                className="p-2 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 w-full">
          <AdvancedNotionEditor
            content={editorContent}
            onUpdate={handleContentUpdate}
            documentId={activeDocument.id}
          />
        </div>
        
        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar Apunte</DialogTitle>
            </DialogHeader>
            
            <p className="text-muted-foreground">
              ¿Estás seguro de eliminar "{docToDelete?.titulo || "Sin título"}"? Esta acción no se puede deshacer.
            </p>
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteDocument}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Document List View
  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center">
            <NotionIcon className="w-8 h-8 text-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text">
              Notion
            </h1>
            <p className="text-muted-foreground mt-0.5">
              Crea y organiza tus apuntes de estudio
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-secondary rounded-xl font-medium hover:bg-secondary/80 transition-all"
          >
            <FileUp className="w-5 h-5" />
            <span className="hidden sm:inline">Importar</span>
          </button>
          <button
            onClick={() => setShowNewDocModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-background rounded-xl font-semibold hover:shadow-lg hover:shadow-neon-purple/25 transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Nuevo Apunte
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Year filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setSelectedYear(null); setSelectedSubjectId(null); }}
            className={cn(
              "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
              !selectedYear 
                ? "bg-gradient-to-r from-neon-purple to-neon-cyan text-background" 
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            Todos
          </button>
          {[1, 2, 3, 4, 5].map(year => (
            <button
              key={year}
              onClick={() => { setSelectedYear(year); setSelectedSubjectId(null); }}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                selectedYear === year 
                  ? "bg-gradient-to-r from-neon-purple to-neon-cyan text-background" 
                  : "bg-secondary hover:bg-secondary/80"
              )}
            >
              Año {year}
            </button>
          ))}
        </div>

        {/* Subject filter */}
        {selectedYear && filteredSubjects.length > 0 && (
          <select
            value={selectedSubjectId || ""}
            onChange={(e) => setSelectedSubjectId(e.target.value || null)}
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

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar apuntes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-secondary rounded-xl text-sm border border-border focus:border-primary outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-gamer rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold">{documents.length}</p>
            <p className="text-xs text-muted-foreground">Apuntes</p>
          </div>
        </div>
        <div className="card-gamer rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neon-cyan/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold">
              {formatTime(documents.reduce((acc, d) => acc + d.total_time_seconds, 0))}
            </p>
            <p className="text-xs text-muted-foreground">Tiempo total</p>
          </div>
        </div>
        <div className="card-gamer rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neon-gold/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-neon-gold" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold">
              {documents.filter(d => d.is_favorite).length}
            </p>
            <p className="text-xs text-muted-foreground">Favoritos</p>
          </div>
        </div>
        <div className="card-gamer rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neon-green/20 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-neon-green" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold">
              {new Set(documents.map(d => d.subject_id).filter(Boolean)).size}
            </p>
            <p className="text-xs text-muted-foreground">Materias</p>
          </div>
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">
            {documents.length === 0 ? "No tienes apuntes aún" : "No se encontraron apuntes"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {documents.length === 0 
              ? "Crea tu primer apunte para comenzar a estudiar"
              : "Prueba con otros filtros o términos de búsqueda"
            }
          </p>
          {documents.length === 0 && (
            <button
              onClick={() => setShowNewDocModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-neon-purple to-neon-cyan text-background rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Crear Apunte
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map(doc => (
            <div
              key={doc.id}
              onClick={() => openDocument(doc)}
              className="card-gamer rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{doc.emoji}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDocToDelete(doc);
                    setShowDeleteModal(true);
                  }}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-destructive transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <h3 className="font-display font-semibold mb-1 line-clamp-2">
                {doc.titulo || "Sin título"}
              </h3>
              
              {doc.subject && (
                <p className="text-xs text-primary mb-2">
                  {doc.subject.codigo} • Año {doc.subject.year}
                </p>
              )}
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(doc.total_time_seconds)}
                </span>
                <span>
                  {new Date(doc.updated_at).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short"
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Document Modal */}
      <Dialog open={showNewDocModal} onOpenChange={setShowNewDocModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Apunte</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Año</label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map(year => (
                  <button
                    key={year}
                    onClick={() => { setSelectedYear(year); setSelectedSubjectId(null); }}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      selectedYear === year
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    {year}° Año
                  </button>
                ))}
              </div>
            </div>

            {selectedYear && (
              <div>
                <label className="text-sm font-medium mb-2 block">Materia</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {filteredSubjects.map(subject => (
                    <button
                      key={subject.id}
                      onClick={() => setSelectedSubjectId(subject.id)}
                      className={cn(
                        "p-3 rounded-lg text-left text-sm transition-colors",
                        selectedSubjectId === subject.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80"
                      )}
                    >
                      <p className="font-medium">{subject.codigo}</p>
                      <p className="text-xs opacity-70 truncate">{subject.nombre}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedSubjectId && (
              <div>
                <label className="text-sm font-medium mb-2 block">Plantilla</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {tipTapTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={cn(
                        "p-3 rounded-lg text-left transition-all",
                        selectedTemplate.id === template.id
                          ? "bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 border-2 border-primary"
                          : "bg-secondary hover:bg-secondary/80 border-2 border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{template.emoji}</span>
                        <p className="font-medium text-sm">{template.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleCreateDocument}
              disabled={!selectedSubjectId}
              className={cn(
                "w-full py-3 rounded-xl font-semibold transition-all",
                selectedSubjectId
                  ? "bg-gradient-to-r from-neon-purple to-neon-cyan text-background hover:shadow-lg"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              {selectedTemplate.id === "blank" ? "Crear Apunte" : `Crear con "${selectedTemplate.name}"`}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Apunte</DialogTitle>
          </DialogHeader>
          
          <p className="text-muted-foreground">
            ¿Estás seguro de eliminar "{docToDelete?.titulo || "Sin título"}"? Esta acción no se puede deshacer.
          </p>
          
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteDocument}
              className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium transition-colors"
            >
              Eliminar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Document Modal */}
      {user && (
        <ImportDocumentModal
          open={showImportModal}
          onOpenChange={setShowImportModal}
          onImport={handleImportDocument}
          userId={user.id}
        />
      )}
    </div>
  );
}
