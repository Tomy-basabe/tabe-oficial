import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Sparkles } from "lucide-react";

export default function EmailVerified() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate("/auth", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-cyan/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neon-purple/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 text-center space-y-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center shadow-2xl shadow-neon-cyan/30 animate-bounce" style={{ animationDuration: "2s" }}>
            <span className="font-display font-bold text-white text-4xl">T</span>
          </div>
        </div>

        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center border-2 border-green-500/30">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
            ¡Correo Verificado!
          </h1>
          <p className="text-muted-foreground text-lg">
            Tu cuenta en <span className="font-semibold text-foreground">T.A.B.E.</span> ha sido verificada exitosamente.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/60">
            <Sparkles className="w-4 h-4 text-neon-gold" />
            <span>Ya podés iniciar sesión y empezar a estudiar</span>
            <Sparkles className="w-4 h-4 text-neon-gold" />
          </div>
        </div>

        {/* Countdown */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Redirigiendo al login en <span className="font-bold text-neon-cyan">{countdown}</span> segundos...
          </p>
          <button
            onClick={() => navigate("/auth", { replace: true })}
            className="px-8 py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-background rounded-xl font-semibold hover:shadow-lg hover:shadow-neon-cyan/25 transition-all"
          >
            Ir al Login Ahora
          </button>
        </div>

        {/* Version */}
        <p className="text-xs text-muted-foreground/30 pt-4">
          T.A.B.E. v2.6.0
        </p>
      </div>
    </div>
  );
}
