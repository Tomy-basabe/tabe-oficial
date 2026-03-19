import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Crown, ArrowRight, Lock, Sparkles, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";

interface PremiumGateProps {
    children: React.ReactNode;
    feature?: string;
}

const plans = [
    {
        id: "mensual",
        name: "Mensual",
        price: "$5.000",
        period: "/mes",
        months: 1,
        savings: null,
        highlight: false,
    },
    {
        id: "semestral",
        name: "Semestral",
        price: "$25.000",
        period: "/6 meses",
        months: 6,
        savings: "Ahorrás $5.000 (17%)",
        highlight: true,
    },
    {
        id: "anual",
        name: "Anual",
        price: "$45.000",
        period: "/año",
        months: 12,
        savings: "Ahorrás $15.000 (25%)",
        highlight: false,
    },
];

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

    // Everyone passes through now (Ads-only model)
    if (loading) {
        return null;
    }

    return <>{children}</>;

    // Free users see the paywall with 3 plans
    return (
        <div className="relative min-h-[60vh] flex items-center justify-center p-4">
            {/* Blurred background hint */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-10 pointer-events-none blur-sm">
                {children}
            </div>

            {/* Paywall */}
            <div className="relative z-10 w-full max-w-3xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-neon-gold/20 to-amber-500/20 border border-neon-gold/30 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-neon-gold" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">
                        {feature ? `"${feature}" es Premium` : "Función Premium"}
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        Desbloqueá todo el potencial de T.A.B.E. eligiendo el plan que mejor se adapte a vos.
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative rounded-2xl overflow-hidden border flex flex-col transition-all duration-300 hover:-translate-y-1 ${plan.highlight
                                    ? "border-neon-cyan shadow-[0_0_25px_rgba(0,255,170,0.12)] bg-card"
                                    : "border-border bg-card/80 hover:border-muted-foreground/30"
                                }`}
                        >
                            {plan.highlight && (
                                <>
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan to-neon-purple" />
                                    <div className="absolute top-3 right-3">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
                                            <Sparkles className="w-2.5 h-2.5" />
                                            Más elegido
                                        </span>
                                    </div>
                                </>
                            )}

                            <div className="p-5 flex flex-col flex-1">
                                <h3 className="text-sm font-bold mb-3">{plan.name}</h3>

                                <div className="flex items-end gap-1 mb-1">
                                    <span className="text-2xl font-black font-display bg-gradient-to-br from-foreground to-foreground/70 text-transparent bg-clip-text">
                                        {plan.price}
                                    </span>
                                    <span className="text-muted-foreground text-xs mb-0.5">{plan.period}</span>
                                </div>

                                {plan.savings ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neon-green mb-3">
                                        <ShieldCheck className="w-3 h-3" />
                                        {plan.savings}
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground mb-3">Sin compromiso</span>
                                )}

                                {plan.months > 1 && (
                                    <p className="text-[10px] text-muted-foreground mb-3">
                                        Equivale a <span className="font-semibold text-foreground">
                                            ${Math.round((plan.id === "semestral" ? 25000 : 45000) / plan.months).toLocaleString("es-AR")}
                                        </span>/mes
                                    </p>
                                )}

                                <a
                                    href={`https://wa.me/5492617737367?text=Hola,%20quiero%20el%20plan%20${plan.name.toUpperCase()}%20de%20TABE%20(${encodeURIComponent(plan.price)})`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`mt-auto w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${plan.highlight
                                            ? "bg-gradient-to-r from-neon-cyan to-neon-purple text-white hover:shadow-[0_0_20px_rgba(0,255,170,0.25)]"
                                            : "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                                        }`}
                                >
                                    <Crown className="w-3.5 h-3.5" />
                                    Elegir {plan.name}
                                    <ArrowRight className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-center text-xs text-muted-foreground">
                    Contactanos por WhatsApp, realizá la transferencia y activamos tu cuenta al instante.
                </p>
            </div>
        </div>
    );
}
