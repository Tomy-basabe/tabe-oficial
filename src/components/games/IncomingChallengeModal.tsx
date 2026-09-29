import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Swords, Flame, X, Check } from "lucide-react";
import { useGameRoom, IncomingChallenge } from "@/hooks/useGameRoom";
import { ComicAudio } from "@/components/comic/ComicAudio";

export function IncomingChallengeModal() {
  const navigate = useNavigate();
  const { listenForChallenges } = useGameRoom();
  const [challenge, setChallenge] = useState<IncomingChallenge | null>(null);

  useEffect(() => {
    const unsubscribe = listenForChallenges((incoming) => {
      try {
        ComicAudio.playSuccess();
      } catch {}
      setChallenge(incoming);
    });

    return () => {
      unsubscribe();
    };
  }, [listenForChallenges]);

  if (!challenge) return null;

  const gameNames: Record<string, string> = {
    penales: "Tanda de Penales",
    tateti: "Ta-Te-Ti Táctico",
    bomba: "La Bomba",
    batalla: "Batalla RPG",
    ajedrez: "Ajedrez",
    karts: "Carrera de Karts",
  };

  const gamePaths: Record<string, string> = {
    penales: "/juegos/penales",
    tateti: "/juegos/tateti",
    bomba: "/juegos/bomba",
    batalla: "/juegos/batalla",
    ajedrez: "/juegos/ajedrez",
    karts: "/juegos/karts",
  };

  const gameTitle = gameNames[challenge.gameType] || challenge.gameType;
  const gamePath = gamePaths[challenge.gameType] || "/juegos";

  const handleAccept = () => {
    const code = challenge.roomCode;
    setChallenge(null);
    navigate(`${gamePath}?room=${code}`);
  };

  const handleReject = () => {
    setChallenge(null);
  };

  return (
    <Dialog open={!!challenge} onOpenChange={(v) => !v && setChallenge(null)}>
      <DialogContent className="bg-card text-foreground border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl max-w-sm p-6 animate-in fade-in zoom-in-95">
        <DialogHeader>
          <DialogTitle className="font-black uppercase text-xl flex items-center gap-2 border-b-4 border-foreground pb-3 text-[#FF5C5C]">
            <Flame className="w-6 h-6 animate-pulse" />
            ¡Desafío de Amigo!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FFD700] border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] mx-auto flex items-center justify-center text-black">
            <Swords className="w-9 h-9" strokeWidth={2.5} />
          </div>

          <div>
            <h4 className="font-black text-xl uppercase text-foreground">{challenge.hostName}</h4>
            <p className="text-sm font-bold text-muted-foreground mt-1">
              Te retó a un duelo en <span className="text-foreground underline decoration-[#00E5FF] decoration-2">{gameTitle}</span>
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleReject}
              className="flex-1 font-black uppercase border-2 border-foreground hover:bg-muted h-12"
            >
              <X className="w-4 h-4 mr-1" />
              Rechazar
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 bg-[#BFFF00] text-black font-black uppercase border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:bg-[#a6e600] h-12"
            >
              <Check className="w-4 h-4 mr-1 stroke-[3]" />
              ¡Aceptar!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
