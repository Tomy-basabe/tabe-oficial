import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Menu, Star, Clock, Trash2, Loader2, Save, RotateCcw,
  MoreHorizontal, FileUp, Smile, ImageIcon, Keyboard,
  Search, Filter, ArrowUpDown, FileText, AlertCircle,
   Volume2, Square, X, BookOpen, Check, Copy, Users, ArrowLeft,
  GraduationCap, ChevronRight, Share2, Play, Pause,
  Layers, HelpCircle, Brain, Zap, FlaskConical,
  PanelLeft, Lock, Unlock, Type, Maximize } from "lucide-react";
import { cn, toLocalDateStr } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
const AdvancedNotionEditor = lazy(() => import("@/components/notion/AdvancedNotionEditor").then(m => ({ default: m.AdvancedNotionEditor })));
import { EmojiPicker } from "@/components/notion/EmojiPicker";
import { NotionSidebar } from "@/components/notion/NotionSidebar";
import { NotionCoverPickerModal } from "@/components/notion/NotionCoverPickerModal";
import { TabeIconRenderer } from "@/components/notion/TabeIcons";
import { TipTapPDFExporter } from "@/components/notion/TipTapPDFExporter";
import { ImportDocumentModal } from "@/components/notion/ImportDocumentModal";
import { ImportFriendNoteModal } from "@/components/notion/ImportFriendNoteModal";
import { ShareDocumentModal } from "@/components/notion/ShareDocumentModal";
import { useNotionCollab } from "@/hooks/useNotionCollab";
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
import { usePageTitle } from "@/hooks/useDynamicTitle";
import { useStudyTimer } from "@/contexts/StudyTimerContext";
import { motion, AnimatePresence } from "framer-motion";

const getYearAccent = (year?: number) => {
  switch (year) {
    case 1:
      return {
        badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/60",
        dot: "bg-sky-500",
      };
    case 2:
      return {
        badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
        dot: "bg-emerald-500",
      };
    case 3:
      return {
        badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
        dot: "bg-amber-500",
      };
    case 4:
      return {
        badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60",
        dot: "bg-purple-500",
      };
    case 5:
      return {
        badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60",
        dot: "bg-rose-500",
      };
    default:
      return {
        badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-700/60",
        dot: "bg-zinc-400",
      };
  }
};

interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  año: number;
}


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
  onImportFriendDoc,
  onShare,
  friendsList,
  onToggleFavorite,
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
  onShare?: (doc: NotionDocument) => void;
  friendsList?: { user_id: string; nombre: string | null; username: string | null; avatar_url: string | null }[];
  onToggleFavorite?: (doc: NotionDocument) => void;
}) => {
  const hasCover = !!doc.cover_url;

  const isOwner = !currentUserId || doc.user_id === currentUserId;

  const effectiveOwner = useMemo(() => {
    if (doc.owner && (doc.owner.nombre || doc.owner.username)) {
      return doc.owner;
    }
    if (!isOwner && doc.user_id && friendsList) {
      const friend = friendsList.find((f) => f.user_id === doc.user_id);
      if (friend) {
        return {
          nombre: friend.nombre,
          username: friend.username,
          avatar_url: friend.avatar_url,
        };
      }
    }
    return doc.owner;
  }, [doc.owner, doc.user_id, isOwner, friendsList]);

  // Resolver materia y año del documento (propio o de amigos)
  const resolvedSubject = useMemo(
    () => resolveDocSubject(doc, userSubjects),
    [doc, userSubjects]
  );

  return (
    <div
      onClick={() => onClick(doc)}
      className="group flex flex-col bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm h-[300px]"
    >
      {/* Top Area: Cover Image or Clean Tabe Logo */}
      <div className={cn("h-40 w-full relative border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/40 overflow-hidden", !hasCover && "p-5")}>
        {/* Favorite Button on Card */}
        {onToggleFavorite && (
          <div className={cn(
            "absolute top-2 left-2 z-10 transition-all",
            doc.is_favorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(doc);
              }}
              className={cn(
                "p-1.5 rounded-lg border backdrop-blur-md shadow-xs transition-all cursor-pointer",
                doc.is_favorite
                  ? "bg-amber-500/20 text-amber-500 border-amber-500/40 hover:bg-amber-500/30"
                  : "bg-white/90 dark:bg-zinc-800/90 border-zinc-200/80 dark:border-zinc-700/80 text-zinc-500 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              )}
              title={doc.is_favorite ? "Quitar de favoritos" : "Marcar como favorito"}
            >
              <Star className="w-3.5 h-3.5" fill={doc.is_favorite ? "currentColor" : "none"} />
            </button>
          </div>
        )}
        {/* Card Actions Overlay (Dropdown) - ONLY FOR OWNER */}
        {isOwner && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg shadow-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-lg p-1.5 min-w-[160px]">
                <DropdownMenuItem
                  className="font-medium text-xs cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-800/80 rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare && onShare(doc);
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2 text-zinc-500" />
                  Compartir
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-zinc-800" />
                <DropdownMenuItem
                  className="font-medium text-xs cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-800/80 rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRename(doc);
                  }}
                >
                  <FileText className="w-4 h-4 mr-2 text-zinc-500" />
                  Renombrar
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-zinc-800" />
                <DropdownMenuItem
                  className="font-medium text-xs cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-800/80 rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeSubject(doc);
                  }}
                >
                  <ArrowUpDown className="w-4 h-4 mr-2 text-zinc-500" />
                  Cambiar Materia
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-zinc-800" />
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/30 font-medium text-xs cursor-pointer rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(doc);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2 text-red-500" />
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
              className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg shadow-2xs font-medium text-xs transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200"
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
          <div className="w-full h-full flex items-center justify-center">
            <TabeLogo size={52} className="opacity-40 group-hover:opacity-85 group-hover:scale-110 transition-all duration-300 drop-shadow-sm select-none" />
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="p-4 flex flex-col flex-1 bg-transparent">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shrink-0 transition-transform group-hover:scale-105">
            {doc.emoji ? <TabeIconRenderer iconId={doc.emoji} size={22} /> : <FileText className="w-5 h-5" />}
          </div>
          <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate tracking-tight flex-1" title={doc.titulo}>
            {doc.titulo || "Sin título"}
          </h3>
        </div>

        {/* Badges de Materia y Año */}
        <div className="flex mt-auto pt-2 gap-2 flex-wrap items-center">
          {resolvedSubject ? (
            <>
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 rounded border border-zinc-200/60 dark:border-zinc-700/60" title={resolvedSubject.nombre}>
                {resolvedSubject.codigo || resolvedSubject.nombre}
              </span>
              <span className={cn("inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border", getYearAccent(resolvedSubject.año).badge)}>
                Año {resolvedSubject.año}
              </span>
              {resolvedSubject.isLinkedToMyPlan && !isOwner && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded border border-amber-200/60 dark:border-amber-800/60" title="Esta materia coincide con tu plan de estudio importado">
                  Plan común
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400 rounded border border-zinc-200/60 dark:border-zinc-700/60">
              Sin materia
            </span>
          )}
          {doc.is_shared && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded border border-emerald-200/60 dark:border-emerald-800/60">
              <Users className="w-3 h-3" /> Cooperativo
            </span>
          )}
        </div>

        {/* Owner indicator for friend docs */}
        {!isOwner && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 px-2 py-1 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg min-w-0">
              {effectiveOwner?.avatar_url ? (
                <img src={effectiveOwner.avatar_url} className="w-5 h-5 rounded-full border border-zinc-300 dark:border-zinc-600 shrink-0" alt="" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center text-[10px] font-medium shrink-0">
                  {(effectiveOwner?.nombre || effectiveOwner?.username || "A").charAt(0)}
                </div>
              )}
              <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-medium truncate">
                De: {effectiveOwner?.nombre || effectiveOwner?.username || "Amigo"}
              </span>
            </div>
            {onImportFriendDoc && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onImportFriendDoc({ ...doc, owner: effectiveOwner });
                }}
                className="px-2 py-1 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded font-medium text-[10px] uppercase shadow-2xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shrink-0 flex items-center gap-1"
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
  const location = useLocation();
  const {
    documents,
    setDocuments,
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
  const [showCoverPickerModal, setShowCoverPickerModal] = useState(false);
  const [notionFont, setNotionFont] = useState<"sans" | "serif" | "mono">(() => {
    return (localStorage.getItem("tabe_notion_font") as "sans" | "serif" | "mono") || "sans";
  });
  const [notionFullWidth, setNotionFullWidth] = useState<boolean>(() => {
    return localStorage.getItem("tabe_notion_fullwidth") === "true";
  });
  const [notionSmallText, setNotionSmallText] = useState<boolean>(() => {
    return localStorage.getItem("tabe_notion_smalltext") === "true";
  });
  const [notionLocked, setNotionLocked] = useState<boolean>(false);

  // Shortcut Ctrl+\ to toggle Notion sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleUpdateCover = useCallback(async (url: string | null) => {
    if (!activeDocument) return;
    const isOwner = activeDocument.user_id === user?.id;
    const canEdit = isOwner ||
      (activeDocument.is_shared && activeDocument.share_permission === "edit") ||
      activeDocument.user_permission === "edit" ||
      (activeDocument.is_collaborator && activeDocument.share_permission === "edit");
    if (!canEdit) {
      toast.error("Solo el propietario o editores autorizados pueden modificar la portada");
      return;
    }
    try {
      await updateDocument(activeDocument.id, { cover_url: url });
      setActiveDocument((prev) => (prev ? { ...prev, cover_url: url } : null));
      toast.success(url ? "Portada actualizada" : "Portada eliminada");
    } catch {
      toast.error("Error al actualizar la portada");
    }
  }, [activeDocument, updateDocument, user?.id]);

  // Título dinámico para la pestaña con el nombre del apunte abierto
  usePageTitle(activeDocument ? (activeDocument.titulo || "Nuevo Apunte") : null);

  // Trash modal & items state (30 min recovery grace period)
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [trashItems, setTrashItems] = useState<TrashItem[]>(() => getTrashItems());

  useEffect(() => {
    const handler = () => setTrashItems(getTrashItems());
    window.addEventListener("tabe-trash-updated", handler);
    return () => window.removeEventListener("tabe-trash-updated", handler);
  }, []);

  // Escuchar solicitudes de clonación automática en segundo plano cuando se copia y pega una subpágina (Ctrl+C -> Ctrl+V)
  useEffect(() => {
    const handleCloneRequest = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const { copyFromPageId, title, blockId } = detail || {};
      if (!copyFromPageId || !blockId) return;

      const parent = activeDocumentRef.current;
      const parentId = parent?.id || null;
      const subjectId = parent?.subject_id || "";

      try {
        let sourceContent = await fetchDocumentContent(copyFromPageId);
        let sourceEmoji = "book";
        let sourceTitle = title || "Sin título";

        const existingDoc = documents.find((d) => d.id === copyFromPageId);
        if (existingDoc) {
          sourceEmoji = existingDoc.emoji || "book";
          if (!title || title === "Sin título") {
            sourceTitle = existingDoc.titulo || "Sin título";
          }
        } else {
          const { data } = await supabase
            .from("notion_documents")
            .select("titulo, emoji")
            .eq("id", copyFromPageId)
            .maybeSingle();
          if (data) {
            sourceEmoji = data.emoji || "book";
            if (!title || title === "Sin título") {
              sourceTitle = data.titulo || "Sin título";
            }
          }
        }

        const clonedContent = sourceContent
          ? JSON.parse(JSON.stringify(sourceContent))
          : { type: "doc", content: [{ type: "paragraph" }] };

        // Crear una subpágina COMPLETAMENTE NUEVA e independiente
        const newDoc = await createDocument(
          subjectId,
          sourceTitle,
          parentId,
          clonedContent,
          sourceEmoji
        );

        if (newDoc) {
          // Asignar el nuevo pageId independiente al bloque y limpiar copyFromPageId
          document.dispatchEvent(
            new CustomEvent("notion-subpage-created", {
              detail: {
                blockId,
                newPageId: newDoc.id,
                oldPageId: copyFromPageId,
                newTitle: sourceTitle,
              },
            })
          );
        }
      } catch (err) {
        console.error("Error al clonar subpágina copiada:", err);
      }
    };

    document.addEventListener("notion-subpage-clone-request", handleCloneRequest);
    return () => document.removeEventListener("notion-subpage-clone-request", handleCloneRequest);
  }, [createDocument, fetchDocumentContent, documents]);

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

  const activeDocOwner = useMemo(() => {
    if (activeDocument?.owner && (activeDocument.owner.nombre || activeDocument.owner.username)) {
      return activeDocument.owner;
    }
    if (activeDocument && activeDocument.user_id !== user?.id) {
      const friend = friendsList.find((f) => f.user_id === activeDocument.user_id);
      if (friend) {
        return {
          nombre: friend.nombre,
          username: friend.username,
          avatar_url: friend.avatar_url,
        };
      }
    }
    return activeDocument?.owner;
  }, [activeDocument, user?.id, friendsList]);

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

  // Global Study Timer
  const {
    isActive: isStudyTimerActive,
    isPaused: isStudyTimerPaused,
    seconds: studyTimerSeconds,
    startTimer: startStudyTimer,
    pauseTimer: pauseStudyTimer,
    resumeTimer: resumeStudyTimer,
    stopTimer: stopStudyTimer,
    switchDocument: switchStudyDocument,
    formatTime: formatStudyTime,
  } = useStudyTimer();

  const lastActivityRef = useRef<number>(Date.now());

  // Gallery view filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<"all" | "mine" | "collaborative" | "friends">("all");
  const [sortBy, setSortBy] = useState<"updated" | "alpha_asc" | "alpha_desc">("updated");

  // Share Modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [docToShare, setDocToShare] = useState<NotionDocument | null>(null);

  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    subjects.forEach(s => { if (s.año != null) years.add(s.año); });
    documents.forEach(d => {
      const eff = resolveDocSubject(d, subjects);
      if (eff?.año != null) years.add(eff.año);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [subjects, documents]);

  // Helper to determine if a document or any ancestor in the tree is shared/collaborative
  const isDocOrAncestorCollaborative = useCallback((doc: NotionDocument | null): boolean => {
    if (!doc) return false;
    if (doc.is_shared || doc.is_collaborator || doc.share_token) return true;
    let curr: NotionDocument | undefined = doc;
    const visited = new Set<string>();
    while (curr?.parent_id && !visited.has(curr.id)) {
      visited.add(curr.id);
      const parent = documents.find(d => d.id === curr?.parent_id);
      if (parent) {
        if (parent.is_shared || parent.is_collaborator || parent.share_token) {
          return true;
        }
        curr = parent;
      } else {
        break;
      }
    }
    return false;
  }, [documents]);

  // Realtime collaboration hook for the currently active document or its subpages
  const isCollabActive = useMemo(
    () => isDocOrAncestorCollaborative(activeDocument),
    [activeDocument, isDocOrAncestorCollaborative]
  );

  const isRemoteUpdateRef = useRef(false);

  // Hook colaborativo industrial con Yjs + Supabase Realtime Provider
  const {
    ydoc,
    provider: collabProvider,
    activeCollaborators,
    isConnected: isCollabConnected,
    currentUser: collabUser,
  } = useNotionCollab({
    documentId: activeDocument?.id,
    user,
    userProfile: user?.user_metadata ? {
      nombre: user.user_metadata.nombre || user.user_metadata.full_name,
      avatar_url: user.user_metadata.avatar_url,
    } : null,
    enabled: isCollabActive,
  });

  // Handle sharing updates from ShareDocumentModal
  const handleUpdateSharing = useCallback(async (updates: {
    is_shared: boolean;
    share_permission: "view" | "edit";
    share_token: string | null;
    is_public?: boolean;
  }) => {
    if (!docToShare) return false;
    const success = await updateDocument(docToShare.id, updates);
    if (success) {
      setDocToShare(prev => prev ? { ...prev, ...updates } : null);
      if (activeDocument && activeDocument.id === docToShare.id) {
        setActiveDocument(prev => prev ? { ...prev, ...updates } : null);
      }
    }
    return success;
  }, [docToShare, updateDocument, activeDocument]);


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
            .upload(fileName, blob, { cacheControl: '31536000', upsert: false });

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
        const rawCards = Array.isArray(data.data) ? data.data : (data.data?.cards || data.cards || []);
        if (!rawCards || rawCards.length === 0) throw new Error("No se pudieron generar flashcards.");

        const { data: deck, error: deckError } = await supabase
          .from("flashcard_decks")
          .insert({
            user_id: user.id,
            subject_id: activeDocument.subject_id,
            nombre: `IA: ${activeDocument.titulo?.substring(0, 30)}`,
            total_cards: rawCards.length,
            is_public: false
          })
          .select()
          .single();

        if (deckError) throw deckError;

        const cardRows = rawCards.map((c: any) => ({
          deck_id: deck.id,
          user_id: user.id,
          pregunta: c.pregunta || c.question,
          respuesta: c.respuesta || c.answer
        }));

        const { error: cardsError } = await supabase
          .from("flashcards")
          .insert(cardRows);

        if (cardsError) throw cardsError;

        toast.success(`¡Mazo de ${rawCards.length} flashcards creado en la sección de Flashcards!`, { id: toastId });
      } else {
        const questions = Array.isArray(data.data) ? data.data : (data.data?.questions || data.questions || []);
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
  // @AI-CRITICAL-INSTRUCTION: PROTECCIÓN CONTRA LOG INGESTION MASIVA.
  // Este hook de auto-guardado está calibrado para usar debouncing seguro.
  // Si vas a modificar extensiones de TipTap (como SubPageBlock), ASEGÚRATE de que updateAttributes() 
  // no se llame en un bucle infinito de useEffect o re-renders, ya que eso dispararía este guardado cientos de veces por minuto,
  // agotando rápidamente la cuota de Log Ingestion en Supabase.
  const saveDocument = useCallback(
    async (
      silent = true,
      explicitDoc?: NotionDocument | null,
      explicitContent?: JSONContent | null,
      explicitTitle?: string
    ): Promise<boolean> => {
      const docToSave = explicitDoc || activeDocumentRef.current;
      if (!docToSave) return true;

      // Safety check: Don't try to save documents that don't belong to the user unless they have edit permission
      const canEditShared = Boolean(
        docToSave.is_shared && docToSave.share_permission === "edit"
      ) || docToSave.user_permission === "edit";

      if (user && docToSave.user_id !== user.id && !canEditShared) {
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

      const updates: { contenido?: JSONContent; titulo?: string } = {};

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
                emoji: subDoc?.emoji || "book"
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

    // En sesiones cooperativas usamos un debounce más largo (4.5s) para evitar colisiones de guardado simultáneo
    const debounceMs = isCollabActive ? 4500 : 2500;
    const forceSaveMs = isCollabActive ? 25000 : 25000;

    // 1. Debounce timer: tras dejar de escribir
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      // Si se recibió una actualización remota en los últimos 2.5s, posponer el guardado para evitar sobrescrituras
      const timeSinceRemote = Date.now() - lastRemoteUpdateTimestampRef.current;
      if (isCollabActive && timeSinceRemote < 2500) {
        autoSaveTimerRef.current = window.setTimeout(() => {
          saveDocument(true);
        }, 2500);
        return;
      }
      saveDocument(true);
      if (forceSaveTimerRef.current) {
        window.clearTimeout(forceSaveTimerRef.current);
        forceSaveTimerRef.current = null;
      }
    }, debounceMs);

    // 2. Continuous typing periodic save:
    if (!forceSaveTimerRef.current) {
      forceSaveTimerRef.current = window.setTimeout(() => {
        saveDocument(true);
        forceSaveTimerRef.current = null;
      }, forceSaveMs);
    }
  }, [saveDocument, isCollabActive]);

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
      if (isRemoteUpdateRef.current) {
        isRemoteUpdateRef.current = false;
        return;
      }

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

  // Synchronize global study timer with activeDocument
  useEffect(() => {
    if (activeDocument) {
      if (!isStudyTimerActive) {
        startStudyTimer(activeDocument.subject_id || null, activeDocument.id, activeDocument.titulo);
      } else {
        switchStudyDocument(activeDocument.subject_id || null, activeDocument.id, activeDocument.titulo);
      }
    }
  }, [activeDocument?.id, activeDocument?.subject_id]);

  const handleSaveOnExit = useCallback(() => {
    const doc = activeDocumentRef.current;
    if (!doc || !user) return;

    // Document Content (Best effort on exit ONLY if dirty)
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
        } catch (e) { }
      }

      if (isDirtyRef.current) {
        await saveDocument(true, prevDoc, currentDocContent, localTitleRef.current).catch(console.error);
        isDirtyRef.current = false;
      }
    }

    // Save study time for the previous document before switching
    handleSaveOnExit();

    // Switch study timer context (preserves running session if subpage or same subject!)
    switchStudyDocument(doc.subject_id || null, doc.id, doc.titulo);
    lastActivityRef.current = Date.now();

    // Stop previous audiobook playback on doc switch
    audioBook.stop();
    setShowAudioBookPlayer(false);

    // Guardar apunte activo en sessionStorage para no perderlo si el usuario recarga la página
    try {
      sessionStorage.setItem("tabe_active_doc_id", doc.id);
    } catch (e) { }

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
      } catch (e) { }
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

      setEditorContent(content);
      editorContentRef.current = content;
      setIsOpeningDoc(false);

      const editor = tiptapEditorInstanceRef.current || tiptapEditorInstance;
      if (editor && !editor.isDestroyed) {
        const isCollab = isDocOrAncestorCollaborative(doc);
        if (!isCollab) {
          editor.commands.setContent(content, false);
        } else if (ydoc && ydoc.getXmlFragment('default').length === 0) {
          editor.commands.setContent(content, false);
        }
        editor.commands.setTextSelection(0);
        const canEditDoc = doc.user_id === user?.id || (
          (doc.is_shared && doc.share_permission === 'edit') ||
          doc.user_permission === 'edit' ||
          (doc.is_collaborator && doc.share_permission === 'edit') ||
          isCollab
        );
        editor.setEditable(canEditDoc);
        try {
          const scrollEl = document.querySelector('.notion-editor-wrapper') || document.querySelector('.word-a4-page') || document.querySelector('.word-a4-wrapper');
          if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'instant' });
        } catch { }
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
    setEditorContent(null);
    editorContentRef.current = null;

    try {
      rawContent = await fetchDocumentContent(doc.id, false);
      if (rawContent) {
        tabContentCacheRef.current.set(doc.id, rawContent);
      }
    } finally {
      setIsOpeningDoc(false);
    }

    // If active document changed while awaiting DB fetch, discard stale response
    if (activeDocumentRef.current?.id !== doc.id) {
      return;
    }

    if (!rawContent) {
      toast.error("No se pudo cargar el contenido del apunte. Haz clic para reintentar.", {
        action: {
          label: "Reintentar",
          onClick: () => openDocument(doc),
        },
      });
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
      try {
        const isCollab = isDocOrAncestorCollaborative(doc);
        if (!isCollab) {
          editor.commands.setContent(content, false);
        } else if (ydoc && ydoc.getXmlFragment('default').length === 0) {
          editor.commands.setContent(content, false);
        }
        editor.commands.setTextSelection(0);
      } catch (err) {
        console.error("Error setting editor content:", err);
      }
      const canEditDoc = doc.user_id === user?.id || (
        (doc.is_shared && doc.share_permission === 'edit') ||
        doc.user_permission === 'edit' ||
        (doc.is_collaborator && doc.share_permission === 'edit') ||
        isCollab
      );
      editor.setEditable(canEditDoc);
      try {
        const scrollEl = document.querySelector('.notion-editor-wrapper') || document.querySelector('.word-a4-page') || document.querySelector('.word-a4-wrapper');
        if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'instant' });
      } catch { }
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
  }, [saveDocument, handleSaveOnExit, fetchDocumentContent, migrateBase64Images, user, tiptapEditorInstance]);

  // Check for ?share=TOKEN in URL to automatically join and open shared cooperative note
  const processedShareTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchStr = location.search || window.location.search;
    const params = new URLSearchParams(searchStr);
    const shareToken = params.get("share");
    if (!shareToken) return;
    if (processedShareTokenRef.current === shareToken) return;
    processedShareTokenRef.current = shareToken;

    // Limpiar URL sin recargar para evitar re-ejecuciones accidentales
    try {
      window.history.replaceState({}, "", window.location.pathname);
    } catch { }

    let isCancelled = false;

    const joinSharedDocument = async () => {
      try {
        let sharedDoc: any = null;

        // 1. Buscar primero por share_token
        const tokenRes = await supabase
          .from("notion_documents")
          .select(`
            id, user_id, subject_id, parent_id, titulo, emoji, cover_url, is_favorite, total_time_seconds, created_at, updated_at,
            is_shared, share_token, share_permission,
            owner:profiles(nombre, avatar_url, username),
            subject:subjects(id, nombre, codigo, año)
          `)
          .eq("share_token", shareToken)
          .maybeSingle();

        if (tokenRes.data) {
          sharedDoc = tokenRes.data;
        } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shareToken)) {
          // 2. Si no se encontró por token y el parámetro es un UUID, buscar por ID
          const idRes = await supabase
            .from("notion_documents")
            .select(`
              id, user_id, subject_id, parent_id, titulo, emoji, cover_url, is_favorite, total_time_seconds, created_at, updated_at,
              is_shared, share_token, share_permission,
              owner:profiles(nombre, avatar_url, username),
              subject:subjects(id, nombre, codigo, año)
            `)
            .eq("id", shareToken)
            .maybeSingle();

          if (idRes.data) {
            sharedDoc = idRes.data;
          } else {
            // Fallback resiliente por si las columnas is_shared/share_token no existen en la tabla
            const fallbackRes = await supabase
              .from("notion_documents")
              .select(`
                id, user_id, subject_id, parent_id, titulo, emoji, cover_url, is_favorite, total_time_seconds, created_at, updated_at,
                owner:profiles(nombre, avatar_url, username),
                subject:subjects(id, nombre, codigo, año)
              `)
              .eq("id", shareToken)
              .maybeSingle();
            if (fallbackRes.data) {
              sharedDoc = fallbackRes.data;
            }
          }
        }

        if (!sharedDoc) {
          toast.error("El enlace de colaboración no existe o fue revocado");
          return;
        }

        if (isCancelled) return;

        // Si el usuario tiene sesión y no es el dueño, registrarlo como colaborador
        if (user && user.id !== sharedDoc.user_id) {
          await supabase
            .from("notion_document_collaborators")
            .upsert({
              document_id: sharedDoc.id,
              user_id: user.id,
              permission: sharedDoc.share_permission || "edit",
            }, { onConflict: "document_id,user_id" })
            .catch(() => { });
        }

        const mappedDoc: NotionDocument = {
          ...sharedDoc,
          subject: sharedDoc.subject ? {
            id: (sharedDoc.subject as any).id,
            nombre: (sharedDoc.subject as any).nombre,
            codigo: (sharedDoc.subject as any).codigo,
            year: (sharedDoc.subject as any).año,
          } : undefined,
          is_shared: true,
          share_permission: (sharedDoc.share_permission as any) || "edit",
          is_collaborator: user?.id ? user.id !== sharedDoc.user_id : true,
          user_permission: user?.id === sharedDoc.user_id ? "owner" : ((sharedDoc.share_permission as any) || "edit"),
        };

        // Agregar de inmediato a la lista de documentos para que esté visible en pestañas y navegación
        setDocuments((prev) => {
          if (prev.some((d) => d.id === mappedDoc.id)) {
            return prev.map((d) => (d.id === mappedDoc.id ? mappedDoc : d));
          }
          return [mappedDoc, ...prev];
        });

        // Cargar también posibles subpáginas del apunte para que funcionen los enlaces internos
        try {
          const { data: subPages } = await supabase
            .from("notion_documents")
            .select(`
              id, user_id, subject_id, parent_id, titulo, emoji, cover_url, is_favorite, total_time_seconds, created_at, updated_at,
              is_shared, share_token, share_permission,
              owner:profiles(nombre, avatar_url, username),
              subject:subjects(id, nombre, codigo, año)
            `)
            .eq("parent_id", mappedDoc.id);

          if (subPages && subPages.length > 0) {
            const mappedSubs = subPages.map((sub: any) => ({
              ...sub,
              is_shared: true,
              share_permission: mappedDoc.share_permission,
              is_collaborator: mappedDoc.is_collaborator,
              user_permission: mappedDoc.user_permission,
            })) as NotionDocument[];

            setDocuments((prev) => {
              const existingIds = new Set(prev.map((d) => d.id));
              const newSubs = mappedSubs.filter((s) => !existingIds.has(s.id));
              return [...prev, ...newSubs];
            });
          }
        } catch (e) {
          console.warn("Could not prefetch subpages for shared document:", e);
        }

        await openDocument(mappedDoc);
        toast.success(`Abriendo apunte compartido: ${mappedDoc.titulo || "Sin título"}`);
      } catch (err) {
        console.error("Error joining shared document:", err);
      }
    };

    joinSharedDocument();

    return () => {
      isCancelled = true;
    };
  }, [user, location.search, openDocument, setDocuments]);

  // Restaurar automáticamente el apunte abierto al recargar la página
  const restoredDocIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeDocument || loading || documents.length === 0) return;
    try {
      const savedDocId = sessionStorage.getItem("tabe_active_doc_id");
      if (savedDocId && savedDocId !== restoredDocIdRef.current) {
        restoredDocIdRef.current = savedDocId;
        const targetDoc = documents.find((d) => d.id === savedDocId);
        if (targetDoc) {
          openDocument(targetDoc);
        }
      }
    } catch { }
  }, [activeDocument, loading, documents, openDocument]);

  const closeDocument = useCallback(() => {
    if (autoSaveTimerRef.current || forceSaveTimerRef.current || pendingSaveRef.current || saveInProgressRef.current) {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
      if (forceSaveTimerRef.current) window.clearTimeout(forceSaveTimerRef.current);
      saveDocument(true);
    }
    handleSaveOnExit();
    try {
      sessionStorage.removeItem("tabe_active_doc_id");
    } catch (e) { }
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
      } catch (e) { }
    };

    window.addEventListener("focus", onWindowFocus);
    return () => window.removeEventListener("focus", onWindowFocus);
  }, [tiptapEditorInstance]);

  // Limpiar cualquier referencia residual al montar para asegurar que siempre abra en la selección de apuntes
  useEffect(() => {
    try {
      sessionStorage.removeItem("tabe_active_doc_id");
    } catch (e) { }
  }, []);

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
      const defaultDocTitle = selectedTemplate.id === 'blank' ? "Sin título" : selectedTemplate.name;
      const title =
        newDocCustomTitle.trim() ||
        defaultDocTitle;

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
    } catch (e) { }

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
    (doc: NotionDocument) => {
      const nextFavorite = !doc.is_favorite;

      // 1. Actualización optimista inmediata en activeDocument
      if (activeDocument?.id === doc.id) {
        setActiveDocument((prev) =>
          prev ? { ...prev, is_favorite: nextFavorite } : null
        );
      }

      // 2. Actualización optimista inmediata en documents
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, is_favorite: nextFavorite } : d))
      );

      // 3. Actualización optimista en openTabs
      setOpenTabs((prev) =>
        prev.map((t) => (t.id === doc.id ? { ...t, is_favorite: nextFavorite } : t))
      );

      // 4. Feedback instantáneo
      toast.success(
        nextFavorite ? "Añadido a Favoritos" : "Quitado de Favoritos",
        { duration: 1500 }
      );

      // 5. Persistencia en Supabase en segundo plano sin bloquear la UI
      updateDocument(doc.id, { is_favorite: nextFavorite }).catch((err) => {
        console.error("Error al actualizar favorito:", err);
        // Revertir en caso improbable de error
        if (activeDocument?.id === doc.id) {
          setActiveDocument((prev) =>
            prev ? { ...prev, is_favorite: !nextFavorite } : null
          );
        }
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, is_favorite: !nextFavorite } : d))
        );
        toast.error("No se pudo guardar el favorito");
      });
    },
    [updateDocument, activeDocument]
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
      const clonedEmoji = emoji || "book";
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
                    emoji: child.emoji || "book",
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
  const modalSubjects = useMemo(() => {
    const list = modalYear ? subjects.filter((s) => s.año === modalYear) : subjects;
    return [...list].sort((a, b) => {
      const aApp = a.status === "aprobada";
      const bApp = b.status === "aprobada";
      if (aApp !== bApp) return aApp ? 1 : -1;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [subjects, modalYear]);
  const isOwnerOrCanEdit = useMemo(() => {
    if (!activeDocument) return false;
    return (
      activeDocument.user_id === user?.id ||
      (activeDocument.is_shared && activeDocument.share_permission === "edit") ||
      activeDocument.user_permission === "edit" ||
      (activeDocument.is_collaborator && activeDocument.share_permission === "edit")
    );
  }, [activeDocument, user?.id]);

  const selectedDocSubject = useMemo(
    () => (newDocSubjectId ? subjects.find((s) => s.id === newDocSubjectId) : null),
    [subjects, newDocSubjectId]
  );

  // --- Gallery View Derived State ---
  const docIdSet = useMemo(() => new Set(documents.map((d) => d.id)), [documents]);

  const filteredAndSortedDocuments = useMemo(() => {
    // Si hay búsqueda por texto, buscar en todos los apuntes sin excluir subpáginas; de lo contrario mostrar raíces
    let result = searchQuery.trim() !== ""
      ? [...documents]
      : documents.filter((doc) => !doc.parent_id || !docIdSet.has(doc.parent_id));

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

    // Filter by owner / favorites tab
    if (filterOwner === "mine") {
      result = result.filter(doc => user?.id ? doc.user_id === user.id : (doc.user_id === "guest" || !doc.user_id));
    } else if (filterOwner === "favorites") {
      result = result.filter(doc => Boolean(doc.is_favorite));
    } else if (filterOwner === "collaborative") {
      result = result.filter(doc => doc.user_id !== user?.id && (doc.is_shared || doc.is_collaborator));
    } else if (filterOwner === "friends") {
      result = result.filter(doc => doc.user_id !== user?.id && !doc.is_shared && !doc.is_collaborator);
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

  // Loading Skeleton
  if (loading && documents.length === 0) {
    return (
      <div className="notion-app p-4 lg:p-8 space-y-6 animate-pulse">
        <div className="h-12 w-full bg-muted/40 rounded-xl border border-border/40" />
        <div className="h-32 w-full bg-muted/30 rounded-2xl border border-border/40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-card border-2 border-border/30 rounded-2xl p-4 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-muted/80" />
              <div className="w-3/4 h-5 rounded bg-muted/60" />
              <div className="w-1/2 h-4 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="notion-app">
      {/* Notion Sidebar (Clon de navegación lateral Notion) */}
      <NotionSidebar
        documents={documents}
        subjects={subjects}
        activeDocId={activeDocument?.id || null}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelectDocument={(doc) => openDocument(doc)}
        onNewDocument={handleSidebarNewDoc}
        onNewSubPage={handleNewSubPage}
        onDeleteDocument={(doc) => {
          setDocToDelete(doc);
          setShowDeleteModal(true);
        }}
        onToggleFavorite={handleToggleFavorite}
        onHoverDocument={(doc) => prefetchDocumentContent(doc.id)}
        currentUserId={user?.id}
        friends={friendsList}
      />

      {/* Main area */}
      <div className="notion-main">
        {/* Top bar */}
        {/* Unified Topbar */}
        <div className="notion-topbar h-11 px-3 border-b border-border/40 bg-background/95 backdrop-blur-md flex items-center justify-between text-sm select-none shrink-0">
          <div className="notion-topbar-left flex items-center gap-1 min-w-0 flex-1 overflow-hidden mr-2">
            {/* Notion Sidebar toggle button */}
            {activeDocument && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shrink-0 mr-1 cursor-pointer"
                title={sidebarCollapsed ? "Mostrar barra lateral (Ctrl+\\)" : "Ocultar barra lateral (Ctrl+\\)"}
                aria-label="Alternar barra lateral"
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Breadcrumb Path */}
            {activeDocument ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {

                    closeDocument();
                  }}
                  className="h-7 px-1.5 rounded-md inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shrink-0 cursor-pointer"
                  title="Volver a todos los apuntes"
                >
                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                  <span className="font-medium hidden sm:inline">Apuntes</span>
                </button>

                {activeDocument.subject && (
                  <>
                    <span className="text-muted-foreground/30 select-none">/</span>
                    <button
                      type="button"
                      onClick={() => {

                        closeDocument();
                      }}
                      className="h-7 px-1.5 rounded-md inline-flex items-center text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shrink-0 max-w-[130px] truncate cursor-pointer"
                      title={`Materia: ${activeDocument.subject.nombre || activeDocument.subject.codigo}`}
                    >
                      <span className="truncate">{activeDocument.subject.codigo || activeDocument.subject.nombre}</span>
                    </button>
                  </>
                )}

                <span className="text-muted-foreground/30 select-none">/</span>

                <div className="h-7 px-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground shrink-0 max-w-[180px] sm:max-w-[240px] truncate">
                  <TabeIconRenderer iconId={activeDocument.emoji || "book"} size={14} />
                  <span className="truncate">{localTitle || activeDocument.titulo || "Sin título"}</span>
                </div>

                {/* Inline Tabs */}
                {openTabs.length > 1 && (
                  <div className="hidden xl:flex items-center gap-1 ml-2 pl-2 border-l border-border/40 overflow-x-auto no-scrollbar py-0.5">
                    {openTabs
                      .filter((tab, index, self) => self.findIndex(t => t.id === tab.id) === index)
                      .map(tab => {
                        const isActive = activeDocument?.id === tab.id;
                        return (
                          <div
                            key={tab.id}
                            className={cn(
                              "group relative flex items-center gap-1.5 h-6.5 px-2 rounded-md text-xs cursor-pointer transition-colors shrink-0 max-w-[130px]",
                              isActive
                                ? "bg-muted text-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 font-normal"
                            )}
                            onClick={() => handleTabClick(tab.id)}
                            title={tab.title}
                          >
                            <span className="shrink-0 flex items-center">
                              {tab.emoji ? (
                                <TabeIconRenderer iconId={tab.emoji} size={12} />
                              ) : (
                                <FileText className="w-3 h-3" />
                              )}
                            </span>
                            <span className="truncate">
                              {isActive ? (localTitle || tab.title || "Sin título") : (tab.title || "Sin título")}
                            </span>
                            <button
                              type="button"
                              className="rounded p-0.5 transition-all ml-0.5 shrink-0 hover:bg-destructive/15 hover:text-destructive opacity-0 group-hover:opacity-100"
                              onClick={(e) => closeTab(tab.id, e)}
                              title="Cerrar pestaña"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/dashboard"
                onClick={() => {

                }}
                className="h-7 px-2 rounded-md inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="font-semibold text-foreground">Apuntes</span>
              </Link>
            )}
          </div>

          <div className="notion-topbar-right flex items-center gap-1 shrink-0">
            {activeDocument ? (
              <>
                {/* Auto-save indicator */}
                <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground/70 px-1 select-none">
                  {saveError ? (
                    <span className="flex items-center gap-1 text-destructive font-medium" title={saveError}>
                      <AlertCircle className="w-3.5 h-3.5" />
                      Error
                    </span>
                  ) : isOpeningDoc ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                      Cargando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1" title="Guardado automáticamente">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Guardado
                    </span>
                  )}
                </div>

                {/* Save indicator on error */}
                {saveError && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive rounded-md animate-in fade-in duration-300" title={saveError}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium hidden sm:inline uppercase tracking-wider">Error</span>
                  </div>
                )}

                {/* Favorite */}
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors",
                    activeDocument.is_favorite && "text-amber-500 hover:text-amber-600"
                  )}
                  onClick={() => handleToggleFavorite(activeDocument)}
                  title={activeDocument.is_favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                >
                  <Star className="w-3.5 h-3.5" fill={activeDocument.is_favorite ? "currentColor" : "none"} />
                </button>

                {/* Audio Book */}
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
                    audioBook.isPlaying
                      ? "text-emerald-500 bg-emerald-500/10"
                      : audioBook.isPaused
                        ? "text-amber-500 bg-amber-500/10"
                        : showAudioBookPlayer
                          ? "text-foreground bg-muted"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
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
                  title={audioBook.isPlaying ? "Pausar audio libro" : audioBook.isPaused ? "Reanudar audio libro" : "Escuchar audio libro"}
                >
                  {audioBook.isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Tabe AI Action con Logo oficial adaptado al tema */}
                <button
                  type="button"
                  className="h-7 px-2 inline-flex items-center gap-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground transition-all cursor-pointer border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 group"
                  onClick={() => setShowAIModal(true)}
                  title="Tabe AI (Generar Flashcards y Cuestionarios)"
                >
                  <TabeLogo variant="ai" size={18} className="w-4.5 h-4.5 object-contain transition-transform group-hover:scale-105 shrink-0" />
                  <span className="hidden sm:inline font-semibold text-xs text-foreground/90 group-hover:text-foreground">Tabe AI</span>
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

                {/* Active Collaborators Presence */}
                {activeCollaborators.length > 0 && (
                  <div className="flex items-center -space-x-1.5 mx-0.5">
                    {activeCollaborators.slice(0, 4).map((collab) => {
                      const isCurrentPage = !collab.currentPageId || collab.currentPageId === activeDocument?.id;
                      return (
                        <div
                          key={collab.user_id}
                          className={cn(
                            "w-6 h-6 rounded-full border text-white font-semibold text-[10px] flex items-center justify-center overflow-hidden shrink-0 transition-all",
                            !isCurrentPage ? "opacity-60 grayscale-[30%]" : "ring-1 ring-background"
                          )}
                          style={{
                            backgroundColor: collab.color || "#3B82F6",
                            borderColor: collab.color || "#3B82F6",
                          }}
                          title={`${collab.name} ${isCurrentPage ? "(en esta página)" : "(en otra subpágina del apunte)"}`}
                        >
                          {collab.avatar_url ? (
                            <img src={collab.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            collab.name.charAt(0).toUpperCase()
                          )}
                        </div>
                      );
                    })}
                    {activeCollaborators.length > 4 && (
                      <div className="w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-[10px] flex items-center justify-center shrink-0">
                        +{activeCollaborators.length - 4}
                      </div>
                    )}
                  </div>
                )}

                {/* Badge persistente de EDICIÓN COLABORATIVA */}
                {isCollabActive && (
                  <div
                    className="h-6 px-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[11px] select-none shrink-0"
                    title={
                      activeCollaborators.length > 1
                        ? `Edición colaborativa en vivo (${activeCollaborators.length} usuarios conectados)`
                        : "Edición colaborativa activa"
                    }
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="hidden sm:inline">Colaborativa</span>
                  </div>
                )}

                {/* Cooperative Share Button */}
                <button
                  type="button"
                  onClick={() => {
                    setDocToShare(activeDocument);
                    setShowShareModal(true);
                  }}
                  className="h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 font-medium text-xs transition-colors cursor-pointer"
                  title="Compartir apunte cooperativo"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Compartir</span>
                  {activeDocument.is_shared && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  )}
                </button>

                {/* More Options Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                      title="Más opciones"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-lg p-1.5">
                    {/* Notion Font Style Picker */}
                    <div className="px-2 py-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Estilo de letra
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setNotionFont("sans");
                            localStorage.setItem("tabe_notion_font", "sans");
                          }}
                          className={cn(
                            "px-2 py-1.5 rounded-md text-xs font-sans text-center border transition-all cursor-pointer",
                            notionFont === "sans"
                              ? "bg-primary/10 border-primary text-primary font-semibold"
                              : "border-border/60 hover:bg-muted/70 text-muted-foreground"
                          )}
                        >
                          Sans
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNotionFont("serif");
                            localStorage.setItem("tabe_notion_font", "serif");
                          }}
                          className={cn(
                            "px-2 py-1.5 rounded-md text-xs font-serif text-center border transition-all cursor-pointer",
                            notionFont === "serif"
                              ? "bg-primary/10 border-primary text-primary font-semibold"
                              : "border-border/60 hover:bg-muted/70 text-muted-foreground"
                          )}
                        >
                          Serif
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNotionFont("mono");
                            localStorage.setItem("tabe_notion_font", "mono");
                          }}
                          className={cn(
                            "px-2 py-1.5 rounded-md text-xs font-mono text-center border transition-all cursor-pointer",
                            notionFont === "mono"
                              ? "bg-primary/10 border-primary text-primary font-semibold"
                              : "border-border/60 hover:bg-muted/70 text-muted-foreground"
                          )}
                        >
                          Mono
                        </button>
                      </div>
                    </div>

                    <DropdownMenuSeparator className="my-1 bg-border/40" />

                    {/* Notion Layout Toggles */}
                    <DropdownMenuItem
                      className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                      onClick={(e) => {
                        e.preventDefault();
                        const next = !notionSmallText;
                        setNotionSmallText(next);
                        localStorage.setItem("tabe_notion_smalltext", String(next));
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <Type className="w-3.5 h-3.5 text-muted-foreground" />
                        Texto pequeño
                      </span>
                      {notionSmallText && <Check className="w-3.5 h-3.5 text-primary" />}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                      onClick={(e) => {
                        e.preventDefault();
                        const next = !notionFullWidth;
                        setNotionFullWidth(next);
                        localStorage.setItem("tabe_notion_fullwidth", String(next));
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <Maximize className="w-3.5 h-3.5 text-muted-foreground" />
                        Ancho completo
                      </span>
                      {notionFullWidth && <Check className="w-3.5 h-3.5 text-primary" />}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                      onClick={(e) => {
                        e.preventDefault();
                        setNotionLocked(!notionLocked);
                      }}
                    >
                      <span className="flex items-center gap-2">
                        {notionLocked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5 text-muted-foreground" />}
                        {notionLocked ? "Página bloqueada" : "Bloquear página"}
                      </span>
                      {notionLocked && <Check className="w-3.5 h-3.5 text-amber-500" />}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1 bg-border/40" />

                    {activeDocument.user_id === user?.id && (
                      <DropdownMenuItem
                        className="font-medium text-xs cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-800/80 rounded-lg"
                        onClick={() => {
                          setDocToChangeSubject(activeDocument);
                          setModalYear(null);
                          setShowChangeSubjectModal(true);
                        }}
                      >
                        <ArrowUpDown className="w-4 h-4 mr-2 text-zinc-500" />
                        Cambiar materia
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      className="font-medium text-xs cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-800/80 rounded-lg"
                      onClick={() => setShowImportModal(true)}
                    >
                      <FileUp className="w-4 h-4 mr-2 text-zinc-500" />
                      Importar documento
                    </DropdownMenuItem>

                    {activeDocument.user_id !== user?.id && (
                      <DropdownMenuItem
                        className="font-medium text-xs cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-800/80 rounded-lg"
                        onClick={() => {
                          setPreselectedFriendNote({
                            id: activeDocument.id,
                            titulo: activeDocument.titulo,
                            emoji: activeDocument.emoji,
                            subject_id: activeDocument.subject_id,
                            user_id: activeDocument.user_id,
                            ownerName: activeDocOwner?.nombre || activeDocOwner?.username || "tu amigo",
                            cover_url: activeDocument.cover_url,
                            subject: activeDocument.subject
                          });
                          setShowImportFriendModal(true);
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2 text-zinc-500" />
                        Importar copia a mis apuntes
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-zinc-800" />
                    <DropdownMenuItem
                      className="font-medium text-xs cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-800/80 rounded-lg"
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
                          className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/30 font-medium text-xs cursor-pointer rounded-lg"
                          onClick={() => {
                            setDocToDelete(activeDocument);
                            setShowDeleteModal(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                          Eliminar apunte
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-8 px-2.5 sm:px-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors shadow-2xs relative cursor-pointer"
                  onClick={() => {
                    setTrashItems(getTrashItems());
                    setShowTrashModal(true);
                  }}
                  title="Papelera (30 min para recuperar)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="hidden sm:inline">Papelera</span>
                  {trashItems.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-medium leading-none">
                      {trashItems.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="h-8 px-2.5 sm:px-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors shadow-2xs cursor-pointer"
                  onClick={() => setShowImportModal(true)}
                  title="Importar documento"
                >
                  <FileUp className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
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
                  key={`${activeDocument.id}_${isCollabActive ? "collab" : "local"}`}
                  isFullWidth={notionFullWidth}
                  fontFamilyPreference={notionFont}
                  smallTextPreference={notionSmallText}
                  headerContent={
                    <>
                      {/* Notion Cover Hero */}
                      {activeDocument.cover_url ? (
                        <div className="notion-cover-hero group rounded-xl my-2">
                          <img src={activeDocument.cover_url} alt="Portada" />
                          {isOwnerOrCanEdit && (
                            <div className="notion-cover-actions">
                              <button
                                type="button"
                                onClick={() => setShowCoverPickerModal(true)}
                                className="h-7 px-2.5 rounded-md bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                Cambiar portada
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateCover(null)}
                                className="h-7 px-2 rounded-md bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur-xs flex items-center gap-1 transition-colors cursor-pointer"
                                title="Quitar portada"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null}

                      <div className="notion-page-header pt-2">
                        {/* Notion Hover Actions (Add Icon, Add Cover) solo si el usuario tiene permiso */}
                        {isOwnerOrCanEdit && (!activeDocument.cover_url || !activeDocument.emoji) && (
                          <div className="notion-page-header-actions">
                            {!activeDocument.emoji && (
                              <button
                                type="button"
                                onClick={() => handleEmojiUpdate("book")}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                              >
                                <Smile className="w-3.5 h-3.5" />
                                Añadir icono
                              </button>
                            )}
                            {!activeDocument.cover_url && (
                              <button
                                type="button"
                                onClick={() => setShowCoverPickerModal(true)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                Añadir portada
                              </button>
                            )}
                          </div>
                        )}

                        {/* Notion Icon */}
                        {activeDocument.emoji && (
                          <div className={activeDocument.cover_url ? "notion-floating-icon" : "mb-2 inline-block"}>
                            {isOwnerOrCanEdit ? (
                              <EmojiPicker
                                value={activeDocument.emoji}
                                onChange={handleEmojiUpdate}
                              />
                            ) : (
                              <div className="flex items-center justify-center p-1 select-none pointer-events-none">
                                <TabeIconRenderer iconId={activeDocument.emoji} size={activeDocument.cover_url ? 40 : 36} />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Title area */}
                        <div className="notion-title-area mt-1 mb-2">
                          <textarea
                            ref={titleTextareaRef}
                            value={localTitle}
                            onChange={(e) => {
                              handleTitleChange(e.target.value);
                              // Auto-resize
                              e.target.style.height = "auto";
                              e.target.style.height = e.target.scrollHeight + "px";
                            }}
                            className={cn(
                              "notion-title-input text-3xl sm:text-4xl font-bold tracking-tight text-foreground border-none outline-none bg-transparent placeholder:text-muted-foreground/30 w-full resize-none leading-tight",
                              (activeDocument.user_id !== user?.id || notionLocked) && "cursor-default select-none"
                            )}
                            placeholder="Sin título"
                            rows={1}
                            readOnly={activeDocument.user_id !== user?.id || notionLocked}
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

                        {/* Notion Properties Bar */}
                        <div className="notion-properties-bar">
                          {/* Materia */}
                          <div className="notion-prop-row">
                            <div className="notion-prop-label">
                              <GraduationCap className="w-3.5 h-3.5" />
                              Materia
                            </div>
                            <div className="notion-prop-value">
                              {activeDocument.user_id === user?.id ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDocToChangeSubject(activeDocument);
                                    setModalYear(null);
                                    setShowChangeSubjectModal(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer border border-border/40"
                                >
                                  <span>{activeDocument.subject?.nombre || activeDocument.subject?.codigo || "Sin materia asignada"}</span>
                                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {activeDocument.subject?.nombre || activeDocument.subject?.codigo || "Sin materia"}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Last modified */}
                          <div className="notion-prop-row">
                            <div className="notion-prop-label">
                              <Clock className="w-3.5 h-3.5" />
                              Última edición
                            </div>
                            <div className="notion-prop-value text-xs text-muted-foreground">
                              {activeDocument.updated_at
                                ? new Date(activeDocument.updated_at).toLocaleDateString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                                : "Reciente"}
                            </div>
                          </div>

                          {/* Study time (Sincronizado al 100% con StudyTimerContext) */}
                          <div className="notion-prop-row">
                            <div className="notion-prop-label">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              Estudio
                            </div>
                            <div className="notion-prop-value flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isStudyTimerActive && !isStudyTimerPaused) {
                                    pauseStudyTimer();
                                  } else if (isStudyTimerPaused) {
                                    resumeStudyTimer();
                                  } else {
                                    startStudyTimer(activeDocument.subject_id || null, activeDocument.id, activeDocument.titulo);
                                  }
                                }}
                                className={cn(
                                  "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer border select-none shadow-2xs",
                                  isStudyTimerActive && !isStudyTimerPaused
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                    : isStudyTimerPaused
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                                      : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50"
                                )}
                                title={
                                  isStudyTimerActive && !isStudyTimerPaused
                                    ? "Pausar cronómetro de estudio (guarda tu tiempo)"
                                    : isStudyTimerPaused
                                      ? "Reanudar cronómetro de estudio"
                                      : "Iniciar cronómetro de estudio"
                                }
                              >
                                {isStudyTimerActive && !isStudyTimerPaused ? (
                                  <Pause className="w-3 h-3 fill-current text-emerald-500 animate-pulse" />
                                ) : isStudyTimerPaused ? (
                                  <Play className="w-3 h-3 fill-current text-amber-500" />
                                ) : (
                                  <Play className="w-3 h-3 fill-current text-muted-foreground" />
                                )}
                                <span>{formatStudyTime(studyTimerSeconds)}</span>
                                <span className="text-[10px] font-sans font-medium text-muted-foreground ml-0.5">
                                  {isStudyTimerActive && !isStudyTimerPaused ? "Pausar" : isStudyTimerPaused ? "Reanudar" : "Iniciar"}
                                </span>
                              </button>

                              {(activeDocument.total_time_seconds || 0) > 0 && (
                                <span className="text-[11px] text-muted-foreground/70" title="Tiempo acumulado previamente en este apunte">
                                  (Acumulado: {formatStudyTime(activeDocument.total_time_seconds)})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Author / Collaboration indicator in editor (visible en ambos clientes) */}
                      {(isCollabActive || activeDocument.user_id !== user?.id || activeDocument.is_shared || activeDocument.is_collaborator) && (
                        <div className="notion-author-badge flex flex-wrap items-center justify-between gap-3 px-8 md:px-14 mb-4 animate-in fade-in slide-in-from-left-2 duration-500">
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300">
                            {activeDocument.user_id === user?.id ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-800/60 flex items-center justify-center text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                ★
                              </div>
                            ) : activeDocOwner?.avatar_url ? (
                              <img src={activeDocOwner.avatar_url} className="w-5 h-5 rounded-full" alt="" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-800/60 flex items-center justify-center text-[10px] font-semibold">
                                {(activeDocOwner?.nombre || activeDocOwner?.username || "C").charAt(0)}
                              </div>
                            )}
                            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                              {activeDocument.user_id === user?.id
                                ? "Tu apunte cooperativo"
                                : activeDocument.is_collaborator || activeDocument.is_shared
                                  ? `Apunte colaborativo${activeDocOwner?.nombre ? ` de ${activeDocOwner.nombre}` : ""}`
                                  : `Apunte de ${activeDocOwner?.nombre || activeDocOwner?.username || "un amigo"}`}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full ml-1 bg-emerald-600 text-white flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              {(activeDocument.user_id === user?.id || activeDocument.share_permission === "edit" || activeDocument.user_permission === "edit")
                                ? "Edición colaborativa"
                                : "Solo lectura"}
                            </span>
                          </div>

                          {activeDocument.user_id !== user?.id && (
                            <button
                              onClick={() => {
                                setPreselectedFriendNote({
                                  id: activeDocument.id,
                                  titulo: activeDocument.titulo,
                                  emoji: activeDocument.emoji,
                                  subject_id: activeDocument.subject_id,
                                  user_id: activeDocument.user_id,
                                  ownerName: activeDocOwner?.nombre || activeDocOwner?.username || "tu amigo",
                                  cover_url: activeDocument.cover_url,
                                  subject: activeDocument.subject
                                });
                                setShowImportFriendModal(true);
                              }}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg font-medium text-xs shadow-2xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Importar copia a mis apuntes
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  }
                  content={editorContent}
                  onUpdate={handleContentUpdate}
                  documentId={activeDocument?.id}
                  readOnly={
                    notionLocked ||
                    (activeDocument?.user_id !== user?.id &&
                      !(
                        (activeDocument?.is_shared && activeDocument?.share_permission === "edit") ||
                        activeDocument?.user_permission === "edit" ||
                        (activeDocument?.is_collaborator && activeDocument?.share_permission === "edit")
                      ))
                  }
                  ydoc={isCollabActive ? ydoc : null}
                  provider={isCollabActive ? collabProvider : null}
                  collabUser={collabUser}
                  onEditorReady={handleEditorReady}
                  onActivity={() => lastActivityRef.current = Date.now()}
                  onSubPageClick={async (pageId, pageTitle, blockId, copyFromPageId) => {
                    const parent = activeDocumentRef.current;
                    const parentId = parent?.id || null;
                    const subjectId = parent?.subject_id || "";

                    // Si proviene de una copia (copyFromPageId) y aún no tiene nuevo pageId asignado (o coincide con copyFromPageId):
                    if (copyFromPageId && (!pageId || pageId === copyFromPageId)) {
                      let sourceContent = await fetchDocumentContent(copyFromPageId);
                      let sourceEmoji = "book";
                      let sourceTitle = pageTitle || "Sin título";
                      const existingDoc = documents.find(d => d.id === copyFromPageId);
                      if (existingDoc) {
                        sourceEmoji = existingDoc.emoji || "book";
                        if (!pageTitle || pageTitle === "Sin título") {
                          sourceTitle = existingDoc.titulo || "Sin título";
                        }
                      }

                      const clonedContent = sourceContent
                        ? JSON.parse(JSON.stringify(sourceContent))
                        : { type: "doc", content: [{ type: "paragraph" }] };

                      const newDoc = await createDocument(
                        subjectId,
                        sourceTitle,
                        parentId,
                        clonedContent,
                        sourceEmoji
                      );

                      if (newDoc) {
                        document.dispatchEvent(new CustomEvent("notion-subpage-created", {
                          detail: { oldTitle: sourceTitle, oldPageId: copyFromPageId, newPageId: newDoc.id, blockId },
                        }));
                        await new Promise(resolve => setTimeout(resolve, 50));
                        if (parent && isDirtyRef.current) {
                          await saveDocument(true);
                        }
                        const isParentCollab = Boolean(parent && (parent.is_shared || parent.is_collaborator || parent.share_token));
                        const fullDoc: NotionDocument = {
                          ...newDoc,
                          parent_id: parentId,
                          contenido: clonedContent,
                          is_shared: isParentCollab ? (parent.is_shared ?? true) : newDoc.is_shared,
                          is_collaborator: isParentCollab ? (parent.is_collaborator ?? true) : newDoc.is_collaborator,
                          share_permission: isParentCollab ? (parent.share_permission || "edit") : newDoc.share_permission,
                          share_token: isParentCollab ? parent.share_token : newDoc.share_token,
                        };
                        openDocument(fullDoc);
                        return;
                      }
                    }

                    // 1. Si pageId es provisto (es un apunte existente o fue movido con Ctrl+X)
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
                        const isParentCollab = Boolean(parent && (parent.is_shared || parent.is_collaborator || parent.share_token));
                        if (parent && isParentCollab) {
                          target.is_shared = parent.is_shared ?? true;
                          target.is_collaborator = parent.is_collaborator ?? true;
                          target.share_permission = parent.share_permission || "edit";
                          target.share_token = parent.share_token;
                        }
                        // Si se pegó en otro apunte padre (ej. vía Ctrl+X y pegar), asociarlo a este padre si correspondía
                        if (target.parent_id && target.parent_id !== parentId) {
                          updateDocument(target.id, { parent_id: parentId } as any).catch(() => { });
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
                      const isParentCollab = Boolean(parent && (parent.is_shared || parent.is_collaborator || parent.share_token));
                      const fullDoc: NotionDocument = {
                        ...newDoc,
                        parent_id: parentId,
                        contenido: { type: "doc", content: [{ type: "paragraph" }] },
                        is_shared: isParentCollab ? (parent.is_shared ?? true) : newDoc.is_shared,
                        is_collaborator: isParentCollab ? (parent.is_collaborator ?? true) : newDoc.is_collaborator,
                        share_permission: isParentCollab ? (parent.share_permission || "edit") : newDoc.share_permission,
                        share_token: isParentCollab ? parent.share_token : newDoc.share_token,
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
            <div className="tabe-page flex flex-col h-full bg-background text-foreground">
              {/* Header and Tabs */}
              <div className="flex flex-col gap-4 px-6 md:px-10 py-6 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#171717] text-foreground">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Tus Apuntes</h1>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Buscar apunte..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 focus:border-zinc-400 dark:focus:border-zinc-600 transition-all outline-none w-full sm:w-56 rounded-lg placeholder:text-zinc-400"
                      />
                    </div>

                    <button
                      onClick={() => {
                        setPreselectedFriendNote(null);
                        setShowImportFriendModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-lg shadow-2xs transition-colors"
                      title="Importar apuntes compartidos por tus amigos"
                    >
                      <Users className="w-5 h-5" />
                      Importar de Amigos
                    </button>

                    <button
                      onClick={() => setShowNewDocModal(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg shadow-2xs transition-colors ml-auto sm:ml-0 tour-notion-create"
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
                      { id: "favorites", label: "Favoritos" },
                      { id: "mine", label: "Mis Apuntes" },
                      { id: "collaborative", label: "Compartidos" },
                      { id: "friends", label: "De Amigos" }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setFilterOwner(tab.id as any)}
                        className={cn(
                          "px-3 py-1.5 font-medium text-xs rounded-lg transition-colors cursor-pointer",
                          filterOwner === tab.id
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Píldoras directas de Filtro por Año */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() => { setFilterYear("all"); setFilterSubject("all"); }}
                        className={cn(
                          "relative px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none",
                          filterYear === "all"
                            ? "text-white dark:text-zinc-900"
                            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                        )}
                      >
                        {filterYear === "all" && (
                          <motion.span
                            layoutId="notion-gallery-year-pill"
                            transition={{ type: "spring", stiffness: 420, damping: 32 }}
                            className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-white shadow-2xs"
                          />
                        )}
                        <span className="relative z-10">Todos los años</span>
                      </button>
                      {uniqueYears.map(year => {
                        const isSelected = filterYear === year.toString();
                        const accent = getYearAccent(year);
                        return (
                          <button
                            key={year}
                            type="button"
                            onClick={() => { setFilterYear(year.toString()); setFilterSubject("all"); }}
                            className={cn(
                              "relative px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none flex items-center gap-1.5",
                              isSelected
                                ? "text-white dark:text-zinc-900"
                                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                            )}
                          >
                            {isSelected && (
                              <motion.span
                                layoutId="notion-gallery-year-pill"
                                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                                className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-white shadow-2xs"
                              />
                            )}
                            <span className={cn("relative z-10 w-1.5 h-1.5 rounded-full", accent.dot)} />
                            <span className="relative z-10">{year}° Año</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Sort */}
                    <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                      <SelectTrigger className="w-[140px] bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 font-medium text-xs rounded-lg shadow-2xs h-8 focus:ring-0">
                        <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                        <SelectValue placeholder="Ordenar" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-lg p-1.5">
                        <SelectItem value="updated" className="font-medium text-xs cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-800/80 rounded-lg">Recientes</SelectItem>
                        <SelectItem value="alpha_asc" className="font-medium text-xs cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-800/80 rounded-lg">A - Z</SelectItem>
                        <SelectItem value="alpha_desc" className="font-medium text-xs cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-800/80 rounded-lg">Z - A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Barra de Materias animada por Año: las materias de otros años se retiran y quedan solo las filtradas */}
                {filterSubjectOptions.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-zinc-100 dark:border-zinc-800/70">
                    <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mr-1 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Materias:
                    </span>
                    <button
                      type="button"
                      onClick={() => setFilterSubject("all")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border",
                        filterSubject === "all"
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs"
                          : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200/70 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      Todas
                    </button>
                    <AnimatePresence mode="popLayout">
                      {filterSubjectOptions
                        .filter(sub => filterYear === "all" || sub.año.toString() === filterYear)
                        .map(sub => {
                          const isSubActive = filterSubject === sub.id;
                          const accent = getYearAccent(sub.año);
                          return (
                            <motion.button
                              layout
                              key={sub.id}
                              type="button"
                              initial={{ opacity: 0, scale: 0.82, y: 6, filter: "blur(4px)" }}
                              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                              exit={{ opacity: 0, scale: 0.78, y: -6, filter: "blur(4px)", transition: { duration: 0.18, ease: [0.32, 0, 0.67, 0] } }}
                              transition={{
                                layout: { type: "spring", stiffness: 380, damping: 28, mass: 0.7 },
                                duration: 0.22,
                              }}
                              onClick={() => setFilterSubject(isSubActive ? "all" : sub.id)}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5",
                                isSubActive
                                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs"
                                  : "bg-white dark:bg-[#212121] text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
                              )}
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", accent.dot)} />
                              <span className="truncate max-w-[180px]">{sub.name}</span>
                            </motion.button>
                          );
                        })}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-8 md:p-12 tour-notion-list">
                {documents.filter((d) => !d.parent_id || !docIdSet.has(d.parent_id)).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <p>No tienes apuntes todavía. ¡Creá una nueva página para empezar!</p>
                  </div>
                ) : filteredAndSortedDocuments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                    <p className="text-sm">No hay apuntes que coincidan con la búsqueda o filtros seleccionados.</p>
                    {(filterYear !== "all" || filterSubject !== "all" || filterOwner !== "all" || searchQuery.trim() !== "") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setFilterYear("all");
                          setFilterSubject("all");
                          setFilterOwner("all");
                        }}
                        className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/80 transition-colors cursor-pointer shadow-2xs"
                      >
                        Restablecer filtros
                      </button>
                    )}
                  </div>
                ) : (
                  <motion.div
                    layout
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                  >
                    <AnimatePresence mode="popLayout">
                      {filteredAndSortedDocuments.map((doc) => (
                        <motion.div
                          layout
                          key={doc.id}
                          initial={{ opacity: 0, scale: 0.88, y: 14, filter: "blur(5px)" }}
                          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                          exit={{
                            opacity: 0,
                            scale: 0.84,
                            y: -12,
                            filter: "blur(6px)",
                            transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] },
                          }}
                          transition={{
                            layout: { type: "spring", stiffness: 360, damping: 28, mass: 0.72 },
                            duration: 0.26,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        >
                          <MemoizedGalleryCard
                            doc={doc}
                            userSubjects={subjects}
                            onClick={openDocument}
                            onToggleFavorite={handleToggleFavorite}
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
                            friendsList={friendsList}
                            onShare={(d) => {
                              setDocToShare(d);
                              setShowShareModal(true);
                            }}
                            onImportFriendDoc={(d) => {
                              const matchedFriend = friendsList.find(f => f.user_id === d.user_id);
                              setPreselectedFriendNote({
                                id: d.id,
                                titulo: d.titulo,
                                emoji: d.emoji,
                                subject_id: d.subject_id,
                                user_id: d.user_id,
                                ownerName: d.owner?.nombre || d.owner?.username || matchedFriend?.nombre || matchedFriend?.username || "tu amigo",
                                cover_url: d.cover_url,
                                subject: d.subject
                              });
                              setShowImportFriendModal(true);
                            }}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === MODALS === */}

      {/* Rename Document Modal */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent className="max-w-md bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-zinc-700 dark:text-zinc-300" /> Renombrar Apunte
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
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200/80 dark:border-zinc-800 font-normal text-sm focus:border-zinc-400 dark:focus:border-zinc-600 transition-all outline-none placeholder:text-zinc-400"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-3">
            <button
              onClick={() => setShowRenameModal(false)}
              className="flex-1 px-4 py-2 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 font-medium text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleRenameSubmit}
              className="flex-1 px-4 py-2 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium text-xs shadow-2xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
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
        <DialogContent className="max-w-2xl bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
              </div>
              <div>
                <DialogTitle className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
                  Nuevo Apunte
                </DialogTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Elegí una materia, personalizá el título y comenzá con una plantilla.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 pt-4">
            {/* Paso 1: Materia */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-semibold">1</span>
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
                <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200 rounded border border-zinc-200/60 dark:border-zinc-600/60 shrink-0">
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
                    className="px-2.5 py-1 rounded-lg text-xs font-medium border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shrink-0 ml-3"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                /* Selector de Año y Materia */
                <div className="space-y-3 bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3.5">
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1.5">Filtrar por año:</span>
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setModalYear(null)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border",
                          modalYear === null
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs"
                            : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                        )}
                      >
                        Todos
                      </button>
                      {(uniqueYears.length > 0 ? uniqueYears : [1, 2, 3, 4, 5, 6]).map((year) => (
                        <button
                          key={year}
                          type="button"
                          onClick={() => setModalYear(year)}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border",
                            modalYear === year
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs"
                              : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                          )}
                        >
                          {year}° Año
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1.5">Elegí la materia:</span>
                    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                      <AnimatePresence mode="popLayout">
                        {modalSubjects.map((subject) => {
                          const isApproved = subject.status === "aprobada";
                          const isSelected = newDocSubjectId === subject.id;
                          const accent = getYearAccent(subject.año);
                          return (
                            <motion.button
                              layout
                              key={subject.id}
                              type="button"
                              initial={{ opacity: 0, scale: 0.86, y: 10, filter: "blur(4px)" }}
                              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                              exit={{ opacity: 0, scale: 0.82, y: -8, filter: "blur(5px)", transition: { duration: 0.18, ease: [0.32, 0, 0.67, 0] } }}
                              transition={{
                                layout: { type: "spring", stiffness: 380, damping: 28, mass: 0.72 },
                                duration: 0.22,
                              }}
                              onClick={() => setNewDocSubjectId(subject.id)}
                              className={cn(
                                "p-2.5 rounded-lg border text-left transition-colors group relative",
                                isSelected
                                  ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100"
                                  : "bg-white dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-700/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-600"
                              )}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className={cn(
                                  "text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0",
                                  isApproved
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                                    : isSelected
                                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent font-medium"
                                      : accent.badge
                                )}>
                                  {isApproved ? "✓ Aprobada" : (subject.codigo || `Año ${subject.año}`)}
                                </span>
                                <span className={cn(
                                  "text-[10px] transition-colors",
                                  isSelected
                                    ? "text-zinc-900 font-semibold"
                                    : "text-zinc-500 group-hover:text-zinc-900 font-semibold"
                                )}>
                                  Año {subject.año}
                                </span>
                              </div>
                              <p className={cn(
                                "text-xs truncate transition-colors font-medium mt-1",
                                isSelected
                                  ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                                  : "text-zinc-900 dark:text-zinc-100"
                              )}>
                                {subject.nombre}
                              </p>
                            </motion.button>
                          );
                        })}
                      </AnimatePresence>
                      {modalSubjects.length === 0 && (
                        <div className="col-span-full py-4 text-center text-xs font-bold text-muted-foreground">
                          No hay materias registradas para este filtro.
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>
              )}
            </div>

            {/* Paso 2: Título (Opcional) */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-semibold">2</span>
                Título de la Página (opcional)
              </label>
              <input
                type="text"
                value={newDocCustomTitle}
                onChange={(e) => setNewDocCustomTitle(e.target.value)}
                placeholder={selectedTemplate.id === "blank" ? "Ej: Apuntes de Clase - Unidad 1" : `Ej: ${selectedTemplate.name} - Unidad 1`}
                className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200/80 dark:border-zinc-800 font-normal text-sm focus:border-zinc-400 dark:focus:border-zinc-600 transition-all outline-none placeholder:text-zinc-400"
              />
            </div>

            {/* Paso 3: Plantilla */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-semibold">3</span>
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
                        "p-3 rounded-xl text-left transition-all border flex items-start gap-3 relative group",
                        isSelected
                          ? "bg-zinc-50 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100"
                          : "bg-white dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-700/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-600"
                      )}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white"
                      )}>
                        {template.id === "blank" && <FileText className="w-4 h-4" />}
                        {template.id === "class-summary" && <BookOpen className="w-4 h-4" />}
                        {template.id === "exam-prep" && <GraduationCap className="w-4 h-4" />}
                        {template.id === "lab-notes" && <FlaskConical className="w-4 h-4" />}
                        {template.id === "cornell" && <Layers className="w-4 h-4" />}
                        {!["blank", "class-summary", "exam-prep", "lab-notes", "cornell"].includes(template.id) && <FileText className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold text-sm text-foreground truncate">{template.name}</p>
                          {isSelected && (
                            <span className="text-[9px] font-medium uppercase tracking-wider bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded px-1.5 py-0.5 shrink-0 flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Activa
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-normal text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                          {template.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="flex items-center gap-3 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowNewDocModal(false)}
                className="px-4 py-2 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 font-medium text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleCreateDocument()}
                disabled={!newDocSubjectId}
                className="flex-1 px-5 py-2.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-xs sm:text-sm shadow-2xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {`Crear con "${selectedTemplate.name}"`}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Subject Modal */}
      <Dialog open={showChangeSubjectModal} onOpenChange={setShowChangeSubjectModal}>
        <DialogContent className="max-w-lg bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-zinc-700 dark:text-zinc-300" /> Cambiar Materia
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">Filtrar por año</label>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setModalYear(null)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border",
                    modalYear === null
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs"
                      : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                  )}
                >
                  Todos
                </button>
                {(uniqueYears.length > 0 ? uniqueYears : [1, 2, 3, 4, 5, 6]).map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setModalYear(year)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border",
                      modalYear === year
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs"
                        : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                    )}
                  >
                    {year}° Año
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                Materia Destino
              </label>
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                <AnimatePresence mode="popLayout">
                  {modalSubjects.map((subject) => {
                    const isApproved = subject.status === "aprobada";
                    const isSelected = activeDocument?.subject_id === subject.id;
                    const accent = getYearAccent(subject.año);
                    return (
                      <motion.button
                        layout
                        key={subject.id}
                        type="button"
                        initial={{ opacity: 0, scale: 0.86, y: 10, filter: "blur(4px)" }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 0.82, y: -8, filter: "blur(5px)", transition: { duration: 0.18, ease: [0.32, 0, 0.67, 0] } }}
                        transition={{
                          layout: { type: "spring", stiffness: 380, damping: 28, mass: 0.72 },
                          duration: 0.22,
                        }}
                        onClick={() => handleChangeSubjectSubmit(subject.id)}
                        className={cn(
                          "p-2.5 rounded-lg border text-left transition-colors group relative",
                          isSelected
                            ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100"
                            : "bg-white dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-700/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-600"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0",
                            isApproved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                              : isSelected
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent font-medium"
                                : accent.badge
                          )}>
                            {isApproved ? "✓ Aprobada" : (subject.codigo || `Año ${subject.año}`)}
                          </span>
                          <span className={cn(
                            "text-[10px] transition-colors",
                            isSelected
                              ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                              : "text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 font-semibold"
                          )}>
                            Año {subject.año}
                          </span>
                        </div>
                        <p className={cn(
                          "text-xs truncate transition-colors font-medium mt-1",
                          isSelected
                            ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                            : "text-zinc-800 dark:text-zinc-200"
                        )}>
                          {subject.nombre}
                        </p>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
                {modalSubjects.length === 0 && (
                  <div className="col-span-full text-center text-xs font-medium text-muted-foreground py-4">
                    No hay materias en este año.
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-6">
          <DialogHeader className="space-y-2 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  ¿Mover a papelera?
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Esta acción es reversible por 30 min</p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Moverás{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">"{docToDelete?.titulo || "Sin título"}"</span>{" "}
              a la papelera. Tendrás{" "}
              <span className="text-amber-600 dark:text-amber-400 font-medium">30 minutos</span>{" "}
              para recuperarla antes de que se elimine definitivamente.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 px-4 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 font-medium text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteDocument}
                className="flex-1 py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors shadow-2xs"
              >
                Mover a papelera
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trash Modal (30 min recovery grace period) */}
      <Dialog open={showTrashModal} onOpenChange={setShowTrashModal}>
        <DialogContent className="max-w-md bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-6 max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              Papelera (30 min para recuperar)
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Los apuntes eliminados se conservan durante 30 minutos antes de eliminarse definitivamente.
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 my-3 max-h-[50vh] pr-1">
            {trashItems.length === 0 ? (
              <div className="text-center py-8 text-sm text-zinc-500 dark:text-zinc-400">
                La papelera está vacía
              </div>
            ) : (
              trashItems.map((item) => {
                const minutesLeft = Math.max(1, Math.ceil((item.expiresAt - Date.now()) / (60 * 1000)));
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-lg shrink-0">{item.emoji || "book"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.title}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-mono">
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
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-1 shadow-2xs"
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
                        className="p-1.5 text-xs rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-500/10 transition-colors"
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
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl rounded-2xl p-6 overflow-hidden">
          <DialogHeader className="space-y-1.5 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0">
                <TabeLogo variant="ai" size={24} className="w-6 h-6 object-contain" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>Tabe AI - Estudio Inteligente</span>
                </DialogTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[340px]">
                  Genera material interactivo desde: <span className="text-zinc-900 dark:text-zinc-100 font-medium">{localTitle || activeDocument?.titulo || "Este apunte"}</span>
                </p>
              </div>
            </div>
          </DialogHeader>

          {isGeneratingAI ? (
            <div className="py-10 space-y-6 text-center">
              <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                  <Brain className="w-7 h-7 text-purple-500 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Tabe AI está procesando tu apunte...</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  Extrayendo conceptos clave y estructurando {aiGenType === 'flashcards' ? 'tus flashcards de repaso' : 'tu cuestionario tipo examen'}.
                </p>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden max-w-xs mx-auto">
                <div className="bg-zinc-900 dark:bg-white h-full w-full animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-5">
              {/* Type selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-zinc-500" />
                  ¿Qué deseas generar?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAiGenType('flashcards')}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between h-32",
                      aiGenType === 'flashcards'
                        ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100"
                        : "bg-white dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-700/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        aiGenType === 'flashcards' ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      )}>
                        <Layers className="w-4 h-4" />
                      </div>
                      {aiGenType === 'flashcards' && (
                        <span className="w-4 h-4 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center text-[10px]">
                          <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Mazo Flashcards</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                        Preguntas y respuestas para repetición espaciada.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiGenType('quiz')}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between h-32",
                      aiGenType === 'quiz'
                        ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100"
                        : "bg-white dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-700/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        aiGenType === 'quiz' ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      )}>
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      {aiGenType === 'quiz' && (
                        <span className="w-4 h-4 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center text-[10px]">
                          <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Cuestionario Test</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                        Preguntas tipo examen con justificación.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Count selection */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Cantidad de elementos
                  </label>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60">
                    {aiGenCount} {aiGenType === 'flashcards' ? 'tarjetas' : 'preguntas'}
                  </span>
                </div>

                {/* Preset buttons */}
                <div className="flex items-center gap-2">
                  {[5, 10, 15, 20, 30].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setAiGenCount(count)}
                      className={cn(
                        "flex-1 py-1 rounded-md text-xs font-medium transition-colors border",
                        aiGenCount === count
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs"
                          : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={aiGenCount}
                  onChange={(e) => setAiGenCount(parseInt(e.target.value))}
                  className="w-full accent-zinc-900 dark:accent-zinc-100 bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full appearance-none cursor-pointer"
                />
              </div>

              {/* Informative box */}
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Tabe AI procesará el texto de este apunte y creará el material en tu sección de{" "}
                  <span className="text-zinc-900 dark:text-zinc-100 font-medium">{aiGenType === 'flashcards' ? 'Flashcards' : 'Cuestionarios'}</span>, vinculado automáticamente a esta materia.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowAIModal(false)}
              disabled={isGeneratingAI}
              className="px-4 py-2 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 font-medium text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={isGeneratingAI}
              className="px-5 py-2.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-xs shadow-2xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  Generar {aiGenType === 'flashcards' ? 'Flashcards' : 'Cuestionario'}
                </>
              )}
            </button>
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

      {/* Notion Cover Picker Modal */}
      <NotionCoverPickerModal
        open={showCoverPickerModal}
        onOpenChange={setShowCoverPickerModal}
        currentCoverUrl={activeDocument?.cover_url}
        onSelectCover={handleUpdateCover}
      />

      {/* Share Document Modal */}
      <ShareDocumentModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setDocToShare(null);
        }}
        document={docToShare || activeDocument}
        onUpdateSharing={handleUpdateSharing}
        activeCollaborators={activeCollaborators}
        isOwner={docToShare ? docToShare.user_id === user?.id : (activeDocument?.user_id === user?.id)}
      />
    </div>
  );
}
