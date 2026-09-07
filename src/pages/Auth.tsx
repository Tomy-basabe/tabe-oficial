import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, User, Eye, EyeOff, Loader2, Download, ArrowRight, BookOpen, Sparkles, Star, Coffee, Gamepad2, CheckCircle2, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { motion, AnimatePresence } from "framer-motion";
import { loginSchema, signupSchema, resetPasswordSchema, checkRateLimit, resetRateLimit, RATE_LIMITS } from "@/lib/security";

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

// Custom 3D Big "T" Ribbon Logo Component
function BigTRibbonLogo({ className = "w-24 h-28 text-black" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 120" className={cn("fill-current", className)}>
      <rect x="6" y="6" width="88" height="26" rx="8" />
      <path d="M37 26 H63 V112 L50 98 L37 112 Z" />
    </svg>
  );
}

export default function Auth() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Bot protection
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { signIn, signUp, signInWithGoogle, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(translateAuthError(error.message));
      }
    } catch (err: any) {
      toast.error("Error al conectar con Google");
    } finally {
      setLoading(false);
    }
  };

  const GoogleLoginButton = ({ text, className = "" }: { text?: string; className?: string }) => (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className={cn(
        "w-full py-3.5 px-4 bg-white text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[1px] active:shadow-[1px_1px_0_0_#000] transition-all flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-50 select-none",
        className
      )}
    >
      <svg className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
      <span>{text || (isLogin ? "Continuar con Google" : "Registrarse con Google")}</span>
    </button>
  );

  const logo = "/logo.png";

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Folder starts closed by default and opens on user click

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
    // Security: validate input
    const parsed = resetPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Email inválido");
      return;
    }
    // Security: rate limit
    const rl = checkRateLimit('reset_password', RATE_LIMITS.resetPassword);
    if (!rl.allowed) {
      const mins = Math.ceil((rl.retryAfterMs || 0) / 60000);
      toast.error(`Demasiados intentos. Esperá ${mins} minuto(s).`);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${window.location.origin}/restablecer-contrasena` });
      if (error) { toast.error(translateAuthError(error.message)); }
      else { toast.success("📧 Te enviamos un email con el enlace para restablecer tu contraseña.", { duration: 8000 }); setResetMode(false); }
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Security: Bot Protection (Honeypot)
    if (honeypot) {
      console.warn("Bot detected in Auth form");
      // Silently fail for bots, pretend it worked
      toast.success("Procesando tu solicitud...");
      setLoading(true);
      setTimeout(() => setLoading(false), 2000);
      return;
    }

    // Security: validate inputs with Zod
    if (isLogin) {
      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        toast.error(parsed.error.errors[0]?.message || "Datos inválidos");
        return;
      }
    } else {
      const parsed = signupSchema.safeParse({ email, password, nombre });
      if (!parsed.success) {
        toast.error(parsed.error.errors[0]?.message || "Datos inválidos");
        return;
      }
    }

    // Security: rate limit login/signup attempts
    const rateLimitKey = isLogin ? 'login' : 'signup';
    const rl = checkRateLimit(rateLimitKey, isLogin ? RATE_LIMITS.login : RATE_LIMITS.signup);
    if (!rl.allowed) {
      const mins = Math.ceil((rl.retryAfterMs || 0) / 60000);
      toast.error(`Demasiados intentos. Esperá ${mins} minuto(s).`);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) { toast.error(translateAuthError(error.message)); }
        else { resetRateLimit('login'); toast.success("¡Bienvenido de vuelta!"); navigate("/dashboard"); }
      } else {
        const { data: invited } = await supabase.rpc("check_invitation_status", { check_email: email.toLowerCase() }).maybeSingle();
        if (invited?.template && invited.template !== 'none') localStorage.setItem('tabe_pending_template', invited.template);
        const { error } = await signUp(email, password, nombre);
        if (error) { toast.error(translateAuthError(error.message)); }
        else { resetRateLimit('signup'); toast.success("¡Cuenta creada exitosamente!"); navigate("/dashboard"); }
      }
    } finally { setLoading(false); }
  };

  const inputClass = "w-full pl-11 pr-4 py-3.5 bg-background/80 rounded-xl border-2 border-border focus:outline-none focus:border-[#ff9415] focus:ring-0 text-sm font-bold transition-all placeholder:text-muted-foreground/60 shadow-[2px_2px_0_0_hsl(var(--border))]";
  const labelClass = "text-xs font-extrabold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden flex items-center justify-center p-3 sm:p-6 relative select-none">
      
      {/* Background Decorative Grid & Floating Artifacts */}
      <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Floating 3D Study Elements */}
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [0, 6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-8 left-[3%] xl:left-[6%] hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#FFD700] text-black font-black text-xs uppercase rounded-lg border-2 border-black shadow-[4px_4px_0_0_#000] pointer-events-none z-10"
      >
        <Sparkles className="w-4 h-4 fill-black" />
        <span>IA Estudiantil</span>
      </motion.div>

      <motion.div
        animate={{ y: [0, 14, 0], rotate: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-12 right-[3%] xl:right-[6%] hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#00E5FF] text-black font-black text-xs uppercase rounded-lg border-2 border-black shadow-[4px_4px_0_0_#000] pointer-events-none z-10"
      >
        <Coffee className="w-4 h-4" />
        <span>Modo Parcial</span>
      </motion.div>

      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-10 left-[3%] xl:left-[6%] hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#BFFF00] text-black font-black text-xs uppercase rounded-lg border-2 border-black shadow-[4px_4px_0_0_#000] pointer-events-none z-10"
      >
        <Star className="w-4 h-4 fill-black" />
        <span>100% Universitario</span>
      </motion.div>

      {/* Main Binder Folder Container with 3D Perspective */}
      <div className="relative w-full max-w-4xl min-h-[620px] flex items-center justify-center [perspective:2000px] py-6 z-20">

        <AnimatePresence mode="wait">
          {!isOpen ? (
            /* ============================================================ */
            /* 1. CLOSED BINDER (Por defecto la carpeta está cerrada)       */
            /* ============================================================ */
            <motion.div
              key="closed-folder"
              initial={{ scale: 0.9, opacity: 0, rotateY: -15, rotateX: 5 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0, rotateX: 0 }}
              exit={{ scale: 0.95, opacity: 0, rotateY: -20, transition: { duration: 0.25 } }}
              whileHover={{ scale: 1.02, rotate: -0.5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsOpen(true)}
              className="cursor-pointer group relative w-full max-w-md bg-[#16171a] border-4 border-black rounded-[24px] sm:rounded-[32px] p-4 sm:p-8 shadow-[8px_8px_0_0_#000] sm:shadow-[18px_18px_0_0_#000] flex flex-col items-center justify-between text-white min-h-[480px] sm:min-h-[530px] transition-shadow hover:shadow-[12px_12px_0_0_#000] sm:hover:shadow-[22px_22px_0_0_#000]"
            >
              {/* Left White 3D Spiral Rings */}
              <div className="absolute -left-2 sm:-left-5 top-0 bottom-0 flex flex-col justify-around py-6 sm:py-8 z-30 pointer-events-none">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="w-8 sm:w-10 h-3 sm:h-3.5 bg-gradient-to-r from-gray-200 via-white to-gray-300 border-2 border-black rounded-full shadow-[2px_2px_0_0_#000] transform -rotate-2" 
                  />
                ))}
              </div>

              {/* Right Protruding 3D Colored Tabs */}
              <div className="absolute -right-5 top-16 flex flex-col gap-4 z-10 pointer-events-none">
                <div className="w-7 h-12 bg-[#FF6600] border-3 border-black rounded-r-xl shadow-[3px_3px_0_0_#000] group-hover:translate-x-1.5 transition-transform" />
                <div className="w-7 h-12 bg-[#48BD22] border-3 border-black rounded-r-xl shadow-[3px_3px_0_0_#000] group-hover:translate-x-2 transition-transform" />
                <div className="w-7 h-12 bg-[#0066FF] border-3 border-black rounded-r-xl shadow-[3px_3px_0_0_#000] group-hover:translate-x-1.5 transition-transform" />
                <div className="w-7 h-12 bg-[#FFCC00] border-3 border-black rounded-r-xl shadow-[3px_3px_0_0_#000] group-hover:translate-x-2 transition-transform" />
              </div>

              {/* White Front Cover Card */}
              <div className="w-full h-full bg-white border-4 border-black rounded-[24px] p-6 sm:p-8 flex flex-col items-center justify-between shadow-[6px_6px_0_0_#000] relative z-20 min-h-[440px]">
                {/* Spiral Punch Holes */}
                <div className="absolute left-2.5 top-0 bottom-0 flex flex-col justify-around py-8 pointer-events-none">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-[#16171a] border border-black/40" />
                  ))}
                </div>

                <div className="w-full flex items-center justify-between pb-2 border-b-2 border-dashed border-gray-200 pl-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-black/50">
                    EDICIÓN UNIVERSITARIA • 2026
                  </span>
                  <span className="px-2 py-0.5 bg-black text-white text-[10px] font-mono font-bold rounded">
                    TABE
                  </span>
                </div>

                {/* Big T Ribbon Logo Center */}
                <div className="my-auto flex flex-col items-center text-center gap-3 w-full px-2">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <BigTRibbonLogo className="w-24 h-28 text-black drop-shadow-[3px_3px_0_#cbd5e1]" />
                  </motion.div>
                  <span className="font-black text-3xl tracking-tight text-black uppercase mt-1">
                    T.A.B.E.
                  </span>
                  <span className="text-xs font-black uppercase text-black/60 tracking-widest">
                    Tu Asistente Estudiantil
                  </span>

                  {/* Google Quick Button on Cover */}
                  <div className="w-full max-w-xs mt-3">
                    <GoogleLoginButton text="Entrar con Google" />
                  </div>
                </div>

                {/* Bottom Interactive CTA */}
                <div className="w-full flex items-center justify-between pt-4 border-t-2 border-dashed border-gray-200 pl-3">
                  <span className="text-[11px] font-black uppercase text-black/80 tracking-wider flex items-center gap-1.5 group-hover:text-[#FF6600] transition-colors">
                    <Sparkles className="w-4 h-4 fill-[#FF6600] text-[#FF6600] animate-pulse" />
                    Toca para abrir la libreta 📖
                  </span>
                  <div className="p-2.5 bg-black text-white rounded-xl shadow-[2px_2px_0_0_#000] group-hover:scale-115 group-hover:rotate-6 transition-all">
                    <Gamepad2 className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ============================================================ */
            /* 2. OPEN BINDER SPREAD (Se abre y se mueven las hojas)        */
            /* ============================================================ */
            <motion.div
              key="open-folder"
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0, transition: { duration: 0.25 } }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full bg-[#16171a] border-4 border-black rounded-[24px] sm:rounded-[32px] p-2 sm:p-3 shadow-[8px_8px_0_0_#000] sm:shadow-[18px_18px_0_0_#000] min-h-[540px] sm:min-h-[590px]"
            >
              
              {/* Right Protruding 3D Colored Tabs */}
              <div className="absolute -right-5 top-16 hidden sm:flex flex-col gap-4 z-10 pointer-events-none">
                <div className="w-7 h-12 bg-[#FF6600] border-3 border-black rounded-r-xl shadow-[3px_3px_0_0_#000]" />
                <div className="w-7 h-12 bg-[#48BD22] border-3 border-black rounded-r-xl shadow-[3px_3px_0_0_#000]" />
                <div className="w-7 h-12 bg-[#0066FF] border-3 border-black rounded-r-xl shadow-[3px_3px_0_0_#000]" />
                <div className="w-7 h-12 bg-[#FFCC00] border-3 border-black rounded-r-xl shadow-[3px_3px_0_0_#000]" />
              </div>

              {/* Internal Spread Grid (Left Page + Right Page [Login]) */}
              <div className="relative w-full h-full bg-card border-4 border-foreground rounded-[24px] grid grid-cols-1 md:grid-cols-12 overflow-hidden z-20 min-h-[560px] [perspective:1800px] [transform-style:preserve-3d]">
                
                {/* Center Binder White 3D Spiral Rings */}
                <div className="absolute left-1/2 top-0 bottom-0 hidden md:flex flex-col justify-around py-6 -translate-x-1/2 z-40 pointer-events-none">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-10 h-3.5 bg-gradient-to-r from-gray-200 via-white to-gray-300 border-2 border-black rounded-full shadow-[2px_2px_0_0_#000] transform -rotate-2" 
                    />
                  ))}
                </div>

                {/* Re-play / Toggle Notebook Button (Top Right) */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Cerrar libreta"
                  className="absolute top-4 right-4 z-30 p-2 bg-secondary hover:bg-muted border-2 border-foreground rounded-lg shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all active:translate-y-0.5 flex items-center gap-1.5 text-xs font-black"
                >
                  <BookOpen className="w-4 h-4 text-foreground" />
                  <span className="hidden sm:inline text-[10px] uppercase font-bold text-muted-foreground">
                    Cerrar
                  </span>
                </button>

                {/* ============================================================ */}
                {/* 3D FLIPPING LAYERS (Cover -> Sheet 1 -> Sheet 2 -> reveals Login) */}
                {/* ============================================================ */}

                {/* 1. FRONT COVER (Tapa Frontal con Big T Ribbon Logo y Gamepad) */}
                <motion.div
                  style={{ 
                    transformOrigin: "left center", 
                    transformStyle: "preserve-3d" 
                  }}
                  initial={{ rotateY: 0, opacity: 1, zIndex: 50 }}
                  animate={{
                    rotateY: typeof window !== 'undefined' && window.innerWidth < 768 ? -110 : -180,
                    opacity: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : 1,
                    zIndex: 10,
                  }}
                  transition={{
                    duration: 0.85,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="absolute top-0 bottom-0 right-0 w-full md:w-1/2 h-full [transform-style:preserve-3d] pointer-events-none"
                >
              {/* Cover FRONT Face */}
              <div className="absolute inset-0 w-full h-full bg-white border-b-4 md:border-b-0 md:border-l-2 border-black rounded-r-[20px] p-6 sm:p-8 flex flex-col items-center justify-between shadow-[6px_6px_0_0_#000] [backface-visibility:hidden] z-20">
                {/* Spiral Ring Punch Holes on Left Border */}
                <div className="absolute left-2 top-0 bottom-0 hidden md:flex flex-col justify-around py-6 pointer-events-none">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-[#16171a] border border-black/40" />
                  ))}
                </div>

                <div className="w-full flex items-center justify-between pb-2 border-b-2 border-dashed border-gray-200">
                  <span className="text-[10px] font-black uppercase tracking-widest text-black/50">
                    EDICIÓN UNIVERSITARIA • 2026
                  </span>
                  <span className="px-2 py-0.5 bg-black text-white text-[10px] font-mono font-bold rounded">
                    TABE
                  </span>
                </div>

                {/* Big T Ribbon Logo Center */}
                <div className="my-auto flex flex-col items-center text-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <BigTRibbonLogo className="w-24 h-28 text-black drop-shadow-[3px_3px_0_#cbd5e1]" />
                  </motion.div>
                  <span className="font-black text-3xl tracking-tight text-black uppercase mt-1">
                    T.A.B.E.
                  </span>
                  <span className="text-xs font-black uppercase text-black/60 tracking-widest">
                    Tu Asistente Estudiantil
                  </span>
                </div>

                {/* Cover Footer & Gamepad */}
                <div className="w-full flex items-center justify-between pt-4 border-t-2 border-dashed border-gray-200">
                  <span className="text-[11px] font-black uppercase text-black/70 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 fill-[#FF6600] text-[#FF6600]" />
                    Click para abrir la libreta 📖
                  </span>
                  <div className="p-2 bg-black text-white rounded-xl shadow-[2px_2px_0_0_#000] group-hover:scale-110 group-hover:rotate-6 transition-all">
                    <Gamepad2 className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Cover BACK Face (visible on the left after opening) */}
              <div className="absolute inset-0 w-full h-full bg-[#1f2024] text-white p-6 sm:p-8 flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden] z-10 border-r-2 border-black rounded-l-[20px]">
                <div>
                  <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                    <div className="w-3 h-3 rounded-full bg-[#FF6600]" />
                    <span className="text-[10px] font-mono font-bold uppercase text-white/60 tracking-widest">
                      Bolsillo de Portada
                    </span>
                  </div>
                  <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-white/80">
                      Organizador Oficial de Cursada
                    </p>
                    <p className="text-[11px] text-white/50 leading-relaxed">
                      Todas tus materias, correlativas, apuntes y parciales sincronizados en una sola carpeta inteligente.
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest text-right">
                  TABE • SISTEMA INTELIGENTE
                </div>
              </div>
            </motion.div>

            {/* 2. SHEET 1: Apuntes de Análisis Matemático y Fórmulas */}
            <motion.div
              style={{ 
                transformOrigin: "left center", 
                transformStyle: "preserve-3d" 
              }}
              initial={false}
              animate={{
                rotateY: isOpen ? (typeof window !== 'undefined' && window.innerWidth < 768 ? -110 : -180) : 0,
                opacity: isOpen && typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : 1,
                zIndex: isOpen ? 15 : 40,
              }}
              transition={{
                duration: 0.8,
                delay: isOpen ? 0.15 : 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute top-0 bottom-0 right-0 w-full md:w-1/2 h-full [transform-style:preserve-3d] pointer-events-none"
            >
              {/* Sheet 1 FRONT Face */}
              <div className="absolute inset-0 w-full h-full bg-[#FAF8F5] text-slate-800 p-6 sm:p-8 flex flex-col justify-between border-b-4 md:border-b-0 md:border-l border-slate-300 rounded-r-[18px] shadow-[4px_4px_10px_rgba(0,0,0,0.15)] [backface-visibility:hidden] z-20 overflow-hidden">
                {/* Paper Grid & Red Margin */}
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_21px,#e2e8f0_22px)] [background-size:100%_22px] opacity-60 pointer-events-none" />
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-red-400/50 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-300">
                    <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                      📐 Apuntes • Análisis Matemático
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">PÁG. 04</span>
                  </div>

                  <div className="mt-4 space-y-3 font-mono">
                    <div className="p-2.5 bg-white/90 border border-slate-200 rounded-lg shadow-xs">
                      <p className="text-[11px] font-bold text-slate-500">// Teorema Fundamental del Cálculo</p>
                      <p className="text-xs font-black text-slate-900 mt-1">
                        {"∫ [a, b] f'(x) dx = f(b) - f(a)"}
                      </p>
                    </div>

                    <div className="p-2.5 bg-[#FFF9C4] border border-[#FBC02D] rounded-lg shadow-xs rotate-[-1deg]">
                      <p className="text-[10px] font-black text-amber-900 uppercase">
                        ★ Tip para el Parcial:
                      </p>
                      <p className="text-[11px] font-bold text-amber-950 mt-0.5">
                        Repasar integración por partes y sustitución trigonométrica.
                      </p>
                    </div>

                    {/* Doodle Chart */}
                    <div className="p-2 bg-white/80 border border-slate-200 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 mb-1">Curva de Aprendizaje T.A.B.E.</p>
                      <svg viewBox="0 0 200 45" className="w-full h-9 stroke-blue-600 fill-none stroke-2">
                        <path d="M 10 38 Q 60 35, 100 20 T 190 6" />
                        <circle cx="190" cy="6" r="3" className="fill-blue-600" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-500">
                  <span>UNIDAD 2: DERIVADAS & LÍMITES</span>
                  <span>CONFIDENCIAL • APUNTES</span>
                </div>
              </div>

              {/* Sheet 1 BACK Face */}
              <div className="absolute inset-0 w-full h-full bg-[#F4EFEA] text-slate-800 p-6 sm:p-8 flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden] z-10 border-r border-slate-300 rounded-l-[18px]">
                <div className="space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Fórmulas Frecuentes</span>
                  <div className="p-3 bg-white/70 border border-slate-200 rounded-lg text-xs font-mono">
                    <p className="font-bold text-slate-700">Euler: e^(iπ) + 1 = 0</p>
                    <p className="text-slate-500 mt-1">Complejidad: O(1) {"<"} O(log n) {"<"} O(n)</p>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 text-right">PÁG. 03</div>
              </div>
            </motion.div>

            {/* 3. SHEET 2: Cronograma & Checklist Estudiantil */}
            <motion.div
              style={{ 
                transformOrigin: "left center", 
                transformStyle: "preserve-3d" 
              }}
              initial={false}
              animate={{
                rotateY: isOpen ? (typeof window !== 'undefined' && window.innerWidth < 768 ? -110 : -180) : 0,
                opacity: isOpen && typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : 1,
                zIndex: isOpen ? 20 : 30,
              }}
              transition={{
                duration: 0.8,
                delay: isOpen ? 0.3 : 0.16,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute top-0 bottom-0 right-0 w-full md:w-1/2 h-full [transform-style:preserve-3d] pointer-events-none"
            >
              {/* Sheet 2 FRONT Face */}
              <div className="absolute inset-0 w-full h-full bg-[#FFFDF9] text-slate-800 p-6 sm:p-8 flex flex-col justify-between border-b-4 md:border-b-0 md:border-l border-slate-300 rounded-r-[18px] shadow-[4px_4px_10px_rgba(0,0,0,0.12)] [backface-visibility:hidden] z-20 overflow-hidden">
                {/* Paper Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_23px,#e2e8f0_24px)] [background-size:100%_24px] opacity-60 pointer-events-none" />
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-blue-400/40 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-300">
                    <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                      🗓️ Cronograma & Tareas
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">PÁG. 02</span>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center gap-2 p-2 bg-white/90 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-[#48BD22]" />
                      <span>Completar repaso con Flashcards 3D</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-white/90 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-[#0066FF]" />
                      <span>Ver correlativas desbloqueadas</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-white/90 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-400" />
                      <span>Ingresar al sistema con tu cuenta</span>
                    </div>

                    {/* Post-it Note */}
                    <div className="p-3 bg-[#FFE082] text-amber-950 border border-amber-400 rounded-xl shadow-xs rotate-[1.5deg] mt-3">
                      <p className="text-[10px] font-black uppercase flex items-center gap-1">
                        <Coffee className="w-3.5 h-3.5" />
                        Aviso de Estudio:
                      </p>
                      <p className="text-xs font-extrabold mt-1">
                        ¡Siguiente hoja: Formulario de Acceso Estudiantil! 🚀
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-500">
                  <span>CICLO LECTIVO ACTUAL</span>
                  <span>TABE ASISTENTE</span>
                </div>
              </div>

              {/* Sheet 2 BACK Face (Visible on the left page when open) */}
              <div className="absolute inset-0 w-full h-full bg-[#FBF9F5] text-slate-800 p-6 sm:p-8 flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden] z-10 border-r-2 border-slate-300 rounded-l-[18px] shadow-[inset_-8px_0_15px_rgba(0,0,0,0.05)]">
                {/* Paper Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_23px,#e2e8f0_24px)] [background-size:100%_24px] opacity-40 pointer-events-none" />
                <div className="absolute right-8 top-0 bottom-0 w-0.5 bg-red-400/40 pointer-events-none" />

                <div className="relative z-10 space-y-5">
                  {/* Logo Header with Big T Logo */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className="w-10 h-10 bg-white border-2 border-black rounded-xl p-1.5 shadow-[2px_2px_0_0_#000] flex items-center justify-center">
                      <BigTRibbonLogo className="w-6 h-7 text-black" />
                    </div>
                    <div>
                      <h2 className="font-black text-xl tracking-tight text-slate-900">T.A.B.E.</h2>
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                        Carpeta de Apuntes
                      </p>
                    </div>
                  </div>

                  {/* Motivational Quote Note */}
                  <div className="bg-[#FFD700] text-black border-2 border-black rounded-xl p-3.5 shadow-[3px_3px_0_0_#000] rotate-[-1deg] relative">
                    <div className="absolute -top-2.5 left-6 w-10 h-3 bg-white/80 border border-black/20 rounded-xs shadow-xs" />
                    <p className="font-black text-[10px] uppercase tracking-wider mb-0.5 flex items-center gap-1 text-slate-900">
                      <Sparkles className="w-3 h-3 fill-black" />
                      Tip Universitario:
                    </p>
                    <p className="font-black text-xs leading-snug">
                      "El secreto para aprobar no es estudiar más horas, es estudiar con la estrategia correcta."
                    </p>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-[#FF6600]" />
                      <span>Resúmenes con IA</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-[#0066FF]" />
                      <span>Flashcards 3D & Repetición Espaciada</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-[#48BD22]" />
                      <span>Mapa Interactivo de Correlativas</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-[#FFCC00]" />
                      <span>Pomodoro, Métricas & Hábitos</span>
                    </div>
                  </div>
                </div>

                {/* Left Page Footer */}
                <div className="relative z-10 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>FACULTAD • 2026</span>
                  <span className="font-bold">PÁG. 01</span>
                </div>
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* BASE SPREAD: LEFT PAGE (Branding/Tips) & RIGHT PAGE (LOGIN SHEET) */}
            {/* ============================================================ */}

            {/* LEFT PAGE: Branding & Student Info */}
            <div className="md:col-span-6 bg-muted/40 p-6 sm:p-8 border-b-4 md:border-b-0 md:border-r-4 border-foreground flex flex-col justify-between relative overflow-hidden">
              {/* Paper Grid Background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_23px,hsl(var(--border))_24px)] [background-size:100%_24px] opacity-30 pointer-events-none" />
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-red-400/40 pointer-events-none" />

              <div className="relative z-10 space-y-6">
                {/* Logo Header with Big T Logo */}
                <div className="flex items-center gap-3">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    className="w-12 h-12 bg-background border-2 border-foreground rounded-xl p-2 shadow-[3px_3px_0_0_hsl(var(--foreground))] flex items-center justify-center"
                  >
                    <BigTRibbonLogo className="w-7 h-8 text-foreground" />
                  </motion.div>
                  <div>
                    <h2 className="font-black text-2xl tracking-tight text-foreground">T.A.B.E.</h2>
                    <p className="text-[11px] font-extrabold uppercase text-muted-foreground tracking-widest">
                      Carpeta de Apuntes
                    </p>
                  </div>
                </div>

                {/* Motivational Quote Note */}
                <div className="bg-[#FFD700] text-black border-2 border-black rounded-xl p-4 shadow-[4px_4px_0_0_#000] rotate-[-1.5deg] relative">
                  <div className="absolute -top-3 left-6 w-12 h-4 bg-white/70 border border-black/30 rounded-xs shadow-xs" />
                  <p className="font-black text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 fill-black" />
                    Tip Universitario:
                  </p>
                  <p className="font-extrabold text-sm leading-snug">
                    "El secreto para aprobar no es estudiar más horas, es estudiar con la estrategia correcta."
                  </p>
                </div>

                {/* Feature Checklist */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-[#FF6600]" />
                    <span>Resúmenes con IA</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-[#0066FF]" />
                    <span>Flashcards 3D y Repetición Espaciada</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-[#48BD22]" />
                    <span>Mapa Interactivo de Correlativas</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-[#FFCC00]" />
                    <span>Pomodoro, Métricas y Hábitos</span>
                  </div>
                </div>
              </div>

              {/* Left Page Footer */}
              <div className="relative z-10 pt-6 mt-6 border-t-2 border-border flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                <span>FACULTAD • 2026</span>
                <span className="px-2 py-0.5 bg-background border border-foreground rounded font-mono font-black">
                  TABE
                </span>
              </div>
            </div>

            {/* RIGHT PAGE: THE LOGIN SHEET (Una de las hojas es el Login) */}
            <div className="md:col-span-6 p-6 sm:p-8 md:pl-10 flex flex-col justify-center relative bg-card z-10">
                  {/* Notebook Top Margin Line */}
                  <div className="flex items-center justify-between pb-4 mb-6 border-b-2 border-dashed border-border">
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-[#FF6600] fill-[#FF6600]" />
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        {resetMode ? "Recuperación de Cuenta" : isLogin ? "Acceso Estudiantil" : "Alta de Estudiante"}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      HOJA N° 01
                    </span>
                  </div>

                  {resetMode ? (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-5"
                    >
                      <div>
                        <h3 className="text-2xl font-black text-foreground tracking-tight">Restablecer Contraseña</h3>
                        <p className="text-xs font-bold text-muted-foreground mt-1">
                          Ingresá tu correo institucional o personal para recibir las instrucciones.
                        </p>
                      </div>

                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className={labelClass}>
                            <Mail className="w-3.5 h-3.5 text-[#FF6600]" />
                            Email de tu cuenta
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input 
                              type="email" 
                              value={email} 
                              onChange={(e) => setEmail(e.target.value)} 
                              placeholder="estudiante@universidad.edu.ar" 
                              className={inputClass} 
                              required 
                            />
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={loading}
                          className="w-full py-3.5 bg-foreground text-background font-black text-sm uppercase tracking-wider rounded-xl border-2 border-foreground shadow-[4px_4px_0_0_#0066FF] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0066FF] active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : <><Mail className="w-5 h-5" /> Enviar enlace de recuperación</>}
                        </button>

                        <button 
                          type="button" 
                          onClick={() => setResetMode(false)} 
                          className="w-full py-2.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                        >
                          ← Volver a iniciar sesión
                        </button>
                      </form>
                    </motion.div>
                  ) : (
                    <>
                      {/* Google Quick Sign In */}
                      <div className="mb-4">
                        <GoogleLoginButton text={isLogin ? "Continuar con Google" : "Registrarse con Google"} />
                      </div>

                      {/* Divider */}
                      <div className="relative mb-5">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t-2 border-border" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase">
                          <span className="bg-card px-2.5 text-muted-foreground font-black tracking-widest">
                            O con tu email
                          </span>
                        </div>
                      </div>

                      {/* Index Tabs Switcher */}
                      <div className="flex bg-secondary p-1 rounded-xl mb-6 border-2 border-border shadow-[2px_2px_0_0_hsl(var(--border))]">
                        <button 
                          type="button"
                          onClick={() => setIsLogin(true)}
                          className={cn(
                            "flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200", 
                            isLogin ? "bg-foreground text-background shadow-[3px_3px_0_0_#FF6600]" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Iniciar Sesión
                        </button>
                        <button 
                          type="button"
                          onClick={() => setIsLogin(false)}
                          className={cn(
                            "flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200", 
                            !isLogin ? "bg-[#48BD22] text-black shadow-[3px_3px_0_0_#000]" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Registrarse
                        </button>
                      </div>

                      {/* Animated Form Fields */}
                      <AnimatePresence mode="wait">
                        <motion.form 
                          key={isLogin ? "login-form" : "register-form"}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          onSubmit={handleSubmit} 
                          className="space-y-4"
                        >
                          {!isLogin && (
                            <div className="space-y-1.5">
                              <label className={labelClass}>
                                <User className="w-3.5 h-3.5 text-[#FF6600]" />
                                Nombre Completo
                              </label>
                              <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input 
                                  type="text" 
                                  value={nombre} 
                                  onChange={(e) => setNombre(e.target.value)} 
                                  placeholder="Ej. Alex Basabe" 
                                  className={inputClass} 
                                  required={!isLogin} 
                                />
                              </div>
                            </div>
                          )}

                          {/* Security: Bot Protection Honeypot */}
                          <div className="hidden" aria-hidden="true">
                            <input
                              type="text"
                              name="website_url_honey"
                              tabIndex={-1}
                              autoComplete="off"
                              value={honeypot}
                              onChange={(e) => setHoneypot(e.target.value)}
                              placeholder="Leave this empty if you are human"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className={labelClass}>
                              <Mail className="w-3.5 h-3.5 text-[#FF6600]" />
                              Correo Electrónico
                            </label>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="tu@email.com" 
                                className={inputClass} 
                                required 
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className={labelClass}>
                                <Lock className="w-3.5 h-3.5 text-[#FF6600]" />
                                Contraseña
                              </label>
                              {isLogin && (
                                <button 
                                  type="button" 
                                  onClick={() => setResetMode(true)} 
                                  className="text-xs font-black text-[#0066FF] hover:underline transition-colors uppercase tracking-wider"
                                >
                                  ¿Olvidaste la clave?
                                </button>
                              )}
                            </div>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <input 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="••••••••" 
                                className={cn(inputClass, "pr-11")} 
                                required 
                                minLength={6} 
                              />
                              <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)} 
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Submit Button */}
                          <button 
                            type="submit" 
                            disabled={loading}
                            className="group w-full py-3.5 bg-foreground text-background font-black text-sm uppercase tracking-wider rounded-xl border-2 border-foreground shadow-[4px_4px_0_0_#FF6600] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#FF6600] active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                          >
                            {loading ? (
                              <><Loader2 className="w-5 h-5 animate-spin" /> Cargando...</>
                            ) : (
                              <>
                                {isLogin ? "Iniciar Sesión" : "Crear Mi Cuenta"}
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                              </>
                            )}
                          </button>

                          {/* Guest Entry & Divider */}
                          <div className="relative mt-6 pt-4 border-t-2 border-border">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 bg-card text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                              O probá sin registrarte
                            </div>
                            <button 
                              type="button" 
                              onClick={handleGuestLogin}
                              className="w-full py-3 bg-secondary text-foreground font-extrabold text-xs uppercase tracking-wider rounded-xl border-2 border-border shadow-[3px_3px_0_0_hsl(var(--border))] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_hsl(var(--border))] active:translate-y-0.5 active:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
                            >
                              <User className="w-4 h-4 text-[#0066FF]" />
                              Probar como Invitado
                            </button>
                          </div>

                          {/* PWA Download Banner */}
                          {!isInstalled && installPrompt && (
                            <div className="mt-3">
                              <button 
                                type="button" 
                                onClick={handleInstall}
                                className="w-full py-2.5 bg-[#0066FF]/10 border-2 border-[#0066FF]/30 text-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:bg-[#0066FF]/20 transition-all flex items-center justify-center gap-2"
                              >
                                <Download className="w-4 h-4 text-[#0066FF]" />
                                Instalar App en tu dispositivo
                              </button>
                            </div>
                          )}
                        </motion.form>
                      </AnimatePresence>
                    </>
                  )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    );
  }

