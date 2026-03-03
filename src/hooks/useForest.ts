import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { toast } from "sonner";

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

      const todayStr = today.toISOString().split('T')[0];
      const todaySessions = sessions?.filter(s => s.fecha === todayStr) || [];
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

      const hasStudiedToday = studySecToday > 0;
      const hasStudiedThisWeek = studySecThisWeek > 0;

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

  const checkAndUpdatePlants = useCallback(async () => {
    if (!user || !currentPlant) return;

    // BUG FIX: use last_watered_at (not planted_at) to measure actual inactivity duration
    // planted_at is when the plant was created — but the relevant metric is "when did the user last water it?"
    const lastWateredDate = new Date(currentPlant.last_watered_at);
    const msSinceWatered = now.getTime() - lastWateredDate.getTime();
    const daysSinceWatered = msSinceWatered / (1000 * 60 * 60 * 24);

    // Grace period: first 2 days after planting (based on planted_at)
    const plantedDate = new Date(currentPlant.planted_at);
    const msSincePlanted = now.getTime() - plantedDate.getTime();
    const daysSincePlanted = msSincePlanted / (1000 * 60 * 60 * 24);
    const isInGracePeriod = daysSincePlanted < 2;

    // Kill plant if: not in grace AND no study in 7+ actual days (measured from last watered)
    if (!isInGracePeriod && daysSinceWatered >= 7 && currentPlant.is_alive) {
      // Plant is old enough AND user hasn't studied in 7 days - kill it
      const { error } = await supabase
        .from("user_plants")
        .update({
          is_alive: false,
          died_at: new Date().toISOString()
        })
        .eq("id", currentPlant.id);

      if (!error) {
        toast.error("¡Tu planta ha muerto! 😢 No estudiaste durante una semana.");
        fetchPlants();
      }
      return;
    }

    // Update plant growth based on study activity
    // Growth happens when user has studied today AND plant is alive AND not completed
    if (studyActivity.hasStudiedToday && currentPlant.is_alive && !currentPlant.is_completed) {
      // Check if we already applied growth today by comparing last_watered_at date
      const lastWatered = new Date(currentPlant.last_watered_at);
      const lastWateredDate = new Date(lastWatered.getFullYear(), lastWatered.getMonth(), lastWatered.getDate());
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Skip if already watered today (growth already applied)
      if (lastWateredDate.getTime() === todayDate.getTime()) {
        return;
      }

      // Check for active fertilizer
      let multiplier = 1;
      if (currentPlant.fertilizer_ends_at && new Date(currentPlant.fertilizer_ends_at) > now) {
        multiplier = currentPlant.growth_multiplier || 1;
      }

      // Growth based on study time: 5% base + 1% per 30 minutes studied today
      const baseGrowth = 5;
      const bonusGrowth = Math.floor(studyActivity.studyMinutesToday / 30);
      const totalGrowth = Math.min((baseGrowth + bonusGrowth) * multiplier, 15 * multiplier); // Max 15% (or 30% with fertilizer) per day

      const newGrowth = Math.min(currentPlant.growth_percentage + totalGrowth, 100);
      const isCompleted = newGrowth >= 100;

      const updateData: Record<string, unknown> = {
        growth_percentage: newGrowth,
        last_watered_at: new Date().toISOString(),
      };

      if (isCompleted) {
        updateData.is_completed = true;
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("user_plants")
        .update(updateData)
        .eq("id", currentPlant.id);

      if (!error) {
        if (isCompleted) {
          toast.success("🎉 ¡Tu árbol ha crecido completamente! Puedes plantar uno nuevo.");
        } else {
          toast.success(`🌱 ¡Tu planta creció ${totalGrowth}%!`);
        }
        fetchPlants();
      }
    }
  }, [user, currentPlant, studyActivity, fetchPlants]);

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
      await Promise.all([fetchPlants(), fetchStudyActivity()]);
      setLoading(false);
    };
    loadData();
  }, [fetchPlants, fetchStudyActivity]);

  useEffect(() => {
    if (!loading) {
      checkAndUpdatePlants();
    }
  }, [checkAndUpdatePlants, loading]);

  // Realtime subscription for plants
  useRealtimeSubscription({
    table: "user_plants",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: fetchPlants,
    enabled: !!user,
  });

  // Realtime subscription for study sessions
  useRealtimeSubscription({
    table: "study_sessions",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: () => {
      fetchStudyActivity();
    },
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
