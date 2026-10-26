import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Download, Star, User, Eye, ChevronLeft, ChevronRight, Layers, Upload, X, GraduationCap, Building2, FileText, Folder, Loader2, HelpCircle, ShieldCheck, Check, ArrowUpDown, Filter, Info, BookOpen, FolderOpen, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { useMarketplace, PublicDeck, PublicFile, PublicFolder, PublicQuiz, PublicApunte } from "@/hooks/useMarketplace";
import { ALL_FACULTADES, AVAILABLE_FACULTADES, AVAILABLE_CAREERS } from "@/lib/careerData";
import { ComunidadIcon } from "@/components/icons/ComunidadIcon";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import HoldButton from "@/components/ui/HoldButton";

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
    facultadFilter,
    setFacultadFilter,
    carreraFilter,
    setCarreraFilter,
    sortBy,
    setSortBy,
    userRatings,
    rateResource,
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
  const [userFacultadId, setUserFacultadId] = useState<string | null>(null);
  const [userFacultadLabel, setUserFacultadLabel] = useState<string | null>(null);
  const [userCarreraLabel, setUserCarreraLabel] = useState<string | null>(null);

  // Cargar facultad del perfil del usuario para pre-seleccionar por default
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function loadUserAcademicProfile() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("facultad, carrera")
          .eq("user_id", user.id)
          .single();

        if (error || !data || !isMounted) return;

        const facRaw = (data.facultad || "").trim();
        const carrRaw = (data.carrera || "").trim();
        if (carrRaw) setUserCarreraLabel(carrRaw);

        if (facRaw) {
          const match = ALL_FACULTADES.find(
            (f) =>
              f.id.toLowerCase() === facRaw.toLowerCase() ||
              facRaw.toLowerCase().includes(f.label.toLowerCase()) ||
              f.label.toLowerCase().includes(facRaw.toLowerCase()) ||
              (f.fullLabel && (facRaw.toLowerCase().includes(f.fullLabel.toLowerCase()) || f.fullLabel.toLowerCase().includes(facRaw.toLowerCase())))
          );

          const resolvedId = match ? match.id : facRaw;
          const resolvedLabel = match ? match.label : facRaw;

          setUserFacultadId(resolvedId);
          setUserFacultadLabel(resolvedLabel);

          // Pre-seleccionar la facultad del usuario si el filtro aún no ha sido alterado manualmente
          setFacultadFilter((prev) => (prev === null ? resolvedId : prev));
        }
      } catch (err) {
        console.error("Error al cargar facultad del usuario en Marketplace:", err);
      }
    }

    loadUserAcademicProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Carreras disponibles según la facultad actualmente filtrada
  const filteredCareers = React.useMemo(() => {
    if (!facultadFilter || facultadFilter === "all") return [];
    return AVAILABLE_CAREERS.filter((c) => c.facultad === facultadFilter);
  }, [facultadFilter]);

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
  const [resourceToPublish, setResourceToPublish] = useState<{ id: string; type: 'deck' | 'file' | 'folder' | 'quiz' | 'apunte'; nombre: string; description?: string; category?: string } | null>(null);
  const [publishSearch, setPublishSearch] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
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
          supabase.from("flashcard_decks").select("id, user_id, subject_id, nombre, description, category, total_cards, is_public, download_count, rating_sum, rating_count, created_at").eq("user_id", user.id).limit(50),
          supabase.from("library_files").select("id, user_id, subject_id, folder_id, nombre, tipo, url, storage_path, tamaño_bytes, category, is_public, download_count, rating_sum, rating_count, created_at").eq("user_id", user.id).limit(50),
          supabase.from("library_folders").select("id, user_id, subject_id, nombre, color, icon, category, is_public, download_count, rating_sum, rating_count, created_at").eq("user_id", user.id).limit(50),
          supabase.from("quiz_decks").select("id, user_id, subject_id, nombre, description, category, total_questions, is_public, download_count, rating_sum, rating_count, created_at").eq("user_id", user.id).limit(50),
          supabase.from("notion_documents").select("id, titulo, emoji, subject_id, parent_id, is_public, description, category, is_anonymous, created_at").eq("user_id", user.id).limit(50)
        ]);

        const subjectsById = new Map((subjectsData || []).map((s: any) => [s.id, { id: s.id, nombre: s.nombre, year: s.año }]));

        setMyResources([
          ...(decksRes.data || []).map(d => ({ ...d, type: 'deck', year: subjectsById.get(d.subject_id)?.year, subject_name: subjectsById.get(d.subject_id)?.nombre })),
          ...(filesRes.data || []).map(f => ({ ...f, type: 'file', year: subjectsById.get(f.subject_id)?.year, subject_name: subjectsById.get(f.subject_id)?.nombre })),
          ...(foldersRes.data || []).map(f => ({ ...f, type: 'folder', year: subjectsById.get(f.subject_id)?.year, subject_name: subjectsById.get(f.subject_id)?.nombre })),
          ...(quizzesRes.data || []).map(q => ({ ...q, type: 'quiz', year: subjectsById.get(q.subject_id)?.year, subject_name: subjectsById.get(q.subject_id)?.nombre })),
          ...(apuntesRes.data || []).map(a => ({
            ...a,
            type: 'apunte',
            nombre: a.titulo || 'Sin título',
            year: subjectsById.get(a.subject_id)?.year,
            subject_name: subjectsById.get(a.subject_id)?.nombre
          }))
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

  const startBackgroundImport = async (
    resource: { id: string; type: "deck" | "file" | "folder" | "quiz" | "apunte"; data: any },
    subjectId: string | null = null
  ) => {
    if (!user) {
      toast.error("Inicia sesión para importar recursos de la comunidad.");
      return;
    }

    // Cerrar inmediatamente el modal para liberar la interfaz
    setImportOpen(false);
    setImportingResource(null);

    const resourceName = resource.data?.nombre || resource.data?.titulo || "Recurso";
    const toastId = `import-${resource.type}-${resource.id}-${Date.now()}`;

    toast.loading(`Descargando "${resourceName}" en segundo plano...`, {
      id: toastId,
    });

    try {
      let targetSubjectId = subjectId;

      // Si es un mazo y no tiene materia asignada, buscar o crear una materia
      if (resource.type === "deck" && !targetSubjectId) {
        if (subjects.length > 0) {
          targetSubjectId = subjects[0].id;
        } else {
          const { data: createdSub } = await (supabase.from("subjects") as any)
            .insert({
              user_id: user.id,
              nombre: "General",
              año: 1,
            })
            .select("id")
            .single();
          if (createdSub) {
            targetSubjectId = createdSub.id;
            setSubjects((prev) => [...prev, { id: createdSub.id, nombre: "General", year: 1 }]);
          }
        }
      }

      let result: { error: string | null; [key: string]: any } = { error: "Tipo desconocido" };

      if (resource.type === "deck") {
        result = await importDeck(resource.id, targetSubjectId || "", true);
      } else if (resource.type === "file") {
        result = await importFile(resource.data, null);
      } else if (resource.type === "folder") {
        result = await importFolder(resource.id, null);
      } else if (resource.type === "quiz") {
        result = await importQuiz(resource.id, targetSubjectId, true);
      } else if (resource.type === "apunte") {
        result = await importApunte(resource.id, targetSubjectId);
      }

      if (result.error) {
        toast.error(`Error al importar "${resourceName}": ${result.error}`, { id: toastId });
      } else {
        toast.success(`¡"${resourceName}" descargado e importado con éxito!`, {
          id: toastId,
          duration: 3500,
        });
      }
    } catch (err: any) {
      console.error("Error en importación en segundo plano:", err);
      toast.error(`Error al importar "${resourceName}": ${err?.message || "Error inesperado"}`, {
        id: toastId,
      });
    }
  };

  const handleImport = startBackgroundImport;

  const handlePublish = async () => {
    if (!resourceToPublish) return;
    if (!description.trim()) {
      toast.error("Por favor ingresa una breve descripción");
      return;
    }
    if (!category.trim()) {
      toast.error("Por favor indica una categoría o materia");
      return;
    }
    setIsPublishing(true);
    const success = await publishResource(resourceToPublish.type, resourceToPublish.id, description.trim(), category.trim(), isAnonymous);
    if (success) {
      setPublishSelectOpen(false);
      setResourceToPublish(null);
      setDescription("");
      setCategory("");
      setIsAnonymous(false);
      window.location.reload();
    }
    setIsPublishing(false);
  };

  const getAverageRating = (item: any) => {
    if (!item.rating_count) return 0;
    return item.rating_sum / item.rating_count;
  };

  // Helper visual para tipos de recursos con estética Notion
  const getTypeConfig = (type: "deck" | "file" | "folder" | "apunte" | "quiz") => {
    switch (type) {
      case 'deck':
        return {
          icon: Layers,
          label: 'Mazo',
          countLabel: (item: any) => `${item.total_cards ?? 0} tarjetas`,
          badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
          iconBg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/50'
        };
      case 'quiz':
        return {
          icon: HelpCircle,
          label: 'Quiz',
          countLabel: (item: any) => `${item.total_questions ?? 0} preguntas`,
          badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
          iconBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50'
        };
      case 'apunte':
        return {
          icon: GraduationCap,
          label: 'Apunte',
          countLabel: () => 'Documento',
          badgeClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
          iconBg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/50'
        };
      case 'folder':
        return {
          icon: Folder,
          label: 'Carpeta',
          countLabel: () => 'Colección',
          badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
          iconBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50'
        };
      case 'file':
      default:
        return {
          icon: FileText,
          label: 'Archivo',
          countLabel: (item: any) => item.tipo ? item.tipo.toUpperCase() : 'Archivo',
          badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
          iconBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/50'
        };
    }
  };

  const InteractiveRating = ({ item, type }: { item: any; type: "deck" | "file" | "folder" | "apunte" | "quiz" }) => {
    const [hoverRating, setHoverRating] = useState<number | null>(null);
    const avg = getAverageRating(item);
    const userVote = userRatings[item.id];
    const canRate = Boolean(user);

    return (
      <div 
        className="flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="flex items-center gap-0.5"
          onMouseLeave={() => setHoverRating(null)}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = hoverRating !== null 
              ? star <= hoverRating 
              : userVote 
                ? star <= userVote 
                : star <= Math.round(avg);
            return (
              <button
                key={star}
                type="button"
                disabled={!canRate}
                title={!user ? "Inicia sesión para calificar" : (userVote ? `Cambiar mi calificación a ${star} ★` : `Calificar con ${star} ★`)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!canRate) {
                    toast.error("Inicia sesión para calificar este recurso");
                    return;
                  }
                  rateResource(type, item.id, star);
                }}
                onMouseEnter={() => canRate && setHoverRating(star)}
                className={cn(
                  "p-0.5 transition-transform",
                  canRate ? "hover:scale-115 cursor-pointer focus:outline-none" : "cursor-not-allowed opacity-60"
                )}
                aria-label={`Calificar con ${star} estrellas`}
              >
                <Star
                  className={cn(
                    "w-3.5 h-3.5 transition-colors",
                    isFilled 
                      ? "fill-amber-400 text-amber-400" 
                      : "text-zinc-300 dark:text-zinc-700"
                  )}
                />
              </button>
            );
          })}
        </div>
        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 ml-0.5">
          {avg > 0 ? avg.toFixed(1) : "-"}
        </span>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-normal">
          ({item.rating_count || 0})
        </span>
        {userVote && (
          <span className="text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/20">
            Tu voto: {userVote}★
          </span>
        )}
      </div>
    );
  };

  const ResourceCard = ({ item, type }: { item: any, type: "deck" | "file" | "folder" | "apunte" | "quiz" }) => {
    const config = getTypeConfig(type);
    const Icon = config.icon;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.92, y: 12, filter: "blur(5px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.9, y: -8, filter: "blur(6px)", transition: { duration: 0.2 } }}
        transition={{
          layout: { type: "spring", stiffness: 380, damping: 32, mass: 0.75 },
          opacity: { duration: 0.22 },
        }}
        className="bg-white dark:bg-[#212121] rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs transition-colors duration-200 group"
      >
        <div>
          {/* Header de la tarjeta */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", config.iconBg)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate group-hover:text-primary transition-colors">
                  {item.nombre}
                </h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                  {config.countLabel(item)}
                </span>
              </div>
            </div>
            <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md border shrink-0", config.badgeClass)}>
              {config.label}
            </span>
          </div>

          {/* Descripción */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-[32px] mb-3 leading-relaxed">
            {item.description || "Sin descripción proporcionada por el autor."}
          </p>

          {/* Badges de materia y categoría */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {item.subject && (
              <span className="text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-zinc-400" />
                {item.subject.nombre} {item.subject.year ? `(${item.subject.year}°)` : ''}
              </span>
            )}
            {item.category && (
              <span className="text-[11px] font-medium bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800 px-2 py-0.5 rounded-md">
                {item.category}
              </span>
            )}
          </div>
        </div>

        <div>
          {/* Autor */}
          <div className="flex items-center justify-between pt-3 pb-3 border-t border-zinc-100 dark:border-zinc-800/80 mb-3 text-xs">
            {item.is_anonymous || item.creator?.is_anonymous ? (
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-[11px]">Estudiante Anónimo</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 min-w-0">
                <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0">
                  <User className="w-3 h-3" />
                </div>
                <span className="truncate font-medium text-[11px]">
                  {item.creator?.nombre || item.creator?.username || `#${item.creator?.display_id || 'user'}`}
                </span>
                {item.creator?.nivel && (
                  <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.2 rounded border border-zinc-200/60 dark:border-zinc-700/60 font-semibold shrink-0">
                    Nv. {item.creator.nivel}
                  </span>
                )}
              </div>
            )}

            {/* Descargas & Rating */}
            <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-xs shrink-0">
              <Download className="w-3.5 h-3.5" />
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">{item.download_count}</span>
            </div>
          </div>

          {/* Rating bar */}
          <div className="flex items-center justify-between mb-4 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-850 rounded-lg border border-zinc-100 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">Valoración</span>
            <InteractiveRating item={item} type={type} />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            {type === 'deck' && (
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 h-8 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800" 
                onClick={() => handlePreview(item)}
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" /> Vista previa
              </Button>
            )}
            <Button
              size="sm"
              className={cn(
                "h-8 text-xs font-medium rounded-lg transition-all shadow-2xs",
                type === 'deck' ? "flex-1" : "w-full",
                "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
              )}
              onClick={() => {
                if (type === 'deck') {
                  setImportingResource({ id: item.id, type: 'deck', data: item });
                  setSelectedSubject(subjects[0]?.id || "");
                  setImportOpen(true);
                } else if (type === 'quiz') {
                  setImportingResource({ id: item.id, type: 'quiz', data: item });
                  setSelectedSubject(subjects[0]?.id || "");
                  setImportOpen(true);
                } else if (type === 'apunte') {
                  setImportingResource({ id: item.id, type: 'apunte', data: item });
                  setSelectedSubject("");
                  setImportOpen(true);
                } else {
                  startBackgroundImport({ id: item.id, type, data: item }, null);
                }
              }}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Importar
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="tabe-page p-4 lg:p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header Notion/ChatGPT Style */}
      <div className="neo-bento-card p-6 lg:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0 shadow-2xs">
            <ComunidadIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Comunidad
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-normal text-sm">
              Explora, califica y descarga recursos creados por otros estudiantes para potenciar tu estudio.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
          <Button 
            onClick={() => setPublishSelectOpen(true)}
            className="w-full md:w-auto bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium text-sm h-9 px-4 rounded-lg shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Publicar Recurso
          </Button>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="neo-bento-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-normal text-zinc-500 dark:text-zinc-400">Mazos públicos</p>
            <p className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
              {publicDecks.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="neo-bento-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-normal text-zinc-500 dark:text-zinc-400">Quizzes de estudio</p>
            <p className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
              {publicQuizzes.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="neo-bento-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-normal text-zinc-500 dark:text-zinc-400">Apuntes compartidos</p>
            <p className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
              {publicApuntes.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="neo-bento-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-normal text-zinc-500 dark:text-zinc-400">Archivos y carpetas</p>
            <p className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
              {publicFiles.length + publicFolders.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="neo-bento-card p-3.5 sm:p-4 space-y-3">
        {/* Fila 1: Búsqueda general, Categoría y Orden */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar por nombre, materia o palabra clave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800/80 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? null : v)}>
              <SelectTrigger className="w-full sm:w-40 md:w-44 h-9 text-xs sm:text-sm font-medium bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800/80 rounded-lg">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-md text-xs sm:text-sm">
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-full sm:w-40 md:w-44 h-9 text-xs sm:text-sm font-medium bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800/80 rounded-lg">
                <div className="flex items-center gap-1.5 truncate">
                  <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <SelectValue placeholder="Ordenar por" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-md text-xs sm:text-sm">
                <SelectItem value="downloads">Más descargados</SelectItem>
                <SelectItem value="rating">Mejor calificados</SelectItem>
                <SelectItem value="recent">Más recientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fila 2: Filtros Académicos (Facultad y Carrera) */}
        <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Selector de Facultad */}
            <div className="w-full sm:w-auto min-w-[200px] flex-1 max-w-sm">
              <Select 
                value={facultadFilter || "all"} 
                onValueChange={(val) => {
                  setFacultadFilter(val === "all" ? null : val);
                  setCarreraFilter(null);
                }}
              >
                <SelectTrigger className="h-8 text-xs font-medium bg-zinc-50/80 dark:bg-zinc-800/60 border-zinc-200/80 dark:border-zinc-700/80 rounded-lg">
                  <div className="flex items-center gap-1.5 truncate">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <SelectValue placeholder="Filtrar por Facultad" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg text-xs max-h-60">
                  <SelectItem value="all">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">🏛️ Todas las facultades</span>
                  </SelectItem>
                  {userFacultadId && !AVAILABLE_FACULTADES.some(f => f.id === userFacultadId) && (
                    <SelectItem value={userFacultadId}>
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        ⭐ {userFacultadLabel || userFacultadId} (Mi facultad)
                      </span>
                    </SelectItem>
                  )}
                  {AVAILABLE_FACULTADES.map((fac) => (
                    <SelectItem key={fac.id} value={fac.id}>
                      <span className={fac.id === userFacultadId ? "font-semibold text-indigo-600 dark:text-indigo-400" : ""}>
                        {fac.id === userFacultadId ? `⭐ ${fac.label} (Mi facultad)` : fac.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selector de Carrera (visible si hay facultad seleccionada) */}
            {facultadFilter && facultadFilter !== "all" && filteredCareers.length > 0 && (
              <div className="w-full sm:w-auto min-w-[200px] flex-1 max-w-sm">
                <Select 
                  value={carreraFilter || "all"} 
                  onValueChange={(val) => setCarreraFilter(val === "all" ? null : val)}
                >
                  <SelectTrigger className="h-8 text-xs font-medium bg-zinc-50/80 dark:bg-zinc-800/60 border-zinc-200/80 dark:border-zinc-700/80 rounded-lg">
                    <div className="flex items-center gap-1.5 truncate">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <SelectValue placeholder="Filtrar por Carrera" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg text-xs max-h-60">
                    <SelectItem value="all">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">🎓 Todas las carreras</span>
                    </SelectItem>
                    {filteredCareers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Botón rápido para volver a Mi Facultad si se cambió */}
            {userFacultadId && facultadFilter !== userFacultadId && (
              <button
                type="button"
                onClick={() => {
                  setFacultadFilter(userFacultadId);
                  setCarreraFilter(null);
                }}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-[11px] font-medium transition-colors cursor-pointer"
                title="Volver a ver únicamente los recursos de mi facultad"
              >
                <RotateCcw className="w-3 h-3" />
                Mi facultad
              </button>
            )}

            {/* Botón para ver Todas si hay un filtro aplicado */}
            {facultadFilter && facultadFilter !== "all" && (
              <button
                type="button"
                onClick={() => {
                  setFacultadFilter(null);
                  setCarreraFilter(null);
                }}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-[11px] font-medium transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                Ver todas
              </button>
            )}
          </div>

          {/* Badge informativo de filtro activo */}
          {facultadFilter && facultadFilter !== "all" && (
            <div className="shrink-0 flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span>Filtrado activo</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Principales de Comunidad */}
      <Tabs defaultValue="decks" className="space-y-6 tour-marketplace-decks">
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger 
              value="decks" 
              className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-2xs transition-all flex items-center gap-2"
            >
              <Layers className="w-4 h-4" /> Mazos
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 font-normal">
                {publicDecks.length}
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="quizzes" 
              className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-2xs transition-all flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" /> Quizzes
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 font-normal">
                {publicQuizzes.length}
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="apuntes" 
              className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-2xs transition-all flex items-center gap-2"
            >
              <GraduationCap className="w-4 h-4" /> Apuntes
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 font-normal">
                {publicApuntes.length}
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="files" 
              className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-2xs transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> Archivos
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 font-normal">
                {publicFiles.length}
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="folders" 
              className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-2xs transition-all flex items-center gap-2"
            >
              <Folder className="w-4 h-4" /> Carpetas
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 font-normal">
                {publicFolders.length}
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="my-posts" 
              className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-2xs transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Mis Publicaciones
              {myResources.filter(r => r.is_public).length > 0 && (
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">
                  {myResources.filter(r => r.is_public).length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content: Mazos */}
        <TabsContent value="decks" className="focus-visible:outline-none">
          {loading && publicDecks.length === 0 ? (
            <LoadingScreen message="Cargando mazos de la comunidad..." submessage="Explorando tarjetas compartidas por otros estudiantes" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {publicDecks.map(deck => <ResourceCard key={deck.id} item={deck} type="deck" />)}
              </AnimatePresence>
              {publicDecks.length === 0 && (
                <div className="col-span-full neo-bento-card p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No se encontraron mazos</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
                    {searchTerm ? "Prueba a modificar los filtros de búsqueda o categoría." : "Sé el primero en compartir un mazo de estudio con la comunidad."}
                  </p>
                  <Button 
                    onClick={() => { setSelectedPublishType('deck'); setPublishSelectOpen(true); }}
                    className="mt-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium h-8 px-3 rounded-lg"
                  >
                    Publicar un mazo
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Tab Content: Quizzes */}
        <TabsContent value="quizzes" className="focus-visible:outline-none">
          {loading && publicQuizzes.length === 0 ? (
            <LoadingScreen message="Cargando cuestionarios de la comunidad..." submessage="Explorando trivias y tests creados por otros estudiantes" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {publicQuizzes.map(quiz => <ResourceCard key={quiz.id} item={quiz} type="quiz" />)}
              </AnimatePresence>
              {publicQuizzes.length === 0 && (
                <div className="col-span-full neo-bento-card p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No se encontraron cuestionarios</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
                    Comparte un quiz de autoevaluación para ayudar a otros estudiantes a medir sus conocimientos.
                  </p>
                  <Button 
                    onClick={() => { setSelectedPublishType('quiz'); setPublishSelectOpen(true); }}
                    className="mt-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium h-8 px-3 rounded-lg"
                  >
                    Publicar un cuestionario
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Tab Content: Apuntes */}
        <TabsContent value="apuntes" className="focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {publicApuntes.map(apunte => <ResourceCard key={apunte.id} item={apunte} type="apunte" />)}
            </AnimatePresence>
            {publicApuntes.length === 0 && (
              <div className="col-span-full neo-bento-card p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No se encontraron apuntes</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
                  Publica tus notas y resúmenes de Notion para que tus compañeros puedan estudiar con ellos.
                </p>
                <Button 
                  onClick={() => { setSelectedPublishType('apunte'); setPublishSelectOpen(true); }}
                  className="mt-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium h-8 px-3 rounded-lg"
                >
                  Publicar un apunte
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab Content: Archivos */}
        <TabsContent value="files" className="focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {publicFiles.map(file => <ResourceCard key={file.id} item={file} type="file" />)}
            </AnimatePresence>
            {publicFiles.length === 0 && (
              <div className="col-span-full neo-bento-card p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No se encontraron archivos</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
                  Comparte PDFs, guías o documentos de tu biblioteca académica.
                </p>
                <Button 
                  onClick={() => { setSelectedPublishType('file'); setPublishSelectOpen(true); }}
                  className="mt-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium h-8 px-3 rounded-lg"
                >
                  Publicar un archivo
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab Content: Carpetas */}
        <TabsContent value="folders" className="focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {publicFolders.map(folder => <ResourceCard key={folder.id} item={folder} type="folder" />)}
            </AnimatePresence>
            {publicFolders.length === 0 && (
              <div className="col-span-full neo-bento-card p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <Folder className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No se encontraron carpetas</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
                  Comparte carpetas completas de recursos organizados por temas o asignaturas.
                </p>
                <Button 
                  onClick={() => { setSelectedPublishType('file'); setPublishSelectOpen(true); }}
                  className="mt-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium h-8 px-3 rounded-lg"
                >
                  Publicar una carpeta
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab Content: Mis Publicaciones */}
        <TabsContent value="my-posts" className="space-y-4 focus-visible:outline-none">
          <div className="neo-bento-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                  Tus contribuciones a la comunidad
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-normal">
                  Recursos que has hecho públicos para otros estudiantes. Puedes retirarlos en cualquier momento.
                </p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {myResources.filter(r => r.is_public).length} publicados
              </span>
            </div>

            <div className="p-4 sm:p-5 divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {myResources.filter(r => r.is_public).map(resource => {
                const config = getTypeConfig(resource.type);
                const Icon = config.icon;
                return (
                  <div key={resource.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", config.iconBg)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate block">
                            {resource.nombre}
                          </span>
                          {resource.is_anonymous && (
                            <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border border-zinc-200/60 dark:border-zinc-700/60">
                              <ShieldCheck className="w-3 h-3 text-zinc-400" /> Anónimo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                          <span className="font-normal capitalize">{config.label}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" /> {resource.download_count || 0} descargas
                          </span>
                        </div>
                      </div>
                    </div>

                    <HoldButton 
                      size="sm"
                      holdTime={900}
                      backgroundColor="transparent"
                      fillColor="#ef4444"
                      textColor="#71717a"
                      fillTextColor="#ffffff"
                      icon={<X className="w-3.5 h-3.5 shrink-0" />}
                      doneIcon={<Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                      doneLabel="Retirado"
                      onHold={async () => {
                        setMyResources(prev => prev.map(r => r.id === resource.id ? { ...r, is_public: false } : r));
                        const success = await unpublishResource(resource.type as any, resource.id);
                        if (!success) {
                          setMyResources(prev => prev.map(r => r.id === resource.id ? { ...r, is_public: true } : r));
                        }
                      }}
                      className="border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100/60 dark:hover:bg-red-900/40 text-xs font-medium rounded-lg px-3 py-1.5 transition-all self-start sm:self-auto cursor-pointer"
                    >
                      Mantener para Retirar
                    </HoldButton>
                  </div>
                );
              })}

              {myResources.filter(r => r.is_public).length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Aún no has compartido publicaciones en la comunidad
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-sm mx-auto">
                    Tus mazos, apuntes y cuestionarios pueden ser de gran ayuda para otros estudiantes.
                  </p>
                  <Button 
                    onClick={() => setPublishSelectOpen(true)}
                    className="mt-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium h-8 px-3 rounded-lg"
                  >
                    Publicar tu primer recurso
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Modal for Decks */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl max-w-lg p-6">
          <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                Vista Previa
              </span>
              <DialogTitle className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 truncate">
                {previewDeck?.nombre}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Haz clic en la tarjeta para revelar la respuesta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {loadingPreview ? (
              <div className="min-h-[220px] rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/50">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              </div>
            ) : previewCards.length === 0 ? (
              <div className="min-h-[200px] rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center p-6 text-center text-xs text-zinc-400">
                Este mazo no contiene tarjetas con vista previa disponible.
              </div>
            ) : (
              <div 
                className={cn(
                  "min-h-[220px] p-6 rounded-xl border transition-all cursor-pointer flex flex-col justify-between items-center text-center select-none shadow-2xs",
                  showAnswer 
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60" 
                    : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                )} 
                onClick={() => setShowAnswer(!showAnswer)}
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border",
                    showAnswer 
                      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" 
                      : "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700"
                  )}>
                    {showAnswer ? "Respuesta" : "Pregunta"}
                  </span>
                </div>

                <div className="my-auto py-4">
                  <p className="text-base sm:text-lg font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                    {showAnswer ? previewCards[previewIndex]?.respuesta : previewCards[previewIndex]?.pregunta}
                  </p>
                </div>

                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-normal">
                  Toca para {showAnswer ? "ver pregunta" : "voltear tarjeta"}
                </p>
              </div>
            )}

            {previewCards.length > 0 && (
              <div className="flex items-center justify-between pt-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 px-2.5 text-xs rounded-lg" 
                  onClick={() => { setPreviewIndex(i => Math.max(0, i - 1)); setShowAnswer(false); }} 
                  disabled={previewIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {previewIndex + 1} de {previewCards.length}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 px-2.5 text-xs rounded-lg" 
                  onClick={() => { setPreviewIndex(i => Math.min(previewCards.length - 1, i + 1)); setShowAnswer(false); }} 
                  disabled={previewIndex === previewCards.length - 1}
                >
                  Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl max-w-md p-6">
          <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <DialogTitle className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
              Importar {importingResource?.type === 'deck' ? 'Mazo' : importingResource?.type === 'quiz' ? 'Cuestionario' : 'Apunte'}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Asigna este recurso a una materia de tu plan para organizarlo en tu espacio de estudio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Materia de destino {importingResource?.type === 'apunte' ? '(Opcional)' : '(Requerida)'}
              </label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-10 bg-zinc-50/50 dark:bg-zinc-800/40 text-zinc-900 dark:text-zinc-100 border-zinc-200/80 dark:border-zinc-800/80 rounded-lg text-xs sm:text-sm">
                  <SelectValue placeholder="Seleccionar materia..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs sm:text-sm">
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre} ({s.year}° Año)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button 
                variant="outline"
                className="flex-1 h-9 text-xs rounded-lg"
                onClick={() => setImportOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1 h-9 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900" 
                onClick={() => {
                  if (importingResource) {
                    startBackgroundImport(importingResource, selectedSubject || null);
                  }
                }} 
                disabled={false}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar en segundo plano
              </Button>
            </div>
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
          setPublishSearch("");
          setCurrentFolderId(null);
          setFolderHistory([{ id: null, name: 'Raíz' }]);
          setIsAnonymous(false);
          setDescription("");
          setCategory("");
        }
      }}>
        <DialogContent className="bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl max-w-xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
                  {publishStep === 'type' && "¿Qué tipo de recurso quieres publicar?"}
                  {publishStep === 'filter' && "Filtra tus recursos"}
                  {publishStep === 'select' && "Selecciona el elemento"}
                  {publishStep === 'details' && "Detalles de la publicación"}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {publishStep === 'type' && "Selecciona el formato del contenido que deseas compartir."}
                  {publishStep === 'filter' && "Acota por año o asignatura para encontrarlo rápidamente."}
                  {publishStep === 'select' && "Elige cuál de tus recursos deseas hacer público."}
                  {publishStep === 'details' && "Agrega una descripción para ayudar a otros estudiantes a encontrarlo."}
                </DialogDescription>
              </div>

              {/* Stepper indicator */}
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {['type', 'filter', 'select', 'details'].map((step, idx) => {
                  const steps = ['type', 'filter', 'select', 'details'];
                  const currentIndex = steps.indexOf(publishStep);
                  const isCurrent = idx === currentIndex;
                  const isDone = idx < currentIndex;
                  return (
                    <div 
                      key={step}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        isCurrent 
                          ? "bg-zinc-900 dark:bg-zinc-100 w-5" 
                          : isDone 
                            ? "bg-zinc-400 dark:bg-zinc-600" 
                            : "bg-zinc-200 dark:bg-zinc-800"
                      )}
                    />
                  );
                })}
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 pt-3">
            {/* Paso 1: Tipo de recurso */}
            {publishStep === 'type' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                  className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 cursor-pointer flex items-center gap-3.5 transition-all group"
                  onClick={() => { setSelectedPublishType('file'); setPublishStep('filter'); }}
                >
                  <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Archivo o Carpeta</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">PDFs, documentos o guías</p>
                  </div>
                </div>

                <div 
                  className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 cursor-pointer flex items-center gap-3.5 transition-all group"
                  onClick={() => { setSelectedPublishType('deck'); setPublishStep('filter'); }}
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Flashcards</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Mazos de memoria activa</p>
                  </div>
                </div>

                <div 
                  className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 cursor-pointer flex items-center gap-3.5 transition-all group"
                  onClick={() => { setSelectedPublishType('quiz'); setPublishStep('filter'); }}
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Cuestionario</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Tests de autoevaluación</p>
                  </div>
                </div>

                <div 
                  className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 cursor-pointer flex items-center gap-3.5 transition-all group"
                  onClick={() => { setSelectedPublishType('apunte'); setPublishStep('filter'); }}
                >
                  <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Apunte</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Páginas y notas de Notion</p>
                  </div>
                </div>
              </div>
            )}

            {/* Paso 2: Filtros */}
            {publishStep === 'filter' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Año de cursada</label>
                    <Select value={publishYear?.toString() || "all"} onValueChange={(v) => { setPublishYear(v === "all" ? null : parseInt(v)); setPublishSubject(null); }}>
                      <SelectTrigger className="h-9 text-xs sm:text-sm bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800/80 rounded-lg">
                        <SelectValue placeholder="Todos los años" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs sm:text-sm">
                        <SelectItem value="all">Todos los años</SelectItem>
                        {[1, 2, 3, 4, 5, 6].map(y => <SelectItem key={y} value={y.toString()}>{y}° Año</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Materia</label>
                    <Select 
                      value={publishSubject || "all"} 
                      onValueChange={(v) => setPublishSubject(v === "all" ? null : v)}
                    >
                      <SelectTrigger className="h-9 text-xs sm:text-sm bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800/80 rounded-lg">
                        <SelectValue placeholder="Todas las materias" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200 dark:border-zinc-800 rounded-lg max-h-56 overflow-y-auto text-xs sm:text-sm">
                        <SelectItem value="all">Todas las materias</SelectItem>
                        <SelectItem value="unlinked">Sin materia asignada</SelectItem>
                        {subjects
                          .filter(s => !publishYear || s.year === publishYear)
                          .map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.nombre} ({s.year}°)</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-9 text-xs rounded-lg" 
                    onClick={() => setPublishStep('type')}
                  >
                    Atrás
                  </Button>
                  <Button 
                    className="flex-1 h-9 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900" 
                    onClick={() => setPublishStep('select')}
                  >
                    Ver mis recursos <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Paso 3: Selección de recurso */}
            {publishStep === 'select' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <Input 
                    placeholder="Filtrar por nombre..."
                    value={publishSearch}
                    onChange={(e) => setPublishSearch(e.target.value)}
                    className="pl-8 h-9 text-xs sm:text-sm bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800/80 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-400"
                  />
                </div>

                {selectedPublishType === 'file' && (
                  <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1 px-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
                    <FolderOpen className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    {folderHistory.map((h, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <ChevronRight className="w-3 h-3 text-zinc-400 shrink-0" />}
                        <button 
                          className={cn(
                            "hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap",
                            i === folderHistory.length - 1 ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'
                          )}
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
                )}

                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {(() => {
                    let filtered = myResources.filter(r => !r.is_public);
                    
                    if (selectedPublishType === 'file') {
                      filtered = filtered.filter(r => r.type === 'file' || r.type === 'folder');
                      if (publishYear) filtered = filtered.filter(r => r.year === publishYear);
                      if (publishSubject === 'unlinked') {
                        filtered = filtered.filter(r => !r.subject_id);
                      } else if (publishSubject) {
                        filtered = filtered.filter(r => r.subject_id === publishSubject);
                      }
                      
                      filtered = filtered.filter(r => {
                        if (r.type === 'file') return r.folder_id === currentFolderId;
                        if (r.type === 'folder') return r.parent_folder_id === currentFolderId;
                        return false;
                      });
                    } else {
                      filtered = filtered.filter(r => r.type === selectedPublishType);
                      if (publishYear) filtered = filtered.filter(r => r.year === publishYear);
                      if (publishSubject === 'unlinked') {
                        filtered = filtered.filter(r => !r.subject_id);
                      } else if (publishSubject) {
                        filtered = filtered.filter(r => r.subject_id === publishSubject);
                      }
                    }

                    if (publishSearch.trim()) {
                      const q = publishSearch.toLowerCase();
                      filtered = filtered.filter(r => (r.nombre || "").toLowerCase().includes(q));
                    }

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-8 px-4 text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            No se encontraron recursos con los filtros seleccionados.
                          </p>
                          {(publishYear || publishSubject || publishSearch) && (
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => { setPublishYear(null); setPublishSubject(null); setPublishSearch(""); }}
                              className="text-xs h-8 px-2.5 rounded-lg"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" /> Quitar filtros
                            </Button>
                          )}
                        </div>
                      );
                    }

                    return filtered.map(r => {
                      const config = getTypeConfig(r.type);
                      const Icon = config.icon;

                      return (
                        <div 
                          key={`${r.type}-${r.id}`}
                          className="flex items-center justify-between p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-[#212121] hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-all group"
                          onClick={() => {
                            if (r.type === 'folder') {
                              setCurrentFolderId(r.id);
                              setFolderHistory([...folderHistory, { id: r.id, name: r.nombre }]);
                            } else {
                              const defaultCat = r.category || r.subject_name || (r.type === 'apunte' ? 'Apuntes' : '');
                              const defaultDesc = r.description || '';
                              setResourceToPublish({ 
                                id: r.id, 
                                type: r.type as any, 
                                nombre: r.nombre,
                                description: defaultDesc,
                                category: defaultCat
                              });
                              setDescription(defaultDesc);
                              setCategory(defaultCat);
                              setPublishStep('details');
                            }
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.iconBg)}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 block truncate">
                                {r.nombre}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                {r.subject_name ? (
                                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                    {r.subject_name} {r.year ? `(${r.year}°)` : ''}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-zinc-400">
                                    Sin materia
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {r.type === 'folder' ? (
                            <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
                          ) : (
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-primary shrink-0 ml-2">
                              Elegir
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    className="w-full h-9 text-xs rounded-lg" 
                    onClick={() => setPublishStep('filter')}
                  >
                    Atrás
                  </Button>
                </div>
              </div>
            )}

            {/* Paso 4: Detalles */}
            {publishStep === 'details' && resourceToPublish && (
              <div className="space-y-4">
                {/* Elemento seleccionado */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", getTypeConfig(resourceToPublish.type).iconBg)}>
                      {React.createElement(getTypeConfig(resourceToPublish.type).icon, { className: "w-4 h-4" })}
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 block truncate">
                        {resourceToPublish.nombre}
                      </span>
                      <span className="text-[11px] text-zinc-400 capitalize">
                        {getTypeConfig(resourceToPublish.type).label}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 px-2 text-xs rounded-md shrink-0" 
                    onClick={() => setPublishStep('select')}
                  >
                    Cambiar
                  </Button>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Descripción del recurso</label>
                  <Textarea 
                    placeholder="Describe de qué temas trata, qué contiene o recomendaciones de estudio..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[90px] text-xs sm:text-sm bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800/80 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-400 p-3"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Categoría o Etiquetas</label>
                  <Input 
                    placeholder="Ej: Fisiología, Anatomía, Resumen Parcial..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-9 text-xs sm:text-sm bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800/80 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-400"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["Resumen", "Parcial", "Final", "Práctica", "Teoría"].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setCategory(prev => prev ? `${prev}, ${tag}` : tag)}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Opción Anónima */}
                <div 
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={cn(
                    "p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between select-none",
                    isAnonymous 
                      ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700" 
                      : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                      isAnonymous 
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent" 
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700"
                    )}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">Publicar de forma anónima</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                        Tu nombre, usuario y carrera permanecerán ocultos para los demás.
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ml-2",
                    isAnonymous 
                      ? "bg-zinc-900 dark:bg-zinc-100 border-transparent text-white dark:text-zinc-900" 
                      : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  )}>
                    {isAnonymous && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button 
                    variant="outline"
                    className="flex-1 h-9 text-xs rounded-lg" 
                    onClick={() => setPublishStep('select')}
                  >
                    Volver
                  </Button>
                  <Button 
                    className="flex-1 h-9 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
                    onClick={handlePublish}
                    disabled={isPublishing}
                  >
                    {isPublishing ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Publicando...
                      </span>
                    ) : (
                      "Publicar en Comunidad"
                    )}
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
