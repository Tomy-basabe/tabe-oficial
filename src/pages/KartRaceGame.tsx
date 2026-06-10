import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Trophy, Flag, Gauge, Medal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface QuizDeck { id: string; nombre: string; total_questions: number; }
interface QuizQuestion { id: string; pregunta: string; explicacion: string | null; options: { id: string; texto: string; es_correcta: boolean }[]; }
type GamePhase = "select_deck" | "racing" | "result";

const KART_COLORS = [
  { hex: "#22d3ee", name: "TÚ", isPlayer: true }, // Player (Cyan)
  { hex: "#ef4444", name: "BOT 1", isPlayer: false }, // Bot 1 (Red)
  { hex: "#a855f7", name: "BOT 2", isPlayer: false }, // Bot 2 (Purple)
  { hex: "#f59e0b", name: "BOT 3", isPlayer: false }  // Bot 3 (Orange)
];

function KartSVG({ color, turbo, position, isPlayer }: { color: string; turbo: boolean; position: number; isPlayer: boolean }) {
  return (
    <div className="absolute transition-all duration-500 ease-out" style={{ left: `${Math.min(position, 95)}%`, bottom: "0" }}>
      {turbo && (
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex gap-0.5">
          <div className="w-4 h-1 rounded-full bg-orange-400 animate-pulse" />
          <div className="w-6 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
          <div className="w-3 h-1 rounded-full bg-red-500 animate-pulse" />
        </div>
      )}
      <svg viewBox="0 0 80 40" className="w-14 h-7 md:w-16 md:h-8 drop-shadow-lg">
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
      {isPlayer && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-transparent border-t-white animate-bounce" />
      )}
    </div>
  );
}

export default function KartRaceGame() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [decks, setDecks] = useState<QuizDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<QuizDeck | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>("select_deck");

  // Track positions of all 4 karts (0 is player, 1-3 are bots)
  const [positions, setPositions] = useState<number[]>([0, 0, 0, 0]);
  const [finishedOrder, setFinishedOrder] = useState<number[]>([]); // array of kart indexes that crossed the finish line
  
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answeredCorrectly, setAnsweredCorrectly] = useState<boolean | null>(null);
  const [questionsUsed, setQuestionsUsed] = useState<Set<string>>(new Set());
  const [turbo, setTurbo] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  
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

  const loadNextQuestion = useCallback(async () => {
    setSelectedAnswer(null);
    setAnsweredCorrectly(null);
    const q = await fetchRandomQuestion();
    if (q) setCurrentQuestion(q);
  }, [fetchRandomQuestion]);

  // Game loop for bots and finish check
  useEffect(() => {
    if (gamePhase !== "racing") return;
    
    timerRef.current = setInterval(() => {
      setPositions((prev) => {
        const next = [...prev];
        let newlyFinished = [...finishedOrder];
        
        // Update bots (indices 1 to 3)
        for (let i = 1; i < 4; i++) {
          if (next[i] >= 100) continue; // already finished
          // Bot speed variation
          const advance = 1.0 + Math.random() * 2.5; 
          next[i] = Math.min(next[i] + advance, 100);
          if (next[i] >= 100 && !newlyFinished.includes(i)) {
            newlyFinished.push(i);
          }
        }
        
        // Check player
        if (next[0] >= 100 && !newlyFinished.includes(0)) {
          newlyFinished.push(0);
        }

        if (newlyFinished.length !== finishedOrder.length) {
          setFinishedOrder(newlyFinished);
          // End game if player finished OR if 3 karts finished
          if (newlyFinished.includes(0) || newlyFinished.length >= 3) {
             // ensure player is in the finished array if not already, put them last
             if (!newlyFinished.includes(0)) newlyFinished.push(0);
             clearInterval(timerRef.current!);
             setFinishedOrder(newlyFinished);
             setTimeout(() => setGamePhase("result"), 1000);
          }
        }
        
        return next;
      });
    }, 1200);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gamePhase, finishedOrder]);

  const startRace = async () => {
    if (!selectedDeck) return;
    setGamePhase("racing");
    setPositions([0, 0, 0, 0]);
    setFinishedOrder([]);
    setQuestionCount(0);
    setCorrectCount(0);
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
      setPositions((prev) => {
        const next = [...prev];
        if (next[0] < 100) {
          next[0] = Math.min(next[0] + boost, 100);
        }
        return next;
      });
    } else {
      setPositions((prev) => {
        const next = [...prev];
        next[0] = Math.max(next[0] - 3, 0);
        return next;
      });
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/juegos")}><ArrowLeft className="w-5 h-5" /></Button>
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
                Carrera de 4 jugadores. Respondé rápido y bien para ganar turbo y llegar al podio.
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
                  <button key={deck.id} onClick={() => setSelectedDeck(deck)} className={cn("w-full text-left p-4 rounded-xl border transition-all duration-200", selectedDeck?.id === deck.id ? "border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]" : "border-border/50 bg-secondary/30 hover:bg-secondary/60")}>
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
                <Flag className="w-3 h-3 mr-1" /> Copa TABE (4 Jugadores)
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Pregunta #{questionCount + 1}
              </Badge>
            </div>

            {/* Track visuals */}
            <div className="space-y-1">
              {KART_COLORS.map((kart, idx) => (
                <div key={idx} className="relative h-12 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg border border-slate-600 overflow-hidden">
                  <div className="absolute inset-0 flex items-center">
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className="h-0.5 w-4 bg-yellow-500/40 mx-2" />
                    ))}
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-sm">🏁</div>
                  <KartSVG color={kart.hex} turbo={idx === 0 ? turbo : false} position={positions[idx]} isPlayer={kart.isPlayer} />
                  <div className={cn("absolute left-1 top-0.5 text-[10px] font-bold shadow-black drop-shadow-md", kart.isPlayer ? "text-cyan-400" : "text-slate-400")}>
                    {kart.name} {finishedOrder.includes(idx) && `(#${finishedOrder.indexOf(idx) + 1})`}
                  </div>
                </div>
              ))}
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
  const playerPosition = finishedOrder.indexOf(0) + 1;
  const isPodium = playerPosition <= 3 && playerPosition > 0;
  
  let xpEarned = 20; // default for 4th
  if (playerPosition === 1) xpEarned = 150;
  if (playerPosition === 2) xpEarned = 80;
  if (playerPosition === 3) xpEarned = 40;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="card-gamer max-w-md w-full overflow-hidden">
        <div className={cn("p-8 text-center", playerPosition === 1 ? "bg-gradient-to-br from-neon-gold/20 to-red-500/10" : isPodium ? "bg-gradient-to-br from-slate-300/20 to-secondary" : "bg-gradient-to-br from-destructive/20 to-secondary")}>
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-background/30 flex items-center justify-center">
            {playerPosition === 1 ? <Trophy className="w-12 h-12 text-neon-gold" /> : isPodium ? <Medal className="w-12 h-12 text-slate-300" /> : <Gauge className="w-12 h-12 text-muted-foreground" />}
          </div>
          <h2 className="font-display font-bold text-3xl mb-2">
            {playerPosition === 1 ? "¡1º Lugar!" : playerPosition === 2 ? "¡2º Lugar!" : playerPosition === 3 ? "¡3º Lugar!" : "Derrota (4º)"}
          </h2>
          <p className="text-muted-foreground">{correctCount}/{questionCount} respuestas correctas</p>
          
          {/* Podium Table */}
          <div className="mt-4 text-left bg-background/50 rounded-xl p-3 space-y-2 border border-border/50">
            {finishedOrder.map((kartIdx, i) => (
               <div key={i} className={cn("flex justify-between items-center px-2 py-1 rounded", kartIdx === 0 && "bg-white/10 font-bold")}>
                 <span>#{i + 1} {KART_COLORS[kartIdx].name}</span>
                 {kartIdx === 0 && <span className="text-xs text-neon-cyan">(Tú)</span>}
               </div>
            ))}
          </div>

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
            <Button className="flex-1 bg-gradient-to-r from-red-500 to-orange-500" onClick={startRace}>
              Otra carrera
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
