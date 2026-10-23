import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, Plus,  GraduationCap,
    BookOpen, Zap, Trash2, X, Check, ChevronRight,
    ChevronLeft, Trophy, RotateCcw, Upload, Store,
    Edit, AlertCircle, Filter, Timer, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    SelectGroup, SelectLabel
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn, toLocalDateStr } from "@/lib/utils";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { SubjectSelect } from "@/components/subjects/SubjectSelect";
import HoldButton from "@/components/ui/HoldButton";

interface QuizDeck {
    id: string;
    nombre: string;
    subject_id: string;
    total_questions: number;
    subject?: { nombre: string; codigo: string; año: number };
}

interface QuizQuestion {
    id: string;
    pregunta: string;
    explicacion: string | null;
    is_multi_select: boolean;
    options: QuizOption[];
}

interface QuizOption {
    id: string;
    texto: string;
    es_correcta: boolean;
}

interface Subject {
    id: string;
    nombre: string;
    codigo: string;
    año: number;
}

let quizzesDecksCache: QuizDeck[] | null = null;
let quizzesSubjectsCache: Subject[] | null = null;

const QUIZZES_CACHE_KEY = "tabe-quizzes-cache";
const QUIZZES_SUBJECTS_CACHE_KEY = "tabe-subjects-cache";

function getCachedQuizzesDecks(): QuizDeck[] {
    if (quizzesDecksCache !== null) return quizzesDecksCache;
    try {
        const stored = localStorage.getItem(QUIZZES_CACHE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                quizzesDecksCache = parsed;
                return parsed;
            }
        }
    } catch (e) {
        console.error("Error reading quizzes cache", e);
    }
    return [];
}

function setCachedQuizzesDecks(decks: QuizDeck[]) {
    quizzesDecksCache = decks;
    try {
        localStorage.setItem(QUIZZES_CACHE_KEY, JSON.stringify(decks));
    } catch (e) {
        console.error("Error saving quizzes cache", e);
    }
}

function getCachedSubjects(): Subject[] {
    if (quizzesSubjectsCache !== null) return quizzesSubjectsCache;
    try {
        const stored = localStorage.getItem(QUIZZES_SUBJECTS_CACHE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                quizzesSubjectsCache = parsed;
                return parsed;
            }
        }
    } catch (e) {
        console.error("Error reading subjects cache", e);
    }
    return [];
}

function setCachedSubjects(subs: Subject[]) {
    quizzesSubjectsCache = subs;
    try {
        localStorage.setItem(QUIZZES_SUBJECTS_CACHE_KEY, JSON.stringify(subs));
    } catch (e) {
        console.error("Error saving subjects cache", e);
    }
}

interface QuizDeckItemProps {
    deck: QuizDeck;
    index: number;
    onDelete: (deck: QuizDeck) => void;
    onManage: (deck: QuizDeck) => void;
    onPractice: (deck: QuizDeck) => void;
}

function QuizDeckItem({ deck, index, onDelete, onManage, onPractice }: QuizDeckItemProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), Math.min(index * 35, 300));
        return () => clearTimeout(timer);
    }, [index]);

    return (
        <div
            className={cn(
                "transition-all duration-200 flex flex-col",
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
        >
            <div className="bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all group flex flex-col flex-1 h-full">
                <div className="flex items-start justify-between mb-3.5">
                    <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300 shadow-2xs">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">{deck.nombre}</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{deck.total_questions} {deck.total_questions === 1 ? 'pregunta' : 'preguntas'}</p>
                        </div>
                    </div>
                    <button
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/95 dark:bg-zinc-800/95 border border-zinc-200/80 dark:border-zinc-700/80 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-2xs transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-2 cursor-pointer"
                        onClick={() => onDelete(deck)}
                        title="Eliminar cuestionario"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {deck.subject && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 mb-4 mt-auto w-fit">
                        <GraduationCap className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Año {deck.subject.año} · {deck.subject.nombre}</span>
                    </div>
                )}
                {!deck.subject && <div className="mt-auto" />}

                <div className="flex gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                    <button
                        className="flex-1 flex items-center justify-center py-2 px-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition-colors shadow-2xs cursor-pointer"
                        onClick={() => onManage(deck)}
                    >
                        <Edit className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                        Gestionar
                    </button>
                    <button
                        className="flex-1 flex items-center justify-center py-2 px-3 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-medium text-xs transition-colors shadow-2xs disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        disabled={deck.total_questions === 0}
                        onClick={() => onPractice(deck)}
                    >
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        Practicar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Quizzes() {
    const { user, isGuest } = useAuth();
    const { canUse, incrementUsage, isPremium } = useUsageLimits();
    const [decks, setDecks] = useState<QuizDeck[]>(() => getCachedQuizzesDecks());
    const [subjects, setSubjects] = useState<Subject[]>(() => getCachedSubjects());
    const [loading, setLoading] = useState(() => quizzesDecksCache === null);

    // Create deck state
    const [newDeckName, setNewDeckName] = useState("");
    const [newDeckYear, setNewDeckYear] = useState<number | null>(null);
    const [newDeckSubject, setNewDeckSubject] = useState("");
    const [showCreateDeck, setShowCreateDeck] = useState(false);

    // Draft questions when creating deck
    interface DraftQuestion {
        pregunta: string;
        explicacion: string;
        is_multi_select: boolean;
        options: { texto: string; es_correcta: boolean }[];
    }
    const [creationQuestions, setCreationQuestions] = useState<DraftQuestion[]>([]);

    // Manage questions state
    const [manageDeck, setManageDeck] = useState<QuizDeck | null>(null);
    const [deckQuestions, setDeckQuestions] = useState<QuizQuestion[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // Unified Question Form State (for adding/editing in deck or drafting during creation)
    interface FormOptionItem {
        id?: string;
        texto: string;
        es_correcta: boolean;
    }
    const [questionFormOpen, setQuestionFormOpen] = useState(false);
    const [questionFormTarget, setQuestionFormTarget] = useState<'manage' | 'draft'>('manage');
    const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
    const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(null);

    const [formQuestionText, setFormQuestionText] = useState("");
    const [formExplanation, setFormExplanation] = useState("");
    const [formIsMultiSelect, setFormIsMultiSelect] = useState(false);
    const [formOptions, setFormOptions] = useState<FormOptionItem[]>([
        { texto: "", es_correcta: true },
        { texto: "", es_correcta: false },
        { texto: "", es_correcta: false },
        { texto: "", es_correcta: false },
    ]);

    // Publish to Marketplace state
    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [publishDescription, setPublishDescription] = useState("");
    const [publishCategory, setPublishCategory] = useState("");
    const [isPublishing, setIsPublishing] = useState(false);

    // Study wrong questions state
    const [wrongQuestionIds, setWrongQuestionIds] = useState<Set<string>>(new Set());
    const [showStudyOptions, setShowStudyOptions] = useState(false);
    const [pendingStudyDeck, setPendingStudyDeck] = useState<QuizDeck | null>(null);
    const [savedWrongIds, setSavedWrongIds] = useState<string[]>([]);
    const [studyOrder, setStudyOrder] = useState<'random' | 'sequential'>(() => {
        const saved = localStorage.getItem('studyOrderPref');
        return (saved === 'random' || saved === 'sequential') ? saved : 'random';
    });

    useEffect(() => {
        localStorage.setItem('studyOrderPref', studyOrder);
    }, [studyOrder]);

    // Study mode state
    const [studyDeck, setStudyDeck] = useState<QuizDeck | null>(null);
    const [studyQuestions, setStudyQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [selectedAnswers, setSelectedAnswers] = useState<Set<string>>(new Set());
    const [answered, setAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [studyTime, setStudyTime] = useState(0);

    // Refs for exit-save
    const studyTimeRef = useRef(0);
    const studyDeckRef = useRef<QuizDeck | null>(null);
    const finishedRef = useRef(false);

    useEffect(() => { studyTimeRef.current = studyTime; }, [studyTime]);
    useEffect(() => { studyDeckRef.current = studyDeck; }, [studyDeck]);
    useEffect(() => { finishedRef.current = finished; }, [finished]);

    // Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (studyDeck && !finished && studyQuestions.length > 0) {
                        interval = setInterval(() => {
                if (document.visibilityState === 'visible') {
                    setStudyTime(prev => prev + 1);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [studyDeck, finished, studyQuestions]);

    // Save study session on tab switch / page close / navigate away
    useEffect(() => {
        const handleExitSave = () => {
            if (studyDeckRef.current && studyTimeRef.current > 0 && !finishedRef.current && user) {
                const deck = studyDeckRef.current;
                supabase.from("study_sessions").insert({
                    user_id: user.id,
                    subject_id: deck.subject_id,
                    duracion_segundos: Math.min(studyTimeRef.current, 43200),
                    tipo: "cuestionario",
                    completada: false,
                    fecha: toLocalDateStr(),
                });
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                handleExitSave();
            }
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleExitSave);
        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleExitSave);
        };
    }, [user]);

    const saveStudySession = async (isCompleted: boolean) => {
        if (isGuest) return;
        if (!user || !studyDeck || studyTime === 0) return;
        try {
            await supabase.from("study_sessions").insert({
                user_id: user.id,
                subject_id: studyDeck.subject_id,
                duracion_segundos: Math.min(studyTime, 43200),
                tipo: "cuestionario",
                completada: isCompleted,
                fecha: toLocalDateStr(),
            });
        } catch (e) {
            console.error("Error saving session", e);
        }
    };

    // Delete confirm
    const [deleteDeck, setDeleteDeck] = useState<QuizDeck | null>(null);

    // Filters
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

    const activeYears = useMemo(() => {
        const unique = [...new Set(subjects.map(s => Number(s.año)).filter(y => !isNaN(y) && y > 0))].sort((a, b) => a - b);
        return unique.filter(year => subjects.some(s => Number(s.año) === year));
    }, [subjects]);

    useEffect(() => {
        if (selectedYear !== null && !activeYears.includes(selectedYear)) {
            setSelectedYear(null);
            setSelectedSubject(null);
        }
    }, [activeYears, selectedYear]);

    const loadInitialData = useCallback(async () => {
        if (!user && !isGuest) {
            setLoading(false);
            return;
        }

        if (isGuest) {
            const guestSubjects: Subject[] = [{ id: "mock", nombre: "Materias Mock", codigo: "MOCK", año: 1 }];
            const guestDecks: QuizDeck[] = [
                { id: "mock-1", nombre: "Cuestionario de Prueba", subject_id: "mock", total_questions: 5, subject: { nombre: "Uso de Tablero", codigo: "TAB1", año: 1 } }
            ];
            setCachedSubjects(guestSubjects);
            setCachedQuizzesDecks(guestDecks);
            setSubjects(guestSubjects);
            setDecks(guestDecks);
            setLoading(false);
            return;
        }

        // Only show spinner if we haven't fetched decks yet
        if (quizzesDecksCache === null) {
            setLoading(true);
        }

        // Safety timeout: Never leave user stuck on loading screen longer than 1.5s
        const safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 1500);

        try {
            const [subjectsRes, decksRes] = await Promise.allSettled([
                (async () => {
                    let query = supabase.from("subjects").select("id, nombre, codigo, año").order("año");
                    if (user) {
                        query = query.eq("user_id", user.id);
                    }
                    const { data } = await query;
                    return (data as unknown as Subject[]) || [];
                })(),
                supabase
                    .from("quiz_decks")
                    .select("id, nombre, subject_id, total_questions")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false })
            ]);

            const loadedSubjects = subjectsRes.status === "fulfilled" && subjectsRes.value.length > 0 
                ? subjectsRes.value 
                : getCachedSubjects();
            const rawDecks = decksRes.status === "fulfilled" && decksRes.value.data ? decksRes.value.data : [];

            const enrichedDecks: QuizDeck[] = rawDecks.map((d: any) => {
                const sub = loadedSubjects.find(s => s.id === d.subject_id);
                return {
                    id: d.id,
                    nombre: d.nombre,
                    subject_id: d.subject_id,
                    total_questions: d.total_questions,
                    subject: sub || undefined
                };
            });

            if (loadedSubjects.length > 0) {
                setCachedSubjects(loadedSubjects);
                setSubjects(loadedSubjects);
            }

            setCachedQuizzesDecks(enrichedDecks);
            setDecks(enrichedDecks);
        } catch (err) {
            console.error("Error loading quizzes data:", err);
        } finally {
            clearTimeout(safetyTimer);
            setLoading(false);
        }
    }, [user, isGuest]);

    const fetchDecks = useCallback(async () => {
        if (!user && !isGuest) return;
        try {
            if (isGuest) return;
            const { data } = await supabase
                .from("quiz_decks")
                .select("id, nombre, subject_id, total_questions")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (data) {
                const subs = getCachedSubjects();
                const enriched: QuizDeck[] = data.map((d: any) => {
                    const sub = subs.find(s => s.id === d.subject_id);
                    return {
                        id: d.id,
                        nombre: d.nombre,
                        subject_id: d.subject_id,
                        total_questions: d.total_questions,
                        subject: sub || undefined
                    };
                });
                setCachedQuizzesDecks(enriched);
                setDecks(enriched);
            }
        } catch (e) {
            console.error("Error fetching decks:", e);
        }
    }, [user, isGuest]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const fetchQuestions = async (deckId: string) => {
        setLoadingQuestions(true);

        if (isGuest) {
            if (deckId === "mock-1") {
                const mockQs = Array.from({ length: 5 }, (_, i) => ({
                    id: `mock-q-${i}`,
                    pregunta: `Aquí puedes colocar preguntas de opción múltiple (Ejemplo #${i + 1})`,
                    explicacion: `Y aquí puedes añadir una explicación detallada que aparecerá cuando elijas una respuesta. Esta es la explicación para la pregunta ${i + 1}.`,
                    is_multi_select: false,
                    options: [
                        { id: `opt-${i}-1`, question_id: `mock-q-${i}`, texto: "Aquí pondrías la respuesta correcta", es_correcta: true },
                        { id: `opt-${i}-2`, question_id: `mock-q-${i}`, texto: "Aquí una respuesta incorrecta", es_correcta: false },
                        { id: `opt-${i}-3`, question_id: `mock-q-${i}`, texto: "Otra opción distractora", es_correcta: false },
                        { id: `opt-${i}-4`, question_id: `mock-q-${i}`, texto: "Y otra distracción más", es_correcta: false }
                    ]
                }));
                setDeckQuestions(mockQs);
            } else {
                setDeckQuestions([]);
            }
            setLoadingQuestions(false);
            return;
        }

        const { data: questions } = await supabase
            .from("quiz_questions")
            .select("id, pregunta, explicacion, is_multi_select")
            .eq("deck_id", deckId)
            .order("created_at");

        if (questions && questions.length > 0) {
            const qIds = questions.map((q: any) => q.id);
            const { data: options } = await supabase
                .from("quiz_options")
                .select("id, question_id, texto, es_correcta")
                .in("question_id", qIds);

            const enriched = questions.map((q: any) => ({
                ...q,
                is_multi_select: q.is_multi_select || false,
                options: (options || []).filter((o: any) => o.question_id === q.id)
            }));
            setDeckQuestions(enriched);
        } else {
            setDeckQuestions([]);
        }
        setLoadingQuestions(false);
    };

    const openAddQuestionForManage = () => {
        setQuestionFormTarget('manage');
        setEditingQuestion(null);
        setEditingDraftIndex(null);
        setFormQuestionText("");
        setFormExplanation("");
        setFormIsMultiSelect(false);
        setFormOptions([
            { texto: "", es_correcta: true },
            { texto: "", es_correcta: false },
            { texto: "", es_correcta: false },
            { texto: "", es_correcta: false },
        ]);
        setQuestionFormOpen(true);
    };

    const openEditQuestionForManage = (q: QuizQuestion) => {
        setQuestionFormTarget('manage');
        setEditingQuestion(q);
        setEditingDraftIndex(null);
        setFormQuestionText(q.pregunta);
        setFormExplanation(q.explicacion || "");
        setFormIsMultiSelect(q.is_multi_select);
        setFormOptions(
            q.options && q.options.length > 0
                ? q.options.map(o => ({ id: o.id, texto: o.texto, es_correcta: o.es_correcta }))
                : [
                    { texto: "", es_correcta: true },
                    { texto: "", es_correcta: false },
                ]
        );
        setQuestionFormOpen(true);
    };

    const openAddQuestionForDraft = () => {
        setQuestionFormTarget('draft');
        setEditingQuestion(null);
        setEditingDraftIndex(null);
        setFormQuestionText("");
        setFormExplanation("");
        setFormIsMultiSelect(false);
        setFormOptions([
            { texto: "", es_correcta: true },
            { texto: "", es_correcta: false },
            { texto: "", es_correcta: false },
            { texto: "", es_correcta: false },
        ]);
        setQuestionFormOpen(true);
    };

    const openEditQuestionForDraft = (index: number) => {
        const qDraft = creationQuestions[index];
        if (!qDraft) return;
        setQuestionFormTarget('draft');
        setEditingQuestion(null);
        setEditingDraftIndex(index);
        setFormQuestionText(qDraft.pregunta);
        setFormExplanation(qDraft.explicacion || "");
        setFormIsMultiSelect(qDraft.is_multi_select);
        setFormOptions(
            qDraft.options.map(o => ({ texto: o.texto, es_correcta: o.es_correcta }))
        );
        setQuestionFormOpen(true);
    };

    const removeQuestionFromDraft = (index: number) => {
        setCreationQuestions(prev => prev.filter((_, i) => i !== index));
        toast.info("Pregunta removida de la lista");
    };

    const handleAddOption = () => {
        setFormOptions(prev => [...prev, { texto: "", es_correcta: false }]);
    };

    const handleDeleteOption = (index: number) => {
        if (formOptions.length <= 2) {
            toast.error("Una pregunta debe tener como mínimo 2 opciones");
            return;
        }
        setFormOptions(prev => {
            const next = prev.filter((_, i) => i !== index);
            if (!next.some(o => o.es_correcta)) {
                next[0].es_correcta = true;
            }
            return next;
        });
    };

    const handleToggleOptionCorrect = (index: number) => {
        setFormOptions(prev => prev.map((opt, i) => {
            if (formIsMultiSelect) {
                return i === index ? { ...opt, es_correcta: !opt.es_correcta } : opt;
            } else {
                return { ...opt, es_correcta: i === index };
            }
        }));
    };

    const handleSetMultiSelect = (multi: boolean) => {
        setFormIsMultiSelect(multi);
        if (!multi) {
            let found = false;
            setFormOptions(prev => prev.map((opt) => {
                if (opt.es_correcta && !found) {
                    found = true;
                    return opt;
                }
                return { ...opt, es_correcta: false };
            }));
            if (!found) {
                setFormOptions(prev => prev.map((opt, i) => ({ ...opt, es_correcta: i === 0 })));
            }
        }
    };

    const handleSaveQuestionForm = async () => {
        if (!formQuestionText.trim()) {
            toast.error("Por favor escribe el texto de la pregunta");
            return;
        }
        const filledOptions = formOptions.filter(o => o.texto.trim());
        if (filledOptions.length < 2) {
            toast.error("Debes ingresar al menos 2 opciones con texto");
            return;
        }
        const correctCount = filledOptions.filter(o => o.es_correcta).length;
        if (correctCount === 0) {
            toast.error("Debes marcar al menos una opción como correcta");
            return;
        }

        if (questionFormTarget === 'draft') {
            const newDraftQ: DraftQuestion = {
                pregunta: formQuestionText.trim(),
                explicacion: formExplanation.trim(),
                is_multi_select: formIsMultiSelect,
                options: filledOptions.map(o => ({
                    texto: o.texto.trim(),
                    es_correcta: o.es_correcta
                }))
            };

            if (editingDraftIndex !== null) {
                setCreationQuestions(prev => prev.map((item, idx) => idx === editingDraftIndex ? newDraftQ : item));
                toast.success("Pregunta actualizada en el borrador");
            } else {
                setCreationQuestions(prev => [...prev, newDraftQ]);
                toast.success("Pregunta agregada al cuestionario");
            }
            setQuestionFormOpen(false);
            return;
        }

        // Target is 'manage'
        if (!manageDeck) return;

        if (editingQuestion) {
            if (isGuest) {
                setDeckQuestions(prev => prev.map(q => q.id === editingQuestion.id ? {
                    ...q,
                    pregunta: formQuestionText.trim(),
                    explicacion: formExplanation.trim() || null,
                    is_multi_select: formIsMultiSelect,
                    options: filledOptions.map((o, idx) => ({
                        id: o.id || `opt-${Date.now()}-${idx}`,
                        question_id: editingQuestion.id,
                        texto: o.texto.trim(),
                        es_correcta: o.es_correcta
                    }))
                } : q));
                toast.success("Pregunta actualizada exitosamente");
                setQuestionFormOpen(false);
                return;
            }

            const { error: qErr } = await supabase.from("quiz_questions").update({
                pregunta: formQuestionText.trim(),
                explicacion: formExplanation.trim() || null,
                is_multi_select: formIsMultiSelect,
            } as any).eq("id", editingQuestion.id);

            if (qErr) {
                toast.error("Error al actualizar la pregunta");
                return;
            }

            await supabase.from("quiz_options").delete().eq("question_id", editingQuestion.id);
            const optionsToInsert = filledOptions.map(o => ({
                question_id: editingQuestion.id,
                texto: o.texto.trim(),
                es_correcta: o.es_correcta
            }));
            await supabase.from("quiz_options").insert(optionsToInsert);

            toast.success("Pregunta actualizada exitosamente");
            setQuestionFormOpen(false);
            fetchQuestions(manageDeck.id);
        } else {
            if (isGuest) {
                const newQId = `mock-q-${Date.now()}`;
                const newQ: QuizQuestion = {
                    id: newQId,
                    pregunta: formQuestionText.trim(),
                    explicacion: formExplanation.trim() || null,
                    is_multi_select: formIsMultiSelect,
                    options: filledOptions.map((o, idx) => ({
                        id: `opt-${newQId}-${idx}`,
                        texto: o.texto.trim(),
                        es_correcta: o.es_correcta
                    }))
                };
                setDeckQuestions(prev => [...prev, newQ]);
                setManageDeck(prev => prev ? { ...prev, total_questions: (prev.total_questions || 0) + 1 } : null);
                toast.success("Pregunta agregada exitosamente");
                setQuestionFormOpen(false);
                return;
            }

            const { data: q, error: qErr } = await supabase.from("quiz_questions").insert({
                deck_id: manageDeck.id,
                user_id: user?.id,
                pregunta: formQuestionText.trim(),
                explicacion: formExplanation.trim() || null,
                is_multi_select: formIsMultiSelect
            } as any).select().single();

            if (qErr || !q) {
                toast.error("Error al crear la pregunta");
                return;
            }

            const optionsToInsert = filledOptions.map(o => ({
                question_id: q.id,
                texto: o.texto.trim(),
                es_correcta: o.es_correcta
            }));
            await supabase.from("quiz_options").insert(optionsToInsert);

            await supabase.from("quiz_decks").update({
                total_questions: (manageDeck.total_questions || 0) + 1,
                updated_at: new Date().toISOString()
            }).eq("id", manageDeck.id);

            toast.success("¡Pregunta agregada exitosamente!");
            setManageDeck({ ...manageDeck, total_questions: (manageDeck.total_questions || 0) + 1 });
            setQuestionFormOpen(false);
            fetchQuestions(manageDeck.id);
            fetchDecks();
        }
    };

    const createDeck = async () => {
        if (!newDeckName.trim()) return;

        if (isGuest) {
            const newDeckId = `mock-${Date.now()}`;
            const newDeck: QuizDeck = {
                id: newDeckId,
                nombre: newDeckName.trim(),
                subject_id: newDeckSubject || "mock",
                total_questions: creationQuestions.length,
                subject: subjects.find(s => s.id === newDeckSubject)
            };
            setDecks(prev => {
                const updated = [newDeck, ...prev];
                setCachedQuizzesDecks(updated);
                return updated;
            });
            toast.success(creationQuestions.length > 0
                ? `Cuestionario creado con ${creationQuestions.length} pregunta(s)`
                : "Cuestionario creado");
            setNewDeckName("");
            setNewDeckSubject("");
            setNewDeckYear(null);
            setCreationQuestions([]);
            setShowCreateDeck(false);
            setManageDeck(newDeck);
            fetchQuestions(newDeck.id);
            return;
        }

        if (!user) return;

        const { data: deckData, error } = await supabase.from("quiz_decks").insert({
            user_id: user.id,
            nombre: newDeckName.trim(),
            subject_id: newDeckSubject || null,
            total_questions: creationQuestions.length
        }).select().single();

        if (error || !deckData) {
            toast.error("Error al crear cuestionario");
            return;
        }

        if (creationQuestions.length > 0) {
            for (const qDraft of creationQuestions) {
                const { data: q, error: qErr } = await supabase.from("quiz_questions").insert({
                    deck_id: deckData.id,
                    user_id: user.id,
                    pregunta: qDraft.pregunta.trim(),
                    explicacion: qDraft.explicacion.trim() || null,
                    is_multi_select: qDraft.is_multi_select
                } as any).select().single();

                if (q && !qErr) {
                    const optionsToInsert = qDraft.options.map(o => ({
                        question_id: q.id,
                        texto: o.texto.trim(),
                        es_correcta: o.es_correcta
                    }));
                    await supabase.from("quiz_options").insert(optionsToInsert);
                }
            }
        }

        toast.success(creationQuestions.length > 0
            ? `¡Cuestionario creado con ${creationQuestions.length} pregunta(s)!`
            : "¡Cuestionario creado! Ya podés cargar preguntas y respuestas.");

        await incrementUsage('cuestionarios');
        setNewDeckName("");
        setNewDeckSubject("");
        setNewDeckYear(null);
        setCreationQuestions([]);
        setShowCreateDeck(false);

        const foundSubject = subjects.find(s => s.id === newDeckSubject);
        const fullDeck: QuizDeck = {
            id: deckData.id,
            user_id: user.id,
            subject_id: deckData.subject_id,
            nombre: deckData.nombre,
            descripcion: deckData.descripcion,
            total_questions: creationQuestions.length,
            created_at: deckData.created_at,
            subject: foundSubject ? {
                id: foundSubject.id,
                nombre: foundSubject.nombre,
                codigo: foundSubject.codigo,
                año: foundSubject.año
            } : undefined
        };
        fetchDecks();
        setManageDeck(fullDeck);
        fetchQuestions(fullDeck.id);
    };

    const deleteQuestion = async (qId: string) => {
        if (!manageDeck) return;
        await supabase.from("quiz_options").delete().eq("question_id", qId);
        await supabase.from("quiz_questions").delete().eq("id", qId);
        await supabase.from("quiz_decks").update({
            total_questions: Math.max(0, (manageDeck.total_questions || 1) - 1),
            updated_at: new Date().toISOString()
        }).eq("id", manageDeck.id);
        toast.success("Pregunta eliminada");
        setManageDeck({ ...manageDeck, total_questions: Math.max(0, (manageDeck.total_questions || 1) - 1) });
        fetchQuestions(manageDeck.id);
        fetchDecks();
    };

    const confirmDeleteDeck = async () => {
        if (!deleteDeck) return;
        // Delete options, questions, then deck
        const { data: qs } = await supabase.from("quiz_questions").select("id").eq("deck_id", deleteDeck.id);
        if (qs && qs.length > 0) {
            const qIds = qs.map((q: any) => q.id);
            await supabase.from("quiz_options").delete().in("question_id", qIds);
            await supabase.from("quiz_questions").delete().eq("deck_id", deleteDeck.id);
        }
        await supabase.from("quiz_decks").delete().eq("id", deleteDeck.id);
        toast.success("Cuestionario eliminado");
        setDeleteDeck(null);
        fetchDecks();
    };

    const updateDeckSubject = async (deckId: string, subjectId: string) => {
        const sub = subjects.find(s => s.id === subjectId);
        const { error } = await supabase.from("quiz_decks").update({
            subject_id: subjectId,
            updated_at: new Date().toISOString()
        }).eq("id", deckId);
        if (error) { toast.error("Error al actualizar materia"); return; }
        toast.success(`Materia asignada: ${sub?.nombre || 'Actualizada'}`);
        if (manageDeck) {
            setManageDeck({ ...manageDeck, subject_id: subjectId, subject: sub });
        }
        fetchDecks();
    };

    const publishToMarketplace = async () => {
        if (!manageDeck || !publishDescription.trim() || !publishCategory.trim()) return;
        setIsPublishing(true);
        const { error } = await supabase.from("quiz_decks").update({
            is_public: true,
            description: publishDescription.trim(),
            category: publishCategory.trim(),
            updated_at: new Date().toISOString()
        } as any).eq("id", manageDeck.id);
        if (error) {
            toast.error("Error al publicar en la Comunidad");
        } else {
            toast.success("¡Cuestionario publicado en la Comunidad!");
            setShowPublishDialog(false);
            setPublishDescription("");
            setPublishCategory("");
        }
        setIsPublishing(false);
    };

    const unpublishFromMarketplace = async () => {
        if (!manageDeck) return;
        const { error } = await supabase.from("quiz_decks").update({
            is_public: false,
            updated_at: new Date().toISOString()
        } as any).eq("id", manageDeck.id);
        if (error) {
            toast.error("Error al retirar de la Comunidad");
        } else {
            toast.success("Cuestionario retirado de la Comunidad");
        }
    };

    // Study Mode
    const checkStudyOptions = (deck: QuizDeck) => {
        setPendingStudyDeck(deck);
        setStudyOrder('random'); // Default

        if (!user || isGuest) {
            setSavedWrongIds([]);
            setShowStudyOptions(true);
            return;
        }
        const savedStr = localStorage.getItem(`quiz_wrong_${user.id}_${deck.id}`);
        if (savedStr) {
            try {
                const parsed = JSON.parse(savedStr);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSavedWrongIds(parsed);
                    setShowStudyOptions(true);
                    return;
                }
            } catch (e) {}
        }
        
        setSavedWrongIds([]);
        setShowStudyOptions(true);
    };

    const startStudy = async (deck: QuizDeck, filterIds: string[] = [], order: 'random' | 'sequential' = 'random') => {
        setStudyDeck(deck);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setSelectedAnswers(new Set());
        setAnswered(false);
        setScore(0);
        setFinished(false);
        setStudyTime(0);
        setWrongQuestionIds(new Set());
        setShowStudyOptions(false);

        if (isGuest) {
            if (deck.id === "mock-1") {
                const mockQs = Array.from({ length: 5 }, (_, i) => ({
                    id: `mock-q-${i}`,
                    pregunta: `Aquí puedes colocar preguntas de opción múltiple (Ejemplo #${i + 1})`,
                    explicacion: `Y aquí puedes añadir una explicacion detallada que aparecerá cuando elijas una respuesta. Esta es la explicación para la pregunta ${i + 1}.`,
                    is_multi_select: false,
                    options: [
                        { id: `opt-${i}-1`, question_id: `mock-q-${i}`, texto: "Aquí pondrías la respuesta correcta", es_correcta: true },
                        { id: `opt-${i}-2`, question_id: `mock-q-${i}`, texto: "Aquí una respuesta incorrecta", es_correcta: false },
                        { id: `opt-${i}-3`, question_id: `mock-q-${i}`, texto: "Otra opción distractora", es_correcta: false },
                        { id: `opt-${i}-4`, question_id: `mock-q-${i}`, texto: "Y otra distracción más", es_correcta: false }
                    ]
                }));
                setStudyQuestions(order === 'random' ? mockQs.sort(() => Math.random() - 0.5) : mockQs);
            } else {
                setStudyQuestions([]);
            }
            return;
        }

        // Fetch all questions with options
        const { data: questions } = await supabase
            .from("quiz_questions")
            .select("id, pregunta, explicacion, is_multi_select")
            .eq("deck_id", deck.id);

        if (questions && questions.length > 0) {
            const qIds = questions.map((q: any) => q.id);
            const { data: options } = await supabase
                .from("quiz_options")
                .select("id, question_id, texto, es_correcta")
                .in("question_id", qIds);

            let enriched = questions.map((q: any) => ({
                ...q,
                is_multi_select: q.is_multi_select || false,
                options: (options || []).filter((o: any) => o.question_id === q.id)
            }));
            
            if (filterIds.length > 0) {
                enriched = enriched.filter((q: any) => filterIds.includes(q.id));
            }

            if (order === 'random') {
                setStudyQuestions(enriched.sort(() => Math.random() - 0.5));
            } else {
                setStudyQuestions(enriched);
            }
        }
    };

    const submitAnswer = () => {
        const currentQ = studyQuestions[currentIndex];
        if (currentQ.is_multi_select) {
            if (selectedAnswers.size === 0 || answered) return;
            setAnswered(true);
            const correctIds = new Set(currentQ.options.filter(o => o.es_correcta).map(o => o.id));
            const isCorrect = correctIds.size === selectedAnswers.size && 
                [...correctIds].every(id => selectedAnswers.has(id));
            if (isCorrect) {
                setScore(prev => prev + 1);
            } else {
                setWrongQuestionIds(prev => new Set(prev).add(currentQ.id));
            }
        } else {
            if (!selectedAnswer || answered) return;
            setAnswered(true);
            const selectedOpt = currentQ.options.find(o => o.id === selectedAnswer);
            if (selectedOpt?.es_correcta) {
                setScore(prev => prev + 1);
            } else {
                setWrongQuestionIds(prev => new Set(prev).add(currentQ.id));
            }
        }
    };

    const nextQuestion = () => {
        if (currentIndex + 1 >= studyQuestions.length) {
            setFinished(true);
            saveStudySession(true);
            if (user && studyDeck) {
                if (wrongQuestionIds.size > 0) {
                    localStorage.setItem(`quiz_wrong_${user.id}_${studyDeck.id}`, JSON.stringify(Array.from(wrongQuestionIds)));
                } else {
                    localStorage.removeItem(`quiz_wrong_${user.id}_${studyDeck.id}`);
                }
            }
        } else {
            setCurrentIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setSelectedAnswers(new Set());
            setAnswered(false);
        }
    };

    const restartStudy = () => {
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setSelectedAnswers(new Set());
        setAnswered(false);
        setScore(0);
        setFinished(false);
        setStudyTime(0);
        setWrongQuestionIds(new Set());
        if (studyOrder === 'random') {
            setStudyQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
        }
    };

    const exitStudy = () => {
        if (!finished && studyTime > 0) {
            saveStudySession(false);
            toast.success("Progreso guardado");
        }
        setStudyDeck(null);
        setStudyQuestions([]);
    };

    // ---------- STUDY MODE VIEW ----------
    if (studyDeck && studyQuestions.length > 0) {
        if (finished) {
            const percentage = Math.round((score / studyQuestions.length) * 100);
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                    <div className="bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl max-w-md w-full rounded-2xl overflow-hidden p-8 text-center space-y-6">
                        <div className={cn(
                            "w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border shadow-xs transition-colors",
                            percentage >= 70
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40"
                                : percentage >= 40
                                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40"
                                : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40"
                        )}>
                            <Trophy className="w-8 h-8" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                {percentage >= 70 ? "¡Excelente trabajo!" : percentage >= 40 ? "¡Buen intento!" : "A seguir practicando"}
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                {percentage >= 70 ? "Dominas los conceptos de este cuestionario." : "Repasa las preguntas incorrectas para afianzar el contenido."}
                            </p>
                        </div>
                        
                        <div className="space-y-2 py-2">
                            <div className="text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                                {score}/{studyQuestions.length}
                            </div>
                            <div className="inline-flex items-center px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-medium border border-zinc-200/60 dark:border-zinc-700/60">
                                {percentage}% de respuestas correctas
                            </div>
                        </div>

                        <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            <Timer className="w-4 h-4 text-zinc-500" />
                            <span>Tiempo de práctica: {Math.floor(studyTime / 60)}:{(studyTime % 60).toString().padStart(2, '0')}</span>
                        </div>

                        <div className="flex gap-3 justify-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <button
                                onClick={exitStudy}
                                className="flex-1 flex items-center justify-center py-2.5 px-4 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition-colors shadow-2xs"
                            >
                                <X className="w-4 h-4 mr-1.5" /> Salir
                            </button>
                            <button
                                onClick={restartStudy}
                                className="flex-1 flex items-center justify-center py-2.5 px-4 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-medium text-xs transition-colors shadow-2xs"
                            >
                                <RotateCcw className="w-4 h-4 mr-1.5" /> Reintentar
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        const currentQ = studyQuestions[currentIndex];
        return (
            <div className="min-h-screen p-4 md:p-8 space-y-6 bg-background">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-3xl mx-auto w-full bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xs">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={exitStudy}
                            className="w-9 h-9 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0 shadow-2xs"
                            title="Volver"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">{studyDeck.nombre}</h2>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-xs font-medium px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md border border-zinc-200/60 dark:border-zinc-700/60">
                                    Pregunta {currentIndex + 1} de {studyQuestions.length}
                                </span>
                                <span className="text-xs font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">
                                    Aciertos: {score}
                                </span>
                                <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md border border-zinc-200/60 dark:border-zinc-700/60">
                                    <Timer className="w-3.5 h-3.5" />
                                    {Math.floor(studyTime / 60)}:{(studyTime % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full md:w-44 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200/60 dark:border-zinc-700/60">
                        <div
                            className="h-full bg-zinc-900 dark:bg-white transition-all duration-300 ease-out"
                            style={{ width: `${((currentIndex + 1) / studyQuestions.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Question Card */}
                <div className="bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs rounded-2xl max-w-3xl mx-auto overflow-hidden p-6 md:p-8 space-y-6">
                    <div className="flex items-start justify-between gap-4">
                        <h3 className="text-lg md:text-xl font-semibold leading-relaxed text-zinc-900 dark:text-zinc-100">{currentQ.pregunta}</h3>
                        {currentQ.is_multi_select && (
                            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                                <ListChecks className="w-3.5 h-3.5" /> Opción Múltiple
                            </span>
                        )}
                    </div>

                    {currentQ.is_multi_select ? (
                        /* Multi-select: checkboxes */
                        <div className="space-y-3">
                            {currentQ.options.map((opt, i) => {
                                const letter = String.fromCharCode(65 + i);
                                const isSelected = selectedAnswers.has(opt.id);
                                
                                let containerClass = "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700";
                                let letterClass = "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300";
                                
                                if (answered) {
                                    containerClass = "cursor-default";
                                    if (opt.es_correcta) {
                                        containerClass += " bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-200";
                                        letterClass = "bg-emerald-500 text-white";
                                    }
                                    else if (isSelected && !opt.es_correcta) {
                                        containerClass += " bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-900 dark:text-rose-200";
                                        letterClass = "bg-rose-500 text-white";
                                    }
                                } else if (isSelected) {
                                    containerClass = "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100 shadow-xs";
                                    letterClass = "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900";
                                }

                                return (
                                    <div
                                        key={opt.id}
                                        className={cn(
                                            "flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all",
                                            containerClass
                                        )}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (answered) return;
                                            setSelectedAnswers(prev => {
                                                const next = new Set(prev);
                                                if (next.has(opt.id)) next.delete(opt.id);
                                                else next.add(opt.id);
                                                return next;
                                            });
                                        }}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 transition-colors",
                                            letterClass
                                        )}>
                                            {answered && opt.es_correcta ? <Check className="w-4 h-4 stroke-[3]" /> :
                                                answered && isSelected && !opt.es_correcta ? <X className="w-4 h-4 stroke-[3]" /> :
                                                    letter}
                                        </div>
                                        <span className="flex-1 font-normal text-sm text-zinc-900 dark:text-zinc-100">{opt.texto}</span>
                                        <Checkbox
                                            checked={isSelected}
                                            className="w-5 h-5 rounded-md pointer-events-none"
                                            disabled={answered}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Single-select: radio buttons */
                        <RadioGroup value={selectedAnswer || ""} onValueChange={(v) => { if (!answered) setSelectedAnswer(v); }}>
                            <div className="space-y-3">
                                {currentQ.options.map((opt, i) => {
                                    const letter = String.fromCharCode(65 + i);
                                    const isSelected = selectedAnswer === opt.id;

                                    let containerClass = "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700";
                                    let letterClass = "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300";

                                    if (answered) {
                                        containerClass = "cursor-default";
                                        if (opt.es_correcta) {
                                            containerClass += " bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-200";
                                            letterClass = "bg-emerald-500 text-white";
                                        }
                                        else if (isSelected && !opt.es_correcta) {
                                            containerClass += " bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-900 dark:text-rose-200";
                                            letterClass = "bg-rose-500 text-white";
                                        }
                                    } else if (isSelected) {
                                        containerClass = "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100 shadow-xs";
                                        letterClass = "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900";
                                    }

                                    return (
                                        <label
                                            key={opt.id}
                                            className={cn(
                                                "flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all relative overflow-hidden group",
                                                containerClass
                                            )}
                                        >
                                            <RadioGroupItem value={opt.id} className="sr-only" />
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 transition-colors",
                                                letterClass
                                            )}>
                                                {answered && opt.es_correcta ? <Check className="w-4 h-4 stroke-[3]" /> :
                                                    answered && isSelected && !opt.es_correcta ? <X className="w-4 h-4 stroke-[3]" /> :
                                                        letter}
                                            </div>
                                            <span className="flex-1 font-normal text-sm text-zinc-900 dark:text-zinc-100">{opt.texto}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </RadioGroup>
                    )}

                    {answered && currentQ.explicacion && (
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl mt-6 flex gap-3 text-sm">
                            <BookOpen className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs mb-1">Explicación</h4>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">{currentQ.explicacion}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-6">
                        {!answered ? (
                            <button 
                                onClick={submitAnswer} 
                                disabled={currentQ.is_multi_select ? selectedAnswers.size === 0 : !selectedAnswer} 
                                className="px-5 py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-medium text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                            >
                                Confirmar Respuesta
                            </button>
                        ) : (
                            <button onClick={nextQuestion} className="flex items-center px-5 py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer">
                                <span>{currentIndex + 1 >= studyQuestions.length ? "Ver Resultados" : "Siguiente Pregunta"}</span>
                                <ChevronRight className="w-4 h-4 ml-1.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const renderQuestionDialog = () => (
        <Dialog open={questionFormOpen} onOpenChange={setQuestionFormOpen}>
            <DialogContent className="bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xl max-w-xl max-h-[90vh] overflow-y-auto p-6">
                <DialogHeader>
                    <DialogTitle className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        {editingQuestion || editingDraftIndex !== null ? (
                            <>
                                <Edit className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                                Editar Pregunta
                            </>
                        ) : (
                            <>
                                <Plus className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                                Nueva Pregunta
                            </>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 pt-3">
                    {/* Question text */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Pregunta *</Label>
                        <Textarea
                            placeholder="Escribe la pregunta aquí..."
                            value={formQuestionText}
                            onChange={(e) => setFormQuestionText(e.target.value)}
                            rows={3}
                            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200/80 dark:border-zinc-800 font-normal text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors resize-none placeholder:text-zinc-400"
                        />
                    </div>

                    {/* Question Type: Single vs Multiple Choice */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            Tipo de Pregunta *
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleSetMultiSelect(false)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer",
                                    !formIsMultiSelect
                                        ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                                        : "bg-white dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                                )}
                            >
                                <div className="w-7 h-7 rounded-full border border-zinc-300 dark:border-zinc-600 flex items-center justify-center mb-1 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
                                    ●
                                </div>
                                <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Opción Única</span>
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">1 respuesta correcta</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSetMultiSelect(true)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer",
                                    formIsMultiSelect
                                        ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                                        : "bg-white dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                                )}
                            >
                                <div className="w-7 h-7 rounded-lg border border-zinc-300 dark:border-zinc-600 flex items-center justify-center mb-1 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
                                    <ListChecks className="w-3.5 h-3.5" />
                                </div>
                                <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Opción Múltiple</span>
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">Elegir varias correctas</span>
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                            {formIsMultiSelect 
                                ? "Haz clic en la letra de cada opción para marcar una o más respuestas correctas." 
                                : "Haz clic en la letra de una opción para seleccionarla como la única correcta."}
                        </p>
                    </div>

                    {/* Dynamic Options */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                {formIsMultiSelect ? "Opciones (marca las correctas)" : "Opciones (marca la correcta)"}
                            </Label>
                            <button
                                type="button"
                                onClick={handleAddOption}
                                className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 transition-colors shadow-2xs"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Agregar Opción
                            </button>
                        </div>

                        <div className="space-y-2">
                            {formOptions.map((opt, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        title={opt.es_correcta ? "Respuesta correcta (Clic para desmarcar)" : "Clic para marcar como correcta"}
                                        onClick={() => handleToggleOptionCorrect(i)}
                                        className={cn(
                                            "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold shrink-0 border transition-all cursor-pointer",
                                            opt.es_correcta
                                                ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs"
                                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                        )}
                                    >
                                        {opt.es_correcta ? <Check className="w-4 h-4 stroke-[3]" /> : String.fromCharCode(65 + i)}
                                    </button>

                                    <input
                                        placeholder={`Opción ${String.fromCharCode(65 + i)} ${i < 2 ? '*' : '(opcional)'}`}
                                        value={opt.texto}
                                        onChange={(e) => {
                                            const copy = [...formOptions];
                                            copy[i] = { ...copy[i], texto: e.target.value };
                                            setFormOptions(copy);
                                        }}
                                        className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200/80 dark:border-zinc-800 font-normal text-xs focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
                                    />

                                    <HoldButton
                                        size="icon"
                                        holdTime={800}
                                        disabled={formOptions.length <= 2}
                                        backgroundColor="#ef4444"
                                        fillColor="#b91c1c"
                                        textColor="#ffffff"
                                        fillTextColor="#ffffff"
                                        icon={<Trash2 className="w-3.5 h-3.5 shrink-0" />}
                                        doneIcon={<Check className="w-3.5 h-3.5 shrink-0" />}
                                        doneLabel=""
                                        onHold={() => handleDeleteOption(i)}
                                        title={formOptions.length <= 2 ? "Se requieren mínimo 2 opciones" : "Mantén presionado para eliminar"}
                                        aria-label="Eliminar esta opción"
                                        className="w-9 h-9 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs transition-colors shrink-0"
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={handleAddOption}
                            className="w-full py-2 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium text-xs border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex items-center justify-center gap-1.5 transition-colors mt-2"
                        >
                            <Plus className="w-3.5 h-3.5" /> Agregar otra opción ({String.fromCharCode(65 + formOptions.length)})
                        </button>
                    </div>

                    {/* Explanation */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Explicación (opcional)</Label>
                        <Textarea
                            placeholder="Explicación de por qué la respuesta es correcta..."
                            value={formExplanation}
                            onChange={(e) => setFormExplanation(e.target.value)}
                            rows={2}
                            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200/80 dark:border-zinc-800 font-normal text-xs focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors resize-none placeholder:text-zinc-400"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={() => setQuestionFormOpen(false)}
                            className="flex-1 py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition-colors shadow-2xs"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveQuestionForm}
                            disabled={!formQuestionText.trim() || formOptions.filter(o => o.texto.trim()).length < 2 || !formOptions.some(o => o.es_correcta)}
                            className="flex-1 py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-medium text-xs rounded-xl shadow-2xs transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {editingQuestion || editingDraftIndex !== null ? "Guardar Cambios" : "Guardar Pregunta"}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );

    // ---------- MANAGE QUESTIONS VIEW ----------
    if (manageDeck) {
        return (
            <div className="min-h-screen p-4 md:p-8 space-y-6 bg-background">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-xs">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <button 
                            onClick={() => { setManageDeck(null); setDeckQuestions([]); }}
                            className="w-9 h-9 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0 shadow-2xs"
                            title="Volver a cuestionarios"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="min-w-0">
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 truncate">{manageDeck.nombre}</h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{manageDeck.total_questions} {manageDeck.total_questions === 1 ? 'pregunta registrada' : 'preguntas registradas'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button 
                            onClick={() => setShowPublishDialog(true)}
                            className="flex items-center px-3.5 py-2 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition-colors shadow-2xs"
                        >
                            <Store className="w-3.5 h-3.5 mr-1.5 text-zinc-500" /> Publicar
                        </button>
                        <button 
                            onClick={openAddQuestionForManage}
                            className="flex items-center px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl font-medium text-xs shadow-xs transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar Pregunta
                        </button>
                    </div>
                </div>

                {/* Subject Assignment */}
                <div className="bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                                <GraduationCap className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Materia asignada</h4>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Vincula este cuestionario a tu plan de estudio</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 flex-1 max-w-sm w-full">
                            <div className="w-full">
                                <SubjectSelect
                                    value={manageDeck.subject_id || ""}
                                    onChange={(val) => {
                                        if (val) updateDeckSubject(manageDeck.id, val);
                                    }}
                                    subjects={subjects}
                                    placeholder="Sin materia asignada"
                                    allowNone={false}
                                    showYearFilter={false}
                                />
                            </div>
                            {manageDeck.subject && (
                                <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0 whitespace-nowrap">
                                    Año {manageDeck.subject.año}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {loadingQuestions ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white rounded-full animate-spin" />
                    </div>
                ) : deckQuestions.length === 0 ? (
                    <div className="bg-white dark:bg-[#1f1f1f] border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-12 text-center shadow-xs">
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-3 text-zinc-400">
                            <ClipboardList className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Aún no hay preguntas en este cuestionario</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 font-normal">Agrega preguntas para empezar a practicar o editar opciones.</p>
                        <button
                            onClick={openAddQuestionForManage}
                            className="inline-flex items-center px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl font-medium text-xs shadow-xs transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar primera pregunta
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {deckQuestions.map((q, qi) => (
                            <div key={q.id} className="bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl p-5 shadow-xs transition-all">
                                <div className="flex items-start justify-between mb-3.5">
                                    <div className="flex-1 min-w-0 pr-3">
                                        <div className="flex items-start gap-2.5">
                                            <span className="flex items-center justify-center w-6 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-md font-semibold text-xs text-zinc-700 dark:text-zinc-300 shrink-0 border border-zinc-200/60 dark:border-zinc-700/60">
                                                {qi + 1}
                                            </span>
                                            <p className="font-semibold text-base text-zinc-900 dark:text-zinc-100 leading-snug">{q.pregunta}</p>
                                        </div>
                                        {q.is_multi_select && (
                                            <span className="inline-flex items-center gap-1 mt-2 ml-8.5 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                                                <ListChecks className="w-3 h-3" /> Opción Múltiple
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button 
                                            onClick={() => openEditQuestionForManage(q)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors shadow-2xs"
                                            title="Editar pregunta"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <HoldButton
                                            size="icon"
                                            holdTime={1200}
                                            backgroundColor="#ef4444"
                                            fillColor="#b91c1c"
                                            textColor="#ffffff"
                                            fillTextColor="#ffffff"
                                            icon={<Trash2 className="w-3.5 h-3.5 shrink-0" />}
                                            doneIcon={<Check className="w-3.5 h-3.5 shrink-0" />}
                                            doneLabel=""
                                            onHold={() => deleteQuestion(q.id)}
                                            title="Mantén presionado para eliminar pregunta"
                                            aria-label="Eliminar pregunta"
                                            className="w-8 h-8 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs transition-colors shrink-0"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2 ml-8.5">
                                    {q.options.map((o, oi) => (
                                        <div key={o.id} className={cn(
                                            "px-3.5 py-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-normal transition-colors",
                                            o.es_correcta 
                                                ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200" 
                                                : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                                        )}>
                                            <span className={cn(
                                                "flex items-center justify-center w-6 h-6 rounded-md font-semibold text-xs shrink-0",
                                                o.es_correcta ? "bg-emerald-500 text-white" : "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                            )}>
                                                {String.fromCharCode(65 + oi)}
                                            </span>
                                            <span className="flex-1">{o.texto}</span>
                                            {o.es_correcta && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                                        </div>
                                    ))}
                                </div>
                                {q.explicacion && (
                                    <div className="mt-3 ml-8.5 p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800 rounded-xl flex gap-2 items-start text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                                        <BookOpen className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                                        <p>{q.explicacion}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {renderQuestionDialog()}

                {/* Publish to Marketplace Dialog */}
                <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
                    <DialogContent className="bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xl max-w-md p-6">
                        <DialogHeader>
                            <DialogTitle className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <Store className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                                Publicar en la Comunidad
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-3">
                            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl flex items-start gap-3">
                                <div className="w-9 h-9 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 rounded-lg flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                                    <ClipboardList className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-snug truncate">{manageDeck.nombre}</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{manageDeck.total_questions} preguntas · {manageDeck.subject?.nombre || 'Sin materia'}</p>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Descripción *</Label>
                                <Textarea
                                    placeholder="Describe este cuestionario para que otros sepan de qué se trata..."
                                    value={publishDescription}
                                    onChange={(e) => setPublishDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs font-normal focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors resize-none placeholder:text-zinc-400"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Categoría / Etiquetas *</Label>
                                <input
                                    placeholder="Ej: Parcial, Final, Resumen..."
                                    value={publishCategory}
                                    onChange={(e) => setPublishCategory(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs font-normal focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors placeholder:text-zinc-400"
                                />
                            </div>
                            <div className="flex gap-2.5 pt-2">
                                <button
                                    onClick={() => setShowPublishDialog(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition-colors shadow-2xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="flex-1 py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-medium text-xs rounded-xl shadow-2xs transition-colors disabled:opacity-50"
                                    onClick={publishToMarketplace}
                                    disabled={isPublishing || !publishDescription.trim() || !publishCategory.trim()}
                                >
                                    {isPublishing ? "Publicando..." : "Publicar Ahora"}
                                </button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // ---------- MAIN DECK LIST VIEW ----------
    return (
        <div className="tabe-page p-4 md:p-8 space-y-6 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-2xl shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-800 dark:text-zinc-200 shadow-2xs">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                            Cuestionarios
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5 font-normal">
                            Crea y practica trivias de opción múltiple por materia
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateDeck(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl font-medium text-xs shadow-xs transition-colors cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Cuestionario
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                            <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">Año académico</span>
                        </div>
                        {selectedYear !== null && (
                            <button
                                onClick={() => { setSelectedYear(null); setSelectedSubject(null); }}
                                className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                            >
                                Limpiar filtro
                            </button>
                        )}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                        <button
                            onClick={() => { setSelectedYear(null); setSelectedSubject(null); }}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer",
                                selectedYear === null
                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                                    : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-800"
                            )}
                        >
                            Todos
                        </button>
                        {activeYears.map(y => (
                            <button
                                key={y}
                                onClick={() => { setSelectedYear(y); setSelectedSubject(null); }}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer",
                                    selectedYear === y
                                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                                        : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-800"
                                )}
                            >
                                {y}° Año
                            </button>
                        ))}
                    </div>
                </div>

                {selectedYear !== null && (
                    <div className="space-y-2.5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80 animate-in fade-in">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                            <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">Materia</span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            <button
                                onClick={() => setSelectedSubject(null)}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer",
                                    selectedSubject === null
                                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                                        : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-800"
                                )}
                            >
                                Todas
                            </button>
                            {subjects.filter(s => s.año === selectedYear).map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => setSelectedSubject(sub.id)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer",
                                        selectedSubject === sub.id
                                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                                            : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-800"
                                    )}
                                >
                                    {sub.nombre}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Decks Grid */}
            <div className="tour-quizzes-decks">
                {loading ? (
                    <LoadingScreen message="Cargando cuestionarios..." submessage="Organizando tus trivias y preguntas de examen" />
                ) : decks.length === 0 && !selectedYear ? (
                    <div className="bg-white dark:bg-[#1f1f1f] border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-12 text-center shadow-xs">
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-3 text-zinc-400">
                            <ClipboardList className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Sin cuestionarios para mostrar</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 font-normal max-w-sm mx-auto">
                            Crea tu primer cuestionario manual o pídele a la IA en un apunte que te genere uno automático.
                        </p>
                        <button 
                            onClick={() => setShowCreateDeck(true)}
                            className="inline-flex items-center px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                            <Plus className="w-4 h-4 mr-1.5" /> Crear Cuestionario
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {decks
                            .filter(d => {
                                if (selectedYear && d.subject?.año !== selectedYear) return false;
                                if (selectedSubject && d.subject_id !== selectedSubject) return false;
                                return true;
                            })
                            .map((deck, index) => (
                                <QuizDeckItem
                                    key={deck.id}
                                    deck={deck}
                                    index={index}
                                    onDelete={(d) => setDeleteDeck(d)}
                                    onManage={(d) => {
                                        setManageDeck(d);
                                        fetchQuestions(d.id);
                                    }}
                                    onPractice={(d) => checkStudyOptions(d)}
                                />
                            ))}
                    </div>
                )}
            </div>

            {/* Create Deck Dialog */}
            <Dialog open={showCreateDeck} onOpenChange={(open) => {
                setShowCreateDeck(open);
                if (!open) {
                    setCreationQuestions([]);
                    setNewDeckName("");
                    setNewDeckSubject("");
                    setNewDeckYear(null);
                }
            }}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xl p-6">
                    <DialogHeader>
                        <DialogTitle className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                            Nuevo Cuestionario
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-3">
                        <div>
                            <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Seleccionar Año *</Label>
                            <div className="flex gap-1.5 mt-1.5">
                                {(activeYears.length > 0 ? activeYears : [1, 2, 3, 4, 5, 6]).map(year => (
                                    <button
                                        key={year}
                                        type="button"
                                        onClick={() => { setNewDeckYear(year); setNewDeckSubject(""); }}
                                        className={cn(
                                            "flex-1 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer",
                                            newDeckYear === year
                                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xs"
                                                : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        )}
                                    >
                                        {year}°
                                    </button>
                                ))}
                            </div>
                        </div>

                        {newDeckYear && (
                            <div className="animate-in fade-in space-y-1.5">
                                <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Materia *</Label>
                                <Select
                                    value={newDeckSubject}
                                    onValueChange={setNewDeckSubject}
                                >
                                    <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl font-normal text-xs py-2.5 px-3 focus:border-zinc-400 dark:focus:border-zinc-600 h-auto transition-colors">
                                        <SelectValue placeholder="Seleccionar materia" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-lg">
                                        {subjects
                                            .filter(s => s.año === newDeckYear)
                                            .map(subject => (
                                                <SelectItem key={subject.id} value={subject.id} className="font-normal text-xs cursor-pointer">
                                                    {subject.nombre}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {newDeckSubject && (
                            <div className="animate-in fade-in space-y-1.5">
                                <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Nombre del Cuestionario *</Label>
                                <input
                                    placeholder="Ej: Parcial 1 - Sistemas Operativos"
                                    value={newDeckName}
                                    onChange={(e) => setNewDeckName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200/80 dark:border-zinc-800 font-normal text-xs focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors placeholder:text-zinc-400"
                                />
                            </div>
                        )}

                        {newDeckSubject && (
                            <div className="animate-in fade-in space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                            <ClipboardList className="w-3.5 h-3.5 text-zinc-500" />
                                            Preguntas preparadas ({creationQuestions.length})
                                        </h4>
                                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                            {creationQuestions.length === 0 
                                                ? "Puedes agregarlas ahora o más tarde" 
                                                : `${creationQuestions.length} pregunta(s) lista(s)`}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openAddQuestionForDraft}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 transition-colors shadow-2xs"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Agregar Pregunta
                                    </button>
                                </div>

                                {creationQuestions.length > 0 && (
                                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                        {creationQuestions.map((qDraft, qIdx) => (
                                            <div key={qIdx} className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl flex items-start justify-between gap-3 shadow-2xs">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="w-5 h-5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold flex items-center justify-center shrink-0">
                                                            {qIdx + 1}
                                                        </span>
                                                        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                                                            {qDraft.is_multi_select ? "Opción Múltiple" : "Opción Única"} · {qDraft.options.length} opciones
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{qDraft.pregunta}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditQuestionForDraft(qIdx)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                                        title="Editar pregunta"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <HoldButton
                                                        size="icon-sm"
                                                        holdTime={800}
                                                        backgroundColor="#ef4444"
                                                        fillColor="#b91c1c"
                                                        textColor="#ffffff"
                                                        fillTextColor="#ffffff"
                                                        icon={<Trash2 className="w-3 h-3 shrink-0" />}
                                                        doneIcon={<Check className="w-3 h-3 shrink-0" />}
                                                        doneLabel=""
                                                        onHold={() => removeQuestionFromDraft(qIdx)}
                                                        title="Mantén presionado para quitar"
                                                        aria-label="Quitar de la lista"
                                                        className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-2xs"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={createDeck}
                            disabled={!newDeckSubject || !newDeckName.trim()}
                            className="w-full py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-medium text-xs rounded-xl shadow-2xs transition-colors disabled:opacity-50 disabled:pointer-events-none mt-2"
                        >
                            {creationQuestions.length > 0
                                ? `Crear Cuestionario (${creationQuestions.length} preguntas)`
                                : "Crear Cuestionario"}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteDeck} onOpenChange={() => setDeleteDeck(null)}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xl p-6">
                    <DialogHeader className="space-y-1 pb-1">
                        <DialogTitle className="font-semibold text-lg text-rose-600 dark:text-rose-400 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            Eliminar Cuestionario
                        </DialogTitle>
                    </DialogHeader>

                    {/* Preview box */}
                    <div className="my-2 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5">
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                            Cuestionario seleccionado
                        </span>
                        <div className="flex items-start justify-between gap-3">
                            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
                                {deleteDeck?.nombre}
                            </h4>
                            {deleteDeck?.subject?.nombre && (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                                    {deleteDeck.subject.nombre}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
                            Contiene <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{deleteDeck?.total_questions ?? 0}</strong> preguntas guardadas.
                        </p>
                    </div>

                    {/* Warning Notice */}
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed font-normal">
                            Esta acción es <strong className="font-semibold">permanente e irreversible</strong>. Se eliminará el cuestionario junto con todas sus preguntas y opciones asociadas.
                        </p>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <button 
                            className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition-colors shadow-2xs"
                            onClick={() => setDeleteDeck(null)}
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
                            icon={<Trash2 className="w-4 h-4 mr-1.5 shrink-0" />}
                            doneIcon={<Check className="w-4 h-4 mr-1.5 shrink-0" />}
                            doneLabel="Eliminado"
                            onHold={confirmDeleteDeck}
                            className="flex-1 py-2.5 px-4 rounded-xl font-medium text-xs shadow-2xs justify-center"
                        >
                            Mantener para eliminar
                        </HoldButton>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Study Options Dialog */}
            <Dialog open={showStudyOptions} onOpenChange={setShowStudyOptions}>
                <DialogContent className="bg-white dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xl max-w-sm p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-semibold text-lg text-zinc-900 dark:text-zinc-100">
                            <Zap className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                            Opciones de Práctica
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 pt-3">
                        {savedWrongIds.length > 0 && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                                <p className="font-medium">
                                    Tienes {savedWrongIds.length} pregunta(s) marcadas como erróneas en tu último intento.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Orden de las preguntas</Label>
                            <RadioGroup value={studyOrder} onValueChange={(v: any) => setStudyOrder(v)}>
                                <div className="flex flex-col gap-2">
                                    <label className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                                        studyOrder === 'random' ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-100 shadow-2xs" : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                                    )}>
                                        <RadioGroupItem value="random" className="sr-only" />
                                        <div className={cn(
                                            "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                                            studyOrder === 'random' ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100" : "border-zinc-400 dark:border-zinc-600 bg-transparent"
                                        )}>
                                            {studyOrder === 'random' && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-900" />}
                                        </div>
                                        <span className="font-medium text-xs text-zinc-900 dark:text-zinc-100">Al azar (Recomendado)</span>
                                    </label>
                                    <label className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                                        studyOrder === 'sequential' ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-100 shadow-2xs" : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                                    )}>
                                        <RadioGroupItem value="sequential" className="sr-only" />
                                        <div className={cn(
                                            "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                                            studyOrder === 'sequential' ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100" : "border-zinc-400 dark:border-zinc-600 bg-transparent"
                                        )}>
                                            {studyOrder === 'sequential' && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-900" />}
                                        </div>
                                        <span className="font-medium text-xs text-zinc-900 dark:text-zinc-100">Orden original</span>
                                    </label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="flex flex-col gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-3">
                            {savedWrongIds.length > 0 && (
                                <button 
                                    className="w-full py-2.5 bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200/60 dark:border-rose-800/40 rounded-xl font-medium text-xs transition-colors shadow-2xs cursor-pointer"
                                    onClick={() => {
                                        if (pendingStudyDeck) startStudy(pendingStudyDeck, savedWrongIds, studyOrder);
                                    }}
                                >
                                    Repasar solo errores ({savedWrongIds.length})
                                </button>
                            )}
                            <button 
                                className="w-full py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl font-medium text-xs transition-colors shadow-2xs cursor-pointer"
                                onClick={() => {
                                    if (pendingStudyDeck) startStudy(pendingStudyDeck, [], studyOrder);
                                }}
                            >
                                {savedWrongIds.length > 0 ? "Estudiar todas las preguntas" : "Comenzar Práctica"}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Question Editor Dialog in Main View */}
            {renderQuestionDialog()}
        </div>
    );
}

