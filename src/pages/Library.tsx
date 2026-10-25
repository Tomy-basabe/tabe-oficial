import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FolderFloat from "@/components/ui/FolderFloat";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Image, Link as LinkIcon, Upload, Plus,
  Trash2, ExternalLink, FolderOpen, Folder, FolderPlus, FolderUp,
  ChevronRight, ArrowLeft, X, Eye, Filter, GraduationCap, ShoppingBag, Edit2,
  CheckCircle2, Square, CheckSquare, Repeat2, Clock, Volume2, Loader2,
  ShieldCheck, Check, Search, LayoutGrid, List, MoreHorizontal, 
  UploadCloud, Layers, BookOpen, Copy, Download } from "lucide-react";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { cn, toLocalDateStr } from "@/lib/utils";
import { toast } from "sonner";
import { useMarketplace } from "@/hooks/useMarketplace";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markdownToTiptap } from "@/lib/markdownToTiptap";
import JSZip from "jszip";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import HoldButton from "@/components/ui/HoldButton";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDFJS worker
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
import { AdsterraBanner } from "@/components/ads/AdsterraBanner";
import { validateFileUpload } from "@/lib/security";
import BasketballFileUploader from "@/components/library/BasketballFileUploader";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useConfirm } from "@/contexts/ConfirmModalContext";

interface LibraryFolder {
  id: string;
  nombre: string;
  color: string;
  subject_id: string | null;
  parent_folder_id: string | null;
  created_at: string;
}

interface LibraryFile {
  id: string;
  nombre: string;
  tipo: "pdf" | "imagen" | "link" | "video" | "otro";
  url: string;
  storage_path: string | null;
  tamaño_bytes: number | null;
  subject_id: string | null;
  folder_id: string | null;
  created_at: string;
  subject?: { nombre: string; codigo: string; año: number };
}

interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  año: number;
}

const fileTypeIcons = {
  pdf: FileText,
  imagen: Image,
  link: LinkIcon,
  video: FileText,
  otro: FileText,
};

const fileTypeColors = {
  pdf: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40",
  imagen: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40",
  link: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40",
  video: "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800/40",
  otro: "text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60",
};

const folderColors = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Púrpura", value: "#8b5cf6" },
  { name: "Esmeralda", value: "#10b981" },
  { name: "Ámbar", value: "#f59e0b" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Gris", value: "#64748b" },
];

let libraryFoldersCache: LibraryFolder[] | null = null;
let libraryFilesCache: LibraryFile[] | null = null;
let librarySubjectsCache: Subject[] | null = null;

export default function Library() {
  const { user, isGuest } = useAuth();
  const { confirm } = useConfirm();
  const { speak, stop, isSpeaking } = useTextToSpeech();
  const [isExtractingText, setIsExtractingText] = useState(false);
  const { canUse, incrementUsage, getUsage, getLimit } = useUsageLimits();
  const [subjects, setSubjects] = useState<Subject[]>(() => librarySubjectsCache || []);
  const [folders, setFolders] = useState<LibraryFolder[]>(() => libraryFoldersCache || []);
  const [files, setFiles] = useState<LibraryFile[]>(() => libraryFilesCache || []);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<LibraryFolder[]>([]);

  // Only years with actual subjects
  const activeYears = useMemo(() => {
    const unique = [...new Set(subjects.map(s => Number(s.año)).filter(y => !isNaN(y) && y > 0))].sort((a, b) => a - b);
    return unique.filter(year => subjects.some(s => Number(s.año) === year));
  }, [subjects]);

  const selectableYears = useMemo(() => {
    return activeYears.length > 0 ? activeYears : [1, 2, 3, 4, 5, 6];
  }, [activeYears]);

  // Filters
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedYear !== null && !activeYears.includes(selectedYear)) {
      setSelectedYear(null);
    }
  }, [activeYears, selectedYear]);

  // Notion / ChatGPT Style Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<"all" | "pdf" | "imagen" | "link" | "otro">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try {
      return (localStorage.getItem("tabe-library-view") as "grid" | "list") || "grid";
    } catch {
      return "grid";
    }
  });
  const [uploadModalTab, setUploadModalTab] = useState<"dropzone" | "folder" | "minigame">("dropzone");
  const [isDropzoneHover, setIsDropzoneHover] = useState(false);
  const quickCategories = ["Resumen", "Modelos de Examen", "Apuntes Teóricos", "Guía de TP", "Fórmulas"];

  const toggleViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("tabe-library-view", mode);
    } catch {}
  };

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<LibraryFile | null>(null);
  const [uploadSubject, setUploadSubject] = useState<string>("");
  const [uploadYear, setUploadYear] = useState<number | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#00d9ff");
  const [newFolderSubject, setNewFolderSubject] = useState<string>("");
  const [newFolderYear, setNewFolderYear] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fullScreenFile, setFullScreenFile] = useState<LibraryFile | null>(null);
  const [viewerZoom, setViewerZoom] = useState(100);
  const [viewerTimer, setViewerTimer] = useState(0);
  const viewerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [generating, setGenerating] = useState<'flashcards' | 'summary' | 'quiz' | null>(null);
  const [showGenOptions, setShowGenOptions] = useState<'flashcards' | 'quiz' | null>(null);
  const [genCount, setGenCount] = useState(10);
  const [loading, setLoading] = useState(() => !libraryFilesCache);
  const { publishResource } = useMarketplace();
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishingResource, setPublishingResource] = useState<{ id: string; type: "file" | "folder"; nombre: string } | null>(null);
  const [pubDescription, setPubDescription] = useState("");
  const [pubCategory, setPubCategory] = useState("");
  const [pubIsAnonymous, setPubIsAnonymous] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "folder" | "file";
    id: string;
    nombre: string;
    file?: LibraryFile;
    folderId?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [uploadBasketballMode, setUploadBasketballMode] = useState<"file" | "folder">("file");
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isDraggingExternal, setIsDraggingExternal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit Folder States
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<LibraryFolder | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderColor, setEditFolderColor] = useState("");
  const [editFolderSubject, setEditFolderSubject] = useState<string>("");
  const [editFolderYear, setEditFolderYear] = useState<number | null>(null);

  const fetchSubjects = async () => {
    try {
      if (isGuest) {
        const guestSubs: Subject[] = [{ id: "mock", nombre: "Uso de Tablero", codigo: "TAB1", año: 1 }];
        librarySubjectsCache = guestSubs;
        setSubjects(guestSubs);
        return guestSubs;
      }
      let query = supabase
        .from("subjects")
        .select("id, nombre, codigo, año")
        .order("año", { ascending: true })
        .order("nombre", { ascending: true });

      if (user) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (!error && data) {
        librarySubjectsCache = data;
        setSubjects(data);
        return data;
      }
    } catch (e) {
      console.error("Error fetching library subjects:", e);
    }
    return librarySubjectsCache || [];
  };

  const loadInitialData = async () => {
    if (!user && !isGuest) {
      setLoading(false);
      return;
    }

    if (libraryFilesCache === null) {
      setLoading(true);
    }

    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    try {
      await Promise.allSettled([
        fetchSubjects(),
        fetchFolders(),
        fetchFiles(false)
      ]);
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [user, isGuest]);

  // Reset subject filter when year changes
  useEffect(() => {
    setSelectedSubjectId(null);
  }, [selectedYear]);

  // ─── Context-aware defaults for uploads ─────────────────────────────
  const getContextSubjectId = (): string | null => {
    // Priority 1: Current folder's subject
    if (currentFolderId) {
      const currentFolder = folders.find(f => f.id === currentFolderId);
      if (currentFolder?.subject_id) return currentFolder.subject_id;
    }
    // Priority 2: Active filter
    return selectedSubjectId || null;
  };

  const getContextYear = (): number | null => {
    const subjectId = getContextSubjectId();
    if (subjectId) {
      const sub = subjects.find(s => s.id === subjectId);
      if (sub) return sub.año;
    }
    return selectedYear;
  };

  const openUploadModal = () => {
    if (isGuest) {
      toast.error("El modo demo es de solo lectura. Inicia sesión o regístrate para subir archivos.");
      return;
    }
    const subId = getContextSubjectId();
    const year = getContextYear();
    setUploadSubject(subId || "");
    setUploadYear(year);
    setShowUploadModal(true);
  };

  const openLinkModal = () => {
    if (isGuest) {
      toast.error("El modo demo es de solo lectura. Inicia sesión o regístrate para guardar enlaces.");
      return;
    }
    const subId = getContextSubjectId();
    const year = getContextYear();
    setUploadSubject(subId || "");
    setUploadYear(year);
    setShowLinkModal(true);
  };

  const openFolderModal = () => {
    const subId = getContextSubjectId();
    const year = getContextYear();
    setNewFolderSubject(subId || "");
    setNewFolderYear(year);
    setShowFolderModal(true);
  };

  // ─── Full-Screen Viewer ────────────────────────────────────────────
  const openFullScreenViewer = async (file: LibraryFile) => {
    let fileToView = file;
    if (file.storage_path) {
      const signedUrl = await getSignedUrl(file.storage_path);
      if (signedUrl) fileToView = { ...file, url: signedUrl };
      else { toast.error("Error al cargar el archivo"); return; }
    }
    setFullScreenFile(fileToView);
    setViewerZoom(100);
    setViewerTimer(0);
    // Start timer
    viewerTimerRef.current = setInterval(() => setViewerTimer(t => t + 1), 1000);
  };

  const closeFullScreenViewer = () => {
    saveLibraryStudySession();
    setFullScreenFile(null);
    viewerTimerRef.current = null;
  };

  const saveLibraryStudySession = () => {
    if (viewerTimerRef.current) clearInterval(viewerTimerRef.current);
    
    // Convert to a local variable for the closure in case state clears
    let secondsToSave = viewerTimer;
    const fileToSave = fullScreenFile;

    if (secondsToSave > 43200) {
      secondsToSave = 43200; // Cap at 12 hours
    }
    
    if (secondsToSave > 5 && user && fileToSave) {
      supabase.from("study_sessions").insert({
        user_id: user.id,
        subject_id: fileToSave.subject_id,
        duracion_segundos: secondsToSave,
        tipo: "biblioteca",
        completada: true,
        fecha: toLocalDateStr(),
      }).then(({ error }) => {
        if (error) console.error("Error saving library session:", error);
        else {
          console.log(`⏱️ Sesión de ${secondsToSave}s guardada`);
          // We don't toast on exit-saves to avoid UI glitches during unmount
          if (document.visibilityState === 'visible') {
            toast.success(`⏱️ Sesión de ${formatTime(secondsToSave)} registrada`);
          }
        }
      });
    }
  };

      // Visibility change listener for Library viewer
    const viewerTimerStateRef = useRef(viewerTimer);
    const fullScreenFileRef = useRef(fullScreenFile);
    
    useEffect(() => {
      viewerTimerStateRef.current = viewerTimer;
      fullScreenFileRef.current = fullScreenFile;
    }, [viewerTimer, fullScreenFile]);

    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden' && fullScreenFileRef.current) {
          // Instead of calling saveLibraryStudySession which clears the interval,
          // we should just pause the timer or do nothing, 
          // because the user wants to ONLY count time when looking at the app.
          // BUT wait! To keep it simple, we can just clear the interval, and when visible, restart it!
          if (viewerTimerRef.current) clearInterval(viewerTimerRef.current);
          viewerTimerRef.current = null;
        } else if (document.visibilityState === 'visible' && fullScreenFileRef.current) {
          if (!viewerTimerRef.current) {
            viewerTimerRef.current = window.setInterval(() => setViewerTimer(t => t + 1), 1000);
          }
        }
      };
  
      window.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
                window.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, []);

    // Save on tab close
    useEffect(() => {
      const handleBeforeUnload = () => {
        if (fullScreenFileRef.current) {
          if (viewerTimerStateRef.current > 5) {
             const url = import.meta.env.VITE_SUPABASE_URL;
             const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
             if (url && key) {
               const tokenKey = 'sb-' + new URL(url).hostname.split('.')[0] + '-auth-token';
               const tokenStr = localStorage.getItem(tokenKey);
               let token = key;
               if (tokenStr) {
                 try { token = JSON.parse(tokenStr).access_token || key; } catch {}
               }
               fetch(`${url}/rest/v1/study_sessions`, {
                 method: 'POST',
                 headers: {
                   'apikey': key,
                   'Authorization': `Bearer ${token}`,
                   'Content-Type': 'application/json'
                 },
                 body: JSON.stringify({
                   user_id: user?.id,
                   subject_id: fullScreenFileRef.current.subject_id,
                   duracion_segundos: Math.min(viewerTimerStateRef.current, 43200),
                   tipo: "biblioteca",
                   completada: true,
                   fecha: toLocalDateStr(),
                 }),
                 keepalive: true
               }).catch(()=>{});
             }
          }
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('pagehide', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('pagehide', handleBeforeUnload);
      };
    }, [user?.id]);

  // Atajos de teclado estilo Notion / ChatGPT
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape
      if (e.key === "Escape") {
        if (fullScreenFileRef.current) {
          closeFullScreenViewer();
          return;
        }
        if (selectedIds.size > 0) {
          setSelectedIds(new Set());
          return;
        }
        if (searchQuery) {
          setSearchQuery("");
          return;
        }
      }

      // Atajo '/' para enfocar búsqueda
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Zoom en pantalla completa
      if (fullScreenFileRef.current) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          setViewerZoom(z => Math.min(300, z + 25));
        } else if (e.key === "-") {
          e.preventDefault();
          setViewerZoom(z => Math.max(25, z - 25));
        } else if (e.key === "0") {
          e.preventDefault();
          setViewerZoom(100);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery, selectedIds.size]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
    return `${s}s`;
  };

  const extractAndSpeakPDF = async (url: string) => {
    setIsExtractingText(true);
    const toastId = toast.loading("Extrayendo texto del PDF...");
    try {
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      let fullText = "";
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + " ";
        // Limit to prevent browser freeze with huge PDFs
        if (fullText.length > 50000) break;
      }

      if (fullText.trim().length > 0) {
        toast.success("¡Texto extraído!", { id: toastId });
        speak(fullText.substring(0, 30000)); // Read first 30k chars
      } else {
        toast.error("No se pudo extraer texto de este PDF.", { id: toastId });
      }
    } catch (err) {
      console.error("Error extracting PDF text:", err);
      toast.error("Error al leer el PDF", { id: toastId });
    } finally {
      setIsExtractingText(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  useEffect(() => {
    clearSelection();
  }, [currentFolderId, selectedYear, selectedSubjectId]);

  const fetchFolders = async () => {
    try {
      if (isGuest) {
        const guestFolders: LibraryFolder[] = [
          { id: "mock-folder-1", nombre: "Tutorial Tabe", color: "#00d9ff", subject_id: null, parent_folder_id: null, created_at: new Date().toISOString() },
          { id: "mock-folder-2", nombre: "Importante", color: "#a855f7", subject_id: null, parent_folder_id: null, created_at: new Date().toISOString() }
        ];
        libraryFoldersCache = guestFolders;
        setFolders(guestFolders);
        return guestFolders;
      }

      if (!user) return [];

      const { data, error } = await supabase
        .from("library_folders")
        .select("id, user_id, subject_id, nombre, color, parent_folder_id, created_at, subjects(nombre, codigo, año)")
        .eq("user_id", user.id)
        .order("nombre", { ascending: true });

      if (!error && data) {
        const mapped = data.map((f: any) => ({ ...f, subject: f.subjects })) as LibraryFolder[];
        libraryFoldersCache = mapped;
        setFolders(mapped);
        return mapped;
      } else {
        // Fallback without relation join if PostgREST cache has quirks
        const { data: rawFolders } = await supabase
          .from("library_folders")
          .select("id, user_id, subject_id, nombre, color, parent_folder_id, created_at")
          .eq("user_id", user.id)
          .order("nombre", { ascending: true });
        if (rawFolders) {
          const subs = librarySubjectsCache || subjects;
          const mapped = rawFolders.map((f: any) => {
            const s = subs.find(sub => sub.id === f.subject_id);
            return { ...f, subject: s ? { nombre: s.nombre, codigo: s.codigo, año: s.año } : undefined };
          }) as LibraryFolder[];
          libraryFoldersCache = mapped;
          setFolders(mapped);
          return mapped;
        }
      }
    } catch (e) {
      console.error("Error fetching library folders:", e);
    }
    return libraryFoldersCache || [];
  };

  const fetchFiles = async (showLoading = false) => {
    if (!user && !isGuest) {
      setLoading(false);
      return [];
    }

    if (showLoading && (!libraryFilesCache || libraryFilesCache.length === 0)) {
      setLoading(true);
    }

    try {
      if (isGuest) {
        const guestFiles: LibraryFile[] = [
          {
            id: "mock-file-1",
            nombre: "Guía Rápida de Tabe.pdf",
            tipo: "pdf",
            url: "data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCgoyIDAgb2JqCjw8L1R5cGUvUGFnZXMvS2lkc1szIDAgUl0vQ291bnQgMT4+CmVuZG9iagoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDU5NSA4NDJdL1BhcmVudCAyIDAgUi9SZXNvdXJjZXM8PC9Gb250PDwvRjEgNCAwIFI+Pj4+L0NvbnRlbnRzIDUgMCBSPj4KZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iagoKNSAwIG9iago8PC9MZW5ndGggNDQ+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKEVzdGUgZXMgdW4gUERGIGRlIHBydWViYS4pIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDUzIDAwMDAwIG4gCjAwMDAwMDAxMDIgMDAwMDAgbiAKMDAwMDAwMDIwNCAwMDAwMCBuIAowMDAwMDAwMjkxIDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA2L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMzgzCiUlRU9GCg==",
            storage_path: null,
            tamaño_bytes: 1048576 * 1.5, // 1.5 MB
            subject_id: null,
            folder_id: "mock-folder-1", // Tutorial Tabe
            created_at: new Date().toISOString(),
          }
        ];
        libraryFilesCache = guestFiles;
        setFiles(guestFiles);
        return guestFiles;
      }

      if (!user) return [];

      const { data, error } = await supabase
        .from("library_files")
        .select("id, user_id, subject_id, folder_id, nombre, tipo, url, storage_path, tamaño_bytes, created_at, subjects(nombre, codigo, año)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!error && data) {
        const mapped = data.map((d: any) => ({ ...d, subject: d.subjects })) as LibraryFile[];
        libraryFilesCache = mapped;
        setFiles(mapped);
        return mapped;
      } else {
        // Fallback without relation join
        const { data: rawFiles } = await supabase
          .from("library_files")
          .select("id, user_id, subject_id, folder_id, nombre, tipo, url, storage_path, tamaño_bytes, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500);
        if (rawFiles) {
          const subs = librarySubjectsCache || subjects;
          const mapped = rawFiles.map((d: any) => {
            const s = subs.find(sub => sub.id === d.subject_id);
            return { ...d, subject: s ? { nombre: s.nombre, codigo: s.codigo, año: s.año } : undefined };
          }) as LibraryFile[];
          libraryFilesCache = mapped;
          setFiles(mapped);
          return mapped;
        }
      }
    } catch (e) {
      console.error("Error fetching library files:", e);
    } finally {
      setLoading(false);
    }
    return libraryFilesCache || [];
  };

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    if (folderId === null) {
      setFolderPath([]);
    } else {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        const path: LibraryFolder[] = [];
        let current: LibraryFolder | undefined = folder;
        while (current) {
          path.unshift(current);
          current = folders.find(f => f.id === current?.parent_folder_id);
        }
        setFolderPath(path);
      }
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    if (isGuest) {
      setFolders((current) => [...current, {
        id: `mock-folder-${Date.now()}`,
        nombre: newFolderName.trim(),
        color: newFolderColor,
        subject_id: newFolderSubject || selectedSubjectId || null,
        parent_folder_id: currentFolderId,
        created_at: new Date().toISOString(),
      }]);
      toast.success("¡Carpeta creada en modo demo!");
      setNewFolderName("");
      setNewFolderSubject("");
      setNewFolderYear(null);
      setShowFolderModal(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("library_folders")
        .insert({
          user_id: user.id,
          nombre: newFolderName.trim(),
          color: newFolderColor,
          parent_folder_id: currentFolderId,
          subject_id: newFolderSubject || selectedSubjectId || null,
        });

      if (error) throw error;

      toast.success("¡Carpeta creada!");
      setNewFolderName("");
      setNewFolderSubject("");
      setNewFolderYear(null);
      setShowFolderModal(false);
      fetchFolders();
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Error al crear la carpeta");
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (isGuest) {
      const childFolderIds = new Set<string>([folderId]);
      let changed = true;
      while (changed) {
        changed = false;
        folders.forEach((folder) => {
          if (folder.parent_folder_id && childFolderIds.has(folder.parent_folder_id) && !childFolderIds.has(folder.id)) {
            childFolderIds.add(folder.id);
            changed = true;
          }
        });
      }
      setFolders((current) => current.filter((folder) => !childFolderIds.has(folder.id)));
      setFiles((current) => current.filter((file) => !file.folder_id || !childFolderIds.has(file.folder_id)));
      if (childFolderIds.has(currentFolderId || "")) navigateToFolder(null);
      setSelectedIds(new Set());
      toast.success("Carpeta eliminada en modo demo");
      return;
    }

    try {
      setLoading(true);
      // Recursively find all nested folders and files to delete their storage
      const getAllChildFolders = (parentId: string): string[] => {
        const directChildren = folders.filter(f => f.parent_folder_id === parentId);
        let allChildren: string[] = directChildren.map(f => f.id);
        for (const child of directChildren) {
          allChildren = [...allChildren, ...getAllChildFolders(child.id)];
        }
        return allChildren;
      };

      const folderIdsToDelete = [folderId, ...getAllChildFolders(folderId)];
      const filesToDelete = files.filter(f => f.folder_id && folderIdsToDelete.includes(f.folder_id));
      const storagePaths = filesToDelete
        .map(f => f.storage_path)
        .filter((path): path is string => !!path);

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('library-files')
          .remove(storagePaths);
        if (storageError) console.error("Error deleting physical files:", storageError);
      }

      const { error } = await supabase
        .from("library_folders")
        .delete()
        .eq("id", folderId);

      if (error) throw error;

      toast.success("Carpeta y contenido eliminados");
      fetchFolders();
      fetchFiles();
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error("Error al eliminar la carpeta");
    } finally {
      setLoading(false);
    }
  };

  const openEditFolder = (folder: LibraryFolder) => {
    setEditingFolder(folder);
    setEditFolderName(folder.nombre);
    setEditFolderColor(folder.color);
    setEditFolderSubject(folder.subject_id || "");

    // Find subject year if exists
    const subject = subjects.find(s => s.id === folder.subject_id);
    setEditFolderYear(subject ? subject.año : null);

    setShowEditFolderModal(true);
  };

  const updateFolder = async () => {
    if (!editingFolder || !editFolderName.trim()) return;

    if (isGuest) {
      setFolders((current) => current.map((folder) => folder.id === editingFolder.id
        ? { ...folder, nombre: editFolderName.trim(), color: editFolderColor, subject_id: editFolderSubject || null }
        : folder));
      toast.success("Carpeta actualizada en modo demo");
      setShowEditFolderModal(false);
      setEditingFolder(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("library_folders")
        .update({
          nombre: editFolderName.trim(),
          color: editFolderColor,
          subject_id: editFolderSubject || null,
        } as any)
        .eq("id", editingFolder.id);

      if (error) throw error;

      toast.success("Carpeta actualizada");
      setShowEditFolderModal(false);
      setEditingFolder(null);
      fetchFolders();
    } catch (error: any) {
      console.error("Error updating folder:", error);
      toast.error(`Error al actualizar: ${error.message || "Error desconocido"}`);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const confirmDelete = await confirm({
      title: "¿Eliminar elementos seleccionados?",
      description: `¿Estás seguro de que quieres eliminar ${selectedIds.size} elementos y todo su contenido? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar selección",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!confirmDelete) return;

    const idsArray = Array.from(selectedIds);
    setLoading(true);

    try {
      // For each selected folder, find its descendants to clean up storage
      const selectedFolders = folders.filter(f => idsArray.includes(f.id));
      
      const getAllChildFolders = (parentId: string): string[] => {
        const directChildren = folders.filter(f => f.parent_folder_id === parentId);
        let allChildren: string[] = directChildren.map(f => f.id);
        for (const child of directChildren) {
          allChildren = [...allChildren, ...getAllChildFolders(child.id)];
        }
        return allChildren;
      };

      let allFolderIds = [...idsArray];
      for (const folder of selectedFolders) {
        allFolderIds = [...allFolderIds, ...getAllChildFolders(folder.id)];
      }

      const filesToDelete = files.filter(f => 
        idsArray.includes(f.id) || (f.folder_id && allFolderIds.includes(f.folder_id))
      );

      const storagePaths = filesToDelete
        .map(f => f.storage_path)
        .filter((path): path is string => !!path);

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('library-files')
          .remove(storagePaths);
        if (storageError) console.error("Error deleting physical files:", storageError);
      }

      const { error: foldersError } = await supabase
        .from("library_folders")
        .delete()
        .in("id", idsArray);

      const { error: filesError } = await supabase
        .from("library_files")
        .delete()
        .in("id", idsArray);

      if (foldersError || filesError) throw foldersError || filesError;

      toast.success("Elementos eliminados correctamente");
      setSelectedIds(new Set());
      fetchFolders();
      fetchFiles();
    } catch (error) {
      console.error("Error deleting selected items:", error);
      toast.error("Error al eliminar los elementos seleccionados");
    } finally {
      setLoading(false);
    }
  };

  const deleteAllLibrary = async () => {
    if (files.length === 0 && folders.length === 0) {
      toast.info("No hay archivos ni carpetas para eliminar");
      return;
    }

    const confirmed = await confirm({
      title: "¿Eliminar toda la biblioteca?",
      description: "Esta acción eliminará PERMANENTEMENTE todos tus archivos y carpetas tanto de la base de datos como del almacenamiento. Esta acción NO se puede deshacer.",
      confirmText: "Sí, borrar todo",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) return;

    if (isGuest) {
      setFolders([]);
      setFiles([]);
      setSelectedIds(new Set());
      setCurrentFolderId(null);
      setFolderPath([]);
      libraryFoldersCache = [];
      libraryFilesCache = [];
      toast.success("Biblioteca vaciada en modo demo");
      return;
    }

    if (!user) return;

    setLoading(true);
    const toastId = toast.loading("Eliminando toda la biblioteca de la base de datos...");

    try {
      // 1. Obtener todos los paths de almacenamiento para no dejar archivos físicos huérfanos
      const { data: userFiles } = await supabase
        .from("library_files")
        .select("storage_path")
        .eq("user_id", user.id);

      const storagePaths = (userFiles || [])
        .map(f => f.storage_path)
        .filter((p): p is string => !!p);

      // 2. Limpiar archivos físicos de Supabase Storage en lotes
      if (storagePaths.length > 0) {
        for (let i = 0; i < storagePaths.length; i += 100) {
          const chunk = storagePaths.slice(i, i + 100);
          await supabase.storage.from("library-files").remove(chunk);
        }
      }

      // 3. Eliminar de la base de datos (library_files y library_folders)
      const { error: filesErr } = await supabase
        .from("library_files")
        .delete()
        .eq("user_id", user.id);

      if (filesErr) throw filesErr;

      const { error: foldersErr } = await supabase
        .from("library_folders")
        .delete()
        .eq("user_id", user.id);

      if (foldersErr) throw foldersErr;

      // 4. Limpiar estado local
      libraryFoldersCache = [];
      libraryFilesCache = [];
      setFolders([]);
      setFiles([]);
      setSelectedIds(new Set());
      setCurrentFolderId(null);
      setFolderPath([]);

      toast.success("¡Toda la biblioteca ha sido eliminada permanentemente!", { id: toastId });
    } catch (error: any) {
      console.error("Error deleting all library content:", error);
      toast.error(error?.message || "Error al eliminar la biblioteca", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!publishingResource || !pubDescription || !pubCategory) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    const success = await publishResource(
      publishingResource.type,
      publishingResource.id,
      pubDescription,
      pubCategory,
      pubIsAnonymous
    );

    if (success) {
      setShowPublishModal(false);
      setPublishingResource(null);
      setPubDescription("");
      setPubCategory("");
      setPubIsAnonymous(false);
    }
  };

  // Get signed URL for private files
  const getSignedUrl = async (storagePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('library-files')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) {
      console.error("Error getting signed URL:", error);
      return null;
    }
    return data.signedUrl;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isGuest) {
      toast.error("El modo demo es de solo lectura. Inicia sesión o regístrate para subir archivos.");
      setShowUploadModal(false);
      setUploadSubject("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // If it's a ZIP, extract and upload contents
    if (file.name.toLowerCase().endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed") {
      setUploading(true);
      const toastId = toast.loading("Extrayendo archivo ZIP...");

      try {
        const zip = await JSZip.loadAsync(file);
        const entries = Object.entries(zip.files).filter(([_, f]) => !f.dir && !f.name.startsWith("__MACOSX") && !f.name.split("/").pop()?.startsWith("."));

        if (entries.length === 0) {
          toast.error("El ZIP está vacío o no contiene archivos válidos.", { id: toastId });
          return;
        }

        // Collect unique directory paths
        const dirPaths = new Set<string>();
        for (const [path] of entries) {
          const parts = path.split("/");
          for (let j = 1; j < parts.length; j++) {
            dirPaths.add(parts.slice(0, j).join("/"));
          }
        }

        const sortedPaths = Array.from(dirPaths).sort(
          (a, b) => a.split("/").length - b.split("/").length
        );

        // Create folders
        const folderMap = new Map<string, string>();
        folderMap.set("", currentFolderId || "");

        for (const dirPath of sortedPaths) {
          const parts = dirPath.split("/");
          const folderName = parts[parts.length - 1];
          const parentPath = parts.slice(0, -1).join("/");
          const parentId = folderMap.get(parentPath) || null;

          const { data, error } = await supabase
            .from("library_folders")
            .insert({
              user_id: user.id,
              nombre: folderName,
              color: folderColors[Math.floor(Math.random() * folderColors.length)].value,
              parent_folder_id: parentId || currentFolderId,
              subject_id: uploadSubject || selectedSubjectId || null,
            })
            .select("id")
            .single();

          if (error) throw error;
          folderMap.set(dirPath, data.id);
        }

        // Upload files
        let uploaded = 0;
        for (const [path, zipEntry] of entries) {
          const blob = await zipEntry.async("blob");
          if (!canUse("apuntes") || !canUse("storage_mb", blob.size)) {
            toast.error("Límite de archivos o almacenamiento alcanzado. Hacete Premium para subir más.", { id: toastId });
            break;
          }

          const parts = path.split("/");
          const fileName = parts[parts.length - 1];
          const parentDirPath = parts.slice(0, -1).join("/");
          const folderId = folderMap.get(parentDirPath) || currentFolderId;

          let tipo: "pdf" | "imagen" | "video" | "otro" = "otro";
          if (fileName.toLowerCase().endsWith(".pdf")) tipo = "pdf";
          else if (/\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(fileName)) tipo = "imagen";
          else if (/\.(mp4|webm|mov|avi)$/i.test(fileName)) tipo = "video";

          const fileExt = fileName.split(".").pop();
          const storageName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${user.id}/${storageName}`;

          const { error: uploadError } = await supabase.storage
            .from("library-files")
            .upload(filePath, blob);

          if (uploadError) {
            console.error(`Error uploading ${fileName}:`, uploadError);
            continue;
          }

          const signedUrl = await getSignedUrl(filePath);
          if (!signedUrl) continue;

          const { error: fileError } = await supabase.from("library_files").insert({
            user_id: user.id,
            subject_id: uploadSubject || selectedSubjectId || null,
            folder_id: folderId,
            nombre: fileName,
            tipo,
            url: signedUrl,
            storage_path: filePath,
            tamaño_bytes: blob.size,
          });

          if (fileError) {
            console.error(`Error saving ${fileName} to DB:`, fileError);
            continue;
          }

          await incrementUsage("apuntes");

          uploaded++;
          toast.loading(`Subiendo ZIP (${uploaded}/${entries.length} archivos)...`, { id: toastId });
        }

        toast.success(`¡ZIP extraído! ${uploaded} archivos en ${sortedPaths.length} carpetas.`, { id: toastId });
        fetchFolders();
        fetchFiles();
        setShowUploadModal(false);
        setUploadSubject("");
      } catch (error) {
        console.error("Error extracting ZIP:", error);
        toast.error("Error al extraer el archivo ZIP", { id: toastId });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      return;
    }

    await uploadFilesList(event.target.files ? Array.from(event.target.files) : []);
  };

  // Subida de uno o varios archivos (usada por el juego de básquet, drag&drop y el input)
  const uploadFilesList = async (filesToUpload: File[]) => {
    {
      if (!filesToUpload || filesToUpload.length === 0) return;

      if (isGuest) {
        toast.error("El modo demo es de solo lectura. Inicia sesión o regístrate para subir archivos.");
        setShowUploadModal(false);
        setUploadSubject("");
        return;
      }

      if (!user) {
        toast.error("Debes iniciar sesión para subir archivos.");
        return;
      }

      // Filtrar y validar cada archivo
      const validFiles: File[] = [];
      for (const f of filesToUpload) {
        const fileCheck = validateFileUpload(f);
        if (!fileCheck.valid) {
          toast.error(`"${f.name}": ${fileCheck.error || "Archivo no válido"}`);
          continue;
        }
        if (!canUse("apuntes") || !canUse("storage_mb", f.size)) {
          toast.error("Límite de archivos o almacenamiento alcanzado. Hacete Premium para subir más.");
          break;
        }
        validFiles.push(f);
      }

      if (validFiles.length === 0) {
        setUploading(false);
        return;
      }

      setUploading(true);
      const toastId = toast.loading(`Subiendo ${validFiles.length} archivo${validFiles.length > 1 ? "s" : ""}...`);

      try {
        const mimeMap: Record<string, string> = {
          pdf: "application/pdf",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          gif: "image/gif",
          webp: "image/webp",
          doc: "application/msword",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          xls: "application/vnd.ms-excel",
          xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ppt: "application/vnd.ms-powerpoint",
          pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          txt: "text/plain",
          md: "text/markdown",
          csv: "text/csv",
        };

        const rows: any[] = [];
        const uploadErrors: string[] = [];
        const queue = [...validFiles];
        const subjectToUse = uploadSubject || selectedSubjectId;

        const worker = async () => {
          while (queue.length > 0) {
            const file = queue.shift()!;
            let tipo: "pdf" | "imagen" | "video" | "otro" = "otro";
            if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) tipo = "pdf";
            else if (file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(file.name)) tipo = "imagen";
            else if (file.type.startsWith("video/") || /\.(mp4|webm|mov|avi)$/i.test(file.name)) tipo = "video";

            const fileExt = (file.name.split(".").pop() || "").toLowerCase();
            const cleanExt = fileExt ? `.${fileExt}` : "";
            const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}${cleanExt}`;
            const resolvedMime = mimeMap[fileExt] || (file.type && file.type.length > 3 ? file.type : "application/pdf");

            const { error: uploadError } = await supabase.storage
              .from("library-files")
              .upload(filePath, file, {
                cacheControl: "31536000",
                upsert: false,
                contentType: resolvedMime,
              });

            if (uploadError) {
              console.error(`Error subiendo ${file.name}:`, uploadError);
              uploadErrors.push(`${file.name}: ${uploadError.message}`);
              continue;
            }

            const fileUrl = supabase.storage.from("library-files").getPublicUrl(filePath).data.publicUrl;

            rows.push({
              user_id: user.id,
              subject_id: subjectToUse || null,
              folder_id: currentFolderId,
              nombre: file.name,
              tipo,
              url: fileUrl,
              storage_path: filePath,
              tamaño_bytes: file.size,
            });

            toast.loading(`Subiendo archivos (${rows.length}/${validFiles.length})...`, { id: toastId });
          }
        };

        const concurrency = Math.min(8, validFiles.length);
        await Promise.all(Array.from({ length: concurrency }, () => worker()));

        if (rows.length > 0) {
          for (let i = 0; i < rows.length; i += 50) {
            const chunk = rows.slice(i, i + 50);
            const { error: insertError } = await supabase.from("library_files").insert(chunk);
            if (insertError) throw insertError;
          }
          await incrementUsage("apuntes");
        }

        if (rows.length > 0) {
          if (uploadErrors.length > 0) {
            toast.warning(`Subidos ${rows.length} archivos (${uploadErrors.length} con error)`, { id: toastId });
          } else {
            toast.success(`¡${rows.length} archivo${rows.length > 1 ? "s" : ""} subido${rows.length > 1 ? "s" : ""}!`, { id: toastId });
          }
        } else {
          toast.error(`Error al subir archivos: ${uploadErrors[0] || "Error desconocido"}`, { id: toastId });
        }

        libraryFilesCache = null;
        await fetchFiles();
        setShowUploadModal(false);
        setUploadSubject("");
      } catch (error: any) {
        console.error("Error uploading files:", error);
        toast.error(error?.message || "Error al subir los archivos", { id: toastId });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const uploadFolderFilesList = async (filesListInput: FileList | File[]) => {
    const rawFiles = Array.from(filesListInput);
    if (!rawFiles || rawFiles.length === 0) return;

    if (isGuest) {
      toast.error("El modo demo es de solo lectura. Inicia sesión o regístrate para subir carpetas.");
      setShowUploadModal(false);
      return;
    }

    if (!user) {
      toast.error("Debes iniciar sesión para subir carpetas.");
      return;
    }

    const IGNORED_NAMES = new Set(["desktop.ini", "thumbs.db", ".ds_store", "__macosx"]);
    const fileList = rawFiles.filter((f) => {
      const lower = f.name.toLowerCase();
      return !lower.startsWith(".") && !IGNORED_NAMES.has(lower) && f.size > 0;
    });

    if (fileList.length === 0) {
      toast.error("La carpeta no contiene archivos válidos o está vacía.");
      return;
    }

    setShowUploadModal(false);
    setUploading(true);
    const toastId = toast.loading(`Subiendo carpeta (0/${fileList.length} archivos)...`);

    try {
      // 1. Construir jerarquía de carpetas
      const folderMap = new Map<string, string>();
      folderMap.set("", currentFolderId || "");

      const dirPaths = new Set<string>();
      for (const file of fileList) {
        const relPath = file.webkitRelativePath || file.name;
        const parts = relPath.split("/");
        for (let j = 1; j < parts.length; j++) {
          dirPaths.add(parts.slice(0, j).join("/"));
        }
      }

      const sortedPaths = Array.from(dirPaths).sort(
        (a, b) => a.split("/").length - b.split("/").length
      );

      // Crear carpetas en la base de datos
      for (const dirPath of sortedPaths) {
        const parts = dirPath.split("/");
        const folderName = parts[parts.length - 1];
        const parentPath = parts.slice(0, -1).join("/");
        const parentId = folderMap.get(parentPath) || null;

        const { data, error } = await supabase
          .from("library_folders")
          .insert({
            user_id: user.id,
            nombre: folderName,
            color: folderColors[Math.floor(Math.random() * folderColors.length)].value,
            parent_folder_id: (parentId || currentFolderId) || null,
            subject_id: getContextSubjectId() || null,
          })
          .select("id")
          .single();

        if (error) {
          console.error("Error creando carpeta:", folderName, error);
          throw error;
        }
        folderMap.set(dirPath, data.id);
      }

      // 2. Subida de archivos concurrentes
      const queue = [...fileList];
      const rows: any[] = [];
      const uploadErrors: string[] = [];

      const mimeMap: Record<string, string> = {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        txt: "text/plain",
        md: "text/markdown",
        csv: "text/csv",
      };

      const worker = async () => {
        while (queue.length > 0) {
          const file = queue.shift()!;
          const relPath = file.webkitRelativePath || file.name;
          const parts = relPath.split("/");
          const folderId = folderMap.get(parts.slice(0, -1).join("/")) || currentFolderId;

          let tipo: "pdf" | "imagen" | "video" | "otro" = "otro";
          if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) tipo = "pdf";
          else if (file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(file.name)) tipo = "imagen";
          else if (file.type.startsWith("video/") || /\.(mp4|webm|mov|avi)$/i.test(file.name)) tipo = "video";

          const fileExt = (file.name.split(".").pop() || "").toLowerCase();
          const cleanExt = fileExt ? `.${fileExt}` : "";
          const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}${cleanExt}`;

          const resolvedMime = mimeMap[fileExt] || (file.type && file.type.length > 3 ? file.type : "application/pdf");

          const { error: uploadError } = await supabase.storage
            .from("library-files")
            .upload(filePath, file, {
              cacheControl: "31536000",
              upsert: false,
              contentType: resolvedMime,
            });

          if (uploadError) {
            console.error(`Error uploading ${file.name}:`, uploadError);
            uploadErrors.push(`${file.name}: ${uploadError.message}`);
            continue;
          }

          const fileUrl = supabase.storage.from("library-files").getPublicUrl(filePath).data.publicUrl;

          rows.push({
            user_id: user.id,
            subject_id: getContextSubjectId() || null,
            folder_id: (folderId || currentFolderId) || null,
            nombre: file.name,
            tipo,
            url: fileUrl,
            storage_path: filePath,
            tamaño_bytes: file.size,
          });

          toast.loading(`Subiendo carpeta (${rows.length}/${fileList.length} archivos)...`, { id: toastId });
        }
      };

      const folderConcurrency = Math.min(8, fileList.length);
      await Promise.all(Array.from({ length: folderConcurrency }, () => worker()));

      // 3. Insertar registros en PostgreSQL
      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i += 50) {
          const chunk = rows.slice(i, i + 50);
          const { error: insertError } = await supabase.from("library_files").insert(chunk);
          if (insertError) {
            console.error("Error insertando archivos en base de datos:", insertError);
            throw insertError;
          }
        }
      }

      const uploadedCount = rows.length;

      if (uploadedCount > 0) {
        if (uploadErrors.length > 0) {
          toast.warning(`¡Subidos ${uploadedCount} archivos! (${uploadErrors.length} no se pudieron subir)`, { id: toastId });
        } else {
          toast.success(`¡Carpeta subida! ${uploadedCount} archivo${uploadedCount !== 1 ? "s" : ""} en ${sortedPaths.length} carpeta${sortedPaths.length !== 1 ? "s" : ""}.`, { id: toastId });
        }
      } else {
        const errorDetail = uploadErrors[0] || "No se pudieron subir los archivos a Supabase Storage";
        toast.error(`Error al subir archivos: ${errorDetail}`, { id: toastId });
      }

      libraryFoldersCache = null;
      libraryFilesCache = null;
      await Promise.all([fetchFolders(), fetchFiles()]);
    } catch (error: any) {
      console.error("Error uploading folder:", error);
      toast.error(error?.message || "Error al subir la carpeta", { id: toastId });
    } finally {
      setUploading(false);
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  };

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = event.target.files;
    if (!rawFiles || rawFiles.length === 0) return;
    await uploadFolderFilesList(rawFiles);
  };

  const addLink = async () => {
    if (!linkUrl.trim() || !linkName.trim()) return;

    if (isGuest) {
      toast.error("El modo demo es de solo lectura. Inicia sesión para guardar enlaces.");
      setShowLinkModal(false);
      setUploadSubject("");
      setLinkUrl("");
      setLinkName("");
      return;
    }

    try {
      const subjectToUse = uploadSubject || selectedSubjectId;

      const { error } = await supabase
        .from("library_files")
        .insert({
          user_id: user.id,
          subject_id: subjectToUse || null,
          folder_id: currentFolderId,
          nombre: linkName.trim(),
          tipo: "link",
          url: linkUrl.trim(),
        });

      if (error) throw error;

      toast.success("¡Link agregado!");
      fetchFiles();
      setShowLinkModal(false);
      setUploadSubject("");
      setLinkUrl("");
      setLinkName("");
    } catch (error) {
      console.error("Error adding link:", error);
      toast.error("Error al agregar el link");
    }
  };

  const deleteFile = async (file: LibraryFile) => {
    if (isGuest) {
      setFiles((current) => current.filter((item) => item.id !== file.id));
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(file.id);
        return next;
      });
      toast.success("Archivo eliminado en modo demo");
      return;
    }

    try {
      if (file.storage_path) {
        await supabase.storage.from('library-files').remove([file.storage_path]);
      }

      const { error } = await supabase
        .from("library_files")
        .delete()
        .eq("id", file.id);

      if (error) throw error;

      toast.success("Archivo eliminado");
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Error al eliminar el archivo");
    }
  };

  const openPreview = async (file: LibraryFile) => {
    // For files stored in our private bucket, get a fresh signed URL
    if (file.storage_path) {
      const signedUrl = await getSignedUrl(file.storage_path);
      if (signedUrl) {
        setPreviewFile({ ...file, url: signedUrl });
      } else {
        toast.error("Error al cargar el archivo");
        return;
      }
    } else {
      setPreviewFile(file);
    }
    setShowPreviewModal(true);
  };

  const handleGenerateContent = async (file: LibraryFile, type: 'flashcards' | 'summary' | 'quiz', count?: number) => {
    if (!user) return;
    setGenerating(type);
    setShowGenOptions(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-study-content', {
        body: {
          storagePath: file.storage_path,
          fileUrl: file.url,
          fileName: file.nombre,
          type,
          count: count || genCount
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      if (type === 'flashcards') {
        const rawCards = Array.isArray(data.data) ? data.data : (data.data?.cards || data.cards || []);
        if (!rawCards || rawCards.length === 0) throw new Error("No se generaron flashcards");

        const { data: deck, error: deckError } = await supabase
          .from("flashcard_decks")
          .insert({
            user_id: user.id,
            subject_id: file.subject_id,
            nombre: `Flashcards: ${file.nombre.substring(0, 30)}...`,
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

        toast.success(`¡Mazo de ${rawCards.length} flashcards creado!`);
      } else if (type === 'quiz') {
        const questions = Array.isArray(data.data) ? data.data : (data.data?.questions || data.questions || []);
        if (!questions || questions.length === 0) throw new Error("No se generaron preguntas");

        const { data: quizDeck, error: qdErr } = await supabase
          .from("quiz_decks")
          .insert({
            user_id: user.id,
            subject_id: file.subject_id,
            nombre: `Quiz: ${file.nombre.substring(0, 30)}...`,
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

        toast.success(`¡Cuestionario de ${questions.length} preguntas creado! Andá a Cuestionarios para practicarlo.`);
      } else {
        const summaryText = data.data.summary;
        if (!summaryText) throw new Error("No summary generated");

        const tiptapContent = markdownToTiptap(summaryText);

        const { error: noteError } = await supabase
          .from("notion_documents")
          .insert({
            user_id: user.id,
            subject_id: file.subject_id,
            titulo: `Resumen: ${file.nombre}`,
            emoji: "book",
            contenido: tiptapContent
          });

        if (noteError) throw noteError;

        toast.success("¡Resumen guardado en tus Apuntes!");
      }

    } catch (error: any) {
      console.error("Error generating content:", error);
      toast.error(`Error: ${error.message || "No se pudo generar el contenido"}`);
    } finally {
      setGenerating(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get subjects for current year filter
  const filteredSubjects = selectedYear
    ? subjects.filter(s => s.año === selectedYear)
    : subjects;

  // Get selected subject info
  const selectedSubject = selectedSubjectId
    ? subjects.find(s => s.id === selectedSubjectId)
    : null;

  // Set of known folder IDs to detect orphan files/folders
  const knownFolderIds = useMemo(() => new Set(folders.map(f => f.id)), [folders]);

  // Helper: Get all descendant folder IDs (including the folder itself)
  const getFolderFamilyIds = useCallback((folderId: string): Set<string> => {
    const family = new Set<string>([folderId]);
    let added = true;
    while (added) {
      added = false;
      for (const f of folders) {
        if (f.parent_folder_id && family.has(f.parent_folder_id) && !family.has(f.id)) {
          family.add(f.id);
          added = true;
        }
      }
    }
    return family;
  }, [folders]);

  // Helper: Does a file match the current year/subject filter?
  const fileMatchesFilter = useCallback((file: LibraryFile): boolean => {
    if (selectedSubjectId) {
      return file.subject_id === selectedSubjectId || !file.subject_id;
    }
    if (selectedYear) {
      const targetYear = Number(selectedYear);
      if (file.subject?.año && Number(file.subject.año) === targetYear) return true;
      if (file.subject_id) {
        const sub = subjects.find(s => s.id === file.subject_id);
        return sub ? Number(sub.año) === targetYear : false;
      }
      return true; // Files without assigned subject also pass if in year view
    }
    return true;
  }, [selectedSubjectId, selectedYear, subjects]);

  // Filter folders and files based on year/subject
  const getFilteredFolders = () => {
    let result = folders.filter(f => {
      const parentId = f.parent_folder_id || null;
      if (currentFolderId === null) {
        return parentId === null || !knownFolderIds.has(parentId);
      }
      return parentId === currentFolderId;
    });

    if (selectedSubjectId) {
      result = result.filter(f => {
        if (f.subject_id === selectedSubjectId || !f.subject_id) return true;
        const familyIds = getFolderFamilyIds(f.id);
        return files.some(file => file.folder_id && familyIds.has(file.folder_id) && file.subject_id === selectedSubjectId);
      });
    } else if (selectedYear) {
      const targetYear = Number(selectedYear);
      const subjectIds = new Set(subjects.filter(s => Number(s.año) === targetYear).map(s => s.id));
      result = result.filter(f => {
        if (!f.subject_id) return true;
        if (subjectIds.has(f.subject_id)) return true;
        if (f.subject?.año && Number(f.subject.año) === targetYear) return true;
        // Deep search across all descendants
        const familyIds = getFolderFamilyIds(f.id);
        return files.some(file => file.folder_id && familyIds.has(file.folder_id) && (
          (file.subject_id && subjectIds.has(file.subject_id)) ||
          (file.subject?.año && Number(file.subject.año) === targetYear)
        ));
      });
    }

    return result;
  };

  const getFilteredFiles = (filteredFoldersList: LibraryFolder[]) => {
    // 1. In a specific folder: show matching direct files
    if (currentFolderId !== null) {
      return files.filter(f => (f.folder_id || null) === currentFolderId && fileMatchesFilter(f));
    }

    // 2. In root: files with no folder, or files whose folder doesn't exist in folders
    const directRootFiles = files.filter(f => {
      const fFolder = f.folder_id || null;
      const isDirectOrOrphan = fFolder === null || !knownFolderIds.has(fFolder);
      return isDirectOrOrphan && fileMatchesFilter(f);
    });

    // 3. Fallback: if no folders are visible in root and directRootFiles is empty,
    // but there ARE matching files in the library, show all matching files!
    if (filteredFoldersList.length === 0 && directRootFiles.length === 0) {
      return files.filter(f => fileMatchesFilter(f));
    }

    return directRootFiles;
  };

  const currentFolders = getFilteredFolders();
  const currentFiles = getFilteredFiles(currentFolders);

  const displayedFolders = useMemo(() => {
    if (!searchQuery.trim()) return currentFolders;
    const q = searchQuery.toLowerCase().trim();
    return currentFolders.filter(folder => folder.nombre.toLowerCase().includes(q));
  }, [currentFolders, searchQuery]);

  const displayedFiles = useMemo(() => {
    let list = currentFiles;
    if (fileTypeFilter !== "all") {
      list = list.filter(file => file.tipo === fileTypeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(file =>
        file.nombre.toLowerCase().includes(q) ||
        (file.subject?.nombre && file.subject.nombre.toLowerCase().includes(q))
      );
    }
    return list;
  }, [currentFiles, fileTypeFilter, searchQuery]);

  // Stats
  const totalFilesInFilter = selectedSubjectId
    ? files.filter(f => f.subject_id === selectedSubjectId).length
    : selectedYear
      ? files.filter(f => Number(f.subject?.año) === Number(selectedYear) || (f.subject_id && subjects.some(s => s.id === f.subject_id && Number(s.año) === Number(selectedYear)))).length
      : files.length;

  const currentFolderName = useMemo(() => {
    if (!currentFolderId) return null;
    const current = folders.find(f => f.id === currentFolderId);
    return current ? current.nombre : null;
  }, [currentFolderId, folders]);

  const totalLibraryBytes = useMemo(() => {
    return files.reduce((acc, f) => acc + (f.tamaño_bytes || 0), 0);
  }, [files]);

  const selectAllCurrent = () => {
    const all = new Set<string>();
    displayedFolders.forEach(f => all.add(f.id));
    displayedFiles.forEach(f => all.add(f.id));
    setSelectedIds(all);
  };

  const isAllSelected = (displayedFolders.length > 0 || displayedFiles.length > 0) &&
    displayedFolders.every(f => selectedIds.has(f.id)) &&
    displayedFiles.every(f => selectedIds.has(f.id));

  // Time tracking for preview
  useEffect(() => {
    if (!showPreviewModal || !previewFile) return;

    const startTime = Date.now();

    return () => {
      const endTime = Date.now();
      let durationSeconds = Math.floor((endTime - startTime) / 1000);

      if (durationSeconds > 43200) {
        durationSeconds = 43200; // Cap at 12 hours
      }

      if (durationSeconds > 5 && user) {
        // Save session
        supabase
          .from("study_sessions")
          .insert({
            user_id: user.id,
            subject_id: previewFile.subject_id,
            duracion_segundos: durationSeconds,
            tipo: "biblioteca",
            completada: true,
            fecha: toLocalDateStr(),
          })
          .then(({ error }) => {
            if (error) console.error("Error saving library session:", error);
          });
      }
    };
  }, [showPreviewModal, previewFile, user]);

  return (
    <div className="tabe-page max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* ─── Notion / ChatGPT Style Header & Toolbar ──────────────────────── */}
      <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 transition-all">
        {/* Top Row: Title, Subtitle & Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <BookOpen className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Biblioteca
              </h1>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="font-normal text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-0">
                  {files.length} {files.length === 1 ? "archivo" : "archivos"}
                </Badge>
                {folders.length > 0 && (
                  <Badge variant="secondary" className="font-normal text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-0 hidden sm:inline-flex">
                    {folders.length} {folders.length === 1 ? "carpeta" : "carpetas"}
                  </Badge>
                )}
                {totalLibraryBytes > 0 && (
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono hidden md:inline">
                    · {formatFileSize(totalLibraryBytes)}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Tus documentos, lecturas y recursos organizados con herramientas de IA
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher (Grid / List) */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
              <button
                type="button"
                onClick={() => toggleViewMode("grid")}
                title="Vista Cuadrícula"
                className={cn(
                  "p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
                  viewMode === "grid"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => toggleViewMode("list")}
                title="Vista Lista estilo Notion"
                className={cn(
                  "p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
                  viewMode === "list"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                )}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* "+ Nuevo" Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-medium shadow-2xs transition-all active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 p-1.5 bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl">
                <DropdownMenuLabel className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider px-2 py-1">
                  Agregar a Biblioteca
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    setUploadModalTab("dropzone");
                    openUploadModal();
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-zinc-500" />
                  <span>Subir Archivos</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setUploadModalTab("folder");
                    openUploadModal();
                  }}
                  className="flex items-center gap-2 px-2.5 py-2 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                >
                  <FolderUp className="w-4 h-4 text-zinc-500" />
                  <span>Subir Carpeta</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={openFolderModal}
                  className="flex items-center gap-2 px-2.5 py-2 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                >
                  <FolderPlus className="w-4 h-4 text-zinc-500" />
                  <span>Nueva Carpeta</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={openLinkModal}
                  className="flex items-center gap-2 px-2.5 py-2 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                >
                  <LinkIcon className="w-4 h-4 text-zinc-500" />
                  <span>Agregar Enlace</span>
                </DropdownMenuItem>
                {(folders.length > 0 || files.length > 0) && (
                  <>
                    <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-zinc-800" />
                    <DropdownMenuItem
                      onClick={deleteAllLibrary}
                      className="flex items-center gap-2 px-2.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Borrar toda la biblioteca</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filter and Search Bar Notion-style */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          {/* Realtime Search Input with Keyboard Shortcut */}
          <div className="relative flex-1 max-w-full lg:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o materia..."
              className="w-full pl-9 pr-14 py-2 bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 transition-all"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md transition-colors"
                  title="Limpiar búsqueda (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 rounded select-none pointer-events-none">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Filters: Year, Subject, Format */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Year Pills */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/80 overflow-x-auto">
              <button
                type="button"
                onClick={() => { setSelectedYear(null); setSelectedSubjectId(null); }}
                className={cn(
                  "relative px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap select-none",
                  selectedYear === null
                    ? "text-white dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                {selectedYear === null && (
                  <motion.span
                    layoutId="library-year-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-zinc-100 shadow-2xs"
                  />
                )}
                <span className="relative z-10">Todos los años</span>
              </button>
              {selectableYears.map(year => {
                const isSelected = selectedYear === year;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => { setSelectedYear(year); setSelectedSubjectId(null); }}
                    className={cn(
                      "relative px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap select-none",
                      isSelected
                        ? "text-white dark:text-zinc-900"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="library-year-pill"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-zinc-100 shadow-2xs"
                      />
                    )}
                    <span className="relative z-10">{year}° Año</span>
                  </button>
                );
              })}
            </div>

            {/* Subject Select */}
            {selectedYear && (
              <Select
                value={selectedSubjectId || "all"}
                onValueChange={(val) => setSelectedSubjectId(val === "all" ? null : val)}
              >
                <SelectTrigger className="h-8 px-3 text-xs bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors w-auto gap-1.5 max-w-[200px]">
                  <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                  <SelectValue placeholder="Materia" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-lg max-h-60">
                  <SelectItem value="all" className="text-xs">Todas las materias</SelectItem>
                  {filteredSubjects.map(sub => (
                    <SelectItem key={sub.id} value={sub.id} className="text-xs">
                      {sub.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Format Pills */}
            <div className="hidden sm:flex items-center gap-1 bg-zinc-100/70 dark:bg-zinc-800/50 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
              {(["all", "pdf", "imagen", "link"] as const).map(fmt => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFileTypeFilter(fmt)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all capitalize",
                    fileTypeFilter === fmt
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  )}
                >
                  {fmt === "all" ? "Todos" : fmt === "imagen" ? "Imágenes" : fmt === "link" ? "Enlaces" : fmt.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Clear Filters Button if any active */}
            {(selectedYear !== null || selectedSubjectId !== null || searchQuery !== "" || fileTypeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedYear(null);
                  setSelectedSubjectId(null);
                  setSearchQuery("");
                  setFileTypeFilter("all");
                }}
                className="text-xs text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-1 transition-colors"
                title="Limpiar todos los filtros"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Hidden inputs for folder and files upload */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,image/*"
        />
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          onChange={handleFolderUpload}
          {...({ webkitdirectory: "", directory: "" } as any)}
          multiple
        />
      </div>

      {/* ─── Notion Breadcrumb & Navigation Bar ────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 text-xs bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 px-4 py-2.5 rounded-xl shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap font-medium">
          <button
            type="button"
            onClick={() => navigateToFolder(null)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors",
              currentFolderId === null
                ? "text-zinc-900 dark:text-zinc-100 font-semibold bg-zinc-100 dark:bg-zinc-800/80"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            )}
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
            <span>Biblioteca</span>
          </button>

          {folderPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-1.5">
              <span className="text-zinc-400 dark:text-zinc-600">/</span>
              <button
                type="button"
                onClick={() => navigateToFolder(folder.id)}
                className={cn(
                  "px-2 py-1 rounded-lg transition-colors truncate max-w-[150px] sm:max-w-[200px]",
                  index === folderPath.length - 1
                    ? "text-zinc-900 dark:text-zinc-100 font-semibold bg-zinc-100 dark:bg-zinc-800/80"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                )}
                title={folder.nombre}
              >
                {folder.nombre}
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Back button when in subfolder */}
          {currentFolderId && (
            <button
              type="button"
              onClick={() => {
                const parentId = folderPath.length > 1 ? folderPath[folderPath.length - 2].id : null;
                navigateToFolder(parentId);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2.5 py-1 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </button>
          )}

          {/* Select All Toggle */}
          {(displayedFolders.length > 0 || displayedFiles.length > 0) && (
            <button
              type="button"
              onClick={() => {
                if (isAllSelected) clearSelection();
                else selectAllCurrent();
              }}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title={isAllSelected ? "Deseleccionar todos" : "Seleccionar todos"}
            >
              {isAllSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isAllSelected ? "Deseleccionar" : "Seleccionar"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Content Area with Drag & Drop ────────────────────────────── */}
      <div
        className={cn(
          "min-h-[400px] rounded-2xl transition-all relative",
          isDraggingExternal && "ring-2 ring-primary ring-dashed bg-primary/5 p-4"
        )}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingExternal(true);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDraggingExternal(false);
          }
        }}
        onDrop={async (e) => {
          setIsDraggingExternal(false);
          if (!e.dataTransfer.types.includes("Files") || e.dataTransfer.getData("fileId") || e.dataTransfer.getData("folderId")) return;
          e.preventDefault();
          const droppedFiles = e.dataTransfer.files;
          if (!droppedFiles.length || !user) return;
          await uploadFilesList(Array.from(droppedFiles));
        }}
      >
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-32 bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl space-y-3 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                <div className="w-3/4 h-4 rounded-md bg-zinc-100 dark:bg-zinc-800" />
                <div className="w-1/2 h-3 rounded-md bg-zinc-100 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : displayedFolders.length === 0 && displayedFiles.length === 0 ? (
          /* Empty State Notion-style */
          <div className="text-center py-20 bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-8 shadow-xs max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
              <FolderOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              {searchQuery || selectedYear || selectedSubjectId || fileTypeFilter !== "all"
                ? "No se encontraron elementos"
                : currentFolderId
                  ? "Esta carpeta está vacía"
                  : "Tu biblioteca está lista para tus apuntes"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 font-normal max-w-sm mx-auto">
              {searchQuery || selectedYear || selectedSubjectId
                ? "Prueba modificando los filtros o el término de búsqueda."
                : "Organiza tus materias creando carpetas o arrastra archivos directamente aquí."}
            </p>
            <div className="flex gap-2.5 justify-center flex-wrap">
              <button
                type="button"
                onClick={openFolderModal}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl font-medium text-xs transition-colors"
              >
                Nueva Carpeta
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadModalTab("dropzone");
                  openUploadModal();
                }}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl font-medium text-xs shadow-2xs transition-colors"
              >
                Subir Archivo
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ─── Folders Section ────────────────────────────────────────── */}
            {displayedFolders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">
                  <span>Carpetas ({displayedFolders.length})</span>
                </div>
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  <AnimatePresence mode="popLayout">
                    {displayedFolders.map(folder => {
                      const folderFilesCount = files.filter(f => f.folder_id === folder.id).length;
                      const folderSubject = subjects.find(s => s.id === folder.subject_id);

                      return (
                        <motion.div
                          layout
                          key={folder.id}
                          initial={{ opacity: 0, scale: 0.88, y: 12, filter: "blur(4px)" }}
                          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                          exit={{
                            opacity: 0,
                            scale: 0.84,
                            y: -10,
                            filter: "blur(5px)",
                            transition: { duration: 0.2, ease: [0.32, 0, 0.67, 0] },
                          }}
                          transition={{
                            layout: { type: "spring", stiffness: 360, damping: 28, mass: 0.72 },
                            duration: 0.24,
                          }}
                          onClick={() => navigateToFolder(folder.id)}
                          className={cn(
                            "bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 p-4 rounded-2xl cursor-pointer hover:shadow-xs transition-colors group relative select-none",
                            dragOverFolderId === folder.id && "ring-2 ring-zinc-900 dark:ring-white bg-zinc-50 dark:bg-zinc-800/40",
                            selectedIds.has(folder.id) && "ring-1 ring-zinc-900 dark:ring-white bg-zinc-50/70 dark:bg-zinc-800/30"
                          )}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverFolderId(folder.id);
                        }}
                        onDragLeave={() => setDragOverFolderId(null)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverFolderId(null);
                          setIsDraggingExternal(false);

                          const fileId = e.dataTransfer.getData("fileId");
                          const folderId = e.dataTransfer.getData("folderId");

                          if (fileId) {
                            const { error } = await supabase
                              .from("library_files")
                              .update({ folder_id: folder.id })
                              .eq("id", fileId);
                            if (!error) {
                              toast.success("Archivo movido a " + folder.nombre);
                              fetchFiles();
                            } else {
                              toast.error("Error al mover archivo");
                            }
                          } else if (folderId && folderId !== folder.id) {
                            const { error } = await supabase
                              .from("library_folders")
                              .update({ parent_folder_id: folder.id })
                              .eq("id", folderId);
                            if (!error) {
                              toast.success("Carpeta movida");
                              fetchFolders();
                            } else {
                              toast.error("Error al mover carpeta");
                            }
                          } else if (e.dataTransfer.types.includes("Files")) {
                            const droppedFiles = e.dataTransfer.files;
                            if (!droppedFiles.length || !user) return;
                            setUploading(true);
                            const toastId = toast.loading(`Subiendo a ${folder.nombre}...`);
                            let uploaded = 0;

                            for (let i = 0; i < droppedFiles.length; i++) {
                              const file = droppedFiles[i];
                              if (file.name.startsWith(".")) continue;
                              let tipo: "pdf" | "imagen" | "video" | "otro" = "otro";
                              if (file.type === "application/pdf") tipo = "pdf";
                              else if (file.type.startsWith("image/")) tipo = "imagen";
                              else if (file.type.startsWith("video/")) tipo = "video";
                              const fileExt = file.name.split(".").pop();
                              const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                              const filePath = `${user.id}/${fileName}`;
                              const { error: uploadError } = await supabase.storage.from("library-files").upload(filePath, file, { cacheControl: '31536000', upsert: false });
                              if (uploadError) { console.error(uploadError); continue; }
                              const signedUrl = await getSignedUrl(filePath);
                              if (!signedUrl) continue;
                              await supabase.from("library_files").insert({
                                user_id: user.id, subject_id: folder.subject_id || selectedSubjectId || null,
                                folder_id: folder.id, nombre: file.name, tipo,
                                url: signedUrl, storage_path: filePath, tamaño_bytes: file.size,
                              });
                              uploaded++;
                            }
                            toast.success(`¡${uploaded} archivo(s) subido(s) a ${folder.nombre}!`, { id: toastId });
                            setUploading(false);
                            fetchFiles();
                          }
                        }}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("folderId", folder.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                      >
                        {/* Selection Checkbox */}
                        <div
                          className={cn(
                            "absolute top-3 left-3 z-10 transition-opacity",
                            selectedIds.has(folder.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                          onClick={(e) => { e.stopPropagation(); toggleSelect(folder.id); }}
                        >
                          {selectedIds.has(folder.id) ? (
                            <CheckSquare className="w-4 h-4 text-zinc-900 dark:text-white" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" />
                          )}
                        </div>

                        {/* Top Context Actions (DropdownMenu) */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded-lg bg-zinc-100/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 p-1 bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToFolder(folder.id);
                                }}
                                className="text-xs flex items-center gap-2 cursor-pointer"
                              >
                                <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Abrir</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditFolder(folder);
                                }}
                                className="text-xs flex items-center gap-2 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Editar</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPublishingResource({ id: folder.id, type: "folder", nombre: folder.nombre });
                                  setShowPublishModal(true);
                                }}
                                className="text-xs flex items-center gap-2 cursor-pointer"
                              >
                                <ShoppingBag className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Publicar en Comunidad</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-zinc-800" />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({
                                    type: "folder",
                                    id: folder.id,
                                    folderId: folder.id,
                                    nombre: folder.nombre,
                                  });
                                }}
                                className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Folder Body */}
                        <div className="flex items-center gap-3.5 pt-3">
                          <div className="shrink-0 w-12" onClick={(e) => e.stopPropagation()}>
                            <FolderFloat
                              items={(() => {
                                const childFolders = folders.filter(f => f.parent_folder_id === folder.id).map(f => ({ label: f.nombre, value: `folder:${f.id}` }));
                                const childFiles = files.filter(f => f.folder_id === folder.id).map(f => ({ label: f.nombre, value: `file:${f.id}` }));
                                return [...childFolders, ...childFiles].slice(0, 4).map((item) => ({
                                  label: item.label.length > 18 ? item.label.slice(0, 17) + "…" : item.label,
                                  value: item.value,
                                }));
                              })()}
                              label=""
                              sublabel=" "
                              align="left"
                              layoutMode="horizontal"
                              closeOnSelect={false}
                              folderColor={folder.color || "#3b82f6"}
                              frontColor={folder.color || "#3b82f6"}
                              itemTextColor="#000"
                              width={48}
                              height={34}
                              radius={6}
                              spread={110}
                              lift={18}
                              tilt={4}
                              drift={0.15}
                              onSelect={(val) => {
                                if (typeof val === 'string' && val.startsWith('folder:')) {
                                  navigateToFolder(val.replace('folder:', ''));
                                } else if (typeof val === 'string' && val.startsWith('file:')) {
                                  const targetFile = files.find(f => f.id === val.replace('file:', ''));
                                  if (targetFile) openPreview(targetFile);
                                } else {
                                  navigateToFolder(folder.id);
                                }
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0 pr-6">
                            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {folder.nombre}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              <span>{folderFilesCount} {folderFilesCount === 1 ? 'archivo' : 'archivos'}</span>
                              {folderSubject && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[100px]">{folderSubject.codigo}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
                </motion.div>
              </div>
            )}

            {/* ─── Files Section (Grid or List View) ────────────────────── */}
            {displayedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 px-1">
                  <span>Archivos ({displayedFiles.length})</span>
                </div>

                {viewMode === "grid" ? (
                  /* ─── GRID VIEW ─────────────────────────────────────────── */
                  <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 tour-library-grid">
                    <AnimatePresence mode="popLayout">
                      {displayedFiles.map(file => {
                        const Icon = fileTypeIcons[file.tipo] || FileText;
                        const colors = fileTypeColors[file.tipo] || fileTypeColors.otro;
                        const canPreview = file.tipo === "pdf" || file.tipo === "imagen";

                        return (
                          <motion.div
                            layout
                            key={file.id}
                            initial={{ opacity: 0, scale: 0.88, y: 12, filter: "blur(4px)" }}
                            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                            exit={{
                              opacity: 0,
                              scale: 0.84,
                              y: -10,
                              filter: "blur(5px)",
                              transition: { duration: 0.2, ease: [0.32, 0, 0.67, 0] },
                            }}
                            transition={{
                              layout: { type: "spring", stiffness: 360, damping: 28, mass: 0.72 },
                              duration: 0.24,
                            }}
                            className={cn(
                              "bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 p-4 rounded-2xl group relative cursor-grab active:cursor-grabbing hover:shadow-xs transition-colors flex flex-col justify-between",
                              selectedIds.has(file.id) && "ring-1 ring-zinc-900 dark:ring-white bg-zinc-50/70 dark:bg-zinc-800/30"
                            )}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("fileId", file.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                        >
                          {/* Selection Checkbox */}
                          <div
                            className={cn(
                              "absolute top-3 left-3 z-10 transition-opacity",
                              selectedIds.has(file.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}
                            onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                          >
                            {selectedIds.has(file.id) ? (
                              <CheckSquare className="w-4 h-4 text-zinc-900 dark:text-white" />
                            ) : (
                              <Square className="w-4 h-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" />
                            )}
                          </div>

                          {/* Quick Actions (Floating Right) */}
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                            {canPreview && (
                              <button
                                type="button"
                                onClick={() => openFullScreenViewer(file)}
                                className="p-1 rounded-lg bg-zinc-100/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
                                title="Vista previa / Pantalla completa"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Dropdown Options */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 rounded-lg bg-zinc-100/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 p-1 bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl">
                                {canPreview && (
                                  <DropdownMenuItem
                                    onClick={() => openFullScreenViewer(file)}
                                    className="text-xs flex items-center gap-2 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>Ver a pantalla completa</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={async () => {
                                    if (file.storage_path) {
                                      const url = await getSignedUrl(file.storage_path);
                                      if (url) window.open(url, '_blank');
                                      else toast.error("Error al obtener el link");
                                    } else {
                                      window.open(file.url, '_blank');
                                    }
                                  }}
                                  className="text-xs flex items-center gap-2 cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Abrir en nueva pestaña</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    let copyUrl = file.url;
                                    if (file.storage_path) {
                                      const signed = await getSignedUrl(file.storage_path);
                                      if (signed) copyUrl = signed;
                                    }
                                    navigator.clipboard.writeText(copyUrl);
                                    toast.success("Enlace copiado al portapapeles");
                                  }}
                                  className="text-xs flex items-center gap-2 cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Copiar enlace</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = file.url;
                                    a.download = file.nombre;
                                    a.target = '_blank';
                                    a.rel = 'noopener noreferrer';
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                  }}
                                  className="text-xs flex items-center gap-2 cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Descargar</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-zinc-800" />
                                <DropdownMenuLabel className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider px-2 py-0.5">
                                  Herramientas IA
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handleGenerateContent(file, 'summary')}
                                  className="text-xs flex items-center gap-2 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Resumir con IA</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPreviewFile(file);
                                    setShowGenOptions('flashcards');
                                    setShowPreviewModal(true);
                                  }}
                                  className="text-xs flex items-center gap-2 cursor-pointer"
                                >
                                  <Layers className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Generar Flashcards</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPreviewFile(file);
                                    setShowGenOptions('quiz');
                                    setShowPreviewModal(true);
                                  }}
                                  className="text-xs flex items-center gap-2 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Generar Cuestionario</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (file.tipo === 'pdf') extractAndSpeakPDF(file.url);
                                    else speak(file.nombre);
                                  }}
                                  className="text-xs flex items-center gap-2 cursor-pointer"
                                >
                                  <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Leer en voz alta</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-zinc-800" />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setPublishingResource({ id: file.id, type: "file", nombre: file.nombre });
                                    setShowPublishModal(true);
                                  }}
                                  className="text-xs flex items-center gap-2 cursor-pointer"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Publicar en Comunidad</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget({
                                      type: "file",
                                      id: file.id,
                                      file,
                                      nombre: file.nombre,
                                    });
                                  }}
                                  className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Eliminar archivo</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Image Thumbnail */}
                          {file.tipo === "imagen" && (
                            <div
                              className="w-full h-32 rounded-xl mb-3 bg-cover bg-center cursor-pointer hover:opacity-90 transition-opacity border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden"
                              style={{ backgroundImage: `url(${file.url})` }}
                              onClick={() => openFullScreenViewer(file)}
                            />
                          )}

                          {/* Non-Image File Header */}
                          {file.tipo !== "imagen" && (
                            <div className="flex items-start gap-3 mb-3 pt-2">
                              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", colors)}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0 pr-6">
                                <h3
                                  onClick={() => canPreview ? openFullScreenViewer(file) : window.open(file.url, '_blank')}
                                  className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate cursor-pointer hover:underline"
                                  title={file.nombre}
                                >
                                  {file.nombre}
                                </h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                  {file.subject?.nombre || "Sin materia"}
                                </p>
                              </div>
                            </div>
                          )}

                          {file.tipo === "imagen" && (
                            <h3
                              onClick={() => openFullScreenViewer(file)}
                              className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate mb-2 cursor-pointer hover:underline"
                              title={file.nombre}
                            >
                              {file.nombre}
                            </h3>
                          )}

                          {/* File Footer Stats */}
                          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                            <span className="truncate max-w-[120px]">{file.subject?.codigo || file.subject?.nombre || "General"}</span>
                            <span className="whitespace-nowrap text-[11px] font-mono">{formatFileSize(file.tamaño_bytes)}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  /* ─── LIST VIEW (Notion Database Table Style) ─────────────── */
                  <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50 select-none">
                            <th className="py-2.5 px-4 w-10">
                              <span className="sr-only">Seleccionar</span>
                            </th>
                            <th className="py-2.5 px-4 font-medium">Nombre</th>
                            <th className="py-2.5 px-4 font-medium hidden md:table-cell">Materia</th>
                            <th className="py-2.5 px-4 font-medium hidden sm:table-cell">Tipo</th>
                            <th className="py-2.5 px-4 font-medium">Tamaño</th>
                            <th className="py-2.5 px-4 text-right font-medium">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                          {displayedFiles.map(file => {
                            const Icon = fileTypeIcons[file.tipo] || FileText;
                            const colors = fileTypeColors[file.tipo] || fileTypeColors.otro;
                            const canPreview = file.tipo === "pdf" || file.tipo === "imagen";

                            return (
                              <tr
                                key={file.id}
                                className={cn(
                                  "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer",
                                  selectedIds.has(file.id) && "bg-zinc-50/60 dark:bg-zinc-800/20"
                                )}
                                onClick={() => canPreview ? openFullScreenViewer(file) : window.open(file.url, '_blank')}
                              >
                                <td className="py-3 px-4" onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}>
                                  {selectedIds.has(file.id) ? (
                                    <CheckSquare className="w-4 h-4 text-zinc-900 dark:text-white" />
                                  ) : (
                                    <Square className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", colors)}>
                                      <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-xs sm:max-w-md">
                                      {file.nombre}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 hidden md:table-cell text-zinc-600 dark:text-zinc-400">
                                  {file.subject ? (
                                    <Badge variant="outline" className="text-[11px] font-normal border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60">
                                      {file.subject.nombre}
                                    </Badge>
                                  ) : (
                                    <span className="text-zinc-400 text-xs">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 hidden sm:table-cell text-zinc-500 uppercase text-[10px] tracking-wider font-mono">
                                  {file.tipo}
                                </td>
                                <td className="py-3 px-4 text-zinc-500 text-xs font-mono">
                                  {formatFileSize(file.tamaño_bytes)}
                                </td>
                                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1">
                                    {canPreview && (
                                      <button
                                        type="button"
                                        onClick={() => openFullScreenViewer(file)}
                                        className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                        title="Vista previa"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleGenerateContent(file, 'summary')}
                                      className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                      title="Resumir con IA"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          type="button"
                                          className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48 p-1 bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl">
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            if (file.storage_path) {
                                              const url = await getSignedUrl(file.storage_path);
                                              if (url) window.open(url, '_blank');
                                              else toast.error("Error al obtener el link");
                                            } else {
                                              window.open(file.url, '_blank');
                                            }
                                          }}
                                          className="text-xs flex items-center gap-2 cursor-pointer"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                                          <span>Abrir en nueva pestaña</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            let copyUrl = file.url;
                                            if (file.storage_path) {
                                              const signed = await getSignedUrl(file.storage_path);
                                              if (signed) copyUrl = signed;
                                            }
                                            navigator.clipboard.writeText(copyUrl);
                                            toast.success("Enlace copiado al portapapeles");
                                          }}
                                          className="text-xs flex items-center gap-2 cursor-pointer"
                                        >
                                          <Copy className="w-3.5 h-3.5 text-zinc-500" />
                                          <span>Copiar enlace</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            const a = document.createElement('a');
                                            a.href = file.url;
                                            a.download = file.nombre;
                                            a.target = '_blank';
                                            a.rel = 'noopener noreferrer';
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                          }}
                                          className="text-xs flex items-center gap-2 cursor-pointer"
                                        >
                                          <Download className="w-3.5 h-3.5 text-zinc-500" />
                                          <span>Descargar</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-zinc-800" />
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setPublishingResource({ id: file.id, type: "file", nombre: file.nombre });
                                            setShowPublishModal(true);
                                          }}
                                          className="text-xs flex items-center gap-2 cursor-pointer"
                                        >
                                          <ShoppingBag className="w-3.5 h-3.5 text-zinc-500" />
                                          <span>Publicar en Comunidad</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setDeleteTarget({
                                              type: "file",
                                              id: file.id,
                                              file,
                                              nombre: file.nombre,
                                            });
                                          }}
                                          className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          <span>Eliminar</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Bulk Actions Floating Bar (Linear / Notion Style) ─────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 backdrop-blur-xl border border-zinc-800 dark:border-zinc-200 shadow-2xl rounded-full py-2 px-4 flex items-center gap-3.5">
            <div className="flex items-center gap-2 pr-3 border-r border-zinc-700/80 dark:border-zinc-300/80">
              <span className="w-5 h-5 rounded-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white flex items-center justify-center text-[11px] font-bold">
                {selectedIds.size}
              </span>
              <span className="text-xs font-medium">Seleccionados</span>
            </div>

            <div className="flex items-center gap-2">
              <HoldButton
                size="sm"
                holdTime={1400}
                backgroundColor="#ef4444"
                fillColor="#b91c1c"
                textColor="#ffffff"
                fillTextColor="#ffffff"
                icon={<Trash2 className="w-3.5 h-3.5 shrink-0" />}
                doneIcon={<Check className="w-3.5 h-3.5 shrink-0" />}
                doneLabel="Eliminados"
                onHold={deleteSelected}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shadow-xs"
              >
                Mantener para eliminar ({selectedIds.size})
              </HoldButton>
              <button
                type="button"
                onClick={clearSelection}
                className="px-2.5 py-1.5 rounded-full text-xs text-zinc-300 dark:text-zinc-600 hover:text-white dark:hover:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-1"
                title="Deseleccionar todo (Esc)"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Subir Archivos / Carpeta (Notion / ChatGPT Style) ────────── */}
      <Dialog open={showUploadModal} onOpenChange={(open) => {
        setShowUploadModal(open);
        if (open) setUploadYear(selectedYear);
      }}>
        <DialogContent className="sm:max-w-xl bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Upload className="w-5 h-5 text-zinc-500" />
              Subir Recursos
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Arrastra o selecciona tus apuntes, guías y documentos para agregarlos a la biblioteca
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Ubicación de Destino Notion-style */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5 min-w-0">
                <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">Guardando en: <strong className="text-zinc-800 dark:text-zinc-200">{currentFolderName ? currentFolderName : "Raíz de la biblioteca"}</strong></span>
              </div>
              {currentFolderName && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium shrink-0">
                  Subcarpeta activa
                </span>
              )}
            </div>

            {/* Year & Subject Filters for Upload */}
            <div className="grid grid-cols-2 gap-3 bg-zinc-50/70 dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
              <div>
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">AÑO</label>
                <Select
                  value={uploadYear ? uploadYear.toString() : "all"}
                  onValueChange={(val) => {
                    const year = val === "all" ? null : parseInt(val);
                    setUploadYear(year);
                    setUploadSubject("");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800">
                    <SelectItem value="all" className="text-xs">Todos</SelectItem>
                    {selectableYears.map(y => (
                      <SelectItem key={y} value={y.toString()} className="text-xs">{y}° Año</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">MATERIA</label>
                <Select
                  value={uploadSubject || "none"}
                  onValueChange={(val) => setUploadSubject(val === "none" ? "" : val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800">
                    <SelectItem value="none" className="text-xs">Sin asignar</SelectItem>
                    {subjects
                      .filter(s => !uploadYear || s.año === uploadYear)
                      .map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.nombre}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mode Tabs: Native Dropzone vs Minijuego Aro */}
            <Tabs value={uploadModalTab} onValueChange={(val) => setUploadModalTab(val as any)} className="w-full">
              <TabsList className="grid grid-cols-3 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl h-auto">
                <TabsTrigger value="dropzone" className="text-xs py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700">
                  Subir Archivo
                </TabsTrigger>
                <TabsTrigger value="folder" className="text-xs py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700">
                  Subir Carpeta
                </TabsTrigger>
                <TabsTrigger value="minigame" className="text-xs py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700">
                  Modo Aro 🏀
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dropzone" className="mt-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDropzoneHover(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDropzoneHover(false);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDropzoneHover(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      await uploadFilesList(Array.from(e.dataTransfer.files));
                    }
                  }}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group select-none",
                    isDropzoneHover
                      ? "border-zinc-900 dark:border-white bg-zinc-100/80 dark:bg-zinc-800/60 scale-[1.01]"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-900/30"
                  )}
                >
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Haz clic para explorar o arrastra archivos aquí
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      PDF, imágenes, Word, PowerPoint o ZIP (hasta 20MB por archivo)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center pt-1">
                    {["PDF", "DOCX", "PPTX", "XLSX", "JPG / PNG", "ZIP"].map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-1 px-4 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-medium shadow-2xs hover:opacity-90 transition-opacity"
                  >
                    Examinar archivos
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="folder" className="mt-3">
                <div
                  onClick={() => folderInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-2xl p-8 text-center cursor-pointer transition-all bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col items-center justify-center gap-3 group select-none"
                >
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                    <FolderUp className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Selecciona una carpeta completa de tu computadora
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Se preservará la jerarquía completa de subcarpetas y archivos
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      folderInputRef.current?.click();
                    }}
                    className="mt-1 px-4 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-medium shadow-2xs hover:opacity-90 transition-opacity"
                  >
                    Examinar carpeta local
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="minigame" className="mt-3">
                <BasketballFileUploader
                  disabled={uploading || isGuest}
                  initialMode={uploadBasketballMode}
                  onFile={(file) => uploadFilesList([file])}
                  onFiles={(files) => uploadFilesList(files)}
                  onFolderFiles={(files) => uploadFolderFilesList(files)}
                />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Nueva Carpeta (Notion Style) ───────────────────────────── */}
      <Dialog open={showFolderModal} onOpenChange={(open) => {
        setShowFolderModal(open);
        if (open) setNewFolderYear(selectedYear);
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-zinc-500" />
              Nueva Carpeta
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Crea una carpeta para ordenar apuntes por tema o materia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Ubicación dentro de la jerarquía Notion-style */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400">
              <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Creando dentro de: <strong className="text-zinc-800 dark:text-zinc-200">{currentFolderName ? currentFolderName : "Raíz de la biblioteca"}</strong></span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Nombre de la carpeta</label>
              <Input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newFolderName.trim()) {
                    e.preventDefault();
                    createFolder();
                  }
                }}
                placeholder="Ej: Trabajos Prácticos, Teóricos..."
                className="h-9 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Año (opcional)</label>
                <Select
                  value={newFolderYear ? newFolderYear.toString() : "all"}
                  onValueChange={(val) => {
                    const year = val === "all" ? null : parseInt(val);
                    setNewFolderYear(year);
                    setNewFolderSubject("");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-lg">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800">
                    <SelectItem value="all" className="text-xs">Todos</SelectItem>
                    {selectableYears.map(y => (
                      <SelectItem key={y} value={y.toString()} className="text-xs">{y}° Año</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Materia (opcional)</label>
                <Select
                  value={newFolderSubject || "none"}
                  onValueChange={(val) => setNewFolderSubject(val === "none" ? "" : val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-lg">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800">
                    <SelectItem value="none" className="text-xs">Sin asignar</SelectItem>
                    {subjects
                      .filter(s => !newFolderYear || s.año === newFolderYear)
                      .map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.nombre}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Color de etiqueta</label>
              <div className="flex gap-2.5">
                {folderColors.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setNewFolderColor(c.value)}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 border-white dark:border-zinc-900 transition-all flex items-center justify-center",
                      newFolderColor === c.value ? "ring-2 ring-zinc-900 dark:ring-white scale-110 shadow-xs" : "hover:scale-105 opacity-80 hover:opacity-100"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {newFolderColor === c.value && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShowFolderModal(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={createFolder}
              disabled={!newFolderName.trim()}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-medium shadow-2xs transition-colors disabled:opacity-50"
            >
              Crear Carpeta
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Editar Carpeta (Notion Style) ──────────────────────────── */}
      <Dialog open={showEditFolderModal} onOpenChange={setShowEditFolderModal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-zinc-500" />
              Editar Carpeta
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Nombre de la carpeta</label>
              <Input
                type="text"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editFolderName.trim()) {
                    e.preventDefault();
                    updateFolder();
                  }
                }}
                placeholder="Nombre de la carpeta"
                className="h-9 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Año (opcional)</label>
                <Select
                  value={editFolderYear ? editFolderYear.toString() : "all"}
                  onValueChange={(val) => {
                    const year = val === "all" ? null : parseInt(val);
                    setEditFolderYear(year);
                    setEditFolderSubject("");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-lg">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800">
                    <SelectItem value="all" className="text-xs">Todos</SelectItem>
                    {selectableYears.map(y => (
                      <SelectItem key={y} value={y.toString()} className="text-xs">{y}° Año</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Materia (opcional)</label>
                <Select
                  value={editFolderSubject || "none"}
                  onValueChange={(val) => setEditFolderSubject(val === "none" ? "" : val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-lg">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800">
                    <SelectItem value="none" className="text-xs">Sin asignar</SelectItem>
                    {subjects
                      .filter(s => !editFolderYear || s.año === editFolderYear)
                      .map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.nombre}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Color de etiqueta</label>
              <div className="flex gap-2.5">
                {folderColors.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setEditFolderColor(c.value)}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 border-white dark:border-zinc-900 transition-all flex items-center justify-center",
                      editFolderColor === c.value ? "ring-2 ring-zinc-900 dark:ring-white scale-110 shadow-xs" : "hover:scale-105 opacity-80 hover:opacity-100"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {editFolderColor === c.value && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShowEditFolderModal(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={updateFolder}
              disabled={!editFolderName.trim()}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-medium shadow-2xs transition-colors disabled:opacity-50"
            >
              Guardar Cambios
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Agregar Link (Notion Style) ────────────────────────────── */}
      <Dialog open={showLinkModal} onOpenChange={(open) => {
        setShowLinkModal(open);
        if (open) setUploadYear(selectedYear);
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-zinc-500" />
              Agregar Enlace Web
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Guarda un enlace a videos de YouTube, Drive, Notion o bibliografía externa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3">
            {/* Ubicación de guardado Notion-style */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400">
              <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Guardando en: <strong className="text-zinc-800 dark:text-zinc-200">{currentFolderName ? currentFolderName : "Raíz de la biblioteca"}</strong></span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Nombre del recurso</label>
              <Input
                type="text"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && linkName.trim() && linkUrl.trim()) {
                    e.preventDefault();
                    addLink();
                  }
                }}
                placeholder="Ej: Video Explicativo - Clase 1"
                className="h-9 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">URL del enlace</label>
              <Input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && linkName.trim() && linkUrl.trim()) {
                    e.preventDefault();
                    addLink();
                  }
                }}
                placeholder="https://..."
                className="h-9 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl"
              />
              {linkUrl.trim() && (
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 px-1 pt-0.5">
                  <span>Plataforma:</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {linkUrl.includes("youtube.com") || linkUrl.includes("youtu.be")
                      ? "🔴 YouTube"
                      : linkUrl.includes("drive.google.com")
                      ? "📁 Google Drive"
                      : linkUrl.includes("notion.site") || linkUrl.includes("notion.so")
                      ? "📝 Notion"
                      : linkUrl.includes("github.com")
                      ? "🐙 GitHub"
                      : linkUrl.includes("wikipedia.org")
                      ? "📖 Wikipedia"
                      : "🌐 Enlace Web"}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Año</label>
                <Select
                  value={uploadYear ? uploadYear.toString() : "all"}
                  onValueChange={(val) => {
                    const year = val === "all" ? null : parseInt(val);
                    setUploadYear(year);
                    setUploadSubject("");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-lg">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800">
                    <SelectItem value="all" className="text-xs">Todos</SelectItem>
                    {selectableYears.map(y => (
                      <SelectItem key={y} value={y.toString()} className="text-xs">{y}° Año</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Materia</label>
                <Select
                  value={uploadSubject || "none"}
                  onValueChange={(val) => setUploadSubject(val === "none" ? "" : val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-lg">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800">
                    <SelectItem value="none" className="text-xs">Sin asignar</SelectItem>
                    {subjects
                      .filter(s => !uploadYear || s.año === uploadYear)
                      .map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.nombre}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShowLinkModal(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={addLink}
              disabled={!linkUrl.trim() || !linkName.trim()}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-medium shadow-2xs transition-colors disabled:opacity-50"
            >
              Agregar Enlace
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Confirmación de Borrado con HoldButton ──────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold tracking-tight text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              {deleteTarget?.type === "folder" ? "Eliminar Carpeta" : "Eliminar Archivo"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              ¿Estás seguro de que deseas eliminar {deleteTarget?.type === "folder" ? "la carpeta" : "el archivo"}{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">"{deleteTarget?.nombre}"</span>?
            </p>

            {deleteTarget?.type === "folder" && (
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 p-3 rounded-xl text-xs text-rose-700 dark:text-rose-300 space-y-1">
                <p className="font-semibold">Advertencia:</p>
                <p className="text-zinc-600 dark:text-zinc-400 font-normal">
                  Se eliminarán permanentemente todas las subcarpetas y archivos contenidos tanto de la biblioteca como del almacenamiento.
                </p>
              </div>
            )}

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center">
              Para confirmar, mantén presionado el botón hasta que se complete la barra.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <HoldButton
              size="md"
              holdTime={1400}
              backgroundColor="#ef4444"
              fillColor="#b91c1c"
              textColor="#ffffff"
              fillTextColor="#ffffff"
              icon={<Trash2 className="w-4 h-4 mr-2" />}
              doneIcon={<Check className="w-4 h-4 mr-2" />}
              doneLabel="¡Eliminado!"
              onHold={async () => {
                if (!deleteTarget) return;
                const target = deleteTarget;
                setDeleteTarget(null);
                if (target.type === "folder" && target.folderId) {
                  await deleteFolder(target.folderId);
                } else if (target.type === "file" && target.file) {
                  await deleteFile(target.file);
                }
              }}
              className="w-full sm:flex-1 rounded-xl text-xs font-medium py-2 justify-center shadow-2xs"
            >
              Mantener para borrar
            </HoldButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Publicar en Comunidad Marketplace ──────────────────────── */}
      <Dialog open={showPublishModal} onOpenChange={(open) => {
        setShowPublishModal(open);
        if (!open) setPubIsAnonymous(false);
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-500" />
              Publicar en la Comunidad
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Comparte este material para ayudar a otros estudiantes de la carrera
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
              <p className="text-[11px] font-medium text-zinc-400">Recurso seleccionado</p>
              <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">{publishingResource?.nombre}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Descripción</label>
              <textarea
                value={pubDescription}
                onChange={(e) => setPubDescription(e.target.value)}
                placeholder="Explica qué contiene este recurso, cátedra o año..."
                className="w-full h-20 p-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Categoría</label>
              <Input
                type="text"
                value={pubCategory}
                onChange={(e) => setPubCategory(e.target.value)}
                placeholder="Ej: Resumen, Parcial resuelto, Guía TP..."
                className="h-9 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPubCategory(cat)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors",
                      pubCategory === cat
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div
              onClick={() => setPubIsAnonymous(!pubIsAnonymous)}
              className={cn(
                "p-3 rounded-xl border cursor-pointer transition-colors flex items-center justify-between select-none",
                pubIsAnonymous
                  ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-100"
                  : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              )}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                <div>
                  <p className="font-medium text-xs text-zinc-900 dark:text-zinc-100">Publicar de forma anónima</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Tu nombre no aparecerá en el recurso</p>
                </div>
              </div>
              <div className={cn(
                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                pubIsAnonymous ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent" : "border-zinc-300 dark:border-zinc-700"
              )}>
                {pubIsAnonymous && <Check className="w-3 h-3" />}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShowPublishModal(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePublish}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-medium shadow-2xs transition-colors"
            >
              Publicar Ahora
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Preview & AI Generation ───────────────────────────────── */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl rounded-2xl">
          <div className="flex flex-col h-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/70 backdrop-blur-md shrink-0">
              <div className="min-w-0 pr-4">
                <h3 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                  {previewFile?.nombre}
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {previewFile?.subject?.nombre || "Sin materia"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={previewFile?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* AI Generation Toolbar */}
            <div className="bg-white dark:bg-[#18181b] border-b border-zinc-200/80 dark:border-zinc-800/80 p-3 space-y-2 shrink-0">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowGenOptions(showGenOptions === 'flashcards' ? null : 'flashcards')}
                  disabled={generating !== null}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50",
                    showGenOptions === 'flashcards'
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span>{generating === 'flashcards' ? "Generando..." : "Flashcards"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowGenOptions(showGenOptions === 'quiz' ? null : 'quiz')}
                  disabled={generating !== null}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50",
                    showGenOptions === 'quiz'
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>{generating === 'quiz' ? "Generando..." : "Cuestionario"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => previewFile && handleGenerateContent(previewFile, 'summary')}
                  disabled={generating !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{generating === 'summary' ? "Resumiendo..." : "Resumir con IA"}</span>
                </button>
              </div>

              {/* Quantity selector */}
              {showGenOptions && (
                <div className="flex items-center gap-2.5 justify-center bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-2 animate-in fade-in duration-150">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                    {showGenOptions === 'flashcards' ? 'Cantidad de tarjetas:' : 'Cantidad de preguntas:'}
                  </span>
                  <div className="flex gap-1">
                    {[5, 10, 15, 20, 30].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setGenCount(n)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
                          genCount === n
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                            : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => previewFile && handleGenerateContent(previewFile, showGenOptions, genCount)}
                    disabled={generating !== null}
                    className="px-3 py-1 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-2xs disabled:opacity-50"
                  >
                    Generar {genCount}
                  </button>
                </div>
              )}
            </div>

            {/* Content Preview Area */}
            <div className="flex-1 overflow-auto p-4 bg-zinc-50/50 dark:bg-zinc-900/30">
              {previewFile?.tipo === "imagen" && (
                <img
                  src={previewFile.url}
                  alt={previewFile.nombre}
                  className="max-w-full h-auto mx-auto rounded-xl shadow-md border border-zinc-200/60 dark:border-zinc-800/60"
                />
              )}
              {previewFile?.tipo === "pdf" && (
                <iframe
                  src={`${previewFile.url}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="w-full rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-md"
                  style={{ minHeight: "calc(85vh - 130px)", height: "100%" }}
                  title={previewFile.nombre}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Full-Screen File Viewer (ChatGPT Canvas / Notion Reader Style) ──── */}
      {fullScreenFile && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-[#121212] flex flex-col animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
            {/* Left: Close and File Info */}
            <div className="flex items-center gap-3 min-w-0 pr-4">
              <button
                type="button"
                onClick={closeFullScreenViewer}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                title="Cerrar visor"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h3 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                  {fullScreenFile.nombre}
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {fullScreenFile.subject?.nombre || "Sin materia"}
                </p>
              </div>
            </div>

            {/* Center: Study Timer Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 rounded-full text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>{formatTime(viewerTimer)}</span>
            </div>

            {/* Right: Zoom & Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 rounded-lg p-0.5 border border-zinc-200/60 dark:border-zinc-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => setViewerZoom(z => Math.max(25, z - 25))}
                  className="px-2 py-0.5 hover:bg-white dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-200 font-bold"
                  title="Reducir zoom (-)"
                >−</button>
                <span className="px-1.5 font-mono text-[11px] min-w-[2.5rem] text-center text-zinc-600 dark:text-zinc-300">{viewerZoom}%</span>
                <button
                  type="button"
                  onClick={() => setViewerZoom(z => Math.min(300, z + 25))}
                  className="px-2 py-0.5 hover:bg-white dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-200 font-bold"
                  title="Ampliar zoom (+)"
                >+</button>
                <button
                  type="button"
                  onClick={() => setViewerZoom(100)}
                  className="px-1.5 py-0.5 hover:bg-white dark:hover:bg-zinc-700 rounded text-[10px] text-zinc-500"
                  title="Restablecer (100%)"
                >100%</button>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(fullScreenFile.url);
                  toast.success("Enlace copiado al portapapeles");
                }}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                title="Copiar enlace directo"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={fullScreenFile.url}
                download={fullScreenFile.nombre}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                title="Descargar archivo"
              >
                <Download className="w-4 h-4" />
              </a>
              <a
                href={fullScreenFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                title="Abrir en pestaña externa"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* AI Tools Bar */}
          <div className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 py-2 flex items-center justify-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setShowGenOptions(showGenOptions === 'flashcards' ? null : 'flashcards')}
              disabled={generating !== null}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50",
                showGenOptions === 'flashcards'
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              )}
            >
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>{generating === 'flashcards' ? "Generando..." : "Flashcards"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGenOptions(showGenOptions === 'quiz' ? null : 'quiz')}
              disabled={generating !== null}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50",
                showGenOptions === 'quiz'
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              <span>{generating === 'quiz' ? "Generando..." : "Cuestionario"}</span>
            </button>

            <button
              type="button"
              onClick={() => fullScreenFile && handleGenerateContent(fullScreenFile, 'summary')}
              disabled={generating !== null}
              className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              <span>{generating === 'summary' ? "Resumiendo..." : "Resumir"}</span>
            </button>

            <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-1" />

            <button
              type="button"
              onClick={() => {
                if (isSpeaking) {
                  stop();
                } else if (fullScreenFile) {
                  if (fullScreenFile.tipo === 'pdf') {
                    extractAndSpeakPDF(fullScreenFile.url);
                  } else {
                    speak(fullScreenFile.nombre);
                  }
                }
              }}
              disabled={isExtractingText}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all",
                isSpeaking
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                  : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              )}
            >
              {isExtractingText ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isSpeaking ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>{isSpeaking ? "Detener voz" : "Leer en voz alta"}</span>
            </button>

            {/* Gen count selector in viewer */}
            {showGenOptions && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 rounded-lg px-2.5 py-1 border border-zinc-200 dark:border-zinc-700">
                <span className="text-[11px] text-zinc-500">
                  {showGenOptions === 'flashcards' ? 'Tarjetas:' : 'Preguntas:'}
                </span>
                {[5, 10, 15, 20].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setGenCount(n)}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-medium",
                      genCount === n ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    )}
                  >{n}</button>
                ))}
                <button
                  type="button"
                  onClick={() => fullScreenFile && handleGenerateContent(fullScreenFile, showGenOptions, genCount)}
                  disabled={generating !== null}
                  className="px-2 py-0.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded text-[11px] font-medium"
                >Generar</button>
              </div>
            )}
          </div>

          {/* File Content Display */}
          <div className="flex-1 overflow-auto bg-zinc-100/50 dark:bg-black/40">
            <div
              className="w-full h-full flex items-start justify-center p-2"
              style={{ transform: `scale(${viewerZoom / 100})`, transformOrigin: 'top center' }}
            >
              {fullScreenFile.tipo === "imagen" && (
                <img
                  src={fullScreenFile.url}
                  alt={fullScreenFile.nombre}
                  className="max-w-full h-auto shadow-2xl rounded-xl border border-zinc-200/80 dark:border-zinc-800/80"
                />
              )}
              {fullScreenFile.tipo === "pdf" && (
                <iframe
                  src={`${fullScreenFile.url}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="w-full border-0 shadow-2xl rounded-xl"
                  style={{ minHeight: "calc(100vh - 120px)", height: "100%" }}
                  title={fullScreenFile.nombre}
                />
              )}
              {fullScreenFile.tipo === "link" && (
                <div className="text-center py-20 bg-white dark:bg-[#18181b] m-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-md max-w-md mx-auto">
                  <LinkIcon className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                  <p className="text-sm font-semibold mb-3 text-zinc-900 dark:text-zinc-100">{fullScreenFile.nombre}</p>
                  <a
                    href={fullScreenFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-medium hover:opacity-90 inline-block shadow-2xs"
                  >
                    Abrir Enlace Web ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Status Bar */}
          <div className="bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 px-4 py-1.5 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0">
            <span className="truncate max-w-xs sm:max-w-md">
              {fullScreenFile.subject?.nombre
                ? `📚 ${fullScreenFile.subject.nombre} (${fullScreenFile.subject.año}° año)`
                : "Sin materia asignada"
              }
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <span>
                {fullScreenFile.tamaño_bytes ? formatFileSize(fullScreenFile.tamaño_bytes) : ""} · Zoom: {viewerZoom}%
              </span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 rounded">
                Esc para salir
              </kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



