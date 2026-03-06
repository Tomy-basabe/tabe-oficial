import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, User, Eye, EyeOff, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TabeLogo } from "@/components/ui/TabeLogo";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { signIn, signUp, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setIsInstalled(true);
      toast.success('¡App instalada!');
    }
    setInstallPrompt(null);
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    toast.info("Ingresando como invitado. Los cambios que realices no se guardarán.", {
      duration: 5000,
    });
    navigate("/dashboard");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Ingresá tu email primero");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("📧 Te enviamos un email con el enlace para restablecer tu contraseña. Revisá tu bandeja de entrada y spam.", { duration: 8000 });
        setResetMode(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("rate limit")) {
            toast.error("Demasiados intentos. Por favor, espera unos minutos.");
          } else if (error.message.includes("Invalid login credentials")) {
            toast.error("Email o contraseña incorrectos");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("¡Bienvenido de vuelta!");
          navigate("/dashboard");
        }
      } else {
        // Obtenemos si estaba invitado para aplicarle un template (opcional)
        // pero NO bloqueamos si no estaba invitado.
        const { data: invited } = await supabase
          .rpc("check_invitation_status", { check_email: email.toLowerCase() })
          .maybeSingle();

        if (invited?.template && invited.template !== 'none') {
          localStorage.setItem('tabe_pending_template', invited.template);
        }

        const { error } = await signUp(email, password, nombre);
        if (error) {
          if (error.message.includes("rate limit")) {
            toast.error("Has intentado registrarte demasiadas veces. Por favor, espera unos minutos antes de volver a intentarlo.");
          } else if (error.message.includes("User already registered")) {
            toast.error("Este email ya está registrado. ¿Querés iniciar sesión?");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("¡Cuenta creada exitosamente!");
          navigate("/dashboard");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <TabeLogo size={56} />
            <div className="text-left">
              <h1 className="font-display font-bold text-3xl gradient-text">T.A.B.E.</h1>
              <p className="text-xs text-muted-foreground">Tu Asistente de Bolsillo Estudiantil</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            {resetMode ? "Te enviaremos un enlace para restablecer tu contraseña" : isLogin ? "Inicia sesión para continuar" : "Crea tu cuenta para empezar"}
          </p>
        </div>

        {/* Form Card */}
        <div className="card-gamer rounded-2xl p-8">
          {/* Reset Password Mode */}
          {resetMode ? (
            <div>
              <h3 className="text-lg font-bold mb-2">Restablecer contraseña</h3>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Email de tu cuenta</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full pl-11 pr-4 py-3 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Enviar enlace de recuperación
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setResetMode(false)}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Volver a iniciar sesión
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Toggle */}
              <div className="flex bg-secondary rounded-xl p-1 mb-6">
                <button
                  onClick={() => setIsLogin(true)}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isLogin
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
                    !isLogin
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Registrarse
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Tu nombre"
                        className="w-full pl-11 pr-4 py-3 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full pl-11 pr-4 py-3 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Contraseña</label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => setResetMode(true)}
                        className="text-xs text-neon-cyan hover:underline transition-colors"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-11 py-3 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    isLogin ? "Iniciar Sesión" : "Crear Cuenta"
                  )}
                </button>

                <div className="relative mt-6 pt-4 border-t border-border">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 bg-card text-xs text-muted-foreground uppercase">
                    o también
                  </div>
                  <button
                    type="button"
                    onClick={handleGuestLogin}
                    className="w-full py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                  >
                    <User className="w-5 h-5 text-neon-cyan" />
                    Probar como Invitado
                  </button>
                </div>

                {/* Install App Button */}
                {!isInstalled && installPrompt && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleInstall}
                      className="w-full py-3 bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 text-foreground font-medium rounded-xl hover:from-neon-cyan/30 hover:to-neon-purple/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5 text-neon-cyan" />
                      Descargar App
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Al continuar, aceptas nuestros términos y condiciones
        </p>
      </div>
    </div>
  );
}
