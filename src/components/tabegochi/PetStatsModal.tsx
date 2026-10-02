import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TabeGochiPet, PET_SPECIES_LIST } from "@/types/tabegochi";
import { PixelPetSprite } from "@/components/tabegochi/PixelPetSprite";
import { Zap, Heart, Utensils, Droplets, Activity, Trash2, UserPlus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PetStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pet: TabeGochiPet | null;
  allPets: TabeGochiPet[];
  onSwitchPet: (petId: string) => void;
  onReleasePet: (petId: string) => void;
  onAdoptNew?: () => void;
}

export function PetStatsModal({
  open,
  onOpenChange,
  pet,
  allPets,
  onSwitchPet,
  onReleasePet,
  onAdoptNew,
}: PetStatsModalProps) {
  if (!pet) return null;
  const species = PET_SPECIES_LIST.find(s => s.id === pet.species) || PET_SPECIES_LIST[0];
  const xpPercent = Math.min(100, Math.round((pet.xp % 100) / 100 * 100));

  const handleAbandonAndAdopt = () => {
    const confirmMsg = allPets.length <= 1
      ? `¿Estás seguro de despedir a ${pet.name}? Se abrirá el Centro de Adopción para que elijas tu nueva mascota virtual.`
      : `¿Estás seguro de despedir a ${pet.name}? Esta acción no se puede deshacer.`;

    if (window.confirm(confirmMsg)) {
      onReleasePet(pet.id);
      onOpenChange(false);
      if (allPets.length <= 1 && onAdoptNew) {
        setTimeout(() => onAdoptNew(), 200);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-4 border-black text-foreground w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-0 gap-0 shadow-[8px_8px_0px_#000]">
        
        {/* Cabecera sin emojis */}
        <DialogHeader className="p-5 bg-[#FFE600] border-b-4 border-black text-black">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-2xl bg-black border-3 border-black flex items-center justify-center shadow-[2px_2px_0px_#fff] shrink-0 p-1">
              <PixelPetSprite
                species={pet.species}
                stage={pet.stage}
                hat={pet.hat}
                outfit={pet.outfit}
                heldItem={pet.heldItem}
                aura={pet.aura}
                colorSkin={pet.colorSkin}
                size={54}
              />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-wider font-mono">
                Ficha Médica de {pet.name}
              </DialogTitle>
              <DialogDescription className="text-black font-bold text-xs font-mono">
                {species.subtitle} • NIVEL {pet.level} • {pet.stage === "baby" ? "CRÍA BEBÉ" : pet.stage === "child" ? "JOVEN" : pet.stage === "adult" ? "ADULTO" : "MÍTICO"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          
          {/* Barra de Experiencia / Nivel */}
          <div className="p-4 rounded-2xl bg-muted/40 border-3 border-black shadow-[3px_3px_0px_#000] space-y-2">
            <div className="flex items-center justify-between text-xs font-black uppercase font-mono">
              <span className="flex items-center gap-1.5 text-foreground">
                <Zap className="w-4 h-4 text-[#FFE600] fill-[#FFE600]" />
                Nivel {pet.level}
              </span>
              <span className="text-muted-foreground">{pet.xp % 100} / 100 XP</span>
            </div>
            <div className="w-full bg-background rounded-full h-3 border-2 border-black overflow-hidden">
              <div className="bg-[#FFE600] h-full transition-all duration-300" style={{ width: `${xpPercent}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold text-right font-mono">
              Próximo nivel en {100 - (pet.xp % 100)} XP
            </p>
          </div>

          {/* Estadísticas Vitales con Iconos Vectoriales (Cero Emojis) */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono">
              Signos Vitales y Estado:
            </h4>

            {/* Hambre / Saciedad */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold font-mono">
                <span className="flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-amber-500" />
                  <span>Saciedad / Hambre</span>
                </span>
                <span className={cn(pet.hunger < 25 ? "text-red-500 font-black" : "text-foreground")}>{pet.hunger}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 border-2 border-black overflow-hidden">
                <div className="bg-[#FF9B71] h-full transition-all duration-300" style={{ width: `${pet.hunger}%` }} />
              </div>
            </div>

            {/* Felicidad */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold font-mono">
                <span className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
                  <span>Felicidad y Humor</span>
                </span>
                <span className={cn(pet.happiness < 25 ? "text-red-500 font-black" : "text-foreground")}>{pet.happiness}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 border-2 border-black overflow-hidden">
                <div className="bg-[#FF2E93] h-full transition-all duration-300" style={{ width: `${pet.happiness}%` }} />
              </div>
            </div>

            {/* Energía */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold font-mono">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-500 fill-cyan-500" />
                  <span>Nivel de Energía</span>
                </span>
                <span className={cn(pet.energy < 25 ? "text-red-500 font-black" : "text-foreground")}>{pet.energy}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 border-2 border-black overflow-hidden">
                <div className="bg-[#00E5FF] h-full transition-all duration-300" style={{ width: `${pet.energy}%` }} />
              </div>
            </div>

            {/* Higiene */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold font-mono">
                <span className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Higiene y Limpieza</span>
                </span>
                <span className={cn(pet.hygiene < 25 ? "text-red-500 font-black" : "text-foreground")}>{pet.hygiene}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 border-2 border-black overflow-hidden">
                <div className="bg-[#10B981] h-full transition-all duration-300" style={{ width: `${pet.hygiene}%` }} />
              </div>
            </div>

            {/* Salud */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold font-mono">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-500" />
                  <span>Salud General</span>
                </span>
                <span className={cn(pet.health < 50 ? "text-red-500 font-black" : "text-foreground")}>{pet.health}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 border-2 border-black overflow-hidden">
                <div className="bg-[#A855F7] h-full transition-all duration-300" style={{ width: `${pet.health}%` }} />
              </div>
            </div>
          </div>

          {/* Gestión de Mascotas Múltiples */}
          <div className="space-y-2 pt-2 border-t-2 border-black/10">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono">
                Mascotas en Crianza ({allPets.length}):
              </h4>
              {onAdoptNew && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onAdoptNew();
                  }}
                  className="h-7 px-2.5 text-[10px] font-black uppercase border-2 border-black rounded-lg gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>Adoptar Otra</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allPets.map((p) => {
                const sp = PET_SPECIES_LIST.find(s => s.id === p.species);
                const isCurrent = p.id === pet.id;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "p-2.5 rounded-2xl border-3 border-black flex items-center justify-between gap-2 transition-all",
                      isCurrent ? "bg-[#FFE600]/25 border-primary shadow-[2px_2px_0px_#000]" : "bg-card shadow-[2px_2px_0px_#000]"
                    )}
                  >
                    <div 
                      onClick={() => !isCurrent && onSwitchPet(p.id)}
                      className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                    >
                      <div className="w-10 h-10 bg-black/10 rounded-xl border border-black flex items-center justify-center shrink-0">
                        <PixelPetSprite species={p.species} hat={p.hat} outfit={p.outfit} size={32} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-black text-xs uppercase truncate block font-mono">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground font-bold">Nv. {p.level}</span>
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="text-[9px] font-black uppercase text-black bg-[#FFE600] px-2 py-0.5 rounded border border-black font-mono">
                        ACTIVA
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSwitchPet(p.id)}
                        className="h-7 px-2.5 text-[10px] font-black uppercase border border-black rounded-lg hover:bg-black hover:text-white"
                      >
                        Cuidar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botones inferiores con opción de ABANDONAR LIBREMENTE */}
          <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t-2 border-black/10">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAbandonAndAdopt}
              className="text-red-600 hover:text-white hover:bg-red-600 border-2 border-red-600 text-xs font-black uppercase rounded-xl h-9 px-3 gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Abandonar y Elegir Otra</span>
            </Button>

            <Button
              onClick={() => onOpenChange(false)}
              className="bg-[#FFE600] hover:bg-yellow-400 text-black font-black uppercase text-xs border-3 border-black shadow-[3px_3px_0px_#000] ml-auto h-9 px-6 rounded-xl"
            >
              Listo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
