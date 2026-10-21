import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Swords, X, Check, Gamepad2, User } from "lucide-react";
import { useGameRoom, IncomingChallenge } from "@/hooks/useGameRoom";

export function IncomingChallengeModal() {
  const navigate = useNavigate();
  const { listenForChallenges } = useGameRoom();
  const [challenge, setChallenge] = useState<IncomingChallenge | null>(null);

  useEffect(() => {
    const unsubscribe = listenForChallenges((incoming) => {
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
    ajedrez: "Ajedrez Clásico",
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
      <DialogContent className="bg-card text-foreground border border-border/80 shadow-2xl rounded-2xl max-w-sm p-5 animate-in fade-in zoom-in-95">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Swords className="w-3.5 h-3.5" />
            </div>
            <span>Desafío de juego</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/70 border border-border mx-auto flex items-center justify-center text-foreground">
            <Gamepad2 className="w-6 h-6 text-foreground/80" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span>Invitación de compañero</span>
            </div>
            <h4 className="font-semibold text-lg text-foreground">
              {challenge.hostName}
            </h4>
            <p className="text-xs text-muted-foreground">
              Te ha invitado a una partida en <span className="text-foreground font-medium">{gameTitle}</span>
            </p>
          </div>

          <div className="flex gap-2.5 pt-2 border-t border-border/60">
            <Button
              variant="outline"
              onClick={handleReject}
              className="flex-1 h-9 text-xs font-medium border-border/80 hover:bg-muted"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Rechazar
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 h-9 text-xs font-medium"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Aceptar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
