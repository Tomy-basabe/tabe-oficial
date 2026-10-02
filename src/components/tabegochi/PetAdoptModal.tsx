import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PET_SPECIES_LIST, PetSpecies } from "@/types/tabegochi";
import { PixelPetSprite } from "@/components/tabegochi/PixelPetSprite";
import { Sparkles, Heart, Zap, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface PetAdoptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdopt: (name: string, species: PetSpecies) => void;
}

export function PetAdoptModal({ open, onOpenChange, onAdopt }: PetAdoptModalProps) {
  const [selectedSpecies, setSelectedSpecies] = useState<PetSpecies>("cat");
  const [petName, setPetName] = useState("");

  const selectedInfo = PET_SPECIES_LIST.find(s => s.id === selectedSpecies) || PET_SPECIES_LIST[0];

  const handleConfirm = () => {
    const finalName = petName.trim() || selectedInfo.name;
    onAdopt(finalName, selectedSpecies);
    setPetName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-4 border-black text-foreground w-[95vw] max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl p-0 gap-0 shadow-[8px_8px_0px_#000]">
        
        {/* Cabecera Neobrutalista */}
        <DialogHeader className="p-5 pb-4 bg-[#FFE600] border-b-4 border-black text-center text-black">
          <div className="w-12 h-12 rounded-2xl bg-black text-[#FFE600] flex items-center justify-center mx-auto mb-2 border-2 border-black shadow-[3px_3px_0px_#fff]">
            <Sparkles className="w-6 h-6 stroke-[2.5]" />
          </div>
          <DialogTitle className="text-2xl font-black uppercase tracking-wider font-mono">
            Centro de Adopción Tabe Gotchi
          </DialogTitle>
          <DialogDescription className="text-black font-bold text-xs mt-0.5">
            Elige la especie 2D retro de tu compañero virtual y dale un nombre legendario.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Selector de Especies con Pixel Art 2D */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-3 font-mono">
              1. Selecciona tu Especie Pixel:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PET_SPECIES_LIST.map((spec) => {
                const isSelected = selectedSpecies === spec.id;
                return (
                  <div
                    key={spec.id}
                    onClick={() => setSelectedSpecies(spec.id)}
                    className={cn(
                      "p-3 rounded-2xl border-3 border-black cursor-pointer transition-all flex flex-col items-center text-center",
                      isSelected
                        ? "bg-[#FFE600] text-black shadow-[4px_4px_0px_#000] -translate-y-1"
                        : "bg-card text-foreground hover:bg-muted/50 shadow-[2px_2px_0px_#000]"
                    )}
                  >
                    <div className="w-16 h-16 flex items-center justify-center mb-1">
                      <PixelPetSprite species={spec.id} size={58} />
                    </div>
                    <span className="font-black text-sm uppercase font-mono">{spec.name}</span>
                    <span className="text-[10px] font-bold opacity-80">{spec.subtitle}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ficha Detallada de la Mascota Seleccionada */}
          <div className="p-4 rounded-2xl bg-[#9bbc0f] border-3 border-black shadow-[4px_4px_0px_#000] flex flex-col sm:flex-row items-center gap-4 text-black select-none">
            <div className="w-24 h-24 rounded-2xl bg-[#8bac0f] border-3 border-black flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] shrink-0">
              <PixelPetSprite species={selectedSpecies} size={84} />
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-lg font-black uppercase font-mono text-black">{selectedInfo.name}</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black text-[#FFE600] border border-black font-mono">
                  {selectedInfo.element}
                </span>
              </div>
              <p className="text-xs font-bold text-black/85">
                {selectedInfo.description}
              </p>
              <div className="text-[11px] font-black text-black flex items-center justify-center sm:justify-start gap-3 pt-1 font-mono">
                <span>[GUSTO] {selectedInfo.favoriteFood}</span>
                <span>[HABILIDAD] {selectedInfo.specialSkill}</span>
              </div>
            </div>
          </div>

          {/* Nombre personalizado */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wide text-foreground font-mono">
              2. ¿Cómo se llamará tu mascota?
            </label>
            <Input
              type="text"
              maxLength={16}
              placeholder={`Ej: ${selectedInfo.name}`}
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              className="border-3 border-black rounded-xl text-base font-black px-4 py-5 shadow-[2px_2px_0px_#000] focus-visible:ring-0 uppercase font-mono"
            />
          </div>

          {/* Botón de Confirmación */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-2 border-black font-black uppercase rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-[#FFE600] hover:bg-yellow-400 text-black border-3 border-black font-black uppercase tracking-wider rounded-xl shadow-[3px_3px_0px_#000] hover:translate-y-[-1px] transition-transform"
            >
              ¡Adoptar Mascota!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
