import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gamepad2, Trophy, Zap, Clock, Users, Bot, Loader2, Shield, Goal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useGames } from "@/hooks/useGames";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { supabase } from "@/integrations/supabase/client";
import { CareerSelectModal } from "@/components/games/CareerSelectModal";
import { toast } from "sonner";
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

type GamePhase = 'select_deck' | 'searching' | 'playing' | 'result';
type TurnPhase = 'choose_direction' | 'answer_question' | 'result_animation';
type Direction = 'left' | 'center' | 'right';

export default function PenaltyGame() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userCarrera, submitCareerRequest, updateUserCarrera } = useGames();
  const { status, matchId, opponentName, timeLeft, joinQueue, leaveQueue, setStatus, setMatchId } = useMatchmaking();

  // Career modal
  const [showCareerModal, setShowCareerModal] = useState(false);

  // Deck selection
  const [decks, setDecks] = useState<QuizDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<QuizDeck | null>(null);

  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>('select_deck');
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('choose_direction');
  const [round, setRound] = useState(1);
  const [maxRounds] = useState(5);
  const [myScore, setMyScore] = useState(0);
  const [opScore, setOpScore] = useState(0);
  const [isMyTurnToShoot, setIsMyTurnToShoot] = useState(true);

  // Turn state
  const [myDirection, setMyDirection] = useState<Direction | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answeredCorrectly, setAnsweredCorrectly] = useState<boolean | null>(null);
  const [turnResult, setTurnResult] = useState<'goal' | 'saved' | 'missed' | null>(null);
  const [questionsUsed, setQuestionsUsed] = useState<Set<string>>(new Set());

  // Animation
  const [showGoalAnimation, setShowGoalAnimation] = useState(false);
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);

  // Fetch user's quiz decks
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

  // Fetch a random question from deck
  const fetchRandomQuestion = useCallback(async () => {
    if (!selectedDeck) return null;

    const { data: questions } = await supabase
      .from("quiz_questions")
      .select("id, pregunta, explicacion")
      .eq("deck_id", selectedDeck.id);

    if (!questions || questions.length === 0) return null;

    // Filter out already used questions
    const available = questions.filter(q => !questionsUsed.has(q.id));
    if (available.length === 0) {
      // Reset if all used
      setQuestionsUsed(new Set());
      return fetchRandomQuestion();
    }

    const q = available[Math.floor(Math.random() * available.length)];

    // Fetch options
    const { data: options } = await supabase
      .from("quiz_options")
      .select("id, texto, es_correcta")
      .eq("question_id", q.id);

    setQuestionsUsed(prev => new Set(prev).add(q.id));

    return {
      ...q,
      options: (options || []) as { id: string; texto: string; es_correcta: boolean }[]
    } as QuizQuestion;
  }, [selectedDeck, questionsUsed]);

  // Handle matchmaking status changes
  useEffect(() => {
    if (status === 'found' || status === 'bot') {
      setGamePhase('playing');
      setRound(1);
      setMyScore(0);
      setOpScore(0);
      setIsMyTurnToShoot(true);
      setTurnPhase('choose_direction');
    }
  }, [status]);

  // Start searching
  const handleStartSearch = () => {
    if (!selectedDeck) return;
    if (!userCarrera) {
      setShowCareerModal(true);
      return;
    }
    setGamePhase('searching');
    joinQueue(selectedDeck.id, selectedDeck.nombre, userCarrera);
  };

  const handleCareerSelected = async (carrera: string, facultad: string) => {
    await updateUserCarrera(carrera, facultad);
    setShowCareerModal(false);
    if (selectedDeck) {
      setGamePhase('searching');
      joinQueue(selectedDeck.id, selectedDeck.nombre, carrera);
    }
  };

  // Cancel search
  const handleCancelSearch = () => {
    leaveQueue();
    setGamePhase('select_deck');
  };

  // Choose direction (shoot or save)
  const handleChooseDirection = async (dir: Direction) => {
    setMyDirection(dir);
    setTurnPhase('answer_question');

    const q = await fetchRandomQuestion();
    if (q) setCurrentQuestion(q);
  };

  // Answer question
  const handleAnswer = (optionId: string) => {
    if (selectedAnswer) return; // Prevent double click
    setSelectedAnswer(optionId);

    const correct = currentQuestion?.options.find(o => o.id === optionId)?.es_correcta || false;
    setAnsweredCorrectly(correct);

    // Simulate bot's action
    const botDirection: Direction = ['left', 'center', 'right'][Math.floor(Math.random() * 3)] as Direction;
    const botAnsweredCorrectly = Math.random() < 0.55; // 55% accuracy for bot

    // Calculate result
    setTimeout(() => {
      let result: 'goal' | 'saved' | 'missed';

      if (isMyTurnToShoot) {
        // I'm shooting
        if (!correct) {
          result = 'missed'; // Wrong answer = miss
        } else if (myDirection !== botDirection) {
          result = 'goal'; // Different direction from keeper = goal
        } else if (!botAnsweredCorrectly) {
          result = 'goal'; // Keeper answered wrong = goal even if same direction
        } else {
          result = 'saved'; // Same direction + keeper answered right = saved
        }

        if (result === 'goal') {
          setMyScore(prev => prev + 1);
          setShowGoalAnimation(true);
          setTimeout(() => setShowGoalAnimation(false), 1500);
        } else if (result === 'saved') {
          setShowSaveAnimation(true);
          setTimeout(() => setShowSaveAnimation(false), 1500);
        }
      } else {
        // I'm saving
        if (!botAnsweredCorrectly) {
          result = 'missed'; // Bot missed
        } else if (myDirection === botDirection) {
          if (correct) {
            result = 'saved'; // I guessed right + answered right = saved
            setShowSaveAnimation(true);
            setTimeout(() => setShowSaveAnimation(false), 1500);
          } else {
            result = 'goal'; // I guessed right but answered wrong = goal for bot
            setOpScore(prev => prev + 1);
            setShowGoalAnimation(true);
            setTimeout(() => setShowGoalAnimation(false), 1500);
          }
        } else {
          result = 'goal'; // Wrong direction = goal for bot
          setOpScore(prev => prev + 1);
          setShowGoalAnimation(true);
          setTimeout(() => setShowGoalAnimation(false), 1500);
        }
      }

      setTurnResult(result);
      setTurnPhase('result_animation');
    }, 800);
  };

  // Next turn
  const handleNextTurn = () => {
    setSelectedAnswer(null);
    setAnsweredCorrectly(null);
    setTurnResult(null);
    setCurrentQuestion(null);
    setMyDirection(null);

    if (!isMyTurnToShoot) {
      // Both players shot this round, move to next
      if (round >= maxRounds) {
        // Game over
        setGamePhase('result');
        return;
      }
      setRound(prev => prev + 1);
    }

    setIsMyTurnToShoot(!isMyTurnToShoot);
    setTurnPhase('choose_direction');
  };

  // Play again
  const handlePlayAgain = () => {
    setGamePhase('select_deck');
    setRound(1);
    setMyScore(0);
    setOpScore(0);
    setTurnPhase('choose_direction');
    setStatus('idle');
    setMatchId(null);
    setQuestionsUsed(new Set());
  };

  // ============================================
  // RENDER
  // ============================================

  // PHASE 1: Select Deck
  if (gamePhase === 'select_deck') {
    return (
      <div className="min-h-screen p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/juegos")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl md:text-2xl font-display font-bold">⚽ Tanda de Penales</h1>
        </div>

        <Card className="card-gamer">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-5xl mb-4">⚽</div>
              <h2 className="font-display font-bold text-xl mb-2">Elegí tu mazo de estudio</h2>
              <p className="text-muted-foreground text-sm">
                Las preguntas del juego saldrán de tu mazo de cuestionarios.
                Respondé correctamente para meter goles.
              </p>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {decks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No tenés mazos de cuestionarios todavía</p>
                  <Button variant="outline" onClick={() => navigate("/cuestionarios")}>
                    Crear un cuestionario
                  </Button>
                </div>
              ) : (
                decks.map(deck => (
                  <button
                    key={deck.id}
                    onClick={() => setSelectedDeck(deck)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all duration-200",
                      selectedDeck?.id === deck.id
                        ? "border-neon-cyan bg-neon-cyan/10 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                        : "border-border/50 bg-secondary/30 hover:bg-secondary/60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{deck.nombre}</p>
                        <p className="text-xs text-muted-foreground">{deck.total_questions} preguntas</p>
                      </div>
                      {selectedDeck?.id === deck.id && (
                        <div className="w-6 h-6 rounded-full bg-neon-cyan flex items-center justify-center">
                          <Gamepad2 className="w-3 h-3 text-background" />
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {selectedDeck && (
              <Button
                className="w-full bg-gradient-to-r from-neon-cyan to-neon-purple text-lg py-6 font-display font-bold"
                onClick={handleStartSearch}
              >
                <Gamepad2 className="w-5 h-5 mr-2" />
                ¡Buscar Rival!
              </Button>
            )}
          </CardContent>
        </Card>

        <CareerSelectModal
          open={showCareerModal}
          onClose={() => setShowCareerModal(false)}
          onCareerSelected={handleCareerSelected}
          onRequestCareer={submitCareerRequest}
        />
      </div>
    );
  }

  // PHASE 2: Searching for opponent
  if (gamePhase === 'searching') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="card-gamer max-w-md w-full">
          <CardContent className="p-8 text-center space-y-6">
            {/* Pulsing search animation */}
            <div className="relative mx-auto w-32 h-32">
              <div className="absolute inset-0 rounded-full border-2 border-neon-cyan/30 animate-ping" />
              <div className="absolute inset-4 rounded-full border-2 border-neon-purple/30 animate-ping" style={{ animationDelay: '0.5s' }} />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-neon-cyan animate-spin" />
              </div>
            </div>

            <div>
              <h2 className="font-display font-bold text-xl mb-2">Buscando rival...</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Emparejando con alguien de tu carrera
              </p>
            </div>

            {/* Timer */}
            <div className="relative w-20 h-20 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-secondary"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="2"
                  strokeDasharray={`${(timeLeft / 14) * 100}, 100`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient">
                    <stop offset="0%" stopColor="hsl(var(--neon-cyan))" />
                    <stop offset="100%" stopColor="hsl(var(--neon-purple))" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display font-bold text-2xl">{timeLeft}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {timeLeft <= 5 ? "Si no se encuentra rival, jugarás contra el Bot 🤖" : "Buscando en tu carrera..."}
            </p>

            <Button variant="outline" onClick={handleCancelSearch}>
              Cancelar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PHASE 3: Playing
  if (gamePhase === 'playing') {
    return (
      <div className="min-h-screen p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        {/* Scoreboard */}
        <div className="flex items-center justify-between bg-card/80 backdrop-blur-md rounded-2xl p-4 border border-border/50">
          <div className="text-center flex-1">
            <p className="text-xs text-muted-foreground mb-1">Vos</p>
            <p className="font-display font-bold text-3xl text-neon-cyan">{myScore}</p>
          </div>
          <div className="text-center px-4">
            <Badge variant="secondary" className="text-xs mb-1">
              Ronda {round}/{maxRounds}
            </Badge>
            <p className="text-lg font-bold text-muted-foreground">vs</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-xs text-muted-foreground mb-1">{opponentName || "Rival"}</p>
            <p className="font-display font-bold text-3xl text-neon-purple">{opScore}</p>
          </div>
        </div>

        {/* Turn indicator */}
        <div className="text-center">
          <Badge className={cn(
            "text-sm px-4 py-1.5",
            isMyTurnToShoot ? "bg-neon-green/20 text-neon-green border-neon-green/30" : "bg-neon-gold/20 text-neon-gold border-neon-gold/30"
          )}>
            {isMyTurnToShoot ? "⚽ Tu turno de patear" : "🧤 Tu turno de atajar"}
          </Badge>
        </div>

        {/* Goal animations */}
        {showGoalAnimation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in">
            <div className="text-center animate-in zoom-in-50">
              <div className="text-8xl mb-4">⚽</div>
              <h2 className="font-display font-bold text-4xl text-neon-green">¡GOOOL!</h2>
            </div>
          </div>
        )}
        {showSaveAnimation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in">
            <div className="text-center animate-in zoom-in-50">
              <div className="text-8xl mb-4">🧤</div>
              <h2 className="font-display font-bold text-4xl text-neon-cyan">¡ATAJADA!</h2>
            </div>
          </div>
        )}

        {/* Choose direction */}
        {turnPhase === 'choose_direction' && (
          <Card className="card-gamer">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-display font-bold text-center text-lg">
                {isMyTurnToShoot ? "¿A dónde pateás?" : "¿A dónde te tirás?"}
              </h3>

              {/* Goal visualization */}
              <div className="relative mx-auto w-full max-w-sm h-48 bg-gradient-to-b from-green-900/30 to-green-800/10 rounded-xl border border-green-500/20 overflow-hidden">
                {/* Goal posts */}
                <div className="absolute top-4 left-8 right-8 bottom-0 border-t-4 border-l-4 border-r-4 border-white/50 rounded-t-lg">
                  {/* Net pattern */}
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, white 20px, white 21px), repeating-linear-gradient(90deg, transparent, transparent 20px, white 20px, white 21px)'
                  }} />
                </div>

                {/* Direction buttons */}
                <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                  {(['left', 'center', 'right'] as Direction[]).map(dir => (
                    <button
                      key={dir}
                      onClick={() => handleChooseDirection(dir)}
                      className="flex-1 h-28 rounded-xl border-2 border-white/20 bg-white/5 hover:bg-neon-cyan/20 hover:border-neon-cyan/50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group"
                    >
                      <span className="text-3xl group-hover:scale-125 transition-transform">
                        {dir === 'left' ? '⬅️' : dir === 'center' ? '⬆️' : '➡️'}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {dir === 'left' ? 'Izquierda' : dir === 'center' ? 'Centro' : 'Derecha'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Answer question */}
        {turnPhase === 'answer_question' && currentQuestion && (
          <Card className="card-gamer">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {isMyTurnToShoot ? "⚽ Pateando a la " : "🧤 Atajando a la "}
                  {myDirection === 'left' ? 'izquierda' : myDirection === 'center' ? 'centro' : 'derecha'}
                </Badge>
              </div>

              <h3 className="font-medium text-lg leading-snug">{currentQuestion.pregunta}</h3>

              <div className="space-y-2">
                {currentQuestion.options.map(option => {
                  const isSelected = selectedAnswer === option.id;
                  const showCorrect = selectedAnswer !== null && option.es_correcta;
                  const showWrong = isSelected && !option.es_correcta;

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleAnswer(option.id)}
                      disabled={!!selectedAnswer}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border transition-all duration-300",
                        !selectedAnswer && "hover:bg-secondary/60 hover:border-neon-cyan/30 cursor-pointer",
                        selectedAnswer && "cursor-default",
                        showCorrect && "border-neon-green bg-neon-green/10",
                        showWrong && "border-destructive bg-destructive/10",
                        !showCorrect && !showWrong && selectedAnswer && "opacity-50",
                        !selectedAnswer && "border-border/50 bg-secondary/30"
                      )}
                    >
                      <p className="text-sm font-medium">{option.texto}</p>
                    </button>
                  );
                })}
              </div>

              {selectedAnswer && currentQuestion.explicacion && (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <p className="text-xs text-muted-foreground">{currentQuestion.explicacion}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Turn result */}
        {turnPhase === 'result_animation' && (
          <Card className="card-gamer">
            <CardContent className="p-6 text-center space-y-4">
              <div className="text-6xl">
                {turnResult === 'goal' && (isMyTurnToShoot ? '⚽' : '😔')}
                {turnResult === 'saved' && (isMyTurnToShoot ? '😤' : '🧤')}
                {turnResult === 'missed' && (isMyTurnToShoot ? '💨' : '😅')}
              </div>
              <h3 className="font-display font-bold text-xl">
                {turnResult === 'goal' && (isMyTurnToShoot ? '¡Golazo! 🔥' : 'Te hicieron gol 😔')}
                {turnResult === 'saved' && (isMyTurnToShoot ? 'Se la atajaron 😤' : '¡Gran atajada! 🧤')}
                {turnResult === 'missed' && (isMyTurnToShoot ? 'Tiraste afuera 💨' : '¡El rival tiró afuera! 😅')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {answeredCorrectly ? "✅ Respondiste correctamente" : "❌ Respuesta incorrecta"}
              </p>

              <Button
                className="w-full bg-gradient-to-r from-neon-cyan to-neon-purple"
                onClick={handleNextTurn}
              >
                {!isMyTurnToShoot && round >= maxRounds ? "Ver resultado final" : "Siguiente turno →"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // PHASE 4: Result
  if (gamePhase === 'result') {
    const isWinner = myScore > opScore;
    const isDraw = myScore === opScore;
    const xpEarned = isWinner ? 100 : isDraw ? 50 : 25;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="card-gamer max-w-md w-full overflow-hidden">
          {/* Top banner */}
          <div className={cn(
            "p-8 text-center",
            isWinner ? "bg-gradient-to-br from-neon-gold/20 to-neon-cyan/10" : isDraw ? "bg-gradient-to-br from-secondary to-secondary/50" : "bg-gradient-to-br from-destructive/20 to-secondary"
          )}>
            <div className="text-7xl mb-4">
              {isWinner ? '🏆' : isDraw ? '🤝' : '😔'}
            </div>
            <h2 className="font-display font-bold text-3xl mb-2">
              {isWinner ? '¡Victoria!' : isDraw ? 'Empate' : 'Derrota'}
            </h2>
            <div className="flex items-center justify-center gap-4 text-4xl font-display font-bold">
              <span className="text-neon-cyan">{myScore}</span>
              <span className="text-muted-foreground text-2xl">-</span>
              <span className="text-neon-purple">{opScore}</span>
            </div>
          </div>

          <CardContent className="p-6 space-y-4">
            {/* XP earned */}
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-neon-gold/10 border border-neon-gold/20">
              <Zap className="w-5 h-5 text-neon-gold" />
              <span className="font-display font-bold text-neon-gold">+{xpEarned} XP</span>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/juegos")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-neon-cyan to-neon-purple"
                onClick={handlePlayAgain}
              >
                <Gamepad2 className="w-4 h-4 mr-2" />
                Jugar otra vez
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
