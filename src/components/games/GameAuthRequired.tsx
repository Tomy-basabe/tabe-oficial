import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Lock, LogIn, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComicAudio } from "@/components/comic/ComicAudio";

interface GameAuthModalProps {
  open: boolean;
  onClose: () => void;
  gameTitle?: string;
}

export function GameAuthModal({ open, onClose, gameTitle }: GameAuthModalProps) {
  const navigate = useNavigate();

  const handleGoToAuth = () => {
    try {
      ComicAudio.playPowerUp();
    } catch {}
    onClose();
    navigate("/registro");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] max-w-md p-6 rounded-2xl md:rounded-3xl overflow-hidden z-50">
        {/* Top Comic Strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#FFE600] via-[#00E5FF] to-[#FF5C5C]" />

        <div className="pt-2 text-center space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FFE600] text-black border-2 border-black font-black text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#000] -rotate-1">
            <Lock className="w-3.5 h-3.5 stroke-[3]" />
            Acceso Requerido • Modo Invitado
          </div>

          {/* Icon */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FF5C5C] text-black border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] flex items-center justify-center text-3xl rotate-3">
            🎮
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
              ¡Tienes que estar logueado!
            </h2>
            {gameTitle ? (
              <p className="text-xs font-black uppercase text-[#FF5C5C] mt-1">
                Para jugar a {gameTitle}
              </p>
            ) : (
              <p className="text-xs font-black uppercase text-[#FF5C5C] mt-1">
                Para usar los minijuegos
              </p>
            )}
          </div>

          {/* Description */}
          <div className="bg-muted/60 border-2 border-foreground/30 p-3.5 rounded-xl text-left space-y-1.5">
            <p className="text-xs font-bold text-foreground">
              Los minijuegos de Tabe requieren una cuenta para:
            </p>
            <ul className="text-xs font-semibold text-muted-foreground space-y-1 list-disc list-inside">
              <li>Guardar tus récords y victorias en tu perfil.</li>
              <li>Ganar XP, subir de nivel y desbloquear logros.</li>
              <li>Usar tus propios cuestionarios y mazos de estudio.</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleGoToAuth}
              className="w-full h-12 bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black uppercase tracking-wider text-sm border-3 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4 stroke-[3]" />
              Iniciar Sesión / Crear Cuenta
            </Button>

            <Button
              variant="outline"
              onClick={onClose}
              className="w-full h-10 border-2 border-foreground/50 font-bold uppercase text-xs hover:bg-muted cursor-pointer"
            >
              Entendido, volver
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GameAuthGate({ gameTitle }: { gameTitle?: string }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col items-center justify-center text-foreground">
      <div className="w-full max-w-md bg-card border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-3xl p-6 sm:p-8 text-center space-y-5 relative overflow-hidden">
        {/* Top strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#FFE600] via-[#00E5FF] to-[#FF5C5C]" />

        {/* Back button */}
        <div className="flex justify-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/juegos")}
            className="border-2 border-foreground font-black text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0_0_hsl(var(--foreground))] cursor-pointer hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4 stroke-[3]" />
            Volver a Juegos
          </Button>
        </div>

        {/* Big Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-[#FFE600] text-black border-4 border-foreground shadow-[5px_5px_0_0_hsl(var(--foreground))] flex items-center justify-center text-4xl rotate-2">
          🛑
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FF5C5C] text-black border-2 border-black font-black text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#000] -rotate-1">
          <Lock className="w-3.5 h-3.5 stroke-[3]" />
          Acceso Restringido
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">
            ¡Tienes que estar logueado!
          </h1>
          <p className="text-xs font-bold text-muted-foreground mt-1 uppercase">
            {gameTitle ? `Para jugar a ${gameTitle}` : "Para usar los minijuegos de Tabe"}
          </p>
        </div>

        {/* Explanatory text */}
        <p className="text-xs sm:text-sm font-semibold text-muted-foreground bg-muted/60 p-4 rounded-2xl border-2 border-foreground/30 text-left">
          Los juegos están diseñados para competir con rivales, acumular XP y medir tu aprendizaje con tus mazos de estudio. Inicia sesión con tu cuenta para jugar.
        </p>

        {/* Buttons */}
        <div className="space-y-3 pt-1">
          <Button
            onClick={() => {
              try {
                ComicAudio.playPowerUp();
              } catch {}
              navigate("/registro");
            }}
            className="w-full h-12 bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black uppercase tracking-wider text-sm border-3 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4 stroke-[3]" />
            Iniciar Sesión / Registrarse
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate("/juegos")}
            className="w-full h-10 border-2 border-foreground/50 font-bold uppercase text-xs hover:bg-muted cursor-pointer"
          >
            Volver a la lista de juegos
          </Button>
        </div>
      </div>
    </div>
  );
}
