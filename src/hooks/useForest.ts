import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { toast } from "sonner";
import { toLocalDateStr } from "@/lib/utils";

export interface Plant {
  id: string;
  user_id: string;
  plant_type: string;
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

interface StudyActivity {
  hasStudiedToday: boolean;
  hasStudiedThisWeek: boolean;
  daysSinceLastStudy: number;
  studyMinutesToday: number;
  studyMinutesThisWeek: number;
}

const PLANT_TYPES = [
  { id: 'oak', name: 'Roble', emoji: '🌳' },
  { id: 'cherry', name: 'Cerezo', emoji: '🌸' },
  { id: 'pine', name: 'Pino', emoji: '🌲' },
  { id: 'palm', name: 'Palmera', emoji: '🌴' },
  { id: 'maple', name: 'Arce', emoji: '🍁' },
];

export function useForest() {
  const { user, isGuest } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [currentPlant, setCurrentPlant] = useState<Plant | null>(null);
  const [studyActivity, setStudyActivity] = useState<StudyActivity>({
    hasStudiedToday: false,
    hasStudiedThisWeek: false,
    daysSinceLastStudy: 0,
    studyMinutesToday: 0,
    studyMinutesThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchPlants = useCallback(async () => {
    if (!user && !isGuest) return;

    if (isGuest) {
      const now = new Date();
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
      const daysAgo2 = new Date(now); daysAgo2.setDate(now.getDate() - 2);
      const daysAgo5 = new Date(now); daysAgo5.setDate(now.getDate() - 5);
      const daysAgo10 = new Date(now); daysAgo10.setDate(now.getDate() - 10);
      const daysAgo20 = new Date(now); daysAgo20.setDate(now.getDate() - 20);

      const mockPlants: Plant[] = [
        { id: "mock-1", user_id: "guest", plant_type: "oak", growth_percentage: 100, is_alive: true, is_completed: true, planted_at: daysAgo20.toISOString(), last_watered_at: daysAgo10.toISOString(), completed_at: daysAgo10.toISOString(), died_at: null },
        { id: "mock-2", user_id: "guest", plant_type: "cherry", growth_percentage: 100, is_alive: true, is_completed: true, planted_at: daysAgo10.toISOString(), last_watered_at: daysAgo5.toISOString(), completed_at: daysAgo5.toISOString(), died_at: null },
        { id: "mock-3", user_id: "guest", plant_type: "pine", growth_percentage: 100, is_alive: true, is_completed: true, planted_at: daysAgo10.toISOString(), last_watered_at: daysAgo2.toISOString(), completed_at: daysAgo2.toISOString(), died_at: null },
        // Static active plant: last_watered_at always = now so it never dies or grows in guest mode
        { id: "mock-4", user_id: "guest", plant_type: "maple", growth_percentage: 65, is_alive: true, is_completed: false, planted_at: daysAgo5.toISOString(), last_watered_at: now.toISOString(), completed_at: null, died_at: null },
      ];
      setPlants(mockPlants);
      setCurrentPlant(mockPlants.find(p => p.is_alive && !p.is_completed) || null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_plants")
        .select("*")
        .eq("user_id", user.id)
        .order("planted_at", { ascending: false });

      if (error) throw error;

      const typedData = data as Plant[];
      setPlants(typedData);

      // Find current active plant (alive and not completed)
      const active = typedData.find(p => p.is_alive && !p.is_completed);
      setCurrentPlant(active || null);
    } catch (error) {
      console.error("Error fetching plants:", error);
    }
  }, [user]);

  const fetchStudyActivity = useCallback(async () => {
    if (!user) return;

    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Fetch study sessions from the last 7 days for totals
      const { data: sessions, error } = await supabase
        .from("study_sessions")
        .select("fecha, duracion_segundos, created_at")
        .eq("user_id", user.id)
        .gte("fecha", weekAgo.toISOString().split('T')[0])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const todayStr = toLocalDateStr(today);
      const todaySessions = sessions?.filter(s => {
          if (!s.fecha) return false;
          // Compare fecha string directly - avoid new Date(dateString) UTC parsing bug
          return s.fecha === todayStr;
      }) || [];
      const weekSessions = sessions || [];

      const studySecToday = todaySessions.reduce((acc, s) => acc + (s.duracion_segundos || 0), 0);
      const studySecThisWeek = weekSessions.reduce((acc, s) => acc + (s.duracion_segundos || 0), 0);

      const studyMinutesToday = Math.floor(studySecToday / 60);
      const studyMinutesThisWeek = Math.floor(studySecThisWeek / 60);

      // BUG FIX: query the MOST RECENT session of all time (not just last 7 days)
      // to accurately calculate daysSinceLastStudy even after 7+ days of inactivity
      let daysSinceLastStudy = 999; // default = never studied
      if (weekSessions.length > 0) {
        // Has session in the last 7 days — use the most recent one
        const lastStudyTimestamp = new Date(weekSessions[0].created_at);
        const diffTime = now.getTime() - lastStudyTimestamp.getTime();
        daysSinceLastStudy = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } else {
        // No session in last 7 days — query for the most recent session ever
        const { data: lastSession } = await supabase
          .from("study_sessions")
          .select("created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastSession) {
          const lastStudyTimestamp = new Date(lastSession.created_at);
          const diffTime = now.getTime() - lastStudyTimestamp.getTime();
          daysSinceLastStudy = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
        // If lastSession is null → user never studied → daysSinceLastStudy stays 999
      }

      // Require at least 5 minutes of study to count as "watered today" (avoids 1s clicks inflating status)
      const hasStudiedToday = studyMinutesToday >= 5;
      const hasStudiedThisWeek = studyMinutesThisWeek >= 5;

      setStudyActivity({
        hasStudiedToday,
        hasStudiedThisWeek,
        daysSinceLastStudy,
        studyMinutesToday,
        studyMinutesThisWeek,
      });
    } catch (error) {
      console.error("Error fetching study activity:", error);
    }
  }, [user]);

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

      // Plant growth based strictly on study sessions conducted AFTER this plant was planted
      if (plant.is_alive && !plant.is_completed) {
        const { data: plantSessions, error } = await supabase
          .from("study_sessions")
          .select("fecha, duracion_segundos, created_at")
          .eq("user_id", user.id)
          .gte("created_at", plant.planted_at)
          .order("created_at", { ascending: true });

        if (error) throw error;

        const dailyMinutesMap: Record<string, number> = {};
        (plantSessions || []).forEach(session => {
          const sec = session.duracion_segundos || 0;
          if (sec < 60) return;
          const day = session.fecha || session.created_at?.split("T")[0] || "unknown";
          dailyMinutesMap[day] = (dailyMinutesMap[day] || 0) + (sec / 60);
        });

        const hasFertilizer = plant.fertilizer_ends_at && new Date(plant.fertilizer_ends_at) > now;
        const multiplier = hasFertilizer ? (plant.growth_multiplier || 2) : 1;
        const dailyMaxGrowth = hasFertilizer ? 20 : 15;

        let totalCalculatedGrowth = 0;
        Object.values(dailyMinutesMap).forEach(minutesInDay => {
          const earnedInDay = Math.min(dailyMaxGrowth, (minutesInDay / 5) * multiplier);
          totalCalculatedGrowth += earnedInDay;
        });

        const newGrowthPercentage = Math.min(100, Math.floor(totalCalculatedGrowth));

        // Only update if growth actually increased
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
            if (isCompleted) {
              toast.success("🎉 ¡Tu árbol ha crecido completamente! Puedes plantar uno nuevo.");
            } else if (delta >= 1) {
              toast.success(`🌱 ¡Tu planta creció ${delta}% con tu sesión de estudio!`);
            }
            const updatedPlant = { ...plant, ...updateData } as Plant;
            setCurrentPlant(isCompleted ? null : updatedPlant);
            setPlants(prev => prev.map(p => p.id === plant.id ? updatedPlant : p));
          }
        } else if (studyActivity.hasStudiedToday) {
          // Update last_watered_at once per day to reset death counter
          const lastWatered = new Date(plant.last_watered_at);
          const lastWateredDay = new Date(lastWatered.getFullYear(), lastWatered.getMonth(), lastWatered.getDate());
          const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          if (lastWateredDay.getTime() < todayDate.getTime()) {
            const nowIso = new Date().toISOString();
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
  }, [user, currentPlant, isGuest, studyActivity]);

  const plantNewTree = async (plantType: string = 'oak') => {
    if (!user) return;

    // Check if there's already an active plant
    if (currentPlant && currentPlant.is_alive && !currentPlant.is_completed) {
      toast.error("Ya tienes una planta activa creciendo");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_plants")
        .insert({
          user_id: user.id,
          plant_type: plantType,
          growth_percentage: 0,
          is_alive: true,
          is_completed: false,
        });

      if (error) throw error;

      toast.success("🌱 ¡Nueva semilla plantada! Estudia para hacerla crecer.");
      fetchPlants();
    } catch (error) {
      console.error("Error planting tree:", error);
      toast.error("Error al plantar árbol");
    }
  };

  const removeDeadPlant = async (plantId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_plants")
        .delete()
        .eq("id", plantId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Planta eliminada del jardín");
      fetchPlants();
    } catch (error) {
      console.error("Error removing plant:", error);
      toast.error("Error al eliminar planta");
    }
  };

  const abandonPlant = async (plantId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_plants")
        .update({
          is_alive: false,
          died_at: new Date().toISOString()
        })
        .eq("id", plantId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Planta abandonada 😢");
      fetchPlants();
    } catch (error) {
      console.error("Error abandoning plant:", error);
      toast.error("Error al abandonar planta");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // SAFETY TIMEOUT: Ensure loading is cleared even if Supabase hangs
      const timeoutId = setTimeout(() => {
        setLoading(current => {
          if (current) {
            console.warn("Forest data load timed out, forcing loading to false");
            return false;
          }
          return current;
        });
      }, 8000);

      try {
        await Promise.all([fetchPlants(), fetchStudyActivity()]);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };
    loadData();
  }, [fetchPlants, fetchStudyActivity]);

  // Run growth check strictly ONCE after initial data loads
  const hasRunInitialCheckRef = useRef(false);
  useEffect(() => {
    if (!loading && currentPlant && !hasRunInitialCheckRef.current) {
      hasRunInitialCheckRef.current = true;
      checkAndUpdatePlants(currentPlant);
    }
  }, [loading, currentPlant, checkAndUpdatePlants]);

  const plantsDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedFetchPlants = useCallback(() => {
    if (isCheckingRef.current) return;
    if (plantsDebounceTimer.current) clearTimeout(plantsDebounceTimer.current);
    plantsDebounceTimer.current = setTimeout(() => {
      fetchPlants();
    }, 500);
  }, [fetchPlants]);

  const studyDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedFetchStudyActivity = useCallback(() => {
    if (studyDebounceTimer.current) clearTimeout(studyDebounceTimer.current);
    studyDebounceTimer.current = setTimeout(() => {
      fetchStudyActivity();
    }, 500);
  }, [fetchStudyActivity]);

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
    removeDeadPlant,
    abandonPlant,
    plantTypes: PLANT_TYPES,
    refetch: fetchPlants,
  };
}
