import { useForest } from "@/hooks/useForest";
import { TreePine, Droplet, Sprout, Leaf, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export function ForestWidget() {
  const { currentPlant, plantNewTree, plantTypes, loading, studyActivity } = useForest();
  const [selectedSeed, setSelectedSeed] = useState("oak");
  const [isHovered, setIsHovered] = useState(false);

  if (loading) {
    return <Skeleton className="w-full h-48 rounded-xl" />;
  }

  const plantInfo = currentPlant ? plantTypes.find(p => p.id === currentPlant.plant_type) : null;
  const isGrowing = currentPlant && studyActivity.hasStudiedToday;

  return (
    <div 
      className="card-gamer rounded-xl overflow-hidden relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent z-0 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TreePine className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="font-display font-semibold text-lg">Tu Bosque</h3>
          </div>
          {currentPlant && isGrowing && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full animate-pulse cursor-default">
              <Droplet className="w-3 h-3" /> Regado hoy
            </span>
          )}
        </div>

        {!currentPlant ? (
          <div className="flex flex-col items-center justify-center flex-1 space-y-4 py-2">
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center border border-dashed border-muted-foreground/50">
              <Sprout className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Planta una nueva semilla</p>
              <p className="text-xs text-muted-foreground">Estudia para hacerla crecer día a día.</p>
            </div>
            <div className="flex items-center gap-2 w-full mt-2">
              <Select value={selectedSeed} onValueChange={setSelectedSeed}>
                <SelectTrigger className="w-[120px] h-9 text-xs">
                  <SelectValue placeholder="Semilla" />
                </SelectTrigger>
                <SelectContent>
                  {plantTypes.map(pt => (
                    <SelectItem key={pt.id} value={pt.id} className="text-xs">
                      {pt.emoji} {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={() => plantNewTree(selectedSeed)}
                size="sm" 
                className="flex-1 h-9 gap-1 bg-green-600 hover:bg-green-500 text-white"
              >
                <Leaf className="w-4 h-4" /> Plantar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 justify-between">
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "text-5xl transition-transform duration-500 select-none",
                  isHovered ? "scale-110 -rotate-3" : "scale-100",
                  "drop-shadow-[0_0_15px_rgba(74,222,128,0.2)]"
                )}>
                  {plantInfo?.emoji || "🌱"}
                </div>
                <div>
                  <h4 className="font-semibold text-base">{plantInfo?.name || "Planta Mágica"}</h4>
                  <p className="text-xs text-muted-foreground">Progreso de crecimiento</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-display text-green-400">
                  {Math.floor(currentPlant.growth_percentage)}%
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-[10px] text-muted-foreground px-1 font-medium uppercase tracking-wider">
                <span>Semilla</span>
                <span>Árbol</span>
              </div>
              <div className="relative h-2.5 bg-secondary rounded-full overflow-hidden border border-white/5">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-600 to-emerald-400 transition-all duration-1000 ease-out rounded-full"
                  style={{ width: `${currentPlant.growth_percentage}%` }}
                >
                  <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-white/20 to-transparent" />
                </div>
              </div>
              
              {!studyActivity.hasStudiedToday && (
                <p className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5 bg-secondary/30 p-2 rounded-md">
                  <Target className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                  Haz una sesión de Pomodoro hoy para regar tu planta y sumar progreso.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Temporary icon fallback until imported
function Target(props: any) {
  return <Award {...props} />;
}
