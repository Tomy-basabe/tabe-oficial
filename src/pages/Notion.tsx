import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Menu, Star, Clock, Trash2, Loader2, Save,
  MoreHorizontal, FileUp, Smile, ImageIcon, Keyboard,
  Search, Filter, ArrowUpDown, FileText, AlertCircle,
  Sparkles, Volume2, Square, X, BookOpen, Check, Copy, Users
} from "lucide-react";
import { cn, toLocalDateStr } from "@/lib/utils";
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
import { ImportFriendNoteModal } from "@/components/notion/ImportFriendNoteModal";
import { NotionBreadcrumb } from "@/components/notion/NotionBreadcrumb";
import { KeyboardShortcutsModal } from "@/components/notion/KeyboardShortcutsModal";
import { useNotionDocuments, NotionDocument } from "@/hooks/useNotionDocuments";
import { useFriends } from "@/hooks/useFriends";
import { useAchievements } from "@/hooks/useAchievements";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { JSONContent } from "@tiptap/core";
import { tipTapTemplates, TipTapTemplate } from "@/lib/tipTapTemplates";
import { ensureTipTapFormat } from "@/lib/contentMigration";
import "@/components/notion/notion-editor.css";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { useAudioBook } from "@/hooks/useAudioBook";
import { AudioBookPlayer } from "@/components/notion/AudioBookPlayer";
import { resolveDocSubject, normalizeSubjectName } from "@/lib/notionSubjectHelper";

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
      onMouseEnter={() => onHover?.(doc)}
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
            {/* Simulated mini page header line */}
            <div className="w-12 h-2 bg-foreground mb-3" />
            
            {textSnippet ? (
               <div className="opacity-80">
                 <p className="text-[11px] text-foreground font-bold leading-[1.7] line-clamp-5 text-left">
                   {textSnippet}
                 </p>
               </div>
            ) : (
              <div className="w-full h-full flex mt-4 justify-center">
                 <span className="text-foreground text-[10px] uppercase font-black tracking-widest border-2 border-dashed border-foreground px-3 py-1 bg-muted h-fit">Vacío</span>
              </div>
            )}
            {/* Gradient fade to hide text bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
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
  
  // Audio Book state & instance
  const audioBook = useAudioBook();
  const [showAudioBookPlayer, setShowAudioBookPlayer] = useState(false);
  const [tiptapEditorInstance, setTiptapEditorInstance] = useState<any>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<NotionDocument | null>(null);

  // Tabs state
  interface TabItem { id: string; title: string; emoji: string; }
  const [openTabs, setOpenTabs] = useState<TabItem[]>([]);
  
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
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
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

  // Sync state to refs to avoid stale closures in callbacks
  useEffect(() => {
    activeDocumentRef.current = activeDocument;
  }, [activeDocument]);

  useEffect(() => {
    localTitleRef.current = localTitle;
  }, [localTitle]);

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
    async (silent = true): Promise<boolean> => {
      const docToSave = activeDocumentRef.current;
      if (!docToSave) return true;
      
      // Safety check: Don't try to save documents that don't belong to the user
      if (user && docToSave.user_id !== user.id) {
        return true;
      }
      
      if (saveInProgressRef.current) {
        pendingSaveRef.current = true;
        return true; 
      }

      const contentToSave = editorContentRef.current;
      if (!contentToSave) return true;
      
      const contentStr = JSON.stringify(contentToSave);
      const currentTitle = localTitleRef.current;

      // 10MB soft limit to avoid Supabase errors / browser freezes
      if (contentStr.length > 10 * 1024 * 1024) {
        console.error("Payload too large:", contentStr.length);
        setSaveError("El documento es demasiado grande para guardar (probablemente por imágenes pegadas)");
        return false;
      }

      const contentChanged = contentStr !== lastSavedContentRef.current;
      const titleChanged = currentTitle !== docToSave.titulo;

      if (!contentChanged && !titleChanged) {
        // Check if something was queued while we were "thinking"
        if (pendingSaveRef.current) {
           pendingSaveRef.current = false;
           return saveDocument(silent);
        }
        return true;
      }

      setIsSaving(true);
      setSaveInProgress(true);
      saveInProgressRef.current = true;
      pendingSaveRef.current = false;
      setSaveError(null);

      try {
        const updates: { contenido?: JSONContent; titulo?: string } = {};
        if (contentChanged) updates.contenido = contentToSave;
        if (titleChanged) updates.titulo = currentTitle;

        const success = await updateDocument(docToSave.id, updates);
        if (success) {
          lastSavedContentRef.current = contentStr;
          // Only update state if we are still on the SAME document
          if (activeDocumentRef.current?.id === docToSave.id) {
            setActiveDocument((prev) => (prev ? { ...prev, titulo: currentTitle } : null));
          }
          setLastSaved(new Date());
          if (!silent) toast.success("Apunte guardado");
          return true;
        } else {
          throw new Error("Update failed");
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
        // If changes were made while we were saving, trigger another save immediately
        if (pendingSaveRef.current) {
          await saveDocument(silent);
        }
      }
    },
    [updateDocument]
  );

  // Trigger auto-save on content changes
  const scheduleAutoSave = useCallback(() => {
    // 1. Debounce timer (1.5s of inactivity)
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      saveDocument(true);
      if (forceSaveTimerRef.current) {
        window.clearTimeout(forceSaveTimerRef.current);
        forceSaveTimerRef.current = null;
      }
    }, 1500);

    // 2. Continuous typing periodic save (5s)
    if (!forceSaveTimerRef.current) {
      forceSaveTimerRef.current = window.setTimeout(() => {
        saveDocument(true);
        forceSaveTimerRef.current = null;
      }, 5000); 
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

    // 2. Save Document Content (Best effort on exit)
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
          .then(); // Just fire it
      }
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
      if (forceSaveTimerRef.current) window.clearTimeout(forceSaveTimerRef.current);
    };
  }, []);

  // === Document operations ===
  const openDocument = useCallback(async (doc: NotionDocument) => {
    // Save current doc first
    if (autoSaveTimerRef.current || forceSaveTimerRef.current || pendingSaveRef.current || saveInProgressRef.current) {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
      if (forceSaveTimerRef.current) window.clearTimeout(forceSaveTimerRef.current);
      autoSaveTimerRef.current = null;
      forceSaveTimerRef.current = null;
      await saveDocument(true);
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

    setLocalTitle(doc.titulo);
    setActiveDocument(doc);
    setLastSaved(null);

    // Add to tabs if not already present
    setOpenTabs(prev => {
      if (prev.some(t => t.id === doc.id)) return prev;
      const newTab = { id: doc.id, title: doc.titulo || "Sin título", emoji: doc.emoji || "" };
      // Keep max 10 tabs
      const updated = [...prev, newTab];
      return updated.length > 10 ? updated.slice(-10) : updated;
    });

    // Fetch content if not already loaded (lazy loading)
    if (!doc.contenido) {
      setIsOpeningDoc(true);
      const fullContent = await fetchDocumentContent(doc.id);
      setIsOpeningDoc(false);
      
      if (fullContent) {
        let content = ensureTipTapFormat(fullContent);
        // Check for base64 images and migrate them in the background
        if (JSON.stringify(content).includes('data:image/')) {
          setSaveInProgress(true);
          content = await migrateBase64Images(content, doc.id);
          setSaveInProgress(false);
        }
        lastSavedContentRef.current = JSON.stringify(content);
        setEditorContent(content);
        editorContentRef.current = content;
      }
    } else {
      let content = ensureTipTapFormat(doc.contenido);
       // Check for base64 images and migrate them in the background
       if (JSON.stringify(content).includes('data:image/')) {
        setSaveInProgress(true);
        migrateBase64Images(content, doc.id).then(cleaned => {
          setEditorContent(cleaned);
          editorContentRef.current = cleaned;
          lastSavedContentRef.current = JSON.stringify(cleaned);
          setSaveInProgress(false);
        });
      }
      lastSavedContentRef.current = JSON.stringify(content);
      setEditorContent(content);
      editorContentRef.current = content;
    }
  }, [saveDocument, handleSaveOnExit, fetchDocumentContent]);

  const closeDocument = useCallback(() => {
    if (autoSaveTimerRef.current || forceSaveTimerRef.current || pendingSaveRef.current || saveInProgressRef.current) {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
      if (forceSaveTimerRef.current) window.clearTimeout(forceSaveTimerRef.current);
      saveDocument(true);
    }
    handleSaveOnExit();
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

  const handleTabClick = useCallback((tabId: string) => {
    if (activeDocument?.id === tabId) return;
    const doc = documents.find(d => d.id === tabId);
    if (doc) openDocument(doc);
  }, [activeDocument, documents, openDocument]);

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
  const filteredAndSortedDocuments = useMemo(() => {
    // Only root-level documents (do not show child pages of other notes in main gallery)
    let result = documents.filter(doc => !doc.parent_id);

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
        <div className="notion-topbar">
          <div className="notion-topbar-left">

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
                {/* Silent Save indicator (Red indicator on error) */}
                {saveError && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive/10 text-destructive rounded-md animate-in fade-in duration-300" title={saveError}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Error de Guardado</span>
                  </div>
                )}
                {saveInProgress && !saveError && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary text-muted-foreground rounded-md animate-in fade-in duration-300">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Guardando...</span>
                  </div>
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

                {/* Audio Book */}
                <button
                  className={cn(
                    "notion-topbar-btn transition-all duration-300 relative",
                    audioBook.isPlaying
                      ? "text-black bg-[#BFFF00] ring-2 ring-black font-black animate-pulse shadow-[2px_2px_0_0_#000]"
                      : audioBook.isPaused
                      ? "text-black bg-[#FFD700] ring-2 ring-black font-black"
                      : showAudioBookPlayer
                      ? "text-primary bg-primary/20 ring-1 ring-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
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
                      ? "Pausar audio libro (recordará tu posición)"
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
                  className="notion-topbar-btn text-primary hover:bg-primary/10"
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

                {/* Import */}
                <button
                  className="notion-topbar-btn"
                  onClick={() => setShowImportModal(true)}
                  title="Importar documento"
                >
                  <FileUp className="w-4 h-4" />
                </button>

                {/* Import friend doc to my account */}
                {activeDocument.user_id !== user?.id && (
                  <button
                    className="notion-topbar-btn text-black bg-[#BFFF00] hover:bg-[#a6e600] font-black flex items-center gap-1.5 px-3 py-1 rounded shadow-[2px_2px_0_0_hsl(var(--foreground))]"
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
                    title="Importar una copia a mis apuntes"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-xs hidden sm:inline uppercase">Importar Copia</span>
                  </button>
                )}

                {/* Keyboard shortcuts */}
                <button
                  className="notion-topbar-btn"
                  onClick={() => setShowShortcutsModal(true)}
                  title="Atajos de teclado (Ctrl+/)"
                >
                  <Keyboard className="w-4 h-4" />
                </button>

                {/* Management actions - ONLY FOR OWNER */}
                {activeDocument.user_id === user?.id && (
                  <>
                    <button
                      className="notion-topbar-btn"
                      onClick={() => {
                        setDocToChangeSubject(activeDocument);
                        setModalYear(null);
                        setShowChangeSubjectModal(true);
                      }}
                      title="Cambiar materia"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </button>

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

        {/* Tabs Bar */}
        {openTabs.length > 0 && (
          <div className="notion-tabs-bar">
            {openTabs.map(tab => (
              <div
                key={tab.id}
                className={cn("notion-tab", activeDocument?.id === tab.id && "active")}
                onClick={() => handleTabClick(tab.id)}
                title={tab.title}
              >
                <span className="notion-tab-emoji">
                  {tab.emoji ? <TabeIconRenderer iconId={tab.emoji} size={14} /> : <FileText className="w-3.5 h-3.5" />}
                </span>
                <span className="notion-tab-title">{tab.title || "Sin título"}</span>
                <button
                  className="notion-tab-close"
                  onClick={(e) => closeTab(tab.id, e)}
                  title="Cerrar pestaña"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Editor area */}
        <div className="notion-editor-area overflow-hidden flex flex-col h-full min-h-0">
          {activeDocument ? (
            isOpeningDoc ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse font-medium">
                  Cargando contenido pesado...
                </p>
              </div>
            ) : (
              <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              }>
                <AdvancedNotionEditor
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
                  onEditorReady={setTiptapEditorInstance}
                  onActivity={() => lastActivityRef.current = Date.now()}
                  onSubPageClick={async (pageId, pageTitle) => {
                      if (pageId) {
                        let target = documents.find(d => d.id === pageId);
                        if (!target) {
                          const { data } = await supabase
                            .from("notion_documents")
                            .select("*")
                            .eq("id", pageId)
                            .single();
                          if (data) target = data as NotionDocument;
                        }
                        if (target) {
                          openDocument(target);
                          return;
                        }
                      }

                      const subjectId = activeDocument?.subject_id || "";
                      const newDoc = await createDocument(subjectId, pageTitle || "Sin título", activeDocument?.id || undefined);
                      if (newDoc) {
                        document.dispatchEvent(new CustomEvent("notion-subpage-created", {
                          detail: { oldTitle: pageTitle, newPageId: newDoc.id },
                        }));
                        await saveDocument(true);
                        const fullDoc = { ...newDoc, parent_id: activeDocument?.id || null };
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
                {documents.filter(d => !d.parent_id).length === 0 ? (
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
                        onHover={(d) => prefetchDocumentContent(d.id)}
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
