import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { toast } from "sonner";
import { toLocalDateStr } from "@/lib/utils";
import { startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

export interface Plant {
  id: string;
  user_id: string;
  plant_type: string;
  island_id?: string | null;
  growth_percentage: number;
  is_alive: boolean;
  is_completed: boolean;
  planted_at: string;
  last_watered_at: string;
  completed_at: string | null;
  died_at: string | null;
  fertilizer_ends_at?: string | null;
  growth_multiplier?: number | null;
}

export interface StudyActivity {
  hasStudiedToday: boolean;
  hasStudiedThisWeek: boolean;
  daysSinceLastStudy: number;
  studyMinutesToday: number;
  studyMinutesThisWeek: number;
  totalStudyMinutesAllTime: number;
}

export type PlantDifficulty = "muy_facil" | "facil" | "normal" | "dificil" | "epico" | "legendario";

export interface PlantType {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rarity: "comun" | "raro" | "epico" | "legendario";
  level: number; // 1: Muy Fácil (20-30m), 2: Fácil (45-60m), 3: Normal (2-3h), 4: Difícil (4-6h), 5: Épico (8-10h), 6: Legendario (16-24h)
  levelLabel: string;
  difficulty: PlantDifficulty;
  difficultyLabel: string;
  requiredMinutes: number; // Minutos totales de estudio para llegar al 100%
  speedMultiplierDescription: string;
  color: string;
  accentColor: string;
  lore: string;
}

export { PLANT_TYPES } from "./forestPlantsData";
import { PLANT_TYPES } from "./forestPlantsData";
// Module-level cache for instantaneous navigation and zero-flicker UI
let _cachedPlants: Plant[] | null = null;
let _cachedCurrentPlant: Plant | null = null;
let _cachedStudyActivity: StudyActivity | null = null;
let _cachedForestUserId: string | null = null;

// Exactly 50 Mock plants for guest / demo mode history covering all innovative themes
export function getGuestMockPlants(): Plant[] {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
  const daysAgo = (d: number, hOffset = 0) =>
    new Date(now.getTime() - (d * 24 + hOffset) * 60 * 60 * 1000).toISOString();
  const monthsAgo = (m: number, dOffset = 0) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - Math.floor(m));
    d.setDate(d.getDate() - dOffset);
    return d.toISOString();
  };

  const speciesList = PLANT_TYPES.map((t) => t.id);
  const innovativeSpecies = [
    "soda",
    "soda-monster",
    "joystick",
    "joystick-arcade",
    "cupcake",
    "cupcake-fresa",
    "comic",
    "comic-pow",
    "tabe",
    "tabe-estudiante",
    "pizza",
    "pizza-burger",
    "coffee",
    "coffee-matcha",
  ];

  // Defined dead tree indices (representing abandoned pomodoros across timeline)
  const deadTreeIndices = new Set([6, 17, 29, 44]);

  const resolveIsland = (species: string, index: number): string => {
    if (species.includes("pizza") || species.includes("cupcake") || species.includes("burger")) return "pizza";
    if (species.includes("joystick") || species.includes("arcade") || species.includes("soda")) return "gaming";
    if (species.includes("coffee") || species.includes("comic") || species.includes("matcha")) return "study";
    if (species.includes("tabe") || species.includes("sakura")) return "cosmic";
    const fallbackIslands = ["classic", "pizza", "gaming", "study", "cosmic"];
    return fallbackIslands[index % fallbackIslands.length];
  };

  const plants: Plant[] = [
    // 1. Árbol activo en crecimiento (TABE con fertilizante x2)
    {
      id: "mock-active-1",
      user_id: "guest",
      plant_type: "tabe",
      island_id: "cosmic",
      growth_percentage: 72,
      is_alive: true,
      is_completed: false,
      planted_at: hoursAgo(5),
      last_watered_at: hoursAgo(1),
      completed_at: null,
      died_at: null,
      fertilizer_ends_at: new Date(now.getTime() + 18 * 60 * 60 * 1000).toISOString(),
      growth_multiplier: 2,
    },
    // 2 a 6: Completados hoy con temática innovadora (5 árboles)
    {
      id: "mock-today-2",
      user_id: "guest",
      plant_type: "cupcake-fresa",
      island_id: "pizza",
      growth_percentage: 100,
      is_alive: true,
      is_completed: true,
      planted_at: hoursAgo(9),
      last_watered_at: hoursAgo(2),
      completed_at: hoursAgo(2),
      died_at: null,
    },
    {
      id: "mock-today-3",
      user_id: "guest",
      plant_type: "soda-monster",
      island_id: "gaming",
      growth_percentage: 100,
      is_alive: true,
      is_completed: true,
      planted_at: hoursAgo(8),
      last_watered_at: hoursAgo(3),
      completed_at: hoursAgo(3),
      died_at: null,
    },
    {
      id: "mock-today-4",
      user_id: "guest",
      plant_type: "joystick-arcade",
      island_id: "gaming",
      growth_percentage: 100,
      is_alive: true,
      is_completed: true,
      planted_at: hoursAgo(7),
      last_watered_at: hoursAgo(4),
      completed_at: hoursAgo(4),
      died_at: null,
    },
    {
      id: "mock-today-5",
      user_id: "guest",
      plant_type: "comic-pow",
      island_id: "study",
      growth_percentage: 100,
      is_alive: true,
      is_completed: true,
      planted_at: hoursAgo(6),
      last_watered_at: hoursAgo(4.5),
      completed_at: hoursAgo(4.5),
      died_at: null,
    },
    {
      id: "mock-today-6",
      user_id: "guest",
      plant_type: "pizza-burger",
      island_id: "pizza",
      growth_percentage: 100,
      is_alive: true,
      is_completed: true,
      planted_at: hoursAgo(5.5),
      last_watered_at: hoursAgo(5),
      completed_at: hoursAgo(5),
      died_at: null,
    },
  ];

  // 7 a 24: Esta semana (días 1 a 6.8) - 18 árboles
  for (let i = 7; i <= 24; i++) {
    const dayOffset = 1 + ((i - 7) / 17) * 5.8;
    const isDead = deadTreeIndices.has(i);
    const sp = i % 2 === 0
      ? innovativeSpecies[(i / 2) % innovativeSpecies.length]
      : speciesList[(i * 3) % speciesList.length];

    plants.push({
      id: `mock-tree-${i}`,
      user_id: "guest",
      plant_type: sp,
      island_id: resolveIsland(sp, i),
      growth_percentage: isDead ? 35 + (i % 30) : 100,
      is_alive: !isDead,
      is_completed: !isDead,
      planted_at: daysAgo(dayOffset + (isDead ? 2 : 0.5)),
      last_watered_at: daysAgo(dayOffset),
      completed_at: isDead ? null : daysAgo(dayOffset),
      died_at: isDead ? daysAgo(dayOffset) : null,
    });
  }

  // 25 a 40: Este mes (días 7.5 a 29) - 16 árboles
  for (let i = 25; i <= 40; i++) {
    const dayOffset = 7.5 + ((i - 25) / 15) * 21.5;
    const isDead = deadTreeIndices.has(i);
    const sp = i % 2 === 0
      ? innovativeSpecies[(i * 5) % innovativeSpecies.length]
      : speciesList[(i * 7) % speciesList.length];

    plants.push({
      id: `mock-tree-${i}`,
      user_id: "guest",
      plant_type: sp,
      island_id: resolveIsland(sp, i),
      growth_percentage: isDead ? 20 + (i % 40) : 100,
      is_alive: !isDead,
      is_completed: !isDead,
      planted_at: daysAgo(dayOffset + (isDead ? 3 : 1)),
      last_watered_at: daysAgo(dayOffset),
      completed_at: isDead ? null : daysAgo(dayOffset),
      died_at: isDead ? daysAgo(dayOffset) : null,
    });
  }

  // 41 a 50: Este año (meses 1 a 11) - 10 árboles (Total = 50 árboles)
  for (let i = 41; i <= 50; i++) {
    const monthOffset = 1 + ((i - 41) / 9) * 10;
    const isDead = deadTreeIndices.has(i);
    const sp = i % 3 === 0
      ? innovativeSpecies[i % innovativeSpecies.length]
      : speciesList[(i * 11) % speciesList.length];

    plants.push({
      id: `mock-tree-${i}`,
      user_id: "guest",
      plant_type: sp,
      island_id: resolveIsland(sp, i),
      growth_percentage: isDead ? 15 + (i % 50) : 100,
      is_alive: !isDead,
      is_completed: !isDead,
      planted_at: monthsAgo(monthOffset + 0.5),
      last_watered_at: monthsAgo(monthOffset),
      completed_at: isDead ? null : monthsAgo(monthOffset),
      died_at: isDead ? monthsAgo(monthOffset) : null,
    });
  }

  return plants;
}

export function useForest() {
  const { user, isGuest } = useAuth();

  if (user && user.id !== _cachedForestUserId) {
    _cachedPlants = null;
    _cachedCurrentPlant = null;
    _cachedStudyActivity = null;
    _cachedForestUserId = user.id;
  }

  const [plants, setPlants] = useState<Plant[]>(() => {
    if (_cachedPlants && _cachedPlants.length === 50) return _cachedPlants;
    if (isGuest) {
      const mock = getGuestMockPlants();
      _cachedPlants = mock;
      _cachedCurrentPlant = mock.find(p => p.is_alive && !p.is_completed) || null;
      return mock;
    }
    return [];
  });

  const [currentPlant, setCurrentPlant] = useState<Plant | null>(() => {
    if (_cachedCurrentPlant && _cachedPlants && _cachedPlants.length === 50) return _cachedCurrentPlant;
    if (isGuest && _cachedPlants) {
      return _cachedPlants.find(p => p.is_alive && !p.is_completed) || null;
    }
    return null;
  });

  const [studyActivity, setStudyActivity] = useState<StudyActivity>(() => {
    if (_cachedStudyActivity) return _cachedStudyActivity;
    if (isGuest) {
      const mockActivity: StudyActivity = {
        hasStudiedToday: true,
        hasStudiedThisWeek: true,
        daysSinceLastStudy: 0,
        studyMinutesToday: 65,
        studyMinutesThisWeek: 480,
        totalStudyMinutesAllTime: 1250,
      };
      _cachedStudyActivity = mockActivity;
      return mockActivity;
    }
    return {
      hasStudiedToday: false,
      hasStudiedThisWeek: false,
      daysSinceLastStudy: 0,
      studyMinutesToday: 0,
      studyMinutesThisWeek: 0,
      totalStudyMinutesAllTime: 0,
    };
  });

  const [loading, setLoading] = useState(isGuest ? false : !_cachedPlants);
  const lastLocalUpdateRef = useRef<number>(0);
  const isPlantingRef = useRef<boolean>(false);
  const isWateringRef = useRef<boolean>(false);

  const fetchPlants = useCallback(async () => {
    if (!user && !isGuest) return;

    if (isGuest) {
      if (!_cachedPlants || _cachedPlants.length !== 50) {
        _cachedPlants = getGuestMockPlants();
      }
      const activeMock = _cachedPlants.find(p => p.is_alive && !p.is_completed) || null;
      _cachedCurrentPlant = activeMock;
      setPlants([..._cachedPlants]);
      setCurrentPlant(activeMock);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_plants")
        .select("id, user_id, plant_type, island_id, growth_percentage, is_alive, is_completed, planted_at, last_watered_at, completed_at, died_at, fertilizer_ends_at, growth_multiplier")
        .eq("user_id", user.id)
        .order("planted_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const typedData = data as Plant[];
      const active = typedData.find(p => p.is_alive && !p.is_completed) || null;
      _cachedPlants = typedData;
      _cachedCurrentPlant = active;
      setPlants(typedData);
      setCurrentPlant(active);
    } catch (error) {
      console.error("Error fetching plants:", error);
    }
  }, [user, isGuest]);

  const fetchStudyActivity = useCallback(async () => {
    if (!user && !isGuest) return;

    if (isGuest) {
      const mockActivity: StudyActivity = {
        hasStudiedToday: true,
        hasStudiedThisWeek: true,
        daysSinceLastStudy: 0,
        studyMinutesToday: 65,
        studyMinutesThisWeek: 340,
        totalStudyMinutesAllTime: 1250,
      };
      _cachedStudyActivity = mockActivity;
      setStudyActivity(mockActivity);
      return;
    }

    try {
      const now = new Date();
      const todayStr = toLocalDateStr(now);
      const weekStart = startOfWeek(now, { locale: es, weekStartsOn: 1 });
      const weekStartStr = toLocalDateStr(weekStart);

      // 1. Obtener sesiones desde el inicio de la semana actual (igual que Métricas)
      const { data: weekSessionsData, error: weekError } = await supabase
        .from("study_sessions")
        .select("fecha, duracion_segundos, created_at")
        .eq("user_id", user.id)
        .gte("fecha", weekStartStr)
        .order("created_at", { ascending: false });

      if (weekError) throw weekError;

      // Normalizar fecha (igual que en Metrics.tsx con split("T")[0])
      const normalizedWeekSessions = (weekSessionsData || []).map((s) => ({
        ...s,
        fecha: s.fecha ? s.fecha.split("T")[0] : "",
      }));

      const todaySessions = normalizedWeekSessions.filter((s) => s.fecha === todayStr);

      const studySecToday = todaySessions.reduce((acc, s) => acc + (s.duracion_segundos || 0), 0);
      const studySecThisWeek = normalizedWeekSessions.reduce((acc, s) => acc + (s.duracion_segundos || 0), 0);

      const studyMinutesToday = Math.floor(studySecToday / 60);
      const studyMinutesThisWeek = Math.floor(studySecThisWeek / 60);

      // 2. Obtener total histórico de estudio (igual que Métricas totalHours)
      const { data: allSessionsData } = await supabase
        .from("study_sessions")
        .select("duracion_segundos")
        .eq("user_id", user.id);

      const totalStudySecAllTime = (allSessionsData || []).reduce(
        (acc, s) => acc + (s.duracion_segundos || 0),
        0
      );
      const totalStudyMinutesAllTime = Math.floor(totalStudySecAllTime / 60);

      // 3. Calcular días desde el último estudio
      let daysSinceLastStudy = 999;
      if (normalizedWeekSessions.length > 0) {
        const lastStudyTimestamp = new Date(normalizedWeekSessions[0].created_at || normalizedWeekSessions[0].fecha);
        const diffTime = now.getTime() - lastStudyTimestamp.getTime();
        daysSinceLastStudy = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      } else {
        const { data: lastSession } = await supabase
          .from("study_sessions")
          .select("created_at, fecha")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastSession) {
          const lastStudyTimestamp = new Date(lastSession.created_at || lastSession.fecha);
          const diffTime = now.getTime() - lastStudyTimestamp.getTime();
          daysSinceLastStudy = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        }
      }

      // Al menos 1 segundo cuenta como estudio hoy/esta semana
      const hasStudiedToday = studyMinutesToday >= 1;
      const hasStudiedThisWeek = studyMinutesThisWeek >= 1;

      const updatedActivity: StudyActivity = {
        hasStudiedToday,
        hasStudiedThisWeek,
        daysSinceLastStudy,
        studyMinutesToday,
        studyMinutesThisWeek,
        totalStudyMinutesAllTime,
      };

      _cachedStudyActivity = updatedActivity;
      setStudyActivity(updatedActivity);
    } catch (error) {
      console.error("Error fetching study activity:", error);
    }
  }, [user, isGuest]);

  const isCheckingRef = useRef(false);

  const checkAndUpdatePlants = useCallback(async (targetPlant?: Plant | null) => {
    const plant = targetPlant || currentPlant;
    if (!user || !plant || isGuest || isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const now = new Date();
      const lastWateredDate = new Date(plant.last_watered_at);
      const msSinceWatered = now.getTime() - lastWateredDate.getTime();
      const daysSinceWatered = msSinceWatered / (1000 * 60 * 60 * 24);

      // Grace period: first 2 days after planting
      const plantedDate = new Date(plant.planted_at);
      const msSincePlanted = now.getTime() - plantedDate.getTime();
      const daysSincePlanted = msSincePlanted / (1000 * 60 * 60 * 24);
      const isInGracePeriod = daysSincePlanted < 2;

      // Kill plant if: not in grace AND no study in 7+ days (measured from last watered)
      if (!isInGracePeriod && daysSinceWatered >= 7 && plant.is_alive && !studyActivity.hasStudiedToday) {
        const diedAt = new Date().toISOString();
        const { error } = await supabase
          .from("user_plants")
          .update({
            is_alive: false,
            died_at: diedAt
          })
          .eq("id", plant.id);

        if (!error) {
          toast.error("¡Tu planta ha muerto! 😢 No estudiaste durante una semana.");
          setCurrentPlant(null);
          setPlants(prev => prev.map(p => p.id === plant.id ? { ...p, is_alive: false, died_at: diedAt } : p));
        }
        return;
      }

      // Crecimiento de la planta: se calcula ÚNICAMENTE con sesiones de estudio posteriores a la plantación
      if (plant.is_alive && !plant.is_completed) {
        // Consultar sesiones creadas estrictamente DESPUÉS del momento exacto de plantación (evita arrastrar tiempo previo)
        const { data: plantSessions, error } = await supabase
          .from("study_sessions")
          .select("duracion_segundos, created_at")
          .eq("user_id", user.id)
          .gte("created_at", plant.planted_at)
          .order("created_at", { ascending: true });

        if (error) throw error;

        let totalSecondsStudied = 0;
        (plantSessions || []).forEach(session => {
          totalSecondsStudied += (session.duracion_segundos || 0);
        });

        const totalMinutesStudied = totalSecondsStudied / 60;
        const plantTypeInfo = PLANT_TYPES.find(t => t.id === plant.plant_type) || PLANT_TYPES[0];
        const reqMinutes = plantTypeInfo.requiredMinutes || 120;
        const hasFertilizer = plant.fertilizer_ends_at && new Date(plant.fertilizer_ends_at) > now;
        const multiplier = hasFertilizer ? (plant.growth_multiplier || 2) : 1;

        const calculatedGrowth = totalMinutesStudied > 0
          ? Math.floor((totalMinutesStudied / reqMinutes) * 100 * multiplier)
          : 0;
        const newGrowthPercentage = Math.min(100, Math.max(plant.growth_percentage || 0, calculatedGrowth));

        // Solo actualizar si el porcentaje de crecimiento aumentó
        if (newGrowthPercentage > plant.growth_percentage) {
          const delta = newGrowthPercentage - plant.growth_percentage;
          const isCompleted = newGrowthPercentage >= 100;
          const nowIso = new Date().toISOString();

          const updateData: Record<string, unknown> = {
            growth_percentage: newGrowthPercentage,
            last_watered_at: nowIso,
          };

          if (isCompleted) {
            updateData.is_completed = true;
            updateData.completed_at = nowIso;
          }

          const { error: updateError } = await supabase
            .from("user_plants")
            .update(updateData)
            .eq("id", plant.id);

          if (!updateError) {
            lastLocalUpdateRef.current = Date.now();
            if (isCompleted) {
              toast.success("🎉 ¡Tu árbol ha crecido completamente! Puedes plantar uno nuevo.");
            } else if (delta >= 1) {
              toast.success(`🌱 ¡Tu planta creció ${delta}% (al ${newGrowthPercentage}%) con tu tiempo de estudio!`);
            }
            const updatedPlant = { ...plant, ...updateData } as Plant;
            setCurrentPlant(isCompleted ? null : updatedPlant);
            setPlants(prev => prev.map(p => p.id === plant.id ? updatedPlant : p));
          }
        } else if (studyActivity.hasStudiedToday) {
          // Actualizar last_watered_at una vez al día para reiniciar contador de marchitado
          const lastWatered = new Date(plant.last_watered_at);
          const lastWateredDay = toLocalDateStr(lastWatered);
          const todayStr = toLocalDateStr(now);

          if (lastWateredDay < todayStr) {
            const nowIso = new Date().toISOString();
            lastLocalUpdateRef.current = Date.now();
            await supabase
              .from("user_plants")
              .update({ last_watered_at: nowIso })
              .eq("id", plant.id);

            const updatedPlant = { ...plant, last_watered_at: nowIso } as Plant;
            setCurrentPlant(updatedPlant);
            setPlants(prev => prev.map(p => p.id === plant.id ? updatedPlant : p));
          }
        }
      }
    } catch (err) {
      console.error("Error calculating plant growth:", err);
    } finally {
      isCheckingRef.current = false;
    }
  }, [user, isGuest, studyActivity]);

  const plantNewTree = async (plantType: string = "oak", islandId: string = "classic") => {
    if (!user && !isGuest) return;
    if (isPlantingRef.current) return;

    // Check if there's already an active plant
    if (currentPlant && currentPlant.is_alive && !currentPlant.is_completed) {
      toast.error("Ya tienes una planta activa creciendo");
      return;
    }

    isPlantingRef.current = true;
    const nowIso = new Date().toISOString();
    const targetIsland = islandId || "classic";

    try {
      if (isGuest) {
        const newPlant: Plant = {
          id: `guest-${Date.now()}`,
          user_id: "guest",
          plant_type: plantType,
          island_id: targetIsland,
          growth_percentage: 0,
          is_alive: true,
          is_completed: false,
          planted_at: nowIso,
          last_watered_at: nowIso,
          completed_at: null,
          died_at: null,
        };
        const updated = [newPlant, ...plants];
        _cachedPlants = updated;
        _cachedCurrentPlant = newPlant;
        setPlants(updated);
        setCurrentPlant(newPlant);
        toast.success("🌱 ¡Nueva semilla plantada! Estudia para hacerla crecer.");
        return;
      }

      const { error } = await supabase
        .from("user_plants")
        .insert({
          user_id: user!.id,
          plant_type: plantType,
          island_id: targetIsland,
          growth_percentage: 0,
          is_alive: true,
          is_completed: false,
          planted_at: nowIso,
          last_watered_at: nowIso,
        });

      if (error) throw error;

      toast.success("🌱 ¡Nueva semilla plantada! Estudia para hacerla crecer.");
      fetchPlants();
    } catch (error) {
      console.error("Error planting tree:", error);
      toast.error("Error al plantar árbol");
    } finally {
      isPlantingRef.current = false;
    }
  };

  const deletePlant = async (plantId: string) => {
    if (!user && !isGuest) return;

    if (isGuest) {
      const updated = plants.filter((p) => p.id !== plantId);
      _cachedPlants = updated;
      setPlants(updated);
      if (currentPlant?.id === plantId) {
        _cachedCurrentPlant = null;
        setCurrentPlant(null);
      }
      toast.success("Planta eliminada de la isla");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_plants")
        .delete()
        .eq("id", plantId)
        .eq("user_id", user!.id);

      if (error) throw error;

      if (currentPlant?.id === plantId) {
        _cachedCurrentPlant = null;
        setCurrentPlant(null);
      }
      toast.success("Planta eliminada de la isla");
      fetchPlants();
    } catch (error) {
      console.error("Error removing plant:", error);
      toast.error("Error al eliminar planta");
    }
  };

  const removeDeadPlant = deletePlant;

  const abandonPlant = async (plantId: string) => {
    if (!user && !isGuest) return;

    const nowIso = new Date().toISOString();

    if (isGuest) {
      const deadCurrent = currentPlant?.id === plantId
        ? { ...currentPlant, is_alive: false, died_at: nowIso }
        : null;
      const updated = plants.map((p) =>
        p.id === plantId ? { ...p, is_alive: false, died_at: nowIso } : p
      );
      _cachedPlants = updated;
      if (deadCurrent) {
        _cachedCurrentPlant = deadCurrent;
        setCurrentPlant(deadCurrent);
      }
      setPlants(updated);
      toast.error("Has abandonado la planta. Se ha marchitado en tu jardín 🥀");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_plants")
        .update({
          is_alive: false,
          died_at: nowIso,
        })
        .eq("id", plantId)
        .eq("user_id", user!.id);

      if (error) throw error;

      if (currentPlant?.id === plantId) {
        const deadCurrent = { ...currentPlant, is_alive: false, died_at: nowIso };
        _cachedCurrentPlant = deadCurrent;
        setCurrentPlant(deadCurrent);
      }
      toast.error("Has abandonado la planta. Se ha marchitado en tu jardín 🥀");
      fetchPlants();
    } catch (error) {
      console.error("Error abandoning plant:", error);
      toast.error("Error al abandonar planta");
    }
  };

  const waterPlantWithStudy = async (minutes: number = 25) => {
    if (!currentPlant || !currentPlant.is_alive || currentPlant.is_completed) {
      toast.info("Planta una semilla primero para hacerla crecer con estudio");
      return;
    }
    if (isWateringRef.current) return;
    isWateringRef.current = true;

    try {
      const safeMinutes = Math.max(1, Math.round(minutes));
      const plantTypeInfo = PLANT_TYPES.find(t => t.id === currentPlant.plant_type) || PLANT_TYPES[0];
      const reqMinutes = plantTypeInfo.requiredMinutes || 120;

      const now = new Date();
      const hasFertilizer = currentPlant.fertilizer_ends_at && new Date(currentPlant.fertilizer_ends_at) > now;
      const multiplier = hasFertilizer ? (currentPlant.growth_multiplier || 2) : 1;

      // Growth is inversely proportional to requiredMinutes (higher difficulty = slower growth)
      const growthPercentFloat = (safeMinutes / reqMinutes) * 100 * multiplier;
      const growthToAdd = Math.max(1, Math.round(growthPercentFloat));
      const newGrowth = Math.min(100, currentPlant.growth_percentage + growthToAdd);
      const isCompleted = newGrowth >= 100;
      const nowIso = now.toISOString();

      if (isGuest) {
        const updated = {
          ...currentPlant,
          growth_percentage: newGrowth,
          is_completed: isCompleted,
          completed_at: isCompleted ? nowIso : null,
          last_watered_at: nowIso,
        };
        setPlants(prev => prev.map(p => p.id === currentPlant.id ? updated : p));
        setCurrentPlant(isCompleted ? null : updated);
        setStudyActivity(prev => ({
          ...prev,
          hasStudiedToday: true,
          hasStudiedThisWeek: true,
          studyMinutesToday: prev.studyMinutesToday + safeMinutes,
          studyMinutesThisWeek: prev.studyMinutesThisWeek + safeMinutes,
          daysSinceLastStudy: 0,
        }));
        if (isCompleted) {
          toast.success(`🎉 ¡Tu ${plantTypeInfo.name} ha alcanzado su máximo esplendor! Se ha sumado a tu Bosque.`);
        } else {
          toast.success(
            `🌱 +${growthToAdd}% (${plantTypeInfo.difficultyLabel}) con ${safeMinutes} min de estudio${hasFertilizer ? " (¡Bonus x2 Fertilizante!)" : ""}`
          );
        }
        return;
      }

      if (!user) return;

      lastLocalUpdateRef.current = Date.now();

      // 1. Registrar sesión de estudio real (igual que Pomodoro y Métricas)
      const totalSeconds = safeMinutes * 60;
      await supabase.from("study_sessions").insert({
        user_id: user.id,
        duracion_segundos: totalSeconds,
        fecha: toLocalDateStr(new Date()),
        tipo: "pomodoro",
        completada: true,
      });

      // Actualizar stats de usuario (XP, horas, créditos)
      const hours = Math.floor(totalSeconds / 3600);
      const xpGained = Math.floor(totalSeconds / 60) * 2;
      const { data: stats } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (stats) {
        const currentStats = stats as any;
        await supabase
          .from("user_stats")
          .update({
            horas_estudio_total: (currentStats.horas_estudio_total || 0) + hours,
            xp_total: (currentStats.xp_total || 0) + xpGained,
            credits: (currentStats.credits || 0) + Math.floor(totalSeconds / 60),
            nivel: Math.floor(((currentStats.xp_total || 0) + xpGained) / 100) + 1,
          })
          .eq("user_id", user.id);

        await supabase.rpc("check_and_unlock_achievements", { p_user_id: user.id });
      }

      // 2. Update plant
      const updateData: Record<string, unknown> = {
        growth_percentage: newGrowth,
        last_watered_at: nowIso,
      };
      if (isCompleted) {
        updateData.is_completed = true;
        updateData.completed_at = nowIso;
      }

      await supabase.from("user_plants").update(updateData).eq("id", currentPlant.id);

      const updated = { ...currentPlant, ...updateData } as Plant;
      setCurrentPlant(isCompleted ? null : updated);
      setPlants(prev => prev.map(p => p.id === currentPlant.id ? updated : p));

      if (isCompleted) {
        toast.success(`🎉 ¡Tu ${plantTypeInfo.name} ha crecido completamente y se sumó a tu bosque!`);
      } else {
        toast.success(
          `🌱 +${growthToAdd}% (${plantTypeInfo.difficultyLabel}) con ${safeMinutes} min de estudio${hasFertilizer ? " (¡Bonus x2 Fertilizante!)" : ""}`
        );
      }

      fetchStudyActivity();
    } catch (err) {
      console.error("Error watering plant:", err);
      toast.error("Error al registrar estudio");
    } finally {
      isWateringRef.current = false;
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (!_cachedPlants) setLoading(true);
      
      const timeoutId = setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 8000);

      try {
        await Promise.all([fetchPlants(), fetchStudyActivity()]);
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [fetchPlants, fetchStudyActivity]);

  // Verificar y actualizar crecimiento de la planta activa cuando esté cargada
  useEffect(() => {
    if (!loading && currentPlant && currentPlant.is_alive && !currentPlant.is_completed) {
      checkAndUpdatePlants(currentPlant);
    }
  }, [loading, currentPlant?.id, checkAndUpdatePlants]);

  const plantsDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedFetchPlants = useCallback(() => {
    // Ignore realtime event if triggered by our own local update
    if (isCheckingRef.current || Date.now() - lastLocalUpdateRef.current < 2500) return;
    if (plantsDebounceTimer.current) clearTimeout(plantsDebounceTimer.current);
    plantsDebounceTimer.current = setTimeout(() => {
      fetchPlants();
    }, 500);
  }, [fetchPlants]);

  const studyDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedFetchStudyActivity = useCallback(() => {
    if (Date.now() - lastLocalUpdateRef.current < 2500) return;
    if (studyDebounceTimer.current) clearTimeout(studyDebounceTimer.current);
    studyDebounceTimer.current = setTimeout(() => {
      fetchStudyActivity();
      checkAndUpdatePlants();
    }, 500);
  }, [fetchStudyActivity, checkAndUpdatePlants]);

  // Realtime subscription for plants
  useRealtimeSubscription({
    table: "user_plants",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: debouncedFetchPlants,
    enabled: !!user,
  });

  // Realtime subscription for study sessions
  useRealtimeSubscription({
    table: "study_sessions",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: debouncedFetchStudyActivity,
    enabled: !!user,
  });

  // Forest statistics
  const forestStats = {
    totalTrees: plants.filter(p => p.is_completed).length,
    deadPlants: plants.filter(p => !p.is_alive).length,
    currentGrowth: currentPlant?.growth_percentage || 0,
    hasActivePlant: !!currentPlant && currentPlant.is_alive && !currentPlant.is_completed,
  };

  return {
    plants,
    currentPlant,
    studyActivity,
    forestStats,
    loading,
    plantNewTree,
    deletePlant,
    removeDeadPlant,
    abandonPlant,
    waterPlantWithStudy,
    plantTypes: PLANT_TYPES,
    refetch: fetchPlants,
  };
}
