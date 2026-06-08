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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
            .filter(o => o.trim())
            .map((o, i) => ({
                question_id: q.id,
                texto: o.trim(),
                es_correcta: correctOptions.has(i)
            }));

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
        if (!user || isGuest) {
            startStudy(deck, []);
            return;
        }
        const savedStr = localStorage.getItem(`quiz_wrong_${user.id}_${deck.id}`);
        if (savedStr) {
            try {
                const parsed = JSON.parse(savedStr);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setPendingStudyDeck(deck);
                    setSavedWrongIds(parsed);
                    setShowStudyOptions(true);
                    return;
                }
            } catch (e) {}
        }
        startStudy(deck, []);
    };

    const startStudy = async (deck: QuizDeck, filterIds: string[] = []) => {
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
                setStudyQuestions(mockQs.sort(() => Math.random() - 0.5));
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

            // Shuffle questions
            setStudyQuestions(enriched.sort(() => Math.random() - 0.5));
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
        setStudyQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
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
                <div className="min-h-screen flex items-center justify-center p-4">
                    <Card className="card-gamer max-w-lg w-full">
                        <CardContent className="p-8 text-center space-y-6">
                            <div className={cn(
                                "w-20 h-20 rounded-full mx-auto flex items-center justify-center",
                                percentage >= 70 ? "bg-green-500/20" : percentage >= 40 ? "bg-yellow-500/20" : "bg-red-500/20"
                            )}>
                                <Trophy className={cn(
                                    "w-10 h-10",
                                    percentage >= 70 ? "text-green-500" : percentage >= 40 ? "text-yellow-500" : "text-red-500"
                                )} />
                            </div>
                            <h2 className="text-2xl font-bold">
                                {percentage >= 70 ? "¡Excelente!" : percentage >= 40 ? "¡Buen intento!" : "Seguí practicando"}
                            </h2>
                            <div className="text-4xl font-display font-bold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
                                {score}/{studyQuestions.length}
                            </div>
                            <p className="text-muted-foreground">{percentage}% de respuestas correctas</p>
                            <p className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1 mt-2">
                                <Timer className="w-4 h-4" />
                                Tiempo: {Math.floor(studyTime / 60)}:{(studyTime % 60).toString().padStart(2, '0')}
                            </p>
                            <div className="flex gap-3 justify-center pt-2">
                                <Button variant="outline" onClick={exitStudy}>
                                    <X className="w-4 h-4 mr-2" /> Salir
                                </Button>
                                <Button onClick={restartStudy} className="bg-gradient-to-r from-neon-cyan to-neon-purple">
                                    <RotateCcw className="w-4 h-4 mr-2" /> Reintentar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        const currentQ = studyQuestions[currentIndex];
        return (
            <div className="min-h-screen p-4 md:p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={exitStudy}>
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h2 className="font-semibold">{studyDeck.nombre}</h2>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <span>Pregunta {currentIndex + 1} de {studyQuestions.length} · Correctas: {score}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1 font-medium bg-secondary px-2 py-0.5 rounded-full">
                                    <Timer className="w-3 h-3" />
                                    {Math.floor(studyTime / 60)}:{(studyTime % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-all"
                            style={{ width: `${((currentIndex + 1) / studyQuestions.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Question Card */}
                <Card className="card-gamer max-w-2xl mx-auto">
                    <CardContent className="p-6 space-y-6">
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="text-lg font-semibold leading-relaxed">{currentQ.pregunta}</h3>
                            {currentQ.is_multi_select && (
                                <Badge variant="outline" className="shrink-0 bg-neon-purple/10 text-neon-purple border-neon-purple/30">
                                    <ListChecks className="w-3 h-3 mr-1" /> Múltiple
                                </Badge>
                            )}
                        </div>

                        {currentQ.is_multi_select ? (
                            /* Multi-select: checkboxes */
                            <div className="space-y-3">
                                {currentQ.options.map((opt, i) => {
                                    const letter = String.fromCharCode(65 + i);
                                    const isSelected = selectedAnswers.has(opt.id);
                                    let optClass = "border-border hover:border-primary/50";
                                    if (answered) {
                                        if (opt.es_correcta) optClass = "border-green-500 bg-green-500/10";
                                        else if (isSelected && !opt.es_correcta) optClass = "border-red-500 bg-red-500/10";
                                    } else if (isSelected) {
                                        optClass = "border-primary bg-primary/10";
                                    }

                                    return (
                                        <label
                                            key={opt.id}
                                            className={cn(
                                                "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                optClass,
                                                answered && "cursor-default"
                                            )}
                                            onClick={() => {
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
                                                "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                                                isSelected && !answered ? "bg-primary text-primary-foreground" :
                                                    answered && opt.es_correcta ? "bg-green-500 text-white" :
                                                        answered && isSelected && !opt.es_correcta ? "bg-red-500 text-white" :
                                                            "bg-secondary"
                                            )}>
                                                {answered && opt.es_correcta ? <Check className="w-4 h-4" /> :
                                                    answered && isSelected && !opt.es_correcta ? <X className="w-4 h-4" /> :
                                                        letter}
                                            </div>
                                            <span className="flex-1">{opt.texto}</span>
                                            <Checkbox
                                                checked={isSelected}
                                                className="pointer-events-none"
                                                disabled={answered}
                                            />
                                        </label>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Single-select: radio buttons */
                            <RadioGroup value={selectedAnswer || ""} onValueChange={(v) => { if (!answered) setSelectedAnswer(v); }}>
                                <div className="space-y-3">
                                    {currentQ.options.map((opt, i) => {
                                        const letter = String.fromCharCode(65 + i);
                                        let optClass = "border-border hover:border-primary/50";
                                        if (answered) {
                                            if (opt.es_correcta) optClass = "border-green-500 bg-green-500/10";
                                            else if (selectedAnswer === opt.id && !opt.es_correcta) optClass = "border-red-500 bg-red-500/10";
                                        } else if (selectedAnswer === opt.id) {
                                            optClass = "border-primary bg-primary/10";
                                        }

                                        return (
                                            <label
                                                key={opt.id}
                                                className={cn(
                                                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                    optClass,
                                                    answered && "cursor-default"
                                                )}
                                            >
                                                <RadioGroupItem value={opt.id} className="sr-only" />
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                                                    selectedAnswer === opt.id && !answered ? "bg-primary text-primary-foreground" :
                                                        answered && opt.es_correcta ? "bg-green-500 text-white" :
                                                            answered && selectedAnswer === opt.id && !opt.es_correcta ? "bg-red-500 text-white" :
                                                                "bg-secondary"
                                                )}>
                                                    {answered && opt.es_correcta ? <Check className="w-4 h-4" /> :
                                                        answered && selectedAnswer === opt.id && !opt.es_correcta ? <X className="w-4 h-4" /> :
                                                            letter}
                                                </div>
                                                <span className="flex-1">{opt.texto}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </RadioGroup>
                        )}

                        {answered && currentQ.explicacion && (
                            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                                <p className="text-sm"><strong>Explicación:</strong> {currentQ.explicacion}</p>
                            </div>
                        )}

                        <div className="flex justify-end">
                            {!answered ? (
                                <Button 
                                    onClick={submitAnswer} 
                                    disabled={currentQ.is_multi_select ? selectedAnswers.size === 0 : !selectedAnswer} 
                                    className="bg-gradient-to-r from-neon-cyan to-neon-purple"
                                >
                                    Confirmar Respuesta
                                </Button>
                            ) : (
                                <Button onClick={nextQuestion}>
                                    {currentIndex + 1 >= studyQuestions.length ? "Ver Resultado" : "Siguiente"}
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
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
            <div className="min-h-screen p-4 md:p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => { setManageDeck(null); setDeckQuestions([]); }}>
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold">{manageDeck.nombre}</h2>
                        <p className="text-sm text-muted-foreground">{manageDeck.total_questions} preguntas</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowPublishDialog(true)}>
                            <Store className="w-4 h-4 mr-2" /> Publicar
                        </Button>
                        <Button size="sm" onClick={() => setShowAddQuestion(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Agregar Pregunta
                        </Button>
                    </div>
                </div>

                {/* Subject Assignment */}
                <Card className="card-gamer">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-5 h-5 text-neon-cyan" />
                                <Label className="font-semibold text-sm">Materia asignada</Label>
                            </div>
                            <select
                                value={manageDeck.subject_id || ""}
                                onChange={(e) => {
                                    if (e.target.value) updateDeckSubject(manageDeck.id, e.target.value);
                                }}
                                className="flex-1 w-full md:w-auto px-4 py-2.5 bg-secondary rounded-xl border border-border font-medium text-sm"
                            >
                                <option value="">Sin materia asignada</option>
                                {[1, 2, 3, 4, 5, 6].map(year => {
                                    const yearSubjects = subjects.filter(s => s.año === year);
                                    if (yearSubjects.length === 0) return null;
                                    return (
                                        <optgroup key={year} label={`${year}° Año`}>
                                            {yearSubjects.map(s => (
                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                        </optgroup>
                                    );
                                })}
                            </select>
                            {manageDeck.subject && (
                                <Badge variant="outline" className="bg-primary/10 shrink-0">
                                    Año {manageDeck.subject.año} · {manageDeck.subject.nombre}
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {loadingQuestions ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : deckQuestions.length === 0 ? (
                    <Card className="card-gamer">
                        <CardContent className="p-8 text-center">
                            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">Aún no hay preguntas. ¡Agregá la primera!</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {deckQuestions.map((q, qi) => (
                            <Card key={q.id} className="card-gamer">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <p className="font-semibold"><span className="text-muted-foreground mr-2">{qi + 1}.</span>{q.pregunta}</p>
                                            {q.is_multi_select && (
                                                <Badge variant="outline" className="mt-1 text-xs bg-neon-purple/10 text-neon-purple border-neon-purple/30">
                                                    <ListChecks className="w-3 h-3 mr-1" /> Múltiple
                                                </Badge>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => deleteQuestion(q.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="grid gap-2 ml-6">
                                        {q.options.map((o, oi) => (
                                            <div key={o.id} className={cn(
                                                "text-sm px-3 py-2 rounded-lg flex items-center gap-2",
                                                o.es_correcta ? "bg-green-500/15 text-green-400 border border-green-500/30" : "bg-secondary/50"
                                            )}>
                                                <span className="font-bold text-xs w-5">{String.fromCharCode(65 + oi)})</span>
                                                {o.texto}
                                                {o.es_correcta && <Check className="w-3 h-3 ml-auto" />}
                                            </div>
                                        ))}
                                    </div>
                                    {q.explicacion && (
                                        <p className="text-xs text-muted-foreground mt-2 ml-6 italic">💡 {q.explicacion}</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Add Question Dialog */}
                <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
                    <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Nueva Pregunta</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label>Pregunta *</Label>
                                <Textarea
                                    placeholder="Escribe la pregunta..."
                                    value={newQuestion}
                                    onChange={(e) => setNewQuestion(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            {/* Multi-select toggle */}
                            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl border border-border">
                                <div className="flex items-center gap-2">
                                    <ListChecks className="w-4 h-4 text-neon-purple" />
                                    <Label className="text-sm font-medium cursor-pointer">Permitir múltiples respuestas</Label>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMultiSelect(!isMultiSelect);
                                        setCorrectOptions(new Set([0]));
                                    }}
                                    className={cn(
                                        "relative w-11 h-6 rounded-full transition-colors",
                                        isMultiSelect ? "bg-neon-purple" : "bg-border"
                                    )}
                                >
                                    <span className={cn(
                                        "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                                        isMultiSelect && "translate-x-5"
                                    )} />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <Label>{isMultiSelect ? "Opciones (marcar las correctas)" : "Opciones (marcar la correcta)"}</Label>
                                {newOptions.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
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
                                                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border-2 transition-all",
                                                correctOptions.has(i)
                                                    ? "bg-green-500 text-white border-green-500"
                                                    : "bg-secondary border-border hover:border-green-500/50"
                                            )}
                                        >
                                            {correctOptions.has(i) ? <Check className="w-4 h-4" /> : String.fromCharCode(65 + i)}
                                        </button>
                                        <Input
                                            placeholder={`Opción ${String.fromCharCode(65 + i)}${i < 2 ? " *" : " (opcional)"}`}
                                            value={opt}
                                            onChange={(e) => {
                                                const copy = [...newOptions];
                                                copy[i] = e.target.value;
                                                setNewOptions(copy);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <Label>Explicación (opcional)</Label>
                                <Textarea
                                    placeholder="Explicación de por qué la respuesta es correcta..."
                                    value={newExplanation}
                                    onChange={(e) => setNewExplanation(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <Button
                                className="w-full"
                                onClick={addQuestion}
                                disabled={!newQuestion.trim() || newOptions.filter(o => o.trim()).length < 2 || correctOptions.size === 0}
                            >
                                Agregar Pregunta
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Publish to Marketplace Dialog */}
                <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
                    <DialogContent className="bg-card border-border max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Store className="w-5 h-5 text-neon-purple" />
                                Publicar en Marketplace
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div className="p-4 bg-neon-purple/10 border border-neon-purple/30 rounded-xl">
                                <p className="font-semibold">{manageDeck.nombre}</p>
                                <p className="text-sm text-muted-foreground">{manageDeck.total_questions} preguntas · {manageDeck.subject?.nombre || 'Sin materia'}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-muted-foreground uppercase">Descripción *</Label>
                                <Textarea
                                    placeholder="Describe este cuestionario para que otros sepan de qué se trata..."
                                    value={publishDescription}
                                    onChange={(e) => setPublishDescription(e.target.value)}
                                    rows={3}
                                    className="bg-secondary/30 border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-muted-foreground uppercase">Categoría / Etiquetas *</Label>
                                <Input
                                    placeholder="Ej: Parcial, Final, Resumen..."
                                    value={publishCategory}
                                    onChange={(e) => setPublishCategory(e.target.value)}
                                    className="bg-secondary/30 border-border"
                                />
                            </div>
                            <Button
                                className="w-full bg-gradient-to-r from-neon-purple to-neon-cyan hover:opacity-90"
                                onClick={publishToMarketplace}
                                disabled={isPublishing || !publishDescription.trim() || !publishCategory.trim()}
                            >
                                {isPublishing ? "Publicando..." : "Publicar Ahora"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // ---------- MAIN DECK LIST VIEW ----------
    return (
        <div className="min-h-screen p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
                        <ClipboardList className="w-8 h-8 text-neon-cyan" />
                        Cuestionarios
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Crea y practica cuestionarios de opción múltiple
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreateDeck(true)}
                    className="bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Cuestionario
                </Button>
            </div>

            {/* Filters */}
            <div className="card-gamer rounded-xl p-4 space-y-4">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">Filtrar por Año</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => { setSelectedYear(null); setSelectedSubject(null); }}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                selectedYear === null
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary hover:bg-secondary/80"
                            )}
                        >
                            Todos
                        </button>
                        {[1, 2, 3, 4, 5, 6].map(y => (
                            <button
                                key={y}
                                onClick={() => { setSelectedYear(y); setSelectedSubject(null); }}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                    selectedYear === y
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-secondary hover:bg-secondary/80"
                                )}
                            >
                                {y}° Año
                            </button>
                        ))}
                    </div>
                </div>

                {selectedYear !== null && (
                    <div className="space-y-3 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-neon-cyan" />
                            <span className="font-medium text-sm">Materia</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setSelectedSubject(null)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                    selectedSubject === null
                                        ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                                        : "bg-secondary hover:bg-secondary/80 border border-transparent"
                                )}
                            >
                                Todas las materias
                            </button>
                            {subjects.filter(s => s.año === selectedYear).map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => setSelectedSubject(sub.id)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                        selectedSubject === sub.id
                                            ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                                            : "bg-secondary hover:bg-secondary/80 border border-transparent"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="card-gamer animate-pulse">
                            <CardContent className="p-6 h-48" />
                        </Card>
                    ))}
                </div>
            ) : decks.length === 0 && !selectedYear ? (
                <Card className="card-gamer">
                    <CardContent className="p-12 text-center">
                        <ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                        <h3 className="text-lg font-semibold mb-2">Sin cuestionarios</h3>
                        <p className="text-muted-foreground mb-4">
                            Crea tu primer cuestionario o pedile a la IA que genere uno automáticamente
                        </p>
                        <Button onClick={() => setShowCreateDeck(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Crear Cuestionario
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 tour-quizzes-decks">
                    {decks
                        .filter(d => {
                            if (selectedYear && d.subject?.año !== selectedYear) return false;
                            if (selectedSubject && d.subject_id !== selectedSubject) return false;
                            return true;
                        })
                        .map((deck) => (
                            <Card key={deck.id} className="card-gamer hover:glow-cyan transition-all group">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
                                                <ClipboardList className="w-6 h-6 text-background" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold line-clamp-1">{deck.nombre}</h3>
                                                <p className="text-sm text-muted-foreground">{deck.total_questions} preguntas</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 text-destructive"
                                            onClick={() => setDeleteDeck(deck)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {deck.subject && (
                                        <Badge variant="outline" className="text-xs mb-3 bg-primary/10">
                                            <GraduationCap className="w-3 h-3 mr-1" />
                                            Año {deck.subject.año} · {deck.subject.nombre}
                                        </Badge>
                                    )}

                                    <div className="flex gap-2 mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 border-primary text-primary hover:bg-primary/10"
                                            onClick={() => {
                                                setManageDeck(deck);
                                                fetchQuestions(deck.id);
                                            }}
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Gestionar
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-gradient-to-r from-neon-cyan to-neon-purple"
                                            disabled={deck.total_questions === 0}
                                            onClick={() => checkStudyOptions(deck)}
                                        >
                                            <Zap className="w-4 h-4 mr-2" />
                                            Practicar
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            )}

            {/* Create Deck Dialog */}
            <Dialog open={showCreateDeck} onOpenChange={setShowCreateDeck}>
                <DialogContent className="sm:max-w-md bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="font-display gradient-text text-xl flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-neon-cyan" />
                            Nuevo Cuestionario
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Seleccionar Año *</label>
                            <div className="flex gap-2 mt-2">
                                {[1, 2, 3, 4, 5, 6].map(year => (
                                    <button
                                        key={year}
                                        onClick={() => { setNewDeckYear(year); setNewDeckSubject(""); }}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl text-sm font-semibold transition-all",
                                            newDeckYear === year
                                                ? "bg-gradient-to-r from-neon-cyan to-neon-purple text-background"
                                                : "bg-secondary hover:bg-secondary/80"
                                        )}
                                    >
                                        {year}°
                                    </button>
                                ))}
                            </div>
                        </div>

                        {newDeckYear && (
                            <div className="animate-fade-in">
                                <label className="text-sm font-medium text-muted-foreground">Materia *</label>
                                <select
                                    value={newDeckSubject}
                                    onChange={(e) => setNewDeckSubject(e.target.value)}
                                    className="w-full mt-2 px-4 py-3 bg-secondary rounded-xl border border-border font-medium"
                                >
                                    <option value="">Seleccionar materia</option>
                                    {subjects
                                        .filter(s => s.año === newDeckYear)
                                        .map(subject => (
                                            <option key={subject.id} value={subject.id}>
                                                {subject.nombre}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}

                        {newDeckSubject && (
                            <div className="animate-fade-in space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Nombre del Cuestionario *</label>
                                <Input
                                    placeholder="Ej: Parcial 1 - Sistemas Operativos"
                                    value={newDeckName}
                                    onChange={(e) => setNewDeckName(e.target.value)}
                                    className="px-4 py-6 bg-secondary rounded-xl border-border"
                                />
                            </div>
                        )}

                        <button
                            onClick={createDeck}
                            disabled={!newDeckSubject || !newDeckName.trim()}
                            className="w-full py-3.5 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-neon-cyan/25"
                        >
                            Crear Cuestionario
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteDeck} onOpenChange={() => setDeleteDeck(null)}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="w-5 h-5" />
                            Eliminar Cuestionario
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground">
                        ¿Estás seguro de que querés eliminar <strong>{deleteDeck?.nombre}</strong>? Se borrarán todas las preguntas.
                    </p>
                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={() => setDeleteDeck(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={confirmDeleteDeck}>Eliminar</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Study Options Dialog */}
            <Dialog open={showStudyOptions} onOpenChange={setShowStudyOptions}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-neon-cyan" />
                            Opciones de Práctica
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground">
                        Tenés {savedWrongIds.length} pregunta(s) en las que te equivocaste en tu intento anterior. ¿Qué querés hacer?
                    </p>
                    <div className="flex flex-col gap-3 mt-4">
                        <Button 
                            className="bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90"
                            onClick={() => {
                                if (pendingStudyDeck) startStudy(pendingStudyDeck, savedWrongIds);
                            }}
                        >
                            Repasar mis errores ({savedWrongIds.length})
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                if (pendingStudyDeck) startStudy(pendingStudyDeck, []);
                            }}
                        >
                            Empezar de nuevo (Todas las preguntas)
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
