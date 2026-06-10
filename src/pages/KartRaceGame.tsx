import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Trophy, Flag, Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface QuizDeck {
  id: string;
  nombre: string;
  total_questions: number;
}
interface QuizQuestion {
  id: string;
  pregunta: string;
  explicacion: string | null;
  options: { id: string; texto: string; es_correcta: boolean }[];
}
type GamePhase = "select_deck" | "racing" | "result";

function KartSVG({ color, turbo, position }: { color: string; turbo: boolean; position: number }) {
  return (
    <div
      className="absolute transition-all duration-500 ease-out"
      style={{ left: `${Math.min(position, 95)}%`, bottom: "0" }}
    >
      {turbo && (
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex gap-0.5">
          <div className="w-4 h-1 rounded-full bg-orange-400 animate-pulse" />
          <div className="w-6 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
          <div className="w-3 h-1 rounded-full bg-red-500 animate-pulse" />
        </div>
      )}
      <svg viewBox="0 0 80 40" className="w-16 h-8 md:w-20 md:h-10 drop-shadow-lg">
        <rect x="10" y="12" width="60" height="18" rx="6" fill={color} />
        <rect x="20" y="5" width="30" height="14" rx="4" fill={color} opacity="0.85" />
        <rect x="24" y="8" width="10" height="8" rx="2" fill="#bfdbfe" opacity="0.7" />
        <rect x="36" y="8" width="10" height="8" rx="2" fill="#bfdbfe" opacity="0.7" />
        <circle cx="22" cy="34" r="6" fill="#1e293b" />
        <circle cx="22" cy="34" r="3" fill="#64748b" />
        <circle cx="58" cy="34" r="6" fill="#1e293b" />
        <circle cx="58" cy="34" r="3" fill="#64748b" />
        <rect x="55" y="15" width="8" height="3" rx="1" fill="#fbbf24" opacity="0.9" />
      </svg>
    </div>
  );
}

export default function KartRaceGame() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [decks, setDecks] = useState<QuizDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<QuizDeck | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>("select_deck");

  const [myPos, setMyPos] = useState(0);
  const [botPos, setBotPos] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answeredCorrectly, setAnsweredCorrectly] = useState<boolean | null>(null);
  const [questionsUsed, setQuestionsUsed] = useState<Set<string>>(new Set());
  const [turbo, setTurbo] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [winner, setWinner] = useState<"player" | "bot" | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("quiz_decks")
      .select("id, nombre, total_questions")
      .eq("user_id", user.id)
      .gt("total_questions", 0)
      .then(({ data }) => {
        if (data) setDecks(data as unknown as QuizDeck[]);
      });
  }, [user]);

  const fetchRandomQuestion = useCallback(async () => {
    if (!selectedDeck) return null;
    const { data: questions } = await supabase
      .from("quiz_questions")
      .select("id, pregunta, explicacion")
      .eq("deck_id", selectedDeck.id);
    if (!questions || questions.length === 0) return null;
    const available = questions.filter((q) => !questionsUsed.has(q.id));
    if (available.length === 0) {
      setQuestionsUsed(new Set());
    }
    const pool = available.length > 0 ? available : questions;
    const q = pool[Math.floor(Math.random() * pool.length)];
    const { data: options } = await supabase
      .from("quiz_options")
      .select("id, texto, es_correcta")
      .eq("question_id", q.id);
    setQuestionsUsed((prev) => new Set(prev).add(q.id));
    return { ...q, options: (options || []) as { id: string; texto: string; es_correcta: boolean }[] } as QuizQuestion;
  }, [selectedDeck, questionsUsed]);

  const loadNextQuestion = useCallback(async () => {
    setSelectedAnswer(null);
    setAnsweredCorrectly(null);
    const q = await fetchRandomQuestion();
    if (q) setCurrentQuestion(q);
  }, [fetchRandomQuestion]);

  // Bot movement
  useEffect(() => {
    if (gamePhase !== "racing") return;
    timerRef.current = setInterval(() => {
      setBotPos((prev) => {
        const advance = 1.5 + Math.random() * 1.5;
        const next = prev + advance;
        if (next >= 100) {
          setWinner((w) => w || "bot");
          setGamePhase("result");
        }
        return Math.min(next, 100);
      });
    }, 1200);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gamePhase]);

  const startRace = async () => {
    if (!selectedDeck) return;
    setGamePhase("racing");
    setMyPos(0);
    setBotPos(0);
    setQuestionCount(0);
    setCorrectCount(0);
    setWinner(null);
    setQuestionsUsed(new Set());
    await loadNextQuestion();
  };

  const handleAnswer = (optionId: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(optionId);
    const correct = currentQuestion?.options.find((o) => o.id === optionId)?.es_correcta || false;
    setAnsweredCorrectly(correct);
    setQuestionCount((c) => c + 1);

    if (correct) {
      setCorrectCount((c) => c + 1);
      const boost = 12 + Math.random() * 8;
      setTurbo(true);
      setTimeout(() => setTurbo(false), 600);
      setMyPos((prev) => {
        const next = prev + boost;
        if (next >= 100) {
          setWinner((w) => w || "player");
          setGamePhase("result");
        }
        return Math.min(next, 100);
      });
    } else {
      setMyPos((prev) => Math.max(prev - 3, 0));
    }

    setTimeout(() => loadNextQuestion(), 900);
  };

  // Keyboard support: 1-4
  useEffect(() => {
    if (gamePhase !== "racing" || !currentQuestion) return;
    const handler = (e: KeyboardEvent) => {
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < (currentQuestion?.options.length || 0)) {
        handleAnswer(currentQuestion!.options[idx].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gamePhase, currentQuestion, selectedAnswer]);

  if (gamePhase === "select_deck") {
    return (
      <div className="min-h-screen p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/juegos")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <Gauge className="w-6 h-6 text-red-500" /> Carrera de Karts
          </h1>
        </div>
        <Card className="card-gamer">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                <Gauge className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="font-display font-bold text-xl mb-2">Elegí tu mazo</h2>
              <p className="text-muted-foreground text-sm">
                Respondé rápido y bien para ganar turbo y llegar primero a la meta.
              </p>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {decks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No tenés mazos todavía</p>
                  <Button variant="outline" onClick={() => navigate("/cuestionarios")}>Crear cuestionario</Button>
                </div>
              ) : (
                decks.map((deck) => (
                  <button
                    key={deck.id}
                    onClick={() => setSelectedDeck(deck)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all duration-200",
                      selectedDeck?.id === deck.id
                        ? "border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                        : "border-border/50 bg-secondary/30 hover:bg-secondary/60"
                    )}
                  >
                    <p className="font-medium">{deck.nombre}</p>
                    <p className="text-xs text-muted-foreground">{deck.total_questions} preguntas</p>
                  </button>
                ))
              )}
            </div>
            {selectedDeck && (
              <Button className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-lg py-6 font-display font-bold" onClick={startRace}>
                <Flag className="w-5 h-5 mr-2" /> ¡Arrancar carrera!
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gamePhase === "racing") {
    return (
      <div className="min-h-screen p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        {/* Race Track */}
        <Card className="card-gamer overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="text-xs">
                <Flag className="w-3 h-3 mr-1" /> Carrera a la Meta
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Pregunta #{questionCount + 1}
              </Badge>
            </div>

            {/* Track visuals */}
            <div className="space-y-2">
              {/* Player lane */}
              <div className="relative h-14 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg border border-slate-600 overflow-hidden">
                <div className="absolute inset-0 flex items-center">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="h-0.5 w-4 bg-yellow-500/40 mx-2" />
                  ))}
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-lg">🏁</div>
                <KartSVG color="#22d3ee" turbo={turbo} position={myPos} />
                <div className="absolute left-1 top-0.5 text-[10px] text-cyan-400 font-bold">TÚ</div>
              </div>
              {/* Bot lane */}
              <div className="relative h-14 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg border border-slate-600 overflow-hidden">
                <div className="absolute inset-0 flex items-center">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="h-0.5 w-4 bg-yellow-500/40 mx-2" />
                  ))}
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-lg">🏁</div>
                <KartSVG color="#a855f7" turbo={false} position={botPos} />
                <div className="absolute left-1 top-0.5 text-[10px] text-purple-400 font-bold">BOT</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question */}
        {currentQuestion && (
          <Card className="card-gamer">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-medium text-lg leading-snug">{currentQuestion.pregunta}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = selectedAnswer === option.id;
                  const showCorrect = selectedAnswer !== null && option.es_correcta;
                  const showWrong = isSelected && !option.es_correcta;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleAnswer(option.id)}
                      disabled={!!selectedAnswer}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all duration-300 flex items-start gap-2",
                        !selectedAnswer && "hover:bg-secondary/60 hover:border-red-500/30 cursor-pointer",
                        selectedAnswer && "cursor-default",
                        showCorrect && "border-neon-green bg-neon-green/10",
                        showWrong && "border-destructive bg-destructive/10",
                        !showCorrect && !showWrong && selectedAnswer && "opacity-50",
                        !selectedAnswer && "border-border/50 bg-secondary/30"
                      )}
                    >
                      <span className="text-xs font-bold text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">{idx + 1}</span>
                      <p className="text-sm font-medium">{option.texto}</p>
                    </button>
                  );
                })}
              </div>
              {answeredCorrectly !== null && (
                <div className={cn("text-center text-sm font-medium py-1", answeredCorrectly ? "text-neon-green" : "text-destructive")}>
                  {answeredCorrectly ? "🚀 ¡Turbo! +velocidad" : "💥 Respuesta incorrecta, retrocedés"}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Result
  const isWinner = winner === "player";
  const xpEarned = isWinner ? 120 : 30;
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="card-gamer max-w-md w-full overflow-hidden">
        <div className={cn("p-8 text-center", isWinner ? "bg-gradient-to-br from-neon-gold/20 to-red-500/10" : "bg-gradient-to-br from-destructive/20 to-secondary")}>
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-background/30 flex items-center justify-center">
            {isWinner ? <Trophy className="w-12 h-12 text-neon-gold" /> : <Gauge className="w-12 h-12 text-muted-foreground" />}
          </div>
          <h2 className="font-display font-bold text-3xl mb-2">{isWinner ? "¡Victoria!" : "Derrota"}</h2>
          <p className="text-muted-foreground">{correctCount}/{questionCount} respuestas correctas</p>
        </div>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-neon-gold/10 border border-neon-gold/20">
            <Zap className="w-5 h-5 text-neon-gold" />
            <span className="font-display font-bold text-neon-gold">+{xpEarned} XP</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/juegos")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver
            </Button>
            <Button className="flex-1 bg-gradient-to-r from-red-500 to-orange-500" onClick={() => { setGamePhase("select_deck"); setMyPos(0); setBotPos(0); setWinner(null); }}>
              Otra carrera
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
