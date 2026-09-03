import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, User, Eye, EyeOff, Loader2, Download, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";

// Translate Supabase Auth errors to Spanish
function translateAuthError(message: string): string {
  const translations: Record<string, string> = {
    "Invalid login credentials": "Email o contraseña incorrectos",
    "Email not confirmed": "Tu email aún no fue confirmado. Revisá tu bandeja de entrada.",
    "User already registered": "Este email ya está registrado. ¿Querés iniciar sesión?",
    "Signup requires a valid password": "La contraseña debe tener al menos 6 caracteres",
    "Password should be at least 6 characters": "La contraseña debe tener al menos 6 caracteres",
    "Unable to validate email address: invalid format": "El formato del email no es válido",
    "Email rate limit exceeded": "Demasiados intentos de envío de email. Esperá unos minutos.",
    "For security purposes, you can only request this once every 60 seconds": "Por seguridad, solo podés solicitar esto cada 60 segundos",
    "New password should be different from the old password.": "La nueva contraseña debe ser diferente a la anterior",
    "Auth session missing!": "Tu sesión expiró. Por favor, volvé a iniciar sesión.",
    "Email link is invalid or has expired": "El enlace del email es inválido o expiró",
    "Token has expired or is invalid": "El enlace expiró o no es válido",
    "User not found": "No se encontró un usuario con ese email",
  };

  if (translations[message]) return translations[message];
  for (const [key, value] of Object.entries(translations)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return value;
  }
  if (message.toLowerCase().includes("rate limit")) return "Demasiados intentos. Por favor, esperá unos minutos.";
  if (message.toLowerCase().includes("email") && (message.toLowerCase().includes("send") || message.toLowerCase().includes("smtp"))) return "Error al enviar el email. Intentá de nuevo en unos minutos.";
  if (message.toLowerCase().includes("fetch") || message.toLowerCase().includes("network")) return "Error de conexión. Verificá tu internet e intentá de nuevo.";
  return "Ocurrió un error. Por favor, intentá de nuevo.";
}

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
  const { theme } = useTheme();

  const logo = theme === "dark" ? "/logos/tabe-logo-dark.png" : "/logos/tabe-logo-light.png";

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') { setIsInstalled(true); toast.success('¡App instalada!'); }
    setInstallPrompt(null);
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    toast.info("Ingresando como invitado. Los cambios que realices no se guardarán.", { duration: 5000 });
    navigate("/dashboard");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Ingresá tu email primero"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/restablecer-contrasena` });
      if (error) { toast.error(translateAuthError(error.message)); }
      else { toast.success("📧 Te enviamos un email con el enlace para restablecer tu contraseña.", { duration: 8000 }); setResetMode(false); }
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) { toast.error(translateAuthError(error.message)); }
        else { toast.success("¡Bienvenido de vuelta!"); navigate("/dashboard"); }
      } else {
        const { data: invited } = await supabase.rpc("check_invitation_status", { check_email: email.toLowerCase() }).maybeSingle();
        if (invited?.template && invited.template !== 'none') localStorage.setItem('tabe_pending_template', invited.template);
        const { error } = await signUp(email, password, nombre);
        if (error) { toast.error(translateAuthError(error.message)); }
        else { toast.success("¡Cuenta creada exitosamente!"); navigate("/dashboard"); }
      }
    } finally { setLoading(false); }
  };

  const inputClass = "w-full pl-11 pr-4 py-3.5 bg-secondary/50 rounded-xl border-2 border-border focus:outline-none focus:border-[#1475e5] focus:ring-0 text-sm font-bold transition-colors";
  const labelClass = "text-sm font-extrabold text-foreground/70";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Decorative bars */}
      <div className="absolute top-16 left-[8%] w-16 h-[5px] bg-[#ff9415] rounded-full -rotate-[17deg] opacity-40" />
      <div className="absolute top-28 right-[10%] w-14 h-[5px] bg-[#1475e5] rounded-full -rotate-[17deg] opacity-35" />
      <div className="absolute bottom-20 left-[15%] w-10 h-[5px] bg-[#48bd22] rounded-full opacity-30" />
      <div className="absolute bottom-32 right-[12%] w-16 h-[5px] bg-[#ff9415] rounded-full -rotate-[17deg] opacity-35" />

      {/* Colored dots */}
      <div className="absolute top-32 left-[20%] w-3 h-3 rounded-full bg-[#ffd21c] opacity-40" />
      <div className="absolute bottom-40 right-[25%] w-2.5 h-2.5 rounded-full bg-[#48bd22] opacity-35" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src={logo} alt="TABE" className="w-14 h-14 object-contain" />
            <div className="text-left">
              <h1 className="font-black text-3xl tracking-tight">T.A.B.E.</h1>
              <p className="text-xs font-bold text-muted-foreground">Tu Asistente de Bolsillo Estudiantil</p>
            </div>
          </div>
          <p className="text-muted-foreground font-bold">
            {resetMode ? "Te enviaremos un enlace para restablecer tu contraseña" : isLogin ? "Inicia sesión para continuar" : "Crea tu cuenta para empezar"}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-2xl border-2 border-border p-8 shadow-[5px_5px_0_0_hsl(var(--border))]">
          {resetMode ? (
            <div>
              <h3 className="text-lg font-extrabold mb-2">Restablecer contraseña</h3>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className={labelClass}>Email de tu cuenta</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className={inputClass} required />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-foreground text-background font-extrabold rounded-xl border-2 border-foreground shadow-[3px_3px_0_0_#1475e5] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#1475e5] active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : <><Mail className="w-5 h-5" /> Enviar enlace de recuperación</>}
                </button>
                <button type="button" onClick={() => setResetMode(false)} className="w-full py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                  ← Volver a iniciar sesión
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Toggle */}
              <div className="flex bg-secondary rounded-xl p-1 mb-6">
                <button onClick={() => setIsLogin(true)}
                  className={cn("flex-1 py-2.5 rounded-lg text-sm font-extrabold transition-all", isLogin ? "bg-foreground text-background shadow-[2px_2px_0_0_#ff9415]" : "text-muted-foreground hover:text-foreground")}>
                  Iniciar Sesión
                </button>
                <button onClick={() => setIsLogin(false)}
                  className={cn("flex-1 py-2.5 rounded-lg text-sm font-extrabold transition-all", !isLogin ? "bg-foreground text-background shadow-[2px_2px_0_0_#ff9415]" : "text-muted-foreground hover:text-foreground")}>
                  Registrarse
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <label className={labelClass}>Nombre</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className={inputClass} required={!isLogin} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className={inputClass} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Contraseña</label>
                    {isLogin && (
                      <button type="button" onClick={() => setResetMode(true)} className="text-xs font-bold text-[#1475e5] hover:underline transition-colors">
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={cn(inputClass, "pr-11")} required minLength={6} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="group w-full py-3.5 bg-foreground text-background font-extrabold rounded-xl border-2 border-foreground shadow-[3px_3px_0_0_#ff9415] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#ff9415] active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6">
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Cargando...</> : <>
                    {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </>}
                </button>

                <div className="relative mt-6 pt-4 border-t-2 border-border">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 bg-card text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                    o también
                  </div>
                  <button type="button" onClick={handleGuestLogin}
                    className="w-full py-3 bg-secondary text-foreground font-extrabold rounded-xl border-2 border-border shadow-[3px_3px_0_0_hsl(var(--border))] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_hsl(var(--border))] active:translate-y-0.5 active:shadow-none transition-all duration-200 flex items-center justify-center gap-2">
                    <User className="w-5 h-5 text-[#1475e5]" />
                    Probar como Invitado
                  </button>
                </div>

                {/* Install App Button */}
                {!isInstalled && installPrompt && (
                  <div className="mt-4">
                    <button type="button" onClick={handleInstall}
                      className="w-full py-3 bg-[#1475e5]/10 border-2 border-[#1475e5]/30 text-foreground font-extrabold rounded-xl hover:bg-[#1475e5]/20 transition-all flex items-center justify-center gap-2">
                      <Download className="w-5 h-5 text-[#1475e5]" />
                      Descargar App
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground font-bold mt-6">
          Al continuar, aceptas nuestros términos y condiciones
        </p>
      </div>
    </div>
  );
}
