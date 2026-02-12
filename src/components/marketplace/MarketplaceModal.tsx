import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Loader2, Info, Leaf, Snowflake, Palette, User, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MarketplaceItem {
    id: string;
    type: 'fertilizer' | 'streak_freeze' | 'theme' | 'badge';
    name: string;
    description: string;
    cost: number;
    icon: React.ElementType;
    color: string;
    gradient: string;
}

const ITEMS: MarketplaceItem[] = [
    {
        id: "fertilizer_2x",
        type: "fertilizer",
        name: "Super Fertilizante",
        description: "Acelera el crecimiento de tu planta al 200% por 24 horas. ¡Tu bosque te lo agradecerá!",
        cost: 500,
        icon: Leaf,
        color: "text-neon-green",
        gradient: "from-neon-green to-emerald-500"
    },
    {
        id: "freeze_1d",
        type: "streak_freeze",
        name: "Congelar Racha",
        description: "Protege tu racha por un día si olvidas estudiar. Se consume automáticamente.",
        cost: 1000,
        icon: Snowflake,
        color: "text-neon-cyan",
        gradient: "from-neon-cyan to-blue-500"
    },
    {
        id: "theme_neon_gold",
        type: "theme",
        name: "Tema Neon Gold",
        description: "Desbloquea el exclusivo esquema de colores dorado para toda la aplicación.",
        cost: 2000,
        icon: Palette,
        color: "text-neon-gold",
        gradient: "from-neon-gold to-orange-500"
    },
    {
        id: "badge_supporter",
        type: "badge",
        name: "Insignia VIP",
        description: "Muestra una insignia especial al lado de tu nombre en los rankings y perfiles.",
        cost: 5000,
        icon: User,
        color: "text-neon-purple",
        gradient: "from-neon-purple to-pink-500"
    }
];

export function MarketplaceModal() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [xp, setXp] = useState<number>(0);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && user) {
            fetchUserXp();
        }
    }, [open, user]);

    const fetchUserXp = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("user_stats")
            .select("xp_total")
            .eq("user_id", user?.id)
            .single();

        if (data) setXp(data.xp_total);
        setLoading(false);
    };

    const handlePurchase = async (item: MarketplaceItem) => {
        if (!user) return;
        if (xp < item.cost) {
            toast.error("No tienes suficiente XP para comprar este ítem");
            return;
        }

        setPurchasing(item.id);
        try {
            const { data, error } = await supabase.rpc('purchase_item', {
                p_item_type: item.type,
                p_item_id: item.id,
                p_cost: item.cost,
                p_user_id: user.id
            });

            if (error) throw error;

            if (data && data.success) {
                toast.success(`¡Compraste ${item.name}!`, {
                    description: "Se ha añadido a tu inventario/activado."
                });
                setXp(data.new_xp);
                setOpen(false); // Close on success or keep open? Maybe keep open to buy more
            } else {
                toast.error("Error en la compra: " + (data?.message || "Desconocido"));
            }
        } catch (err: any) {
            console.error("Purchase error:", err);
            toast.error("Error al procesar la compra");
        } finally {
            setPurchasing(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-neon-gold to-orange-500 hover:opacity-90 text-black font-bold border-none shadow-lg shadow-neon-gold/20">
                    <Coins className="w-4 h-4 mr-2" />
                    Tienda de XP
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-card border-border max-h-[85vh] overflow-y-auto custom-scrollbar">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-2xl font-display">
                            <Coins className="w-8 h-8 text-neon-gold" />
                            Tienda de Puntos
                        </span>
                        <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-xl border border-neon-gold/30">
                            <span className="text-muted-foreground text-sm">Tu saldo:</span>
                            <span className="font-bold text-neon-gold text-lg">{loading ? "..." : xp.toLocaleString()} XP</span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {ITEMS.map((item) => (
                        <div
                            key={item.id}
                            className={cn(
                                "relative group overflow-hidden rounded-xl border border-border/50 bg-secondary/20 hover:border-neon-gold/30 transition-all duration-300",
                                xp >= item.cost ? "hover:scale-[1.02] hover:bg-secondary/40" : "opacity-80"
                            )}
                        >
                            {/* Background Glow */}
                            <div className={cn(
                                "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br",
                                item.gradient
                            )} />

                            <div className="p-5 flex flex-col h-full relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center bg-background border border-border/50 shadow-inner",
                                        item.color
                                    )}>
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <div className={cn(
                                        "px-3 py-1 rounded-full text-xs font-bold border",
                                        xp >= item.cost
                                            ? "bg-neon-gold/10 text-neon-gold border-neon-gold/30"
                                            : "bg-destructive/10 text-destructive border-destructive/30"
                                    )}>
                                        {item.cost} XP
                                    </div>
                                </div>

                                <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                                <p className="text-sm text-muted-foreground mb-6 flex-grow">
                                    {item.description}
                                </p>

                                <Button
                                    className={cn(
                                        "w-full font-bold transition-all",
                                        xp >= item.cost
                                            ? "bg-gradient-to-r hover:opacity-90 text-white shadow-lg"
                                            : "bg-secondary text-muted-foreground cursor-not-allowed",
                                        item.gradient
                                    )}
                                    disabled={xp < item.cost || purchasing === item.id}
                                    onClick={() => handlePurchase(item)}
                                >
                                    {purchasing === item.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : xp >= item.cost ? (
                                        <>
                                            Comprar <Check className="w-4 h-4 ml-2" />
                                        </>
                                    ) : (
                                        <>
                                            Insuficiente XP <AlertCircle className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 p-4 bg-secondary/30 rounded-xl border border-border/50 flex items-start gap-3">
                    <Info className="w-5 h-5 text-neon-cyan flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-semibold text-foreground mb-1">¿Cómo consigo más XP?</p>
                        <p className="text-muted-foreground">
                            Ganas XP completando sesiones de estudio, respondiendo flashcards correctamente y manteniendo tu racha diaria. ¡Estudia más para desbloquear mejores recompensas!
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
