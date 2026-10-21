import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Lock, LogIn, ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GameAuthModalProps {
  open: boolean;
  onClose: () => void;
  gameTitle?: string;
}

export function GameAuthModal({ open, onClose, gameTitle }: GameAuthModalProps) {
  const navigate = useNavigate();

  const handleGoToAuth = () => {
    onClose();
    navigate("/registro");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border border-border/80 shadow-2xl max-w-md p-6 rounded-2xl overflow-hidden z-50">
        <div className="text-center space-y-4 pt-1">
          {/* Icon */}
          <div className="w-12 h-12 mx-auto rounded-xl bg-muted/80 border border-border flex items-center justify-center text-foreground">
            <Lock className="w-6 h-6 text-foreground/80" />
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Inicia sesión para continuar
            </h2>
            <p className="text-sm text-muted-foreground">
              {gameTitle
                ? `Para acceder a ${gameTitle} necesitas una cuenta de estudiante.`
                : "Para jugar y guardar tu progreso necesitas una cuenta en TABE."}
            </p>
          </div>

          {/* Feature List */}
          <div className="bg-muted/40 border border-border/60 p-4 rounded-xl text-left space-y-2.5">
            <p className="text-xs font-medium text-foreground">
              Con tu cuenta activa podrás:
            </p>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Guardar tus estadísticas, historial de partidas y victorias.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Ganar puntos de experiencia (XP) y subir de nivel.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Competir con tus mazos y cuestionarios de estudio reales.</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleGoToAuth}
              className="w-full h-10 font-medium text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              Iniciar sesión o registrarse
            </Button>

            <Button
              variant="outline"
              onClick={onClose}
              className="w-full h-10 border-border/80 font-medium text-xs hover:bg-muted cursor-pointer"
            >
              Volver a los juegos
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
    <div className="min-h-screen p-4 md:p-6 flex flex-col items-center justify-center text-foreground bg-background">
      <div className="w-full max-w-md bg-card border border-border/80 shadow-xl rounded-2xl p-6 sm:p-8 text-center space-y-6">
        {/* Back button */}
        <div className="flex justify-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/juegos")}
            className="text-xs font-medium flex items-center gap-1.5 hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a Juegos
          </Button>
        </div>

        {/* Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/70 border border-border flex items-center justify-center text-foreground">
          <ShieldAlert className="w-7 h-7 text-foreground/80" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Acceso requerido
          </h1>
          <p className="text-sm text-muted-foreground">
            {gameTitle ? `Para jugar a ${gameTitle}` : "Para usar los minijuegos de TABE"}
          </p>
        </div>

        {/* Explanatory text */}
        <p className="text-xs sm:text-sm text-muted-foreground bg-muted/40 p-4 rounded-xl border border-border/60 text-left leading-relaxed">
          Los minijuegos interactivos están diseñados para competir con compañeros, registrar tu progreso y medir tu conocimiento usando tus apuntes y preguntas académicas.
        </p>

        {/* Actions */}
        <div className="space-y-2.5 pt-2">
          <Button
            onClick={() => navigate("/registro")}
            className="w-full h-11 font-medium text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            Iniciar sesión / Registrarse
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate("/juegos")}
            className="w-full h-10 border-border/80 font-medium text-xs hover:bg-muted cursor-pointer"
          >
            Explorar catálogo de juegos
          </Button>
        </div>
      </div>
    </div>
  );
}
