import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FOOD_MENU, ACCESSORIES_SHOP, FoodItem, AccessoryItem, TabeGochiPet } from "@/types/tabegochi";
import { PixelPetSprite } from "@/components/tabegochi/PixelPetSprite";
import { PixelItemIcon } from "@/components/tabegochi/PixelItemIcon";
import { Store, Coins, Sparkles, Shirt, Sword, Crown, Palette, Utensils, Image, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PetShopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coins: number;
  inventory: string[];
  activePet: TabeGochiPet | null;
  onBuyItem: (item: { id: string; cost: number; name: string }) => boolean;
  onEquipItem: (type: "hat" | "outfit" | "held" | "aura" | "skin" | "bg", itemId?: string) => void;
  onFeedPet: (foodId: string) => void;
}

export function PetShopModal({
  open,
  onOpenChange,
  coins,
  inventory,
  activePet,
  onBuyItem,
  onEquipItem,
  onFeedPet,
}: PetShopModalProps) {
  const [activeTab, setActiveTab] = useState<"hats" | "outfits" | "held" | "auras" | "food" | "bgs">("hats");
  
  // Estado para el probador en vivo (Live Dressing Room)
  const [previewHat, setPreviewHat] = useState<string | undefined>(activePet?.hat);
  const [previewOutfit, setPreviewOutfit] = useState<string | undefined>(activePet?.outfit);
  const [previewHeld, setPreviewHeld] = useState<string | undefined>(activePet?.heldItem);
  const [previewAura, setPreviewAura] = useState<string | undefined>(activePet?.aura);
  const [previewSkin, setPreviewSkin] = useState<string | undefined>(activePet?.colorSkin);

  const hats = ACCESSORIES_SHOP.filter(a => a.type === "hat");
  const outfits = ACCESSORIES_SHOP.filter(a => a.type === "outfit");
  const heldItems = ACCESSORIES_SHOP.filter(a => a.type === "held");
  const aurasAndSkins = ACCESSORIES_SHOP.filter(a => a.type === "aura" || a.type === "skin");
  const bgs = ACCESSORIES_SHOP.filter(a => a.type === "bg");

  const handleEquipToggle = (type: "hat" | "outfit" | "held" | "aura" | "skin" | "bg", itemId: string) => {
    let isCurrentlyEquipped = false;
    if (type === "hat") isCurrentlyEquipped = activePet?.hat === itemId;
    else if (type === "outfit") isCurrentlyEquipped = activePet?.outfit === itemId;
    else if (type === "held") isCurrentlyEquipped = activePet?.heldItem === itemId;
    else if (type === "aura") isCurrentlyEquipped = activePet?.aura === itemId;
    else if (type === "skin") isCurrentlyEquipped = activePet?.colorSkin === itemId;
    else if (type === "bg") isCurrentlyEquipped = activePet?.background === itemId;

    const nextVal = isCurrentlyEquipped ? undefined : itemId;
    onEquipItem(type, nextVal);

    if (type === "hat") setPreviewHat(nextVal);
    else if (type === "outfit") setPreviewOutfit(nextVal);
    else if (type === "held") setPreviewHeld(nextVal);
    else if (type === "aura") setPreviewAura(nextVal);
    else if (type === "skin") setPreviewSkin(nextVal);
  };

  const handleResetPreview = () => {
    setPreviewHat(activePet?.hat);
    setPreviewOutfit(activePet?.outfit);
    setPreviewHeld(activePet?.heldItem);
    setPreviewAura(activePet?.aura);
    setPreviewSkin(activePet?.colorSkin);
  };

  const hasModifications = 
    previewHat !== activePet?.hat ||
    previewOutfit !== activePet?.outfit ||
    previewHeld !== activePet?.heldItem ||
    previewAura !== activePet?.aura ||
    previewSkin !== activePet?.colorSkin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-4 border-black text-foreground w-[96vw] max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl p-0 gap-0 shadow-[8px_8px_0px_#000]">
        
        {/* Header Cómic con saldo de monedas */}
        <DialogHeader className="p-5 bg-[#00E5FF] border-b-4 border-black text-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-black text-[#00E5FF] flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#fff]">
                <Store className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-wider font-mono">
                  Boutique & Armería Retro
                </DialogTitle>
                <DialogDescription className="text-black font-bold text-xs">
                  Colección masiva de sombreros, trajes, nano bananas, armas, auras y tintes
                </DialogDescription>
              </div>
            </div>

            {/* Saldo de Monedas sin emojis */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-black text-[#FFE600] rounded-xl border-2 border-black font-black text-xs font-mono shadow-[2px_2px_0px_#fff]">
              <div className="w-4 h-4 rounded-full bg-[#FFE600] border border-black flex items-center justify-center text-[10px] text-black font-black">
                $
              </div>
              <span>{coins} TABECOINS</span>
            </div>
          </div>
        </DialogHeader>

        {/* PROBADOR EN VIVO (Live Dressing Room) */}
        {activePet && (
          <div className="bg-[#9bbc0f] border-b-4 border-black p-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden select-none">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-[#8bac0f] border-3 border-black rounded-2xl p-1 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] shrink-0">
                <PixelPetSprite
                  species={activePet.species}
                  stage={activePet.stage}
                  hat={previewHat}
                  outfit={previewOutfit}
                  heldItem={previewHeld}
                  aura={previewAura}
                  colorSkin={previewSkin}
                  size={84}
                />
              </div>
              <div>
                <div className="inline-block bg-black text-[#FFE600] px-2 py-0.5 rounded font-mono font-black text-[10px] uppercase border border-black mb-1">
                  Probador en Vivo
                </div>
                <h4 className="font-black text-sm uppercase text-black font-mono">
                  {activePet.name} • NIVEL {activePet.level}
                </h4>
                <p className="text-[11px] font-bold text-black/85 max-w-sm">
                  Pasa el mouse o selecciona cualquier prenda u objeto para ver el look en tiempo real.
                </p>
              </div>
            </div>

            {hasModifications && (
              <Button
                size="sm"
                onClick={handleResetPreview}
                className="bg-black hover:bg-slate-800 text-white font-black text-xs rounded-xl border-2 border-black uppercase shadow-[2px_2px_0px_#fff] flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </Button>
            )}
          </div>
        )}

        {/* Contenido con Tabs */}
        <div className="p-5">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full mb-5 bg-muted/60 p-1 border-2 border-black rounded-xl gap-1 h-auto">
              <TabsTrigger value="hats" className="text-[11px] font-black uppercase gap-1 data-[state=active]:bg-[#FFE600] data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_#000] data-[state=active]:border-2 data-[state=active]:border-black rounded-lg py-2">
                <Crown className="w-3.5 h-3.5" />
                <span>Gorras</span>
              </TabsTrigger>
              <TabsTrigger value="outfits" className="text-[11px] font-black uppercase gap-1 data-[state=active]:bg-[#FF2E93] data-[state=active]:text-white data-[state=active]:shadow-[2px_2px_0px_#000] data-[state=active]:border-2 data-[state=active]:border-black rounded-lg py-2">
                <Shirt className="w-3.5 h-3.5" />
                <span>Ropa</span>
              </TabsTrigger>
              <TabsTrigger value="held" className="text-[11px] font-black uppercase gap-1 data-[state=active]:bg-[#00E5FF] data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_#000] data-[state=active]:border-2 data-[state=active]:border-black rounded-lg py-2">
                <Sword className="w-3.5 h-3.5" />
                <span>Armas</span>
              </TabsTrigger>
              <TabsTrigger value="auras" className="text-[11px] font-black uppercase gap-1 data-[state=active]:bg-[#A855F7] data-[state=active]:text-white data-[state=active]:shadow-[2px_2px_0px_#000] data-[state=active]:border-2 data-[state=active]:border-black rounded-lg py-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auras</span>
              </TabsTrigger>
              <TabsTrigger value="food" className="text-[11px] font-black uppercase gap-1 data-[state=active]:bg-[#10B981] data-[state=active]:text-white data-[state=active]:shadow-[2px_2px_0px_#000] data-[state=active]:border-2 data-[state=active]:border-black rounded-lg py-2">
                <Utensils className="w-3.5 h-3.5" />
                <span>Comida</span>
              </TabsTrigger>
              <TabsTrigger value="bgs" className="text-[11px] font-black uppercase gap-1 data-[state=active]:bg-[#F97316] data-[state=active]:text-white data-[state=active]:shadow-[2px_2px_0px_#000] data-[state=active]:border-2 data-[state=active]:border-black rounded-lg py-2">
                <Image className="w-3.5 h-3.5" />
                <span>Fondos</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: SOMBREROS */}
            <TabsContent value="hats" className="space-y-3 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {hats.map((item) => {
                  const isOwned = inventory.includes(item.id);
                  const isEquipped = activePet?.hat === item.id;
                  const canAfford = coins >= item.cost;

                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setPreviewHat(item.id)}
                      onMouseLeave={() => setPreviewHat(activePet?.hat)}
                      className={cn(
                        "p-3 rounded-2xl bg-card border-3 border-black shadow-[3px_3px_0px_#000] flex flex-col justify-between gap-2.5 transition-transform hover:-translate-y-0.5",
                        isEquipped && "bg-yellow-50 dark:bg-yellow-950/20 border-[#FFE600]"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-muted/60 border-2 border-black flex items-center justify-center shrink-0">
                          <PixelItemIcon name={item.iconName} size={24} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-xs uppercase text-foreground leading-tight truncate">{item.name}</h4>
                          <span className="text-[10px] font-bold text-muted-foreground block line-clamp-1 mt-0.5">
                            {item.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-black/10">
                        <span className="text-[10px] font-mono font-black text-primary">
                          {isOwned ? "OBTENIDO" : `${item.cost} COINS`}
                        </span>
                        {isOwned ? (
                          <Button
                            size="sm"
                            onClick={() => handleEquipToggle("hat", item.id)}
                            className={cn(
                              "h-7 px-3 font-black text-[10px] rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] uppercase",
                              isEquipped ? "bg-amber-400 text-black" : "bg-emerald-500 text-white"
                            )}
                          >
                            {isEquipped ? "Quitar" : "Poner"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={!canAfford}
                            onClick={() => onBuyItem(item)}
                            className="h-7 px-3 font-black text-[10px] rounded-lg bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_#000] uppercase"
                          >
                            Comprar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB 2: TRAJES Y ROPA */}
            <TabsContent value="outfits" className="space-y-3 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {outfits.map((item) => {
                  const isOwned = inventory.includes(item.id);
                  const isEquipped = activePet?.outfit === item.id;
                  const canAfford = coins >= item.cost;

                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setPreviewOutfit(item.id)}
                      onMouseLeave={() => setPreviewOutfit(activePet?.outfit)}
                      className={cn(
                        "p-3 rounded-2xl bg-card border-3 border-black shadow-[3px_3px_0px_#000] flex flex-col justify-between gap-2.5 transition-transform hover:-translate-y-0.5",
                        isEquipped && "bg-pink-50 dark:bg-pink-950/20 border-[#FF2E93]"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-muted/60 border-2 border-black flex items-center justify-center shrink-0">
                          <PixelItemIcon name={item.iconName} size={24} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-xs uppercase text-foreground leading-tight truncate">{item.name}</h4>
                          <span className="text-[10px] font-bold text-muted-foreground block line-clamp-1 mt-0.5">
                            {item.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-black/10">
                        <span className="text-[10px] font-mono font-black text-primary">
                          {isOwned ? "OBTENIDO" : `${item.cost} COINS`}
                        </span>
                        {isOwned ? (
                          <Button
                            size="sm"
                            onClick={() => handleEquipToggle("outfit", item.id)}
                            className={cn(
                              "h-7 px-3 font-black text-[10px] rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] uppercase",
                              isEquipped ? "bg-amber-400 text-black" : "bg-emerald-500 text-white"
                            )}
                          >
                            {isEquipped ? "Quitar" : "Poner"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={!canAfford}
                            onClick={() => onBuyItem(item)}
                            className="h-7 px-3 font-black text-[10px] rounded-lg bg-[#FF2E93] text-white border-2 border-black shadow-[2px_2px_0px_#000] uppercase"
                          >
                            Comprar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB 3: OBJETOS EN MANO (HELD ITEMS & NANO BANANA) */}
            <TabsContent value="held" className="space-y-3 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {heldItems.map((item) => {
                  const isOwned = inventory.includes(item.id);
                  const isEquipped = activePet?.heldItem === item.id;
                  const canAfford = coins >= item.cost;

                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setPreviewHeld(item.id)}
                      onMouseLeave={() => setPreviewHeld(activePet?.heldItem)}
                      className={cn(
                        "p-3 rounded-2xl bg-card border-3 border-black shadow-[3px_3px_0px_#000] flex flex-col justify-between gap-2.5 transition-transform hover:-translate-y-0.5",
                        isEquipped && "bg-cyan-50 dark:bg-cyan-950/20 border-[#00E5FF]"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-muted/60 border-2 border-black flex items-center justify-center shrink-0">
                          <PixelItemIcon name={item.iconName} size={24} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-xs uppercase text-foreground leading-tight truncate">{item.name}</h4>
                          <span className="text-[10px] font-bold text-muted-foreground block line-clamp-1 mt-0.5">
                            {item.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-black/10">
                        <span className="text-[10px] font-mono font-black text-primary">
                          {isOwned ? "OBTENIDO" : `${item.cost} COINS`}
                        </span>
                        {isOwned ? (
                          <Button
                            size="sm"
                            onClick={() => handleEquipToggle("held", item.id)}
                            className={cn(
                              "h-7 px-3 font-black text-[10px] rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] uppercase",
                              isEquipped ? "bg-amber-400 text-black" : "bg-emerald-500 text-white"
                            )}
                          >
                            {isEquipped ? "Guardar" : "Blandir"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={!canAfford}
                            onClick={() => onBuyItem(item)}
                            className="h-7 px-3 font-black text-[10px] rounded-lg bg-[#00E5FF] text-black border-2 border-black shadow-[2px_2px_0px_#000] uppercase"
                          >
                            Comprar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB 4: AURAS & TINTES DE PIEL */}
            <TabsContent value="auras" className="space-y-3 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {aurasAndSkins.map((item) => {
                  const isOwned = inventory.includes(item.id);
                  const isEquipped = item.type === "aura" ? activePet?.aura === item.id : activePet?.colorSkin === item.id;
                  const canAfford = coins >= item.cost;

                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => {
                        if (item.type === "aura") setPreviewAura(item.id);
                        else setPreviewSkin(item.id);
                      }}
                      onMouseLeave={() => {
                        if (item.type === "aura") setPreviewAura(activePet?.aura);
                        else setPreviewSkin(activePet?.colorSkin);
                      }}
                      className={cn(
                        "p-3 rounded-2xl bg-card border-3 border-black shadow-[3px_3px_0px_#000] flex flex-col justify-between gap-2.5 transition-transform hover:-translate-y-0.5",
                        isEquipped && "bg-purple-50 dark:bg-purple-950/20 border-[#A855F7]"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-muted/60 border-2 border-black flex items-center justify-center shrink-0">
                          <PixelItemIcon name={item.iconName} size={24} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-xs uppercase text-foreground leading-tight truncate">{item.name}</h4>
                          <span className="text-[10px] font-bold text-muted-foreground block line-clamp-1 mt-0.5">
                            {item.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-black/10">
                        <span className="text-[10px] font-mono font-black text-primary">
                          {isOwned ? "OBTENIDO" : `${item.cost} COINS`}
                        </span>
                        {isOwned ? (
                          <Button
                            size="sm"
                            onClick={() => handleEquipToggle(item.type as any, item.id)}
                            className={cn(
                              "h-7 px-3 font-black text-[10px] rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] uppercase",
                              isEquipped ? "bg-amber-400 text-black" : "bg-emerald-500 text-white"
                            )}
                          >
                            {isEquipped ? "Remover" : "Activar"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={!canAfford}
                            onClick={() => onBuyItem(item)}
                            className="h-7 px-3 font-black text-[10px] rounded-lg bg-[#A855F7] text-white border-2 border-black shadow-[2px_2px_0px_#000] uppercase"
                          >
                            Comprar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB 5: COMIDAS GOURMET (INCLUYE NANO BANANA) */}
            <TabsContent value="food" className="space-y-3 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {FOOD_MENU.map((food) => {
                  const canAfford = coins >= food.cost;

                  return (
                    <div
                      key={food.id}
                      className={cn(
                        "p-3 rounded-2xl bg-card border-3 border-black shadow-[3px_3px_0px_#000] flex flex-col justify-between gap-2.5",
                        food.id === "nano_banana" && "bg-amber-50 dark:bg-amber-950/20 border-[#FFE600]"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-muted/60 border-2 border-black flex items-center justify-center shrink-0">
                          <PixelItemIcon name={food.iconName} size={24} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-black text-xs uppercase text-foreground leading-tight truncate">{food.name}</h4>
                            {food.id === "nano_banana" && (
                              <span className="text-[9px] font-black uppercase bg-[#FFE600] text-black px-1.5 rounded border border-black font-mono">
                                NANO
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground block line-clamp-1 mt-0.5">
                            +{food.hungerBoost}% Saciedad • +{food.happinessBoost}% Felicidad
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-black/10">
                        <span className="text-[10px] font-mono font-black text-primary">
                          {food.cost === 0 ? "GRATIS" : `${food.cost} COINS`}
                        </span>
                        <Button
                          size="sm"
                          disabled={!canAfford}
                          onClick={() => {
                            if (food.cost === 0 || onBuyItem({ id: food.id, cost: food.cost, name: food.name })) {
                              onFeedPet(food.id);
                            }
                          }}
                          className="h-7 px-3 font-black text-[10px] rounded-lg bg-[#10B981] hover:bg-emerald-600 text-white border-2 border-black shadow-[2px_2px_0px_#000] uppercase"
                        >
                          Alimentar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB 6: FONDOS LCD */}
            <TabsContent value="bgs" className="space-y-3 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {bgs.map((bg) => {
                  const isOwned = bg.cost === 0 || inventory.includes(bg.id);
                  const isEquipped = activePet?.background === bg.id || (!activePet?.background && bg.id === "room");
                  const canAfford = coins >= bg.cost;

                  return (
                    <div
                      key={bg.id}
                      className={cn(
                        "p-3 rounded-2xl bg-card border-3 border-black shadow-[3px_3px_0px_#000] flex flex-col justify-between gap-2.5",
                        isEquipped && "bg-purple-50 dark:bg-purple-950/20 border-[#8B5CF6]"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-muted/60 border-2 border-black flex items-center justify-center shrink-0">
                          <PixelItemIcon name={bg.iconName} size={24} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-xs uppercase text-foreground leading-tight truncate">{bg.name}</h4>
                          <span className="text-[10px] font-bold text-muted-foreground block line-clamp-1 mt-0.5">
                            {bg.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-black/10">
                        <span className="text-[10px] font-mono font-black text-primary">
                          {isOwned ? "OBTENIDO" : `${bg.cost} COINS`}
                        </span>
                        {isOwned ? (
                          <Button
                            size="sm"
                            disabled={isEquipped}
                            onClick={() => onEquipItem("bg", bg.id)}
                            className={cn(
                              "h-7 px-3 font-black text-[10px] rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] uppercase",
                              isEquipped ? "bg-muted text-muted-foreground shadow-none" : "bg-[#8B5CF6] text-white"
                            )}
                          >
                            {isEquipped ? "En uso" : "Aplicar"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={!canAfford}
                            onClick={() => onBuyItem(bg)}
                            className="h-7 px-3 font-black text-[10px] rounded-lg bg-[#8B5CF6] text-white border-2 border-black shadow-[2px_2px_0px_#000] uppercase"
                          >
                            Comprar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
