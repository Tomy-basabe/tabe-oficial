import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import FolderFloat from "@/components/ui/FolderFloat";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, Image, Link as LinkIcon, Upload, Plus,
  Trash2, ExternalLink, FolderOpen, Folder, FolderPlus, FolderUp,
  ChevronRight, ArrowLeft, X, Eye, Filter, GraduationCap, ShoppingBag, Edit2,
  CheckCircle2, Square, CheckSquare, Repeat2, Clock, Volume2, Loader2,
  ShieldCheck, Check
} from "lucide-react";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { cn, toLocalDateStr } from "@/lib/utils";
import { toast } from "sonner";
import { useMarketplace } from "@/hooks/useMarketplace";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  pdf: "text-destructive bg-destructive/20",
  imagen: "text-neon-green bg-neon-green/20",
  link: "text-neon-cyan bg-neon-cyan/20",
  video: "text-neon-purple bg-neon-purple/20",
  otro: "text-muted-foreground bg-secondary",
};

const folderColors = [
  { name: "Cyan", value: "#00d9ff" },
  { name: "Purple", value: "#a855f7" },
  { name: "Green", value: "#22c55e" },
  { name: "Gold", value: "#fbbf24" },
  { name: "Red", value: "#ef4444" },
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
            emoji: "📝",
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

  // Stats
  const totalFilesInFilter = selectedSubjectId
    ? files.filter(f => f.subject_id === selectedSubjectId).length
    : selectedYear
      ? files.filter(f => Number(f.subject?.año) === Number(selectedYear) || (f.subject_id && subjects.some(s => s.id === f.subject_id && Number(s.año) === Number(selectedYear)))).length
      : files.length;

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
    <div className="tabe-page p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-card border-[3px] border-foreground p-5 rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))]">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-widest text-foreground">
            Biblioteca
          </h1>
          <p className="text-muted-foreground font-bold uppercase tracking-wider text-xs mt-1">
            Organiza tus recursos de estudio por año y materia
          </p>
        </div>
        <div className="flex gap-3 flex-wrap items-center mt-2 lg:mt-0 tour-library-upload">
          {(folders.length > 0 || files.length > 0) && (
            <button
              onClick={deleteAllLibrary}
              title="Borrar toda la biblioteca de la base de datos"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#ef4444] text-white border-[3px] border-foreground rounded-xl font-black uppercase tracking-widest text-xs shadow-[3px_3px_0_0_#000] hover:translate-y-0.5 hover:shadow-none transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>BORRAR TODO</span>
            </button>
          )}
          <div className="flex gap-1.5 bg-background border-[3px] border-foreground p-1.5 rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))]">
            <button
              onClick={openFolderModal}
              title="Nueva Carpeta"
              className="flex items-center gap-2 px-3 py-1.5 font-bold uppercase tracking-widest text-foreground hover:bg-foreground/10 rounded-lg transition-all text-xs"
            >
              <FolderPlus className="w-4 h-4" />
              <span className="hidden lg:inline">Nueva Carpeta</span>
            </button>
            <div className="w-[3px] bg-foreground/20 rounded-full" />
            <button
              onClick={openLinkModal}
              title="Agregar Link"
              className="flex items-center gap-2 px-3 py-1.5 font-bold uppercase tracking-widest text-foreground hover:bg-foreground/10 rounded-lg transition-all text-xs"
            >
              <LinkIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Agregar Link</span>
            </button>
          </div>
          <button
            onClick={() => {
              if (isGuest) {
                toast.error("El modo demo es de solo lectura. Inicia sesión o regístrate para subir carpetas.");
                return;
              }
              setUploadBasketballMode("folder");
              openUploadModal();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00d9ff] text-foreground border-[3px] border-foreground rounded-xl font-black uppercase tracking-widest shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] active:translate-y-0 active:shadow-none transition-all"
            title="Subir una carpeta completa de tu computadora"
          >
            <FolderUp className="w-5 h-5" />
            <span>Subir Carpeta</span>
          </button>
          <button
            onClick={() => {
              if (isGuest) {
                toast.error("El modo demo es de solo lectura. Inicia sesión o regístrate para subir archivos.");
                return;
              }
              setUploadBasketballMode("file");
              openUploadModal();
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#805ad5] text-white border-[3px] border-foreground rounded-xl font-black uppercase tracking-widest shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] active:translate-y-0 active:shadow-none transition-all"
          >
            <Upload className="w-5 h-5" />
            <span>Subir Archivo</span>
          </button>
        </div>
        {/* Hidden folder input */}
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          onChange={handleFolderUpload}
          {...({ webkitdirectory: "", directory: "" } as any)}
          multiple
        />
      </div>

      {/* Year and Subject Filters */}
      <div className="bg-card border-[3px] border-foreground rounded-xl p-5 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Filtrar por</span>
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Year Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">AÑO</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedYear(null)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-[3px] border-foreground",
                  selectedYear === null
                    ? "bg-[#1475e5] text-white shadow-[4px_4px_0_0_#000] -translate-y-1"
                    : "bg-background text-foreground hover:bg-muted shadow-[2px_2px_0_0_#000]"
                )}
              >
                TODOS
              </button>
              {activeYears.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-[3px] border-foreground",
                    selectedYear === year
                      ? "bg-[#ffd21c] text-black shadow-[4px_4px_0_0_#000] -translate-y-1"
                      : "bg-background text-foreground hover:bg-muted shadow-[2px_2px_0_0_#000]"
                  )}
                >
                  {year}° AÑO
                </button>
              ))}
            </div>
          </div>

          {/* Subject Filter - Only shown when year is selected */}
          {selectedYear && (
            <div className="flex-1 min-w-[250px]">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">MATERIA</label>
              <Select
                value={selectedSubjectId || "all"}
                onValueChange={(val) => setSelectedSubjectId(val === "all" ? null : val)}
              >
                <SelectTrigger className="bg-background border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest h-auto py-2 px-4 focus:shadow-none focus:translate-y-1 transition-all">
                  <SelectValue placeholder="TODAS LAS MATERIAS" />
                </SelectTrigger>
                <SelectContent className="bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest">
                  <SelectItem value="all" className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">TODAS LAS MATERIAS</SelectItem>
                  {filteredSubjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id} className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">
                      {subject.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Current filter info */}
        {(selectedYear || selectedSubjectId) && (
          <div className="mt-6 pt-4 border-t-[3px] border-foreground/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <GraduationCap className="w-4 h-4 text-foreground" />
              <span className="text-muted-foreground">
                {selectedSubject
                  ? `${selectedSubject.nombre} (${selectedSubject.año}° AÑO)`
                  : selectedYear
                    ? `TODAS LAS MATERIAS DE ${selectedYear}° AÑO`
                    : "TODOS LOS ARCHIVOS"
                }
              </span>
              <span className="px-2 py-0.5 bg-[#1475e5] text-white rounded-md shadow-[2px_2px_0_0_#000] border-2 border-foreground">
                {totalFilesInFilter} ARCHIVOS
              </span>
            </div>
            <button
              onClick={() => { setSelectedYear(null); setSelectedSubjectId(null); }}
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-[#ef4444] hover:underline"
            >
              LIMPIAR FILTROS
            </button>
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-background border-[3px] border-foreground shadow-[4px_4px_0_0_#000] p-3 rounded-xl w-fit">
        <button
          onClick={() => navigateToFolder(null)}
          className={cn(
            "flex items-center gap-1 hover:text-[#1475e5] transition-colors",
            currentFolderId === null ? "text-[#1475e5] font-black" : "text-foreground"
          )}
        >
          <FolderOpen className="w-4 h-4" />
          BIBLIOTECA
        </button>
        {folderPath.map((folder, index) => (
          <div key={folder.id} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-foreground" />
            <button
              onClick={() => navigateToFolder(folder.id)}
              className={cn(
                "hover:text-[#1475e5] transition-colors",
                index === folderPath.length - 1 ? "text-[#1475e5] font-black" : "text-foreground"
              )}
            >
              {folder.nombre}
            </button>
          </div>
        ))}
      </div>

      {/* Back button when in subfolder */}
      {currentFolderId && (
        <button
          onClick={() => {
            const parentId = folderPath.length > 1 ? folderPath[folderPath.length - 2].id : null;
            navigateToFolder(parentId);
          }}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground hover:text-[#1475e5] transition-colors w-fit px-3 py-2 bg-background border-[3px] border-foreground shadow-[2px_2px_0_0_#000] rounded-lg mt-2 hover:translate-y-0.5 hover:shadow-none"
        >
          <ArrowLeft className="w-4 h-4" />
          VOLVER
        </button>
      )}

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-32 bg-card border-[3px] border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.06)] p-4 rounded-xl space-y-3">
              <div className="w-10 h-10 rounded-lg bg-muted/80" />
              <div className="w-3/4 h-5 rounded bg-muted/60" />
              <div className="w-1/2 h-3 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      ) : currentFolders.length === 0 && currentFiles.length === 0 ? (
        <div className="text-center py-16 bg-card border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000]">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-foreground" />
          <p className="text-foreground font-black uppercase tracking-widest text-sm mb-6">
            {selectedYear || selectedSubjectId
              ? "NO HAY ARCHIVOS PARA ESTE FILTRO"
              : currentFolderId
                ? "ESTA CARPETA ESTÁ VACÍA"
                : "NO HAY ARCHIVOS EN TU BIBLIOTECA"
            }
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => openFolderModal()}
              className="px-6 py-3 bg-background border-[3px] border-foreground rounded-xl font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-1 hover:shadow-none transition-all"
            >
              CREAR CARPETA
            </button>
            <button
              onClick={openUploadModal}
              className="px-6 py-3 bg-[#805ad5] text-white border-[3px] border-foreground rounded-xl font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-1 hover:shadow-none transition-all"
            >
              SUBIR PRIMER ARCHIVO
            </button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 tour-library-grid relative rounded-xl transition-all",
            isDraggingExternal && "ring-2 ring-primary ring-dashed bg-primary/5 p-4"
          )}
          onDragOver={(e) => {
            // Accept external file drops on the grid area
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
            // Only handle external files (not internal drags)
            if (!e.dataTransfer.types.includes("Files") || e.dataTransfer.getData("fileId") || e.dataTransfer.getData("folderId")) return;
            e.preventDefault();
            const droppedFiles = e.dataTransfer.files;
            if (!droppedFiles.length || !user) return;

            await uploadFilesList(Array.from(droppedFiles));
          }}
        >
          {/* Folders */}
          {currentFolders.map(folder => {
            const folderFilesCount = files.filter(f => f.folder_id === folder.id).length;
            const folderSubject = subjects.find(s => s.id === folder.subject_id);

            return (
              <div
                key={folder.id}
                onClick={() => navigateToFolder(folder.id)}
                className={cn(
                  "bg-background border-[3px] border-foreground shadow-[4px_4px_0_0_#000] p-4 rounded-xl cursor-pointer hover:-translate-y-1 hover:shadow-none hover:z-30 transition-all group relative",
                  dragOverFolderId === folder.id && "ring-[4px] ring-[#1475e5] bg-[#1475e5]/10 scale-[1.02]"
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
                    // Move file into this folder
                    const { error } = await supabase
                      .from("library_files")
                      .update({ folder_id: folder.id })
                      .eq("id", fileId);
                    if (!error) {
                      toast.success("Archivo movido");
                      fetchFiles();
                    } else {
                      toast.error("Error al mover archivo");
                    }
                  } else if (folderId && folderId !== folder.id) {
                    // Move folder into this folder (avoid self-nesting)
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
                    // External files dropped onto a folder — upload into it
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
                <div
                  className={cn(
                    "absolute top-2 left-2 z-10 transition-opacity",
                    selectedIds.has(folder.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(folder.id); }}
                >
                  {selectedIds.has(folder.id) ? (
                    <CheckSquare className="w-5 h-5 text-neon-cyan fill-neon-cyan/20" />
                  ) : (
                    <Square className="w-5 h-5 text-muted-foreground hover:text-neon-cyan" />
                  )}
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <div className="shrink-0 w-14" onClick={(e) => e.stopPropagation()}>
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
                      folderColor={folder.color}
                      frontColor={folder.color}
                      itemTextColor="#000"
                      width={56}
                      height={40}
                      radius={8}
                      spread={130}
                      lift={22}
                      tilt={5}
                      drift={0.2}
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
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black uppercase tracking-widest text-sm truncate">{folder.nombre}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                      {folderFilesCount} ARCHIVOS
                      {folderSubject && ` • ${folderSubject.codigo}`}
                    </p>
                  </div>
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditFolder(folder);
                    }}
                    className="p-1.5 bg-background border-2 border-foreground shadow-[2px_2px_0_0_#000] rounded-lg hover:translate-y-0.5 hover:shadow-none transition-all"
                    title="Editar carpeta"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPublishingResource({ id: folder.id, type: "folder", nombre: folder.nombre });
                      setShowPublishModal(true);
                    }}
                    className="p-1.5 bg-[#1475e5] text-white border-2 border-foreground shadow-[2px_2px_0_0_#000] rounded-lg hover:translate-y-0.5 hover:shadow-none transition-all"
                    title="Publicar en la Comunidad"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({
                        type: "folder",
                        id: folder.id,
                        folderId: folder.id,
                        nombre: folder.nombre,
                      });
                    }}
                    className="p-1.5 bg-[#ef4444] text-white border-2 border-foreground shadow-[2px_2px_0_0_#000] rounded-lg hover:translate-y-0.5 hover:shadow-none transition-all"
                    title="Eliminar carpeta"
                    aria-label="Eliminar carpeta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Files */}
          {currentFiles.map(file => {
            const Icon = fileTypeIcons[file.tipo];
            const colors = fileTypeColors[file.tipo];
            const canPreview = file.tipo === "pdf" || file.tipo === "imagen";

            return (
              <div
                key={file.id}
                className="bg-background border-[3px] border-foreground shadow-[4px_4px_0_0_#000] p-4 rounded-xl group relative cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:shadow-none transition-all"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("fileId", file.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
              >
                <div
                  className={cn(
                    "absolute top-2 left-2 z-10 transition-opacity",
                    selectedIds.has(file.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                >
                  {selectedIds.has(file.id) ? (
                    <CheckSquare className="w-5 h-5 text-neon-cyan fill-neon-cyan/20" />
                  ) : (
                    <Square className="w-5 h-5 text-muted-foreground hover:text-neon-cyan" />
                  )}
                </div>

                {/* Preview thumbnail for images */}
                {file.tipo === "imagen" && (
                  <div
                    className="w-full h-32 rounded-lg mb-3 bg-cover bg-center cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundImage: `url(${file.url})` }}
                    onClick={() => openFullScreenViewer(file)}
                  />
                )}

                {/* PDF icon or other files */}
                {file.tipo !== "imagen" && (
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border-2 border-foreground shadow-[2px_2px_0_0_#000]", colors)}>
                      <Icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black uppercase tracking-widest text-sm truncate">{file.nombre}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate mt-1">
                        {file.subject?.nombre || "SIN MATERIA"}
                      </p>
                    </div>
                  </div>
                )}

                {file.tipo === "imagen" && (
                  <h3 className="font-black uppercase tracking-widest text-sm truncate mb-2 mt-2">{file.nombre}</h3>
                )}

                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2 pt-2 border-t-2 border-foreground/10">
                  <span className="truncate">{file.subject?.nombre || "SIN MATERIA"}</span>
                  <span className="whitespace-nowrap ml-2">{formatFileSize(file.tamaño_bytes)}</span>
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={() => {
                      setPublishingResource({ id: file.id, type: "file", nombre: file.nombre });
                      setShowPublishModal(true);
                    }}
                    className="p-1.5 bg-[#1475e5] text-white border-2 border-foreground shadow-[2px_2px_0_0_#000] rounded-lg hover:translate-y-0.5 hover:shadow-none transition-all"
                    title="Publicar en la Comunidad"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </button>
                  {canPreview && (
                    <button
                      onClick={() => openFullScreenViewer(file)}
                      className="p-1.5 bg-background border-2 border-foreground shadow-[2px_2px_0_0_#000] rounded-lg hover:translate-y-0.5 hover:shadow-none transition-all"
                      title="Vista previa"
                    >
                      <Eye className="w-3.5 h-3.5 text-foreground" />
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (file.storage_path) {
                        const url = await getSignedUrl(file.storage_path);
                        if (url) window.open(url, '_blank');
                        else toast.error("Error al obtener el link");
                      } else {
                        window.open(file.url, '_blank');
                      }
                    }}
                    className="p-1.5 bg-[#ffd21c] text-black border-2 border-foreground shadow-[2px_2px_0_0_#000] rounded-lg hover:translate-y-0.5 hover:shadow-none transition-all"
                    title="Abrir en nueva pestaña"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({
                        type: "file",
                        id: file.id,
                        file,
                        nombre: file.nombre,
                      });
                    }}
                    className="p-1.5 bg-[#ef4444] text-white border-2 border-foreground shadow-[2px_2px_0_0_#000] rounded-lg hover:translate-y-0.5 hover:shadow-none transition-all"
                    title="Eliminar archivo"
                    aria-label="Eliminar archivo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b-[3px] border-foreground bg-muted/50">
              <h3 className="font-black uppercase tracking-widest text-sm truncate">{previewFile?.nombre}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-[#ffd21c] text-black border-[3px] border-foreground shadow-[2px_2px_0_0_#000] rounded-xl hover:-translate-y-1 hover:shadow-none transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 bg-[#ef4444] text-white border-[3px] border-foreground shadow-[2px_2px_0_0_#000] rounded-xl hover:-translate-y-1 hover:shadow-none transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* AI Actions Toolbar */}
            <div className="bg-background border-b-[3px] border-foreground p-4 flex flex-col gap-4">
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={() => setShowGenOptions(showGenOptions === 'flashcards' ? null : 'flashcards')}
                  disabled={generating !== null}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 hover:-translate-y-1 hover:shadow-none",
                    showGenOptions === 'flashcards' ? "bg-[#00ffcc] text-black" : "bg-background text-foreground"
                  )}
                >
                  {generating === 'flashcards' ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <span className="text-lg">✨</span>
                  )}
                  {generating === 'flashcards' ? "GENERANDO..." : "FLASHCARDS"}
                </button>
                <button
                  onClick={() => setShowGenOptions(showGenOptions === 'quiz' ? null : 'quiz')}
                  disabled={generating !== null}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 hover:-translate-y-1 hover:shadow-none",
                    showGenOptions === 'quiz' ? "bg-[#ffd21c] text-black" : "bg-background text-foreground"
                  )}
                >
                  {generating === 'quiz' ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <span className="text-lg">📋</span>
                  )}
                  {generating === 'quiz' ? "GENERANDO..." : "CUESTIONARIO"}
                </button>
                <button
                  onClick={() => previewFile && handleGenerateContent(previewFile, 'summary')}
                  disabled={generating !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-background text-foreground border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 hover:-translate-y-1 hover:shadow-none"
                >
                  {generating === 'summary' ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <span className="text-lg">📝</span>
                  )}
                  {generating === 'summary' ? "RESUMIENDO..." : "RESUMIR"}
                </button>
              </div>

              {/* Quantity selector for flashcards/quiz */}
              {showGenOptions && (
                <div className="flex items-center gap-4 justify-center bg-muted/30 border-[3px] border-foreground rounded-xl p-3 shadow-[4px_4px_0_0_#000]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {showGenOptions === 'flashcards' ? 'CANTIDAD:' : 'PREGUNTAS:'}
                  </span>
                  <div className="flex gap-2">
                    {[5, 10, 15, 20, 30].map(n => (
                      <button
                        key={n}
                        onClick={() => setGenCount(n)}
                        className={cn(
                          "px-2 py-1 border-2 border-foreground rounded font-black text-xs transition-all",
                          genCount === n
                            ? "bg-foreground text-background shadow-none translate-y-0.5"
                            : "bg-background text-foreground shadow-[2px_2px_0_0_#000] hover:-translate-y-0.5 hover:shadow-none"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => previewFile && handleGenerateContent(previewFile, showGenOptions, genCount)}
                    disabled={generating !== null}
                    className="px-4 py-2 bg-[#805ad5] text-white border-[3px] border-foreground shadow-[2px_2px_0_0_#000] rounded-xl text-[10px] font-black uppercase tracking-widest hover:-translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
                  >
                    GENERAR {genCount}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-4">
              {previewFile?.tipo === "imagen" && (
                <img
                  src={previewFile.url}
                  alt={previewFile.nombre}
                  className="max-w-full h-auto mx-auto rounded-lg"
                />
              )}
              {previewFile?.tipo === "pdf" && (
                <iframe
                  src={`${previewFile.url}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="w-full rounded-lg border-0"
                  style={{ minHeight: "calc(85vh - 100px)", height: "100%" }}
                  title={previewFile.nombre}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Folder Modal */}
      <Dialog open={showFolderModal} onOpenChange={(open) => {
        setShowFolderModal(open);
        if (open) setNewFolderYear(selectedYear);
      }}>
        <DialogContent className="sm:max-w-md bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <FolderPlus className="w-6 h-6" />
              NUEVA CARPETA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">NOMBRE</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="NOMBRE DE LA CARPETA"
                className="w-full mt-2 px-4 py-3 bg-background rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] font-black uppercase tracking-widest text-sm focus:outline-none focus:translate-y-1 focus:shadow-none transition-all placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AÑO</label>
                <Select
                  value={newFolderYear ? newFolderYear.toString() : "all"}
                  onValueChange={(val) => {
                    const year = val === "all" ? null : parseInt(val);
                    setNewFolderYear(year);
                    setNewFolderSubject("");
                  }}
                >
                  <SelectTrigger className="mt-2 bg-background border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest py-3 h-auto focus:shadow-none focus:translate-y-1 transition-all">
                    <SelectValue placeholder="TODOS" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest">
                    <SelectItem value="all" className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">TODOS</SelectItem>
                    {selectableYears.map(y => (
                      <SelectItem key={y} value={y.toString()} className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">{y}° AÑO</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">MATERIA (OPCIONAL)</label>
                <Select
                  value={newFolderSubject || "none"}
                  onValueChange={(val) => setNewFolderSubject(val === "none" ? "" : val)}
                >
                  <SelectTrigger className="mt-2 bg-background border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest py-3 h-auto focus:shadow-none focus:translate-y-1 transition-all">
                    <SelectValue placeholder="SIN MATERIA ASIGNADA" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest">
                    <SelectItem value="none" className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">SIN MATERIA ASIGNADA</SelectItem>
                    {subjects
                      .filter(s => !newFolderYear || s.año === newFolderYear)
                      .map(subject => (
                        <SelectItem key={subject.id} value={subject.id} className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">
                          {subject.nombre} ({subject.año}° AÑO)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">COLOR</label>
              <div className="flex gap-3 mt-2">
                {folderColors.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setNewFolderColor(color.value)}
                    className={cn(
                      "w-10 h-10 rounded-xl border-[3px] border-foreground shadow-[2px_2px_0_0_#000] hover:-translate-y-1 transition-all",
                      newFolderColor === color.value && "ring-[4px] ring-foreground ring-offset-2 ring-offset-background scale-110"
                    )}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={createFolder}
              disabled={!newFolderName.trim()}
              className="w-full py-3 mt-4 bg-[#1475e5] text-white rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] font-black uppercase tracking-widest disabled:opacity-50 hover:-translate-y-1 hover:shadow-none transition-all"
            >
              CREAR CARPETA
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={(open) => {
        setShowUploadModal(open);
        if (open) {
          setUploadYear(selectedYear); // Default to current filter
        }
      }}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Upload className="w-6 h-6" />
              {uploadBasketballMode === "folder" ? "SUBIR CARPETA" : "SUBIR ARCHIVOS"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AÑO</label>
                <Select
                  value={uploadYear ? uploadYear.toString() : "all"}
                  onValueChange={(val) => {
                    const year = val === "all" ? null : parseInt(val);
                    setUploadYear(year);
                    setUploadSubject(""); // Reset subject when year changes
                  }}
                >
                  <SelectTrigger className="mt-2 bg-background border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest py-3 h-auto focus:shadow-none focus:translate-y-1 transition-all">
                    <SelectValue placeholder="TODOS" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest">
                    <SelectItem value="all" className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">TODOS</SelectItem>
                    {selectableYears.map(y => (
                      <SelectItem key={y} value={y.toString()} className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">{y}° AÑO</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  MATERIA
                </label>
                <Select
                  value={uploadSubject || "none"}
                  onValueChange={(val) => setUploadSubject(val === "none" ? "" : val)}
                >
                  <SelectTrigger className="mt-2 bg-background border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest py-3 h-auto focus:shadow-none focus:translate-y-1 transition-all">
                    <SelectValue placeholder="SIN MATERIA" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest">
                    <SelectItem value="none" className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">SIN MATERIA ASIGNADA</SelectItem>
                    {subjects
                      .filter(s => !uploadYear || s.año === uploadYear)
                      .map(subject => (
                        <SelectItem key={subject.id} value={subject.id} className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">
                          {subject.nombre} ({subject.año}°)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <BasketballFileUploader
              disabled={uploading || isGuest}
              initialMode={uploadBasketballMode}
              onFile={(file) => uploadFilesList([file])}
              onFiles={(files) => uploadFilesList(files)}
              onFolderFiles={(files) => uploadFolderFilesList(files)}
            />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
              PDF, IMÁGENES O CARPETAS COMPLETAS (MÁX 20MB POR ARCHIVO)
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Modal */}
      <Dialog open={showLinkModal} onOpenChange={(open) => {
        setShowLinkModal(open);
        if (open) setUploadYear(selectedYear);
      }}>
        <DialogContent className="sm:max-w-md bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <LinkIcon className="w-6 h-6" />
              AGREGAR LINK
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AÑO</label>
                <Select
                  value={uploadYear ? uploadYear.toString() : "all"}
                  onValueChange={(val) => {
                    const year = val === "all" ? null : parseInt(val);
                    setUploadYear(year);
                    setUploadSubject("");
                  }}
                >
                  <SelectTrigger className="mt-2 bg-background border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest py-3 h-auto focus:shadow-none focus:translate-y-1 transition-all">
                    <SelectValue placeholder="TODOS" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest">
                    <SelectItem value="all" className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">TODOS</SelectItem>
                    {selectableYears.map(y => (
                      <SelectItem key={y} value={y.toString()} className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">{y}° AÑO</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  MATERIA
                </label>
                <Select
                  value={uploadSubject || "none"}
                  onValueChange={(val) => setUploadSubject(val === "none" ? "" : val)}
                >
                  <SelectTrigger className="mt-2 bg-background border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest py-3 h-auto focus:shadow-none focus:translate-y-1 transition-all">
                    <SelectValue placeholder="SIN MATERIA" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest">
                    <SelectItem value="none" className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">SIN MATERIA ASIGNADA</SelectItem>
                    {subjects
                      .filter(s => !uploadYear || s.año === uploadYear)
                      .map(subject => (
                        <SelectItem key={subject.id} value={subject.id} className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">
                          {subject.nombre} ({subject.año}°)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">NOMBRE DEL RECURSO</label>
              <input
                type="text"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="EJ: VIDEO EXPLICATIVO - TEMA 1"
                className="w-full mt-2 px-4 py-3 bg-background rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] font-black uppercase tracking-widest text-sm focus:outline-none focus:translate-y-1 focus:shadow-none transition-all placeholder:text-muted-foreground/50"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="HTTPS://..."
                className="w-full mt-2 px-4 py-3 bg-background rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] font-black uppercase tracking-widest text-sm focus:outline-none focus:translate-y-1 focus:shadow-none transition-all placeholder:text-muted-foreground/50"
              />
            </div>

            <button
              onClick={addLink}
              disabled={!linkUrl.trim() || !linkName.trim()}
              className="w-full py-3 mt-4 bg-[#805ad5] text-white rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] font-black uppercase tracking-widest disabled:opacity-50 hover:-translate-y-1 hover:shadow-none transition-all"
            >
              AGREGAR LINK
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Floating Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl p-4 flex items-center gap-6 min-w-[300px]">
            <div className="flex items-center gap-3 pr-6 border-r-[3px] border-foreground">
              <div className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center font-black">
                {selectedIds.size}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">SELECCIONADOS</span>
            </div>

            <div className="flex items-center gap-2">
              <HoldButton
                size="sm"
                holdTime={1400}
                backgroundColor="#ef4444"
                fillColor="#991b1b"
                textColor="#ffffff"
                fillTextColor="#ffffff"
                icon={<Trash2 className="w-3.5 h-3.5 shrink-0" />}
                doneIcon={<Check className="w-3.5 h-3.5 shrink-0" />}
                doneLabel="ELIMINADOS"
                onHold={deleteSelected}
                className="px-4 py-2 border-[3px] border-foreground shadow-[2px_2px_0_0_#000] hover:-translate-y-1 hover:shadow-none rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                MANTENER PARA ELIMINAR
              </HoldButton>
              <button
                onClick={clearSelection}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal con Mantener Presionado */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-lg md:max-w-xl bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl p-6 md:p-8">
          <DialogHeader>
            <DialogTitle className="font-display text-xl md:text-2xl font-black uppercase tracking-widest text-destructive flex items-center gap-2">
              <Trash2 className="w-6 h-6 stroke-[2.5]" />
              {deleteTarget?.type === "folder" ? "ELIMINAR CARPETA" : "ELIMINAR ARCHIVO"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm font-black uppercase tracking-wide text-foreground">
              ¿Estás seguro de que deseas eliminar {deleteTarget?.type === "folder" ? "la carpeta" : "el archivo"}{" "}
              <span className="text-destructive underline decoration-2">{deleteTarget?.nombre}</span>?
            </p>

            {deleteTarget?.type === "folder" && (
              <div className="bg-destructive/10 border-2 border-destructive/40 p-3 rounded-xl text-xs font-bold text-destructive space-y-1">
                <p>⚠️ ADVERTENCIA:</p>
                <p className="text-muted-foreground font-semibold">
                  Se eliminarán permanentemente todas las subcarpetas y archivos contenidos dentro de esta carpeta tanto de la biblioteca como del almacenamiento.
                </p>
              </div>
            )}

            <div className="bg-muted/60 border-2 border-foreground/20 p-3 rounded-xl">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground text-center">
                Para confirmar la eliminación, mantén presionado el botón rojo hasta que se complete la barra.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="w-full sm:w-auto px-5 py-2.5 bg-muted text-foreground border-2 border-foreground rounded-xl font-black uppercase tracking-wider hover:bg-muted/80 transition-all text-xs"
            >
              Cancelar
            </button>

            <HoldButton
              size="md"
              holdTime={1400}
              backgroundColor="#ef4444"
              fillColor="#991b1b"
              textColor="#ffffff"
              fillTextColor="#ffffff"
              icon={<Trash2 className="w-4 h-4 mr-2" />}
              doneIcon={<Check className="w-4 h-4 mr-2" />}
              doneLabel="¡ELIMINADO!"
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
              className="w-full sm:flex-1 border-2 border-foreground shadow-[3px_3px_0_0_#000] rounded-xl font-black uppercase tracking-wider text-xs py-3 justify-center"
            >
              MANTÉN PRESIONADO PARA BORRAR
            </HoldButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Modal */}
      <Dialog open={showEditFolderModal} onOpenChange={setShowEditFolderModal}>
        <DialogContent className="sm:max-w-md bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-black uppercase tracking-widest text-foreground">EDITAR CARPETA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">NOMBRE DE LA CARPETA</label>
              <input
                type="text"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                placeholder="NOMBRE DE LA CARPETA"
                className="w-full p-3 bg-background rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] font-black uppercase tracking-widest text-sm focus:outline-none focus:translate-y-1 focus:shadow-none transition-all placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">COLOR</label>
              <div className="flex gap-3 mt-2">
                {folderColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setEditFolderColor(color.value)}
                    className={cn(
                      "w-10 h-10 rounded-xl border-[3px] border-foreground shadow-[2px_2px_0_0_#000] hover:-translate-y-1 transition-all",
                      editFolderColor === color.value && "ring-[4px] ring-foreground ring-offset-2 ring-offset-background scale-110"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AÑO (OPCIONAL)</label>
                <Select
                  value={editFolderYear ? editFolderYear.toString() : "all"}
                  onValueChange={(val) => {
                    const year = val === "all" ? null : parseInt(val);
                    setEditFolderYear(year);
                    setEditFolderSubject("");
                  }}
                >
                  <SelectTrigger className="mt-2 bg-background border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest py-3 h-auto focus:shadow-none focus:translate-y-1 transition-all">
                    <SelectValue placeholder="TODOS" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest">
                    <SelectItem value="all" className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">TODOS</SelectItem>
                    {selectableYears.map(y => (
                      <SelectItem key={y} value={y.toString()} className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">{y}° AÑO</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">MATERIA (OPCIONAL)</label>
                <Select
                  value={editFolderSubject || "none"}
                  onValueChange={(val) => setEditFolderSubject(val === "none" ? "" : val)}
                >
                  <SelectTrigger className="mt-2 bg-background border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest py-3 h-auto focus:shadow-none focus:translate-y-1 transition-all">
                    <SelectValue placeholder="SIN MATERIA" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl font-black uppercase tracking-widest">
                    <SelectItem value="none" className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">SIN MATERIA ASIGNADA</SelectItem>
                    {subjects
                      .filter(s => !editFolderYear || s.año === editFolderYear)
                      .map(subject => (
                        <SelectItem key={subject.id} value={subject.id} className="font-black uppercase tracking-widest cursor-pointer hover:bg-muted focus:bg-muted">
                          {subject.nombre} ({subject.año}°)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <button
              onClick={() => setShowEditFolderModal(false)}
              className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              CANCELAR
            </button>
            <button
              onClick={updateFolder}
              disabled={!editFolderName.trim()}
              className="px-6 py-3 bg-[#1475e5] text-white rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] font-black uppercase tracking-widest hover:-translate-y-1 hover:shadow-none transition-all active:scale-95 disabled:opacity-50"
            >
              GUARDAR CAMBIOS
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Marketplace Publish Modal */}
      <Dialog open={showPublishModal} onOpenChange={(open) => {
        setShowPublishModal(open);
        if (!open) setPubIsAnonymous(false);
      }}>
        <DialogContent className="sm:max-w-md bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-[#1475e5]" />
              PUBLICAR EN LA COMUNIDAD
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-[#1475e5]/10 border-[3px] border-[#1475e5] rounded-xl shadow-[4px_4px_0_0_#1475e5] mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#1475e5] mb-1">RECURSO A PUBLICAR</p>
              <p className="font-black uppercase tracking-widest text-sm">{publishingResource?.nombre}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                {publishingResource?.type === "folder" ? "TODA LA ESTRUCTURA Y ARCHIVOS INTERNOS SE HARÁN PÚBLICOS" : "ESTE ARCHIVO INDIVIDUAL SE HARÁ PÚBLICO"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">DESCRIPCIÓN</label>
              <textarea
                value={pubDescription}
                onChange={(e) => setPubDescription(e.target.value)}
                placeholder="EXPLICA QUÉ CONTIENE ESTE RECURSO..."
                className="w-full h-24 p-3 bg-background rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] font-black uppercase tracking-widest text-sm focus:outline-none focus:translate-y-1 focus:shadow-none transition-all placeholder:text-muted-foreground/50 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CATEGORÍA</label>
              <input
                type="text"
                value={pubCategory}
                onChange={(e) => setPubCategory(e.target.value)}
                placeholder="EJ: RESÚMENES, APUNTE, MODELOS DE EXAMEN..."
                className="w-full p-3 bg-background rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] font-black uppercase tracking-widest text-sm focus:outline-none focus:translate-y-1 focus:shadow-none transition-all placeholder:text-muted-foreground/50"
              />
            </div>

            <div 
              onClick={() => setPubIsAnonymous(!pubIsAnonymous)}
              className={cn(
                "p-3 rounded-xl border-[3px] border-foreground cursor-pointer transition-all flex items-center justify-between shadow-[4px_4px_0_0_#000] select-none",
                pubIsAnonymous 
                  ? "bg-[#1475e5]/15" 
                  : "bg-background hover:bg-muted/40"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg border-2 border-foreground flex items-center justify-center font-bold flex-shrink-0 shadow-[1px_1px_0_0_#000]",
                  pubIsAnonymous ? "bg-foreground text-background" : "bg-muted text-foreground"
                )}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-black uppercase text-xs tracking-wider text-foreground">PUBLICAR COMO ANÓNIMO</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    TU IDENTIDAD Y CARRERA PERMANECERÁN OCULTAS
                  </p>
                </div>
              </div>
              <div className={cn(
                "w-5 h-5 rounded-md border-2 border-foreground flex items-center justify-center font-black transition-colors flex-shrink-0 shadow-[1px_1px_0_0_#000]",
                pubIsAnonymous ? "bg-[#1475e5] text-white" : "bg-background"
              )}>
                {pubIsAnonymous && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <button
              onClick={() => setShowPublishModal(false)}
              className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              CANCELAR
            </button>
            <button
              onClick={handlePublish}
              className="px-6 py-3 bg-[#1475e5] text-white rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] font-black uppercase tracking-widest hover:-translate-y-1 hover:shadow-none transition-all active:scale-95"
            >
              PUBLICAR AHORA
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Full-Screen File Viewer ─────────────────────────────────── */}
      {fullScreenFile && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-card/80 backdrop-blur-xl border-b border-border shadow-lg shrink-0">
            {/* Left: File info */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={closeFullScreenViewer}
                className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                title="Cerrar y guardar tiempo"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h3 className="font-display font-semibold text-sm truncate">{fullScreenFile.nombre}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {fullScreenFile.subject?.nombre || "Sin materia"}
                </p>
              </div>
            </div>

            {/* Center: Timer */}
            <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
              <Clock className="w-4 h-4 text-primary animate-pulse" />
              <span className="font-mono font-bold text-primary text-sm tracking-wider">
                {formatTime(viewerTimer)}
              </span>
            </div>

            {/* Right: Zoom controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setViewerZoom(z => Math.max(25, z - 25))}
                  className="px-2 py-1 hover:bg-background rounded text-sm font-bold"
                  title="Reducir"
                >−</button>
                <span className="px-2 text-xs font-mono font-medium min-w-[3rem] text-center">{viewerZoom}%</span>
                <button
                  onClick={() => setViewerZoom(z => Math.min(300, z + 25))}
                  className="px-2 py-1 hover:bg-background rounded text-sm font-bold"
                  title="Ampliar"
                >+</button>
                <button
                  onClick={() => setViewerZoom(100)}
                  className="px-2 py-1 hover:bg-background rounded text-xs"
                  title="Restablecer"
                >100%</button>
              </div>
              <a
                href={fullScreenFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-secondary rounded-lg hover:bg-secondary/80"
                title="Abrir en nueva pestaña"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* AI Toolbar */}
          <div className="bg-card/60 backdrop-blur-sm border-b border-border px-4 py-2 flex items-center justify-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => setShowGenOptions(showGenOptions === 'flashcards' ? null : 'flashcards')}
              disabled={generating !== null}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50",
                showGenOptions === 'flashcards' ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              <span className="text-base">{generating === 'flashcards' ? '⏳' : '✨'}</span>
              {generating === 'flashcards' ? "Generando..." : "Flashcards"}
            </button>
            <button
              onClick={() => setShowGenOptions(showGenOptions === 'quiz' ? null : 'quiz')}
              disabled={generating !== null}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50",
                showGenOptions === 'quiz' ? "bg-primary text-primary-foreground" : "bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20"
              )}
            >
              <span className="text-base">{generating === 'quiz' ? '⏳' : '📋'}</span>
              {generating === 'quiz' ? "Generando..." : "Cuestionario"}
            </button>
            <button
              onClick={() => fullScreenFile && handleGenerateContent(fullScreenFile, 'summary')}
              disabled={generating !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <span className="text-base">{generating === 'summary' ? '⏳' : '📝'}</span>
              {generating === 'summary' ? "Resumiendo..." : "Resumir"}
            </button>
            <div className="w-px h-6 bg-border mx-1" />
            <button
              onClick={() => {
                if (isSpeaking) {
                  stop();
                } else if (fullScreenFile) {
                  if (fullScreenFile.tipo === 'pdf') {
                    extractAndSpeakPDF(fullScreenFile.url);
                  } else {
                    speak(fullScreenFile.nombre); // Fallback or read simple text if format supported
                  }
                }
              }}
              disabled={isExtractingText}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                isSpeaking 
                  ? "bg-neon-cyan/20 text-neon-cyan animate-pulse shadow-[0_0_15px_rgba(0,195,255,0.3)]" 
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              )}
            >
              {isExtractingText ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSpeaking ? (
                <Square className="w-4 h-4 fill-current" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              {isSpeaking ? "Detener" : "Leer en voz alta"}
            </button>

            {/* Gen count selector */}
            {showGenOptions && (
              <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-1.5 border border-border">
                <span className="text-xs text-muted-foreground">
                  {showGenOptions === 'flashcards' ? 'Tarjetas:' : 'Preguntas:'}
                </span>
                {[5, 10, 15, 20, 30].map(n => (
                  <button
                    key={n}
                    onClick={() => setGenCount(n)}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      genCount === n ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                    )}
                  >{n}</button>
                ))}
                <button
                  onClick={() => fullScreenFile && handleGenerateContent(fullScreenFile, showGenOptions, genCount)}
                  disabled={generating !== null}
                  className="px-3 py-0.5 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-lg text-xs font-semibold hover:opacity-90"
                >Generar {genCount}</button>
              </div>
            )}
          </div>

          {/* File Content Area */}
          <div className="flex-1 overflow-auto bg-black/30">
            <div
              className="w-full h-full flex items-start justify-center"
              style={{ transform: `scale(${viewerZoom / 100})`, transformOrigin: 'top center' }}
            >
              {fullScreenFile.tipo === "imagen" && (
                <img
                  src={fullScreenFile.url}
                  alt={fullScreenFile.nombre}
                  className="max-w-full h-auto shadow-2xl"
                />
              )}
              {fullScreenFile.tipo === "pdf" && (
                <iframe
                  src={`${fullScreenFile.url}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="w-full border-0 shadow-2xl"
                  style={{ minHeight: "calc(100vh - 120px)", height: "100%" }}
                  title={fullScreenFile.nombre}
                />
              )}
              {fullScreenFile.tipo === "link" && (
                <div className="text-center py-20 bg-card m-4 rounded-xl border border-border">
                  <LinkIcon className="w-16 h-16 mx-auto mb-4 text-neon-cyan" />
                  <p className="text-lg font-medium mb-4">{fullScreenFile.nombre}</p>
                  <a
                    href={fullScreenFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90"
                  >
                    Abrir Link ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Status Bar */}
          <div className="bg-card/80 backdrop-blur-xl border-t border-border px-4 py-1.5 flex items-center justify-between text-xs text-muted-foreground shrink-0">
            <span>
              {fullScreenFile.subject?.nombre
                ? `📚 ${fullScreenFile.subject.nombre} (${fullScreenFile.subject.año}° año)`
                : "Sin materia asignada"
              }
            </span>
            <span>
              {fullScreenFile.tamaño_bytes ? formatFileSize(fullScreenFile.tamaño_bytes) : ""} · Zoom: {viewerZoom}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}



