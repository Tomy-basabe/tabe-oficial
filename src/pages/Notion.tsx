import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Menu, Star, Clock, Trash2, Loader2, Save, RotateCcw,
  MoreHorizontal, FileUp, Smile, ImageIcon, Keyboard,
  Search, Filter, ArrowUpDown, FileText, AlertCircle,
  Sparkles, Volume2, Square, X, BookOpen, Check, Copy, Users, ArrowLeft,
  GraduationCap, ChevronRight
} from "lucide-react";
import { cn, toLocalDateStr } from "@/lib/utils";
import { toast } from "sonner";
import { ComicAudio } from "@/components/comic/ComicAudio";
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
import { ImportFriendNoteModal } from "@/components/notion/ImportFriendNoteModal";
import { NotionBreadcrumb } from "@/components/notion/NotionBreadcrumb";
import { useNotionDocuments, NotionDocument } from "@/hooks/useNotionDocuments";
import { getTrashItems, restoreFromTrash, moveToTrash, extractSubPageIds, permanentlyDelete, TrashItem } from "@/lib/notionTrash";
import { useFriends } from "@/hooks/useFriends";
import { useAchievements } from "@/hooks/useAchievements";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { TabeLogo } from "@/components/ui/TabeLogo";
import { JSONContent } from "@tiptap/core";
import { tipTapTemplates, TipTapTemplate } from "@/lib/tipTapTemplates";
import { ensureTipTapFormat } from "@/lib/contentMigration";
import "@/components/notion/notion-editor.css";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { useAudioBook } from "@/hooks/useAudioBook";
import { AudioBookPlayer } from "@/components/notion/AudioBookPlayer";
import { resolveDocSubject, normalizeSubjectName } from "@/lib/notionSubjectHelper";
import { subscribeNotionSync, broadcastNotionDocUpdate } from "@/lib/notionSync";

interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  año: number;
}

// Helper to extract plain text snippet from generic tipap JSON content
const extractTextSnippet = (content: any): string => {
  if (!content) return '';
  
  try {
    let parsedContent = content;
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
      } catch {
        return content.substring(0, 150);
      }
    }

    let text = '';
    const extractNodes = (node: any) => {
      if (node?.type === 'text' && node?.text) {
        text += node.text + ' ';
      }
      if (node?.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          extractNodes(child);
          if (text.length > 200) break; // Early exit for performance
        }
      }
    };

    extractNodes(parsedContent);
    const result = text.trim();
    if (!result) return '';
    return result.substring(0, 150) + (result.length > 150 ? '...' : '');
  } catch (e) {
    return '';
  }
};

const extractFullText = (content: any): string => {
  if (!content) return '';
  
  try {
    let parsedContent = content;
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
      } catch {
        return content;
      }
    }

    let text = '';
    const extractNodes = (node: any) => {
      if (node?.type === 'text' && node?.text) {
        text += node.text + ' ';
      }
      if (node?.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          extractNodes(child);
        }
      }
      if (['paragraph', 'heading', 'taskItem', 'listItem', 'blockquote', 'callout'].includes(node?.type)) {
        text += '\n';
      }
    };

    extractNodes(parsedContent);
    return text.trim();
  } catch (e) {
    return '';
  }
};

// Memoized Gallery Card component for performance
const GalleryCard = ({ 
  doc, 
  userSubjects = [], 
  onClick, 
  onRename, 
  onChangeSubject,
  onDelete,
  onHover,
  currentUserId,
  onImportFriendDoc
}: { 
  doc: NotionDocument; 
  userSubjects?: Subject[]; 
  onClick: (doc: NotionDocument) => void;
  onRename: (doc: NotionDocument) => void; 
  onChangeSubject: (doc: NotionDocument) => void;
  onDelete: (doc: NotionDocument) => void;
  onHover?: (doc: NotionDocument) => void;
  currentUserId?: string;
  onImportFriendDoc?: (doc: NotionDocument) => void;
}) => {
  const hasCover = !!doc.cover_url;
  
  // Memoize snippet extraction so it only runs when content changes
  const textSnippet = useMemo(() => extractTextSnippet(doc.contenido), [doc.contenido]);

  const isOwner = !currentUserId || doc.user_id === currentUserId;

  // Resolver materia y año del documento (propio o de amigos)
  const resolvedSubject = useMemo(
    () => resolveDocSubject(doc, userSubjects),
    [doc, userSubjects]
  );
  
  return (
    <div 
      onClick={() => onClick(doc)}
      className="group flex flex-col bg-card border-4 border-foreground rounded-none overflow-hidden transition-all duration-300 cursor-pointer shadow-[8px_8px_0_0_hsl(var(--foreground))] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-x-[4px] hover:translate-y-[4px] h-[300px]"
    >
      {/* Top Area: Cover Image or Content Snippet */}
      <div className={cn("h-40 w-full relative border-b-4 border-foreground bg-muted/30 overflow-hidden", !hasCover && "p-5")}>
        {/* Card Actions Overlay (Dropdown) - ONLY FOR OWNER */}
        {isOwner && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <button
                   className="p-1.5 bg-card border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:shadow-[1px_1px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] text-foreground transition-all"
                   onClick={(e) => e.stopPropagation()}
                 >
                    <MoreHorizontal className="w-4 h-4" />
                 </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="bg-card text-foreground border-4 border-foreground rounded-none shadow-[8px_8px_0_0_hsl(var(--foreground))]">
                 <DropdownMenuItem
                    className="font-bold cursor-pointer focus:bg-accent focus:text-foreground"
                    onClick={(e) => {
                       e.stopPropagation();
                       onRename(doc);
                    }}
                 >
                    Renombrar
                 </DropdownMenuItem>
                 <DropdownMenuSeparator className="bg-foreground/20 h-0.5" />
                 <DropdownMenuItem
                    className="font-bold cursor-pointer focus:bg-accent focus:text-foreground"
                    onClick={(e) => {
                       e.stopPropagation();
                       onChangeSubject(doc);
                    }}
                 >
                    Cambiar Materia
                 </DropdownMenuItem>
                 <DropdownMenuSeparator className="bg-foreground/20 h-0.5" />
                 <DropdownMenuItem
                    className="text-red-500 focus:bg-red-500/10 focus:text-red-600 font-black cursor-pointer"
                    onClick={(e) => {
                       e.stopPropagation();
                       onDelete(doc);
                    }}
                 >
                    Eliminar
                 </DropdownMenuItem>
              </DropdownMenuContent>
           </DropdownMenu>
          </div>
        )}

        {/* Quick Import Button for Friend's Document */}
        {!isOwner && onImportFriendDoc && (
          <div className="absolute top-2 right-2 z-10 opacity-90 group-hover:opacity-100 transition-opacity">
            <button
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#BFFF00] text-black border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:shadow-[1px_1px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] font-black text-xs uppercase transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onImportFriendDoc(doc);
              }}
              title="Importar una copia a tus apuntes"
            >
              <Copy className="w-3.5 h-3.5" />
              Importar
            </button>
          </div>
        )}

      {hasCover ? (
        <img src={doc.cover_url!} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full relative">
            {textSnippet ? (
              <>
                {/* Simulated mini page header line */}
                <div className="w-12 h-2 bg-foreground mb-3" />
                <div className="opacity-80">
                  <p className="text-[11px] text-foreground font-bold leading-[1.7] line-clamp-5 text-left">
                    {textSnippet}
                  </p>
                </div>
                {/* Gradient fade to hide text bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <TabeLogo size={52} className="opacity-40 group-hover:opacity-85 group-hover:scale-110 transition-all duration-300 drop-shadow-sm select-none" />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Info Area */}
      <div className="p-4 flex flex-col flex-1 bg-card">
        <div className="flex items-center gap-3 mb-2">
           <div className="flex items-center justify-center w-10 h-10 border-4 border-foreground bg-[#FFD700] group-hover:bg-[#FF9B71] group-hover:-rotate-6 transition-all duration-300 text-black shrink-0 shadow-[2px_2px_0_0_hsl(var(--foreground))]">
              {doc.emoji ? <TabeIconRenderer iconId={doc.emoji} size={22} /> : <FileText className="w-5 h-5" />}
           </div>
           <h3 className="font-black text-[16px] text-foreground truncate tracking-tight flex-1" title={doc.titulo}>
              {doc.titulo || "Sin título"}
           </h3>
        </div>
        
        {/* Badges de Materia y Año */}
        <div className="flex mt-auto pt-2 gap-2 flex-wrap items-center">
          {resolvedSubject ? (
            <>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-black bg-[#00E5FF] text-black border-2 border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))] uppercase tracking-wider" title={resolvedSubject.nombre}>
                {resolvedSubject.codigo || resolvedSubject.nombre}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-black bg-muted text-foreground border-2 border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))] uppercase tracking-wider">
                Año {resolvedSubject.año}
              </span>
              {resolvedSubject.isLinkedToMyPlan && !isOwner && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-black bg-[#FFD700] text-black border-2 border-foreground uppercase tracking-tight" title="Esta materia coincide con tu plan de estudio importado">
                  Plan común
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-black bg-muted text-foreground border-2 border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))] uppercase tracking-wider">
              Sin materia
            </span>
          )}
        </div>

        {/* Owner indicator for friend docs */}
        {!isOwner && doc.owner && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 px-2 py-1 bg-muted border-2 border-foreground min-w-0">
               {doc.owner.avatar_url ? (
                 <img src={doc.owner.avatar_url} className="w-5 h-5 rounded-full border border-black shrink-0" alt="" />
               ) : (
                 <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {(doc.owner.nombre || doc.owner.username || "A").charAt(0)}
                 </div>
               )}
               <span className="text-[11px] text-foreground font-black uppercase truncate">
                  De: {doc.owner.nombre || doc.owner.username || "Amigo"}
               </span>
            </div>
            {onImportFriendDoc && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onImportFriendDoc(doc);
                }}
                className="px-2 py-1 bg-[#BFFF00] text-black border-2 border-foreground font-black text-[10px] uppercase shadow-[1px_1px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-all shrink-0 flex items-center gap-1"
                title="Importar a mis apuntes"
              >
                <Copy className="w-3 h-3" />
                Copiar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const MemoizedGalleryCard = React.memo(GalleryCard);

export default function Notion() {
  const { user } = useAuth();
  const {
    documents,
    loading,
    createDocument,
    updateDocument,
    deleteDocument,
    restoreDocument,
    permanentlyDeleteDocument,
    addStudyTime,
    fetchDocumentContent,
    prefetchDocumentContent,
    refetch,
  } = useNotionDocuments();
  const { checkAndUnlockAchievements } = useAchievements();
  const { canUse, incrementUsage, isPremium } = useUsageLimits();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeDocument, setActiveDocument] = useState<NotionDocument | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  
  // Trash modal & items state (30 min recovery grace period)
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [trashItems, setTrashItems] = useState<TrashItem[]>(() => getTrashItems());

  useEffect(() => {
    const handler = () => setTrashItems(getTrashItems());
    window.addEventListener("tabe-trash-updated", handler);
    return () => window.removeEventListener("tabe-trash-updated", handler);
  }, []);

  // Audio Book state & instance
  const audioBook = useAudioBook();
  const [showAudioBookPlayer, setShowAudioBookPlayer] = useState(false);
  const [tiptapEditorInstance, setTiptapEditorInstance] = useState<any>(null);
  const tiptapEditorInstanceRef = useRef<any>(null);
  const handleEditorReady = useCallback((instance: any) => {
    setTiptapEditorInstance(instance);
    tiptapEditorInstanceRef.current = instance;
  }, []);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<NotionDocument | null>(null);

  // Tabs state
  interface TabItem { id: string; title: string; emoji: string; }
  const [openTabs, setOpenTabs] = useState<TabItem[]>([]);
  const tabContentCacheRef = useRef<Map<string, any>>(new Map());
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Rename Modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [docToRename, setDocToRename] = useState<NotionDocument | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const [showChangeSubjectModal, setShowChangeSubjectModal] = useState(false);
  const [docToChangeSubject, setDocToChangeSubject] = useState<NotionDocument | null>(null);

  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [newDocSubjectId, setNewDocSubjectId] = useState<string | null>(null);
  const [newDocCustomTitle, setNewDocCustomTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TipTapTemplate>(tipTapTemplates[0]);
  const [isOpeningDoc, setIsOpeningDoc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const pendingSaveRef = useRef(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGenType, setAiGenType] = useState<'flashcards' | 'quiz'>('flashcards');
  const [aiGenCount, setAiGenCount] = useState(15);

  // Friends & Import from Friends state
  const { friends } = useFriends();
  const [showImportFriendModal, setShowImportFriendModal] = useState(false);
  const [preselectedFriendNote, setPreselectedFriendNote] = useState<{
    id: string;
    titulo: string;
    emoji: string;
    subject_id: string | null;
    user_id: string;
    ownerName?: string;
    cover_url?: string | null;
    subject?: { nombre: string; codigo: string; año: number };
  } | null>(null);

  const friendsList = useMemo(() => {
    return friends.map(f => ({
      user_id: f.friend.user_id,
      nombre: f.friend.nombre,
      username: f.friend.username,
      avatar_url: f.friend.avatar_url,
    }));
  }, [friends]);

  // Editor state
  const [editorContent, setEditorContent] = useState<JSONContent | null>(null);
  const [localTitle, setLocalTitle] = useState("");
  const editorContentRef = useRef<JSONContent | null>(null);
  const localTitleRef = useRef("");
  const lastSavedContentRef = useRef<string>("");
  const autoSaveTimerRef = useRef<number | null>(null);
  const forceSaveTimerRef = useRef<number | null>(null);
  const activeDocumentRef = useRef<NotionDocument | null>(null);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveInProgressRef = useRef(false);
  const isDirtyRef = useRef(false);

  // Sync state to refs to avoid stale closures in callbacks
  useEffect(() => {
    activeDocumentRef.current = activeDocument;
  }, [activeDocument]);

  useEffect(() => {
    localTitleRef.current = localTitle;
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = "auto";
      titleTextareaRef.current.style.height = titleTextareaRef.current.scrollHeight + "px";
    }
  }, [localTitle, activeDocument?.id]);

  // Audio Book handlers (placed AFTER editorContent and editorContentRef)
  const hasTextSelection = useMemo(() => {
    if (!tiptapEditorInstance) return false;
    try {
      const { from, to } = tiptapEditorInstance.state.selection;
      return from !== to;
    } catch {
      return false;
    }
  }, [tiptapEditorInstance]);

  // Read from beginning of document
  const handlePlayAudioFromBeginning = useCallback(() => {
    if (!activeDocument) return;
    const content = editorContentRef.current || editorContent || activeDocument.contenido;
    const fullText = extractFullText(content);
    if (!fullText || fullText.trim().length === 0) {
      toast.error("El apunte no tiene texto para leer");
      return;
    }
    setShowAudioBookPlayer(true);
    audioBook.play(fullText, 0);
  }, [activeDocument, editorContent, audioBook]);

  // Read from cursor position or highlighted text
  const handlePlayAudioFromCursor = useCallback(() => {
    if (!activeDocument) return;

    if (tiptapEditorInstance) {
      try {
        const { from, to } = tiptapEditorInstance.state.selection;
        if (from !== to) {
          const selectedText = tiptapEditorInstance.state.doc.textBetween(from, to, ' ');
          if (selectedText && selectedText.trim().length > 0) {
            setShowAudioBookPlayer(true);
            audioBook.play(selectedText, 0);
            toast.success("Leyendo texto seleccionado");
            return;
          }
        }

        if (from > 0) {
          const textFromCursor = tiptapEditorInstance.state.doc.textBetween(
            from,
            tiptapEditorInstance.state.doc.content.size,
            '\n'
          );
          if (textFromCursor && textFromCursor.trim().length > 5) {
            setShowAudioBookPlayer(true);
            audioBook.play(textFromCursor, 0);
            toast.success("Leyendo desde el cursor");
            return;
          }
        }
      } catch (err) {
        console.warn("Could not extract selection from editor:", err);
      }
    }

    handlePlayAudioFromBeginning();
  }, [activeDocument, tiptapEditorInstance, audioBook, handlePlayAudioFromBeginning]);

  // Time tracking state
  const totalSecondsRef = useRef(0);
  const savedSecondsRef = useRef(0);
  const lastActivityRef = useRef<number>(Date.now());
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Gallery view filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<"all" | "mine" | "friends">("all");
  const [sortBy, setSortBy] = useState<"updated" | "alpha_asc" | "alpha_desc">("updated");

  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    subjects.forEach(s => { if (s.año != null) years.add(s.año); });
    documents.forEach(d => {
      const eff = resolveDocSubject(d, subjects);
      if (eff?.año != null) years.add(eff.año);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [subjects, documents]);

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      let query = supabase
        .from("subjects")
        .select("id, nombre, codigo, año")
        .order("año", { ascending: true });

      if (user) {
        query = query.eq("user_id", user.id);
      }

      let { data } = await query;
      if (user && (!data || data.length === 0)) {
        const fallback = await supabase
          .from("subjects")
          .select("id, nombre, codigo, año")
          .is("user_id", null)
          .order("año", { ascending: true });
        if (fallback.data && fallback.data.length > 0) {
          data = fallback.data;
        }
      }

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
  }, [user]);

  const migrateBase64Images = useCallback(async (content: JSONContent, docId: string): Promise<JSONContent> => {
    let hasChanges = false;
    const contentStr = JSON.stringify(content);

    if (!contentStr.includes('data:image/')) return content;

    const newContent = JSON.parse(contentStr);

    const traverseAndUpload = async (node: any) => {
      if (node.type === 'image' && node.attrs?.src?.startsWith('data:image/')) {
        try {
          const src = node.attrs.src;
          const response = await fetch(src);
          const blob = await response.blob();
          const fileExt = blob.type.split('/')[1] || 'png';
          const fileName = `migration-${docId}-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('notion-images')
            .upload(fileName, blob);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('notion-images')
            .getPublicUrl(fileName);

          if (publicUrl) {
            node.attrs.src = publicUrl;
            hasChanges = true;
          }
        } catch (err) {
          console.error("Migration image upload failed:", err);
        }
      }

      if (node.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          await traverseAndUpload(child);
        }
      }
    };

    await traverseAndUpload(newContent);

    if (hasChanges) {
      // Save the cleaned version back to the DB immediately
      await supabase.from('notion_documents').update({ contenido: newContent }).eq('id', docId);
    }

    return newContent;
  }, []);

  const handleGenerateAI = async () => {
    if (!user || !activeDocument) return;
    
    setIsGeneratingAI(true);
    const toastId = toast.loading(`Generando ${aiGenType === 'flashcards' ? 'flashcards' : 'cuestionario'} con IA...`);

    try {
      const fullText = extractFullText(editorContent || activeDocument.contenido);
      if (fullText.length < 50) {
        throw new Error("El documento es muy corto para generar material de estudio de calidad.");
      }

      const { data, error } = await supabase.functions.invoke('generate-study-content', {
        body: {
          fileName: activeDocument.titulo || "Nota",
          content: fullText,
          type: aiGenType,
          count: aiGenCount
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      if (aiGenType === 'flashcards') {
        const cards = data.data.cards;
        if (!cards || cards.length === 0) throw new Error("No se pudieron generar flashcards.");

        const { data: deck, error: deckError } = await supabase
          .from("flashcard_decks")
          .insert({
            user_id: user.id,
            subject_id: activeDocument.subject_id,
            nombre: `IA: ${activeDocument.titulo?.substring(0, 30)}`,
            total_cards: cards.length,
            is_public: false
          })
          .select()
          .single();

        if (deckError) throw deckError;

        const cardRows = cards.map((c: any) => ({
          deck_id: deck.id,
          user_id: user.id,
          pregunta: c.pregunta,
          respuesta: c.respuesta
        }));

        const { error: cardsError } = await supabase
          .from("flashcards")
          .insert(cardRows);

        if (cardsError) throw cardsError;

        toast.success(`¡Mazo de ${cards.length} flashcards creado en la sección de Flashcards!`, { id: toastId });
      } else {
        const questions = data.data.questions;
        if (!questions || questions.length === 0) throw new Error("No se pudieron generar preguntas.");

        const { data: quizDeck, error: qdErr } = await supabase
          .from("quiz_decks")
          .insert({
            user_id: user.id,
            subject_id: activeDocument.subject_id,
            nombre: `IA: ${activeDocument.titulo?.substring(0, 30)}`,
            total_questions: questions.length,
            is_public: false
          })
          .select()
          .single();

        if (qdErr) throw qdErr;

        for (const q of questions) {
          const { data: question } = await supabase
            .from("quiz_questions")
            .insert({
              deck_id: quizDeck.id,
              user_id: user.id,
              pregunta: q.pregunta,
              explicacion: q.explicacion || null
            })
            .select()
            .single();

          if (question && q.opciones) {
            const opts = q.opciones.map((o: string, i: number) => ({
              question_id: question.id,
              texto: o,
              es_correcta: i === (q.correcta || 0)
            }));
            await supabase.from("quiz_options").insert(opts);
          }
        }

        toast.success(`¡Cuestionario de ${questions.length} preguntas creado en la sección de Cuestionarios!`, { id: toastId });
      }

      await incrementUsage('apuntes');
      setShowAIModal(false);
    } catch (err: any) {
      console.error("AI Generation failed:", err);
      toast.error(err.message || "Error al generar material con IA", { id: toastId });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // === Auto-save logic ===
  const saveDocument = useCallback(
    async (
      silent = true,
      explicitDoc?: NotionDocument | null,
      explicitContent?: JSONContent | null,
      explicitTitle?: string
    ): Promise<boolean> => {
      const docToSave = explicitDoc || activeDocumentRef.current;
      if (!docToSave) return true;
      
      // Safety check: Don't try to save documents that don't belong to the user
      if (user && docToSave.user_id !== user.id) {
        return true;
      }
      
      const isCurrentActive = docToSave.id === activeDocumentRef.current?.id;

      if (saveInProgressRef.current) {
        if (isCurrentActive) {
          pendingSaveRef.current = true;
        }
        return true; 
      }

      const editor = tiptapEditorInstanceRef.current || tiptapEditorInstance;
      const contentToSave = explicitContent || (
        (isCurrentActive && editor && !editor.isDestroyed)
          ? editor.getJSON()
          : (isCurrentActive ? editorContentRef.current : (docToSave.contenido || null))
      );
      if (!contentToSave) return true;
      if (isCurrentActive) {
        editorContentRef.current = contentToSave;
      }
      
      const currentTitle = explicitTitle !== undefined 
        ? explicitTitle 
        : (isCurrentActive ? localTitleRef.current : docToSave.titulo);
      const titleChanged = currentTitle !== docToSave.titulo;

      // If not marked dirty and title hasn't changed, skip immediately without stringifying
      if (isCurrentActive && !isDirtyRef.current && !titleChanged && !pendingSaveRef.current && !explicitContent) {
        return true;
      }

      const contentStr = JSON.stringify(contentToSave);

      // 10MB soft limit to avoid Supabase errors / browser freezes
      if (contentStr.length > 10 * 1024 * 1024) {
        console.error("Payload too large:", contentStr.length);
        setSaveError("El documento es demasiado grande para guardar (probablemente por imágenes pegadas)");
        return false;
      }

      const contentChanged = isCurrentActive 
        ? contentStr !== lastSavedContentRef.current 
        : true;

      if (!contentChanged && !titleChanged) {
        if (isCurrentActive) {
          isDirtyRef.current = false;
          pendingSaveRef.current = false;
        }
        return true;
      }

      setIsSaving(true);
      setSaveInProgress(true);
      saveInProgressRef.current = true;
      if (isCurrentActive) {
        pendingSaveRef.current = false;
      }

      try {
        if (contentChanged) {
          updates.contenido = contentToSave;
          try {
            const oldSubpageIds = extractSubPageIds(docToSave.contenido || null);
            const newSubpageIds = extractSubPageIds(contentToSave);
            const removedIds = oldSubpageIds.filter(id => !newSubpageIds.includes(id));
            const addedIds = newSubpageIds.filter(id => !oldSubpageIds.includes(id));

            for (const removedId of removedIds) {
              const subDoc = documents.find(d => d.id === removedId);
              moveToTrash({
                id: removedId,
                titulo: subDoc?.titulo || "Sub-página",
                parent_id: docToSave.id,
                subject_id: docToSave.subject_id,
                emoji: subDoc?.emoji || "📝"
              });
            }

            for (const addedId of addedIds) {
              restoreFromTrash(addedId);
            }
          } catch (e) {
            console.warn("Error tracking subpage changes:", e);
          }
        }
        if (titleChanged) updates.titulo = currentTitle;

        let success = await updateDocument(docToSave.id, updates);
        
        // Automatic retry once after 1.2s if network or gateway had a temporary hiccup
        if (!success) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          success = await updateDocument(docToSave.id, updates);
        }

        if (success) {
          if (activeDocumentRef.current?.id === docToSave.id) {
            lastSavedContentRef.current = contentStr;
            isDirtyRef.current = false;
            setSaveError(null);
            setActiveDocument((prev) => (prev ? { ...prev, titulo: currentTitle } : null));
            setLastSaved(new Date());
          }
          // Notificar a las demás pestañas abiertas en tiempo real (0ms, 0 costo servidor)
          broadcastNotionDocUpdate({
            docId: docToSave.id,
            content: contentToSave,
            title: currentTitle,
            updatedAt: new Date().toISOString(),
          });
          if (!silent) toast.success("Apunte guardado");
          return true;
        } else {
          throw new Error("Update failed after retry");
        }
      } catch (error) {
        console.error("Error saving document:", error);
        setSaveError("Error al guardar");
        if (!silent) toast.error("Error al guardar el apunte");
        return false;
      } finally {
        saveInProgressRef.current = false;
        setSaveInProgress(false);
        setIsSaving(false);
        // Only run pending save if we are STILL on the expected document
        if (pendingSaveRef.current && activeDocumentRef.current?.id === docToSave.id) {
          pendingSaveRef.current = false;
          await saveDocument(silent);
        } else {
          pendingSaveRef.current = false;
        }
      }
    },
    [updateDocument, user, tiptapEditorInstance]
  );

  // Trigger auto-save on content changes (Continuo, silencioso y optimizado para plan Free)
  const scheduleAutoSave = useCallback(() => {
    isDirtyRef.current = true;
    setSaveError(null); // Clear previous error indicator as user continues editing

    // 1. Debounce timer: 1.2s tras dejar de escribir (inmediatez percibida sin saturar peticiones)
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      saveDocument(true);
      if (forceSaveTimerRef.current) {
        window.clearTimeout(forceSaveTimerRef.current);
        forceSaveTimerRef.current = null;
      }
    }, 1200);

    // 2. Continuous typing periodic save: cada 6s si el usuario tipea sin parar (máx ~10 reqs/minuto)
    if (!forceSaveTimerRef.current) {
      forceSaveTimerRef.current = window.setTimeout(() => {
        saveDocument(true);
        forceSaveTimerRef.current = null;
      }, 6000); 
    }
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
      // Sync tab title
      setOpenTabs(prev => prev.map(t => t.id === docToRename.id ? { ...t, title: newTitle.trim() } : t));
    } else {
      toast.error("Error al renombrar");
    }
  };

  const handleChangeSubjectSubmit = async (newSubjectId: string) => {
    if (!docToChangeSubject) return;
    const success = await updateDocument(docToChangeSubject.id, { subject_id: newSubjectId });
    if (success) {
      toast.success("Materia cambiada con éxito");
      setShowChangeSubjectModal(false);
      setDocToChangeSubject(null);
      if (activeDocument?.id === docToChangeSubject.id) {
         const newSubject = subjects.find(s => s.id === newSubjectId);
         setActiveDocument({ ...activeDocument, subject_id: newSubjectId, subject: newSubject } as NotionDocument);
      }
      refetch();
    } else {
      toast.error("Error al cambiar materia");
    }
  };

  const handleContentUpdate = useCallback(
    (content: JSONContent) => {
      if (!activeDocument) return;
      lastActivityRef.current = Date.now();
      editorContentRef.current = content;
      // No actualizamos editorContent vía state aquí para evitar re-renders innecesarios durante la escritura.
      // El editor de Tiptap ya maneja su propio estado interno y Notion guarda usando la ref.
      scheduleAutoSave();
    },
    [activeDocument, scheduleAutoSave]
  );

  // Title update handler (also triggers auto-save)
  const handleTitleChange = useCallback(
    (title: string) => {
      setLocalTitle(title);
      const curId = activeDocumentRef.current?.id;
      setOpenTabs(prev => prev.map(t => t.id === curId ? { ...t, title } : t));
      if (curId) {
        document.dispatchEvent(new CustomEvent("notion-subpage-renamed", {
          detail: { pageId: curId, newTitle: title },
        }));
      }
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

        // Auto-save time to DB every 5 minutes (300s) to avoid hammering database egress
        const unsaved = totalSecondsRef.current - savedSecondsRef.current;
        if (unsaved >= 300) {
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

    // 1. Save Study Time
    const unsaved = totalSecondsRef.current - savedSecondsRef.current;
    if (unsaved > 0) {
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

    // 2. Save Document Content (Best effort on exit ONLY if dirty)
    if (isDirtyRef.current) {
      const contentToSave = editorContentRef.current;
      if (contentToSave) {
        const contentStr = JSON.stringify(contentToSave);
        const currentTitle = localTitleRef.current;
        const contentChanged = contentStr !== lastSavedContentRef.current;
        const titleChanged = currentTitle !== doc.titulo;

        if (contentChanged || titleChanged) {
          const updates: { contenido?: JSONContent; titulo?: string } = {};
          if (contentChanged) updates.contenido = contentToSave;
          if (titleChanged) updates.titulo = currentTitle;

          // Use a "fire and forget" update with lower priority/background
          supabase.from("notion_documents")
            .update(updates)
            .eq("id", doc.id)
            .then();
        }
      }
      isDirtyRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleSaveOnExit();
    };
    const onBlur = () => {
      handleSaveOnExit();
    };
    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', handleSaveOnExit);
    window.addEventListener('pagehide', handleSaveOnExit);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', handleSaveOnExit);
      window.removeEventListener('pagehide', handleSaveOnExit);
      window.removeEventListener('blur', onBlur);
      handleSaveOnExit();
    };
  }, [handleSaveOnExit]);

  // Global shortcuts: Ctrl+/ shortcuts guide, intercept Ctrl+S to prevent browser native dialog
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      lastActivityRef.current = Date.now();
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("notion-open-shortcuts-guide"));
        return;
      }
      if (activeDocument && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        // Guardado continuo y silencioso sin toasts intrusivos
        saveDocument(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeDocument, saveDocument]);

  // Save before closing
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
      if (forceSaveTimerRef.current) window.clearTimeout(forceSaveTimerRef.current);
    };
  }, []);

  // === Document operations ===
  const openDocument = useCallback(async (doc: NotionDocument) => {
    // If opening the exact same document that is already open and loaded, do nothing
    if (activeDocumentRef.current?.id === doc.id && editorContentRef.current) {
      return;
    }

    // 1. Flush any existing auto-save timers
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (forceSaveTimerRef.current) {
      window.clearTimeout(forceSaveTimerRef.current);
      forceSaveTimerRef.current = null;
    }

    // 2. Cache current document content immediately before switching
    const prevDoc = activeDocumentRef.current;
    if (prevDoc && prevDoc.id !== doc.id) {
      const editor = tiptapEditorInstanceRef.current || tiptapEditorInstance;
      const currentDocContent = (editor && !editor.isDestroyed)
        ? editor.getJSON()
        : editorContentRef.current;
      if (currentDocContent) {
        tabContentCacheRef.current.set(prevDoc.id, currentDocContent);
        try {
          sessionStorage.setItem(`tabe_doc_content_${prevDoc.id}`, JSON.stringify(currentDocContent));
        } catch (e) {}
      }

      if (isDirtyRef.current) {
        await saveDocument(true, prevDoc, currentDocContent, localTitleRef.current).catch(console.error);
        isDirtyRef.current = false;
      }
    }

    // Save study time for the previous document before switching
    handleSaveOnExit();

    // Reset time tracking state for the new document
    totalSecondsRef.current = 0;
    savedSecondsRef.current = 0;
    setSessionSeconds(0);
    lastActivityRef.current = Date.now();

    // Stop previous audiobook playback on doc switch
    audioBook.stop();
    setShowAudioBookPlayer(false);

    // 3. Add to tabs if not already present
    setOpenTabs(prev => {
      if (prev.some(t => t.id === doc.id)) return prev;
      const newTab = { id: doc.id, title: doc.titulo || "Sin título", emoji: doc.emoji || "" };
      const updated = [...prev, newTab];
      return updated.length > 10 ? updated.slice(-10) : updated;
    });

    // 4. FAST PATH: Check memory cache and sessionStorage first (0ms instant switch)
    let rawContent = doc.contenido || tabContentCacheRef.current.get(doc.id);
    if (!rawContent) {
      try {
        const stored = sessionStorage.getItem(`tabe_doc_content_${doc.id}`);
        if (stored) {
          rawContent = JSON.parse(stored);
          tabContentCacheRef.current.set(doc.id, rawContent);
        }
      } catch (e) {}
    }

    if (rawContent) {
      let content = ensureTipTapFormat(rawContent);
      if (!content || !content.content || content.content.length === 0) {
        content = { type: "doc", content: [{ type: "paragraph" }] };
      }

      const contentStr = JSON.stringify(content);
      lastSavedContentRef.current = contentStr;
      isDirtyRef.current = false;
      pendingSaveRef.current = false;
      setSaveError(null);
      setLocalTitle(doc.titulo);
      localTitleRef.current = doc.titulo;
      setActiveDocument(doc);
      activeDocumentRef.current = doc;
      setLastSaved(null);
      try {
        sessionStorage.setItem("tabe_active_doc_id", doc.id);
      } catch (e) {}

      setEditorContent(content);
      editorContentRef.current = content;
      setIsOpeningDoc(false);

      const editor = tiptapEditorInstanceRef.current || tiptapEditorInstance;
      if (editor && !editor.isDestroyed) {
        editor.commands.setContent(content, false);
        editor.commands.setTextSelection(0);
        editor.setEditable(doc.user_id === user?.id);
        try {
          const scrollEl = document.querySelector('.notion-editor-wrapper') || document.querySelector('.word-a4-page') || document.querySelector('.word-a4-wrapper');
          if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'instant' });
        } catch {}
      }
      return;
    }

    // 5. SLOW PATH: Document not cached anywhere (first time opened from gallery)
    setIsOpeningDoc(true);
    setLocalTitle(doc.titulo);
    localTitleRef.current = doc.titulo;
    setActiveDocument(doc);
    activeDocumentRef.current = doc;
    setLastSaved(null);
    // Explicitly reset editor content to avoid stale content being displayed
    setEditorContent(null);
    editorContentRef.current = null;
    try {
      sessionStorage.setItem("tabe_active_doc_id", doc.id);
    } catch (e) {}

    const safetyTimer = setTimeout(() => setIsOpeningDoc(false), 5000);
    try {
      rawContent = await fetchDocumentContent(doc.id, false);
      if (rawContent) {
        tabContentCacheRef.current.set(doc.id, rawContent);
      }
    } finally {
      clearTimeout(safetyTimer);
      setIsOpeningDoc(false);
    }

    // If active document changed while awaiting DB fetch, discard stale response
    if (activeDocumentRef.current?.id !== doc.id) {
      return;
    }

    let content = ensureTipTapFormat(rawContent);
    if (!content || !content.content || content.content.length === 0) {
      content = { type: "doc", content: [{ type: "paragraph" }] };
    }

    const contentStr = JSON.stringify(content);
    lastSavedContentRef.current = contentStr;
    isDirtyRef.current = false;
    pendingSaveRef.current = false;
    setSaveError(null);
    setEditorContent(content);
    editorContentRef.current = content;

    const editor = tiptapEditorInstanceRef.current || tiptapEditorInstance;
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(content, false);
      editor.commands.setTextSelection(0);
      editor.setEditable(doc.user_id === user?.id);
      try {
        const scrollEl = document.querySelector('.notion-editor-wrapper') || document.querySelector('.word-a4-page') || document.querySelector('.word-a4-wrapper');
        if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'instant' });
      } catch {}
    }

    // Check for base64 images and migrate them in the background (non-blocking)
    if (contentStr.includes('data:image/')) {
      setSaveInProgress(true);
      migrateBase64Images(content, doc.id).then(cleaned => {
        if (activeDocumentRef.current?.id === doc.id) {
          setEditorContent(cleaned);
          editorContentRef.current = cleaned;
          lastSavedContentRef.current = JSON.stringify(cleaned);
          tabContentCacheRef.current.set(doc.id, cleaned);
        }
        setSaveInProgress(false);
      });
    }
  }, [saveDocument, handleSaveOnExit, fetchDocumentContent, migrateBase64Images, user?.id, tiptapEditorInstance]);

  const closeDocument = useCallback(() => {
    if (autoSaveTimerRef.current || forceSaveTimerRef.current || pendingSaveRef.current || saveInProgressRef.current) {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
      if (forceSaveTimerRef.current) window.clearTimeout(forceSaveTimerRef.current);
      saveDocument(true);
    }
    handleSaveOnExit();
    try {
      sessionStorage.removeItem("tabe_active_doc_id");
    } catch (e) {}
    setActiveDocument(null);
    setEditorContent(null);
    editorContentRef.current = null;
    setLocalTitle("");
    setOpenTabs([]);
    refetch();
  }, [saveDocument, refetch, handleSaveOnExit]);

  const closeTab = useCallback((tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    setOpenTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId);
      const next = prev.filter(t => t.id !== tabId);

      // If closing the active tab, switch to a neighbor
      if (activeDocument?.id === tabId) {
        if (next.length > 0) {
          const nextIdx = Math.min(idx, next.length - 1);
          const nextDoc = documents.find(d => d.id === next[nextIdx].id);
          if (nextDoc) {
            // Defer to avoid state conflicts
            setTimeout(() => openDocument(nextDoc), 0);
          }
        } else {
          // No more tabs — go to gallery
          if (autoSaveTimerRef.current || forceSaveTimerRef.current || pendingSaveRef.current || saveInProgressRef.current) {
            if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
            if (forceSaveTimerRef.current) window.clearTimeout(forceSaveTimerRef.current);
            saveDocument(true);
          }
          audioBook.stop();
          setShowAudioBookPlayer(false);
          handleSaveOnExit();
          setActiveDocument(null);
          setEditorContent(null);
          editorContentRef.current = null;
          setLocalTitle("");
          refetch();
        }
      }

      return next;
    });
  }, [activeDocument, documents, openDocument, saveDocument, handleSaveOnExit, refetch]);

  const handleTabClick = useCallback(async (tabId: string) => {
    if (activeDocumentRef.current?.id === tabId) return;
    let doc = documents.find(d => d.id === tabId);
    if (!doc) {
      const { data } = await supabase
        .from("notion_documents")
        .select(`
          id, user_id, subject_id, parent_id, titulo, emoji, cover_url, is_favorite, total_time_seconds, created_at, updated_at,
          owner:profiles(nombre, avatar_url, username),
          subject:subjects(id, nombre, codigo, año)
        `)
        .eq("id", tabId)
        .maybeSingle();
      if (data) doc = data as NotionDocument;
    }
    if (doc) openDocument(doc);
  }, [documents, openDocument]);

  // 1. Sincronización en tiempo real entre pestañas abiertas (BroadcastChannel, 0ms, 0 costo)
  useEffect(() => {
    const unsubscribe = subscribeNotionSync((msg) => {
      if (msg.type === "DOC_UPDATED") {
        const curDoc = activeDocumentRef.current;
        if (curDoc && curDoc.id === msg.docId) {
          // Si esta pestaña no tiene cambios locales sin guardar, actualizamos el editor en vivo
          if (!isDirtyRef.current && msg.content) {
            editorContentRef.current = msg.content;
            lastSavedContentRef.current = JSON.stringify(msg.content);
            setEditorContent(msg.content);
            if (tiptapEditorInstance && !tiptapEditorInstance.isDestroyed) {
              tiptapEditorInstance.commands.setContent(msg.content, false);
            }
            if (msg.title) {
              setLocalTitle(msg.title);
              localTitleRef.current = msg.title;
            }
            toast.info("Apunte sincronizado desde otra pestaña", { duration: 2500 });
          }
        }
      } else if (msg.type === "DOC_DELETED") {
        if (activeDocumentRef.current?.id === msg.docId) {
          closeDocument();
          toast.info("El apunte fue eliminado en otra pestaña");
        }
      }
    });

    return unsubscribe;
  }, [tiptapEditorInstance, closeDocument]);

  // 2. Revalidar apunte al volver a enfocar la pestaña (Pestaña B -> Pestaña A)
  useEffect(() => {
    const onWindowFocus = async () => {
      const curDoc = activeDocumentRef.current;
      if (!curDoc || isDirtyRef.current) return;

      try {
        const stored = sessionStorage.getItem(`tabe_doc_content_${curDoc.id}`);
        if (stored && stored !== lastSavedContentRef.current) {
          const parsed = JSON.parse(stored);
          editorContentRef.current = parsed;
          lastSavedContentRef.current = stored;
          setEditorContent(parsed);
          if (tiptapEditorInstance && !tiptapEditorInstance.isDestroyed) {
            tiptapEditorInstance.commands.setContent(parsed, false);
          }
        }
      } catch (e) {}
    };

    window.addEventListener("focus", onWindowFocus);
    return () => window.removeEventListener("focus", onWindowFocus);
  }, [tiptapEditorInstance]);

  // 3. Restaurar automáticamente el último apunte activo tras refresh (F5) para que no se quede colgado
  useEffect(() => {
    if (activeDocument || documents.length === 0) return;
    try {
      const savedDocId = sessionStorage.getItem("tabe_active_doc_id");
      if (savedDocId) {
        const target = documents.find((d) => d.id === savedDocId);
        if (target) {
          openDocument(target);
        }
      }
    } catch (e) {}
  }, [documents, activeDocument, openDocument]);

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
        newDocCustomTitle.trim() ||
        selectedTemplate.name;

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
        setNewDocCustomTitle("");
        setSelectedTemplate(tipTapTemplates[0]);
        await incrementUsage('apuntes');
        checkAndUnlockAchievements();
      }
    },
    [
      newDocSubjectId,
      newDocCustomTitle,
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
    const parentId = docToDelete.parent_id;
    const deletedId = docToDelete.id;

    await deleteDocument(deletedId);

    // Clean up caches
    tabContentCacheRef.current.delete(deletedId);
    try {
      sessionStorage.removeItem(`tabe_doc_content_${deletedId}`);
    } catch (e) {}

    setOpenTabs(prev => prev.filter(t => t.id !== deletedId));
    setShowDeleteModal(false);

    // If active document was deleted, navigate back to parent or clear
    if (activeDocument?.id === deletedId) {
      if (parentId) {
        const parentDoc = documents.find(d => d.id === parentId);
        if (parentDoc) {
          openDocument(parentDoc);
        } else {
          setActiveDocument(null);
          setEditorContent(null);
        }
      } else {
        setActiveDocument(null);
        setEditorContent(null);
      }
    }

    // Clean up subpage block reference from parent document content if applicable
    if (parentId) {
      const parentDoc = documents.find(d => d.id === parentId);
      if (parentDoc && parentDoc.contenido) {
        const removeSubPage = (node: any): any => {
          if (!node) return node;
          if (Array.isArray(node)) {
            return node.filter((c: any) => !(c?.type === "subPage" && c?.attrs?.pageId === deletedId)).map(removeSubPage);
          }
          if (node.content && Array.isArray(node.content)) {
            return {
              ...node,
              content: node.content
                .filter((c: any) => !(c?.type === "subPage" && c?.attrs?.pageId === deletedId))
                .map(removeSubPage)
            };
          }
          return node;
        };
        const cleaned = removeSubPage(parentDoc.contenido);
        await updateDocument(parentId, { contenido: cleaned });
      }
    }

    toast("Apunte en la papelera (tienes 30 min para recuperarlo)", {
      action: {
        label: "Deshacer",
        onClick: () => restoreDocument(deletedId),
      },
    });

    setDocToDelete(null);
  }, [docToDelete, activeDocument, deleteDocument, documents, openDocument, updateDocument, restoreDocument]);

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
      setOpenTabs(prev => prev.map(t => t.id === activeDocument.id ? { ...t, emoji } : t));
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

  const handleImportFriendNote = useCallback(
    async (
      content: any,
      title: string,
      subjectId: string,
      emoji: string,
      coverUrl?: string | null,
      sourceDocId?: string
    ) => {
      // Check monthly document limit for free users
      if (!isPremium && !canUse('apuntes')) {
        return;
      }

      const clonedTitle = title || "Sin título";
      const clonedEmoji = emoji || "📝";
      const clonedContent = content ? JSON.parse(JSON.stringify(content)) : { type: "doc", content: [{ type: "paragraph" }] };

      const newDoc = await createDocument(subjectId, clonedTitle);
      if (newDoc) {
        await updateDocument(newDoc.id, {
          contenido: clonedContent,
          emoji: clonedEmoji,
          cover_url: coverUrl || null,
        });

        // If the friend's document has child pages (subpages), clone them as well!
        if (sourceDocId && user) {
          try {
            const { data: childDocs } = await supabase
              .from("notion_documents")
              .select("id, titulo, contenido, emoji, cover_url")
              .eq("parent_id", sourceDocId);

            if (childDocs && childDocs.length > 0) {
              const idMapping: Record<string, string> = {};

              for (const child of childDocs) {
                const newChild = await createDocument(subjectId, child.titulo || "Sin título", newDoc.id);
                if (newChild) {
                  idMapping[child.id] = newChild.id;
                  await updateDocument(newChild.id, {
                    contenido: child.contenido ? JSON.parse(JSON.stringify(child.contenido)) : undefined,
                    emoji: child.emoji || "📝",
                    cover_url: child.cover_url || null,
                  });
                }
              }

              // Update any subpage block pageId references inside clonedContent
              let contentString = JSON.stringify(clonedContent);
              let hasReplacements = false;
              for (const [oldId, freshId] of Object.entries(idMapping)) {
                if (contentString.includes(oldId)) {
                  contentString = contentString.split(oldId).join(freshId);
                  hasReplacements = true;
                }
              }
              if (hasReplacements) {
                const updatedContent = JSON.parse(contentString);
                await updateDocument(newDoc.id, { contenido: updatedContent });
              }
            }
          } catch (childErr) {
            console.warn("Could not clone child subpages:", childErr);
          }
        }

        await refetch();
        const fullDoc = {
          ...newDoc,
          contenido: clonedContent,
          titulo: clonedTitle,
          emoji: clonedEmoji,
          cover_url: coverUrl || null,
        };
        openDocument(fullDoc);
        checkAndUnlockAchievements();
        await incrementUsage('apuntes');
        toast.success("¡Apunte importado con éxito a tu cuenta!");
      }
    },
    [createDocument, updateDocument, refetch, openDocument, checkAndUnlockAchievements, isPremium, canUse, incrementUsage, user]
  );
  // Save indicator text -- This is no longer used for text but logic depends on lastSaved
  const lastSavedText = useMemo(() => {
    if (lastSaved) {
      return `Guardado`;
    }
    return "";
  }, [lastSaved]);

  // Filtered subjects for new doc modal
  const [modalYear, setModalYear] = useState<number | null>(null);
  const modalSubjects = useMemo(
    () => (modalYear ? subjects.filter((s) => s.año === modalYear) : subjects),
    [subjects, modalYear]
  );
  const selectedDocSubject = useMemo(
    () => (newDocSubjectId ? subjects.find((s) => s.id === newDocSubjectId) : null),
    [subjects, newDocSubjectId]
  );

  // --- Gallery View Derived State ---
  const docIdSet = useMemo(() => new Set(documents.map((d) => d.id)), [documents]);

  const filteredAndSortedDocuments = useMemo(() => {
    // Show root documents and any orphan subpages whose parent was deleted
    let result = documents.filter((doc) => !doc.parent_id || !docIdSet.has(doc.parent_id));

    // Filter by year
    if (filterYear !== "all") {
      result = result.filter(doc => {
        const eff = resolveDocSubject(doc, subjects);
        return eff && eff.año != null && eff.año.toString() === filterYear;
      });
    }

    // Filter by subject
    if (filterSubject !== "all") {
      const selectedSubject = subjects.find(s => s.id === filterSubject);
      result = result.filter(doc => {
        if (doc.subject_id === filterSubject) return true;
        const eff = resolveDocSubject(doc, subjects);
        if (eff?.id === filterSubject) return true;
        if (selectedSubject && eff) {
          return normalizeSubjectName(eff.nombre) === normalizeSubjectName(selectedSubject.nombre) ||
                 (eff.codigo && selectedSubject.codigo && eff.codigo.toLowerCase() === selectedSubject.codigo.toLowerCase());
        }
        return false;
      });
    }

    // Filter by owner
    if (filterOwner === "mine" && user) {
      result = result.filter(doc => doc.user_id === user.id);
    } else if (filterOwner === "friends" && user) {
      result = result.filter(doc => doc.user_id !== user.id);
    }

    // Filter by search query (accent-insensitive)
    if (searchQuery.trim() !== "") {
      const q = searchQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      result = result.filter(doc => 
        (doc.titulo || "Sin título").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q)
      );
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
  }, [documents, filterSubject, filterYear, searchQuery, sortBy, filterOwner, user, subjects]);

  const filterSubjectOptions = useMemo(() => {
    const list: { id: string; name: string; año: number }[] = [];
    const seen = new Set<string>();

    // Materias del usuario
    subjects.forEach((s) => {
      const label = s.codigo || s.nombre;
      list.push({ id: s.id, name: label, año: s.año });
      seen.add(normalizeSubjectName(s.nombre));
      if (s.codigo) seen.add(s.codigo.toLowerCase().trim());
    });

    // Materias de documentos de amigos
    documents.forEach((d) => {
      const eff = resolveDocSubject(d, subjects);
      if (eff) {
        const norm = normalizeSubjectName(eff.nombre);
        const codeKey = eff.codigo ? eff.codigo.toLowerCase().trim() : "";
        if (!seen.has(norm) && (!codeKey || !seen.has(codeKey))) {
          seen.add(norm);
          if (codeKey) seen.add(codeKey);
          list.push({
            id: d.subject_id || eff.id || eff.nombre,
            name: `${eff.codigo || eff.nombre} (Amigos)`,
            año: eff.año,
          });
        }
      }
    });

    return list.sort((a, b) => a.año - b.año || a.name.localeCompare(b.name));
  }, [subjects, documents]);

  // Loading
  if (loading && documents.length === 0) {
    return <LoadingScreen message="Cargando Apuntes..." submessage="Abriendo tu espacio de notas..." />;
  }

  return (
    <div className="notion-app">

      {/* Main area */}
      <div className="notion-main">
        {/* Top bar */}
        {/* Unified Topbar */}
        <div className="notion-topbar">
          <div className="notion-topbar-left flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden mr-2">
            {/* Back link */}
            <Link
              to="/dashboard"
              onClick={() => {
                try {
                  ComicAudio.playPop();
                } catch {}
              }}
              className="flex items-center justify-center md:gap-1.5 w-8 h-8 md:w-auto md:px-2.5 md:py-1 rounded-xl border-2 border-foreground bg-card hover:bg-muted text-foreground font-black text-xs uppercase shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px] transition-all shrink-0 group mr-1"
              title="Volver al Dashboard"
              aria-label="Volver al Dashboard"
            >
              <ArrowLeft className="w-4 h-4 md:w-3.5 md:h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden md:inline">Volver</span>
            </Link>

            {activeDocument ? (
              <>
                {/* Subject badge (Click to return to subject notes) */}
                {activeDocument.subject?.codigo && (
                  <button
                    type="button"
                    onClick={closeDocument}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold border border-border/80 bg-secondary/80 hover:bg-secondary text-foreground transition-colors shrink-0 max-w-[130px] truncate"
                    title={`Materia: ${activeDocument.subject.nombre || activeDocument.subject.codigo} (clic para ver todos los apuntes)`}
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{activeDocument.subject.codigo}</span>
                  </button>
                )}

                {/* Subpage crumb if parentDoc is different from activeDoc */}
                {(() => {
                  const parentDoc = (activeDocument.parent_id && activeDocument.parent_id !== activeDocument.id)
                    ? documents.find(d => d.id === activeDocument.parent_id)
                    : null;
                  if (!parentDoc || parentDoc.id === activeDocument.id) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => openDocument(parentDoc)}
                      className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 max-w-[120px] truncate"
                      title={`Apunte principal: ${parentDoc.titulo}`}
                    >
                      <TabeIconRenderer iconId={parentDoc.emoji || "book"} size={13} />
                      <span className="truncate">{parentDoc.titulo}</span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0 ml-0.5" />
                    </button>
                  );
                })()}

                <div className="h-4 w-px bg-border/80 mx-1 shrink-0 hidden sm:block" />

                {/* Inline Tabs inside the same unified bar */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
                  {openTabs.map(tab => {
                    const isActive = activeDocument?.id === tab.id;
                    return (
                      <div
                        key={tab.id}
                        className={cn(
                          "group relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-all shrink-0 max-w-[180px]",
                          isActive
                            ? "bg-card text-foreground font-bold border-2 border-foreground shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))]"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent font-medium"
                        )}
                        onClick={() => handleTabClick(tab.id)}
                        title={tab.title}
                      >
                        <span className="shrink-0 flex items-center">
                          {tab.emoji ? (
                            <TabeIconRenderer iconId={tab.emoji} size={13} />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="truncate">
                          {isActive ? (localTitle || tab.title || "Sin título") : (tab.title || "Sin título")}
                        </span>
                        <button
                          type="button"
                          className={cn(
                            "rounded p-0.5 transition-all ml-0.5 shrink-0 hover:bg-destructive/15 hover:text-destructive",
                            isActive ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
                          )}
                          onClick={(e) => closeTab(tab.id, e)}
                          title="Cerrar pestaña"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <span className="font-black text-sm md:text-base uppercase tracking-wider text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#FFE600] text-black border border-black shadow-[1px_1px_0_0_#000] flex items-center justify-center text-xs">
                  📝
                </span>
                Apuntes
              </span>
            )}
          </div>

          <div className="notion-topbar-right flex items-center gap-1 shrink-0">
            {activeDocument ? (
              <>
                {/* Save indicator on error */}
                {saveError && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive rounded-md animate-in fade-in duration-300" title={saveError}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium hidden sm:inline uppercase tracking-wider">Error</span>
                  </div>
                )}

                {/* Timer Display */}
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors bg-secondary text-muted-foreground text-xs",
                    sessionSeconds > 0 && "bg-neon-green/10 text-neon-green font-semibold"
                  )}
                  title="Tiempo de estudio en este apunte"
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono tabular-nums">
                    {Math.floor(sessionSeconds / 60)}:{(sessionSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Favorite */}
                <button
                  type="button"
                  className={cn(
                    "h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
                    activeDocument.is_favorite && "text-amber-500 hover:text-amber-600"
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

                {/* Audio Book */}
                <button
                  type="button"
                  className={cn(
                    "h-8 w-8 inline-flex items-center justify-center rounded-lg transition-all duration-200",
                    audioBook.isPlaying
                      ? "text-black bg-[#BFFF00] border border-black shadow-[1px_1px_0_0_#000] animate-pulse"
                      : audioBook.isPaused
                      ? "text-black bg-[#FFD700] border border-black"
                      : showAudioBookPlayer
                      ? "text-primary bg-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  onClick={() => {
                    if (!showAudioBookPlayer) {
                      setShowAudioBookPlayer(true);
                      if (!audioBook.isPlaying && !audioBook.isPaused) {
                        handlePlayAudioFromCursor();
                      }
                    } else {
                      if (audioBook.isPlaying) {
                        audioBook.pause();
                      } else if (audioBook.isPaused) {
                        audioBook.resume();
                      } else {
                        handlePlayAudioFromCursor();
                      }
                    }
                  }}
                  title={
                    audioBook.isPlaying
                      ? "Pausar audio libro"
                      : audioBook.isPaused
                      ? "Reanudar audio libro"
                      : "Escuchar audio libro"
                  }
                >
                  {audioBook.isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                {/* AI Generation */}
                <button
                  type="button"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
                  onClick={() => setShowAIModal(true)}
                  title="Generar material de estudio con IA"
                >
                  <Sparkles className="w-4 h-4" />
                </button>

                {/* PDF Export */}
                {user && (
                  <TipTapPDFExporter
                    documentTitle={localTitle || activeDocument.titulo}
                    documentEmoji={activeDocument.emoji}
                    coverUrl={activeDocument.cover_url}
                    getContent={() => editorContentRef.current ?? editorContent}
                    subjectId={activeDocument.subject_id}
                    userId={user.id}
                  />
                )}

                {/* More Options Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Más opciones"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {activeDocument.user_id === user?.id && (
                      <DropdownMenuItem
                        onClick={() => {
                          setDocToChangeSubject(activeDocument);
                          setModalYear(null);
                          setShowChangeSubjectModal(true);
                        }}
                      >
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        Cambiar materia
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem onClick={() => setShowImportModal(true)}>
                      <FileUp className="w-4 h-4 mr-2" />
                      Importar documento
                    </DropdownMenuItem>

                    {activeDocument.user_id !== user?.id && (
                      <DropdownMenuItem
                        onClick={() => {
                          setPreselectedFriendNote({
                            id: activeDocument.id,
                            titulo: activeDocument.titulo,
                            emoji: activeDocument.emoji,
                            subject_id: activeDocument.subject_id,
                            user_id: activeDocument.user_id,
                            ownerName: activeDocument.owner?.nombre || activeDocument.owner?.username || "tu amigo",
                            cover_url: activeDocument.cover_url,
                            subject: activeDocument.subject
                          });
                          setShowImportFriendModal(true);
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2 text-primary" />
                        Importar copia a mis apuntes
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setTrashItems(getTrashItems());
                        setShowTrashModal(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2 text-amber-500" />
                      Ver papelera ({trashItems.length})
                    </DropdownMenuItem>

                    {activeDocument.user_id === user?.id && (
                      <>
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive font-medium"
                          onClick={() => {
                            setDocToDelete(activeDocument);
                            setShowDeleteModal(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar apunte
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-xs relative"
                  onClick={() => {
                    setTrashItems(getTrashItems());
                    setShowTrashModal(true);
                  }}
                  title="Papelera (30 min para recuperar)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Papelera</span>
                  {trashItems.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  )}
                </button>
                <button
                  type="button"
                  className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-xs"
                  onClick={() => setShowImportModal(true)}
                  title="Importar documento"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Importar</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Editor area */}
        <div className="notion-editor-area overflow-hidden flex flex-col h-full min-h-0 relative">
          {activeDocument ? (
            isOpeningDoc && !editorContent ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse font-medium">
                  Cargando apunte...
                </p>
              </div>
            ) : (
              <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              }>
                {isOpeningDoc && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 z-50 overflow-hidden">
                    <div className="h-full bg-primary w-full animate-pulse" />
                  </div>
                )}
                <AdvancedNotionEditor
                  key={activeDocument.id}
                  headerContent={
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
                          ref={titleTextareaRef}
                          value={localTitle}
                          onChange={(e) => {
                            handleTitleChange(e.target.value);
                            // Auto-resize
                            e.target.style.height = "auto";
                            e.target.style.height = e.target.scrollHeight + "px";
                          }}
                          className={cn("notion-title-input", activeDocument.user_id !== user?.id && "cursor-default select-none")}
                          placeholder="Sin título"
                          rows={1}
                          readOnly={activeDocument.user_id !== user?.id}
                          style={{ overflow: "hidden" }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const editor = document.querySelector(".ProseMirror") as HTMLElement;
                              editor?.focus();
                            }
                          }}
                        />
                      </div>

                      {/* Author indicator in editor */}
                      {activeDocument.user_id !== user?.id && activeDocument.owner && (
                        <div className="notion-author-badge flex flex-wrap items-center justify-between gap-3 px-8 md:px-14 mb-4 animate-in fade-in slide-in-from-left-2 duration-500">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                            {activeDocument.owner.avatar_url ? (
                              <img src={activeDocument.owner.avatar_url} className="w-5 h-5 rounded-full" alt="" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                                {(activeDocument.owner.nombre || activeDocument.owner.username || "A").charAt(0)}
                              </div>
                            )}
                            <span className="text-xs font-semibold tracking-tight">
                              Apunte de {activeDocument.owner.nombre || activeDocument.owner.username || "un amigo"}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/20 ml-1">Solo lectura</span>
                          </div>

                          <button
                            onClick={() => {
                              setPreselectedFriendNote({
                                id: activeDocument.id,
                                titulo: activeDocument.titulo,
                                emoji: activeDocument.emoji,
                                subject_id: activeDocument.subject_id,
                                user_id: activeDocument.user_id,
                                ownerName: activeDocument.owner?.nombre || activeDocument.owner?.username || "tu amigo",
                                cover_url: activeDocument.cover_url,
                                subject: activeDocument.subject
                              });
                              setShowImportFriendModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-1.5 bg-[#BFFF00] text-black font-black text-xs uppercase border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:shadow-[1px_1px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] transition-all rounded-lg"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Importar copia a mis apuntes
                          </button>
                        </div>
                      )}
                    </>
                  }
                  content={editorContent}
                  onUpdate={handleContentUpdate}
                  documentId={activeDocument?.id}
                  readOnly={activeDocument?.user_id !== user?.id}
                  onEditorReady={handleEditorReady}
                  onActivity={() => lastActivityRef.current = Date.now()}
                  onSubPageClick={async (pageId, pageTitle, blockId) => {
                      const parent = activeDocumentRef.current;
                      const parentId = parent?.id || null;
                      const subjectId = parent?.subject_id || "";

                      // 1. Si pageId es provisto (es un apunte existente o fue copiado/pegado con Ctrl+C o Ctrl+X)
                      if (pageId && pageId !== parentId) {
                        // Si estaba en la papelera (por haber sido cortado con Ctrl+X o borrado temporalmente), recuperarlo
                        restoreFromTrash(pageId);

                        let target = documents.find(d => d.id === pageId);
                        if (!target) {
                          const { data } = await supabase
                            .from("notion_documents")
                            .select(`
                              id, user_id, subject_id, parent_id, titulo, emoji, cover_url, is_favorite, total_time_seconds, created_at, updated_at,
                              owner:profiles(nombre, avatar_url, username),
                              subject:subjects(id, nombre, codigo, año)
                            `)
                            .eq("id", pageId)
                            .maybeSingle();
                          if (data) {
                            target = {
                              ...data,
                              subject: data.subject ? {
                                id: (data.subject as any).id,
                                nombre: (data.subject as any).nombre,
                                codigo: (data.subject as any).codigo,
                                year: (data.subject as any).año,
                              } : undefined
                            } as NotionDocument;
                          }
                        }

                        if (target && target.id !== parentId) {
                          // Si se pegó en otro apunte padre (ej. vía Ctrl+X o Ctrl+C y pegar), asociarlo a este padre si correspondía
                          if (target.parent_id && target.parent_id !== parentId) {
                            updateDocument(target.id, { parent_id: parentId } as any).catch(() => {});
                            target = { ...target, parent_id: parentId };
                          }
                          openDocument(target);
                          return;
                        }
                      }

                      // 2. Si no tiene pageId válido, o el documento apuntado fue eliminado, o pertenecía a otro padre:
                      // CREAR SIEMPRE UNA NUEVA SUBPÁGINA LIMPIA Y EXCLUSIVA PARA ESTE PADRE.
                      // NUNCA buscar ni reutilizar documentos existentes por título en la base de datos o en otros apuntes!
                      const newDoc = await createDocument(subjectId, pageTitle || "Sin título", parentId);
                      if (newDoc) {
                        document.dispatchEvent(new CustomEvent("notion-subpage-created", {
                          detail: { oldTitle: pageTitle, oldPageId: pageId, newPageId: newDoc.id, blockId },
                        }));
                        await new Promise(resolve => setTimeout(resolve, 50));
                        if (parent && isDirtyRef.current) {
                          await saveDocument(true);
                        }
                        const fullDoc: NotionDocument = {
                          ...newDoc,
                          parent_id: parentId,
                          contenido: { type: "doc", content: [{ type: "paragraph" }] },
                        };
                        openDocument(fullDoc);
                      }
                  }}
                />

                {/* Floating Audio Book Player */}
                {showAudioBookPlayer && activeDocument && (
                  <AudioBookPlayer
                    audioBook={audioBook}
                    documentTitle={localTitle || activeDocument.titulo}
                    onPlayFromBeginning={handlePlayAudioFromBeginning}
                    onPlayFromCursor={handlePlayAudioFromCursor}
                    onClose={() => {
                      audioBook.stop();
                      setShowAudioBookPlayer(false);
                    }}
                    hasCursorSelection={hasTextSelection}
                  />
                )}
              </Suspense>
            )
          ) : (
            /* Empty state / Gallery View */
            <div className="flex flex-col h-full bg-background text-foreground">
              {/* Header and Tabs */}
              <div className="flex flex-col gap-6 px-8 md:px-12 py-8 border-b-4 border-foreground bg-card text-foreground">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h1 className="text-4xl font-black tracking-tight uppercase">Tus Apuntes</h1>
                  
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="Buscar apunte..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 font-bold bg-background text-foreground border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] focus:shadow-[2px_2px_0_0_hsl(var(--foreground))] focus:translate-x-[2px] focus:translate-y-[2px] transition-all outline-none w-full sm:w-56 rounded-none placeholder:text-muted-foreground"
                      />
                    </div>

                    <button
                      onClick={() => {
                        setPreselectedFriendNote(null);
                        setShowImportFriendModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-[#BFFF00] text-black font-black uppercase border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-x-[2px] hover:translate-y-[2px] transition-all rounded-none"
                      title="Importar apuntes compartidos por tus amigos"
                    >
                      <Users className="w-5 h-5" />
                      Importar de Amigos
                    </button>

                    <button
                      onClick={() => setShowNewDocModal(true)}
                      className="inline-flex items-center gap-2 px-6 py-2 bg-[#00E5FF] text-black font-black uppercase border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-x-[2px] hover:translate-y-[2px] transition-all ml-auto sm:ml-0 rounded-none"
                    >
                      + Nueva Página
                    </button>
                  </div>
                </div>

                {/* Tabs & Filters Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Tabs */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { id: "all", label: "Todos" },
                      { id: "mine", label: "Mis Apuntes" },
                      { id: "friends", label: "De Amigos" }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setFilterOwner(tab.id as any)}
                        className={cn(
                          "px-4 py-2 font-black uppercase border-4 border-foreground transition-all rounded-none",
                          filterOwner === tab.id 
                            ? "bg-[#FFD700] text-black shadow-[2px_2px_0_0_hsl(var(--foreground))] translate-x-[2px] translate-y-[2px]" 
                            : "bg-card text-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:bg-muted hover:-translate-y-1 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))]"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Filter by Year */}
                    <Select value={filterYear} onValueChange={(val) => { setFilterYear(val); setFilterSubject("all"); }}>
                      <SelectTrigger className="w-[140px] bg-card text-foreground border-4 border-foreground font-bold shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-none focus:ring-0">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Año" />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-foreground border-4 border-foreground rounded-none shadow-[8px_8px_0_0_hsl(var(--foreground))]">
                        <SelectItem value="all" className="font-bold cursor-pointer focus:bg-accent focus:text-foreground">Todos los años</SelectItem>
                        {uniqueYears.map(year => (
                          <SelectItem key={year} value={year.toString()} className="font-bold cursor-pointer focus:bg-accent focus:text-foreground">Año {year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Filter by Subject */}
                    <Select value={filterSubject} onValueChange={setFilterSubject}>
                      <SelectTrigger className="w-[160px] bg-card text-foreground border-4 border-foreground font-bold shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-none focus:ring-0">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Materias" />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-foreground border-4 border-foreground rounded-none shadow-[8px_8px_0_0_hsl(var(--foreground))]">
                        <SelectItem value="all" className="font-bold cursor-pointer focus:bg-accent focus:text-foreground">Todas las materias</SelectItem>
                        {filterSubjectOptions
                          .filter(sub => filterYear === "all" || sub.año.toString() === filterYear)
                          .map(sub => (
                          <SelectItem key={sub.id} value={sub.id} className="font-bold cursor-pointer focus:bg-accent focus:text-foreground">{sub.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Sort */}
                    <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                      <SelectTrigger className="w-[160px] bg-card text-foreground border-4 border-foreground font-bold shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-none focus:ring-0">
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Ordenar" />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-foreground border-4 border-foreground rounded-none shadow-[8px_8px_0_0_hsl(var(--foreground))]">
                        <SelectItem value="updated" className="font-bold cursor-pointer focus:bg-accent focus:text-foreground">Recientes</SelectItem>
                        <SelectItem value="alpha_asc" className="font-bold cursor-pointer focus:bg-accent focus:text-foreground">A - Z</SelectItem>
                        <SelectItem value="alpha_desc" className="font-bold cursor-pointer focus:bg-accent focus:text-foreground">Z - A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-8 md:p-12">
                {documents.filter((d) => !d.parent_id || !docIdSet.has(d.parent_id)).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <p>No tienes apuntes todavía. ¡Creá una nueva página para empezar!</p>
                  </div>
                ) : filteredAndSortedDocuments.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <p>No hay apuntes que coincidan con la búsqueda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {filteredAndSortedDocuments.map((doc) => (
                      <MemoizedGalleryCard 
                        key={doc.id}
                        doc={doc}
                        userSubjects={subjects}
                        onClick={openDocument}
                        onRename={(d) => {
                          setDocToRename(d);
                          setNewTitle(d.titulo || "");
                          setShowRenameModal(true);
                        }}
                        onChangeSubject={(d) => {
                          setDocToChangeSubject(d);
                          setModalYear(null);
                          setShowChangeSubjectModal(true);
                        }}
                        onDelete={(d) => {
                          setDocToDelete(d);
                          setShowDeleteModal(true);
                        }}
                        currentUserId={user?.id}
                        onImportFriendDoc={(d) => {
                          setPreselectedFriendNote({
                            id: d.id,
                            titulo: d.titulo,
                            emoji: d.emoji,
                            subject_id: d.subject_id,
                            user_id: d.user_id,
                            ownerName: d.owner?.nombre || d.owner?.username || "tu amigo",
                            cover_url: d.cover_url,
                            subject: d.subject
                          });
                          setShowImportFriendModal(true);
                        }}
                      />
                    ))}
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
        <DialogContent className="max-w-md bg-card text-foreground border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-xl uppercase tracking-tight text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Renombrar Apunte
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
             <div className="space-y-2">
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Título del apunte..."
                  onKeyDown={(e) => {
                     if (e.key === "Enter") handleRenameSubmit();
                  }}
                  className="w-full px-4 py-2.5 bg-background text-foreground rounded-xl border-[3px] border-foreground font-bold text-sm shadow-[3px_3px_0_0_hsl(var(--foreground))] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] transition-all placeholder:text-muted-foreground"
                />
             </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-3">
             <button
               onClick={() => setShowRenameModal(false)}
               className="flex-1 px-4 py-2.5 rounded-xl border-2 border-foreground font-black uppercase text-xs bg-card text-foreground hover:bg-muted transition-all"
             >
               Cancelar
             </button>
             <button
               onClick={handleRenameSubmit}
               className="flex-1 px-4 py-2.5 rounded-xl border-2 border-foreground font-black uppercase text-xs bg-[#00E5FF] text-black shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-all"
             >
               Guardar cambios
             </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Document Modal */}
      <Dialog open={showNewDocModal} onOpenChange={(open) => {
        setShowNewDocModal(open);
        if (!open) {
          setNewDocCustomTitle("");
        }
      }}>
        <DialogContent className="max-w-2xl bg-card text-foreground border-4 border-foreground shadow-[10px_10px_0_0_hsl(var(--foreground))] rounded-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b-4 border-foreground">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#00E5FF] border-3 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] flex items-center justify-center -rotate-3 shrink-0">
                <FileText className="w-6 h-6 text-black" />
              </div>
              <div>
                <DialogTitle className="font-display font-black text-2xl uppercase tracking-tight text-foreground">
                  Nuevo Apunte
                </DialogTitle>
                <p className="text-xs sm:text-sm font-bold text-muted-foreground mt-0.5">
                  Elegí una materia, personalizá el título y comenzá con una plantilla.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowNewDocModal(false)}
              className="p-1.5 rounded-lg border-2 border-foreground bg-card hover:bg-[#FF5C5C] hover:text-black hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all text-foreground shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5 pt-4">
            {/* Paso 1: Materia */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-black">1</span>
                  Materia *
                </label>
                {selectedDocSubject && (
                  <button
                    type="button"
                    onClick={() => setNewDocSubjectId(null)}
                    className="text-xs font-black uppercase text-primary hover:underline flex items-center gap-1"
                  >
                    Cambiar materia
                  </button>
                )}
              </div>

              {selectedDocSubject ? (
                /* Materia seleccionada (card de confirmación) */
                <div className="bg-muted/40 border-[3px] border-foreground rounded-xl p-3.5 flex items-center justify-between shadow-[3px_3px_0_0_hsl(var(--foreground))]">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="px-2.5 py-1 text-xs font-black bg-[#00E5FF] text-black border-2 border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))] uppercase shrink-0">
                      {selectedDocSubject.codigo || `Año ${selectedDocSubject.año}`}
                    </span>
                    <div className="min-w-0">
                      <p className="font-black text-sm text-foreground truncate">
                        {selectedDocSubject.nombre}
                      </p>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase">
                        Año {selectedDocSubject.año}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewDocSubjectId(null)}
                    className="px-3 py-1.5 rounded-lg bg-card text-foreground font-black text-xs uppercase border-2 border-foreground hover:bg-[#FF5C5C] hover:text-black hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all shrink-0 ml-3"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                /* Selector de Año y Materia */
                <div className="space-y-3 bg-muted/20 border-2 border-foreground/30 rounded-xl p-3.5">
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1.5">Filtrar por año:</span>
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setModalYear(null)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-2",
                          modalYear === null
                            ? "bg-[#FFD700] text-black border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                            : "bg-card text-foreground border-foreground/40 hover:border-foreground"
                        )}
                      >
                        Todos
                      </button>
                      {[1, 2, 3, 4, 5, 6].map((year) => (
                        <button
                          key={year}
                          type="button"
                          onClick={() => setModalYear(year)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-2",
                            modalYear === year
                              ? "bg-[#FFD700] text-black border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                              : "bg-card text-foreground border-foreground/40 hover:border-foreground"
                          )}
                        >
                          {year}° Año
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1.5">Elegí la materia:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                      {modalSubjects.map((subject) => (
                        <button
                          key={subject.id}
                          type="button"
                          onClick={() => setNewDocSubjectId(subject.id)}
                          className="p-2.5 rounded-xl border-2 border-foreground/50 bg-card text-foreground text-left transition-all hover:border-foreground hover:bg-accent hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] group"
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-[#00E5FF] text-black border border-foreground rounded">
                              {subject.codigo || `Año ${subject.año}`}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground">Año {subject.año}</span>
                          </div>
                          <p className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                            {subject.nombre}
                          </p>
                        </button>
                      ))}
                      {modalSubjects.length === 0 && (
                        <div className="col-span-full py-4 text-center text-xs font-bold text-muted-foreground">
                          No hay materias registradas para este filtro.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Paso 2: Título (Opcional) */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-black">2</span>
                Título de la Página (opcional)
              </label>
              <input
                type="text"
                value={newDocCustomTitle}
                onChange={(e) => setNewDocCustomTitle(e.target.value)}
                placeholder={`Ej: ${selectedTemplate.name} - Unidad 1`}
                className="w-full px-4 py-2.5 bg-background text-foreground rounded-xl border-[3px] border-foreground font-bold text-sm shadow-[3px_3px_0_0_hsl(var(--foreground))] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] transition-all placeholder:text-muted-foreground placeholder:font-medium"
              />
            </div>

            {/* Paso 3: Plantilla */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-black">3</span>
                Elegí una Plantilla de Inicio
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tipTapTemplates.map((template) => {
                  const isSelected = selectedTemplate.id === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template)}
                      className={cn(
                        "p-3 rounded-xl text-left transition-all border-[3px] flex items-start gap-3 relative",
                        isSelected
                          ? "bg-[#BFFF00]/15 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] translate-y-[-1px]"
                          : "bg-card text-foreground border-foreground/40 hover:border-foreground hover:bg-muted/40 hover:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg border-2 border-foreground flex items-center justify-center text-xl shrink-0 shadow-[2px_2px_0_0_hsl(var(--foreground))]",
                        isSelected ? "bg-[#BFFF00] text-black" : "bg-muted"
                      )}>
                        {template.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-black text-sm text-foreground truncate">{template.name}</p>
                          {isSelected && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-[#BFFF00] text-black border border-foreground rounded px-1.5 py-0.5 shrink-0 flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Activa
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                          {template.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="flex items-center gap-3 pt-3 border-t-2 border-foreground/20">
              <button
                type="button"
                onClick={() => setShowNewDocModal(false)}
                className="px-5 py-3 rounded-xl border-[3px] border-foreground font-black uppercase tracking-wider bg-card text-foreground hover:bg-muted transition-all text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleCreateDocument()}
                disabled={!newDocSubjectId}
                className="flex-1 px-6 py-3.5 rounded-xl border-[3px] border-foreground font-black uppercase tracking-wider bg-[#00E5FF] text-black shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <Sparkles className="w-4 h-4" />
                {`Crear con "${selectedTemplate.name}"`}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Subject Modal */}
      <Dialog open={showChangeSubjectModal} onOpenChange={setShowChangeSubjectModal}>
        <DialogContent className="max-w-lg bg-card text-foreground border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-xl uppercase tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Cambiar Materia
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 block">Filtrar por año</label>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setModalYear(null)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-2",
                    modalYear === null
                      ? "bg-[#FFD700] text-black border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                      : "bg-card text-foreground border-foreground/40 hover:border-foreground"
                  )}
                >
                  Todos
                </button>
                {[1, 2, 3, 4, 5, 6].map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setModalYear(year)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-2",
                      modalYear === year
                        ? "bg-[#FFD700] text-black border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                        : "bg-card text-foreground border-foreground/40 hover:border-foreground"
                    )}
                  >
                    {year}° Año
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 block">
                Materia Destino
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {modalSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => handleChangeSubjectSubmit(subject.id)}
                    className="p-2.5 rounded-xl border-2 border-foreground/60 bg-card text-foreground text-left transition-all hover:border-foreground hover:bg-accent hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] group"
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-[#00E5FF] text-black border border-foreground rounded">
                        {subject.codigo || `Año ${subject.año}`}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">Año {subject.año}</span>
                    </div>
                    <p className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                      {subject.nombre}
                    </p>
                  </button>
                ))}
                {modalSubjects.length === 0 && (
                  <div className="col-span-full text-center text-xs font-bold text-muted-foreground py-4">
                    No hay materias en este año.
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Página</DialogTitle>
          </DialogHeader>

          <p className="text-muted-foreground text-sm">
            ¿Estás seguro de mover a la papelera "
            <span className="font-semibold text-foreground">{docToDelete?.titulo || "Sin título"}</span>"?
            Tendrás <span className="text-amber-500 font-bold">30 minutos</span> para recuperarla antes de que se elimine definitivamente de la base de datos.
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
              Mover a papelera
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trash Modal (30 min recovery grace period) */}
      <Dialog open={showTrashModal} onOpenChange={setShowTrashModal}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-amber-500" />
              Papelera (30 min para recuperar)
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            Los apuntes eliminados o cortados se conservan durante 30 minutos antes de eliminarse automáticamente de la base de datos.
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 my-3 max-h-[50vh] pr-1">
            {trashItems.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                La papelera está vacía
              </div>
            ) : (
              trashItems.map((item) => {
                const minutesLeft = Math.max(1, Math.ceil((item.expiresAt - Date.now()) / (60 * 1000)));
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary/50 transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-lg shrink-0">{item.emoji || "📝"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-amber-500/90 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 inline" />
                          Expira en {minutesLeft} min
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={async () => {
                          await restoreDocument(item.id);
                          setTrashItems(getTrashItems());
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-xs"
                        title="Restaurar apunte"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restaurar
                      </button>
                      <button
                        onClick={async () => {
                          await permanentlyDeleteDocument(item.id);
                          setTrashItems(getTrashItems());
                        }}
                        className="p-1.5 text-xs rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Eliminar definitivamente ahora"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
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
      {/* AI Material Generation Modal */}
      <Dialog open={showAIModal} onOpenChange={(val) => !isGeneratingAI && setShowAIModal(val)}>
        <DialogContent className="sm:max-w-[450px] border-primary/20 bg-[#0d0d0d] shadow-[0_0_30px_rgba(168,85,247,0.15)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display font-bold">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <span>Magia de Tabe AI</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-medium text-muted-foreground">¿Qué quieres generar?</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setAiGenType('flashcards')}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border transition-all gap-2",
                    aiGenType === 'flashcards' 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-secondary/40 border-border hover:border-primary/40 text-muted-foreground"
                  )}
                >
                  <Star className="w-6 h-6" />
                  <span className="font-bold text-sm">Flashcards</span>
                </button>
                <button
                  onClick={() => setAiGenType('quiz')}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border transition-all gap-2",
                    aiGenType === 'quiz' 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-secondary/40 border-border hover:border-primary/40 text-muted-foreground"
                  )}
                >
                  <Keyboard className="w-6 h-6" />
                  <span className="font-bold text-sm">Cuestionario</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 px-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">Cantidad de items</label>
                <span className="text-sm font-bold text-primary">{aiGenCount}</span>
              </div>
              <input 
                type="range"
                min="5"
                max="30"
                step="5"
                value={aiGenCount}
                onChange={(e) => setAiGenCount(parseInt(e.target.value))}
                className="w-full accent-primary bg-secondary h-1.5 rounded-full appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                <span>Poco</span>
                <span>Normal</span>
                <span>Mucho</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed italic opacity-80 bg-secondary/30 p-3 rounded-lg border border-border/50">
              Tabe AI analizará todo el contenido de este apunte para crear material de estudio personalizado. 
              El resultado se guardará automáticamente en su sección correspondiente vinculada a esta materia.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowAIModal(false)}
              disabled={isGeneratingAI}
              className="font-bold tracking-tight text-xs uppercase"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateAI}
              disabled={isGeneratingAI}
              className="bg-gradient-to-r from-neon-purple to-neon-cyan text-white border-white/10 shadow-lg shadow-primary/20 font-bold tracking-tight text-xs uppercase px-8"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Hacer Magia
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Note from Friend Modal */}
      <ImportFriendNoteModal
        open={showImportFriendModal}
        onOpenChange={(open) => {
          setShowImportFriendModal(open);
          if (!open) setPreselectedFriendNote(null);
        }}
        friends={friendsList}
        mySubjects={subjects}
        onImport={handleImportFriendNote}
        preselectedNote={preselectedFriendNote}
      />
    </div>
  );
}
