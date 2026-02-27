import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Crown, ArrowRight, Lock } from "lucide-react";
import { useState, useEffect } from "react";

interface PremiumGateProps {
    children: React.ReactNode;
    feature?: string;
}

const whatsappUrl = "https://wa.me/5492617737367?text=Hola,%20quiero%20activar%20el%20plan%20Premium%20de%20TABE";

export function PremiumGate({ children, feature }: PremiumGateProps) {
    const { isPremium, loading } = useSubscription();
    const { user, isGuest } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle()
            .then(({ data }) => setIsAdmin(!!data));
    }, [user?.id]);

    // Admin, guests (demo), or premium users pass through
    if (loading || isPremium || isGuest || isAdmin) {
        return <>{children}</>;
    }

    // Free users see the paywall
    return (
        <div className="relative min-h-[60vh] flex items-center justify-center p-4">
            {/* Blurred background hint */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-10 pointer-events-none blur-sm">
                {children}
            </div>

            {/* Paywall Card */}
            <div className="relative z-10 w-full max-w-md text-center">
                <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-neon-gold/5">
                    {/* Lock icon */}
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-neon-gold/20 to-amber-500/20 border border-neon-gold/30 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-neon-gold" />
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold mb-2">
                        Función Premium
                    </h2>
                    <p className="text-muted-foreground text-sm mb-6">
                        {feature
                            ? `"${feature}" es una función exclusiva del plan Premium.`
                            : "Esta función es exclusiva del plan Premium."
                        }
                        {" "}Desbloqueá todo el potencial de T.A.B.E.
                    </p>

                    {/* Benefits mini-list */}
                    <div className="text-left bg-secondary/30 rounded-xl p-4 mb-6 space-y-2">
                        {[
                            "Asistente IA sin restricciones",
                            "Flashcards y Cuestionarios ilimitados",
                            "Visor PDF con IA integrada",
                            "Apuntes ilimitados",
                            "Métricas avanzadas",
                        ].map((b, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <Crown className="w-3.5 h-3.5 text-neon-gold flex-shrink-0" />
                                <span>{b}</span>
                            </div>
                        ))}
                    </div>

                    {/* Price */}
                    <p className="text-xs text-muted-foreground mb-4">
                        Desde <span className="font-bold text-foreground">$3.750/mes</span> con el plan anual
                    </p>

                    {/* CTA */}
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-neon-gold to-amber-500 text-black font-bold rounded-xl hover:opacity-90 transition-all active:scale-95"
                    >
                        <Crown className="w-5 h-5" />
                        Hacerme Premium
                        <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </div>
        </div>
    );
}
