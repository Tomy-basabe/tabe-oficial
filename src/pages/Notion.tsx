import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Menu, Star, Clock, Trash2, Loader2, Save,
  MoreHorizontal, FileUp, Smile, ImageIcon, Keyboard,
  Search, Filter, ArrowUpDown, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
const AdvancedNotionEditor = lazy(() => import("@/components/notion/AdvancedNotionEditor").then(m => ({ default: m.AdvancedNotionEditor })));
import { EmojiPicker } from "@/components/notion/EmojiPicker";
import { TabeIconRenderer } from "@/components/notion/TabeIcons";
import { TipTapPDFExporter } from "@/components/notion/TipTapPDFExporter";
import { ImportDocumentModal } from "@/components/notion/ImportDocumentModal";
import { NotionSidebar } from "@/components/notion/NotionSidebar";
import { NotionBreadcrumb } from "@/components/notion/NotionBreadcrumb";
import { KeyboardShortcutsModal } from "@/components/notion/KeyboardShortcutsModal";
import { useNotionDocuments, NotionDocument } from "@/hooks/useNotionDocuments";
import { useAchievements } from "@/hooks/useAchievements";
import { JSONContent } from "@tiptap/core";
import { tipTapTemplates, TipTapTemplate } from "@/lib/tipTapTemplates";
import { ensureTipTapFormat } from "@/lib/contentMigration";
import "@/components/notion/notion-editor.css";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { toLocalDateStr } from "@/lib/utils";

interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  año: number;
}

// Helper to extract plain text snippet from generic tipap JSON content
const extractTextSnippet = (content: any): string => {
  let text = '';
  
  if (!content) return '';

  try {
    let parsedContent = content;
    // Attempt parsing if it's a string, might be stringified JSON
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
      } catch {
        return content.substring(0, 150);
      }
    }

    // Traverse TipTap JSON recursively
    const extractNodes = (node: any) => {
      if (node?.type === 'text' && node?.text) {
        text += node.text + ' ';
      }
      // Only iterate content arrays
      if (node?.content && Array.isArray(node.content)) {
        node.content.forEach(extractNodes);
      }
    };

    extractNodes(parsedContent);
  } catch (e) {
    return '';
  }

  const result = text.trim();
  if (!result) return '';
  
  return result.substring(0, 150) + (result.length > 150 ? '...' : '');
};

export default function Notion() {
  const { user } = useAuth();
  const {
    documents,
    loading,
    createDocument,
    updateDocument,
    deleteDocument,
    addStudyTime,
    fetchDocumentContent,
    prefetchDocumentContent,
    refetch,
  } = useNotionDocuments();
  const { checkAndUnlockAchievements } = useAchievements();
  const { canUse, incrementUsage, isPremium } = useUsageLimits();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeDocument, setActiveDocument] = useState<NotionDocument | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<NotionDocument | null>(null);
  
  // Rename Modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [docToRename, setDocToRename] = useState<NotionDocument | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [newDocSubjectId, setNewDocSubjectId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TipTapTemplate>(tipTapTemplates[0]);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isOpeningDoc, setIsOpeningDoc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Editor state
  const [editorContent, setEditorContent] = useState<JSONContent | null>(null);
  const [localTitle, setLocalTitle] = useState("");
  const editorContentRef = useRef<JSONContent | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const autoSaveTimerRef = useRef<number | null>(null);
  const activeDocumentRef = useRef<NotionDocument | null>(null);

  // Sync activeDocument to ref to avoid state closure traps in intervals/events
  useEffect(() => {
    activeDocumentRef.current = activeDocument;
  }, [activeDocument]);

  // Time tracking state
  const totalSecondsRef = useRef(0);
  const savedSecondsRef = useRef(0);
  const lastActivityRef = useRef<number>(Date.now());
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Gallery view filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"updated" | "alpha_asc" | "alpha_desc">("updated");

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase
        .from("subjects")
        .select("id, nombre, codigo, año")
        .order("año", { ascending: true });
      if (data) {
        setSubjects(
          data.map((s: any) => ({
            id: s.id,
            nombre: s.nombre,
            codigo: s.codigo,
            año: s.año,
          }))
        );
      }
    };
    fetchSubjects();
  }, []);

  // === Auto-save logic ===
  const saveDocument = useCallback(
    async (silent = true) => {
      if (!activeDocument) return;
      const contentToSave = editorContentRef.current ?? editorContent;
      const contentStr = JSON.stringify(contentToSave);

      const contentChanged = contentStr !== lastSavedContentRef.current;
      const titleChanged = localTitle !== activeDocument.titulo;

      if (!contentChanged && !titleChanged) return;

      setIsSaving(true);
      try {
        const updates: { contenido?: JSONContent; titulo?: string } = {};
        if (contentChanged && contentToSave) updates.contenido = contentToSave;
        if (titleChanged) updates.titulo = localTitle;

        await updateDocument(activeDocument.id, updates);
        lastSavedContentRef.current = contentStr;
        setActiveDocument((prev) => (prev ? { ...prev, titulo: localTitle } : null));
        setLastSaved(new Date());
        if (!silent) toast.success("Guardado");
      } catch {
        if (!silent) toast.error("Error al guardar");
      } finally {
        setIsSaving(false);
      }
    },
    [activeDocument, editorContent, localTitle, updateDocument]
  );

  // Trigger auto-save on content changes
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      saveDocument(true);
    }, 1500);
  }, [saveDocument]);

  const handleRenameSubmit = async () => {
    if (!docToRename || !newTitle.trim()) return;
    const success = await updateDocument(docToRename.id, { titulo: newTitle.trim() });
    if (success) {
      toast.success("Apunte renombrado");
      setShowRenameModal(false);
      setDocToRename(null);
      setNewTitle("");
      if (activeDocument?.id === docToRename.id) {
         setActiveDocument({ ...activeDocument, titulo: newTitle.trim() } as NotionDocument);
         setLocalTitle(newTitle.trim());
      }
    } else {
      toast.error("Error al renombrar");
    }
  };

  const handleContentUpdate = useCallback(
    (content: JSONContent) => {
      if (!activeDocument) return;
      lastActivityRef.current = Date.now();
      editorContentRef.current = content;
      setEditorContent(content);
      scheduleAutoSave();
    },
    [activeDocument, scheduleAutoSave]
  );

  // Title update handler (also triggers auto-save)
  const handleTitleChange = useCallback(
    (title: string) => {
      setLocalTitle(title);
      scheduleAutoSave();
    },
    [scheduleAutoSave]
  );

  const handleSaveTime = useCallback(
    async (seconds: number, docId?: string, subId?: string) => {
      const targetDocId = docId || activeDocument?.id;
      const targetSubId = subId || activeDocument?.subject_id;
      
      if (!targetDocId) return;
      await addStudyTime(targetDocId, seconds, targetSubId || null);
    },
    [activeDocument, addStudyTime]
  );

  // Time tracking effect
  useEffect(() => {
    if (!activeDocument) {
      totalSecondsRef.current = 0;
      savedSecondsRef.current = 0;
      setSessionSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const inactiveMs = now - lastActivityRef.current;
      
      // Stop tracking if inactive for more than 2 minutes
      if (inactiveMs < 120000) {
        totalSecondsRef.current += 1;
        setSessionSeconds(totalSecondsRef.current);

        // Auto-save time to DB every 60 seconds
        const unsaved = totalSecondsRef.current - savedSecondsRef.current;
        if (unsaved >= 60) {
          const doc = activeDocumentRef.current;
          if (doc) {
            handleSaveTime(unsaved, doc.id, doc.subject_id || undefined);
          }
          savedSecondsRef.current = totalSecondsRef.current;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeDocument?.id]);

  const handleSaveOnExit = useCallback(() => {
    const doc = activeDocumentRef.current;
    if (!doc || !user) return;
    const unsaved = totalSecondsRef.current - savedSecondsRef.current;
    if (unsaved > 0) {
      // Use the actual subject_id from activeDocument using ref
      supabase.from("study_sessions").insert({
        user_id: user.id,
        subject_id: doc.subject_id,
        duracion_segundos: unsaved,
        tipo: "apuntes",
        completada: true,
        fecha: toLocalDateStr(),
      }).then(({ error }) => {
        if (error) console.error("Error saving time on exit:", error);
      });
      savedSecondsRef.current = totalSecondsRef.current;
    }
  }, [user]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleSaveOnExit();
    };
    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', handleSaveOnExit);
    return () => {
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', handleSaveOnExit);
      handleSaveOnExit();
    };
  }, [handleSaveOnExit]);

  // Global shortcuts: Ctrl+S save, Ctrl+/ shortcuts panel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      lastActivityRef.current = Date.now();
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setShowShortcutsModal((v) => !v);
        return;
      }
      if (activeDocument && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveDocument(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeDocument, saveDocument]);

  // Save before closing
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // === Document operations ===
  const openDocument = useCallback(async (doc: NotionDocument) => {
    // Save current doc first
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
      await saveDocument(true);
    }

    // Save study time for the previous document before switching
    handleSaveOnExit();

    // Reset time tracking state for the new document
    totalSecondsRef.current = 0;
    savedSecondsRef.current = 0;
    setSessionSeconds(0);
    lastActivityRef.current = Date.now();

    setLocalTitle(doc.titulo);
    setActiveDocument(doc);
    setLastSaved(null);

    // Fetch content if not already loaded (lazy loading)
    if (!doc.contenido) {
      setIsOpeningDoc(true);
      const fullContent = await fetchDocumentContent(doc.id);
      setIsOpeningDoc(false);
      
      if (fullContent) {
        const content = ensureTipTapFormat(fullContent);
        lastSavedContentRef.current = JSON.stringify(content);
        setEditorContent(content);
        editorContentRef.current = content;
      }
    } else {
      const content = ensureTipTapFormat(doc.contenido);
      lastSavedContentRef.current = JSON.stringify(content);
      setEditorContent(content);
      editorContentRef.current = content;
    }
  }, [saveDocument, handleSaveOnExit, fetchDocumentContent]);

  const closeDocument = useCallback(() => {
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      saveDocument(true);
    }
    handleSaveOnExit();
    setActiveDocument(null);
    setEditorContent(null);
    editorContentRef.current = null;
    setLocalTitle("");
    refetch();
  }, [saveDocument, refetch, handleSaveOnExit]);

  const handleCreateDocument = useCallback(
    async (subjectId?: string) => {
      const targetSubjectId = subjectId || newDocSubjectId;
      if (!targetSubjectId) {
        toast.error("Selecciona una materia primero");
        return;
      }

      // Check monthly document limit for free users
      if (!isPremium && !canUse('apuntes')) {
        return;
      }

      const templateContent = selectedTemplate.content;
      const title =
        selectedTemplate.name === "En blanco" ? "Sin título" : selectedTemplate.name;

      const newDoc = await createDocument(targetSubjectId, title);
      if (newDoc) {
        await updateDocument(newDoc.id, {
          contenido: templateContent,
          emoji: selectedTemplate.emoji,
        });

        const fullDoc = {
          ...newDoc,
          contenido: templateContent,
          emoji: selectedTemplate.emoji,
        };
        openDocument(fullDoc);
        setShowNewDocModal(false);
        setNewDocSubjectId(null);
        setSelectedTemplate(tipTapTemplates[0]);
        await incrementUsage('apuntes');
        checkAndUnlockAchievements();
      }
    },
    [
      newDocSubjectId,
      selectedTemplate,
      createDocument,
      updateDocument,
      openDocument,
      checkAndUnlockAchievements,
    ]
  );

  const handleNewSubPage = useCallback(
    async (parentDoc: NotionDocument) => {
      if (!isPremium && !canUse('apuntes')) {
        return;
      }
      
      const newDoc = await createDocument(parentDoc.subject_id || "", "Sin título", parentDoc.id);
      if (newDoc) {
        const fullDoc = { ...newDoc, parent_id: parentDoc.id };
        openDocument(fullDoc);
        await incrementUsage('apuntes');
        checkAndUnlockAchievements();
      }
    },
    [createDocument, openDocument, isPremium, canUse, incrementUsage, checkAndUnlockAchievements]
  );

  const handleSidebarNewDoc = useCallback(
    (subjectId: string) => {
      setNewDocSubjectId(subjectId);
      setShowNewDocModal(true);
    },
    []
  );

  const handleDeleteDocument = useCallback(async () => {
    if (!docToDelete) return;
    await deleteDocument(docToDelete.id);
    if (activeDocument?.id === docToDelete.id) {
      setActiveDocument(null);
      setEditorContent(null);
    }
    setShowDeleteModal(false);
    setDocToDelete(null);
  }, [docToDelete, activeDocument, deleteDocument]);

  const handleToggleFavorite = useCallback(
    async (doc: NotionDocument) => {
      await updateDocument(doc.id, { is_favorite: !doc.is_favorite });
      if (activeDocument?.id === doc.id) {
        setActiveDocument((prev) =>
          prev ? { ...prev, is_favorite: !prev.is_favorite } : null
        );
      }
      refetch();
    },
    [updateDocument, activeDocument, refetch]
  );

  const handleEmojiUpdate = useCallback(
    async (emoji: string) => {
      if (!activeDocument) return;
      await updateDocument(activeDocument.id, { emoji });
      setActiveDocument((prev) => (prev ? { ...prev, emoji } : null));
    },
    [activeDocument, updateDocument]
  );


  const handleImportDocument = useCallback(
    async (content: JSONContent, title: string, subjectId: string | null) => {
      const targetSubjectId = subjectId || subjects[0]?.id;
      if (!targetSubjectId) {
        toast.error("No hay materias disponibles");
        return;
      }

      // Check monthly document limit for free users
      if (!isPremium && !canUse('apuntes')) {
        return;
      }

      const newDoc = await createDocument(targetSubjectId, title);
      if (newDoc) {
        await updateDocument(newDoc.id, { contenido: content });
        await refetch();
        openDocument({ ...newDoc, contenido: content, titulo: title });
        checkAndUnlockAchievements();
        await incrementUsage('apuntes');
        toast.success("Documento importado");
      }
    },
    [subjects, createDocument, updateDocument, refetch, openDocument, checkAndUnlockAchievements, isPremium, canUse, incrementUsage]
  );

  // Save indicator text
  const saveStatusText = useMemo(() => {
    if (isSaving) return "Guardando...";
    if (lastSaved) {
      return `Guardado`;
    }
    return "";
  }, [isSaving, lastSaved]);

  // Filtered subjects for new doc modal
  const [modalYear, setModalYear] = useState<number | null>(null);
  const modalSubjects = useMemo(
    () => (modalYear ? subjects.filter((s) => s.año === modalYear) : []),
    [subjects, modalYear]
  );

  // --- Gallery View Derived State ---
  const filteredAndSortedDocuments = useMemo(() => {
    let result = [...documents];

    // Filter by subject
    if (filterSubject !== "all") {
      result = result.filter(doc => doc.subject_id === filterSubject);
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(doc => (doc.titulo || "Sin título").toLowerCase().includes(q));
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "alpha_asc") {
        return (a.titulo || "Sin título").localeCompare(b.titulo || "Sin título");
      }
      if (sortBy === "alpha_desc") {
        return (b.titulo || "Sin título").localeCompare(a.titulo || "Sin título");
      }
      // default: updated
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return result;
  }, [documents, filterSubject, searchQuery, sortBy]);

  // Loading
  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="notion-app">
      {/* Sidebar */}
      <NotionSidebar
        documents={documents}
        subjects={subjects}
        activeDocId={activeDocument?.id ?? null}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelectDocument={openDocument}
        onNewDocument={handleSidebarNewDoc}
        onNewSubPage={handleNewSubPage}
        onDeleteDocument={(doc) => {
          setDocToDelete(doc);
          setShowDeleteModal(true);
        }}
        onToggleFavorite={handleToggleFavorite}
        onHoverDocument={(doc) => prefetchDocumentContent(doc.id)}
      />

      {/* Mobile overlay */}
      {!sidebarCollapsed && (
        <div
          className="notion-mobile-overlay hidden max-md:block"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Main area */}
      <div className="notion-main">
        {/* Top bar */}
        <div className="notion-topbar">
          <div className="notion-topbar-left">
            {sidebarCollapsed && (
              <button
                className="notion-topbar-btn"
                onClick={() => setSidebarCollapsed(false)}
                title="Abrir sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            {activeDocument ? (
              <NotionBreadcrumb
                subjectCode={activeDocument.subject?.codigo}
                subjectName={activeDocument.subject?.nombre}
                documentTitle={localTitle || activeDocument.titulo}
                documentEmoji={activeDocument.emoji}
                onClickSubject={closeDocument}
                onBack={closeDocument}
              />
            ) : (
              <span style={{ fontWeight: 500 }}>Apuntes</span>
            )}
          </div>

          <div className="notion-topbar-right">
            {activeDocument && (
              <>
                {/* Save indicator */}
                {saveStatusText && (
                  <span
                    className={cn(
                      "notion-save-indicator",
                      isSaving && "saving"
                    )}
                  >
                    {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                    {saveStatusText}
                  </span>
                )}

                {/* Timer Display */}
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors bg-secondary text-muted-foreground",
                  sessionSeconds > 0 && "bg-neon-green/10 text-neon-green"
                )}>
                  <Clock className="w-4 h-4" />
                  <span className="font-mono text-sm tabular-nums">
                    {Math.floor(sessionSeconds / 60)}:{(sessionSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Favorite */}
                <button
                  className={cn(
                    "notion-topbar-btn",
                    activeDocument.is_favorite && "active"
                  )}
                  onClick={() => handleToggleFavorite(activeDocument)}
                  title={
                    activeDocument.is_favorite
                      ? "Quitar de favoritos"
                      : "Agregar a favoritos"
                  }
                >
                  <Star
                    className="w-4 h-4"
                    fill={activeDocument.is_favorite ? "currentColor" : "none"}
                  />
                </button>

                {/* PDF Export */}
                {user && (
                  <TipTapPDFExporter
                    documentTitle={localTitle || activeDocument.titulo}
                    documentEmoji={activeDocument.emoji}
                    getContent={() => editorContentRef.current ?? editorContent}
                    subjectId={activeDocument.subject_id}
                    userId={user.id}
                  />
                )}

                {/* Import */}
                <button
                  className="notion-topbar-btn"
                  onClick={() => setShowImportModal(true)}
                  title="Importar documento"
                >
                  <FileUp className="w-4 h-4" />
                </button>

                {/* Keyboard shortcuts */}
                <button
                  className="notion-topbar-btn"
                  onClick={() => setShowShortcutsModal(true)}
                  title="Atajos de teclado (Ctrl+/)"
                >
                  <Keyboard className="w-4 h-4" />
                </button>

                {/* More options */}
                <button
                  className="notion-topbar-btn"
                  onClick={() => {
                    setDocToDelete(activeDocument);
                    setShowDeleteModal(true);
                  }}
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            {!activeDocument && (
              <button
                className="notion-topbar-btn"
                onClick={() => setShowImportModal(true)}
                title="Importar"
              >
                <FileUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Editor area */}
        <div className="notion-editor-area">
          {activeDocument ? (
            <div className="notion-editor-wrapper tour-notion-list">
              {isOpeningDoc ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-muted-foreground animate-pulse font-medium">
                    Cargando contenido pesado...
                  </p>
                </div>
              ) : (
                <>
                  {/* Cover */}
                  {activeDocument.cover_url && (
                    <div className="notion-cover">
                      <img src={activeDocument.cover_url} alt="cover" />
                    </div>
                  )}

                  {/* Title area */}
                  <div className="notion-title-area">
                    <EmojiPicker
                      value={activeDocument.emoji}
                      onChange={handleEmojiUpdate}
                    />

                    <textarea
                      value={localTitle}
                      onChange={(e) => {
                        handleTitleChange(e.target.value);
                        // Auto-resize
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                      className="notion-title-input"
                      placeholder="Sin título"
                      rows={1}
                      style={{ overflow: "hidden" }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          // Focus editor
                          const editor = document.querySelector(
                            ".ProseMirror"
                          ) as HTMLElement;
                          editor?.focus();
                        }
                      }}
                    />
                  </div>

                  {/* Editor */}
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  }>
                    <AdvancedNotionEditor
                      content={editorContent}
                      onUpdate={handleContentUpdate}
                      onActivity={() => lastActivityRef.current = Date.now()}
                      documentId={activeDocument.id}
                      onSubPageClick={(id) => {
                          const target = documents.find(d => d.id === id);
                          if (target) openDocument(target);
                      }}
                    />
                  </Suspense>
                </>
              )}
            </div>
          ) : (
            /* Empty state / Gallery View */
            <div className="flex flex-col h-full bg-background text-foreground">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-8 md:px-12 py-8 border-b border-border/40 gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Tus Apuntes</h1>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  
                  {/* Search */}
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder="Buscar por título..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 text-sm bg-secondary/50 border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-48 transition-all"
                    />
                  </div>

                  {/* Filter by Subject */}
                  <Select value={filterSubject} onValueChange={setFilterSubject}>
                    <SelectTrigger className="w-full sm:w-[160px] bg-secondary/50 border-border/50 h-9">
                      <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Todas las materias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las materias</SelectItem>
                      {subjects.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.codigo || sub.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sort */}
                  <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                    <SelectTrigger className="w-full sm:w-[140px] bg-secondary/50 border-border/50 h-9">
                      <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updated">Por fecha (recientes)</SelectItem>
                      <SelectItem value="alpha_asc">Nombre (A a Z)</SelectItem>
                      <SelectItem value="alpha_desc">Nombre (Z a A)</SelectItem>
                    </SelectContent>
                  </Select>

                  <button
                    onClick={() => setShowNewDocModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all hover:bg-primary/90 bg-primary text-primary-foreground text-sm shadow-sm ml-auto sm:ml-0"
                  >
                    + Nueva Página
                  </button>
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-8 md:p-12">
                {documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <p>No tienes apuntes todavía. ¡Creá una nueva página para empezar!</p>
                  </div>
                ) : filteredAndSortedDocuments.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <p>No hay apuntes que coincidan con la búsqueda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {filteredAndSortedDocuments.map((doc) => {
                      const subject = subjects.find(s => s.id === doc.subject_id);
                      
                      const hasCover = !!doc.cover_url;
                      const textSnippet = extractTextSnippet(doc.contenido);

                      return (
                        <div 
                          key={doc.id}
                          onClick={() => openDocument(doc)}
                          className="group flex flex-col bg-card rounded-xl overflow-hidden border border-border/50 hover:border-primary/40 transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1 h-[280px]"
                        >
                          {/* Top Area: Cover Image or Content Snippet */}
                          <div className={cn("h-40 w-full relative border-b border-border/30 bg-background overflow-hidden", !hasCover && "p-5")}>
                            {/* Card Actions Overlay (Dropdown) */}
                            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                               <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                     <button
                                       className="p-1.5 rounded-md bg-background/80 hover:bg-background shadow-sm border border-border/50 text-foreground/70 hover:text-foreground transition-all"
                                       onClick={(e) => e.stopPropagation()}
                                     >
                                        <MoreHorizontal className="w-4 h-4" />
                                     </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                     <DropdownMenuItem
                                        onClick={(e) => {
                                           e.stopPropagation();
                                           setDocToRename(doc);
                                           setNewTitle(doc.titulo || "");
                                           setShowRenameModal(true);
                                        }}
                                     >
                                        Renombrar
                                     </DropdownMenuItem>
                                     <DropdownMenuSeparator />
                                     <DropdownMenuItem
                                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                        onClick={(e) => {
                                           e.stopPropagation();
                                           setDocToDelete(doc);
                                           setShowDeleteModal(true);
                                        }}
                                     >
                                        Eliminar
                                     </DropdownMenuItem>
                                  </DropdownMenuContent>
                               </DropdownMenu>
                            </div>

                            {hasCover ? (
                              <img src={doc.cover_url!} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full relative">
                                {/* Simulated mini page header line */}
                                <div className="w-12 h-1 bg-primary/20 rounded-full mb-3" />
                                
                                {textSnippet ? (
                                   <div className="opacity-80">
                                     <p className="text-[11px] text-foreground font-medium leading-[1.7] line-clamp-5 mix-blend-plus-lighter text-left">
                                       {textSnippet}
                                     </p>
                                   </div>
                                ) : (
                                  <div className="w-full h-full flex mt-4 justify-center">
                                     <span className="text-muted-foreground/40 text-[10px] uppercase font-bold tracking-widest border border-dashed border-muted-foreground/30 px-3 py-1 rounded h-fit">Vacío</span>
                                  </div>
                                )}
                                {/* Gradient fade to hide text bottom */}
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
                              </div>
                            )}
                          </div>
                          
                          {/* Info Area */}
                          <div className="p-4 flex flex-col flex-1 bg-card">
                            <div className="flex items-center gap-3 mb-2">
                               <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/80 border border-border/50 text-foreground shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                                  {doc.emoji ? <TabeIconRenderer iconId={doc.emoji} size={20} /> : <FileText className="w-4 h-4" />}
                               </div>
                               <h3 className="font-bold text-[15px] text-foreground truncate group-hover:text-primary transition-colors tracking-tight flex-1" title={doc.titulo}>
                                  {doc.titulo || "Sin título"}
                               </h3>
                            </div>
                            
                            {/* Badges */}
                            <div className="flex mt-auto pt-2 gap-2 flex-wrap">
                              {subject ? (
                                <>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                                    {subject.codigo || subject.nombre}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/80 text-muted-foreground border border-border/50 uppercase tracking-wider">
                                    Año {subject.año}
                                  </span>
                                </>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/80 text-muted-foreground border border-border/50 uppercase tracking-wider">
                                  Sin materia
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === MODALS === */}

      {/* Rename Document Modal */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar Apunte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Título del apunte..."
                  onKeyDown={(e) => {
                     if (e.key === "Enter") handleRenameSubmit();
                  }}
                />
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setShowRenameModal(false)}>Cancelar</Button>
             <Button onClick={handleRenameSubmit}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Document Modal */}
      <Dialog open={showNewDocModal} onOpenChange={setShowNewDocModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Página</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!newDocSubjectId && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Año</label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5, 6].map((year) => (
                      <button
                        key={year}
                        onClick={() => {
                          setModalYear(year);
                          setNewDocSubjectId(null);
                        }}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                          modalYear === year
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary hover:bg-secondary/80"
                        )}
                      >
                        {year}° Año
                      </button>
                    ))}
                  </div>
                </div>

                {modalYear && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Materia
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {modalSubjects.map((subject) => (
                        <button
                          key={subject.id}
                          onClick={() => setNewDocSubjectId(subject.id)}
                          className={cn(
                            "p-3 rounded-lg text-left text-sm transition-colors",
                            newDocSubjectId === subject.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary hover:bg-secondary/80"
                          )}
                        >
                          <p className="font-medium">{subject.codigo}</p>
                          <p className="text-xs opacity-70 truncate">
                            {subject.nombre}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {newDocSubjectId && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Plantilla
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {tipTapTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={cn(
                        "p-3 rounded-lg text-left transition-all",
                        selectedTemplate.id === template.id
                          ? "bg-primary/10 border-2 border-primary"
                          : "bg-secondary hover:bg-secondary/80 border-2 border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{template.emoji}</span>
                        <p className="font-medium text-sm">{template.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => handleCreateDocument()}
              disabled={!newDocSubjectId}
              className={cn(
                "w-full py-3 rounded-xl font-semibold transition-all",
                newDocSubjectId
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              {selectedTemplate.id === "blank"
                ? "Crear Página"
                : `Crear con "${selectedTemplate.name}"`}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Página</DialogTitle>
          </DialogHeader>

          <p className="text-muted-foreground">
            ¿Estás seguro de eliminar "
            {docToDelete?.titulo || "Sin título"}"? Esta acción no se puede
            deshacer.
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
      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
