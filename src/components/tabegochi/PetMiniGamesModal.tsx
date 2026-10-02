import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TabeGochiPet, PET_SPECIES_LIST } from "@/types/tabegochi";
import { PixelPetSprite } from "@/components/tabegochi/PixelPetSprite";
import { PixelItemIcon } from "@/components/tabegochi/PixelItemIcon";
import { Gamepad2, ArrowLeft, ArrowRight, Trophy, Zap, Heart, Sparkles, RefreshCw, Eye, Flame, Bomb } from "lucide-react";
import { TabeGochiAudio } from "@/lib/tabegochiAudio";
import { cn } from "@/lib/utils";

interface PetMiniGamesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pet: TabeGochiPet | null;
  onRecordResult: (won: boolean, coins: number, xp: number) => void;
}

export function PetMiniGamesModal({
  open,
  onOpenChange,
  pet,
  onRecordResult,
}: PetMiniGamesModalProps) {
  const [selectedGame, setSelectedGame] = useState<"menu" | "direction" | "catcher">("menu");
  const species = PET_SPECIES_LIST.find(s => s.id === pet?.species) || PET_SPECIES_LIST[0];

  // ==========================================
  // JUEGO 1: ¿HACIA DÓNDE MIRA? (Tamagotchi Clásico 1996)
  // ==========================================
  const [directionRound, setDirectionRound] = useState(1);
  const [directionScore, setDirectionScore] = useState(0);
  const [petLookingDirection, setPetLookingDirection] = useState<"left" | "right" | "center">("center");
  const [roundResult, setRoundResult] = useState<"correct" | "wrong" | null>(null);
  const [isGameOverDirection, setIsGameOverDirection] = useState(false);

  const handleDirectionChoice = (choice: "left" | "right") => {
    if (roundResult !== null || isGameOverDirection) return;

    TabeGochiAudio.playClick();
    const petChoice: "left" | "right" = Math.random() < 0.5 ? "left" : "right";
    setPetLookingDirection(petChoice);

    const isMatch = choice === petChoice;
    if (isMatch) {
      TabeGochiAudio.playHappy();
      setDirectionScore(s => s + 1);
      setRoundResult("correct");
    } else {
      setRoundResult("wrong");
    }

    setTimeout(() => {
      if (directionRound >= 5) {
        setIsGameOverDirection(true);
        const finalScore = isMatch ? directionScore + 1 : directionScore;
        const won = finalScore >= 3;
        onRecordResult(won, won ? 25 : 10, won ? 45 : 15);
      } else {
        setDirectionRound(r => r + 1);
        setPetLookingDirection("center");
        setRoundResult(null);
      }
    }, 1200);
  };

  const resetDirectionGame = () => {
    setDirectionRound(1);
    setDirectionScore(0);
    setPetLookingDirection("center");
    setRoundResult(null);
    setIsGameOverDirection(false);
  };

  // ==========================================
  // JUEGO 2: ATRAPA LOS BOCADILLOS (Mini-Arcade)
  // ==========================================
  const [catcherScore, setCatcherScore] = useState(0);
  const [catcherTimeLeft, setCatcherTimeLeft] = useState(20);
  const [catcherPetX, setCatcherPetX] = useState(50);
  const [fallingItems, setFallingItems] = useState<{ id: number; x: number; y: number; name: string; isBomb?: boolean }[]>([]);
  const [isCatcherPlaying, setIsCatcherPlaying] = useState(false);
  const [isCatcherGameOver, setIsCatcherGameOver] = useState(false);

  const startCatcherGame = () => {
    setCatcherScore(0);
    setCatcherTimeLeft(20);
    setCatcherPetX(50);
    setFallingItems([]);
    setIsCatcherPlaying(true);
    setIsCatcherGameOver(false);
  };

  // Timer loop for catcher game
  useEffect(() => {
    if (!isCatcherPlaying || catcherTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setCatcherTimeLeft(t => {
        if (t <= 1) {
          setIsCatcherPlaying(false);
          setIsCatcherGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCatcherPlaying, catcherTimeLeft]);

  // Catcher items physics loop
  useEffect(() => {
    if (!isCatcherPlaying) return;

    // Spawn items
    const spawner = setInterval(() => {
      const items = ["banana", "apple", "pizza", "cookie", "donut", "bomb"];
      const chosen = items[Math.floor(Math.random() * items.length)];
      setFallingItems(prev => [
        ...prev.slice(-12),
        {
          id: Date.now() + Math.random(),
          x: Math.floor(Math.random() * 80) + 10,
          y: 0,
          name: chosen,
          isBomb: chosen === "bomb"
        }
      ]);
    }, 600);

    // Gravity ticker
    const gravity = setInterval(() => {
      setFallingItems(prev => {
        const next: typeof prev = [];
        for (const item of prev) {
          const nextY = item.y + 6;
          // Collision check with pet
          if (nextY >= 75 && nextY <= 90 && Math.abs(item.x - catcherPetX) < 18) {
            if (item.isBomb) {
              setCatcherScore(s => Math.max(0, s - 3));
            } else {
              TabeGochiAudio.playEat();
              setCatcherScore(s => s + 1);
            }
          } else if (nextY < 100) {
            next.push({ ...item, y: nextY });
          }
        }
        return next;
      });
    }, 60);

    return () => {
      clearInterval(spawner);
      clearInterval(gravity);
    };
  }, [isCatcherPlaying, catcherPetX]);

  // When catcher game finishes
  useEffect(() => {
    if (isCatcherGameOver) {
      const won = catcherScore >= 8;
      onRecordResult(won, Math.max(5, catcherScore * 2), Math.max(10, catcherScore * 4));
    }
  }, [isCatcherGameOver]);

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        setSelectedGame("menu");
        resetDirectionGame();
        setIsCatcherPlaying(false);
      }
      onOpenChange(val);
    }}>
      <DialogContent className="bg-card border-4 border-black text-foreground w-[95vw] max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl p-0 gap-0 shadow-[8px_8px_0px_#000]">
        
        {/* Cabecera sin emojis */}
        <DialogHeader className="p-5 bg-[#FF2E93] border-b-4 border-black text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-black text-[#FF2E93] flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#fff]">
                <Gamepad2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-wider font-mono">
                  Arena de Minijuegos Retro
                </DialogTitle>
                <DialogDescription className="text-white/90 font-bold text-xs font-mono">
                  Gana TabeCoins y experiencia entrenando a tu mascota
                </DialogDescription>
              </div>
            </div>

            {selectedGame !== "menu" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedGame("menu");
                  resetDirectionGame();
                  setIsCatcherPlaying(false);
                }}
                className="bg-black text-white hover:bg-slate-800 font-mono font-black text-xs border-2 border-black shadow-[2px_2px_0px_#fff] uppercase"
              >
                Menú
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="p-6">
          {/* MENU PRINCIPAL DE MINIJUEGOS */}
          {selectedGame === "menu" && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center font-mono">
                Elige el desafío arcade para jugar con tu mascota:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Juego 1 */}
                <div
                  onClick={() => {
                    setSelectedGame("direction");
                    resetDirectionGame();
                  }}
                  className="p-5 rounded-2xl bg-card border-3 border-black shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_#000] group-hover:rotate-6 transition-transform">
                      <Eye className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <h3 className="font-black uppercase text-base text-foreground font-mono">¿Hacia dónde mira?</h3>
                    <p className="text-xs font-medium text-muted-foreground">
                      El juego clásico de Tamagotchi 1996. Adivina hacia qué lado girará la cabeza tu mascota.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-xs font-black text-primary uppercase font-mono">
                    <span>5 rondas</span>
                    <span>Jugar →</span>
                  </div>
                </div>

                {/* Juego 2 */}
                <div
                  onClick={() => {
                    setSelectedGame("catcher");
                    startCatcherGame();
                  }}
                  className="p-5 rounded-2xl bg-card border-3 border-black shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-[#00E5FF] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_#000] group-hover:-rotate-6 transition-transform">
                      <PixelItemIcon name="banana" size={26} />
                    </div>
                    <h3 className="font-black uppercase text-base text-foreground font-mono">Atrapa Bocadillos</h3>
                    <p className="text-xs font-medium text-muted-foreground">
                      Atrapa Nano Bananas y frutas cayendo del cielo y esquiva las bombas explosivas antes de que acabe el tiempo.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-xs font-black text-primary uppercase font-mono">
                    <span>20 segundos</span>
                    <span>Jugar →</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* PANTALLA JUEGO 1: ¿HACIA DÓNDE MIRA? */}
          {/* ========================================== */}
          {selectedGame === "direction" && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex items-center justify-between w-full px-2 text-xs font-black uppercase font-mono">
                <span>Ronda {directionRound} de 5</span>
                <span>Aciertos: {directionScore} / 5</span>
              </div>

              {/* Pantalla del juego */}
              <div className="w-full h-56 bg-[#9bbc0f] border-4 border-black rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
                
                {/* Personaje Pixel Art en el centro */}
                <div className={cn(
                  "transition-transform duration-300 filter drop-shadow select-none",
                  petLookingDirection === "left" && "-scale-x-100",
                  petLookingDirection === "right" && "scale-x-100",
                  petLookingDirection === "center" && "animate-bounce"
                )}>
                  {pet && (
                    <PixelPetSprite
                      species={pet.species}
                      hat={pet.hat}
                      outfit={pet.outfit}
                      heldItem={pet.heldItem}
                      aura={pet.aura}
                      colorSkin={pet.colorSkin}
                      size={105}
                    />
                  )}
                </div>

                {/* Feedback de la ronda sin emojis */}
                {roundResult === "correct" && (
                  <div className="absolute top-3 bg-[#10B981] text-white px-3 py-1 rounded-lg border-2 border-black font-black text-xs uppercase animate-bounce shadow-[2px_2px_0px_#000] font-mono">
                    ¡ACIERTO! +1 PUNTO
                  </div>
                )}
                {roundResult === "wrong" && (
                  <div className="absolute top-3 bg-[#FF5C5C] text-white px-3 py-1 rounded-lg border-2 border-black font-black text-xs uppercase shadow-[2px_2px_0px_#000] font-mono">
                    ¡FALLO!
                  </div>
                )}
              </div>

              {!isGameOverDirection ? (
                <div className="w-full space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase font-mono">
                    ¿Hacia qué lado girará {pet?.name}?
                  </p>
                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <Button
                      onClick={() => handleDirectionChoice("left")}
                      disabled={roundResult !== null}
                      className="bg-[#FFE600] hover:bg-yellow-400 text-black font-black uppercase text-sm border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0 active:translate-y-0 h-12 gap-2"
                    >
                      <ArrowLeft className="w-5 h-5 stroke-[3]" />
                      Izquierda
                    </Button>
                    <Button
                      onClick={() => handleDirectionChoice("right")}
                      disabled={roundResult !== null}
                      className="bg-[#00E5FF] hover:bg-cyan-400 text-black font-black uppercase text-sm border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0 active:translate-y-0 h-12 gap-2"
                    >
                      Derecha
                      <ArrowRight className="w-5 h-5 stroke-[3]" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2 font-mono">
                  <h3 className="text-xl font-black uppercase text-foreground">
                    {directionScore >= 3 ? "¡VICTORIA TOTAL!" : "¡PARTICIPACIÓN COMPLETADA!"}
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground">
                    Acertaste {directionScore} de 5 rondas. {directionScore >= 3 ? "¡Ganaste 25 TabeCoins y tu mascota subió de felicidad!" : "¡Ganaste 10 TabeCoins por tu esfuerzo!"}
                  </p>
                  <Button
                    onClick={resetDirectionGame}
                    className="bg-[#FFE600] text-black font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_#000] h-10 px-6 rounded-xl hover:bg-yellow-400"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Jugar de Nuevo
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* PANTALLA JUEGO 2: ATRAPA BOCADILLOS */}
          {/* ========================================== */}
          {selectedGame === "catcher" && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex items-center justify-between w-full px-2 text-xs font-black uppercase font-mono">
                <span>TIEMPO: {catcherTimeLeft}S</span>
                <span>PUNTOS: {catcherScore}</span>
              </div>

              {/* Área de caída */}
              <div className="w-full h-64 bg-[#9bbc0f] border-4 border-black rounded-2xl relative overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
                
                {/* Ítems cayendo en Pixel Art */}
                {fallingItems.map(item => (
                  <div
                    key={item.id}
                    className="absolute pointer-events-none transition-all duration-75"
                    style={{ left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    {item.isBomb ? (
                      <svg viewBox="0 0 16 16" width="24" height="24" style={{ shapeRendering: "crispEdges" }}>
                        <circle cx="8" cy="10" r="5" fill="#18181B" />
                        <rect x="7" y="4" width="2" height="2" fill="#71717A" />
                        <path d="M8 4 C 10 2, 12 4, 13 2" stroke="#F59E0B" strokeWidth="1" fill="none" />
                        <rect x="13" y="1" width="2" height="2" fill="#EF4444" className="animate-ping" />
                      </svg>
                    ) : (
                      <PixelItemIcon name={item.name} size={24} />
                    )}
                  </div>
                ))}

                {/* Mascota Pixel Art en el suelo */}
                <div
                  className="absolute bottom-2 transition-all duration-75 filter drop-shadow select-none pointer-events-none"
                  style={{ left: `${catcherPetX}%`, transform: "translateX(-50%)" }}
                >
                  {pet && (
                    <PixelPetSprite
                      species={pet.species}
                      hat={pet.hat}
                      outfit={pet.outfit}
                      heldItem={pet.heldItem}
                      aura={pet.aura}
                      colorSkin={pet.colorSkin}
                      size={64}
                    />
                  )}
                </div>
              </div>

              {!isCatcherGameOver ? (
                <div className="w-full space-y-2 font-mono">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => setCatcherPetX(x => Math.max(12, x - 18))}
                      className="bg-[#FFE600] hover:bg-yellow-400 text-black font-black uppercase text-sm border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0 active:translate-y-0 h-12 gap-2"
                    >
                      <ArrowLeft className="w-5 h-5 stroke-[3]" />
                      Izquierda
                    </Button>
                    <Button
                      onClick={() => setCatcherPetX(x => Math.min(88, x + 18))}
                      className="bg-[#00E5FF] hover:bg-cyan-400 text-black font-black uppercase text-sm border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0 active:translate-y-0 h-12 gap-2"
                    >
                      Derecha
                      <ArrowRight className="w-5 h-5 stroke-[3]" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    Atrapa Nano Bananas y alimentos. Esquiva las bombas explosivas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-2 font-mono">
                  <h3 className="text-xl font-black uppercase text-foreground">
                    ¡FIN DE LA PARTIDA!
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground">
                    Recolectaste {catcherScore} bocadillos. ¡Ganaste {Math.max(5, catcherScore * 2)} TabeCoins!
                  </p>
                  <Button
                    onClick={startCatcherGame}
                    className="bg-[#FFE600] hover:bg-yellow-400 text-black font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_#000] h-10 px-6 rounded-xl"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Jugar de Nuevo
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
