import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Trophy, Bomb, Timer, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface QuizDeck { id: string; nombre: string; total_questions: number; }
interface QuizQuestion { id: string; pregunta: string; explicacion: string | null; options: { id: string; texto: string; es_correcta: boolean }[]; }
type GamePhase = "select_deck" | "playing" | "result";

function BombSVG({ timeLeft, maxTime }: { timeLeft: number; maxTime: number }) {
  const pct = timeLeft / maxTime;
  const isUrgent = pct < 0.3;
  return (
    <div className={cn("relative transition-transform", isUrgent && "animate-[shake_0.15s_ease-in-out_infinite]")}>
      <svg viewBox="0 0 120 150" className="w-32 h-40 md:w-40 md:h-48 drop-shadow-[0_15px_30px_rgba(239,68,68,0.5)]">
        {/* Bomb body */}
        <defs>
          <radialGradient id="bombGrad" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="60" cy="85" r="45" fill="url(#bombGrad)" stroke="#334155" strokeWidth="3" />
        {/* Highlight */}
        <ellipse cx="45" cy="70" rx="15" ry="10" fill="white" opacity="0.1" transform="rotate(-30 45 70)" />
        {/* Fuse */}
        <path d="M 60 40 Q 70 25 80 30 Q 90 35 85 20" fill="none" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
        {/* Spark/flame */}
        {timeLeft > 0 && (
          <g filter="url(#glow)">
            <ellipse cx="85" cy="15" rx="8" ry="12" fill="#f97316" className="animate-pulse">
              <animate attributeName="ry" values="12;8;12" dur="0.3s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="85" cy="12" rx="4" ry="8" fill="#fbbf24">
              <animate attributeName="ry" values="8;5;8" dur="0.2s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="85" cy="10" rx="2" ry="4" fill="white" />
          </g>
        )}
        {/* Timer text */}
        <text x="60" y="95" textAnchor="middle" fill={isUrgent ? "#ef4444" : "#e2e8f0"} fontSize="28" fontWeight="bold" fontFamily="monospace">
          {timeLeft}
        </text>
      </svg>
      {/* Danger ring */}
      {isUrgent && (
        <div className="absolute inset-0 rounded-full border-4 border-red-500/50 animate-ping" />
      )}
    </div>
  );
}

export default function BombGame() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [decks, setDecks] = useState<QuizDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<QuizDeck | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>("select_deck");

  const maxTime = 45;
  const [timeLeft, setTimeLeft] = useState(maxTime);
  const [bombHolder, setBombHolder] = useState<"player" | "bot">("player");
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answeredCorrectly, setAnsweredCorrectly] = useState<boolean | null>(null);
  const [questionsUsed, setQuestionsUsed] = useState<Set<string>>(new Set());
  const [passCount, setPassCount] = useState(0);
  const [winner, setWinner] = useState<"player" | "bot" | null>(null);
  const [exploded, setExploded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("quiz_decks").select("id, nombre, total_questions").eq("user_id", user.id).gt("total_questions", 0)
      .then(({ data }) => { if (data) setDecks(data as unknown as QuizDeck[]); });
  }, [user]);

  const fetchRandomQuestion = useCallback(async () => {
    if (!selectedDeck) return null;
    const { data: questions } = await supabase.from("quiz_questions").select("id, pregunta, explicacion").eq("deck_id", selectedDeck.id);
    if (!questions || questions.length === 0) return null;
    const available = questions.filter((q) => !questionsUsed.has(q.id));
    const pool = available.length > 0 ? available : questions;
    if (available.length === 0) setQuestionsUsed(new Set());
    const q = pool[Math.floor(Math.random() * pool.length)];
    const { data: options } = await supabase.from("quiz_options").select("id, texto, es_correcta").eq("question_id", q.id);
    setQuestionsUsed((prev) => new Set(prev).add(q.id));
    return { ...q, options: (options || []) as { id: string; texto: string; es_correcta: boolean }[] } as QuizQuestion;
  }, [selectedDeck, questionsUsed]);

  // Timer countdown
  useEffect(() => {
    if (gamePhase !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setExploded(true);
          setWinner(bombHolder === "player" ? "bot" : "player");
          setTimeout(() => setGamePhase("result"), 1500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gamePhase, bombHolder]);

  const startGame = async () => {
    if (!selectedDeck) return;
    setGamePhase("playing");
    setTimeLeft(maxTime);
    setBombHolder("player");
    setPassCount(0);
    setWinner(null);
    setExploded(false);
    setQuestionsUsed(new Set());
    const q = await fetchRandomQuestion();
    if (q) setCurrentQuestion(q);
  };

  const handleAnswer = async (optionId: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(optionId);
    const correct = currentQuestion?.options.find((o) => o.id === optionId)?.es_correcta || false;
    setAnsweredCorrectly(correct);

    if (correct) {
      // Pass bomb to bot
      setPassCount((c) => c + 1);
      setBombHolder("bot");

      // Bot's turn: bot tries to answer (simulated)
      setTimeout(async () => {
        const botCorrect = Math.random() < 0.5;
        if (botCorrect) {
          // Bot passes it back
          setBombHolder("player");
        }
        // else bomb stays with bot until next tick

        // Load next question
        setSelectedAnswer(null);
        setAnsweredCorrectly(null);
        const q = await fetchRandomQuestion();
        if (q) setCurrentQuestion(q);
        if (botCorrect) setBombHolder("player");
      }, 1200);
    } else {
      // Wrong answer: bomb stays, load new question
      setTimeout(async () => {
        setSelectedAnswer(null);
        setAnsweredCorrectly(null);
        const q = await fetchRandomQuestion();
        if (q) setCurrentQuestion(q);
      }, 1000);
    }
  };

  if (gamePhase === "select_deck") {
    return (
      <div className="min-h-screen p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/juegos")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <Bomb className="w-6 h-6 text-orange-500" /> La Bomba
          </h1>
        </div>
        <Card className="card-gamer">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-600/20 flex items-center justify-center">
                <Bomb className="w-10 h-10 text-orange-500" />
              </div>
              <h2 className="font-display font-bold text-xl mb-2">Elegí tu mazo</h2>
              <p className="text-muted-foreground text-sm">
                Respondé correctamente para pasar la bomba al rival. Si explota en tu lado, ¡perdés!
              </p>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {decks.map((deck) => (
                <button key={deck.id} onClick={() => setSelectedDeck(deck)} className={cn("w-full text-left p-4 rounded-xl border transition-all", selectedDeck?.id === deck.id ? "border-orange-500 bg-orange-500/10" : "border-border/50 bg-secondary/30 hover:bg-secondary/60")}>
                  <p className="font-medium">{deck.nombre}</p>
                  <p className="text-xs text-muted-foreground">{deck.total_questions} preguntas</p>
                </button>
              ))}
            </div>
            {selectedDeck && (
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-lg py-6 font-display font-bold" onClick={startGame}>
                <Bomb className="w-5 h-5 mr-2" /> ¡Empezar!
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gamePhase === "playing") {
    return (
      <div className="min-h-screen p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        {/* Explosion overlay */}
        {exploded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-orange-950/80 backdrop-blur-md animate-in fade-in">
            <div className="text-center animate-in zoom-in-50">
              <div className="text-[120px] leading-none mb-4">💥</div>
              <h2 className="font-display font-bold text-4xl text-orange-400">¡BOOM!</h2>
              <p className="text-orange-300/80 mt-2">
                {bombHolder === "player" ? "La bomba explotó en tu lado..." : "¡La bomba le explotó al rival!"}
              </p>
            </div>
          </div>
        )}

        {/* Status bar */}
        <div className="flex items-center justify-between">
          <Badge className={cn("text-sm px-4 py-1.5", bombHolder === "player" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400 border-green-500/30")}>
            {bombHolder === "player" ? "💣 ¡La bomba está contigo!" : "😌 La bomba está con el rival"}
          </Badge>
          <Badge variant="secondary" className="text-xs">Pases: {passCount}</Badge>
        </div>

        {/* Bomb visual */}
        <div className="flex justify-center py-4">
          <BombSVG timeLeft={timeLeft} maxTime={maxTime} />
        </div>

        {/* Question */}
        {bombHolder === "player" && currentQuestion && !exploded && (
          <Card className="card-gamer">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertTriangle className="w-3 h-3" />
                ¡Respondé correctamente para pasar la bomba!
              </div>
              <h3 className="font-medium text-base leading-snug">{currentQuestion.pregunta}</h3>
              <div className="space-y-2">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedAnswer === option.id;
                  const showCorrect = selectedAnswer !== null && option.es_correcta;
                  const showWrong = isSelected && !option.es_correcta;
                  return (
                    <button key={option.id} onClick={() => handleAnswer(option.id)} disabled={!!selectedAnswer}
                      className={cn("w-full text-left p-3 rounded-xl border transition-all duration-300",
                        !selectedAnswer && "hover:bg-secondary/60 cursor-pointer",
                        showCorrect && "border-neon-green bg-neon-green/10",
                        showWrong && "border-destructive bg-destructive/10",
                        !showCorrect && !showWrong && selectedAnswer && "opacity-50",
                        !selectedAnswer && "border-border/50 bg-secondary/30"
                      )}>
                      <p className="text-sm font-medium">{option.texto}</p>
                    </button>
                  );
                })}
              </div>
              {answeredCorrectly === true && (
                <p className="text-center text-sm text-neon-green font-medium">✅ ¡Correcto! Pasaste la bomba al rival</p>
              )}
              {answeredCorrectly === false && (
                <p className="text-center text-sm text-destructive font-medium">❌ Incorrecto. ¡La bomba sigue contigo!</p>
              )}
            </CardContent>
          </Card>
        )}

        {bombHolder === "bot" && !exploded && (
          <Card className="card-gamer">
            <CardContent className="p-8 text-center">
              <div className="animate-pulse text-muted-foreground">
                <p className="text-lg font-medium mb-2">El rival tiene la bomba...</p>
                <p className="text-sm">Está intentando responder para devolvértela</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Result
  const isWinner = winner === "player";
  const xpEarned = isWinner ? 110 : 25;
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="card-gamer max-w-md w-full overflow-hidden">
        <div className={cn("p-8 text-center", isWinner ? "bg-gradient-to-br from-neon-gold/20 to-orange-500/10" : "bg-gradient-to-br from-destructive/20 to-secondary")}>
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-background/30 flex items-center justify-center">
            {isWinner ? <Trophy className="w-12 h-12 text-neon-gold" /> : <Bomb className="w-12 h-12 text-destructive" />}
          </div>
          <h2 className="font-display font-bold text-3xl mb-2">{isWinner ? "¡Sobreviviste!" : "¡BOOM!"}</h2>
          <p className="text-muted-foreground">{passCount} pases de bomba exitosos</p>
        </div>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-neon-gold/10 border border-neon-gold/20">
            <Zap className="w-5 h-5 text-neon-gold" />
            <span className="font-display font-bold text-neon-gold">+{xpEarned} XP</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/juegos")}><ArrowLeft className="w-4 h-4 mr-2" /> Volver</Button>
            <Button className="flex-1 bg-gradient-to-r from-orange-500 to-red-600" onClick={() => { setGamePhase("select_deck"); setWinner(null); setExploded(false); }}>
              Otra ronda
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
