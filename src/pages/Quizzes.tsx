import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
    ClipboardList, Plus, Sparkles, GraduationCap,
    BookOpen, Zap, Trash2, X, Check, ChevronRight,
    ChevronLeft, Trophy, RotateCcw, Upload, Store,
    Edit, AlertCircle, Filter, Timer, ListChecks
} from "lucide-react";
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

export default function Quizzes() {
    const { user, isGuest } = useAuth();
    const { canUse, incrementUsage, isPremium } = useUsageLimits();
    const [decks, setDecks] = useState<QuizDeck[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);

    // Create deck state
    const [newDeckName, setNewDeckName] = useState("");
    const [newDeckYear, setNewDeckYear] = useState<number | null>(null);
    const [newDeckSubject, setNewDeckSubject] = useState("");
    const [showCreateDeck, setShowCreateDeck] = useState(false);

    // Manage questions state
    const [manageDeck, setManageDeck] = useState<QuizDeck | null>(null);
    const [deckQuestions, setDeckQuestions] = useState<QuizQuestion[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // Add question state
    const [showAddQuestion, setShowAddQuestion] = useState(false);
    const [newQuestion, setNewQuestion] = useState("");
    const [newExplanation, setNewExplanation] = useState("");
    const [newOptions, setNewOptions] = useState(["", "", "", "", ""]);
    const [correctOptions, setCorrectOptions] = useState<Set<number>>(new Set([0]));
    const [isMultiSelect, setIsMultiSelect] = useState(false);

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
                setStudyTime(prev => prev + 1);
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
                    duracion_segundos: studyTimeRef.current,
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
                duracion_segundos: studyTime,
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

    const fetchSubjects = useCallback(async () => {
        if (isGuest) {
            setSubjects([{ id: "mock", nombre: "Materias Mock", codigo: "MOCK", año: 1 }]);
            return;
        }
        const { data } = await supabase.from("subjects").select("id, nombre, codigo, año").order("año");
        setSubjects((data as unknown as Subject[]) || []);
    }, [isGuest]);

    const fetchDecks = useCallback(async () => {
        if (!user && !isGuest) return;
        setLoading(true);

        if (isGuest) {
            setDecks([
                { id: "mock-1", nombre: "Cuestionario de Prueba", subject_id: "mock", total_questions: 5, subject: { nombre: "Uso de Tablero", codigo: "TAB1", año: 1 } }
            ]);
            setLoading(false);
            return;
        }

        const { data } = await supabase
            .from("quiz_decks")
            .select("id, nombre, subject_id, total_questions")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        // Enrich with subject info
        const enriched = (data || []).map((d: any) => {
            const sub = subjects.find(s => s.id === d.subject_id);
            return { ...d, subject: sub || undefined };
        });
        setDecks(enriched);
        setLoading(false);
    }, [user, subjects]);

    useEffect(() => { fetchSubjects(); }, [fetchSubjects]);
    useEffect(() => { if (subjects.length > 0) fetchDecks(); }, [subjects, fetchDecks]);

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

    const createDeck = async () => {
        if (!newDeckName.trim() || !user) return;

        // Acceso ilimitado (Ads-only model)

        const { error } = await supabase.from("quiz_decks").insert({
            user_id: user.id,
            nombre: newDeckName.trim(),
            subject_id: newDeckSubject || null,
            total_questions: 0
        });
        if (error) { toast.error("Error al crear cuestionario"); return; }
        toast.success("Cuestionario creado");
        await incrementUsage('cuestionarios');
        setNewDeckName("");
        setNewDeckSubject("");
        setShowCreateDeck(false);
        fetchDecks();
    };

    const addQuestion = async () => {
        if (!newQuestion.trim() || !manageDeck || !user) return;

        // No per-quiz question limit - unlimited questions per quiz

        const filledOptions = newOptions.filter(o => o.trim());
        if (filledOptions.length < 2) { toast.error("Al menos 2 opciones son necesarias"); return; }

        if (correctOptions.size === 0) { toast.error("Selecciona al menos una respuesta correcta"); return; }

        // Insert question
        const { data: q, error } = await supabase.from("quiz_questions").insert({
            deck_id: manageDeck.id,
            user_id: user.id,
            pregunta: newQuestion.trim(),
            explicacion: newExplanation.trim() || null,
            is_multi_select: isMultiSelect
        } as any).select().single();

        if (error || !q) { toast.error("Error al crear pregunta"); return; }

        // Insert options
        const optionsToInsert = newOptions
            .map((o, i) => ({
                question_id: q.id,
                texto: o.trim(),
                es_correcta: correctOptions.has(i)
            }))
            .filter(o => o.texto !== "");

        await supabase.from("quiz_options").insert(optionsToInsert);

        // Update total_questions
        await supabase.from("quiz_decks").update({
            total_questions: (manageDeck.total_questions || 0) + 1,
            updated_at: new Date().toISOString()
        }).eq("id", manageDeck.id);

        toast.success("¡Pregunta agregada! Podés seguir creando más.");
        setNewQuestion("");
        setNewExplanation("");
        setNewOptions(["", "", "", "", ""]);
        setCorrectOptions(new Set([0]));
        setIsMultiSelect(false);
        // Keep modal open so user can continue creating questions
        setManageDeck({ ...manageDeck, total_questions: (manageDeck.total_questions || 0) + 1 });
        fetchQuestions(manageDeck.id);
        fetchDecks();
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
            toast.error("Error al publicar en Marketplace");
        } else {
            toast.success("¡Cuestionario publicado en el Marketplace!");
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
            toast.error("Error al retirar del Marketplace");
        } else {
            toast.success("Cuestionario retirado del Marketplace");
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
                <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
                    {/* Decorative Elements */}
                    <div className="absolute top-10 left-10 w-24 h-24 bg-[#ff4e4e] rounded-full border-[3px] border-foreground shadow-[8px_8px_0_0_#000] animate-bounce delay-100 hidden md:block" />
                    <div className="absolute bottom-10 right-10 w-32 h-32 bg-[#1475e5] rounded-xl rotate-12 border-[3px] border-foreground shadow-[8px_8px_0_0_#000] hidden md:block" />
                    
                    <Card className="bg-background border-[3px] border-foreground shadow-[12px_12px_0_0_#000] max-w-lg w-full relative z-10 rounded-2xl overflow-hidden">
                        <div className="bg-[#ffd21c] border-b-[3px] border-foreground p-6 text-center">
                            <h2 className="text-3xl font-display font-black uppercase tracking-widest text-foreground">
                                {percentage >= 70 ? "¡Excelente!" : percentage >= 40 ? "¡Buen Intento!" : "A Seguir Practicando"}
                            </h2>
                        </div>
                        <CardContent className="p-8 text-center space-y-8">
                            <div className={cn(
                                "w-24 h-24 rounded-2xl mx-auto flex items-center justify-center border-[3px] border-foreground shadow-[6px_6px_0_0_#000] rotate-[-5deg]",
                                percentage >= 70 ? "bg-[#25d06c]" : percentage >= 40 ? "bg-[#ffd21c]" : "bg-[#ff4e4e]"
                            )}>
                                <Trophy className="w-12 h-12 text-white" />
                            </div>
                            
                            <div className="space-y-2">
                                <div className="text-6xl font-display font-black text-foreground drop-shadow-[2px_2px_0_#000]">
                                    {score}/{studyQuestions.length}
                                </div>
                                <div className="inline-block px-4 py-2 bg-background border-[2px] border-foreground rounded-lg shadow-[4px_4px_0_0_#000] rotate-2">
                                    <p className="text-sm font-black uppercase tracking-widest text-foreground">{percentage}% correctas</p>
                                </div>
                            </div>

                            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-secondary border-[2px] border-foreground rounded-lg shadow-[2px_2px_0_0_#000]">
                                <Timer className="w-5 h-5 text-foreground" />
                                <span className="text-sm font-black text-foreground">
                                    {Math.floor(studyTime / 60)}:{(studyTime % 60).toString().padStart(2, '0')}
                                </span>
                            </div>

                            <div className="flex gap-4 justify-center pt-4">
                                <button onClick={exitStudy} className="flex items-center px-6 py-3 bg-background text-foreground font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all">
                                    <X className="w-5 h-5 mr-2" /> Salir
                                </button>
                                <button onClick={restartStudy} className="flex items-center px-6 py-3 bg-[#00ffcc] text-foreground font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all">
                                    <RotateCcw className="w-5 h-5 mr-2" /> Reintentar
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        const currentQ = studyQuestions[currentIndex];
        return (
            <div className="min-h-screen p-4 md:p-8 space-y-8 bg-background">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-3xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={exitStudy}
                            className="w-12 h-12 flex items-center justify-center bg-background border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all shrink-0"
                        >
                            <ChevronLeft className="w-6 h-6 text-foreground" />
                        </button>
                        <div>
                            <h2 className="text-xl font-display font-black uppercase tracking-widest text-foreground">{studyDeck.nombre}</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-xs font-black uppercase tracking-widest px-2 py-1 bg-[#1475e5] text-white border-[2px] border-foreground rounded-md shadow-[2px_2px_0_0_#000]">
                                    {currentIndex + 1} / {studyQuestions.length}
                                </span>
                                <span className="text-xs font-black uppercase tracking-widest px-2 py-1 bg-[#25d06c] text-white border-[2px] border-foreground rounded-md shadow-[2px_2px_0_0_#000]">
                                    Correctas: {score}
                                </span>
                                <span className="flex items-center gap-1 text-xs font-black uppercase tracking-widest px-2 py-1 bg-background text-foreground border-[2px] border-foreground rounded-md shadow-[2px_2px_0_0_#000]">
                                    <Timer className="w-3 h-3" />
                                    {Math.floor(studyTime / 60)}:{(studyTime % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full md:w-48 h-4 bg-secondary border-[2px] border-foreground rounded-full overflow-hidden shadow-[2px_2px_0_0_#000]">
                        <div
                            className="h-full bg-[#ff4e4e] transition-all duration-500 ease-out border-r-[2px] border-foreground"
                            style={{ width: `${((currentIndex + 1) / studyQuestions.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Question Card */}
                <Card className="bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl max-w-3xl mx-auto overflow-hidden">
                    <CardContent className="p-6 md:p-8 space-y-8">
                        <div className="flex items-start justify-between gap-4">
                            <h3 className="text-xl md:text-2xl font-bold leading-relaxed text-foreground">{currentQ.pregunta}</h3>
                            {currentQ.is_multi_select && (
                                <Badge className="shrink-0 bg-[#ffd21c] text-black border-[2px] border-foreground shadow-[2px_2px_0_0_#000] font-black uppercase tracking-wider hover:bg-[#ffd21c]">
                                    <ListChecks className="w-4 h-4 mr-1" /> Múltiple
                                </Badge>
                            )}
                        </div>

                        {currentQ.is_multi_select ? (
                            /* Multi-select: checkboxes */
                            <div className="space-y-4">
                                {currentQ.options.map((opt, i) => {
                                    const letter = String.fromCharCode(65 + i);
                                    const isSelected = selectedAnswers.has(opt.id);
                                    
                                    let optClass = "bg-background hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000]";
                                    let letterClass = "bg-secondary text-foreground";
                                    
                                    if (answered) {
                                        optClass = "cursor-default";
                                        if (opt.es_correcta) {
                                            optClass += " bg-[#25d06c]/20 border-[#25d06c] shadow-[2px_2px_0_0_#25d06c]";
                                            letterClass = "bg-[#25d06c] text-white";
                                        }
                                        else if (isSelected && !opt.es_correcta) {
                                            optClass += " bg-[#ff4e4e]/20 border-[#ff4e4e] shadow-[2px_2px_0_0_#ff4e4e]";
                                            letterClass = "bg-[#ff4e4e] text-white";
                                        }
                                    } else if (isSelected) {
                                        optClass += " bg-[#00ffcc] border-foreground shadow-[4px_4px_0_0_#000] -translate-y-1";
                                        letterClass = "bg-foreground text-white";
                                    }

                                    return (
                                        <div
                                            key={opt.id}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-xl border-[3px] border-foreground cursor-pointer transition-all",
                                                optClass
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
                                                "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black shrink-0 border-[2px] border-foreground transition-colors",
                                                letterClass
                                            )}>
                                                {answered && opt.es_correcta ? <Check className="w-6 h-6" /> :
                                                    answered && isSelected && !opt.es_correcta ? <X className="w-6 h-6" /> :
                                                        letter}
                                            </div>
                                            <span className="flex-1 font-semibold text-lg">{opt.texto}</span>
                                            <Checkbox
                                                checked={isSelected}
                                                className="w-6 h-6 border-[2px] border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-white pointer-events-none rounded-md"
                                                disabled={answered}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Single-select: radio buttons */
                            <RadioGroup value={selectedAnswer || ""} onValueChange={(v) => { if (!answered) setSelectedAnswer(v); }}>
                                <div className="space-y-4">
                                    {currentQ.options.map((opt, i) => {
                                        const letter = String.fromCharCode(65 + i);
                                        const isSelected = selectedAnswer === opt.id;

                                        let optClass = "bg-background hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000]";
                                        let letterClass = "bg-secondary text-foreground";

                                        if (answered) {
                                            optClass = "cursor-default";
                                            if (opt.es_correcta) {
                                                optClass += " bg-[#25d06c]/20 border-[#25d06c] shadow-[2px_2px_0_0_#25d06c]";
                                                letterClass = "bg-[#25d06c] text-white";
                                            }
                                            else if (isSelected && !opt.es_correcta) {
                                                optClass += " bg-[#ff4e4e]/20 border-[#ff4e4e] shadow-[2px_2px_0_0_#ff4e4e]";
                                                letterClass = "bg-[#ff4e4e] text-white";
                                            }
                                        } else if (isSelected) {
                                            optClass += " bg-[#00ffcc] border-foreground shadow-[4px_4px_0_0_#000] -translate-y-1";
                                            letterClass = "bg-foreground text-white";
                                        }

                                        return (
                                            <label
                                                key={opt.id}
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-xl border-[3px] border-foreground cursor-pointer transition-all relative overflow-hidden group",
                                                    optClass
                                                )}
                                            >
                                                <RadioGroupItem value={opt.id} className="sr-only" />
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black shrink-0 border-[2px] border-foreground transition-colors",
                                                    letterClass
                                                )}>
                                                    {answered && opt.es_correcta ? <Check className="w-6 h-6" /> :
                                                        answered && isSelected && !opt.es_correcta ? <X className="w-6 h-6" /> :
                                                            letter}
                                                </div>
                                                <span className="flex-1 font-semibold text-lg">{opt.texto}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </RadioGroup>
                        )}

                        {answered && currentQ.explicacion && (
                            <div className="p-4 bg-background border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] mt-6 flex gap-4">
                                <div className="w-10 h-10 shrink-0 bg-[#ffd21c] border-[2px] border-foreground rounded-lg flex items-center justify-center rotate-[-5deg]">
                                    <Sparkles className="w-6 h-6 text-black" />
                                </div>
                                <div>
                                    <h4 className="font-black uppercase tracking-widest text-foreground text-sm mb-1">Explicación</h4>
                                    <p className="text-base font-medium text-foreground">{currentQ.explicacion}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t-[3px] border-foreground border-dashed mt-6">
                            {!answered ? (
                                <button 
                                    onClick={submitAnswer} 
                                    disabled={currentQ.is_multi_select ? selectedAnswers.size === 0 : !selectedAnswer} 
                                    className="px-6 py-3 bg-[#1475e5] text-white font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:pointer-events-none transition-all"
                                >
                                    Confirmar Respuesta
                                </button>
                            ) : (
                                <button onClick={nextQuestion} className="flex items-center px-6 py-3 bg-[#ff4e4e] text-white font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all">
                                    {currentIndex + 1 >= studyQuestions.length ? "Ver Resultado" : "Siguiente"}
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ---------- MANAGE QUESTIONS VIEW ----------
    if (manageDeck) {
        return (
            <div className="min-h-screen p-4 md:p-8 space-y-8 bg-background">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => { setManageDeck(null); setDeckQuestions([]); }}
                            className="w-12 h-12 flex items-center justify-center bg-background border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all shrink-0"
                        >
                            <ChevronLeft className="w-6 h-6 text-foreground" />
                        </button>
                        <div>
                            <h2 className="text-2xl font-display font-black uppercase tracking-widest text-foreground">{manageDeck.nombre}</h2>
                            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{manageDeck.total_questions} preguntas</p>
                        </div>
                    </div>
                    <div className="md:ml-auto flex items-center gap-3">
                        <button 
                            onClick={() => setShowPublishDialog(true)}
                            className="flex items-center px-4 py-2 bg-[#ff4e4e] text-white font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all text-sm"
                        >
                            <Store className="w-4 h-4 mr-2" /> Publicar
                        </button>
                        <button 
                            onClick={() => setShowAddQuestion(true)}
                            className="flex items-center px-4 py-2 bg-[#1475e5] text-white font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all text-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Agregar Pregunta
                        </button>
                    </div>
                </div>

                {/* Subject Assignment */}
                <Card className="bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#00ffcc] border-[2px] border-foreground rounded-lg flex items-center justify-center shrink-0">
                                    <GraduationCap className="w-5 h-5 text-foreground" />
                                </div>
                                <Label className="font-black uppercase tracking-widest text-foreground">Materia asignada</Label>
                            </div>
                            
                            <div className="w-full md:w-auto flex-1 max-w-md">
                                <Select 
                                    value={manageDeck.subject_id || "none"}
                                    onValueChange={(val) => {
                                        if (val !== "none") updateDeckSubject(manageDeck.id, val);
                                    }}
                                >
                                    <SelectTrigger className="w-full px-4 py-6 h-auto bg-background rounded-xl border-[3px] border-foreground font-black shadow-[4px_4px_0_0_#000] focus:ring-0 focus:outline-none focus:shadow-[6px_6px_0_0_#000] transition-all text-sm data-[state=open]:shadow-[6px_6px_0_0_#000]">
                                        <SelectValue placeholder="Sin materia asignada" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-xl">
                                        <SelectItem value="none" className="font-bold uppercase tracking-widest text-muted-foreground focus:bg-secondary cursor-pointer rounded-lg my-1">
                                            Sin materia asignada
                                        </SelectItem>
                                        {[1, 2, 3, 4, 5, 6].map(year => {
                                            const yearSubjects = subjects.filter(s => s.año === year);
                                            if (yearSubjects.length === 0) return null;
                                            return (
                                                <SelectGroup key={year}>
                                                    <SelectLabel className="font-black uppercase tracking-widest text-muted-foreground">{year}° Año</SelectLabel>
                                                    {yearSubjects.map(s => (
                                                        <SelectItem key={s.id} value={s.id} className="font-bold focus:bg-secondary cursor-pointer rounded-lg my-1">
                                                            {s.nombre}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            {manageDeck.subject && (
                                <Badge className="bg-[#ffd21c] text-black border-[2px] border-foreground shadow-[2px_2px_0_0_#000] font-black uppercase tracking-wider px-3 py-1.5 shrink-0 hover:bg-[#ffd21c]">
                                    Año {manageDeck.subject.año} · {manageDeck.subject.nombre}
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {loadingQuestions ? (
                    <div className="flex justify-center py-12">
                        <div className="w-12 h-12 border-4 border-foreground border-t-[#00ffcc] rounded-full animate-spin shadow-[4px_4px_0_0_#000]" />
                    </div>
                ) : deckQuestions.length === 0 ? (
                    <Card className="bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl border-dashed">
                        <CardContent className="p-12 text-center">
                            <div className="w-20 h-20 bg-secondary border-[3px] border-foreground rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-[-5deg] shadow-[4px_4px_0_0_#000]">
                                <ClipboardList className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-widest text-foreground mb-2">Aún no hay preguntas</h3>
                            <p className="text-muted-foreground font-bold">¡Agregá la primera pregunta para empezar a estudiar!</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {deckQuestions.map((q, qi) => (
                            <Card key={q.id} className="bg-background border-[3px] border-foreground shadow-[6px_6px_0_0_#000] rounded-2xl overflow-hidden hover:shadow-[8px_8px_0_0_#000] transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-start gap-3">
                                                <span className="flex items-center justify-center w-8 h-8 bg-secondary border-[2px] border-foreground rounded-lg font-black shrink-0 text-sm">
                                                    {qi + 1}
                                                </span>
                                                <p className="font-bold text-lg leading-snug">{q.pregunta}</p>
                                            </div>
                                            {q.is_multi_select && (
                                                <Badge className="mt-3 ml-11 bg-[#ffd21c] text-black border-[2px] border-foreground shadow-[2px_2px_0_0_#000] font-black uppercase tracking-wider text-xs hover:bg-[#ffd21c]">
                                                    <ListChecks className="w-3 h-3 mr-1" /> Múltiple
                                                </Badge>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => deleteQuestion(q.id)}
                                            className="w-10 h-10 flex items-center justify-center bg-[#ff4e4e] text-white border-[2px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all shrink-0 ml-4"
                                            title="Eliminar pregunta"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="grid gap-3 ml-11">
                                        {q.options.map((o, oi) => (
                                            <div key={o.id} className={cn(
                                                "px-4 py-3 rounded-xl border-[2px] border-foreground flex items-center gap-3 font-semibold text-sm",
                                                o.es_correcta 
                                                    ? "bg-[#25d06c]/20 shadow-[2px_2px_0_0_#25d06c]" 
                                                    : "bg-secondary"
                                            )}>
                                                <span className={cn(
                                                    "flex items-center justify-center w-7 h-7 rounded-md border-[2px] border-foreground font-black text-xs shrink-0",
                                                    o.es_correcta ? "bg-[#25d06c] text-white" : "bg-background text-foreground"
                                                )}>
                                                    {String.fromCharCode(65 + oi)}
                                                </span>
                                                <span className="flex-1">{o.texto}</span>
                                                {o.es_correcta && <Check className="w-4 h-4 text-[#25d06c]" />}
                                            </div>
                                        ))}
                                    </div>
                                    {q.explicacion && (
                                        <div className="mt-4 ml-11 p-3 bg-secondary/50 border-[2px] border-foreground border-dashed rounded-xl flex gap-2 items-start">
                                            <Sparkles className="w-4 h-4 text-[#ffd21c] shrink-0 mt-0.5" />
                                            <p className="text-sm font-medium text-foreground">{q.explicacion}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Add Question Dialog */}
                <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
                    <DialogContent className="bg-background border-[3px] border-foreground rounded-2xl shadow-[8px_8px_0_0_#000] max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="font-display font-black uppercase tracking-widest text-xl text-foreground">Nueva Pregunta</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 pt-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pregunta *</Label>
                                <Textarea
                                    placeholder="Escribe la pregunta..."
                                    value={newQuestion}
                                    onChange={(e) => setNewQuestion(e.target.value)}
                                    rows={2}
                                    className="w-full px-4 py-3 bg-background rounded-xl border-[2px] border-foreground font-medium shadow-[2px_2px_0_0_#000] focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-all"
                                />
                            </div>

                            {/* Multi-select toggle */}
                            <div className="flex items-center justify-between p-4 bg-background rounded-xl border-[2px] border-foreground shadow-[2px_2px_0_0_#000]">
                                <div className="flex items-center gap-3">
                                    <ListChecks className="w-5 h-5 text-[#ffd21c]" />
                                    <Label className="text-sm font-black uppercase tracking-widest cursor-pointer">Permitir múltiples respuestas</Label>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMultiSelect(!isMultiSelect);
                                        setCorrectOptions(new Set([0]));
                                    }}
                                    className={cn(
                                        "relative w-12 h-6 border-[2px] border-foreground rounded-full transition-colors",
                                        isMultiSelect ? "bg-[#25d06c]" : "bg-secondary"
                                    )}
                                >
                                    <span className={cn(
                                        "absolute top-0.5 left-0.5 w-4 h-4 rounded-full border-[2px] border-foreground bg-white transition-transform",
                                        isMultiSelect && "translate-x-6"
                                    )} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{isMultiSelect ? "Opciones (marcar las correctas)" : "Opciones (marcar la correcta)"}</Label>
                                {newOptions.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isMultiSelect) {
                                                    setCorrectOptions(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(i)) next.delete(i);
                                                        else next.add(i);
                                                        return next;
                                                    });
                                                } else {
                                                    setCorrectOptions(new Set([i]));
                                                }
                                            }}
                                            className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black shrink-0 border-[2px] border-foreground transition-all",
                                                correctOptions.has(i)
                                                    ? "bg-[#25d06c] text-white shadow-[2px_2px_0_0_#25d06c]"
                                                    : "bg-secondary hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#000]"
                                            )}
                                        >
                                            {correctOptions.has(i) ? <Check className="w-5 h-5" /> : String.fromCharCode(65 + i)}
                                        </button>
                                        <input
                                            placeholder={`Opción ${String.fromCharCode(65 + i)}${i < 2 ? " *" : " (opcional)"}`}
                                            value={opt}
                                            onChange={(e) => {
                                                const copy = [...newOptions];
                                                copy[i] = e.target.value;
                                                setNewOptions(copy);
                                            }}
                                            className="w-full px-4 py-2.5 bg-background rounded-lg border-[2px] border-foreground font-medium shadow-[2px_2px_0_0_#000] focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-all"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Explicación (opcional)</Label>
                                <Textarea
                                    placeholder="Explicación de por qué la respuesta es correcta..."
                                    value={newExplanation}
                                    onChange={(e) => setNewExplanation(e.target.value)}
                                    rows={2}
                                    className="w-full px-4 py-3 bg-background rounded-xl border-[2px] border-foreground font-medium shadow-[2px_2px_0_0_#000] focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-all"
                                />
                            </div>
                            <button
                                className="w-full py-3 bg-[#1475e5] text-white font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:pointer-events-none transition-all"
                                onClick={addQuestion}
                                disabled={!newQuestion.trim() || newOptions.filter(o => o.trim()).length < 2 || correctOptions.size === 0}
                            >
                                Agregar Pregunta
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Publish to Marketplace Dialog */}
                <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
                    <DialogContent className="bg-background border-[3px] border-foreground rounded-2xl shadow-[8px_8px_0_0_#000] max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-display font-black uppercase tracking-widest text-xl flex items-center gap-2">
                                <Store className="w-6 h-6 text-foreground" />
                                Publicar en Marketplace
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 pt-4">
                            <div className="p-4 bg-secondary/50 border-[2px] border-foreground rounded-xl flex items-start gap-4">
                                <div className="w-10 h-10 bg-[#00ffcc] border-[2px] border-foreground rounded-lg flex items-center justify-center shrink-0">
                                    <ClipboardList className="w-5 h-5 text-foreground" />
                                </div>
                                <div>
                                    <p className="font-bold text-foreground text-lg leading-snug">{manageDeck.nombre}</p>
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mt-1">{manageDeck.total_questions} preguntas · {manageDeck.subject?.nombre || 'Sin materia'}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descripción *</Label>
                                <Textarea
                                    placeholder="Describe este cuestionario para que otros sepan de qué se trata..."
                                    value={publishDescription}
                                    onChange={(e) => setPublishDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-background rounded-xl border-[2px] border-foreground font-medium shadow-[2px_2px_0_0_#000] focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Categoría / Etiquetas *</Label>
                                <input
                                    placeholder="Ej: Parcial, Final, Resumen..."
                                    value={publishCategory}
                                    onChange={(e) => setPublishCategory(e.target.value)}
                                    className="w-full px-4 py-3 bg-background rounded-xl border-[2px] border-foreground font-medium shadow-[2px_2px_0_0_#000] focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-all"
                                />
                            </div>
                            <button
                                className="w-full py-3 bg-[#ff4e4e] text-white font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none disabled:opacity-50 transition-all"
                                onClick={publishToMarketplace}
                                disabled={isPublishing || !publishDescription.trim() || !publishCategory.trim()}
                            >
                                {isPublishing ? "Publicando..." : "Publicar Ahora"}
                            </button>
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border-[3px] border-foreground p-5 rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))]">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-[#00d9ff] border-[3px] border-foreground flex items-center justify-center shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]">
                        <ClipboardList className="w-7 h-7 text-black" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-black uppercase tracking-widest text-foreground">
                            Cuestionarios
                        </h1>
                        <p className="text-muted-foreground font-bold uppercase tracking-wider text-xs mt-1">
                            Crea y practica cuestionarios de opción múltiple
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setShowCreateDeck(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#00d9ff] text-black border-[3px] border-foreground rounded-xl font-black uppercase tracking-widest shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] active:translate-y-0 active:shadow-none transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Cuestionario
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-background border-[3px] border-foreground rounded-2xl shadow-[8px_8px_0_0_#000] p-6 space-y-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-foreground" />
                        <span className="font-black uppercase tracking-widest text-sm text-foreground">Filtrar por Año</span>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <button
                            onClick={() => { setSelectedYear(null); setSelectedSubject(null); }}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all",
                                selectedYear === null
                                    ? "bg-[#25d06c] text-white"
                                    : "bg-background text-foreground"
                            )}
                        >
                            Todos
                        </button>
                        {[1, 2, 3, 4, 5, 6].map(y => (
                            <button
                                key={y}
                                onClick={() => { setSelectedYear(y); setSelectedSubject(null); }}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all",
                                    selectedYear === y
                                        ? "bg-[#25d06c] text-white"
                                        : "bg-background text-foreground"
                                )}
                            >
                                {y}° Año
                            </button>
                        ))}
                    </div>
                </div>

                {selectedYear !== null && (
                    <div className="space-y-3 pt-6 border-t-[3px] border-foreground border-dashed animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-foreground" />
                            <span className="font-black uppercase tracking-widest text-sm text-foreground">Materia</span>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={() => setSelectedSubject(null)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-[2px] border-foreground shadow-[2px_2px_0_0_#000] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0 active:shadow-none transition-all",
                                    selectedSubject === null
                                        ? "bg-[#1475e5] text-white"
                                        : "bg-secondary text-foreground"
                                )}
                            >
                                Todas las materias
                            </button>
                            {subjects.filter(s => s.año === selectedYear).map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => setSelectedSubject(sub.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-[2px] border-foreground shadow-[2px_2px_0_0_#000] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0 active:shadow-none transition-all",
                                        selectedSubject === sub.id
                                            ? "bg-[#1475e5] text-white"
                                            : "bg-secondary text-foreground"
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
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="bg-secondary/50 border-[3px] border-foreground rounded-2xl animate-pulse">
                            <CardContent className="p-6 h-48" />
                        </Card>
                    ))}
                </div>
            ) : decks.length === 0 && !selectedYear ? (
                <Card className="bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl border-dashed">
                    <CardContent className="p-12 text-center">
                        <div className="w-20 h-20 bg-[#ffd21c] border-[3px] border-foreground rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-[-5deg] shadow-[4px_4px_0_0_#000]">
                            <ClipboardList className="w-10 h-10 text-black" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-widest text-foreground mb-2">Sin cuestionarios</h3>
                        <p className="text-muted-foreground font-bold mb-6">
                            Crea tu primer cuestionario o pedile a la IA que genere uno automáticamente
                        </p>
                        <button 
                            onClick={() => setShowCreateDeck(true)}
                            className="inline-flex items-center px-6 py-3 bg-[#00ffcc] text-foreground font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all"
                        >
                            <Plus className="w-5 h-5 mr-2" /> Crear Cuestionario
                        </button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 tour-quizzes-decks">
                    {decks
                        .filter(d => {
                            if (selectedYear && d.subject?.año !== selectedYear) return false;
                            if (selectedSubject && d.subject_id !== selectedSubject) return false;
                            return true;
                        })
                        .map((deck) => (
                            <Card key={deck.id} className="bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-2xl hover:-translate-y-2 hover:shadow-[12px_12px_0_0_#000] transition-all group flex flex-col">
                                <CardContent className="p-6 flex flex-col flex-1">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-[#ffd21c] border-[3px] border-foreground flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
                                                <ClipboardList className="w-6 h-6 text-black" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-lg leading-snug line-clamp-2 uppercase">{deck.nombre}</h3>
                                                <p className="text-sm font-bold text-muted-foreground">{deck.total_questions} preguntas</p>
                                            </div>
                                        </div>
                                        <button
                                            className="w-10 h-10 flex items-center justify-center bg-[#ff4e4e] text-white border-[2px] border-foreground rounded-xl shadow-[2px_2px_0_0_#000] hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0 active:shadow-none transition-all opacity-0 group-hover:opacity-100 shrink-0 ml-2"
                                            onClick={() => setDeleteDeck(deck)}
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {deck.subject && (
                                        <Badge className="bg-secondary text-foreground border-[2px] border-foreground shadow-[2px_2px_0_0_#000] font-black uppercase tracking-wider mb-4 mt-auto">
                                            <GraduationCap className="w-4 h-4 mr-1.5" />
                                            Año {deck.subject.año} · {deck.subject.nombre}
                                        </Badge>
                                    )}
                                    {!deck.subject && <div className="mt-auto" />}

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            className="flex-1 flex items-center justify-center py-2.5 bg-background text-foreground font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all text-sm"
                                            onClick={() => {
                                                setManageDeck(deck);
                                                fetchQuestions(deck.id);
                                            }}
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Gestionar
                                        </button>
                                        <button
                                            className="flex-1 flex items-center justify-center py-2.5 bg-[#00ffcc] text-foreground font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:pointer-events-none transition-all text-sm"
                                            disabled={deck.total_questions === 0}
                                            onClick={() => checkStudyOptions(deck)}
                                        >
                                            <Zap className="w-4 h-4 mr-2" />
                                            Practicar
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            )}

            {/* Create Deck Dialog */}
            <Dialog open={showCreateDeck} onOpenChange={setShowCreateDeck}>
                <DialogContent className="sm:max-w-md bg-background border-[3px] border-foreground rounded-2xl shadow-[8px_8px_0_0_#000]">
                    <DialogHeader>
                        <DialogTitle className="font-display font-black uppercase tracking-widest text-xl flex items-center gap-2">
                            <ClipboardList className="w-6 h-6 text-foreground" />
                            Nuevo Cuestionario
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                        <div>
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seleccionar Año *</Label>
                            <div className="flex gap-2 mt-2">
                                {[1, 2, 3, 4, 5, 6].map(year => (
                                    <button
                                        key={year}
                                        onClick={() => { setNewDeckYear(year); setNewDeckSubject(""); }}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-widest border-[3px] border-foreground transition-all",
                                            newDeckYear === year
                                                ? "bg-[#25d06c] text-white shadow-[4px_4px_0_0_#000] -translate-y-1"
                                                : "bg-background hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000]"
                                        )}
                                    >
                                        {year}°
                                    </button>
                                ))}
                            </div>
                        </div>

                        {newDeckYear && (
                            <div className="animate-in fade-in">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Materia *</Label>
                                <Select
                                    value={newDeckSubject}
                                    onValueChange={setNewDeckSubject}
                                >
                                    <SelectTrigger className="w-full mt-2 px-4 py-6 h-auto bg-background rounded-xl border-[3px] border-foreground font-black shadow-[4px_4px_0_0_#000] focus:ring-0 focus:outline-none focus:shadow-[6px_6px_0_0_#000] transition-all text-sm data-[state=open]:shadow-[6px_6px_0_0_#000]">
                                        <SelectValue placeholder="Seleccionar materia" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border-[3px] border-foreground shadow-[8px_8px_0_0_#000] rounded-xl">
                                        {subjects
                                            .filter(s => s.año === newDeckYear)
                                            .map(subject => (
                                                <SelectItem key={subject.id} value={subject.id} className="font-bold focus:bg-secondary cursor-pointer rounded-lg my-1">
                                                    {subject.nombre}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {newDeckSubject && (
                            <div className="animate-in fade-in space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre del Cuestionario *</Label>
                                <input
                                    placeholder="Ej: Parcial 1 - Sistemas Operativos"
                                    value={newDeckName}
                                    onChange={(e) => setNewDeckName(e.target.value)}
                                    className="w-full px-4 py-3 bg-background rounded-xl border-[2px] border-foreground font-medium shadow-[2px_2px_0_0_#000] focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-all"
                                />
                            </div>
                        )}

                        <button
                            onClick={createDeck}
                            disabled={!newDeckSubject || !newDeckName.trim()}
                            className="w-full py-3 bg-[#1475e5] text-white font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:pointer-events-none transition-all"
                        >
                            Crear Cuestionario
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteDeck} onOpenChange={() => setDeleteDeck(null)}>
                <DialogContent className="bg-background border-[3px] border-foreground rounded-2xl shadow-[8px_8px_0_0_#000] max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-widest text-[#ff4e4e]">
                            <AlertCircle className="w-6 h-6" />
                            Eliminar Cuestionario
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-foreground font-medium py-2">
                        ¿Estás seguro de que querés eliminar <strong>{deleteDeck?.nombre}</strong>? Se borrarán todas las preguntas.
                    </p>
                    <div className="flex gap-4 pt-4">
                        <button 
                            className="flex-1 py-3 bg-background text-foreground font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all"
                            onClick={() => setDeleteDeck(null)}
                        >
                            Cancelar
                        </button>
                        <button 
                            className="flex-1 py-3 bg-[#ff4e4e] text-white font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all"
                            onClick={confirmDeleteDeck}
                        >
                            Eliminar
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Study Options Dialog */}
            <Dialog open={showStudyOptions} onOpenChange={setShowStudyOptions}>
                <DialogContent className="bg-background border-[3px] border-foreground rounded-2xl shadow-[8px_8px_0_0_#000] max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-widest text-xl">
                            <Zap className="w-6 h-6 text-[#00ffcc]" />
                            Opciones de Práctica
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6 pt-4">
                        {savedWrongIds.length > 0 && (
                            <div className="p-4 bg-[#ff4e4e]/20 border-[3px] border-[#ff4e4e] rounded-xl text-[#ff4e4e] font-bold">
                                <p>
                                    Tenés {savedWrongIds.length} pregunta(s) en las que te equivocaste en tu intento anterior.
                                </p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Orden de las preguntas</Label>
                            <RadioGroup value={studyOrder} onValueChange={(v: any) => setStudyOrder(v)}>
                                <div className="flex flex-col gap-3">
                                    <label className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl border-[3px] border-foreground cursor-pointer transition-all",
                                        studyOrder === 'random' ? "bg-[#00ffcc] shadow-[4px_4px_0_0_#000] -translate-y-1" : "bg-background hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000]"
                                    )}>
                                        <RadioGroupItem value="random" className="sr-only" />
                                        <div className={cn(
                                            "w-6 h-6 rounded-full border-[2px] border-foreground flex items-center justify-center bg-white",
                                        )}>
                                            {studyOrder === 'random' && <div className="w-3 h-3 rounded-full bg-foreground" />}
                                        </div>
                                        <span className="font-bold">Al azar</span>
                                    </label>
                                    <label className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl border-[3px] border-foreground cursor-pointer transition-all",
                                        studyOrder === 'sequential' ? "bg-[#00ffcc] shadow-[4px_4px_0_0_#000] -translate-y-1" : "bg-background hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000]"
                                    )}>
                                        <RadioGroupItem value="sequential" className="sr-only" />
                                        <div className={cn(
                                            "w-6 h-6 rounded-full border-[2px] border-foreground flex items-center justify-center bg-white",
                                        )}>
                                            {studyOrder === 'sequential' && <div className="w-3 h-3 rounded-full bg-foreground" />}
                                        </div>
                                        <span className="font-bold">Orden original</span>
                                    </label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="flex flex-col gap-4 pt-4 border-t-[3px] border-foreground border-dashed mt-4">
                            {savedWrongIds.length > 0 && (
                                <button 
                                    className="w-full py-3 bg-[#ff4e4e] text-white font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all"
                                    onClick={() => {
                                        if (pendingStudyDeck) startStudy(pendingStudyDeck, savedWrongIds, studyOrder);
                                    }}
                                >
                                    Repasar mis errores ({savedWrongIds.length})
                                </button>
                            )}
                            <button 
                                className={cn(
                                    "w-full py-3 font-black uppercase tracking-widest border-[3px] border-foreground rounded-xl shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all",
                                    savedWrongIds.length > 0 ? "bg-background text-foreground" : "bg-[#00ffcc] text-foreground"
                                )}
                                onClick={() => {
                                    if (pendingStudyDeck) startStudy(pendingStudyDeck, [], studyOrder);
                                }}
                            >
                                {savedWrongIds.length > 0 ? "Empezar de nuevo" : "Comenzar Práctica"}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
