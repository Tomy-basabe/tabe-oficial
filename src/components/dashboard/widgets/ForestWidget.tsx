import { useForest } from "@/hooks/useForest";
import { TreePine, Droplet, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ForestWidget() {
  const { currentPlant, plantNewTree, plantTypes, loading, studyActivity } = useForest();
  const [selectedSeed, setSelectedSeed] = useState("oak");
  const [isHovered, setIsHovered] = useState(false);

  const handleDPad = (direction: 1 | -1) => {
    if (currentPlant) return;
    const currentIndex = plantTypes.findIndex(p => p.id === selectedSeed);
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = plantTypes.length - 1;
    if (nextIndex >= plantTypes.length) nextIndex = 0;
    setSelectedSeed(plantTypes[nextIndex].id);
  };

  if (loading) {
    return <Skeleton className="w-full h-48 rounded-3xl" />;
  }

  const plantInfo = currentPlant ? plantTypes.find(p => p.id === currentPlant.plant_type) : null;
  const isGrowing = currentPlant && studyActivity.hasStudiedToday;

  return (
    <div 
      className="relative bg-emerald-500 border-[4px] border-foreground rounded-3xl p-5 hover:shadow-[6px_6px_0_0_#000000] transition-all duration-300 overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Console "Speakers" decoration */}
      <div className="absolute top-4 right-5 flex gap-1.5 opacity-50">
        <div className="w-1.5 h-1.5 rounded-full bg-foreground"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-foreground"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-foreground"></div>
      </div>

      <div className="flex items-center gap-2 mb-4 relative z-10">
        <h3 className="font-black text-xl text-foreground bg-white px-3 py-1 rounded-full border-2 border-foreground uppercase tracking-widest -rotate-2">
          TABE-Gotchi
        </h3>
      </div>

      {/* "LCD" Screen */}
      <div className="bg-[#9bbc0f] border-[4px] border-foreground rounded-xl p-4 shadow-[inset_0_4px_0_rgba(0,0,0,0.1)] min-h-[160px] flex flex-col justify-between relative">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1 text-foreground/80 font-black text-xs uppercase">
            <TreePine className="w-4 h-4" />
            <span>Bosque</span>
          </div>
          {currentPlant && (
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-foreground/70">Progreso</span>
              <div className="text-xl font-black text-foreground">
                {currentPlant.growth_progress}%
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center my-4">
          {!currentPlant ? (
            <div className="text-center animate-bounce mt-4">
              <Sprout className="w-12 h-12 mx-auto text-foreground mb-2" />
              <p className="font-black text-sm uppercase text-foreground">Selecciona Semilla</p>
            </div>
          ) : (
            <div className="text-center">
              <div className={cn(
                "text-6xl mb-2 transition-transform duration-500",
                isHovered && "scale-125"
              )}>
                {currentPlant.growth_percentage < 25 ? "🌱" : currentPlant.growth_percentage < 75 ? "🌿" : plantInfo?.emoji}
              </div>
              <p className="font-black text-sm uppercase text-foreground">
                {currentPlant.growth_percentage < 25 ? "Semilla" : currentPlant.growth_percentage < 75 ? "Brote" : plantInfo?.name}
              </p>
              
              {isGrowing && (
                <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-2">
                  <div className="w-6 h-6 bg-foreground rounded-full flex items-center justify-center animate-ping absolute opacity-75"></div>
                  <div className="w-6 h-6 bg-foreground text-[#9bbc0f] rounded-full flex items-center justify-center relative z-10">
                    <Droplet className="w-3 h-3" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Screen footer status */}
        <div className="border-t-[3px] border-foreground/30 pt-2 flex justify-between items-center text-[10px] font-black uppercase text-foreground/70">
          <span>{currentPlant ? 'Creciendo...' : 'Listo para plantar'}</span>
          {isGrowing && <span>¡Regado hoy!</span>}
        </div>
      </div>

      {/* Console Controls */}
      <div className="mt-5 flex justify-between items-end px-2">
        {/* D-Pad */}
        <div className="relative w-16 h-16 opacity-100">
          <div className="absolute top-1/2 left-0 right-0 h-6 bg-foreground -translate-y-1/2 rounded-sm shadow-[2px_2px_0_rgba(255,255,255,0.3)_inset] flex justify-between overflow-hidden">
            <button className="w-6 h-full hover:bg-white/20 z-20 pointer-events-auto" onClick={() => handleDPad(-1)} aria-label="Anterior semilla" />
            <button className="w-6 h-full hover:bg-white/20 z-20 pointer-events-auto" onClick={() => handleDPad(1)} aria-label="Siguiente semilla" />
          </div>
          <div className="absolute left-1/2 top-0 bottom-0 w-6 bg-foreground -translate-x-1/2 rounded-sm shadow-[2px_2px_0_rgba(255,255,255,0.3)_inset] flex flex-col justify-between pointer-events-none overflow-hidden">
            <button className="w-full h-6 hover:bg-white/20 pointer-events-auto z-20" onClick={() => handleDPad(-1)} aria-label="Anterior semilla" />
            <button className="w-full h-6 hover:bg-white/20 pointer-events-auto z-20" onClick={() => handleDPad(1)} aria-label="Siguiente semilla" />
          </div>
          <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-foreground -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
             <div className="w-2 h-2 rounded-full bg-white/10 mx-auto mt-2"></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-end gap-3">
          {!currentPlant && (
            <div className="text-[10px] font-black uppercase text-foreground bg-white/50 px-2 py-1 rounded-md border-2 border-foreground mb-1">
              {plantTypes.find(p => p.id === selectedSeed)?.name}
            </div>
          )}

          {!currentPlant && (
             <button 
               onClick={() => plantNewTree(selectedSeed)}
               className="bg-[#ef4444] border-2 border-foreground w-12 h-12 rounded-full font-black text-white text-xs hover:scale-95 transition-transform uppercase shadow-[inset_-2px_-4px_0_rgba(0,0,0,0.3),_2px_2px_0_#000]"
             >
               Start
             </button>
          )}
        </div>
      </div>
    </div>
  );
}
