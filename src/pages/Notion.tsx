import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Menu, Star, Clock, Trash2, Loader2, Save,
  MoreHorizontal, FileUp, Smile, ImageIcon, Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdvancedNotionEditor } from "@/components/notion/AdvancedNotionEditor";
import { DocumentTimer } from "@/components/notion/DocumentTimer";
import { EmojiPicker } from "@/components/notion/EmojiPicker";
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

interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  año: number;
}

export default function Notion() {
  const { user } = useAuth();
  const {
    documents,
    loading,
    createDocument,
    updateDocument,
    deleteDocument,
    addStudyTime,
    refetch,
  } = useNotionDocuments();
  const { checkAndUnlockAchievements } = useAchievements();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeDocument, setActiveDocument] = useState<NotionDocument | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<NotionDocument | null>(null);
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [newDocSubjectId, setNewDocSubjectId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TipTapTemplate>(tipTapTemplates[0]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Editor state
  const [editorContent, setEditorContent] = useState<JSONContent | null>(null);
  const [localTitle, setLocalTitle] = useState("");
  const editorContentRef = useRef<JSONContent | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const autoSaveTimerRef = useRef<number | null>(null);

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

  // Content update handler
  const handleContentUpdate = useCallback(
    (content: JSONContent) => {
      if (!activeDocument) return;
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

  // Global shortcuts: Ctrl+S save, Ctrl+/ shortcuts panel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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
  const openDocument = useCallback((doc: NotionDocument) => {
    // Save current doc first
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const content = ensureTipTapFormat(doc.contenido) || {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
    lastSavedContentRef.current = JSON.stringify(content);
    setEditorContent(content);
    editorContentRef.current = content;
    setLocalTitle(doc.titulo);
    setActiveDocument(doc);
    setLastSaved(null);
  }, []);

  const closeDocument = useCallback(() => {
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      saveDocument(true);
    }
    setActiveDocument(null);
    setEditorContent(null);
    editorContentRef.current = null;
    setLocalTitle("");
    refetch();
  }, [saveDocument, refetch]);

  const handleCreateDocument = useCallback(
    async (subjectId?: string) => {
      const targetSubjectId = subjectId || newDocSubjectId;
      if (!targetSubjectId) {
        toast.error("Selecciona una materia primero");
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

  const handleSaveTime = useCallback(
    async (seconds: number) => {
      if (!activeDocument) return;
      await addStudyTime(activeDocument.id, seconds, activeDocument.subject_id);
    },
    [activeDocument, addStudyTime]
  );

  const handleImportDocument = useCallback(
    async (content: JSONContent, title: string, subjectId: string | null) => {
      const targetSubjectId = subjectId || subjects[0]?.id;
      if (!targetSubjectId) {
        toast.error("No hay materias disponibles");
        return;
      }
      const newDoc = await createDocument(targetSubjectId, title);
      if (newDoc) {
        await updateDocument(newDoc.id, { contenido: content });
        await refetch();
        openDocument({ ...newDoc, contenido: content, titulo: title });
        checkAndUnlockAchievements();
        toast.success("Documento importado");
      }
    },
    [subjects, createDocument, updateDocument, refetch, openDocument, checkAndUnlockAchievements]
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
        onDeleteDocument={(doc) => {
          setDocToDelete(doc);
          setShowDeleteModal(true);
        }}
        onToggleFavorite={handleToggleFavorite}
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

                {/* Timer */}
                <DocumentTimer onSaveTime={handleSaveTime} />

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
              <AdvancedNotionEditor
                content={editorContent}
                onUpdate={handleContentUpdate}
                documentId={activeDocument.id}
              />
            </div>
          ) : (
            /* Empty state / Welcome */
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="text-6xl mb-6">📝</div>
              <h2
                className="text-2xl font-bold mb-2"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Apuntes — Tus Documentos
              </h2>
              <p
                className="mb-6 max-w-md"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Seleccioná una página de la barra lateral o creá una nueva para
                empezar a escribir.
              </p>

              {/* Stats */}
              <div className="flex gap-6 mb-8">
                <div className="text-center">
                  <p className="text-3xl font-bold">{documents.length}</p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Páginas
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {documents.filter((d) => d.is_favorite).length}
                  </p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Favoritos
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {new Set(documents.map((d) => d.subject_id).filter(Boolean)).size}
                  </p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Materias
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowNewDocModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all"
                style={{
                  background: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                }}
              >
                + Nueva Página
              </button>
            </div>
          )}
        </div>
      </div>

      {/* === MODALS === */}

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
                    {[1, 2, 3, 4, 5].map((year) => (
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
