import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Loader2, Info, Leaf, Snowflake, Palette, User, Check, AlertCircle, ShoppingBag, Package, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMarketplace } from "@/hooks/useMarketplace";
import { Badge } from "@/components/ui/badge";

interface MarketplaceItem {
    id: string;
    type: 'fertilizer' | 'streak_freeze' | 'theme' | 'badge' | 'instant_grow';
    name: string;
    description: string;
    cost: number;
    icon: React.ElementType;
    color: string;
    gradient: string;
}

const ITEMS: MarketplaceItem[] = [
    {
        id: "xp_boost_1h",
        type: "xp_boost" as any,
        name: "Potenciador de XP (1h)",
        description: "Duplica tu experiencia ganada por 1 hora. ¡Sube de nivel más rápido!",
        cost: 600,
        icon: Zap,
        color: "text-amber-500",
        gradient: "from-amber-500 to-orange-600"
    },
    {
        id: "mystery_box",
        type: "mystery_box" as any,
        name: "Caja Misteriosa",
        description: "Contiene entre 500 y 5000 créditos. ¿Te sientes con suerte?",
        cost: 1000,
        icon: Package,
        color: "text-pink-500",
        gradient: "from-pink-500 to-rose-600"
    },
    {
        id: "instant_grow",
        type: "instant_grow",
        name: "Poción de Crecimiento",
        description: "Hace crecer tu planta instantáneamente saltando una etapa. (+35% crecimiento)",
        cost: 800,
        icon: Zap,
        color: "text-purple-500",
        gradient: "from-purple-500 to-indigo-500"
    },
    {
        id: "fertilizer_2x",
        type: "fertilizer",
        name: "Super Fertilizante",
        description: "Acelera el crecimiento de tu planta al 200% por 24 horas. ¡Tu bosque te lo agradecerá!",
        cost: 250,
        icon: Leaf,
        color: "text-neon-green",
        gradient: "from-neon-green to-emerald-500"
    },
    {
        id: "freeze_1d",
        type: "streak_freeze",
        name: "Congelar Racha",
        description: "Protege tu racha por un día si olvidas estudiar. Se consume automáticamente.",
        cost: 500,
        icon: Snowflake,
        color: "text-neon-cyan",
        gradient: "from-neon-cyan to-blue-500"
    },
    {
        id: "theme_neon_gold",
        type: "theme",
        name: "Tema Neon Gold",
        description: "Desbloquea el exclusivo esquema de colores dorado para toda la aplicación.",
        cost: 1500,
        icon: Palette,
        color: "text-neon-gold",
        gradient: "from-neon-gold to-orange-500"
    },
    {
        id: "badge_supporter",
        type: "badge",
        name: "Insignia VIP",
        description: "Muestra una insignia especial al lado de tu nombre en los rankings y perfiles.",
        cost: 3000,
        icon: User,
        color: "text-neon-purple",
        gradient: "from-neon-purple to-pink-500"
    }
];

export function MarketplaceModal() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [credits, setCredits] = useState<number>(0);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'tienda' | 'inventario'>('tienda');

    const { userInventory, fetchInventory, useItem, equipItem, loadingInventory } = useMarketplace();

    useEffect(() => {
        if (open && user) {
            fetchUserCredits();
            fetchInventory();
        }
    }, [open, user, fetchInventory]);

    const fetchUserCredits = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("user_stats")
            .select("credits")
            .eq("user_id", user?.id)
            .single();

        if (data) setCredits((data as any).credits || 0);
        setLoading(false);
    };

    const handlePurchase = async (item: MarketplaceItem) => {
        if (!user) return;
        if (credits < item.cost) {
            toast.error("No tienes suficientes créditos para comprar este ítem");
            return;
        }

        setPurchasing(item.id);
        try {
            const { data, error } = await (supabase.rpc as any)('purchase_item', {
                p_item_type: item.type,
                p_item_id: item.id,
                p_cost: item.cost
            });

            if (error) throw error;

            const result = data as { success: boolean, message: string, new_xp?: number };

            if (result && result.success) {
                toast.success(`¡Compraste ${item.name}!`, {
                    description: "Se ha añadido a tu inventario/activado."
                });
                if ((result as any).new_credits !== undefined) {
                    setCredits((result as any).new_credits);
                }
                setOpen(false);
            } else {
                toast.error("Error en la compra: " + (result?.message || "Desconocido"));
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
                    <div className="flex items-center justify-between mb-2">
                        <DialogTitle className="flex items-center gap-2 text-2xl font-display">
                            <Coins className="w-8 h-8 text-neon-gold" />
                            {view === 'tienda' ? 'Tienda de Objetos' : 'Mi Inventario'}
                        </DialogTitle>
                        <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-xl border border-neon-gold/30">
                            <span className="text-muted-foreground text-sm">Créditos:</span>
                            <span className="font-bold text-neon-gold text-lg">{loading ? "..." : credits.toLocaleString()}</span>
                            <Coins className="w-4 h-4 text-neon-gold" />
                        </div>
                    </div>

                    <div className="flex gap-2 p-1 bg-secondary/30 rounded-lg w-fit">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.preventDefault();
                                setView('tienda');
                            }}
                            className={cn(
                                "gap-2 px-4 py-1.5 h-auto transition-all",
                                view === 'tienda' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <ShoppingBag className="w-4 h-4" />
                            Tienda
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.preventDefault();
                                setView('inventario');
                            }}
                            className={cn(
                                "gap-2 px-4 py-1.5 h-auto transition-all",
                                view === 'inventario' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Package className="w-4 h-4" />
                            Inventario
                            {userInventory.length > 0 && (
                                <span className="bg-neon-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                                    {userInventory.reduce((acc, curr) => acc + (curr.quantity || 0), 0)}
                                </span>
                            )}
                        </Button>
                    </div>
                </DialogHeader>

                <div className="mt-4">
                    {view === 'tienda' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {ITEMS.map((item) => (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "relative group overflow-hidden rounded-xl border border-border/50 bg-secondary/20 hover:border-neon-gold/30 transition-all duration-300",
                                        credits >= item.cost ? "hover:scale-[1.02] hover:bg-secondary/40" : "opacity-80"
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
                                                "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1",
                                                credits >= item.cost
                                                    ? "bg-neon-gold/10 text-neon-gold border-neon-gold/30"
                                                    : "bg-destructive/10 text-destructive border-destructive/30"
                                            )}>
                                                {item.cost} <Coins className="w-3 h-3" />
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                                        <p className="text-sm text-muted-foreground mb-6 flex-grow">
                                            {item.description}
                                        </p>

                                        <Button
                                            className={cn(
                                                "w-full font-bold transition-all",
                                                credits >= item.cost
                                                    ? "bg-gradient-to-r hover:opacity-90 text-white shadow-lg"
                                                    : "bg-secondary text-muted-foreground cursor-not-allowed",
                                                item.gradient
                                            )}
                                            disabled={credits < item.cost || purchasing === item.id}
                                            onClick={() => handlePurchase(item)}
                                        >
                                            {purchasing === item.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : credits >= item.cost ? (
                                                <>
                                                    Comprar <Check className="w-4 h-4 ml-2" />
                                                </>
                                            ) : (
                                                <>
                                                    Insuficiente <AlertCircle className="w-4 h-4 ml-2" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : userInventory.length === 0 ? (
                        <div className="py-12 text-center bg-secondary/10 rounded-xl border border-dashed border-border">
                            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                            <p className="text-muted-foreground">Tu inventario está vacío</p>
                            <Button
                                variant="link"
                                onClick={() => setView('tienda')}
                                className="text-neon-cyan mt-2"
                            >
                                Ir a la tienda
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {userInventory.map((invItem) => {
                                const itemDetails = ITEMS.find(i => i.id === invItem.item_id);
                                if (!itemDetails) return null;

                                return (
                                    <div
                                        key={invItem.id}
                                        className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border group hover:border-border/80 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-lg flex items-center justify-center bg-background border border-border shadow-sm",
                                                itemDetails.color
                                            )}>
                                                <itemDetails.icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold">{itemDetails.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                                        {invItem.quantity} disponible(s)
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                                                        {itemDetails.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {itemDetails.type === 'fertilizer' || itemDetails.type === 'instant_grow' ? (
                                                <Button
                                                    size="sm"
                                                    className={cn(
                                                        "font-bold h-9 transition-transform active:scale-95",
                                                        itemDetails.type === 'instant_grow'
                                                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                                                            : "bg-neon-green hover:bg-neon-green/90 text-black"
                                                    )}
                                                    onClick={() => useItem(invItem.item_type, invItem.item_id)}
                                                >
                                                    Usar
                                                </Button>
                                            ) : itemDetails.type === 'theme' || itemDetails.type === 'badge' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className={cn(
                                                        "h-9 transition-all",
                                                        itemDetails.type === 'theme' ? "border-neon-gold text-neon-gold hover:bg-neon-gold/10" : "border-neon-purple text-neon-purple hover:bg-neon-purple/10"
                                                    )}
                                                    onClick={() => equipItem(invItem.item_id, itemDetails.type)}
                                                >
                                                    Equipar
                                                </Button>
                                            ) : (
                                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                                    {itemDetails.type === 'streak_freeze' ? "Auto-consumible" : "Perfil"}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-6 p-4 bg-secondary/30 rounded-xl border border-border/50 flex items-start gap-3">
                    <Info className="w-5 h-5 text-neon-cyan flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-semibold text-foreground mb-1">¿Cómo consigo más Créditos?</p>
                        <p className="text-muted-foreground">
                            Ganas Créditos completando sesiones de estudio, aprobando materias y manteniendo tu racha diaria. ¡Estudia más para conseguir mejores recompensas!
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}
