import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { TabeLogo } from "@/components/ui/TabeLogo";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    // Basic check to see if we have a recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sesión inválida o expirada. Solicitá un nuevo enlace.");
        navigate("/registro");
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast.error("Error al actualizar la contraseña: " + error.message);
      } else {
        setSuccess(true);
        toast.success("¡Contraseña actualizada con éxito!");
        // We sign out to ensure a clean state and force login with the new password
        setTimeout(async () => {
          await signOut();
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card-gamer rounded-2xl p-8 max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-neon-cyan/20 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-neon-cyan" />
            </div>
          </div>
          <h2 className="text-2xl font-bold gradient-text">¡Todo listo!</h2>
          <p className="text-muted-foreground">
            Tu contraseña ha sido actualizada. Te estamos redirigiendo al inicio de sesión para que ingreses con tu nueva clave.
          </p>
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

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
          <p className="text-muted-foreground">Elegí una nueva contraseña para tu cuenta</p>
        </div>

        {/* Form Card */}
        <div className="card-gamer rounded-2xl p-8">
          <h3 className="text-lg font-bold mb-6">Restablecer Contraseña</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nueva Contraseña</label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Confirmar Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  required
                  minLength={6}
                />
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
                  Actualizando...
                </>
              ) : (
                "Guardar Nueva Contraseña"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
