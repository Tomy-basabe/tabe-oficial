import { AlertCircle, UserPlus, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export function GuestModeBanner() {
    const { isGuest, user } = useAuth();

    if (!isGuest || user) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[95%] max-w-2xl">
            <div className="card-gamer p-4 md:p-6 rounded-2xl bg-background/60 backdrop-blur-xl border border-neon-cyan/20 shadow-2xl shadow-neon-cyan/10 animate-in fade-in slide-in-from-bottom-5">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-neon-cyan/10 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-6 h-6 text-neon-cyan animate-pulse" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Estás en Modo Demo 🚀</h3>
                            <p className="text-sm text-muted-foreground leading-snug">
                                Estás viendo una versión de demostración. Registrate gratis para guardar tu progreso real, subir archivos y desbloquear logros.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Link
                            to="/registro"
                            className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 font-bold hover:bg-neon-cyan/20 transition-all text-sm flex items-center justify-center gap-2"
                        >
                            <LogIn className="w-4 h-4" />
                            Iniciar Sesión
                        </Link>
                        <Link
                            to="/registro?mode=signup"
                            className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-bold hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            Registrarse
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
