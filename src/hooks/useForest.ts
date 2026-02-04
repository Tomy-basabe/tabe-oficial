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
  const { user } = useAuth();
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
    if (!user) return;

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

      // Fetch study sessions from the last 7 days - include ALL session types
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

      // Calculate days since last study - use the most recent session's created_at for accuracy
      let daysSinceLastStudy = 7;
      if (sessions && sessions.length > 0) {
        // Use created_at timestamp for more accurate calculation
        const lastStudyTimestamp = new Date(sessions[0].created_at);
        const diffTime = now.getTime() - lastStudyTimestamp.getTime();
        daysSinceLastStudy = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      // hasStudiedToday should be true if there's ANY study time today (even 1 second counts for plant)
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

    // Calculate days since the plant was planted
    const plantedDate = new Date(currentPlant.planted_at);
    const now = new Date();
    const msSincePlanted = now.getTime() - plantedDate.getTime();
    const daysSincePlanted = msSincePlanted / (1000 * 60 * 60 * 24);

    // IMPORTANT: Don't check for death if plant is less than 7 days old
    // This prevents newly planted seeds from dying immediately
    const isInGracePeriod = daysSincePlanted < 7;
    
    if (!isInGracePeriod && studyActivity.daysSinceLastStudy >= 7 && currentPlant.is_alive) {
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
      
      // Growth based on study time: 5% base + 1% per 30 minutes studied today
      const baseGrowth = 5;
      const bonusGrowth = Math.floor(studyActivity.studyMinutesToday / 30);
      const totalGrowth = Math.min(baseGrowth + bonusGrowth, 15); // Max 15% per day
      
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
