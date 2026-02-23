import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
    ClipboardList, Plus, Sparkles, GraduationCap,
    BookOpen, Zap, Trash2, X, Check, ChevronRight,
    ChevronLeft, Trophy, RotateCcw, Upload, Store,
    Edit, AlertCircle, Filter, Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
    const { user } = useAuth();
    const [decks, setDecks] = useState<QuizDeck[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);

    // Create deck state
    const [newDeckName, setNewDeckName] = useState("");
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
    const [correctOption, setCorrectOption] = useState(0);

    // Study mode state
    const [studyDeck, setStudyDeck] = useState<QuizDeck | null>(null);
    const [studyQuestions, setStudyQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [answered, setAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [studyTime, setStudyTime] = useState(0);

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

    const saveStudySession = async (isCompleted: boolean) => {
        if (!user || !studyDeck || studyTime === 0) return;
        try {
            await supabase.from("study_sessions").insert({
                user_id: user.id,
                subject_id: studyDeck.subject_id,
                duracion_segundos: studyTime,
                tipo: "cuestionario",
                completada: isCompleted,
                fecha: new Date().toISOString().split('T')[0],
            });
        } catch (e) {
            console.error("Error saving session", e);
        }
    };

    // Delete confirm
    const [deleteDeck, setDeleteDeck] = useState<QuizDeck | null>(null);

    // Year filter
    const [selectedYear, setSelectedYear] = useState<number | null>(null);

    const fetchSubjects = useCallback(async () => {
        const { data } = await supabase.from("subjects").select("id, nombre, codigo, año").order("año");
        setSubjects(data || []);
    }, []);

    const fetchDecks = useCallback(async () => {
        if (!user) return;
        setLoading(true);
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
        const { data: questions } = await supabase
            .from("quiz_questions")
            .select("id, pregunta, explicacion")
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
        const { error } = await supabase.from("quiz_decks").insert({
            user_id: user.id,
            nombre: newDeckName.trim(),
            subject_id: newDeckSubject || null,
            total_questions: 0
        });
        if (error) { toast.error("Error al crear cuestionario"); return; }
        toast.success("Cuestionario creado");
        setNewDeckName("");
        setNewDeckSubject("");
        setShowCreateDeck(false);
        fetchDecks();
    };

    const addQuestion = async () => {
        if (!newQuestion.trim() || !manageDeck || !user) return;
        const filledOptions = newOptions.filter(o => o.trim());
        if (filledOptions.length < 2) { toast.error("Al menos 2 opciones son necesarias"); return; }

        // Insert question
        const { data: q, error } = await supabase.from("quiz_questions").insert({
            deck_id: manageDeck.id,
            user_id: user.id,
            pregunta: newQuestion.trim(),
            explicacion: newExplanation.trim() || null
        }).select().single();

        if (error || !q) { toast.error("Error al crear pregunta"); return; }

        // Insert options
        const optionsToInsert = newOptions
            .filter(o => o.trim())
            .map((o, i) => ({
                question_id: q.id,
                texto: o.trim(),
                es_correcta: i === correctOption
            }));

        await supabase.from("quiz_options").insert(optionsToInsert);

        // Update total_questions
        await supabase.from("quiz_decks").update({
            total_questions: (manageDeck.total_questions || 0) + 1,
            updated_at: new Date().toISOString()
        }).eq("id", manageDeck.id);

        toast.success("Pregunta agregada");
        setNewQuestion("");
        setNewExplanation("");
        setNewOptions(["", "", "", "", ""]);
        setCorrectOption(0);
        setShowAddQuestion(false);
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

    // Study Mode
    const startStudy = async (deck: QuizDeck) => {
        setStudyDeck(deck);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setAnswered(false);
        setScore(0);
        setFinished(false);
        setStudyTime(0);
        // Fetch all questions with options
        const { data: questions } = await supabase
            .from("quiz_questions")
            .select("id, pregunta, explicacion")
            .eq("deck_id", deck.id);

        if (questions && questions.length > 0) {
            const qIds = questions.map((q: any) => q.id);
            const { data: options } = await supabase
                .from("quiz_options")
                .select("id, question_id, texto, es_correcta")
                .in("question_id", qIds);

            const enriched = questions.map((q: any) => ({
                ...q,
                options: (options || []).filter((o: any) => o.question_id === q.id)
            }));
            // Shuffle questions
            setStudyQuestions(enriched.sort(() => Math.random() - 0.5));
        }
    };

    const submitAnswer = () => {
        if (!selectedAnswer || answered) return;
        setAnswered(true);
        const currentQ = studyQuestions[currentIndex];
        const selectedOpt = currentQ.options.find(o => o.id === selectedAnswer);
        if (selectedOpt?.es_correcta) {
            setScore(prev => prev + 1);
        }
    };

    const nextQuestion = () => {
        if (currentIndex + 1 >= studyQuestions.length) {
            setFinished(true);
            saveStudySession(true);
        } else {
            setCurrentIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setAnswered(false);
        }
    };

    const restartStudy = () => {
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setAnswered(false);
        setScore(0);
        setFinished(false);
        setStudyTime(0);
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
                        <h3 className="text-lg font-semibold leading-relaxed">{currentQ.pregunta}</h3>

                        <RadioGroup value={selectedAnswer || ""} onValueChange={(v) => { if (!answered) setSelectedAnswer(v); }}>
                            <div className="space-y-3">
                                {currentQ.options.map((opt, i) => {
                                    const letter = String.fromCharCode(65 + i); // A, B, C, D, E
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

                        {answered && currentQ.explicacion && (
                            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                                <p className="text-sm"><strong>Explicación:</strong> {currentQ.explicacion}</p>
                            </div>
                        )}

                        <div className="flex justify-end">
                            {!answered ? (
                                <Button onClick={submitAnswer} disabled={!selectedAnswer} className="bg-gradient-to-r from-neon-cyan to-neon-purple">
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
                    <Button size="sm" className="ml-auto" onClick={() => setShowAddQuestion(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Agregar Pregunta
                    </Button>
                </div>

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
                                        <p className="font-semibold flex-1"><span className="text-muted-foreground mr-2">{qi + 1}.</span>{q.pregunta}</p>
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
                            <div className="space-y-2">
                                <Label>Opciones (marcar la correcta)</Label>
                                {newOptions.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCorrectOption(i)}
                                            className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border-2 transition-all",
                                                correctOption === i
                                                    ? "bg-green-500 text-white border-green-500"
                                                    : "bg-secondary border-border hover:border-green-500/50"
                                            )}
                                        >
                                            {correctOption === i ? <Check className="w-4 h-4" /> : String.fromCharCode(65 + i)}
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
                                disabled={!newQuestion.trim() || newOptions.filter(o => o.trim()).length < 2}
                            >
                                Agregar Pregunta
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

            {/* Year Filter */}
            <div className="card-gamer rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Filtrar por Año</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setSelectedYear(null)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            selectedYear === null
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary hover:bg-secondary/80"
                        )}
                    >
                        Todos
                    </button>
                    {[1, 2, 3, 4, 5].map(y => (
                        <button
                            key={y}
                            onClick={() => setSelectedYear(y)}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {decks
                        .filter(d => {
                            if (!selectedYear) return true;
                            return d.subject?.año === selectedYear;
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
                                            className="flex-1"
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
                                            onClick={() => startStudy(deck)}
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
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Nuevo Cuestionario</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label>Nombre *</Label>
                            <Input
                                placeholder="Ej: Parcial 1 - Sistemas Operativos"
                                value={newDeckName}
                                onChange={(e) => setNewDeckName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Materia (opcional)</Label>
                            <Select value={newDeckSubject} onValueChange={setNewDeckSubject}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar materia" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] overflow-y-auto">
                                    {subjects.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.nombre} (Año {s.año})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full" onClick={createDeck} disabled={!newDeckName.trim()}>
                            Crear Cuestionario
                        </Button>
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
        </div>
    );
}
