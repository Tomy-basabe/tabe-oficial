import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Trophy, Swords, Shield, Heart, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface QuizDeck { id: string; nombre: string; total_questions: number; }
interface QuizQuestion { id: string; pregunta: string; explicacion: string | null; options: { id: string; texto: string; es_correcta: boolean }[]; }
type GamePhase = "select_deck" | "battle" | "result";
type AttackType = "quick" | "strong" | "magic";

function HPBar({ current, max, color, label }: { current: number; max: number; color: string; label: string }) {
  const pct = Math.max(0, (current / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-bold">{label}</span>
        <span className="text-muted-foreground">{current}/{max} HP</span>
      </div>
      <div className="h-3 bg-secondary/60 rounded-full overflow-hidden border border-border/50">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PlayerCharacter({ hp, maxHp, shake }: { hp: number; maxHp: number; shake: boolean }) {
  return (
    <div className={cn("flex flex-col items-center transition-transform", shake && "animate-[shake_0.3s_ease-in-out]")}>
      <svg viewBox="0 0 100 140" className="w-24 h-32 md:w-32 md:h-40 drop-shadow-[0_10px_20px_rgba(34,211,238,0.3)]">
        <defs>
          <linearGradient id="playerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {/* Shield aura */}
        <circle cx="50" cy="60" r="45" fill="none" stroke="url(#playerGlow)" strokeWidth="1.5" opacity={hp / maxHp} />
        {/* Body */}
        <rect x="30" y="50" width="40" height="55" rx="8" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
        <line x1="42" y1="55" x2="42" y2="95" stroke="#22d3ee" strokeWidth="1" opacity="0.3" />
        <line x1="58" y1="55" x2="58" y2="95" stroke="#22d3ee" strokeWidth="1" opacity="0.3" />
        {/* Head */}
        <circle cx="50" cy="35" r="20" fill="#1e293b" stroke="#22d3ee" strokeWidth="2" />
        <rect x="38" y="28" width="24" height="8" rx="4" fill="#0ea5e9" />
        <rect x="40" y="30" width="8" height="4" rx="2" fill="#bae6fd" />
        <rect x="52" y="30" width="8" height="4" rx="2" fill="#bae6fd" />
        {/* Sword */}
        <rect x="72" y="40" width="4" height="45" rx="2" fill="#94a3b8" />
        <rect x="66" y="42" width="16" height="4" rx="2" fill="#64748b" />
        <polygon points="74,40 80,25 68,25" fill="#e2e8f0" />
        {/* Shoulder pads */}
        <ellipse cx="28" cy="55" rx="10" ry="8" fill="#0284c7" stroke="#22d3ee" strokeWidth="1" />
        <ellipse cx="72" cy="55" rx="10" ry="8" fill="#0284c7" stroke="#22d3ee" strokeWidth="1" />
      </svg>
    </div>
  );
}

function BotCharacter({ hp, maxHp, shake }: { hp: number; maxHp: number; shake: boolean }) {
  return (
    <div className={cn("flex flex-col items-center transition-transform", shake && "animate-[shake_0.3s_ease-in-out]")}>
      <svg viewBox="0 0 100 140" className="w-24 h-32 md:w-32 md:h-40 drop-shadow-[0_10px_20px_rgba(239,68,68,0.3)]">
        <defs>
          <linearGradient id="botGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="60" r="45" fill="none" stroke="url(#botGlow)" strokeWidth="1.5" opacity={hp / maxHp} />
        {/* Body - Demon/Dark knight */}
        <path d="M 25 55 L 75 55 L 68 110 L 32 110 Z" fill="#1a0a0a" stroke="#ef4444" strokeWidth="2" />
        <line x1="50" y1="60" x2="50" y2="105" stroke="#ef4444" strokeWidth="1" opacity="0.4" />
        {/* Head - Horned helmet */}
        <circle cx="50" cy="35" r="20" fill="#2a0a0a" stroke="#ef4444" strokeWidth="2" />
        <polygon points="30,25 25,5 35,20" fill="#ef4444" />
        <polygon points="70,25 75,5 65,20" fill="#ef4444" />
        {/* Evil eyes */}
        <rect x="38" y="28" width="10" height="6" rx="2" fill="#ef4444" />
        <rect x="52" y="28" width="10" height="6" rx="2" fill="#ef4444" />
        <rect x="40" y="30" width="6" height="3" rx="1" fill="#fca5a5" />
        <rect x="54" y="30" width="6" height="3" rx="1" fill="#fca5a5" />
        {/* Dark axe */}
        <rect x="5" y="30" width="4" height="50" rx="2" fill="#78350f" />
        <path d="M 0 30 Q 8 15 16 30 L 9 35 Z" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
        {/* Spiky shoulders */}
        <polygon points="25,55 10,45 20,65" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
        <polygon points="75,55 90,45 80,65" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
      </svg>
    </div>
  );
}

export default function RPGBattleGame() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [decks, setDecks] = useState<QuizDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<QuizDeck | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>("select_deck");

  const maxHP = 100;
  const [myHP, setMyHP] = useState(maxHP);
  const [botHP, setBotHP] = useState(maxHP);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answeredCorrectly, setAnsweredCorrectly] = useState<boolean | null>(null);
  const [questionsUsed, setQuestionsUsed] = useState<Set<string>>(new Set());
  const [attackType, setAttackType] = useState<AttackType | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeBot, setShakeBot] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [winner, setWinner] = useState<"player" | "bot" | null>(null);

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

  const startBattle = async () => {
    if (!selectedDeck) return;
    setGamePhase("battle");
    setMyHP(maxHP);
    setBotHP(maxHP);
    setIsMyTurn(true);
    setAttackType(null);
    setBattleLog(["⚔️ ¡Comienza la batalla!"]);
    setWinner(null);
    setQuestionsUsed(new Set());
  };

  const handleAttackChoice = async (type: AttackType) => {
    setAttackType(type);
    const q = await fetchRandomQuestion();
    if (q) setCurrentQuestion(q);
  };

  const handleAnswer = (optionId: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(optionId);
    const correct = currentQuestion?.options.find((o) => o.id === optionId)?.es_correcta || false;
    setAnsweredCorrectly(correct);

    const dmgMap: Record<AttackType, number> = { quick: 15, strong: 25, magic: 35 };
    const missChance: Record<AttackType, number> = { quick: 0.1, strong: 0.25, magic: 0.4 };

    setTimeout(() => {
      if (correct) {
        const baseDmg = dmgMap[attackType || "quick"];
        const miss = Math.random() < missChance[attackType || "quick"];
        if (miss) {
          setBattleLog((prev) => [...prev, `⚡ Tu ${attackType === "quick" ? "ataque rápido" : attackType === "strong" ? "ataque fuerte" : "magia"} falló por poco.`]);
        } else {
          const finalDmg = baseDmg + Math.floor(Math.random() * 10);
          setShakeBot(true);
          setTimeout(() => setShakeBot(false), 400);
          setBotHP((prev) => {
            const next = Math.max(prev - finalDmg, 0);
            if (next <= 0) { setWinner("player"); setGamePhase("result"); }
            return next;
          });
          setBattleLog((prev) => [...prev, `⚔️ ¡Le hiciste ${finalDmg} de daño con ${attackType === "quick" ? "ataque rápido" : attackType === "strong" ? "ataque fuerte" : "magia"}!`]);
        }
      } else {
        setBattleLog((prev) => [...prev, "❌ Respuesta incorrecta. ¡Perdiste tu turno!"]);
      }

      // Bot turn
      setTimeout(() => {
        const botDmg = 10 + Math.floor(Math.random() * 15);
        const botMiss = Math.random() < 0.3;
        if (botMiss) {
          setBattleLog((prev) => [...prev, "🛡️ ¡Bloqueaste el ataque del enemigo!"]);
        } else {
          setShakePlayer(true);
          setTimeout(() => setShakePlayer(false), 400);
          setMyHP((prev) => {
            const next = Math.max(prev - botDmg, 0);
            if (next <= 0) { setWinner("bot"); setGamePhase("result"); }
            return next;
          });
          setBattleLog((prev) => [...prev, `🔥 El enemigo te hizo ${botDmg} de daño.`]);
        }

        // Reset for next turn
        setTimeout(async () => {
          setSelectedAnswer(null);
          setAnsweredCorrectly(null);
          setAttackType(null);
          setCurrentQuestion(null);
        }, 500);
      }, 800);
    }, 600);
  };

  if (gamePhase === "select_deck") {
    return (
      <div className="min-h-screen p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/juegos")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <Swords className="w-6 h-6 text-purple-500" /> Batalla RPG
          </h1>
        </div>
        <Card className="card-gamer">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-red-500/20 flex items-center justify-center">
                <Swords className="w-10 h-10 text-purple-500" />
              </div>
              <h2 className="font-display font-bold text-xl mb-2">Elegí tu mazo</h2>
              <p className="text-muted-foreground text-sm">Respondé bien para atacar al enemigo. Elegí el tipo de ataque: rápido, fuerte o mágico.</p>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {decks.map((deck) => (
                <button key={deck.id} onClick={() => setSelectedDeck(deck)} className={cn("w-full text-left p-4 rounded-xl border transition-all", selectedDeck?.id === deck.id ? "border-purple-500 bg-purple-500/10" : "border-border/50 bg-secondary/30 hover:bg-secondary/60")}>
                  <p className="font-medium">{deck.nombre}</p>
                  <p className="text-xs text-muted-foreground">{deck.total_questions} preguntas</p>
                </button>
              ))}
            </div>
            {selectedDeck && (
              <Button className="w-full bg-gradient-to-r from-purple-600 to-red-600 text-lg py-6 font-display font-bold" onClick={startBattle}>
                <Swords className="w-5 h-5 mr-2" /> ¡A la batalla!
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gamePhase === "battle") {
    return (
      <div className="min-h-screen p-4 md:p-6 space-y-3 max-w-2xl mx-auto">
        {/* HP Bars */}
        <div className="grid grid-cols-2 gap-4">
          <HPBar current={myHP} max={maxHP} color="bg-gradient-to-r from-cyan-500 to-blue-500" label="Tú" />
          <HPBar current={botHP} max={maxHP} color="bg-gradient-to-r from-red-500 to-orange-500" label="Enemigo" />
        </div>

        {/* Characters */}
        <Card className="card-gamer overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-end justify-between h-48 relative bg-gradient-to-t from-slate-900 via-slate-800 to-indigo-950 rounded-xl overflow-hidden px-6">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(139,92,246,0.1),_transparent_70%)]" />
              <PlayerCharacter hp={myHP} maxHp={maxHP} shake={shakePlayer} />
              <div className="absolute top-2 left-1/2 -translate-x-1/2">
                <Badge variant="secondary" className="text-[10px]">VS</Badge>
              </div>
              <BotCharacter hp={botHP} maxHp={maxHP} shake={shakeBot} />
            </div>
          </CardContent>
        </Card>

        {/* Battle Log */}
        <div className="bg-secondary/30 rounded-xl p-3 max-h-20 overflow-y-auto border border-border/30">
          {battleLog.slice(-3).map((msg, i) => (
            <p key={i} className="text-xs text-muted-foreground">{msg}</p>
          ))}
        </div>

        {/* Attack selection or Question */}
        {!attackType ? (
          <Card className="card-gamer">
            <CardContent className="p-4">
              <h3 className="font-display font-bold text-center mb-3">Elegí tu ataque</h3>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { type: "quick" as AttackType, label: "Rápido", desc: "15 DMG · Preciso", icon: Zap, color: "from-cyan-500 to-blue-500" },
                  { type: "strong" as AttackType, label: "Fuerte", desc: "25 DMG · Riesgo medio", icon: Swords, color: "from-orange-500 to-red-500" },
                  { type: "magic" as AttackType, label: "Magia", desc: "35 DMG · Alto riesgo", icon: Flame, color: "from-purple-500 to-pink-500" },
                ]).map(({ type, label, desc, icon: Icon, color }) => (
                  <button key={type} onClick={() => handleAttackChoice(type)} className="p-4 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/60 transition-all text-center space-y-2 hover:scale-105">
                    <div className={cn("w-10 h-10 mx-auto rounded-lg bg-gradient-to-br flex items-center justify-center", color)}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="font-bold text-sm">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : currentQuestion ? (
          <Card className="card-gamer">
            <CardContent className="p-5 space-y-3">
              <Badge variant="secondary" className="text-xs">
                {attackType === "quick" ? "⚡ Ataque Rápido" : attackType === "strong" ? "⚔️ Ataque Fuerte" : "🔮 Magia"} — ¡Respondé para atacar!
              </Badge>
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
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  // Result
  const isWinner = winner === "player";
  const xpEarned = isWinner ? 130 : 30;
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="card-gamer max-w-md w-full overflow-hidden">
        <div className={cn("p-8 text-center", isWinner ? "bg-gradient-to-br from-neon-gold/20 to-purple-500/10" : "bg-gradient-to-br from-destructive/20 to-secondary")}>
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-background/30 flex items-center justify-center">
            {isWinner ? <Trophy className="w-12 h-12 text-neon-gold" /> : <Heart className="w-12 h-12 text-destructive" />}
          </div>
          <h2 className="font-display font-bold text-3xl mb-2">{isWinner ? "¡Victoria!" : "Derrota"}</h2>
        </div>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-neon-gold/10 border border-neon-gold/20">
            <Zap className="w-5 h-5 text-neon-gold" />
            <span className="font-display font-bold text-neon-gold">+{xpEarned} XP</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/juegos")}><ArrowLeft className="w-4 h-4 mr-2" /> Volver</Button>
            <Button className="flex-1 bg-gradient-to-r from-purple-600 to-red-600" onClick={() => { setGamePhase("select_deck"); setWinner(null); }}>
              Otra batalla
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
