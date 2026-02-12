import { useState } from "react";
import {
  TreeDeciduous,
  Sprout,
  Leaf,
  Sun,
  Droplets,
  Clock,
  Skull,
  Plus,
  Trash2,
  Calendar,
  TrendingUp,
  Loader2,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForest, Plant } from "@/hooks/useForest";
import { cn } from "@/lib/utils";

// Plant growth stages with visual representation
const getPlantStage = (growth: number, isAlive: boolean, plantType: string) => {
  if (!isAlive) {
    return { icon: <Skull className="w-full h-full text-muted-foreground/50" />, label: "Muerta", color: "text-muted-foreground" };
  }

  if (growth < 10) {
    return {
      icon: <Sprout className="w-full h-full text-amber-500" />,
      label: "Semilla",
      color: "text-amber-500"
    };
  } else if (growth < 30) {
    return {
      icon: <Sprout className="w-full h-full text-green-400" />,
      label: "Brote",
      color: "text-green-400"
    };
  } else if (growth < 50) {
    return {
      icon: <Sprout className="w-full h-full text-green-500 scale-125" />,
      label: "Plántula",
      color: "text-green-500"
    };
  } else if (growth < 70) {
    return {
      icon: <TreeDeciduous className="w-full h-full text-green-600 scale-75" />,
      label: "Arbusto",
      color: "text-green-600"
    };
  } else if (growth < 90) {
    return {
      icon: <TreeDeciduous className="w-full h-full text-emerald-500" />,
      label: "Árbol joven",
      color: "text-emerald-500"
    };
  } else {
    // Full grown tree based on type
    const treeIcons: Record<string, any> = {
      oak: TreeDeciduous,
      cherry: Flower2, // Was cherry blossom
      pine: TreePine,
      palm: Palmtree,
      maple: Leaf, // Maple leaf representation
    };

    const PlantIcon = treeIcons[plantType] || TreeDeciduous;

    return {
      icon: <PlantIcon className="w-full h-full text-neon-gold animate-pulse-slow" />,
      label: "Árbol completo",
      color: "text-neon-gold"
    };
  }
};

function PlantCard({ plant, onRemove }: { plant: Plant; onRemove?: () => void }) {
  const stage = getPlantStage(plant.growth_percentage, plant.is_alive, plant.plant_type);
  const plantedDate = new Date(plant.planted_at).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <Card className={cn(
      "card-gamer relative overflow-hidden transition-all duration-300",
      !plant.is_alive && "opacity-60 grayscale",
      plant.is_completed && "ring-2 ring-neon-gold/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10">{stage.icon}</div>
          {!plant.is_alive && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {plant.is_completed && (
            <Badge className="bg-neon-gold/20 text-neon-gold border-neon-gold/30">
              ✨ Completo
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={cn("text-sm font-medium", stage.color)}>
              {stage.label}
            </span>
            <span className="text-sm text-muted-foreground">
              {plant.growth_percentage}%
            </span>
          </div>

          <Progress value={plant.growth_percentage} className="h-2" />

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Plantado: {plantedDate}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CurrentPlantDisplay({ plant, studyActivity }: {
  plant: Plant | null;
  studyActivity: ReturnType<typeof useForest>['studyActivity'];
}) {
  if (!plant) {
    return (
      <div className="text-center py-12">
        <Sprout className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No tienes ninguna planta activa</p>
        <p className="text-sm text-muted-foreground mt-1">
          ¡Planta una semilla para comenzar!
        </p>
      </div>
    );
  }

  const stage = getPlantStage(plant.growth_percentage, plant.is_alive, plant.plant_type);
  const plantedDate = new Date(plant.planted_at);
  const now = new Date();
  const msSincePlanted = now.getTime() - plantedDate.getTime();
  const daysSincePlanted = msSincePlanted / (1000 * 60 * 60 * 24);
  const daysAlive = Math.floor(daysSincePlanted);

  // Calculate time until death: grace period (7 days) OR 7 days since last study
  const gracePeriodDays = 7;
  const daysUntilVulnerable = Math.max(0, gracePeriodDays - daysSincePlanted);
  const daysUntilDeath = daysUntilVulnerable > 0
    ? daysUntilVulnerable // Still in grace period
    : Math.max(0, gracePeriodDays - studyActivity.daysSinceLastStudy); // After grace, based on study

  const hoursUntilDeath = Math.floor((daysUntilDeath % 1) * 24);
  const fullDaysUntilDeath = Math.floor(daysUntilDeath);
  const isInGracePeriod = daysUntilVulnerable > 0;

  return (
    <div className="text-center space-y-6">
      {/* Main plant visualization */}
      <div className="relative">
        <div className={cn(
          "w-32 h-32 md:w-48 md:h-48 mx-auto transition-all duration-500",
          plant.is_alive ? "animate-pulse" : "grayscale opacity-50"
        )}>
          {stage.icon}
        </div>

        {plant.is_alive && studyActivity.hasStudiedToday && (
          <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
            ✨
          </div>
        )}
      </div>

      {/* Status */}
      <div>
        <h3 className={cn("text-xl font-display font-bold", stage.color)}>
          {stage.label}
        </h3>
        <p className="text-muted-foreground text-sm">
          {daysAlive === 0 ? "Plantada hoy" : `${daysAlive} días creciendo`}
        </p>
      </div>

      {/* Progress */}
      <div className="max-w-xs mx-auto space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Crecimiento</span>
          <span className={cn("font-bold", stage.color)}>
            {plant.growth_percentage}%
          </span>
        </div>
        <div className="h-4 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-emerald-500 to-neon-gold transition-all duration-1000"
            style={{ width: `${plant.growth_percentage}%` }}
          />
        </div>
      </div>

      {/* Alerts */}
      {!plant.is_alive && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive">
            <Skull className="w-5 h-5" />
            <span className="font-medium">Tu planta ha muerto</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            No estudiaste durante una semana
          </p>
        </div>
      )}

      {/* Death countdown timer */}
      {plant.is_alive && !plant.is_completed && (
        <div className={cn(
          "rounded-lg p-4 border",
          isInGracePeriod
            ? "bg-cyan-500/10 border-cyan-500/30"
            : daysUntilDeath <= 2
              ? "bg-destructive/10 border-destructive/30"
              : daysUntilDeath <= 4
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-green-500/10 border-green-500/30"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className={cn(
                "w-5 h-5",
                isInGracePeriod
                  ? "text-cyan-500"
                  : daysUntilDeath <= 2
                    ? "text-destructive"
                    : daysUntilDeath <= 4
                      ? "text-amber-500"
                      : "text-green-500"
              )} />
              <span className="font-medium">
                {isInGracePeriod ? "Período de gracia" : "Tiempo de vida"}
              </span>
            </div>
            <div className={cn(
              "text-lg font-bold",
              isInGracePeriod
                ? "text-cyan-500"
                : daysUntilDeath <= 2
                  ? "text-destructive"
                  : daysUntilDeath <= 4
                    ? "text-amber-500"
                    : "text-green-500"
            )}>
              {fullDaysUntilDeath}d {hoursUntilDeath}h
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {isInGracePeriod
              ? "Tu planta está protegida. Después de 7 días, debes estudiar regularmente."
              : studyActivity.hasStudiedToday
                ? "¡Bien! Estudiaste hoy, tu planta está creciendo."
                : "Estudia para reiniciar el contador y hacer crecer tu planta."
            }
          </p>
        </div>
      )}
    </div>
  );
}

export default function Forest() {
  const {
    plants,
    currentPlant,
    studyActivity,
    forestStats,
    loading,
    plantNewTree,
    removeDeadPlant,
    abandonPlant,
    plantTypes
  } = useForest();

  const [selectedPlantType, setSelectedPlantType] = useState("oak");
  const [isPlantDialogOpen, setIsPlantDialogOpen] = useState(false);

  const completedTrees = plants.filter(p => p.is_completed);
  const deadPlants = plants.filter(p => !p.is_alive);

  const handlePlantTree = () => {
    plantNewTree(selectedPlantType);
    setIsPlantDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando tu bosque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text">
            Mi Bosque de Estudio 🌲
          </h1>
          <p className="text-muted-foreground mt-1">
            Cultiva tu bosque estudiando cada día
          </p>
        </div>

        <Dialog open={isPlantDialogOpen} onOpenChange={setIsPlantDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2"
              disabled={forestStats.hasActivePlant}
            >
              <Plus className="w-4 h-4" />
              Plantar Semilla
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Elige tu planta</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {plantTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedPlantType(type.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all",
                    selectedPlantType === type.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-3xl block mb-2">{type.emoji}</span>
                  <span className="text-sm font-medium">{type.name}</span>
                </button>
              ))}
            </div>
            <Button onClick={handlePlantTree} className="w-full mt-4">
              🌱 Plantar
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-gamer">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TreeDeciduous className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{forestStats.totalTrees}</p>
                <p className="text-xs text-muted-foreground">Árboles completos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-gamer">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{forestStats.currentGrowth}%</p>
                <p className="text-xs text-muted-foreground">Crecimiento actual</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-gamer">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Clock className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{studyActivity.studyMinutesThisWeek}m</p>
                <p className="text-xs text-muted-foreground">Estudio esta semana</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-gamer">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sun className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{studyActivity.studyMinutesToday}m</p>
                <p className="text-xs text-muted-foreground">Estudio hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Current Plant */}
        <Card className="lg:col-span-2 card-gamer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-500" />
              Planta Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CurrentPlantDisplay
              plant={currentPlant}
              studyActivity={studyActivity}
            />

            {!currentPlant && (
              <div className="mt-4 flex justify-center">
                <Button
                  onClick={() => setIsPlantDialogOpen(true)}
                  className="gap-2"
                >
                  <Sprout className="w-4 h-4" />
                  Plantar mi primera semilla
                </Button>
              </div>
            )}

            {currentPlant && !currentPlant.is_alive && (
              <div className="mt-4 flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => removeDeadPlant(currentPlant.id)}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </Button>
                <Button
                  onClick={() => {
                    removeDeadPlant(currentPlant.id);
                    setIsPlantDialogOpen(true);
                  }}
                  className="gap-2"
                >
                  <Sprout className="w-4 h-4" />
                  Plantar nueva
                </Button>
              </div>
            )}

            {currentPlant?.is_completed && (
              <div className="mt-4 flex justify-center">
                <Button
                  onClick={() => setIsPlantDialogOpen(true)}
                  className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  <Plus className="w-4 h-4" />
                  Plantar nuevo árbol
                </Button>
              </div>
            )}

            {currentPlant && currentPlant.is_alive && !currentPlant.is_completed && (
              <div className="mt-6 flex justify-center">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="w-4 h-4" />
                      Abandonar planta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Abandonar tu planta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Tu planta morirá y no podrás recuperarla.
                        Tendrás que plantar una nueva semilla.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => abandonPlant(currentPlant.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Sí, abandonar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Study Tips */}
        <Card className="card-gamer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-500" />
              Cómo Crecer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <span className="text-lg">🌱</span>
                <div>
                  <p className="font-medium">Estudia cada día</p>
                  <p className="text-muted-foreground text-xs">
                    Tu planta crece 5-15% por día según cuánto estudies
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <span className="text-lg">⏰</span>
                <div>
                  <p className="font-medium">Usa el Pomodoro</p>
                  <p className="text-muted-foreground text-xs">
                    +1% extra por cada 30 min de estudio
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-medium">No abandones</p>
                  <p className="text-muted-foreground text-xs">
                    7 días sin estudiar = planta muerta
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <span className="text-lg">🏆</span>
                <div>
                  <p className="font-medium">Completa tu bosque</p>
                  <p className="text-muted-foreground text-xs">
                    Cada árbol al 100% se suma a tu bosque
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completed Forest */}
      {completedTrees.length > 0 && (
        <Card className="card-gamer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TreeDeciduous className="w-5 h-5 text-green-500" />
              Mi Bosque ({completedTrees.length} árboles)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {completedTrees.map((tree) => (
                <PlantCard key={tree.id} plant={tree} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dead Plants Cemetery */}
      {deadPlants.length > 0 && (
        <Card className="card-gamer opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Skull className="w-5 h-5" />
              Cementerio ({deadPlants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {deadPlants.map((plant) => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  onRemove={() => removeDeadPlant(plant.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
